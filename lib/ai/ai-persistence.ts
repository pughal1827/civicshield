import { createAdminClient } from '@/lib/db/supabase-admin';
import { AIAnalysisOutput } from './schema';

export async function saveAIAnalysisMetadata(
  incidentId: string,
  analysis: AIAnalysisOutput,
  rawResponse: Record<string, unknown> = {}
) {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('ai_analyses')
      .insert({
        incident_id: incidentId,
        raw_ai_response: rawResponse,
        confidence_score: analysis.confidenceScore,
        detected_category: analysis.category,
        detected_severity: analysis.severity,
        suggested_department_code: analysis.recommendedDepartmentCode,
        extracted_features: {
          safetyRiskScore: analysis.safetyRiskScore,
          importantDetails: analysis.importantDetails,
          summary: analysis.summary,
          imageVerification: rawResponse?.imageVerification || null,
        },
      })
      .select()
      .single();

    if (error) {
      console.error('[AI Persistence] Error inserting into ai_analyses table:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('[AI Persistence] Exception saving AI analysis metadata:', err);
    return null;
  }
}

export async function saveIncidentEmbedding(
  incidentId: string,
  reportId: string | undefined,
  vectorEmbedding: number[]
) {
  try {
    if (!vectorEmbedding || vectorEmbedding.length === 0) return null;

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('embeddings')
      .insert({
        incident_id: incidentId,
        report_id: reportId || null,
        embedding: vectorEmbedding,
      })
      .select()
      .single();

    if (error) {
      console.error('[AI Persistence] Error inserting vector into embeddings table:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('[AI Persistence] Exception saving embedding vector:', err);
    return null;
  }
}
