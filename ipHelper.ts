// IP Helper Functions for Network Documentation

export interface IPv4 {
  octets: [number, number, number, number];
}

/**
 * Parse IPv4 string to number representation
 */
export const parseIPv4 = (ip: string): number | null => {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  
  const octets = parts.map(p => parseInt(p, 10))
  
  // Validate each octet
  if (octets.some(o => isNaN(o) || o < 0 || o > 255)) {
    return null
  }
  
  // Convert to 32-bit number (use >>> 0 to ensure unsigned)
  return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0
}

/**
 * Format number to IPv4 string
 */
export const formatIPv4 = (n: number): string => {
  // Ensure we're working with a 32-bit unsigned integer
  n = n >>> 0
  
  const octet1 = (n >>> 24) & 0xFF
  const octet2 = (n >>> 16) & 0xFF
  const octet3 = (n >>> 8) & 0xFF
  const octet4 = n & 0xFF
  
  return `${octet1}.${octet2}.${octet3}.${octet4}`
}

/**
 * Add offset to IPv4 address
 */
export const addIPv4 = (ip: string, offset: number): string | null => {
  const parsed = parseIPv4(ip)
  if (parsed === null) return null
  
  // Calculate new IP (use >>> 0 to ensure unsigned 32-bit)
  const newIP = (parsed + offset) >>> 0
  
  // Check for overflow - if adding offset wraps around or goes beyond valid range
  if (offset < 0) return null
  if (parsed + offset > 0xFFFFFFFF) return null
  
  return formatIPv4(newIP)
}

/**
 * Validate IPv4 address string
 */
export const validateIPv4 = (ip: string): boolean => {
  return parseIPv4(ip) !== null
}

/**
 * Check if IP is in valid range (not 0.0.0.0, not 255.255.255.255, last octet not 0 or 255)
 */
export const isValidHostIP = (ip: string): boolean => {
  const parsed = parseIPv4(ip)
  if (parsed === null) return false
  
  const lastOctet = parsed & 0xFF
  
  // Avoid network address (last octet = 0) and broadcast (last octet = 255)
  if (lastOctet === 0 || lastOctet === 255) return false
  
  // Avoid 0.0.0.0 and 255.255.255.255
  if (parsed === 0 || parsed === 0xFFFFFFFF) return false
  
  return true
}

/**
 * Calculate maximum available IPs in current subnet (simple check for last octet)
 */
export const getAvailableIPsInSubnet = (startIP: string): number => {
  const parsed = parseIPv4(startIP)
  if (parsed === null) return 0
  
  const lastOctet = parsed & 0xFF
  
  // Simple calculation: from current to 254 (avoiding 255)
  return Math.max(0, 254 - lastOctet)
}

export interface NetworkDevice {
  id: string
  type: 'camera' | 'switch' | 'nvr' | 'vms' | 'router' | 'wlan-bridge' | 'converter'
  label: string
  manufacturer: string
  esoNumber: string
  ip?: string
  category: string
  note?: string
}

/**
 * Generate network devices from BOM items for IP assignment
 * Order: Router → Switches → WLAN-Bridge → NVR/VMS → Cameras
 */
