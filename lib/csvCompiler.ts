// CSV/Excel Compiler Core Logic
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { FORMAT_PROFILES } from './formatProfiles';
import { autoDetectColumnMapping, validateColumnMappings, applyColumnMapping } from './columnMapper';
import { transformData, validateData, cleanData } from './dataTransformer';
import type {
  CompilerOptions,
  CompilerResult,
  DetectedFormat,
  FormatProfile,
} from './csvCompilerTypes';

/**
 * Parse CSV file
 */
export function parseCSV(fileContent: string): Papa.ParseResult<any> {
  return Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim(),
  });
}

/**
 * Decode a file payload received from the browser. Excel files are binary
 * and cannot survive `FileReader.readAsText()` intact, so the client sends
 * them base64-encoded (see lib/readFileForUpload.ts) and we decode that back
 * into an ArrayBuffer here for `parseExcel`. CSV files are plain text and
 * pass through unchanged.
 */
export function decodeUploadedFileContent(fileContent: string, isBase64: boolean): string | ArrayBuffer {
  if (!isBase64) return fileContent;
  const buffer = Buffer.from(fileContent, 'base64');
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

/**
 * Parse Excel file
 */
export function parseExcel(buffer: ArrayBuffer): any[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  return XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
  });
}

/**
 * Detect file format and try to match with known profiles
 */
export function detectFormat(data: any[], sourceColumns: string[]): DetectedFormat {
  let bestMatch: { profile: string; confidence: number } | null = null;

  // Try to match with known profiles
  for (const [profileName, profile] of Object.entries(FORMAT_PROFILES)) {
    const matchScore = calculateProfileMatch(sourceColumns, profile);
    
    if (!bestMatch || matchScore > bestMatch.confidence) {
      bestMatch = { profile: profileName, confidence: matchScore };
    }
  }

  // Detect delimiter (for CSV)
  const delimiter = detectDelimiter(data);

  return {
    profile: bestMatch && bestMatch.confidence > 0.7 ? bestMatch.profile : undefined,
    delimiter: delimiter,
    encoding: 'utf-8', // TODO: Implement encoding detection
    hasHeader: true,
    rowCount: data.length,
    columnCount: sourceColumns.length,
    columns: sourceColumns,
    confidence: bestMatch?.confidence || 0,
  };
}

/**
 * Calculate how well source columns match a profile
 */
function calculateProfileMatch(sourceColumns: string[], profile: FormatProfile): number {
  let matches = 0;
  const profileColumns = Object.keys(profile.columnMap);

  for (const sourceCol of sourceColumns) {
    for (const profileCol of profileColumns) {
      if (sourceCol.toLowerCase() === profileCol.toLowerCase()) {
        matches++;
        break;
      }
    }
  }

  return matches / Math.max(profileColumns.length, sourceColumns.length);
}

/**
 * Detect delimiter in CSV data
 */
function detectDelimiter(data: any[]): string {
  // Common delimiters
  const delimiters = [',', ';', '\t', '|'];
  const sampleSize = Math.min(5, data.length);
  const sample = data.slice(0, sampleSize);

  // Count occurrences of each delimiter
  const counts: Record<string, number> = {};
  for (const delimiter of delimiters) {
    counts[delimiter] = 0;
    for (const row of sample) {
      const str = JSON.stringify(row);
      counts[delimiter] += (str.match(new RegExp(`\\${delimiter}`, 'g')) || []).length;
    }
  }

  // Return delimiter with highest count
  return Object.entries(counts).reduce((a, b) => (a[1] > b[1] ? a : b))[0];
}

/**
 * Compile CSV/Excel file
 */
export async function compileFile(
  fileContent: string | ArrayBuffer,
  fileName: string,
  options: CompilerOptions
): Promise<CompilerResult> {
  try {
    // Parse file based on extension
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    let parsedData: any[];
    let sourceColumns: string[];

    if (isExcel && typeof fileContent !== 'string') {
      const excelData = parseExcel(fileContent);
      sourceColumns = excelData[0] as string[];
      parsedData = excelData.slice(1).map(row => {
        const obj: any = {};
        sourceColumns.forEach((col, i) => {
          obj[col] = row[i];
        });
        return obj;
      });
    } else if (typeof fileContent === 'string') {
      const result = parseCSV(fileContent);
      parsedData = result.data;
      sourceColumns = result.meta.fields || [];
    } else {
      throw new Error('Invalid file format');
    }

    // Detect format
    const detectedFormat = detectFormat(parsedData, sourceColumns);

    // Get format profile
    let profile: FormatProfile | undefined;
    if (options.formatProfile) {
      profile = FORMAT_PROFILES[options.formatProfile];
    } else if (detectedFormat.profile) {
      profile = FORMAT_PROFILES[detectedFormat.profile];
    }

    // Auto-detect or use custom column mapping
    let columnMappings;
    if (options.customMapping) {
      columnMappings = Object.entries(options.customMapping).map(([source, target]) => ({
        sourceColumn: source,
        targetColumn: target,
        isRequired: false,
        isValid: true,
      }));
    } else if (profile) {
      columnMappings = Object.entries(profile.columnMap).map(([source, target]) => ({
        sourceColumn: source,
        targetColumn: target,
        isRequired: false,
        isValid: true,
      }));
    } else {
      columnMappings = autoDetectColumnMapping(sourceColumns);
    }

    // Validate mappings
    const validationResult = validateColumnMappings(columnMappings);
    if (!validationResult.isValid && !options.dryRun) {
      return {
        success: false,
        detectedFormat,
        columnMappings,
        transformedData: [],
        errors: validationResult.errors.map((error, i) => ({
          row: 0,
          column: '',
          value: null,
          error,
        })),
        warnings: [],
        rowCount: 0,
        validRows: 0,
        invalidRows: 0,
      };
    }

    // Apply column mapping
    const mappedData = applyColumnMapping(parsedData, columnMappings);

    // Transform data
    const { transformedRows, errors: transformErrors } = transformData(mappedData, profile);

    // Validate data
    const validationErrors = options.validateData ? validateData(transformedRows) : [];

    // Clean data
    const cleanedData = cleanData(transformedRows);

    // Calculate statistics
    const allErrors = [...transformErrors, ...validationErrors];
    const validRows = cleanedData.filter((_, i) => 
      !allErrors.some(e => e.row === i + 1)
    );

    return {
      success: allErrors.length === 0,
      detectedFormat,
      columnMappings,
      transformedData: cleanedData,
      errors: allErrors,
      warnings: validationResult.errors,
      rowCount: cleanedData.length,
      validRows: validRows.length,
      invalidRows: allErrors.length,
    };
  } catch (error: any) {
    return {
      success: false,
      columnMappings: [],
      transformedData: [],
      errors: [{
        row: 0,
        column: '',
        value: null,
        error: `Compilation error: ${error.message}`,
      }],
      warnings: [],
      rowCount: 0,
      validRows: 0,
      invalidRows: 0,
    };
  }
}

/**
 * Generate CSV output from transformed data
 */
export function generateCSV(data: any[]): string {
  return Papa.unparse(data);
}
