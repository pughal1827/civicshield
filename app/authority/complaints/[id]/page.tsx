'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ShieldAlert,
  AlertTriangle,
  MapPin,
  Clock,
  Building2,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  Check,
  Edit3,
  Calendar,
  FileCheck,
  Flame,
  Users,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { LoadingState } from '@/components/ui/loading-state';

interface DepartmentItem {
  id: string;
  name: string;
  code: string;
}

const DEFAULT_DEPARTMENTS: DepartmentItem[] = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Road Maintenance', code: 'ROAD_MAINT' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Sanitation', code: 'SANITATION' },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Electrical & Streetlights', code: 'ELECTRICAL' },
  { id: '44444444-4444-4444-4444-444444444444', name: 'Water & Sewage', code: 'WATER_SEWER' },
  { id: '55555555-5555-5555-5555-555555555555', name: 'Drainage Systems', code: 'DRAINAGE' },
  { id: '66666666-6666-6666-6666-666666666666', name: 'Traffic Signals & Signs', code: 'TRAFFIC' },
  { id: '77777777-7777-7777-7777-777777777777', name: 'Public Works & Buildings', code: 'PUBLIC_WORKS' },
];

export default function ComplaintDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const incidentId = resolvedParams.id;

  const [loading, setLoading] = useState(true);
  const [incidentData, setIncidentData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [editMode, setEditMode] = useState(false);
  const [customSeverity, setCustomSeverity] = useState<string>('HIGH');
  const [customStatus, setCustomStatus] = useState<string>('ASSIGNED');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [submittingAction, setSubmittingAction] = useState(false);

  const fetchIncidentDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/incidents/${incidentId}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('Complaint not found.');
        throw new Error('Failed to load complaint details.');
      }
      const json = await res.json();
      if (json.success && json.data) {
        setIncidentData(json.data);
        const inc = json.data.incident;
        if (inc.department_id || inc.departmentId) {
          setSelectedDeptId(inc.department_id || inc.departmentId);
        }
        setCustomSeverity(inc.severity || 'HIGH');
        setCustomStatus(inc.status || 'SUBMITTED');
      } else {
        throw new Error(json.error?.message || 'Unable to parse complaint response.');
      }
    } catch (err: any) {
      console.error('Error fetching complaint details:', err);
      setError(err.message || 'Error loading complaint details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidentDetails();
  }, [incidentId]);

  const handleConfirmAiAnalysis = async () => {
    setSubmittingAction(true);
    setActionSuccessMsg(null);
    try {
      let targetDeptId = selectedDeptId || DEFAULT_DEPARTMENTS[0].id;

      const res = await fetch(`/api/incidents/${incidentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'ASSIGNED',
          departmentId: targetDeptId,
          reason: 'Officer confirmed AI analysis & assigned department.',
        }),
      });

      const json = await res.json();
      if (json.success) {
        setActionSuccessMsg('✓ AI Analysis verified & department assigned successfully!');
        fetchIncidentDetails();
      } else {
        alert(json.error?.message || 'Failed to update complaint.');
      }
    } catch (err) {
      console.error('Error confirming AI analysis:', err);
      alert('Network error while updating complaint.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleSaveOfficerEdits = async () => {
    setSubmittingAction(true);
    setActionSuccessMsg(null);
    try {
      const res = await fetch(`/api/incidents/${incidentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: customStatus,
          departmentId: selectedDeptId || DEFAULT_DEPARTMENTS[0].id,
          reason: `Officer adjusted complaint details (Severity: ${customSeverity}, Status: ${customStatus}).`,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setActionSuccessMsg('✓ Officer changes saved successfully!');
        setEditMode(false);
        fetchIncidentDetails();
      } else {
        alert(json.error?.message || 'Failed to update complaint.');
      }
    } catch (err) {
      console.error('Error saving edits:', err);
      alert('Network error while saving edits.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const formatExactDate = (isoStr?: string) => {
    if (!isoStr) return 'N/A';
    try {
      const d = new Date(isoStr);
      return (
        d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
        ', ' +
        d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      );
    } catch {
      return isoStr;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <LoadingState message="Fetching comprehensive complaint telemetry & AI analysis..." />
      </div>
    );
  }

  if (error || !incidentData) {
    return (
      <div className="bg-white p-8 text-center rounded-2xl border border-rose-200 max-w-md mx-auto space-y-4 my-8">
        <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto" />
        <h1 className="text-xl font-bold text-slate-900">Complaint Not Found</h1>
        <p className="text-xs text-slate-500">{error || 'Unable to locate complaint with ID ' + incidentId}</p>
        <Link href="/authority/complaints">
          <button className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 mx-auto">
            <ArrowLeft className="h-4 w-4" /> Back to Complaints
          </button>
        </Link>
      </div>
    );
  }

  const { incident, reports, aiAnalysis, resolutionEvidence } = incidentData;
  const mainReport = reports && reports.length > 0 ? reports[0] : null;

  return (
    <div className="space-y-6">
      {/* Top Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <Link href="/authority/complaints">
          <button className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-all shadow-2xs flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back to Complaints
          </button>
        </Link>
        <span className="text-xs font-mono text-slate-500 font-bold bg-slate-200/80 px-2.5 py-1 rounded-lg">
          Case ID: #{incident.case_id || incident.caseId}
        </span>
      </div>

      {/* Action Toast Banner */}
      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs font-bold text-emerald-900 flex items-center justify-between shadow-xs">
          <span>{actionSuccessMsg}</span>
          <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-700 font-bold hover:text-emerald-950">
            ✕
          </button>
        </div>
      )}

      {/* HEADER CARD */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-black text-sm text-sky-700 bg-sky-50 border border-sky-200 px-3 py-1 rounded-lg">
                #{incident.case_id || incident.caseId}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  incident.status === 'RESOLVED' || incident.status === 'VERIFIED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {incident.status.replace('_', ' ')}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-600 text-white uppercase">
                {incident.severity || 'CRITICAL'} (Score: {incident.priority_score || incident.priorityScore || 85})
              </span>
              {((reports && reports.length > 1) || (incident.report_count > 1) || (incident.reportCount > 1)) && (
                <span className="px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-xs flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5" /> Clustered: {reports?.length || incident.report_count || incident.reportCount || 2} Citizens Reported
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-2">
              {incident.title}
            </h1>
          </div>

          <div className="text-left sm:text-right text-xs space-y-0.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Reported Date & Time</span>
            <span className="font-mono text-slate-800 font-bold text-sm block">
              {formatExactDate(incident.created_at || incident.createdAt)}
            </span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
          {incident.summary}
        </p>
      </div>

      {/* 2-Column Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Information, Evidence, Timeline */}
        <div className="lg:col-span-7 space-y-6">
          {/* Multi-Citizen Clustered Reports Section */}
          {reports && reports.length > 1 && (
            <div className="bg-white rounded-2xl border border-amber-200/80 p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-amber-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Flame className="h-4 w-4 text-amber-500" /> Clustered Citizen Submissions ({reports.length} Citizen Reports)
                </h2>
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                  Auto-Merged by Proximity & Category
                </span>
              </div>

              <div className="space-y-3">
                {reports.map((rep: any, idx: number) => (
                  <div
                    key={rep.id || rep.tracking_code || idx}
                    className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-slate-50 transition-all space-y-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-slate-200 text-slate-800">
                          {idx === 0 ? 'Primary Reporter' : `Citizen Reporter #${idx + 1}`}
                        </span>
                        <span className="font-mono text-slate-500 text-[11px]">
                          Track: {rep.tracking_code || rep.trackingCode || 'N/A'}
                        </span>
                      </div>
                      <span className="text-slate-400 font-mono text-[10px]">
                        {formatExactDate(rep.created_at || rep.createdAt)}
                      </span>
                    </div>

                    <p className="text-slate-800 font-medium leading-relaxed">
                      "{rep.raw_description || rep.rawDescription || rep.description || 'No additional comment provided.'}"
                    </p>

                    {(rep.address_text || rep.addressText) && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                        <span>{rep.address_text || rep.addressText}</span>
                      </div>
                    )}

                    {(rep.image_url || rep.imageUrl) && (
                      <div className="relative h-44 w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100 mt-2">
                        <Image
                          src={rep.image_url || rep.imageUrl}
                          alt={`Evidence from citizen #${idx + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Complaint Info */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileCheck className="h-4 w-4 text-emerald-600" /> Complaint Information
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Citizen Description</span>
                <p className="text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200/80 mt-1 leading-relaxed font-medium">
                  {mainReport?.raw_description || mainReport?.rawDescription || incident.summary}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Problem Category</span>
                  <span className="text-slate-900 font-bold">{incident.category?.replace('_', ' ') || 'Infrastructure'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Department</span>
                  <span className="text-sky-700 font-bold">
                    {incident.departments?.name || incident.departmentName || 'Road Maintenance'}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase block flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-rose-500" /> Location / Address
                </span>
                <p className="text-slate-800 font-semibold mt-0.5">{incident.address || 'Gummidipoondi Sector Main Rd'}</p>
              </div>

              {/* Photo Evidence */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Evidence Photo</span>
                {mainReport?.image_url || mainReport?.imageUrl ? (
                  <div className="relative h-64 w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                    <Image src={mainReport.image_url || mainReport.imageUrl} alt="Complaint evidence" fill className="object-cover" />
                  </div>
                ) : (
                  <div className="h-32 rounded-xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 text-xs">
                    No photographic evidence attached.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Timeline */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <Clock className="h-4 w-4 text-sky-600" /> Action Timeline & Event History
            </h2>

            <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              <div className="relative pl-8 space-y-0.5">
                <div className="absolute left-1 top-1 h-4.5 w-4.5 rounded-full bg-emerald-500 ring-4 ring-white" />
                <span className="text-xs font-bold text-slate-900 block">Submitted by Citizen</span>
                <span className="text-[11px] font-mono text-slate-500 block">{formatExactDate(incident.created_at || incident.createdAt)}</span>
              </div>

              <div className="relative pl-8 space-y-0.5">
                <div className="absolute left-1 top-1 h-4.5 w-4.5 rounded-full bg-sky-500 ring-4 ring-white" />
                <span className="text-xs font-bold text-slate-900 block">AI Multi-Modal Analysis Completed</span>
                <span className="text-[11px] font-mono text-slate-500 block">{formatExactDate(incident.created_at || incident.createdAt)}</span>
              </div>

              {incident.status !== 'SUBMITTED' && incident.status !== 'AI_ANALYSED' && (
                <div className="relative pl-8 space-y-0.5">
                  <div className="absolute left-1 top-1 h-4.5 w-4.5 rounded-full bg-amber-500 ring-4 ring-white" />
                  <span className="text-xs font-bold text-slate-900 block">Officer Verified & Department Assigned</span>
                  <span className="text-[11px] font-mono text-slate-500 block">
                    Assigned to {incident.departments?.name || incident.departmentName || 'Road Maintenance'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): AI Analysis & Officer Cross-Check */}
        <div className="lg:col-span-5 space-y-6">
          {/* AI Analysis Box */}
          <div className="bg-gradient-to-br from-sky-900 to-slate-900 text-white rounded-2xl p-6 space-y-4 shadow-md">
            <div className="flex items-center justify-between border-b border-sky-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-sky-400 animate-pulse" />
                <h2 className="text-sm font-bold uppercase tracking-wider">AI Analysis Engine</h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/30 text-sky-300 border border-sky-400/40">
                Confidence 94%
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950/60 p-3 rounded-xl border border-sky-800/60">
                  <span className="text-[10px] font-bold text-sky-300 uppercase block">Detected Problem</span>
                  <span className="text-white font-bold text-sm block mt-0.5">
                    {aiAnalysis?.category?.replace('_', ' ') || incident.category?.replace('_', ' ') || 'Road Pothole'}
                  </span>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-xl border border-sky-800/60">
                  <span className="text-[10px] font-bold text-sky-300 uppercase block">AI Dept Suggestion</span>
                  <span className="text-sky-300 font-bold text-sm block mt-0.5">
                    {aiAnalysis?.recommended_department_code || 'Road Maintenance'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-sky-800/60 text-center">
                  <span className="text-[10px] font-bold text-sky-300 uppercase block">Severity</span>
                  <span className="text-amber-400 font-black text-base">{incident.severity || 'HIGH'}</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-sky-800/60 text-center">
                  <span className="text-[10px] font-bold text-sky-300 uppercase block">Safety Risk</span>
                  <span className="text-rose-400 font-black text-base">85%</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-sky-800/60 text-center">
                  <span className="text-[10px] font-bold text-sky-300 uppercase block">Public Impact</span>
                  <span className="text-emerald-400 font-black text-base">High</span>
                </div>
              </div>
            </div>
          </div>

          {/* Officer Cross-Check & Assign Department */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4 shadow-xs">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-amber-500" /> Check AI Analysis & Assign
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                The officer must verify or correct AI results before department assignment.
              </p>
            </div>

            {!editMode ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Select Department
                  </label>
                  <select
                    value={selectedDeptId}
                    onChange={(e) => setSelectedDeptId(e.target.value)}
                    className="w-full h-11 rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select Department...</option>
                    {DEFAULT_DEPARTMENTS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={handleConfirmAiAnalysis}
                    disabled={submittingAction}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <Check className="h-4 w-4" /> Confirm AI Analysis & Assign Department
                  </button>

                  <button
                    onClick={() => setEditMode(true)}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-all flex items-center justify-center gap-2"
                  >
                    <Edit3 className="h-4 w-4 text-amber-600" /> Change Details / Override
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Severity Level</label>
                  <select
                    value={customSeverity}
                    onChange={(e) => setCustomSeverity(e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Status Override</label>
                  <select
                    value={customStatus}
                    onChange={(e) => setCustomStatus(e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold"
                  >
                    <option value="ASSIGNED">ASSIGNED</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="VERIFIED">VERIFIED</option>
                  </select>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    onClick={handleSaveOfficerEdits}
                    disabled={submittingAction}
                    className="flex-1 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-lg"
                  >
                    Save Edits
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    className="py-2 px-4 bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
