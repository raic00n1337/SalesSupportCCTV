// Format Profiles for different manufacturers
import type { FormatProfile } from './csvCompilerTypes';
import { parsePriceToCents } from './priceParsing';

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
  iqsight: {
    name: 'IQSIGHT (Bosch Videosysteme)',
    manufacturer: 'IQSIGHT',
    delimiter: ',',
    encoding: 'utf-8',
    hasHeader: true,
    columnMap: {
      'Typ (CTN)': 'sku',
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
