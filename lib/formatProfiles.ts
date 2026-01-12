// Format Profiles for different manufacturers
import type { FormatProfile } from './csvCompilerTypes';

/**
 * Predefined format profiles for common manufacturers
 * These can be extended and saved by users
 */

export const FORMAT_PROFILES: Record<string, FormatProfile> = {
  // AXIS Format
  axis: {
    name: 'AXIS Communications',
    manufacturer: 'AXIS',
    delimiter: ',',
    encoding: 'utf-8',
    hasHeader: true,
    columnMap: {
      'Product Name': 'name',
      'Part Number': 'sku',
      'EAN Code': 'eso_number',
      'MSRP': 'uvp_cents',
      'Category': 'category',
      'Description': 'description',
      'Status': 'is_active',
    },
    transformations: {
      uvp_cents: (value: string) => {
        // Convert "459.99" or "459,99" to cents
        const num = parseFloat(value.toString().replace(',', '.').replace(/[^\d.]/g, ''));
        return Math.round(num * 100);
      },
      is_active: (value: string) => {
        const str = value.toString().toLowerCase();
        return str === 'active' || str === 'yes' || str === '1' || str === 'true';
      },
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
      uvp_cents: (value: string) => {
        const num = parseFloat(value.toString().replace(',', '.').replace(/[^\d.]/g, ''));
        return Math.round(num * 100);
      },
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
      uvp_cents: (value: string) => {
        const num = parseFloat(value.toString().replace(',', '.').replace(/[^\d.]/g, ''));
        return Math.round(num * 100);
      },
    },
  },

  // Hanwha Format
  hanwha: {
    name: 'Hanwha Vision',
    manufacturer: 'Hanwha',
    delimiter: ',',
    encoding: 'utf-8',
    hasHeader: true,
    columnMap: {
      'Product Name': 'name',
      'Model Number': 'sku',
      'MSRP (EUR)': 'uvp_cents',
      'Category': 'category',
      'Product Description': 'description',
    },
    transformations: {
      uvp_cents: (value: string) => {
        const num = parseFloat(value.toString().replace(',', '.').replace(/[^\d.]/g, ''));
        return Math.round(num * 100);
      },
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
};
