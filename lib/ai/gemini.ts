import { GoogleGenAI } from '@google/genai';
import { 
  aiAnalysisOutputSchema, 
  AIAnalysisOutput, 
  FALLBACK_AI_ANALYSIS 
} from './schema';
import { getAppMode } from '@/lib/db/storage-config';

export class GeminiConfigurationError extends Error {
  constructor(message: string = 'GEMINI_API_KEY is required in production environment.') {
    super(message);
    this.name = 'GeminiConfigurationError';
  }
}

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const CIVIC_SYSTEM_PROMPT = `
You are an expert Civic Issue Classification AI for municipal governance platforms.
Your task is to analyze citizen complaint reports (text description and optional image evidence) and output structured JSON data.

CLASSIFICATION RULES:
1. Category: Must be exactly one of:
   - ROAD_POTHOLE (Potholes, cracked asphalt, damaged road surface, craters)
   - GARBAGE_OVERFLOW (Uncollected waste, overflowing trash bins, illegal dumping)
   - BROKEN_STREETLIGHT (Dark street lights, unlit lamps, broken poles, dark alleyways)
   - WATER_LEAKAGE (Leaking water pipe, main burst, clean water gushing on street)
   - DRAINAGE_BLOCKAGE (Clogged drains, overflowing sewage, backed-up gutters)
   - TRAFFIC_SIGNAL_DAMAGED (Broken traffic lights, dark junction signals, damaged signal posts)
   - PUBLIC_INFRA_DAMAGE (Broken park benches, damaged railings, ruined footpaths, public property damage)

2. Severity: Must be exactly one of: LOW, MEDIUM, HIGH, CRITICAL.
   - CRITICAL: Immediate threat to life, child safety near schools/hospitals, active electrical hazard.
   - HIGH: Major vehicle disruption, deep potholes, overflowing sewage, main water burst.
   - MEDIUM: General infrastructure damage, broken streetlights, uncollected trash bin.
   - LOW: Minor aesthetic damage, small broken tiles, faded marks.

3. Recommended Department Code: Must be exactly one of:
   - ROAD_MAINT (for ROAD_POTHOLE)
   - SANITATION (for GARBAGE_OVERFLOW)
   - ELECTRICAL (for BROKEN_STREETLIGHT)
   - WATER_DEPT (for WATER_LEAKAGE)
   - DRAINAGE (for DRAINAGE_BLOCKAGE)
   - TRAFFIC (for TRAFFIC_SIGNAL_DAMAGED)
   - PUBLIC_WORKS (for PUBLIC_INFRA_DAMAGE)

4. Summary: Concise executive summary, MAXIMUM 120 characters.

5. Safety Risk Score: Integer from 0 to 100 representing hazard level.

6. Confidence Score: Floating point number from 0.00 to 1.00.
   - If image and text agree or clear evidence: 0.85 - 1.00
   - If text description only but specific: 0.75 - 0.85
   - If image and text disagree or image is unclear: 0.50 - 0.74 (note disagreement in importantDetails)
   - Unclear/Ambiguous: Below 0.50

7. Important Details: List of 2 to 4 key observational bullet points.

CRITICAL CONSTRAINTS:
- Do NOT invent facts or measure dimensions that are not visible or described.
- Do NOT calculate final priority scores or merge complaints.
- Do NOT output markdown backticks wrapping the JSON. Return raw JSON string conforming strictly to the requested schema.
`;

export async function analyzeCivicIssue(
  description: string,
  imageUrl?: string
): Promise<{ analysis: AIAnalysisOutput; isFallback: boolean }> {
  const apiKey = process.env.GEMINI_API_KEY;
  const isProduction = getAppMode() === 'production';

  if (!apiKey) {
    if (isProduction) {
      throw new GeminiConfigurationError();
    }
    console.warn('[AI Engine] GEMINI_API_KEY is not configured in server environment. Returning safe fallback payload.');
    return { analysis: FALLBACK_AI_ANALYSIS, isFallback: true };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const contents: any[] = [CIVIC_SYSTEM_PROMPT];

    // Handle optional image processing
    if (imageUrl && imageUrl.trim().length > 0) {
      try {
        const imageResponse = await fetch(imageUrl, { signal: AbortSignal.timeout(5000) });
        if (imageResponse.ok) {
          const arrayBuffer = await imageResponse.arrayBuffer();
          const base64Data = Buffer.from(arrayBuffer).toString('base64');
          const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

          contents.push({
            inlineData: {
              data: base64Data,
              mimeType: mimeType.split(';')[0],
            },
          });
        } else {
          console.warn(`[AI Engine] Image URL fetch failed with status ${imageResponse.status}. Proceeding with text analysis.`);
        }
      } catch (imgError) {
        console.warn('[AI Engine] Failed to download or convert image for multi-modal analysis:', imgError);
      }
    }

    contents.push(`CITIZEN COMPLAINT TEXT: "${description}"`);

    console.log(`[AI Engine] Sending multi-modal classification request to Gemini (${DEFAULT_MODEL})...`);

    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const rawText = response.text || '';
    if (!rawText.trim()) {
      throw new Error('Gemini API returned an empty text response.');
    }

    const parsedJson = JSON.parse(rawText);
    const validatedAnalysis = aiAnalysisOutputSchema.parse(parsedJson);

    console.log(`[AI Engine] Successfully analyzed issue. Category: ${validatedAnalysis.category}, Severity: ${validatedAnalysis.severity}, Confidence: ${validatedAnalysis.confidenceScore}`);

    return { analysis: validatedAnalysis, isFallback: false };
  } catch (error) {
    console.error('[AI Engine] Error during Gemini API multi-modal processing:', error);
    return {
      analysis: {
        ...FALLBACK_AI_ANALYSIS,
        importantDetails: [
          'Error invoking Gemini AI API: ' + (error instanceof Error ? error.message : 'Unknown provider error'),
          'Fallback payload assigned automatically for manual triage.',
        ],
      },
      isFallback: true,
    };
  }
}
