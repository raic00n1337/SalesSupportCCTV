// Generates a "view on manufacturer website" link for a product.
//
// Reliability differs a lot between manufacturers:
// - AXIS product pages follow a stable, SKU-derivable pattern
//   (axis.com/products/axis-<model>), so we can build an exact deep link.
// - For every other manufacturer, the same pattern either doesn't exist or
//   isn't reliably derivable from the SKU alone (varies by category, uses
//   marketing slugs, etc.). For those we fall back to a Google site-search
//   link, which always resolves to something useful even if it isn't the
//   exact product page.
//
// Whenever the source price list already contains an explicit product URL
// column, that value should be used directly instead of calling this helper
// (see COLUMN_NAME_ALIASES.manufacturer_url in formatProfiles.ts).

export interface ManufacturerLink {
  url: string;
  /** true = exact deep link to the product page, false = best-effort search link */
  exact: boolean;
}

const MANUFACTURER_DOMAINS: Record<string, string> = {
  axis: 'axis.com',
  hanwha: 'hanwhavision.com',
  ajax: 'ajax.systems',
  iqsight: 'iqsight.com',
  avigilon: 'avigilon.com',
  pelco: 'pelco.com',
};

function slugifyAxisSku(sku: string): string {
  const withoutPrefix = sku.trim().replace(/^axis[\s-]*/i, '');
  return `axis-${withoutPrefix.toLowerCase().replace(/\s+/g, '-')}`;
}

function siteSearchUrl(domain: string, sku: string): string {
  const query = encodeURIComponent(`site:${domain} ${sku}`);
  return `https://www.google.com/search?q=${query}`;
}

/**
 * Best-effort link to a product on its manufacturer's website.
 * @param manufacturerSlug lowercase manufacturer slug, e.g. "axis", "hanwha", "avigilon"
 * @param sku the product's SKU / model number
 */
export function getManufacturerLink(manufacturerSlug: string, sku: string): ManufacturerLink | null {
  const slug = manufacturerSlug?.toLowerCase().trim();
  if (!slug || !sku) return null;

  if (slug === 'axis') {
    return { url: `https://www.${MANUFACTURER_DOMAINS.axis}/products/${slugifyAxisSku(sku)}`, exact: true };
  }

  const domain = MANUFACTURER_DOMAINS[slug];
  if (!domain) {
    // Unknown manufacturer: fall back to a plain web search, no site restriction.
    return { url: `https://www.google.com/search?q=${encodeURIComponent(`${manufacturerSlug} ${sku}`)}`, exact: false };
  }

  return { url: siteSearchUrl(domain, sku), exact: false };
}
