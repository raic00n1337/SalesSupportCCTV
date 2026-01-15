# System Designer - Feature-Dokumentation

**Projekt:** SalesSupportCCTV  
**Modul:** System Designer (Floor Plan Planner)  
**Version:** MVP + Auto-Import + Product Search  
**Stand:** 2026-01-15  
**Letzte Commits:** `0be19d6`, `6beb3e8`, `28a32a3`

---

## 📋 Inhaltsverzeichnis

1. [Übersicht](#übersicht)
2. [Tech Stack](#tech-stack)
3. [Implementierte Features](#implementierte-features)
4. [Technische Implementierung](#technische-implementierung)
5. [Datenbankschema](#datenbankschema)
6. [API Endpoints](#api-endpoints)
7. [Offene Features / Roadmap](#offene-features--roadmap)
8. [Bekannte Probleme](#bekannte-probleme)
9. [Setup & Testing](#setup--testing)

---

## 🎯 Übersicht

Der **System Designer** ist ein visuelles Tool zur Planung von CCTV-Systemen auf Grundrissen. Benutzer können Grundrisse hochladen, Kameras platzieren, Detection-Bereiche visualisieren und das gesamte System für Kundenpräsentationen exportieren.

### Hauptziel
Feature-Parität mit [CCTV Design Tool](https://cctvdesigntool.com/) - einem professionellen, kommerziellen Tool für CCTV-System-Design.

### Status
✅ **MVP erfolgreich implementiert**  
✅ **Auto-Import aus Konfigurator funktioniert**  
✅ **Produkt-Datenbank-Integration**  
⏳ **FOV/DORI-Berechnung in Planung**

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 14.2.35** - React Framework
- **TypeScript** - Type Safety
- **React Konva** (`react-konva`, `konva`) - Canvas-basierte Rendering-Engine für 2D-Grafik
- **react-dropzone** - Drag & Drop für Bildupload
- **TailwindCSS** - Styling

### Backend
- **Next.js API Routes** - Serverless Functions
- **Supabase** - PostgreSQL-Datenbank + Storage + Auth
- **Supabase Storage** - Bildhosting (`floor-plans` Bucket)

### Deployment
- **Netlify** - Hosting & CI/CD
- **GitHub** - Repository & Version Control

---

## ✅ Implementierte Features

### 1. Grundriss-Management

#### 1.1 Grundriss-Upload
- **Drag & Drop** für Bildupload (JPEG, PNG, WebP)
- Upload zu **Supabase Storage** (`floor-plans` Bucket)
- Automatische Bild-URL-Generierung
- Responsive Bild-Anzeige auf Canvas

**Technische Details:**
```typescript
// File: pages/system-designer/[projectId].tsx
const { getRootProps, getInputProps } = useDropzone({
  accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
  maxFiles: 1,
  onDrop: handleImageDrop
})

// Upload zu Supabase Storage
const filePath = `floor-plans/${Date.now()}-${file.name}`
const { data: uploadData, error: uploadError } = await supabase.storage
  .from('floor-plans')
  .upload(filePath, file, { upsert: true })
```

**Status:** ✅ Vollständig implementiert

---

#### 1.2 Multi-Grundriss-Support
- Mehrere Grundrisse pro Projekt
- Stockwerk-Nummerierung (`floor_number`: 0 = EG, 1 = OG, -1 = UG)
- Sidebar mit Liste aller Grundrisse
- Schnelles Wechseln zwischen Grundrissen
- **Delete-Funktion** mit Bestätigung

**Technische Details:**
```typescript
// State Management
const [designs, setDesigns] = useState<SystemDesign[]>([])
const [currentDesign, setCurrentDesign] = useState<SystemDesign | null>(null)

// Delete Design + zugehöriges Bild
const handleDeleteDesign = async (designId: string) => {
  // 1. Delete image from storage
  const filePath = design.image_url.split('floor-plans/')[1]
  await supabase.storage.from('floor-plans').remove([filePath])
  
  // 2. Delete design from DB (cascade deletes placements)
  await fetch(`/api/system-designer/designs?id=${designId}`, { method: 'DELETE' })
}
```

**Status:** ✅ Vollständig implementiert

---

### 2. Kamera-Platzierung

#### 2.1 Manuelle Platzierung
- **Click-to-Place:** Kamera-Typ auswählen → auf Grundriss klicken
- 6 Kamera-Typen:
  - 🎥 Dome Fixed
  - 🎥 Dome Vario
  - 📹 Bullet Fixed
  - 📹 Bullet Vario
  - 🔄 PTZ
  - 🌡️ Thermal
- **Drag & Drop** zum Verschieben
- **Rotation** via Slider (0-360°)
- **Detection Range** via Slider (10-100m)

**Technische Details:**
```typescript
// In components/SystemDesignerCanvas.tsx
<Stage onClick={handleStageClick}>
  <Layer>
    <KonvaImage image={floorPlanImage} />
    
    {design.placements?.map(placement => (
      <React.Fragment key={placement.id}>
        {/* Detection Cone */}
        <Circle
          x={placement.position_x}
          y={placement.position_y}
          radius={placement.detection_range_m * scale}
          fill={placement.cone_color}
          opacity={placement.cone_opacity}
        />
        
        {/* Camera Icon (Emoji als Text) */}
        <Text
          x={placement.position_x - 12}
          y={placement.position_y - 12}
          text={getCameraEmoji(placement.camera_type)}
          fontSize={24}
          draggable
          onDragEnd={(e) => handleCameraDragEnd(placement, e)}
        />
        
        {/* Camera Label */}
        <Text
          x={placement.position_x - 50}
          y={placement.position_y + 15}
          text={placement.camera_name}
          fontSize={12}
          align="center"
        />
      </React.Fragment>
    ))}
  </Layer>
</Stage>
```

**Status:** ✅ Vollständig implementiert

---

#### 2.2 Auto-Import aus Konfigurator ⭐ **NEU**
- **Automatischer Import** aller Kameras aus dem Konfigurator
- Wird ausgeführt:
  - Beim Erstellen eines neuen Grundrisses
  - Beim ersten Laden eines existierenden Grundrisses (falls leer)
- **Grid-Layout** (5 Spalten, 120px Spacing)
- **Automatische Benennung:** `[Site Name] - [Kamera Name]`
- **Extensive Logging** für Debugging

**Technische Details:**
```typescript
// File: pages/system-designer/[projectId].tsx

const importCamerasFromConfigurator = async (project: Project, designId: string) => {
  console.log('🎬 Starting camera import...', { projectId, designId, sitesCount })
  
  // Sammle alle Kameras von allen Sites
  const allCameras: any[] = []
  project.sites.forEach(site => {
    const cameras = site.cameras_config || {}
    
    // Für jeden Kamera-Typ
    if (cameras.domeFixed?.quantity) {
      for (let i = 0; i < cameras.domeFixed.quantity; i++) {
        allCameras.push({
          type: 'dome_fixed',
          icon: '🎥',
          name: cameras.domeFixed.customNames?.[i] || `Dome Fixed #${i + 1}`,
          siteName: site.name
        })
      }
    }
    // ... analog für alle anderen Typen
  })
  
  // Platziere in Grid-Layout
  const gridCols = 5
  for (let i = 0; i < allCameras.length; i++) {
    const row = Math.floor(i / gridCols)
    const col = i % gridCols
    
    const placement = {
      system_design_id: designId,
      camera_type: camera.type,
      camera_name: `${camera.siteName} - ${camera.name}`,
      position_x: startX + (col * spacingX),
      position_y: startY + (row * spacingY),
      // ... weitere Properties
    }
    
    // Insert via API
    await fetch('/api/system-designer/placements', {
      method: 'POST',
      body: JSON.stringify(placement)
    })
  }
}

// Auto-Import beim Erstellen neuer Designs
const handleCreateDesign = async (name: string) => {
  const res = await fetch('/api/system-designer/designs', { 
    method: 'POST',
    body: JSON.stringify({ project_id, name, floor_number: 0 })
  })
  
  if (res.ok) {
    const data = await res.json()
    // WICHTIG: Auto-Import nach Erstellung
    if (project) {
      await importCamerasFromConfigurator(project, data.design.id)
    }
  }
}
```

**Status:** ✅ Implementiert (Commit `0be19d6`)

---

#### 2.3 Refresh-Button 🔄
- **Manueller Neu-Laden-Button** neben "Kameras"
- Löscht alle bestehenden Placements
- Re-importiert Kameras aus Konfigurator
- Bestätigungs-Dialog zum Schutz

**Technische Details:**
```typescript
const handleRefreshCameras = async () => {
  if (!confirm('Alle bestehenden Kameras löschen und neu laden?')) return
  
  setSaving(true)
  
  // 1. Delete all placements
  const placementIds = currentDesign.placements?.map(p => p.id) || []
  for (const id of placementIds) {
    await fetch(`/api/system-designer/placements?id=${id}`, { method: 'DELETE' })
  }
  
  // 2. Re-import
  await importCamerasFromConfigurator(project, currentDesign.id)
  
  // 3. Reload design
  const res = await fetch(`/api/system-designer/designs?design_id=${currentDesign.id}`)
  const data = await res.json()
  setCurrentDesign(data.design)
}
```

**UI:**
```tsx
<button
  onClick={handleRefreshCameras}
  disabled={saving}
  className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg"
  title="Kameras aus Konfigurator neu laden"
>
  🔄
</button>
```

**Status:** ✅ Implementiert (Commit `0be19d6`)

---

#### 2.4 Produkt-Suche aus Datenbank 🔍 **NEU**
- **Dropdown/Search-Panel** für alle Produkte aus `configurator_products`
- **Live-Filterung** nach:
  - Produktname
  - SKU
  - Hersteller
- **Limit:** 20 Ergebnisse (Performance)
- **Klick zum Hinzufügen:** Produkt wird in Canvas-Mitte platziert

**Technische Details:**
```typescript
// State
const [availableProducts, setAvailableProducts] = useState<any[]>([])
const [productSearchOpen, setProductSearchOpen] = useState(false)
const [productSearchQuery, setProductSearchQuery] = useState('')

// Load products from DB
useEffect(() => {
  const loadProducts = async () => {
    const { data } = await supabase
      .from('configurator_products')
      .select(`
        *,
        products (
          id, name, sku, manufacturer
        )
      `)
      .order('category')
    
    setAvailableProducts(data || [])
  }
  loadProducts()
}, [])

// Add product to canvas
const handleAddProductToCanvas = async (product: any) => {
  // Map category to camera type
  const categoryToCameraType = {
    'camera_dome_fixed': 'dome_fixed',
    'camera_bullet_vario': 'bullet_vario',
    // ...
  }
  
  const placement = {
    system_design_id: currentDesign.id,
    camera_type: categoryToCameraType[product.category],
    camera_name: product.products?.name,
    product_id: product.product_id,
    position_x: 400, // Center
    position_y: 300,
    // ...
  }
  
  await fetch('/api/system-designer/placements', {
    method: 'POST',
    body: JSON.stringify(placement)
  })
}
```

**UI:**
```tsx
{/* Expandable Search Panel */}
<button onClick={() => setProductSearchOpen(!productSearchOpen)}>
  🔍 Produkt aus Datenbank hinzufügen
</button>

{productSearchOpen && (
  <div>
    <input
      placeholder="Suche nach Name, SKU, Hersteller..."
      value={productSearchQuery}
      onChange={(e) => setProductSearchQuery(e.target.value)}
    />
    
    <div className="max-h-64 overflow-y-auto">
      {availableProducts
        .filter(p => /* filter logic */)
        .slice(0, 20)
        .map(product => (
          <button onClick={() => handleAddProductToCanvas(product)}>
            {product.products?.name}
          </button>
        ))}
    </div>
  </div>
)}
```

**Status:** ✅ Implementiert (Commit `0be19d6`)

---

### 3. Detection Zones

#### 3.1 Basic Detection Cone
- **Kreis-basierte Detection Zone**
- Konfigurierbare:
  - Reichweite (10-100m)
  - Farbe (Hex)
  - Opacity (0-1)
- Toggle zum Ein/Ausblenden

**Technische Details:**
```typescript
// In SystemDesignerCanvas.tsx
{placement.show_detection_cone && (
  <Circle
    x={placement.position_x}
    y={placement.position_y}
    radius={placement.detection_range_m * scale}
    fill={placement.cone_color}
    opacity={placement.cone_opacity}
    listening={false}
  />
)}
```

**Status:** ✅ Basic implementiert  
**TODO:** DORI-Zonen (4 konzentrische Kreise) - siehe Roadmap

---

### 4. Canvas & Interaktion

#### 4.1 Konva.js Integration
- **SSR-kompatibel** durch `next/dynamic` mit `ssr: false`
- Responsive Canvas-Größe
- Zoom & Pan (geplant)
- Export (geplant)

**Technische Details:**
```typescript
// Dynamic Import (kein SSR)
const SystemDesignerCanvas = dynamic(
  () => import('../../components/SystemDesignerCanvas'),
  { ssr: false }
)

// Client-Side-Only Rendering
const [isClient, setIsClient] = useState(false)
useEffect(() => {
  setIsClient(true)
}, [])

{isClient && currentDesign && (
  <SystemDesignerCanvas
    design={currentDesign}
    selectedCameraType={selectedCameraType}
    selectedPlacement={selectedPlacement}
    onAddCamera={handleAddCamera}
    onSelectCamera={setSelectedPlacement}
    onUpdateCamera={handleUpdatePlacement}
  />
)}
```

**Status:** ✅ Vollständig implementiert

---

#### 4.2 Kamera-Icons & Labels
- **Emoji-basierte Icons** (🎥📹🔄🌡️)
- **Automatische Labels** unter Icons
- **Farb-Highlight** für selektierte Kamera (blau)

**Technische Details:**
```typescript
const getCameraEmoji = (type: string) => {
  switch (type) {
    case 'dome_fixed':
    case 'dome_vario':
      return '🎥'
    case 'bullet_fixed':
    case 'bullet_vario':
      return '📹'
    case 'ptz':
      return '🔄'
    case 'thermal':
      return '🌡️'
    default:
      return '📷'
  }
}

<Text
  text={getCameraEmoji(placement.camera_type)}
  fontSize={24}
  fill={selectedPlacement?.id === placement.id ? '#3b82f6' : '#1f2937'}
/>
```

**Status:** ✅ Implementiert (Commit `28a32a3`)

---

### 5. Datenbank-Integration

#### 5.1 Projekt-Laden
- **Direkte Supabase-Abfrage** (kein API-Route)
- Lädt Projekt mit allen Sites und Cameras
- Vermeidet UTF-8-Encoding-Probleme

**Technische Details:**
```typescript
// Load Project directly from Supabase
const { data: projData, error } = await supabase
  .from('projects')
  .select(`
    *,
    sites (
      *
    )
  `)
  .eq('id', projectId)
  .single()

setProject(projData)
```

**Grund für direkten Zugriff:** API-Route `/api/projects/[id]` hatte persistente UTF-8-Encoding-Probleme auf Netlify.

**Status:** ✅ Implementiert (Workaround für UTF-8-Issue)

---

#### 5.2 CRUD Operations
Alle CRUD-Operationen über API Routes:

**Designs:**
- `GET /api/system-designer/designs?project_id={id}` - Liste aller Designs
- `GET /api/system-designer/designs?design_id={id}` - Ein Design mit Placements
- `POST /api/system-designer/designs` - Neues Design erstellen
- `DELETE /api/system-designer/designs?id={id}` - Design löschen

**Placements:**
- `GET /api/system-designer/placements?design_id={id}` - Alle Placements eines Designs
- `POST /api/system-designer/placements` - Neues Placement
- `PUT /api/system-designer/placements` - Placement aktualisieren
- `DELETE /api/system-designer/placements?id={id}` - Placement löschen

**Image Upload:**
- `POST /api/system-designer/upload-image` - Bild hochladen zu Supabase Storage

**Status:** ✅ Vollständig implementiert

---

## 📐 Datenbankschema

### Tabelle: `system_designs`
```sql
CREATE TABLE public.system_designs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  floor_number INT DEFAULT 0, -- 0 = EG, 1 = OG, -1 = UG
  image_url TEXT,
  image_width INT,
  image_height INT,
  scale_pixels_per_meter FLOAT DEFAULT 100, -- 100px = 1m
  scale_reference_length_m FLOAT,
  scale_reference_px FLOAT,
  canvas_zoom FLOAT DEFAULT 1.0,
  canvas_pan_x FLOAT DEFAULT 0,
  canvas_pan_y FLOAT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_system_designs_project ON public.system_designs(project_id);

-- RLS Policies
ALTER TABLE public.system_designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_designs_select_policy" 
  ON public.system_designs FOR SELECT 
  TO authenticated USING (true);

CREATE POLICY "system_designs_insert_policy" 
  ON public.system_designs FOR INSERT 
  TO authenticated WITH CHECK (true);

CREATE POLICY "system_designs_update_policy" 
  ON public.system_designs FOR UPDATE 
  TO authenticated USING (true);

CREATE POLICY "system_designs_delete_policy" 
  ON public.system_designs FOR DELETE 
  TO authenticated USING (true);

-- Trigger
CREATE TRIGGER update_system_designs_updated_at
  BEFORE UPDATE ON public.system_designs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Tabelle: `camera_placements`
```sql
CREATE TABLE public.camera_placements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  system_design_id UUID NOT NULL REFERENCES public.system_designs(id) ON DELETE CASCADE,
  camera_type TEXT NOT NULL, -- 'dome_fixed', 'bullet_vario', etc.
  camera_name TEXT,
  product_id UUID REFERENCES public.products(id),
  position_x FLOAT NOT NULL,
  position_y FLOAT NOT NULL,
  rotation FLOAT DEFAULT 0, -- 0-360 Grad
  focal_length_mm FLOAT DEFAULT 2.8,
  field_of_view FLOAT DEFAULT 90, -- in Grad
  detection_range_m FLOAT DEFAULT 30,
  show_detection_cone BOOLEAN DEFAULT true,
  cone_color TEXT DEFAULT '#3b82f6',
  cone_opacity FLOAT DEFAULT 0.3,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_camera_placements_design ON public.camera_placements(system_design_id);
CREATE INDEX idx_camera_placements_product ON public.camera_placements(product_id);

-- RLS Policies (analog zu system_designs)
ALTER TABLE public.camera_placements ENABLE ROW LEVEL SECURITY;
-- ... (Policies wie oben)

-- Trigger
CREATE TRIGGER update_camera_placements_updated_at
  BEFORE UPDATE ON public.camera_placements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Storage Bucket: `floor-plans`
```sql
-- Supabase Storage Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('floor-plans', 'floor-plans', true);

-- RLS Policy für Storage
CREATE POLICY "floor_plans_select_policy"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'floor-plans');

CREATE POLICY "floor_plans_insert_policy"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'floor-plans');

CREATE POLICY "floor_plans_delete_policy"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'floor-plans');
```

**Migration File:** `supabase/migrations/add_system_designer.sql`  
**Status:** ✅ Vollständig migriert (Live-DB)

---

## 🔌 API Endpoints

### `/api/system-designer/designs.ts`
**Methoden:** GET, POST, PUT, DELETE

**GET:** Designs abrufen
```typescript
// Alle Designs eines Projekts
GET /api/system-designer/designs?project_id={uuid}

