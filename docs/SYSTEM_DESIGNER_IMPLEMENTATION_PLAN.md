# System Designer - Detaillierter Implementierungsplan
## Ziel: Feature-Parität mit CCTV Design Tool

**Erstellt:** 2026-01-15  
**Referenz:** Screenshot + [CCTV Design Tool Docs](https://docs.cctvdesigntool.com/)  
**Status:** Comprehensive Rebuild Plan

---

## 📊 ANALYSE: CCTV Design Tool (Screenshot)

### Was wir im Screenshot sehen:

#### 1. **Linke Sidebar (Tool-Panel)** ☰
- Icon-basierte Navigation
- Vertikal angeordnet
- ~10-12 verschiedene Tools:
  - ☰ Menu/Navigation
  - ➕ Add Object
  - ⭐ Camera
  - ✏️ Edit/Draw
  - 🌙 Night Mode
  - 📄 Layers
  - 💰 Pricing
  - 🔧 Settings
  - 💬 Comments
  - ⚙️ Preferences
  - 👤 User

**Farben:** Dunkles UI (Navy/Charcoal), Icons in Weiß/Cyan

---

#### 2. **Canvas/Hauptbereich** 🖼️
- **Luftbild-Grundriss** (realistisch, nicht Bauplan)
- **Kamera-Icons:** Nummerierte Kreise (1️⃣, 2️⃣, 3️⃣, 4️⃣)
- **FOV-Wedges:** Konische Bereiche in verschiedenen Farben
  - Rot (🔴)
  - Gelb/Gold (🟡)
  - Pink/Magenta (🩷)
- **Netzwerk-Geräte als Icons:**
  - 🔵 Main Router
  - 🟣 Office PC
  - 🟡 NVR
  - 🟤 Office Switch
  - 📡 Wireless Bridge
- **Verbindungslinien:** Farbig zwischen Geräten
  - Pink, Rot, Cyan, Gelb
- **Labels:** Schwarzer Text auf weißem Hintergrund
- **Bäume:** Grüne Kreise als Hindernisse
- **Gebäude:** Farbige Polygone (Rot, Grau, Orange)

---

#### 3. **Bottom Toolbar** 🛠️
Von links nach rechts:
- 🏠 Fit to Screen
- 📚 Layers Toggle
- 📏 Measure Tool
- ↶ Undo
- ↷ Redo
- ➖ Zoom Out
- 92% Zoom Level Display
- ➕ Zoom In
- ❓ Help

**Design:** Weiße Toolbar, abgerundete Buttons, minimalistisch

---

#### 4. **Rechte Sidebar (Chat/Comments)** 💬
- Orange Button (💬)
- Minimiert/Expandierbar

---

## 🎯 KERNFEATURES (aus Screenshot & Docs)

### ✅ **Was wir HABEN:**
1. Grundriss-Upload ✅
2. Kamera-Platzierung ✅
3. Basic Detection Circle ✅
4. Multi-Floor Support ✅
5. Drag & Drop ✅
6. Auto-Import ✅

### 🚀 **Was wir BRAUCHEN:**

| Feature | Priorität | Zeitaufwand | Status |
|---------|-----------|-------------|--------|
| **1. FOV Wedges** (statt Circles) | ⭐⭐⭐ | 2 Tage | 📝 Geplant |
| **2. Layers Panel** | ⭐⭐⭐ | 2 Tage | ❌ Fehlt |
| **3. Netzwerk-Geräte** (Router, Switch, NVR) | ⭐⭐⭐ | 3 Tage | ❌ Fehlt |
| **4. Verbindungslinien** (Connections) | ⭐⭐⭐ | 2 Tage | ❌ Fehlt |
| **5. Scale Calibration** (PPM) | ⭐⭐ | 1 Tag | 📝 Geplant |
| **6. Tool Sidebar** (linke Seite) | ⭐⭐ | 2 Tage | ❌ Fehlt |
| **7. Bottom Toolbar** (Zoom, Undo, Layers) | ⭐⭐ | 1 Tag | ⚠️ Teilweise |
| **8. Hindernisse** (Bäume, Wände) | ⭐ | 1 Tag | ❌ Fehlt |
| **9. Labels** (für alle Objekte) | ⭐⭐ | 1 Tag | ⚠️ Nur Kameras |
| **10. Export** (PDF/JPG) | ⭐⭐ | 1 Tag | ❌ Fehlt |
| **11. Measure Tool** | ⭐ | 1 Tag | ❌ Fehlt |
| **12. Night Mode** | ⭐ | 0.5 Tag | ❌ Fehlt |

**TOTAL:** ~17-18 Tage für Full Feature-Parität

---

## 🏗️ NEUE ARCHITEKTUR

### Aktuelle Struktur (MVP):
```
pages/system-designer/[projectId].tsx (772 Zeilen)
├── SystemDesignerCanvas.tsx
└── types.ts
```

### Ziel-Struktur (CCTV Design Tool Style):
```
pages/system-designer/[projectId].tsx (Main Page - 200 Zeilen)
├── components/system-designer/
│   ├── layout/
│   │   ├── ToolSidebar.tsx           // Linke Icon-Sidebar
│   │   ├── PropertiesSidebar.tsx     // Rechte Eigenschaften
│   │   ├── BottomToolbar.tsx         // Zoom, Undo, Layers
│   │   └── LayersPanel.tsx           // Floating Layer Toggle
│   │
│   ├── canvas/
│   │   ├── CanvasStage.tsx           // Haupt-Konva Stage
│   │   ├── FloorImageLayer.tsx       // Grundriss-Bild
│   │   ├── ObjectsLayer.tsx          // Kameras, Geräte, etc.
│   │   ├── ConnectionsLayer.tsx      // Netzwerk-Verbindungen
│   │   ├── LabelsLayer.tsx           // Text-Labels
│   │   └── GridLayer.tsx             // Optional: Grid Overlay
│   │
│   ├── objects/
│   │   ├── Camera.tsx                // Kamera-Objekt (Circle + FOV Wedge)
│   │   ├── NetworkDevice.tsx         // Router, Switch, NVR
│   │   ├── Obstacle.tsx              // Bäume, Wände
│   │   └── Label.tsx                 // Text-Label
│   │
│   ├── tools/
│   │   ├── SelectTool.tsx            // Auswahl & Verschieben
│   │   ├── PanTool.tsx               // Pan & Zoom
│   │   ├── MeasureTool.tsx           // 2-Punkt Messung
│   │   ├── DrawTool.tsx              // Wände/Hindernisse zeichnen
│   │   └── ConnectionTool.tsx        // Verbindungen erstellen
│   │
│   ├── panels/
│   │   ├── CameraProperties.tsx      // Kamera-Einstellungen
│   │   ├── DeviceProperties.tsx      // Netzwerk-Geräte
│   │   ├── ExportPanel.tsx           // PDF/JPG Export
│   │   └── CalibrationPanel.tsx      // Maßstab-Kalibrierung
│   │
│   └── lib/
│       ├── canvas-engine.ts          // Core Konva Logic
│       ├── fov-calculator.ts         // FOV Wedge Berechnung
│       ├── connection-manager.ts     // Verbindungen verwalten
│       ├── export-utils.ts           // PDF/JPG Export
│       └── persistence.ts            // Supabase API Wrapper
│
├── types/
│   ├── canvas.types.ts               // Canvas-spezifische Types
│   ├── objects.types.ts              // Objekt Types
│   └── tools.types.ts                // Tool Types
│
└── hooks/
    ├── useCanvasState.ts             // Canvas State Management
    ├── useToolMode.ts                // Aktives Tool
    ├── useLayerVisibility.ts         // Layer Toggle
    └── useObjectSelection.ts         // Selektion verwalten
```

**Total:** ~25 Dateien (gut strukturiert, wartbar)

---

## 🗄️ DATENBANK-REFACTORING

### Aktuelle Struktur:
```sql
system_designs (
  id, project_id, name, floor_number, 
  image_url, scale_pixels_per_meter, ...
)

camera_placements (
  id, system_design_id, camera_type, 
  position_x, position_y, rotation, ...
)
```

### Neue Struktur (Generisch):

```sql
-- 1. FLOORS (Multi-Floor mit Meta-Daten)
CREATE TABLE design_floors (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- "Erdgeschoss", "OG", etc.
  floor_number INT DEFAULT 0, -- 0=EG, 1=OG, -1=UG
  image_url TEXT,
  image_width INT,
  image_height INT,
  
  -- Scale Calibration
  pixels_per_meter FLOAT DEFAULT 100,
  calibration_reference_length_m FLOAT,
  calibration_reference_px FLOAT,
  calibration_point1_x FLOAT,
  calibration_point1_y FLOAT,
  calibration_point2_x FLOAT,
  calibration_point2_y FLOAT,
  
  -- View State
  canvas_zoom FLOAT DEFAULT 1.0,
  canvas_pan_x FLOAT DEFAULT 0,
  canvas_pan_y FLOAT DEFAULT 0,
  
  -- Layer Visibility State (JSONB)
  layer_visibility JSONB DEFAULT '{
    "floor_image": true,
    "cameras": true,
    "devices": true,
    "fov": true,
    "connections": true,
    "obstacles": true,
    "labels": true,
    "grid": false
  }'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. OBJECTS (Generisch für alle Objekt-Typen)
CREATE TABLE design_objects (
  id UUID PRIMARY KEY,
  floor_id UUID REFERENCES design_floors(id) ON DELETE CASCADE,
  
  -- Object Type
  object_type TEXT NOT NULL, -- 'camera', 'router', 'switch', 'nvr', 'obstacle', 'label', 'shape'
  object_subtype TEXT, -- 'dome_fixed', 'bullet_vario', 'tree', 'wall', etc.
  
  -- Position & Transform
  position_x FLOAT NOT NULL,
  position_y FLOAT NOT NULL,
  rotation FLOAT DEFAULT 0, -- in Grad
  scale_x FLOAT DEFAULT 1.0,
  scale_y FLOAT DEFAULT 1.0,
  
  -- Common Properties
  name TEXT,
  label TEXT,
  color TEXT DEFAULT '#3b82f6',
  icon TEXT, -- Emoji oder Icon-Name
  
  -- Product Reference (optional)
  product_id UUID REFERENCES products(id),
  
  -- Type-Specific Properties (JSONB für Flexibilität)
  properties JSONB DEFAULT '{}'::jsonb,
  -- Beispiele:
  -- Camera: { "focal_length_mm": 2.8, "fov_degrees": 93.4, "mount_height_m": 3.0, "tilt_angle": 15, "dori": {...} }
  -- Router: { "model": "Ubiquiti Dream Machine", "ports": 8, "ip": "192.168.1.1" }
  -- Obstacle: { "obstacle_type": "tree", "radius": 5, "height": 10 }
  -- Label: { "text": "Main Entrance", "font_size": 14, "background": "#ffffff" }
  
  -- Display Properties
  show_label BOOLEAN DEFAULT true,
  show_fov BOOLEAN DEFAULT true, -- Nur für Kameras
  fov_opacity FLOAT DEFAULT 0.3,
  
  -- Layer Assignment
  layer TEXT DEFAULT 'cameras', -- 'cameras', 'devices', 'obstacles', 'labels'
  
  -- Z-Index (für Rendering-Reihenfolge)
  z_index INT DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CONNECTIONS (Netzwerk-Verbindungen, Kabel-Routen)
CREATE TABLE design_connections (
  id UUID PRIMARY KEY,
  floor_id UUID REFERENCES design_floors(id) ON DELETE CASCADE,
  
  -- Verbindung zwischen zwei Objekten
  from_object_id UUID REFERENCES design_objects(id) ON DELETE CASCADE,
  to_object_id UUID REFERENCES design_objects(id) ON DELETE CASCADE,
  
  -- Connection Type
  connection_type TEXT NOT NULL, -- 'ethernet', 'fiber', 'wireless', 'power', 'alarm'
  
  -- Visual Properties
  color TEXT DEFAULT '#3b82f6',
  line_width FLOAT DEFAULT 2,
  line_style TEXT DEFAULT 'solid', -- 'solid', 'dashed', 'dotted'
  
  -- Route (für komplexe Routen mit Waypoints)
  route_points JSONB, -- Array von {x, y} Punkten
  
  -- Connection Properties (JSONB)
  properties JSONB DEFAULT '{}'::jsonb,
  -- Beispiele:
  -- { "cable_type": "Cat6", "length_m": 50, "bandwidth": "1Gbps" }
  -- { "wireless_standard": "WiFi 6", "frequency": "5GHz" }
  
  -- Display
  show_label BOOLEAN DEFAULT true,
  label TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. NETWORKS (Optional: IP-Plan Integration)
CREATE TABLE design_networks (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL, -- "Main Network", "Guest WiFi"
  network_address TEXT, -- "192.168.1.0/24"
  gateway TEXT, -- "192.168.1.1"
  vlan_id INT,
  
  properties JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. IP ALLOCATIONS (Optional)
CREATE TABLE design_ip_allocations (
  id UUID PRIMARY KEY,
  network_id UUID REFERENCES design_networks(id) ON DELETE CASCADE,
  object_id UUID REFERENCES design_objects(id) ON DELETE CASCADE,
  
  ip_address TEXT NOT NULL,
  hostname TEXT,
  mac_address TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_design_floors_project ON design_floors(project_id);
CREATE INDEX idx_design_objects_floor ON design_objects(floor_id);
CREATE INDEX idx_design_objects_type ON design_objects(object_type);
CREATE INDEX idx_design_objects_layer ON design_objects(layer);
CREATE INDEX idx_design_connections_floor ON design_connections(floor_id);
CREATE INDEX idx_design_connections_from ON design_connections(from_object_id);
CREATE INDEX idx_design_connections_to ON design_connections(to_object_id);
```

---

## 📝 TYPESCRIPT TYPES

```typescript
// types/canvas.types.ts

export interface DesignFloor {
  id: string
  project_id: string
  name: string
  floor_number: number
  image_url?: string
  image_width?: number
  image_height?: number
  pixels_per_meter: number
  calibration_reference_length_m?: number
  calibration_reference_px?: number
  calibration_point1_x?: number
  calibration_point1_y?: number
  calibration_point2_x?: number
  calibration_point2_y?: number
  canvas_zoom: number
  canvas_pan_x: number
  canvas_pan_y: number
  layer_visibility: LayerVisibility
  created_at?: string
  updated_at?: string
}

export interface LayerVisibility {
  floor_image: boolean
  cameras: boolean
  devices: boolean
  fov: boolean
  connections: boolean
  obstacles: boolean
  labels: boolean
  grid: boolean
}

export interface DesignObject {
  id: string
  floor_id: string
  object_type: ObjectType
  object_subtype?: string
  position_x: number
  position_y: number
  rotation: number
  scale_x: number
  scale_y: number
  name?: string
  label?: string
  color: string
  icon?: string
  product_id?: string
  properties: Record<string, any>
  show_label: boolean
  show_fov: boolean
  fov_opacity: number
  layer: LayerType
  z_index: number
  created_at?: string
  updated_at?: string
}

export type ObjectType = 
  | 'camera' 
  | 'router' 
  | 'switch' 
  | 'nvr' 
  | 'access_point'
  | 'obstacle' 
  | 'label' 
  | 'shape'
  | 'measurement'

export type LayerType = 
  | 'cameras' 
  | 'devices' 
  | 'obstacles' 
  | 'labels' 
  | 'measurements'

export interface CameraProperties {
  focal_length_mm: number
  fov_degrees: number
  mount_height_m: number
  tilt_angle: number
  sensor_size: string
  resolution_h: number
  resolution_v: number
  dori: DORIDistances
}

export interface DeviceProperties {
  device_model?: string
  ip_address?: string
  mac_address?: string
  ports?: number
  poe_budget?: number
}

export interface ObstacleProperties {
  obstacle_type: 'tree' | 'wall' | 'building' | 'vehicle'
  radius?: number
  height?: number
  width?: number
  depth?: number
}

export interface DesignConnection {
  id: string
  floor_id: string
  from_object_id: string
  to_object_id: string
  connection_type: ConnectionType
  color: string
  line_width: number
  line_style: 'solid' | 'dashed' | 'dotted'
  route_points?: { x: number; y: number }[]
  properties: Record<string, any>
  show_label: boolean
  label?: string
  created_at?: string
  updated_at?: string
}

export type ConnectionType = 
  | 'ethernet' 
  | 'fiber' 
  | 'wireless' 
  | 'power' 
  | 'alarm'

export interface ToolMode {
  active: ToolType
  options?: Record<string, any>
}

export type ToolType = 
  | 'select' 
  | 'pan' 
  | 'camera' 
  | 'device' 
  | 'obstacle'
  | 'connection' 
  | 'measure' 
  | 'draw' 
  | 'label'

export interface CanvasState {
  floors: DesignFloor[]
  currentFloorId: string | null
  objects: DesignObject[]
  connections: DesignConnection[]
  selectedObjectIds: string[]
  toolMode: ToolMode
  layerVisibility: LayerVisibility
  zoom: number
  pan: { x: number; y: number }
}
```

---

## 🎨 UI/UX DESIGN-SPEZIFIKATION

### Farbschema (CCTV Design Tool Style):

```typescript
// theme.ts
export const designerTheme = {
  colors: {
    // Sidebar & Background
    sidebar: '#1a202c',          // Dark Navy
    sidebarHover: '#2d3748',     // Lighter Navy
    sidebarActive: '#3182ce',    // Blue Accent
    
    // Canvas
    canvasBackground: '#f7fafc', // Light Gray
    canvasGrid: '#e2e8f0',       // Grid Lines
    
    // Objects
    cameraDefault: '#ef4444',    // Red
    cameraSelected: '#3b82f6',   // Blue
    deviceRouter: '#3b82f6',     // Blue
    deviceSwitch: '#8b5cf6',     // Purple
    deviceNVR: '#eab308',        // Yellow
    obstacle: '#10b981',         // Green
    
    // FOV Wedges
    fovRed: 'rgba(239, 68, 68, 0.3)',
    fovYellow: 'rgba(234, 179, 8, 0.3)',
    fovPink: 'rgba(236, 72, 153, 0.3)',
    fovCyan: 'rgba(6, 182, 212, 0.3)',
    
    // Connections
    connectionEthernet: '#3b82f6', // Blue
    connectionFiber: '#06b6d4',    // Cyan
    connectionWireless: '#ec4899', // Pink
    connectionPower: '#ef4444',    // Red
    
    // UI Elements
    toolbarBg: '#ffffff',
    toolbarBorder: '#e5e7eb',
    buttonPrimary: '#3b82f6',
    buttonHover: '#2563eb',
    textPrimary: '#1f2937',
    textSecondary: '#6b7280',
  },
  
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    label: {
      fontSize: 12,
      fontWeight: 500,
      lineHeight: 1.4,
    },
    heading: {
      fontSize: 16,
      fontWeight: 600,
    },
  },
  
  spacing: {
    sidebarWidth: 60,
    propertiesSidebarWidth: 320,
    toolbarHeight: 60,
    panelPadding: 16,
  },
  
  borderRadius: {
    small: 4,
    medium: 8,
    large: 12,
  },
}
```

### Icon-Set (Linke Sidebar):

```typescript
// components/system-designer/layout/ToolSidebar.tsx
export const TOOLS = [
  { id: 'select', icon: '☰', label: 'Menu' },
  { id: 'add', icon: '➕', label: 'Add Object' },
  { id: 'camera', icon: '⭐', label: 'Camera' },
  { id: 'draw', icon: '✏️', label: 'Draw' },
  { id: 'night', icon: '🌙', label: 'Night Mode' },
  { id: 'layers', icon: '📄', label: 'Layers' },
  { id: 'network', icon: '🔗', label: 'Network' },
  { id: 'pricing', icon: '💰', label: 'Pricing' },
  { id: 'settings', icon: '🔧', label: 'Settings' },
  { id: 'comments', icon: '💬', label: 'Comments' },
  { id: 'preferences', icon: '⚙️', label: 'Preferences' },
  { id: 'user', icon: '👤', label: 'User' },
]
```

---

## 🚀 IMPLEMENTIERUNGSPLAN (Phasen)

### **PHASE 1: Datenbank & Types** (2 Tage)

#### Tag 1: DB-Refactoring
- [ ] SQL Migration schreiben (`add_design_objects.sql`)
- [ ] Neue Tabellen erstellen (`design_floors`, `design_objects`, `design_connections`)
- [ ] Data Migration: `camera_placements` → `design_objects`
- [ ] RLS Policies für neue Tabellen
- [ ] Indexes erstellen

#### Tag 2: TypeScript Types
- [ ] `types/canvas.types.ts` erstellen
- [ ] `types/objects.types.ts` erstellen
- [ ] `types/tools.types.ts` erstellen
- [ ] Alte Types deprecaten (aber nicht löschen)

**Deliverables:**
- ✅ `supabase/migrations/add_design_objects.sql`
- ✅ `types/*.types.ts`
- ✅ Data migration completed

---

### **PHASE 2: Core Architecture** (3 Tage)

#### Tag 3: Canvas Engine
- [ ] `lib/canvas-engine.ts` erstellen
  - Pan & Zoom Logic
  - Object Selection
  - Coordinate Transforms (screen ↔ canvas)
  - Layer Management
- [ ] `hooks/useCanvasState.ts`
- [ ] `hooks/useToolMode.ts`

#### Tag 4: Canvas Komponenten
- [ ] `components/canvas/CanvasStage.tsx`
- [ ] `components/canvas/FloorImageLayer.tsx`
- [ ] `components/canvas/ObjectsLayer.tsx`
- [ ] `components/canvas/ConnectionsLayer.tsx`
- [ ] `components/canvas/LabelsLayer.tsx`

#### Tag 5: Layout Komponenten
- [ ] `components/layout/ToolSidebar.tsx`
- [ ] `components/layout/PropertiesSidebar.tsx`
- [ ] `components/layout/BottomToolbar.tsx`
- [ ] `components/layout/LayersPanel.tsx`

**Deliverables:**
- ✅ Canvas Engine funktioniert
- ✅ Pan & Zoom implementiert
- ✅ UI Layout steht

---

### **PHASE 3: Object System** (3 Tage)

#### Tag 6: Camera Objects
- [ ] `components/objects/Camera.tsx`
- [ ] FOV Wedge Berechnung (`lib/fov-calculator.ts`)
- [ ] DORI Zones im Wedge
- [ ] Camera Properties Panel

#### Tag 7: Network Devices
- [ ] `components/objects/NetworkDevice.tsx`
- [ ] Icons für Router, Switch, NVR, Access Point
- [ ] Device Properties Panel
- [ ] Auto-Layout für Geräte

#### Tag 8: Obstacles & Labels
- [ ] `components/objects/Obstacle.tsx`
- [ ] `components/objects/Label.tsx`
- [ ] Drawing Tools für Wände
- [ ] Text-Label Tool

**Deliverables:**
- ✅ Alle Objekt-Typen funktionieren
- ✅ FOV Wedges statt Circles
- ✅ DORI Zones visualisiert

---

### **PHASE 4: Connections** (2 Tage)

#### Tag 9: Connection System
- [ ] `lib/connection-manager.ts`
- [ ] `components/objects/Connection.tsx`
- [ ] Connection Tool (Drag from A to B)
- [ ] Auto-Routing (Pathfinding)

#### Tag 10: Connection Properties
- [ ] Line Styles (solid, dashed, dotted)
- [ ] Colors per Connection Type
- [ ] Connection Labels
- [ ] Edit Waypoints

**Deliverables:**
- ✅ Verbindungen zwischen Objekten
- ✅ Auto-Routing funktioniert
- ✅ Verschiedene Connection Types

---

### **PHASE 5: Tools & Features** (3 Tage)

#### Tag 11: Scale Calibration
- [ ] 2-Point Measure Tool
- [ ] PPM Calculator
- [ ] Calibration UI Panel
- [ ] PPM Indicator Display

#### Tag 12: Layers & Visibility
- [ ] Layer Toggle Implementation
- [ ] Show/Hide per Layer
- [ ] Layer State Persistence
- [ ] Layer Icons & UI

#### Tag 13: Measure & Draw
- [ ] Measure Tool (Distanzmessung)
- [ ] Draw Tool (Wände, Polygone)
- [ ] Grid Overlay (optional)
- [ ] Snap-to-Grid

**Deliverables:**
- ✅ Scale Calibration funktioniert
- ✅ Layers togglebar
- ✅ Measure Tool implementiert

---

### **PHASE 6: Export & Polish** (2 Tage)

#### Tag 14: Export
- [ ] `lib/export-utils.ts`
- [ ] PDF Export (jsPDF + Konva)
- [ ] JPG Export (`stage.toDataURL()`)
- [ ] Export Panel UI
- [ ] Multi-Floor Export

#### Tag 15: Polish & Testing
- [ ] UI/UX-Verbesserungen
- [ ] Performance-Optimierung
- [ ] Keyboard Shortcuts
- [ ] Undo/Redo Stack
- [ ] Help Tooltips

**Deliverables:**
- ✅ Export funktioniert (PDF + JPG)
- ✅ Alle Features getestet
- ✅ Performance optimiert

---

### **TOTAL: 15 Tage (3 Wochen)**

---

## 📐 TECHNISCHE DETAILS

### 1. FOV Wedge Berechnung

```typescript
// lib/fov-calculator.ts

export function calculateFOVWedge(
  position: { x: number; y: number },
  rotation: number,          // in Grad
  fovDegrees: number,        // Horizontal FOV
  range: number,             // in Metern
  pixelsPerMeter: number
): { points: number[] } {
  const startAngle = (rotation - fovDegrees / 2) * (Math.PI / 180)
  const endAngle = (rotation + fovDegrees / 2) * (Math.PI / 180)
  const radiusPixels = range * pixelsPerMeter
  
  // Create wedge shape
  const points = [
    position.x, position.y, // Center point (camera)
  ]
  
  // Arc points (30 segments for smooth curve)
  for (let i = 0; i <= 30; i++) {
    const angle = startAngle + (endAngle - startAngle) * (i / 30)
    points.push(
      position.x + Math.cos(angle) * radiusPixels,
      position.y + Math.sin(angle) * radiusPixels
    )
  }
  
  // Close the wedge
  points.push(position.x, position.y)
  
  return { points }
}

export function calculateDORIWedges(
  position: { x: number; y: number },
  rotation: number,
  fovDegrees: number,
  dori: DORIDistances,
  pixelsPerMeter: number
): {
  identify: number[]
  recognize: number[]
  observe: number[]
  detect: number[]
} {
  return {
    identify: calculateFOVWedge(position, rotation, fovDegrees, dori.identifyM, pixelsPerMeter).points,
    recognize: calculateFOVWedge(position, rotation, fovDegrees, dori.recognizeM, pixelsPerMeter).points,
    observe: calculateFOVWedge(position, rotation, fovDegrees, dori.observeM, pixelsPerMeter).points,
    detect: calculateFOVWedge(position, rotation, fovDegrees, dori.detectM, pixelsPerMeter).points,
  }
}
```

**Rendering:**
```typescript
// components/objects/Camera.tsx
<Group>
  {/* DORI Wedges (von außen nach innen) */}
  {showFOV && (
    <>
      <Line
        points={doriWedges.detect}
        fill="rgba(239, 68, 68, 0.1)"
        closed
      />
      <Line
        points={doriWedges.observe}
        fill="rgba(234, 179, 8, 0.15)"
        closed
      />
      <Line
        points={doriWedges.recognize}
        fill="rgba(16, 185, 129, 0.2)"
        closed
      />
      <Line
        points={doriWedges.identify}
        fill="rgba(5, 150, 105, 0.3)"
        closed
      />
    </>
  )}
  
  {/* Camera Icon */}
  <Circle
    x={position.x}
    y={position.y}
    radius={20}
    fill={isSelected ? '#3b82f6' : color}
    stroke="#ffffff"
    strokeWidth={2}
  />
  
  {/* Camera Number */}
  <Text
    x={position.x - 10}
    y={position.y - 8}
    text={cameraNumber.toString()}
    fontSize={16}
    fontWeight="bold"
    fill="#ffffff"
  />
  
  {/* Label */}
  {showLabel && (
    <Label x={position.x} y={position.y + 30}>
      <Tag fill="#ffffff" stroke="#1f2937" strokeWidth={1} cornerRadius={4} />
      <Text
        text={label}
        fontSize={12}
        padding={4}
        fill="#1f2937"
      />
    </Label>
  )}
</Group>
```

---

### 2. Connection Auto-Routing

```typescript
// lib/connection-manager.ts

export function calculateConnectionPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  obstacles: DesignObject[],
  routingStyle: 'direct' | 'orthogonal' | 'smart' = 'smart'
): { x: number; y: number }[] {
  if (routingStyle === 'direct') {
    return [from, to]
  }
  
  if (routingStyle === 'orthogonal') {
    // Right-angle routing
    const midX = (from.x + to.x) / 2
    return [
      from,
      { x: midX, y: from.y },
      { x: midX, y: to.y },
      to
    ]
  }
  
  // Smart routing with obstacle avoidance (A* algorithm)
  return calculateSmartPath(from, to, obstacles)
}

function calculateSmartPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  obstacles: DesignObject[]
): { x: number; y: number }[] {
  // Simplified A* pathfinding
  // In production, use a library like pathfinding.js
  
  // For MVP, use orthogonal routing
  return calculateConnectionPath(from, to, obstacles, 'orthogonal')
}
```

---

### 3. Layer Visibility Management

```typescript
// hooks/useLayerVisibility.ts

export function useLayerVisibility(floorId: string) {
  const [visibility, setVisibility] = useState<LayerVisibility>({
    floor_image: true,
    cameras: true,
    devices: true,
    fov: true,
    connections: true,
    obstacles: true,
    labels: true,
    grid: false,
  })
  
  // Load from DB
  useEffect(() => {
    const loadVisibility = async () => {
      const { data } = await supabase
        .from('design_floors')
        .select('layer_visibility')
        .eq('id', floorId)
        .single()
      
      if (data?.layer_visibility) {
        setVisibility(data.layer_visibility)
      }
    }
    
    loadVisibility()
  }, [floorId])
  
  // Save to DB (debounced)
  const saveVisibility = useDebouncedCallback(
    async (newVisibility: LayerVisibility) => {
      await supabase
        .from('design_floors')
        .update({ layer_visibility: newVisibility })
        .eq('id', floorId)
    },
    1000
  )
  
  const toggleLayer = (layer: keyof LayerVisibility) => {
    const newVisibility = {
      ...visibility,
      [layer]: !visibility[layer]
    }
    setVisibility(newVisibility)
    saveVisibility(newVisibility)
  }
  
  return { visibility, toggleLayer }
}
```

**UI Component:**
```typescript
// components/layout/LayersPanel.tsx
export function LayersPanel() {
  const { visibility, toggleLayer } = useLayerVisibility(currentFloorId)
  
  return (
    <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 w-64">
      <h3 className="font-semibold mb-3">Layers</h3>
      <div className="space-y-2">
        {Object.entries(visibility).map(([layer, isVisible]) => (
          <label key={layer} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isVisible}
              onChange={() => toggleLayer(layer as keyof LayerVisibility)}
              className="w-4 h-4"
            />
            <span className="capitalize">{layer.replace('_', ' ')}</span>
            <div className={`ml-auto w-3 h-3 rounded-full ${getLayerColor(layer)}`} />
          </label>
        ))}
      </div>
    </div>
  )
}
```

---

### 4. Export Implementation

```typescript
// lib/export-utils.ts
import jsPDF from 'jspdf'

export async function exportToPDF(
  stage: Konva.Stage,
  floors: DesignFloor[],
  selectedFloorIds: string[]
): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  })
  
  for (let i = 0; i < selectedFloorIds.length; i++) {
    const floorId = selectedFloorIds[i]
    const floor = floors.find(f => f.id === floorId)
    
    if (!floor) continue
    
    // Add new page (except first)
    if (i > 0) {
      pdf.addPage()
    }
    
    // Add title
    pdf.setFontSize(16)
    pdf.text(floor.name, 10, 10)
    
    // Render Konva stage to image
    const dataURL = stage.toDataURL({
      pixelRatio: 2,
      mimeType: 'image/jpeg',
      quality: 0.95
    })
    
    // Add image to PDF
    pdf.addImage(dataURL, 'JPEG', 10, 20, 277, 170)
    
    // Add legend/metadata
    pdf.setFontSize(10)
    pdf.text(`Scale: ${floor.pixels_per_meter} px/m`, 10, 195)
    pdf.text(`Created: ${new Date().toLocaleDateString()}`, 10, 200)
  }
  
  return pdf.output('blob')
}

export function exportToJPG(
  stage: Konva.Stage,
  options: {
    pixelRatio?: number
    quality?: number
  } = {}
): string {
  return stage.toDataURL({
    pixelRatio: options.pixelRatio || 2,
    mimeType: 'image/jpeg',
    quality: options.quality || 0.95
  })
}
```

---

## ✅ MIGRATIONS-CHECKLIST

### Pre-Migration:
- [ ] Backup aktuelle DB (besonders `system_designs`, `camera_placements`)
- [ ] Export aller aktuellen Projekte als JSON
- [ ] Liste aller affected User IDs

### Migration:
- [ ] SQL Migration ausführen (`add_design_objects.sql`)
- [ ] Data Migration Script:
  ```sql
  -- Migrate system_designs → design_floors
  INSERT INTO design_floors (
    id, project_id, name, floor_number, image_url, 
    pixels_per_meter, canvas_zoom, canvas_pan_x, canvas_pan_y
  )
  SELECT 
    id, project_id, name, floor_number, image_url,
    scale_pixels_per_meter, canvas_zoom, canvas_pan_x, canvas_pan_y
  FROM system_designs;
  
  -- Migrate camera_placements → design_objects
  INSERT INTO design_objects (
    id, floor_id, object_type, object_subtype,
    position_x, position_y, rotation, color,
    properties, show_fov, fov_opacity, layer
  )
  SELECT
    id,
    system_design_id,
    'camera',
    camera_type,
    position_x,
    position_y,
    rotation,
    cone_color,
    jsonb_build_object(
      'focal_length_mm', focal_length_mm,
      'fov_degrees', field_of_view,
      'detection_range_m', detection_range_m
    ),
    show_detection_cone,
    cone_opacity,
    'cameras'
  FROM camera_placements;
  ```

### Post-Migration:
- [ ] Verify data integrity
- [ ] Test auf Dev-Environment
- [ ] Update alle API Routes
- [ ] Update Frontend Components
- [ ] Deprecate alte Tables (nicht löschen!)

---

## 📊 TIMELINE & RESOURCES

### Zeitplan:
- **PHASE 1:** 2 Tage (DB + Types)
- **PHASE 2:** 3 Tage (Core Architecture)
- **PHASE 3:** 3 Tage (Objects)
- **PHASE 4:** 2 Tage (Connections)
- **PHASE 5:** 3 Tage (Tools & Features)
- **PHASE 6:** 2 Tage (Export & Polish)

**TOTAL: 15 Werktage (3 Wochen)**

### Ressourcen:
- **1 Senior Frontend Dev** (React/TypeScript/Konva)
- **0.5 Backend Dev** (Supabase/SQL Support)
- **0.25 Designer** (UI/UX Review)

### Budget (grobe Schätzung):
- Senior Dev: 15 Tage × €500/Tag = €7,500
- Backend Support: 7.5 Tage × €400/Tag = €3,000
- Designer: 3.75 Tage × €300/Tag = €1,125

**TOTAL: ~€11,625** für komplettes Refactoring

---

## 🎯 SUCCESS METRICS

Nach Implementierung sollten wir haben:

### Funktional:
- ✅ FOV Wedges statt Circles
- ✅ DORI Zones innerhalb Wedges
- ✅ Netzwerk-Geräte (Router, Switch, NVR)
- ✅ Verbindungslinien (Auto-Routing)
- ✅ Layers Panel (Toggle Visibility)
- ✅ Scale Calibration (2-Point Measure)
- ✅ Export (PDF/JPG, Multi-Floor)
- ✅ Measure Tool
- ✅ Draw Tool (Obstacles)

### Performance:
- ✅ < 100ms Render-Zeit (bei < 100 Objekten)
- ✅ 60 FPS Pan & Zoom
- ✅ < 5s PDF Export (3 Floors)

### UX:
- ✅ Intuitive Icon-basierte Sidebar
- ✅ Keyboard Shortcuts funktionieren
- ✅ Undo/Redo Stack (10 Steps)
- ✅ Tooltips für alle Tools
- ✅ Responsive Layout

---

## 📞 NEXT STEPS

### Für dich (Product Owner):
1. **Review diesen Plan** - Feedback zu Prioritäten?
2. **Budget freigeben** - OK mit ~€12k?
3. **Timeline bestätigen** - 3 Wochen realistisch?
4. **Externe Dev briefen** - Mit diesem Dokument?

### Für externen Entwickler:
1. **Setup** - Repo clonen, Dependencies installieren
2. **Onboarding** - Aktuelle Codebase verstehen
3. **Phase 1 starten** - DB-Refactoring
4. **Wöchentliche Reviews** - Progress-Meetings

### Für mich (AI-Assistent):
1. **Support** - Fragen beantworten während Implementierung
2. **Code-Review** - Hilfe bei TypeScript/Konva-Problemen
3. **Testing** - Features gemeinsam testen

---

**Bereit zum Start?** 🚀

Sag mir Bescheid ob:
- A) **Plan approved** → Ich helfe dem externen Dev beim Onboarding
- B) **Änderungen nötig** → Was soll angepasst werden?
- C) **Schrittweise Umsetzung** → Erst FOV/DORI, dann Rest?
