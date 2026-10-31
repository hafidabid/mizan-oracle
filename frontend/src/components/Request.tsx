import { DuskSky, Rosette } from './Ornament';

/** The closing section: one next step for each audience. */
export function Request() {
  return (
    <section id="request" className="doc request doc-sky" aria-labelledby="reqTitle">
      <DuskSky lanterns />
      <div className="wrap">
        {/* The margin column has no section number here, so a rosette holds it. */}
        <Rosette size={150} className="orn-margin orn-solo" />
        <h2 id="reqTitle">Next steps</h2>
        <div className="req-grid">
          <div>
            <h3>Protocols and issuers</h3>
            <p>Submit one product at a fixed version: documents, contract source and a short questionnaire. A review takes about four weeks.</p>
            <a className="btn btn-primary" href="mailto:reviews@mizan.example?subject=Review%20request">
              Request a review
            </a>
            <p className="muted small">Demo: this opens an email to a placeholder address.</p>
          </div>
          <div>
            <h3>Scholars and investors</h3>
            <p>Read who sits on the board, how they stay independent and which standards they apply. Then open any record and read its reasoning.</p>
            <a className="btn btn-quiet" href="#how">
              The method and board
            </a>
          </div>
          <div>
            <h3>Builders</h3>
            <p>Gate deposits on a current approval with one call to the oracle, on-chain or off-chain.</p>
            <a className="btn btn-quiet" href="#builders">
              Oracle reference
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
