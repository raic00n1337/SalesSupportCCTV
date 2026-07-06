import { pickBandedProduct, resolveSimpleComponent, resolveBandedComponent } from './configuratorCatalog';
import type { ConfiguratorProduct } from '../pages/api/configurator/products';

function makeProduct(overrides: Partial<ConfiguratorProduct>): ConfiguratorProduct {
  return {
    id: overrides.id || 'id',
    product_id: overrides.product_id || 'product-id',
    name: overrides.name || 'Test-Produkt',
    sku: overrides.sku || 'SKU-1',
    manufacturer: overrides.manufacturer || 'Universal',
    manufacturer_slug: overrides.manufacturer_slug || 'universal',
    uvp_cents: overrides.uvp_cents ?? 10000,
    category: overrides.category || 'network_switch',
    tier: overrides.tier || 'premium',
    bhe_time_minutes: overrides.bhe_time_minutes ?? 0,
    required_accessories: overrides.required_accessories || [],
    is_default: overrides.is_default ?? false,
    priority: overrides.priority ?? 0,
    eso_number: overrides.eso_number,
    tags: overrides.tags,
    capacity_value: overrides.capacity_value,
    capacity_unit: overrides.capacity_unit
  };
}

describe('pickBandedProduct', () => {
  const switches = [
    makeProduct({ sku: 'SW-8', capacity_value: 8, uvp_cents: 29900 }),
    makeProduct({ sku: 'SW-16', capacity_value: 16, uvp_cents: 59900 }),
    makeProduct({ sku: 'SW-24', capacity_value: 24, uvp_cents: 89900 })
  ];

  it('wählt die kleinste Kapazitäts-Stufe, die den Bedarf deckt', () => {
    expect(pickBandedProduct(switches, 5)?.sku).toBe('SW-8');
    expect(pickBandedProduct(switches, 8)?.sku).toBe('SW-8');
    expect(pickBandedProduct(switches, 9)?.sku).toBe('SW-16');
    expect(pickBandedProduct(switches, 17)?.sku).toBe('SW-24');
  });

  it('gibt die größte verfügbare Stufe zurück, wenn keine ausreicht (Best-Effort)', () => {
    expect(pickBandedProduct(switches, 100)?.sku).toBe('SW-24');
  });

  it('gibt undefined zurück, wenn keine Produkte vorhanden sind', () => {
    expect(pickBandedProduct([], 8)).toBeUndefined();
    expect(pickBandedProduct(undefined, 8)).toBeUndefined();
  });

  it('bevorzugt Produkte des angegebenen Herstellers, sofern für die passende Kapazität vorhanden', () => {
    const mixed = [
      makeProduct({ sku: 'SW-8-UNI', capacity_value: 8, manufacturer_slug: 'universal' }),
      makeProduct({ sku: 'SW-8-AXIS', capacity_value: 8, manufacturer_slug: 'axis' }),
      makeProduct({ sku: 'SW-16-UNI', capacity_value: 16, manufacturer_slug: 'universal' })
    ];
    expect(pickBandedProduct(mixed, 5, 'axis')?.sku).toBe('SW-8-AXIS');
    // Für 16 Ports gibt es keinen AXIS-Eintrag -> Fallback auf verfügbare (universal)
    expect(pickBandedProduct(mixed, 9, 'axis')?.sku).toBe('SW-16-UNI');
  });
});

describe('resolveSimpleComponent', () => {
  it('nutzt das DB-Produkt, wenn für die Kategorie vorhanden', () => {
    const product = makeProduct({ category: 'vpn_router', name: 'VPN-Router XY', uvp_cents: 39900, eso_number: 'NET-VPN-001' });
    const result = resolveSimpleComponent('vpn_router', { vpn_router: product }, { name: 'Fallback', price: 1 });
    expect(result).toEqual({
      name: 'VPN-Router XY',
      price: 399,
      eso: 'NET-VPN-001',
      bheTime: 0,
      manufacturer: 'Universal',
      productId: 'product-id'
    });
  });

  it('nutzt den Hardcode-Fallback, wenn kein DB-Produkt für die Kategorie existiert', () => {
    const result = resolveSimpleComponent('vpn_router', {}, { name: 'VPN-Router', price: 399, manufacturer: 'Universal' });
    expect(result.name).toBe('VPN-Router');
    expect(result.price).toBe(399);
    expect(result.manufacturer).toBe('Universal');
    expect(result.eso).toBe('UNIVERSAL-VPN_ROUTER');
  });
});

describe('resolveBandedComponent', () => {
  const byCategory = {
    network_switch: [
      makeProduct({ category: 'network_switch', sku: 'SW-8', name: 'Switch 8P', capacity_value: 8, uvp_cents: 29900, eso_number: 'NET-SW-8P-001' }),
      makeProduct({ category: 'network_switch', sku: 'SW-16', name: 'Switch 16P', capacity_value: 16, uvp_cents: 59900, eso_number: 'NET-SW-16P-001' })
    ]
  };

  it('wählt die passende Kapazitäts-Stufe aus der DB', () => {
    const result = resolveBandedComponent('network_switch', byCategory, 10, { name: 'Fallback', price: 1 });
    expect(result.name).toBe('Switch 16P');
    expect(result.price).toBe(599);
    expect(result.eso).toBe('NET-SW-16P-001');
  });

  it('nutzt den Hardcode-Fallback, wenn die Kategorie in der DB komplett fehlt', () => {
    const result = resolveBandedComponent('network_switch', {}, 10, { name: 'Switch 16-Port', price: 599, manufacturer: 'Universal' });
    expect(result.name).toBe('Switch 16-Port');
    expect(result.price).toBe(599);
    expect(result.eso).toBe('NETWORK_SWITCH-FALLBACK');
  });
});
