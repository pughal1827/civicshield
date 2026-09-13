'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  ShieldAlert, 
  Sparkles, 
  Gauge, 
  GitMerge, 
  Building2, 
  Clock, 
  CheckCircle2, 
  MapPin, 
  FileText, 
  Check, 
  X,
  AlertCircle,
  AlertTriangle,
  Info,
  UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { PriorityBadge } from '@/components/ui/priority-badge';
import { LoadingState } from '@/components/ui/loading-state';
import { IncidentMap } from '@/components/maps/incident-map';
import { ToastNotification } from '@/components/ui/toast';
import { calculateIncidentSLA } from '@/lib/intelligence/sla';


export default function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const incidentId = resolvedParams.id;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ id: string; type: 'success' | 'error' | 'warning'; title: string; message?: string } | null>(null);

  // Form Controls
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchIncidentDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/incidents/${incidentId}`);
      const json = await res.json();

      if (json.success) {
        setData(json.data);
        setSelectedDept(json.data.incident.department_id || '');
        setSelectedStatus(json.data.incident.status || 'SUBMITTED');
      } else {
        setToast({ id: '1', type: 'error', title: 'Error Loading Incident', message: json.error?.message });
      }
    } catch (err) {
      console.error('Error fetching incident details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (incidentId) {
      fetchIncidentDetails();
    }
  }, [incidentId]);

  // Handle Department or Status Update
  const handleUpdateIncident = async () => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/incidents/${incidentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'AUTHORITY',
        },
        body: JSON.stringify({
          departmentId: selectedDept || undefined,
          status: selectedStatus,
          reason: 'Authority operational update from incident detail page.',
        }),
      });

      const json = await res.json();
      if (json.success) {
        setToast({ id: Date.now().toString(), type: 'success', title: 'Incident Updated', message: 'Status and department assignment updated successfully.' });
        fetchIncidentDetails();
      } else {
        setToast({ id: Date.now().toString(), type: 'error', title: 'Update Failed', message: json.error?.message });
      }
    } catch (err) {
      console.error('Error updating incident:', err);
    } finally {
      setUpdating(false);
    }
  };

  // Handle Duplicate Confirm Merge or Reject
  const handleDuplicateAction = async (duplicateRelationId: string, action: 'CONFIRM_MERGE' | 'REJECT_MERGE') => {
    try {
      const res = await fetch('/api/incidents/merge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'AUTHORITY',
        },
        body: JSON.stringify({
          action,
          duplicateRelationId,
          reason: action === 'CONFIRM_MERGE' ? 'Authority confirmed duplicate complaint merge.' : 'Authority rejected duplicate match suggestion.',
        }),
      });

      const json = await res.json();
      if (json.success) {
        setToast({
          id: Date.now().toString(),
          type: 'success',
          title: action === 'CONFIRM_MERGE' ? 'Duplicate Merged' : 'Duplicate Rejected',
          message: action === 'CONFIRM_MERGE' ? 'Candidate reports transferred to master incident.' : 'Candidate relation marked REJECTED.',
        });
        fetchIncidentDetails();
      } else {
        setToast({ id: Date.now().toString(), type: 'error', title: 'Action Failed', message: json.error?.message });
      }
    } catch (err) {
      console.error('Error processing duplicate action:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 flex items-center justify-center">
        <LoadingState message="Loading incident master record & priority breakdown..." />
      </div>
    );
  }

  if (!data || !data.incident) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 flex flex-col items-center justify-center text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-rose-400" />
        <h2 className="text-xl font-bold text-slate-100">Incident Record Not Found</h2>
        <Link href="/dashboard">
          <Button variant="outline">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const { incident, reports, aiAnalysis, duplicates, resolutionEvidence, auditLogs, priorityBreakdown } = data;

  // Department Names Map
  const deptMap: Record<string, string> = {
    '11111111-1111-1111-1111-111111111111': 'Road Maintenance',
    '22222222-2222-2222-2222-222222222222': 'Sanitation & Waste',
    '33333333-3333-3333-3333-333333333333': 'Electrical Dept',
    '44444444-4444-4444-4444-444444444444': 'Water Supply Board',
    '55555555-5555-5555-5555-555555555555': 'Drainage & Sewerage',
  };

  const isDeptManuallyOverridden =
    incident.department_id &&
    aiAnalysis?.suggested_department_code &&
    deptMap[incident.department_id] !== aiAnalysis.suggested_department_code;

  // AI Confidence Helper
  const getConfidenceTier = (score: number) => {
    if (score >= 0.85) return { label: 'High confidence', color: 'emerald', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
    if (score >= 0.65) return { label: 'Medium confidence', color: 'cyan', bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' };
    return { label: 'Low confidence', color: 'amber', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30', warning: 'AI is uncertain. Please review this classification.' };
  };

  const confTier = aiAnalysis ? getConfidenceTier(aiAnalysis.confidence_score) : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification Header */}
      {toast && (
        <div className="fixed top-20 right-4 z-50">
          <ToastNotification {...toast} onDismiss={() => setToast(null)} />
        </div>
      )}

      {/* Navigation Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-200 min-h-[44px]">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-slate-400">Case ID:</span>
          <span className="font-mono text-lg font-extrabold text-emerald-400">{incident.case_id}</span>
        </div>
      </div>

      {/* Incident Title & Priority Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="cyan">{incident.category.replace('_', ' ')}</Badge>
            <StatusBadge status={incident.status} />
            {isDeptManuallyOverridden && (
              <Badge variant="cyan" className="gap-1 bg-purple-950/80 text-purple-300 border-purple-800">
                <UserCheck className="h-3 w-3" /> Manually Overridden by Officer
              </Badge>
            )}
            {incident.is_duplicate_flagged && (
              <Badge variant="amber" className="gap-1">
                <GitMerge className="h-3 w-3" /> Duplicate Warning
              </Badge>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{incident.title}</h1>
          <p className="text-xs sm:text-sm text-slate-400">{incident.summary}</p>
        </div>

        <div className="flex flex-col items-start md:items-end shrink-0 space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase">Priority Classification</span>
          <PriorityBadge score={incident.priority_score} />
        </div>
      </div>

      {/* Operational SLA Status Banner */}
      {(() => {
        const sla = calculateIncidentSLA(incident);
        return (
          <Card
            variant="glass"
            className={`p-4 border ${
              sla.slaStatus === 'BREACHED'
                ? 'border-rose-500/60 bg-rose-950/20'
                : sla.slaStatus === 'AT_RISK'
                ? 'border-amber-500/60 bg-amber-950/20'
                : 'border-slate-800 bg-slate-900/60'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-cyan-400" />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    SLA Operational Target
                  </span>
                  {sla.slaStatus === 'BREACHED' ? (
                    <Badge variant="rose">🔴 SLA BREACHED</Badge>
                  ) : sla.slaStatus === 'AT_RISK' ? (
                    <Badge variant="amber">🟠 SLA AT RISK</Badge>
                  ) : sla.slaStatus === 'NOT_APPLICABLE' ? (
                    <Badge variant="slate">⚪ COMPLETED</Badge>
                  ) : (
                    <Badge variant="emerald">🟢 ON TRACK</Badge>
                  )}

                </div>
                <p className="text-xs text-slate-400">
                  Priority Target: <strong className="text-slate-200">{sla.targetHours} Hours</strong> • Started:{' '}
                  {new Date(sla.slaStart).toLocaleString()} • Deadline: {new Date(sla.deadline).toLocaleString()}
                </p>
              </div>

              <div className="w-full sm:w-48 shrink-0 space-y-1 text-right">
                <div className="text-xs font-bold text-slate-200">
                  {sla.slaStatus === 'BREACHED'
                    ? 'Deadline Passed'
                    : sla.slaStatus === 'NOT_APPLICABLE'
                    ? 'Closed'
                    : `${Math.floor(sla.remainingSeconds / 3600)}h ${Math.floor((sla.remainingSeconds % 3600) / 60)}m left`}
                </div>
                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                  <div
                    className={`h-full ${
                      sla.slaStatus === 'BREACHED'
                        ? 'bg-rose-500'
                        : sla.slaStatus === 'AT_RISK'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${sla.progressPercent}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-400">{sla.progressPercent}% time elapsed</div>
              </div>
            </div>
          </Card>
        );
      })()}

      {/* Main Grid: Left Details (2 cols), Right Management (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        
        {/* Left Column (2 Cols wide) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Section A: Location & Address Overview */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4 text-emerald-400" /> Location & Address Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-slate-300">
                <span className="font-semibold text-slate-400">Reported Location Address:</span> {incident.address}
              </p>
              <IncidentMap latitude={Number(incident.latitude)} longitude={Number(incident.longitude)} title={incident.title} />
            </CardContent>
          </Card>

          {/* Section B: Professional AI Analysis Panel */}
          <Card variant="glass" className="border-emerald-900/40 bg-slate-900/90">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base text-emerald-400">
                <span className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-400" /> AI Analysis & Assessment
                </span>
                {confTier ? (
                  <span className={`px-2.5 py-1 rounded-full border text-xs font-semibold ${confTier.bg}`}>
                    {confTier.label} ({(aiAnalysis.confidence_score * 100).toFixed(0)}%)
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full border text-xs font-semibold bg-amber-950/60 text-amber-300 border-amber-800">
                    AI Analysis Unavailable
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {aiAnalysis ? (
                <>
                  {confTier?.warning && (
                    <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-xl text-amber-200 text-xs flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                      <span>{confTier.warning}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                      <span className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider block">Category</span>
                      <span className="font-bold text-slate-200 text-xs sm:text-sm block">{aiAnalysis.detected_category?.replace('_', ' ')}</span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                      <span className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider block">Severity</span>
                      <span className="font-bold text-amber-300 text-xs sm:text-sm block">{aiAnalysis.detected_severity}</span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                      <span className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider block">Safety Risk</span>
                      <span className="font-bold text-rose-400 text-xs sm:text-sm block">{aiAnalysis.extracted_features?.hazardLevel || 'High'}</span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                      <span className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider block">Suggested Dept</span>
                      <span className="font-bold text-cyan-300 text-xs sm:text-sm block">{aiAnalysis.suggested_department_code}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-slate-400 font-semibold block">Issue Summary:</span>
                    <p className="text-slate-300 leading-relaxed">{aiAnalysis.summary || incident.summary}</p>
                  </div>

                  <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                    <span className="font-semibold text-slate-300 block text-xs">Important Factors:</span>
                    {aiAnalysis.extracted_features?.importantDetails && aiAnalysis.extracted_features.importantDetails.length > 0 ? (
                      <ul className="space-y-1 text-slate-400 text-xs">
                        {aiAnalysis.extracted_features.importantDetails.map((detail: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-emerald-400 font-bold">•</span>
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <ul className="space-y-1 text-slate-400 text-xs">
                        <li className="flex items-start gap-2">
                          <span className="text-emerald-400 font-bold">•</span>
                          <span>Civic hazard detected requiring municipal review</span>
                        </li>
                      </ul>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 italic flex items-center gap-1.5 pt-1">
                    <Info className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                    <span>AI suggested recommendation. Municipal authority can override assignment anytime.</span>
                  </p>
                </>
              ) : (
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-slate-400 text-center space-y-1">
                  <p className="font-semibold text-amber-300">AI analysis is currently unavailable.</p>
                  <p className="text-[11px] text-slate-500">Using safe default priority and manual triage controls.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section C: Explainable 5-Factor Priority Breakdown */}
          {priorityBreakdown && (
            <Card variant="glass" className="border-cyan-900/40">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base text-cyan-300">
                  <span className="flex items-center gap-2">
                    <Gauge className="h-5 w-5 text-cyan-400" /> Explainable Priority Score Breakdown
                  </span>
                  <span className="font-mono text-xs font-bold px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-emerald-400">
                    Sum: {priorityBreakdown.totalScore} / 100 [{priorityBreakdown.tier}]
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  {priorityBreakdown.explanationSummary}
                </p>

                {/* 5 Factors Vertical Stacked Cards for Mobile & Responsive Grid for Desktop */}
                <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 md:gap-3 text-xs">
                  {/* Safety Risk (30%) */}
                  <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-rose-400">Safety Risk (30%)</span>
                      <span className="font-mono text-slate-200 text-xs">
                        {priorityBreakdown.factorScores.safetyRiskScore}/100 → {priorityBreakdown.weightedFactorContributions.safetyRiskContribution} pts
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal">{priorityBreakdown.reasons.safetyRiskReason}</p>
                  </div>

                  {/* Public Impact (25%) */}
                  <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-cyan-400">Public Impact (25%)</span>
                      <span className="font-mono text-slate-200 text-xs">
                        {priorityBreakdown.factorScores.publicImpactScore}/100 → {priorityBreakdown.weightedFactorContributions.publicImpactContribution} pts
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal">{priorityBreakdown.reasons.publicImpactReason}</p>
                  </div>

                  {/* Severity (20%) */}
                  <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-amber-400">Severity (20%)</span>
                      <span className="font-mono text-slate-200 text-xs">
                        {priorityBreakdown.factorScores.severityScore}/100 → {priorityBreakdown.weightedFactorContributions.severityContribution} pts
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal">{priorityBreakdown.reasons.severityReason}</p>
                  </div>

                  {/* Recurrence (15%) */}
                  <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-purple-400">Recurrence (15%)</span>
                      <span className="font-mono text-slate-200 text-xs">
                        {priorityBreakdown.factorScores.recurrenceScore}/100 → {priorityBreakdown.weightedFactorContributions.recurrenceContribution} pts
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal">{priorityBreakdown.reasons.recurrenceReason}</p>
                  </div>
                </div>

                {/* Location Sensitivity (10%) */}
                <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-emerald-400">Location Sensitivity (10%)</span>
                    <span className="font-mono text-slate-200 text-xs">
                      {priorityBreakdown.factorScores.locationSensitivityScore}/100 → {priorityBreakdown.weightedFactorContributions.locationSensitivityContribution} pts
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">{priorityBreakdown.reasons.locationSensitivityReason}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section D: Citizen Reports Belonging to Master Incident */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-400" /> Citizen Submissions ({reports.length})
                </span>
                <Badge variant="slate">{incident.affected_citizens_count} Affected Citizen(s)</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {reports.map((report: any, idx: number) => (
                <div key={report.id} className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-slate-200">
                      Report #{idx + 1} {report.is_original_report ? '(Original Primary)' : '(Merged Duplicate Report)'}
                    </span>
                    <span className="font-mono text-[11px]">Tracker: {report.tracking_code?.slice(0, 8)}...</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800/60">
                    "{report.raw_description}"
                  </p>
                  {report.image_url && (
                    <div className="pt-1">
                      <span className="text-[11px] text-slate-400 font-semibold mb-1 block">Attached Evidence Photo:</span>
                      <img src={report.image_url} alt="Report Evidence" className="h-48 w-full max-w-md object-cover rounded-lg border border-slate-800" />
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Section E: Possible Duplicate Candidate Triage Queue */}
          {duplicates && duplicates.length > 0 && (
            <Card variant="glass" className="border-amber-900/50 bg-amber-950/10">
              <CardHeader>
                <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-base text-amber-300">
                  <span className="flex items-center gap-2">
                    <GitMerge className="h-5 w-5 text-amber-400" /> Possible Duplicate Candidate
                  </span>
                  <span className="text-[11px] font-normal text-slate-400">AI-assisted suggestion. Review before merging.</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {duplicates.map((dup: any) => (
                  <div key={dup.id} className="p-4 bg-slate-950 border border-amber-800/40 rounded-2xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                      <div>
                        <span className="text-xs font-bold text-amber-400">
                          Candidate Incident: {dup.candidate_incident?.case_id || 'CS-XXXX'}
                        </span>
                        <p className="text-xs text-slate-300 font-medium">{dup.candidate_incident?.title}</p>
                      </div>
                      <Badge variant={dup.status === 'PENDING' ? 'amber' : dup.status === 'CONFIRMED' ? 'emerald' : 'slate'}>
                        {dup.status === 'PENDING' ? 'Pending Review' : dup.status === 'CONFIRMED' ? 'Confirmed Merged' : 'Rejected'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-400 font-mono bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                      <div>Distance: <strong className="text-slate-200">{dup.distance_meters} m</strong></div>
                      <div>Vector Similarity: <strong className="text-emerald-400">{(dup.similarity_score * 100).toFixed(1)}%</strong></div>
                      <div>Status: <strong className="text-amber-300">{dup.status}</strong></div>
                    </div>

                    {dup.status === 'PENDING' && (
                      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                        <Button
                          size="md"
                          variant="primary"
                          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-xs font-bold min-h-[44px]"
                          onClick={() => handleDuplicateAction(dup.id, 'CONFIRM_MERGE')}
                        >
                          <Check className="h-4 w-4 mr-1.5" /> Confirm Merge
                        </Button>
                        <Button
                          size="md"
                          variant="outline"
                          className="w-full sm:w-auto border-rose-800 text-rose-300 hover:bg-rose-950 text-xs font-bold min-h-[44px]"
                          onClick={() => handleDuplicateAction(dup.id, 'REJECT_MERGE')}
                        >
                          <X className="h-4 w-4 mr-1.5" /> Reject Candidate
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Section F: Field Resolution Evidence */}
          {resolutionEvidence && (
            <Card variant="glass" className="border-emerald-900/60 bg-emerald-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" /> Field Resolution Evidence
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <p className="text-slate-300">
                  <span className="font-semibold text-slate-400">Officer Repair Notes:</span> {resolutionEvidence.resolution_notes}
                </p>
                {resolutionEvidence.proof_image_url && (
                  <div>
                    <span className="font-semibold text-slate-400 block mb-1">Proof of Repair Photo:</span>
                    <img src={resolutionEvidence.proof_image_url} alt="Resolution Evidence" className="h-52 w-full max-w-md object-cover rounded-xl border border-emerald-800" />
                  </div>
                )}
                <div className="pt-2 flex items-center justify-between text-slate-400">
                  <span>Verified by Citizen: {resolutionEvidence.citizen_verified ? 'Yes (Confirmed)' : 'Pending Verification'}</span>
                  <span>Resolved: {new Date(resolutionEvidence.created_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Operational Controls & Audit Trail (1 Col wide) */}
        <div className="space-y-6">

          {/* Operational Controls Panel */}
          <Card variant="glass" className="border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4 text-cyan-400" /> Operational Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {/* Department Reassignment */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-300 uppercase text-[11px]">Assign Department</label>
                  {isDeptManuallyOverridden && (
                    <span className="text-[10px] text-purple-400 font-semibold">Overridden</span>
                  )}
                </div>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-800 bg-slate-950 px-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="11111111-1111-1111-1111-111111111111">Road Maintenance</option>
                  <option value="22222222-2222-2222-2222-222222222222">Sanitation & Waste</option>
                  <option value="33333333-3333-3333-3333-333333333333">Electrical Dept</option>
                  <option value="44444444-4444-4444-4444-444444444444">Water Supply Board</option>
                  <option value="55555555-5555-5555-5555-555555555555">Drainage & Sewerage</option>
                </select>
              </div>

              {/* Status Update Control */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300 uppercase text-[11px]">Update Lifecycle Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-800 bg-slate-950 px-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="SUBMITTED">SUBMITTED</option>
                  <option value="AI_ANALYSED">AI_ANALYSED</option>
                  <option value="ASSIGNED">ASSIGNED</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CITIZEN_VERIFICATION">CITIZEN_VERIFICATION</option>
                  <option value="VERIFIED">VERIFIED</option>
                </select>
              </div>

              <Button
                variant="primary"
                className="w-full min-h-[44px] font-bold"
                isLoading={updating}
                onClick={handleUpdateIncident}
              >
                Save Operational Changes
              </Button>
            </CardContent>
          </Card>

          {/* Audit History Log */}
          <Card variant="glass" className="border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-purple-400" /> Audit Log History ({auditLogs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {auditLogs.length === 0 ? (
                <p className="text-slate-500 text-center py-4">No modifications logged yet.</p>
              ) : (
                auditLogs.map((log: any) => (
                  <div key={log.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-slate-300 font-semibold">
                      <span>{log.action}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">{log.reason || 'Operational update'}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
