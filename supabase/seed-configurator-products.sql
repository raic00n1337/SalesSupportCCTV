-- ============================================
-- SEED DATA: Konfigurator-Produkte
-- ============================================
-- Ordnet existierende Produkte den Konfigurator-Kategorien zu
-- Voraussetzung: seed-catalog.sql wurde bereits ausgeführt

-- ============================================
-- ECO TIER - Hikvision & Dahua (Budget)
-- ============================================

-- ECO: Dome Fixed (Hikvision DS-2CD2143G2-I)
INSERT INTO public.configurator_products (product_id, tier, category, priority, is_default, bhe_time_minutes)
SELECT 
  p.id,
  'eco',
  'camera_dome_fixed',
  10,
  true, -- Default für Eco Tier
  40
FROM public.products p
WHERE p.sku = 'HIK-DS2CD2143G2'
ON CONFLICT (product_id, tier, category) DO UPDATE
SET is_default = EXCLUDED.is_default, priority = EXCLUDED.priority, bhe_time_minutes = EXCLUDED.bhe_time_minutes;

-- ECO: Dome Vario (Dahua IPC-HDBW2431R-ZS mit Motorized Zoom)
INSERT INTO public.configurator_products (product_id, tier, category, priority, is_default, bhe_time_minutes)
SELECT 
  p.id,
  'eco',
  'camera_dome_vario',
  10,
  true,
  45
FROM public.products p
WHERE p.sku = 'DAH-IPC-HDBW2431R'
ON CONFLICT (product_id, tier, category) DO UPDATE
SET is_default = EXCLUDED.is_default, priority = EXCLUDED.priority, bhe_time_minutes = EXCLUDED.bhe_time_minutes;

-- ECO: Dome Fixed Alternative (Dahua IPC-HDBW3841E)
INSERT INTO public.configurator_products (product_id, tier, category, priority, is_default, bhe_time_minutes)
SELECT 
  p.id,
  'eco',
  'camera_dome_fixed',
  5,
  false, -- Zweite Option
  40
FROM public.products p
WHERE p.sku = 'DAH-IPC-HDBW3841E'
ON CONFLICT (product_id, tier, category) DO UPDATE
SET is_default = EXCLUDED.is_default, priority = EXCLUDED.priority, bhe_time_minutes = EXCLUDED.bhe_time_minutes;

-- ECO: Bullet Fixed (Hikvision DS-2CD2T85G1-I8)
INSERT INTO public.configurator_products (product_id, tier, category, priority, is_default, bhe_time_minutes)
SELECT 
  p.id,
  'eco',
  'camera_bullet_fixed',
  10,
  true,
  35
FROM public.products p
WHERE p.sku = 'HIK-DS2CD2T85G1'
ON CONFLICT (product_id, tier, category) DO UPDATE
SET is_default = EXCLUDED.is_default, priority = EXCLUDED.priority, bhe_time_minutes = EXCLUDED.bhe_time_minutes;

-- ECO: Bullet Vario (Dahua IPC-HFW3841E-ZAS mit Motorized Zoom)
INSERT INTO public.configurator_products (product_id, tier, category, priority, is_default, bhe_time_minutes)
SELECT 
  p.id,
  'eco',
  'camera_bullet_vario',
  10,
  true,
  40
FROM public.products p
WHERE p.sku = 'DAH-IPC-HFW3841E'
ON CONFLICT (product_id, tier, category) DO UPDATE
SET is_default = EXCLUDED.is_default, priority = EXCLUDED.priority, bhe_time_minutes = EXCLUDED.bhe_time_minutes;

-- ECO: PTZ (Hikvision DS-2DE3404IW-DE)
INSERT INTO public.configurator_products (product_id, tier, category, priority, is_default, bhe_time_minutes)
SELECT 
  p.id,
  'eco',
  'camera_ptz',
  10,
  true,
  60
FROM public.products p
WHERE p.sku = 'HIK-DS2DE3404IW'
ON CONFLICT (product_id, tier, category) DO UPDATE
SET is_default = EXCLUDED.is_default, priority = EXCLUDED.priority, bhe_time_minutes = EXCLUDED.bhe_time_minutes;

-- ============================================
-- PREMIUM TIER - AXIS & Hanwha (High-End)
-- ============================================

