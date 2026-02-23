/**
 * Brand logos for gas station map markers.
 * Uses real logo images from precioil.es with an SVG fallback for unknown brands.
 */

const PRECIOIL_BASE = 'https://precioil.es/datos/imagenes/selector';

// ─── Brand name → precioil.es filename slug ─────────────────
// Explicit mapping for brands whose slug differs from simple lowercase.
// Single-word brands (REPSOL, CEPSA, SHELL…) auto-resolve via toLowerCase().

const BRAND_SLUG_OVERRIDES: Record<string, string> = {
  'E.LECLERC':        'e.leclerc',
  'ELECLERC':         'e.leclerc',
  'GALP&GO':          'galp',
  'LOW COST':         'lowcost',
  'LOW COST REPOST':  'lowcost',
  'STAR PETROLEUM':   'star',
  'NOVEL OIL SYSTEM': 'novel',
  'OIL+':             'oil',
  'SIMON GRUP':       'simon',
};

// ─── Generic fuel pump SVG (fallback for unknown brands) ─────

const genericSvg = (c: string): string =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">${c}</svg>`)}`;

export const GENERIC_LOGO = genericSvg(
  '<circle cx="20" cy="20" r="20" fill="#6B7280"/>'
  + '<rect x="10" y="10" width="13" height="16" rx="2" fill="#fff"/>'
  + '<rect x="12" y="12" width="9" height="5" rx="1" fill="#6B7280"/>'
  + '<path d="M23 15l4 3v7h-2v-5h-2" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
  + '<rect x="13" y="27" width="7" height="3" rx="1" fill="#fff"/>',
);

// ─── Brand color map (for popups / badges) ───────────────────

export const BRAND_COLORS: Record<string, { bg: string; fg: string }> = {
  REPSOL:     { bg: '#EE3524', fg: '#fff' },
  BP:         { bg: '#009A44', fg: '#fff' },
  CEPSA:      { bg: '#E31837', fg: '#fff' },
  SHELL:      { bg: '#DD1D21', fg: '#fff' },
  GALP:       { bg: '#FF5A00', fg: '#fff' },
  MOEVE:      { bg: '#1E3A8A', fg: '#fff' },
  BALLENOIL:  { bg: '#0891B2', fg: '#fff' },
  ALCAMPO:    { bg: '#DC2626', fg: '#fff' },
  CARREFOUR:  { bg: '#004E98', fg: '#fff' },
  PETROPRIX:  { bg: '#16A34A', fg: '#fff' },
  'E.LECLERC':{ bg: '#0057A8', fg: '#fff' },
  PLENERGY:   { bg: '#059669', fg: '#fff' },
  PLENOIL:    { bg: '#0D9488', fg: '#fff' },
  Q8:         { bg: '#008751', fg: '#fff' },
  ENI:        { bg: '#FDE047', fg: '#333' },
  STAR:       { bg: '#B91C1C', fg: '#fff' },
  DISA:       { bg: '#1B3A5C', fg: '#fff' },
  AVIA:       { bg: '#1D4ED8', fg: '#fff' },
  CAMPSA:     { bg: '#DC2626', fg: '#FDE047' },
  EROSKI:     { bg: '#EA580C', fg: '#fff' },
  BONAREA:    { bg: '#65A30D', fg: '#fff' },
  MEROIL:     { bg: '#0284C7', fg: '#fff' },
  SCAT:       { bg: '#0F766E', fg: '#fff' },
  ZOILO:      { bg: '#6D28D9', fg: '#fff' },
  'LOW COST': { bg: '#F59E0B', fg: '#333' },
};

// ─── Lookup helpers ──────────────────────────────────────────

/**
 * Returns the real logo URL for a brand from precioil.es.
 * Falls back to auto-generated slug. The caller should use `onerror`
 * on the `<img>` to show GENERIC_LOGO when the URL doesn't exist.
 */
export function getBrandLogoUrl(marca?: string): string {
  if (!marca) return GENERIC_LOGO;
  const m = marca.toUpperCase().trim();

  // 1. Check explicit overrides (exact match first)
  if (BRAND_SLUG_OVERRIDES[m]) {
    return `${PRECIOIL_BASE}/${BRAND_SLUG_OVERRIDES[m]}.webp`;
  }

  // 2. Check partial matches in overrides (e.g. "LOW COST REPOST" includes "LOW COST")
  for (const [key, slug] of Object.entries(BRAND_SLUG_OVERRIDES)) {
    if (m.includes(key)) return `${PRECIOIL_BASE}/${slug}.webp`;
  }

  // 3. Auto-generate slug: use the lowercase brand name
  //    For multi-word brands, try the first word (most brands are single-word)
  const slug = m.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${PRECIOIL_BASE}/${slug}.webp`;
}

/** Returns { bg, fg } for a brand, gray fallback for unknowns. */
export function getBrandColor(marca?: string): { bg: string; fg: string } {
  const m = (marca || '').toUpperCase().trim();
  for (const [key, colors] of Object.entries(BRAND_COLORS)) {
    if (m.includes(key)) return colors;
  }
  return { bg: '#6B7280', fg: '#fff' };
}
