// API Route: /api/rules
// Zweck: CRUD für Rules (Feature-basierte Produktzuordnung)

import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '../../../lib/apiAuth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface Rule {
  id: string
  name: string
  description?: string
  is_active: boolean
  priority: number
  tier?: string
  manufacturer?: string
  category?: string
  feature_conditions: Record<string, any>
  target_product_id: string
  created_at: string
  updated_at: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Rule management (incl. viewing inactive rules & full conditions) is
  // admin-only, mirroring the "Admins can manage rules" RLS policy.
  const admin = await requireAdmin(req, res)
  if (!admin) {
    return
  }

  if (req.method === 'GET') {
    return handleGet(req, res)
  } else if (req.method === 'POST') {
    return handlePost(req, res)
  } else if (req.method === 'PUT') {
    return handlePut(req, res)
  } else if (req.method === 'DELETE') {
    return handleDelete(req, res)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

// GET: List all rules (with filters)
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { tier, manufacturer, category, active_only } = req.query

    let query = supabase
      .from('rules')
      .select(`
        *,
        products (
          id,
          name,
          sku,
          eso_number,
          uvp_cents,
          manufacturers (
            name,
            slug
          )
        )
      `)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })

    // Filters
    if (tier) {
      query = query.eq('tier', tier)
    }
    if (manufacturer) {
      query = query.eq('manufacturer', manufacturer)
    }
    if (category) {
      query = query.eq('category', category)
    }
    if (active_only === 'true') {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) throw error

    return res.status(200).json({
      success: true,
      rules: data || [],
      count: data?.length || 0
    })
  } catch (error: any) {
    console.error('Error fetching rules:', error)
    return res.status(500).json({ error: 'Failed to fetch rules', details: error.message })
  }
}

// POST: Create new rule
async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      name,
      description,
      is_active = true,
      priority = 0,
      tier,
      manufacturer,
      category,
      feature_conditions = {},
      target_product_id
    } = req.body

    // Validation
    if (!name) {
      return res.status(400).json({ error: 'Name is required' })
    }
    if (!target_product_id) {
      return res.status(400).json({ error: 'target_product_id is required' })
    }

    // Must have at least one condition
    if (!tier && !manufacturer && !category && Object.keys(feature_conditions).length === 0) {
      return res.status(400).json({ 
        error: 'At least one condition required (tier, manufacturer, category, or feature_conditions)' 
      })
    }

    const { data, error } = await (supabase
      .from('rules') as any)
      .insert({
        name,
        description,
        is_active,
        priority,
        tier,
        manufacturer,
        category,
        feature_conditions,
        target_product_id
      })
      .select()
      .single()

    if (error) throw error

    return res.status(201).json({
      success: true,
      rule: data
    })
  } catch (error: any) {
    console.error('Error creating rule:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    console.error('Error stack:', error.stack)
    return res.status(500).json({ 
      error: 'Failed to create rule', 
      details: error.message,
      code: error.code,
      hint: error.hint
    })
  }
}

// PUT: Update existing rule
async function handlePut(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query
    const {
      name,
      description,
      is_active,
      priority,
      tier,
      manufacturer,
      category,
      feature_conditions,
      target_product_id
    } = req.body

    if (!id) {
      return res.status(400).json({ error: 'Rule ID is required' })
    }

    const { data, error } = await (supabase
      .from('rules') as any)
      .update({
        name,
        description,
        is_active,
        priority,
        tier,
        manufacturer,
        category,
        feature_conditions,
        target_product_id
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return res.status(200).json({
      success: true,
      rule: data
    })
  } catch (error: any) {
    console.error('Error updating rule:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    console.error('Error stack:', error.stack)
    return res.status(500).json({ 
      error: 'Failed to update rule', 
      details: error.message,
      code: error.code,
      hint: error.hint
    })
  }
}

// DELETE: Delete rule
async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query

    if (!id) {
      return res.status(400).json({ error: 'Rule ID is required' })
    }

    const { error } = await (supabase
      .from('rules') as any)
      .delete()
      .eq('id', id)

    if (error) throw error

    return res.status(200).json({
      success: true,
      message: 'Rule deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting rule:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    console.error('Error stack:', error.stack)
    return res.status(500).json({ 
      error: 'Failed to delete rule', 
      details: error.message,
      code: error.code,
      hint: error.hint
    })
  }
}
