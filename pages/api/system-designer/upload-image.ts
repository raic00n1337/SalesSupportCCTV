import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import formidable from 'formidable'
import fs from 'fs'
import { requireAuth } from '../../../lib/apiAuth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const ALLOWED_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

// Disable body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
}

/**
 * API Route: /api/system-designer/upload-image
 * 
 * POST: Upload a floor plan image to Supabase Storage
 * Requires a logged-in user (the floor-plans bucket is restricted to
 * authenticated users, see supabase/migrations/add_system_designer.sql).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const user = await requireAuth(req, res)
  if (!user) {
    return
  }

  try {
    // Parse multipart form data
    const form = formidable({ multiples: false, maxFileSize: MAX_FILE_SIZE_BYTES })

    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err)
        resolve([fields, files])
      })
    })

    const file = Array.isArray(files.file) ? files.file[0] : files.file
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    // Only allow actual image types, regardless of the client-supplied filename
    const mimeType = file.mimetype || ''
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      fs.unlinkSync(file.filepath)
      return res.status(400).json({ error: 'Invalid file type. Only PNG, JPEG, WEBP and GIF images are allowed.' })
    }

    // Read file buffer
    const fileBuffer = fs.readFileSync(file.filepath)
    
    // Generate unique filename (extension derived from the verified MIME type, not user input)
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(7)
    const fileExt = ALLOWED_EXTENSIONS[mimeType]
    const fileName = `${timestamp}-${randomStr}.${fileExt}`
    const filePath = `floor-plans/${fileName}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('floor-plans')
      .upload(filePath, fileBuffer, {
        contentType: file.mimetype || 'image/png',
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Error uploading file:', uploadError)
      return res.status(500).json({ error: 'Failed to upload file', details: uploadError.message })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('floor-plans')
      .getPublicUrl(filePath)

    // Clean up temporary file
    fs.unlinkSync(file.filepath)

    return res.status(200).json({
      success: true,
      url: urlData.publicUrl,
      path: filePath
    })

  } catch (error: any) {
    console.error('Upload error:', error)
    return res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}
