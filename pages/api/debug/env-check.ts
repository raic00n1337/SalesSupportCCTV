// API Route: /api/debug/env-check
// Zweck: ÃœberprÃ¼ft, ob alle benÃ¶tigten Environment Variables gesetzt sind

import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Nur in Produktion erlauben, wenn User eingeloggt ist
  // FÃ¼r jetzt: nur GET erlauben
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const envCheck = {
    NEXT_PUBLIC_SUPABASE_URL: {
      exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      value: process.env.NEXT_PUBLIC_SUPABASE_URL ? 
        `...` : 
        'NOT SET'
    },
    NEXT_PUBLIC_SUPABASE_ANON_KEY: {
      exists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?
        `...` :
        'NOT SET'
    },
    SUPABASE_SERVICE_ROLE_KEY: {
      exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      value: process.env.SUPABASE_SERVICE_ROLE_KEY ?
        `...` :
        'NOT SET'
    },
    // Legacy-Namen prÃ¼fen (falls falsch konfiguriert)
    SUPABASE_URL: {
      exists: !!process.env.SUPABASE_URL,
      note: 'Legacy variable - should use NEXT_PUBLIC_SUPABASE_URL'
    },
    SUPABASE_ANON_KEY: {
      exists: !!process.env.SUPABASE_ANON_KEY,
      note: 'Legacy variable - should use NEXT_PUBLIC_SUPABASE_ANON_KEY'
    }
  }

  // Warnung wenn kritische Vars fehlen
  const missingCritical = []
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missingCritical.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missingCritical.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missingCritical.push('SUPABASE_SERVICE_ROLE_KEY')

  return res.status(200).json({
    status: missingCritical.length === 0 ? 'OK' : 'ERROR',
    missingCritical,
    envCheck,
    timestamp: new Date().toISOString()
  })
}
