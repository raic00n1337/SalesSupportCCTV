// Core Types for Video System Configurator

export type TierType = 'eco' | 'premium' | 'high-risk';

export type ManufacturerType = 'AXIS' | 'Hanwha' | 'AJAX' | 'Keenfinity';

export type HanwhaSeriesType = 'A-Series' | 'Q/X-Series';

export type AjaxSeriesType = 'Baseline' | 'Superior';

export type LensType = 'fixed' | 'vario';

export type CablingType = 'copper' | 'fiber' | 'wlan-bridge';

export type VideoManagementType = 'nvr' | 'vms';

export type MountType = 'wall' | 'ceiling' | 'pole';

export interface CameraConfig {
  quantity: number;
  mount: MountType; // Kept for backwards compatibility
  mounts?: MountType[]; // Individual mount type per camera (preferred)
  customNames?: string[]; // Optional: Custom names for each camera
}

export interface Camera {
  dome: number;
  bullet: number;
  ptz: number;
  thermal: number;
}

export interface CameraLensConfig {
  domeFixed: number;
  domeVario: number;
  bulletFixed: number;
  bulletVario: number;
  ptz: number;
  thermal: number;
  ipSpeakers: number;
}

export interface IPSpeakerConfig {
  quantity: number;
  mounts?: MountType[]; // Individual mount type per speaker
  customNames?: string[];
}

export interface CameraWithMountConfig {
  domeFixed: CameraConfig;
  domeVario: CameraConfig;
  bulletFixed: CameraConfig;
  bulletVario: CameraConfig;
  ptz: CameraConfig;
  thermal: CameraConfig;
  ipSpeakers: IPSpeakerConfig;
}

export interface Site {
  id: string;
  name: string;
  cameras: CameraWithMountConfig;
  cabling: CablingType;
  isStandalone: boolean;
  outdoor: boolean;
  ipDocEnabled?: boolean;
  ipStart?: string;
  ipGateway?: string;
  ipCidr?: string;
  ipVideoDevicePrefix?: string;
  ipNetworkDevicePrefix?: string;
}

export interface Project {
  id: string;
  name: string;
  tier: TierType;
  manufacturer: ManufacturerType;
  hanwhaSeries?: HanwhaSeriesType;
  ajaxSeries?: AjaxSeriesType;
  videoManagement: VideoManagementType;
  sites: Site[];
  storageDays: number;
  storageHddSize?: number;
  storageHddQuantity?: number;
  upsRequired: boolean;
  remoteCapable: boolean;
  // Sales Logic Features
  vmsMultiMonitor?: boolean; // Multibild-Option für VMS
  networkCabinet9HE?: boolean; // 9 HE Netzwerkschrank
  liftPlatform?: boolean; // Hubsteiger
  // Cabling
  dataCableMeters?: number; // Cat.7 Datenkabel in Metern
  dataCablePricePerMeter?: number; // Preis pro Meter Cat.7
  fiberCableMeters?: number; // Glasfaserkabel in Metern
  fiberCablePricePerMeter?: number; // Preis pro Meter Glasfaser
}

export interface BOMItem {
  articleName: string;
  manufacturer: string;
  esoArticleNumber: string;
  quantity: number;
  unitPrice: number;
  category: string;
}



// ============================================
// SYSTEM DESIGNER TYPES
// ============================================

export interface SystemDesign {
  id: string;
  project_id: string;
  
  // Grundriss-Info
  name: string;
  description?: string;
  floor_number: number; // 0 = EG, 1 = OG, -1 = UG
  
  // Bild
  image_url?: string;
  image_width?: number;
  image_height?: number;
  
  // Maßstab
  scale_pixels_per_meter: number; // Default: 100 (100px = 1m)
  scale_reference_length_m?: number; // Referenzlänge in Metern
  scale_reference_px?: number; // Referenzlänge in Pixeln
  
  // Canvas Settings
  canvas_zoom: number; // Default: 1.0
  canvas_pan_x: number; // Default: 0
  canvas_pan_y: number; // Default: 0
  
  // Metadata
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  
  // Client-side only (not in DB)
  placements?: CameraPlacement[];
}

export interface CameraPlacement {
  id: string;
  system_design_id: string;
  
  // Kamera-Info
  camera_type: 'dome_fixed' | 'dome_vario' | 'bullet_fixed' | 'bullet_vario' | 'ptz' | 'thermal';
  camera_name?: string;
  product_id?: string;
  
  // Position & Rotation
  position_x: number; // X-Position auf Canvas (Pixel)
  position_y: number; // Y-Position auf Canvas (Pixel)
  rotation: number; // Rotation in Grad (0-360)
  
  // Kamera-Specs (für Detection Cone)
  focal_length_mm: number; // Brennweite (2.8, 4, 6, 8, 12mm)
  field_of_view: number; // Öffnungswinkel in Grad
  detection_range_m: number; // Detection-Reichweite in Metern
  
  // Detection Cone Settings
  show_detection_cone: boolean;
  cone_color: string; // Hex color (z.B. '#3b82f6')
  cone_opacity: number; // 0-1
  
  // Metadata
  notes?: string;
  created_at?: string;
  updated_at?: string;
}
