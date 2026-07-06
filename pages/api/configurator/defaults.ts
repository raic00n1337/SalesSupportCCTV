// API Route: /api/configurator/defaults
// Zweck: Alle Konfigurator-Produkte für einen Tier abrufen (Defaults + vollständige
// Kapazitäts-Staffelung), optional nach Hersteller vorsortiert.

import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { ConfiguratorProduct } from './products'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Nur GET erlaubt
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { tier, manufacturer } = req.query
    const manufacturerSlug = typeof manufacturer === 'string' ? manufacturer.toLowerCase() : undefined

    // Validierung
    if (!tier) {
      return res.status(400).json({ 
        error: 'Missing required parameter: tier' 
      })
    }

    // Tier validieren
    const validTiers = ['eco', 'premium', 'high-risk']
    if (!validTiers.includes(tier as string)) {
      return res.status(400).json({ 
        error: `Invalid tier. Must be one of: ${validTiers.join(', ')}` 
      })
    }

    // Query: ALLE Produkte für dieses Tier (nicht nur Defaults!), damit
    // kapazitäts-gestaffelte Kategorien (z.B. Switch nach Port-Anzahl, NVR nach
    // Kanal-Anzahl) client-seitig die passende Stufe wählen können.
    const { data, error } = await supabase
      .from('configurator_products')
      .select(`
        id,
        product_id,
        tier,
        category,
        priority,
        is_default,
        bhe_time_minutes,
        required_accessories,
        capacity_value,
        capacity_unit,
        products (
          name,
          sku,
          eso_number,
          uvp_cents,
          description,
          tags,
          manufacturer_id,
          manufacturers (
            name,
            slug
          )
        )
      `)
      .eq('tier', tier)
      .order('capacity_value', { ascending: true })

    if (error) {
      console.error('Supabase error:', error)
      // If table doesn't exist, return empty defaults (graceful fallback)
      return res.status(200).json({ 
        success: true,
        defaults: {},
        byCategory: {},
        count: 0,
        tier,
        categories: [],
        warning: 'configurator_products table not available',
        error: error.message
      })
    }

    const allProducts: ConfiguratorProduct[] = (data || []).map((cp: any) => ({
      id: cp.id,
      product_id: cp.product_id,
      name: cp.products.name,
      sku: cp.products.sku,
      eso_number: cp.products.eso_number,
      manufacturer: cp.products.manufacturers.name,
      manufacturer_slug: cp.products.manufacturers.slug,
      uvp_cents: cp.products.uvp_cents,
      category: cp.category,
      tier: cp.tier,
      bhe_time_minutes: cp.bhe_time_minutes,
      required_accessories: cp.required_accessories || [],
      is_default: cp.is_default,
      priority: cp.priority,
      description: cp.products.description,
      tags: cp.products.tags || [],
      capacity_value: cp.capacity_value,
      capacity_unit: cp.capacity_unit
    }))

    // Alle Produkte pro Kategorie gruppiert (für Kapazitäts-Staffelung nötig)
    const byCategory: Record<string, ConfiguratorProduct[]> = {}
    allProducts.forEach((p) => {
      if (!byCategory[p.category]) byCategory[p.category] = []
      byCategory[p.category].push(p)
    })

    // Ein "Default" je Kategorie ermitteln: Hersteller-Treffer bevorzugt vor
    // "universal", Default-Flag bevorzugt vor Priorität.
    const defaultsMap: Record<string, ConfiguratorProduct> = {}
    for (const [category, items] of Object.entries(byCategory)) {
      const sorted = [...items].sort((a, b) => {
        if (manufacturerSlug) {
          const aMatch = a.manufacturer_slug === manufacturerSlug ? 1 : 0
          const bMatch = b.manufacturer_slug === manufacturerSlug ? 1 : 0
          if (aMatch !== bMatch) return bMatch - aMatch
        }
        const aDefault = a.is_default ? 1 : 0
        const bDefault = b.is_default ? 1 : 0
        if (aDefault !== bDefault) return bDefault - aDefault
        return (b.priority || 0) - (a.priority || 0)
      })
      if (sorted[0]) defaultsMap[category] = sorted[0]
    }

    return res.status(200).json({
      success: true,
      defaults: defaultsMap,
      byCategory,
      count: Object.keys(defaultsMap).length,
      tier,
      categories: Object.keys(defaultsMap)
    })

  } catch (error: any) {
    console.error('API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    })
  }
}