-- PREMIUM: Dome Fixed (AXIS M4318-PLVA)
INSERT INTO public.configurator_products (product_id, tier, category, priority, is_default, bhe_time_minutes)
SELECT 
  p.id,
  'premium',
  'camera_dome_fixed',
  10,
  true,
  45
FROM public.products p
WHERE p.sku = 'AXIS-M4318-PLVA'
ON CONFLICT (product_id, tier, category) DO UPDATE
SET is_default = EXCLUDED.is_default, priority = EXCLUDED.priority, bhe_time_minutes = EXCLUDED.bhe_time_minutes;

-- PREMIUM: Dome Vario (AXIS P3245-LVE mit Lightfinder)
INSERT INTO public.configurator_products (product_id, tier, category, priority, is_default, bhe_time_minutes)
SELECT 
  p.id,
  'premium',
  'camera_dome_vario',
  10,
  true,
  50
FROM public.products p
WHERE p.sku = 'AXIS-P3245-LVE'
ON CONFLICT (product_id, tier, category) DO UPDATE
SET is_default = EXCLUDED.is_default, priority = EXCLUDED.priority, bhe_time_minutes = EXCLUDED.bhe_time_minutes;

-- PREMIUM: Dome Fixed Alternative (Hanwha XNV-8080R)
INSERT INTO public.configurator_products (product_id, tier, category, priority, is_default, bhe_time_minutes)
SELECT 
  p.id,
  'premium',
  'camera_dome_fixed',
  5,
  false,
  45
FROM public.products p
WHERE p.sku = 'HAN-XNV-8080R'
ON CONFLICT (product_id, tier, category) DO UPDATE
SET is_default = EXCLUDED.is_default, priority = EXCLUDED.priority, bhe_time_minutes = EXCLUDED.bhe_time_minutes;

-- PREMIUM: Bullet Fixed (AXIS P1468-LE)
INSERT INTO public.configurator_products (product_id, tier, category, priority, is_default, bhe_time_minutes)
SELECT 
  p.id,
  'premium',
  'camera_bullet_fixed',
  10,
  true,
  40
FROM public.products p
WHERE p.sku = 'AXIS-P1468-LE'
ON CONFLICT (product_id, tier, category) DO UPDATE
SET is_default = EXCLUDED.is_default, priority = EXCLUDED.priority, bhe_time_minutes = EXCLUDED.bhe_time_minutes;

-- PREMIUM: Bullet Vario (Hanwha QNO-8080R)
INSERT INTO public.configurator_products (product_id, tier, category, priority, is_default, bhe_time_minutes)
SELECT 
  p.id,
  'premium',
  'camera_bullet_vario',
  10,
  true,
  45
FROM public.products p
WHERE p.sku = 'HAN-QNO-8080R'
ON CONFLICT (product_id, tier, category) DO UPDATE
SET is_default = EXCLUDED.is_default, priority = EXCLUDED.priority, bhe_time_minutes = EXCLUDED.bhe_time_minutes;

-- PREMIUM: PTZ (Hanwha XNZ-6320 mit 32x Zoom)
INSERT INTO public.configurator_products (product_id, tier, category, priority, is_default, bhe_time_minutes)
SELECT 
  p.id,
  'premium',
  'camera_ptz',
  10,
  true,
  90
FROM public.products p
WHERE p.sku = 'HAN-XNZ-6320'
ON CONFLICT (product_id, tier, category) DO UPDATE
SET is_default = EXCLUDED.is_default, priority = EXCLUDED.priority, bhe_time_minutes = EXCLUDED.bhe_time_minutes;

-- ============================================
-- HIGH-RISK TIER - Top Produkte (Spezial)
-- ============================================

-- HIGH-RISK: Dome Fixed (AXIS M3068-P - 12MP Panorama)
INSERT INTO public.configurator_products (product_id, tier, category, priority, is_default, bhe_time_minutes)
SELECT 
  p.id,
  'high-risk',
  'camera_dome_fixed',
  10,
  true,
  50
FROM public.products p
WHERE p.sku = 'AXIS-M3068-P'
ON CONFLICT (product_id, tier, category) DO UPDATE
SET is_default = EXCLUDED.is_default, priority = EXCLUDED.priority, bhe_time_minutes = EXCLUDED.bhe_time_minutes;

