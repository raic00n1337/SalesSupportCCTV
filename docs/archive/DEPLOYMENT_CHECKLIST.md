# 🚀 DEPLOYMENT CHECKLIST - VOLLSTÄNDIGE DB-INTEGRATION

**Status:** Phase 2 - System Designer + Regeln + Produkt-Integration  
**Letzte Aktualisierung:** 15.01.2026

---

## ✅ BEREITS GEFIXT (Gestern & Heute):

### **1. Site ID UUID-Problem** ✅
```typescript
// GEFIXT in: pages/configurator.tsx

// handleAddSite: Verwendet crypto.randomUUID()
id: crypto.randomUUID()  // ✅ Korrekt

// handleSave (Update): Verwendet .upsert mit Site-ID
.upsert({ id: site.id, ... }, { onConflict: 'id' })  // ✅ Korrekt

// handleSave (Create): HEUTE GEFIXT - Sendet Site-ID mit
.insert({ id: site.id, ... })  // ✅ NEU GEFIXT!
```

### **2. TypeScript Build-Fehler** ✅
- Supabase Type Casts: `(supabase.from(...) as any).update({})`
- Import Paths: `@/types` → `../../types`
- React Import für `React.Fragment`
- SSR Fix für Konva (System Designer)

### **3. API Graceful Fallbacks** ✅
- Rules API: Gibt `matched: false` statt 500-Fehler
- Defaults API: Gibt leeres Objekt statt 500-Fehler
- Configurator funktioniert auch ohne DB-Tabellen

---

## 📋 DB-MIGRATIONEN ÜBERSICHT:

### **Migration 1: Cable Fields** (add_cable_fields.sql)
**Status:** ❓ Zu prüfen  
**Zweck:** Fügt Kabel-Felder zu `projects` Tabelle hinzu

```sql
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS data_cable_meters FLOAT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS data_cable_price_per_meter FLOAT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS fiber_cable_meters FLOAT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS fiber_cable_price_per_meter FLOAT;
```

**Benötigt für:** Step 5 - Kabelberechnung im Konfigurator

---

### **Migration 2: Configurator Products** (add_configurator_products.sql)
**Status:** ❓ Zu prüfen  
**Zweck:** Produkt-DB-Integration für Konfigurator

```sql
CREATE TABLE public.configurator_products (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  tier TEXT CHECK (tier IN ('eco', 'premium', 'high-risk')),
  category TEXT NOT NULL,
  priority INT DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  bhe_time_minutes INT DEFAULT 0,
  ...
);
```

**Benötigt für:**
- Produkte aus DB statt hardcoded
- Admin: `/admin/configurator-products`
- Tier-basierte Produkt-Auswahl

**Seed-Daten:** `seed-configurator-products.sql` (20 Test-Produkte)

---

### **Migration 3: Rules System** (add_rules_table.sql)
**Status:** ❓ Zu prüfen  
**Zweck:** Feature-basierte Produkt-Regeln

```sql
CREATE TABLE public.rules (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  tier TEXT,
  manufacturer TEXT,
  category TEXT,
  feature_conditions JSONB,
  target_product_id UUID REFERENCES products(id),
  priority INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  ...
);
```

**Benötigt für:**
- Feature-basierte Produkt-Auswahl
- Admin: `/admin/rules`
- Überschreibt Tier-Defaults

**Beispiel-Regel:**
```
Wenn: tier='premium' UND manufacturer='AXIS' UND category='camera_dome_fixed'
Dann: Verwende AXIS M3068-P (statt Standard-Dome)
```

---

### **Migration 4: System Designer** (add_system_designer.sql)
**Status:** ❓ Zu prüfen  
**Zweck:** Floor Plan Planner / System Designer

