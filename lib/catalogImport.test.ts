// End-to-end test of the price-list import pipeline (compileFile -> computeCatalogDiff)
// for the two manufacturers we're testing first: AXIS and Hanwha.
// Pure offline test - no Supabase/network involved, mirrors what
// pages/api/admin/catalog-diff.ts does with the compiled rows.
//
// The fixtures below deliberately mimic the quirks of the real manufacturer
// workbooks (title rows above the header, one sheet per category for AXIS,
// an unlabeled category column and section-divider rows for Hanwha) rather
// than a clean flat CSV, since that's what actually breaks a naive parser.

import * as XLSX from 'xlsx';
import { compileFile, decodeUploadedFileContent } from './csvCompiler';
import { computeCatalogDiff, type ExistingCatalogProduct } from './catalogDiff';
import type { CompilerOptions } from './csvCompilerTypes';

const options: CompilerOptions = {
  autoDetect: true,
  validateData: true,
  dryRun: true,
};

function buildAxisWorkbook(): ArrayBuffer {
  const workbook = XLSX.utils.book_new();

  const cameraSheet = XLSX.utils.aoa_to_sheet([
    ['Axis Communications', '', 'APRIL-2026, EUR', '', '', ''],
    ['Product Name', 'Status', 'Product Number EUR', 'Product Number UK', 'Product Description', 'MSRP'],
    ['Fixed Dome', '', '', '', '', ''], // category-divider row inside the sheet - no sku/price, must be dropped
    ['AXIS M3215-LVE', '', 'M3215-001', 'M3215-001', 'Outdoor-fähige Mini-Dome', 459.99],
    ['AXIS P3268-LVE', 'New', 'P3268-001', 'P3268-001', 'Deep-Learning-Dome', 899],
  ]);
  XLSX.utils.book_append_sheet(workbook, cameraSheet, 'Camera');

  const ptzSheet = XLSX.utils.aoa_to_sheet([
    ['Axis Communications', '', 'APRIL-2026, EUR', '', '', ''],
    ['Product Name', 'Status', 'Product Number EUR', 'Product Number UK', 'Product Description', 'MSRP'],
    ['AXIS Q6215-LE', 'Discontinued - contact Order dept for availability', 'Q6215-001', 'Q6215-001', 'PTZ-Netzwerkkamera', 2499],
  ]);
  XLSX.utils.book_append_sheet(workbook, ptzSheet, 'PTZ');

  // "All products" merges everything but without a category column - must be
  // excluded, otherwise every row would lose its real category.
  const allProductsSheet = XLSX.utils.aoa_to_sheet([
    ['Axis Communications', '', 'APRIL-2026, EUR', '', '', ''],
    ['Product Name', 'Status', 'Product Number EUR', 'Product Number UK', 'Product Description', 'MSRP'],
    ['AXIS M3215-LVE', '', 'M3215-001', 'M3215-001', 'Outdoor-fähige Mini-Dome', 459.99],
    ['AXIS P3268-LVE', 'New', 'P3268-001', 'P3268-001', 'Deep-Learning-Dome', 899],
    ['AXIS Q6215-LE', 'Discontinued - contact Order dept for availability', 'Q6215-001', 'Q6215-001', 'PTZ-Netzwerkkamera', 2499],
  ]);
  XLSX.utils.book_append_sheet(workbook, allProductsSheet, 'All products');

  const buffer: Buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

function buildHanwhaWorkbook(): ArrayBuffer {
  const sheet = XLSX.utils.aoa_to_sheet([
    ['', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', 'EUR'],
    ['', '', '', '', '', '', '', '', '', '', 'EUR_pricelist', 'Enter Discount'],
    ['', '', '', '', '', '', '', '', '', '', 'EUR_pricelist', ''],
    ['', '', '', '', '', '', '', '', '', '', '', ''],
    // Header row - column B (index 1) is the category column but has NO label in the real file.
    ['', '', 'Prod. page', 'Model code', 'Short description', 'Series', 'Resolution/Channels', 'Type', 'Notes', 'Full Description', 'MSRP, €', '25.0%'],
    ['', 'Hanwha Product', '', '', '', '', '', '', '', '', '', ''], // top-level divider row
    ['', 'Camera - Network', '', '', '', '', '', '', '', '', '', ''], // sub-category divider row
    ['', 'Camera - Network', 'Info', 'QNO-7012R', '4K Outdoor-Dome', 'Q Series', '4K', 'Dome', '', '4K Outdoor-Dome full description', 349.5, ''],
    ['', 'Camera - Network', 'Info', 'XNO-6120R', '2MP Bullet mit IR', 'X Series', '2MP', 'Bullet', '', '2MP Bullet full description', 1199.9, ''],
  ]);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'HVE Pricelist');
  const buffer: Buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

describe('Preislisten-Import: AXIS (echtes Mehrfach-Sheet-Format)', () => {
  it('liest nur die Kategorie-Sheets, überspringt Titelzeile & Trennzeilen, setzt Kategorie = Sheetname', async () => {
    const result = await compileFile(buildAxisWorkbook(), 'axis-preisliste.xls', {
      ...options,
      formatProfile: 'axis',
    });

    expect(result.transformedData).toHaveLength(3);

    const m3215 = result.transformedData.find((r: any) => r.sku === 'M3215-001');
    expect(m3215.uvp_cents).toBe(45999);
    expect(m3215.is_active).toBe(true);
    expect(m3215.category).toBe('Camera');

    const q6215 = result.transformedData.find((r: any) => r.sku === 'Q6215-001');
    expect(q6215.uvp_cents).toBe(249900);
    expect(q6215.is_active).toBe(false); // "Discontinued - ..." status
    expect(q6215.category).toBe('PTZ');
  });

  it('erkennt Preisänderung, Neuprodukt und Abkündigung gegen den bestehenden Katalog', async () => {
    const result = await compileFile(buildAxisWorkbook(), 'axis-preisliste.xls', {
      ...options,
      formatProfile: 'axis',
    });

    const existing: ExistingCatalogProduct[] = [
      { id: '1', sku: 'M3215-001', name: 'AXIS M3215-LVE', uvp_cents: 44999, is_active: true }, // Preis hat sich geändert
      { id: '2', sku: 'M2025-001', name: 'AXIS M2025-LE', uvp_cents: 29900, is_active: true }, // fehlt in neuer Liste -> abgekündigt
    ];

    const diffRows = result.transformedData
      .filter((r: any) => r.sku && r.uvp_cents)
      .map((r: any) => ({ sku: r.sku, name: r.name, uvp_cents: r.uvp_cents, raw: r }));

    const diff = computeCatalogDiff(diffRows, existing, true);

    expect(diff.newProducts.map((p) => p.sku)).toEqual(expect.arrayContaining(['P3268-001', 'Q6215-001']));
    expect(diff.priceChanges).toEqual([
      expect.objectContaining({ sku: 'M3215-001', oldPriceCents: 44999, newPriceCents: 45999 }),
    ]);
    expect(diff.discontinued).toEqual([
      expect.objectContaining({ sku: 'M2025-001' }),
    ]);
  });
});

describe('Preislisten-Import: Hanwha (unbeschriftete Kategorie-Spalte + Trennzeilen)', () => {
  it('findet die Kopfzeile trotz Titelzeilen, benennt die leere Kategorie-Spalte um und verwirft Trennzeilen', async () => {
    const result = await compileFile(buildHanwhaWorkbook(), 'hanwha-preisliste.xlsx', {
      ...options,
      formatProfile: 'hanwha',
    });

    // Only the 2 real product rows - both divider rows ("Hanwha Product",
    // "Camera - Network" without a model code) must be dropped.
    expect(result.transformedData.filter((r: any) => r.sku && r.uvp_cents)).toHaveLength(2);

    const qno = result.transformedData.find((r: any) => r.sku === 'QNO-7012R');
    expect(qno.uvp_cents).toBe(34950);
    expect(qno.category).toBe('Camera - Network');
    // "Short description" alone ("4K Outdoor-Dome") is reused across
    // several model codes and isn't a distinguishing name by itself - the
    // model code must lead `name`, mirroring how AXIS's own marketing name
    // already leads with its model number.
    expect(qno.name).toBe('QNO-7012R 4K Outdoor-Dome');

    const xno = result.transformedData.find((r: any) => r.sku === 'XNO-6120R');
    expect(xno.uvp_cents).toBe(119990);
    expect(xno.category).toBe('Camera - Network');
    expect(xno.name).toBe('XNO-6120R 2MP Bullet mit IR');
  });
});

function buildIqsightWorkbook(): ArrayBuffer {
  const sheet = XLSX.utils.aoa_to_sheet([
    ['Typ (CTN)', 'SAP-Nr.', 'EAN-Code', 'Kurzbezeichnung', 'Langtext', 'Listpreis 1Stk', 'Index', 'LKat', 'RKat', 'Ursprungsland', 'Stat. Warennr.', 'Garantie'],
    ['NDP-5522-Z30', 'F.01U.421.002', '4060039191953', 'AUTODOME starlight 5000i', 'AUTODOME starlight 5000i | 2Mp60', 2136.3, '', 'A', '1A', 'PT', '8525890000', '5/3'],
    ['MIC-7803S-Z30B', 'F.01U.420.017', '4060039190901', 'MIC starlight 7100s', 'MIC starlight 7100s | 4Mp60', 6798, 'neu', 'A', '1A', 'PT', '8525890000', '5/3'],
    ['NDM-7702-A', 'F.01U.360.599', '4060039119599', 'FLEXIDOME multi 7000i (EOL)', 'FLEXIDOME multi 7000i | 4x 3Mp30', 2054.8, 'AP', 'A', '1A', 'PT', '8525890000', '5/3'],
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Preisliste');
  const buffer: Buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

describe('Preislisten-Import: IQSIGHT (Bosch Videosysteme)', () => {
  it('liest SKU, EAN als eso_number und erkennt "AP" (Auslaufprodukt) als inaktiv', async () => {
    const result = await compileFile(buildIqsightWorkbook(), 'iqsight-preisliste.xlsx', {
      ...options,
      formatProfile: 'iqsight',
    });

    expect(result.transformedData).toHaveLength(3);

    const active = result.transformedData.find((r: any) => r.sku === 'NDP-5522-Z30');
    expect(active.uvp_cents).toBe(213630);
    expect(active.eso_number).toBe('4060039191953');
    expect(active.is_active).toBe(true);
    // "SAP-Nr." (e.g. "F.01U.421.002") must survive the import - it's the
    // only way to build an exact commerce.iqsight.com product link, since
    // the site requires this internal article ID in the URL.
    expect(active.sap_number).toBe('F.01U.421.002');

    const eol = result.transformedData.find((r: any) => r.sku === 'NDM-7702-A');
    expect(eol.is_active).toBe(false);
  });

  it('löst eine wiederverwendete EAN über Nachfolgemodelle per SKU-Fallback auf, statt die Zeile zu verwerfen', async () => {
    // Real-world quirk seen in the actual IQSIGHT price list: a discontinued
    // model and its successor(s) sometimes share the exact same EAN-Code.
    // `products.eso_number` is UNIQUE, so the 2nd+ row must fall back to its
    // (already-unique) SKU rather than failing the DB insert or being
    // dropped outright - these are genuinely different products.
    const sheet = XLSX.utils.aoa_to_sheet([
      ['Typ (CTN)', 'SAP-Nr.', 'EAN-Code', 'Kurzbezeichnung', 'Langtext', 'Listpreis 1Stk', 'Index'],
      ['NDM-7703-A', 'F.01U.389.263', '4060039119605', 'FLEXIDOME multi 7000i', 'altes Modell', 2610.2, 'AP'],
      ['NMM-7703-A', 'F.01U.423.943', '4060039119605', 'FLEXIDOME Multi+ 7100i', 'Nachfolgemodell', 2998, ''],
      ['NMM-7703-AL', 'F.01U.423.944', '4060039119605', 'FLEXIDOME Multi+ 7100i IR', 'Nachfolgemodell IR', 3237, ''],
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Preisliste');
    const buffer: Buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;

    const result = await compileFile(arrayBuffer, 'iqsight-ean-collision.xlsx', {
      ...options,
      formatProfile: 'iqsight',
    });

    expect(result.transformedData).toHaveLength(3);
    const eol = result.transformedData.find((r: any) => r.sku === 'NDM-7703-A');
    const successor1 = result.transformedData.find((r: any) => r.sku === 'NMM-7703-A');
    const successor2 = result.transformedData.find((r: any) => r.sku === 'NMM-7703-AL');

    expect(eol.eso_number).toBe('4060039119605'); // first occurrence keeps the real EAN
    expect(successor1.eso_number).toBe('NMM-7703-A'); // later occurrences fall back to their own SKU
    expect(successor2.eso_number).toBe('NMM-7703-AL');

    const esoValues = result.transformedData.map((r: any) => r.eso_number);
    expect(new Set(esoValues).size).toBe(esoValues.length); // all unique
  });
});

function buildAjaxWorkbook(): ArrayBuffer {
  const workbook = XLSX.utils.book_new();

  // "Intrusion protection | Superior" - repeats header+category block twice,
  // includes the marketing blurb + "Superior" banner that must be ignored as
  // section titles, and one G3 item that must be pulled into its own group.
  const intrusionSuperior = XLSX.utils.aoa_to_sheet([
    ['', 'New generation of wireless security systems', '', '', '', '', '', '', ''],
    ['Currency: EUR', '', '', '', '', '', '', '', ''],
    ['Superior', '', '', '', '', '', '', '', ''],
    [
      'Superior and Fibra product lines are merging into the Superior product line in the Intrusion protection product category, this is a very long marketing sentence that must not be mistaken for a real section title because real category names are always short.',
      '', '', '', '', '', '', '', '',
    ],
    ['Control panels', '', '', '', '', '', '', '', ''],
    ['TDS', 'EAN', 'Article', 'Code', 'Item', 'Color', 'Type of connection', 'UVP (VAT not included)', 'Masterbox'],
    ['Link', 4823114078705, '143565.111.BL1', 143565, 'Superior Hub Hybrid (2G)', 'black', 'Hybrid', 578.66, 5],
    ['Link', 4823114078712, '143566.111.WH1', 143566, 'Superior Hub Hybrid (2G)', 'white', 'Hybrid', 578.66, 5],
    ['', '', '', '', '', '', '', '', ''],
    ['Range extenders', '', '', '', '', '', '', '', ''],
    ['TDS', 'EAN', 'Article', 'Code', 'Item', 'Color', 'Type of connection', 'UVP (VAT not included)', 'Masterbox'],
    ['Link', 4823114036234, '148937.362.BL1', 148937, 'Superior Hub G3 Jeweller', 'black', 'Wireless', 738.57, 8],
  ]);
  XLSX.utils.book_append_sheet(workbook, intrusionSuperior, 'Intrusion protection | Superior');

  const intrusionBaseline = XLSX.utils.aoa_to_sheet([
    ['Currency: EUR', '', '', '', '', '', ''],
    ['Baseline', '', '', '', '', '', ''],
    ['Control panels', '', '', '', '', '', ''],
    ['TDS', 'EAN', 'Article', 'Code', 'Item', 'Color', 'UVP (VAT not included)'],
    // Price uses US-style thousands grouping ("1,240.65") like the real file.
    ['Link', 4823114015212, '38236.01.BL1', 38236, 'Hub (2G) Jeweller', 'black', '1,240.65'],
  ]);
  XLSX.utils.book_append_sheet(workbook, intrusionBaseline, 'Intrusion protection | Baseline');

  // No Superior/Baseline split at all - and a duplicate SKU also present on
  // the Superior sheet above, which must be deduped (first occurrence wins).
  const comfort = XLSX.utils.aoa_to_sheet([
    ['Currency: EUR', '', '', '', '', ''],
    ['Water leak detectors', '', '', '', '', ''],
    ['TDS', 'EAN', 'Article', 'Code', 'Item', 'UVP (VAT not included)'],
    ['Link', 4823114008254, '38254.08.BL1', 38254, 'LeaksProtect', 72.46],
    ['Link', 4823114078705, '143565.111.BL1', 143565, 'Superior Hub Hybrid (2G)', 578.66], // duplicate SKU - must be dropped
  ]);
  XLSX.utils.book_append_sheet(workbook, comfort, 'Comfort & automation');

  const buffer: Buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

describe('Preislisten-Import: AJAX (wiederholte Kopfzeilen/Kategorie-Abschnitte pro Sheet)', () => {
  it('trennt Superior/Baseline, hebt G3-Artikel in einer eigenen Gruppe hervor und dedupliziert SKUs sheet-übergreifend', async () => {
    const result = await compileFile(buildAjaxWorkbook(), 'ajax-preisliste.xlsx', {
      ...options,
      formatProfile: 'ajax',
    });

    const bySku = (sku: string) => result.transformedData.find((r: any) => r.sku === sku);

    const superiorHub = bySku('143565.111.BL1');
    expect(superiorHub.name).toBe('Superior Hub Hybrid (2G) (black)');
    expect(superiorHub.category).toBe('Intrusion protection Superior – Control panels');
    expect(superiorHub.tags).toEqual(expect.arrayContaining(['ajax', 'superior', 'hybrid']));
    expect(superiorHub.uvp_cents).toBe(57866);

    const g3Item = bySku('148937.362.BL1');
    expect(g3Item.category).toBe('G3 (EN Grad 3)');
    expect(g3Item.tags).toEqual(expect.arrayContaining(['ajax', 'superior', 'g3', 'wireless']));

    const baselineHub = bySku('38236.01.BL1');
    expect(baselineHub.category).toBe('Intrusion protection Baseline – Control panels');
    expect(baselineHub.tags).toEqual(expect.arrayContaining(['ajax', 'baseline']));
    expect(baselineHub.uvp_cents).toBe(124065); // US-style "1,240.65" parsed correctly

    const comfortItem = bySku('38254.08.BL1');
    expect(comfortItem.category).toBe('Comfort & automation – Water leak detectors');
    expect(comfortItem.tags).toEqual(['ajax']);

    // The cross-listed SKU only appears once (first occurrence from the
    // Superior sheet), not duplicated via the Comfort sheet.
    expect(result.transformedData.filter((r: any) => r.sku === '143565.111.BL1')).toHaveLength(1);
    expect(result.transformedData).toHaveLength(5);
  });
});

// Plain CSV (no title rows, no sheets) - but every header cell except the
// first has a leading space from the source's ", " separator, and the price
// column even has two ("  MSRP (EUR)"). `parseCSV`'s `transformHeader` trims
// that away, so the columnMap keys below intentionally have NO leading
// spaces even though the raw file does.
function buildAvigilonCsv(rows: string[]): string {
  const header =
    'Product Line, Category, Subcategory, Family, Series, Model No., Name,  MSRP (EUR), Description (for prices starting on July 06 2026), Datasheet URL, Product Image Link';
  return [header, ...rows].join('\n');
}

describe('Preislisten-Import: Avigilon (flache CSV, Category/Subcategory-Spalten)', () => {
  it('kombiniert Category + Subcategory zu einer Kategorie und parst den Preis korrekt', async () => {
    const csv = buildAvigilonCsv([
      'Video Surveillance,Camera,Bullet,Bullet Analytics,H6A,2.0C-H6A-BO1-IR,"2MP H6A Bullet IR Camera with 2.8-12mm Lens",1166.50,"2MP H6A Bullet IR Camera",https://www.avigilon.com/security-cameras/h6a-bullet,',
      'Video Surveillance,Video Infrastructure,Network Video Recorder,,,H4-NVR-4CH-1TB,"H4 NVR 4 channel; 1TB",1899.00,"4-Kanal NVR mit 1TB",,',
    ]);

    const result = await compileFile(csv, 'avigilon-preisliste.csv', { ...options, formatProfile: 'avigilon' });

    expect(result.transformedData).toHaveLength(2);

    const camera = result.transformedData.find((r: any) => r.sku === '2.0C-H6A-BO1-IR');
    expect(camera.uvp_cents).toBe(116650);
    expect(camera.category).toBe('Camera – Bullet');
    // No EAN/GTIN column exists in this price list - the generic sku
    // fallback (dataTransformer.cleanData) must fill eso_number instead of
    // leaving the NOT NULL + UNIQUE DB column empty.
    expect(camera.eso_number).toBe('2.0C-H6A-BO1-IR');
    // The model number leads `name` so it stays unique on its own, the way
    // AXIS's marketing name already does.
    expect(camera.name).toBe('2.0C-H6A-BO1-IR 2MP H6A Bullet IR Camera with 2.8-12mm Lens');

    const nvr = result.transformedData.find((r: any) => r.sku === 'H4-NVR-4CH-1TB');
    expect(nvr.uvp_cents).toBe(189900);
    expect(nvr.category).toBe('Video Infrastructure – Network Video Recorder');
    expect(nvr.name).toBe('H4-NVR-4CH-1TB H4 NVR 4 channel; 1TB');
  });

  it('nutzt Subcategory allein, wenn Category leer ist, und fällt auf "Sonstiges" zurück, wenn beide leer sind', async () => {
    const csv = buildAvigilonCsv([
      // Real-world quirk: some genuine camera rows ship with both Category
      // and Subcategory blank (only Family/Series hint at what they are).
      'Video Surveillance,,,,,4.0C-H6A-D1-B,"4MP H6A Indoor Dome Camera",679.00,"4MP H6A Indoor Dome Camera",,',
      'Video Surveillance,,Software,,,AVG-LIC-1,"1 Camera License",250.00,"Lizenz",,',
    ]);

    const result = await compileFile(csv, 'avigilon-preisliste-2.csv', { ...options, formatProfile: 'avigilon' });

    const noCategory = result.transformedData.find((r: any) => r.sku === '4.0C-H6A-D1-B');
    expect(noCategory.category).toBe('Sonstiges');

    const subOnly = result.transformedData.find((r: any) => r.sku === 'AVG-LIC-1');
    expect(subOnly.category).toBe('Software');
  });

  it('lässt den Namen unverändert, wenn er die SKU schon enthält, und macht per-SKU eindeutig sonst identische Namen wieder unterscheidbar', async () => {
    const csv = buildAvigilonCsv([
      // Accessories where "Name" is literally just the model number again -
      // ~35% of the real file - must not become "SKU SKU".
      'Video Surveillance,Accessories,Camera Accessories,,,AVO-FE-ACC-KIT,AVO-FE-ACC-KIT,13.14,"Install Accy Kit",,',
      // Two genuinely different bundle/non-bundle SKUs sharing the exact
      // same generic "Name" text in the real file - must stay distinguishable.
      'Video Surveillance,Camera,Dome,,,4.0C-H6A-DO1-IR,"4MP H6A Outdoor IR Dome Camera with 4.4-9.3mm Lens",679.00,"desc",,',
      'Video Surveillance,Camera,Dome,,,4.0C-H6A-DO1-IR-B,"4MP H6A Outdoor IR Dome Camera with 4.4-9.3mm Lens",699.00,"desc",,',
    ]);

    const result = await compileFile(csv, 'avigilon-preisliste-3.csv', { ...options, formatProfile: 'avigilon' });

    const accessory = result.transformedData.find((r: any) => r.sku === 'AVO-FE-ACC-KIT');
    expect(accessory.name).toBe('AVO-FE-ACC-KIT');

    const plain = result.transformedData.find((r: any) => r.sku === '4.0C-H6A-DO1-IR');
    const bundle = result.transformedData.find((r: any) => r.sku === '4.0C-H6A-DO1-IR-B');
    expect(plain.name).not.toBe(bundle.name);
    expect(plain.name).toBe('4.0C-H6A-DO1-IR 4MP H6A Outdoor IR Dome Camera with 4.4-9.3mm Lens');
    expect(bundle.name).toBe('4.0C-H6A-DO1-IR-B 4MP H6A Outdoor IR Dome Camera with 4.4-9.3mm Lens');
  });
});

describe('Preislisten-Import: Excel-Upload (Base64-Pfad wie im Browser)', () => {
  it('dekodiert eine base64-kodierte .xlsx-Datei korrekt und kompiliert sie über das AXIS-Profil', async () => {
    // Simulates what lib/readFileForUpload.ts produces client-side for .xlsx
    // files, and what pages/api/admin/catalog-diff.ts + compile-csv.ts must
    // decode back into an ArrayBuffer before handing it to compileFile.
    const excelBuffer = buildAxisWorkbook();
    const base64 = Buffer.from(excelBuffer).toString('base64');

    const decoded = decodeUploadedFileContent(base64, true);
    expect(typeof decoded).not.toBe('string');

    const result = await compileFile(decoded, 'axis-preisliste.xlsx', { ...options, formatProfile: 'axis' });

    expect(result.transformedData).toHaveLength(3);
    const m3215 = result.transformedData.find((r: any) => r.sku === 'M3215-001');
    expect(m3215.uvp_cents).toBe(45999);
  });

  it('lässt CSV-Inhalte unverändert durch (isBase64 = false)', () => {
    const decoded = decodeUploadedFileContent('a,b\n1,2', false);
    expect(decoded).toBe('a,b\n1,2');
  });
});

describe('Preislisten-Import: generisches CSV-Format (Import-Compiler ohne Hersteller-Profil)', () => {
  it('kompiliert eine CSV-Datei mit unseren eigenen Spaltennamen 1:1', async () => {
    const csv = [
      'name,sku,eso_number,uvp_cents,category,description,is_active,manufacturer_slug',
      'AXIS M3215-LVE,M3215-001,7331021123456,459.99,Dome,Outdoor-fähige Mini-Dome,true,axis',
    ].join('\n');

    const result = await compileFile(csv, 'export.csv', options);

    expect(result.detectedFormat?.profile).toBe('generic');
    expect(result.transformedData).toHaveLength(1);
    expect(result.transformedData[0].uvp_cents).toBe(45999);
  });
});
