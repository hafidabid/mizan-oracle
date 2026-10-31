import { isAddress, isHex, type Address, type Hex } from 'viem'
import { handleError, json, methodNotAllowed } from './_http.ts'
import { resolveProposal } from './_store.ts'

export const config = { runtime: 'edge' }

interface ResolveBody {
	asset: string
	txHash: string
}

// Called only by the board-opinion CRE workflow after a successful on-chain write.
// See cre-workflow/board-opinion/workflow.ts.
export default async function handler(request: Request): Promise<Response> {
	if (request.method !== 'POST') return methodNotAllowed('POST')

	const expected = process.env.WORKFLOW_RESOLVE_SECRET
	if (!expected || request.headers.get('x-mizan-workflow-secret') !== expected) {
		return json({ error: 'unauthorized', code: 'unauthorized' }, 401)
	}

	try {
		const body = (await request.json()) as ResolveBody
		if (!isAddress(body.asset)) return json({ error: 'asset must be an address', code: 'invalid_input' }, 400)
		if (!isHex(body.txHash)) return json({ error: 'txHash must be hex', code: 'invalid_input' }, 400)

		const proposal = await resolveProposal({ asset: body.asset as Address, txHash: body.txHash as Hex })
		return json({ proposal })
	} catch (error) {
		return handleError(error)
	}
}
