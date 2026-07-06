-- Migration: Konfigurator-Komponenten-Management
-- Datum: 2026-07-06
-- Zweck: Alle Konfigurator-Komponenten (Switches, Medienkonverter, Netzwerkschränke,
--         NVR/VMS-Hardware, Zubehör, Dienstleistungs-Parameter) admin-pflegbar machen,
--         statt hartcodiert in calculateBOM().

-- ============================================================================
-- 1. configurator_products: Kapazitäts-Staffelung ermöglichen
-- ============================================================================
-- Für Komponenten, deren Auswahl von einer berechneten Menge abhängt
-- (z.B. Switch nach Port-Anzahl, NVR nach Kanal-Anzahl, VMS-Server nach
-- Kamera-Anzahl), wird nicht mehr nur "der eine Default" gewählt, sondern
-- aus mehreren Kapazitäts-Stufen die kleinste ausreichende.

ALTER TABLE public.configurator_products
  ADD COLUMN IF NOT EXISTS capacity_value NUMERIC,
  ADD COLUMN IF NOT EXISTS capacity_unit TEXT;

COMMENT ON COLUMN public.configurator_products.capacity_value IS
  'Optional: Kapazität dieser Stufe (z.B. 8/16/24 für Switch-Ports, 8/16/32 für NVR-Kanäle). NULL = keine Staffelung, einfacher 1:1-Default.';
COMMENT ON COLUMN public.configurator_products.capacity_unit IS
  'Einheit der Kapazität, z.B. "ports", "channels", "cameras".';

CREATE INDEX IF NOT EXISTS idx_configurator_products_capacity
  ON public.configurator_products(category, tier, capacity_value);

-- ============================================================================
-- 2. configurator_settings: Preis-Parameter für Dienstleistungen/Formeln
-- ============================================================================
-- Reine Formel-Parameter (Stundensatz, Anfahrtspauschale, Doku-%, etc.), die
-- keine eigenständigen "Produkte" sind, sondern Multiplikatoren in der
-- BOM-Berechnung. Ebenfalls admin-pflegbar statt hartcodiert.

