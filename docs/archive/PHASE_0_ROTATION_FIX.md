# Phase 0: Rotation & FOV Fix - Implementation Guide

**Status:** 🔴 BLOCKER  
**Priorität:** Höchste  
**Zeitaufwand:** 1 Tag  
**Developer:** AI + Rico

---

## 🎯 PROBLEM

Aktuell:
- ❌ Rotation von Kameras wird nicht zuverlässig gerendert
- ❌ FOV rotiert nicht mit der Kamera
- ❌ Nach Reload springt Rotation zurück
- ❌ Drag resettet manchmal Rotation

**Grund:** Konva Group nicht korrekt verwendet, Rotation nicht im State

---

## ✅ LÖSUNG (Schritt für Schritt)

### Schritt 1: Konva Group Setup

**Aktuell (SystemDesignerCanvas.tsx):**
```typescript
// PROBLEM: Jedes Element separat, keine gemeinsame Rotation
<Circle x={x} y={y} radius={20} />
<Circle x={x} y={y} radius={range} fill="red" opacity={0.3} />
```

**NEU:**
```typescript
<Group
  x={placement.position_x}
  y={placement.position_y}
  rotation={placement.rotation || 0}
  draggable
  onClick={() => onSelectCamera(placement)}
  onDragEnd={(e) => handleCameraDragEnd(placement, e)}
>
  {/* Direction Indicator (zeigt wohin Kamera schaut) */}
  <Line
    points={[0, 0, 0, -30]} // Pfeil nach oben (in Group = 0° Richtung)
    stroke="#ffffff"
    strokeWidth={3}
    lineCap="round"
  />
  
  {/* Camera Icon (zentriert) */}
  <Circle
    x={0}
    y={0}
    radius={20}
    fill={isSelected ? '#3b82f6' : '#ef4444'}
    stroke="#ffffff"
    strokeWidth={2}
  />
  
  {/* Camera Number */}
  <Text
    x={-8}
    y={-8}
    text={cameraNumber.toString()}
    fontSize={16}
    fontWeight="bold"
    fill="#ffffff"
  />
  
  {/* FOV Wedge (innerhalb Group, rotation = 0) */}
  {placement.show_detection_cone && (
    <Line
      points={calculateFOVWedgePoints(
        0, 0,  // Relativ zur Group!
        0,     // Keine zusätzliche Rotation (Group rotiert ja)
        placement.field_of_view || 90,
        placement.detection_range_m || 30,
        design.scale_pixels_per_meter || 100
      )}
      fill={placement.cone_color || '#ef4444'}
      opacity={placement.cone_opacity || 0.3}
      closed
      listening={false}
    />
  )}
  
  {/* Label */}
  {placement.camera_name && (
    <Text
      x={-50}
      y={35}
      width={100}
      align="center"
      text={placement.camera_name}
      fontSize={12}
      fill="#1f2937"
      listening={false}
    />
  )}
</Group>
```

**Wichtig:**
- ✅ Alles innerhalb der Group bei (0, 0) relativ zeichnen
- ✅ Group selbst hat `x`, `y`, `rotation`
- ✅ Direction Indicator zeigt Blickrichtung

---

### Schritt 2: FOV Wedge Calculation

**Neue Datei:** `lib/fov.ts`

```typescript
/**
 * Berechnet Punkte für einen FOV-Wedge (Kegel)
 * 
 * @param cx - Center X (relativ zur Group)
 * @param cy - Center Y (relativ zur Group)
 * @param rotation - Rotation in Grad (sollte 0 sein wenn in rotierter Group!)
 * @param fovDegrees - Field of View in Grad (z.B. 90)
 * @param rangeMeters - Reichweite in Metern
 * @param pixelsPerMeter - Maßstab (z.B. 100)
 * @param segments - Anzahl Segmente für glatten Bogen (default: 30)
 * @returns Array von [x1, y1, x2, y2, ...] für Konva Line
 */
export function calculateFOVWedgePoints(
  cx: number,
  cy: number,
  rotation: number,
  fovDegrees: number,
  rangeMeters: number,
  pixelsPerMeter: number,
  segments: number = 30
): number[] {
  const radiusPixels = rangeMeters * pixelsPerMeter
  const startAngle = (rotation - fovDegrees / 2) * (Math.PI / 180)
  const endAngle = (rotation + fovDegrees / 2) * (Math.PI / 180)
  
  // Start am Kamera-Mittelpunkt
  const points = [cx, cy]
  
  // Bogen-Punkte
  for (let i = 0; i <= segments; i++) {
    const angle = startAngle + (endAngle - startAngle) * (i / segments)
    points.push(
      cx + Math.cos(angle) * radiusPixels,
      cy + Math.sin(angle) * radiusPixels
    )
  }
  
  // Zurück zum Mittelpunkt (schließt den Kegel)
  points.push(cx, cy)
  
  return points
}

/**
 * Camera Type Defaults
 */
export const CAMERA_DEFAULTS: Record<string, { fov: number; range: number }> = {
  dome_fixed: { fov: 95, range: 30 },
  dome_vario: { fov: 60, range: 40 },
  bullet_fixed: { fov: 80, range: 60 },
  bullet_vario: { fov: 40, range: 80 },
  ptz: { fov: 30, range: 120 },
  thermal: { fov: 24, range: 150 }
}

/**
 * Get defaults for camera type
 */
export function getCameraDefaults(cameraType: string): { fov: number; range: number } {
  return CAMERA_DEFAULTS[cameraType] || { fov: 90, range: 30 }
}
```

