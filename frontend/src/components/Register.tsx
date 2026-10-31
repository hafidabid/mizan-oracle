import { useMemo, useState, type RefObject } from 'react';
import { REVIEWS, STATUS, STATUS_ORDER, TYPE_ICON, type ProductType, type Status } from '../data/reviews';
import { validity } from '../lib/dates';
import { Icon } from './Icon';
import { ConclusionText, StatusTag } from './Status';
import { Seal } from './Seal';
import { Rosette } from './Ornament';

const TYPES: Array<'all' | ProductType> = ['all', 'Token', 'DeFi Pool', 'Yield Vault'];

/** How many records sit in each status, for the chips and the summary line. */
const COUNTS = STATUS_ORDER.reduce(
  (acc, s) => ({ ...acc, [s]: REVIEWS.filter((r) => r.status === s).length }),
  {} as Record<Status, number>,
);
const IN_FORCE = COUNTS.Active;

interface Props {
  sectionRef: RefObject<HTMLElement | null>;
  onOpen: (id: string) => void;
}

export function Register({ sectionRef, onOpen }: Props) {
  const [type, setType] = useState<'all' | ProductType>('all');
  const [status, setStatus] = useState<'all' | Status>('all');
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return REVIEWS.filter(
      (r) =>
        (type === 'all' || r.type === type) &&
        (status === 'all' || r.status === status) &&
        (!q || [r.name, r.rec, r.type, r.scope, r.desc, r.version].join(' ').toLowerCase().includes(q)),
    );
  }, [type, status, query]);

  const filtered = type !== 'all' || status !== 'all' || query !== '';
  const clear = () => {
    setType('all');
    setStatus('all');
    setQuery('');
  };

  return (
    <section className="register" id="register" ref={sectionRef} aria-labelledby="regTitle">
      <div className="frieze" aria-hidden="true" />
      <div className="wrap">
        <Rosette size={150} className="orn-margin" />
        <div className="reg-head">
          <div>
            <h2 id="regTitle">
              <span className="sec">§1</span> The register
            </h2>
            <p className="lede">Every review the board has issued, current or not. Read the status first: it tells you whether a conclusion still holds today.</p>
          </div>
          <p className="reg-summary">
            <span>
              <b className="num">{REVIEWS.length}</b> records
            </span>
            <span>
              <b className="num">{IN_FORCE}</b> in force today
            </span>
            <span>
              <b className="num">{REVIEWS.length - IN_FORCE}</b> on record only
            </span>
          </p>
        </div>

        <div className="sheet-card">
          {/* Status chips are both the filter and the legend: the chosen status explains itself below. */}
          <div className="status-bar">
            <div className="chips" role="group" aria-label="Filter by review status">
              <button className="chip-all" aria-pressed={status === 'all'} onClick={() => setStatus('all')}>
                All <span className="count">{REVIEWS.length}</span>
              </button>
              {STATUS_ORDER.map((s) => (
                <button key={s} className={`chip t-${STATUS[s].tone}`} aria-pressed={status === s} onClick={() => setStatus(status === s ? 'all' : s)}>
                  <Icon name={STATUS[s].icon} />
                  {s} <span className="count">{COUNTS[s]}</span>
                </button>
              ))}
            </div>
            <p className="status-def" aria-live="polite">
              {status === 'all' ? 'Choose a status to filter the register and see what it means.' : STATUS[status].desc}
            </p>
          </div>

          <div className="reg-tools">
            <label className="search">
              <Icon name="search" />
              <span className="sr">Search records</span>
              <input type="search" placeholder="Search records" autoComplete="off" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <div className="seg type-seg" role="group" aria-label="Product type">
              {TYPES.map((t) => (
                <button key={t} aria-pressed={type === t} onClick={() => setType(t)}>
                  {t === 'all' ? 'All types' : t}
                </button>
              ))}
            </div>
            {/* On phones the four type buttons do not fit on one row, so they become a select. */}
            <label className="select type-select">
              <span className="sr">Product type</span>
              <select value={type} onChange={(e) => setType(e.target.value as 'all' | ProductType)}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t === 'all' ? 'All product types' : t}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="table-wrap">
            <table>
              <caption className="sr">Sample review records. Columns: record and scope, review status, validity, board conclusion.</caption>
              <thead>
                <tr>
                  <th scope="col">Record</th>
                  <th scope="col">Review status</th>
                  <th scope="col">Validity</th>
                  <th scope="col">Board conclusion</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const v = validity(r);
                  return (
                    <tr key={r.id} className={v.live ? undefined : 'stale'} onClick={() => onOpen(r.id)}>
                      <th scope="row">
                        <button className="rec-btn" onClick={(e) => (e.stopPropagation(), onOpen(r.id))}>
                          <span className="rec">
                            {r.rec}
                            <span className="type">
                              <Icon name={TYPE_ICON[r.type]} />
                              {r.type}
                            </span>
                          </span>
                          <span className="nm">
                            {r.name} <span className="muted">{r.version}</span>
                          </span>
                          <span className="scope">{r.scope}</span>
                        </button>
                      </th>
                      <td>
                        <StatusTag status={r.status} />
                      </td>
                      <td className={`num validity ${v.live ? '' : 'muted'}`}>{v.text}</td>
                      <td>
                        <ConclusionText conclusion={r.conclusion} status={r.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="cards">
            {rows.map((r) => {
              const v = validity(r);
              return (
                <li key={r.id}>
                  <button className="card-btn" onClick={() => onOpen(r.id)}>
                    <span className="c-top">
                      <StatusTag status={r.status} />
                      <ConclusionText conclusion={r.conclusion} status={r.status} />
                    </span>
                    <span className="nm">
                      {r.name} <span className="muted">{r.version}</span>
                    </span>
                    <span className="c-meta">
                      <span className="rec">{r.rec}</span>
                      <span>{r.type}</span>
                    </span>
                    {r.status !== 'Closed' && <span className={`c-valid ${v.live ? '' : 'muted'}`}>{v.text}</span>}
                  </button>
                </li>
              );
            })}
          </ul>

          {rows.length === 0 && (
            <div className="empty">
              <p>No records match these filters.</p>
              <button className="btn btn-quiet" onClick={clear}>
                Clear filters
              </button>
            </div>
          )}
          <div className="reg-foot">
            <Seal record="" size={44} small />
            <p>
              <span role="status">
                Showing {rows.length} of {REVIEWS.length} records.
              </span>{' '}
              {filtered && rows.length > 0 && (
                <button className="text-link" onClick={clear}>
                  Clear filters
                </button>
              )}{' '}
              Each record is signed with the board’s key and its report hash is anchored on-chain. <a className="text-link" href="#builders">How to verify a record</a>
            </p>
          </div>
        </div>
      </div>
      <div className="reg-dim" aria-hidden="true" />
    </section>
  );
}