export const generateNetworkDevices = (
  siteName: string,
  siteConfig: any,
  bomItems: any[],
  videoDevicePrefix?: string,
  networkDevicePrefix?: string
): NetworkDevice[] => {
  const devices: NetworkDevice[] = []
  const videoPrefix = videoDevicePrefix ? `${videoDevicePrefix}-` : ''
  const networkPrefix = networkDevicePrefix ? `${networkDevicePrefix}-` : ''
  
  // Note: Router, NVR/VMS, and WLAN-Bridge are added by the caller
  // This function only generates site-specific devices (Cameras and Switches)
  
  // 1. Switches (if standalone site) - use network prefix
  if (siteConfig.isStandalone) {
    const totalDevices = 
      siteConfig.cameras.domeFixed.quantity +
      siteConfig.cameras.domeVario.quantity +
      siteConfig.cameras.bulletFixed.quantity +
      siteConfig.cameras.bulletVario.quantity +
      siteConfig.cameras.ptz.quantity +
      siteConfig.cameras.thermal.quantity +
      siteConfig.cameras.ipSpeakers
    const switchPorts = Math.max(8, Math.ceil(totalDevices / 8) * 8)
    devices.push({
      id: `${networkPrefix}SW-01`,
      type: 'switch',
      label: `Switch ${switchPorts}-Port PoE+`,
      manufacturer: 'Universal',
      esoNumber: `NET-SW-${switchPorts}P-001`,
      category: 'Netzwerk'
    })
  }
  
  // 2. Cameras - use video prefix
  // Helper to add cameras with sequential numbering
  const addCameras = (type: string, label: string, quantity: number, manufacturer: string, esoBase: string) => {
    for (let i = 1; i <= quantity; i++) {
      devices.push({
        id: `${videoPrefix}${type}-${String(i).padStart(2, '0')}`,
        type: 'camera',
        label: `${label} ${String(i).padStart(2, '0')}`,
        manufacturer,
        esoNumber: `${esoBase}-${String(i).padStart(2, '0')}`,
        category: 'Kameras'
      })
    }
  }
  
  // Add cameras in order: Dome, Bullet, PTZ, Thermal, IP-Speakers
  if (siteConfig.cameras.domeFixed.quantity > 0) {
    addCameras('DOME-FIX', 'Dome Fixed', siteConfig.cameras.domeFixed.quantity, 'Camera', 'DOME-FIX')
  }
  if (siteConfig.cameras.domeVario.quantity > 0) {
    addCameras('DOME-VAR', 'Dome Vario', siteConfig.cameras.domeVario.quantity, 'Camera', 'DOME-VAR')
  }
  if (siteConfig.cameras.bulletFixed.quantity > 0) {
    addCameras('BULL-FIX', 'Bullet Fixed', siteConfig.cameras.bulletFixed.quantity, 'Camera', 'BULL-FIX')
  }
  if (siteConfig.cameras.bulletVario.quantity > 0) {
    addCameras('BULL-VAR', 'Bullet Vario', siteConfig.cameras.bulletVario.quantity, 'Camera', 'BULL-VAR')
  }
  if (siteConfig.cameras.ptz.quantity > 0) {
    addCameras('PTZ', 'PTZ Kamera', siteConfig.cameras.ptz.quantity, 'Camera', 'PTZ')
  }
  if (siteConfig.cameras.thermal.quantity > 0) {
    addCameras('THRM', 'Thermal Kamera', siteConfig.cameras.thermal.quantity, 'Camera', 'THRM')
  }
  if (siteConfig.cameras.ipSpeakers > 0) {
    addCameras('SPEAK', 'IP-Lautsprecher', siteConfig.cameras.ipSpeakers, 'Audio', 'SPEAK')
  }
  
  return devices
}

/**
 * Generate all network devices in correct order for IP assignment
 * Order: Router → Switches → WLAN-Bridge → NVR/VMS → Cameras
 */
