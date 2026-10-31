import type { Review, Status } from '../data/reviews';
import { daysBetween, formatDate, parseDate } from './dates';

export type RuleId = 'current' | 'onRecord' | 'none';

export const RULES: Array<{ id: RuleId; label: string; desc: string }> = [
  { id: 'current', label: 'Current approval', desc: 'Accepts only an Active approval. The right rule for most products.' },
  { id: 'onRecord', label: 'Approved when acquired', desc: 'For positions already held: was the approval in force on the date you acquired it (asOf)? If it has since expired or been replaced, the answer says how far the cover reaches. Never accepts a withdrawn approval.' },
  { id: 'none', label: 'Not checked', desc: 'The application does not check Shari’ah status. The oracle answers null, not yes.' },
];

/**
 * What each checking rule answers for a record in a given status (for an approved record).
 * met: yes. limited: yes, but only up to a date. hold: no new positions; keep existing ones while the board reassesses. unmet: no.
 */
export type Verdict = 'met' | 'limited' | 'hold' | 'unmet' | 'na';
export const RULE_MATRIX: Record<Status, Record<'current' | 'onRecord', Verdict>> = {
  Active: { current: 'met', onRecord: 'met' },
  Expired: { current: 'unmet', onRecord: 'limited' },
  Replaced: { current: 'unmet', onRecord: 'limited' },
  'Needs review': { current: 'unmet', onRecord: 'hold' },
  Withdrawn: { current: 'unmet', onRecord: 'unmet' },
  Closed: { current: 'unmet', onRecord: 'unmet' },
};

export interface RuleResult {
  verdict: Verdict;
  /** What requirementMet returns: null when the rule does not check */
  met: boolean | null;
  /** For a limited answer: the last day the approval covered */
  coveredThrough?: string | null;
  why: string;
}

/** The acquisition date the demo uses for the "approved when acquired" rule: 30 days after issue, in UTC so it never depends on the viewer's time zone. */
export const demoAsOf = (r: Review) => new Date(Date.parse(`${r.issue}T00:00:00Z`) + 30 * 86_400_000).toISOString().slice(0, 10);

/** How an application's own rule reads a record. The board's conclusion never changes, except by withdrawal. */
export function evaluateRule(r: Review, rule: RuleId, asOf = demoAsOf(r)): RuleResult {
  if (rule === 'none') return { verdict: 'na', met: null, why: 'This rule does not check Shari’ah status, so the oracle gives no answer. It does not mean the product is compliant.' };
  if (r.conclusion !== 'Approved') return { verdict: 'unmet', met: false, why: 'The board did not approve this product, so there is no approval to accept.' };
  const v = RULE_MATRIX[r.status][rule];
  switch (r.status) {
    case 'Active':
      return { verdict: v, met: true, why: `The approval is current until ${formatDate(r.expiry)}.` };
    case 'Withdrawn':
      return { verdict: v, met: false, why: `The board withdrew this approval on ${formatDate(r.statusDate)}. It is void from ${formatDate(r.voidFrom)}, so no rule accepts it, whenever the position was acquired.` };
    case 'Needs review':
      return rule === 'current'
        ? { verdict: v, met: false, why: 'The approval is suspended while a material change is reassessed. Do not open new positions.' }
        : { verdict: v, met: false, why: 'Suspended while the board reassesses. Existing positions may be held but not added to; the oracle answers false until the board decides.' };
    case 'Expired':
    case 'Replaced': {
      if (v === 'unmet')
        return r.status === 'Expired'
          ? { verdict: v, met: false, why: `The approval expired on ${formatDate(r.expiry)}. This rule needs a current approval.` }
          : { verdict: v, met: false, why: `This version was replaced by ${r.supersededBy} on ${formatDate(r.statusDate)}. Check ${r.supersededBy} for the current version.` };
      const until = effectiveUntil(r);
      const inForce = !!until && asOf >= r.issue && asOf <= until;
      return inForce
        ? { verdict: 'limited', met: true, coveredThrough: until, why: `Approved when acquired on ${formatDate(asOf)}, and covered through ${formatDate(until)}. Holding after that date is unreviewed.` }
        : { verdict: 'unmet', met: false, why: `Acquired ${formatDate(asOf)}, outside the period the approval was in force.` };
    }
    default:
      return { verdict: v, met: v === 'met', why: '' };
  }
}

const upper = (s: string) => s.toUpperCase().replace(/ /g, '_');

