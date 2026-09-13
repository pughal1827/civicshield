import { NextRequest } from 'next/server';
import { aiAnalysisRequestSchema } from '@/lib/ai/schema';
import { analyzeCivicIssue } from '@/lib/ai/gemini';
import { generateTextEmbedding, buildNormalizedEmbeddingText } from '@/lib/ai/embeddings';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/api-error';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Zod Validation
    const validationResult = aiAnalysisRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return createErrorResponse(
        'Invalid AI analysis request payload.',
        'VALIDATION_ERROR',
        400,
        validationResult.error.format()
      );
    }

    const { description, imageUrl } = validationResult.data;

    // 2. Invoke Gemini Multi-modal Analysis
    const { analysis, isFallback } = await analyzeCivicIssue(description, imageUrl);

    // 3. Generate Semantic Text Embedding Vector
    const normalizedText = buildNormalizedEmbeddingText(
      analysis.category,
      description,
      analysis.summary
    );
    const vectorEmbedding = await generateTextEmbedding(normalizedText);

    return createSuccessResponse({
      analysis,
      isFallback,
      hasEmbedding: vectorEmbedding !== null && vectorEmbedding.length > 0,
      embeddingLength: vectorEmbedding ? vectorEmbedding.length : 0,
    });
  } catch (error) {
    console.error('[API /api/ai/analyze] Unhandled exception:', error);
    return createErrorResponse(
      'An unexpected error occurred during AI issue analysis.',
      'AI_PROCESSING_ERROR',
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
}
