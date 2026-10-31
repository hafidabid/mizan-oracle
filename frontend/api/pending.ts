import { isAddress, type Address } from 'viem'
import { handleError, json, methodNotAllowed } from './_http.ts'
import { getProposal, listProposals } from './_store.ts'

export const config = { runtime: 'edge' }

export default async function handler(request: Request): Promise<Response> {
	if (request.method !== 'GET') return methodNotAllowed('GET')

	try {
		const asset = new URL(request.url).searchParams.get('asset')
		if (asset) {
			if (!isAddress(asset)) return json({ error: 'asset must be an address', code: 'invalid_input' }, 400)
			const proposal = await getProposal(asset as Address)
			return proposal ? json({ proposal }) : json({ error: 'no proposal for this asset', code: 'not_found' }, 404)
		}

		const proposals = await listProposals()
		return json({ proposals })
	} catch (error) {
		return handleError(error)
	}
}
