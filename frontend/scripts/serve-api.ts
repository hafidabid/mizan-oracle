// Production server for frontend/api/*.ts when self-hosting instead of Vercel.
// Same fetch-handler wrapping as dev-api-server.ts, plus a health check and graceful
// shutdown for container orchestration (Docker Compose, Kubernetes, etc).
import { createServer } from 'node:http'

import proposeHandler from '../api/propose.ts'
import signHandler from '../api/sign.ts'
import pendingHandler from '../api/pending.ts'
import resolveHandler from '../api/resolve.ts'

const routes: Record<string, (request: Request) => Promise<Response>> = {
	'/api/propose': proposeHandler,
	'/api/sign': signHandler,
	'/api/pending': pendingHandler,
	'/api/resolve': resolveHandler,
}

const port = Number(process.env.PORT ?? 8787)
const host = process.env.HOST ?? '0.0.0.0'

const server = createServer(async (req, res) => {
	const url = new URL(req.url ?? '/', `http://localhost:${port}`)

	if (url.pathname === '/healthz') {
		res.writeHead(200, { 'Content-Type': 'application/json' })
		res.end(JSON.stringify({ status: 'ok' }))
		return
	}

	const handler = routes[url.pathname]
	if (!handler) {
		res.writeHead(404, { 'Content-Type': 'application/json' })
		res.end(JSON.stringify({ error: 'not found' }))
		return
	}

	const chunks: Buffer[] = []
	for await (const chunk of req) chunks.push(chunk as Buffer)
	const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined

	const request = new Request(url, {
		method: req.method,
		headers: req.headers as HeadersInit,
		body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
	})

	try {
		const response = await handler(request)
		res.writeHead(response.status, Object.fromEntries(response.headers))
		res.end(Buffer.from(await response.arrayBuffer()))
	} catch (error) {
		console.error('[serve-api] handler error', error)
		res.writeHead(500, { 'Content-Type': 'application/json' })
		res.end(JSON.stringify({ error: 'internal error' }))
	}
})

server.listen(port, host, () => console.log(`[serve-api] listening on http://${host}:${port}`))

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
	process.on(signal, () => {
		console.log(`[serve-api] received ${signal}, shutting down`)
		server.close(() => process.exit(0))
	})
}
