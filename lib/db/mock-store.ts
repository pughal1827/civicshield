import { MasterIncident, CitizenReport, IncidentStatus, IncidentCategory, IncidentSeverity } from '@/types/incident';

export interface MockAIAnalysis {
  id: string;
  incident_id: string;
  confidence_score: number;
  detected_category: string;
  detected_severity: string;
  suggested_department_code: string;
  extracted_features: Record<string, unknown>;
  created_at: string;
}

export interface MockDuplicateRelation {
  id: string;
  target_incident_id: string;
  candidate_incident_id: string;
  similarity_score: number;
  distance_meters: number;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  created_at: string;
  target_incident?: any;
  candidate_incident?: any;
}

export interface MockResolutionEvidence {
  id: string;
  incident_id: string;
  officer_id: string;
  proof_image_url: string;
  resolution_notes: string;
  citizen_verified: boolean;
  citizen_feedback?: string;
  created_at: string;
}

export interface MockAuditLog {
  id: string;
  incident_id: string;
  performed_by: string;
  action: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  reason?: string;
  created_at: string;
}

class MockDataStore {
  private incidents: Map<string, any> = new Map();
  private reports: Map<string, any> = new Map();
  private aiAnalyses: Map<string, MockAIAnalysis> = new Map();
  private embeddings: Map<string, number[]> = new Map();
  private duplicateRelations: MockDuplicateRelation[] = [];
  private resolutionEvidence: Map<string, MockResolutionEvidence> = new Map();
  private auditLogs: MockAuditLog[] = [];

  constructor() {
    this.seedDemoData();
  }

