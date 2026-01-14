-- ============================================
-- SYSTEM DESIGNER - CAMERA SPECIFICATIONS
-- ============================================
-- Erweitert configurator_products mit optischen Specs für realistische FOV/DORI
-- Referenz: CCTV Design Tool Feature-Set
-- ============================================

-- Optische & Performance-Specs für Kameras
ALTER TABLE public.configurator_products ADD COLUMN IF NOT EXISTS
  -- Brennweite (Focal Length)
  focal_length_min FLOAT,                    -- Brennweite min in mm (z.B. 2.8)
  focal_length_max FLOAT,                    -- Brennweite max in mm (z.B. 12) für Varifocal
  
  -- Sensor
  sensor_size TEXT DEFAULT '1/2.8"',         -- Standard CCTV Sensor-Größen
  sensor_width_mm FLOAT,                     -- Sensor-Breite in mm (berechnet aus size)
  sensor_height_mm FLOAT,                    -- Sensor-Höhe in mm
  
  -- Auflösung (für DORI-Berechnung)
  horizontal_resolution INT DEFAULT 1920,    -- Horizontal Resolution (z.B. 1920)
  vertical_resolution INT DEFAULT 1080,      -- Vertical Resolution (z.B. 1080)
  
  -- Infrarot / Nacht
  ir_range_m FLOAT,                          -- IR-Reichweite in Metern
  has_ir BOOLEAN DEFAULT false,              -- Hat IR-LEDs
  
  -- DORI Distances (Optional: Manuell eingeben oder automatisch berechnen)
  dori_detect_m FLOAT,                       -- Detection-Reichweite
  dori_observe_m FLOAT,                      -- Observation-Reichweite
  dori_recognize_m FLOAT,                    -- Recognition-Reichweite
  dori_identify_m FLOAT,                     -- Identification-Reichweite
  
  -- Montage-Defaults
  default_mount_height_m FLOAT DEFAULT 3.0,  -- Standard-Montagehöhe in Metern
  default_tilt_angle FLOAT DEFAULT 15.0;     -- Standard-Neigung in Grad

-- Kommentar für Dokumentation
COMMENT ON COLUMN public.configurator_products.focal_length_min IS 
  'Minimale Brennweite in mm. Für Fixed-Kameras = focal_length_max';
COMMENT ON COLUMN public.configurator_products.sensor_size IS 
  'Standard CCTV Sensor-Größen: 1/3", 1/2.8", 1/1.8", etc.';
COMMENT ON COLUMN public.configurator_products.dori_detect_m IS 
  'DORI = Detect, Observe, Recognize, Identify. Basiert auf EN 62676-4 Standard.';

-- Index für häufige Queries
CREATE INDEX IF NOT EXISTS idx_configurator_products_focal_length 
  ON public.configurator_products(focal_length_min, focal_length_max);

-- ============================================
-- SENSOR-GRÖßEN LOOKUP TABLE (Optional)
-- ============================================
-- Falls wir Sensor-Größen standardisieren wollen
CREATE TABLE IF NOT EXISTS public.camera_sensor_sizes (
  size TEXT PRIMARY KEY,              -- z.B. '1/2.8"'
  width_mm FLOAT NOT NULL,            -- Breite in mm
  height_mm FLOAT NOT NULL,           -- Höhe in mm
  diagonal_mm FLOAT,                  -- Diagonale
  description TEXT,                   -- Beschreibung
  common_use TEXT                     -- Typische Verwendung
);

-- Standard-Sensor-Größen einfügen
INSERT INTO public.camera_sensor_sizes (size, width_mm, height_mm, diagonal_mm, description, common_use) VALUES
  ('1/3"', 3.6, 2.7, 4.5, '1/3 inch sensor', 'Budget cameras'),
  ('1/2.8"', 4.8, 3.6, 6.0, '1/2.8 inch sensor', 'Most common CCTV'),
  ('1/2.5"', 5.1, 3.8, 6.4, '1/2.5 inch sensor', 'Mid-range cameras'),
  ('1/2"', 6.4, 4.8, 8.0, '1/2 inch sensor', 'High-quality'),
  ('1/1.8"', 7.2, 5.4, 9.0, '1/1.8 inch sensor', 'Low-light specialist'),
  ('2/3"', 8.8, 6.6, 11.0, '2/3 inch sensor', 'Professional')
ON CONFLICT (size) DO NOTHING;

-- RLS Policy für sensor_sizes
ALTER TABLE public.camera_sensor_sizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "camera_sensor_sizes_select_policy" 
  ON public.camera_sensor_sizes 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- ============================================
-- EXAMPLE DATA UPDATE
-- ============================================
-- Beispiel: Update für ein paar Produkte mit realistischen Werten
-- (Optional - nur zur Demonstration)

-- Hikvision DS-2CD2347G2-LU (4MP ColorVu Dome, 2.8mm)
-- UPDATE public.configurator_products SET
--   focal_length_min = 2.8,
--   focal_length_max = 2.8,
--   sensor_size = '1/2.8"',
--   horizontal_resolution = 2560,
--   vertical_resolution = 1440,
--   ir_range_m = 30,
--   has_ir = true,
--   default_mount_height_m = 3.0,
--   default_tilt_angle = 15.0
-- WHERE sku = 'DS-2CD2347G2-LU' OR name LIKE '%DS-2CD2347G2-LU%';

-- ============================================
-- HELPER FUNCTION (Optional)
-- ============================================
-- Automatische Berechnung von DORI-Werten basierend auf Specs
CREATE OR REPLACE FUNCTION calculate_dori_distances(
  p_horizontal_resolution INT,
  p_focal_length FLOAT,
  p_sensor_width FLOAT
) RETURNS TABLE (
  detect_m FLOAT,
  observe_m FLOAT,
  recognize_m FLOAT,
  identify_m FLOAT
) AS $$
DECLARE
  -- IPVM Standard PPM (Pixels Per Meter) für DORI
  ppm_detect CONSTANT FLOAT := 25;
  ppm_observe CONSTANT FLOAT := 62;
  ppm_recognize CONSTANT FLOAT := 125;
  ppm_identify CONSTANT FLOAT := 250;
  
  -- Berechne FOV width bei 10m Distanz als Referenz
  ref_distance CONSTANT FLOAT := 10.0;
  fov_rad FLOAT;
  width_at_10m FLOAT;
  ppm_at_10m FLOAT;
BEGIN
  -- Horizontal FOV in Radians
  fov_rad := 2 * ATAN(p_sensor_width / (2 * p_focal_length));
  
  -- Breite des Sichtfelds bei 10m
  width_at_10m := 2 * ref_distance * TAN(fov_rad / 2);
  
  -- PPM bei 10m
  ppm_at_10m := p_horizontal_resolution / width_at_10m;
  
  -- DORI Distanzen (proportional zu PPM)
  RETURN QUERY SELECT
    ref_distance * (ppm_at_10m / ppm_detect),
    ref_distance * (ppm_at_10m / ppm_observe),
    ref_distance * (ppm_at_10m / ppm_recognize),
    ref_distance * (ppm_at_10m / ppm_identify);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Camera Specs Migration completed!';
  RAISE NOTICE '📦 Added columns: focal_length, sensor_size, ir_range, DORI, etc.';
  RAISE NOTICE '📐 Created sensor_sizes lookup table';
  RAISE NOTICE '🧮 Created calculate_dori_distances() helper function';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Update Admin UI to edit these fields';
  RAISE NOTICE '2. Implement lib/cameraCalculations.ts';
  RAISE NOTICE '3. Update SystemDesignerCanvas for DORI zones';
END $$;
