// End-to-end test of the price-list import pipeline (compileFile -> computeCatalogDiff)
// for the two manufacturers we're testing first: AXIS and Hanwha.
// Pure offline test - no Supabase/network involved, mirrors what
// pages/api/admin/catalog-diff.ts does with the compiled rows.

import * as XLSX from 'xlsx';
import { compileFile, decodeUploadedFileContent } from './csvCompiler';
import { computeCatalogDiff, type ExistingCatalogProduct } from './catalogDiff';
import type { CompilerOptions } from './csvCompilerTypes';

const options: CompilerOptions = {
  autoDetect: true,
  validateData: true,
  dryRun: true,
};

describe('Preislisten-Import: AXIS', () => {
  const axisCsv = [
    'Product Name,Part Number,EAN Code,MSRP,Category,Description,Status',
    'AXIS M3215-LVE,AXIS M3215-LVE,7331021123456,459.99,Dome,Outdoor-fähige Mini-Dome,Active',
    'AXIS P3268-LVE,AXIS P3268-LVE,7331021123457,899.00,Dome,Deep-Learning-Dome,Active',
    'AXIS Q6215-LE,AXIS Q6215-LE,7331021123458,"2.499,00",PTZ,PTZ-Netzwerkkamera,Discontinued',
  ].join('\n');

  it('erkennt das AXIS-Profil automatisch und wandelt Preise korrekt in Cent um', async () => {
    const result = await compileFile(axisCsv, 'axis-preisliste.csv', options);

    expect(result.detectedFormat?.profile).toBe('axis');
    expect(result.transformedData).toHaveLength(3);

    const m3215 = result.transformedData.find((r: any) => r.sku === 'AXIS M3215-LVE');
    expect(m3215.uvp_cents).toBe(45999);
    expect(m3215.is_active).toBe(true);

    const q6215 = result.transformedData.find((r: any) => r.sku === 'AXIS Q6215-LE');
    expect(q6215.uvp_cents).toBe(249900);
    expect(q6215.is_active).toBe(false);
  });

  it('erkennt Preisänderung, Neuprodukt und Abkündigung gegen den bestehenden Katalog', async () => {
    const result = await compileFile(axisCsv, 'axis-preisliste.csv', options);

    const existing: ExistingCatalogProduct[] = [
      { id: '1', sku: 'AXIS M3215-LVE', name: 'AXIS M3215-LVE', uvp_cents: 44999, is_active: true }, // Preis hat sich geändert
      { id: '2', sku: 'AXIS M2025-LE', name: 'AXIS M2025-LE', uvp_cents: 29900, is_active: true }, // fehlt in neuer Liste -> abgekündigt
    ];

    const diffRows = result.transformedData
      .filter((r: any) => r.sku && r.uvp_cents)
      .map((r: any) => ({ sku: r.sku, name: r.name, uvp_cents: r.uvp_cents, raw: r }));

    const diff = computeCatalogDiff(diffRows, existing, true);

    expect(diff.newProducts.map((p) => p.sku)).toEqual(expect.arrayContaining(['AXIS P3268-LVE', 'AXIS Q6215-LE']));
    expect(diff.priceChanges).toEqual([
      expect.objectContaining({ sku: 'AXIS M3215-LVE', oldPriceCents: 44999, newPriceCents: 45999 }),
    ]);
    expect(diff.discontinued).toEqual([
      expect.objectContaining({ sku: 'AXIS M2025-LE' }),
    ]);
  });
});

describe('Preislisten-Import: Hanwha', () => {
  const hanwhaCsv = [
    'Product Name,Model Number,MSRP (EUR),Category,Product Description',
    'Hanwha QNO-7012R,QNO-7012R,349.50,Dome,4K Outdoor-Dome',
    'Hanwha XNO-6120R,XNO-6120R,"1.199,90",Bullet,2MP Bullet mit IR',
  ].join('\n');

  it('erkennt das Hanwha-Profil automatisch und wandelt Preise korrekt in Cent um', async () => {
    const result = await compileFile(hanwhaCsv, 'hanwha-preisliste.csv', options);

    expect(result.detectedFormat?.profile).toBe('hanwha');
    expect(result.transformedData).toHaveLength(2);

    const qno = result.transformedData.find((r: any) => r.sku === 'QNO-7012R');
    expect(qno.uvp_cents).toBe(34950);

    const xno = result.transformedData.find((r: any) => r.sku === 'XNO-6120R');
    expect(xno.uvp_cents).toBe(119990);
  });
});

describe('Preislisten-Import: Excel-Upload (Base64-Pfad wie im Browser)', () => {
  it('dekodiert eine base64-kodierte .xlsx-Datei korrekt und kompiliert sie wie eine CSV-Preisliste', async () => {
    // Simulates what lib/readFileForUpload.ts produces client-side for .xlsx
    // files, and what pages/api/admin/catalog-diff.ts + compile-csv.ts must
    // decode back into an ArrayBuffer before handing it to compileFile.
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Product Name', 'Part Number', 'EAN Code', 'MSRP', 'Category', 'Description', 'Status'],
      ['AXIS M3215-LVE', 'AXIS M3215-LVE', '7331021123456', '459.99', 'Dome', 'Outdoor-fähige Mini-Dome', 'Active'],
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Preisliste');
    const excelBuffer: Buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const base64 = excelBuffer.toString('base64');

    const decoded = decodeUploadedFileContent(base64, true);
    expect(typeof decoded).not.toBe('string');

    const result = await compileFile(decoded, 'axis-preisliste.xlsx', options);

    expect(result.detectedFormat?.profile).toBe('axis');
    expect(result.transformedData).toHaveLength(1);
    expect(result.transformedData[0].sku).toBe('AXIS M3215-LVE');
    expect(result.transformedData[0].uvp_cents).toBe(45999);
  });

  it('lässt CSV-Inhalte unverändert durch (isBase64 = false)', () => {
    const decoded = decodeUploadedFileContent('a,b\n1,2', false);
    expect(decoded).toBe('a,b\n1,2');
  });
});