  private seedDemoData() {
    const defaultDept = { id: '11111111-1111-1111-1111-111111111111', name: 'Road Maintenance & Infrastructure', code: 'ROAD_MAINT' };
    const sanitationDept = { id: '22222222-2222-2222-2222-222222222222', name: 'Sanitation & Waste Management', code: 'SANITATION' };
    const electricalDept = { id: '33333333-3333-3333-3333-333333333333', name: 'Electrical & Street Lighting', code: 'ELECTRICAL' };
    const waterDept = { id: '44444444-4444-4444-4444-444444444444', name: 'Water Supply & Quality', code: 'WATER_DEPT' };

    // Seed 1: Open Manhole (Critical)
    const inc1Id = 'inc-1001-open-manhole';
    this.incidents.set(inc1Id, {
      id: inc1Id,
      case_id: 'CS-2026-1001',
      title: 'Open manhole near school entrance',
      summary: 'Dangerous open manhole on 4th Main Road outside St. Jude High School posing immediate hazard to pedestrians and school children.',
      category: 'ROAD_POTHOLE',
      severity: 'HIGH',
      status: 'ASSIGNED',
      priority_score: 85,
      priority_factors: { safetyRisk: 100, publicImpact: 75, severity: 100, recurrence: 50, locationSensitivity: 90, explanation: 'High priority due to immediate pedestrian safety risk near school.' },
      latitude: 12.9715987,
      longitude: 77.5945627,
      address: 'St. Jude High School 4th Main Road, Central Zone',
      department_id: defaultDept.id,
      departments: defaultDept,
      report_count: 2,
      affected_citizens_count: 5,
      is_duplicate_flagged: false,
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    });

    const rep1Id = 'rep-1001-a';
    const trackCode1 = '11111111-aaaa-1111-aaaa-111111111111';
    this.reports.set(rep1Id, {
      id: rep1Id,
      incident_id: inc1Id,
      tracking_code: trackCode1,
      raw_description: 'There is a deep open manhole right outside St. Jude High School. Two students almost fell in today morning.',
      image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800',
      latitude: 12.9715987,
      longitude: 77.5945627,
      address_text: 'St. Jude High School 4th Main Road',
      is_original_report: true,
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    });

    // Seed 2: Garbage Overflow (High)
    const inc2Id = 'inc-1002-garbage-overflow';
    this.incidents.set(inc2Id, {
      id: inc2Id,
      case_id: 'CS-2026-1002',
      title: 'Garbage accumulation in central market',
      summary: 'Uncollected waste piling up near commercial vegetable market area causing foul smell and health concern.',
      category: 'GARBAGE_OVERFLOW',
      severity: 'MEDIUM',
      status: 'IN_PROGRESS',
      priority_score: 70,
      priority_factors: { safetyRisk: 65, publicImpact: 75, severity: 75, recurrence: 50, locationSensitivity: 90, explanation: 'High priority due to public health concern in crowded market.' },
      latitude: 12.9725,
      longitude: 77.5955,
      address: 'Central Market Square, Gate 3',
      department_id: sanitationDept.id,
      departments: sanitationDept,
      report_count: 1,
      affected_citizens_count: 3,
      is_duplicate_flagged: false,
      created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    });

    const rep2Id = 'rep-1002-a';
    const trackCode2 = '22222222-bbbb-2222-bbbb-222222222222';
    this.reports.set(rep2Id, {
      id: rep2Id,
      incident_id: inc2Id,
      tracking_code: trackCode2,
      raw_description: 'Garbage has not been collected for 4 days near market gate 3.',
      image_url: null,
      latitude: 12.9725,
      longitude: 77.5955,
      address_text: 'Central Market Square, Gate 3',
      is_original_report: true,
      created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    });

    // Seed 3: Streetlight Out (Low)
    const inc3Id = 'inc-1003-broken-streetlight';
    this.incidents.set(inc3Id, {
      id: inc3Id,
      case_id: 'CS-2026-1003',
      title: 'Dark streetlight in residential lane',
      summary: 'Streetlight bulb burned out on residential lane causing dark stretch at night.',
      category: 'BROKEN_STREETLIGHT',
      severity: 'LOW',
      status: 'SUBMITTED',
      priority_score: 29,
      priority_factors: { safetyRisk: 30, publicImpact: 30, severity: 25, recurrence: 30, locationSensitivity: 30, explanation: 'Low priority maintenance issue.' },
      latitude: 12.9705,
      longitude: 77.5935,
      address: 'Lane 4, Residential Cross Road',
      department_id: electricalDept.id,
      departments: electricalDept,
      report_count: 1,
      affected_citizens_count: 1,
      is_duplicate_flagged: false,
      created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    });

    const rep3Id = 'rep-1003-a';
    const trackCode3 = '33333333-cccc-3333-cccc-333333333333';
    this.reports.set(rep3Id, {
      id: rep3Id,
      incident_id: inc3Id,
      tracking_code: trackCode3,
      raw_description: 'Streetlight bulb is broken and road gets very dark at night.',
      image_url: null,
      latitude: 12.9705,
      longitude: 77.5935,
      address_text: 'Lane 4, Residential Cross Road',
      is_original_report: true,
      created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    });

    // Seed 4: Water Leak (Resolved with Evidence)
    const inc4Id = 'inc-1004-water-leak';
    this.incidents.set(inc4Id, {
      id: inc4Id,
      case_id: 'CS-2026-1004',
      title: 'Water pipe leakage repaired',
      summary: 'Clean water pipe leaking continuously near municipal park gate.',
      category: 'WATER_LEAKAGE',
      severity: 'MEDIUM',
      status: 'RESOLVED',
      priority_score: 48,
      priority_factors: { safetyRisk: 50, publicImpact: 40, severity: 50, recurrence: 30, locationSensitivity: 40, explanation: 'Medium priority water conservation issue.' },
      latitude: 12.9735,
      longitude: 77.5925,
      address: 'Municipal Park Entrance Road',
      department_id: waterDept.id,
      departments: waterDept,
      report_count: 1,
      affected_citizens_count: 1,
      is_duplicate_flagged: false,
      created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
      resolved_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    });

    const rep4Id = 'rep-1004-a';
    const trackCode4 = '44444444-dddd-4444-dddd-444444444444';
    this.reports.set(rep4Id, {
      id: rep4Id,
      incident_id: inc4Id,
      tracking_code: trackCode4,
      raw_description: 'Water is leaking continuously from a damaged underground pipe.',
      image_url: null,
      latitude: 12.9735,
      longitude: 77.5925,
      address_text: 'Municipal Park Entrance Road',
      is_original_report: true,
      created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    });

    this.resolutionEvidence.set(inc4Id, {
      id: 'res-ev-1004',
      incident_id: inc4Id,
      officer_id: 'officer-1',
      proof_image_url: 'https://images.unsplash.com/photo-1542013936693-884638332954?w=800',
      resolution_notes: 'Replaced damaged 2-inch PVC pipe fitting and sealed water main joint. Pressure restored.',
      citizen_verified: false,
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    });
  }

  // --- CRUD METHODS ---
  public getIncident(idOrCaseId: string) {

    if (this.incidents.has(idOrCaseId)) {
      return this.incidents.get(idOrCaseId);
    }
    for (const inc of this.incidents.values()) {
      if (inc.case_id && typeof inc.case_id === 'string' && inc.case_id.toLowerCase() === idOrCaseId.toLowerCase()) {
        return inc;
      }
    }
    return null;
  }

  public getAllIncidents() {
    return Array.from(this.incidents.values()).sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
  }

  public getIncidents() {
    return Array.from(this.incidents.values());
  }

  public getReports() {
    return Array.from(this.reports.values());
  }

