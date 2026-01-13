-- Migration: Add rules table for feature-based product assignment
-- Datum: 2026-01-13
-- Zweck: Regeln-System mit Priorität über Tier-Defaults

-- ============================================================================
-- 1. CREATE TABLE: rules
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Rule Metadata
  name TEXT NOT NULL, -- z.B. "Bullet Vario Objektiv für Premium Tier"
  description TEXT, -- Ausführliche Beschreibung
  is_active BOOLEAN DEFAULT true,
  priority INT DEFAULT 0, -- Höhere Priority = wird zuerst geprüft
  
  -- Conditions (ALLE müssen erfüllt sein für Match)
  tier TEXT CHECK (tier IN ('eco', 'premium', 'high-risk')), -- Optional: Nur für bestimmtes Tier
  manufacturer TEXT, -- Optional: Nur für bestimmten Hersteller
  category TEXT, -- z.B. 'camera_bullet_vario'
  
  -- Feature Conditions (JSON für flexible Matching)
  feature_conditions JSONB DEFAULT '{}'::jsonb, -- z.B. {"hasVarioLens": true, "minResolution": "4K"}
  
  -- Action: Welches Produkt soll zugewiesen werden?
  target_product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT rule_must_have_condition CHECK (
    tier IS NOT NULL OR 
    manufacturer IS NOT NULL OR 
    category IS NOT NULL OR 
    feature_conditions::text != '{}'
  )
);

-- ============================================================================
-- 2. INDEXES für Performance
-- ============================================================================

-- Index für Active Rules
CREATE INDEX IF NOT EXISTS idx_rules_active 
  ON public.rules(is_active) WHERE is_active = true;

-- Index für Priority Sorting
CREATE INDEX IF NOT EXISTS idx_rules_priority 
  ON public.rules(priority DESC);

-- Index für Tier + Category Lookup
CREATE INDEX IF NOT EXISTS idx_rules_tier_category 
  ON public.rules(tier, category) WHERE is_active = true;

-- Index für Manufacturer Lookup
CREATE INDEX IF NOT EXISTS idx_rules_manufacturer 
  ON public.rules(manufacturer) WHERE is_active = true;

-- Index für Product Lookup
CREATE INDEX IF NOT EXISTS idx_rules_target_product 
  ON public.rules(target_product_id);

-- GIN Index für JSONB Feature Conditions (für schnelle JSON Queries)
CREATE INDEX IF NOT EXISTS idx_rules_feature_conditions 
  ON public.rules USING GIN (feature_conditions);

-- ============================================================================
-- 3. RLS (Row Level Security) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE public.rules ENABLE ROW LEVEL SECURITY;

-- Policy: Jeder kann Rules lesen (für Konfigurator)
CREATE POLICY "Anyone can read active rules"
  ON public.rules FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

-- Policy: Admins können alle Rules sehen
CREATE POLICY "Admins can read all rules"
  ON public.rules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Policy: Admins können Rules verwalten
CREATE POLICY "Admins can manage rules"
  ON public.rules FOR ALL
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

CREATE OR REPLACE FUNCTION public.update_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_rules_updated_at
  BEFORE UPDATE ON public.rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_rules_updated_at();

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

-- Function: Evaluate if a rule matches given conditions
CREATE OR REPLACE FUNCTION public.evaluate_rule(
  rule_id UUID,
  check_tier TEXT,
  check_manufacturer TEXT,
  check_category TEXT,
  check_features JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN AS $$
DECLARE
  rule_record RECORD;
BEGIN
  -- Get rule
  SELECT * INTO rule_record FROM public.rules WHERE id = rule_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check tier (if specified in rule)
  IF rule_record.tier IS NOT NULL AND rule_record.tier != check_tier THEN
    RETURN false;
  END IF;
  
  -- Check manufacturer (if specified in rule)
  IF rule_record.manufacturer IS NOT NULL AND rule_record.manufacturer != check_manufacturer THEN
    RETURN false;
  END IF;
  
  -- Check category (if specified in rule)
  IF rule_record.category IS NOT NULL AND rule_record.category != check_category THEN
    RETURN false;
  END IF;
  
  -- Check feature conditions (all must match)
  -- Simple implementation: check if all keys in rule_record.feature_conditions exist in check_features
  -- For now, we'll do this in application code for flexibility
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. COMMENTS für Dokumentation
-- ============================================================================

COMMENT ON TABLE public.rules IS 
  'Feature-based product assignment rules with priority over tier-defaults';

COMMENT ON COLUMN public.rules.name IS 
  'Human-readable rule name (e.g. "Bullet Vario Objektiv für Premium")';

COMMENT ON COLUMN public.rules.priority IS 
  'Higher priority = evaluated first. Rules override tier-defaults.';

COMMENT ON COLUMN public.rules.tier IS 
  'Optional: Rule only applies to this tier (eco, premium, high-risk)';

COMMENT ON COLUMN public.rules.manufacturer IS 
  'Optional: Rule only applies to this manufacturer';

COMMENT ON COLUMN public.rules.category IS 
  'Optional: Rule only applies to this category (e.g. camera_bullet_vario)';

COMMENT ON COLUMN public.rules.feature_conditions IS 
  'JSON object with feature requirements (e.g. {"hasVarioLens": true})';

COMMENT ON COLUMN public.rules.target_product_id IS 
  'Product that should be assigned when rule matches';

-- ============================================================================
-- 7. EXAMPLE DATA (commented out)
-- ============================================================================

-- Example: "Bullet Vario Objektiv" für Premium Tier → Spezielle AXIS Kamera
-- INSERT INTO public.rules (name, description, tier, category, priority, target_product_id, feature_conditions)
-- SELECT 
--   'Premium Bullet Vario with Special Lens',
--   'Assigns high-end AXIS bullet camera for premium tier with vario lens requirement',
--   'premium',
--   'camera_bullet_vario',
--   100, -- High priority
--   (SELECT id FROM public.products WHERE sku = 'AXIS-P1468-LE' LIMIT 1),
--   '{"hasVarioLens": true, "minResolution": "4K"}'::jsonb;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

-- Rules table created successfully!
-- Use this for feature-based product assignment with priority over tier-defaults.
