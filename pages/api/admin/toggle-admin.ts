import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is admin using admin client (bypasses RLS)
    const { data: adminCheck, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (adminError || !adminCheck) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    // Get data from request body
    const { userId, makeAdmin } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (typeof makeAdmin !== 'boolean') {
      return res.status(400).json({ error: 'makeAdmin must be a boolean' });
    }

    // Prevent admin from removing their own admin status
    if (userId === user.id && !makeAdmin) {
      return res.status(400).json({ error: 'Sie können sich nicht selbst als Admin entfernen' });
    }

    if (makeAdmin) {
      // Add admin role
      const { error: insertError } = await supabaseAdmin
        .from('admin_users')
        .insert({ user_id: userId });

      if (insertError) {
        // Check if already admin (unique constraint violation)
        if (insertError.code === '23505') {
          return res.status(400).json({ error: 'Benutzer ist bereits Admin' });
        }
        throw insertError;
      }
    } else {
      // Remove admin role
      const { error: deleteError } = await supabaseAdmin
        .from('admin_users')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        throw deleteError;
      }
    }

    return res.status(200).json({
      success: true,
      userId,
      isAdmin: makeAdmin,
    });
  } catch (error: any) {
    console.error('Error in toggle-admin API:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
