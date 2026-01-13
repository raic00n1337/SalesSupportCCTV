-- Migration: Add configurator_products table
-- Datum: 2026-01-13
-- Zweck: Konfigurator-Integration mit DB-Produkten

-- ============================================================================
-- 1. CREATE TABLE: configurator_products
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.configurator_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('eco', 'premium', 'high-risk')),
  category TEXT NOT NULL, -- 'camera_dome', 'camera_bullet', 'nvr', 'switch', 'monitor', etc.
  priority INT DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  
  -- Konfigurator-spezifische Felder:
  bhe_time_minutes INT DEFAULT 0, -- Montagezeit in Minuten
  required_accessories JSONB DEFAULT '[]'::jsonb, -- z.B. ["mount_bracket", "cable_5m"]
  
  -- Timestamps:
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints:
  UNIQUE(product_id, tier, category)
);

-- ============================================================================
-- 2. INDEXES für Performance
-- ============================================================================

-- Index für häufigste Query: tier + category
CREATE INDEX IF NOT EXISTS idx_configurator_products_tier_category 
  ON public.configurator_products(tier, category);

-- Index für Priority-Sorting
CREATE INDEX IF NOT EXISTS idx_configurator_products_priority 
  ON public.configurator_products(priority DESC);

-- Index für Default-Produkte
CREATE INDEX IF NOT EXISTS idx_configurator_products_is_default 
  ON public.configurator_products(is_default) WHERE is_default = true;

-- Index für Product-Lookups
CREATE INDEX IF NOT EXISTS idx_configurator_products_product_id 
  ON public.configurator_products(product_id);

-- ============================================================================
-- 3. RLS (Row Level Security) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE public.configurator_products ENABLE ROW LEVEL SECURITY;

-- Policy: Jeder (auch nicht eingeloggt) kann lesen
CREATE POLICY "Anyone can read configurator_products"
  ON public.configurator_products FOR SELECT
  TO authenticated, anon
  USING (true);

-- Policy: Nur Admins können schreiben
CREATE POLICY "Admins can manage configurator_products"
  ON public.configurator_products FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 4. TRIGGER für updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_configurator_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_configurator_products_updated_at
  BEFORE UPDATE ON public.configurator_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_configurator_products_updated_at();

-- ============================================================================
-- 5. MIGRATION: tier_defaults → configurator_products (optional)
-- ============================================================================

-- Kommentar: Diese Migration wird später manuell ausgeführt, wenn Daten vorhanden sind
-- INSERT INTO public.configurator_products (product_id, tier, category, is_default, priority)
-- SELECT 
--   product_id,
--   tier,
--   category,
--   true, -- is_default
--   priority
-- FROM public.tier_defaults
-- ON CONFLICT (product_id, tier, category) DO NOTHING;

-- ============================================================================
-- 6. COMMENTS für Dokumentation
-- ============================================================================

COMMENT ON TABLE public.configurator_products IS 
  'Mapping von Produkten zu Tier + Kategorie für den Konfigurator';

COMMENT ON COLUMN public.configurator_products.tier IS 
  'Tier: eco, premium, high-risk';

COMMENT ON COLUMN public.configurator_products.category IS 
  'Kategorie: camera_dome, camera_bullet, camera_ptz, nvr, switch, monitor, etc.';

COMMENT ON COLUMN public.configurator_products.priority IS 
  'Höhere Priorität = weiter oben in der Liste (DESC sort)';

COMMENT ON COLUMN public.configurator_products.is_default IS 
  'Wird automatisch vorausgewählt im Konfigurator';

COMMENT ON COLUMN public.configurator_products.bhe_time_minutes IS 
  'Montagezeit in Minuten (BHE = Betriebsstunden Einheit)';

COMMENT ON COLUMN public.configurator_products.required_accessories IS 
  'JSON Array mit benötigtem Zubehör (z.B. ["mount_bracket", "cable_5m"])';