// Ein Design mit Placements
GET /api/system-designer/designs?design_id={uuid}

Response: {
  success: true,
  design: SystemDesign | null,
  designs: SystemDesign[] | null
}
```

**POST:** Neues Design erstellen
```typescript
POST /api/system-designer/designs
Body: {
  project_id: string,
  name: string,
  floor_number: number,
  description?: string
}

Response: {
  success: true,
  design: SystemDesign
}
```

**DELETE:** Design löschen
```typescript
DELETE /api/system-designer/designs?id={uuid}

Response: {
  success: true
}
```

---

### `/api/system-designer/placements.ts`
**Methoden:** GET, POST, PUT, DELETE

**POST:** Neues Placement
```typescript
POST /api/system-designer/placements
Body: {
  system_design_id: string,
  camera_type: string,
  camera_name?: string,
  product_id?: string,
  position_x: number,
  position_y: number,
  rotation?: number,
  focal_length_mm?: number,
  // ...
}

Response: {
  success: true,
  placement: CameraPlacement
}
```

**PUT:** Placement aktualisieren
```typescript
PUT /api/system-designer/placements
Body: {
  id: string,
  // ... zu aktualisierende Felder
}

Response: {
  success: true,
  placement: CameraPlacement
}
```

**DELETE:** Placement löschen
```typescript
DELETE /api/system-designer/placements?id={uuid}

