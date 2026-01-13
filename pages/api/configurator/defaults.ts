// API Route: /api/configurator/defaults
// Zweck: Default-Produkte für alle Kategorien eines Tiers abrufen

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
    const { tier } = req.query

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

    // Query: Nur Default-Produkte für dieses Tier
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
      .eq('is_default', true) // Nur Defaults!

    if (error) {
      console.error('Supabase error:', error)
      return res.status(500).json({ error: 'Database query failed', details: error.message })
    }

    // Daten transformieren und nach Kategorie gruppieren
    const defaultsMap: Record<string, ConfiguratorProduct> = {}

    ;(data || []).forEach((cp: any) => {
      defaultsMap[cp.category] = {
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
        tags: cp.products.tags || []
      }
    })

    return res.status(200).json({
      success: true,
      defaults: defaultsMap,
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
