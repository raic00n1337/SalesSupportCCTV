# 💡 Phase 2 - Ideen & Features

**Datum:** 11. Januar 2026  
**Status:** 🚀 In Arbeit  
**Rollback-Punkt:** `v1.0-phase2-start` (Tag erstellt: 13. Januar 2026)

---

## 🎯 **Hauptziele Phase 2 (NEUE PRIORITÄTEN):**

### **🔥 Priorität 1: Konfigurator-Integration**
✅ **Schritt 7:** DB-Produkte im Konfigurator nutzen  
- Tier-Defaults mit Live-Produkten verknüpfen
- Dynamische Produktauswahl basierend auf Tier + Kategorie
- Preise aus Datenbank laden
- **Status:** 🔜 Startet jetzt

### **🔥 Priorität 2: Regeln-System**
🔧 **Schritt 8:** Feature-basierte Produktzuordnung  
- Regeln für spezifische Features (z.B. "Bullet Vario Objektiv")
- Prioritäts-System (Rules > Tier-Defaults)
- Konflikt-Handling
- **Status:** 📋 Geplant

### **🔥 Priorität 3: CSV/Excel Compiler**
🆕 **Bonus-Feature:** Intelligenter Import/Export  
- Auto-Detection verschiedener Formate
- Fuzzy Column Mapping
- Bulk-Import mit Validierung
- **Status:** ✅ Vorbereitet (Libraries installiert)

---

## 🔧 **Feature: CSV/Excel Compiler**

### **Problem:**
Verschiedene Hersteller/Lieferanten haben **unterschiedliche CSV/Excel-Formate**:
- Unterschiedliche Spaltennamen
- Unterschiedliche Reihenfolge
- Unterschiedliche Trennzeichen (`,` vs `;`)
- Unterschiedliche Preisformate (Euro vs Cent)
- Fehlende Spalten
- Zusätzliche Spalten

### **Lösung: Intelligenter CSV/Excel Compiler**

Ein Tool, das **automatisch erkennt und konvertiert**:

```
Input (Herstellerformat)  →  [COMPILER]  →  Output (Unser Format)
```

---

## 🎨 **Konzept:**

### **1. Format-Erkennung (Auto-Detection)**
```typescript
// Automatisches Erkennen von:
- Trennzeichen (Komma, Semikolon, Tab)
- Encoding (UTF-8, Latin-1, Windows-1252)
- Spalten-Mapping (AI-basiert oder regelbasiert)
- Preisformat (1.234,56 vs 1234.56 vs 123456 Cent)
```

### **2. Spalten-Mapping**
```typescript
// Verschiedene Herstellerformate → Unser Format:

AXIS Format:
"Product Name" → name
"Part Number" → sku
"MSRP" → uvp_cents (in Euro, konvertieren!)
"Category" → category

Hikvision Format:
"Model" → name
"Model Code" → sku
"SRP EUR" → uvp_cents
"Type" → category

Dahua Format:
"Description" → name
"Model No." → sku
"List Price" → uvp_cents
"Product Type" → category
```

### **3. Intelligente Transformationen**
```typescript
// Automatische Konvertierungen:

✅ Preise:
   "459,99 €" → 45999 (Cent)
   "$499.00" → 49900 (Cent, Währung konvertieren)
   "EUR 459" → 45999

✅ Kategorien:
   "IP Camera" → "camera"
   "NVR/DVR" → "nvr"
   "Switch/PoE" → "switch"

✅ Hersteller:
   "AXIS Communications AB" → "axis"
   "Hikvision Digital Technology" → "hikvision"

✅ Boolean:
   "Yes/No" → true/false
   "Active/Inactive" → true/false
   "1/0" → true/false

✅ Arrays:
   "dome, outdoor, 4k" → ["dome", "outdoor", "4k"]
   "dome|outdoor|4k" → ["dome", "outdoor", "4k"]
```

---

## 🎯 **Feature-Übersicht:**

