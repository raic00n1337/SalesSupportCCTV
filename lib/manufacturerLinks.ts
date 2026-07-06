// Generates a "view on manufacturer website" link for a product.
//
// Reliability differs a lot between manufacturers:
// - AXIS product pages follow a stable, name-derivable pattern
//   (axis.com/products/axis-<model>). Note this MUST be derived from the
//   marketing name ("Product Name" column, e.g. "AXIS M3057-PLR Mk II Dome
//   Camera"), not the SKU - AXIS's "Product Number EUR" column is an
//   internal ordering part number (e.g. "02457-001") that never appears in
//   the product page URL. Verified against several real product pages.
// - Hanwha Vision's global site serves every product (cameras, recorders,
//   accessories) at the same predictable path (DACH/German locale) -
//   hanwhavision.com/de/products/product-details/<model> - verified against
//   several real SKUs, so this is treated as an exact link too.
// - AJAX: a name-derived ajax.systems/de/products/<name-slug>/ pattern was
//   tried, but turned out to 404 across the board once checked against the
//   live site - not just a few edge cases. There's no reliable pattern, so
//   AJAX falls back to a site search like every other unmapped manufacturer.
// - IQSIGHT (Bosch/Keenfinity) product pages need an internal SAP article ID
//   in the URL (.../p/<id>/) - the price list's "SAP-Nr." column
//   (e.g. "F.01U.390.686") gives us exactly that, mapped to `sap_number` in
//   formatProfiles.ts. The slug segment before "/p/" is purely cosmetic -
//   verified live that the server resolves the page from the ID alone even
//   with a garbage slug - so we don't need to get it exactly right. Without
//   a SAP number (e.g. a manually-added product with no import data) we
//   fall back to the manufacturer's own on-site search for the SKU, which at
//   least stays on the correct (commerce.iqsight.com) domain instead of Google.
// - For every other manufacturer, no reliable pattern is known, so we fall
//   back to a Google site-search link, which always resolves to something
//   useful even if it isn't the exact product page.
//
// Whenever the source price list already contains an explicit product URL
// column, that value should be used directly instead of calling this helper
// (see COLUMN_NAME_ALIASES.manufacturer_url in formatProfiles.ts).

export interface ManufacturerLink {
  url: string;
  /** true = exact deep link to the product page, false = best-effort search link */
  exact: boolean;
}

// Older imports persisted a best-effort Google site-search as
// `manufacturer_url` (the only option available at the time). That's not an
// exact product link, so don't trust it as one - recompute live via
// `getManufacturerLink`, which may since have gained an exact pattern for
// that manufacturer.
export function isSearchFallbackUrl(url: string): boolean {
  return url.includes('google.com/search');
}

const MANUFACTURER_DOMAINS: Record<string, string> = {
  axis: 'axis.com',
  hanwha: 'hanwhavision.com',
  ajax: 'ajax.systems',
  // The public marketing site is iqsight.com, but the actual product
  // catalog/shop lives on this commerce subdomain.
  iqsight: 'commerce.iqsight.com',
  avigilon: 'avigilon.com',
  pelco: 'pelco.com',
};

const ROMAN_NUMERAL_RE = /^(i|ii|iii|iv|v|vi|vii|viii|ix|x)$/i;

/** True for tokens like "M3057-PLR", "D4100-E", "TQ3904" - a mix of letters
 * and digits, which is how Axis model numbers are written. Plain numbers
 * ("7", "30") or plain words ("mm", "fps", "DOME", "CAMERA") don't count,
 * since those are lens/variant specs or catalog category labels tacked onto
 * the "Product Name" column rather than part of the model itself. */
function isAxisModelToken(token: string): boolean {
  return /[a-zA-Z]/.test(token) && /\d/.test(token);
}

/**
 * Builds the axis.com product-page slug from the price list's marketing
 * name (not the SKU/order number). Keeps everything through the last
 * alphanumeric model-like token, plus a trailing "Mk <roman numeral>"
 * revision suffix if present (e.g. "M3057-PLR Mk II"), and drops any
 * trailing descriptive words (e.g. "Dome Camera", "7 mm 30 fps").
 */
