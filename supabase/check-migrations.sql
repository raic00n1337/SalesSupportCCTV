-- ============================================
-- MIGRATION STATUS CHECKER
-- ============================================
-- Führe dieses SQL in Supabase SQL Editor aus
-- um zu prüfen, welche Tabellen existieren.
-- Alle Checks sind als EIN UNION-ALL-Query gebaut, damit der
-- SQL-Editor alle Zeilen in einer einzigen Ergebnistabelle anzeigt
-- (bei mehreren einzelnen SELECTs zeigt er sonst nur das letzte Ergebnis).
-- ============================================

SELECT 1 AS sort_order, 'projects - cable_fields' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'data_cable_meters'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING - Run: add_cable_fields.sql'
  END AS status

UNION ALL
SELECT 2, 'configurator_products table',
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'configurator_products'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING - Run: add_configurator_products.sql'
  END

UNION ALL
SELECT 3, 'rules table',
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'rules'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING - Run: add_rules_table.sql'
  END

-- Note: system_designs / camera_placements / floor-plans bucket were
-- intentionally removed (see drop_system_designer.sql) after the
-- System Designer feature was discontinued.

UNION ALL
SELECT 4, 'products - manufacturer_url',
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'manufacturer_url'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING - Run: add_catalog_change_tracking.sql'
  END

UNION ALL
SELECT 5, 'catalog_import_batches table',
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'catalog_import_batches'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING - Run: add_catalog_change_tracking.sql'
  END

UNION ALL
SELECT 6, 'catalog_changes table',
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'catalog_changes'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING - Run: add_catalog_change_tracking.sql'
  END

UNION ALL
SELECT 7, 'manufacturer lineup fixed (IQSIGHT/Avigilon/Pelco, no Bosch)',
  CASE
    WHEN EXISTS (SELECT 1 FROM public.manufacturers WHERE slug = 'iqsight')
     AND EXISTS (SELECT 1 FROM public.manufacturers WHERE slug = 'avigilon')
     AND EXISTS (SELECT 1 FROM public.manufacturers WHERE slug = 'pelco')
     AND NOT EXISTS (SELECT 1 FROM public.manufacturers WHERE slug = 'bosch')
    THEN '✅ EXISTS' ELSE '❌ MISSING - Run: fix_manufacturer_lineup.sql'
  END

ORDER BY sort_order;