  public getDepartments() {
    return [
      { id: '11111111-1111-1111-1111-111111111111', name: 'Road Maintenance & Infrastructure', code: 'ROAD_MAINT' },
      { id: '22222222-2222-2222-2222-222222222222', name: 'Sanitation & Waste Management', code: 'SANITATION' },
      { id: '33333333-3333-3333-3333-333333333333', name: 'Electrical & Street Lighting', code: 'ELECTRICAL' },
      { id: '44444444-4444-4444-4444-444444444444', name: 'Water Supply & Quality', code: 'WATER_DEPT' },
      { id: '55555555-5555-5555-5555-555555555555', name: 'Drainage & Sewerage', code: 'DRAINAGE' },
    ];
  }

  public updateIncident(id: string, updates: Record<string, unknown>) {

    const existing = this.getIncident(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    this.incidents.set(existing.id, updated);
    return updated;
  }

  public addIncident(incident: any) {
    const id = incident.id || `inc_${incident.case_id || incident.caseId || Date.now()}`;
    const formatted = {
      id,
      case_id: incident.case_id || incident.caseId || `CS-${Date.now()}`,
      caseId: incident.case_id || incident.caseId || `CS-${Date.now()}`,
      title: incident.title || 'Untitled Incident',
      summary: incident.description || incident.summary || '',
      category: incident.category || 'OTHER',
      status: incident.status || 'SUBMITTED',
      priority_score: incident.priority_score ?? incident.priorityScore ?? 50,
      priorityScore: incident.priority_score ?? incident.priorityScore ?? 50,
      latitude: incident.latitude,
      longitude: incident.longitude,
      department_id: incident.department_id || incident.departmentId || null,
      departmentId: incident.department_id || incident.departmentId || null,
      master_incident_id: incident.master_incident_id || incident.masterIncidentId || null,
      masterIncidentId: incident.master_incident_id || incident.masterIncidentId || null,
      is_duplicate_flagged: incident.is_duplicate_flagged || incident.isDuplicateFlagged || false,
      created_at: incident.created_at || incident.createdAt || new Date().toISOString(),
      createdAt: incident.created_at || incident.createdAt || new Date().toISOString(),
    };
    this.incidents.set(id, formatted);
    return formatted;
  }

  public addReport(report: any) {
    const id = report.id || `rep_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const formatted = {
      id,
      incident_id: report.incident_id || report.incidentId,
      incidentId: report.incident_id || report.incidentId,
      citizen_id: report.citizen_id || report.citizenId,
      citizenId: report.citizen_id || report.citizenId,
      tracking_code: report.tracking_code || report.trackingCode || `track_${id}`,
      raw_description: report.description || report.raw_description || '',
      latitude: report.latitude,
      longitude: report.longitude,
      created_at: report.created_at || report.createdAt || new Date().toISOString(),
      createdAt: report.created_at || report.createdAt || new Date().toISOString(),
    };
    this.reports.set(id, formatted);
    return formatted;
  }


  public getReport(trackingCodeOrIncidentId: string) {
    for (const rep of this.reports.values()) {
      if (rep.tracking_code === trackingCodeOrIncidentId || rep.incident_id === trackingCodeOrIncidentId) {
        return rep;
      }
    }
    return null;
  }

  public addAiAnalysis(ai: MockAIAnalysis) {
    this.aiAnalyses.set(ai.incident_id, ai);
    return ai;
  }

  public getAiAnalysis(incidentId: string) {
    return this.aiAnalyses.get(incidentId) || null;
  }

  public addEmbedding(incidentId: string, vec: number[]) {
    this.embeddings.set(incidentId, vec);
  }

  public getEmbedding(incidentId: string) {
    return this.embeddings.get(incidentId) || null;
  }

  public addDuplicateRelation(rel: MockDuplicateRelation) {
    this.duplicateRelations.push(rel);
    return rel;
  }

  public getDuplicateRelations(incidentId: string) {
    return this.duplicateRelations.filter(
      (r) => r.target_incident_id === incidentId || r.candidate_incident_id === incidentId
    );
  }

  public setResolutionEvidence(ev: MockResolutionEvidence) {
    this.resolutionEvidence.set(ev.incident_id, ev);
    return ev;
  }

  public getResolutionEvidence(incidentId: string) {
    return this.resolutionEvidence.get(incidentId) || null;
  }

  public addAuditLog(log: MockAuditLog) {
    this.auditLogs.unshift(log);
    return log;
  }

  public getAuditLogs(incidentId: string) {
    return this.auditLogs.filter((l) => l.incident_id === incidentId);
  }

  public clearStore() {
    this.incidents.clear();
    this.reports.clear();
    this.aiAnalyses.clear();
    this.embeddings.clear();
    this.duplicateRelations = [];
    this.resolutionEvidence.clear();
    this.auditLogs = [];
  }
}

// Global Singleton Store for Node runtime
export const mockStore = new MockDataStore();

