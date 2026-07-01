-- ============================================
-- MIGRATION STATUS CHECKER (Einfache Version)
-- ============================================
-- Zeigt ALLE Checks in EINER Tabelle
-- ============================================

SELECT 
  check_name,
  status
FROM (
  -- Check 1: Cable Fields
  SELECT 
    1 as sort_order,
    'projects.data_cable_meters' as check_name,
    CASE 
      WHEN EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'projects' 
        AND column_name = 'data_cable_meters'
      ) THEN '✅ EXISTS'
      ELSE '❌ MISSING → Run: add_cable_fields.sql'
    END as status
  
  UNION ALL
  
  -- Check 2: Configurator Products Table
  SELECT 
    2 as sort_order,
    'configurator_products (table)' as check_name,
    CASE 
      WHEN EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'configurator_products'
      ) THEN '✅ EXISTS'
      ELSE '❌ MISSING → Run: add_configurator_products.sql'
    END as status
  
  UNION ALL
  
  -- Check 3: Rules Table
  SELECT 
    3 as sort_order,
    'rules (table)' as check_name,
    CASE 
      WHEN EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'rules'
      ) THEN '✅ EXISTS'
      ELSE '❌ MISSING → Run: add_rules_table.sql'
    END as status
  
) as checks
ORDER BY sort_order;

-- Note: system_designs / camera_placements / floor-plans bucket were
-- intentionally removed (see drop_system_designer.sql) after the
-- System Designer feature was discontinued, so they're no longer checked here.
