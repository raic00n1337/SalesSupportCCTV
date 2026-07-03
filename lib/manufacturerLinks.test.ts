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

  it('builds an exact Hanwha deep link from the SKU (verified pattern: hanwhavision.com/de/products/product-details/<sku>)', () => {
    const link = getManufacturerLink('hanwha', 'XNO-6120R');
    expect(link).toEqual({ url: 'https://www.hanwhavision.com/de/products/product-details/XNO-6120R', exact: true });
  });

  it('is case/whitespace-insensitive on the manufacturer slug', () => {
    const link = getManufacturerLink(' Hanwha ', 'QNV-7080R');
    expect(link?.exact).toBe(true);
    expect(link?.url).toContain('QNV-7080R');
  });

  it('builds an exact AJAX deep link from the product name, not the SKU (verified against real product pages)', () => {
    // https://ajax.systems/de/products/en54-fire-hub-jeweller/
    const simple = getManufacturerLink('ajax', '58610', 'EN54 Fire Hub Jeweller');
    expect(simple).toEqual({ url: 'https://ajax.systems/de/products/en54-fire-hub-jeweller/', exact: true });

    // Resolution/color annotations are variants of one shared page, not
    // separate URLs: https://ajax.systems/de/products/superior-domecam-hlvf/
    const withAnnotations = getManufacturerLink('ajax', '135577.214.BL1', 'Superior DomeCam HLVF (4 Mp) (black)');
    expect(withAnnotations).toEqual({ url: 'https://ajax.systems/de/products/superior-domecam-hlvf/', exact: true });
  });

  it('falls back to a Google site-search for AJAX when no product name is available', () => {
    const link = getManufacturerLink('ajax', '38254.08.BL1');
    expect(link?.exact).toBe(false);
    expect(link?.url).toContain('site%3Aajax.systems');
  });

  it('links to the IQSIGHT commerce site search instead of an exact product page (no reliable SKU->URL mapping is available - the real page requires an internal SAP article ID not present in our price list)', () => {
    const iqsight = getManufacturerLink('iqsight', 'NDP-5522-Z30');
    expect(iqsight?.exact).toBe(false);
    expect(iqsight?.url).toBe('https://commerce.iqsight.com/nlexp/de/search/?text=NDP-5522-Z30');
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
