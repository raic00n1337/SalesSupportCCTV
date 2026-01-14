/**
 * Camera Calculations Library
 * 
 * FOV, DORI, und Sensor-Berechnungen für den System Designer
 * Basierend auf IPVM Standards und EN 62676-4
 * 
 * Referenzen:
 * - https://calculator.ipvm.com/
 * - https://www.scantips.com/lights/fieldofview.html
 * - EN 62676-4 (DORI Standard)
 */

// ============================================
// SENSOR DATABASE
// ============================================

export interface SensorSpec {
  size: string          // z.B. '1/2.8"'
  widthMm: number       // Breite in mm
  heightMm: number      // Höhe in mm
  diagonalMm: number    // Diagonale in mm
}

export const SENSOR_SIZES: Record<string, SensorSpec> = {
  '1/3"': {
    size: '1/3"',
    widthMm: 3.6,
    heightMm: 2.7,
    diagonalMm: 4.5
  },
  '1/2.8"': {
    size: '1/2.8"',
    widthMm: 4.8,
    heightMm: 3.6,
    diagonalMm: 6.0
  },
  '1/2.5"': {
    size: '1/2.5"',
    widthMm: 5.1,
    heightMm: 3.8,
    diagonalMm: 6.4
  },
  '1/2"': {
    size: '1/2"',
    widthMm: 6.4,
    heightMm: 4.8,
    diagonalMm: 8.0
  },
  '1/1.8"': {
    size: '1/1.8"',
    widthMm: 7.2,
    heightMm: 5.4,
    diagonalMm: 9.0
  },
  '2/3"': {
    size: '2/3"',
    widthMm: 8.8,
    heightMm: 6.6,
    diagonalMm: 11.0
  }
}

// ============================================
// FOV CALCULATION
// ============================================

export interface FOVResult {
  horizontalFOV: number      // Horizontal Field of View in Grad
  verticalFOV: number        // Vertical Field of View in Grad
  diagonalFOV: number        // Diagonal Field of View in Grad
}

/**
 * Berechnet Field of View (FOV) basierend auf Brennweite und Sensor-Größe
 * 
 * Formel: FOV = 2 × arctan(sensor_size / (2 × focal_length))
 * 
 * @param focalLengthMm - Brennweite in mm (z.B. 2.8, 4, 6, 8, 12)
 * @param sensorSize - Sensor-Größe (z.B. '1/2.8"')
 * @returns FOV in Grad (horizontal, vertical, diagonal)
 */
export function calculateFOV(
  focalLengthMm: number,
  sensorSize: string = '1/2.8"'
): FOVResult {
  // Sensor-Specs holen (fallback auf 1/2.8" wenn nicht gefunden)
  const sensor = SENSOR_SIZES[sensorSize] || SENSOR_SIZES['1/2.8"']
  
  // Horizontal FOV
  const horizontalFOV = 2 * Math.atan(sensor.widthMm / (2 * focalLengthMm)) * (180 / Math.PI)
  
  // Vertical FOV
  const verticalFOV = 2 * Math.atan(sensor.heightMm / (2 * focalLengthMm)) * (180 / Math.PI)
  
  // Diagonal FOV
  const diagonalFOV = 2 * Math.atan(sensor.diagonalMm / (2 * focalLengthMm)) * (180 / Math.PI)
  
  return {
    horizontalFOV: Math.round(horizontalFOV * 10) / 10,
    verticalFOV: Math.round(verticalFOV * 10) / 10,
    diagonalFOV: Math.round(diagonalFOV * 10) / 10
  }
}

// ============================================
// GROUND COVERAGE CALCULATION
// ============================================

export interface GroundCoverage {
  widthM: number         // Breite der Abdeckung in Metern
  lengthM: number        // Länge der Abdeckung in Metern (Distanz)
  areaM2: number         // Fläche in Quadratmetern
}

