// Format Profiles for different manufacturers
import type { ExcelRowContext, FormatProfile } from './csvCompilerTypes';
import { parsePriceToCents } from './priceParsing';

// AJAX groups its 7 sheets into a "{group} | Superior"/"{group} | Baseline"
// pair for Intrusion protection and Video surveillance, but not for the
// other 3 sheets (which aren't split into two product lines at all). Kept as
// an explicit lookup (rather than parsed from the sheet name at runtime) so
// a typo in the source file's sheet name ("Fire & life safet") doesn't leak
// into our category strings.
const AJAX_SHEET_GROUPS: Record<string, { group: string; series?: 'Superior' | 'Baseline' }> = {
  'Intrusion protection | Superior': { group: 'Intrusion protection', series: 'Superior' },
  'Intrusion protection | Baseline': { group: 'Intrusion protection', series: 'Baseline' },
  'Video surveillance | Superior': { group: 'Video surveillance', series: 'Superior' },
  'Video surveillance | Baseline': { group: 'Video surveillance', series: 'Baseline' },
  'Residential | Fire & life safet': { group: 'Fire & life safety (Residential)' },
  'EN54  | Fire & life safety': { group: 'Fire & life safety (EN54)' },
  'Comfort & automation': { group: 'Comfort & automation' },
};

function ajaxPostProcessRow(row: Record<string, any>, ctx: ExcelRowContext): void {
  const sheetInfo = ctx.sheetName ? AJAX_SHEET_GROUPS[ctx.sheetName] : undefined;
  const group = sheetInfo?.group ?? ctx.sheetName ?? 'AJAX';
  const series = sheetInfo?.series;

  // Same item + color are two separate SKUs/rows (e.g. "Superior Hub Hybrid
  // (2G)" in black and white) - fold the color into the name so they stay
  // distinguishable without a dedicated `color` column in the catalog.
  if (typeof row.name === 'string' && row.color && row.color !== '-') {
    row.name = `${row.name.trim()} (${row.color})`;
  }

  // EN 50131 Grade 3 devices ("Superior Hub G3 Jeweller", "Superior ReX G3
  // Jeweller", ...) only exist within Intrusion protection | Superior, but
  // are pulled into their own dedicated group here regardless of which
  // sub-section (Control panels, Range extenders, ...) they came from - the
  // higher security grade matters more than the device type for sales.
  const isG3 = typeof row.name === 'string' && /\bg3\b/i.test(row.name);

  if (isG3) {
    row.category = 'G3 (EN Grad 3)';
  } else if (ctx.sectionCategory) {
    row.category = series ? `${group} ${series} – ${ctx.sectionCategory}` : `${group} – ${ctx.sectionCategory}`;
  } else if (!row.category) {
    row.category = series ? `${group} ${series}` : group;
  }

  const tags = ['ajax'];
  if (series) tags.push(series.toLowerCase());
  if (isG3) tags.push('g3');
  if (row.connection_type) tags.push(row.connection_type.toString().toLowerCase());
  row.tags = tags;
}

/**
 * Predefined format profiles for common manufacturers
 * These can be extended and saved by users
 */

