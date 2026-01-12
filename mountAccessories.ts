// Mount Accessories Helper for BOM Generation
import type { MountType, BOMItem } from './types'

/**
 * Generate mounting accessories for cameras based on mount type and quantity
 */
export function generateMountingAccessories(
  cameraType: 'dome' | 'bullet' | 'ptz' | 'thermal',
  mountType: MountType,
  quantity: number,
  manufacturer: string,
  sitePrefix: string
): BOMItem[] {
  if (quantity === 0) return []

  const accessories: BOMItem[] = []
  
  switch (mountType) {
    case 'wall':
      accessories.push({
        articleName: `${sitePrefix} Wandhalter für ${cameraType.toUpperCase()}`,
        manufacturer: manufacturer,
        esoArticleNumber: `${manufacturer}-MOUNT-WALL-${cameraType.toUpperCase()}`,
        quantity: quantity,
        unitPrice: cameraType === 'ptz' ? 89 : 29,
        category: 'Zubehör'
      })
      break
      
    case 'ceiling':
      accessories.push({
        articleName: `${sitePrefix} Deckenhalter für ${cameraType.toUpperCase()}`,
        manufacturer: manufacturer,
        esoArticleNumber: `${manufacturer}-MOUNT-CEIL-${cameraType.toUpperCase()}`,
        quantity: quantity,
        unitPrice: cameraType === 'ptz' ? 99 : 35,
        category: 'Zubehör'
      })
      break
      
    case 'pole':
      // Pole mount requires both pole adapter and pole clamp
      accessories.push({
        articleName: `${sitePrefix} Mastadapter für ${cameraType.toUpperCase()}`,
        manufacturer: manufacturer,
        esoArticleNumber: `${manufacturer}-MOUNT-POLE-ADAPTER-${cameraType.toUpperCase()}`,
        quantity: quantity,
        unitPrice: cameraType === 'ptz' ? 120 : 45,
        category: 'Zubehör'
      })
      accessories.push({
        articleName: `${sitePrefix} Mastklemme`,
        manufacturer: 'Universal',
        esoArticleNumber: 'MOUNT-POLE-CLAMP',
        quantity: quantity,
        unitPrice: 25,
        category: 'Zubehör'
      })
      break
  }
  
  return accessories
}

/**
 * Generate mounting accessories for cameras with individual mount types per camera
 * Aggregates accessories by mount type to avoid redundant BOM entries
 */
export function generateMountingAccessoriesIndividual(
  cameraType: 'dome' | 'bullet' | 'ptz' | 'thermal',
  mounts: MountType[],
  manufacturer: string,
  sitePrefix: string
): BOMItem[] {
  if (mounts.length === 0) return []

  // Count mounts by type
  const mountCounts: Record<MountType, number> = {
    wall: 0,
    ceiling: 0,
    pole: 0
  }

  mounts.forEach(mount => {
    mountCounts[mount]++
  })

  // Generate accessories for each mount type
  const accessories: BOMItem[] = []
  
  Object.entries(mountCounts).forEach(([mountType, count]) => {
    if (count > 0) {
      accessories.push(...generateMountingAccessories(
        cameraType,
        mountType as MountType,
        count,
        manufacturer,
        sitePrefix
      ))
    }
  })

  return accessories
}

/**
 * Generate mounting accessories for IP Speakers with individual mount types
 * Aggregates accessories by mount type to avoid redundant BOM entries
 */
export function generateSpeakerMountingAccessories(
  mounts: MountType[],
  manufacturer: string,
  sitePrefix: string
): BOMItem[] {
  if (mounts.length === 0) return []

  // Count mounts by type
  const mountCounts: Record<MountType, number> = {
    wall: 0,
    ceiling: 0,
    pole: 0
  }

  mounts.forEach(mount => {
    mountCounts[mount]++
  })

  // Generate accessories for each mount type
  const accessories: BOMItem[] = []
  
  if (mountCounts.wall > 0) {
    accessories.push({
      articleName: `${sitePrefix} Wandhalter für Lautsprecher`,
      manufacturer: manufacturer,
      esoArticleNumber: `${manufacturer}-MOUNT-WALL-SPEAKER`,
      quantity: mountCounts.wall,
      unitPrice: 19,
      category: 'Zubehör'
    })
  }
  
  if (mountCounts.ceiling > 0) {
    accessories.push({
      articleName: `${sitePrefix} Deckenhalter für Lautsprecher`,
      manufacturer: manufacturer,
      esoArticleNumber: `${manufacturer}-MOUNT-CEIL-SPEAKER`,
      quantity: mountCounts.ceiling,
      unitPrice: 25,
      category: 'Zubehör'
    })
  }
  
  if (mountCounts.pole > 0) {
    accessories.push({
      articleName: `${sitePrefix} Mastadapter für Lautsprecher`,
      manufacturer: manufacturer,
      esoArticleNumber: `${manufacturer}-MOUNT-POLE-ADAPTER-SPEAKER`,
      quantity: mountCounts.pole,
      unitPrice: 35,
      category: 'Zubehör'
    })
    accessories.push({
      articleName: `${sitePrefix} Mastklemme`,
      manufacturer: 'Universal',
      esoArticleNumber: 'MOUNT-POLE-CLAMP',
      quantity: mountCounts.pole,
      unitPrice: 25,
      category: 'Zubehör'
    })
  }

  return accessories
}