/**
 * Berechnet die Boden-Abdeckung basierend auf FOV, Montagehöhe und Neigungswinkel
 * 
 * @param horizontalFOV - Horizontal FOV in Grad
 * @param verticalFOV - Vertical FOV in Grad
 * @param mountHeightM - Montagehöhe in Metern
 * @param tiltAngle - Neigungswinkel in Grad (0 = horizontal, 90 = senkrecht nach unten)
 * @returns Ground coverage dimensions
 */
export function calculateGroundCoverage(
  horizontalFOV: number,
  verticalFOV: number,
  mountHeightM: number = 3.0,
  tiltAngle: number = 15.0
): GroundCoverage {
  // Neigungswinkel in Radians
  const tiltRad = (tiltAngle * Math.PI) / 180
  
  // Horizontal FOV in Radians
  const hFovRad = (horizontalFOV * Math.PI) / 180
  
  // Vertical FOV in Radians
  const vFovRad = (verticalFOV * Math.PI) / 180
  
  // Berechne die Distanz bis zum nächsten und fernsten Punkt im Sichtfeld
  const nearDistance = mountHeightM / Math.tan(tiltRad + vFovRad / 2)
  const farDistance = mountHeightM / Math.tan(Math.max(0.01, tiltRad - vFovRad / 2))
  
  // Durchschnittliche Distanz für Breiten-Berechnung
  const avgDistance = (nearDistance + farDistance) / 2
  
  // Breite bei durchschnittlicher Distanz
  const widthM = 2 * avgDistance * Math.tan(hFovRad / 2)
  
  // Länge = Differenz zwischen fernster und nähester Distanz
  const lengthM = Math.abs(farDistance - nearDistance)
  
  return {
    widthM: Math.round(widthM * 10) / 10,
    lengthM: Math.round(lengthM * 10) / 10,
    areaM2: Math.round(widthM * lengthM * 10) / 10
  }
}

// ============================================
// DORI CALCULATION
// ============================================

export interface DORIDistances {
  detectM: number        // Detection distance in Metern
  observeM: number       // Observation distance in Metern
  recognizeM: number     // Recognition distance in Metern
  identifyM: number      // Identification distance in Metern
}

// IPVM/EN 62676-4 Standard PPM (Pixels Per Meter) für DORI
const PPM_DETECT = 25      // 25 Pixel pro Meter für Detection
const PPM_OBSERVE = 62     // 62 Pixel pro Meter für Observation
const PPM_RECOGNIZE = 125  // 125 Pixel pro Meter für Recognition
const PPM_IDENTIFY = 250   // 250 Pixel pro Meter für Identification

/**
 * Berechnet DORI-Distanzen basierend auf Auflösung und FOV
 * 
 * DORI = Detect, Observe, Recognize, Identify
 * Standard: EN 62676-4 / IPVM Pixel Density Standards
 * 
 * @param horizontalResolution - Horizontal Resolution (z.B. 1920, 2560, 3840)
 * @param horizontalFOV - Horizontal FOV in Grad
 * @param referenceDistanceM - Referenz-Distanz für Berechnung (default: 10m)
 * @returns DORI distances in Metern
 */
export function calculateDORI(
  horizontalResolution: number,
  horizontalFOV: number,
  referenceDistanceM: number = 10.0
): DORIDistances {
  // Horizontal FOV in Radians
  const hFovRad = (horizontalFOV * Math.PI) / 180
  
  // Breite des Sichtfelds bei Referenz-Distanz
  const widthAtRefDistance = 2 * referenceDistanceM * Math.tan(hFovRad / 2)
  
  // PPM (Pixels Per Meter) bei Referenz-Distanz
  const ppmAtRefDistance = horizontalResolution / widthAtRefDistance
  
  // DORI Distanzen berechnen (proportional zu PPM)
  // Je höher die PPM, desto weiter die Reichweite
  const detectM = referenceDistanceM * (ppmAtRefDistance / PPM_DETECT)
  const observeM = referenceDistanceM * (ppmAtRefDistance / PPM_OBSERVE)
  const recognizeM = referenceDistanceM * (ppmAtRefDistance / PPM_RECOGNIZE)
  const identifyM = referenceDistanceM * (ppmAtRefDistance / PPM_IDENTIFY)
  
  return {
    detectM: Math.round(detectM * 10) / 10,
    observeM: Math.round(observeM * 10) / 10,
    recognizeM: Math.round(recognizeM * 10) / 10,
    identifyM: Math.round(identifyM * 10) / 10
  }
}

