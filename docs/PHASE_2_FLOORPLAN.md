# 🏗️ PHASE 2 - PRIORITÄT 3: FLOOR PLAN PLANNER

**Status:** 🎯 NÄCHSTE PRIORITÄT  
**Inspiration:** cctvdesigntool.com  
**Ziel:** Visuelles Kamera-Placement mit Detektionsbereichen

---

## 🎯 **VISION:**

Ein **interaktiver Floor Plan Editor** direkt im Konfigurator, der es ermöglicht:
- 📐 **Grundriss hochladen** (PNG, JPG, PDF)
- 🎯 **Kameras per Drag & Drop platzieren**
- 🔗 **Integration mit Konfigurator-Daten** (verwendet die ausgewählten Kameras aus dem Projekt!)
- 📊 **Detektionsbereiche visualisieren** (grafischer Trichter)
- 📏 **Maßstab definieren** (1m = X Pixel)
- 🎨 **Verschiedene Kamera-Typen** (Dome, Bullet, PTZ)
- 💾 **Speichern & Exportieren** (PNG, PDF für Angebot)

### **🔗 WICHTIG: Konfigurator-Integration**

Der Floor Plan Planner ist **eng verzahnt** mit dem Konfigurator:
- ✅ Zeigt nur die Kamera-Typen an, die im Projekt ausgewählt wurden
- ✅ Verwendet die echten Kamera-Specs aus der DB (Reichweite, Winkel)
- ✅ Automatisch richtige Icons & Farben je nach Typ
- ✅ Sync: Änderungen im Konfigurator → Update im Floor Plan
- ✅ Anzahl der platzierten Kameras = Anzahl im Konfigurator

---

## 🏗️ **ARCHITEKTUR:**

### **Stack:**
```typescript
// Canvas-Library für Zeichnen
- Konva.js (React-Konva) ✅ Production-Ready
  → https://konvajs.org/

// Alternative:
- Fabric.js
- Paper.js

// Image Upload:
- React-Dropzone ✅ Already known

// Export:
- html2canvas (PNG Export)
- jsPDF (PDF Export)
```

### **Datenmodell:**
```typescript
interface FloorPlan {
  id: string
  project_id: string
  site_id: string
  name: string
  image_url: string              // Supabase Storage
  image_width: number             // Original width
  image_height: number            // Original height
  scale_meters_per_pixel: number  // z.B. 0.01 (1px = 1cm)
  scale_reference_length: number  // Referenzlänge in Metern
  created_at: timestamp
  updated_at: timestamp
}

interface CameraPlacement {
  id: string
  floor_plan_id: string
  camera_type: 'dome_fixed' | 'dome_vario' | 'bullet_fixed' | 'bullet_vario' | 'ptz' | 'thermal'
  x: number                       // Position in Pixel
  y: number                       // Position in Pixel
  rotation: number                // Rotation in Grad (0-360)
  detection_range: number         // Reichweite in Metern
  detection_angle: number         // Öffnungswinkel in Grad (z.B. 90°)
  label: string                   // z.B. "Eingang Haupttür"
  color: string                   // Farbe für Visualisierung
  mount_type: 'wall' | 'ceiling' | 'pole'
  mount_height: number            // Montagehöhe in Metern
  created_at: timestamp
}
```

---

## 📐 **UI/UX DESIGN:**

### **Schritt 1: Grundriss hochladen**
```
┌─────────────────────────────────────────────────────────┐
│  Standort: Hauptgebäude                          [⚙️]   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📁 Grundriss hochladen                                 │
│  ┌──────────────────────────────────────────────────┐   │
│  │                                                   │   │
│  │     📐 Drag & Drop oder klicken                  │   │
│  │                                                   │   │
│  │     Unterstützte Formate: PNG, JPG, PDF         │   │
│  │                                                   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ✅ Grundriss_EG.png hochgeladen (2.3 MB)              │
│                                                          │
│  📏 Maßstab definieren:                                 │
│  ┌──────────────────────────────────────────────────┐   │
│  │  1. Linie auf bekannte Länge ziehen             │   │
│  │  2. Echte Länge eingeben: [____] Meter          │   │
│  │  3. Maßstab berechnen ✓                         │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  [Weiter zum Editor] ──────────────────────────────────>│
└─────────────────────────────────────────────────────────┘
```

