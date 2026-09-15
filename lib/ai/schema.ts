import { z } from 'zod';

export const aiCategoryEnum = z.enum([
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
]);

export const aiSeverityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const aiDepartmentCodeEnum = z.enum([
  'ROAD_MAINT',
  'SANITATION',
  'ELECTRICAL',
  'WATER_DEPT',
  'DRAINAGE',
  'TRAFFIC',
  'PUBLIC_WORKS',
]);

export const aiAnalysisOutputSchema = z.object({
  category: aiCategoryEnum,
  summary: z.string().max(300).transform((s) => s.slice(0, 120)),
  severity: aiSeverityEnum,
  safetyRiskScore: z.number().min(0).max(100),
  recommendedDepartmentCode: aiDepartmentCodeEnum,
  confidenceScore: z.number().min(0.0).max(1.0),
  importantDetails: z.array(z.string()).default([]),
});

export type AIAnalysisOutput = z.infer<typeof aiAnalysisOutputSchema>;

export const aiAnalysisRequestSchema = z.object({
  description: z.string().min(5, 'Complaint text description must be at least 5 characters'),
  imageUrl: z.string().optional().or(z.literal('')),
});

export type AIAnalysisRequestInput = z.infer<typeof aiAnalysisRequestSchema>;

export const FALLBACK_AI_ANALYSIS: AIAnalysisOutput = {
  category: 'PUBLIC_INFRA_DAMAGE',
  summary: 'Unclassified civic issue reported by citizen requiring manual triage.',
  severity: 'MEDIUM',
  safetyRiskScore: 50,
  recommendedDepartmentCode: 'PUBLIC_WORKS',
  confidenceScore: 0.30,
  importantDetails: [
    'AI analysis service was unavailable or timed out.',
    'System generated safe default triage payload.',
    'Requires manual inspection by municipal authority officer.',
  ],
};
