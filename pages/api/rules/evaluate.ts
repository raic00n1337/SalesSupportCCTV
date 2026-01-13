// API Route: /api/rules/evaluate
// Zweck: Evaluate rules for given conditions and return matching product

import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      tier,
      manufacturer,
      category,
      features = {}
    } = req.body

    // Validation
    if (!category) {
      return res.status(400).json({ error: 'category is required' })
    }

    // Get all active rules sorted by priority
    const { data: rules, error: rulesError } = await supabase
      .from('rules')
      .select(`
        *,
        products (
          id,
          name,
          sku,
          eso_number,
          uvp_cents,
          manufacturer_id,
          manufacturers (
            name,
            slug
          )
        )
      `)
      .eq('is_active', true)
      .order('priority', { ascending: false })

    if (rulesError) throw rulesError

    // Evaluate rules in priority order
    for (const rule of rules || []) {
      if (evaluateRule(rule, tier, manufacturer, category, features)) {
        // Rule matched! Return the product
        return res.status(200).json({
          success: true,
          matched: true,
          rule: {
            id: rule.id,
            name: rule.name,
            priority: rule.priority
          },
          product: {
            id: rule.products.id,
            product_id: rule.target_product_id,
            name: rule.products.name,
            sku: rule.products.sku,
            eso_number: rule.products.eso_number,
            uvp_cents: rule.products.uvp_cents,
            manufacturer: rule.products.manufacturers.name,
            manufacturer_slug: rule.products.manufacturers.slug,
            category: rule.category,
            tier: rule.tier
          }
        })
      }
    }

    // No rule matched
    return res.status(200).json({
      success: true,
      matched: false,
      message: 'No matching rule found, use tier-defaults'
    })

  } catch (error: any) {
    console.error('Error evaluating rules:', error)
    return res.status(500).json({ 
      error: 'Failed to evaluate rules', 
      details: error.message 
    })
  }
}

// Evaluate if a rule matches given conditions
function evaluateRule(
  rule: any,
  tier?: string,
  manufacturer?: string,
  category?: string,
  features: Record<string, any> = {}
): boolean {
  // Check tier (if specified in rule)
  if (rule.tier && rule.tier !== tier) {
    return false
  }

  // Check manufacturer (if specified in rule)
  if (rule.manufacturer && rule.manufacturer !== manufacturer) {
    return false
  }

  // Check category (if specified in rule)
  if (rule.category && rule.category !== category) {
    return false
  }

  // Check feature conditions (all must match)
  if (rule.feature_conditions && Object.keys(rule.feature_conditions).length > 0) {
    for (const [key, value] of Object.entries(rule.feature_conditions)) {
      // Check if feature exists and matches
      if (features[key] !== value) {
        return false
      }
    }
  }

  // All conditions matched!
  return true
}