### **Schritt 2: Kamera-Placement Editor**
```
┌─────────────────────────────────────────────────────────────────────┐
│  📐 Floor Plan Editor - Hauptgebäude EG                   [💾] [📤] │
├──────────────┬──────────────────────────────────────────────────────┤
│              │                                                       │
│  🎥 KAMERAS  │           [Grundriss-Bild hier]                      │
│              │                                                       │
│  📹 Dome     │         🔴 ← Kamera 1 (Dome)                        │
│    Fixed     │              \  Detektionsbereich                    │
│  [Hinzufügen]│               \                                      │
│              │                \____________________________          │
│  📹 Dome     │                                                       │
│    Vario     │                                                       │
│  [Hinzufügen]│         🔴 ← Kamera 2 (Bullet)                      │
│              │         |                                            │
│  🔫 Bullet   │         |___________                                 │
│    Fixed     │              \                                       │
│  [Hinzufügen]│               \___________________________           │
│              │                                                       │
│  🔫 Bullet   │                                                       │
│    Vario     │         🔵 ← PTZ (360°)                             │
│  [Hinzufügen]│         ⭕ 360° Coverage                            │
│              │                                                       │
│  🎬 PTZ      │                                                       │
│  [Hinzufügen]│                                                       │
│              │                                                       │
│  🔥 Thermal  │                                                       │
│  [Hinzufügen]│                                                       │
│              │                                                       │
├──────────────┤                                                       │
│              │                                                       │
│  📋 LEGENDE  │                                                       │
│              │                                                       │
│  🔴 Dome     │                                                       │
│  🔫 Bullet   │                                                       │
│  🔵 PTZ      │                                                       │
│  🔥 Thermal  │                                                       │
│              │                                                       │
│  ━━━ Wand    │                                                       │
│  ┈┈┈ Tür     │                                                       │
│              │                                                       │
└──────────────┴───────────────────────────────────────────────────────┘
```

### **Schritt 3: Kamera-Einstellungen (bei Klick auf Kamera)**
```
┌─────────────────────────────────────────────────────────┐
│  🎥 Kamera bearbeiten                            [X]    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Bezeichnung:                                           │
│  [Eingang Haupttür________________]                     │
│                                                          │
│  Typ:                                                   │
│  [Bullet Vario ▼]                                       │
│                                                          │
│  Montageart:                                            │
│  [Wand ▼] Decke / Mast                                 │
│                                                          │
│  Montagehöhe:                                           │
│  [3.5] Meter                                            │
│                                                          │
│  Detektionsreichweite:                                  │
│  [────────●──────] 15m                                  │
│  (basierend auf Objektiv & Auflösung)                  │
│                                                          │
│  Detektionswinkel:                                      │
│  [──────●────────] 90°                                  │
│                                                          │
│  Rotation:                                              │
│  [────●──────────] 45°                                  │
│                                                          │
│  Farbe:                                                 │
│  🔴 🟠 🟡 🟢 🔵 🟣                                       │
│                                                          │
│  [Löschen]           [Abbrechen]  [Speichern]          │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 **FEATURES:**

### **MVP (Phase 2.3):**
- ✅ Grundriss-Upload (PNG, JPG)
- ✅ Kamera-Icons per Drag & Drop platzieren
- ✅ Detektionsbereich als Trichter/Kegel visualisieren
- ✅ Rotation der Kameras (Drag am Griff)
- ✅ Maßstab-Definition
- ✅ Speichern in Supabase
- ✅ Export als PNG

### **Nice-to-Have (Phase 2.4):**
- 📐 Zeichnen-Tools (Linien, Kreise, Texte)
- 📏 Entfernungsmessung
- 🎨 Layer-System (Grundriss, Kameras, Notizen)
- 🔍 Zoom & Pan
- 📤 Export als PDF mit Legende
- 🎯 Blind-Spot Detection (automatisch)
- 📊 Coverage-Heatmap (welche Bereiche sind abgedeckt?)

### **Advanced (Phase 3):**
- 🤖 AI-Vorschläge (optimale Kamera-Positionen)
- 📐 3D-View (Three.js)
- 🎥 Simulated Camera-View (wie sieht die Kamera?)
- 📊 DORI-Analyse (Detection, Observation, Recognition, Identification)
- 🔄 Live-Sync (mehrere User gleichzeitig)

---

## 🗂️ **DATEISTRUKTUR:**

```
pages/
  configurator/
    [projectId]/
      floor-plan.tsx              ← Neuer Floor Plan Editor

