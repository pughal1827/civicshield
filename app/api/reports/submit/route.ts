import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/db/supabase-admin';
import { mockStore } from '@/lib/db/mock-store';
import { getStorageConfig, ProductionDatabaseError } from '@/lib/db/storage-config';
import { analyzeCivicIssue, GeminiConfigurationError } from '@/lib/ai/gemini';
import { generateTextEmbedding, buildNormalizedEmbeddingText } from '@/lib/ai/embeddings';
import { saveAIAnalysisMetadata, saveIncidentEmbedding } from '@/lib/ai/ai-persistence';
import { calculatePriorityScore } from '@/lib/priority/priority-engine';
import { findClusteringMasterIncident, findDuplicateCandidates, createPendingDuplicateRelations } from '@/lib/duplicates/duplicate-detector';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/api-error';
import { logger } from '@/lib/logging/logger';

const submitReportSchema = z.object({
  description: z.string().min(10, 'Please enter a description of at least 10 characters.'),
  category: z.enum([
    'ROAD_POTHOLE',
    'GARBAGE_OVERFLOW',
    'BROKEN_STREETLIGHT',
    'WATER_LEAKAGE',
    'DRAINAGE_BLOCKAGE',
    'TRAFFIC_SIGNAL_DAMAGED',
    'PUBLIC_INFRA_DAMAGE',
    'ELECTRICAL_HAZARD',
    'OPEN_MANHOLE',
    'SEWAGE_OVERFLOW',
    'FLOOD',
    'ILLEGAL_CONSTRUCTION',
  ]).optional(),
  imageUrl: z.string().optional().or(z.literal('')),
  audioUrl: z.string().optional().or(z.literal('')),
  reporterId: z.string().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  addressText: z.string().min(3, 'Address location is required.'),
});

