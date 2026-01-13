# 🤖 PHASE 2 - PRIORITÄT 5: AUTO-SCRAPER FÜR KAMERA-SPECS

**Status:** 🎯 GEPLANT (vor CSV Compiler, nach Datasheets)  
**Ziel:** Automatisches Auslesen von technischen Daten (Brennweite, Sensor, etc.) von Herstellerseiten

---

## 🎯 **VISION:**

Ein **intelligenter Web-Scraper**, der beim Anlegen eines Produkts:
- 🔗 **URL zur Herstellerseite** entgegennimmt
- 🤖 **Automatisch Specs ausliest** (Brennweite, Sensor, IR-Reichweite, etc.)
- 📊 **Felder vorausfüllt** (Auto-Complete)
- 💾 **In DB speichert** (für Floor Plan Planner)
- 🔄 **Regelmäßig aktualisiert** (neue Daten vom Hersteller)

---

## 💡 **WARUM DAS BRILLIANT IST:**

### **Problem:**
```
❌ Admin muss manuell Specs eingeben:
   - Brennweite: 2.8mm
   - Sensor: 1/2.8" CMOS
   - Auflösung: 8MP
   - IR-Reichweite: 30m
   - Öffnungswinkel: 110°
   - Betriebstemperatur: -30°C bis +60°C
   - IP-Rating: IP67
   - IK-Rating: IK10
   - ... 20+ weitere Felder!

→ Fehleranfällig, zeitaufwändig, oft unvollständig
```

### **Lösung:**
```
✅ Admin gibt nur URL ein:
   https://www.hikvision.com/de/products/DS-2CD2143G2-I

✅ Scraper extrahiert automatisch:
   {
     "focal_length_mm": 2.8,
     "sensor": "1/2.8\" CMOS",
     "resolution": "8MP (3840x2160)",
     "ir_range_m": 30,
     "field_of_view": 110,
     "operating_temp_min": -30,
     "operating_temp_max": 60,
     "ip_rating": "IP67",
     "ik_rating": "IK10",
     ...
   }

✅ Admin prüft & speichert
```

---

## 🏗️ **ARCHITEKTUR:**

### **Tech Stack:**

```typescript
// Option A: Server-Side (Node.js) - EMPFOHLEN
- Puppeteer (Headless Browser) ✅
  → Kann JavaScript-Seiten rendern
  → Extrahiert strukturierte Daten
  
// Option B: Lightweight
- Cheerio (HTML Parser) ✅
  → Schnell für statische HTML-Seiten
  → Kein Browser nötig
  
// Option C: AI-Powered (Advanced)
- OpenAI GPT-4 Vision ✅
  → Kann Produktseiten "verstehen"
  → Extrahiert Specs aus Bildern & Text
  → Sehr robust gegen Layout-Änderungen
```

### **Datenmodell:**

```typescript
interface ProductSpecs {
  id: string
  product_id: string
  
  // Optik
  focal_length_mm?: number        // 2.8, 4, 6, 8, etc.
  focal_length_min_mm?: number    // Für Vario-Objektive: 2.8
  focal_length_max_mm?: number    // Für Vario-Objektive: 12
  field_of_view_horizontal?: number  // 110°
  field_of_view_vertical?: number    // 60°
  
  // Sensor
  sensor_type?: string            // "1/2.8\" CMOS"
  sensor_size_inch?: number       // 1/2.8
  resolution_mp?: number          // 8
  resolution_width?: number       // 3840
  resolution_height?: number      // 2160
  
  // IR / Nachtsicht
  ir_range_m?: number             // 30
  has_ir?: boolean                // true
  smart_ir?: boolean              // true
  
  // Detection Ranges (DORI)
  dori_detection_m?: number       // 100m (Person erkennbar)
  dori_observation_m?: number     // 40m (Kleidung erkennbar)
  dori_recognition_m?: number     // 20m (Gesicht erkennbar)
  dori_identification_m?: number  // 10m (Gesicht identifizierbar)
  
  // Umgebung
  operating_temp_min?: number     // -30
  operating_temp_max?: number     // 60
  humidity_max?: number           // 95
  ip_rating?: string              // "IP67"
  ik_rating?: string              // "IK10"
  
  // Netzwerk
  has_poe?: boolean               // true
  poe_class?: string              // "Class 0"
  power_consumption_w?: number    // 12
  
  // Audio
  has_audio_in?: boolean          // true
  has_audio_out?: boolean         // true
  
  // Abmessungen
  dimensions_width_mm?: number    // 150
  dimensions_height_mm?: number   // 150
  dimensions_depth_mm?: number    // 80
  weight_g?: number               // 500
  
  // Metadata
  source_url?: string             // URL der Herstellerseite
  scraped_at?: timestamp          // Wann wurde gescrapt
  confidence_score?: number       // 0-100 (Wie sicher sind die Daten?)
  
  created_at: timestamp
  updated_at: timestamp
}

interface ScraperProfile {
  id: string
  manufacturer_slug: string       // "hikvision", "axis", etc.
  base_url_pattern: string        // "https://www.hikvision.com/*/products/*"
  
  // CSS Selectors für verschiedene Specs
  selectors: {
    focal_length?: string         // ".spec-table tr:contains('Focal Length') td"
    resolution?: string
    ir_range?: string
    // ...
  }
  
  // Alternative: AI-basiert
  use_ai_extraction?: boolean
  
  is_active: boolean
  last_tested_at?: timestamp
  success_rate?: number           // 0-100
  
  created_at: timestamp
  updated_at: timestamp
}
```