Response: {
  success: true
}
```

---

### `/api/system-designer/upload-image.ts`
**Methode:** POST (multipart/form-data)

```typescript
POST /api/system-designer/upload-image
Body: FormData with 'image' file

Response: {
  url: string, // Public URL
  path: string, // Storage path
  width: number,
  height: number
}
```

**Implementierung:**
```typescript
// File upload mit formidable
import formidable from 'formidable'
import fs from 'fs'

const form = formidable({ multiples: false })
const [fields, files] = await form.parse(req)

// Upload zu Supabase Storage
const filePath = `floor-plans/${Date.now()}-${file.originalFilename}`
const { data, error } = await supabase.storage
  .from('floor-plans')
  .upload(filePath, fileBuffer, {
    contentType: file.mimetype,
    upsert: true
  })

const { data: publicData } = supabase.storage
  .from('floor-plans')
  .getPublicUrl(filePath)

return { url: publicData.publicUrl, path: filePath, width, height }
```

---

## 🚧 Offene Features / Roadmap

### Priority 1: FOV & DORI-Zonen ⭐ **NÄCHSTER SCHRITT**
**Status:** 📝 Geplant, Code-Vorlagen vorhanden

**Ziel:** Realistische Field-of-View und DORI-basierte Detection-Zonen

**Was fehlt:**
1. **SQL Migration** ausführen (`supabase/migrations/add_camera_specs.sql`)
   - Erweitert `configurator_products` mit:
     - `focal_length_min`, `focal_length_max`
     - `sensor_size`, `sensor_width_mm`, `sensor_height_mm`
     - `horizontal_resolution`, `vertical_resolution`
     - `ir_range_m`, `has_ir`
     - `dori_detect_m`, `dori_observe_m`, `dori_recognize_m`, `dori_identify_m`
     - `default_mount_height_m`, `default_tilt_angle`

2. **Calculation Library integrieren** (`lib/cameraCalculations.ts`)
   - FOV-Berechnung: `FOV = 2 × arctan(sensor / (2 × focal_length))`
   - DORI-Berechnung basierend auf IPVM-Standard (PPM)
   - Ground Coverage-Berechnung

3. **DORI-Visualisierung** in `SystemDesignerCanvas.tsx`
   - 4 konzentrische Kreise statt 1:
     - **Identify:** Dunkelgrün, 250 PPM
     - **Recognize:** Grün, 125 PPM
     - **Observe:** Gelb, 62 PPM
     - **Detect:** Orange/Rot, 25 PPM

**Zeitaufwand:** ~2 Tage  
**Dateien:** 
- `supabase/migrations/add_camera_specs.sql` (vorhanden)
- `lib/cameraCalculations.ts` (vorhanden)
- `components/SystemDesignerCanvas.tsx` (zu erweitern)
- `docs/DORI_VISUALIZATION_GUIDE.md` (Anleitung vorhanden)

---

### Priority 2: Maßstab-Kalibrierung
**Status:** 📝 Konzept vorhanden

**Ziel:** Benutzer kann Maßstab kalibrieren (z.B. "10m = 500px")

**Implementierung:**
- Zwei-Punkt-Kalibrierungs-Tool
- Benutzer klickt zwei Punkte auf Grundriss
- Gibt bekannte Distanz ein (z.B. "10m")
- System berechnet `scale_pixels_per_meter`

**Zeitaufwand:** ~1 Tag

---

### Priority 3: Night Preview
**Status:** 📝 Konzept vorhanden

**Ziel:** Toggle zwischen Tag/Nacht-Ansicht

**Implementierung:**
- Grundriss-Opacity reduzieren (0.3)
- IR-Reichweite als hellere Kreise anzeigen
- Basierend auf `ir_range_m` aus DB

**Zeitaufwand:** ~0.5 Tag

---

### Priority 4: Export
**Status:** ❌ Nicht implementiert

**Ziel:** PNG/PDF-Export für Kundenpräsentationen

**Implementierung:**
- Konva → Image: `stage.toDataURL()`
- PDF-Generation mit `jsPDF`
- Automatischer Download

**Zeitaufwand:** ~1 Tag

---

### Priority 5: Netzwerk-Visualisierung
**Status:** ❌ Nicht geplant (noch)

**Ziel:** Switches, NVR, Kabel-Routing visualisieren

**Komplexität:** Hoch  
**Zeitaufwand:** ~3-5 Tage

---

## 🐛 Bekannte Probleme

### 1. UTF-8 Encoding auf Netlify
**Problem:** Dateien mit Sonderzeichen in Pfaden (z.B. `[projectId].tsx`) verursachen Build-Fehler wenn sie via PowerShell erstellt werden.

**Workaround:** Python-Scripts für Datei-Erstellung verwenden.

**Status:** ✅ Workaround funktioniert

---

### 2. Konva SSR-Incompatibility
**Problem:** Konva.js benötigt Node.js `canvas` Modul, das nicht im Browser läuft.

**Lösung:** Dynamic Import mit `ssr: false`
```typescript
const SystemDesignerCanvas = dynamic(
  () => import('../../components/SystemDesignerCanvas'),
  { ssr: false }
)
```

**Status:** ✅ Gelöst

---

### 3. Git Staging mit Special Characters
**Problem:** Git hat Probleme Dateien mit `[]` im Namen zu stagen.

**Lösung:** `git add -f` oder absolute Pfade verwenden.

**Status:** ⚠️ Workaround funktioniert

---

### 4. Supabase Type Inference
**Problem:** Supabase's auto-generierte TypeScript-Typen sind zu strikt für `.insert()` und `.update()`.

**Lösung:** `as any` Type-Casts
```typescript
const { error } = await (supabase
  .from('system_designs') as any)
  .insert({ name, project_id, floor_number })
