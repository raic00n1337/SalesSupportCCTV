-- Migration: Expliziter Hersteller-Geltungsbereich für Konfigurator-Komponenten
-- Datum: 2026-07-06
-- Zweck: Admin soll pro Zuordnung (Tier + Kategorie + Produkt) explizit
-- festlegen können, für welchen Hersteller sie gilt - unabhängig davon, unter
-- welcher Marke das zugrunde liegende Produkt selbst katalogisiert ist.
-- Beispiel: "VMS Server-Lizenz" für Kategorie vms_license_server, Tier premium,
-- einmal mit Geltungsbereich "AXIS" (AXIS Camera Station Lizenz) und einmal mit
-- Geltungsbereich "Hanwha" (Wisenet WAVE Lizenz) angelegt - der Konfigurator
-- wählt dann automatisch je nach Projekt-Hersteller die passende Lizenz.
--
-- NULL = gilt für ALLE Hersteller (Universal-Fallback, bisheriges Verhalten -
-- bestehende Zuordnungen sind durch NULL vollständig rückwärtskompatibel).

ALTER TABLE public.configurator_products
  ADD COLUMN IF NOT EXISTS manufacturer_slug TEXT REFERENCES public.manufacturers(slug) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_configurator_products_manufacturer_slug
  ON public.configurator_products(manufacturer_slug);

COMMENT ON COLUMN public.configurator_products.manufacturer_slug IS
  'Expliziter Hersteller-Geltungsbereich dieser Zuordnung (unabhängig von der Marke des '
  'verknüpften Produkts). NULL = gilt für alle Hersteller (Universal-Fallback). Ist für '
  'eine Kategorie/Tier ein exakter Treffer vorhanden, werden anders zugeordnete Einträge '
  'ausgeschlossen, damit z.B. bei AXIS eine andere VMS-Lizenz gewählt wird als bei Hanwha.';
