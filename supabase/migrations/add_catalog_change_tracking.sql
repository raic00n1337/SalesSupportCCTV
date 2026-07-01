-- ============================================
-- CATALOG CHANGE TRACKING (Preis-/Sortiments-Monitor)
-- ============================================
-- Purpose: whenever an admin uploads an updated manufacturer price list
-- (Excel/CSV) via the Import-Compiler, compare it against the current
-- `products` catalog and record price changes, new products and
-- discontinuation candidates for manual review in the admin area
-- (see docs: price monitoring for AJAX, AXIS, IQSIGHT, Hanwha, MSI).
-- ============================================

-- 1) Where a product can be found on the manufacturer's own website.
--    Populated either directly from an imported "product URL" column, or
--    computed as a best-effort link (exact deep link or site-search).
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS manufacturer_url TEXT;
COMMENT ON COLUMN public.products.manufacturer_url IS
  'Link to the product on the manufacturer''s website (exact deep link where derivable, otherwise a site search link)';

-- 2) One row per uploaded price list ("batch")
CREATE TABLE IF NOT EXISTS public.catalog_import_batches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  manufacturer_id UUID REFERENCES public.manufacturers(id) ON DELETE SET NULL,
  source_filename TEXT NOT NULL,
  is_full_catalog BOOLEAN NOT NULL DEFAULT false, -- if true, missing SKUs are flagged as "discontinued"
  imported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  total_rows INT NOT NULL DEFAULT 0,
  new_count INT NOT NULL DEFAULT 0,
  price_change_count INT NOT NULL DEFAULT 0,
  discontinued_count INT NOT NULL DEFAULT 0,
  unchanged_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3) One row per detected change, awaiting manual approval
CREATE TABLE IF NOT EXISTS public.catalog_changes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  batch_id UUID REFERENCES public.catalog_import_batches(id) ON DELETE CASCADE NOT NULL,
  change_type TEXT CHECK (change_type IN ('new_product', 'price_change', 'discontinued')) NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL, -- null for not-yet-created new products
  manufacturer_id UUID REFERENCES public.manufacturers(id) ON DELETE SET NULL,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  old_price_cents BIGINT,
  new_price_cents BIGINT,
  raw_row JSONB, -- full imported row, used to create the product on approval of a new_product change
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_catalog_changes_status
  ON public.catalog_changes(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_catalog_changes_batch
  ON public.catalog_changes(batch_id);

-- ============================================
-- RLS: admin-only (read + write) - regular API access goes through
-- service-role admin endpoints, same pattern as `rules`.
-- ============================================
ALTER TABLE public.catalog_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage catalog import batches"
  ON public.catalog_import_batches FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.user_id = auth.uid()));

CREATE POLICY "Admins can manage catalog changes"
  ON public.catalog_changes FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.user_id = auth.uid()));

DO $$
BEGIN
  RAISE NOTICE '✅ Catalog change tracking ready (catalog_import_batches, catalog_changes, products.manufacturer_url).';
END $$;
