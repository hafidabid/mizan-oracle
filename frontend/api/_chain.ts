import { createPublicClient, http, type Address } from 'viem'
import { sepolia } from 'viem/chains'

export const REGISTRY_ADDRESS = (process.env.MIZAN_REGISTRY_ADDRESS ??
	'0xAB7995471D8f075AE357c47AF884Ac814e6dBB38') as Address

const RESOLUTION_OUTPUT = {
	name: 'result',
	type: 'tuple',
	components: [
		{ name: 'exists', type: 'bool' },
		{ name: 'assessmentId', type: 'uint256' },
		{ name: 'outcome', type: 'uint8' },
		{ name: 'expired', type: 'bool' },
		{ name: 'revoked', type: 'bool' },
		{ name: 'boardActive', type: 'bool' },
		{
			name: 'tally',
			type: 'tuple',
			components: [
				{ name: 'approvals', type: 'uint16' },
				{ name: 'rejections', type: 'uint16' },
				{ name: 'needsReview', type: 'uint16' },
				{ name: 'quorum', type: 'uint16' },
				{ name: 'boardSize', type: 'uint16' },
				{ name: 'quorumMet', type: 'bool' },
			],
		},
		{ name: 'subjectVersion', type: 'bytes32' },
		{ name: 'evidenceHash', type: 'bytes32' },
		{ name: 'evidenceURI', type: 'string' },
		{ name: 'boardIssuedAt', type: 'uint64' },
		{ name: 'recordedAt', type: 'uint64' },
		{ name: 'expiresAt', type: 'uint64' },
	],
} as const

export const REGISTRY_ABI = [
	{
		type: 'function',
		name: 'shariaBoardMembers',
		stateMutability: 'view',
		inputs: [{ name: '', type: 'address' }],
		outputs: [
			{ name: 'name', type: 'string' },
			{ name: 'profileURI', type: 'string' },
			{ name: 'active', type: 'bool' },
		],
	},
	{
		type: 'function',
		name: 'latestId',
		stateMutability: 'view',
		inputs: [{ name: '', type: 'address' }],
		outputs: [{ name: '', type: 'uint256' }],
	},
	{
		type: 'function',
		name: 'quorum',
		stateMutability: 'view',
		inputs: [],
		outputs: [{ name: '', type: 'uint16' }],
	},
	{
		type: 'function',
		name: 'policyId',
		stateMutability: 'view',
		inputs: [],
		outputs: [{ name: '', type: 'bytes32' }],
	},
	{
		type: 'function',
		name: 'resolve',
		stateMutability: 'view',
		inputs: [{ name: 'asset', type: 'address' }],
		outputs: [RESOLUTION_OUTPUT],
	},
] as const

export const publicClient = createPublicClient({
	chain: sepolia,
	transport: http(process.env.SEPOLIA_RPC_URL),
})

export const isActiveBoardMember = async (address: Address): Promise<boolean> => {
	const [, , active] = await publicClient.readContract({
		address: REGISTRY_ADDRESS,
		abi: REGISTRY_ABI,
		functionName: 'shariaBoardMembers',
		args: [address],
	})
	return active
}

export const readLatestId = (asset: Address): Promise<bigint> =>
	publicClient.readContract({
		address: REGISTRY_ADDRESS,
		abi: REGISTRY_ABI,
		functionName: 'latestId',
		args: [asset],
	})

export const readQuorum = (): Promise<number> =>
	publicClient
		.readContract({ address: REGISTRY_ADDRESS, abi: REGISTRY_ABI, functionName: 'quorum' })
		.then(Number)

export const readPolicyId = (): Promise<`0x${string}`> =>
	publicClient.readContract({ address: REGISTRY_ADDRESS, abi: REGISTRY_ABI, functionName: 'policyId' })

export const readResolution = (asset: Address) =>
	publicClient.readContract({
		address: REGISTRY_ADDRESS,
		abi: REGISTRY_ABI,
		functionName: 'resolve',
		args: [asset],
	})
