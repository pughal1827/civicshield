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
  OPEN_MANHOLE: 95,
  ELECTRICAL_HAZARD: 92,
  FLOOD: 88,
  TRAFFIC_SIGNAL_DAMAGED: 84,
  ROAD_POTHOLE: 76,
  SEWAGE_OVERFLOW: 72,
  DRAINAGE_BLOCKAGE: 65,
  ILLEGAL_CONSTRUCTION: 58,
  WATER_LEAKAGE: 52,
  BROKEN_STREETLIGHT: 48,
  GARBAGE_OVERFLOW: 45,
  PUBLIC_INFRA_DAMAGE: 28,
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
  // FACTOR 1: SAFETY RISK (35% Weight)
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
  if (combinedText.includes('open manhole') || combinedText.includes('exposed wire') || combinedText.includes('sparking') || combinedText.includes('accident')) {
    safetyRiskScore = Math.min(100, Math.max(safetyRiskScore, 90));
    safetyRiskReason += ' Elevated due to high-risk hazard keywords (e.g. open manhole/exposed wire/accident risk).';
  } else if (combinedText.includes('minor') || combinedText.includes('cosmetic') || combinedText.includes('faded')) {
    safetyRiskScore = Math.max(10, Math.min(safetyRiskScore, 30));
    safetyRiskReason += ' Lowered due to minor/cosmetic condition keywords.';
  }

  // -------------------------------------------------------------
  // FACTOR 2: SEVERITY (25% Weight)
  // -------------------------------------------------------------
  const severityScoreMap: Record<IncidentSeverity, number> = {
    CRITICAL: 100,
    HIGH: 75,
    MEDIUM: 45,
    LOW: 15,
  };
  const severityScore = severityScoreMap[aiSeverity] || 45;
  const severityReason = `Mapped from AI severity classification [${aiSeverity}] to numerical score of ${severityScore}/100.`;

  // -------------------------------------------------------------
  // FACTOR 3: PUBLIC IMPACT (20% Weight)
  // -------------------------------------------------------------
  const countFactor = Math.max(reportCount, affectedCitizensCount);
  let publicImpactScore = Math.min(100, Math.round(25 + 25 * Math.log2(Math.max(1, countFactor))));
  let publicImpactReason = `Public impact calculated from ${countFactor} report(s) / affected citizen(s).`;

  if (combinedText.includes('market') || combinedText.includes('junction') || combinedText.includes('main road') || combinedText.includes('bus stand')) {
    publicImpactScore = Math.min(100, publicImpactScore + 30);
    publicImpactReason += ' Boosted (+30) due to high-traffic commercial / transit location.';
  } else if (combinedText.includes('lane') || combinedText.includes('residential') || combinedText.includes('cross')) {
    publicImpactScore = Math.min(100, publicImpactScore + 10);
  }

  // -------------------------------------------------------------
  // FACTOR 4: RECURRENCE & CLUSTER DENSITY (10% Weight)
  // -------------------------------------------------------------
  let recurrenceScore = 20;
  let recurrenceReason = 'First-time reported incident (baseline score 20/100).';

  const totalRecurrenceSignal = recurrenceCountInArea + Math.max(0, reportCount - 1);
  if (totalRecurrenceSignal > 0) {
    recurrenceScore = Math.min(100, Math.round(30 + 25 * Math.log2(1 + totalRecurrenceSignal)));
    recurrenceReason = `${totalRecurrenceSignal} repeated report(s) / clustered citizen confirmations recorded in area.`;
  }

  // -------------------------------------------------------------
  // FACTOR 5: LOCATION SENSITIVITY (10% Weight)
  // -------------------------------------------------------------
  let locationSensitivityScore = 25;
  let locationSensitivityReason = 'Located in secondary municipal zone (baseline score 25/100).';

  const hasSensitiveKeyword = SENSITIVE_POI_KEYWORDS.some((kw) => combinedText.includes(kw));
  if (isNearSensitiveLocation || hasSensitiveKeyword) {
    locationSensitivityScore = 95;
    locationSensitivityReason = 'Incident is located in close proximity to a high-priority POI (e.g. school/hospital/main junction).';
  }

  // -------------------------------------------------------------
  // WEIGHTED COMPOSITE SCORE CALCULATION
  // Formula: Score = 0.35 * Safety + 0.25 * Severity + 0.20 * Impact + 0.10 * Recurrence + 0.10 * Location
  // -------------------------------------------------------------
  const safetyRiskContribution = Math.round(safetyRiskScore * 0.35 * 100) / 100;
  const severityContribution = Math.round(severityScore * 0.25 * 100) / 100;
  const publicImpactContribution = Math.round(publicImpactScore * 0.20 * 100) / 100;
  const recurrenceContribution = Math.round(recurrenceScore * 0.10 * 100) / 100;
  const locationSensitivityContribution = Math.round(locationSensitivityScore * 0.10 * 100) / 100;

  let rawWeightedScore =
    safetyRiskContribution +
    severityContribution +
    publicImpactContribution +
    recurrenceContribution +
    locationSensitivityContribution;

  // CRITICAL HAZARD TIER GUARANTEES
  if (aiSeverity === 'CRITICAL' || safetyRiskScore >= 90) {
    rawWeightedScore = Math.max(82, rawWeightedScore); // Ensure critical issues always score >= 82
  } else if (aiSeverity === 'LOW' && safetyRiskScore <= 35) {
    rawWeightedScore = Math.min(38, rawWeightedScore); // Ensure low/cosmetic issues stay <= 38
  }

  const priorityScore = Math.min(100, Math.max(5, Math.round(rawWeightedScore)));

  // Assign Categorical Priority Level
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

  const explanationSummary = `Priority ${priorityScore}/100 [${priorityLevel}] calculated via Civic Risk Matrix: Safety Risk (${safetyRiskScore} @ 35%), Severity (${severityScore} @ 25%), Public Impact (${publicImpactScore} @ 20%), Recurrence (${recurrenceScore} @ 10%), Location (${locationSensitivityScore} @ 10%).`;

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
