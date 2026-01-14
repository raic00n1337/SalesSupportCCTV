-- ============================================
-- MIGRATION STATUS CHECKER
-- ============================================
-- Führe dieses SQL in Supabase SQL Editor aus
-- um zu prüfen, welche Tabellen existieren
-- ============================================

-- Check 1: Cable Fields in projects table
SELECT 
  'projects - cable_fields' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'projects' 
      AND column_name = 'data_cable_meters'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING - Run: add_cable_fields.sql'
  END as status;

-- Check 2: configurator_products table
SELECT 
  'configurator_products table' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'configurator_products'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING - Run: add_configurator_products.sql'
  END as status;

-- Check 3: rules table
SELECT 
  'rules table' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'rules'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING - Run: add_rules_table.sql'
  END as status;

-- Check 4: system_designs table
SELECT 
  'system_designs table' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'system_designs'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING - Run: add_system_designer.sql'
  END as status;

-- Check 5: camera_placements table
SELECT 
  'camera_placements table' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'camera_placements'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING - Run: add_system_designer.sql'
  END as status;

-- Check 6: floor-plans storage bucket
SELECT 
  'floor-plans storage bucket' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM storage.buckets 
      WHERE id = 'floor-plans'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING - Run: add_system_designer.sql'
  END as status;

-- ============================================
-- SUMMARY
-- ============================================
SELECT 
  '============================================' as summary,
  '' as blank,
  'TOTAL MIGRATIONS: 4' as total,
  '' as blank2,
  '1. add_cable_fields.sql' as migration1,
  '2. add_configurator_products.sql' as migration2,
  '3. add_rules_table.sql' as migration3,
  '4. add_system_designer.sql' as migration4;
