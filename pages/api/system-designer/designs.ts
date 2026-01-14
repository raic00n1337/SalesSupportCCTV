import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * API Route: /api/system-designer/designs
 * 
 * GET: Fetch all designs for a project
 * POST: Create a new design
 * PUT: Update an existing design
 * DELETE: Delete a design
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
    console.error('System Designer API Error:', error)
    return res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}

/**
 * GET: Fetch all designs for a project
 * Query params: project_id
 */
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { project_id, design_id } = req.query

  if (!project_id && !design_id) {
    return res.status(400).json({ error: 'Missing project_id or design_id' })
  }

  // Fetch single design by ID
  if (design_id) {
    const { data: design, error } = await supabase
      .from('system_designs')
      .select('*')
      .eq('id', design_id)
      .single()

    if (error) {
      console.error('Error fetching design:', error)
      return res.status(500).json({ error: 'Failed to fetch design', details: error.message })
    }

    // Fetch camera placements for this design
    const { data: placements, error: placementsError } = await supabase
      .from('camera_placements')
      .select('*')
      .eq('system_design_id', design_id)

    if (placementsError) {
      console.error('Error fetching placements:', placementsError)
    }

    return res.status(200).json({
      success: true,
      design: {
        ...design,
        placements: placements || []
      }
    })
  }

  // Fetch all designs for a project
  const { data: designs, error } = await supabase
    .from('system_designs')
    .select('*')
    .eq('project_id', project_id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching designs:', error)
    return res.status(500).json({ error: 'Failed to fetch designs', details: error.message })
  }

  // Fetch placements for all designs
  const designIds = designs.map(d => d.id)
  const { data: allPlacements, error: placementsError } = await supabase
    .from('camera_placements')
    .select('*')
    .in('system_design_id', designIds)

  if (placementsError) {
    console.error('Error fetching placements:', placementsError)
  }

  // Group placements by design_id
  const placementsByDesign: Record<string, any[]> = {}
  allPlacements?.forEach(p => {
    if (!placementsByDesign[p.system_design_id]) {
      placementsByDesign[p.system_design_id] = []
    }
    placementsByDesign[p.system_design_id].push(p)
  })

  // Attach placements to designs
  const designsWithPlacements = designs.map(d => ({
    ...d,
    placements: placementsByDesign[d.id] || []
  }))

  return res.status(200).json({
    success: true,
    designs: designsWithPlacements
  })
}

/**
 * POST: Create a new design
 */
async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const { project_id, name, description, floor_number, image_url, image_width, image_height, scale_pixels_per_meter } = req.body

  if (!project_id || !name) {
    return res.status(400).json({ error: 'Missing required fields: project_id, name' })
  }

  const { data: design, error } = await (supabase
    .from('system_designs') as any)
    .insert({
      project_id,
      name,
      description,
      floor_number: floor_number ?? 0,
      image_url,
      image_width,
      image_height,
      scale_pixels_per_meter: scale_pixels_per_meter ?? 100,
      canvas_zoom: 1.0,
      canvas_pan_x: 0,
      canvas_pan_y: 0
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating design:', error)
    return res.status(500).json({ error: 'Failed to create design', details: error.message })
  }

  return res.status(201).json({
    success: true,
    design
  })
}

/**
 * PUT: Update an existing design
 */
async function handlePut(req: NextApiRequest, res: NextApiResponse) {
  const { id, name, description, floor_number, image_url, image_width, image_height, scale_pixels_per_meter, canvas_zoom, canvas_pan_x, canvas_pan_y } = req.body

  if (!id) {
    return res.status(400).json({ error: 'Missing required field: id' })
  }

  const updateData: any = {}
  if (name !== undefined) updateData.name = name
  if (description !== undefined) updateData.description = description
  if (floor_number !== undefined) updateData.floor_number = floor_number
  if (image_url !== undefined) updateData.image_url = image_url
  if (image_width !== undefined) updateData.image_width = image_width
  if (image_height !== undefined) updateData.image_height = image_height
  if (scale_pixels_per_meter !== undefined) updateData.scale_pixels_per_meter = scale_pixels_per_meter
  if (canvas_zoom !== undefined) updateData.canvas_zoom = canvas_zoom
  if (canvas_pan_x !== undefined) updateData.canvas_pan_x = canvas_pan_x
  if (canvas_pan_y !== undefined) updateData.canvas_pan_y = canvas_pan_y

  const { data: design, error } = await (supabase
    .from('system_designs') as any)
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating design:', error)
    return res.status(500).json({ error: 'Failed to update design', details: error.message })
  }

  return res.status(200).json({
    success: true,
    design
  })
}

/**
 * DELETE: Delete a design
 */
async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query

  if (!id) {
    return res.status(400).json({ error: 'Missing required field: id' })
  }

  const { error } = await supabase
    .from('system_designs')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting design:', error)
    return res.status(500).json({ error: 'Failed to delete design', details: error.message })
  }

  return res.status(200).json({
    success: true,
    message: 'Design deleted successfully'
  })
}
