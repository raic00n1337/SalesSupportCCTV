-- ============================================
-- SEED DATA: CCTV Catalog (Manufacturers + Products)
-- ============================================
-- This file creates dummy data for testing the admin interface
-- Execute this in Supabase SQL Editor to populate your catalog

-- ============================================
-- 1. MANUFACTURERS
-- ============================================

INSERT INTO public.manufacturers (name, slug, is_active) VALUES
  ('AXIS Communications', 'axis', true),
  ('Hikvision', 'hikvision', true),
  ('Dahua', 'dahua', true),
  ('Hanwha Techwin', 'hanwha', true),
  ('Bosch Security', 'bosch', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 2. PRODUCTS - CAMERAS
-- ============================================

-- AXIS Cameras
INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, description, uvp_cents, tags, is_active)
SELECT 
  m.id,
  'camera',
  'AXIS-M3068-P',
  'ESO001001',
  'AXIS M3068-P Dome Camera',
  '12MP Indoor Dome mit 360° Panorama, WDR, Zipstream',
  129900,
  ARRAY['dome', 'indoor', '12mp', '360', 'premium'],
  true
FROM public.manufacturers m WHERE m.slug = 'axis'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, description, uvp_cents, tags, is_active)
SELECT 
  m.id,
  'camera',
  'AXIS-P3245-LVE',
  'ESO001002',
  'AXIS P3245-LVE Dome Camera',
  '4K Outdoor Dome, Lightfinder, WDR, IK10, IP66',
  89900,
  ARRAY['dome', 'outdoor', '4k', '8mp', 'premium'],
  true
FROM public.manufacturers m WHERE m.slug = 'axis'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, description, uvp_cents, tags, is_active)
SELECT 
  m.id,
  'camera',
  'AXIS-M4318-PLVA',
  'ESO001003',
  'AXIS M4318-PLVA Dome Camera',
  '8MP Outdoor Dome, Lightfinder, WDR, IK10',
  67900,
  ARRAY['dome', 'outdoor', '8mp', '4k', 'premium'],
  true
FROM public.manufacturers m WHERE m.slug = 'axis'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, description, uvp_cents, tags, is_active)
SELECT 
  m.id,
  'camera',
  'AXIS-Q1656',
  'ESO001004',
  'AXIS Q1656 Box Camera',
  '4K Box Camera, Lightfinder, WDR, Remote Focus',
  149900,
  ARRAY['box', 'indoor', '4k', '10mp', 'premium'],
  true
FROM public.manufacturers m WHERE m.slug = 'axis'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, description, uvp_cents, tags, is_active)
SELECT 
  m.id,
  'camera',
  'AXIS-P1468-LE',
  'ESO001005',
  'AXIS P1468-LE Bullet Camera',
  '4K Outdoor Bullet, Lightfinder, WDR, IP66',
  79900,
  ARRAY['bullet', 'outdoor', '4k', '8mp', 'premium'],
  true
FROM public.manufacturers m WHERE m.slug = 'axis'
ON CONFLICT (sku) DO NOTHING;

-- Hikvision Cameras
INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, description, uvp_cents, tags, is_active)
SELECT 
  m.id,
  'camera',
  'HIK-DS2CD2385G1',
  'ESO002001',
  'Hikvision DS-2CD2385G1-I Dome',
  '8MP Outdoor Dome, EXIR 2.0, H.265+, WDR',
  42900,
  ARRAY['dome', 'outdoor', '8mp', '4k', 'eco'],
  true
FROM public.manufacturers m WHERE m.slug = 'hikvision'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, description, uvp_cents, tags, is_active)
SELECT 
  m.id,
  'camera',
  'HIK-DS2CD2T85G1',
  'ESO002002',
  'Hikvision DS-2CD2T85G1-I8 Bullet',
  '8MP Outdoor Bullet, EXIR 2.0, 80m IR, H.265+',
  45900,
  ARRAY['bullet', 'outdoor', '8mp', '4k', 'eco'],
  true
FROM public.manufacturers m WHERE m.slug = 'hikvision'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, description, uvp_cents, tags, is_active)
SELECT 
  m.id,
  'camera',
  'HIK-DS2CD2143G2',
  'ESO002003',
  'Hikvision DS-2CD2143G2-I Dome',
  '4MP Outdoor Dome, AcuSense, H.265+, WDR',
  35900,
  ARRAY['dome', 'outdoor', '4mp', 'acusense', 'eco'],
  true
