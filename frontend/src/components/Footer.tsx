import { Brand, SECTIONS } from "./Nav";
// import { Rosette, Twinkles } from "./Ornament";

export function Footer() {
  return (
    <>
      {/* <section className="ayah-band" aria-label="The name Mizan">
        <Twinkles />
        <Rosette size={620} className="orn-ayah" />
        <div className="wrap">
          <figure className="ayah">
            <blockquote>
              <p lang="ar" dir="rtl" className="ar-text">
                وَالسَّمَاءَ رَفَعَهَا وَوَضَعَ الْمِيزَانَ ﴿٧﴾ أَلَّا تَطْغَوْا فِي الْمِيزَانِ ﴿٨﴾ وَأَقِيمُوا الْوَزْنَ بِالْقِسْطِ وَلَا تُخْسِرُوا الْمِيزَانَ ﴿٩﴾
              </p>
              <p>“And the heaven He raised and imposed the balance, that you not transgress within the balance. And establish weight in justice and do not make deficient the balance.”</p>
            </blockquote>
            <figcaption>Qur’an, Sūrat al-Raḥmān 55:7–9, Sahih International translation. Mīzān means the balance.</figcaption>
          </figure>
        </div>
      </section> */}
      <footer>
        <div className="wrap foot-row">
          <span className="brand">
            <Brand inverted />
          </span>
          <nav aria-label="Footer">
            {SECTIONS.map((l) => (
              <a key={l.id} href={`#${l.id}`}>
                {l.label}
              </a>
            ))}
            <a href="#request">Request a review</a>
          </nav>
          <p>
            Every record on this page is fictional demo data from an
            illustrative Shari’ah board, and dates are fixed at 29 Oct 2026. It
            is not a Shari’ah ruling, an audit opinion or financial advice.
          </p>
        </div>
      </footer>
    </>
  );
}
