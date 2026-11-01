import type { IconName } from '../components/Icon';

export type Conclusion = 'Approved' | 'Not approved';
export type Status = 'Active' | 'Expired' | 'Needs review' | 'Withdrawn' | 'Replaced' | 'Closed';
export type ProductType = 'Token' | 'DeFi Pool' | 'Yield Vault';
export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'mute';

/** The four sample records the hero lets you switch between: one per kind of answer. */
export type HeroProductId = 'token' | 'vault' | 'rent' | 'lend';

export interface PolicyRef {
  /** e.g. "AAOIFI SS 9" */
  std: string;
  /** what the standard covers */
  title: string;
}

export interface Review {
  id: string;
  rec: string;
  name: string;
  version: string;
  type: ProductType;
  chain: string;
  conclusion: Conclusion;
  status: Status;
  /** ISO date (YYYY-MM-DD) the conclusion was issued */
  issue: string;
  /** ISO date the review period ends, or null when there is no review period */
  expiry: string | null;
  /** ISO date the status last changed, when it is not Active */
  statusDate?: string;
  /** Why the status changed, in one line */
  statusNote?: string;
  scope: string;
  desc: string;
  evidence: string[];
  excl: string[];
  /** The standards the analysis was mapped against */
  refs: PolicyRef[];
  /** How the board characterised the product in fiqh terms (takyīf) */
  takyif: string;
  /** The screens the board ran, and what it found */
  screens: { riba: string; gharar: string; maysir: string; activity: string };
  /** Where the schools of law differ on the question this product raises, if they do */
  madhhab?: string;
  recusal?: string;
  /** Voting members: for / against */
  vote: [number, number];
  dissent?: string;
  /** Income to give to charity, with its basis. Omitted when none was identified. */
  purification?: { rate: number; base: string; from: string; method: string };
  /** What a holder should do now, for any record that is not Active */
  holders?: string;
  /** For a withdrawal: the date from which the approval is treated as void */
  voidFrom?: string;
  withdrawalVote?: [number, number];
  supersededBy?: string;
  supersedes?: string;
}

const SS = {
  financialPaper: { std: 'AAOIFI SS 21', title: 'Financial paper (shares and bonds)' },
  online: { std: 'AAOIFI SS 38', title: 'Online financial dealings' },
  sharikah: { std: 'AAOIFI SS 12', title: 'Sharikah (partnership)' },
  mudarabah: { std: 'AAOIFI SS 13', title: 'Mudarabah' },
  ijarah: { std: 'AAOIFI SS 9', title: 'Ijarah (leasing)' },
  sukuk: { std: 'AAOIFI SS 17', title: 'Investment sukuk' },
  loan: { std: 'AAOIFI SS 19', title: 'Loan (qard)' },
  currency: { std: 'AAOIFI SS 1', title: 'Trading in currencies' },
} satisfies Record<string, PolicyRef>;

