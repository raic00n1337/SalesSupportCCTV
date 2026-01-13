// API Route: /api/configurator/products
// Zweck: Produkte für Konfigurator abrufen (nach Tier + Kategorie)

import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface ConfiguratorProduct {
  id: string
  product_id: string
  name: string
  sku: string
  manufacturer: string
  manufacturer_slug: string
  uvp_cents: number
  category: string
  tier: string
  bhe_time_minutes: number
  required_accessories: string[]
  is_default: boolean
  priority: number
  description?: string
  eso_number?: string
  tags?: string[]
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Nur GET erlaubt
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { tier, category } = req.query

    // Validierung
    if (!tier || !category) {
      return res.status(400).json({ 
        error: 'Missing required parameters: tier, category' 
      })
    }

    // Tier validieren
    const validTiers = ['eco', 'premium', 'high-risk']
    if (!validTiers.includes(tier as string)) {
      return res.status(400).json({ 
        error: `Invalid tier. Must be one of: ${validTiers.join(', ')}` 
      })
    }

    // Query: configurator_products mit JOIN auf products + manufacturers
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
      .eq('category', category)
      .order('priority', { ascending: false }) // Höchste Priorität zuerst
      .order('is_default', { ascending: false }) // Defaults zuerst

    if (error) {
      console.error('Supabase error:', error)
      return res.status(500).json({ error: 'Database query failed', details: error.message })
    }

    // Daten transformieren
    const products: ConfiguratorProduct[] = (data || []).map((cp: any) => ({
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
    }))

    return res.status(200).json({
      success: true,
      products,
      count: products.length,
      tier,
      category
    })

  } catch (error: any) {
    console.error('API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    })
  }
}