---

## 📐 **UI/UX DESIGN:**

### **1. Produkt anlegen - MIT Auto-Scraper**

```
┌─────────────────────────────────────────────────────────┐
│  Neues Produkt anlegen                          [X]    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Hersteller: *                                          │
│  [Hikvision ▼]                                          │
│                                                          │
│  Name: *                                                │
│  [DS-2CD2143G2-I Dome Camera__________________]        │
│                                                          │
│  SKU:                                                   │
│  [AXIS-M3068-P_____________________________]            │
│                                                          │
│  ESO-Nummer:                                            │
│  [ESO002003________________________________]            │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │ 🤖 AUTO-SCRAPER                        [?]    │    │
│  ├────────────────────────────────────────────────┤    │
│  │                                                 │    │
│  │ Produktseite (URL):                            │    │
│  │ [https://www.hikvision.com/de/products/_____] │    │
│  │                                                 │    │
│  │ [🔍 Specs automatisch auslesen]               │    │
│  │                                                 │    │
│  │ ℹ️ Wir extrahieren automatisch:               │    │
│  │ • Brennweite & Sensor                          │    │
│  │ • Auflösung & IR-Reichweite                   │    │
│  │ • DORI-Werte für Floor Planner                │    │
│  │ • Umgebungsbedingungen (IP, IK)               │    │
│  │ • Abmessungen & Gewicht                        │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  [Manuell fortfahren]        [Mit Scraper fortfahren]  │
└─────────────────────────────────────────────────────────┘
```

### **2. Scraper läuft - Loading State**

```
┌─────────────────────────────────────────────────────────┐
│  🤖 Specs werden ausgelesen...                  [X]    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  URL: https://www.hikvision.com/de/products/DS-2CD...  │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │ ⏳ Lade Produktseite...              ████░░ 80%│    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  Status:                                                │
│  ✅ Seite geladen                                       │
│  ✅ Hersteller erkannt: Hikvision                       │
│  ⏳ Extrahiere Specs...                                 │
│  ⏸️ Prüfe Datenqualität...                              │
│                                                          │
│  Gefundene Specs (Preview):                            │
│  • Brennweite: 2.8mm ✅                                 │
│  • Auflösung: 8MP (3840x2160) ✅                       │
│  • IR-Reichweite: 30m ✅                                │
│  • Sensor: 1/2.8" CMOS ✅                              │
│  • ...                                                  │
│                                                          │
│  [Abbrechen]                                            │
└─────────────────────────────────────────────────────────┘
```

### **3. Scraper fertig - Review & Confirm**