export const FORMAT_PROFILES: Record<string, FormatProfile> = {
  // AXIS Format - based on the real "European Union Pricelist" .xls export
  // (e.g. european_union_pricelist_april_2026.xls). That workbook ships one
  // sheet per product category (Camera, Recorder, Access Control, ...) plus
  // "All products" (a flat merge without a category column) and
  // "Discontinued products" (legacy SKUs, different columns, no price) - we
  // read the per-category sheets directly so every product keeps a real
  // category, and use the sheet name for it. Every sheet has 1-2 title rows
  // above the real header ("Product Name", "Status", "Product Number EUR",
  // "Product Number UK", "Product Description", "MSRP").
  axis: {
    name: 'AXIS Communications',
    manufacturer: 'AXIS',
    delimiter: ',',
    encoding: 'utf-8',
    hasHeader: true,
    columnMap: {
      'Product Name': 'name',
      'Product Number EUR': 'sku',
      'Product Description': 'description',
      'MSRP': 'uvp_cents',
      'Status': 'is_active',
    },
    transformations: {
      uvp_cents: (value: string) => parsePriceToCents(value) ?? 0,
      // Blank/"New"/"Built to order"/"To be launched"/"Description changed"
      // all mean the item is currently sellable - only an explicit
      // "Discontinued..." status means it's not.
      is_active: (value: unknown) => !/discontinu/i.test((value ?? '').toString()),
    },
    excel: {
      excludeSheetNames: ['All products', 'Discontinued products'],
      useSheetNameAsCategory: true,
      headerKeywords: ['Product Name', 'Product Number EUR', 'MSRP'],
      maxHeaderSearchRows: 10,
    },
  },

  // Hikvision Format
  hikvision: {
    name: 'Hikvision',
    manufacturer: 'Hikvision',
    delimiter: ';',
    encoding: 'utf-8',
    hasHeader: true,
    columnMap: {
      'Model': 'name',
      'Model Code': 'sku',
      'SRP EUR': 'uvp_cents',
      'Type': 'category',
      'Description': 'description',
    },
    transformations: {
      uvp_cents: (value: string) => parsePriceToCents(value) ?? 0,
    },
  },

  // Dahua Format
  dahua: {
    name: 'Dahua',
    manufacturer: 'Dahua',
    delimiter: ',',
    encoding: 'utf-8',
    hasHeader: true,
    columnMap: {
      'Description': 'name',
      'Model No.': 'sku',
      'List Price': 'uvp_cents',
      'Product Type': 'category',
    },
    transformations: {
      uvp_cents: (value: string) => parsePriceToCents(value) ?? 0,
    },
  },

  // Hanwha Format - based on the real "Hanwha Vision Europe Price List - EUR
  // Partner MSRP" .xlsx export. The full, current catalog lives on the "HVE
  // Pricelist" sheet; other sheets are subsets (new/changed items, EOS
  // products) or unrelated logistics data. That sheet has several blank/
  // title rows before the real header, an unlabeled category column (data
  // like "Camera - Network", "NVRs", "Speaker"), and thousands of section-
  // divider rows (e.g. "4K Cameras & up") that have a category but no model
  // code or price - those are automatically dropped since the diff pipeline
  // only keeps rows with both a sku and a price.
  hanwha: {
    name: 'Hanwha Vision',
    manufacturer: 'Hanwha',
    delimiter: ',',
    encoding: 'utf-8',
    hasHeader: true,
    columnMap: {
      'Short description': 'name',
      'Model code': 'sku',
      'Full Description': 'description',
      'MSRP, €': 'uvp_cents',
      'Category': 'category',
    },
    transformations: {
      uvp_cents: (value: string) => parsePriceToCents(value) ?? 0,
    },
    excel: {
      sheetNames: ['HVE Pricelist'],
      headerKeywords: ['Model code', 'MSRP', 'Short description'],
      maxHeaderSearchRows: 15,
      blankHeaderLabels: { 1: 'Category' },
    },
  },

  // IQSIGHT Format - based on the real
  // "IQSIGHT-Videosysteme-Preisliste_09-2026_V1.xlsx" export (IQSIGHT is the
  // 2025/26 rebrand of Bosch Video Systems - hence Bosch model names like
  // AUTODOME/FLEXIDOME/MIC). Much cleaner than AXIS/Hanwha: a single
  // "Preisliste" sheet with the header directly on row 0, no title rows or
  // section dividers. "EAN-Code" gives us a real eso_number for once. The
  // "Index" column marks upcoming items ("neu", or a "MM/YY" planned
  // availability date) and uses "AP" ("Auslaufprodukt") for items being
  // phased out - everything else counts as active.
  // "SAP-Nr." is the manufacturer's internal article ID (e.g. "F.01U.390.686")
  // - not shown anywhere in the catalog UI, but required to build an exact
  // commerce.iqsight.com product link (see manufacturerLinks.ts).
  iqsight: {
    name: 'IQSIGHT (Bosch Videosysteme)',
    manufacturer: 'IQSIGHT',
    delimiter: ',',
    encoding: 'utf-8',
    hasHeader: true,
    columnMap: {
      'Typ (CTN)': 'sku',
      'SAP-Nr.': 'sap_number',
      'EAN-Code': 'eso_number',
      'Kurzbezeichnung': 'name',
      'Langtext': 'description',
      'Listpreis 1Stk': 'uvp_cents',
      'Index': 'is_active',
    },
    transformations: {
      uvp_cents: (value: string) => parsePriceToCents(value) ?? 0,
      is_active: (value: unknown) => (value ?? '').toString().trim().toUpperCase() !== 'AP',
    },
    excel: {
      sheetNames: ['Preisliste'],
      headerKeywords: ['Typ (CTN)', 'EAN-Code', 'Listpreis'],
      maxHeaderSearchRows: 5,
    },
  },

  // AJAX Format - based on the real "DACH PRICE - UVP - NEW 2026.xlsx"
  // export. 7 sheets (2 Superior/Baseline pairs for Intrusion protection and
  // Video surveillance, plus Residential Fire, EN54 Fire and Comfort &
  // automation), each of which repeats a mini-header + lone-cell category
  // title ("Control panels", "Range extenders", ...) many times over rather
  // than having one header for the whole sheet. `ajaxPostProcessRow` (above)
  // builds the final category from the sheet's Superior/Baseline series +
  // that section title, and pulls every EN 50131 Grade 3 device ("... G3
  // Jeweller/Fibra" in the name) into its own dedicated "G3 (EN Grad 3)"
  // group regardless of section. Prices are US-formatted ("1,240.65") but
  // `parsePriceToCents` already handles that unambiguously.
  ajax: {
    name: 'AJAX Systems (DACH)',
    manufacturer: 'AJAX',
    delimiter: ',',
    encoding: 'utf-8',
    hasHeader: true,
    columnMap: {
      Article: 'sku',
      EAN: 'eso_number',
      Item: 'name',
      Color: 'color',
      'Type of connection': 'connection_type',
      'UVP (VAT not included)': 'uvp_cents',
    },
    transformations: {
      uvp_cents: (value: string) => parsePriceToCents(value) ?? 0,
    },
    excel: {
      readAllSheets: true,
      headerKeywords: ['EAN', 'Article', 'Item', 'UVP'],
      repeatingSections: true,
      sectionTitleIgnore: [
        'Superior',
        'Baseline',
        'The following items can be ordered in multiple colors',
        'Applicable both for smart light switches and outlets',
      ],
      postProcessRow: ajaxPostProcessRow,
    },
  },

  // Generic/Default Format (Our format)
  generic: {
    name: 'Generic Format',
    delimiter: ',',
    encoding: 'utf-8',
    hasHeader: true,
    columnMap: {
      'name': 'name',
      'sku': 'sku',
      'eso_number': 'eso_number',
      'uvp_cents': 'uvp_cents',
      'category': 'category',
      'description': 'description',
      'is_active': 'is_active',
      'manufacturer_slug': 'manufacturer_slug',
      'slug': 'slug',
    },
  },
};

