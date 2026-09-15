import { GoogleGenAI } from '@google/genai';
import { 
  aiAnalysisOutputSchema, 
  AIAnalysisOutput, 
  FALLBACK_AI_ANALYSIS 
} from './schema';
import { getAppMode } from '@/lib/db/storage-config';

import { smartClassifyComplaint } from './smart-categorizer';

export class GeminiConfigurationError extends Error {
  constructor(message: string = 'GEMINI_API_KEY is required in production environment.') {
    super(message);
    this.name = 'GeminiConfigurationError';
  }
}

const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const FALLBACK_MODELS = ['gemini-flash-latest', 'gemini-2.5-flash-lite', 'gemini-3.5-flash'];

const CIVIC_SYSTEM_PROMPT = `
You are an expert Civic Issue Classification AI for municipal governance platforms.
Your task is to analyze citizen complaint reports (text description and optional image evidence) and output structured JSON data.

CLASSIFICATION RULES:
1. Category: Must be exactly one of:
   - ROAD_POTHOLE (Potholes, cracked asphalt, damaged road surface, craters, sunken road)
   - GARBAGE_OVERFLOW (Uncollected waste, overflowing trash bins, illegal dumping, plastic piles)
   - BROKEN_STREETLIGHT (Dark street lights, unlit lamps, broken poles, dark alleyways)
   - WATER_LEAKAGE (Leaking water pipe, main burst, clean water gushing on street, pipeline damage)
   - DRAINAGE_BLOCKAGE (Clogged drains, storm gutters, backed-up culverts)
   - TRAFFIC_SIGNAL_DAMAGED (Broken traffic lights, dark junction signals, damaged signal posts)
   - OPEN_MANHOLE (Missing manhole covers, uncovered deep drain pits, hazardous road holes)
   - ELECTRICAL_HAZARD (Hanging live wires, sparking transformers, exposed electric cables)
   - FLOOD (Flooded roads, waterlogged streets, submerged intersections, standing rainwater)
   - SEWAGE_OVERFLOW (Overflowing sewage, black stinking wastewater, sewer bursts)
   - ILLEGAL_CONSTRUCTION (Unauthorized structures, blocked public walkways, encroachments)
   - PUBLIC_INFRA_DAMAGE (Broken park benches, damaged railings, ruined footpaths, public property damage)

2. Severity: Must be exactly one of: LOW, MEDIUM, HIGH, CRITICAL.
   - CRITICAL: Immediate threat to life, open manholes, active electrical hazard, major hospital/school access blockage.
   - HIGH: Major vehicle disruption, deep potholes, overflowing sewage, main water burst, flooded major road.
   - MEDIUM: General infrastructure damage, broken streetlights, uncollected trash bin, leaking municipal tap.
   - LOW: Minor aesthetic damage, small broken tiles, faded marks, slightly bent fence.

3. Recommended Department Code: Must be exactly one of:
   - ROAD_MAINT (for ROAD_POTHOLE, ILLEGAL_CONSTRUCTION, TRAFFIC_SIGNAL_DAMAGED, PUBLIC_INFRA_DAMAGE)
   - SANITATION (for GARBAGE_OVERFLOW)
   - ELECTRICAL (for BROKEN_STREETLIGHT, ELECTRICAL_HAZARD)
   - WATER_DEPT (for WATER_LEAKAGE)
   - DRAINAGE (for DRAINAGE_BLOCKAGE, OPEN_MANHOLE, SEWAGE_OVERFLOW, FLOOD)

4. Summary: Concise executive summary, MAXIMUM 120 characters.

5. Safety Risk Score: Integer from 0 to 100 representing real-world hazard level (e.g. 90-100 for open manholes/live wires, 70-85 for road craters, 30-50 for garbage/streetlights, 10-30 for minor cosmetic wear).

6. Confidence Score: Floating point number from 0.00 to 1.00.

7. Important Details: List of 2 to 4 key observational bullet points.

CRITICAL CONSTRAINTS:
- Match the single most accurate category based on the citizen's actual words and image. Do NOT default to PUBLIC_INFRA_DAMAGE unless it is specifically public property wear.
- Do NOT output markdown backticks wrapping the JSON. Return raw JSON string conforming strictly to the schema.
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
    console.warn('[AI Engine] GEMINI_API_KEY not set. Using Smart NLP Rule-Based Categorizer.');
    const smartMatch = smartClassifyComplaint(description);
    return {
      analysis: {
        category: smartMatch.category,
        severity: smartMatch.severity,
        safetyRiskScore: smartMatch.safetyRiskScore,
        recommendedDepartmentCode: smartMatch.departmentCode,
        confidenceScore: smartMatch.confidence,
        summary: description.slice(0, 120),
        importantDetails: [
          `Smart NLP categorized as ${smartMatch.category} based on keywords.`,
          `Estimated hazard risk score at ${smartMatch.safetyRiskScore}/100 [${smartMatch.severity}].`,
          `Assigned to department code: ${smartMatch.departmentCode}.`,
        ],
      },
      isFallback: true,
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const contents: any[] = [CIVIC_SYSTEM_PROMPT];

    // Handle optional image processing
    if (imageUrl && imageUrl.trim().length > 0) {
      try {
        let base64Data: string | null = null;
        let mimeType = 'image/jpeg';

        if (imageUrl.startsWith('data:')) {
          const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (matches) {
            mimeType = matches[1];
            base64Data = matches[2];
          }
        } else if (imageUrl.startsWith('/')) {
          const fs = await import('fs/promises');
          const path = await import('path');
          const localPath = path.join(process.cwd(), 'public', imageUrl.replace(/^\//, ''));
          const fileBuf = await fs.readFile(localPath);
          base64Data = fileBuf.toString('base64');
          const ext = path.extname(localPath).toLowerCase();
          mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
        } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
          const imageResponse = await fetch(imageUrl, { signal: AbortSignal.timeout(5000) });
          if (imageResponse.ok) {
            const arrayBuffer = await imageResponse.arrayBuffer();
            base64Data = Buffer.from(arrayBuffer).toString('base64');
            mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
          } else {
            console.warn(`[AI Engine] Image URL fetch failed with status ${imageResponse.status}. Proceeding with text analysis.`);
          }
        }

        if (base64Data) {
          contents.push({
            inlineData: {
              data: base64Data,
              mimeType: mimeType.split(';')[0],
            },
          });
          console.log('[AI Engine] Attached photographic evidence to Gemini multi-modal prompt.');
        }
      } catch (imgError) {
        console.warn('[AI Engine] Failed to load image for multi-modal analysis:', imgError);
      }
    }

    contents.push(`CITIZEN COMPLAINT TEXT: "${description}"`);

    // Try primary model, fallback if needed with strict 3.5s per-model timeout
    const candidateModels = [PRIMARY_MODEL, ...FALLBACK_MODELS];
    let rawText = '';
    let usedModel = PRIMARY_MODEL;

    for (const modelName of candidateModels) {
      try {
        console.log(`[AI Engine] Sending multi-modal classification request to Gemini (${modelName})...`);
        const generatePromise = ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });

        // 3.5s strict timeout per candidate model
        const response = await Promise.race([
          generatePromise,
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('AI Model Response Timeout')), 3500)),
        ]);

        if (response.text && response.text.trim()) {
          rawText = response.text.trim();
          usedModel = modelName;
          break;
        }
      } catch (modelErr: any) {
        const errMsg = String(modelErr?.message || modelErr);
        console.warn(`[AI Engine] Model ${modelName} unavailable (${errMsg.slice(0, 120)}).`);
        
        // If 429 Rate limit / Quota exceeded, break immediately to Smart NLP
        if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
          console.warn('[AI Engine] Quota limit detected. Instantly executing Smart NLP Categorizer.');
          break;
        }
      }
    }

    if (!rawText) {
      throw new Error('Gemini API quota reached or models unavailable. Switched to high-speed Smart NLP.');
    }

    // Clean JSON response and normalize field names
    const cleanJson = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsedJson = JSON.parse(cleanJson);

    const normalizedJson = {
      category: parsedJson.category || parsedJson.detected_category,
      summary: parsedJson.summary || description.slice(0, 120),
      severity: parsedJson.severity || parsedJson.detected_severity || 'MEDIUM',
      safetyRiskScore: Number(parsedJson.safetyRiskScore ?? parsedJson.safety_risk_score ?? parsedJson.safety_risk ?? 50),
      recommendedDepartmentCode: parsedJson.recommendedDepartmentCode || parsedJson.recommended_department_code || parsedJson.suggested_department_code || 'ROAD_MAINT',
      confidenceScore: Number(parsedJson.confidenceScore ?? parsedJson.confidence_score ?? parsedJson.confidence ?? 0.85),
      importantDetails: parsedJson.importantDetails || parsedJson.important_details || [],
    };

    const validatedAnalysis = aiAnalysisOutputSchema.parse(normalizedJson);

    console.log(`[AI Engine] [${usedModel}] Analyzed issue: Category=${validatedAnalysis.category}, Severity=${validatedAnalysis.severity}, Risk=${validatedAnalysis.safetyRiskScore}`);

    return { analysis: validatedAnalysis, isFallback: false };
  } catch (error) {
    console.error('[AI Engine] Error during Gemini processing, executing Smart NLP classifier fallback:', error);
    const smartMatch = smartClassifyComplaint(description);
    return {
      analysis: {
        category: smartMatch.category,
        severity: smartMatch.severity,
        safetyRiskScore: smartMatch.safetyRiskScore,
        recommendedDepartmentCode: smartMatch.departmentCode,
        confidenceScore: smartMatch.confidence,
        summary: description.slice(0, 120),
        importantDetails: [
          `Smart NLP categorized as ${smartMatch.category} based on description keywords.`,
          `Calculated hazard risk score: ${smartMatch.safetyRiskScore}/100 (${smartMatch.severity}).`,
          `Auto-routed to department: ${smartMatch.departmentCode}.`,
        ],
      },
      isFallback: true,
    };
  }
}
