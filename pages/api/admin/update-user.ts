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

    // Check if user is admin
    const { data: adminCheck, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (adminError || !adminCheck) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    // Get update data from request body
    const { userId, email, password } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Build update object
    const updateData: any = {};
    
    if (email) {
      updateData.email = email;
    }
    
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      updateData.password = password;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No update data provided' });
    }

    // Update user using admin client
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      updateData
    );

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    if (!updatedUser.user) {
      return res.status(500).json({ error: 'User update failed' });
    }

    // Also update the profiles table if email was changed
    if (email) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ email })
        .eq('id', userId);

      if (profileError) {
        console.error('Error updating profile email:', profileError);
        // Don't fail the whole operation, auth email is already updated
      }
    }

    return res.status(200).json({
      success: true,
      user: {
        id: updatedUser.user.id,
        email: updatedUser.user.email,
      },
    });
  } catch (error: any) {
    console.error('Error in update-user API:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