/**
 * Target columns that our database expects
 */
export const TARGET_COLUMNS = [
  { name: 'name', required: true, type: 'string' },
  { name: 'sku', required: true, type: 'string' },
  { name: 'eso_number', required: true, type: 'string' },
  { name: 'uvp_cents', required: true, type: 'number' },
  { name: 'category', required: false, type: 'string' },
  { name: 'description', required: false, type: 'string' },
  { name: 'is_active', required: false, type: 'boolean' },
  { name: 'manufacturer_slug', required: true, type: 'string' },
  { name: 'slug', required: false, type: 'string' },
  { name: 'manufacturer_url', required: false, type: 'string' },
];

/**
 * Common column name variations for fuzzy matching
 */
export const COLUMN_NAME_ALIASES: Record<string, string[]> = {
  name: ['product name', 'produktname', 'bezeichnung', 'model', 'title', 'artikel'],
  sku: ['sku', 'part number', 'artikelnummer', 'art.nr', 'model code', 'item number'],
  eso_number: ['eso', 'eso number', 'ean', 'ean code', 'gtin', 'barcode'],
  uvp_cents: ['uvp', 'preis', 'price', 'msrp', 'srp', 'list price', 'vk-preis'],
  category: ['category', 'kategorie', 'type', 'product type', 'art'],
  description: ['description', 'beschreibung', 'details', 'info'],
  is_active: ['active', 'aktiv', 'status', 'enabled'],
  manufacturer_slug: ['manufacturer', 'hersteller', 'brand', 'marke'],
  manufacturer_url: ['url', 'link', 'product url', 'produktlink', 'webseite', 'produktseite'],
};
