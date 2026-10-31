// Minimal key-value abstraction for board-opinion proposal coordination.
//
// Production: set KV_REST_API_URL + KV_REST_API_TOKEN (Vercel KV / any Upstash Redis
// REST endpoint) for real cross-invocation persistence and atomic SETNX.
// Local/unset fallback: an in-memory Map, which only works within a single process
// and is NOT safe for concurrent Vercel invocations. It exists so the proposal logic
// can be exercised locally without provisioning Redis — see api/_store.ts.
export interface KV {
	get(key: string): Promise<string | null>
	set(key: string, value: string): Promise<void>
	setnx(key: string, value: string): Promise<boolean>
	sadd(key: string, member: string): Promise<void>
	smembers(key: string): Promise<string[]>
}

class MemoryKV implements KV {
	private store = new Map<string, string>()
	private sets = new Map<string, Set<string>>()

	async get(key: string): Promise<string | null> {
		return this.store.get(key) ?? null
	}

	async set(key: string, value: string): Promise<void> {
		this.store.set(key, value)
	}

	async setnx(key: string, value: string): Promise<boolean> {
		if (this.store.has(key)) return false
		this.store.set(key, value)
		return true
	}

	async sadd(key: string, member: string): Promise<void> {
		const set = this.sets.get(key) ?? new Set<string>()
		set.add(member)
		this.sets.set(key, set)
	}

	async smembers(key: string): Promise<string[]> {
		return Array.from(this.sets.get(key) ?? [])
	}
}

// Upstash's REST API accepts a Redis command as a JSON array POSTed to the base URL.
// https://upstash.com/docs/redis/features/restapi
class UpstashKV implements KV {
	constructor(
		private readonly url: string,
		private readonly token: string,
	) {}

	private async command(args: (string | number)[]): Promise<unknown> {
		const res = await fetch(this.url, {
			method: 'POST',
			headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
			body: JSON.stringify(args),
		})
		const body = (await res.json()) as { result?: unknown; error?: string }
		if (!res.ok || body.error) {
			throw new Error(`Upstash command ${args[0]} failed: ${body.error ?? res.statusText}`)
		}
		return body.result
	}

	async get(key: string): Promise<string | null> {
		const result = await this.command(['GET', key])
		return typeof result === 'string' ? result : null
	}

	async set(key: string, value: string): Promise<void> {
		await this.command(['SET', key, value])
	}

	async setnx(key: string, value: string): Promise<boolean> {
		const result = await this.command(['SETNX', key, value])
		return result === 1
	}

	async sadd(key: string, member: string): Promise<void> {
		await this.command(['SADD', key, member])
	}

	async smembers(key: string): Promise<string[]> {
		const result = await this.command(['SMEMBERS', key])
		return Array.isArray(result) ? result.filter((v): v is string => typeof v === 'string') : []
	}
}

let cached: KV | undefined

export const getKV = (): KV => {
	if (cached) return cached
	const url = process.env.KV_REST_API_URL
	const token = process.env.KV_REST_API_TOKEN
	if (url && token) {
		cached = new UpstashKV(url, token)
	} else {
		if (process.env.VERCEL_ENV === 'production') {
			console.warn(
				'[mizan] KV_REST_API_URL/KV_REST_API_TOKEN not set in production — falling back to a ' +
					'per-invocation in-memory store. Proposals will not persist or coordinate across ' +
					'requests. Provision Upstash/Vercel KV and set these env vars.',
			)
		}
		cached = new MemoryKV()
	}
	return cached
}
