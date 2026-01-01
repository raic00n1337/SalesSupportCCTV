import { describe, it, expect } from '@jest/globals'
import { 
  parseIPv4, 
  formatIPv4, 
  addIPv4, 
  validateIPv4, 
  isValidHostIP,
  getAvailableIPsInSubnet,
  assignIPsToDevices,
  type NetworkDevice
} from '../ipHelper'

describe('IP Helper Functions', () => {
  describe('parseIPv4', () => {
    it('should parse valid IPv4 addresses', () => {
      expect(parseIPv4('192.168.1.1')).toBe((192 << 24) | (168 << 16) | (1 << 8) | 1)
      expect(parseIPv4('10.0.0.1')).toBe((10 << 24) | 1)
      expect(parseIPv4('255.255.255.255')).toBe(0xFFFFFFFF)
      expect(parseIPv4('0.0.0.0')).toBe(0)
    })

    it('should return null for invalid IPv4 addresses', () => {
      expect(parseIPv4('192.168.1')).toBeNull()
      expect(parseIPv4('192.168.1.256')).toBeNull()
      expect(parseIPv4('192.168.-1.1')).toBeNull()
      expect(parseIPv4('192.168.1.1.1')).toBeNull()
      expect(parseIPv4('abc.def.ghi.jkl')).toBeNull()
    })
  })

  describe('formatIPv4', () => {
    it('should format number to IPv4 string', () => {
      expect(formatIPv4((192 << 24) | (168 << 16) | (1 << 8) | 1)).toBe('192.168.1.1')
      expect(formatIPv4((10 << 24) | 1)).toBe('10.0.0.1')
      expect(formatIPv4(0xFFFFFFFF)).toBe('255.255.255.255')
      expect(formatIPv4(0)).toBe('0.0.0.0')
    })
  })

  describe('addIPv4', () => {
    it('should add offset to IPv4 address', () => {
      expect(addIPv4('192.168.1.1', 0)).toBe('192.168.1.1')
      expect(addIPv4('192.168.1.1', 1)).toBe('192.168.1.2')
      expect(addIPv4('192.168.1.254', 1)).toBe('192.168.1.255')
      expect(addIPv4('192.168.1.255', 1)).toBe('192.168.2.0')
      expect(addIPv4('192.168.1.1', 100)).toBe('192.168.1.101')
    })

    it('should return null for invalid start IP', () => {
      expect(addIPv4('192.168.1', 1)).toBeNull()
      expect(addIPv4('invalid.ip', 1)).toBeNull()
    })

    it('should handle overflow correctly', () => {
      expect(addIPv4('255.255.255.255', 1)).toBeNull()
    })
  })

  describe('validateIPv4', () => {
    it('should validate correct IPv4 addresses', () => {
      expect(validateIPv4('192.168.1.1')).toBe(true)
      expect(validateIPv4('10.0.0.1')).toBe(true)
      expect(validateIPv4('255.255.255.255')).toBe(true)
      expect(validateIPv4('0.0.0.0')).toBe(true)
    })

    it('should reject invalid IPv4 addresses', () => {
      expect(validateIPv4('192.168.1')).toBe(false)
      expect(validateIPv4('192.168.1.256')).toBe(false)
      expect(validateIPv4('invalid')).toBe(false)
    })
  })

  describe('isValidHostIP', () => {
    it('should accept valid host IPs', () => {
      expect(isValidHostIP('192.168.1.1')).toBe(true)
      expect(isValidHostIP('192.168.1.50')).toBe(true)
      expect(isValidHostIP('10.0.0.100')).toBe(true)
    })

    it('should reject network addresses (last octet = 0)', () => {
      expect(isValidHostIP('192.168.1.0')).toBe(false)
    })

    it('should reject broadcast addresses (last octet = 255)', () => {
      expect(isValidHostIP('192.168.1.255')).toBe(false)
      expect(isValidHostIP('255.255.255.255')).toBe(false)
    })

    it('should reject 0.0.0.0', () => {
      expect(isValidHostIP('0.0.0.0')).toBe(false)
    })
  })

  describe('getAvailableIPsInSubnet', () => {
    it('should calculate available IPs correctly', () => {
      expect(getAvailableIPsInSubnet('192.168.1.1')).toBe(253) // 254 - 1
      expect(getAvailableIPsInSubnet('192.168.1.50')).toBe(204) // 254 - 50
      expect(getAvailableIPsInSubnet('192.168.1.254')).toBe(0) // 254 - 254
    })

    it('should return 0 for invalid IP', () => {
      expect(getAvailableIPsInSubnet('invalid')).toBe(0)
    })
  })

  describe('assignIPsToDevices', () => {
    const mockDevices: NetworkDevice[] = [
      {
        id: 'CAM-01',
        type: 'camera',
        label: 'Camera 1',
        manufacturer: 'AXIS',
        esoNumber: 'AXIS-001',
        category: 'Kameras'
      },
      {
        id: 'CAM-02',
        type: 'camera',
        label: 'Camera 2',
        manufacturer: 'AXIS',
        esoNumber: 'AXIS-002',
        category: 'Kameras'
      },
      {
        id: 'SW-01',
        type: 'switch',
        label: 'Switch 8-Port',
        manufacturer: 'Universal',
        esoNumber: 'NET-SW-001',
        category: 'Netzwerk'
      }
    ]

    it('should assign sequential IPs to devices', () => {
      const result = assignIPsToDevices(mockDevices, '192.168.1.50')
      
      expect(result.error).toBeUndefined()
      expect(result.devices).toHaveLength(3)
      expect(result.devices[0].ip).toBe('192.168.1.50')
      expect(result.devices[1].ip).toBe('192.168.1.51')
      expect(result.devices[2].ip).toBe('192.168.1.52')
    })

    it('should return error for invalid start IP', () => {
      const result = assignIPsToDevices(mockDevices, 'invalid.ip')
      
      expect(result.error).toBe('Ungültige Start-IP-Adresse')
      expect(result.devices).toHaveLength(0)
    })

    it('should return error for host IP ending in .0', () => {
      const result = assignIPsToDevices(mockDevices, '192.168.1.0')
      
      expect(result.error).toBe('Start-IP ist keine gültige Host-Adresse (vermeiden Sie .0 oder .255)')
      expect(result.devices).toHaveLength(0)
    })

    it('should return error for host IP ending in .255', () => {
      const result = assignIPsToDevices(mockDevices, '192.168.1.255')
      
      expect(result.error).toBe('Start-IP ist keine gültige Host-Adresse (vermeiden Sie .0 oder .255)')
      expect(result.devices).toHaveLength(0)
    })

    it('should return error when IP range is insufficient', () => {
      const manyDevices = Array.from({ length: 300 }, (_, i) => ({
        id: `CAM-${i}`,
        type: 'camera' as const,
        label: `Camera ${i}`,
        manufacturer: 'AXIS',
        esoNumber: `AXIS-${i}`,
        category: 'Kameras'
      }))
      
      const result = assignIPsToDevices(manyDevices, '192.168.1.50')
      
      expect(result.error).toContain('IP-Bereich reicht nicht aus')
      expect(result.devices).toHaveLength(0)
    })

    it('should maintain deterministic order', () => {
      const result1 = assignIPsToDevices(mockDevices, '192.168.1.100')
      const result2 = assignIPsToDevices(mockDevices, '192.168.1.100')
      
      expect(result1.devices.map(d => d.id)).toEqual(result2.devices.map(d => d.id))
      expect(result1.devices.map(d => d.ip)).toEqual(result2.devices.map(d => d.ip))
    })
  })
})

