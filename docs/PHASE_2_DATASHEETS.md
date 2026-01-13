# 📄 PHASE 2 - PRIORITÄT 4: DATENBLÄTTER-MANAGEMENT

**Status:** 📋 GEPLANT  
**Ziel:** Datenblätter (PDFs, URLs) für Produkte hinterlegen und im Konfigurator anzeigen

---

## 🎯 **VISION:**

Ein **Datenblätter-Management-System**, das es ermöglicht:
- 📄 **PDFs hochladen** (Datenblätter von Herstellern)
- 🔗 **URLs hinterlegen** (direkt vom Hersteller)
- 📋 **Im Konfigurator anzeigen** (bei Kamera-Auswahl)
- 📊 **In der BOM verlinken** (Schnellzugriff auf Specs)
- 💾 **Versionierung** (alte Datenblätter behalten)
- 📤 **Im Export einbinden** (PDF-Angebot mit Datasheets)

---

## 🏗️ **ARCHITEKTUR:**

### **Datenmodell:**
```typescript
interface ProductDatasheet {
  id: string
  product_id: string              // References products.id
  name: string                    // z.B. "Hikvision DS-2CD2143G2-I Datasheet"
  description?: string            // Optional
  type: 'pdf' | 'url' | 'both'   // PDF Upload, URL oder beides
  
  // PDF Upload (Supabase Storage)
  pdf_url?: string                // Supabase Storage URL
  pdf_filename?: string           // Original filename
  pdf_size_bytes?: number         // File size
  
  // Manufacturer URL
  manufacturer_url?: string       // z.B. https://www.hikvision.com/...
  
  // Metadata
  version?: string                // z.B. "v2.1" oder "2024-01"
  language?: string               // z.B. "de", "en"
  is_primary: boolean             // Primäres Datenblatt (wird standardmäßig angezeigt)
  
  // Timestamps
  created_at: timestamp
  updated_at: timestamp
  created_by: string              // UUID of admin user
}
```

---

## 📐 **UI/UX DESIGN:**

### **1. Admin: Datenblätter verwalten** (`/admin/products/:id/datasheets`)

