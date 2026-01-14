import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * API Route: /api/system-designer/placements
 * 
 * GET: Fetch all placements for a design
 * POST: Create a new placement
 * PUT: Update an existing placement
 * DELETE: Delete a placement
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  try {
    switch (method) {
      case 'GET':
        return await handleGet(req, res)
      case 'POST':
        return await handlePost(req, res)
      case 'PUT':
        return await handlePut(req, res)
      case 'DELETE':
        return await handleDelete(req, res)
      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error: any) {
    console.error('Camera Placements API Error:', error)
    return res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}

/**
 * GET: Fetch all placements for a design
 * Query params: system_design_id
 */
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { system_design_id } = req.query

  if (!system_design_id) {
    return res.status(400).json({ error: 'Missing system_design_id' })
  }

  const { data: placements, error } = await supabase
    .from('camera_placements')
    .select('*')
    .eq('system_design_id', system_design_id)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching placements:', error)
    return res.status(500).json({ error: 'Failed to fetch placements', details: error.message })
  }

  return res.status(200).json({
    success: true,
    placements
  })
}

/**
 * POST: Create a new placement
 */
async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const {
    system_design_id,
    camera_type,
    camera_name,
    product_id,
    position_x,
    position_y,
    rotation,
    focal_length_mm,
    field_of_view,
    detection_range_m,
    show_detection_cone,
    cone_color,
    cone_opacity,
    notes
  } = req.body

  if (!system_design_id || !camera_type || position_x === undefined || position_y === undefined) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const { data: placement, error } = await (supabase
    .from('camera_placements') as any)
    .insert({
      system_design_id,
      camera_type,
      camera_name,
      product_id,
      position_x,
      position_y,
      rotation: rotation ?? 0,
      focal_length_mm: focal_length_mm ?? 2.8,
      field_of_view: field_of_view ?? 90,
      detection_range_m: detection_range_m ?? 30,
      show_detection_cone: show_detection_cone ?? true,
      cone_color: cone_color ?? '#3b82f6',
      cone_opacity: cone_opacity ?? 0.3,
      notes
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating placement:', error)
    return res.status(500).json({ error: 'Failed to create placement', details: error.message })
  }

  return res.status(201).json({
    success: true,
    placement
  })
}

/**
 * PUT: Update an existing placement
 */
async function handlePut(req: NextApiRequest, res: NextApiResponse) {
  const {
    id,
    camera_name,
    position_x,
    position_y,
    rotation,
    focal_length_mm,
    field_of_view,
    detection_range_m,
    show_detection_cone,
    cone_color,
    cone_opacity,
    notes
  } = req.body

  if (!id) {
    return res.status(400).json({ error: 'Missing required field: id' })
  }

  const updateData: any = {}
  if (camera_name !== undefined) updateData.camera_name = camera_name
  if (position_x !== undefined) updateData.position_x = position_x
  if (position_y !== undefined) updateData.position_y = position_y
  if (rotation !== undefined) updateData.rotation = rotation
  if (focal_length_mm !== undefined) updateData.focal_length_mm = focal_length_mm
  if (field_of_view !== undefined) updateData.field_of_view = field_of_view
  if (detection_range_m !== undefined) updateData.detection_range_m = detection_range_m
  if (show_detection_cone !== undefined) updateData.show_detection_cone = show_detection_cone
  if (cone_color !== undefined) updateData.cone_color = cone_color
  if (cone_opacity !== undefined) updateData.cone_opacity = cone_opacity
  if (notes !== undefined) updateData.notes = notes

  const { data: placement, error } = await (supabase
    .from('camera_placements') as any)
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating placement:', error)
    return res.status(500).json({ error: 'Failed to update placement', details: error.message })
  }

  return res.status(200).json({
    success: true,
    placement
  })
}

/**
 * DELETE: Delete a placement
 */
async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query

  if (!id) {
    return res.status(400).json({ error: 'Missing required field: id' })
  }

  const { error } = await supabase
    .from('camera_placements')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting placement:', error)
    return res.status(500).json({ error: 'Failed to delete placement', details: error.message })
  }

  return res.status(200).json({
    success: true,
    message: 'Placement deleted successfully'
  })
}
