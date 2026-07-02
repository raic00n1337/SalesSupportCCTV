import { parseLocalizedNumber, parsePriceToCents } from './priceParsing';

describe('parseLocalizedNumber', () => {
  it('parst deutsches Format (Punkt = Tausender, Komma = Dezimal)', () => {
    expect(parseLocalizedNumber('2.499,00')).toBe(2499);
    expect(parseLocalizedNumber('1.199,90')).toBe(1199.9);
  });

  it('parst US-Format (Komma = Tausender, Punkt = Dezimal)', () => {
    expect(parseLocalizedNumber('2,499.00')).toBe(2499);
    expect(parseLocalizedNumber('€8,660.00')).toBe(8660);
  });

  it('parst reine Dezimalzahlen mit Komma (2 Nachkommastellen -> Dezimaltrennzeichen)', () => {
    expect(parseLocalizedNumber('459,99')).toBe(459.99);
    expect(parseLocalizedNumber('349,50')).toBe(349.5);
  });

  it('parst reine Dezimalzahlen mit Punkt (2 Nachkommastellen -> Dezimaltrennzeichen)', () => {
    expect(parseLocalizedNumber('459.99')).toBe(459.99);
  });

  it('erkennt ein alleinstehendes Komma mit 3 Nachkommastellen als Tausendertrennzeichen (AXIS-Preisliste)', () => {
    // AXIS' EU price list formats whole-euro prices like "1,699" / "19,999"
    // with no decimals at all - a naive "comma = decimal" assumption would
    // misread these as 1.699 / 19.999, off by ~1000x.
    expect(parseLocalizedNumber('1,699')).toBe(1699);
    expect(parseLocalizedNumber('19,999')).toBe(19999);
    expect(parseLocalizedNumber('429')).toBe(429);
  });

  it('erkennt einen alleinstehenden Punkt mit 3 Nachkommastellen als Tausendertrennzeichen', () => {
    expect(parseLocalizedNumber('19.999')).toBe(19999);
  });

  it('gibt native Zahlen unverändert zurück (Excel liefert numerische Zellen typischerweise so)', () => {
    expect(parseLocalizedNumber(1699)).toBe(1699);
    expect(parseLocalizedNumber(459.99)).toBe(459.99);
  });

  it('gibt null für leere/ungültige Werte zurück', () => {
    expect(parseLocalizedNumber('')).toBeNull();
    expect(parseLocalizedNumber(null)).toBeNull();
    expect(parseLocalizedNumber(undefined)).toBeNull();
    expect(parseLocalizedNumber('abc')).toBeNull();
  });
});

describe('parsePriceToCents', () => {
  it('rechnet in Cent um und rundet', () => {
    expect(parsePriceToCents('459,99')).toBe(45999);
    expect(parsePriceToCents(1699)).toBe(169900);
    expect(parsePriceToCents('19,999')).toBe(1999900);
  });
});
