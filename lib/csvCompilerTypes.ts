// CSV/Excel Compiler Types

/**
 * Real-world manufacturer price lists as Excel workbooks rarely look like a
 * clean single-sheet CSV: they ship as multiple sheets, prepend title/logo
 * rows before the real header, and sometimes leave category columns
 * unlabeled. This config lets a FormatProfile describe how to navigate that
 * before the normal column-name-based mapping kicks in.
 */
/** Context passed to the `postProcessRow` hook - whatever the parser could
 *  infer about where a row came from beyond its own cell values. */
export interface ExcelRowContext {
  sheetName?: string;
  /** Only set when `repeatingSections` is on: the nearest lone-cell title
   *  row seen above this one within the same sheet (e.g. "Control panels"). */
  sectionCategory?: string;
}

export interface ExcelProfileConfig {
  /** Exact sheet name(s) to read data from, in order. Mutually exclusive
   *  with `excludeSheetNames` - if both are set, this one wins. Matched
   *  case-insensitively; falls back to the first sheet if none match. */
  sheetNames?: string[];
  /** Read every sheet EXCEPT these (case-insensitive match). Useful for
   *  manufacturers that split their catalog into one sheet per product
   *  category - combine with `useSheetNameAsCategory`. */
  excludeSheetNames?: string[];
  /** Read every sheet in the workbook, in order. Takes priority over
   *  `sheetNames`/`excludeSheetNames`. For manufacturers whose sheets are
   *  ALL legitimate product data (no "All products"/logistics duplicates
   *  to skip). */
  readAllSheets?: boolean;
  /** Tag every row read from a sheet with that sheet's name as `category`,
   *  when the row doesn't already provide one via columnMap. */
  useSheetNameAsCategory?: boolean;
  /** Case-insensitive substrings that must appear in a row for it to be
   *  recognized as the header row (title/logo rows above it are skipped). */
  headerKeywords: string[];
  /** How many rows from the top of each sheet to scan for the header row.
   *  Ignored when `repeatingSections` is on (the whole sheet is scanned). */
  maxHeaderSearchRows?: number;
  /** Column-index -> label overrides for header cells that are blank in the
   *  source file but hold real data on every row (e.g. an unlabeled
   *  "category" column). Zero-indexed. */
  blankHeaderLabels?: Record<number, string>;
  /** Some manufacturers (e.g. AJAX) repeat the header row - and a lone-cell
   *  category title row above it - many times within a single sheet
   *  ("Control panels", "Range extenders", "Sirens", ...) instead of one
   *  header per sheet. When true, ANY row matching `headerKeywords`
   *  (re)starts a new block, and the last lone-cell text row seen before it
   *  becomes that block's `ExcelRowContext.sectionCategory`. */
  repeatingSections?: boolean;
  /** Exact (case-insensitive, trimmed) lone-cell texts to ignore as section
   *  titles when `repeatingSections` is on - e.g. a "Currency: EUR" line, or
   *  the sheet's own "Superior"/"Baseline" banner (already known from the
   *  sheet name). */
  sectionTitleIgnore?: string[];
  /** Max character length for a lone-cell row to be treated as a section
   *  title rather than a marketing/legal blurb sharing the same layout.
   *  Default 80. */
  sectionTitleMaxLength?: number;
  /** Optional hook that runs once per row after column mapping (but before
   *  transformations/validation), given the row's `ExcelRowContext`. Mutate
   *  `row` in place to set/override fields like `category`, `tags`, or
   *  `name` using manufacturer-specific business rules that don't fit a
   *  single per-column transformation (e.g. AJAX's Superior/Baseline/G3
   *  grouping). */
  postProcessRow?: (row: Record<string, any>, ctx: ExcelRowContext) => void;
}

export interface FormatProfile {
  name: string;
  manufacturer?: string;
  delimiter: ',' | ';' | '\t';
  encoding: 'utf-8' | 'latin1' | 'windows-1252';
  hasHeader: boolean;
  columnMap: Record<string, string>; // source column -> target column
  transformations?: Record<string, (value: any) => any>;
  /** Excel-specific navigation. Ignored for CSV files. */
  excel?: ExcelProfileConfig;
}

export interface DetectedFormat {
  profile?: string; // matched profile name
  delimiter: string;
  encoding: string;
  hasHeader: boolean;
  rowCount: number;
  columnCount: number;
  columns: string[];
  confidence: number; // 0-100
}

export interface ColumnMapping {
  sourceColumn: string;
  targetColumn: string | null;
  transformation?: string;
  sample?: any;
  isRequired: boolean;
  isValid: boolean;
}

export interface ValidationError {
  row: number;
  column: string;
  value: any;
  error: string;
}

export interface CompilerResult {
  success: boolean;
  detectedFormat?: DetectedFormat;
  columnMappings: ColumnMapping[];
  transformedData: any[];
  errors: ValidationError[];
  warnings: string[];
  rowCount: number;
  validRows: number;
  invalidRows: number;
}

export interface CompilerOptions {
  autoDetect: boolean;
  validateData: boolean;
  dryRun: boolean; // Don't import, just preview
  formatProfile?: string; // Use specific profile
  customMapping?: Record<string, string>;
}

export interface ImportResult {
  success: boolean;
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  errors: string[];
}
