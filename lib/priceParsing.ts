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
    // Only a comma: German-style decimal separator.
    str = str.replace(',', '.');
  }
  // Only a dot (or neither): already a valid decimal string.

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
