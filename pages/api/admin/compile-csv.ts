import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { compileFile, decodeUploadedFileContent, generateCSV } from '../../../lib/csvCompiler';
import type { CompilerOptions, CompilerResult, ImportResult } from '../../../lib/csvCompilerTypes';

export const config = {
  api: {
    bodyParser: {
      // Excel files are sent base64-encoded (~33% larger than the raw file).
      sizeLimit: '15mb',
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Verify admin authentication
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { data: user, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    // Check if user is admin
    const { data: adminUser, error: adminCheckError } = await supabaseAdmin
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.user.id)
      .single();

    if (adminCheckError || !adminUser) {
      return res.status(403).json({ error: 'Forbidden: Not an admin' });
    }

    // Parse request
    const { fileContent, fileName, options, action, isBase64 } = req.body as {
      fileContent: string;
      fileName: string;
      options: CompilerOptions;
      action: 'compile' | 'import' | 'download';
      isBase64?: boolean;
    };

    if (!fileContent || !fileName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Compile file
    const decodedContent = decodeUploadedFileContent(fileContent, Boolean(isBase64));
    const result: CompilerResult = await compileFile(decodedContent, fileName, options);

    // Handle different actions
    switch (action) {
      case 'compile': {
        // Just return the compilation result (preview)
        return res.status(200).json(result);
      }

      case 'import': {
        // Import validated data to database
        if (!result.success) {
          return res.status(400).json({
            error: 'Cannot import data with errors',
            result,
          });
        }

        const importResult = await importToDatabase(result.transformedData);
        return res.status(200).json({
          ...result,
          importResult,
        });
      }

      case 'download': {
        // Generate CSV download
        const csv = generateCSV(result.transformedData);
        return res.status(200).json({
          ...result,
          downloadContent: csv,
        });
      }

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error: any) {
    console.error('CSV Compiler error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}

/**
 * Import transformed data to database
 */
async function importToDatabase(data: any[]): Promise<ImportResult> {
  let importedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  for (const row of data) {
    try {
      // Check if product already exists by SKU
      const { data: existing, error: selectError } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('sku', row.sku)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        errors.push(`Error checking SKU ${row.sku}: ${selectError.message}`);
        skippedCount++;
        continue;
      }

      if (existing) {
        // Update existing product
        const { error: updateError } = await supabaseAdmin
          .from('products')
          .update({
            name: row.name,
            eso_number: row.eso_number,
            uvp_cents: row.uvp_cents,
            category: row.category,
            description: row.description,
            is_active: row.is_active ?? true,
            slug: row.slug,
          })
          .eq('id', existing.id);

        if (updateError) {
          errors.push(`Error updating ${row.sku}: ${updateError.message}`);
          skippedCount++;
        } else {
          updatedCount++;
        }
      } else {
        // Insert new product
        const { error: insertError } = await supabaseAdmin
          .from('products')
          .insert({
            name: row.name,
            sku: row.sku,
            eso_number: row.eso_number,
            uvp_cents: row.uvp_cents,
            category: row.category,
            description: row.description,
            is_active: row.is_active ?? true,
            manufacturer_slug: row.manufacturer_slug,
            slug: row.slug,
          });

        if (insertError) {
          errors.push(`Error inserting ${row.sku}: ${insertError.message}`);
          skippedCount++;
        } else {
          importedCount++;
        }
      }
    } catch (error: any) {
      errors.push(`Unexpected error with ${row.sku}: ${error.message}`);
      skippedCount++;
    }
  }

  return {
    success: errors.length === 0,
    importedCount,
    updatedCount,
    skippedCount,
    errors,
  };
}
