-- Supabase SQL Schema for Video System Configurator
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES & AUTH
-- ============================================

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Admin users table
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- SALES DATA (User-owned)
-- ============================================

-- Projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  tier TEXT CHECK (tier IN ('eco', 'premium', 'high-risk')) NOT NULL,
  manufacturer TEXT CHECK (manufacturer IN ('AXIS', 'Hanwha', 'AJAX', 'Keenfinity')) NOT NULL,
  hanwha_series TEXT CHECK (hanwha_series IN ('A-Series', 'Q/X-Series')),
  ajax_series TEXT CHECK (ajax_series IN ('Baseline', 'Superior')),
  video_management TEXT CHECK (video_management IN ('nvr', 'vms')) NOT NULL,
  storage_days INT NOT NULL DEFAULT 3,
  storage_hdd_size INT,
  storage_hdd_quantity INT,
  ups_required BOOLEAN DEFAULT FALSE,
  remote_capable BOOLEAN DEFAULT FALSE,
  vms_multi_monitor BOOLEAN,
  network_cabinet_9he BOOLEAN,
  lift_platform BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Sites table
CREATE TABLE IF NOT EXISTS public.sites (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  cabling TEXT CHECK (cabling IN ('copper', 'fiber', 'wlan-bridge')) NOT NULL,
  is_standalone BOOLEAN DEFAULT FALSE,
  outdoor BOOLEAN DEFAULT FALSE,
  cameras JSONB NOT NULL DEFAULT '{}',
  ip_doc_enabled BOOLEAN,
  ip_start TEXT,
  ip_gateway TEXT,
  ip_cidr TEXT,
  ip_video_device_prefix TEXT,
  ip_network_device_prefix TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Quotes table (snapshots of BOM)
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  snapshot_data JSONB NOT NULL,
  total_amount_cents BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- CATALOG DATA (Admin-managed)
-- ============================================

-- Manufacturers table
CREATE TABLE IF NOT EXISTS public.manufacturers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  manufacturer_id UUID REFERENCES public.manufacturers(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  eso_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  uvp_cents BIGINT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tier defaults table (maps tier + manufacturer + category to product)
CREATE TABLE IF NOT EXISTS public.tier_defaults (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tier TEXT CHECK (tier IN ('eco', 'premium', 'high-risk')) NOT NULL,
  manufacturer_slug TEXT NOT NULL,
  category TEXT NOT NULL,
  product_sku TEXT NOT NULL,
  priority INT DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(tier, manufacturer_slug, category, priority)
);

-- Rules table (business logic rules)
CREATE TABLE IF NOT EXISTS public.rules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  rule_json JSONB NOT NULL,
  scope TEXT, -- e.g. "tier:eco" or "manufacturer:Hanwha"
  priority INT DEFAULT 100,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_projects_owner ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_sites_project ON public.sites(project_id);
CREATE INDEX IF NOT EXISTS idx_quotes_project ON public.quotes(project_id);
CREATE INDEX IF NOT EXISTS idx_products_manufacturer ON public.products(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_tier_defaults_lookup ON public.tier_defaults(tier, manufacturer_slug, category);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tier_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rules ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Users can read all profiles, update their own
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admin users: Only admins can view
CREATE POLICY "Admins can view admin_users"
  ON public.admin_users FOR SELECT
  USING (is_admin());

-- Projects: Users can CRUD their own projects
CREATE POLICY "Users can view own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = owner_id OR is_admin());

CREATE POLICY "Users can create own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = owner_id);

-- Sites: Users can CRUD sites of their own projects
CREATE POLICY "Users can view own project sites"
  ON public.sites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = sites.project_id
      AND (projects.owner_id = auth.uid() OR is_admin())
    )
  );

CREATE POLICY "Users can create sites in own projects"
  ON public.sites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update sites in own projects"
  ON public.sites FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = sites.project_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete sites in own projects"
  ON public.sites FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = sites.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Quotes: Users can view/create quotes for their own projects
CREATE POLICY "Users can view own project quotes"
  ON public.quotes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = quotes.project_id
      AND (projects.owner_id = auth.uid() OR is_admin())
    )
  );

CREATE POLICY "Users can create quotes for own projects"
  ON public.quotes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Catalog tables: Everyone can read, only admins can modify
CREATE POLICY "Everyone can view active manufacturers"
  ON public.manufacturers FOR SELECT
  USING (is_active = true OR is_admin());

CREATE POLICY "Admins can manage manufacturers"
  ON public.manufacturers FOR ALL
  USING (is_admin());

CREATE POLICY "Everyone can view active products"
  ON public.products FOR SELECT
  USING (is_active = true OR is_admin());

CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL
  USING (is_admin());

CREATE POLICY "Everyone can view tier defaults"
  ON public.tier_defaults FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage tier defaults"
  ON public.tier_defaults FOR ALL
  USING (is_admin());

CREATE POLICY "Everyone can view active rules"
  ON public.rules FOR SELECT
  USING (is_active = true OR is_admin());

CREATE POLICY "Admins can manage rules"
  ON public.rules FOR ALL
  USING (is_admin());

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_sites_updated_at
  BEFORE UPDATE ON public.sites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_manufacturers_updated_at
  BEFORE UPDATE ON public.manufacturers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_tier_defaults_updated_at
  BEFORE UPDATE ON public.tier_defaults
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_rules_updated_at
  BEFORE UPDATE ON public.rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- SEED DATA
-- ============================================

-- Insert default manufacturers
INSERT INTO public.manufacturers (name, slug, is_active) VALUES
  ('AXIS', 'axis', true),
  ('Hanwha', 'hanwha', true),
  ('AJAX', 'ajax', true),
  ('Keenfinity', 'keenfinity', true)
ON CONFLICT (slug) DO NOTHING;

COMMENT ON TABLE public.profiles IS 'User profiles extending auth.users';
COMMENT ON TABLE public.admin_users IS 'Admin privileges';
COMMENT ON TABLE public.projects IS 'Sales projects with configuration';
COMMENT ON TABLE public.sites IS 'Sites belonging to projects';
COMMENT ON TABLE public.quotes IS 'BOM snapshots';
COMMENT ON TABLE public.manufacturers IS 'Camera manufacturers';
COMMENT ON TABLE public.products IS 'Product catalog';
COMMENT ON TABLE public.tier_defaults IS 'Default products per tier/manufacturer/category';
COMMENT ON TABLE public.rules IS 'Business logic rules (JSON)';
