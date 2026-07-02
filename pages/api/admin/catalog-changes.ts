// API Route: /api/admin/catalog-changes
// GET   - list catalog changes (default: pending only) for manual review
// PATCH - approve or reject a single change; approving writes the change
//         through to `products` (create / price update / deactivate)

import { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '../../../lib/apiAuth';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireAdmin(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    return handleList(req, res);
  }

  if (req.method === 'PATCH') {
    return handleReview(req, res, user.id);
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}

async function handleList(req: NextApiRequest, res: NextApiResponse) {
  const status = (req.query.status as string) || 'pending';

  let query = supabaseAdmin
    .from('catalog_changes')
    .select(`
      id, change_type, sku, name, old_price_cents, new_price_cents, status,
      created_at, reviewed_at, product_id, raw_row,
      manufacturers ( name, slug ),
      catalog_import_batches ( source_filename, is_full_catalog, created_at )
    `)
    .order('created_at', { ascending: false });

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({ error: 'Fehler beim Laden der Änderungen', details: error.message });
  }

  return res.status(200).json({ success: true, changes: data || [] });
}

interface ReviewResult {
  id: string;
  success: boolean;
  error?: string;
}

async function handleReview(req: NextApiRequest, res: NextApiResponse, reviewerId: string) {
  // Accepts either a single `id` (legacy) or an `ids` array (bulk review) -
  // both go through the same per-item logic so partial failures (e.g. one
  // SKU already taken) don't block the rest of the batch.
  const { id, ids, action } = req.body as { id?: string; ids?: string[]; action: 'approve' | 'reject' };
  const targetIds = ids && ids.length > 0 ? ids : id ? [id] : [];

  if (targetIds.length === 0 || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Missing/invalid fields: id(s), action (approve|reject)' });
  }

  const results: ReviewResult[] = [];

  for (const targetId of targetIds) {
    results.push(await reviewSingleChange(targetId, action, reviewerId));
  }

  const allSucceeded = results.every((r) => r.success);
  return res.status(allSucceeded ? 200 : 207).json({ success: allSucceeded, results });
}

async function reviewSingleChange(
  id: string,
  action: 'approve' | 'reject',
  reviewerId: string
): Promise<ReviewResult> {
  const { data: change, error: fetchError } = await supabaseAdmin
    .from('catalog_changes')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !change) {
    return { id, success: false, error: 'Änderung nicht gefunden' };
  }

  const changeRow = change as any;

  if (changeRow.status !== 'pending') {
    return { id, success: false, error: 'Diese Änderung wurde bereits bearbeitet' };
  }

  if (action === 'approve') {
    try {
      await applyChange(changeRow);
    } catch (err: any) {
      return { id, success: false, error: `Fehler beim Übernehmen: ${err.message}` };
    }
  }

  const { error: updateError } = await supabaseAdmin
    .from('catalog_changes')
    .update({
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    } as any)
    .eq('id', id);

  if (updateError) {
    return { id, success: false, error: `Fehler beim Speichern: ${updateError.message}` };
  }

  return { id, success: true };
}

async function applyChange(change: any): Promise<void> {
  switch (change.change_type) {
    case 'price_change': {
      const { error } = await supabaseAdmin
        .from('products')
        .update({ uvp_cents: change.new_price_cents } as any)
        .eq('id', change.product_id);
      if (error) throw new Error(error.message);
      return;
    }

    case 'discontinued': {
      const { error } = await supabaseAdmin
        .from('products')
        .update({ is_active: false } as any)
        .eq('id', change.product_id);
      if (error) throw new Error(error.message);
      return;
    }

    case 'new_product': {
      const raw = change.raw_row || {};
      const { error } = await supabaseAdmin.from('products').insert({
        manufacturer_id: change.manufacturer_id,
        category: raw.category || 'uncategorized',
        sku: change.sku,
        eso_number: raw.eso_number || change.sku,
        name: change.name,
        description: raw.description || null,
        uvp_cents: change.new_price_cents,
        is_active: raw.is_active ?? true,
        manufacturer_url: raw.manufacturer_url || null,
      } as any);
      if (error) throw new Error(error.message);
      return;
    }

    default:
      throw new Error(`Unknown change_type: ${change.change_type}`);
  }
}
