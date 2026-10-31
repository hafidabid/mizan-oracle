import { useState } from 'react';
import { useBoardMembership } from '../../lib/board';
import type { WalletState } from '../../lib/wallet';
import { ProposeForm } from './ProposeForm';
import { PendingProposals } from './PendingProposals';

export function BoardView({ wallet }: { wallet: WalletState }) {
  const membership = useBoardMembership(wallet.address);
  const [refreshKey, setRefreshKey] = useState(0);
  const bump = () => setRefreshKey((k) => k + 1);

  if (wallet.status === 'no_wallet') {
    return (
      <div className="dash-card">
        <p>No Ethereum wallet was detected in this browser. Install one (e.g. MetaMask) to sign as a board member.</p>
      </div>
    );
  }

  if (wallet.status !== 'connected') {
    return (
      <div className="dash-card">
        <p>Connect the wallet registered as a Sharia board member to propose or sign assessments.</p>
        <button type="button" className="dash-btn" onClick={wallet.connect} disabled={wallet.status === 'connecting'}>
          {wallet.status === 'connecting' ? 'Connecting…' : 'Connect wallet'}
        </button>
        {wallet.status === 'rejected' && <p className="dash-error">Connection was rejected. Try again.</p>}
        {wallet.status === 'wrong_network' && <p className="dash-error">Switch your wallet to Sepolia and try again.</p>}
      </div>
    );
  }

  if (membership.loading) {
    return <p className="dash-empty">Checking board membership…</p>;
  }

  if (!membership.isActive || !wallet.address) {
    return (
      <div className="dash-card">
        <p className="dash-asset">{wallet.address}</p>
        <p>This address is not an active Sharia board member on the registry, so it can't propose or sign.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="dash-hint">Signed in as {membership.name} ({wallet.address})</p>
      <ProposeForm wallet={wallet} onProposed={bump} />
      <PendingProposals wallet={wallet} memberAddress={wallet.address} refreshKey={refreshKey} onSigned={bump} />
    </div>
  );
}