FROM public.manufacturers m WHERE m.slug = 'hikvision'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, description, uvp_cents, tags, is_active)
SELECT 
  m.id,
  'camera',
  'HIK-DS2DE3404IW',
  'ESO002004',
  'Hikvision DS-2DE3404IW-DE PTZ',
  '4MP PTZ Dome, 4x Zoom, 20m IR, H.265+',
  59900,
  ARRAY['ptz', 'outdoor', '4mp', 'zoom', 'eco'],
  true
FROM public.manufacturers m WHERE m.slug = 'hikvision'
ON CONFLICT (sku) DO NOTHING;

-- Dahua Cameras
INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, description, uvp_cents, tags, is_active)
SELECT 
  m.id,
  'camera',
  'DAH-IPC-HDBW3841E',
  'ESO003001',
  'Dahua IPC-HDBW3841E-ZAS Dome',
  '8MP Outdoor Dome, Starlight, Motorized Zoom, IK10',
  48900,
  ARRAY['dome', 'outdoor', '8mp', '4k', 'eco'],
  true
FROM public.manufacturers m WHERE m.slug = 'dahua'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, description, uvp_cents, tags, is_active)
SELECT 
  m.id,
  'camera',
  'DAH-IPC-HFW3841E',
  'ESO003002',
  'Dahua IPC-HFW3841E-ZAS Bullet',
  '8MP Outdoor Bullet, Starlight, Motorized Zoom',
  46900,
  ARRAY['bullet', 'outdoor', '8mp', '4k', 'eco'],
  true
FROM public.manufacturers m WHERE m.slug = 'dahua'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, description, uvp_cents, tags, is_active)
SELECT 
  m.id,
  'camera',
  'DAH-IPC-HDBW2431R',
  'ESO003003',
  'Dahua IPC-HDBW2431R-ZS Dome',
  '4MP Outdoor Dome, Starlight, Motorized Zoom',
  32900,
  ARRAY['dome', 'outdoor', '4mp', 'zoom', 'eco'],
  true
FROM public.manufacturers m WHERE m.slug = 'dahua'
ON CONFLICT (sku) DO NOTHING;

-- Hanwha Cameras
INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, description, uvp_cents, tags, is_active)
SELECT 
  m.id,
  'camera',
  'HAN-XNV-8080R',
  'ESO004001',
  'Hanwha XNV-8080R Dome Camera',
  '5MP Outdoor Dome, WiseStream II, 50m IR, IK10',
  52900,
  ARRAY['dome', 'outdoor', '5mp', 'ir', 'premium'],
  true
FROM public.manufacturers m WHERE m.slug = 'hanwha'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, description, uvp_cents, tags, is_active)
SELECT 
  m.id,
  'camera',
  'HAN-QNO-8080R',
  'ESO004002',
  'Hanwha QNO-8080R Bullet Camera',
  '5MP Outdoor Bullet, WiseStream II, 50m IR',
  49900,
  ARRAY['bullet', 'outdoor', '5mp', 'ir', 'premium'],
  true
FROM public.manufacturers m WHERE m.slug = 'hanwha'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, description, uvp_cents, tags, is_active)
SELECT 
  m.id,
  'camera',
  'HAN-XNZ-6320',
  'ESO004003',
  'Hanwha XNZ-6320 PTZ Camera',
  '2MP PTZ, 32x Zoom, WiseStream II, 150m IR',
  189900,
  ARRAY['ptz', 'outdoor', '2mp', 'zoom', 'premium'],
  true
FROM public.manufacturers m WHERE m.slug = 'hanwha'
ON CONFLICT (sku) DO NOTHING;

-- Bosch Cameras
INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, description, uvp_cents, tags, is_active)
SELECT 
  m.id,
  'camera',
  'BOSCH-NDE-5503-AL',
  'ESO005001',
  'Bosch FLEXIDOME IP 5000i Dome',
  '5MP Outdoor Dome, Intelligent Video Analytics, IK10',
  89900,
  ARRAY['dome', 'outdoor', '5mp', 'analytics', 'premium'],
  true