export const generateAllNetworkDevices = (
  site: any,
  project: any,
  videoDevicePrefix?: string,
  networkDevicePrefix?: string
): NetworkDevice[] => {
  const allDevices: NetworkDevice[] = []
  const networkPrefix = networkDevicePrefix ? `${networkDevicePrefix}-` : ''
  const totalCameras = 
    site.cameras.domeFixed.quantity +
    site.cameras.domeVario.quantity +
    site.cameras.bulletFixed.quantity +
    site.cameras.bulletVario.quantity +
    site.cameras.ptz.quantity +
    site.cameras.thermal.quantity +
    site.cameras.ipSpeakers
  
  // 1. Router (if remote capable)
  if (project.remoteCapable) {
    allDevices.push({
      id: `${networkPrefix}VPN-01`,
      type: 'router',
      label: 'VPN-Router',
      manufacturer: 'Universal',
      esoNumber: 'NET-VPN-001',
      category: 'Netzwerk'
    })
  }
  
  // 2. Switches (if standalone site)
  if (site.isStandalone) {
    const totalDevices = 
      site.cameras.domeFixed.quantity +
      site.cameras.domeVario.quantity +
      site.cameras.bulletFixed.quantity +
      site.cameras.bulletVario.quantity +
      site.cameras.ptz.quantity +
      site.cameras.thermal.quantity +
      site.cameras.ipSpeakers
    const switchPorts = Math.max(8, Math.ceil(totalDevices / 8) * 8)
    allDevices.push({
      id: `${networkPrefix}SW-01`,
      type: 'switch',
      label: `Switch ${switchPorts}-Port PoE+`,
      manufacturer: 'Universal',
      esoNumber: `NET-SW-${switchPorts}P-001`,
      category: 'Netzwerk'
    })
  }
  
  // 3. WLAN-Bridge (if applicable)
  if (site.cabling === 'wlan-bridge') {
    allDevices.push({
      id: `${networkPrefix}WBR-01`,
      type: 'wlan-bridge',
      label: 'WLAN-Bridge Unit 1',
      manufacturer: 'Universal',
      esoNumber: 'NET-WLAN-001-A',
      category: 'Netzwerk'
    })
    allDevices.push({
      id: `${networkPrefix}WBR-02`,
      type: 'wlan-bridge',
      label: 'WLAN-Bridge Unit 2',
      manufacturer: 'Universal',
      esoNumber: 'NET-WLAN-001-B',
      category: 'Netzwerk'
    })
  }
  
  // 4. NVR/VMS Server
  if (project.videoManagement === 'nvr') {
    const channels = totalCameras <= 8 ? 8 : totalCameras <= 16 ? 16 : 32
    allDevices.push({
      id: `${networkPrefix}NVR-01`,
      type: 'nvr',
      label: `NVR ${channels}-Kanal`,
      manufacturer: project.manufacturer || 'Unknown',
      esoNumber: `${project.manufacturer}-NVR-${channels}CH`,
      category: 'Recorder/VMS'
    })
  } else {
    allDevices.push({
      id: `${networkPrefix}SRV-01`,
      type: 'vms',
      label: 'VMS Server',
      manufacturer: project.manufacturer || 'Unknown',
      esoNumber: `${project.manufacturer}-VMS-SRV`,
      category: 'Recorder/VMS'
    })
  }
  
  // 5. Cameras (in order: Dome Fixed, Dome Vario, Bullet Fixed, Bullet Vario, PTZ, Thermal, IP-Speakers)
  const cameraDevices = generateNetworkDevices(site.name, site, [], videoDevicePrefix, networkDevicePrefix)
  // Filter out switches (already added above)
  const camerasOnly = cameraDevices.filter(d => d.type === 'camera')
  allDevices.push(...camerasOnly)
  
  return allDevices
}

/**
 * Assign IPs to devices sequentially
 */
export const assignIPsToDevices = (
  devices: NetworkDevice[],
  startIP: string
): { devices: NetworkDevice[], error?: string } => {
  if (!validateIPv4(startIP)) {
    return { devices: [], error: 'Ungültige Start-IP-Adresse' }
  }
  
  if (!isValidHostIP(startIP)) {
    return { devices: [], error: 'Start-IP ist keine gültige Host-Adresse (vermeiden Sie .0 oder .255)' }
  }
  
  const available = getAvailableIPsInSubnet(startIP)
  if (devices.length > available) {
    return { 
      devices: [], 
      error: `IP-Bereich reicht nicht aus. Benötigt: ${devices.length}, Verfügbar: ${available}` 
    }
  }
  
  const result: NetworkDevice[] = []
  
  for (let i = 0; i < devices.length; i++) {
    const ip = addIPv4(startIP, i)
    if (!ip) {
      return { devices: [], error: `IP-Überlauf bei Gerät ${i + 1}` }
    }
    
    result.push({
      ...devices[i],
      ip
    })
  }
  
  return { devices: result }
}