components/
  FloorPlanEditor/
    Canvas.tsx                    ← Konva Canvas Component
    CameraIcon.tsx                ← Kamera-Icons
    DetectionCone.tsx             ← Detektionsbereich-Visualisierung
    Toolbar.tsx                   ← Kamera-Auswahl Sidebar
    ScaleDialog.tsx               ← Maßstab-Definition
    CameraSettingsModal.tsx       ← Kamera-Einstellungen
    ExportDialog.tsx              ← Export-Optionen

lib/
  floorPlanHelpers.ts             ← Berechnungen (Reichweite, Coverage)
  cameraSpecs.ts                  ← Kamera-Spezifikationen (Winkel, Range)

supabase/
  migrations/
    add_floor_plans.sql           ← Floor Plan Tables
    add_camera_placements.sql     ← Camera Placement Table

types.ts
  ← FloorPlan, CameraPlacement Interfaces
```

---

## 📊 **IMPLEMENTIERUNGS-SCHRITTE:**

### **Schritt 1: Datenbank-Setup (30min)**
```sql
CREATE TABLE public.floor_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  image_width INT NOT NULL,
  image_height INT NOT NULL,
  scale_meters_per_pixel FLOAT DEFAULT 0.01,
  scale_reference_length FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.camera_placements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  floor_plan_id UUID NOT NULL REFERENCES public.floor_plans(id) ON DELETE CASCADE,
  camera_type TEXT NOT NULL,
  x INT NOT NULL,
  y INT NOT NULL,
  rotation FLOAT DEFAULT 0,
  detection_range FLOAT DEFAULT 10,
  detection_angle FLOAT DEFAULT 90,
  label TEXT,
  color TEXT DEFAULT '#FF0000',
  mount_type TEXT DEFAULT 'wall',
  mount_height FLOAT DEFAULT 3.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies (ähnlich wie bei projects)
```

### **Schritt 2: Image Upload (Supabase Storage) (1h)**
```typescript
// lib/floorPlanUpload.ts
export async function uploadFloorPlan(
  file: File,
  projectId: string
): Promise<string> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${projectId}/${Date.now()}.${fileExt}`
  
  const { data, error } = await supabase.storage
    .from('floor-plans')
    .upload(fileName, file)
  
  if (error) throw error
  
  const { data: { publicUrl } } = supabase.storage
    .from('floor-plans')
    .getPublicUrl(fileName)
  
  return publicUrl
}
```

### **Schritt 3: Konva Canvas Setup (2h)**
```typescript
// components/FloorPlanEditor/Canvas.tsx
import { Stage, Layer, Image as KonvaImage, Line, Circle } from 'react-konva'

export const FloorPlanCanvas = ({ floorPlan, cameras, onCameraMove }) => {
  return (
    <Stage width={window.innerWidth * 0.8} height={window.innerHeight * 0.8}>
      <Layer>
        {/* Floor Plan Image */}
        <KonvaImage image={floorPlanImage} />
        
        {/* Camera Placements */}
        {cameras.map(camera => (
          <CameraWithCone
            key={camera.id}
            camera={camera}
            onDragEnd={onCameraMove}
          />
        ))}
      </Layer>
    </Stage>
  )
}
```

### **Schritt 4: Detection Cone Visualization (2h)**
```typescript
// components/FloorPlanEditor/DetectionCone.tsx
export const DetectionCone = ({ camera, scale }) => {
  const rangeInPixels = camera.detection_range / scale
  const angleRad = (camera.detection_angle * Math.PI) / 180
  
  // Calculate cone points
  const points = [
    camera.x, camera.y,
    camera.x + rangeInPixels * Math.cos(camera.rotation - angleRad/2),
    camera.y + rangeInPixels * Math.sin(camera.rotation - angleRad/2),
    // ... more points for smooth cone
  ]
  
  return (
    <Line
      points={points}
      fill={camera.color}
      opacity={0.3}
      closed
    />
  )
}
```

### **Schritt 5: Camera Specs Database (1h)**
```typescript
// lib/cameraSpecs.ts
export const CAMERA_SPECS = {
  dome_fixed: {
    detection_range: 15, // meters
    detection_angle: 90, // degrees
    icon: '📹',
    color: '#FF0000'
  },
  bullet_vario: {
    detection_range: 30,
    detection_angle: 60,
    icon: '🔫',
    color: '#00FF00'
  },
  ptz: {
    detection_range: 50,
    detection_angle: 360,
    icon: '🔵',
    color: '#0000FF'
  }
  // ...
}
```