```
┌─────────────────────────────────────────────────────────────────┐
│  Produkt: Hikvision DS-2CD2143G2-I Dome Camera        [← Zurück]│
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📄 Datenblätter                                    [+ Hinzufügen]│
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 📄 Hikvision DS-2CD2143G2-I Datasheet (Deutsch)          │  │
│  │                                                           │  │
│  │ Typ: PDF + URL                                           │  │
│  │ Version: v2.1 (2024-01)                                  │  │
│  │ Sprache: Deutsch                                         │  │
│  │ Primär: ✅                                               │  │
│  │                                                           │  │
│  │ 📄 PDF: Hikvision_DS-2CD2143G2-I_DE.pdf (2.3 MB)       │  │
│  │ 🔗 URL: https://www.hikvision.com/de/products/...       │  │
│  │                                                           │  │
│  │ [📥 Download] [🔗 URL öffnen] [✏️ Bearbeiten] [🗑️ Löschen]│
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 📄 Hikvision DS-2CD2143G2-I Datasheet (English)          │  │
│  │                                                           │  │
│  │ Typ: URL                                                 │  │
│  │ Version: v2.1 (2024-01)                                  │  │
│  │ Sprache: English                                         │  │
│  │ Primär: ❌                                               │  │
│  │                                                           │  │
│  │ 🔗 URL: https://www.hikvision.com/en/products/...       │  │
│  │                                                           │  │
│  │ [🔗 URL öffnen] [✏️ Bearbeiten] [🗑️ Löschen]              │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### **2. Admin: Datenblatt hinzufügen/bearbeiten**

```
┌─────────────────────────────────────────────────────────┐
│  Datenblatt hinzufügen                          [X]    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Name: *                                                │
│  [Hikvision DS-2CD2143G2-I Datasheet_______________]   │
│                                                          │
│  Beschreibung:                                          │
│  [Technisches Datenblatt mit allen Specs__________]    │
│  [_____________________________________________]        │
│                                                          │
│  Typ: *                                                 │
│  ◉ PDF hochladen                                       │
│  ○ URL hinterlegen                                     │
│  ○ Beides (PDF + URL)                                  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  📁 PDF hochladen                                 │  │
│  │  Drag & Drop oder klicken                        │  │
│  │  Unterstützte Formate: .pdf                      │  │
│  │  Max. Größe: 10 MB                               │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ✅ Hikvision_DS-2CD2143G2-I_DE.pdf (2.3 MB)          │
│                                                          │
│  Hersteller-URL: (optional)                            │
│  [https://www.hikvision.com/de/products/..._______]    │
│                                                          │
│  Version: (optional)                                    │
│  [v2.1____________]                                     │
│                                                          │
│  Sprache:                                               │
│  [Deutsch ▼] English / Französisch / ...              │
│                                                          │
│  ✅ Als primäres Datenblatt markieren                  │
│     (wird standardmäßig im Konfigurator angezeigt)     │
│                                                          │
│  [Abbrechen]                    [Speichern]            │
└─────────────────────────────────────────────────────────┘
```

### **3. Konfigurator: Datenblatt anzeigen** (Step 6: Zusammenfassung)

```
┌─────────────────────────────────────────────────────────┐
│  Stückliste                        UVP: 2.144,00 €     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  🎥 Kameras                                    499,00 € │
│                                                          │
│  ARTIKELNAME                      HERSTELLER   MENGE   │
│  ──────────────────────────────────────────────────── │
│  [Lager] Hikvision DS-2CD2143G2-I  Hikvision    1     │
│  Dome Camera                                           │
│  ESO002003                                             │
│                                                          │
│  [📄 Datenblatt anzeigen] ← NEU!                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### **4. Konfigurator: Datenblatt-Modal**

```
┌─────────────────────────────────────────────────────────────┐
│  📄 Hikvision DS-2CD2143G2-I Datasheet          [X]        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Version: v2.1 (2024-01)                                   │
│  Sprache: Deutsch                                          │
│                                                              │
│  [📥 PDF herunterladen (2.3 MB)]                          │
│  [🔗 Hersteller-Website öffnen]                           │
│                                                              │
│  ─────── Weitere Versionen ─────────                       │
│                                                              │
│  • 📄 English Version (v2.1)     [🔗 Öffnen]             │
│  • 📄 Französisch (v2.0)         [🔗 Öffnen]             │
│                                                              │
│  ─────── Quick Specs ─────────                             │
│                                                              │
│  • Auflösung: 8 MP (3840 × 2160)                          │
│  • Objektiv: 2.8 mm                                        │
│  • IR-Reichweite: 30m                                      │
│  • Betriebstemperatur: -30°C bis +60°C                    │
│  • IP67 & IK10                                            │
│                                                              │
│  [Schließen]                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 **FEATURES:**

### **MVP (Phase 2.4):**
- ✅ PDF-Upload zu Supabase Storage
- ✅ URL-Hinterlegung
- ✅ Admin-UI für CRUD (Create, Read, Update, Delete)
- ✅ Im Konfigurator anzeigen (bei Kamera-Auswahl)
- ✅ Download-Button für PDFs
- ✅ Link zu Hersteller-Website

### **Nice-to-Have (Phase 2.5):**
- 📊 PDF-Vorschau im Modal (PDF.js)
- 🌐 Mehrsprachigkeit (automatisch Deutsch/Englisch anbieten)
- 📤 Im PDF-Export einbinden (Angebot + Datasheets)
- 🔍 Volltext-Suche in PDFs
- 📋 Bulk-Upload (mehrere PDFs auf einmal)
- 🏷️ Tags für Kategorisierung

### **Advanced (Phase 3):**
- 🤖 Auto-Download von Hersteller-Websites
- 📊 PDF-Parsing (automatisch Specs extrahieren)
- 🔄 Versionierungs-System (Change-Log)
- 📧 Email-Benachrichtigung bei neuen Versionen
- 🌍 CDN für schnelle PDF-Auslieferung

---

## 🗂️ **DATEISTRUKTUR:**

```
pages/
  admin/
    products/
      [id]/
        datasheets.tsx          ← Datenblätter verwalten

components/
  DatasheetCard.tsx             ← Datenblatt-Anzeige
  DatasheetModal.tsx            ← Datenblatt-Detail-Modal
  DatasheetUpload.tsx           ← PDF-Upload Component

lib/
  datasheetHelpers.ts           ← Upload, Download, URL-Validierung

supabase/
  migrations/
    add_product_datasheets.sql  ← Datasheet Table
  storage/
    datasheets/                 ← Storage Bucket für PDFs

types.ts
  ← ProductDatasheet Interface
```

---

## 📊 **IMPLEMENTIERUNGS-SCHRITTE:**

### **Schritt 1: Datenbank & Storage (1h)**
```sql
-- Migration: add_product_datasheets.sql
CREATE TABLE public.product_datasheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('pdf', 'url', 'both')),
  
  -- PDF
  pdf_url TEXT,
  pdf_filename TEXT,
  pdf_size_bytes INT,
  
  -- URL
  manufacturer_url TEXT,
  
  -- Metadata
  version TEXT,
  language TEXT DEFAULT 'de',
  is_primary BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Index
CREATE INDEX idx_product_datasheets_product_id ON public.product_datasheets(product_id);
CREATE INDEX idx_product_datasheets_is_primary ON public.product_datasheets(is_primary) WHERE is_primary = true;

