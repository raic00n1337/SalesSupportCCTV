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




