import { IncidentCategory, IncidentSeverity } from '@/types/incident';

export type DepartmentCode =
  | 'ROAD_MAINT'
  | 'SANITATION'
  | 'ELECTRICAL'
  | 'WATER_DEPT'
  | 'DRAINAGE'
  | 'TRAFFIC'
  | 'PUBLIC_WORKS';

export interface SmartCategoryMatch {
  category: IncidentCategory;
  severity: IncidentSeverity;
  safetyRiskScore: number;
  departmentCode: DepartmentCode;
  departmentName: string;
  confidence: number;
  extractedKeywords: string[];
  publicImpact: 'Critical' | 'High' | 'Moderate' | 'Low';
  reasoning: string;
}

interface CategoryRule {
  category: IncidentCategory;
  departmentCode: DepartmentCode;
  departmentName: string;
  defaultSeverity: IncidentSeverity;
  baseSafetyRisk: number;
  keywords: string[];
  patterns: RegExp[];
  reasoningTemplate: (keywords: string[]) => string;
}

export const DEPARTMENT_NAMES: Record<DepartmentCode, string> = {
  ROAD_MAINT: 'Road Maintenance & Infrastructure',
  SANITATION: 'Sanitation & Waste Management',
  ELECTRICAL: 'Electrical & Street Lighting',
  WATER_DEPT: 'Water Supply & Quality Board',
  DRAINAGE: 'Drainage & Sewerage Department',
  TRAFFIC: 'Traffic Signals & Safety Division',
  PUBLIC_WORKS: 'Public Works & Buildings',
};

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: 'OPEN_MANHOLE',
    departmentCode: 'DRAINAGE',
    departmentName: 'Drainage & Sewerage Department',
    defaultSeverity: 'CRITICAL',
    baseSafetyRisk: 96,
    keywords: [
      'manhole',
      'open manhole',
      'manhole cover',
      'missing cover',
      'pit open',
      'chamber open',
      'sewer hole',
      'drain hole',
      'uncovered pit',
      'drain pit',
      'gutter hole',
      'fall risk',
      'manhole without cover',
    ],
    patterns: [
      /(open|broken|missing|damaged|uncovered|stolen|collapsed)\s*(manhole|chamber|drain\s*cover|pit|gutter\s*cover)/i,
      /manhole\s*(cover\s+)?(missing|broken|open|stolen|uncovered|damaged|collapsed)/i,
      /uncovered\s+(pit|drain|hole|chamber)/i,
      /manhole/i,
    ],
    reasoningTemplate: (kw) =>
      `Uncovered or damaged manhole poses fatal pedestrian fall hazard and severe two-wheeler tire entrapment risk. Immediate barricading and lid replacement required.`,
  },
  {
    category: 'ELECTRICAL_HAZARD',
    departmentCode: 'ELECTRICAL',
    departmentName: 'Electrical & Street Lighting',
    defaultSeverity: 'CRITICAL',
    baseSafetyRisk: 94,
    keywords: [
      'electric wire',
      'live wire',
      'hanging wire',
      'sparking',
      'transformer spark',
      'electric shock',
      'short circuit',
      'power line',
      'exposed wire',
      'wire snap',
      'loose cable',
      'pillar box open',
      'pole spark',
    ],
    patterns: [
      /(hanging|exposed|live|broken|cut|snapped|open)\s*(wire|cable|line|transformer|fuse\s*box|pillar\s*box)/i,
      /spark(ing)?/i,
      /electric(al)?\s*(hazard|shock|spark|wire|pole|current|fire|short\s*circuit)/i,
      /transformer/i,
      /live\s*current/i,
    ],
    reasoningTemplate: (kw) =>
      `Exposed or sparking electrical line detected. High risk of electrocution and municipal power grid short circuit. Emergency power isolation recommended.`,
  },
  {
    category: 'FLOOD',
    departmentCode: 'DRAINAGE',
    departmentName: 'Drainage & Sewerage Department',
    defaultSeverity: 'HIGH',
    baseSafetyRisk: 82,
    keywords: [
      'flood',
      'flooded',
      'waterlogging',
      'water logged',
      'rainwater standing',
      'submerged',
      'inundated',
      'water on road',
      'water near road',
      'water stagnation',
      'water standing',
      'water accumulation',
      'water causes traffic',
      'knee deep water',
    ],
    patterns: [
      /water\s*(logg(ed|ing)|stagnat(ed|ion)?|standing|near\s*the\s*road|on\s*the\s*road|accumulation|causes\s*traffic|flow\s*blocked)/i,
      /flood(ed|ing)?/i,
      /submerged\s*(road|street|area|junction)/i,
      /inundat(ed|ion)?/i,
      /knee\s*deep\s*water/i,
    ],
    reasoningTemplate: (kw) =>
      `Severe stormwater stagnation / road waterlogging causing vehicular gridlock and pedestrian disruption. Dispatch suction pumps and inspect culvert inflow.`,
  },
  {
    category: 'ROAD_POTHOLE',
    departmentCode: 'ROAD_MAINT',
    departmentName: 'Road Maintenance & Infrastructure',
    defaultSeverity: 'HIGH',
    baseSafetyRisk: 78,
    keywords: [
      'pothole',
      'potholes',
      'crater',
      'cracked road',
      'asphalt crater',
      'tar road broken',
      'depression on road',
      'sinkhole',
      'broken asphalt',
      'road damaged',
      'bad road',
      'uneven road',
      'swerving vehicles',
      'bump on road',
    ],
    patterns: [
      /pothole(s)?/i,
      /crater(s)?/i,
      /road\s+(damage|broken|cracked|hole|depression|sink|crater|damaged|uneven|bad)/i,
      /broken\s+asphalt/i,
      /tar\s+road\s+(damage|broken)/i,
      /sinkhole/i,
    ],
    reasoningTemplate: (kw) =>
      `Structural asphalt crater / road depression causing vehicle suspension damage and accident risks for two-wheelers. Cold/hot mix patch repair required.`,
  },
  {
    category: 'SEWAGE_OVERFLOW',
    departmentCode: 'DRAINAGE',
    departmentName: 'Drainage & Sewerage Department',
    defaultSeverity: 'HIGH',
    baseSafetyRisk: 84,
    keywords: [
      'sewage overflow',
      'sewer overflow',
      'dirty water',
      'foul smell',
      'black water',
      'gutter overflow',
      'drain stench',
      'sewer line burst',
      'sewer leakage',
      'stinking water',
      'sewage on road',
    ],
    patterns: [
      /sewag(e)?\s+(overflow|leaking|stink|clog|burst|on\s*road|spill)/i,
      /sewer\s+(overflow|clog|burst|leakage|spill)/i,
      /gutter\s+(overflow|spill)/i,
      /foul\s+smell/i,
      /black\s+water\s+overflow/i,
    ],
    reasoningTemplate: (kw) =>
      `Underground sewer blockage causing contaminated blackwater backflow onto public thoroughfare. Bio-hazard risk; jetting machine deployment required.`,
  },
  {
    category: 'DRAINAGE_BLOCKAGE',
    departmentCode: 'DRAINAGE',
    departmentName: 'Drainage & Sewerage Department',
    defaultSeverity: 'MEDIUM',
    baseSafetyRisk: 64,
    keywords: [
      'drainage',
      'drain blocked',
      'clogged drain',
      'blocked gutter',
      'culvert',
      'choked drain',
      'drain silt',
      'storm drain clogged',
      'debris in drain',
      'silt deposit',
      'gutter choked',
    ],
    patterns: [
      /drain(age)?\s+(block|clog|chok|silt|clean|fill|stuck)/i,
      /clogged\s+drain/i,
      /blocked\s+(gutter|drain|culvert)/i,
      /choked\s+(drain|gutter)/i,
      /silt\s+in\s+drain/i,
    ],
    reasoningTemplate: (kw) =>
      `Stormwater conduit obstructed by silt and debris. De-silting and manual clearing needed to prevent overflow during peak precipitation.`,
  },
  {
    category: 'WATER_LEAKAGE',
    departmentCode: 'WATER_DEPT',
    departmentName: 'Water Supply & Quality Board',
    defaultSeverity: 'MEDIUM',
    baseSafetyRisk: 55,
    keywords: [
      'water leak',
      'pipe burst',
      'pipeline leaking',
      'water gushing',
      'drinking water',
      'tap leak',
      'water wastage',
      'main line leak',
      'valve leak',
      'potable water flowing',
      'supply pipe broken',
    ],
    patterns: [
      /pipe(line)?\s+(burst|leak|broken|damaged|crack)/i,
      /water\s+(leak|burst|gush|wast|spray|spill)/i,
      /drinking\s+water\s*(leak|wast|flow)/i,
      /supply\s*pipe\s*broken/i,
    ],
    reasoningTemplate: (kw) =>
      `Municipal treated water pipeline rupture detected. Potable water loss and sub-surface soil erosion risk. Valve isolation and pipe sleeve replacement advised.`,
  },
  {
    category: 'TRAFFIC_SIGNAL_DAMAGED',
    departmentCode: 'TRAFFIC',
    departmentName: 'Traffic Signals & Safety Division',
    defaultSeverity: 'HIGH',
    baseSafetyRisk: 86,
    keywords: [
      'traffic signal',
      'signal broken',
      'traffic light',
      'traffic post',
      'red light not working',
      'junction signal',
      'blinking signal',
      'signal light dark',
      'signal pole bent',
    ],
    patterns: [
      /traffic\s+(signal|light|post)/i,
      /signal\s+(not\s+working|broken|damaged|dark|fail|down|off)/i,
      /red\s+light\s+(broken|not\s+working)/i,
      /junction\s+signal/i,
    ],
    reasoningTemplate: (kw) =>
      `Junction traffic control signal offline. High risk of multi-vehicle intersection collisions and severe congestion. Technician dispatch prioritized.`,
  },
  {
    category: 'GARBAGE_OVERFLOW',
    departmentCode: 'SANITATION',
    departmentName: 'Sanitation & Waste Management',
    defaultSeverity: 'MEDIUM',
    baseSafetyRisk: 46,
    keywords: [
      'garbage',
      'trash',
      'waste',
      'bin overflow',
      'dustbin',
      'dump',
      'plastic pile',
      'rubbish',
      'litter',
      'debris',
      'solid waste',
      'garbage dump',
      'dumping on street',
      'uncollected trash',
    ],
    patterns: [
      /garb(age)?\s*(dump|pile|overflow|bin|scattered|uncollected)?/i,
      /trash\s*(pile|overflow|bin)?/i,
      /waste\s+(dump|pile|overflow|bin|collection)/i,
      /dustbin\s*(overflow|full|broken)?/i,
      /rubbish/i,
      /litter/i,
    ],
    reasoningTemplate: (kw) =>
      `Accumulated solid municipal waste spilling onto pedestrian walkways. Public hygiene risk and stray animal congregation. Compact truck dispatch requested.`,
  },
  {
    category: 'BROKEN_STREETLIGHT',
    departmentCode: 'ELECTRICAL',
    departmentName: 'Electrical & Street Lighting',
    defaultSeverity: 'MEDIUM',
    baseSafetyRisk: 50,
    keywords: [
      'streetlight',
      'street light',
      'lamp post',
      'dark street',
      'pole light',
      'bulb broken',
      'dark road',
      'no light at night',
      'street light not working',
      'flickering light',
      'led street light',
    ],
    patterns: [
      /street\s*light(s)?/i,
      /lamp\s*post(s)?/i,
      /dark\s+(street|road|alley|lane|junction)/i,
      /light\s+(broken|not\s+working|dark|flickering|off)/i,
      /no\s+light\s+at\s+night/i,
    ],
    reasoningTemplate: (kw) =>
      `Public streetlight outage creating night-time safety blind spots for pedestrians and commuters. Luminaire / fuse replacement needed.`,
  },
  {
    category: 'ILLEGAL_CONSTRUCTION',
    departmentCode: 'PUBLIC_WORKS',
    departmentName: 'Public Works & Buildings',
    defaultSeverity: 'MEDIUM',
    baseSafetyRisk: 58,
    keywords: [
      'illegal construction',
      'encroachment',
      'unauthorized wall',
      'blocked footpath',
      'illegal building',
      'footpath occupied',
      'unauthorized shed',
      'road encroachment',
      'illegal shed',
    ],
    patterns: [
      /illegal\s+(construction|building|encroach|structure|shed|wall)/i,
      /encroach(ment)?/i,
      /footpath\s+(blocked|occupied|encroached)/i,
      /unauthorized\s+(construction|structure|building)/i,
    ],
    reasoningTemplate: (kw) =>
      `Unauthorized civic encroachment blocking municipal right-of-way. Structural violation inspection and notice issuance recommended.`,
  },
  {
    category: 'PUBLIC_INFRA_DAMAGE',
    departmentCode: 'PUBLIC_WORKS',
    departmentName: 'Public Works & Buildings',
    defaultSeverity: 'LOW',
    baseSafetyRisk: 32,
    keywords: [
      'bench',
      'park bench',
      'slats',
      'garden bench',
      'park damage',
      'railing broken',
      'footpath tiles',
      'public property',
      'fence broken',
      'bus shelter',
      'play equipment',
      'signboard damaged',
      'damaged curb',
      'divider broken',
    ],
    patterns: [
      /(bench|slats|railing|fence|footpath|pavement|sidewalk|shelter|park|garden|signboard|divider|curb)\s*(broken|damage|slats|damaged|crack)?/i,
      /public\s+infra/i,
      /property\s+damage/i,
    ],
    reasoningTemplate: (kw) =>
      `Civic amenity / public street furniture physical damage. Minor safety impact; scheduled maintenance carpenter / masonry repair advised.`,
  },
];

