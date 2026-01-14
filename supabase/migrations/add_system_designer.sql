-- ============================================
-- SYSTEM DESIGNER - MIGRATION
-- ============================================
-- Tabellen für den System Designer (Floor Plan Planner)
-- - system_designs: Grundrisse mit Bild und Maßstab
-- - camera_placements: Platzierte Kameras auf Grundrissen
-- ============================================

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: system_designs
-- ============================================
-- Speichert Grundriss-Designs mit Metadaten
DROP TABLE IF EXISTS public.system_designs CASCADE;
CREATE TABLE public.system_designs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Grundriss-Info
  name TEXT NOT NULL,
  description TEXT,
  floor_number INT DEFAULT 0,  -- Stockwerk (0 = EG, 1 = OG, -1 = UG)
  
  -- Bild
  image_url TEXT,  -- URL zum Grundriss-Bild in Supabase Storage
  image_width INT,  -- Original-Breite in Pixeln
  image_height INT,  -- Original-Höhe in Pixeln
  
  -- Maßstab
  scale_pixels_per_meter FLOAT DEFAULT 100,  -- Wie viele Pixel = 1 Meter
  scale_reference_length_m FLOAT,  -- Referenzlänge in Metern (z.B. 10m)
  scale_reference_px FLOAT,  -- Referenzlänge in Pixeln (z.B. 250px)
  
  -- Canvas Settings
  canvas_zoom FLOAT DEFAULT 1.0,  -- Zoom-Level
  canvas_pan_x FLOAT DEFAULT 0,  -- Pan Position X
  canvas_pan_y FLOAT DEFAULT 0,  -- Pan Position Y
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_system_designs_project_id ON public.system_designs(project_id);
CREATE INDEX idx_system_designs_created_at ON public.system_designs(created_at DESC);

-- ============================================
-- TABLE: camera_placements
-- ============================================
-- Speichert platzierte Kameras auf Grundrissen
DROP TABLE IF EXISTS public.camera_placements CASCADE;
CREATE TABLE public.camera_placements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  system_design_id UUID NOT NULL REFERENCES public.system_designs(id) ON DELETE CASCADE,
  
  -- Kamera-Info
  camera_type TEXT NOT NULL,  -- 'dome_fixed', 'dome_vario', 'bullet_fixed', etc.
  camera_name TEXT,  -- Custom Name (z.B. "Eingang Haupttür")
  product_id UUID REFERENCES public.products(id),  -- Referenz zum Produkt
  
  -- Position & Rotation
  position_x FLOAT NOT NULL,  -- X-Position auf Canvas (in Pixeln)
  position_y FLOAT NOT NULL,  -- Y-Position auf Canvas (in Pixeln)
  rotation FLOAT DEFAULT 0,  -- Rotation in Grad (0-360)
  
  -- Kamera-Specs (für Detection Cone)
  focal_length_mm FLOAT DEFAULT 2.8,  -- Brennweite (2.8, 4, 6, 8, 12mm)
  field_of_view FLOAT DEFAULT 90,  -- Öffnungswinkel in Grad
  detection_range_m FLOAT DEFAULT 30,  -- Detection-Reichweite in Metern
  
  -- Detection Cone Settings
  show_detection_cone BOOLEAN DEFAULT true,
  cone_color TEXT DEFAULT '#3b82f6',  -- Blau
  cone_opacity FLOAT DEFAULT 0.3,
  
  -- Metadata
  notes TEXT,  -- Notizen (z.B. "Überwacht Parkplatz")
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_camera_placements_design_id ON public.camera_placements(system_design_id);
CREATE INDEX idx_camera_placements_product_id ON public.camera_placements(product_id);

-- ============================================
-- RLS POLICIES - system_designs
-- ============================================
ALTER TABLE public.system_designs ENABLE ROW LEVEL SECURITY;

-- Policy: Jeder authenticated User kann lesen
CREATE POLICY "system_designs_select_policy" 
  ON public.system_designs 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Policy: Jeder authenticated User kann einfügen
CREATE POLICY "system_designs_insert_policy" 
  ON public.system_designs 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Policy: Jeder authenticated User kann updaten
CREATE POLICY "system_designs_update_policy" 
  ON public.system_designs 
  FOR UPDATE 
  TO authenticated 
  USING (true);

-- Policy: Jeder authenticated User kann löschen
CREATE POLICY "system_designs_delete_policy" 
  ON public.system_designs 
  FOR DELETE 
  TO authenticated 
  USING (true);

-- ============================================
-- RLS POLICIES - camera_placements
-- ============================================
ALTER TABLE public.camera_placements ENABLE ROW LEVEL SECURITY;

-- Policy: Jeder authenticated User kann lesen
CREATE POLICY "camera_placements_select_policy" 
  ON public.camera_placements 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Policy: Jeder authenticated User kann einfügen
CREATE POLICY "camera_placements_insert_policy" 
  ON public.camera_placements 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Policy: Jeder authenticated User kann updaten
CREATE POLICY "camera_placements_update_policy" 
  ON public.camera_placements 
  FOR UPDATE 
  TO authenticated 
  USING (true);

-- Policy: Jeder authenticated User kann löschen
CREATE POLICY "camera_placements_delete_policy" 
  ON public.camera_placements 
  FOR DELETE 
  TO authenticated 
  USING (true);

-- ============================================
-- TRIGGERS - updated_at
-- ============================================
-- Trigger für system_designs
CREATE OR REPLACE FUNCTION update_system_designs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER system_designs_updated_at_trigger
  BEFORE UPDATE ON public.system_designs
  FOR EACH ROW
  EXECUTE FUNCTION update_system_designs_updated_at();

-- Trigger für camera_placements
CREATE OR REPLACE FUNCTION update_camera_placements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER camera_placements_updated_at_trigger
  BEFORE UPDATE ON public.camera_placements
  FOR EACH ROW
  EXECUTE FUNCTION update_camera_placements_updated_at();

-- ============================================
-- STORAGE BUCKET
-- ============================================
-- Bucket für Grundriss-Bilder (falls nicht existiert)
INSERT INTO storage.buckets (id, name, public)
VALUES ('floor-plans', 'floor-plans', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policy: Authenticated users können Bilder hochladen
CREATE POLICY "floor_plans_upload_policy"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'floor-plans');

-- Storage Policy: Authenticated users können Bilder lesen
CREATE POLICY "floor_plans_select_policy"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'floor-plans');

-- Storage Policy: Authenticated users können Bilder löschen
CREATE POLICY "floor_plans_delete_policy"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'floor-plans');

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ System Designer Migration completed successfully!';
  RAISE NOTICE '📦 Created tables: system_designs, camera_placements';
  RAISE NOTICE '🗄️ Created storage bucket: floor-plans';
  RAISE NOTICE '🔐 RLS policies enabled for all tables';
END $$;
