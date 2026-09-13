import { IncidentCategory, IncidentSeverity } from './incident';

export interface AIAnalysisRequest {
  description: string;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
}

export interface AIAnalysisResult {
  category: IncidentCategory;
  summary: string;
  severity: IncidentSeverity;
  safetyRiskScore: number; // 0 - 100
  recommendedDepartmentCode: string;
  confidenceScore: number; // 0.0 - 1.0
  importantDetails: string[];
  isFallback?: boolean;
}

export interface DuplicateCheckResult {
  isPossibleDuplicate: boolean;
  candidateMasterIncidentId?: string;
  candidateCaseId?: string;
  similarityScore: number;
  distanceMeters: number;
  confidence: number;
}
