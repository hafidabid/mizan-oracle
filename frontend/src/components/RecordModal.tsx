import { useEffect, useRef, useState } from 'react';
import { findByRec, getReview, STATUS } from '../data/reviews';
import { formatDate, periodNote, validity } from '../lib/dates';
import { demoAsOf, evaluateRule, oracleResponse, provenance, RULES, type RuleId } from '../lib/rules';
import { Icon } from './Icon';
import { Seal } from './Seal';
import { JsonView } from './JsonView';
import { ConclusionText, StatusTag } from './Status';

interface Props {
  id: string;
  showJson: boolean;
  onClose: () => void;
  onOpen: (id: string) => void;
}

const short = (h: string, n = 10) => `${h.slice(0, n)}…${h.slice(-6)}`;
const pct = (x: number) => `${+(x * 100).toFixed(1)}%`;

export function RecordModal({ id, showJson, onClose, onOpen }: Props) {
  const r = getReview(id);
  const s = STATUS[r.status];
  const v = validity(r);
  const p = provenance(r);
  const [rule, setRule] = useState<RuleId>('current');
  const [json, setJson] = useState(showJson);
  const [copied, setCopied] = useState(false);
  const sheet = useRef<HTMLDivElement>(null);
  // The long reasoning starts open on wide screens and folded on phones.
  const [wide] = useState(() => window.matchMedia('(min-width: 761px)').matches);
  const title = useRef<HTMLHeadingElement>(null);
  const result = evaluateRule(r, rule);
  const related = r.supersededBy ?? r.supersedes;
  const relatedRec = related ? findByRec(related) : undefined;

  // Lock page scroll, move focus to the title, keep Tab inside the sheet, close on Escape.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    title.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab' || !sheet.current) return;
      const f = Array.from(sheet.current.querySelectorAll<HTMLElement>('button,[href],input,select,[tabindex="0"]'));
      if (!f.length) return;
      const i = f.indexOf(document.activeElement as HTMLElement);
      if (i === -1) return; // focus is on the title or the sheet itself: let the browser move it
      if (e.shiftKey && i === 0) {
        e.preventDefault();
        f[f.length - 1].focus();
      } else if (!e.shiftKey && i === f.length - 1) {
        e.preventDefault();
        f[0].focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      if (previous && document.contains(previous)) previous.focus();
    };
  }, [onClose]);

  const copyLink = () => {
    void navigator.clipboard?.writeText(window.location.href).then(() => setCopied(true));
  };

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="mTitle" ref={sheet}>
        <div className="sheet-bar">
          <span className="rec">{r.rec}</span>
          <StatusTag status={r.status} />
          <button className="text-link copy" onClick={copyLink}>
            {copied ? 'Link copied' : 'Copy link'}
          </button>
          <button className="close" aria-label="Close record" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>

        <div className="m-head">
          <div>
            <p className="m-rec">Review record {r.rec}</p>
            <h2 id="mTitle" tabIndex={-1} ref={title}>
              {r.name} <span className="muted">{r.version}</span>
            </h2>
            <p className="desc">
              {r.desc}, on {r.chain}.
            </p>
          </div>
          <Seal record={r.rec} void={r.status === 'Withdrawn'} />
        </div>

        <dl className="m-states">
          <div>
            <dt>Review status</dt>
            <dd>
              <StatusTag status={r.status} large />
            </dd>
            <dd className="sub">{r.statusNote ?? s.desc}</dd>
          </div>
          <div>
            <dt>Board conclusion</dt>
            <dd>
              <ConclusionText conclusion={r.conclusion} status={r.status} retractedOn={r.statusDate} large />
            </dd>
            <dd className="sub">
              {r.status === 'Withdrawn' && r.withdrawalVote
                ? `Approved ${r.vote[0]}–${r.vote[1]}; retracted ${r.withdrawalVote[0]}–${r.withdrawalVote[1]}. Void from ${formatDate(r.voidFrom)}.`
                : `Vote ${r.vote[0]}–${r.vote[1]}${r.dissent ? ', with a dissent (below)' : ', unanimous'}.`}
            </dd>
          </div>
        </dl>

        {r.holders && (
          <div className={`holders ${r.status === 'Withdrawn' || r.conclusion !== 'Approved' ? 'h-bad' : 'h-warn'}`}>
            <h3>What holders should do</h3>
            <p>{r.holders}</p>
          </div>
        )}

        <dl className="m-grid">
          <div>
            <dt>Issued</dt>
            <dd>{formatDate(r.issue)}</dd>
          </div>
          <div>
            <dt>Validity</dt>
            <dd className={v.live ? '' : 'muted'}>{v.text}</dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>{r.type}</dd>
          </div>
          <div>
            <dt>Purification</dt>
            <dd>{r.purification ? pct(r.purification.rate) : 'None identified'}</dd>
          </div>
        </dl>
        {r.status === 'Active' && <p className="period">{periodNote(r)}.</p>}
        {r.purification && (
          <p className="period">
            <b>Purification:</b> {pct(r.purification.rate)} of {r.purification.base}, from {formatDate(r.purification.from)}. {r.purification.method}
          </p>
        )}
        {relatedRec && (
          <p className="related">
            {r.supersededBy ? 'Superseded by' : 'Supersedes'}{' '}
            <button className="text-link" onClick={() => onOpen(relatedRec.id)}>
              {relatedRec.rec}, {relatedRec.name} {relatedRec.version}
            </button>
          </p>
        )}

        <details className="reasoning" open={wide}>
        <summary>The board’s reasoning</summary>
          <div className="m-block">
            <h3>Characterisation</h3>
            <p>{r.takyif}</p>
            {r.madhhab && (
              <p className="madhhab">
                <b>Points of difference:</b> {r.madhhab}
              </p>
            )}
          </div>

          <div className="m-cols">
            <div>
              <h3>Covered</h3>
              <p>{r.scope}</p>
              <h3>Not covered</h3>
              <ul>
                {r.excl.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <h3>Evidence relied on</h3>
              <ul>
                {r.evidence.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Screens</h3>
              <dl className="screens">
                <div>
                  <dt>Riba</dt>
                  <dd>{r.screens.riba}</dd>
                </div>
                <div>
                  <dt>Gharar</dt>
                  <dd>{r.screens.gharar}</dd>
                </div>
                <div>
                  <dt>Maysir</dt>
                  <dd>{r.screens.maysir}</dd>
                </div>
                <div>
                  <dt>Activity</dt>
                  <dd>{r.screens.activity}</dd>
                </div>
              </dl>
              <h3>Standards (applied by analogy)</h3>
              <ul>
                {r.refs.map((x) => (
                  <li key={x.std}>
                    {x.std}: {x.title}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {(r.dissent || r.recusal) && (
            <div className="dissent">
              {r.dissent && (
                <>
                  <h3>Dissenting opinion</h3>
                  <p>{r.dissent}</p>
                </>
              )}
              {r.recusal && (
                <>
                  <h3>Recusal</h3>
                  <p>{r.recusal}</p>
                </>
              )}
            </div>
          )}

        </details>

        <div className="m-block prov">
          <h3>Provenance</h3>
          <dl className="prov-list">
            <div>
              <dt>Signed by</dt>
              <dd>
                Board key <code title={p.boardKey}>{short(p.boardKey)}</code>
              </dd>
            </div>
            <div>
              <dt>Report</dt>
              <dd>
                {r.rec}.pdf <span className="muted">(demo, not hosted)</span>, <code title={p.reportHash}>{short(p.reportHash, 16)}</code>
              </dd>
            </div>
            <div>
              <dt>Reviewed code</dt>
              <dd>
                <code title={p.codeHash}>{short(p.codeHash)}</code> <span className="muted">An upgrade changes this hash, and the on-chain check stops matching.</span>
              </dd>
            </div>
          </dl>
          <table className="history">
            <caption className="sr">Signed history of this record</caption>
            <thead>
              <tr>
                <th scope="col">Entry</th>
                <th scope="col">Date</th>
                <th scope="col">Vote</th>
                <th scope="col">Block</th>
                <th scope="col">Transaction</th>
              </tr>
            </thead>
            <tbody>
              {p.history.map((h) => (
                <tr key={h.status}>
                  <th scope="row">{h.status.replace('_', ' ')}</th>
                  <td>{formatDate(h.at)}</td>
                  <td>{h.automatic ? 'Automatic' : h.vote}</td>
                  <td className="num">{h.block.toLocaleString('en-US')}</td>
                  <td>
                    <code title={h.tx}>{short(h.tx, 8)}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="small">Each board decision is signed over its own notice and anchored on {p.chain} as a separate entry. {p.history.some((h) => h.automatic) ? 'Expiry is automatic: the registry derives it from the end of the period, so it is not signed.' : 'Every change of status can be checked on its own.'}</p>
        </div>

        <div className="rulebox">
          <h3>Check it against an application rule</h3>
          <div className="seg" role="group" aria-label="Application rule">
            {RULES.map((x) => (
              <button key={x.id} aria-pressed={x.id === rule} onClick={() => setRule(x.id)}>
                {x.label}
              </button>
            ))}
          </div>
          <p className="rule-desc">
            {RULES.find((x) => x.id === rule)?.desc}
            {rule === 'onRecord' && ` This demo assumes the position was acquired on ${formatDate(demoAsOf(r))}.`}
          </p>
          <p className="verdict-line" aria-live="polite">
            <span className={`verdict v-${result.verdict}`}>
              <Icon name={{ met: 'check', unmet: 'x', limited: 'clock', hold: 'alert', na: 'info' }[result.verdict] as 'check'} />
              {{ met: 'Requirement met', unmet: 'Requirement not met', limited: `Met, covered through ${formatDate(result.coveredThrough)}`, hold: 'Hold, do not add', na: 'Not checked' }[result.verdict]}
            </span>
            <span>
              {result.why} {r.status === 'Withdrawn' ? 'A withdrawal is the one thing that changes the board’s conclusion.' : 'The board’s conclusion does not change.'}
            </span>
          </p>
          <button className="text-link json-toggle" aria-expanded={json} onClick={() => setJson((x) => !x)}>
            <Icon name="braces" />
            {json ? 'Hide' : 'Show'} the oracle response
          </button>
          {json && <JsonView value={oracleResponse(r, rule, result)} />}
        </div>
        <p className="notice">Fictional record from an illustrative board. Not a real Shari’ah ruling, audit opinion or financial advice.</p>
      </div>
    </div>
  );
}
