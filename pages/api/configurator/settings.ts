// API Route: /api/configurator/settings
// Zweck: Formel-Parameter für die BOM-Berechnung abrufen (Stundensatz,
// Anfahrtspauschale, Doku-%, etc.) - admin-pflegbar unter /admin/configurator-settings.

import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Fallback-Werte, falls die Tabelle (noch) nicht existiert oder ein Key fehlt.
// Entsprechen den bisherigen Hardcode-Konstanten in pages/configurator.tsx.
export const CONFIGURATOR_SETTINGS_FALLBACK: Record<string, number> = {
  labor_rate_eur_per_hour: 120,
  travel_fee_eur_per_block: 135,
  travel_fee_cameras_per_block: 4,
  documentation_fee_percent: 5,
  lift_platform_minutes_per_camera: 15,
  storage_hdd_eur_per_tb: 89
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { data, error } = await supabase
      .from('configurator_settings')
      .select('key, label, value, unit, description')

    if (error) {
      console.warn('configurator_settings not available, using fallback:', error.message)
      return res.status(200).json({
        success: true,
        settings: CONFIGURATOR_SETTINGS_FALLBACK,
        rows: [],
        warning: 'configurator_settings table not available, using fallback values'
      })
    }

    const settings: Record<string, number> = { ...CONFIGURATOR_SETTINGS_FALLBACK }
    ;(data || []).forEach((row: any) => {
      settings[row.key] = Number(row.value)
    })

    return res.status(200).json({
      success: true,
      settings,
      rows: data || []
    })
  } catch (error: any) {
    console.error('API error:', error)
    return res.status(200).json({
      success: true,
      settings: CONFIGURATOR_SETTINGS_FALLBACK,
      rows: [],
      warning: error.message
    })
  }
}
