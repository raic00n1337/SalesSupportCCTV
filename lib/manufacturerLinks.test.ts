import { getManufacturerLink } from './manufacturerLinks';

describe('getManufacturerLink', () => {
  it('builds an exact AXIS deep link from the product name, not the SKU order number (verified against real product pages)', () => {
    // Real-world case: SKU is AXIS's internal order number ("Product Number
    // EUR" column), which never appears in the product page URL - only the
    // marketing name does. https://www.axis.com/products/axis-m3057-plr-mk-ii
    const link = getManufacturerLink('axis', '02457-001', 'AXIS M3057-PLR Mk II DOME CAMERA');
    expect(link).toEqual({ url: 'https://www.axis.com/products/axis-m3057-plr-mk-ii', exact: true });

    // Simple case with no descriptive suffix or revision marker.
    // https://www.axis.com/products/axis-p1468-xle
    const simple = getManufacturerLink('axis', '02534-001', 'AXIS P1468-XLE');
    expect(simple).toEqual({ url: 'https://www.axis.com/products/axis-p1468-xle', exact: true });

    // Trailing lens/variant specs (not part of the model) should be dropped too.
    const variant = getManufacturerLink('axis', '02535-001', 'AXIS Q1961-XTE 7 mm 30 fps');
    expect(variant).toEqual({ url: 'https://www.axis.com/products/axis-q1961-xte', exact: true });
  });

  it('falls back to a Google site-search for AXIS when no product name is available', () => {
    const link = getManufacturerLink('axis', '02457-001');
    expect(link?.exact).toBe(false);
    expect(link?.url).toContain('site%3Aaxis.com');
  });

  it('builds an exact Hanwha deep link from the SKU (verified pattern: hanwhavision.com/en/products/product-details/<sku>)', () => {
    const link = getManufacturerLink('hanwha', 'XNO-6120R');
    expect(link).toEqual({ url: 'https://www.hanwhavision.com/en/products/product-details/XNO-6120R', exact: true });
  });

  it('is case/whitespace-insensitive on the manufacturer slug', () => {
    const link = getManufacturerLink(' Hanwha ', 'QNV-7080R');
    expect(link?.exact).toBe(true);
    expect(link?.url).toContain('QNV-7080R');
  });

  it('falls back to a Google site-search for manufacturers without a known URL pattern (e.g. AJAX, IQSIGHT)', () => {
    const ajax = getManufacturerLink('ajax', '38254.08.BL1');
    expect(ajax?.exact).toBe(false);
    expect(ajax?.url).toContain('site%3Aajax.systems');

    const iqsight = getManufacturerLink('iqsight', 'NDP-5522-Z30');
    expect(iqsight?.exact).toBe(false);
    expect(iqsight?.url).toContain('site%3Aiqsight.com');
  });

  it('falls back to a plain web search for a manufacturer with no domain mapping at all', () => {
    const link = getManufacturerLink('some-new-brand', 'MODEL-1');
    expect(link?.exact).toBe(false);
    expect(link?.url).toContain('google.com/search');
  });

  it('returns null when slug or sku is missing', () => {
    expect(getManufacturerLink('', 'SKU-1')).toBeNull();
    expect(getManufacturerLink('axis', '')).toBeNull();
  });
});