```
┌─────────────────────────────────────────────────────────┐
│  ✅ Specs erfolgreich ausgelesen!               [X]    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Confidence Score: 92% ✅                               │
│  Quelle: https://www.hikvision.com/de/products/...     │
│  Datum: 14.01.2026 09:23                               │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │ 📊 EXTRAHIERTE SPECS            [Alle bearbeiten]│    │
│  ├────────────────────────────────────────────────┤    │
│  │                                                 │    │
│  │ OPTIK:                                         │    │
│  │ • Brennweite: [2.8] mm              ✅ Sicher  │    │
│  │ • Öffnungswinkel: [110]°            ✅ Sicher  │    │
│  │                                                 │    │
│  │ SENSOR:                                        │    │
│  │ • Typ: [1/2.8" CMOS______]          ✅ Sicher  │    │
│  │ • Auflösung: [8] MP                 ✅ Sicher  │    │
│  │ • Format: [3840] x [2160] px        ✅ Sicher  │    │
│  │                                                 │    │
│  │ NACHTSICHT:                                    │    │
│  │ • IR-Reichweite: [30] m             ✅ Sicher  │    │
│  │ • Smart IR: ☑ Ja                    ⚠️ Unsicher│    │
│  │                                                 │    │
│  │ DORI-WERTE (für Floor Planner):                │    │
│  │ • Detection: [100] m                 ⚠️ Berechnet│    │
│  │ • Observation: [40] m                ⚠️ Berechnet│    │
│  │ • Recognition: [20] m                ⚠️ Berechnet│    │
│  │ • Identification: [10] m             ⚠️ Berechnet│    │
│  │                                                 │    │
│  │ UMGEBUNG:                                      │    │
│  │ • Betriebstemp: [-30] bis [60]°C    ✅ Sicher  │    │
│  │ • IP-Rating: [IP67_]                ✅ Sicher  │    │
│  │ • IK-Rating: [IK10_]                ✅ Sicher  │    │
│  │                                                 │    │
│  │ NETZWERK:                                      │    │
│  │ • PoE: ☑ Ja                         ✅ Sicher  │    │
│  │ • Leistung: [12] W                  ✅ Sicher  │    │
│  │                                                 │    │
│  │ ABMESSUNGEN:                                   │    │
│  │ • Durchmesser: [150] mm             ⚠️ Unsicher│    │
│  │ • Höhe: [80] mm                     ⚠️ Unsicher│    │
│  │ • Gewicht: [500] g                  ⚠️ Unsicher│    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ℹ️ Legende:                                            │
│  ✅ Sicher - Direkt von Herstellerseite                │
│  ⚠️ Unsicher/Berechnet - Bitte überprüfen             │
│  ❌ Nicht gefunden - Manuell eingeben                  │
│                                                          │
│  [Verwerfen]  [Manuell bearbeiten]  [Übernehmen & Speichern]│
└─────────────────────────────────────────────────────────┘
```

### **4. Fehler beim Scraping**

```
┌─────────────────────────────────────────────────────────┐
│  ❌ Specs konnten nicht ausgelesen werden       [X]    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Grund: Unbekanntes Seitenformat                       │
│                                                          │
│  🔍 Was ist passiert?                                   │
│  Die Produktseite von Hikvision hat ein neues Layout.  │
│  Unser Scraper konnte die Specs nicht finden.         │
│                                                          │
│  💡 Lösungen:                                           │
│  1. Specs manuell eingeben (empfohlen)                 │
│  2. Admin benachrichtigen (wir updaten den Scraper)    │
│  3. Später erneut versuchen                            │
│                                                          │
│  Gefundene Teilinformationen:                          │
│  • Produktname: DS-2CD2143G2-I ✅                      │
│  • Hersteller: Hikvision ✅                            │
│  • Kategorie: Dome Camera (geschätzt)                 │
│                                                          │
│  [Diese Infos übernehmen]  [Manuell eingeben]         │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 **FEATURES:**

### **MVP (Phase 2.5):**
- ✅ URL-Input beim Produkt anlegen
- ✅ Scraper für 3-5 Top-Hersteller (Hikvision, AXIS, Dahua, Hanwha, Bosch)
- ✅ Extraktion wichtigster Specs:
  - Brennweite
  - Auflösung
  - Sensor
  - IR-Reichweite
  - IP/IK-Rating
- ✅ Confidence Score (Wie sicher sind die Daten?)
- ✅ Review-Screen (Admin prüft vor Speicherung)
- ✅ Fallback auf manuelle Eingabe

### **Nice-to-Have (Phase 2.6):**
- 🤖 **AI-Powered Extraction** (GPT-4 Vision)
  → Robuster gegen Layout-Änderungen
  → Kann Specs aus Bildern extrahieren
  → Versteht Kontext besser
- 🔄 **Auto-Update** (täglich neue Specs holen)
- 📊 **DORI-Berechnung** (automatisch aus Brennweite & Sensor)
- 📸 **Produktbild-Download** (für Katalog)
- 🌐 **Mehrsprachigkeit** (DE/EN/FR Produktseiten)
- 📋 **Bulk-Scraping** (mehrere Produkte auf einmal)

### **Advanced (Phase 3):**
- 🧠 **Machine Learning** (lernt neue Seitenformate)
- 🔍 **Competitor Analysis** (Preis-Vergleich)
- 📈 **Change Detection** (benachrichtigt bei Spec-Updates)
- 🏢 **Enterprise API** (direkt von Hersteller-APIs)
- 📊 **Quality Score** (wie vollständig sind die Specs?)

---

## 🗂️ **DATEISTRUKTUR:**

```
pages/
  api/
    scraper/
      scrape-product.ts           ← Main Scraper API
      test-scraper.ts             ← Test-Endpoint