CREATE TABLE IF NOT EXISTS public.configurator_settings (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.configurator_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read configurator_settings"
  ON public.configurator_settings FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins can manage configurator_settings"
  ON public.configurator_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.update_configurator_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_configurator_settings_updated_at ON public.configurator_settings;
CREATE TRIGGER trigger_update_configurator_settings_updated_at
  BEFORE UPDATE ON public.configurator_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_configurator_settings_updated_at();

INSERT INTO public.configurator_settings (key, label, value, unit, description) VALUES
  ('labor_rate_eur_per_hour', 'Stundensatz Montage', 120, 'EUR/h', 'Stundensatz für Montage & Inbetriebnahme (BHE-Zeitmodell)'),
  ('travel_fee_eur_per_block', 'Anfahrtspauschale', 135, 'EUR', 'Anfahrtspauschale je angefangenem Kamera-Block'),
  ('travel_fee_cameras_per_block', 'Kameras je Anfahrts-Block', 4, 'Kameras', 'Anzahl Kameras, ab der ein weiterer Anfahrts-Block berechnet wird'),
  ('documentation_fee_percent', 'Dokumentationskosten', 5, '%', 'Prozentsatz der Zwischensumme für Anlagendokumentation'),
  ('lift_platform_minutes_per_camera', 'Hubsteiger-Montageaufschlag', 15, 'Min/Kamera', 'Zusätzliche Montagezeit je Kamera bei Einsatz eines Hubsteigers'),
  ('storage_hdd_eur_per_tb', 'Festplattenpreis', 89, 'EUR/TB', 'Preis pro TB Surveillance-Grade-Festplatte')
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE public.configurator_settings IS
  'Formel-Parameter für die Konfigurator-BOM-Berechnung (Stundensätze, Pauschalen, Prozentsätze). Admin-pflegbar unter /admin/configurator-settings.';

-- ============================================================================
-- 3. "Universal"-Hersteller für herstellerunabhängige Infrastruktur-Komponenten
-- ============================================================================

INSERT INTO public.manufacturers (name, slug, is_active)
SELECT 'Universal', 'universal', true
WHERE NOT EXISTS (SELECT 1 FROM public.manufacturers WHERE slug = 'universal');

-- ============================================================================
-- 4. Seed: Universal-Produkte für bisher hartcodierte Infrastruktur-Positionen
-- ============================================================================
-- Diese Werte entsprechen exakt den bisherigen Hardcode-Werten in
-- pages/configurator.tsx, damit sich am BOM-Ergebnis zunächst nichts ändert.
-- Admins können Preise/Produkte danach frei über /admin/configurator-products
-- anpassen oder durch echte Katalogartikel ersetzen.

DO $$
DECLARE
  universal_id UUID;
  new_product_id UUID;
  t TEXT;
BEGIN
  SELECT id INTO universal_id FROM public.manufacturers WHERE slug = 'universal';

  -- Helper-Pattern: pro Komponente Produkt anlegen (falls SKU noch nicht existiert)
  -- und für alle drei Tiers als Default in configurator_products verknüpfen.

  -- Medienkonverter Set (Fiber)
  INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, uvp_cents, is_active)
  SELECT universal_id, 'configurator_component', 'NET-CONV-001', 'NET-CONV-001', 'Medienkonverter Set', 18900, true
  WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'NET-CONV-001')
  RETURNING id INTO new_product_id;
  IF new_product_id IS NULL THEN SELECT id INTO new_product_id FROM public.products WHERE sku = 'NET-CONV-001'; END IF;
  FOREACH t IN ARRAY ARRAY['eco','premium','high-risk'] LOOP
    INSERT INTO public.configurator_products (product_id, tier, category, is_default, priority)
    VALUES (new_product_id, t, 'media_converter_fiber', true, 0)
    ON CONFLICT (product_id, tier, category) DO NOTHING;
  END LOOP;

  -- SFP-Module (Paar)
  INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, uvp_cents, is_active)
  SELECT universal_id, 'configurator_component', 'NET-SFP-001', 'NET-SFP-001', 'SFP-Module (Paar)', 7900, true
  WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'NET-SFP-001')
  RETURNING id INTO new_product_id;
  IF new_product_id IS NULL THEN SELECT id INTO new_product_id FROM public.products WHERE sku = 'NET-SFP-001'; END IF;
  FOREACH t IN ARRAY ARRAY['eco','premium','high-risk'] LOOP
    INSERT INTO public.configurator_products (product_id, tier, category, is_default, priority)
    VALUES (new_product_id, t, 'sfp_module', true, 0)
    ON CONFLICT (product_id, tier, category) DO NOTHING;
  END LOOP;

  -- WLAN-Bridge Set
  INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, uvp_cents, is_active)
  SELECT universal_id, 'configurator_component', 'NET-WLAN-001', 'NET-WLAN-001', 'WLAN-Bridge Set', 44900, true
  WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'NET-WLAN-001')
  RETURNING id INTO new_product_id;
  IF new_product_id IS NULL THEN SELECT id INTO new_product_id FROM public.products WHERE sku = 'NET-WLAN-001'; END IF;
  FOREACH t IN ARRAY ARRAY['eco','premium','high-risk'] LOOP
    INSERT INTO public.configurator_products (product_id, tier, category, is_default, priority)
    VALUES (new_product_id, t, 'wlan_bridge_kit', true, 0)
    ON CONFLICT (product_id, tier, category) DO NOTHING;
  END LOOP;

  -- Outdoor-Gehäuse für WLAN
  INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, uvp_cents, is_active)
  SELECT universal_id, 'configurator_component', 'ACC-ENCL-001', 'ACC-ENCL-001', 'Outdoor-Gehäuse für WLAN', 6900, true
  WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'ACC-ENCL-001')
  RETURNING id INTO new_product_id;
  IF new_product_id IS NULL THEN SELECT id INTO new_product_id FROM public.products WHERE sku = 'ACC-ENCL-001'; END IF;
  FOREACH t IN ARRAY ARRAY['eco','premium','high-risk'] LOOP
    INSERT INTO public.configurator_products (product_id, tier, category, is_default, priority)
    VALUES (new_product_id, t, 'wlan_outdoor_enclosure', true, 0)
    ON CONFLICT (product_id, tier, category) DO NOTHING;
  END LOOP;

  -- Junction Box (Outdoor)
  INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, uvp_cents, is_active)
  SELECT universal_id, 'configurator_component', 'ACC-JBOX-001', 'ACC-JBOX-001', 'Junction Box (Outdoor)', 2900, true
  WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'ACC-JBOX-001')
  RETURNING id INTO new_product_id;
  IF new_product_id IS NULL THEN SELECT id INTO new_product_id FROM public.products WHERE sku = 'ACC-JBOX-001'; END IF;
  FOREACH t IN ARRAY ARRAY['eco','premium','high-risk'] LOOP
    INSERT INTO public.configurator_products (product_id, tier, category, is_default, priority)
    VALUES (new_product_id, t, 'junction_box_outdoor', true, 0)
    ON CONFLICT (product_id, tier, category) DO NOTHING;
  END LOOP;

  -- Netzwerk-Switch: 3 Kapazitäts-Stufen (8/16/24 Port)
  INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, uvp_cents, is_active)
  SELECT universal_id, 'configurator_component', 'NET-SW-8P-001', 'NET-SW-8P-001', 'Netzwerk-Switch 8-Port PoE+', 29900, true
  WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'NET-SW-8P-001')
  RETURNING id INTO new_product_id;
  IF new_product_id IS NULL THEN SELECT id INTO new_product_id FROM public.products WHERE sku = 'NET-SW-8P-001'; END IF;
  FOREACH t IN ARRAY ARRAY['eco','premium','high-risk'] LOOP
    INSERT INTO public.configurator_products (product_id, tier, category, is_default, priority, capacity_value, capacity_unit)
    VALUES (new_product_id, t, 'network_switch', true, 0, 8, 'ports')
    ON CONFLICT (product_id, tier, category) DO NOTHING;
  END LOOP;

  INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, uvp_cents, is_active)
  SELECT universal_id, 'configurator_component', 'NET-SW-16P-001', 'NET-SW-16P-001', 'Netzwerk-Switch 16-Port PoE+', 59900, true
  WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'NET-SW-16P-001')
  RETURNING id INTO new_product_id;
  IF new_product_id IS NULL THEN SELECT id INTO new_product_id FROM public.products WHERE sku = 'NET-SW-16P-001'; END IF;
  FOREACH t IN ARRAY ARRAY['eco','premium','high-risk'] LOOP
    INSERT INTO public.configurator_products (product_id, tier, category, is_default, priority, capacity_value, capacity_unit)
    VALUES (new_product_id, t, 'network_switch', false, 0, 16, 'ports')
    ON CONFLICT (product_id, tier, category) DO NOTHING;
  END LOOP;

  INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, uvp_cents, is_active)
  SELECT universal_id, 'configurator_component', 'NET-SW-24P-001', 'NET-SW-24P-001', 'Netzwerk-Switch 24-Port PoE+', 89900, true
  WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'NET-SW-24P-001')
  RETURNING id INTO new_product_id;
  IF new_product_id IS NULL THEN SELECT id INTO new_product_id FROM public.products WHERE sku = 'NET-SW-24P-001'; END IF;
  FOREACH t IN ARRAY ARRAY['eco','premium','high-risk'] LOOP
    INSERT INTO public.configurator_products (product_id, tier, category, is_default, priority, capacity_value, capacity_unit)
    VALUES (new_product_id, t, 'network_switch', false, 0, 24, 'ports')
    ON CONFLICT (product_id, tier, category) DO NOTHING;
  END LOOP;

  -- Outdoor-Cabinet
  INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, uvp_cents, is_active)
  SELECT universal_id, 'configurator_component', 'INFRA-CAB-001', 'INFRA-CAB-001', 'Outdoor-Cabinet', 44900, true
  WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'INFRA-CAB-001')
  RETURNING id INTO new_product_id;
  IF new_product_id IS NULL THEN SELECT id INTO new_product_id FROM public.products WHERE sku = 'INFRA-CAB-001'; END IF;
  FOREACH t IN ARRAY ARRAY['eco','premium','high-risk'] LOOP
    INSERT INTO public.configurator_products (product_id, tier, category, is_default, priority)
    VALUES (new_product_id, t, 'outdoor_cabinet', true, 0)
    ON CONFLICT (product_id, tier, category) DO NOTHING;
  END LOOP;

  -- Stromversorgung / PoE-Injektor
  INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, uvp_cents, is_active)
  SELECT universal_id, 'configurator_component', 'INFRA-PSU-001', 'INFRA-PSU-001', 'Stromversorgung / PoE-Injektor', 18900, true
  WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'INFRA-PSU-001')
  RETURNING id INTO new_product_id;
  IF new_product_id IS NULL THEN SELECT id INTO new_product_id FROM public.products WHERE sku = 'INFRA-PSU-001'; END IF;
  FOREACH t IN ARRAY ARRAY['eco','premium','high-risk'] LOOP
    INSERT INTO public.configurator_products (product_id, tier, category, is_default, priority)
    VALUES (new_product_id, t, 'poe_injector', true, 0)
    ON CONFLICT (product_id, tier, category) DO NOTHING;
  END LOOP;

  -- VPN-Router
  INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, uvp_cents, is_active)
  SELECT universal_id, 'configurator_component', 'NET-VPN-001', 'NET-VPN-001', 'VPN-Router', 39900, true
  WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'NET-VPN-001')
  RETURNING id INTO new_product_id;
  IF new_product_id IS NULL THEN SELECT id INTO new_product_id FROM public.products WHERE sku = 'NET-VPN-001'; END IF;
  FOREACH t IN ARRAY ARRAY['eco','premium','high-risk'] LOOP
    INSERT INTO public.configurator_products (product_id, tier, category, is_default, priority)
    VALUES (new_product_id, t, 'vpn_router', true, 0)
    ON CONFLICT (product_id, tier, category) DO NOTHING;
  END LOOP;

  -- USV
  INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, uvp_cents, is_active)
  SELECT universal_id, 'configurator_component', 'INFRA-UPS-001', 'INFRA-UPS-001', 'USV (Unterbrechungsfreie Stromversorgung)', 59900, true
  WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'INFRA-UPS-001')
  RETURNING id INTO new_product_id;
  IF new_product_id IS NULL THEN SELECT id INTO new_product_id FROM public.products WHERE sku = 'INFRA-UPS-001'; END IF;
  FOREACH t IN ARRAY ARRAY['eco','premium','high-risk'] LOOP
    INSERT INTO public.configurator_products (product_id, tier, category, is_default, priority)
    VALUES (new_product_id, t, 'ups', true, 0)
    ON CONFLICT (product_id, tier, category) DO NOTHING;
  END LOOP;

  -- 9 HE Netzwerkschrank
  INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, uvp_cents, is_active)
  SELECT universal_id, 'configurator_component', 'INFRA-RACK-9HE-001', 'INFRA-RACK-9HE-001', '9 HE Netzwerkschrank (Komplettset)', 74900, true
  WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'INFRA-RACK-9HE-001')
  RETURNING id INTO new_product_id;
  IF new_product_id IS NULL THEN SELECT id INTO new_product_id FROM public.products WHERE sku = 'INFRA-RACK-9HE-001'; END IF;
  FOREACH t IN ARRAY ARRAY['eco','premium','high-risk'] LOOP
    INSERT INTO public.configurator_products (product_id, tier, category, is_default, priority)
    VALUES (new_product_id, t, 'network_cabinet_9he', true, 0)
    ON CONFLICT (product_id, tier, category) DO NOTHING;
  END LOOP;

  -- Hubsteiger
  INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, uvp_cents, is_active)
  SELECT universal_id, 'configurator_component', 'SERVICE-LIFT-001', 'SERVICE-LIFT-001', 'Hubsteiger max. 12m inkl. Anlieferung', 85000, true
  WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'SERVICE-LIFT-001')
  RETURNING id INTO new_product_id;
  IF new_product_id IS NULL THEN SELECT id INTO new_product_id FROM public.products WHERE sku = 'SERVICE-LIFT-001'; END IF;
  FOREACH t IN ARRAY ARRAY['eco','premium','high-risk'] LOOP
    INSERT INTO public.configurator_products (product_id, tier, category, is_default, priority)
    VALUES (new_product_id, t, 'lift_platform_service', true, 0)
    ON CONFLICT (product_id, tier, category) DO NOTHING;
  END LOOP;

  -- VMS Server-Lizenz
  INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, uvp_cents, is_active)
  SELECT universal_id, 'configurator_component', 'VMS-LIC-SRV-001', 'VMS-LIC-SRV-001', 'VMS Server-Lizenz', 129900, true
  WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'VMS-LIC-SRV-001')
  RETURNING id INTO new_product_id;
  IF new_product_id IS NULL THEN SELECT id INTO new_product_id FROM public.products WHERE sku = 'VMS-LIC-SRV-001'; END IF;
  FOREACH t IN ARRAY ARRAY['eco','premium','high-risk'] LOOP
    INSERT INTO public.configurator_products (product_id, tier, category, is_default, priority)
    VALUES (new_product_id, t, 'vms_license_server', true, 0)
    ON CONFLICT (product_id, tier, category) DO NOTHING;
  END LOOP;

  -- VMS Kamera-Lizenz
  INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, uvp_cents, is_active)
  SELECT universal_id, 'configurator_component', 'VMS-LIC-CAM-001', 'VMS-LIC-CAM-001', 'VMS Kamera-Lizenz', 4900, true
  WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'VMS-LIC-CAM-001')
  RETURNING id INTO new_product_id;
  IF new_product_id IS NULL THEN SELECT id INTO new_product_id FROM public.products WHERE sku = 'VMS-LIC-CAM-001'; END IF;
  FOREACH t IN ARRAY ARRAY['eco','premium','high-risk'] LOOP
    INSERT INTO public.configurator_products (product_id, tier, category, is_default, priority)
    VALUES (new_product_id, t, 'vms_license_camera', true, 0)
    ON CONFLICT (product_id, tier, category) DO NOTHING;
  END LOOP;

  -- VMS Server-Hardware: 4 Kapazitäts-Stufen (Entry/Standard/Professional/Enterprise)
  INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, uvp_cents, is_active)
  SELECT universal_id, 'configurator_component', 'VMS-SERVER-E', 'VMS-SERVER-E', 'VMS Server Entry (bis 16 Kameras)', 189900, true
  WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'VMS-SERVER-E')
  RETURNING id INTO new_product_id;
  IF new_product_id IS NULL THEN SELECT id INTO new_product_id FROM public.products WHERE sku = 'VMS-SERVER-E'; END IF;
  FOREACH t IN ARRAY ARRAY['eco','premium','high-risk'] LOOP
    INSERT INTO public.configurator_products (product_id, tier, category, is_default, priority, capacity_value, capacity_unit)
    VALUES (new_product_id, t, 'vms_server_hardware', true, 0, 16, 'cameras')
    ON CONFLICT (product_id, tier, category) DO NOTHING;
  END LOOP;

  INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, uvp_cents, is_active)
  SELECT universal_id, 'configurator_component', 'VMS-SERVER-S', 'VMS-SERVER-S', 'VMS Server Standard (bis 32 Kameras)', 289900, true
  WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'VMS-SERVER-S')
  RETURNING id INTO new_product_id;
  IF new_product_id IS NULL THEN SELECT id INTO new_product_id FROM public.products WHERE sku = 'VMS-SERVER-S'; END IF;
  FOREACH t IN ARRAY ARRAY['eco','premium','high-risk'] LOOP
    INSERT INTO public.configurator_products (product_id, tier, category, is_default, priority, capacity_value, capacity_unit)
    VALUES (new_product_id, t, 'vms_server_hardware', false, 0, 32, 'cameras')
    ON CONFLICT (product_id, tier, category) DO NOTHING;
  END LOOP;

  INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, uvp_cents, is_active)
  SELECT universal_id, 'configurator_component', 'VMS-SERVER-P', 'VMS-SERVER-P', 'VMS Server Professional (bis 64 Kameras)', 449900, true
  WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'VMS-SERVER-P')
  RETURNING id INTO new_product_id;
  IF new_product_id IS NULL THEN SELECT id INTO new_product_id FROM public.products WHERE sku = 'VMS-SERVER-P'; END IF;
  FOREACH t IN ARRAY ARRAY['eco','premium','high-risk'] LOOP
    INSERT INTO public.configurator_products (product_id, tier, category, is_default, priority, capacity_value, capacity_unit)
    VALUES (new_product_id, t, 'vms_server_hardware', false, 0, 64, 'cameras')
    ON CONFLICT (product_id, tier, category) DO NOTHING;
  END LOOP;

  INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, uvp_cents, is_active)
  SELECT universal_id, 'configurator_component', 'VMS-SERVER-ENT', 'VMS-SERVER-ENT', 'VMS Server Enterprise (64+ Kameras)', 699900, true
  WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'VMS-SERVER-ENT')
  RETURNING id INTO new_product_id;
  IF new_product_id IS NULL THEN SELECT id INTO new_product_id FROM public.products WHERE sku = 'VMS-SERVER-ENT'; END IF;
  FOREACH t IN ARRAY ARRAY['eco','premium','high-risk'] LOOP
    INSERT INTO public.configurator_products (product_id, tier, category, is_default, priority, capacity_value, capacity_unit)
    VALUES (new_product_id, t, 'vms_server_hardware', false, 0, 999999, 'cameras')
    ON CONFLICT (product_id, tier, category) DO NOTHING;
  END LOOP;

  -- VMS Client-Workstation (Standard)
  INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, uvp_cents, is_active)
  SELECT universal_id, 'configurator_component', 'VMS-WS-STD-001', 'VMS-WS-STD-001', 'VMS Client-Workstation', 129900, true
  WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'VMS-WS-STD-001')
  RETURNING id INTO new_product_id;
  IF new_product_id IS NULL THEN SELECT id INTO new_product_id FROM public.products WHERE sku = 'VMS-WS-STD-001'; END IF;
  FOREACH t IN ARRAY ARRAY['eco','premium','high-risk'] LOOP
    INSERT INTO public.configurator_products (product_id, tier, category, is_default, priority)
    VALUES (new_product_id, t, 'vms_workstation_standard', true, 0)
    ON CONFLICT (product_id, tier, category) DO NOTHING;
  END LOOP;

  -- VMS Client-Workstation (Multibild / RTX)
  INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, uvp_cents, is_active)
  SELECT universal_id, 'configurator_component', 'VMS-WS-RTX-001', 'VMS-WS-RTX-001', 'VMS Client-Workstation (RTX-Grafikkarte)', 189900, true
  WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'VMS-WS-RTX-001')
  RETURNING id INTO new_product_id;
  IF new_product_id IS NULL THEN SELECT id INTO new_product_id FROM public.products WHERE sku = 'VMS-WS-RTX-001'; END IF;
  FOREACH t IN ARRAY ARRAY['eco','premium','high-risk'] LOOP
    INSERT INTO public.configurator_products (product_id, tier, category, is_default, priority)
    VALUES (new_product_id, t, 'vms_workstation_multimonitor', true, 0)
    ON CONFLICT (product_id, tier, category) DO NOTHING;
  END LOOP;

  -- Display 27"
  INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, uvp_cents, is_active)
  SELECT universal_id, 'configurator_component', 'VMS-MON-27-001', 'VMS-MON-27-001', 'Display 27" (Full HD)', 29900, true
  WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'VMS-MON-27-001')
  RETURNING id INTO new_product_id;
  IF new_product_id IS NULL THEN SELECT id INTO new_product_id FROM public.products WHERE sku = 'VMS-MON-27-001'; END IF;
  FOREACH t IN ARRAY ARRAY['eco','premium','high-risk'] LOOP
    INSERT INTO public.configurator_products (product_id, tier, category, is_default, priority)
    VALUES (new_product_id, t, 'vms_display_27', true, 0)
    ON CONFLICT (product_id, tier, category) DO NOTHING;
  END LOOP;

  -- Maus + Tastatur Set
  INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, uvp_cents, is_active)
  SELECT universal_id, 'configurator_component', 'VMS-INPUT-001', 'VMS-INPUT-001', 'Maus + Tastatur Set', 4900, true
  WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'VMS-INPUT-001')
  RETURNING id INTO new_product_id;
  IF new_product_id IS NULL THEN SELECT id INTO new_product_id FROM public.products WHERE sku = 'VMS-INPUT-001'; END IF;
  FOREACH t IN ARRAY ARRAY['eco','premium','high-risk'] LOOP
    INSERT INTO public.configurator_products (product_id, tier, category, is_default, priority)
    VALUES (new_product_id, t, 'vms_input_set', true, 0)
    ON CONFLICT (product_id, tier, category) DO NOTHING;
  END LOOP;

  -- NVR 8-Kanal (Standard, für Premium/High-Risk)
  INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, uvp_cents, is_active)
  SELECT universal_id, 'configurator_component', 'NVR-8CH-001', 'NVR-8CH-001', 'NVR 8-Kanal', 89900, true
  WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'NVR-8CH-001')
  RETURNING id INTO new_product_id;
  IF new_product_id IS NULL THEN SELECT id INTO new_product_id FROM public.products WHERE sku = 'NVR-8CH-001'; END IF;
  FOREACH t IN ARRAY ARRAY['premium','high-risk'] LOOP
    INSERT INTO public.configurator_products (product_id, tier, category, is_default, priority, capacity_value, capacity_unit)
    VALUES (new_product_id, t, 'nvr_channels', true, 0, 8, 'channels')
    ON CONFLICT (product_id, tier, category) DO NOTHING;
  END LOOP;

  -- NVR 8-Kanal mit PoE (Eco-Variante)
  INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, uvp_cents, is_active)
  SELECT universal_id, 'configurator_component', 'NVR-8CH-POE-001', 'NVR-8CH-POE-001', 'NVR 8-Kanal mit PoE', 99900, true
  WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'NVR-8CH-POE-001')
  RETURNING id INTO new_product_id;
  IF new_product_id IS NULL THEN SELECT id INTO new_product_id FROM public.products WHERE sku = 'NVR-8CH-POE-001'; END IF;
  INSERT INTO public.configurator_products (product_id, tier, category, is_default, priority, capacity_value, capacity_unit)
  VALUES (new_product_id, 'eco', 'nvr_channels', true, 0, 8, 'channels')
  ON CONFLICT (product_id, tier, category) DO NOTHING;

  -- NVR 16-Kanal
  INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, uvp_cents, is_active)
  SELECT universal_id, 'configurator_component', 'NVR-16CH-001', 'NVR-16CH-001', 'NVR 16-Kanal', 149900, true
  WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'NVR-16CH-001')
  RETURNING id INTO new_product_id;
  IF new_product_id IS NULL THEN SELECT id INTO new_product_id FROM public.products WHERE sku = 'NVR-16CH-001'; END IF;
  FOREACH t IN ARRAY ARRAY['eco','premium','high-risk'] LOOP
    INSERT INTO public.configurator_products (product_id, tier, category, is_default, priority, capacity_value, capacity_unit)
    VALUES (new_product_id, t, 'nvr_channels', false, 0, 16, 'channels')
    ON CONFLICT (product_id, tier, category) DO NOTHING;
  END LOOP;

  -- NVR 32-Kanal
  INSERT INTO public.products (manufacturer_id, category, sku, eso_number, name, uvp_cents, is_active)
  SELECT universal_id, 'configurator_component', 'NVR-32CH-001', 'NVR-32CH-001', 'NVR 32-Kanal', 249900, true
  WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'NVR-32CH-001')
  RETURNING id INTO new_product_id;
  IF new_product_id IS NULL THEN SELECT id INTO new_product_id FROM public.products WHERE sku = 'NVR-32CH-001'; END IF;
  FOREACH t IN ARRAY ARRAY['eco','premium','high-risk'] LOOP
    INSERT INTO public.configurator_products (product_id, tier, category, is_default, priority, capacity_value, capacity_unit)
    VALUES (new_product_id, t, 'nvr_channels', false, 0, 32, 'channels')
    ON CONFLICT (product_id, tier, category) DO NOTHING;
  END LOOP;

END $$;

COMMENT ON TABLE public.configurator_products IS
  'Mapping von Produkten zu Tier + Kategorie für den Konfigurator. Deckt inzwischen ALLE BOM-Komponenten ab (Kameras, Switches, Medienkonverter, NVR/VMS, Netzwerkschränke, Zubehör, etc.), nicht mehr nur Kameras.';