/** Fictional demo records from an illustrative Shari’ah board. Not real rulings. */
export const REVIEWS: Review[] = [
  {
    id: 'token', rec: 'MZN-001', name: 'Qamar Compute Token (QMR)', version: 'v1.2.0', type: 'Token', chain: 'Ethereum',
    conclusion: 'Approved', status: 'Active', issue: '2026-10-12', expiry: '2027-10-12',
    scope: 'Token contract v1.2.0 and its stated distribution', desc: 'Utility token with a fixed supply and a stated distribution schedule',
    evidence: ['Token whitepaper v1.2', 'Audited contract source at tag v1.2.0', 'Issuer questionnaire and cap table'],
    excl: ['Future contract upgrades', 'Wrapped or bridged versions', 'Secondary-market venues'],
    refs: [SS.online],
    takyif: 'A digital asset with lawful utility (māl mutaqawwam), held and traded by spot sale.',
    screens: { riba: 'None found. No yield is promised on holding.', gharar: 'Supply and rights are fully disclosed.', maysir: 'No lottery or chance-based distribution.', activity: 'The network’s use is lawful: payments for compute.' },
    vote: [3, 0],
  },
  {
    id: 'pool', rec: 'MZN-002', name: 'Sahara Swap QMR/HJZ Pool', version: 'v2.0', type: 'DeFi Pool', chain: 'Ethereum',
    conclusion: 'Approved', status: 'Active', issue: '2026-10-20', expiry: '2027-10-20',
    scope: 'Spot-swap pool mechanism and fee model, v2.0', desc: 'Liquidity pool that earns a share of swap fees',
    evidence: ['Pool specification', 'Fee and incentive description', 'Pool contract and risk controls'],
    excl: ['New asset pairs', 'Incentive farms built on top', 'Unreviewed parameter changes'],
    refs: [SS.sharikah, SS.currency],
    takyif: 'Liquidity providers are co-owners (sharikat al-milk) of the pool; each swap is a spot exchange settled in the same transaction.',
    screens: { riba: 'Fees come from swaps, not from lending.', gharar: 'Pricing curve is published and deterministic.', maysir: 'None found.', activity: 'Both pooled assets are themselves approved (MZN-001, MZN-008).' },
    madhhab: 'Whether tokens take the rulings of money is the old question of fulūs, copper coins that circulated as currency. Shāfiʿī jurists generally held that fulūs do not carry the status of money (thamaniyyah); Mālik disliked their deferred exchange; Ḥanafī jurists differed among themselves, with Muḥammad al-Shaybānī treating them as currency; and the Ḥanbalī school has two reports. If tokens are money, every swap is ṣarf and needs spot delivery (taqābuḍ). The board held that settlement in the same transaction satisfies taqābuḍ on either view.',
    vote: [3, 0],
  },
  {
    id: 'vault', rec: 'MZN-003', name: 'Silk Road Trade Finance Vault', version: 'v1.0', type: 'Yield Vault', chain: 'Ethereum',
    conclusion: 'Approved', status: 'Expired', issue: '2024-06-30', expiry: '2025-06-30', statusDate: '2025-06-30',
    statusNote: 'The 12-month period ended and the issuer did not request renewal.',
    scope: 'Profit-sharing strategy as described in memo v1.0', desc: 'Profit-sharing vault that deploys into trade finance',
    evidence: ['Strategy memo v1.0', 'Revenue-source breakdown', 'Strategy contract outline'],
    excl: ['Changes to the strategy', 'Third-party protocols', 'Any period after expiry'],
    refs: [SS.mudarabah],
    takyif: 'Mudarabah: depositors supply capital, the strategy manager supplies work, and profit is shared at a stated ratio.',
    screens: { riba: 'Returns are a share of profit, not a fixed rate. Incidental interest on the deposit buffer was within the board’s 5% tolerance and is purified.', gharar: 'Counterparties listed; one disclosure was thin.', maysir: 'None found.', activity: 'Trade finance in lawful goods. 1.8% of income came from a bank deposit buffer.' },
    vote: [2, 1], dissent: 'One member held that the counterparty disclosures were too thin to rule out fixed-return trade receivables.',
    madhhab: 'The memo restricts the manager to trade finance (muḍārabah muqayyadah). Ḥanafī and Ḥanbalī jurists allow the capital provider to restrict the manager this way; Mālikī and Shāfiʿī jurists reject restrictions that unduly narrow the trade. The restriction here is to a broad sector, which all four schools accept.',
    purification: { rate: 0.018, base: 'each distribution received', from: '2024-06-30', method: 'Interest earned on the deposit buffer as a share of total income, recalculated each quarter.' },
    holders: 'The approval expired and was never withdrawn. Income received up to 30 Jun 2025 stands, after purification. Holding after that date is unreviewed.',
  },
  {
    id: 'bridge', rec: 'MZN-004', name: 'Oasis Bridge', version: 'March 2026 release', type: 'Token', chain: 'Ethereum',
    conclusion: 'Approved', status: 'Needs review', issue: '2026-03-04', expiry: '2027-03-04', statusDate: '2026-09-22',
    statusNote: 'A September 2026 contract upgrade changed the fee logic. The board is reassessing.',
    scope: 'Bridge mechanism as of the March 2026 release', desc: 'Cross-chain bridge from Ethereum to Base that locks a token and mints a 1:1 receipt',
    evidence: ['Bridge architecture', 'Transfer-risk analysis'],
    excl: ['The September 2026 contract upgrade'],
    refs: [SS.ijarah, SS.online],
    takyif: 'Safekeeping (wadīʿah) of the locked token, with a receipt token that represents it 1:1, for a flat service fee (ujrah).',
    screens: { riba: 'Flat transfer fee, not tied to time.', gharar: 'Custody of locked tokens is disclosed.', maysir: 'None found.', activity: 'Only approved tokens can be bridged.' },
    vote: [2, 0], recusal: 'The Mālikī member recused: they advised the issuer in 2025. The other two voting members decided.',
    holders: 'Hold existing positions, but do not add to them, until the board publishes its reassessment. The approval does not cover the upgraded contract, and the oracle answers false meanwhile.',
  },
  {
    id: 'lend', rec: 'MZN-005', name: 'Harbor Lend USDC Pool', version: 'v1.0', type: 'DeFi Pool', chain: 'Ethereum',
    conclusion: 'Not approved', status: 'Closed', issue: '2026-05-10', expiry: null, statusDate: '2026-05-10',
    statusNote: 'Not approved at review. Lenders earn a fixed rate on money lent.',
    scope: 'Interest-bearing lending mechanism', desc: 'Lending pool with a fixed interest-rate model',
    evidence: ['Lending design', 'Interest-rate model', 'Pool contract source'],
    excl: ['Not applicable'],
    refs: [SS.loan],
    takyif: 'A loan (qarḍ) with a stipulated increase paid to the lender.',
    screens: { riba: 'Fixed return on a loan. This is riba.', gharar: 'Liquidation terms are disclosed.', maysir: 'None found.', activity: 'Not assessed further once riba was found.' },
    vote: [3, 0],
    holders: 'Not approved. A holder seeking compliance should exit and give any interest received to charity.',
  },
  {
    id: 'rent', rec: 'MZN-006', name: 'Marina Tower Dubai Rental Vault', version: 'v1.1', type: 'Yield Vault', chain: 'Ethereum',
    conclusion: 'Approved', status: 'Withdrawn', issue: '2025-11-20', expiry: '2026-11-20', statusDate: '2026-08-14',
    statusNote: 'Retracted after the board learned that the leased assets were never transferred to the vault.',
    scope: 'Rental-income strategy over documented assets', desc: 'Vault that passes through rent from leased apartments in a Dubai Marina tower',
    evidence: ['Asset documents', 'Cash-flow model', 'Vault contract source'],
    excl: ['Everything. The approval is void from the date of issue.'],
    refs: [SS.ijarah],
    takyif: 'Presented as ijarah (a lease of owned assets). Because the vault never owned the assets, there was no valid lease.',
    screens: { riba: 'Payments were not rent on owned assets, so the return was effectively a fixed return on capital.', gharar: 'Asset ownership was misrepresented.', maysir: 'None found.', activity: 'Not reassessed.' },
    vote: [3, 0], voidFrom: '2025-11-20', withdrawalVote: [3, 0],
    purification: { rate: 1, base: 'distributions received, excluding any return of the holder’s own capital', from: '2025-11-20', method: 'The defect existed from the start, so no distribution counts as rent.' },
    holders: 'Exit. Purify all distributions received since issue, apart from any return of your own capital. The approval is void, not just ended.',
  },
  {
    id: 'asset', rec: 'MZN-007', name: 'Hijaz Commodity Token (HJZ)', version: 'v1', type: 'Token', chain: 'Ethereum',
    conclusion: 'Approved', status: 'Replaced', issue: '2025-08-01', expiry: '2026-08-01', statusDate: '2026-07-20',
    statusNote: 'Version 2 was reviewed and is now covered by MZN-008.',
    scope: 'Token version 1 design only', desc: 'Asset-backed token, version 1',
    evidence: ['Custody agreement', 'Redemption terms', 'Contract source'],
    excl: ['Version 2, covered by MZN-008'],
    refs: [SS.sukuk],
    takyif: 'A certificate of undivided ownership in custodied assets, in the manner of investment sukuk.',
    screens: { riba: 'Backed by owned assets, no interest.', gharar: 'Custody and redemption disclosed.', maysir: 'None found.', activity: 'Assets are lawful commodities.' },
    vote: [3, 0], supersededBy: 'MZN-008',
    holders: 'Version 1 holdings remained approved until 20 Jul 2026. Migrate to version 2, which has its own approval (MZN-008).',
  },
  {
    id: 'asset2', rec: 'MZN-008', name: 'Hijaz Commodity Token (HJZ)', version: 'v2', type: 'Token', chain: 'Ethereum',
    conclusion: 'Approved', status: 'Active', issue: '2026-07-20', expiry: '2027-07-20',
    scope: 'Token version 2 design, including the new redemption window', desc: 'Asset-backed token, version 2',
    evidence: ['Custody agreement (amended)', 'Redemption terms v2', 'Contract source v2'],
    excl: ['Version 1 (see MZN-007)', 'Wrapped or bridged versions'],
    refs: [SS.sukuk],
    takyif: 'A certificate of undivided ownership in custodied assets, in the manner of investment sukuk.',
    screens: { riba: 'Backed by owned assets, no interest.', gharar: 'Custody and redemption disclosed.', maysir: 'None found.', activity: 'Assets are lawful commodities.' },
    vote: [3, 0], supersedes: 'MZN-007',
  },
  {
    id: 'brew', rec: 'MZN-009', name: 'Copper Kettle Brewery (BREW)', version: 'v1.0', type: 'Token', chain: 'Ethereum',
    conclusion: 'Not approved', status: 'Closed', issue: '2026-09-08', expiry: null, statusDate: '2026-09-08',
    statusNote: 'Not approved at review. The underlying business brews and sells beer.',
    scope: 'Revenue-share token over a craft brewery and its taprooms', desc: 'Token that pays holders a share of a brewery’s monthly sales',
    evidence: ['Revenue-share agreement', 'Brewery financial statements', 'Token contract source'],
    excl: ['Not applicable'],
    refs: [SS.financialPaper],
    takyif: 'A certificate entitling the holder to a share of a business’s sales, in the manner of shares in that business.',
    screens: { riba: 'Not assessed further once the activity screen failed.', gharar: 'Revenue terms are disclosed.', maysir: 'None found.', activity: 'Core business is brewing and selling alcohol (khamr), which is prohibited. Not within any tolerance.' },
    vote: [3, 0],
    holders: 'Not approved. A holder seeking compliance should exit and give any distributions received to charity.',
  },
];