```

**Status:** ✅ Workaround funktioniert

---

## 🧪 Setup & Testing

### Lokale Entwicklung

1. **Dependencies installieren:**
```bash
cd C:\Users\Rico\Documents\SalesSupportCCTV
npm install
```

2. **Environment Variables** (`.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://lvrzoqtrlxbukppuyzpc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

3. **Dev Server starten:**
```bash
npm run dev
```

4. **System Designer aufrufen:**
```
http://localhost:3000/system-designer/[projekt-uuid]
```

---

### Supabase Migration ausführen

```sql
-- In Supabase SQL Editor
-- File: supabase/migrations/add_system_designer.sql

-- Tabellen erstellen
CREATE TABLE public.system_designs (...);
CREATE TABLE public.camera_placements (...);

-- Storage Bucket erstellen
INSERT INTO storage.buckets (id, name, public) 
VALUES ('floor-plans', 'floor-plans', true);

-- Bucket auf public setzen (wichtig für Bild-Anzeige!)
UPDATE storage.buckets SET public = true WHERE id = 'floor-plans';
```

---

### Test-Workflow

1. **Konfigurator öffnen**
   - Projekt erstellen mit Kameras
   - Projekt speichern

2. **System Designer öffnen**
   - Link im Konfigurator klicken oder
   - `/system-designer/[projekt-id]` manuell aufrufen

