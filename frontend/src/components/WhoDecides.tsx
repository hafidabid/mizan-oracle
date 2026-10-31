import type { RefObject } from 'react';
import { Rosette } from './Ornament';
import { Star } from './Icon';

const SEATS: Array<{ role: string; field: string; votes: boolean; school?: string }> = [
  { role: 'Chair', school: 'Shāfiʿī', field: 'Islamic commercial law (fiqh al-muʿāmalāt). Seat requires 10+ years on a bank or fund Shari’ah board.', votes: true },
  { role: 'Member', school: 'Ḥanafī', field: 'Legal theory (uṣūl al-fiqh) and contract law. Seat requires a formal ijāzah in fiqh.', votes: true },
  { role: 'Member', school: 'Mālikī', field: 'Islamic capital markets and sukuk structuring.', votes: true },
  { role: 'Technical reviewer', field: 'Smart-contract security. Reads the code against the documents.', votes: false },
  { role: 'DeFi economist', field: 'Market structure. Traces where returns come from and who carries risk.', votes: false },
];

export function WhoDecides({ sectionRef }: { sectionRef: RefObject<HTMLElement | null> }) {
  return (
    <section id="who" ref={sectionRef} className="doc doc-first" aria-labelledby="whoTitle">
      <div className="wrap">
        <Rosette size={150} className="orn-margin" />
        <div className="doc-head">
          <h2 id="whoTitle">
            <span className="sec">§4</span> Who decides
          </h2>
          <p className="lede">A conclusion is only as good as the people behind it. The board, its rules of independence and the standards it applies are published here so a scholar can check them before trusting any record.</p>
        </div>

        <div className="doc-grid">
          <div>
            <h3 className="h-sm">The Shari’ah Supervisory Board</h3>
            <table className="seats">
              <caption className="sr">Board seats</caption>
              <tbody>
                {SEATS.map((s, i) => (
                  <tr key={i}>
                    <th scope="row">
                      {s.role}
                      <small>{s.votes ? `Votes · ${s.school}` : 'Advises, no vote'}</small>
                    </th>
                    <td>{s.field}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="note">
              The three voting members come from three schools of law, and a record notes where the schools differ on the question it raises. This is an illustrative board for a demo: the seats show how a real board would be composed, and no real person sits on it.
            </p>
          </div>

          <div>
            <h3 className="h-sm">Independence</h3>
            <ul className="ticks">
              <li>
                <Star />
                The issuer pays a flat fee, agreed before the review starts. It does not change with the outcome.
              </li>
              <li>
                <Star />
                Members may not hold the product they review. Recusals are published on the record.
              </li>
              <li>
                <Star />
                Mizan issues reviews and conclusions, not fatwas. It is advisory and not a regulator.
              </li>
              <li>
                <Star />
                Other boards may reach different conclusions on the same product. Each record states only this board’s view.
              </li>
            </ul>
            <h3 className="h-sm">Standards</h3>
            <p className="std-list">
              As of October 2026 AAOIFI has no dedicated Shari’ah Standard for crypto-assets, so the board applies the nearest Shari’ah Standards by analogy and says which on every record: no. 1 (currencies), 9 (ijarah), 12 (sharikah), 13 (mudarabah), 17 (investment sukuk), 19 (qard), 21 (financial paper) and 38 (online financial dealings).
            </p>
            <h3 className="h-sm">Renewal and withdrawal</h3>
            <p className="std-list">
              Approvals last 12 months. Any material change moves a record to Needs review the same day. A withdrawal needs its own vote, states the date from which the approval is void, and tells holders what to do with income already received.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
