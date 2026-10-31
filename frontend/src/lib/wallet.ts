import { useCallback, useEffect, useState } from 'react';
import { createWalletClient, custom, type Address, type EIP1193Provider, type Hex } from 'viem';
import { sepolia } from 'viem/chains';
import { CHAIN_ID, REGISTRY_ADDRESS } from './chain';
import { buildDomain, ISSUE_OPINION_TYPES, type IssueMessage } from './eip712';

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

export type WalletStatus = 'no_wallet' | 'disconnected' | 'connecting' | 'connected' | 'wrong_network' | 'rejected';

export interface WalletState {
  status: WalletStatus;
  address: Address | null;
  connect: () => Promise<void>;
  signProposeAuth: (asset: Address) => Promise<{ proposerTimestamp: number; proposerSignature: Hex }>;
  signOpinion: (issue: IssueMessage, opinion: 1 | 2 | 3) => Promise<Hex>;
}

const getWalletClient = () => {
  if (!window.ethereum) throw new Error('No Ethereum wallet detected');
  return createWalletClient({ chain: sepolia, transport: custom(window.ethereum) });
};

export const useWallet = (): WalletState => {
  const [address, setAddress] = useState<Address | null>(null);
  const [status, setStatus] = useState<WalletStatus>(() => (window.ethereum ? 'disconnected' : 'no_wallet'));

  useEffect(() => {
    if (!window.ethereum) return;
    const ethereum = window.ethereum;

    const onAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setAddress(null);
        setStatus('disconnected');
      } else {
        setAddress(accounts[0] as Address);
        setStatus('connected');
      }
    };
    const onChainChanged = () => window.location.reload();

    ethereum.request({ method: 'eth_accounts' }).then((accounts) => {
      const list = accounts as string[];
      if (list.length > 0) {
        setAddress(list[0] as Address);
        setStatus('connected');
      }
    });

    ethereum.on?.('accountsChanged', onAccountsChanged);
    ethereum.on?.('chainChanged', onChainChanged);
    return () => {
      ethereum.removeListener?.('accountsChanged', onAccountsChanged);
      ethereum.removeListener?.('chainChanged', onChainChanged);
    };
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setStatus('no_wallet');
      return;
    }
    setStatus('connecting');
    try {
      const accounts = (await window.ethereum.request({ method: 'eth_requestAccounts' })) as string[];
      const chainIdHex = (await window.ethereum.request({ method: 'eth_chainId' })) as string;
      if (parseInt(chainIdHex, 16) !== CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
          });
        } catch {
          setStatus('wrong_network');
          return;
        }
      }
      setAddress(accounts[0] as Address);
      setStatus('connected');
    } catch {
      setStatus('rejected');
    }
  }, []);

  const signProposeAuth = useCallback(
    async (asset: Address) => {
      if (!address) throw new Error('wallet not connected');
      const walletClient = getWalletClient();
      const proposerTimestamp = Math.floor(Date.now() / 1000);
      const proposerSignature = await walletClient.signMessage({
        account: address,
        message: `mizan-propose:${asset.toLowerCase()}:${proposerTimestamp}`,
      });
      return { proposerTimestamp, proposerSignature };
    },
    [address],
  );

  const signOpinion = useCallback(
    async (issue: IssueMessage, opinion: 1 | 2 | 3): Promise<Hex> => {
      if (!address) throw new Error('wallet not connected');
      const walletClient = getWalletClient();
      return walletClient.signTypedData({
        account: address,
        domain: buildDomain(REGISTRY_ADDRESS),
        types: ISSUE_OPINION_TYPES,
        primaryType: 'ShariaBoardMemberOpinion',
        message: { issue, opinion },
      });
    },
    [address],
  );

  return { status, address, connect, signProposeAuth, signOpinion };
};
