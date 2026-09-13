import { IncidentCategory, IncidentSeverity, IncidentStatus } from '@/types/incident';

export interface GeographicPoint {
  latitude: number;
  longitude: number;
  addressText?: string;
}

export type TimeWindowType =
  | 'today'
  | 'yesterday'
  | 'last7Days'
  | 'last30Days'
  | 'previous7Days'
  | 'previous30Days'
  | 'currentMonth'
  | 'previousMonth';

export interface TimeWindow {
  type: TimeWindowType;
  name: string;
  startDate: string; // ISO string UTC
  endDate: string;   // ISO string UTC
}

export interface TrendMetrics {
  currentCount: number;
  previousCount: number;
  absoluteChange: number;
  percentageChange: number | null; // null if previousCount === 0
  explanation: string;
}

export interface IncidentMetrics {
  totalIncidents: number;           // Master Incident count
  totalReports: number;             // Citizen Report count
  activeIncidents: number;          // SUBMITTED, AI_ANALYSED, ASSIGNED, IN_PROGRESS
  criticalIncidents: number;        // Priority Score >= 80
  highPriorityIncidents: number;    // Priority Score 60-79
  mediumPriorityIncidents: number;  // Priority Score 40-59
  lowPriorityIncidents: number;     // Priority Score < 40
  resolvedIncidents: number;        // RESOLVED
  verifiedIncidents: number;        // VERIFIED
  unassignedIncidents: number;      // No departmentId
}

export interface CategoryMetrics {
  category: IncidentCategory;
  categoryLabel: string;
  incidentCount: number;
  reportCount: number;
  activeCount: number;
  criticalCount: number;
  resolvedCount: number;
}

export interface DepartmentMetrics {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  activeIncidents: number;
  criticalIncidents: number;
  highPriorityIncidents: number;
  resolvedIncidents: number;
  pendingVerificationCount: number;
}

export interface IntelligenceOverview {
  timeWindow: TimeWindow;
  metrics: IncidentMetrics;
  trend: TrendMetrics;
  categories: CategoryMetrics[];
  departments: DepartmentMetrics[];
  storageMode: 'mock' | 'supabase';
  calculatedAt: string;
}

export type HotspotSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type DetectionStrength = 'STRONG' | 'MODERATE' | 'EMERGING';

export interface HotspotCategoryBreakdown {
  category: IncidentCategory;
  categoryLabel: string;
  count: number;
}

export interface HotspotDepartmentInfo {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  count: number;
}

export interface HotspotItem {
  id: string; // Deterministic computed ID
  center: GeographicPoint;
  radiusMeters: number;
  incidentCount: number;         // Master Incident count in cluster
  citizenReportCount: number;     // Total citizen report submissions in cluster
  activeCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  topCategories: HotspotCategoryBreakdown[];
  topDepartment: HotspotDepartmentInfo | null;
  hotspotType: string;
  hotspotSeverity: HotspotSeverity;
  detectionStrength: DetectionStrength;
  trend: TrendMetrics;
  timeWindow: TimeWindow;
  incidentIds: string[];
}

export interface HotspotsResponse {
  hotspots: HotspotItem[];
  config: {
    timeWindowDays: number;
    radiusMeters: number;
    minIncidents: number;
  };
  totalHotspots: number;
  totalClusteredIncidents: number;
  totalClusteredReports: number;
  storageMode: 'mock' | 'supabase';
  generatedAt: string;
}

// --- RECURRENCE TYPES ---
export type RecurrenceStrength = 'STRONG' | 'MODERATE' | 'LOW';

export interface RecurrenceItem {
  recurrenceId: string;
  center: GeographicPoint;
  radiusMeters: number;
  category: IncidentCategory;
  categoryLabel: string;
  occurrenceCount: number;
  firstOccurrence: string;
  lastOccurrence: string;
  daysSinceLastOccurrence: number;
  activeOccurrenceCount: number;
  resolvedOccurrenceCount: number;
  verifiedOccurrenceCount: number;
  averageDaysBetweenOccurrences: number;
  trend: TrendMetrics;
  recurrenceStrength: RecurrenceStrength;
  incidentIds: string[];
}

export interface RecurringResponse {
  recurrences: RecurrenceItem[];
  config: {
    lookbackDays: number;
    radiusMeters: number;
    minOccurrences: number;
  };
  totalRecurringProblems: number;
  totalAffectedIncidents: number;
  storageMode: 'mock' | 'supabase';
  generatedAt: string;
}

// --- SLA MONITORING TYPES ---
export type SLAStatus = 'ON_TRACK' | 'AT_RISK' | 'BREACHED' | 'NOT_APPLICABLE';

export interface IncidentSLAItem {
  incidentId: string;
  caseId: string;
  title: string;
  category: IncidentCategory;
  categoryLabel: string;
  priorityTier: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  priorityScore: number;
  departmentId?: string | null;
  departmentName?: string | null;
  departmentCode?: string | null;
  status: IncidentStatus;
  slaStart: string;              // ISO timestamp UTC
  deadline: string;              // ISO timestamp UTC
  targetHours: number;           // 4, 24, 72, 168
  elapsedSeconds: number;
  remainingSeconds: number;      // 0 if breached
  progressPercent: number;       // 0-100 clamped
  slaStatus: SLAStatus;
}