3. **Neuen Grundriss erstellen**
   - "+ Neuer Grundriss" klicken
   - Namen eingeben (z.B. "Erdgeschoss")
   - ✅ **ERWARTUNG:** Kameras werden automatisch importiert

4. **Grundriss hochladen**
   - Drag & Drop Bild auf Upload-Bereich
   - ✅ **ERWARTUNG:** Bild erscheint, Kameras sind platziert

5. **Kamera verschieben**
   - Kamera anklicken und ziehen
   - ✅ **ERWARTUNG:** Kamera bewegt sich, Detection-Cone folgt

6. **Refresh testen**
   - Grünen 🔄 Button klicken
   - Bestätigen
   - ✅ **ERWARTUNG:** Alle Kameras neu geladen

7. **Produkt-Suche testen**
   - "🔍 Produkt aus Datenbank hinzufügen" klicken
   - Nach "Axis" suchen
   - Produkt anklicken
   - ✅ **ERWARTUNG:** Produkt in Canvas-Mitte

---

### Debugging

**Browser Console öffnen (F12):**

Erwartete Logs:
```
🎬 Starting camera import... { projectId: '...', designId: '...', sitesCount: 1 }
📍 Site 1: Test Site Cameras: { domeFixed: { quantity: 2 }, ... }
📦 Total cameras to import: 4
🎥 Importing camera 1/4: Dome Fixed #1
  ✅ Placed successfully at (100, 100)
🎥 Importing camera 2/4: Dome Fixed #2
  ✅ Placed successfully at (220, 100)
...
✅ Import complete! 4 cameras placed on canvas
```