export const STATUS: Record<Status, { tone: Tone; icon: IconName; desc: string }> = {
  Active: { tone: 'ok', icon: 'check', desc: 'Approved within the stated scope, and the review period has not ended.' },
  Expired: { tone: 'warn', icon: 'clock', desc: 'The review period ended. The conclusion stays on record but is no longer current.' },
  'Needs review': { tone: 'warn', icon: 'alert', desc: 'Something material changed, such as a contract upgrade. The approval is suspended while the board reassesses.' },
  Withdrawn: { tone: 'bad', icon: 'undo', desc: 'The board retracted its approval after new facts came to light. It is void, as if never given.' },
  Replaced: { tone: 'mute', icon: 'replace', desc: 'A newer review covers the current version. This record stays for history.' },
  Closed: { tone: 'mute', icon: 'xc', desc: 'The board did not approve, so there is nothing to track over time.' },
};

export const STATUS_ORDER = Object.keys(STATUS) as Status[];

export const TYPE_ICON: Record<ProductType, IconName> = {
  Token: 'token',
  'DeFi Pool': 'pool',
  'Yield Vault': 'vault',
};

export function getReview(id: string): Review {
  const r = REVIEWS.find((x) => x.id === id);
  if (!r) throw new Error(`Unknown review: ${id}`);
  return r;
}