export async function POST(req: NextRequest) {
  try {
    const storageConfig = getStorageConfig();
    const body = await req.json();

    // Extract citizen identifier from headers or request payload
    const citizenIdHeader = req.headers.get('x-user-id') || req.headers.get('x-citizen-id');

    // 1. Validate Input Payload
    const parseResult = submitReportSchema.safeParse(body);
    if (!parseResult.success) {
      return createErrorResponse('Invalid submission payload.', 'VALIDATION_ERROR', 400, parseResult.error.format());
    }

    const { description, category: userCategory, imageUrl, audioUrl, reporterId, latitude, longitude, addressText } = parseResult.data;
    const finalCitizenId = citizenIdHeader || reporterId || 'cit-101';

    // 2. Generate Tracking Code & Default Case ID
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const trackingCode = crypto.randomUUID(); // Secure unique citizen tracking UUID

    // 3. Invoke AI Multi-modal Analysis
    logger.info('SubmitAPI', `Running AI multi-modal analysis...`);
    const { analysis, isFallback } = await analyzeCivicIssue(description, imageUrl || undefined);

    const finalCategory = userCategory || analysis.category;
    const summary = analysis.summary || description.slice(0, 120);

    // 4. Generate Text Embedding Vector
    const normalizedText = buildNormalizedEmbeddingText(finalCategory, description, summary);
    const embeddingVector = await generateTextEmbedding(normalizedText);

    // 5. Intelligent Multi-Citizen Complaint Clustering Check
    logger.info('SubmitAPI', `Checking for nearby matching active complaints to cluster...`);
    const clusterResult = await findClusteringMasterIncident({
      latitude,
      longitude,
      category: finalCategory,
      description,
      embeddingVector,
      maxRadiusMeters: 250, // 250m proximity cluster threshold
    });

    // ─── BRANCH A: CLUSTER INTO EXISTING MASTER INCIDENT ───────────────────
    if (clusterResult.isClusterMatch && clusterResult.masterIncident) {
      const master = clusterResult.masterIncident;
      const masterCaseId = master.case_id || master.caseId;
      logger.info('SubmitAPI', `[AUTO-CLUSTER] Merging new citizen report into Master Incident #${masterCaseId} (${clusterResult.distanceMeters}m distance, confidence ${clusterResult.clusterScore})`);

      let updatedIncident: any = null;
      let newReport: any = null;

      if (storageConfig.isMock) {
        const mergeResult = mockStore.mergeReportIntoMasterIncident(
          master.id,
          {
            trackingCode,
            description,
            imageUrl: imageUrl || null,
            latitude,
            longitude,
            addressText,
          },
          12 // +12 score boost for multi-citizen community confirmation
        );

        if (mergeResult) {
          updatedIncident = mergeResult.incident;
          newReport = mergeResult.report;
        }
      } else {
        const supabase = createAdminClient();
        try {
          // Increment report_count, boost priority, insert report
          const newReportCount = (master.report_count || 1) + 1;
          const currentScore = master.priority_score || 50;
          const elevatedScore = Math.min(100, currentScore + 12);
          let elevatedSeverity = master.severity || 'MEDIUM';
          if (newReportCount >= 4) elevatedSeverity = 'CRITICAL';
          else if (newReportCount >= 2 && elevatedSeverity === 'LOW') elevatedSeverity = 'HIGH';

          const { data: updatedInc } = await supabase
            .from('incidents')
            .update({
              report_count: newReportCount,
              affected_citizens_count: (master.affected_citizens_count || 1) + 1,
              priority_score: elevatedScore,
              severity: elevatedSeverity,
              updated_at: new Date().toISOString(),
            })
            .eq('id', master.id)
            .select()
            .single();

          updatedIncident = updatedInc || master;

          const { data: repData } = await supabase
            .from('reports')
            .insert({
              incident_id: master.id,
              tracking_code: trackingCode,
              raw_description: description,
              image_url: imageUrl || null,
              latitude,
              longitude,
              address_text: addressText,
              is_original_report: false,
            })
            .select()
            .single();

          newReport = repData;
        } catch (dbErr) {
          logger.error('SubmitAPI', 'Supabase cluster merge error', { error: String(dbErr) });
        }
      }

      return createSuccessResponse({
        caseId: masterCaseId,
        trackingCode,
        incidentId: master.id,
        category: master.category || finalCategory,
        priorityScore: updatedIncident?.priority_score || master.priority_score,
        priorityLevel: (updatedIncident?.priority_score || 50) >= 80 ? 'CRITICAL' : (updatedIncident?.priority_score || 50) >= 60 ? 'HIGH' : 'MEDIUM',
        isClustered: true,
        reportCount: updatedIncident?.report_count || 2,
        clusterMessage: `Your report was automatically consolidated with ${updatedIncident?.report_count || 2} existing neighbor reports for #${masterCaseId}. Priority elevated for faster civic response.`,
        isAiFallback: isFallback,
        storageMode: storageConfig.mode,
      });
    }

    // ─── BRANCH B: CREATE NEW MASTER INCIDENT ──────────────────────────────
    const caseId = `CS-${randomNum}`;
    const title = `${finalCategory.replace(/_/g, ' ')} near ${addressText.split(',')[0] || addressText}`;

    // 6. Calculate Priority Engine Score for new issue
    const priorityResult = calculatePriorityScore({
      category: finalCategory,
      aiSeverity: analysis.severity,
      aiSafetyRiskScore: analysis.safetyRiskScore,
      description,
      addressText,
      reportCount: 1,
      affectedCitizensCount: 1,
    });

    // 7. Department & Database Category Mapping
    const deptCodeMap: Record<string, { id: string; name: string; code: string }> = {
      ROAD_MAINT: { id: '11111111-1111-1111-1111-111111111111', name: 'Road Maintenance & Infrastructure', code: 'ROAD_MAINT' },
      SANITATION: { id: '22222222-2222-2222-2222-222222222222', name: 'Sanitation & Waste Management', code: 'SANITATION' },
      ELECTRICAL: { id: '33333333-3333-3333-3333-333333333333', name: 'Electrical & Street Lighting', code: 'ELECTRICAL' },
      WATER_DEPT: { id: '44444444-4444-4444-4444-444444444444', name: 'Water Supply & Quality', code: 'WATER_DEPT' },
      DRAINAGE: { id: '55555555-5555-5555-5555-555555555555', name: 'Drainage & Sewerage', code: 'DRAINAGE' },
      TRAFFIC: { id: '11111111-1111-1111-1111-111111111111', name: 'Road Maintenance & Infrastructure', code: 'ROAD_MAINT' },
      PUBLIC_WORKS: { id: '11111111-1111-1111-1111-111111111111', name: 'Road Maintenance & Infrastructure', code: 'ROAD_MAINT' },
    };
    const deptObj = deptCodeMap[analysis.recommendedDepartmentCode] || deptCodeMap.ROAD_MAINT;
    const departmentId = deptObj.id;

    // Normalize category for database CHECK constraint compatibility
    const dbCategoryMap: Record<string, string> = {
      OPEN_MANHOLE: 'DRAINAGE_BLOCKAGE',
      SEWAGE_OVERFLOW: 'DRAINAGE_BLOCKAGE',
      FLOOD: 'DRAINAGE_BLOCKAGE',
      ELECTRICAL_HAZARD: 'BROKEN_STREETLIGHT',
      ILLEGAL_CONSTRUCTION: 'PUBLIC_INFRA_DAMAGE',
    };
    const dbCategory = dbCategoryMap[finalCategory] || finalCategory;

    let incident: any = null;
    let report: any = null;

    if (storageConfig.isMock) {
      logger.info('SubmitAPI', `Storing new report in MOCK mode: ${caseId}`);
      const generatedId = `inc-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      const submissionTimestamp = new Date().toISOString();

      incident = mockStore.addIncident({
        id: generatedId,
        case_id: caseId,
        caseId,
        title,
        summary,
        category: finalCategory,
        severity: analysis.severity,
        status: 'SUBMITTED',
        reporter_id: finalCitizenId,
        reporterId: finalCitizenId,
        citizen_id: finalCitizenId,
        citizenId: finalCitizenId,
        audio_url: audioUrl || null,
        audioUrl: audioUrl || null,
        priority_score: priorityResult.priorityScore,
        priorityScore: priorityResult.priorityScore,
        priority_factors: {
          safetyRisk: priorityResult.factorScores.safetyRiskScore,
          publicImpact: priorityResult.factorScores.publicImpactScore,
          severity: priorityResult.factorScores.severityScore,
          recurrence: priorityResult.factorScores.recurrenceScore,
          locationSensitivity: priorityResult.factorScores.locationSensitivityScore,
          explanation: priorityResult.explanationSummary,
        },
        latitude,
        longitude,
        address: addressText,
        department_id: departmentId,
        departmentId,
        departments: deptObj,
        report_count: 1,
        reportCount: 1,
        affected_citizens_count: 1,
        affectedCitizensCount: 1,
        is_duplicate_flagged: false,
        created_at: submissionTimestamp,
      });

      report = mockStore.addReport({
        id: `rep-${Date.now()}`,
        incident_id: generatedId,
        incidentId: generatedId,
        citizen_id: finalCitizenId,
        citizenId: finalCitizenId,
        reporter_id: finalCitizenId,
        reporterId: finalCitizenId,
        tracking_code: trackingCode,
        trackingCode,
        raw_description: description,
        rawDescription: description,
        image_url: imageUrl || null,
        imageUrl: imageUrl || null,
        audio_url: audioUrl || null,
        audioUrl: audioUrl || null,
        latitude,
        longitude,
        address_text: addressText,
        addressText,
        is_original_report: true,
        created_at: submissionTimestamp,
      });

      mockStore.addAiAnalysis({
        id: `ai-${Date.now()}`,
        incident_id: generatedId,
        confidence_score: analysis.confidenceScore,
        detected_category: analysis.category,
        detected_severity: analysis.severity,
        suggested_department_code: analysis.recommendedDepartmentCode,
        extracted_features: {
          safetyRiskScore: analysis.safetyRiskScore,
          importantDetails: analysis.importantDetails,
          summary: analysis.summary,
        },
        created_at: submissionTimestamp,
      });

      if (embeddingVector) {
        mockStore.addEmbedding(generatedId, embeddingVector);
      }
    } else {
      logger.info('SubmitAPI', `Storing new report in SUPABASE mode: ${caseId}`);
      const supabase = createAdminClient();
      const submissionTimestamp = new Date().toISOString();

      // Ensure department exists in Supabase DB
      let dbDeptId: string | null = null;
      try {
        const { data: deptData } = await supabase
          .from('departments')
          .select('id')
          .eq('code', deptObj.code)
          .maybeSingle();

        if (deptData?.id) {
          dbDeptId = deptData.id;
        } else {
          const { data: newDept } = await supabase
            .from('departments')
            .upsert([
              { id: '11111111-1111-1111-1111-111111111111', name: 'Road Maintenance & Infrastructure', code: 'ROAD_MAINT', contact_email: 'roads@civicshield.gov' },
              { id: '22222222-2222-2222-2222-222222222222', name: 'Sanitation & Waste Management', code: 'SANITATION', contact_email: 'sanitation@civicshield.gov' },
              { id: '33333333-3333-3333-3333-333333333333', name: 'Electrical & Street Lighting', code: 'ELECTRICAL', contact_email: 'electrical@civicshield.gov' },
              { id: '44444444-4444-4444-4444-444444444444', name: 'Water Supply & Quality', code: 'WATER_DEPT', contact_email: 'water@civicshield.gov' },
              { id: '55555555-5555-5555-5555-555555555555', name: 'Drainage & Sewerage', code: 'DRAINAGE', contact_email: 'drainage@civicshield.gov' },
            ], { onConflict: 'code' })
            .select('id')
            .eq('code', deptObj.code)
            .maybeSingle();

          dbDeptId = newDept?.id || null;
        }
      } catch {
        dbDeptId = null;
      }

      try {
        const { data: incData, error: incErr } = await supabase
          .from('incidents')
          .insert({
            case_id: caseId,
            title,
            summary,
            category: dbCategory,
            severity: analysis.severity,
            status: 'SUBMITTED',
            reporter_id: finalCitizenId,
            priority_score: priorityResult.priorityScore,
            priority_factors: {
              safetyRisk: priorityResult.factorScores.safetyRiskScore,
              publicImpact: priorityResult.factorScores.publicImpactScore,
              severity: priorityResult.factorScores.severityScore,
              recurrence: priorityResult.factorScores.recurrenceScore,
              locationSensitivity: priorityResult.factorScores.locationSensitivityScore,
              explanation: priorityResult.explanationSummary,
            },
            latitude,
            longitude,
            address: addressText,
            department_id: dbDeptId,
            report_count: 1,
            affected_citizens_count: 1,
            is_duplicate_flagged: false,
            created_at: submissionTimestamp,
          })
          .select()
          .single();

        if (incErr || !incData) {
          logger.error('SubmitAPI', 'Supabase DB insertion error', { error: incErr });
          throw new Error(incErr?.message || 'Database insert error');
        }

        incident = incData;

        const { data: repData, error: repErr } = await supabase
          .from('reports')
          .insert({
            incident_id: incident.id,
            citizen_id: finalCitizenId,
            tracking_code: trackingCode,
            raw_description: description,
            image_url: imageUrl || null,
            audio_url: audioUrl || null,
            latitude,
            longitude,
            address_text: addressText,
            is_original_report: true,
            created_at: submissionTimestamp,
          })
          .select()
          .single();

        if (repErr) {
          logger.error('SubmitAPI', 'Supabase report insertion error', { error: repErr });
        }
        report = repData;

        if (embeddingVector) {
          saveIncidentEmbedding(incident.id, report?.id, embeddingVector).catch(() => {});
        }
        saveAIAnalysisMetadata(incident.id, analysis, { raw: description }).catch(() => {});
      } catch (dbException) {
        logger.error('SubmitAPI', 'Supabase connection/insertion failure. Saving to local mock store fallback.', { error: String(dbException) });
        
        const generatedId = `inc-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
        incident = mockStore.addIncident({
          id: generatedId,
          case_id: caseId,
          caseId,
          title,
          summary,
          category: finalCategory,
          severity: analysis.severity,
          status: 'SUBMITTED',
          reporter_id: finalCitizenId,
          reporterId: finalCitizenId,
          citizen_id: finalCitizenId,
          citizenId: finalCitizenId,
          audio_url: audioUrl || null,
          audioUrl: audioUrl || null,
          priority_score: priorityResult.priorityScore,
          priorityScore: priorityResult.priorityScore,
          priority_factors: {
            safetyRisk: priorityResult.factorScores.safetyRiskScore,
            publicImpact: priorityResult.factorScores.publicImpactScore,
            severity: priorityResult.factorScores.severityScore,
            recurrence: priorityResult.factorScores.recurrenceScore,
            locationSensitivity: priorityResult.factorScores.locationSensitivityScore,
            explanation: priorityResult.explanationSummary,
          },
          latitude,
          longitude,
          address: addressText,
          department_id: departmentId,
          departmentId,
          departments: deptObj,
          report_count: 1,
          reportCount: 1,
          affected_citizens_count: 1,
          affectedCitizensCount: 1,
          is_duplicate_flagged: false,
          created_at: submissionTimestamp,
        });

        report = mockStore.addReport({
          id: `rep-${Date.now()}`,
          incident_id: generatedId,
          incidentId: generatedId,
          citizen_id: finalCitizenId,
          citizenId: finalCitizenId,
          reporter_id: finalCitizenId,
          reporterId: finalCitizenId,
          tracking_code: trackingCode,
          trackingCode,
          raw_description: description,
          rawDescription: description,
          image_url: imageUrl || null,
          imageUrl: imageUrl || null,
          audio_url: audioUrl || null,
          audioUrl: audioUrl || null,
          latitude,
          longitude,
          address_text: addressText,
          addressText,
          is_original_report: true,
          created_at: submissionTimestamp,
        });
      }
    }

    // 8. Run Secondary Duplicate Detection Flagging
    let duplicateCount = 0;
    try {
      const duplicateCandidates = await findDuplicateCandidates({
        candidateIncidentId: incident.id,
        latitude,
        longitude,
        category: finalCategory,
        embeddingVector,
      });

      if (duplicateCandidates.length > 0) {
        duplicateCount = await createPendingDuplicateRelations(incident.id, duplicateCandidates);
        logger.info('SubmitAPI', `Flagged ${duplicateCount} pending duplicate candidate relation(s) for ${caseId}.`);
      }
    } catch (dupErr) {
      logger.warn('SubmitAPI', 'Duplicate candidate check handled safely', { error: String(dupErr) });
    }

    return createSuccessResponse({
      caseId,
      trackingCode,
      incidentId: incident.id,
      category: finalCategory,
      priorityScore: priorityResult.priorityScore,
      priorityLevel: priorityResult.priorityLevel,
      isClustered: false,
      reportCount: 1,
      duplicatesFlagged: duplicateCount,
      isAiFallback: isFallback,
      storageMode: storageConfig.mode,
    });
  } catch (error) {
    if (error instanceof GeminiConfigurationError) {
      return createErrorResponse('AI classification engine is unconfigured in production environment.', 'AI_UNCONFIGURED', 503);
    }
    if (error instanceof ProductionDatabaseError) {
      return createErrorResponse('Service temporarily unavailable. Please try again.', 'SERVICE_UNAVAILABLE', 503);
    }
    logger.error('SubmitAPI', 'Exception during report submission', { error: error instanceof Error ? error.message : String(error) });
    return createErrorResponse('We couldn\'t submit your report right now. Please check your connection and try again.', 'SUBMISSION_ERROR', 500);
  }
}
