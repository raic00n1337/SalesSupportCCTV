// Generische Produkt-/Kapazitäts-Auswahl für Konfigurator-Komponenten.
// Ermöglicht es, BOM-Positionen (Switches, NVR, Medienkonverter, Netzwerkschränke, etc.)
// aus admin-gepflegten configurator_products-Einträgen statt aus Hardcode zu beziehen.

import type { ConfiguratorProduct } from '../pages/api/configurator/products'

export interface CategoryDefinition {
  value: string
  label: string
  group: string
  /** true = mehrere Kapazitäts-Stufen möglich (z.B. Switch-Ports, NVR-Kanäle) */
  banded?: boolean
  capacityUnitHint?: string
}

// Vollständiger Katalog aller Konfigurator-Komponenten-Kategorien, die über
// /admin/configurator-products einem Produkt zugeordnet werden können.
// Wird sowohl im Admin-Bereich (Dropdowns) als auch im Konfigurator selbst
// als Referenz genutzt.
export const CONFIGURATOR_CATEGORY_CATALOG: CategoryDefinition[] = [
  { value: 'camera_dome_fixed', label: 'Kamera: Dome Fixed', group: 'Kameras & Audio' },
  { value: 'camera_dome_vario', label: 'Kamera: Dome Vario', group: 'Kameras & Audio' },
  { value: 'camera_bullet_fixed', label: 'Kamera: Bullet Fixed', group: 'Kameras & Audio' },
  { value: 'camera_bullet_vario', label: 'Kamera: Bullet Vario', group: 'Kameras & Audio' },
  { value: 'camera_ptz', label: 'Kamera: PTZ', group: 'Kameras & Audio' },
  { value: 'camera_thermal', label: 'Kamera: Thermal', group: 'Kameras & Audio' },
  { value: 'speaker_ip', label: 'IP-Lautsprecher', group: 'Kameras & Audio' },

  { value: 'network_switch', label: 'Netzwerk-Switch (nach Port-Anzahl)', group: 'Netzwerk', banded: true, capacityUnitHint: 'ports' },
  { value: 'media_converter_fiber', label: 'Medienkonverter Set (Fiber)', group: 'Netzwerk' },
  { value: 'sfp_module', label: 'SFP-Module (Paar)', group: 'Netzwerk' },
  { value: 'wlan_bridge_kit', label: 'WLAN-Bridge Set', group: 'Netzwerk' },
  { value: 'wlan_outdoor_enclosure', label: 'Outdoor-Gehäuse für WLAN', group: 'Netzwerk' },
  { value: 'vpn_router', label: 'VPN-Router', group: 'Netzwerk' },

  { value: 'junction_box_outdoor', label: 'Junction Box (Outdoor)', group: 'Infrastruktur' },
  { value: 'outdoor_cabinet', label: 'Outdoor-Cabinet', group: 'Infrastruktur' },
  { value: 'poe_injector', label: 'Stromversorgung / PoE-Injektor', group: 'Infrastruktur' },
  { value: 'ups', label: 'USV', group: 'Infrastruktur' },
  { value: 'network_cabinet_9he', label: '9 HE Netzwerkschrank', group: 'Infrastruktur' },

  { value: 'nvr_channels', label: 'NVR (nach Kanal-Anzahl)', group: 'Recorder & VMS', banded: true, capacityUnitHint: 'channels' },
  { value: 'vms_license_server', label: 'VMS Server-Lizenz', group: 'Recorder & VMS' },
  { value: 'vms_license_camera', label: 'VMS Kamera-Lizenz', group: 'Recorder & VMS' },
  { value: 'vms_server_hardware', label: 'VMS Server-Hardware (nach Kamera-Anzahl)', group: 'Recorder & VMS', banded: true, capacityUnitHint: 'cameras' },
  { value: 'vms_workstation_standard', label: 'VMS Client-Workstation (Standard)', group: 'Recorder & VMS' },
  { value: 'vms_workstation_multimonitor', label: 'VMS Client-Workstation (Multibild/RTX)', group: 'Recorder & VMS' },
  { value: 'vms_display_27', label: 'Display 27" (Full HD)', group: 'Recorder & VMS' },
  { value: 'vms_input_set', label: 'Maus + Tastatur Set', group: 'Recorder & VMS' },

  { value: 'lift_platform_service', label: 'Hubsteiger (Dienstleistung)', group: 'Dienstleistung' }
]

