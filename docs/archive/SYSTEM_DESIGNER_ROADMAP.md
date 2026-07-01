# System Designer - Roadmap zu CCTV Design Tool Level

**Ziel:** Feature-Parität mit [CCTV Design Tool](https://cctvdesigntool.com/)  
**Status:** MVP vorhanden, erweiterte Features erforderlich  
**Erstellt:** 2026-01-14

---

## 📊 IST-Zustand (MVP)

### ✅ Funktioniert bereits:
- [x] Grundriss-Upload (Drag & Drop)
- [x] Kamera-Icons (Emoji-basiert: 🎥📹🔄🌡️)
- [x] Kamera-Platzierung (Klick auf Grundriss)
- [x] Drag & Drop zum Verschieben
- [x] Basic Detection Cones (manuell konfigurierbar)
- [x] Kamera-Beschriftungen
- [x] Delete-Funktion für Grundrisse
- [x] Rotation und Reichweite per Slider
- [x] Supabase-Integration (DB + Storage)
- [x] Auto-Import aus Konfigurator (implementiert, noch nicht getestet)

### ⚠️ Bekannte Probleme:
- [ ] Sync mit Konfigurator funktioniert noch nicht
- [ ] FOV ist nicht realistisch (statisch 90°)
- [ ] Detection Range ist nicht sensor-spezifisch
- [ ] Icons sind zu klein für professionelle Präsentationen
- [ ] Keine Kamera-Datenbank mit Specs

---

## 🎯 SOLL-Zustand (Feature-Parität)

### Priority 1: FOV & Detection Zones (KRITISCH)

**Problem:** Aktuell hat jede Kamera statisch 90° FOV und 30m Range.  
**Lösung:** Realistische Berechnung basierend auf Kamera-Specs.

#### 1.1 Kamera-Datenbank erweitern

**Tabelle:** `configurator_products` (bereits vorhanden)

**Neue Felder hinzufügen:**
```sql
ALTER TABLE public.configurator_products ADD COLUMN IF NOT EXISTS
  -- Optische Specs
  focal_length_min FLOAT,           -- Brennweite min (z.B. 2.8mm)
  focal_length_max FLOAT,           -- Brennweite max (z.B. 12mm) für Vario
  sensor_size TEXT,                 -- '1/2.8"', '1/1.8"', etc.
  sensor_width_mm FLOAT,            -- Sensor-Breite in mm
  sensor_height_mm FLOAT,           -- Sensor-Höhe in mm
  
  -- Performance Specs
  ir_range_m FLOAT,                 -- IR-Reichweite in Metern
  
  -- DORI Distances (berechnet oder manuell)
  dori_detect_m FLOAT,              -- Detection-Reichweite
  dori_observe_m FLOAT,             -- Observation-Reichweite
  dori_recognize_m FLOAT,           -- Recognition-Reichweite
  dori_identify_m FLOAT,            -- Identification-Reichweite
  
  -- Montage
  default_mount_height_m FLOAT DEFAULT 3.0,  -- Standard-Montagehöhe
  default_tilt_angle FLOAT DEFAULT 15.0;     -- Standard-Neigung (Grad)
```

**Admin UI:** Erweitere `/admin/configurator-products` um diese Felder.

#### 1.2 FOV-Berechnung implementieren

**Formel (Horizontal FOV):**
```typescript
FOV_h = 2 × arctan(sensor_width / (2 × focal_length))
```

**Beispiel:**
- Sensor: 1/2.8" (4.8mm breit)
- Brennweite: 2.8mm
- FOV_h = 2 × arctan(4.8 / (2 × 2.8)) ≈ 93°

**Datei:** `lib/cameraCalculations.ts` (neu erstellen)

```typescript
// Sensor-Größen (Standard-Werte)
const SENSOR_SIZES: Record<string, { width: number; height: number }> = {
  '1/2.8"': { width: 4.8, height: 3.6 },
  '1/1.8"': { width: 7.2, height: 5.4 },
  '1/3"': { width: 3.6, height: 2.7 },
  // ... mehr Größen
}

export function calculateFOV(
  focalLength: number,        // in mm
  sensorSize: string,         // z.B. '1/2.8"'
  mountHeight: number = 3,    // in Metern
  tiltAngle: number = 15      // in Grad
): {
  horizontalFOV: number       // in Grad
  verticalFOV: number         // in Grad
  groundCoverageWidth: number // in Metern
  groundCoverageLength: number // in Metern
} {
  const sensor = SENSOR_SIZES[sensorSize] || SENSOR_SIZES['1/2.8"']
  
  // Horizontal FOV
  const fovH = 2 * Math.atan(sensor.width / (2 * focalLength)) * (180 / Math.PI)
  
  // Vertical FOV
  const fovV = 2 * Math.atan(sensor.height / (2 * focalLength)) * (180 / Math.PI)
  
  // Ground coverage (vereinfachte Berechnung)
  const tiltRad = (tiltAngle * Math.PI) / 180
  const coverageLength = mountHeight / Math.tan(tiltRad)
  const coverageWidth = 2 * coverageLength * Math.tan((fovH * Math.PI) / 360)
  
  return {
    horizontalFOV: fovH,
    verticalFOV: fovV,
    groundCoverageWidth: coverageWidth,
    groundCoverageLength: coverageLength
  }
}
```

#### 1.3 DORI-Zonen visualisieren

**4 konzentrische Zonen** statt einem Kegel:

```typescript
// In SystemDesignerCanvas.tsx
{placement.show_detection_cone && (
  <>
    {/* IDENTIFY - Innerste Zone (Dunkelgrün) */}
    <Circle
      x={placement.position_x}
      y={placement.position_y}
      radius={placement.dori_identify_m * scale}
      fill="#059669"
      opacity={0.3}
    />
    
    {/* RECOGNIZE - Zone 2 (Grün) */}
    <Circle
      x={placement.position_x}
      y={placement.position_y}
      radius={placement.dori_recognize_m * scale}
      fill="#10b981"
      opacity={0.2}
    />
    
    {/* OBSERVE - Zone 3 (Gelb) */}
    <Circle
      x={placement.position_x}
      y={placement.position_y}
      radius={placement.dori_observe_m * scale}
      fill="#f59e0b"
      opacity={0.15}
    />
    
    {/* DETECT - Äußerste Zone (Orange) */}
    <Circle
      x={placement.position_x}
      y={placement.position_y}
      radius={placement.dori_detect_m * scale}
      fill="#ef4444"
      opacity={0.1}
    />
  </>
)}
```

**DORI-Berechnung:**
```typescript
// Basierend auf PPM (Pixels Per Meter) Standard
// IPVM Standard: Identify=250 PPM, Recognize=125 PPM, Observe=62 PPM, Detect=25 PPM

export function calculateDORI(
  horizontalResolution: number,  // z.B. 1920
  horizontalFOV: number,          // in Grad
  distance: number                // Entfernung in Metern
): {
  detect: number
  observe: number
  recognize: number
  identify: number
} {
  // Breite des Sichtfelds bei gegebener Distanz
  const widthAtDistance = 2 * distance * Math.tan((horizontalFOV * Math.PI) / 360)
  
  // PPM bei dieser Distanz
  const ppm = horizontalResolution / widthAtDistance
  
  return {
    detect: distance * (ppm / 25),      // 25 PPM für Detection
    observe: distance * (ppm / 62),     // 62 PPM für Observation
    recognize: distance * (ppm / 125),  // 125 PPM für Recognition
    identify: distance * (ppm / 250)    // 250 PPM für Identification
  }
}
```

---

### Priority 2: Konfigurator-Sync (WICHTIG)

**Problem:** Kameras werden einmal importiert, aber Updates aus Konfigurator werden nicht übernommen.

**Lösung:** Real-time Sync via Supabase Realtime oder "Refresh"-Button.

#### 2.1 Refresh-Button (Quick Win)

```typescript
// In [projectId].tsx
const handleRefreshFromConfigurator = async () => {
  if (!project || !currentDesign) return
  
  // Bestehende Placements löschen
  const placementIds = currentDesign.placements?.map(p => p.id) || []
  for (const id of placementIds) {
    await fetch(`/api/system-designer/placements?id=${id}`, { method: 'DELETE' })
  }
  
  // Neu importieren
  await importCamerasFromConfigurator(project, currentDesign.id)
  
  // UI aktualisieren
  const res = await fetch(`/api/system-designer/designs?design_id=${currentDesign.id}`)
  const data = await res.json()
  setCurrentDesign(data.design)
}
```

**UI:**
```tsx
<button
  onClick={handleRefreshFromConfigurator}
  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg"
>
  🔄 Kameras neu laden
</button>
```

#### 2.2 Supabase Realtime (Advanced)

```typescript
// Subscribe to project changes
useEffect(() => {
  if (!projectId) return
  
  const subscription = supabase
    .channel('project-changes')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'projects',
      filter: `id=eq.${projectId}`
    }, (payload) => {
      console.log('Project updated:', payload)
      // Auto-refresh cameras
      handleRefreshFromConfigurator()
    })
    .subscribe()
  
  return () => {
    subscription.unsubscribe()
  }
}, [projectId])
```

---

### Priority 3: Maßstab-Kalibrierung (WICHTIG)

**Problem:** Aktuell ist der Maßstab statisch (100px = 1m).  
**CCTV Design Tool** hat ein Kalibrierungs-Tool.

**Lösung:** Zwei-Punkt-Kalibrierung.

#### 3.1 UI für Kalibrierung

```tsx
// State
const [calibrationMode, setCalibrationMode] = useState(false)
const [calibrationPoints, setCalibrationPoints] = useState<{x: number, y: number}[]>([])
const [calibrationDistanceM, setCalibrationDistanceM] = useState<number>(10)

// Button in UI
<button onClick={() => setCalibrationMode(true)}>
  📏 Maßstab kalibrieren
</button>

// Modal
{calibrationMode && (
  <div className="modal">
    <p>1. Klicke zwei Punkte auf dem Grundriss, deren Abstand du kennst</p>
    <p>2. Gib den Abstand ein</p>
    <input 
      type="number" 
      value={calibrationDistanceM}
      onChange={(e) => setCalibrationDistanceM(parseFloat(e.target.value))}
      placeholder="Abstand in Metern"
    />
    <button onClick={handleCalibrationComplete}>Fertig</button>
  </div>
)}
```

#### 3.2 Berechnung

```typescript
const handleCalibrationComplete = () => {
  if (calibrationPoints.length !== 2) return
  
  const [p1, p2] = calibrationPoints
  const pixelDistance = Math.sqrt(
    Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
  )
  
  const pixelsPerMeter = pixelDistance / calibrationDistanceM
  
  // Update design in DB
  updateDesign(currentDesign.id, {
    scale_pixels_per_meter: pixelsPerMeter,
    scale_reference_length_m: calibrationDistanceM,
    scale_reference_px: pixelDistance
  })
  
  setCalibrationMode(false)
  setCalibrationPoints([])
}
```

---

### Priority 4: Night Preview (NICE-TO-HAVE)

**Lösung:** Toggle zwischen Tag/Nacht-Ansicht.

```tsx
const [nightMode, setNightMode] = useState(false)

// In Canvas
<Stage>
  <Layer opacity={nightMode ? 0.3 : 1}>
    <KonvaImage image={floorPlanImage} />
  </Layer>
  
  {nightMode && (
    <Layer>
      {placements.map(p => (
        // IR-Reichweite als hellerer Kreis
        <Circle
          x={p.position_x}
          y={p.position_y}
          radius={p.ir_range_m * scale}
          fill="#ffffff"
          opacity={0.2}
        />
      ))}
    </Layer>
  )}
</Stage>
```

---

### Priority 5: Professionelle Icons (NICE-TO-HAVE)

**Problem:** Emojis sind nicht ideal für Präsentationen.

**Lösung:**
1. **SVG Icons** statt Emojis
2. **React-Icons** Library verwenden
3. Oder: **Custom SVGs** für jede Kamera-Art

```typescript
import { FiCamera, FiVideo, FiRotateCw } from 'react-icons/fi'

// In Konva: SVG als Image laden
const [domeIcon] = useImage('/icons/dome-camera.svg')
const [bulletIcon] = useImage('/icons/bullet-camera.svg')

<KonvaImage 
  image={placement.camera_type.includes('dome') ? domeIcon : bulletIcon}
  x={placement.position_x}
  y={placement.position_y}
  width={32}
  height={32}
/>
```

---

## 🗓️ Implementierungs-Reihenfolge

### Phase 1: Grundlagen (1-2 Tage)
1. ✅ Kamera-Datenbank erweitern (SQL Migration)
2. ✅ `lib/cameraCalculations.ts` erstellen
3. ✅ Admin UI für Camera Specs erweitern
4. ✅ FOV-Berechnung in Camera Placements integrieren

### Phase 2: Visualisierung (1 Tag)
1. ✅ DORI-Zonen statt einfacher Kegel
2. ✅ Bessere Detection Cone Berechnung
3. ✅ FOV-basierte Cone-Darstellung

### Phase 3: Sync & Kalibrierung (1 Tag)
1. ✅ Refresh-Button für Konfigurator-Sync
2. ✅ Maßstab-Kalibrierung Tool
3. ✅ Auto-Import verbessern

### Phase 4: Polish (0.5 Tag)
1. ✅ Night Preview Toggle
2. ✅ Bessere Icons (SVG)
3. ✅ UI/UX Verbesserungen

**Total: 3.5-4.5 Tage Entwicklungszeit**

---

## 📐 Technische Details

### Neue Dependencies

```json
{
  "dependencies": {
    "react-icons": "^5.0.0",  // Für bessere Icons
    "konva": "^9.2.0"          // Bereits vorhanden
  }
}
```

### Neue Files

```
lib/
  cameraCalculations.ts      - FOV, DORI, Sensor-Berechnungen
  sensorDatabase.ts          - Sensor-Größen Datenbank

components/
  CalibrationTool.tsx        - Maßstab-Kalibrierung UI
  CameraConfigPanel.tsx      - Erweiterte Kamera-Einstellungen
  DORILegend.tsx            - Legende für DORI-Zonen

supabase/migrations/
  add_camera_specs.sql       - Erweiterte Felder für Kameras
```

---

## 🎯 Success Metrics

Nach Implementierung sollten wir:
- ✅ Realistische FOV-Darstellung haben
- ✅ DORI-Zonen visualisieren können
- ✅ Sync mit Konfigurator funktioniert
- ✅ Kalibrierungs-Tool vorhanden
- ✅ Night Preview Toggle
- ✅ Professionelle Icons

**Feature-Parität mit CCTV Design Tool: ~80%**  
(Fehlende 20%: Netzwerk-Diagramme, PDF-Export, erweiterte Reports)

---

## 💡 Weitere Ideen (Backlog)

- [ ] **Multi-Floor Support:** Mehrere Stockwerke pro Projekt
- [ ] **Netzwerk-Visualisierung:** Switches, NVR, Kabel-Routing
- [ ] **PDF-Export:** Automatische Report-Generierung
- [ ] **3D-Preview:** Optional 3D-Ansicht der Szene
- [ ] **Kollaborations-Features:** Mehrere User gleichzeitig
- [ ] **Mobile App:** Native iOS/Android App
- [ ] **AI-Assistent:** Vorschläge für optimale Platzierung
- [ ] **Video-Simulation:** "Walk-through" der Kamera-Perspektiven

---

## 📚 Referenzen

- [CCTV Design Tool](https://cctvdesigntool.com/)
- [IPVM Camera Calculator](https://calculator.ipvm.com/)
- [FOV Calculator Formula](https://www.scantips.com/lights/fieldofview.html)
- [DORI Standard (EN 62676-4)](https://en.wikipedia.org/wiki/EN_62676-4)

---

**Erstellt:** 2026-01-14  
**Letzte Änderung:** 2026-01-14  
**Status:** 🟡 In Planung