lib/
  scrapers/
    base.ts                       ← Base Scraper Class
    hikvision.ts                  ← Hikvision-Specific
    axis.ts                       ← AXIS-Specific
    dahua.ts                      ← Dahua-Specific
    hanwha.ts                     ← Hanwha-Specific
    bosch.ts                      ← Bosch-Specific
    
  ai/
    gpt-scraper.ts                ← AI-Powered Scraper (optional)
    
  dori/
    calculator.ts                 ← DORI-Berechnung
    
components/
  ScraperDialog.tsx               ← Scraper UI
  SpecsReview.tsx                 ← Review extrahierter Specs

supabase/
  migrations/
    add_product_specs.sql         ← Specs Table
    add_scraper_profiles.sql      ← Scraper Config Table

types.ts
  ← ProductSpecs, ScraperProfile
```

---

## 📊 **IMPLEMENTIERUNGS-SCHRITTE:**

### **Schritt 1: Datenbank & Types (1h)**
```sql
-- Migration: add_product_specs.sql
CREATE TABLE public.product_specs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  
  -- Optik
  focal_length_mm FLOAT,
  focal_length_min_mm FLOAT,
  focal_length_max_mm FLOAT,
  field_of_view_horizontal FLOAT,
  field_of_view_vertical FLOAT,
  
  -- Sensor
  sensor_type TEXT,
  sensor_size_inch FLOAT,
  resolution_mp FLOAT,
  resolution_width INT,
  resolution_height INT,
  
  -- IR
  ir_range_m FLOAT,
  has_ir BOOLEAN,
  smart_ir BOOLEAN,
  
  -- DORI
  dori_detection_m FLOAT,
  dori_observation_m FLOAT,
  dori_recognition_m FLOAT,
  dori_identification_m FLOAT,
  
  -- Umgebung
  operating_temp_min FLOAT,
  operating_temp_max FLOAT,
  humidity_max FLOAT,
  ip_rating TEXT,
  ik_rating TEXT,
  
  -- Netzwerk
  has_poe BOOLEAN,
  poe_class TEXT,
  power_consumption_w FLOAT,
  
  -- Metadata
  source_url TEXT,
  scraped_at TIMESTAMP WITH TIME ZONE,
  confidence_score FLOAT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(product_id)
);

-- Index
CREATE INDEX idx_product_specs_product_id ON public.product_specs(product_id);
```

### **Schritt 2: Base Scraper (2h)**
```typescript
// lib/scrapers/base.ts
import puppeteer from 'puppeteer'

export abstract class BaseScraper {
  protected manufacturer: string
  
  constructor(manufacturer: string) {
    this.manufacturer = manufacturer
  }
  
  // Main scrape method
  async scrape(url: string): Promise<ScrapedData> {
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    
    try {
      await page.goto(url, { waitUntil: 'networkidle0' })
      
      // Call manufacturer-specific extraction
      const data = await this.extractSpecs(page)
      
      await browser.close()
      return data
    } catch (error) {
      await browser.close()
      throw error
    }
  }
  
  // Abstract method - must be implemented by each manufacturer
  protected abstract extractSpecs(page: any): Promise<ScrapedData>
  
