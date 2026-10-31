import { isAddress, isHex, type Address, type Hex } from 'viem'
import { handleError, json, methodNotAllowed } from './_http.ts'
import { createProposal, type Outcome } from './_store.ts'

export const config = { runtime: 'edge' }

interface ProposeBody {
	asset: string
	outcome: Outcome
	evidenceNote: string
	expiresInDays?: number
	proposerAddress: string
	proposerTimestamp: number
	proposerSignature: string
}

export default async function handler(request: Request): Promise<Response> {
	if (request.method !== 'POST') return methodNotAllowed('POST')

	try {
		const body = (await request.json()) as ProposeBody
		if (!isAddress(body.asset)) return json({ error: 'asset must be an address', code: 'invalid_input' }, 400)
		if (!isAddress(body.proposerAddress)) {
			return json({ error: 'proposerAddress must be an address', code: 'invalid_input' }, 400)
		}
		if (!isHex(body.proposerSignature)) {
			return json({ error: 'proposerSignature must be hex', code: 'invalid_input' }, 400)
		}
		if (typeof body.proposerTimestamp !== 'number') {
			return json({ error: 'proposerTimestamp must be a unix-seconds number', code: 'invalid_input' }, 400)
		}

		const proposal = await createProposal({
			asset: body.asset as Address,
			outcome: body.outcome,
			evidenceNote: body.evidenceNote,
			expiresInDays: body.expiresInDays,
			proposerAddress: body.proposerAddress as Address,
			proposerTimestamp: body.proposerTimestamp,
			proposerSignature: body.proposerSignature as Hex,
		})
		return json({ proposal })
	} catch (error) {
		return handleError(error)
	}
}
