import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/db/supabase-admin';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/api-error';
import { getStorageConfig, ProductionDatabaseError } from '@/lib/db/storage-config';
import { logger } from '@/lib/logging/logger';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const DISALLOWED_EXTENSIONS = new Set(['.exe', '.sh', '.bat', '.php', '.js', '.py', '.cmd', '.vbs']);

export async function POST(req: NextRequest) {
  try {
    const config = getStorageConfig();
    const contentType = req.headers.get('content-type') || '';

    let fileBuffer: Buffer | null = null;
    let fileName = `upload_${Date.now()}.jpg`;
    let mimeType = 'image/jpeg';
    let originalName = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return createErrorResponse('No file provided in form data.', 'VALIDATION_ERROR', 400);
      }

      if (file.size === 0) {
        return createErrorResponse('Empty file provided.', 'EMPTY_FILE', 400);
      }

      if (file.size > MAX_FILE_SIZE) {
        return createErrorResponse('File size exceeds maximum allowed limit of 10MB.', 'FILE_TOO_LARGE', 400);
      }

      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return createErrorResponse(`Unsupported file type: ${file.type}. Allowed formats: JPEG, PNG, WEBP.`, 'UNSUPPORTED_FORMAT', 400);
      }

      originalName = file.name || 'upload.jpg';
      const fileExt = originalName.substring(originalName.lastIndexOf('.')).toLowerCase();

      if (DISALLOWED_EXTENSIONS.has(fileExt) || !ALLOWED_EXTENSIONS.has(fileExt)) {
        return createErrorResponse(`Invalid or forbidden file extension: ${fileExt}.`, 'FORBIDDEN_FILE_TYPE', 400);
      }

      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
      fileName = `${Date.now()}_${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      mimeType = file.type;
    } else {
      // JSON Base64 payload fallback
      const body = await req.json();
      if (!body.base64Data) {
        return createErrorResponse('Invalid upload payload. Expected multipart form or base64Data.', 'VALIDATION_ERROR', 400);
      }

      const cleanBase64 = body.base64Data.replace(/^data:image\/\w+;base64,/, '');
      fileBuffer = Buffer.from(cleanBase64, 'base64');
      
      if (fileBuffer.length === 0) {
        return createErrorResponse('Empty file payload provided.', 'EMPTY_FILE', 400);
      }

      if (fileBuffer.length > MAX_FILE_SIZE) {
        return createErrorResponse('File size exceeds maximum allowed limit of 10MB.', 'FILE_TOO_LARGE', 400);
      }

      mimeType = body.mimeType || 'image/jpeg';
      if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        return createErrorResponse(`Unsupported MIME type: ${mimeType}.`, 'UNSUPPORTED_FORMAT', 400);
      }

      const ext = mimeType.split('/')[1] || 'jpg';
      fileName = `upload_${Date.now()}.${ext}`;
    }

    // Try Uploading to Supabase Storage `civicshield-media` bucket
    try {
      const supabase = createAdminClient();
      const filePath = `incidents/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('civicshield-media')
        .upload(filePath, fileBuffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (!error && data) {
        const { data: publicUrlData } = supabase.storage
          .from('civicshield-media')
          .getPublicUrl(filePath);

        logger.info('UploadAPI', `Image successfully uploaded to Supabase Storage: ${filePath}`);
        return createSuccessResponse({
          url: publicUrlData.publicUrl,
          path: filePath,
          size: fileBuffer.length,
          mimeType,
        });
      }
    } catch (storageErr) {
      if (storageErr instanceof ProductionDatabaseError || config.appMode === 'production') {
        logger.error('UploadAPI', 'Supabase Cloud Storage connection failed under production mode.');
        return createErrorResponse(
          'Service temporarily unavailable. Image storage service is unconfigured or unreachable.',
          'SERVICE_UNAVAILABLE',
          503
        );
      }
      logger.warn('UploadAPI', 'Supabase Cloud Storage connection failed in demo mode. Returning fallback URL.', {
        error: String(storageErr),
      });
    }

    // Fallback if cloud bucket is unconfigured in DEMO mode
    return createSuccessResponse({
      url: `https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800`,
      path: `local_fallback/${fileName}`,
      size: fileBuffer.length,
      mimeType,
      isFallback: true,
    });
  } catch (error) {
    if (error instanceof ProductionDatabaseError) {
      return createErrorResponse(
        'Service temporarily unavailable. Please try again.',
        'SERVICE_UNAVAILABLE',
        503
      );
    }
    logger.error('UploadAPI', 'Exception during image upload', {
      error: error instanceof Error ? error.message : String(error),
    });
    return createErrorResponse(
      'An unexpected error occurred during image upload.',
      'UPLOAD_ERROR',
      500
    );
  }
}

