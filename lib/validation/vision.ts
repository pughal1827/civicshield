import { pipeline, env } from '@xenova/transformers';
import { logger } from '../logging/logger';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

// Configure transformers.js for Node.js environment
// We disable local models to force downloading the model from HuggingFace on first run,
// and we can set the cache dir to avoid re-downloading.
env.allowLocalModels = false;

// We use a singleton pattern for the pipeline to avoid reloading the model on every request
let classifierPipeline: any = null;

export interface VisionValidationResult {
  isValid: boolean;
  reason?: string;
  detectedClass?: string;
  confidence?: number;
}

export async function validateImageContent(imageBuffer: Buffer): Promise<VisionValidationResult> {
  let tempFilePath: string | null = null;
  try {
    if (!classifierPipeline) {
      logger.info('VisionValidation', 'Loading zero-shot image classification model...');
      // Using a fast, lightweight CLIP model for zero-shot image classification
      classifierPipeline = await pipeline('zero-shot-image-classification', 'Xenova/clip-vit-base-patch32');
    }

    // Write buffer to a temporary file because transformers.js pipeline expects a file path or URL
    tempFilePath = path.join(os.tmpdir(), `vision-test-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`);
    await fs.writeFile(tempFilePath, imageBuffer);

    const candidateLabels = [
      'street damage', 
      'garbage pile', 
      'public infrastructure', 
      'water leak', 
      'outdoor road',
      'an indoor scene', 
      'a person or selfie', 
      'a close-up of a random object', 
      'a document or text screenshot', 
      'an unrelated photo'
    ];

    logger.info('VisionValidation', 'Running zero-shot classification on image...');
    const results = await classifierPipeline(tempFilePath, candidateLabels);

    // Results is an array of objects: { label: string, score: number } sorted by score descending
    if (results && results.length > 0) {
      const topResult = results[0];
      const spamLabels = [
        'an indoor scene', 
        'a person or selfie', 
        'a close-up of a random object', 
        'a document or text screenshot', 
        'an unrelated photo'
      ];

      logger.info('VisionValidation', `Top predicted label: ${topResult.label} (Confidence: ${topResult.score})`);

      // If the highest probability class is a spam label, we reject it.
      if (spamLabels.includes(topResult.label)) {
        return {
          isValid: false,
          reason: `Image content was identified as '${topResult.label}' which does not appear to be a valid civic issue.`,
          detectedClass: topResult.label,
          confidence: topResult.score
        };
      }

      return {
        isValid: true,
        detectedClass: topResult.label,
        confidence: topResult.score
      };
    }

    return { isValid: true, reason: 'No classification results' };
  } catch (error) {
    logger.error('VisionValidation', 'Failed to classify image', { error: String(error) });
    // Fail open if model fails to load or infer, so we don't break the whole app
    return { isValid: true, reason: 'Classification pipeline error' };
  } finally {
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (err) {
        logger.warn('VisionValidation', 'Failed to delete temp file', { error: String(err) });
      }
    }
  }
}
