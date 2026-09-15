import { GoogleGenAI } from '@google/genai';

const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
export const EXPECTED_EMBEDDING_DIMENSION = 3072;

export function buildNormalizedEmbeddingText(
  category: string,
  description: string,
  summary?: string
): string {
  const cleanDesc = description.trim();
  const cleanSummary = summary ? summary.trim() : '';

  return `Category: ${category} | Complaint: ${cleanDesc} | Summary: ${cleanSummary}`.slice(0, 1000);
}

export async function generateTextEmbedding(
  text: string
): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('[Embedding Service] GEMINI_API_KEY is not configured. Skipping embedding generation.');
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    console.log(`[Embedding Service] Generating ${EXPECTED_EMBEDDING_DIMENSION}d vector embedding using ${EMBEDDING_MODEL}...`);

    const response: any = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text,
    });

    const values = response.embedding?.values || response.embeddings?.[0]?.values;

    if (!values || !Array.isArray(values) || values.length === 0) {
      console.warn('[Embedding Service] Embedding API returned empty vector array.');
      return null;
    }

    if (values.length !== EXPECTED_EMBEDDING_DIMENSION) {
      console.warn(`[Embedding Service] Warning: Vector dimension mismatch. Expected ${EXPECTED_EMBEDDING_DIMENSION}, got ${values.length}.`);
    }

    console.log(`[Embedding Service] Successfully generated vector embedding (${values.length} dimensions).`);
    return values;
  } catch (error) {
    console.error('[Embedding Service] Failed to generate text embedding:', error);
    return null; // Return null gracefully so complaint processing continues without embedding
  }
}
