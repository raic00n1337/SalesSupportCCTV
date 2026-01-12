// Column Mapping Logic with Fuzzy Matching
import Fuse from 'fuse.js';
import { COLUMN_NAME_ALIASES, TARGET_COLUMNS } from './formatProfiles';
import type { ColumnMapping } from './csvCompilerTypes';

/**
 * Auto-detect column mapping using fuzzy string matching
 */
export function autoDetectColumnMapping(
  sourceColumns: string[],
  targetColumns: string[] = TARGET_COLUMNS.map(c => c.name)
): ColumnMapping[] {
  const mappings: ColumnMapping[] = [];

  for (const sourceCol of sourceColumns) {
    const mapping: ColumnMapping = {
      sourceColumn: sourceCol,
      targetColumn: null,
      isRequired: false,
      isValid: true,
    };

    // Try exact match first
    const exactMatch = targetColumns.find(
      tc => tc.toLowerCase() === sourceCol.toLowerCase()
    );

    if (exactMatch) {
      mapping.targetColumn = exactMatch;
      mapping.isRequired = TARGET_COLUMNS.find(c => c.name === exactMatch)?.required || false;
    } else {
      // Try fuzzy match using aliases
      const bestMatch = findBestMatch(sourceCol, targetColumns);
      if (bestMatch && bestMatch.score > 0.7) {
        mapping.targetColumn = bestMatch.column;
        mapping.isRequired = TARGET_COLUMNS.find(c => c.name === bestMatch.column)?.required || false;
      }
    }

    mappings.push(mapping);
  }

  return mappings;
}

/**
 * Find best matching target column using fuzzy search
 */
function findBestMatch(
  sourceColumn: string,
  targetColumns: string[]
): { column: string; score: number } | null {
  let bestMatch: { column: string; score: number } | null = null;

  for (const targetCol of targetColumns) {
    const aliases = COLUMN_NAME_ALIASES[targetCol] || [];
    const searchTerms = [targetCol, ...aliases];

    // Use Fuse.js for fuzzy matching
    const fuse = new Fuse(searchTerms, {
      threshold: 0.4,
      includeScore: true,
    });

    const result = fuse.search(sourceColumn.toLowerCase());

    if (result.length > 0 && result[0].score !== undefined) {
      const score = 1 - result[0].score; // Invert score (lower is better in Fuse.js)
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { column: targetCol, score };
      }
    }
  }

  return bestMatch;
}

/**
 * Validate column mappings
 */
export function validateColumnMappings(mappings: ColumnMapping[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check if all required columns are mapped
  const requiredColumns = TARGET_COLUMNS.filter(c => c.required).map(c => c.name);
  const mappedTargets = mappings
    .filter(m => m.targetColumn !== null)
    .map(m => m.targetColumn);

  for (const requiredCol of requiredColumns) {
    if (!mappedTargets.includes(requiredCol)) {
      errors.push(`Required column "${requiredCol}" is not mapped`);
    }
  }

  // Check for duplicate mappings
  const targetCounts: Record<string, number> = {};
  for (const mapping of mappings) {
    if (mapping.targetColumn) {
      targetCounts[mapping.targetColumn] = (targetCounts[mapping.targetColumn] || 0) + 1;
    }
  }

  for (const [target, count] of Object.entries(targetCounts)) {
    if (count > 1) {
      errors.push(`Column "${target}" is mapped multiple times`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Apply column mapping to transform data
 */
export function applyColumnMapping(
  rows: any[],
  mappings: ColumnMapping[]
): any[] {
  return rows.map(row => {
    const transformedRow: any = {};

    for (const mapping of mappings) {
      if (mapping.targetColumn && row[mapping.sourceColumn] !== undefined) {
        transformedRow[mapping.targetColumn] = row[mapping.sourceColumn];
      }
    }

    return transformedRow;
  });
}