### **A) Upload Interface** (Admin-UI)
```
┌─────────────────────────────────────────┐
│  📤 CSV/Excel Compiler                  │
├─────────────────────────────────────────┤
│  1. Datei hochladen (CSV/Excel)         │
│  2. Format automatisch erkennen         │
│  3. Vorschau & Spalten-Mapping          │
│  4. Transformationen prüfen             │
│  5. Import oder Download                │
└─────────────────────────────────────────┘
```

### **B) Format-Profile** (Wiederverwendbar)
```typescript
// Speichere Mappings für jeden Hersteller:

const formatProfiles = {
  axis: {
    delimiter: ',',
    encoding: 'utf-8',
    columnMap: {
      'Product Name': 'name',
      'Part Number': 'sku',
      'MSRP': 'uvp_cents',
      // ...
    },
    transformations: {
      uvp_cents: (value) => parseEuroToCents(value),
      category: (value) => normalizeCategory(value),
    }
  },
  hikvision: { /* ... */ },
  dahua: { /* ... */ },
}
```

### **C) Smart Column Detection** (AI/ML optional)
```typescript
// Automatisches Erkennen von Spalten basierend auf:
- Spaltennamen (fuzzy matching)
- Datentypen (number, string, boolean)
- Datenformat (Regex patterns)
- Inhalt (sample analysis)

Beispiel:
"Art.Nr." → wahrscheinlich sku (85% Match)
"Preis (EUR)" → wahrscheinlich uvp_cents (95% Match)
"Bezeichnung" → wahrscheinlich name (90% Match)
```

---

## 💻 **Implementation Ideen:**

### **1. Frontend (Admin-UI)**
```tsx
// Neue Seite: /admin/import-compiler

<ImportCompiler>
  <FileUpload accept=".csv,.xlsx,.xls" />
  <FormatDetection automatic={true} />
  <ColumnMapping editable={true} />
  <DataPreview rows={10} />
  <TransformationRules customizable={true} />
  <ImportOptions>
    - Direct Import to DB
    - Download converted CSV
    - Save as Format Profile
  </ImportOptions>
</ImportCompiler>
```

### **2. Backend (API Route)**
```typescript
// /api/admin/compile-csv

POST /api/admin/compile-csv
{
  file: File,
  formatProfile?: string, // optional: 'axis', 'hikvision', etc.
  customMapping?: object,
  options: {
    autoDetect: boolean,
    validateData: boolean,
    dryRun: boolean
  }
}

Response:
{
  success: true,
  detectedFormat: 'axis',
  columnMapping: {...},
  transformedData: [...],
  errors: [],
  warnings: [],
  preview: [...], // First 10 rows
  downloadUrl?: string // If download requested
}
```

### **3. Libraries nutzen**
```typescript
// Für Excel-Parsing:
import * as XLSX from 'xlsx'

// Für CSV-Parsing:
import Papa from 'papaparse'

// Für Encoding-Detection:
import chardet from 'chardet'

// Für Fuzzy String Matching:
import Fuse from 'fuse.js'
```

---

## 🎯 **Use Cases:**

### **Use Case 1: AXIS Preisliste importieren**
```
1. Admin lädt AXIS-Preisliste.csv hoch
2. System erkennt: "AXIS Format detected!"
3. Zeigt Vorschau mit Mapping
4. Admin bestätigt oder passt an
5. Import: 150 Produkte in 5 Sekunden
```

### **Use Case 2: Unbekanntes Format**
```
1. Admin lädt unbekannte CSV hoch
2. System zeigt: "Unknown format, please map columns"
3. Drag & Drop Column Mapping:
   "Artikelname" → name ✓
   "Art.-Nr." → sku ✓
   "VK-Preis" → uvp_cents ✓
4. "Save as Profile: Lieferant XYZ"
5. Nächstes Mal: Automatisch erkannt!
```

