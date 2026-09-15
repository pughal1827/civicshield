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
  confidence: number;
  extractedKeywords: string[];
}

interface CategoryRule {
  category: IncidentCategory;
  departmentCode: DepartmentCode;
  defaultSeverity: IncidentSeverity;
  baseSafetyRisk: number;
  keywords: string[];
  patterns: RegExp[];
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: 'OPEN_MANHOLE',
    departmentCode: 'DRAINAGE',
    defaultSeverity: 'CRITICAL',
    baseSafetyRisk: 95,
    keywords: ['open manhole', 'manhole cover', 'missing manhole', 'uncovered pit', 'drain pit', 'manhole open', 'sewer hole', 'drain hole'],
    patterns: [/open\s+manhole/i, /manhole\s+(cover\s+)?(missing|broken|open|stolen)/i, /uncovered\s+(pit|drain|hole)/i],
  },
  {
    category: 'ELECTRICAL_HAZARD',
    departmentCode: 'ELECTRICAL',
    defaultSeverity: 'CRITICAL',
    baseSafetyRisk: 92,
    keywords: ['electric wire', 'hanging wire', 'sparking', 'live wire', 'transformer spark', 'electric shock', 'short circuit', 'power line'],
    patterns: [/(hanging|exposed|live|broken)\s+(wire|cable)/i, /spark(ing)?/i, /electric(al)?\s+(shock|hazard|pole|spark)/i, /transformer/i],
  },
  {
    category: 'FLOOD',
    departmentCode: 'DRAINAGE',
    defaultSeverity: 'HIGH',
    baseSafetyRisk: 85,
    keywords: ['flood', 'flooded', 'waterlogging', 'water logged', 'rainwater standing', 'submerged', 'inundated'],
    patterns: [/water\s*logg(ed|ing)/i, /flood(ed|ing)?/i, /submerged\s+road/i, /standing\s+water/i],
  },
  {
    category: 'ROAD_POTHOLE',
    departmentCode: 'ROAD_MAINT',
    defaultSeverity: 'HIGH',
    baseSafetyRisk: 76,
    keywords: ['pothole', 'potholes', 'crater', 'cracked road', 'asphalt crater', 'tar road broken', 'depression on road', 'sinkhole', 'broken asphalt'],
    patterns: [/pothole/i, /crater/i, /road\s+(damage|broken|cracked|hole|depression|sink|crater)/i, /broken\s+asphalt/i, /tar\s+road\s+damage/i],
  },
  {
    category: 'SEWAGE_OVERFLOW',
    departmentCode: 'DRAINAGE',
    defaultSeverity: 'HIGH',
    baseSafetyRisk: 80,
    keywords: ['sewage overflow', 'sewer overflow', 'dirty water', 'foul smell', 'black water', 'gutter overflow', 'drain stench'],
    patterns: [/sewage\s+(overflow|leaking|stink|clog)/i, /sewer\s+overflow/i, /gutter\s+overflow/i, /foul\s+smell/i],
  },
  {
    category: 'DRAINAGE_BLOCKAGE',
    departmentCode: 'DRAINAGE',
    defaultSeverity: 'MEDIUM',
    baseSafetyRisk: 65,
    keywords: ['drainage', 'drain blocked', 'clogged drain', 'blocked gutter', 'culvert', 'choked drain', 'drain silt'],
    patterns: [/drain(age)?\s+(block|clog|chok)/i, /clogged\s+drain/i, /blocked\s+gutter/i],
  },
  {
    category: 'WATER_LEAKAGE',
    departmentCode: 'WATER_DEPT',
    defaultSeverity: 'MEDIUM',
    baseSafetyRisk: 52,
    keywords: ['water leak', 'pipe burst', 'pipeline leaking', 'water gushing', 'drinking water', 'tap leak', 'water wastage'],
    patterns: [/pipe(line)?\s+(burst|leak|broken)/i, /water\s+(leak|burst|gush|wast)/i, /drinking\s+water/i],
  },
  {
    category: 'TRAFFIC_SIGNAL_DAMAGED',
    departmentCode: 'ROAD_MAINT',
    defaultSeverity: 'HIGH',
    baseSafetyRisk: 84,
    keywords: ['traffic signal', 'signal broken', 'traffic light', 'traffic post', 'red light not working', 'junction signal'],
    patterns: [/traffic\s+(signal|light)/i, /signal\s+(not\s+working|broken|damaged|dark)/i, /red\s+light\s+broken/i],
  },
  {
    category: 'GARBAGE_OVERFLOW',
    departmentCode: 'SANITATION',
    defaultSeverity: 'MEDIUM',
    baseSafetyRisk: 45,
    keywords: ['garbage', 'trash', 'waste', 'bin overflow', 'dustbin', 'dump', 'plastic pile', 'rubbish', 'litter', 'debris'],
    patterns: [/garb(age)?/i, /trash/i, /waste\s+(dump|pile|overflow)/i, /dustbin/i, /rubbish/i, /litter/i],
  },
  {
    category: 'BROKEN_STREETLIGHT',
    departmentCode: 'ELECTRICAL',
    defaultSeverity: 'MEDIUM',
    baseSafetyRisk: 48,
    keywords: ['streetlight', 'street light', 'lamp post', 'dark street', 'pole light', 'bulb broken', 'dark road', 'no light at night'],
    patterns: [/street\s*light/i, /lamp\s*post/i, /dark\s+(street|road|alley)/i, /light\s+(broken|not\s+working|dark)/i],
  },
  {
    category: 'ILLEGAL_CONSTRUCTION',
    departmentCode: 'ROAD_MAINT',
    defaultSeverity: 'MEDIUM',
    baseSafetyRisk: 58,
    keywords: ['illegal construction', 'encroachment', 'unauthorized wall', 'blocked footpath', 'illegal building', 'footpath occupied'],
    patterns: [/illegal\s+(construction|building|encroach)/i, /encroach(ment)?/i, /footpath\s+(blocked|occupied)/i],
  },
  {
    category: 'PUBLIC_INFRA_DAMAGE',
    departmentCode: 'ROAD_MAINT',
    defaultSeverity: 'LOW',
    baseSafetyRisk: 28,
    keywords: ['bench', 'park bench', 'slats', 'garden bench', 'park damage', 'railing broken', 'footpath tiles', 'public property', 'fence broken', 'bus shelter', 'play equipment'],
    patterns: [/(bench|slats|railing|fence|footpath|pavement|sidewalk|shelter|park|garden)\s*(broken|damage|slats)?/i, /public\s+infra/i],
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
        matchedKeywords.push(pat.source);
      }
    }

    for (const kw of rule.keywords) {
      if (normalizedText.includes(kw)) {
        score += 20;
        matchedKeywords.push(kw);
      }
    }

    if (score > highestScore) {
      highestScore = score;
      
      let dynamicSeverity = rule.defaultSeverity;
      let dynamicRisk = rule.baseSafetyRisk;

      if (/(danger|emergency|fatal|critical|hospital|school|swerv|accident|die|injur|hazard)/i.test(normalizedText)) {
        if (dynamicSeverity === 'MEDIUM') dynamicSeverity = 'HIGH';
        else if (dynamicSeverity === 'HIGH') dynamicSeverity = 'CRITICAL';
        dynamicRisk = Math.min(100, dynamicRisk + 15);
      } else if (/(minor|small|slight|cosmetic|tiny)/i.test(normalizedText)) {
        if (dynamicSeverity === 'HIGH') dynamicSeverity = 'MEDIUM';
        else if (dynamicSeverity === 'MEDIUM') dynamicSeverity = 'LOW';
        dynamicRisk = Math.max(15, dynamicRisk - 15);
      }

      bestMatch = {
        category: rule.category,
        severity: dynamicSeverity,
        safetyRiskScore: dynamicRisk,
        departmentCode: rule.departmentCode,
        confidence: Math.min(0.95, 0.55 + score * 0.01),
        extractedKeywords: matchedKeywords,
      };
    }
  }

  if (bestMatch && highestScore > 0) {
    return bestMatch;
  }

  return {
    category: 'ROAD_POTHOLE',
    severity: 'MEDIUM',
    safetyRiskScore: 50,
    departmentCode: 'ROAD_MAINT',
    confidence: 0.40,
    extractedKeywords: [],
  };
}