function slugifyAxisName(name: string): string {
  const withoutPrefix = name.trim().replace(/^axis\s+/i, '');
  const tokens = withoutPrefix.split(/\s+/).filter(Boolean);

  let lastModelIdx = -1;
  tokens.forEach((token, i) => {
    if (isAxisModelToken(token)) {
      lastModelIdx = i;
    } else if (/^mk$/i.test(token) && ROMAN_NUMERAL_RE.test(tokens[i + 1] || '')) {
      lastModelIdx = i + 1;
    }
  });

  const modelTokens = lastModelIdx >= 0 ? tokens.slice(0, lastModelIdx + 1) : tokens;
  return `axis-${modelTokens.join('-').toLowerCase()}`;
}

function siteSearchUrl(domain: string, sku: string): string {
  const query = encodeURIComponent(`site:${domain} ${sku}`);
  return `https://www.google.com/search?q=${query}`;
}

function iqsightSearchUrl(sku: string): string {
  return `https://${MANUFACTURER_DOMAINS.iqsight}/nlexp/de/search/?text=${encodeURIComponent(sku.trim())}`;
}

/** Cosmetic-only slug for the IQSIGHT product URL (the server resolves the
 * page purely from the "/p/<sap-number>/" ID segment - see file header). */
function slugifyIqsightName(name: string): string {
  const base = name.split('|')[0].trim();
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'produkt';
}

function iqsightProductUrl(name: string | undefined, sapNumber: string): string {
  const slug = name && name.trim() ? slugifyIqsightName(name) : 'produkt';
  return `https://${MANUFACTURER_DOMAINS.iqsight}/nlexp/de/${slug}/p/${encodeURIComponent(sapNumber.trim())}/`;
}

/**
 * Best-effort link to a product on its manufacturer's website.
 * @param manufacturerSlug lowercase manufacturer slug, e.g. "axis", "hanwha", "avigilon"
 * @param sku the product's SKU / model number
 * @param name the product's marketing/display name, used for AXIS (whose
 *   SKU is an internal order number that doesn't appear in the product URL)
 * @param manufacturerArticleNumber manufacturer-specific internal article ID,
 *   used for IQSIGHT (the "SAP-Nr." column, e.g. "F.01U.390.686")
 */
export function getManufacturerLink(
  manufacturerSlug: string,
  sku: string,
  name?: string,
  manufacturerArticleNumber?: string
): ManufacturerLink | null {
  const slug = manufacturerSlug?.toLowerCase().trim();
  if (!slug || !sku) return null;

  if (slug === 'axis') {
    if (name && name.trim()) {
      return { url: `https://www.${MANUFACTURER_DOMAINS.axis}/products/${slugifyAxisName(name)}`, exact: true };
    }
    // No name available - the SKU is just an order number and can't reliably
    // be turned into a product URL, so fall back to a site search instead.
    return { url: siteSearchUrl(MANUFACTURER_DOMAINS.axis, sku), exact: false };
  }

  if (slug === 'hanwha') {
    const model = encodeURIComponent(sku.trim());
    return { url: `https://www.${MANUFACTURER_DOMAINS.hanwha}/de/products/product-details/${model}`, exact: true };
  }

  if (slug === 'iqsight') {
    if (manufacturerArticleNumber && manufacturerArticleNumber.trim()) {
      return { url: iqsightProductUrl(name, manufacturerArticleNumber), exact: true };
    }
    return { url: iqsightSearchUrl(sku), exact: false };
  }

  const domain = MANUFACTURER_DOMAINS[slug];
  if (!domain) {
    // Unknown manufacturer: fall back to a plain web search, no site restriction.
    return { url: `https://www.google.com/search?q=${encodeURIComponent(`${manufacturerSlug} ${sku}`)}`, exact: false };
  }

  return { url: siteSearchUrl(domain, sku), exact: false };
}
