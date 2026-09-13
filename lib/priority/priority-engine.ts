import { IncidentCategory, IncidentSeverity } from '@/types/incident';

export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface PriorityFactorScores {
  safetyRiskScore: number;       // 0 - 100
  publicImpactScore: number;     // 0 - 100
  severityScore: number;         // 0 - 100
  recurrenceScore: number;       // 0 - 100
  locationSensitivityScore: number; // 0 - 100
}

export interface PriorityFactorReasons {
  safetyRiskReason: string;
  publicImpactReason: string;
  severityReason: string;
  recurrenceReason: string;
  locationSensitivityReason: string;
}

export interface PriorityEngineInputs {
  category: IncidentCategory;
  aiSeverity?: IncidentSeverity;
  aiSafetyRiskScore?: number; // 0 - 100 from Gemini
  description?: string;
  addressText?: string;
  reportCount?: number;
  affectedCitizensCount?: number;
  recurrenceCountInArea?: number; // Historical complaints in 200m radius
  isNearSensitiveLocation?: boolean; // Explicit POI flag if available
}

export interface PriorityEngineResult {
  priorityScore: number; // 0 - 100
  priorityLevel: PriorityLevel;
  factorScores: PriorityFactorScores;
  weightedFactorContributions: {
    safetyRiskContribution: number;       // 30% weight
    publicImpactContribution: number;     // 25% weight
    severityContribution: number;         // 20% weight
    recurrenceContribution: number;       // 15% weight
    locationSensitivityContribution: number; // 10% weight
  };
  reasons: PriorityFactorReasons;
  explanationSummary: string;
}

// 1. Category Safety Hazard Fallback Weights (when AI score unavailable)
const CATEGORY_SAFETY_HAZARD_WEIGHTS: Record<IncidentCategory, number> = {
  TRAFFIC_SIGNAL_DAMAGED: 85,
  DRAINAGE_BLOCKAGE: 80,
  ROAD_POTHOLE: 75,
  PUBLIC_INFRA_DAMAGE: 60,
  WATER_LEAKAGE: 55,
  BROKEN_STREETLIGHT: 50,
  GARBAGE_OVERFLOW: 45,
};

// 2. Sensitive POI Keyword Regex Matcher
const SENSITIVE_POI_KEYWORDS = [
  'school',
  'hospital',
  'clinic',
  'market',
  'gate',
  'junction',
  'main road',
  'station',
  'bus stand',
  'college',
  'playground',
  'kindergarten',
];