### **Schritt 6: Export (PNG/PDF) (2h)**
```typescript
// lib/floorPlanExport.ts
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export async function exportAsPNG(stageRef: any) {
  const uri = stageRef.current.toDataURL()
  const link = document.createElement('a')
  link.download = 'floor-plan.png'
  link.href = uri
  link.click()
}

export async function exportAsPDF(stageRef: any, floorPlan: FloorPlan) {
  const uri = stageRef.current.toDataURL()
  const pdf = new jsPDF()
  pdf.addImage(uri, 'PNG', 10, 10, 190, 140)
  pdf.text('Kamera-Platzierung: ' + floorPlan.name, 10, 160)
  pdf.save('floor-plan.pdf')
}
```

---

## ⏱️ **ZEITPLAN:**

```
Phase 2.3.1 - Setup & Grundfunktionen (4-5h)
├─ Datenbank-Tabellen (30min)
├─ Supabase Storage Setup (30min)
├─ Konva Integration (1h)
├─ Image Upload UI (1h)
├─ Basic Canvas mit Drag & Drop (2h)

Phase 2.3.2 - Detection Visualization (3-4h)
├─ Detection Cone Berechnung (1h)
├─ Detection Cone Rendering (1h)
├─ Camera Specs Integration (1h)
├─ Rotation Controls (1h)

Phase 2.3.3 - Scale & Measurements (2-3h)
├─ Scale Definition UI (1h)
├─ Scale Berechnung (1h)
├─ Range/Angle basierend auf Scale (1h)

Phase 2.3.4 - Save & Export (2-3h)
├─ Save to Supabase (1h)
├─ Load from Supabase (1h)
├─ PNG Export (30min)
├─ PDF Export mit Legende (30min)

Phase 2.3.5 - Polish & Testing (2-3h)
├─ UI/UX Improvements (1h)
├─ Responsive Design (1h)
├─ Testing & Bugfixes (1h)

GESAMT: 13-18 Stunden (2-3 Arbeitstage)
```

---

## 📦 **DEPENDENCIES:**

```bash
npm install react-konva konva
npm install react-dropzone
npm install html2canvas
npm install jspdf
```

---

## 🎯 **SUCCESS CRITERIA:**

- ✅ Admin kann Grundriss hochladen
- ✅ Admin kann Kameras per Drag & Drop platzieren
- ✅ Detektionsbereiche werden als Trichter angezeigt
- ✅ Maßstab ist definierbar
- ✅ Alles wird in Supabase gespeichert
- ✅ Export als PNG funktioniert
- ✅ Integriert in bestehenden Konfigurator
- ✅ Responsive & Mobile-friendly

---

## 💡 **ERWEITERUNGEN FÜR PHASE 3:**

### **1. AI-Powered Placement Suggestions**
```typescript
// Analyze floor plan and suggest optimal camera positions
suggestCameraPlacement(floorPlan, requirements)
  .then(suggestions => {
    suggestions.forEach(pos => {
      placeCameraIcon(pos.x, pos.y, pos.type)
    })
  })
```

### **2. Coverage Heatmap**
```typescript
// Visualize coverage quality
generateCoverageHeatmap(cameras, floorPlan)
  .then(heatmap => {
    renderHeatmap(heatmap) // Red = no coverage, Green = good coverage
  })
```

### **3. DORI Analysis**
```typescript
// Detection, Observation, Recognition, Identification zones
calculateDORIZones(camera, mountHeight, sensorSize)
  .then(zones => {
    renderDORILayers(zones) // 4 different colored zones
  })
```

### **4. 3D View**
```typescript
// Switch to 3D view with Three.js
render3DFloorPlan(floorPlan, cameras)
  .enableWalkthrough() // Virtual camera walkthrough
```

---

## 🚀 **NEXT STEPS:**

1. **Dependencies installieren**
2. **Datenbank-Migration ausführen**
3. **Konva Canvas Setup**
4. **Image Upload implementieren**
5. **Drag & Drop für Kameras**
6. **Detection Cone Visualisierung**
7. **Export-Funktionalität**
8. **Testing & Polish**

---

**Ready to implement!** 🎯🏗️

**Estimated Total Time:** 13-18 Stunden (2-3 Arbeitstage)  
**Priority:** 🔥 HIGH - Nächste Priorität nach Rules System

---

**Ende der Floor Plan Planner Dokumentation** 🚀