FROM public.manufacturers m WHERE m.slug = 'bosch'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, description, uvp_cents, tags, is_active)
SELECT 
  m.id,
  'camera',
  'BOSCH-NBE-6502-AL',
  'ESO005002',
  'Bosch DINION IP 6000i Bullet',
  '2MP Outdoor Bullet, Starlight, Intelligent Auto',
  79900,
  ARRAY['bullet', 'outdoor', '2mp', 'starlight', 'premium'],
  true
FROM public.manufacturers m WHERE m.slug = 'bosch'
ON CONFLICT (sku) DO NOTHING;

-- ============================================
-- 3. PRODUCTS - NVRs / RECORDERS
-- ============================================

INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, description, uvp_cents, tags, is_active)
SELECT 
  m.id,
  'nvr',
  'AXIS-S3008',
  'ESO001101',
  'AXIS S3008 Recorder',
  '8 Channel NVR, 32TB Max, RAID Support',
  189900,
  ARRAY['nvr', '8ch', 'raid', 'premium'],
  true
FROM public.manufacturers m WHERE m.slug = 'axis'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, description, uvp_cents, tags, is_active)
SELECT 
  m.id,
  'nvr',
  'AXIS-S3016',
  'ESO001102',
  'AXIS S3016 Recorder',
  '16 Channel NVR, 64TB Max, RAID Support',
  329900,
  ARRAY['nvr', '16ch', 'raid', 'premium'],
  true
FROM public.manufacturers m WHERE m.slug = 'axis'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, description, uvp_cents, tags, is_active)
SELECT 
  m.id,
  'nvr',
  'HIK-DS7608NI-K2',
  'ESO002101',
  'Hikvision DS-7608NI-K2/8P NVR',
  '8 Channel NVR, 8x PoE, 2x SATA, H.265+',
  45900,
  ARRAY['nvr', '8ch', 'poe', 'eco'],
  true
FROM public.manufacturers m WHERE m.slug = 'hikvision'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, description, uvp_cents, tags, is_active)
SELECT 
  m.id,
  'nvr',
  'HIK-DS7616NI-K2',
  'ESO002102',
  'Hikvision DS-7616NI-K2/16P NVR',
  '16 Channel NVR, 16x PoE, 2x SATA, H.265+',
  69900,
  ARRAY['nvr', '16ch', 'poe', 'eco'],
  true
FROM public.manufacturers m WHERE m.slug = 'hikvision'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, description, uvp_cents, tags, is_active)
SELECT 
  m.id,
  'nvr',
  'DAH-NVR5208-8P-4KS2E',
  'ESO003101',
  'Dahua NVR5208-8P-4KS2E NVR',
  '8 Channel NVR, 8x PoE, 2x SATA, H.265+',
  42900,
  ARRAY['nvr', '8ch', 'poe', 'eco'],
  true
FROM public.manufacturers m WHERE m.slug = 'dahua'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, description, uvp_cents, tags, is_active)
SELECT 
  m.id,
  'nvr',
  'HAN-XRN-1610A',
  'ESO004101',
  'Hanwha XRN-1610A NVR',
  '16 Channel NVR, WiseStream II, 4x SATA, RAID',
  89900,
  ARRAY['nvr', '16ch', 'raid', 'premium'],
  true
FROM public.manufacturers m WHERE m.slug = 'hanwha'
ON CONFLICT (sku) DO NOTHING;

-- ============================================
-- 4. PRODUCTS - POE SWITCHES
-- ============================================

INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, description, uvp_cents, tags, is_active)
SELECT 
  m.id,
  'switch',
  'AXIS-T8504-E',
  'ESO001201',
  'AXIS T8504-E PoE Switch',
  '4 Port PoE+ Switch, 60W, Outdoor',
  34900,
  ARRAY['switch', '4port', 'poe+', 'outdoor'],
  true
FROM public.manufacturers m WHERE m.slug = 'axis'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, description, uvp_cents, tags, is_active)
SELECT 
  m.id,
  'switch',
  'AXIS-T8508-E',
  'ESO001202',
  'AXIS T8508-E PoE Switch',
  '8 Port PoE+ Switch, 120W, Outdoor',
  54900,
  ARRAY['switch', '8port', 'poe+', 'outdoor'],
  true
