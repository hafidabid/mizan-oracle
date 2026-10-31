import { useState, type RefObject } from 'react';
import { getReview, STATUS_ORDER } from '../data/reviews';
import { BOARD_KEY, evaluateRule, oracleResponse, REGISTRY, RULE_MATRIX, RULES, SAMPLE_REQUEST, SOLIDITY } from '../lib/rules';
import { JsonView } from './JsonView';
import { DuskSky, Rosette } from './Ornament';
import { useMedia } from '../hooks/useMedia';
import { Icon } from './Icon';
import { StatusTag } from './Status';

const FIELDS: Array<[string, string]> = [
  ['boardConclusion', 'APPROVED or NOT_APPROVED. Set by the board vote. Only a withdrawal changes it, by voiding it.'],
  ['reviewStatus', 'ACTIVE, EXPIRED, NEEDS_REVIEW, WITHDRAWN, REPLACED or CLOSED. This is what changes over time.'],
  ['validFrom / validUntil', 'The 12-month review period as issued. Null when there was no approval.'],
  ['effectiveUntil', 'When the approval actually stopped being in force: earlier than validUntil after a suspension, a replacement or a withdrawal. The “approved when acquired” rule compares your asOf date with it.'],
  ['purification', 'Null, or { rate, base, from }: the share of income to give to charity, what it applies to, and from when.'],
  ['requirementMet', 'Your rule’s answer: true, false, or null when the rule does not check.'],
  ['provenance.codeHash', 'Hash of the reviewed contract code. The on-chain check compares it with the live implementation, so an upgrade stops matching.'],
  ['provenance.history', 'One entry per change of status. Board decisions carry their own notice hash, vote, signature and transaction. Expiry is automatic and unsigned.'],
];

const TABS = [
  { id: 'sol', label: 'Solidity' },
  { id: 'http', label: 'HTTP' },
  { id: 'json', label: 'Response' },
] as const;

const VERDICT_LABEL = { met: 'Yes', unmet: 'No', limited: 'Yes, up to a date', hold: 'Hold, do not add', na: 'Null' } as const;

const CHECKING = RULES.filter((x) => x.id !== 'none') as Array<{ id: 'current' | 'onRecord'; label: string }>;

export function Builders({ sectionRef, onOpen }: { sectionRef: RefObject<HTMLElement | null>; onOpen: (id: string) => void }) {
  const r = getReview('token');
  const res = evaluateRule(r, 'current');
  // On phones the reference parts fold away; on wider screens they are open.
  const phone = useMedia('(max-width: 640px)');
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('sol');
  return (
    <section id="builders" ref={sectionRef} className="doc doc-alt doc-sky" aria-labelledby="buildTitle">
      <DuskSky builders />
      <div className="wrap">
        <Rosette size={150} className="orn-margin" />
        <div className="doc-head">
          <h2 id="buildTitle">
            <span className="sec">§5</span> For builders: the oracle
          </h2>
          <p className="lede">Applications read the same record and apply their own rule. The rule decides what your app accepts. It never changes what the board decided.</p>
        </div>

        <div className="doc-grid">
          <div className="sticky-col">
            <h3 className="h-sm">Read a record</h3>
            <div className="seg code-tabs" role="group" aria-label="Code sample">
              {TABS.map((t) => (
                <button key={t.id} aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
            {tab === 'sol' && (
              <pre className="code" tabIndex={0} role="region" aria-label="Solidity interface">
                {SOLIDITY}
              </pre>
            )}
            {tab === 'http' && (
              <pre className="code" tabIndex={0} role="region" aria-label="HTTP request">
                {SAMPLE_REQUEST}
              </pre>
            )}
            {tab === 'json' && <JsonView value={oracleResponse(r, 'current', res)} />}
            <p className="small mt">{tab === 'sol' ? 'Gate a deposit on a current approval in one call.' : tab === 'http' ? 'The same record over HTTPS, for apps and dashboards.' : 'What the HTTP call returns for MZN-001 under the “Current approval” rule.'}</p>
          </div>
          <div>
            <h3 className="h-sm">Which rule accepts what</h3>
            <div className="table-wrap" tabIndex={0} role="region" aria-label="Rule table, scrolls sideways on small screens">
              <table className="matrix">
                <caption className="sr">What each application rule answers for a record in each status</caption>
                <thead>
                  <tr>
                    <th scope="col">Status</th>
                    {CHECKING.map((x) => (
                      <th scope="col" key={x.id}>
                        {x.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {STATUS_ORDER.map((s) => (
                    <tr key={s}>
                      <th scope="row">
                        <StatusTag status={s} />
                      </th>
                      {CHECKING.map((x) => {
                        const v = RULE_MATRIX[s][x.id];
                        return (
                          <td key={x.id} className={`v-${v}`}>
                            <Icon name={v === 'met' ? 'check' : v === 'unmet' ? 'x' : v === 'hold' ? 'alert' : 'clock'} />
                            <span className="v-label">{VERDICT_LABEL[v]}</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="small mt">Use “Current approval” to gate new deposits. Use “Approved when acquired”, with the position’s <code>asOf</code> date, only to judge positions already held: a “yes, up to a date” answer comes with <code>coveredThrough</code>, and a hold comes with <code>advice: HOLD_DO_NOT_ADD</code>. A third rule, “Not checked”, is not shown: it always returns <code>requirementMet: null</code>, never <code>true</code>.</p>

            <details className="ref" open={!phone}>
            <summary className="h-sm">Fields</summary>
            <dl className="fields">
              {FIELDS.map(([k, d]) => (
                <div key={k}>
                  <dt>
                    <code>{k}</code>
                  </dt>
                  <dd>{d}</dd>
                </div>
              ))}
            </dl>
            </details>

            <details className="ref" open={!phone}>
            <summary className="h-sm">Verify a record yourself</summary>
            <dl className="keys">
              <div>
                <dt>Board key</dt>
                <dd>
                  <code>{BOARD_KEY}</code>
                </dd>
              </div>
              <div>
                <dt>Registry contract</dt>
                <dd>
                  <code>{REGISTRY}</code>
                </dd>
              </div>
            </dl>
            <ol className="verify">
              <li>Download the report from <code>provenance.reportUrl</code> and hash it with SHA-256.</li>
              <li>Check the hash equals <code>provenance.reportHash</code>.</li>
              <li>
                For each signed entry in <code>provenance.history</code>, recover the signer of <code>keccak256(abi.encode(recordId, noticeHash, status, at))</code> from its <code>signature</code>. It must be the board key above. The first entry’s notice is the report itself.
              </li>
              <li>Check the registry contract logged that entry in its <code>tx</code>, at its <code>block</code>.</li>
            </ol>
            </details>
            <button className="btn btn-quiet" onClick={() => onOpen('rent')}>
              Try the rules on a withdrawn record
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