### **Use Case 3: Excel-Datei mit mehreren Sheets**
```
1. Admin lädt Hikvision.xlsx hoch
2. System zeigt: "3 Sheets detected"
   - Sheet 1: Cameras (120 rows)
   - Sheet 2: NVRs (35 rows)
   - Sheet 3: Accessories (80 rows)
3. Admin wählt: "Import all sheets"
4. System importiert 235 Produkte
```

---

## 🎨 **UI Mockup:**

```
┌────────────────────────────────────────────────────────────┐
│  CSV/Excel Compiler                                  [?] [X]│
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Step 1: Upload File                                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  📁 Drag & Drop oder klicken zum Auswählen          │  │
│  │                                                       │  │
│  │  Unterstützte Formate: .csv, .xlsx, .xls            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Step 2: Format Detection                                  │
│  ✅ Format erkannt: AXIS (Confidence: 92%)                 │
│  📊 Delimiter: Comma (,)                                   │
│  🔤 Encoding: UTF-8                                        │
│  📋 Rows: 127                                              │
│  📝 Columns: 8                                             │
│                                                             │
│  Step 3: Column Mapping                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Source Column      →  Target Column                  │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ Product Name       →  name              ✓           │  │
│  │ Part Number        →  sku               ✓           │  │
│  │ MSRP (EUR)         →  uvp_cents         ✓ (convert) │  │
│  │ Category           →  category          ✓           │  │
│  │ EAN Code           →  eso_number        ✓           │  │
│  │ Description        →  description       ✓           │  │
│  │ Tags               →  tags              ✓ (array)   │  │
│  │ Status             →  is_active         ✓ (bool)    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Step 4: Preview (First 5 rows)                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ name                     | sku          | uvp_cents  │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ AXIS M3068-P Dome       | AXIS-M3068-P | 129900     │  │
│  │ AXIS P3245-LVE Dome     | AXIS-P3245   | 89900      │  │
│  │ AXIS M4318-PLVA Dome    | AXIS-M4318   | 67900      │  │
│  │ ...                                                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ✅ 127 rows ready for import                              │
│  ⚠️  3 warnings: Missing ESO numbers                       │
│                                                             │
│  [💾 Save Profile] [⬇️ Download CSV] [✅ Import to DB]     │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

## 🚀 **Vorteile:**

### **1. Zeitersparnis**
❌ Vorher: Manuelle CSV-Anpassung in Excel (30-60 min)
✅ Nachher: Upload → Auto-Detect → Import (2-5 min)

### **2. Fehlerreduktion**
❌ Vorher: Spalten vertauscht, falsches Format
✅ Nachher: Automatische Validierung & Transformation

### **3. Wiederverwendbarkeit**
❌ Vorher: Jedes Mal neu mappen
✅ Nachher: Format-Profile gespeichert

### **4. Bulk-Import**
❌ Vorher: Einzeln über UI (langsam)
✅ Nachher: 1000+ Produkte in Sekunden

### **5. Flexibilität**
❌ Vorher: Nur unser Format akzeptiert
✅ Nachher: Beliebige Formate konvertierbar

---

## 📊 **Technische Details:**

### **Parsing Pipeline:**
```
File Upload
    ↓
Encoding Detection (chardet)
    ↓
Format Detection (CSV/Excel)
    ↓
Column Recognition (Fuzzy Matching)
    ↓
Data Transformation (Rules)
    ↓
Validation (Schema Check)
    ↓
