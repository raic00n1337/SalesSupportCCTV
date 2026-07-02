// API Route: POST /api/admin/catalog-diff
// Compiles an uploaded manufacturer price list (CSV/Excel, same pipeline as
// the Import-Compiler) and compares it against the current product catalog.
// Detected changes (new products, price changes, discontinuation
// candidates) are stored as a pending "catalog_changes" batch for manual
// review in the admin area - nothing is written to `products` here.

import { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '../../../lib/apiAuth';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { compileFile, decodeUploadedFileContent } from '../../../lib/csvCompiler';
import { computeCatalogDiff, type CatalogDiffRow, type ExistingCatalogProduct } from '../../../lib/catalogDiff';
import { getManufacturerLink } from '../../../lib/manufacturerLinks';
import { FORMAT_PROFILES } from '../../../lib/formatProfiles';
import { fetchAllRows } from '../../../lib/supabasePagination';
import type { CompilerOptions } from '../../../lib/csvCompilerTypes';

export const config = {
  api: {
    bodyParser: {
      // Excel files are sent base64-encoded (~33% larger than the raw file).
      sizeLimit: '15mb',
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const user = await requireAdmin(req, res);
  if (!user) return;

  try {
    const { fileContent, fileName, manufacturerSlug, isFullCatalog, formatProfile, isBase64 } = req.body as {
      fileContent: string;
      fileName: string;
      manufacturerSlug: string;
      isFullCatalog: boolean;
      formatProfile?: string;
      isBase64?: boolean;
    };

    if (!fileContent || !fileName || !manufacturerSlug) {
      return res.status(400).json({ error: 'Missing required fields: fileContent, fileName, manufacturerSlug' });
    }

    const decodedContent = decodeUploadedFileContent(fileContent, Boolean(isBase64));

    const { data: manufacturer, error: manufacturerError } = await supabaseAdmin
      .from('manufacturers')
      .select('id, name, slug')
      .eq('slug', manufacturerSlug)
      .single();

    if (manufacturerError || !manufacturer) {
      return res.status(404).json({ error: `Unknown manufacturer slug: ${manufacturerSlug}` });
    }

    // Prefer the manufacturer's own format profile (real sheet/header/column
    // layout) over generic auto-detection whenever we have one - the admin
    // already told us the manufacturer via the dropdown, so there's no need
    // to guess from column headers, which is fragile for messy real-world
    // workbooks (multiple sheets, title rows, unlabeled columns, etc.).
    const resolvedFormatProfile = formatProfile || (FORMAT_PROFILES[manufacturerSlug] ? manufacturerSlug : undefined);

    const compilerOptions: CompilerOptions = {
      autoDetect: true,
      validateData: true,
      dryRun: true,
      formatProfile: resolvedFormatProfile,
    };

    const compileResult = await compileFile(decodedContent, fileName, compilerOptions);
    if (!compileResult.transformedData.length) {
      return res.status(400).json({
        error: 'Datei konnte nicht ausgewertet werden oder enthält keine Zeilen',
        compileResult,
      });
    }

    // Manufacturers like AXIS and Hanwha already have well over 1000 products,
    // so this must be paged (see fetchAllRows) - otherwise the diff would
    // silently ignore everything past the cutoff, making existing products
    // look "new" and missing price changes/discontinuations.
    let existingProducts: ExistingCatalogProduct[];
    try {
      existingProducts = await fetchAllRows<ExistingCatalogProduct>((from, to) =>
        supabaseAdmin
          .from('products')
          .select('id, sku, name, uvp_cents, is_active')
          .eq('manufacturer_id', (manufacturer as any).id)
          .range(from, to)
      );
    } catch (err: any) {
      return res.status(500).json({ error: 'Fehler beim Laden des bestehenden Katalogs', details: err.message });
    }

    const diffRows: CatalogDiffRow[] = compileResult.transformedData
      .filter((row: any) => row.sku && row.uvp_cents)
      .map((row: any) => ({
        sku: row.sku,
        name: row.name || row.sku,
        uvp_cents: row.uvp_cents,
        category: row.category,
        description: row.description,
        is_active: row.is_active,
        manufacturer_url: row.manufacturer_url,
        raw: row,
      }));

    const diff = computeCatalogDiff(diffRows, existingProducts, Boolean(isFullCatalog));

    // Persist as a batch + pending change rows for manual review.
    const { data: batch, error: batchError } = await supabaseAdmin
      .from('catalog_import_batches')
      .insert({
        manufacturer_id: (manufacturer as any).id,
        source_filename: fileName,
        is_full_catalog: Boolean(isFullCatalog),
        imported_by: user.id,
        total_rows: diffRows.length,
        new_count: diff.newProducts.length,
        price_change_count: diff.priceChanges.length,
        discontinued_count: diff.discontinued.length,
        unchanged_count: diff.unchangedCount,
      } as any)
      .select()
      .single();

    if (batchError || !batch) {
      return res.status(500).json({ error: 'Fehler beim Anlegen des Import-Batches', details: batchError?.message });
    }

    const batchId = (batch as any).id;
    const changeRows: any[] = [];

    for (const item of diff.newProducts) {
      const link = item.raw.manufacturer_url || getManufacturerLink(manufacturerSlug, item.sku)?.url || null;
      changeRows.push({
        batch_id: batchId,
        change_type: 'new_product',
        manufacturer_id: (manufacturer as any).id,
        sku: item.sku,
        name: item.name,
        new_price_cents: item.uvpCents,
        raw_row: { ...item.raw, manufacturer_url: link },
        status: 'pending',
      });
    }

    for (const item of diff.priceChanges) {
      changeRows.push({
        batch_id: batchId,
        change_type: 'price_change',
        product_id: item.productId,
        manufacturer_id: (manufacturer as any).id,
        sku: item.sku,
        name: item.name,
        old_price_cents: item.oldPriceCents,
        new_price_cents: item.newPriceCents,
        status: 'pending',
      });
    }

    for (const item of diff.discontinued) {
      changeRows.push({
        batch_id: batchId,
        change_type: 'discontinued',
        product_id: item.productId,
        manufacturer_id: (manufacturer as any).id,
        sku: item.sku,
        name: item.name,
        old_price_cents: item.oldPriceCents,
        status: 'pending',
      });
    }

    if (changeRows.length > 0) {
      const { error: changesError } = await supabaseAdmin.from('catalog_changes').insert(changeRows as any);
      if (changesError) {
        return res.status(500).json({ error: 'Fehler beim Speichern der Änderungen', details: changesError.message });
      }
    }

    return res.status(200).json({
      success: true,
      batch,
      summary: {
        totalRows: diffRows.length,
        newCount: diff.newProducts.length,
        priceChangeCount: diff.priceChanges.length,
        discontinuedCount: diff.discontinued.length,
        unchangedCount: diff.unchangedCount,
      },
    });
  } catch (error: any) {
    console.error('catalog-diff error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