export function calculatePriorityScore(inputs: PriorityEngineInputs): PriorityEngineResult {
  const {
    category,
    aiSeverity = 'MEDIUM',
    aiSafetyRiskScore,
    description = '',
    addressText = '',
    reportCount = 1,
    affectedCitizensCount = 1,
    recurrenceCountInArea = 0,
    isNearSensitiveLocation,
  } = inputs;

  const combinedText = `${description} ${addressText}`.toLowerCase();

  // -------------------------------------------------------------
  // FACTOR 1: SAFETY RISK (30% Weight)
  // -------------------------------------------------------------
  let safetyRiskScore = 50;
  let safetyRiskReason = 'Standard safety hazard level assessed.';

  if (typeof aiSafetyRiskScore === 'number' && !isNaN(aiSafetyRiskScore)) {
    safetyRiskScore = Math.min(100, Math.max(0, aiSafetyRiskScore));
    safetyRiskReason = `AI assessed hazard level at ${safetyRiskScore}/100 based on multi-modal evidence.`;
  } else {
    safetyRiskScore = CATEGORY_SAFETY_HAZARD_WEIGHTS[category] || 50;
    safetyRiskReason = `Assigned category baseline safety hazard score of ${safetyRiskScore}/100 for ${category}.`;
  }

  // Elevate safety risk if severe hazard keywords detected
  if (combinedText.includes('open manhole') || combinedText.includes('exposed wire') || combinedText.includes('child')) {
    safetyRiskScore = Math.min(100, safetyRiskScore + 15);
    safetyRiskReason += ' Elevated due to high-risk hazard keywords (e.g. open manhole/exposed wire/children risk).';
  }

  // -------------------------------------------------------------
  // FACTOR 2: PUBLIC IMPACT (25% Weight)
  // -------------------------------------------------------------
  // Base public impact starts at 30, scaled logarithmically by report & citizen count
  const countFactor = Math.max(reportCount, affectedCitizensCount);
  let publicImpactScore = Math.min(100, Math.round(30 + 25 * Math.log2(Math.max(1, countFactor))));
  let publicImpactReason = `Public impact calculated from ${countFactor} report(s) / affected citizen(s).`;

  if (combinedText.includes('market') || combinedText.includes('junction') || combinedText.includes('main road')) {
    publicImpactScore = Math.min(100, publicImpactScore + 20);
    publicImpactReason += ' Boosted (+20) due to location in a high-footfall public commercial area/junction.';
  }

  // -------------------------------------------------------------
  // FACTOR 3: SEVERITY (20% Weight)
  // -------------------------------------------------------------
  const severityScoreMap: Record<IncidentSeverity, number> = {
    CRITICAL: 100,
    HIGH: 75,
    MEDIUM: 50,
    LOW: 25,
  };
  const severityScore = severityScoreMap[aiSeverity] || 50;
  const severityReason = `Mapped from AI severity classification [${aiSeverity}] to numerical score of ${severityScore}/100.`;

  // -------------------------------------------------------------
  // FACTOR 4: RECURRENCE (15% Weight)
  // -------------------------------------------------------------
  let recurrenceScore = 30; // Neutral default baseline
  let recurrenceReason = 'No previous historical complaints recorded nearby (neutral baseline score 30/100).';

  const totalRecurrenceSignal = recurrenceCountInArea + Math.max(0, reportCount - 1);
  if (totalRecurrenceSignal > 0) {
    recurrenceScore = Math.min(100, Math.round(30 + 20 * Math.log2(1 + totalRecurrenceSignal)));
    recurrenceReason = `${totalRecurrenceSignal} repeated report(s) / nearby historical complaint(s) recorded in area.`;
  }

  // -------------------------------------------------------------
  // FACTOR 5: LOCATION SENSITIVITY (10% Weight)
  // -------------------------------------------------------------
  let locationSensitivityScore = 30; // Standard residential/lane default
  let locationSensitivityReason = 'Located in standard residential/secondary area (default score 30/100).';

  const hasSensitiveKeyword = SENSITIVE_POI_KEYWORDS.some((kw) => combinedText.includes(kw));
  if (isNearSensitiveLocation || hasSensitiveKeyword) {
    locationSensitivityScore = 90;
    locationSensitivityReason = 'Incident is located in close proximity to a sensitive POI (e.g. school/hospital/main facility).';
  }

  // -------------------------------------------------------------
  // WEIGHTED COMPOSITE SCORE CALCULATION
  // -------------------------------------------------------------
  const safetyRiskContribution = Math.round(safetyRiskScore * 0.30 * 100) / 100;
  const publicImpactContribution = Math.round(publicImpactScore * 0.25 * 100) / 100;
  const severityContribution = Math.round(severityScore * 0.20 * 100) / 100;
  const recurrenceContribution = Math.round(recurrenceScore * 0.15 * 100) / 100;
  const locationSensitivityContribution = Math.round(locationSensitivityScore * 0.10 * 100) / 100;

  const rawWeightedScore =
    safetyRiskScore * 0.30 +
    publicImpactScore * 0.25 +
    severityScore * 0.20 +
    recurrenceScore * 0.15 +
    locationSensitivityScore * 0.10;

  const priorityScore = Math.min(100, Math.max(0, Math.round(rawWeightedScore)));

  // Assign Priority Level
  let priorityLevel: PriorityLevel = 'LOW';
  if (priorityScore >= 80) {
    priorityLevel = 'CRITICAL';
  } else if (priorityScore >= 60) {
    priorityLevel = 'HIGH';
  } else if (priorityScore >= 40) {
    priorityLevel = 'MEDIUM';
  } else {
    priorityLevel = 'LOW';
  }

  const explanationSummary = `Priority ${priorityScore}/100 [${priorityLevel}] calculated from Safety Risk (${safetyRiskScore} @ 30%), Public Impact (${publicImpactScore} @ 25%), Severity (${severityScore} @ 20%), Recurrence (${recurrenceScore} @ 15%), and Location Sensitivity (${locationSensitivityScore} @ 10%).`;

  return {
    priorityScore,
    priorityLevel,
    factorScores: {
      safetyRiskScore,
      publicImpactScore,
      severityScore,
      recurrenceScore,
      locationSensitivityScore,
    },
    weightedFactorContributions: {
      safetyRiskContribution,
      publicImpactContribution,
      severityContribution,
      recurrenceContribution,
      locationSensitivityContribution,
    },
    reasons: {
      safetyRiskReason,
      publicImpactReason,
      severityReason,
      recurrenceReason,
      locationSensitivityReason,
    },
    explanationSummary,
  };
}