Preview / Import / Download
```

### **Validierung:**
```typescript
// Validierungsregeln:
- SKU: unique, not empty, alphanumeric
- ESO Number: unique, not empty
- UVP: positive number
- Manufacturer: exists in manufacturers table
- Category: valid category name
- Tags: array of strings
- Is Active: boolean
```

---

## 🎯 **Priorität für Phase 2:**

### **Must-Have:**
✅ CSV Upload & Basic Parsing
✅ Column Mapping UI
✅ Auto-Detection (einfache Heuristik)
✅ Preview & Validation
✅ Direct Import oder Download

### **Nice-to-Have:**
⭐ Excel Support (XLSX)
⭐ Format Profile Speichern
⭐ Fuzzy Column Matching
⭐ Multi-Sheet Excel
⭐ AI-basierte Detection

### **Optional (Phase 3):**
🔮 Bulk-Edit im Preview
🔮 API-Import (direkt von Hersteller)
🔮 Scheduled Imports
🔮 Price-Update Tracking

---

## 💡 **Weitere Ideen:**

### **1. Hersteller-API-Integration**
```typescript
// Direkt von Hersteller-API importieren:
fetchProducts('https://api.axis.com/products')
  .transform(axisApiToOurFormat)
  .import()
```

### **2. Price-Update-Tool**
```typescript
// Nur Preise aktualisieren ohne neue Produkte:
uploadPriceList('axis-prices-2026.csv')
  .matchBySKU()
  .updatePricesOnly()