/** One 32-bit hash over the whole string (FNV-1a with a murmur-style finish). */
function hash32(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Deterministic demo hex. Every 8-character chunk hashes the full seed, so different records never share a prefix. */
export function demoHex(seed: string, len: number): string {
  let out = '';
  for (let j = 0; out.length < len; j++) out += hash32(`${seed}#${j}`).toString(16).padStart(8, '0');
  return out.slice(0, len);
}

/** Example Chain makes a block every 12 seconds; block 18,000,000 fell on 1 Jan 2024. */
export const blockFor = (iso: string) => 18_000_000 + daysBetween(parseDate('2024-01-01'), parseDate(iso)) * 7200 + (hash32(iso) % 7000);

export const BOARD_KEY = `0x${demoHex('board', 40)}`;
export const REGISTRY = `0x${demoHex('registry', 40)}`;

/** Where the approval actually stops counting, which is not always validUntil. */
export function effectiveUntil(r: Review): string | null {
  if (r.conclusion !== 'Approved') return null;
  if (r.status === 'Withdrawn') return r.voidFrom ?? r.statusDate ?? null;
  if (r.status === 'Needs review' || r.status === 'Replaced') return r.statusDate ?? null;
  return r.expiry;
}

/**
 * One anchored entry per change of status. Board decisions (approval, suspension, withdrawal,
 * replacement) are signed over their own notice, with their own vote. Expiry is automatic: the
 * registry derives it from validUntil, so it carries no signature.
 */
export function history(r: Review) {
  const first = r.conclusion === 'Approved' ? 'ACTIVE' : 'CLOSED';
  const entries: Array<{ status: string; at: string; vote: string | null }> = [{ status: first, at: r.issue, vote: `${r.vote[0]}-${r.vote[1]}` }];
  if (r.status !== 'Active' && r.status !== 'Closed') {
    const vote = r.status === 'Withdrawn' && r.withdrawalVote ? `${r.withdrawalVote[0]}-${r.withdrawalVote[1]}` : r.status === 'Expired' ? null : `${r.vote[0]}-${r.vote[1]}`;
    entries.push({ status: upper(r.status), at: r.statusDate ?? r.expiry ?? r.issue, vote });
  }
  return entries.map((e) => {
    const automatic = e.status === 'EXPIRED';
    return {
      ...e,
      automatic,
      noticeHash: automatic ? null : `sha256:${demoHex(`${r.rec}/${e.status}/notice`, 64)}`,
      signature: automatic ? null : `0x${demoHex(`${r.rec}/${e.status}/sig`, 130)}`,
      block: blockFor(e.at),
      tx: `0x${demoHex(`${r.rec}/${e.status}/tx`, 64)}`,
    };
  });
}

export function provenance(r: Review) {
  return {
    attestor: 'Illustrative Shari’ah Supervisory Board (demo key)',
    boardKey: BOARD_KEY,
    registry: REGISTRY,
    chain: r.chain,
    reportUrl: `https://mizan.example/reports/${r.rec}.pdf`,
    reportHash: `sha256:${demoHex(`${r.rec}/report`, 64)}`,
    /** Hash of the deployed runtime code that was reviewed. An upgrade changes it, so the oracle stops matching. */
    codeHash: `0x${demoHex(`${r.rec}/code`, 64)}`,
    history: history(r),
  };
}

/** The sample payload an application would receive from the oracle. */
export function oracleResponse(r: Review, rule: RuleId, res: RuleResult) {
  const approved = r.conclusion === 'Approved';
  return {
    recordId: r.rec,
    product: r.name,
    version: r.version,
    boardConclusion: upper(r.conclusion),
    reviewStatus: upper(r.status),
    statusChangedAt: r.statusDate ?? r.issue,
    validFrom: approved ? r.issue : null,
    validUntil: approved ? r.expiry : null,
    effectiveUntil: effectiveUntil(r),
    voidFrom: r.voidFrom ?? null,
    supersededBy: r.supersededBy ?? null,
    scope: r.scope,
    excludes: r.excl,
    vote: `${r.vote[0]}-${r.vote[1]}`,
    hasDissent: !!r.dissent,
    purification: r.purification ? { rate: r.purification.rate, base: r.purification.base, from: r.purification.from } : null,
    standards: r.refs.map((x) => x.std),
    applicationRule: upper(rule === 'onRecord' ? 'approved when acquired' : rule === 'none' ? 'not checked' : rule),
    asOf: rule === 'onRecord' ? demoAsOf(r) : null,
    requirementMet: res.met,
    coveredThrough: res.coveredThrough ?? null,
    advice: res.verdict === 'hold' ? 'HOLD_DO_NOT_ADD' : null,
    provenance: provenance(r),
    checkedAt: '2026-10-29',
    demo: true,
  };
}

export const SAMPLE_REQUEST = `GET https://oracle.mizan.example/v1/records/MZN-001?rule=current

GET https://oracle.mizan.example/v1/records/MZN-007
    ?rule=approved_when_acquired&asOf=2025-09-01`;

export const SOLIDITY = `interface IMizanOracle {
  enum Rule { CURRENT, APPROVED_WHEN_ACQUIRED }

  /// Resolves a proxy to its implementation
  /// (EIP-1967 slot) and compares that code's
  /// hash with the codeHash on the record, so
  /// an upgrade stops matching. Never true for
  /// CLOSED, NEEDS_REVIEW or WITHDRAWN.
  function isAccepted(
    address product,
    Rule rule,
    uint64 asOf // ignored for CURRENT
  ) external view returns (
    bool accepted,
    bytes32 recordId
  );
}

// In your vault:
(bool ok, ) = mizan.isAccepted(
  address(token), IMizanOracle.Rule.CURRENT, 0
);
require(ok, "Shariah approval not current");`;