---

### Schritt 3: Rotation UI (Properties Sidebar)

**In:** `pages/system-designer/[projectId].tsx`

**Aktuell:**
```typescript
// Properties Sidebar zeigt nur Name, kein Rotation Slider
```

**NEU:**
```typescript
{/* Rotation Control */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Rotation: {selectedPlacement.rotation?.toFixed(0) || 0}°
  </label>
  <div className="flex items-center gap-2">
    <button
      onClick={() => {
        const newRotation = ((selectedPlacement.rotation || 0) - 15 + 360) % 360
        setSelectedPlacement({ ...selectedPlacement, rotation: newRotation })
        debouncedUpdatePlacement(selectedPlacement.id, { rotation: newRotation })
      }}
      className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
    >
      ↺ -15°
    </button>
    <input
      type="range"
      min="0"
      max="360"
      step="1"
      value={selectedPlacement.rotation || 0}
      onChange={(e) => {
        const rotation = parseFloat(e.target.value)
        setSelectedPlacement({ ...selectedPlacement, rotation })
        debouncedUpdatePlacement(selectedPlacement.id, { rotation })
      }}
      className="flex-1"
    />
    <button
      onClick={() => {
        const newRotation = ((selectedPlacement.rotation || 0) + 15) % 360
        setSelectedPlacement({ ...selectedPlacement, rotation: newRotation })
        debouncedUpdatePlacement(selectedPlacement.id, { rotation: newRotation })
      }}
      className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
    >
      ↻ +15°
    </button>
  </div>
  <input
    type="number"
    min="0"
    max="360"
    value={selectedPlacement.rotation?.toFixed(0) || 0}
    onChange={(e) => {
      const rotation = parseFloat(e.target.value) % 360
      setSelectedPlacement({ ...selectedPlacement, rotation })
      debouncedUpdatePlacement(selectedPlacement.id, { rotation })
    }}
    className="mt-2 w-full px-3 py-1 border border-gray-300 rounded text-sm"
  />
</div>

{/* Field of View Control */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Field of View: {selectedPlacement.field_of_view || 90}°
  </label>
  <input
    type="range"
    min="10"
    max="180"
    step="1"
    value={selectedPlacement.field_of_view || 90}
    onChange={(e) => {
      const field_of_view = parseFloat(e.target.value)
      setSelectedPlacement({ ...selectedPlacement, field_of_view })
      debouncedUpdatePlacement(selectedPlacement.id, { field_of_view })
    }}
    className="w-full"
  />
</div>

{/* Detection Range Control */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Detection Range: {selectedPlacement.detection_range_m || 30}m
  </label>
  <input
    type="range"
    min="10"
    max="150"
    step="5"
    value={selectedPlacement.detection_range_m || 30}
    onChange={(e) => {
      const detection_range_m = parseFloat(e.target.value)
      setSelectedPlacement({ ...selectedPlacement, detection_range_m })
      debouncedUpdatePlacement(selectedPlacement.id, { detection_range_m })
    }}
    className="w-full"
  />
</div>
```

---

### Schritt 4: Debounced Update

**Wichtig:** Update nicht bei jedem Slider-Tick, sondern debounced!

