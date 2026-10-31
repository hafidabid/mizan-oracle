import { StoreError } from './_store.ts'

export const json = (data: unknown, status = 200): Response =>
	new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

export const methodNotAllowed = (allowed: string): Response =>
	json({ error: `method not allowed, use ${allowed}`, code: 'method_not_allowed' }, 405)

export const handleError = (error: unknown): Response => {
	if (error instanceof StoreError) {
		return json({ error: error.message, code: error.code }, error.status)
	}
	console.error('[mizan/api] unhandled error', error)
	return json({ error: 'internal error', code: 'internal_error' }, 500)
}