```

### **3. Duplicate-Detection**
```typescript
// Warnung bei Duplikaten:
"⚠️ SKU 'AXIS-M3068-P' already exists. Update or skip?"
```

---

## 📝 **Nächste Schritte:**

1. **Design finalisieren** - UI/UX Mockups
2. **Prototyp bauen** - Basis-Funktionalität
3. **Testen** - Mit echten Hersteller-CSVs
4. **Iteration** - Feedback einarbeiten
5. **Production** - Rollout

---

## 🎉 **Fazit:**

Der **CSV/Excel Compiler** ist ein **Game-Changing Feature**!

Es macht das System:
- 🚀 **Schneller** (Bulk-Import in Sekunden)
- 💪 **Mächtiger** (Beliebige Formate)
- 🎯 **Professioneller** (Enterprise-Feature)
- 😊 **Benutzerfreundlicher** (Weniger manuelle Arbeit)

**Perfect fit für Phase 2!** 🎯

---

## 🏗️ **PRIORITÄT 3: FLOOR PLAN PLANNER** 🎯

**📍 Status:** NÄCHSTE PRIORITÄT  
**📄 Dokumentation:** `docs/PHASE_2_FLOORPLAN.md`  
**⏱️ Geschätzte Zeit:** 13-18 Stunden (2-3 Arbeitstage)

### **🎯 Was ist das?**

Ein **interaktiver Floor Plan Editor** wie bei **cctvdesigntool.com**:
- 📐 Grundriss-Upload (PNG, JPG, PDF)
- 🎯 Kameras per **Drag & Drop** platzieren
- 📊 **Detektionsbereiche** als grafischer Trichter visualisieren
- 📏 Maßstab definieren (1m = X Pixel)
- 💾 Speichern & Exportieren (PNG, PDF)

### **🏗️ Tech Stack:**
```
- react-konva (Canvas Library) ✅
- react-dropzone (Image Upload) ✅
- html2canvas (PNG Export) ✅
- jsPDF (PDF Export) ✅
- Supabase Storage (Floor Plans) ✅
```

### **📊 Features (MVP):**
```
✅ Grundriss-Upload
✅ Kamera-Icons per Drag & Drop
✅ Detektionsbereich als Trichter/Kegel
✅ Rotation der Kameras
✅ Maßstab-Definition
✅ Speichern in Supabase
✅ Export als PNG
```

### **🎨 Nice-to-Have (Phase 2.4):**
```
📐 Zeichnen-Tools (Linien, Kreise)
📏 Entfernungsmessung
🎨 Layer-System
📤 Export als PDF mit Legende
🎯 Blind-Spot Detection
📊 Coverage-Heatmap
```

### **🚀 Advanced (Phase 3):**
```
🤖 AI-Vorschläge (optimale Positionen)
📐 3D-View (Three.js)
🎥 Simulated Camera-View
📊 DORI-Analyse
🔄 Live-Sync (Multi-User)
```

**Vollständige Dokumentation:** → `docs/PHASE_2_FLOORPLAN.md`

---

## 📄 **PRIORITÄT 4: DATENBLÄTTER-MANAGEMENT** 📋

**📍 Status:** GEPLANT (nach Floor Plan Planner)  
**📄 Dokumentation:** `docs/PHASE_2_DATASHEETS.md`  
**⏱️ Geschätzte Zeit:** 9 Stunden (1-1.5 Arbeitstage)

### **🎯 Was ist das?**

Ein **Datenblätter-Management-System** für Produkte:
- 📄 **PDFs hochladen** (technische Datenblätter)
- 🔗 **URLs hinterlegen** (direkt vom Hersteller)
- 📋 **Im Konfigurator anzeigen** (bei Kamera-Auswahl)
- 📊 **In der BOM verlinken** (Schnellzugriff auf Specs)
- 💾 **Versionierung** (alte Datenblätter behalten)
- 🌐 **Mehrsprachigkeit** (Deutsch, Englisch, etc.)

### **🏗️ Tech Stack:**
```
- Supabase Storage (PDF-Upload) ✅
- React-Dropzone (File Upload UI) ✅
- @react-pdf-viewer (PDF Preview, optional) 
- Native DB Table (product_datasheets)
```

### **📊 Features (MVP):**
```
✅ PDF-Upload (max 10 MB)
✅ URL-Hinterlegung
✅ Admin-UI (CRUD)
✅ Im Konfigurator anzeigen
✅ Download-Button
✅ Hersteller-Website verlinken
```

### **🎨 Nice-to-Have:**
```
📊 PDF-Vorschau im Modal
🌐 Mehrsprachigkeit (auto DE/EN)
📤 Im PDF-Export einbinden
🔍 Volltext-Suche in PDFs
📋 Bulk-Upload
🏷️ Tags
```

### **🚀 Advanced (Phase 3):**
```
🤖 Auto-Download von Hersteller-Websites
📊 PDF-Parsing (Specs extrahieren)
🔄 Versionierungs-System mit Change-Log
📧 Email bei neuen Versionen
🌍 CDN für schnelle Auslieferung
```

### **💡 Use Cases:**
```
1. Admin lädt Hikvision-Datenblatt hoch (PDF + URL)
2. Kunde wählt Hikvision-Kamera im Konfigurator
3. In der BOM: "📄 Datenblatt anzeigen" Button
4. Modal öffnet sich mit Download & Hersteller-Link
5. Kunde lädt PDF herunter für Offline-Nutzung
```

**Vollständige Dokumentation:** → `docs/PHASE_2_DATASHEETS.md`

---

## 🤖 **PRIORITÄT 5: AUTO-SCRAPER FÜR KAMERA-SPECS** 🔍

**📍 Status:** GEPLANT (nach Datasheets, vor CSV Compiler)  
**📄 Dokumentation:** `docs/PHASE_2_AUTOSCRAPER.md`  
**⏱️ Geschätzte Zeit:** 17 Stunden (2-3 Arbeitstage)

### **🎯 Was ist das?**

Ein **intelligenter Web-Scraper**, der beim Produkt anlegen:
- 🔗 **URL zur Herstellerseite** entgegennimmt
- 🤖 **Automatisch Specs ausliest** (Brennweite, Sensor, IR-Reichweite, etc.)
- 📊 **Felder vorausfüllt** (Auto-Complete)
- 💾 **In DB speichert** (für Floor Plan Planner!)
- 🔄 **Regelmäßig aktualisiert** (neue Daten vom Hersteller)

### **🏗️ Tech Stack:**
```
- Puppeteer (Headless Browser) ✅
- Cheerio (HTML Parser, Alternative) ✅
- OpenAI GPT-4 Vision (AI-Powered, Advanced) 🤖
- DORI Calculator (Detection/Observation/Recognition/Identification)
```

### **📊 Features (MVP):**
```
✅ URL-Input beim Produkt anlegen
✅ Scraper für 3-5 Top-Hersteller (Hikvision, AXIS, Dahua, Hanwha, Bosch)
✅ Extraktion wichtigster Specs:
   - Brennweite (für Detection Cone)
   - Auflösung
   - Sensor
   - IR-Reichweite
   - IP/IK-Rating
   - Öffnungswinkel