export interface SLASummary {
  totalTracked: number;
  onTrack: number;
  atRisk: number;
  breached: number;
  notApplicable: number;
}

export interface SLAResponse {
  summary: SLASummary;
  incidents: IncidentSLAItem[];
  storageMode: 'mock' | 'supabase';
  generatedAt: string;
}

// --- DEPARTMENT WORKLOAD & PRESSURE TYPES ---
export type PressureClassification = 'NORMAL' | 'MODERATE' | 'ELEVATED' | 'HIGH';

export interface DepartmentPressureInfo {
  pressureScore: number;           // 0-100 clamped
  classification: PressureClassification;
  reasons: string[];
  hasBottleneck: boolean;
  bottleneckExplanation?: string;
}

export interface DepartmentResolutionMetrics {
  resolvedCount: number;
  averageResolutionHours: number | null;
  minResolutionHours: number | null;
  maxResolutionHours: number | null;
}

export interface DepartmentVerificationMetrics {
  verifiedCount: number;
  rejectedVerificationCount: number;
  verificationRate: number | null;    // percentage, null if resolvedCount === 0
  reopenRate: number | null;          // percentage, null if resolvedCount === 0
}

export interface DepartmentWorkloadDetail {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  activeCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  submittedCount: number;
  assignedCount: number;
  inProgressCount: number;
  resolvedCount: number;
  pendingVerificationCount: number;
  verifiedCount: number;
  slaAtRiskCount: number;
  slaBreachedCount: number;
  recurringProblemCount: number;
  citizenReportCount: number;
  pressure: DepartmentPressureInfo;
  resolution: DepartmentResolutionMetrics;
  verification: DepartmentVerificationMetrics;
  newIncidentsTrend: TrendMetrics;
  resolvedIncidentsTrend: TrendMetrics;
}

export interface UnassignedIncidentItem {
  incidentId: string;
  caseId: string;
  title: string;
  category: IncidentCategory;
  categoryLabel: string;
  priorityTier: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  priorityScore: number;
  createdAt: string;
  timeSinceSubmissionMinutes: number;
  timeSinceSubmissionText: string;
  addressSummary?: string;
}

export interface DepartmentOperationsResponse {
  departments: DepartmentWorkloadDetail[];
  unassignedCritical: UnassignedIncidentItem[];
  unassignedHigh: UnassignedIncidentItem[];
  totalUnassignedCritical: number;
  totalUnassignedHigh: number;
  storageMode: 'mock' | 'supabase';
  generatedAt: string;
}

// --- ROOT-CAUSE SIGNAL TYPES ---
export type RootCauseClassification = 'LOW' | 'MODERATE' | 'STRONG' | 'VERY_STRONG';

export interface RootCauseSignalItem {
  signalId: string;
  category: IncidentCategory;
  categoryLabel: string;
  title: string;
  departmentId?: string | null;
  departmentName?: string | null;
  center: GeographicPoint;
  radiusMeters: number;
  incidentCount: number;
  relatedIncidentIds: string[];
  firstOccurrence: string;
  latestOccurrence: string;
  signalScore: number;                 // 0-100 score
  classification: RootCauseClassification;
  evidence: string[];                  // Reasons explaining signal
  recommendedAction: string;          // Actionable advice
  requiresFieldVerification: boolean;  // Always true
}

export interface RootCauseResponse {
  signals: RootCauseSignalItem[];
  config: {
    days: number;
    radiusMeters: number;
    minIncidents: number;
    minSignalScore: number;
  };
  totalSignals: number;
  totalAffectedIncidents: number;
  storageMode: 'mock' | 'supabase';
  generatedAt: string;
}

// --- EMERGENCY ESCALATION TYPES ---
export type EscalationLevel = 'EMERGENCY_REVIEW' | 'URGENT' | 'WATCH' | 'NONE';

export interface EscalationAlertItem {
  incidentId: string;
  caseId: string;
  title: string;
  category: IncidentCategory;
  categoryLabel: string;
  departmentId?: string | null;
  departmentName?: string | null;
  priorityTier: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  priorityScore: number;
  safetyRiskScore: number;
  reportCount: number;
  slaState: SLAStatus;
  recurrenceSignal: boolean;
  escalationLevel: EscalationLevel;
  reasons: string[];
  recommendedAction: string;
  createdAt: string;
  isReviewed: boolean;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
}

export interface EscalationSummary {
  emergencyReviewCount: number;
  urgentCount: number;
  watchCount: number;
  totalAlerts: number;
}

export interface EscalationResponse {
  summary: EscalationSummary;
  alerts: EscalationAlertItem[];
  storageMode: 'mock' | 'supabase';
  generatedAt: string;
}




