-- Migration: BHE-Zeitenkonfigurator
-- Datum: 2026-07-06
-- Zweck: Alle bisher in calculateBOM() hartcodierten Zeitkonstanten des
-- BHE-Zeitmodells (docs/BHE_TIME_MODEL_VIDEO.md) als admin-pflegbare Settings
-- abbilden - inkl. Referenzwert der offiziellen BHE-Vorgabe, damit man jederzeit
-- erkennen kann, ob/wie stark man davon abweicht, und per Klick zurücksetzen kann.

-- 1. Spalten für Gruppierung (Preis vs. BHE-Zeit) und offiziellen BHE-Referenzwert
ALTER TABLE public.configurator_settings
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'pricing',
  ADD COLUMN IF NOT EXISTS bhe_default_value NUMERIC;

COMMENT ON COLUMN public.configurator_settings.category IS
  'Gruppierung für die Admin-UI: "pricing" (Preise/Pauschalen) oder "bhe_time" (Montagezeiten-Modell).';
COMMENT ON COLUMN public.configurator_settings.bhe_default_value IS
  'Offizieller Referenzwert aus der BHE-Zeitwerttabelle (docs/BHE_TIME_MODEL_VIDEO.md). '
  'Dient nur als Vergleichswert für "Zurücksetzen auf BHE-Vorgabe" in der Admin-UI, '
  'NULL bei reinen Preis-Settings ohne BHE-Referenz.';

-- 2. Bestehendes Hubsteiger-Setting der BHE-Zeit-Gruppe zuordnen
UPDATE public.configurator_settings
SET category = 'bhe_time', bhe_default_value = 15
WHERE key = 'lift_platform_minutes_per_camera';

-- 3. Neue BHE-Zeit-Settings für alle bisher hartcodierten Formel-Konstanten
-- in calculateBOM() (pages/configurator.tsx). value = bhe_default_value beim
-- ersten Anlegen, damit sich am BOM-Ergebnis zunächst nichts ändert.
INSERT INTO public.configurator_settings (key, label, value, unit, description, category, bhe_default_value) VALUES
  ('bhe_camera_base_minutes', 'Kamera-Grundmontage', 135, 'Min/Kamera',
    'IP-Kamera montieren/einstellen/programmieren (75) + Grundeinrichtung (10) + Bildausschnitt (20) + IP-Security/DSGVO (30)',
    'bhe_time', 135),
  ('bhe_camera_mount_ceiling_minutes', 'Montagezuschlag Deckenmontage', 30, 'Min/Kamera',
    'Zusatzzeit für Dome-/PTZ-/Thermal-Kameras bei Deckenmontage',
    'bhe_time', 30),
  ('bhe_camera_mount_wall_pole_minutes', 'Montagezuschlag Wand-/Mastmontage', 20, 'Min/Kamera',
    'Zusatzzeit für Kameras bei Wand- oder Mastmontage',
    'bhe_time', 20),
  ('bhe_speaker_install_minutes', 'IP-Lautsprecher Montage', 60, 'Min/Stück',
    'Montage- und Einrichtungszeit je IP-Lautsprecher',
    'bhe_time', 60),
  ('bhe_switch_time_4port_minutes', 'Switch-Montage (bis 4 Kameras)', 15, 'Min',
    'Switch 4-Port montieren/konfigurieren',
    'bhe_time', 15),
  ('bhe_switch_time_8port_minutes', 'Switch-Montage (bis 8 Kameras)', 20, 'Min',
    'Switch 8-Port montieren/konfigurieren',
    'bhe_time', 20),
  ('bhe_switch_time_16port_minutes', 'Switch-Montage (bis 16 Kameras)', 25, 'Min',
    'Switch 16-Port montieren/konfigurieren',
    'bhe_time', 25),
  ('bhe_switch_time_24port_minutes', 'Switch-Montage (über 16 Kameras)', 30, 'Min',
    'Switch 24-Port montieren/konfigurieren',
    'bhe_time', 30),
  ('bhe_nvr_minutes_per_channel', 'NVR-Programmierung je Kanal', 40, 'Min/Kanal',
    'Digitalrecorder einstellen (15) + kundenspez. Programmierung (15) + Aufschaltung je Kanal (10)',
    'bhe_time', 40),
  ('bhe_vms_server_setup_minutes', 'VMS Grundeinrichtung Server', 240, 'Min',
    'Grundeinrichtung IP-Server (einmalig je System)',
    'bhe_time', 240),
  ('bhe_vms_workstation_setup_minutes', 'VMS Workstation einrichten', 90, 'Min',
    'Workstation Videomanagement einrichten (einmalig je System)',
    'bhe_time', 90),
  ('bhe_vms_remote_setup_minutes', 'VMS Remoteservice einrichten', 30, 'Min',
    'Einrichtung Remoteservice je System (nur bei Fernzugriff)',
    'bhe_time', 30),
  ('bhe_monitor_main_minutes', 'Monitor aufstellen (Haupt)', 10, 'Min',
    'Desktop-Monitor aufstellen und einstellen',
    'bhe_time', 10),
  ('bhe_monitor_additional_minutes', 'Zusatzmonitor (Multibild)', 15, 'Min',
    'Zusätzlicher Monitor bei Multibild-Konfiguration',
    'bhe_time', 15),
  ('bhe_documentation_minutes_per_channel', 'Dokumentation je Kanal', 15, 'Min/Kanal',
    'Erstellung Anlagendokumentation',
    'bhe_time', 15)
ON CONFLICT (key) DO NOTHING;