  // Helper: Extract text from selector
  protected async getText(page: any, selector: string): Promise<string | null> {
    try {
      return await page.$eval(selector, (el: any) => el.textContent.trim())
    } catch {
      return null
    }
  }
  
  // Helper: Parse focal length from text
  protected parseFocalLength(text: string): number | null {
    const match = text.match(/(\d+(?:\.\d+)?)\s*mm/)
    return match ? parseFloat(match[1]) : null
  }
  
  // Helper: Parse resolution
  protected parseResolution(text: string): { mp?: number, width?: number, height?: number } {
    const mpMatch = text.match(/(\d+)\s*MP/)
    const resMatch = text.match(/(\d+)\s*[x×]\s*(\d+)/)
    
    return {
      mp: mpMatch ? parseInt(mpMatch[1]) : undefined,
      width: resMatch ? parseInt(resMatch[1]) : undefined,
      height: resMatch ? parseInt(resMatch[2]) : undefined
    }
  }
}
```

### **Schritt 3: Manufacturer-Specific Scrapers (3h)**
```typescript
// lib/scrapers/hikvision.ts
import { BaseScraper } from './base'

export class HikvisionScraper extends BaseScraper {
  constructor() {
    super('hikvision')
  }
  
  protected async extractSpecs(page: any): Promise<ScrapedData> {
    const specs: Partial<ProductSpecs> = {}
    
    // Brennweite
    const focalLengthText = await this.getText(page, '.spec-table tr:contains("Focal Length") td')
    if (focalLengthText) {
      specs.focal_length_mm = this.parseFocalLength(focalLengthText)
    }
    
    // Auflösung
    const resolutionText = await this.getText(page, '.spec-table tr:contains("Max. Resolution") td')
    if (resolutionText) {
      const res = this.parseResolution(resolutionText)
      specs.resolution_mp = res.mp
      specs.resolution_width = res.width
      specs.resolution_height = res.height
    }
    
    // IR Range
    const irText = await this.getText(page, '.spec-table tr:contains("IR Range") td')
    if (irText) {
      const match = irText.match(/(\d+)\s*m/)
      specs.ir_range_m = match ? parseInt(match[1]) : undefined
    }
    
    // IP Rating
    specs.ip_rating = await this.getText(page, '.spec-table tr:contains("Ingress Protection") td')
    
    // IK Rating
    specs.ik_rating = await this.getText(page, '.spec-table tr:contains("Vandal Proof") td')
    
    // Confidence Score berechnen
    const foundFields = Object.values(specs).filter(v => v !== undefined).length
    const totalFields = 20 // Anzahl aller möglichen Felder
    const confidence = (foundFields / totalFields) * 100
    
    return {
      specs,
      confidence_score: confidence,
      source_url: page.url()
    }
  }
}
```

### **Schritt 4: API Route (2h)**
```typescript
// pages/api/scraper/scrape-product.ts
import { HikvisionScraper } from '@/lib/scrapers/hikvision'
import { AxisScraper } from '@/lib/scrapers/axis'
// ... more scrapers

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  const { url, manufacturer_slug } = req.body
  
  if (!url || !manufacturer_slug) {
    return res.status(400).json({ error: 'Missing url or manufacturer_slug' })
  }
  
  try {
    // Select scraper based on manufacturer
    let scraper
    switch (manufacturer_slug) {
      case 'hikvision':
        scraper = new HikvisionScraper()
        break
      case 'axis':
        scraper = new AxisScraper()
        break
      // ... more manufacturers
      default:
        return res.status(400).json({ error: 'Unsupported manufacturer' })
    }
    
    // Scrape
    const data = await scraper.scrape(url)
    
    return res.status(200).json({
      success: true,
      data
    })
    
  } catch (error: any) {
    console.error('Scraper error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape product specs',
      details: error.message
    })
  }
}
```

### **Schritt 5: UI Integration (3h)**
```typescript
// components/ScraperDialog.tsx
export const ScraperDialog = ({ productUrl, manufacturerSlug, onComplete }) => {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [scrapedData, setScrapedData] = useState(null)
  const [error, setError] = useState(null)
  
  const handleScrape = async () => {
    setLoading(true)
    setProgress(20)
    
    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(p => Math.min(p + 10, 90))
      }, 500)
      
      // Call API
      const res = await fetch('/api/scraper/scrape-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: productUrl, manufacturer_slug: manufacturerSlug })
      })
      
      clearInterval(progressInterval)
      setProgress(100)
      
      const data = await res.json()
      
      if (data.success) {
        setScrapedData(data.data)
      } else {
        setError(data.error)
      }
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="scraper-dialog">
      {loading && <ProgressBar progress={progress} />}
      {scrapedData && <SpecsReview specs={scrapedData} onConfirm={onComplete} />}
      {error && <ErrorMessage message={error} />}
    </div>
  )
}
```

### **Schritt 6: DORI Calculator (1h)**
```typescript
// lib/dori/calculator.ts
/**
 * Calculate DORI distances based on focal length, sensor size, and resolution
 * 
 * DORI = Detection, Observation, Recognition, Identification
 * 
 * Detection: 25 pixels/m (person erkennbar)
 * Observation: 62 pixels/m (Kleidung erkennbar)
 * Recognition: 125 pixels/m (Gesicht erkennbar)
 * Identification: 250 pixels/m (Gesicht identifizierbar)
 */