export function findByRec(rec: string): Review | undefined {
  return REVIEWS.find((x) => x.rec === rec);
}

/** The five parts every record states, in the order the board settles them. */
export interface Part {
  short: string;
  title: string;
  text: string;
  /** A sample field from the record. Pairs of [key, value]. */
  field: Array<[string, string]>;
}

export const PARTS: Part[] = [
  { short: 'Intake', title: 'One product, one version', text: 'The issuer submits the product at a fixed version, with its documents and contract source. Anything not submitted is out of scope, and the record says so.', field: [['product', '"Sample Token A"'], ['version', '"v1.2.0"'], ['excludes', '["upgrades", "wrapped versions"]']] },
  { short: 'Evidence', title: 'Three disciplines read it', text: 'A technical reviewer checks the code against the documents and an economist traces where every return comes from. Their findings go to the three voting scholars (see §4).', field: [['evidence', '["whitepaper v1.2", "audited source"]']] },
  { short: 'Screens', title: 'Characterise, then screen', text: 'Scholars say what contract the product is in fiqh terms, then screen it for riba, gharar, maysir and unlawful activity against the AAOIFI standards that apply.', field: [['takyif', '"digital asset, spot sale"'], ['refs', '["AAOIFI SS 38"]']] },
  { short: 'Vote', title: 'One conclusion, with the vote', text: 'Three voting scholars decide by majority. The vote, any dissent and any recusal are published with the record, in full.', field: [['boardConclusion', '"APPROVED"'], ['vote', '"3-0"'], ['dissent', 'null']] },
  { short: 'Publish', title: 'Signed and anchored', text: 'The report is signed with the board key and its hash anchored on-chain. Every later change of status is signed and anchored as its own entry.', field: [['history', '[{ status: "ACTIVE", block: 25310768 }]'], ['validUntil', '"2027-10-12"']] },
];
