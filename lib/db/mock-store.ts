import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'mock-store.json');

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
  private dataFilePath: string;

  constructor() {
    this.dataFilePath = path.join(process.cwd(), 'data', 'mock-store.json');

    // Synchronously try loading from disk (fast JSON read)
    try {
      const dir = path.dirname(this.dataFilePath);
      try { fs.mkdirSync(dir, { recursive: true }); } catch { /* ok */ }

      if (fs.existsSync(this.dataFilePath)) {
        const content = fs.readFileSync(this.dataFilePath, 'utf-8');
        const data = JSON.parse(content);

        this.incidents.clear();
        this.reports.clear();
        this.aiAnalyses.clear();
        this.embeddings.clear();
        this.duplicateRelations = [];
        this.resolutionEvidence.clear();
        this.auditLogs = [];

        if (Array.isArray(data.incidents)) {
          for (const inc of data.incidents) this.incidents.set(inc.id, inc);
        }
        if (Array.isArray(data.reports)) {
          for (const rep of data.reports) this.reports.set(rep.id, rep);
        }
        if (Array.isArray(data.aiAnalyses)) {
          for (const ai of data.aiAnalyses) this.aiAnalyses.set(ai.incident_id, ai);
        }
        if (Array.isArray(data.embeddings)) {
          for (const [incidentId, vector] of data.embeddings) {
            this.embeddings.set(incidentId, vector);
          }
        }
        if (Array.isArray(data.duplicateRelations)) this.duplicateRelations = data.duplicateRelations;
        if (Array.isArray(data.resolutionEvidence)) {
          for (const ev of data.resolutionEvidence) this.resolutionEvidence.set(ev.incident_id, ev);
        }
        if (Array.isArray(data.auditLogs)) this.auditLogs = data.auditLogs;

        console.log(`[MockStore] ✓ Loaded ${this.incidents.size} incidents from disk.`);
      } else {
        this.syncPersist();
        console.log('[MockStore] ✓ Initialized fresh clean data store.');
      }
    } catch {
      this.syncPersist();
      console.log('[MockStore] ✓ Initialized fresh clean data store.');
    }
  }

  // --- Synchronous persistence (fires & forgets) ---
  private syncPersist(): void {
    try {
      const dir = path.dirname(this.dataFilePath);
      try { fs.mkdirSync(dir, { recursive: true }); } catch { /* ok */ }
      fs.writeFileSync(this.dataFilePath, this.serializeToJson(), 'utf-8');
    } catch (err) {
      console.error('[MockStore] Sync persist failed:', err);
    }
  }

  // --- Async persistence (when you need to await) ---
  async persistToDisk(): Promise<void> {
    try {
      const dir = path.dirname(this.dataFilePath);
      try { await fs.promises.mkdir(dir, { recursive: true }); } catch { /* ok */ }
      await fs.promises.writeFile(this.dataFilePath, this.serializeToJson(), 'utf-8');
    } catch (err) {
      console.error('[MockStore] Async persist failed:', err);
    }
  }

  private serializeToJson(): string {
    return JSON.stringify({
      incidents: Array.from(this.incidents.values()),
      reports: Array.from(this.reports.values()),
      aiAnalyses: Array.from(this.aiAnalyses.values()),
      embeddings: Array.from(this.embeddings.entries()),
      duplicateRelations: this.duplicateRelations,
      resolutionEvidence: Array.from(this.resolutionEvidence.values()),
      auditLogs: this.auditLogs,
    }, null, 2);
  }

  // --- CRUD Methods ---
  public getIncident(idOrCaseId: string) {
    if (this.incidents.has(idOrCaseId)) {
      return this.incidents.get(idOrCaseId);
    }
    for (const inc of this.incidents.values()) {
      if (
        (inc.case_id && typeof inc.case_id === 'string' && inc.case_id.toLowerCase() === idOrCaseId.toLowerCase()) ||
        (inc.caseId && typeof inc.caseId === 'string' && inc.caseId.toLowerCase() === idOrCaseId.toLowerCase())
      ) {
        return inc;
      }
    }
    return null;
  }

  public getAllIncidents() {
    return Array.from(this.incidents.values()).sort((a, b) => (b.priority_score || b.priorityScore || 0) - (a.priority_score || a.priorityScore || 0));
  }

  public getIncidents() {
    return Array.from(this.incidents.values());
  }

  public getReports() {
    return Array.from(this.reports.values());
  }

  public getReportsByIncident(incidentId: string) {
    return Array.from(this.reports.values()).filter(
      (r) => r.incident_id === incidentId || r.incidentId === incidentId
    );
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
    const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
    this.incidents.set(existing.id, updated);
    this.syncPersist();
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
      severity: incident.severity || 'MEDIUM',
      status: incident.status || 'SUBMITTED',
      priority_score: incident.priority_score ?? incident.priorityScore ?? 50,
      priorityScore: incident.priority_score ?? incident.priorityScore ?? 50,
      priority_factors: incident.priority_factors || incident.priorityFactors || {},
      latitude: Number(incident.latitude),
      longitude: Number(incident.longitude),
      department_id: incident.department_id || incident.departmentId || null,
      departmentId: incident.department_id || incident.departmentId || null,
      master_incident_id: incident.master_incident_id || incident.masterIncidentId || null,
      masterIncidentId: incident.master_incident_id || incident.masterIncidentId || null,
      is_duplicate_flagged: incident.is_duplicate_flagged || incident.isDuplicateFlagged || false,
      report_count: incident.report_count || incident.reportCount || 1,
      reportCount: incident.report_count || incident.reportCount || 1,
      affected_citizens_count: incident.affected_citizens_count || incident.affectedCitizensCount || 1,
      affectedCitizensCount: incident.affected_citizens_count || incident.affectedCitizensCount || 1,
      created_at: incident.created_at || incident.createdAt || new Date().toISOString(),
      createdAt: incident.created_at || incident.createdAt || new Date().toISOString(),
      updated_at: incident.updated_at || incident.updatedAt || new Date().toISOString(),
      address: incident.address || incident.addressText || '',
      departments: incident.departments || {},
      imageUrl: incident.image_url || incident.imageUrl || null,
    };
    this.incidents.set(id, formatted);
    this.syncPersist();
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
      trackingCode: report.tracking_code || report.trackingCode || `track_${id}`,
      raw_description: report.description || report.raw_description || report.rawDescription || '',
      rawDescription: report.description || report.raw_description || report.rawDescription || '',
      image_url: report.image_url || report.imageUrl || null,
      imageUrl: report.image_url || report.imageUrl || null,
      latitude: Number(report.latitude),
      longitude: Number(report.longitude),
      address_text: report.address_text || report.addressText || '',
      addressText: report.address_text || report.addressText || '',
      is_original_report: report.is_original_report ?? true,
      created_at: report.created_at || report.createdAt || new Date().toISOString(),
      createdAt: report.created_at || report.createdAt || new Date().toISOString(),
    };
    this.reports.set(id, formatted);
    this.syncPersist();
    return formatted;
  }

  /**
   * Merge a secondary citizen report into an existing Master Incident
   */
  public mergeReportIntoMasterIncident(
    masterIncidentId: string,
    reportData: {
      trackingCode: string;
      description: string;
      imageUrl?: string | null;
      latitude: number;
      longitude: number;
      addressText: string;
      citizenId?: string;
    },
    boostScore: number = 10
  ) {
    const existing = this.getIncident(masterIncidentId);
    if (!existing) return null;

    const newReportCount = (existing.report_count || existing.reportCount || 1) + 1;
    const newAffectedCount = (existing.affected_citizens_count || existing.affectedCitizensCount || 1) + 1;
    const currentScore = existing.priority_score ?? existing.priorityScore ?? 50;
    const elevatedScore = Math.min(100, currentScore + boostScore);

    // Auto-elevate severity if 3 or more citizens reported
    let elevatedSeverity = existing.severity || 'MEDIUM';
    if (newReportCount >= 4) elevatedSeverity = 'CRITICAL';
    else if (newReportCount >= 2 && elevatedSeverity === 'LOW') elevatedSeverity = 'HIGH';

    const updated = {
      ...existing,
      report_count: newReportCount,
      reportCount: newReportCount,
      affected_citizens_count: newAffectedCount,
      affectedCitizensCount: newAffectedCount,
      priority_score: elevatedScore,
      priorityScore: elevatedScore,
      severity: elevatedSeverity,
      updated_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      priority_factors: {
        ...(existing.priority_factors || {}),
        publicImpact: Math.min(100, ((existing.priority_factors?.publicImpact || 50) + 15)),
        explanation: `Consolidated from ${newReportCount} citizen reports. Multi-citizen confirmation boosted priority to ${elevatedScore}.`,
      },
    };

    this.incidents.set(existing.id, updated);

    // Add citizen's linked report
    const newReport = this.addReport({
      incident_id: existing.id,
      tracking_code: reportData.trackingCode,
      citizen_id: reportData.citizenId || 'citizen_anon',
      description: reportData.description,
      image_url: reportData.imageUrl || null,
      latitude: reportData.latitude,
      longitude: reportData.longitude,
      address_text: reportData.addressText,
      is_original_report: false,
    });

    // Add audit log
    this.addAuditLog({
      id: `audit_${Date.now()}`,
      incident_id: existing.id,
      performed_by: 'CLUSTERING_ENGINE',
      action: 'MERGED_CITIZEN_COMPLAINT',
      old_value: { reportCount: existing.report_count, priorityScore: currentScore },
      new_value: { reportCount: newReportCount, priorityScore: elevatedScore, trackingCode: reportData.trackingCode },
      reason: `Citizen complaint automatically clustered into master complaint #${existing.case_id || existing.caseId} (${newReportCount} total reports).`,
      created_at: new Date().toISOString(),
    });

    this.syncPersist();
    return { incident: updated, report: newReport };
  }

  public getReport(trackingCodeOrIncidentId: string) {
    for (const rep of this.reports.values()) {
      if (
        rep.tracking_code === trackingCodeOrIncidentId ||
        rep.trackingCode === trackingCodeOrIncidentId ||
        rep.incident_id === trackingCodeOrIncidentId ||
        rep.incidentId === trackingCodeOrIncidentId ||
        rep.id === trackingCodeOrIncidentId
      ) {
        return rep;
      }
    }
    return null;
  }

  public addAiAnalysis(ai: MockAIAnalysis) {
    this.aiAnalyses.set(ai.incident_id, ai);
    this.syncPersist();
    return ai;
  }

  public getAiAnalysis(incidentId: string) {
    return this.aiAnalyses.get(incidentId) || null;
  }

  public addEmbedding(incidentId: string, vec: number[]) {
    this.embeddings.set(incidentId, vec);
    this.syncPersist();
  }

  public getEmbedding(incidentId: string) {
    return this.embeddings.get(incidentId) || null;
  }

  public addDuplicateRelation(rel: MockDuplicateRelation) {
    this.duplicateRelations.push(rel);
    this.syncPersist();
    return rel;
  }

  public getDuplicateRelations(incidentId: string) {
    return this.duplicateRelations.filter(
      (r) => r.target_incident_id === incidentId || r.candidate_incident_id === incidentId
    );
  }

  public setResolutionEvidence(ev: MockResolutionEvidence) {
    this.resolutionEvidence.set(ev.incident_id, ev);
    this.syncPersist();
    return ev;
  }

  public getResolutionEvidence(incidentId: string) {
    return this.resolutionEvidence.get(incidentId) || null;
  }

  public addAuditLog(log: MockAuditLog) {
    this.auditLogs.unshift(log);
    this.syncPersist();
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
    this.syncPersist();
  }
}

// Global Singleton Store
export const mockStore = new MockDataStore();