export function calculateDORI(
  focalLengthMm: number,
  sensorSizeInch: number,
  resolutionWidth: number,
  resolutionHeight: number
): {
  detection_m: number
  observation_m: number
  recognition_m: number
  identification_m: number
} {
  // Simplified DORI calculation
  // Real calculation would need sensor width in mm
  // This is a rough approximation
  
  const sensorWidthMm = sensorSizeInch * 25.4 // inch to mm
  const pixelsPerMm = resolutionWidth / sensorWidthMm
  
  // Distance calculation based on pixels per meter
  const detection = (pixelsPerMm * focalLengthMm) / 25
  const observation = (pixelsPerMm * focalLengthMm) / 62
  const recognition = (pixelsPerMm * focalLengthMm) / 125
  const identification = (pixelsPerMm * focalLengthMm) / 250
  
  return {
    detection_m: Math.round(detection),
    observation_m: Math.round(observation),
    recognition_m: Math.round(recognition),
    identification_m: Math.round(identification)
  }
}
```

---

## ⏱️ **ZEITPLAN:**

```
Phase 2.5.1 - Setup & Base (3h)
├─ Datenbank-Migration (1h)
├─ Base Scraper Class (2h)

Phase 2.5.2 - Manufacturer Scrapers (6h)
├─ Hikvision Scraper (1.5h)
├─ AXIS Scraper (1.5h)
├─ Dahua Scraper (1.5h)
├─ Hanwha Scraper (1.5h)

Phase 2.5.3 - API & UI (5h)
├─ API Route (2h)
├─ ScraperDialog Component (2h)
├─ SpecsReview Component (1h)

Phase 2.5.4 - DORI & Polish (3h)
├─ DORI Calculator (1h)
├─ Error Handling (1h)
├─ Testing & Bugfixes (1h)

GESAMT: 17 Stunden (2-3 Arbeitstage)
```

---

## 📦 **DEPENDENCIES:**

```bash
# Puppeteer (Headless Browser)
npm install puppeteer

# Alternative: Cheerio (Lightweight)
npm install cheerio

# Optional: OpenAI (AI-Powered)
npm install openai
```

---

## 🎯 **SUCCESS CRITERIA:**

- ✅ Admin kann URL beim Produkt anlegen eingeben
- ✅ Scraper extrahiert mindestens 10 Specs
- ✅ Confidence Score wird angezeigt
- ✅ Admin kann Specs reviewen & bearbeiten
- ✅ DORI-Werte werden automatisch berechnet
- ✅ Funktioniert für 3+ Hersteller
- ✅ Fallback auf manuelle Eingabe bei Fehler
- ✅ Specs werden in DB gespeichert
- ✅ Floor Plan Planner kann Specs abrufen

---

## 💡 **USE CASES:**

### **Use Case 1: Neues Produkt mit Auto-Scraper**
```
1. Admin öffnet "Neues Produkt anlegen"
2. Admin gibt URL ein: https://www.hikvision.com/de/products/DS-2CD2143G2-I
3. Admin klickt "🔍 Specs automatisch auslesen"
4. Scraper läuft (20 Sekunden)
5. Review-Screen öffnet sich mit extrahierten Specs
6. Admin prüft: Brennweite 2.8mm ✅, IR 30m ✅
7. Admin korrigiert: DORI Detection von 80m auf 100m
8. Admin klickt "Übernehmen & Speichern"
9. Produkt wird mit allen Specs gespeichert
→ Floor Plan Planner hat sofort alle Daten!
```

### **Use Case 2: Scraper findet nicht alle Specs**
```
1. Admin startet Scraper
2. Scraper findet nur 6 von 20 Specs
3. Confidence Score: 30% ⚠️
4. Review-Screen zeigt:
   ✅ Brennweite: 2.8mm (Sicher)
   ✅ Auflösung: 8MP (Sicher)
   ⚠️ IR-Reichweite: Nicht gefunden
   ⚠️ IP-Rating: Nicht gefunden
   ...
