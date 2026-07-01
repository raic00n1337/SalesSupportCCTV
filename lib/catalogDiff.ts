// Compares a freshly imported manufacturer price list against the current
// product catalog and classifies every SKU as new, price-changed,
// discontinued (candidate) or unchanged. Pure function - no DB access here,
// callers (API routes) fetch the current catalog and persist the result.

export interface CatalogDiffRow {
  sku: string;
  name: string;
  uvp_cents: number;
  category?: string;
  description?: string;
  is_active?: boolean;
  manufacturer_url?: string;
  raw: Record<string, any>;
}

export interface ExistingCatalogProduct {
  id: string;
  sku: string;
  name: string;
  uvp_cents: number;
  is_active: boolean;
}

export interface NewProductChange {
  sku: string;
  name: string;
  uvpCents: number;
  raw: Record<string, any>;
}

export interface PriceChangeItem {
  productId: string;
  sku: string;
  name: string;
  oldPriceCents: number;
  newPriceCents: number;
}

export interface DiscontinuedItem {
  productId: string;
  sku: string;
  name: string;
  oldPriceCents: number;
}

export interface CatalogDiffResult {
  newProducts: NewProductChange[];
  priceChanges: PriceChangeItem[];
  discontinued: DiscontinuedItem[];
  unchangedCount: number;
}

function normalizeSku(sku: string): string {
  return sku.trim().toUpperCase();
}

/**
 * @param isFullCatalog When true, active products that are no longer present
 * in `newRows` are flagged as discontinuation candidates. When false (a
 * partial price list, e.g. only new/changed items), that comparison is
 * skipped entirely to avoid false positives.
 */
export function computeCatalogDiff(
  newRows: CatalogDiffRow[],
  existingProducts: ExistingCatalogProduct[],
  isFullCatalog: boolean
): CatalogDiffResult {
  const existingBySku = new Map<string, ExistingCatalogProduct>();
  for (const product of existingProducts) {
    existingBySku.set(normalizeSku(product.sku), product);
  }

  const newProducts: NewProductChange[] = [];
  const priceChanges: PriceChangeItem[] = [];
  let unchangedCount = 0;
  const seenSkus = new Set<string>();

  for (const row of newRows) {
    if (!row.sku) continue;
    const key = normalizeSku(row.sku);
    seenSkus.add(key);
    const existing = existingBySku.get(key);

    if (!existing) {
      newProducts.push({ sku: row.sku, name: row.name, uvpCents: row.uvp_cents, raw: row.raw });
      continue;
    }

    if (existing.uvp_cents !== row.uvp_cents) {
      priceChanges.push({
        productId: existing.id,
        sku: row.sku,
        name: row.name,
        oldPriceCents: existing.uvp_cents,
        newPriceCents: row.uvp_cents,
      });
    } else {
      unchangedCount++;
    }
  }

  const discontinued: DiscontinuedItem[] = [];
  if (isFullCatalog) {
    for (const product of existingProducts) {
      if (product.is_active && !seenSkus.has(normalizeSku(product.sku))) {
        discontinued.push({
          productId: product.id,
          sku: product.sku,
          name: product.name,
          oldPriceCents: product.uvp_cents,
        });
      }
    }
  }

  return { newProducts, priceChanges, discontinued, unchangedCount };
}
