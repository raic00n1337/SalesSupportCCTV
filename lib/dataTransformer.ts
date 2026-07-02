// Data Transformation Logic
import type { FormatProfile, ValidationError } from './csvCompilerTypes';
import { TARGET_COLUMNS } from './formatProfiles';
import { parseLocalizedNumber, parsePriceToCents } from './priceParsing';

/**
 * Transform data using format profile transformations
 */
export function transformData(
  rows: any[],
  profile?: FormatProfile
): { transformedRows: any[]; errors: ValidationError[] } {
  const transformedRows: any[] = [];
  const errors: ValidationError[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const transformedRow: any = {};

    try {
      for (const [key, value] of Object.entries(row)) {
        // Apply transformation if defined in profile
        if (profile?.transformations && profile.transformations[key]) {
          transformedRow[key] = profile.transformations[key](value);
        } else {
          // Default transformations based on target column type
          transformedRow[key] = applyDefaultTransformation(key, value);
        }
      }

      transformedRows.push(transformedRow);
    } catch (error: any) {
      errors.push({
        row: i + 1,
        column: '',
        value: row,
        error: `Transformation error: ${error.message}`,
      });
    }
  }

  return { transformedRows, errors };
}

/**
 * Apply default transformations based on column type
 */
function applyDefaultTransformation(columnName: string, value: any): any {
  const targetCol = TARGET_COLUMNS.find(c => c.name === columnName);

  if (!targetCol) return value;

  switch (targetCol.type) {
    case 'number':
      // uvp_cents is stored in cents; every other numeric column stays a plain number.
      return columnName === 'uvp_cents' ? parsePriceToCents(value) : parseLocalizedNumber(value);
    case 'boolean':
      return parseBoolean(value);
    case 'string':
      return value?.toString().trim() || '';
    default:
      return value;
  }
}

/**
 * Parse boolean from various formats
 */
function parseBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;

  const str = value?.toString().toLowerCase().trim();
  return ['true', 'yes', '1', 'active', 'ja', 'aktiv'].includes(str);
}

/**
 * Validate transformed data
 */
export function validateData(rows: any[]): ValidationError[] {
  const errors: ValidationError[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Validate required fields
    for (const targetCol of TARGET_COLUMNS) {
      if (targetCol.required && !row[targetCol.name]) {
        errors.push({
          row: i + 1,
          column: targetCol.name,
          value: row[targetCol.name],
          error: `Required field "${targetCol.name}" is missing or empty`,
        });
      }

      // Validate data types
      if (row[targetCol.name] !== undefined && row[targetCol.name] !== null) {
        const validationType = validateType(row[targetCol.name], targetCol.type);
        if (!validationType.isValid) {
          errors.push({
            row: i + 1,
            column: targetCol.name,
            value: row[targetCol.name],
            error: validationType.error || `Invalid ${targetCol.type}`,
          });
        }
      }
    }

    // Validate UVP (must be positive)
    if (row.uvp_cents !== undefined && row.uvp_cents !== null) {
      if (row.uvp_cents <= 0) {
        errors.push({
          row: i + 1,
          column: 'uvp_cents',
          value: row.uvp_cents,
          error: 'Price must be greater than 0',
        });
      }
    }
  }

  return errors;
}

/**
 * Validate value type
 */
function validateType(
  value: any,
  expectedType: string
): { isValid: boolean; error?: string } {
  switch (expectedType) {
    case 'string':
      return { isValid: typeof value === 'string' };
    case 'number':
      return {
        isValid: typeof value === 'number' && !isNaN(value),
        error: 'Must be a valid number',
      };
    case 'boolean':
      return { isValid: typeof value === 'boolean' };
    default:
      return { isValid: true };
  }
}

/**
 * Generate slug from name
 */
export function generateSlug(name: string, manufacturer?: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (manufacturer) {
    const mfg = manufacturer.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `${mfg}-${base}`;
  }

  return base;
}

/**
 * Clean and normalize data
 */
export function cleanData(rows: any[]): any[] {
  return rows.map(row => {
    const cleaned: any = {};

    for (const [key, value] of Object.entries(row)) {
      // Skip empty values
      if (value === null || value === undefined || value === '') {
        continue;
      }

      // Trim strings
      if (typeof value === 'string') {
        cleaned[key] = value.trim();
      } else {
        cleaned[key] = value;
      }
    }

    // Generate slug if name exists and slug doesn't
    if (cleaned.name && !cleaned.slug) {
      cleaned.slug = generateSlug(cleaned.name, cleaned.manufacturer_slug);
    }

    return cleaned;
  });
}
