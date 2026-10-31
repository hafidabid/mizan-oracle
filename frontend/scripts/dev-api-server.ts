// Standalone local server for frontend/api/*.ts, for use before a real Vercel
// deployment exists (e.g. to let the board-opinion CRE workflow's cron poll
// something real during development). Not used in production — Vercel serves
// api/*.ts directly via its own Edge/Node runtime once deployed.
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

const server = createServer(async (req, res) => {
	const url = new URL(req.url ?? '/', `http://localhost:${port}`)
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
		console.error('[dev-api-server] handler error', error)
		res.writeHead(500, { 'Content-Type': 'application/json' })
		res.end(JSON.stringify({ error: 'internal error' }))
	}
})

server.listen(port, () => console.log(`[dev-api-server] listening on http://localhost:${port}`))