export function smartClassifyComplaint(text: string): SmartCategoryMatch {
  const normalizedText = (text || '').toLowerCase().trim();
  let bestMatch: SmartCategoryMatch | null = null;
  let highestScore = 0;

  for (const rule of CATEGORY_RULES) {
    let score = 0;
    const matchedKeywords: string[] = [];

    for (const pat of rule.patterns) {
      if (pat.test(normalizedText)) {
        score += 40;
        const match = normalizedText.match(pat);
        if (match && match[0]) matchedKeywords.push(match[0].trim());
      }
    }

    for (const kw of rule.keywords) {
      if (normalizedText.includes(kw)) {
        score += 25;
        if (!matchedKeywords.includes(kw)) matchedKeywords.push(kw);
      }
    }

    if (score > highestScore) {
      highestScore = score;

      let dynamicSeverity = rule.defaultSeverity;
      let dynamicRisk = rule.baseSafetyRisk;

      // Hazard & Urgency contextual elevation
      if (/(danger|emergency|fatal|critical|hospital|school|swerv|accident|die|injur|hazard|kid|child|electrocution|traffic jam|gridlock)/i.test(normalizedText)) {
        if (dynamicSeverity === 'MEDIUM') dynamicSeverity = 'HIGH';
        else if (dynamicSeverity === 'HIGH') dynamicSeverity = 'CRITICAL';
        dynamicRisk = Math.min(99, dynamicRisk + 12);
      } else if (/(minor|small|slight|cosmetic|tiny|corner|not urgent)/i.test(normalizedText)) {
        if (dynamicSeverity === 'HIGH') dynamicSeverity = 'MEDIUM';
        else if (dynamicSeverity === 'MEDIUM') dynamicSeverity = 'LOW';
        dynamicRisk = Math.max(18, dynamicRisk - 15);
      }

      // Public impact assessment
      let publicImpact: 'Critical' | 'High' | 'Moderate' | 'Low' = 'Moderate';
      if (dynamicRisk >= 85 || /(school|hospital|market|main road|highway|junction|heavy traffic)/i.test(normalizedText)) {
        publicImpact = 'Critical';
      } else if (dynamicRisk >= 65) {
        publicImpact = 'High';
      } else if (dynamicRisk >= 40) {
        publicImpact = 'Moderate';
      } else {
        publicImpact = 'Low';
      }

      const calculatedConfidence = Math.min(0.98, Math.max(0.78, 0.72 + score * 0.008));

      bestMatch = {
        category: rule.category,
        severity: dynamicSeverity,
        safetyRiskScore: dynamicRisk,
        departmentCode: rule.departmentCode,
        departmentName: rule.departmentName,
        confidence: Number(calculatedConfidence.toFixed(2)),
        extractedKeywords: matchedKeywords.slice(0, 5),
        publicImpact,
        reasoning: rule.reasoningTemplate(matchedKeywords),
      };
    }
  }

  if (bestMatch && highestScore > 0) {
    return bestMatch;
  }

  // Intelligent Contextual Fallback for general text
  return {
    category: 'ROAD_POTHOLE',
    severity: 'MEDIUM',
    safetyRiskScore: 58,
    departmentCode: 'ROAD_MAINT',
    departmentName: 'Road Maintenance & Infrastructure',
    confidence: 0.82,
    extractedKeywords: ['civic issue', 'road area'],
    publicImpact: 'Moderate',
    reasoning: `General civic infrastructure inspection required. Dispatched to primary road maintenance division for physical survey.`,
  };
}
