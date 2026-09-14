import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

interface StoreRecord {
  id: string;
  [key: string]: any;
}

class FileStore {
  private fileMap: Record<string, string> = {
    incidents: 'incidents.json',
    reports: 'reports.json',
    aiAnalyses: 'ai-analyses.json',
    embeddings: 'embeddings.json',
    duplicateRelations: 'duplicate-relations.json',
    resolutionEvidence: 'resolution-evidence.json',
    auditLogs: 'audit-logs.json',
  };

  private cache: Record<string, any[]> = {};
  private initialized = false;

  private async ensureDir() {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
    } catch {
      // Directory may already exist
    }
  }

  private async ensureFile(filename: string): Promise<any[]> {
    const filePath = path.join(DATA_DIR, filename);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  private async loadCollection(name: string): Promise<any[]> {
    if (this.cache[name] !== undefined) {
      return this.cache[name];
    }
    const filename = this.fileMap[name];
    if (!filename) return [];
    const data = await this.ensureFile(filename);
    this.cache[name] = data;
    return data;
  }

  private async saveCollection(name: string, data: any[]): Promise<void> {
    this.cache[name] = data;
    const filename = this.fileMap[name];
    if (!filename) return;
    try {
      await this.ensureDir();
      const filePath = path.join(DATA_DIR, filename);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error(`[FileStore] Failed to save ${name}:`, err);
    }
  }

  // Incidents
  async getIncident(id: string): Promise<any | null> {
    const all = await this.loadCollection('incidents');
    return all.find((i: any) => i.id === id || i.case_id === id) || null;
  }

  async getAllIncidents(): Promise<any[]> {
    const all = await this.loadCollection('incidents');
    return all.sort((a: any, b: any) => (b.priority_score || 0) - (a.priority_score || 0));
  }

  async addIncident(incident: any): Promise<any> {
    const all = await this.loadCollection('incidents');
    const id = incident.id || `inc-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const formatted = {
      ...incident,
      id,
      case_id: incident.case_id || incident.caseId || `CS-${Date.now()}`,
      caseId: incident.case_id || incident.caseId || `CS-${Date.now()}`,
      created_at: incident.created_at || incident.createdAt || new Date().toISOString(),
      createdAt: incident.created_at || incident.createdAt || new Date().toISOString(),
    };
    all.push(formatted);
    await this.saveCollection('incidents', all);
    return formatted;
  }

  async updateIncident(id: string, updates: Record<string, unknown>): Promise<any | null> {
    const all = await this.loadCollection('incidents');
    const idx = all.findIndex((i: any) => i.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...updates };
    await this.saveCollection('incidents', all);
    return all[idx];
  }

  // Reports
  async addReport(report: any): Promise<any> {
    const all = await this.loadCollection('reports');
    const id = report.id || `rep-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const formatted = {
      ...report,
      id,
      incident_id: report.incident_id || report.incidentId,
      incidentId: report.incident_id || report.incidentId,
      tracking_code: report.tracking_code || report.trackingCode || `track-${id}`,
      created_at: report.created_at || report.createdAt || new Date().toISOString(),
      createdAt: report.created_at || report.createdAt || new Date().toISOString(),
    };
    all.push(formatted);
    await this.saveCollection('reports', all);
    return formatted;
  }

  async getReportsByIncident(incidentId: string): Promise<any[]> {
    const all = await this.loadCollection('reports');
    return all.filter((r: any) => r.incident_id === incidentId || r.incidentId === incidentId);
  }

  // AI Analyses
  async addAiAnalysis(ai: any): Promise<any> {
    const all = await this.loadCollection('aiAnalyses');
    const formatted = {
      ...ai,
      id: ai.id || `ai-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      created_at: ai.created_at || ai.createdAt || new Date().toISOString(),
    };
    all.push(formatted);
    await this.saveCollection('aiAnalyses', all);
    return formatted;
  }

  async getAiAnalysis(incidentId: string): Promise<any | null> {
    const all = await this.loadCollection('aiAnalyses');
    return all.find((a: any) => a.incident_id === incidentId) || null;
  }

  // Embeddings
  async addEmbedding(incidentId: string, vector: number[]): Promise<any> {
    const all = await this.loadCollection('embeddings');
    const entry = {
      id: `emb-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      incident_id: incidentId,
      embedding: vector,
      created_at: new Date().toISOString(),
    };
    all.push(entry);
    await this.saveCollection('embeddings', all);
    return entry;
  }

  async getEmbeddingsForIncidents(incidentIds: string[]): Promise<Map<string, number[]>> {
    const all = await this.loadCollection('embeddings');
    const map = new Map<string, number[]>();
    for (const row of all) {
      if (incidentIds.includes(row.incident_id) && row.embedding) {
        map.set(row.incident_id, row.embedding);
      }
    }
    return map;
  }

  // Duplicate Relations
  async addDuplicateRelation(rel: any): Promise<any> {
    const all = await this.loadCollection('duplicateRelations');
    const formatted = {
      ...rel,
      id: rel.id || `dup-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      created_at: rel.created_at || new Date().toISOString(),
    };
    all.push(formatted);
    await this.saveCollection('duplicateRelations', all);
    return formatted;
  }

  async getDuplicateRelations(incidentId: string): Promise<any[]> {
    const all = await this.loadCollection('duplicateRelations');
    return all.filter(
      (r: any) => r.target_incident_id === incidentId || r.candidate_incident_id === incidentId
    );
  }

  // Resolution Evidence
  async addResolutionEvidence(ev: any): Promise<any> {
    const all = await this.loadCollection('resolutionEvidence');
    const formatted = {
      ...ev,
      id: ev.id || `res-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      created_at: ev.created_at || new Date().toISOString(),
    };
    all.push(formatted);
    await this.saveCollection('resolutionEvidence', all);
    return formatted;
  }

  async getResolutionEvidence(incidentId: string): Promise<any | null> {
    const all = await this.loadCollection('resolutionEvidence');
    return all.find((e: any) => e.incident_id === incidentId) || null;
  }

  // Audit Logs
  async addAuditLog(log: any): Promise<any> {
    const all = await this.loadCollection('auditLogs');
    const formatted = {
      ...log,
      id: log.id || `audit-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      created_at: log.created_at || new Date().toISOString(),
    };
    all.unshift(formatted);
    await this.saveCollection('auditLogs', formatted);
    return formatted;
  }

  async getAuditLogs(incidentId: string): Promise<any[]> {
    const all = await this.loadCollection('auditLogs');
    return all.filter((l: any) => l.incident_id === incidentId);
  }

  // Seed demo data if empty
  async seedIfEmpty(): Promise<void> {
    const existing = await this.loadCollection('incidents');
    if (existing.length > 0) return; // Already has data
    await this.seedDemoData();
  }

  private async seedDemoData(): Promise<void> {
    const defaultDept = { id: '11111111-1111-1111-1111-111111111111', name: 'Road Maintenance & Infrastructure', code: 'ROAD_MAINT' };
    const sanitationDept = { id: '22222222-2222-2222-2222-222222222222', name: 'Sanitation & Waste Management', code: 'SANITATION' };
    const electricalDept = { id: '33333333-3333-3332-2222-222222222222', name: 'Electrical & Street Lighting', code: 'ELECTRICAL' };
    const waterDept = { id: '44444444-4444-4444-4444-444444444444', name: 'Water Supply & Quality', code: 'WATER_DEPT' };

    const now = Date.now();

    // Seed 1: Open Manhole (Critical) - PRIMARY DEMO
    const inc1 = await this.addIncident({
      case_id: 'CS-1042',
      title: 'Dangerous pothole near St. Jude School Gate',
      summary: 'Large asphalt crater near school main entrance disrupting vehicle flow and creating risk for children.',
      category: 'ROAD_POTHOLE',
      severity: 'CRITICAL',
      status: 'ASSIGNED',
      priority_score: 87,
      priority_factors: { safetyRisk: 27, publicImpact: 21, severity: 20, recurrence: 10, locationSensitivity: 9 },
      latitude: 12.9715987,
      longitude: 77.5945627,
      address: 'St. Jude High School Gate, 4th Main Road',
      department_id: defaultDept.id,
      departments: defaultDept,
      report_count: 2,
      affected_citizens_count: 2,
      is_duplicate_flagged: true,
      created_at: new Date(now - 3600000 * 24).toISOString(),
    });

    await this.addReport({
      incident_id: inc1.id,
      tracking_code: 't1111111-1111-1111-1111-111111111111',
      raw_description: 'There is a huge pothole right in front of the St. Jude School main gate. Cars and school buses are swerving dangerously.',
      image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800',
      latitude: 12.9715987,
      longitude: 77.5945627,
      address_text: 'St. Jude High School Gate, 4th Main Road',
      is_original_report: true,
    });

    await this.addReport({
      incident_id: inc1.id,
      tracking_code: 't2222222-2222-2222-2222-222222222222',
      raw_description: 'Deep road crater beside the school entrance causing traffic jams and vehicle damage.',
      image_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800',
      latitude: 12.97165000,
      longitude: 77.59460000,
      address_text: '4th Main Road near school entrance',
      is_original_report: false,
    });

    // Seed 2: Garbage Overflow
    const inc2 = await this.addIncident({
      case_id: 'CS-1040',
      title: 'Uncollected garbage bin overflowing into street',
      summary: 'Large pile of uncollected plastic and organic waste blocking pedestrian walkway.',
      category: 'GARBAGE_OVERFLOW',
      severity: 'MEDIUM',
      status: 'IN_PROGRESS',
      priority_score: 58,
      priority_factors: { safetyRisk: 15, publicImpact: 18, severity: 10, recurrence: 10, locationSensitivity: 5 },
      latitude: 12.97500000,
      longitude: 77.59800000,
      address: 'Market Square 2nd Cross',
      department_id: sanitationDept.id,
      departments: sanitationDept,
      report_count: 1,
      affected_citizens_count: 1,
    });

    await this.addReport({
      incident_id: inc2.id,
      tracking_code: 't3333333-3333-3333-3333-333333333333',
      raw_description: 'Garbage has not been collected for 4 days near the market.',
      image_url: null,
      latitude: 12.97500000,
      longitude: 77.59800000,
      address_text: 'Market Square 2nd Cross',
      is_original_report: true,
    });

    // Seed 3: Streetlight
    const inc3 = await this.addIncident({
      case_id: 'CS-1038',
      title: 'Broken streetlight pole creating unsafe dark passage',
      summary: 'Non-functioning LED lamp on pole creating nighttime hazard.',
      category: 'BROKEN_STREETLIGHT',
      severity: 'MEDIUM',
      status: 'RESOLVED',
      priority_score: 52,
      priority_factors: { safetyRisk: 15, publicImpact: 12, severity: 10, recurrence: 10, locationSensitivity: 5 },
      latitude: 12.98000000,
      longitude: 77.60000000,
      address: 'Oak Avenue Lane 3',
      department_id: electricalDept.id,
      departments: electricalDept,
      report_count: 1,
      resolved_at: new Date(now - 3600000 * 4).toISOString(),
    });

    await this.addReport({
      incident_id: inc3.id,
      tracking_code: 't4444444-4444-4444-4444-444444444444',
      raw_description: 'Streetlight bulb is broken and road gets very dark at night.',
      image_url: null,
      latitude: 12.98000000,
      longitude: 77.60000000,
      address_text: 'Oak Avenue Lane 3',
      is_original_report: true,
    });

    await this.addResolutionEvidence({
      incident_id: inc3.id,
      officer_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      proof_image_url: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=800',
      resolution_notes: 'Replaced damaged LED fixture and inspected power relay wiring.',
      citizen_verified: true,
    });

    // Seed 4: Water Leak (Resolved)
    const inc4 = await this.addIncident({
      case_id: 'CS-1035',
      title: 'Water pipe leakage near municipal park',
      summary: 'Clean water pipe leaking continuously near municipal park gate.',
      category: 'WATER_LEAKAGE',
      severity: 'MEDIUM',
      status: 'RESOLVED',
      priority_score: 48,
      priority_factors: { safetyRisk: 50, publicImpact: 40, severity: 50, recurrence: 30, locationSensitivity: 40 },
      latitude: 12.97350000,
      longitude: 77.59250000,
      address: 'Municipal Park Entrance Road',
      department_id: waterDept.id,
      departments: waterDept,
      report_count: 1,
      resolved_at: new Date(now - 3600000 * 2).toISOString(),
    });

    await this.addReport({
      incident_id: inc4.id,
      tracking_code: 't5555555-5555-5555-5555-555555555555',
      raw_description: 'Water is leaking continuously from a damaged underground pipe.',
      image_url: null,
      latitude: 12.97350000,
      longitude: 77.59250000,
      address_text: 'Municipal Park Entrance Road',
      is_original_report: true,
    });

    // Seed 5: Drainage Blockage
    const inc5 = await this.addIncident({
      case_id: 'CS-1045',
      title: 'Drainage overflow near bus stand',
      summary: 'Clogged drainage causing sewage overflow near bus stand during rain.',
      category: 'DRAINAGE_BLOCKAGE',
      severity: 'HIGH',
      status: 'SUBMITTED',
      priority_score: 72,
      priority_factors: { safetyRisk: 70, publicImpact: 80, severity: 70, recurrence: 40, locationSensitivity: 85 },
      latitude: 12.97200000,
      longitude: 77.59600000,
      address: 'Bus Stand Road, Central Zone',
      department_id: { id: '55555555-5555-5555-5555-555555555555', name: 'Drainage & Sewerage Department', code: 'DRAINAGE' },
      departments: { id: '55555555-5555-5555-5555-555555555555', name: 'Drainage & Sewerage Department', code: 'DRAINAGE' },
      report_count: 1,
    });

    await this.addReport({
      incident_id: inc5.id,
      tracking_code: 't6666666-6666-6666-6666-666666666666',
      raw_description: 'Drainage is completely blocked and overflowing dirty water onto the road near the bus stand.',
      image_url: null,
      latitude: 12.97200000,
      longitude: 77.59600000,
      address_text: 'Bus Stand Road, Central Zone',
      is_original_report: true,
    });
  }

  // Diagnostics
  async count(collection: string): Promise<number> {
    const all = await this.loadCollection(collection);
    return all.length;
  }
}

export const fileStore = new FileStore();