5. Admin füllt fehlende Felder manuell aus
6. Admin speichert
→ Hybrid-Ansatz: Auto + Manuell
```

### **Use Case 3: Scraper schlägt fehl**
```
1. Admin startet Scraper
2. Error: "Unbekanntes Seitenformat"
3. Admin wird benachrichtigt
4. Admin wählt "Manuell eingeben"
5. Admin füllt Formular aus
6. Admin speichert
→ Fallback funktioniert
```

### **Use Case 4: Floor Plan Planner nutzt Specs**
```
1. User platziert Hikvision Dome im Floor Plan
2. Floor Plan Planner lädt Specs aus DB:
   - Brennweite: 2.8mm
   - Öffnungswinkel: 110°
   - DORI Detection: 100m
3. Detection Cone wird automatisch korrekt gezeichnet:
   - Winkel: 110°
   - Reichweite: 100m
4. User kann Kamera rotieren & verschieben
5. Detection Cone passt sich an
→ Perfekte Integration!
```

---

## 🚀 **ERWEITERUNGEN FÜR PHASE 3:**

### **1. AI-Powered Scraper (GPT-4 Vision)**
```typescript
// lib/ai/gpt-scraper.ts
import OpenAI from 'openai'

export async function scrapeWithAI(url: string): Promise<ProductSpecs> {
  const openai = new OpenAI()
  
  // Take screenshot
  const screenshot = await takeScreenshot(url)
  
  // Ask GPT-4 Vision
  const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extract all camera specifications from this product page. Return as JSON with fields: focal_length_mm, resolution_mp, ir_range_m, ip_rating, etc."
          },
          {
            type: "image_url",
            image_url: screenshot
          }
        ]
      }
    ]
  })
  
  return JSON.parse(response.choices[0].message.content)
}
```

### **2. Bulk Scraping (mehrere Produkte)**
```typescript
// Scrape entire product catalog
scrapeProductCatalog('hikvision', '/de/products/cameras')
  .then(products => {
    products.forEach(p => {
      createProduct(p.name, p.url)
      scrapeAndSaveSpecs(p.url, p.id)
    })
  })
```

### **3. Auto-Update (täglich neue Specs)**
```typescript
// Cron Job: Täglich alle Produkte neu scrapen
schedule.scheduleJob('0 2 * * *', async () => {
  const products = await getAllProducts()
  
  for (const product of products) {
    if (product.specs.source_url) {
      try {
        const newSpecs = await scraper.scrape(product.specs.source_url)
        
        if (hasChanged(product.specs, newSpecs)) {
          await updateSpecs(product.id, newSpecs)
          await notifyAdmins(`Specs updated: ${product.name}`)
        }
      } catch (err) {
        console.error(`Failed to update ${product.name}:`, err)
      }
    }
  }
})
```

---

## 🎉 **FAZIT:**

Der **Auto-Scraper** ist ein **GAME-CHANGING Feature**!

Es macht das System:
- 🚀 **10x schneller** (keine manuelle Eingabe)
- 🎯 **Genauer** (direkt von Hersteller)
- 💪 **Professioneller** (vollständige Specs)
- 🏗️ **Essential für Floor Planner** (benötigt DORI, Brennweite, etc.)

**PERFEKT für Phase 2 - Priorität 5!** 🤖

---

**Ready to implement!** 🔍

**Estimated Total Time:** 17 Stunden (2-3 Arbeitstage)  
**Priority:** 🔥 NACH Datasheets, VOR CSV Compiler  
**Dependencies:** Puppeteer (Headless Browser)

---

**Ende der Auto-Scraper Dokumentation** 🚀