-- HIGH-RISK: Dome Vario (Bosch FLEXIDOME IP 5000i mit Analytics)
INSERT INTO public.configurator_products (product_id, tier, category, priority, is_default, bhe_time_minutes)
SELECT 
  p.id,
  'high-risk',
  'camera_dome_vario',
  10,
  true,
  55
FROM public.products p
WHERE p.sku = 'BOSCH-NDE-5503-AL'
ON CONFLICT (product_id, tier, category) DO UPDATE
SET is_default = EXCLUDED.is_default, priority = EXCLUDED.priority, bhe_time_minutes = EXCLUDED.bhe_time_minutes;

-- HIGH-RISK: Dome Vario Alternative (AXIS P3245-LVE)
INSERT INTO public.configurator_products (product_id, tier, category, priority, is_default, bhe_time_minutes)
SELECT 
  p.id,
  'high-risk',
  'camera_dome_vario',
  5,
  false,
  50
FROM public.products p
WHERE p.sku = 'AXIS-P3245-LVE'
ON CONFLICT (product_id, tier, category) DO UPDATE
SET is_default = EXCLUDED.is_default, priority = EXCLUDED.priority, bhe_time_minutes = EXCLUDED.bhe_time_minutes;

-- HIGH-RISK: Bullet Fixed (Bosch DINION IP 6000i mit Starlight)
INSERT INTO public.configurator_products (product_id, tier, category, priority, is_default, bhe_time_minutes)
SELECT 
  p.id,
  'high-risk',
  'camera_bullet_fixed',
  10,
  true,
  45
FROM public.products p
WHERE p.sku = 'BOSCH-NBE-6502-AL'
ON CONFLICT (product_id, tier, category) DO UPDATE
SET is_default = EXCLUDED.is_default, priority = EXCLUDED.priority, bhe_time_minutes = EXCLUDED.bhe_time_minutes;

-- HIGH-RISK: Bullet Vario (AXIS P1468-LE)
INSERT INTO public.configurator_products (product_id, tier, category, priority, is_default, bhe_time_minutes)
SELECT 
  p.id,
  'high-risk',
  'camera_bullet_vario',
  10,
  true,
  45
FROM public.products p
WHERE p.sku = 'AXIS-P1468-LE'
ON CONFLICT (product_id, tier, category) DO UPDATE
SET is_default = EXCLUDED.is_default, priority = EXCLUDED.priority, bhe_time_minutes = EXCLUDED.bhe_time_minutes;

-- HIGH-RISK: PTZ (Hanwha XNZ-6320 - beste PTZ)
INSERT INTO public.configurator_products (product_id, tier, category, priority, is_default, bhe_time_minutes)
SELECT 
  p.id,
  'high-risk',
  'camera_ptz',
  10,
  true,
  90
FROM public.products p
WHERE p.sku = 'HAN-XNZ-6320'
ON CONFLICT (product_id, tier, category) DO UPDATE
SET is_default = EXCLUDED.is_default, priority = EXCLUDED.priority, bhe_time_minutes = EXCLUDED.bhe_time_minutes;

-- HIGH-RISK: Box Camera für spezielle Anwendungen (AXIS Q1656)
INSERT INTO public.configurator_products (product_id, tier, category, priority, is_default, bhe_time_minutes)
SELECT 
  p.id,
  'high-risk',
  'camera_dome_fixed', -- Als Alternative
  5,
  false,
  60
FROM public.products p
WHERE p.sku = 'AXIS-Q1656'
ON CONFLICT (product_id, tier, category) DO UPDATE
SET is_default = EXCLUDED.is_default, priority = EXCLUDED.priority, bhe_time_minutes = EXCLUDED.bhe_time_minutes;

-- ============================================
-- SUMMARY
-- ============================================

-- Zeige was erstellt wurde:
SELECT 
  tier,
  category,
  COUNT(*) as anzahl_produkte,
  STRING_AGG(
    CASE WHEN is_default THEN '⭐ ' ELSE '' END || 
    (SELECT name FROM products WHERE id = product_id), 
    ', '
  ) as produkte
FROM public.configurator_products
GROUP BY tier, category
ORDER BY tier, category;

-- SUCCESS!
-- 20 Produkte wurden den Konfigurator-Kategorien zugeordnet
-- Pro Tier gibt es jetzt Default-Produkte für:
-- - Dome Fixed
-- - Dome Vario
-- - Bullet Fixed
-- - Bullet Vario
-- - PTZ
