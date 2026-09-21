export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IncidentStatus =
  | 'SUBMITTED'
  | 'AI_ANALYSED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_APPROVAL'
  | 'PENDING_CITIZEN_VERIFICATION'
  | 'EVIDENCE_REJECTED'
  | 'RESOLVED'
  | 'CITIZEN_VERIFICATION'
  | 'VERIFIED'
  | 'CLOSED'
  | 'REOPENED'
  | 'DUPLICATE'
  | 'ESCALATED';

export type IncidentCategory =
  | 'ROAD_POTHOLE'
  | 'GARBAGE_OVERFLOW'
  | 'BROKEN_STREETLIGHT'
  | 'WATER_LEAKAGE'
  | 'DRAINAGE_BLOCKAGE'
  | 'TRAFFIC_SIGNAL_DAMAGED'
  | 'PUBLIC_INFRA_DAMAGE'
  | 'ELECTRICAL_HAZARD'
  | 'OPEN_MANHOLE'
  | 'SEWAGE_OVERFLOW'
  | 'FLOOD'
  | 'ILLEGAL_CONSTRUCTION';

export interface PriorityFactorBreakdown {
  safetyRisk: number;
  publicImpact: number;
  severity: number;
  recurrence: number;
  locationSensitivity: number;
}

export interface MasterIncident {
  id: string;
  caseId: string; // e.g. CS-1042
  title: string;
  summary: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  status: IncidentStatus;
  priorityScore: number; // 0 - 100
  priorityFactors: PriorityFactorBreakdown;
  latitude: number;
  longitude: number;
  address: string;
  departmentId?: string;
  departmentName?: string;
  assignedOfficerId?: string;
  assignedOfficerName?: string;
  reportCount: number;
  affectedCitizensCount: number;
  isDuplicateFlagged: boolean;
  masterIncidentId?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface CitizenReport {
  id: string;
  incidentId: string;
  reporterId?: string;
  trackingCode: string;
  rawDescription: string;
  imageUrl?: string;
  audioUrl?: string;
  latitude: number;
  longitude: number;
  addressText?: string;
  isOriginalReport: boolean;
  createdAt: string;
}

export interface ResolutionEvidence {
  id: string;
  incidentId: string;
  officerId: string;
  proofImageUrl: string;
  resolutionNotes: string;
  citizenVerified: boolean;
  citizenFeedback?: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  incidentId: string;
  performedBy?: string;
  action: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  reason?: string;
  createdAt: string;
}

// Alias used by map components and legacy API responses
export type Incident = MasterIncident;
