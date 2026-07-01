-- ============================================
-- FIX MANUFACTURER LINEUP
-- ============================================
-- We actually sell/install only 5 brands: AJAX, AXIS, IQSIGHT (the 2025/26
-- rebrand of Bosch Video Systems, holding company = Keenfinity Group),
-- Hanwha and MSI (distributor for Avigilon/Pelco, i.e. Motorola Solutions).
--
-- "Keenfinity" was incorrectly used as if it were the video brand itself -
-- it is the holding company, not a product brand. This migration:
--   1. Renames the existing "Bosch Security" catalog manufacturer to
--      "IQSIGHT" (keeps its 2 existing products intact).
--   2. Removes the now-redundant empty "Keenfinity" manufacturer row.
--   3. Adds "Avigilon" and "Pelco" as catalog manufacturers (the real
--      brands sold via the MSI distributor).
--   4. Updates the `projects.manufacturer` CHECK constraint to the
--      correct 5-brand lineup and adds `msi_brand` (Avigilon/Pelco).
-- ============================================

-- 1) Rename Bosch Security -> IQSIGHT (products keep their manufacturer_id)
UPDATE public.manufacturers
SET name = 'IQSIGHT', slug = 'iqsight'
WHERE slug = 'bosch';

-- 2) Remove the redundant "Keenfinity" entry (0 products attached)
DELETE FROM public.manufacturers
WHERE slug = 'keenfinity'
  AND NOT EXISTS (SELECT 1 FROM public.products WHERE manufacturer_id = manufacturers.id);

-- 3) Add Avigilon + Pelco as catalog manufacturers (sold via MSI)
INSERT INTO public.manufacturers (name, slug, is_active) VALUES
  ('Avigilon', 'avigilon', true),
  ('Pelco', 'pelco', true)
ON CONFLICT (slug) DO NOTHING;

-- 4) Fix the wizard-level manufacturer lineup on projects
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_manufacturer_check;
ALTER TABLE public.projects ADD CONSTRAINT projects_manufacturer_check
  CHECK (manufacturer IN ('AXIS', 'Hanwha', 'AJAX', 'IQSIGHT', 'MSI'));

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS msi_brand TEXT;
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_msi_brand_check;
ALTER TABLE public.projects ADD CONSTRAINT projects_msi_brand_check
  CHECK (msi_brand IS NULL OR msi_brand IN ('Avigilon', 'Pelco'));

COMMENT ON COLUMN public.projects.msi_brand IS
  'Actual brand used when manufacturer = MSI (MSI is only the distributor for Avigilon/Pelco)';

DO $$
BEGIN
  RAISE NOTICE '✅ Manufacturer lineup fixed: AXIS, Hanwha, AJAX, IQSIGHT, MSI (Avigilon/Pelco).';
END $$;
