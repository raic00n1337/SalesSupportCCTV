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
  mount: MountType;
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

export interface CameraWithMountConfig {
  domeFixed: CameraConfig;
  domeVario: CameraConfig;
  bulletFixed: CameraConfig;
  bulletVario: CameraConfig;
  ptz: CameraConfig;
  thermal: CameraConfig;
  ipSpeakers: number;
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
}

export interface BOMItem {
  articleName: string;
  manufacturer: string;
  esoArticleNumber: string;
  quantity: number;
  unitPrice: number;
  category: string;
}

