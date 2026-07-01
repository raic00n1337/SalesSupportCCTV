# DORI-Zonen Visualisierung Guide

**Ziel:** Statt einem einfachen Detection-Cone 4 konzentrische Zonen visualisieren (wie CCTV Design Tool)

---

## 🎨 Was sind DORI-Zonen?

**DORI** = **D**etect, **O**bserve, **R**ecognize, **I**dentify

Standard: **EN 62676-4** / **IPVM Pixel Density Standards**

### Die 4 Zonen:

| Zone | Bedeutung | PPM* | Farbe | Beispiel |
|------|-----------|------|-------|----------|
| **Identify** | Person eindeutig identifizieren | 250 | Dunkelgrün | Gesicht erkennen |
| **Recognize** | Person wiedererkennen | 125 | Grün | "Das ist die Person von gestern" |
| **Observe** | Merkmale erkennen | 62 | Gelb | Kleidung, Größe |
| **Detect** | Bewegung/Präsenz feststellen | 25 | Orange/Rot | "Da ist jemand" |

*PPM = Pixels Per Meter

---

## 📐 Berechnung

### Beispiel: Hikvision 4MP Dome (2.8mm)

```typescript
import { calculateCameraPerformance } from '../lib/cameraCalculations'

const result = calculateCameraPerformance({
  focalLengthMm: 2.8,
  sensorSize: '1/2.8"',
  horizontalResolution: 2560,
  verticalResolution: 1440,
  mountHeightM: 3.0,
  tiltAngle: 15
})

console.log(result.dori)
// {
//   detectM: 65.3,      // Äußerste Zone (rot)
//   observeM: 26.3,     // Zone 3 (gelb)
//   recognizeM: 13.1,   // Zone 2 (grün)
//   identifyM: 6.5      // Innerste Zone (dunkelgrün)
// }
```

---

## 🎨 Konva.js Implementation

### Option A: Konzentrische Kreise (Einfach)

```typescript
// In components/SystemDesignerCanvas.tsx

import { calculateCameraPerformance } from '../lib/cameraCalculations'

// ...

{placement.show_detection_cone && (() => {
  // Berechne DORI für diese Kamera
  const cameraPerf = calculateCameraPerformance({
    focalLengthMm: placement.focal_length_mm,
    sensorSize: placement.sensor_size || '1/2.8"',
    horizontalResolution: placement.horizontal_resolution || 1920,
    verticalResolution: placement.vertical_resolution || 1080,
    mountHeightM: placement.mount_height_m || 3.0,
    tiltAngle: placement.tilt_angle || 15
  })
  
  const scale = design.scale_pixels_per_meter || 100
  
  return (
    <>
      {/* DETECT - Äußerste Zone (Orange/Rot) */}
      <Circle
        x={placement.position_x}
        y={placement.position_y}
        radius={cameraPerf.dori.detectM * scale}
        fill="#ef4444"
        opacity={0.1}
        listening={false}
      />
      
      {/* OBSERVE - Zone 3 (Gelb) */}
      <Circle
        x={placement.position_x}
        y={placement.position_y}
        radius={cameraPerf.dori.observeM * scale}
        fill="#f59e0b"
        opacity={0.15}
        listening={false}
      />
      
      {/* RECOGNIZE - Zone 2 (Grün) */}
      <Circle
        x={placement.position_x}
        y={placement.position_y}
        radius={cameraPerf.dori.recognizeM * scale}
        fill="#10b981"
        opacity={0.2}
        listening={false}
      />
      
      {/* IDENTIFY - Innerste Zone (Dunkelgrün) */}
      <Circle
        x={placement.position_x}
        y={placement.position_y}
        radius={cameraPerf.dori.identifyM * scale}
        fill="#059669"
        opacity={0.3}
        listening={false}
      />
    </>
  )
})()}
```

**Vorteile:**
- ✅ Einfach zu implementieren
- ✅ Performance-optimiert
- ✅ Wie CCTV Design Tool

**Nachteile:**
- ⚠️ Berücksichtigt keine Kamera-Rotation
- ⚠️ Keine FOV-Kontur (runde statt konische Zonen)

---

### Option B: FOV-Kegel mit DORI-Segmenten (Fortgeschritten)

```typescript
{placement.show_detection_cone && (() => {
  const cameraPerf = calculateCameraPerformance({ /* ... */ })
  const scale = design.scale_pixels_per_meter || 100
  const rotation = placement.rotation || 0
  const fov = cameraPerf.fov.horizontalFOV
  
  // Helper: Kegel-Punkte generieren
  const generateConePoints = (radiusM: number, fovDeg: number, rotationDeg: number) => {
    const angleStart = rotationDeg - fovDeg / 2
    const angleEnd = rotationDeg + fovDeg / 2
    const points = [placement.position_x, placement.position_y] // Start am Kamera-Punkt
    
    // Bogen zeichnen
    for (let angle = angleStart; angle <= angleEnd; angle += 5) {
      const rad = (angle * Math.PI) / 180
      points.push(
        placement.position_x + Math.cos(rad) * radiusM * scale,
        placement.position_y + Math.sin(rad) * radiusM * scale
      )
    }
    
    points.push(placement.position_x, placement.position_y) // Zurück zum Start
    return points
  }
  
  return (
    <>
      {/* DETECT Kegel */}
      <Shape
        sceneFunc={(context, shape) => {
          context.beginPath()
          const points = generateConePoints(cameraPerf.dori.detectM, fov, rotation)
          context.moveTo(points[0], points[1])
          for (let i = 2; i < points.length; i += 2) {
            context.lineTo(points[i], points[i + 1])
          }
          context.closePath()
          context.fillStrokeShape(shape)
        }}
        fill="#ef4444"
        opacity={0.1}
        listening={false}
      />
      
      {/* ... weitere Zonen analog */}
    </>
  )
})()}
```