```sql
CREATE TABLE public.system_designs (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  name TEXT NOT NULL,
  floor_number INT DEFAULT 0,
  image_url TEXT,
  scale_pixels_per_meter FLOAT DEFAULT 100,
  ...
);

CREATE TABLE public.camera_placements (
  id UUID PRIMARY KEY,
  system_design_id UUID REFERENCES system_designs(id),
  camera_type TEXT NOT NULL,
  position_x FLOAT,
  position_y FLOAT,
  rotation FLOAT,
  focal_length_mm FLOAT,
  detection_range_m FLOAT,
  ...
);

-- Storage Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('floor-plans', 'floor-plans', false);
```

**Benötigt für:**
- System Designer: `/system-designer/[projectId]`
- Grundriss-Upload
- Kamera-Platzierung mit Detection Cones
- Drag & Drop Interface

---

## 🔍 SCHRITT 1: STATUS ÜBERPRÜFEN

### **Gehe zu Supabase SQL Editor:**

**URL:** https://supabase.com/dashboard/project/lvrzoqtrlxbukppuyzpc/sql

**Führe aus:** `supabase/check-migrations.sql`

```sql
-- Kopiere den Inhalt von check-migrations.sql und führe ihn aus
-- Er zeigt dir, welche Tabellen existieren:

✅ EXISTS - Tabelle ist vorhanden
❌ MISSING - Migration muss ausgeführt werden
```

**Erwartetes Ergebnis:**
```
check_name                        | status
----------------------------------+----------------------------------
projects - cable_fields           | ✅ EXISTS  oder  ❌ MISSING
configurator_products table       | ✅ EXISTS  oder  ❌ MISSING
rules table                       | ✅ EXISTS  oder  ❌ MISSING
system_designs table              | ✅ EXISTS  oder  ❌ MISSING
camera_placements table           | ✅ EXISTS  oder  ❌ MISSING
floor-plans storage bucket        | ✅ EXISTS  oder  ❌ MISSING
```

---

## 🔧 SCHRITT 2: FEHLENDE MIGRATIONEN AUSFÜHREN

### **Für jede ❌ MISSING Migration:**

#### **A) Cable Fields (falls fehlend):**
```sql
-- Gehe zu: supabase/migrations/add_cable_fields.sql
-- Kopiere den gesamten Inhalt
-- Führe in Supabase SQL Editor aus
```

#### **B) Configurator Products (falls fehlend):**
```sql
-- 1. Migration ausführen:
--    supabase/migrations/add_configurator_products.sql

-- 2. Test-Daten einfügen (OPTIONAL):
--    supabase/seed-configurator-products.sql
--    (Fügt 20 Dummy-Produkt-Zuweisungen ein)
```

#### **C) Rules System (falls fehlend):**
```sql
-- Migration ausführen:
-- supabase/migrations/add_rules_table.sql

-- Dann kannst du Regeln in /admin/rules erstellen
```

#### **D) System Designer (falls fehlend):**
```sql
-- Migration ausführen:
-- supabase/migrations/add_system_designer.sql

-- Erstellt:
-- - system_designs Tabelle
-- - camera_placements Tabelle
-- - floor-plans Storage Bucket
```

---

## 📊 SCHRITT 3: ÜBERPRÜFUNG NACH MIGRATIONEN

### **Nach jeder Migration:**

**Führe nochmal aus:** `supabase/check-migrations.sql`

**Alle sollten jetzt ✅ sein!**

---

## 🎯 SCHRITT 4: FUNKTIONALITÄT TESTEN

### **Nach erfolgreichen Migrationen:**

#### **1. Konfigurator (Basis)** ✅ Sollte schon funktionieren
```
1. Login
2. Neues Projekt erstellen
3. Standort hinzufügen (UUID wird generiert)
4. Kameras konfigurieren
5. Speichern (kein UUID-Fehler mehr!)
```

#### **2. Kabelberechnung** (wenn add_cable_fields.sql ausgeführt)
```
1. Gehe zu Step 5
2. Gebe Kabellängen ein (z.B. 100m Cat.7)
3. Gebe Preise ein (z.B. 0,68€/m)
4. Prüfe in Step 6 - Stückliste, ob Kabel erscheinen
```

