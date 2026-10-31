import { type Review } from '../data/reviews';

/** The demo's fixed "today", so day counts stay stable for every viewer. */
export const TODAY = parseDate('2026-10-29');

/** Sample Token A's review period, used by the status-over-time section. */
export const ISSUE = parseDate('2026-10-12');
export const PERIOD_DAYS = 365;
/** The section runs a little past expiry, to February 2028. */
export const TIMELINE_DAYS = 487;
export const TODAY_DAY = daysBetween(ISSUE, TODAY);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function parseDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? parseDate(value) : value;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

/** What the "valid" column should say for a record, given its status. */
export function validity(r: Review): { text: string; live: boolean } {
  switch (r.status) {
    case 'Active':
      return { text: `Until ${formatDate(r.expiry)}`, live: true };
    case 'Expired':
      return { text: `Expired ${formatDate(r.expiry)}`, live: false };
    case 'Withdrawn':
      return { text: `Withdrawn ${formatDate(r.statusDate)}, void from issue`, live: false };
    case 'Needs review':
      return { text: `Under review since ${formatDate(r.statusDate)}`, live: false };
    case 'Replaced':
      return { text: `Replaced ${formatDate(r.statusDate)}`, live: false };
    case 'Closed':
      return { text: '—', live: false };
  }
}

/** A short line describing where a record stands in its review period. */
export function periodNote(r: Review): string {
  if (r.status === 'Active' && r.expiry) return `${daysBetween(TODAY, parseDate(r.expiry))} days left in the 12-month period`;
  return r.statusNote ?? '';
}