FROM public.manufacturers m WHERE m.slug = 'axis'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, description, uvp_cents, tags, is_active)
SELECT 
  m.id,
  'switch',
  'HIK-DS3E0310P-E',
  'ESO002201',
  'Hikvision DS-3E0310P-E PoE Switch',
  '8 Port PoE+ + 2 Uplink, 130W, Extended Range',
  28900,
  ARRAY['switch', '8port', 'poe+', 'extend'],
  true
FROM public.manufacturers m WHERE m.slug = 'hikvision'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, description, uvp_cents, tags, is_active)
SELECT 
  m.id,
  'switch',
  'DAH-PFS3010-8ET',
  'ESO003201',
  'Dahua PFS3010-8ET-96 PoE Switch',
  '8 Port PoE+ + 2 Uplink, 96W',
  24900,
  ARRAY['switch', '8port', 'poe+'],
  true
FROM public.manufacturers m WHERE m.slug = 'dahua'
ON CONFLICT (sku) DO NOTHING;

-- ============================================
-- 5. PRODUCTS - ACCESSORIES
-- ============================================

INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, description, uvp_cents, tags, is_active)
SELECT 
  m.id,
  'accessory',
  'AXIS-T94F01L',
  'ESO001301',
  'AXIS T94F01L Montagehalterung',
  'Wandhalterung für Dome Kameras, Weiß',
  5900,
  ARRAY['mount', 'wall', 'dome'],
  true
FROM public.manufacturers m WHERE m.slug = 'axis'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, description, uvp_cents, tags, is_active)
SELECT 
  m.id,
  'accessory',
  'AXIS-T91B61',
  'ESO001302',
  'AXIS T91B61 Masthalterung',
  'Masthalterung für PTZ Kameras',
  19900,
  ARRAY['mount', 'pole', 'ptz'],
  true
FROM public.manufacturers m WHERE m.slug = 'axis'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, description, uvp_cents, tags, is_active)
SELECT 
  m.id,
  'accessory',
  'AXIS-TU8001',
  'ESO001303',
  'AXIS TU8001 Medienkonverter',
  'Fiber to Ethernet Medienkonverter, SFP',
  24900,
  ARRAY['converter', 'fiber', 'sfp'],
  true
FROM public.manufacturers m WHERE m.slug = 'axis'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, description, uvp_cents, tags, is_active)
SELECT 
  m.id,
  'accessory',
  'HIK-DS1280ZJ',
  'ESO002301',
  'Hikvision DS-1280ZJ-DM21 Eckmontage',
  'Eckmontage für Dome Kameras',
  2900,
  ARRAY['mount', 'corner', 'dome'],
  true
FROM public.manufacturers m WHERE m.slug = 'hikvision'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, description, uvp_cents, tags, is_active)
SELECT 
  m.id,
  'accessory',
  'HIK-DS1331HZ',
  'ESO002302',
  'Hikvision DS-1331HZ Schutzgehäuse',
  'Outdoor Schutzgehäuse mit Heizung und Lüfter',
  15900,
  ARRAY['housing', 'outdoor', 'heating'],
  true
FROM public.manufacturers m WHERE m.slug = 'hikvision'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, description, uvp_cents, tags, is_active)
SELECT 
  m.id,
  'accessory',
  'DAH-PFA121',
  'ESO003301',
  'Dahua PFA121 Wandhalterung',
  'Wandhalterung für Bullet Kameras',
  1900,
  ARRAY['mount', 'wall', 'bullet'],
  true
FROM public.manufacturers m WHERE m.slug = 'dahua'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, description, uvp_cents, tags, is_active)
SELECT 
  m.id,
  'accessory',
  'DAH-PFM321D',
  'ESO003302',
  'Dahua PFM321D Adapter',
  '12V DC Adapter für Kameras',
  1200,
  ARRAY['power', 'adapter', '12v'],
  true
FROM public.manufacturers m WHERE m.slug = 'dahua'
ON CONFLICT (sku) DO NOTHING;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
-- If you see this, the seed data was inserted successfully!
-- Check your manufacturers and products tables in the admin interface.
