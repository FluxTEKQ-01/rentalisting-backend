/**
 * Parses freeform Indian currency shorthand into a numeric value.
 * Handles formats like:
 * - 1.45cr, 1.45 cr, 1.45 crore, 1.45crores -> 14,500,000
 * - 75l, 75 l, 75 lakh, 75 lakhs, 75 lac -> 7,500,000
 * - 45k, 45 k, 45 thousand -> 45,000
 * - 45,000, 1,45,00,000 -> 45000, 14500000
 * - 5000000 -> 5000000
 */
export function parseIndianCurrency(val: string | number | undefined | null): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;

  const raw = String(val).trim().toLowerCase().replace(/,/g, '');
  if (!raw) return 0;

  // Match crore / cr
  const croreMatch = raw.match(/^([0-9.]+)\s*(cr|crore|crores)$/);
  if (croreMatch) {
    const num = parseFloat(croreMatch[1]);
    return isNaN(num) ? 0 : Math.round(num * 10000000);
  }

  // Match lakh / lac / l
  const lakhMatch = raw.match(/^([0-9.]+)\s*(l|lac|lacs|lakh|lakhs)$/);
  if (lakhMatch) {
    const num = parseFloat(lakhMatch[1]);
    return isNaN(num) ? 0 : Math.round(num * 100000);
  }

  // Match thousand / k
  const thousandMatch = raw.match(/^([0-9.]+)\s*(k|thousand|thousands)$/);
  if (thousandMatch) {
    const num = parseFloat(thousandMatch[1]);
    return isNaN(num) ? 0 : Math.round(num * 1000);
  }

  // Fallback: strip any non-numeric except decimal point
  const numOnly = raw.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(numOnly);
  return isNaN(parsed) ? 0 : parsed;
}
