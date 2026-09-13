import { 
  UserRole, 
  Department, 
  UserProfile 
} from '@/types/user';
import { 
  IncidentCategory, 
  IncidentSeverity, 
  IncidentStatus, 
  PriorityFactorBreakdown,
  MasterIncident,
  CitizenReport,
  ResolutionEvidence,
  AuditLogEntry
} from '@/types/incident';

export interface DatabaseAIAnalysis {
  id: string;
  incidentId: string;
  rawAiResponse: Record<string, unknown>;
  confidenceScore: number; // 0.0 - 1.0
  detectedCategory: IncidentCategory;
  detectedSeverity: IncidentSeverity;
  suggestedDepartmentCode: string;
  extractedFeatures: Record<string, unknown>;
  createdAt: string;
}

export interface DatabaseEmbedding {
  id: string;
  incidentId: string;
  reportId?: string;
  embedding: number[]; // 768 float array
  createdAt: string;
}

export type DuplicateRelationStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';

export interface DatabaseDuplicateRelation {
  id: string;
  targetIncidentId: string;
  candidateIncidentId: string;
  similarityScore: number; // 0.0 - 1.0
  distanceMeters: number;
  status: DuplicateRelationStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  // Joins
  targetIncident?: MasterIncident;
  candidateIncident?: MasterIncident;
}

export interface DatabaseSchema {
  departments: Department;
  users: UserProfile;
  incidents: MasterIncident;
  reports: CitizenReport;
  ai_analyses: DatabaseAIAnalysis;
  embeddings: DatabaseEmbedding;
  duplicate_relations: DatabaseDuplicateRelation;
  resolution_evidence: ResolutionEvidence;
  audit_logs: AuditLogEntry;
}
