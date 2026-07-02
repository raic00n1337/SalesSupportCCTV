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
  ExcelProfileConfig,
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
 * Parse Excel file (legacy: first sheet, header on row 1). Kept for callers
 * that don't have a profile yet (auto-detect path for unknown files).
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
 * Finds which row within a sheet is the real header row by scoring how many
 * of the given keywords appear (case-insensitive substring match) in each of
 * the first `maxRows` rows. Needed because manufacturer price lists commonly
 * prepend a title/logo row (or several blank rows) before the real header.
 * Falls back to row 0 if nothing scores above zero.
 */
function findHeaderRowIndex(grid: any[][], keywords: string[], maxRows: number): number {
  const limit = Math.min(maxRows, grid.length);
  let best = { index: 0, score: 0 };

  for (let i = 0; i < limit; i++) {
    const rowCells = (grid[i] || []).map((c) => (c ?? '').toString().toLowerCase());
    let score = 0;
    for (const keyword of keywords) {
      const needle = keyword.toLowerCase();
      if (rowCells.some((cell) => cell.includes(needle))) score++;
    }
    if (score > best.score) best = { index: i, score };
  }

  return best.score > 0 ? best.index : 0;
}

/**
 * Resolves which sheet(s) of the workbook to read for a given profile.
 * - `sheetNames` (explicit include list) takes priority.
 * - `excludeSheetNames` reads every sheet except the given ones.
 * - Neither set -> legacy behavior: just the first sheet.
 */
function resolveExcelSheetNames(allSheetNames: string[], config?: ExcelProfileConfig): string[] {
  if (config?.sheetNames && config.sheetNames.length > 0) {
    const resolved = config.sheetNames
      .map((wanted) => allSheetNames.find((s) => s.toLowerCase() === wanted.toLowerCase()))
      .filter((s): s is string => Boolean(s));
    return resolved.length > 0 ? resolved : allSheetNames.slice(0, 1);
  }

  if (config?.excludeSheetNames && config.excludeSheetNames.length > 0) {
    const excluded = new Set(config.excludeSheetNames.map((s) => s.toLowerCase()));
    const resolved = allSheetNames.filter((s) => !excluded.has(s.toLowerCase()));
    return resolved.length > 0 ? resolved : allSheetNames.slice(0, 1);
  }

  return allSheetNames.slice(0, 1);
}

/**
 * Profile-aware Excel parser: navigates multi-sheet workbooks, skips
 * title/logo rows to find the real header, renames blank-but-populated
 * header cells (e.g. an unlabeled category column), and tags rows with
 * their source sheet name as `category` when requested. Falls back to the
 * plain `parseExcel()` behavior when the profile has no `excel` config.
 */
export function parseExcelWithProfile(
  buffer: ArrayBuffer,
  excelConfig?: ExcelProfileConfig
): { sourceColumns: string[]; rows: any[] } {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetNames = resolveExcelSheetNames(workbook.SheetNames, excelConfig);
  const maxHeaderSearchRows = excelConfig?.maxHeaderSearchRows ?? 20;

  let sourceColumns: string[] = [];
  const rows: any[] = [];

  for (const sheetName of sheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    const grid: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    if (grid.length === 0) continue;

    const headerRowIndex = excelConfig
      ? findHeaderRowIndex(grid, excelConfig.headerKeywords, maxHeaderSearchRows)
      : 0;

    const header = [...(grid[headerRowIndex] || [])];
    if (excelConfig?.blankHeaderLabels) {
      for (const [indexStr, label] of Object.entries(excelConfig.blankHeaderLabels)) {
        const index = Number(indexStr);
        if (!header[index] || header[index].toString().trim() === '') {
          header[index] = label;
        }
      }
    }
    const cleanHeader = header.map((h) => (h ?? '').toString().trim());

    if (sourceColumns.length === 0) sourceColumns = cleanHeader;

    for (let r = headerRowIndex + 1; r < grid.length; r++) {
      const dataRow = grid[r];
      if (!dataRow || dataRow.every((cell) => cell === '' || cell === null || cell === undefined)) {
        continue; // fully blank spacer row
      }

      const obj: any = {};
      cleanHeader.forEach((col, i) => {
        if (!col) return; // unlabeled column we didn't rename - ignore
        obj[col] = dataRow[i];
      });

      if (excelConfig?.useSheetNameAsCategory) {
        Object.defineProperty(obj, '__sheetName', { value: sheetName, enumerable: false });
      }

      rows.push(obj);
    }
  }

  return { sourceColumns, rows };
}

function isPresent(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
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

    // When the caller already knows the manufacturer (e.g. the Preis-Monitor
    // passes formatProfile = manufacturer slug), resolve the profile BEFORE
    // parsing so its `excel` config (sheet selection, header row search,
    // blank-column labels) can be used instead of the naive first-sheet /
    // first-row assumption - real manufacturer workbooks rarely match that.
    const explicitProfile: FormatProfile | undefined = options.formatProfile
      ? FORMAT_PROFILES[options.formatProfile]
      : undefined;

    if (isExcel && typeof fileContent !== 'string') {
      if (explicitProfile?.excel) {
        const { sourceColumns: cols, rows } = parseExcelWithProfile(fileContent, explicitProfile.excel);
        sourceColumns = cols;
        parsedData = rows;
      } else {
        const excelData = parseExcel(fileContent);
        sourceColumns = excelData[0] as string[];
        parsedData = excelData.slice(1).map(row => {
          const obj: any = {};
          sourceColumns.forEach((col, i) => {
            obj[col] = row[i];
          });
          return obj;
        });
      }
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
    let profile: FormatProfile | undefined = explicitProfile;
    if (!profile && detectedFormat.profile) {
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
    let mappedData = applyColumnMapping(parsedData, columnMappings);

    // For profiles without a dedicated category column (e.g. AXIS, which
    // splits its price list into one sheet per category instead), fall back
    // to the source sheet name captured during parsing. Do this before the
    // structural-row filter below since it relies on index alignment with
    // `parsedData`.
    if (profile?.excel?.useSheetNameAsCategory) {
      mappedData.forEach((row, i) => {
        if (!row.category) {
          const sheetName = (parsedData[i] as any)?.__sheetName;
          if (sheetName) row.category = sheetName;
        }
      });
    }

    // Manufacturer price lists commonly interleave section/category divider
    // rows among the real product rows (e.g. a row that's just a category
    // label with every other cell blank). Those aren't data rows - a row
    // lacking BOTH an identifier and a price is structural noise, not a
    // product with missing fields, so it's dropped silently here rather
    // than surfacing as a validation error or reaching the DB import step.
    mappedData = mappedData.filter((row) => isPresent(row.sku) || isPresent(row.uvp_cents));

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
