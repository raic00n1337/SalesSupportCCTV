// CSV/Excel Compiler Types

export interface FormatProfile {
  name: string;
  manufacturer?: string;
  delimiter: ',' | ';' | '\t';
  encoding: 'utf-8' | 'latin1' | 'windows-1252';
  hasHeader: boolean;
  columnMap: Record<string, string>; // source column -> target column
  transformations?: Record<string, (value: any) => any>;
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
