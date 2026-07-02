// Shared price/number parsing for manufacturer price lists.
//
// Price lists mix German-style numbers ("2.499,00" = 2499 EUR, dot = thousands
// separator, comma = decimal separator) and US-style numbers ("2,499.00" =
// 2499 EUR, comma = thousands, dot = decimal). Naively replacing only commas
// with dots (the previous implementation) silently truncates German-style
// thousands, e.g. "2.499,00" -> parseFloat("2.499.00") -> 2.499, off by 1000x.

/**
 * Parses a localized number string (German or US style, with optional
 * currency symbols/whitespace) into a plain float. Returns null if the
 * value can't be parsed.
 */
export function parseLocalizedNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return isNaN(value) ? null : value;

  let str = value.toString().trim().replace(/[€$£¥\s]/g, '');
  if (!str) return null;

  const lastComma = str.lastIndexOf(',');
  const lastDot = str.lastIndexOf('.');

  if (lastComma !== -1 && lastDot !== -1) {
    // Both present: whichever comes last is the decimal separator, the
    // other is a thousands separator and gets stripped entirely.
    if (lastComma > lastDot) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    // Only a comma. A decimal separator is virtually always followed by
    // exactly 2 digits (cents), e.g. "459,99". Some price lists (e.g. AXIS'
    // EU export) instead use a bare comma as a thousands separator with no
    // decimals at all, e.g. "19,999" meaning 19999 - which a 2-digit check
    // would otherwise misread as 19.999.
    const digitsAfterComma = str.length - lastComma - 1;
    str = digitsAfterComma === 2 ? str.replace(',', '.') : str.replace(/,/g, '');
  } else if (lastDot !== -1) {
    // Only a dot. Same ambiguity as above, mirrored: 2 trailing digits reads
    // as a decimal ("459.99"), anything else (e.g. German-style "19.999"
    // thousands grouping with no decimals) is stripped as a thousands
    // separator.
    const digitsAfterDot = str.length - lastDot - 1;
    if (digitsAfterDot !== 2) {
      str = str.replace(/\./g, '');
    }
  }

  str = str.replace(/[^\d.-]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

/**
 * Parses a price string into integer cents (rounded). Returns null if the
 * value can't be parsed.
 */
export function parsePriceToCents(value: unknown): number | null {
  const num = parseLocalizedNumber(value);
  return num === null ? null : Math.round(num * 100);
}
