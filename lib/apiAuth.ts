// Shared server-side auth helpers for API routes
// Verifies the Supabase JWT sent in the Authorization header and,
// where required, checks membership in admin_users.

import type { NextApiRequest, NextApiResponse } from 'next'
import type { User } from '@supabase/supabase-js'
import { supabaseAdmin } from './supabaseAdmin'

/**
 * Resolves the authenticated user from the request's Bearer token.
 * Returns null if there is no token or it is invalid/expired.
 */
export async function getAuthenticatedUser(req: NextApiRequest): Promise<User | null> {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.slice('Bearer '.length).trim()
  if (!token) {
    return null
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data.user) {
    return null
  }

  return data.user
}

/**
 * Ensures the request comes from a logged-in user.
 * Writes a 401 response and returns null when unauthenticated.
 */
export async function requireAuth(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<User | null> {
  const user = await getAuthenticatedUser(req)
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return null
  }
  return user
}

/**
 * Ensures the request comes from a logged-in admin (member of admin_users).
 * Writes a 401/403 response and returns null when the check fails.
 */
export async function requireAdmin(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<User | null> {
  const user = await requireAuth(req, res)
  if (!user) {
    return null
  }

  const { data: adminCheck, error: adminError } = await supabaseAdmin
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .single()

  if (adminError || !adminCheck) {
    res.status(403).json({ error: 'Forbidden: Admin access required' })
    return null
  }

  return user
}