-- RLS Policies (ähnlich wie bei products)
```

```bash
# Supabase Storage Bucket erstellen
supabase storage create datasheets --public
```

### **Schritt 2: Upload-Funktion (1.5h)**
```typescript
// lib/datasheetHelpers.ts
export async function uploadDatasheet(
  file: File,
  productId: string
): Promise<string> {
  // Validate PDF
  if (file.type !== 'application/pdf') {
    throw new Error('Only PDF files are allowed')
  }
  
  // Max 10 MB
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File size must be less than 10 MB')
  }
  
  // Upload to Supabase Storage
  const fileExt = 'pdf'
  const fileName = `${productId}/${Date.now()}.${fileExt}`
  
  const { data, error } = await supabase.storage
    .from('datasheets')
    .upload(fileName, file)
  
  if (error) throw error
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('datasheets')
    .getPublicUrl(fileName)
  
  return publicUrl
}
```

### **Schritt 3: Admin-UI (CRUD) (3h)**
```typescript
// pages/admin/products/[id]/datasheets.tsx
export default function ProductDatasheetsPage() {
  const router = useRouter()
  const { id } = router.query // product_id
  
  const [datasheets, setDatasheets] = useState<ProductDatasheet[]>([])
  const [product, setProduct] = useState<Product | null>(null)
  
  // Load datasheets
  useEffect(() => {
    loadDatasheets()
    loadProduct()
  }, [id])
  
  // CRUD Functions
  const handleCreate = async (datasheet: Partial<ProductDatasheet>) => {
    // Upload PDF if provided
    if (datasheet.pdf_file) {
      const pdfUrl = await uploadDatasheet(datasheet.pdf_file, id)
      datasheet.pdf_url = pdfUrl
    }
    
    // Insert to DB
    const { data, error } = await supabase
      .from('product_datasheets')
      .insert({ ...datasheet, product_id: id })
    
    if (error) throw error
    loadDatasheets()
  }
  
  // ... Update, Delete, etc.
  
  return (
    <AdminLayout>
      {/* UI here */}
    </AdminLayout>
  )
}
```

### **Schritt 4: Konfigurator-Integration (2h)**
```typescript
// pages/configurator.tsx - Step6Summary
const DatasheetButton = ({ product }) => {
  const [showModal, setShowModal] = useState(false)
  const [datasheets, setDatasheets] = useState<ProductDatasheet[]>([])
  
  useEffect(() => {
    loadDatasheets(product.id)
  }, [product.id])
  
  if (datasheets.length === 0) return null
  
  return (
    <>
      <button onClick={() => setShowModal(true)}>
        📄 Datenblatt anzeigen
      </button>
      
      {showModal && (
        <DatasheetModal
          datasheets={datasheets}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
```

### **Schritt 5: PDF-Vorschau (optional, 2h)**
```typescript
// components/DatasheetModal.tsx
import { Viewer, Worker } from '@react-pdf-viewer/core'

export const DatasheetModal = ({ datasheets, onClose }) => {
  const primaryDatasheet = datasheets.find(d => d.is_primary) || datasheets[0]
  
  return (
    <div className="modal">
      <h2>{primaryDatasheet.name}</h2>
      
      {primaryDatasheet.pdf_url && (
        <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
          <Viewer fileUrl={primaryDatasheet.pdf_url} />
        </Worker>
      )}
      
      {primaryDatasheet.manufacturer_url && (
        <a href={primaryDatasheet.manufacturer_url} target="_blank">
          🔗 Hersteller-Website öffnen
        </a>
      )}
    </div>
  )
}
```

---

## ⏱️ **ZEITPLAN:**

```
Phase 2.4.1 - Setup & Upload (2.5h)
├─ Datenbank-Migration (30min)
├─ Supabase Storage Setup (30min)
├─ Upload-Funktion (1.5h)

Phase 2.4.2 - Admin-UI (3h)
├─ Datasheets List Page (1h)
├─ Create/Edit Modal (1h)
├─ Delete Confirmation (30min)
├─ Integration in Products Page (30min)

Phase 2.4.3 - Konfigurator-Integration (2h)
├─ Datasheet-Button in BOM (30min)
├─ Datasheet-Modal (1h)
├─ Download-Funktionalität (30min)

Phase 2.4.4 - Polish & Testing (1.5h)
├─ UI/UX Improvements (30min)
├─ Error Handling (30min)
├─ Testing (30min)

GESAMT: 9 Stunden (1-1.5 Arbeitstage)
```

---

## 📦 **DEPENDENCIES:**

```bash
# Optional: PDF Viewer
npm install @react-pdf-viewer/core pdfjs-dist
```

---

## 🎯 **SUCCESS CRITERIA:**

- ✅ Admin kann PDFs hochladen (max 10 MB)
- ✅ Admin kann URLs hinterlegen
- ✅ Primäres Datenblatt wird im Konfigurator angezeigt
- ✅ PDF-Download funktioniert
- ✅ Hersteller-URL öffnet in neuem Tab
- ✅ Mehrere Datenblätter pro Produkt möglich
- ✅ Versionierung unterstützt
- ✅ Mehrsprachigkeit unterstützt

---

## 💡 **USE CASES:**

### **Use Case 1: Neues Produkt mit Datenblatt**
```
1. Admin erstellt Produkt "Hikvision DS-2CD2143G2-I"
2. Admin öffnet "/admin/products/[id]/datasheets"
3. Admin klickt "+ Hinzufügen"
4. Admin lädt PDF hoch (2.3 MB)
5. Admin hinterlegt URL: https://www.hikvision.com/...
6. Admin wählt Sprache: Deutsch
7. Admin markiert als primär ✅
8. Admin speichert
→ Im Konfigurator wird "📄 Datenblatt anzeigen" angezeigt
```

### **Use Case 2: Kunde öffnet Datenblatt**
```
1. Kunde erstellt Projekt im Konfigurator
2. Kunde wählt Hikvision Dome Kamera
3. In der BOM sieht Kunde "📄 Datenblatt anzeigen"
4. Kunde klickt darauf
5. Modal öffnet sich mit:
   - PDF-Download-Button
   - Hersteller-URL
   - Quick Specs
6. Kunde lädt PDF herunter
7. Kunde öffnet Hersteller-Website
```

### **Use Case 3: Mehrere Versionen**
```
1. Admin lädt deutsches Datenblatt hoch (v2.1)
2. Admin lädt englisches Datenblatt hoch (v2.1)
3. Admin lädt ältere Version hoch (v2.0, archiviert)
4. Im Konfigurator:
   - Primär: Deutsches Datenblatt (v2.1)
   - Dropdown: "Weitere Versionen"
     - English (v2.1)
     - Archiv (v2.0)
```

---

## 🚀 **ERWEITERUNGEN FÜR PHASE 3:**

### **1. Auto-Download von Hersteller-Websites**
```typescript
// Automatisch PDFs von Hersteller-Websites crawlen
crawlManufacturerWebsite('hikvision.com', 'DS-2CD2143G2-I')
  .then(pdfUrl => {
    downloadAndStore(pdfUrl, productId)
  })
```

### **2. PDF-Parsing (Specs extrahieren)**
```typescript
// Automatisch Specs aus PDF extrahieren
parsePDF(datasheetUrl)
  .extractSpecs()
  .then(specs => {
    updateProductSpecs(productId, specs)
  })
```

### **3. Change-Log & Versionierung**
```typescript
// Bei neuer Version: Changelog anzeigen
compareVersions(oldDatasheet, newDatasheet)
  .generateChangelog()
  .notifyAdmins()
```

---

## 📝 **ALTERNATIVE ANSÄTZE:**

### **Option A: Nur URLs (ohne PDF-Upload)**
```
Vorteile:
- Schneller zu implementieren (3h statt 9h)
- Keine Storage-Kosten
- Immer aktuellste Version vom Hersteller

Nachteile:
- Abhängigkeit von Hersteller-Website
- Broken Links möglich
- Kein Offline-Zugriff
```

### **Option B: Nur PDF-Upload (ohne URLs)**
```
Vorteile:
- Volle Kontrolle
- Offline-fähig
- Kein Risiko von Broken Links

Nachteile:
- Manuelle Aktualisierung nötig
- Storage-Kosten
- Veraltete PDFs möglich
```

### **Option C: Beides (EMPFOHLEN)**
```
Vorteile:
- Flexibilität
- Fallback wenn URL nicht funktioniert
- Beste User Experience

Nachteile:
- Etwas mehr Aufwand (9h)
```

---

## 🎉 **FAZIT:**

Das **Datenblätter-Management** ist ein **wichtiges Qualitäts-Feature**!

Es macht das System:
- 📊 **Professioneller** (vollständige Produkt-Infos)
- 🚀 **Benutzerfreundlicher** (ein Klick zu allen Specs)
- 💪 **Wertvoller** (weniger Rückfragen von Kunden)
- 🎯 **Verkaufsfördernd** (transparente Produkt-Infos)

**Perfect fit für Phase 2 - Priorität 4!** 🎯

---

**Ready to implement!** 📄

**Estimated Total Time:** 9 Stunden (1-1.5 Arbeitstage)  
**Priority:** ⏳ NACH Floor Plan Planner

---

**Ende der Datenblätter-Management Dokumentation** 🚀