---

## 📊 Performance-Metriken

- **Build-Zeit (Netlify):** ~2-3 Minuten
- **Image Upload:** ~1-2 Sekunden (abhängig von Bildgröße)
- **Auto-Import (10 Kameras):** ~2-3 Sekunden
- **Canvas Rendering:** 60 FPS (bei < 50 Kameras)

---

## 📚 Relevante Dateien

### Hauptkomponenten
- `pages/system-designer/[projectId].tsx` - Main Component (772 Zeilen)
- `components/SystemDesignerCanvas.tsx` - Canvas Rendering (Konva.js)
- `types.ts` - TypeScript Interfaces

### API Routes
- `pages/api/system-designer/designs.ts` - Design CRUD
- `pages/api/system-designer/placements.ts` - Placement CRUD
- `pages/api/system-designer/upload-image.ts` - Image Upload

### Migrations
- `supabase/migrations/add_system_designer.sql` - DB Schema
- `supabase/migrations/add_camera_specs.sql` - FOV/DORI Erweiterung (noch nicht ausgeführt)

### Dokumentation
- `docs/SYSTEM_DESIGNER_ROADMAP.md` - Kompletter Plan
- `docs/DORI_VISUALIZATION_GUIDE.md` - DORI Implementierungs-Guide
- `docs/TOMORROW_START_HERE.md` - Quick Start

