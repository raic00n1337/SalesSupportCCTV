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

    const xno = result.transformedData.find((r: any) => r.sku === 'XNO-6120R');
    expect(xno.uvp_cents).toBe(119990);
    expect(xno.category).toBe('Camera - Network');
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
