export type DepartmentCode =
  | 'ROAD_MAINTENANCE'
  | 'ELECTRICAL'
  | 'SANITATION'
  | 'WATER'
  | 'DRAINAGE'
  | 'TRAFFIC'
  | 'PUBLIC_WORKS';

export interface DepartmentItem {
  id: DepartmentCode;
  code: DepartmentCode;
  name: string;
  legacyCodes: string[];
}

export const DEPARTMENTS: DepartmentItem[] = [
  {
    id: 'ROAD_MAINTENANCE',
    code: 'ROAD_MAINTENANCE',
    name: 'Road Maintenance',
    legacyCodes: ['PWD_ROAD', 'dept_roads', 'ROAD_MAINT', '11111111-1111-1111-1111-111111111111'],
  },
  {
    id: 'ELECTRICAL',
    code: 'ELECTRICAL',
    name: 'Electrical',
    legacyCodes: ['ELEC_DEPT', 'dept_electrical', '33333333-3333-3333-3333-333333333333'],
  },
  {
    id: 'SANITATION',
    code: 'SANITATION',
    name: 'Garbage / Sanitation',
    legacyCodes: ['SAN_DEPT', 'dept_sanitation', '22222222-2222-2222-2222-222222222222'],
  },
  {
    id: 'WATER',
    code: 'WATER',
    name: 'Water',
    legacyCodes: ['WATER_DEPT', 'dept_water', '44444444-4444-4444-4444-444444444444'],
  },
  {
    id: 'DRAINAGE',
    code: 'DRAINAGE',
    name: 'Drainage',
    legacyCodes: ['DRAIN_DEPT', 'dept_drainage', '55555555-5555-5555-5555-555555555555'],
  },
  {
    id: 'TRAFFIC',
    code: 'TRAFFIC',
    name: 'Traffic',
    legacyCodes: ['TRAFF_DEPT', 'dept_traffic', '66666666-6666-6666-6666-666666666666'],
  },
  {
    id: 'PUBLIC_WORKS',
    code: 'PUBLIC_WORKS',
    name: 'Public Works',
    legacyCodes: ['dept_publicworks', 'PUBLIC_WORKS', '77777777-7777-7777-7777-777777777777'],
  },
];

export const DEPARTMENT_DISPLAY_NAMES: Record<DepartmentCode, string> = {
  ROAD_MAINTENANCE: 'Road Maintenance',
  ELECTRICAL: 'Electrical',
  SANITATION: 'Garbage / Sanitation',
  WATER: 'Water',
  DRAINAGE: 'Drainage',
  TRAFFIC: 'Traffic',
  PUBLIC_WORKS: 'Public Works',
};

export const CATEGORY_TO_DEPARTMENT: Record<string, DepartmentCode> = {
  ROAD_POTHOLE: 'ROAD_MAINTENANCE',
  POTHOLE: 'ROAD_MAINTENANCE',
  PUBLIC_INFRA_DAMAGE: 'PUBLIC_WORKS',
  GARBAGE_OVERFLOW: 'SANITATION',
  GARBAGE: 'SANITATION',
  BROKEN_STREETLIGHT: 'ELECTRICAL',
  ELECTRICAL_HAZARD: 'ELECTRICAL',
  STREETLIGHT: 'ELECTRICAL',
  WATER_LEAKAGE: 'WATER',
  WATER_SUPPLY: 'WATER',
  DRAINAGE_BLOCKAGE: 'DRAINAGE',
  OPEN_MANHOLE: 'DRAINAGE',
  SEWAGE_OVERFLOW: 'DRAINAGE',
  FLOOD: 'DRAINAGE',
  TRAFFIC_SIGNAL_DAMAGED: 'TRAFFIC',
  TRAFFIC_SIGNAL: 'TRAFFIC',
  ILLEGAL_CONSTRUCTION: 'PUBLIC_WORKS',
};

/**
 * Normalizes any legacy department ID, department code, or category into a standard DepartmentCode
 */
export function normalizeDepartmentCode(codeOrId?: string | null, category?: string): DepartmentCode {
  if (category && CATEGORY_TO_DEPARTMENT[category.toUpperCase()]) {
    // If specific code passed, prefer it if valid, else category fallback
    if (codeOrId) {
      const cleanInput = codeOrId.trim().toUpperCase();
      for (const dept of DEPARTMENTS) {
        if (dept.code === cleanInput || dept.legacyCodes.some((lc) => lc.toUpperCase() === cleanInput)) {
          return dept.code;
        }
      }
    }
    return CATEGORY_TO_DEPARTMENT[category.toUpperCase()];
  }

  if (!codeOrId) return 'ROAD_MAINTENANCE';
  const clean = codeOrId.trim().toUpperCase();

  for (const dept of DEPARTMENTS) {
    if (dept.code === clean) return dept.code;
    if (dept.legacyCodes.some((lc) => lc.toUpperCase() === clean)) return dept.code;
  }

  if (clean.includes('ROAD') || clean.includes('POTHOLE')) return 'ROAD_MAINTENANCE';
  if (clean.includes('ELEC') || clean.includes('LIGHT')) return 'ELECTRICAL';
  if (clean.includes('GARBAGE') || clean.includes('SANIT')) return 'SANITATION';
  if (clean.includes('WATER')) return 'WATER';
  if (clean.includes('DRAIN') || clean.includes('MANHOLE') || clean.includes('SEWAGE')) return 'DRAINAGE';
  if (clean.includes('TRAFFIC')) return 'TRAFFIC';
  if (clean.includes('PUBLIC') || clean.includes('BUILDING')) return 'PUBLIC_WORKS';

  return 'ROAD_MAINTENANCE';
}