**Vorteile:**
- ✅ Realistischere Darstellung
- ✅ Berücksichtigt FOV und Rotation
- ✅ Professioneller Look

**Nachteile:**
- ⚠️ Komplexer Code
- ⚠️ Minimal schlechtere Performance

---

## 🎨 Farbschema

### Empfohlene Farben (Tailwind-inspiriert):

```typescript
const DORI_COLORS = {
  identify: {
    fill: '#059669',    // emerald-600
    stroke: '#047857',  // emerald-700
    opacity: 0.3
  },
  recognize: {
    fill: '#10b981',    // emerald-500
    stroke: '#059669',  // emerald-600
    opacity: 0.2
  },
  observe: {
    fill: '#f59e0b',    // amber-500
    stroke: '#d97706',  // amber-600
    opacity: 0.15
  },
  detect: {
    fill: '#ef4444',    // red-500
    stroke: '#dc2626',  // red-600
    opacity: 0.1
  }
}
```

### Alternative (Wie CCTV Design Tool):

```typescript
const DORI_COLORS_ALT = {
  identify: '#00ff00',  // Hellgrün
  recognize: '#ffff00', // Gelb
  observe: '#ffa500',   // Orange
  detect: '#ff0000'     // Rot
}
```

---

## 🔧 TypeScript Interface erweitern

```typescript
// In types.ts

export interface CameraPlacement {
  // ... bestehende Felder
  
  // Neue Felder für DORI/FOV
  sensor_size?: string              // z.B. '1/2.8"'
  horizontal_resolution?: number    // z.B. 1920
  vertical_resolution?: number      // z.B. 1080
  mount_height_m?: number           // z.B. 3.0
  tilt_angle?: number               // z.B. 15
  
  // Optional: Pre-computed DORI (falls aus DB)
  dori_detect_m?: number
  dori_observe_m?: number
  dori_recognize_m?: number
  dori_identify_m?: number
}
```

---

## 📊 UI Controls

### DORI-Zonen Toggle

```tsx
// In [projectId].tsx oder CameraConfigPanel

<div className="space-y-2">
  <label className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={selectedPlacement?.show_detection_cone}
      onChange={(e) => updatePlacement(selectedPlacement.id, {
        show_detection_cone: e.target.checked
      })}
    />
    <span>DORI-Zonen anzeigen</span>
  </label>
  
  {selectedPlacement?.show_detection_cone && (
    <div className="pl-6 space-y-1 text-sm">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-emerald-600 opacity-30 rounded" />
        <span>Identify: {selectedPlacement.dori_identify_m}m</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-emerald-500 opacity-20 rounded" />
        <span>Recognize: {selectedPlacement.dori_recognize_m}m</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-amber-500 opacity-15 rounded" />
        <span>Observe: {selectedPlacement.dori_observe_m}m</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-red-500 opacity-10 rounded" />
        <span>Detect: {selectedPlacement.dori_detect_m}m</span>
      </div>
    </div>
  )}
</div>
```

---

## 🚀 Quick Start (Morgen)

### 1. SQL Migration ausführen
```bash
# In Supabase SQL Editor
# File: supabase/migrations/add_camera_specs.sql
```

### 2. Calculation Library importieren
```typescript
import { calculateCameraPerformance } from '../lib/cameraCalculations'
```

### 3. SystemDesignerCanvas.tsx updaten
- Alte `Circle` für Detection Cone ersetzen
- 4 konzentrische `Circle` für DORI einfügen
- Farben und Opazität anpassen

### 4. Testen!
- Kamera platzieren
- DORI-Zonen sollten automatisch erscheinen
- Verschiedene Brennweiten ausprobieren (2.8mm vs. 12mm)

---

## 📈 Performance-Tipps

1. **`listening={false}`** bei allen DORI-Shapes → nicht interaktiv
2. **`perfectDrawEnabled={false}`** bei Stage → schnelleres Rendering
3. **Shapes cachen** wenn möglich
4. **Lazy Calculation:** Nur berechnen wenn `show_detection_cone === true`

---

## 🎯 Erwartetes Ergebnis

Nach Implementierung:
- ✅ 4 farbige konzentrische Zonen statt 1 Kegel
- ✅ Realistische DORI-Distanzen basierend auf Kamera-Specs
- ✅ Automatische Berechnung aus Brennweite + Sensor + Auflösung
- ✅ Legende/Labels für bessere Verständlichkeit
- ✅ Toggle zum Ein/Ausblenden

**Sieht dann aus wie:** [CCTV Design Tool](https://cctvdesigntool.com/) Screenshots! 🎨

---

**Viel Erfolg bei der Implementierung!** 💪