```typescript
import { useDebouncedCallback } from 'use-debounce'

// In Component
const debouncedUpdatePlacement = useDebouncedCallback(
  async (id: string, updates: Partial<CameraPlacement>) => {
    try {
      const res = await fetch('/api/system-designer/placements', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates })
      })
      
      if (res.ok) {
        const data = await res.json()
        setCurrentDesign(prev => prev ? {
          ...prev,
          placements: prev.placements?.map(p => 
            p.id === id ? data.placement : p
          )
        } : null)
      }
    } catch (error) {
      console.error('Error updating placement:', error)
    }
  },
  500 // 500ms debounce
)
```

**Dependency:** `npm install use-debounce`

---

### Schritt 5: handleCameraDragEnd Fix

**Problem:** Drag resettet Rotation

**Lösung:** Nur Position updaten, nicht Rotation!

```typescript
const handleCameraDragEnd = async (placement: CameraPlacement, e: any) => {
  const node = e.target
  const newX = node.x()
  const newY = node.y()
  
  // WICHTIG: Nur Position, KEINE Rotation!
  await handleUpdatePlacement(placement.id, {
    position_x: newX,
    position_y: newY
    // rotation: NICHT mit senden!
  })
  
  // Local State Update
  setSelectedPlacement(prev => prev?.id === placement.id ? {
    ...prev,
    position_x: newX,
    position_y: newY
  } : prev)
}
```

---

### Schritt 6: DB-Migration (falls Felder fehlen)

**Check:** Hat `camera_placements` alle Felder?

```sql
-- In Supabase SQL Editor
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'camera_placements';
```

**Falls `rotation`, `field_of_view`, `detection_range_m` fehlen:**

```sql
ALTER TABLE public.camera_placements
  ADD COLUMN IF NOT EXISTS rotation FLOAT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS field_of_view FLOAT DEFAULT 90,
  ADD COLUMN IF NOT EXISTS detection_range_m FLOAT DEFAULT 30;
```

---

## 🧪 TESTING

### Test 1: Rotation Slider
1. Kamera platzieren
2. Kamera auswählen
3. Rotation Slider bewegen (0-360°)
4. **ERWARTUNG:** Direction Indicator dreht sich sofort

### Test 2: Rotation Persistence
1. Kamera auf 45° drehen
2. Seite neu laden (F5)
3. **ERWARTUNG:** Kamera zeigt noch 45°

### Test 3: FOV Kopplung
1. Rotation auf 90° setzen
2. **ERWARTUNG:** FOV-Wedge zeigt nach rechts

### Test 4: Drag & Rotation
1. Kamera auf 120° drehen
2. Kamera verschieben (Drag & Drop)
3. **ERWARTUNG:** Rotation bleibt 120°

### Test 5: FOV & Range Slider
1. FOV von 90° auf 30° ändern
2. **ERWARTUNG:** Wedge wird schmaler
3. Range von 30m auf 60m ändern
4. **ERWARTUNG:** Wedge wird länger

---

## 📊 DEBUGGING

**Console Logs hinzufügen:**

```typescript
// In handleUpdatePlacement
console.log('🔄 Updating placement:', {
  id,
  rotation: updates.rotation,
  fov: updates.field_of_view,
  range: updates.detection_range_m,
  x: updates.position_x,
  y: updates.position_y
})

// In handleCameraDragEnd
console.log('🎯 Drag ended:', {
  id: placement.id,
  newX,
  newY,
  rotation: placement.rotation // Sollte NICHT mit gesendet werden!
})

// In Group onDragEnd
console.log('📍 Group position after drag:', {
  x: e.target.x(),
  y: e.target.y(),
  rotation: e.target.rotation() // Sollte unverändert sein!
})
```

---

## ✅ AKZEPTANZKRITERIEN

Phase 0 ist fertig wenn:
- ✅ Rotation Slider funktioniert (0-360°)
- ✅ Direction Indicator zeigt korrekte Richtung
- ✅ FOV-Wedge rotiert mit
- ✅ Rotation bleibt nach Reload erhalten
- ✅ Drag verändert Rotation nicht
- ✅ FOV & Range Slider ändern Wedge-Form
- ✅ `npm run build` erfolgreich
- ✅ Keine Errors in Console

---

## 🚀 NEXT STEPS

Nach Phase 0:
- ➡️ **Phase 1:** Pan/Zoom + Fit to Screen
- ➡️ **Phase 2:** Layer Toggle Panel
- ➡️ **Phase 3:** Erweiterte FOV-Features
- ➡️ **Phase 4:** Export

---

**Erstellt:** 2026-01-15  
**Status:** Ready to implement  
**Geschätzter Aufwand:** 4-6 Stunden
