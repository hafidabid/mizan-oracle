import { useEffect, useState } from 'react';
import '../../styles/dashboard.css';
import { useWallet } from '../../lib/wallet';
import { BrowseList } from './BrowseList';
import { AssetLookup } from './AssetLookup';
import { BoardView } from './BoardView';

const tabFromHash = (): 'browse' | 'board' => (window.location.hash === '#/dashboard/board' ? 'board' : 'browse');

export function Dashboard() {
  const [tab, setTab] = useState<'browse' | 'board'>(tabFromHash);
  const wallet = useWallet();

  // Keeps the active tab in sync with direct navigation to #/dashboard/board (a shared
  // link, or browser back/forward), not just the in-page tab buttons below.
  useEffect(() => {
    const sync = () => setTab(tabFromHash());
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
  }, []);

  const go = (next: 'browse' | 'board') => {
    setTab(next);
    history.replaceState(null, '', next === 'board' ? '#/dashboard/board' : '#/dashboard');
  };

  return (
    <div className="dash">
      <div className="dash-shell">
        <div className="dash-header">
          <h1 className="dash-title">Mizan Dashboard</h1>
          <a className="dash-back" href="#top">
            ← Back to the landing page
          </a>
        </div>
        <p className="dash-disclaimer">
          Reads come straight from the MizanRegistry contract on Sepolia. This is an illustrative hackathon demo,
          not a real Sharia certification — see the "Who decides" section on the landing page.
        </p>

        <div className="dash-tabs">
          <button type="button" className={`dash-tab ${tab === 'browse' ? 'active' : ''}`} onClick={() => go('browse')}>
            Browse assessments
          </button>
          <button type="button" className={`dash-tab ${tab === 'board' ? 'active' : ''}`} onClick={() => go('board')}>
            Sharia board
          </button>
        </div>

        {tab === 'browse' ? (
          <>
            <AssetLookup />
            <BrowseList />
          </>
        ) : (
          <BoardView wallet={wallet} />
        )}
      </div>
    </div>
  );
}
