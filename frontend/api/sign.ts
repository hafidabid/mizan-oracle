import { isAddress, isHex, type Address, type Hex } from 'viem'
import { handleError, json, methodNotAllowed } from './_http.ts'
import { signProposal, type Outcome } from './_store.ts'

export const config = { runtime: 'edge' }

interface SignBody {
	asset: string
	shariaBoardMember: string
	opinion: Outcome
	signature: string
}

export default async function handler(request: Request): Promise<Response> {
	if (request.method !== 'POST') return methodNotAllowed('POST')

	try {
		const body = (await request.json()) as SignBody
		if (!isAddress(body.asset)) return json({ error: 'asset must be an address', code: 'invalid_input' }, 400)
		if (!isAddress(body.shariaBoardMember)) {
			return json({ error: 'shariaBoardMember must be an address', code: 'invalid_input' }, 400)
		}
		if (!isHex(body.signature)) return json({ error: 'signature must be hex', code: 'invalid_input' }, 400)

		const proposal = await signProposal({
			asset: body.asset as Address,
			shariaBoardMember: body.shariaBoardMember as Address,
			opinion: body.opinion,
			signature: body.signature as Hex,
		})
		return json({ proposal })
	} catch (error) {
		return handleError(error)
	}
}