export interface ResolvedComponent {
  name: string
  price: number
  eso: string
  bheTime: number
  manufacturer: string
  productId?: string
}

export interface ComponentFallback {
  name: string
  price: number
  manufacturer?: string
  /** Optional: exakte ESO-Nummer für den Fallback-Fall (statt generierter Platzhalter-ESO) */
  eso?: string
}

/**
 * Wählt aus mehreren Kapazitäts-Stufen einer Kategorie (z.B. Switch-Ports,
 * NVR-Kanäle, VMS-Server-Kapazität) die kleinste Stufe, die den Bedarf deckt.
 * Bevorzugt dabei - falls vorhanden - Produkte des passenden Herstellers.
 * Gibt es keine ausreichende Stufe, wird die größte verfügbare als
 * Best-Effort-Fallback zurückgegeben.
 */
export function pickBandedProduct(
  items: ConfiguratorProduct[] | undefined,
  requiredCapacity: number,
  manufacturerSlug?: string
): ConfiguratorProduct | undefined {
  if (!items || items.length === 0) return undefined

  const withCapacity = items.filter((i) => typeof i.capacity_value === 'number')
  const pool = withCapacity.length > 0 ? withCapacity : items

  const preferManufacturer = (list: ConfiguratorProduct[]) => {
    if (!manufacturerSlug) return list
    const matching = list.filter((i) => i.manufacturer_slug === manufacturerSlug)
    return matching.length > 0 ? matching : list
  }

  const sufficient = pool.filter((i) => (i.capacity_value ?? 0) >= requiredCapacity)
  const hasSufficient = sufficient.length > 0
  const candidates = preferManufacturer(hasSufficient ? sufficient : pool)

  const sorted = [...candidates].sort(
    (a, b) => (a.capacity_value ?? 0) - (b.capacity_value ?? 0)
  )

  return hasSufficient ? sorted[0] : sorted[sorted.length - 1]
}

/**
 * Löst eine 1:1-Komponente (kein Kapazitäts-Bedarf) auf: nutzt den Default aus
 * der DB, falls vorhanden, sonst den übergebenen Hardcode-Fallback.
 */
export function resolveSimpleComponent(
  category: string,
  configuratorProducts: Record<string, ConfiguratorProduct>,
  fallback: ComponentFallback
): ResolvedComponent {
  const product = configuratorProducts[category]
  if (product) {
    return {
      name: product.name,
      price: product.uvp_cents / 100,
      eso: product.eso_number || product.sku,
      bheTime: product.bhe_time_minutes || 0,
      manufacturer: product.manufacturer,
      productId: product.product_id
    }
  }
  return {
    name: fallback.name,
    price: fallback.price,
    eso: fallback.eso || `${(fallback.manufacturer || 'UNIVERSAL').toUpperCase()}-${category.toUpperCase()}`,
    bheTime: 0,
    manufacturer: fallback.manufacturer || 'Universal'
  }
}

/**
 * Löst eine kapazitäts-gestaffelte Komponente auf (Switch/NVR/VMS-Server, etc.):
 * Berechnet wird der Bedarf im Aufrufer, hier nur die Auswahl aus der DB
 * bzw. der Hardcode-Fallback, falls (noch) keine Produkte gepflegt sind.
 */
export function resolveBandedComponent(
  category: string,
  byCategory: Record<string, ConfiguratorProduct[]>,
  requiredCapacity: number,
  fallback: ComponentFallback,
  manufacturerSlug?: string,
  ruleOverride?: ConfiguratorProduct
): ResolvedComponent {
  // Eine explizit gematchte Regel (Feature-/Hersteller-spezifisch) gewinnt immer
  // gegen die automatische Kapazitäts-Staffelung, analog zu Kamera-Kategorien.
  const picked = ruleOverride || pickBandedProduct(byCategory[category], requiredCapacity, manufacturerSlug)
  if (picked) {
    return {
      name: picked.name,
      price: picked.uvp_cents / 100,
      eso: picked.eso_number || picked.sku,
      bheTime: picked.bhe_time_minutes || 0,
      manufacturer: picked.manufacturer,
      productId: picked.product_id
    }
  }
  return {
    name: fallback.name,
    price: fallback.price,
    eso: fallback.eso || `${category.toUpperCase()}-FALLBACK`,
    bheTime: 0,
    manufacturer: fallback.manufacturer || 'Universal'
  }
}