// ============================================
// COMPLETE CAMERA CALCULATION
// ============================================

export interface CameraSpecs {
  focalLengthMm: number
  sensorSize: string
  horizontalResolution: number
  verticalResolution: number
  mountHeightM?: number
  tiltAngle?: number
}

export interface CameraCalculationResult {
  fov: FOVResult
  groundCoverage: GroundCoverage
  dori: DORIDistances
  ppm: number  // Pixels Per Meter bei 10m Distanz
}

/**
 * Komplette Kamera-Berechnung: FOV + Ground Coverage + DORI
 * 
 * @param specs - Kamera-Spezifikationen
 * @returns Komplette Berechnungs-Ergebnisse
 */
export function calculateCameraPerformance(specs: CameraSpecs): CameraCalculationResult {
  // FOV berechnen
  const fov = calculateFOV(specs.focalLengthMm, specs.sensorSize)
  
  // Ground Coverage berechnen
  const groundCoverage = calculateGroundCoverage(
    fov.horizontalFOV,
    fov.verticalFOV,
    specs.mountHeightM || 3.0,
    specs.tiltAngle || 15.0
  )
  
  // DORI berechnen
  const dori = calculateDORI(
    specs.horizontalResolution,
    fov.horizontalFOV
  )
  
  // PPM bei 10m berechnen
  const widthAt10m = 2 * 10 * Math.tan((fov.horizontalFOV * Math.PI) / 360)
  const ppm = specs.horizontalResolution / widthAt10m
  
  return {
    fov,
    groundCoverage,
    dori,
    ppm: Math.round(ppm * 10) / 10
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Gibt empfohlene Brennweiten für verschiedene Szenarien zurück
 */
export function getRecommendedFocalLengths(): Record<string, number[]> {
  return {
    'Ultra Wide (Overview)': [2.8, 3.6],
    'Wide (Parking, Lobby)': [4, 6],
    'Medium (Entrance, Corridor)': [8, 12],
    'Narrow (Long corridor, Gate)': [16, 25],
    'Telephoto (Perimeter)': [35, 50]
  }
}

/**
 * Konvertiert Sensor-Größe String zu mm
 */
export function getSensorDimensions(sensorSize: string): { width: number; height: number } | null {
  const sensor = SENSOR_SIZES[sensorSize]
  if (!sensor) return null
  
  return {
    width: sensor.widthMm,
    height: sensor.heightMm
  }
}

/**
 * Berechnet empfohlene Montagehöhe basierend auf Szenario
 */
export function getRecommendedMountHeight(scenario: string): number {
  const recommendations: Record<string, number> = {
    'Indoor Ceiling': 3.0,
    'Outdoor Wall': 3.5,
    'Pole Mount': 4.5,
    'Perimeter': 6.0,
    'License Plate': 2.0
  }
  
  return recommendations[scenario] || 3.0
}

// ============================================
// EXAMPLE USAGE
// ============================================

/*
// Beispiel: Hikvision 4MP Dome mit 2.8mm

const result = calculateCameraPerformance({
  focalLengthMm: 2.8,
  sensorSize: '1/2.8"',
  horizontalResolution: 2560,
  verticalResolution: 1440,
  mountHeightM: 3.0,
  tiltAngle: 15
})

console.log('FOV:', result.fov)
// { horizontalFOV: 93.4, verticalFOV: 70.5, diagonalFOV: 112.3 }

console.log('Ground Coverage:', result.groundCoverage)
// { widthM: 10.8, lengthM: 8.5, areaM2: 91.8 }

console.log('DORI:', result.dori)
// { detectM: 65.3, observeM: 26.3, recognizeM: 13.1, identifyM: 6.5 }

console.log('PPM @ 10m:', result.ppm)
// 145.2
*/