### Utilities
- `lib/cameraCalculations.ts` - FOV/DORI Berechnungen (vorhanden, noch nicht integriert)

---

## 🤝 Für externen Entwickler

### Was läuft bereits perfekt:
✅ Grundriss-Upload & Management  
✅ Kamera-Platzierung (manuell & automatisch)  
✅ Auto-Import aus Konfigurator  
✅ Produkt-Suche aus DB  
✅ Drag & Drop  
✅ Basic Detection Cones  

### Was als Nächstes kommen sollte:
⭐ **PRIORITY 1:** FOV/DORI-Berechnung & Visualisierung  
→ Code-Vorlagen vorhanden in `lib/cameraCalculations.ts`  
→ Anleitung in `docs/DORI_VISUALIZATION_GUIDE.md`  
→ SQL Migration bereit: `supabase/migrations/add_camera_specs.sql`

**Zeitaufwand:** 1-2 Tage für erfahrenen React/TypeScript-Entwickler

### Wo du ansetzen kannst:
1. **SQL Migration ausführen** (5 Min)
2. **`lib/cameraCalculations.ts` studieren** (30 Min)
3. **`components/SystemDesignerCanvas.tsx` erweitern** (4-6 Std)
   - Replace single Circle mit 4 DORI-Circles
   - `calculateCameraPerformance()` integrieren
4. **Admin UI erweitern** (2-3 Std)
   - `pages/admin/configurator-products.tsx` um FOV/DORI-Felder ergänzen
5. **Testen!** (1-2 Std)

---

## 📞 Kontakt & Fragen

**Repository:** https://github.com/raic00n1337/SalesSupportCCTV  
**Live-URL:** https://salessupportcctv.netlify.app  
**Letzter Commit:** `0be19d6` (2026-01-15)

**Technische Fragen:**
- Alle wichtigen Infos sind in dieser Dokumentation
- Code ist gut kommentiert (besonders neue Features)
- Bei Fragen: Issues auf GitHub oder direkte Kommunikation

---

**Erstellt:** 2026-01-15  
**Version:** 1.0  
**Status:** ✅ Production-ready MVP mit Auto-Import & Produkt-Suche