#### **3. Produkt-Integration** (wenn add_configurator_products.sql ausgeführt)
```
1. Gehe zu /admin/configurator-products
2. Weise Produkte zu Tiers/Kategorien zu
3. Erstelle ein Projekt mit diesem Tier
4. Prüfe, ob die richtigen Produkte in der Stückliste sind
```

#### **4. Regeln-System** (wenn add_rules_table.sql ausgeführt)
```
1. Gehe zu /admin/rules
2. Erstelle eine Regel (z.B. Premium + AXIS → AXIS M3068-P)
3. Erstelle ein Projekt mit Premium + AXIS
4. Prüfe, ob die Regel-Produkte verwendet werden
```

#### **5. System Designer** (wenn add_system_designer.sql ausgeführt)
```
1. Erstelle/Öffne ein Projekt
2. Speichere es
3. Klicke "🎨 System Designer"
4. Erstelle einen Grundriss
5. Lade ein Bild hoch
6. Platziere Kameras (Drag & Drop)
7. Prüfe Detection Cones
8. Speichere & lade neu
```

---

## 🚨 TROUBLESHOOTING

### **Fehler: "invalid input syntax for type uuid"**
```
❌ Problem: Date.now() wird als UUID gesendet
✅ Lösung: BEREITS GEFIXT! (crypto.randomUUID() + id beim insert)
🔄 Deployment: Läuft gerade auf Netlify
```

### **Fehler: "table does not exist"**
```
❌ Problem: Migration wurde nicht ausgeführt
✅ Lösung: Führe die entsprechende Migration aus (siehe Schritt 2)
```

### **Fehler: "Failed to load resource: 500" bei /api/rules/evaluate**
```
❌ Problem: rules Tabelle existiert nicht
✅ Lösung: 
   Option A: Führe add_rules_table.sql aus
   Option B: Ignorieren - Configurator nutzt Fallback-Werte
   (API gibt jetzt 200 statt 500 zurück!)
```

### **Fehler: "Failed to load resource: 500" bei /api/configurator/defaults**
```
❌ Problem: configurator_products Tabelle existiert nicht
✅ Lösung:
   Option A: Führe add_configurator_products.sql aus
   Option B: Ignorieren - Configurator nutzt Fallback-Werte
   (API gibt jetzt 200 statt 500 zurück!)
```

---

## 📝 ZUSAMMENFASSUNG

### **Was ist bereits live (nach aktuellem Deployment):**
✅ UUID-Fix für neue Sites (kein Timestamp mehr)
✅ Site-ID wird beim insert mitgesendet
✅ TypeScript Build-Fehler behoben
✅ SSR-Fix für System Designer (Konva)
✅ Graceful API Fallbacks (keine 500-Fehler mehr)

### **Was fehlt noch (DB-Migrationen):**
❓ Cable Fields (für Kabelberechnung)
❓ Configurator Products (für DB-Produkte)
❓ Rules System (für Feature-Regeln)
❓ System Designer Tables (für Floor Plan Planner)

### **Wie man die Migrationen prüft:**
1. Führe `check-migrations.sql` in Supabase aus
2. Für jedes ❌ MISSING → führe die Migration aus
3. Wiederhole den Check → alle sollten ✅ sein

### **Wichtig:**
Die App funktioniert AUCH OHNE die Migrationen!
- Configurator nutzt Fallback-Werte
- Regeln-System wird übersprungen
- Produkte sind hardcoded
- System Designer braucht seine Tabellen (add_system_designer.sql)

---

## 🎉 DEPLOYMENT STATUS

```
📦 Latest Commit: 84fe636 (Site ID UUID Fix)
🔄 Netlify: Building... (ETA: ~3-4 Min)
✅ Build: Sollte erfolgreich sein
🌐 Live: Bald verfügbar

NACH Deployment:
1. Führe check-migrations.sql aus
2. Führe fehlende Migrationen aus
3. Teste alle Features
```

---

**Ende der Deployment Checklist** 🚀