✅ DORI-Werte automatisch berechnen (für Floor Plan!)
✅ Confidence Score (Wie sicher sind die Daten?)
✅ Review-Screen (Admin prüft vor Speicherung)
✅ Fallback auf manuelle Eingabe
```

### **🎨 Nice-to-Have:**
```
🤖 AI-Powered Extraction (GPT-4 Vision)
🔄 Auto-Update (täglich neue Specs)
📸 Produktbild-Download
🌐 Mehrsprachigkeit (DE/EN/FR)
📋 Bulk-Scraping (mehrere Produkte)
```

### **🚀 Advanced (Phase 3):**
```
🧠 Machine Learning (lernt neue Seitenformate)
🔍 Competitor Analysis (Preis-Vergleich)
📈 Change Detection (benachrichtigt bei Updates)
🏢 Enterprise API (direkt von Hersteller)
```

### **💡 Use Cases:**
```
1. Admin gibt URL ein: https://www.hikvision.com/de/products/DS-2CD2143G2-I
2. Scraper extrahiert:
   - Brennweite: 2.8mm ✅
   - Auflösung: 8MP ✅
   - IR-Reichweite: 30m ✅
   - Öffnungswinkel: 110° ✅
   - DORI Detection: 100m (berechnet) ✅
3. Admin prüft & bestätigt
4. Specs werden gespeichert
5. Floor Plan Planner nutzt Specs für Detection Cone!
```

### **🔥 WARUM DAS CRITICAL IST:**

**Floor Plan Planner BRAUCHT diese Specs:**
- Brennweite → Zoom-Level im Cone
- Öffnungswinkel → Cone-Breite
- DORI-Werte → Detection-Reichweite
- IR-Reichweite → Nachtsicht-Visualisierung

**Ohne Auto-Scraper:**
- ❌ Admin muss 20+ Felder manuell eingeben
- ❌ Fehleranfällig
- ❌ Zeitaufwändig
- ❌ Oft unvollständig

**Mit Auto-Scraper:**
- ✅ 30 Sekunden statt 10 Minuten
- ✅ Direkt von Hersteller (immer aktuell)
- ✅ Vollständig & korrekt
- ✅ Floor Plan Planner funktioniert perfekt!

**Vollständige Dokumentation:** → `docs/PHASE_2_AUTOSCRAPER.md`

---

## 📋 **PHASE 2 - PRIORITÄTEN ZUSAMMENFASSUNG:**

```
✅ Priorität 1: Konfigurator-Integration (DB-Produkte)    → ERLEDIGT
✅ Priorität 2: Regeln-System (Feature-basiert)          → ERLEDIGT
🔥 Priorität 3: Floor Plan Planner (Drag & Drop)        → NÄCHSTES! (13-18h)
📄 Priorität 4: Datenblätter-Management (PDFs, URLs)    → DANACH (9h)
🤖 Priorität 5: Auto-Scraper (Kamera-Specs)             → DANN (17h) 🔥 CRITICAL!
⏳ Priorität 6: CSV/Excel Compiler (Bulk-Import)        → SPÄTER (20h, optional)
```

**Gesamter Aufwand Phase 2:**
- ✅ Prio 1: ~8h (erledigt)
- ✅ Prio 2: ~6h (erledigt)
- 🔥 Prio 3: ~15h (geplant)
- 📄 Prio 4: ~9h (geplant)
- 🤖 Prio 5: ~17h (geplant) ← CRITICAL für Floor Planner!
- ⏳ Prio 6: ~20h (optional)

**GESAMT: ~75 Stunden (~9-10 Arbeitstage)**

---

**Ende der Ideensammlung** - Bereit für Implementation! 🚀
