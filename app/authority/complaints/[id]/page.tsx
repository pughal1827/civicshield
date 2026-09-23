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
  RefreshCw,
  X
} from 'lucide-react';
import { LoadingState } from '@/components/ui/loading-state';
import { DEPARTMENTS, normalizeDepartmentCode, DEPARTMENT_DISPLAY_NAMES } from '@/lib/constants/departments';

export default function AuthorityComplaintDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const incidentId = resolvedParams.id;

  const [loading, setLoading] = useState(true);
  const [incidentData, setIncidentData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedDeptId, setSelectedDeptId] = useState<string>('ROAD_MAINTENANCE');
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [selectedWorkerName, setSelectedWorkerName] = useState<string>('');
  const [availableWorkers, setAvailableWorkers] = useState<any[]>([]);

  const [editMode, setEditMode] = useState(false);
  const [customSeverity, setCustomSeverity] = useState<string>('HIGH');
  const [customStatus, setCustomStatus] = useState<string>('ASSIGNED');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Change Department Modal State
  const [showChangeDeptModal, setShowChangeDeptModal] = useState(false);
  const [newDeptInput, setNewDeptInput] = useState<string>('ROAD_MAINTENANCE');

  // Rejection Form State
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  const fetchWorkersForDept = async (deptCode: string) => {
    try {
      const res = await fetch(`/api/authority/workers?department=${deptCode}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data?.workers)) {
          setAvailableWorkers(json.data.workers);
          if (json.data.workers.length > 0) {
            const firstWorker = json.data.workers[0];
            setSelectedWorkerId(firstWorker.id);
            setSelectedWorkerName(firstWorker.fullName);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching department workers:', err);
    }
  };

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
        const ai = json.data.aiAnalysis;
        const deptCode = normalizeDepartmentCode(inc.department_id || inc.departmentId || inc.departmentCode, inc.category || ai?.detected_category);
        setSelectedDeptId(deptCode);
        setNewDeptInput(deptCode);
        setCustomSeverity(inc.severity || ai?.detected_severity || 'HIGH');
        setCustomStatus(inc.status || 'SUBMITTED');

        fetchWorkersForDept(deptCode);
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

  useEffect(() => {
    if (selectedDeptId) {
      fetchWorkersForDept(selectedDeptId);
    }
  }, [selectedDeptId]);

  // Initial Assignment Action
  const handleConfirmAiAnalysis = async () => {
    setSubmittingAction(true);
    setActionSuccessMsg(null);
    try {
      const targetDeptId = selectedDeptId || 'ROAD_MAINTENANCE';
      const targetDeptName = (DEPARTMENT_DISPLAY_NAMES as any)[targetDeptId] || targetDeptId;

      const res = await fetch(`/api/incidents/${incidentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-officer-name': 'Officer Robert Chen',
        },
        body: JSON.stringify({
          status: 'ASSIGNED',
          departmentId: targetDeptId,
          assignedDepartment: targetDeptName,
          assignedWorkerId: selectedWorkerId || 'user-worker-road-001',
          assignedWorkerName: selectedWorkerName || 'Alex Rivera (Road Maintenance Lead)',
          assignedWorker: selectedWorkerName || 'Alex Rivera (Road Maintenance Lead)',
          assignedBy: 'Officer Robert Chen',
          changedBy: 'Officer Robert Chen',
          reason: `Assigned to ${targetDeptName} - Lead: ${selectedWorkerName || 'Alex Rivera'}.`,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setActionSuccessMsg('✓ Department and Worker assigned successfully. Status updated to WORK ASSIGNED.');
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

  // Change Department Action (Modal)
  const handleChangeDepartment = async () => {
    if (!newDeptInput) return;
    setSubmittingAction(true);
    setActionSuccessMsg(null);
    try {
      const inc = incidentData?.incident;
      const currentDeptName = inc?.departmentName || inc?.department_id || 'Previous Department';
      const targetDeptName = (DEPARTMENT_DISPLAY_NAMES as any)[newDeptInput] || newDeptInput;
      const currentWorker = inc?.assignedWorker || inc?.assignedWorkerName || inc?.assigned_worker_id || 'Previous Worker';
      const currentAssignedAt = inc?.assigned_at || inc?.assignedAt || inc?.created_at;

      const res = await fetch(`/api/incidents/${incidentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-officer-name': 'Officer Robert Chen',
        },
        body: JSON.stringify({
          departmentId: newDeptInput,
          assignedDepartment: targetDeptName,
          previousDepartment: currentDeptName,
          previousWorker: currentWorker,
          oldAssignedAt: currentAssignedAt,
          newDepartment: targetDeptName,
          assignedBy: 'Officer Robert Chen',
          changedBy: 'Officer Robert Chen',
          reason: `Reassigned from ${currentDeptName} to ${targetDeptName} by Officer Robert Chen.`,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setActionSuccessMsg('✓ Department and Worker reassigned successfully. Previous worker access revoked and new department notified.');
        setShowChangeDeptModal(false);
        fetchIncidentDetails();
      } else {
        alert(json.error?.message || 'Failed to change department.');
      }
    } catch (err) {
      console.error('Error changing department:', err);
      alert('Network error while changing department.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Approve Evidence Action
  const handleApproveResolution = async () => {
    setSubmittingAction(true);
    setActionSuccessMsg(null);
    try {
      const res = await fetch(`/api/incidents/${incidentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-officer-name': 'Officer Robert Chen',
        },
        body: JSON.stringify({
          status: 'PENDING_CITIZEN_VERIFICATION',
          approvedBy: 'Officer Robert Chen',
          changedBy: 'Officer Robert Chen',
          reason: 'Officer reviewed and approved worker field evidence.',
        }),
      });

      const json = await res.json();
      if (json.success) {
        setActionSuccessMsg('✓ Worker evidence approved! Complaint updated to PENDING CITIZEN VERIFICATION.');
        fetchIncidentDetails();
      } else {
        alert(json.error?.message || 'Failed to approve resolution.');
      }
    } catch (err) {
      console.error('Error approving resolution:', err);
      alert('Network error while approving resolution.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Reject Evidence Action
  const handleRejectResolution = async () => {
    if (!rejectionReasonInput.trim()) {
      alert('Please enter a reason for rejecting the evidence.');
      return;
    }

    setSubmittingAction(true);
    setActionSuccessMsg(null);
    try {
      const res = await fetch(`/api/incidents/${incidentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-officer-name': 'Officer Robert Chen',
        },
        body: JSON.stringify({
          status: 'EVIDENCE_REJECTED',
          rejectionReason: rejectionReasonInput.trim(),
          rejectedBy: 'Officer Robert Chen',
          changedBy: 'Officer Robert Chen',
          reason: `Officer rejected worker field evidence: ${rejectionReasonInput.trim()}`,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setActionSuccessMsg('⚠ Worker evidence rejected. Status updated to EVIDENCE_REJECTED.');
        setShowRejectionForm(false);
        setRejectionReasonInput('');
        fetchIncidentDetails();
      } else {
        alert(json.error?.message || 'Failed to reject evidence.');
      }
    } catch (err) {
      console.error('Error rejecting resolution:', err);
      alert('Network error while rejecting resolution.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Save Officer Details Overrides
  const handleSaveOfficerEdits = async () => {
    setSubmittingAction(true);
    setActionSuccessMsg(null);
    try {
      const res = await fetch(`/api/incidents/${incidentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: customStatus,
          departmentId: selectedDeptId || 'ROAD_MAINTENANCE',
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

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'ASSIGNED':
      case 'WORK_ASSIGNED':
        return (
          <span className="font-extrabold text-amber-900 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full text-xs flex items-center gap-1 shadow-2xs">
            <span>🟠 WORK ASSIGNED</span>
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="font-extrabold text-blue-900 bg-blue-100 border border-blue-300 px-3 py-1 rounded-full text-xs flex items-center gap-1 shadow-2xs">
            <span>🔵 ACCEPTED</span>
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="font-extrabold text-sky-900 bg-sky-100 border border-sky-300 px-3 py-1 rounded-full text-xs flex items-center gap-1 shadow-2xs">
            <span>🔵 IN PROGRESS</span>
          </span>
        );
      case 'WAITING_FOR_APPROVAL':
      case 'WORK_COMPLETED':
      case 'AWAITING_VERIFICATION':
        return (
          <span className="font-extrabold text-amber-900 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full text-xs flex items-center gap-1 shadow-2xs">
            <span>🟡 WAITING FOR APPROVAL</span>
          </span>
        );
      case 'PENDING_CITIZEN_VERIFICATION':
        return (
          <span className="font-extrabold text-emerald-900 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full text-xs flex items-center gap-1 shadow-2xs">
            <span>🟢 PENDING CITIZEN VERIFICATION</span>
          </span>
        );
      case 'CLOSED':
      case 'RESOLVED':
      case 'VERIFIED':
        return (
          <span className="font-extrabold text-emerald-950 bg-emerald-200 border border-emerald-400 px-3 py-1 rounded-full text-xs flex items-center gap-1 shadow-2xs">
            <span>🟢 CLOSED / VERIFIED</span>
          </span>
        );
      case 'EVIDENCE_REJECTED':
        return (
          <span className="font-extrabold text-rose-900 bg-rose-100 border border-rose-300 px-3 py-1 rounded-full text-xs flex items-center gap-1 shadow-2xs">
            <span>🔴 EVIDENCE REJECTED</span>
          </span>
        );
      case 'REOPENED':
        return (
          <span className="font-extrabold text-purple-900 bg-purple-100 border border-purple-300 px-3 py-1 rounded-full text-xs flex items-center gap-1 shadow-2xs">
            <span>🟣 REOPENED</span>
          </span>
        );
      default:
        return (
          <span className="font-extrabold text-slate-800 bg-slate-100 border border-slate-300 px-3 py-1 rounded-full text-xs shadow-2xs">
            ⚪ {status.replace(/_/g, ' ')}
          </span>
        );
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

  const { incident, reports, aiAnalysis, resolutionEvidence, auditLogs } = incidentData;
  const mainReport = reports && reports.length > 0 ? reports[0] : null;
  const caseId = incident.case_id || incident.caseId;
  const isAssigned = Boolean(incident.department_id || incident.departmentId || (incident.status !== 'SUBMITTED' && incident.status !== 'AI_ANALYSED'));

  const imageVer =
    aiAnalysis?.imageVerification ||
    aiAnalysis?.image_verification ||
    aiAnalysis?.extracted_features?.imageVerification ||
    aiAnalysis?.raw_ai_response?.imageVerification ||
    incident?.priority_factors?.imageVerification ||
    incident?.priorityFactors?.imageVerification ||
    null;

  const isImageMismatch = Boolean(
    imageVer?.matchStatus === 'MISMATCHED' ||
    imageVer?.isMatch === false ||
    imageVer?.decisionAction === 'FLAGGED_MISMATCH' ||
    incident?.priority_factors?.isImageMismatch ||
    incident?.priority_factors?.imageMatchStatus === 'MISMATCHED' ||
    incident?.priorityFactors?.isImageMismatch
  );

  const isImageVerified = Boolean(
    imageVer &&
    imageVer.isMatch === true &&
    imageVer.matchStatus === 'MATCHED' &&
    !isImageMismatch
  );

  const deptDisplayName =
    incident.departmentName ||
    incident.departments?.name ||
    (DEPARTMENT_DISPLAY_NAMES as any)[normalizeDepartmentCode(incident.department_id || incident.departmentId || incident.departmentCode)] ||
    'Road Maintenance';

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
          Case ID: #{caseId}
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
                #{caseId}
              </span>
              {renderStatusBadge(incident.status)}
              <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-600 text-white uppercase">
                {incident.severity || 'CRITICAL'} (Score: {incident.priority_score || incident.priorityScore || 85})
              </span>
              {isImageMismatch && (
                <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-500/15 text-rose-700 border border-rose-300 flex items-center gap-1.5 shadow-2xs">
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-600 animate-pulse" />
                  FLAGGED IMAGE MISMATCH
                </span>
              )}
              {isImageVerified && (
                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  AI Evidence Verified ({Math.round((imageVer?.similarityScore || 0.9) * 100)}%)
                </span>
              )}
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
        {/* Left Column (7 cols): Information, Evidence, Timeline & Audit Log */}
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
                      &quot;{rep.raw_description || rep.rawDescription || rep.description || 'No additional comment provided.'}&quot;
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
                  <span className="text-sky-700 font-bold">{deptDisplayName}</span>
                </div>
              </div>

              <div className="pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase block flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-rose-500" /> Location / Address
                </span>
                <p className="text-slate-800 font-semibold mt-0.5">{incident.address || 'Gummidipoondi Sector Main Rd'}</p>
              </div>

              {/* Photo Evidence with AI Vision Diagnostics */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Evidence Photo</span>
                  {imageVer && (
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                        isImageMismatch
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                          : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {isImageMismatch ? (
                        <>
                          <AlertTriangle className="h-3 w-3 text-rose-600" />
                          Mismatch Flagged ({Math.round((imageVer.similarityScore || 0.15) * 100)}% Match)
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Photo Verified ({Math.round((imageVer.similarityScore || 0.92) * 100)}% Match)
                        </>
                      )}
                    </span>
                  )}
                </div>

                {/* AI Multi-modal Vision Diagnostics Card */}
                {imageVer && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs space-y-2.5 ${
                      isImageMismatch
                        ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                        : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-extrabold flex items-center gap-1.5 text-xs">
                        {isImageMismatch ? (
                          <>
                            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 animate-bounce" />
                            <span>AI Vision Alert: Image-Text Discrepancy Detected</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span>AI Vision Verified: Image Aligns with Description</span>
                          </>
                        )}
                      </div>
                      <span className="font-mono font-black text-[10px] px-2 py-0.5 rounded bg-white/90 border border-slate-200/80 shadow-2xs">
                        {imageVer.decisionAction || (isImageMismatch ? 'FLAGGED_MISMATCH' : 'APPROVED_FOR_ROUTING')}
                      </span>
                    </div>

                    <p className="text-[11px] leading-relaxed text-slate-700 font-medium">
                      {isImageMismatch
                        ? `The uploaded photographic evidence does not visually match the citizen description ("${mainReport?.raw_description || incident.summary}"). The issue category remains based on the citizen's actual description.`
                        : `The attached photographic evidence was verified and semantically matches the citizen complaint.`}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200/70 text-[11px]">
                      <div className="bg-white/90 p-2 rounded-lg border border-slate-200/80 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">CLIP Semantic Alignment</span>
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full ${
                                isImageMismatch ? 'bg-rose-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, Math.round((imageVer.similarityScore || (isImageMismatch ? 0.15 : 0.9)) * 100))}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-slate-800 shrink-0">
                            {Math.round((imageVer.similarityScore || (isImageMismatch ? 0.15 : 0.9)) * 100)}%
                          </span>
                        </div>
                      </div>

                      <div className="bg-white/90 p-2 rounded-lg border border-slate-200/80 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">YOLOv8 Detected Objects</span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {Array.isArray(imageVer.yoloDetections) && imageVer.yoloDetections.length > 0 ? (
                            imageVer.yoloDetections.slice(0, 4).map((det: any, i: number) => (
                              <span key={i} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] border border-slate-200 font-bold">
                                {det.label || det.name} ({Math.round((det.confidence || 0.8) * 100)}%)
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-500 font-mono text-[10px]">
                              {imageVer.predictedCategory ? `Features: ${imageVer.predictedCategory.replace(/_/g, ' ')}` : 'Hazard Scene'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {mainReport?.image_url || mainReport?.imageUrl ? (
                  <div className="relative h-64 w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-xs">
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

          {/* Assignment History & Audit Trail */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-4 w-4 text-sky-600" /> Assignment History & Audit Trail
              </h2>
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                {auditLogs?.length || 1} Event(s)
              </span>
            </div>

            <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {auditLogs && auditLogs.length > 0 ? (
                auditLogs.map((log: any, idx: number) => (
                  <div key={log.id || idx} className="relative pl-8 space-y-0.5 text-xs">
                    <div className="absolute left-1 top-1 h-4.5 w-4.5 rounded-full bg-slate-900 border-2 border-white ring-2 ring-slate-100" />
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-900">
                        {log.action === 'DEPARTMENT_ASSIGNED'
                          ? 'Department Assigned'
                          : log.action === 'DEPARTMENT_REASSIGNED'
                          ? 'Department Changed / Reassigned'
                          : log.action === 'WORKER_ACCEPTED_JOB'
                          ? 'Worker Accepted Job'
                          : log.action === 'WORKER_STARTED_WORK'
                          ? 'Worker Started Field Work'
                          : log.action === 'WORKER_SUBMITTED_EVIDENCE'
                          ? 'Worker Submitted Resolution Evidence'
                          : log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {formatExactDate(log.created_at)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                      {log.reason || 'Operational status recorded.'}
                    </p>
                    <span className="text-[10px] text-slate-400 font-bold block">
                      Performed by: {log.performed_by || 'Authority Officer'}
                    </span>
                  </div>
                ))
              ) : (
                <>
                  <div className="relative pl-8 space-y-0.5 text-xs">
                    <div className="absolute left-1 top-1 h-4.5 w-4.5 rounded-full bg-emerald-500 ring-4 ring-white" />
                    <span className="font-bold text-slate-900 block">Submitted by Citizen</span>
                    <span className="text-[11px] font-mono text-slate-500 block">{formatExactDate(incident.created_at || incident.createdAt)}</span>
                  </div>

                  {incident.assigned_at && (
                    <div className="relative pl-8 space-y-0.5 text-xs">
                      <div className="absolute left-1 top-1 h-4.5 w-4.5 rounded-full bg-amber-500 ring-4 ring-white" />
                      <span className="font-bold text-slate-900 block">Work Assigned to {deptDisplayName}</span>
                      <span className="text-[11px] font-mono text-slate-500 block">
                        Assigned by {incident.assigned_by || 'Authority Officer'} on {formatExactDate(incident.assigned_at)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): AI Analysis & Department Assignment */}
        <div className="lg:col-span-5 space-y-6">
          {/* AI Analysis Box */}
          <div className="bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 text-white rounded-2xl p-6 space-y-4 shadow-lg border border-sky-900/60">
            <div className="flex items-center justify-between border-b border-sky-800/60 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-sky-400 animate-pulse" />
                <h2 className="text-sm font-extrabold uppercase tracking-wider">AI Analysis Engine</h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sky-500/20 text-sky-300 border border-sky-400/40">
                Confidence {Math.round((aiAnalysis?.confidence_score ?? aiAnalysis?.confidence ?? 0.92) <= 1 ? (aiAnalysis?.confidence_score ?? aiAnalysis?.confidence ?? 0.92) * 100 : (aiAnalysis?.confidence_score ?? aiAnalysis?.confidence ?? 92))}%
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-950/70 p-3 rounded-xl border border-sky-900/60">
                  <span className="text-[10px] font-bold text-sky-300 uppercase block">Detected Problem</span>
                  <span className="text-white font-extrabold text-sm block mt-0.5">
                    {(aiAnalysis?.detected_category || aiAnalysis?.category || incident.category || 'Road Pothole').replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="bg-slate-950/70 p-3 rounded-xl border border-sky-900/60">
                  <span className="text-[10px] font-bold text-sky-300 uppercase block">AI Recommended Routing</span>
                  <span className="text-sky-300 font-extrabold text-sm block mt-0.5 truncate">
                    {aiAnalysis?.suggested_department_name || deptDisplayName}
                  </span>
                </div>
              </div>

              {/* Dynamic Metric Gauges */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-950/70 p-2.5 rounded-xl border border-sky-900/60 text-center">
                  <span className="text-[10px] font-bold text-sky-300 uppercase block">Severity</span>
                  <span
                    className={`font-black text-sm sm:text-base ${
                      (incident.severity || aiAnalysis?.detected_severity) === 'CRITICAL'
                        ? 'text-rose-400'
                        : (incident.severity || aiAnalysis?.detected_severity) === 'HIGH'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {incident.severity || aiAnalysis?.detected_severity || 'HIGH'}
                  </span>
                </div>
                <div className="bg-slate-950/70 p-2.5 rounded-xl border border-sky-900/60 text-center">
                  <span className="text-[10px] font-bold text-sky-300 uppercase block">Safety Risk</span>
                  <span className="text-rose-400 font-black text-sm sm:text-base">
                    {aiAnalysis?.safety_risk_score ?? aiAnalysis?.safetyRiskScore ?? incident.priority_factors?.safetyRisk ?? 76}%
                  </span>
                </div>
                <div className="bg-slate-950/70 p-2.5 rounded-xl border border-sky-900/60 text-center">
                  <span className="text-[10px] font-bold text-sky-300 uppercase block">Public Impact</span>
                  <span className="text-emerald-400 font-black text-sm sm:text-base">
                    {aiAnalysis?.public_impact || ((incident.report_count || 1) > 1 ? 'Critical' : 'High')}
                  </span>
                </div>
              </div>

              {/* Multi-modal Vision Verification Details */}
              {imageVer && (
                <div className="p-3 rounded-xl bg-slate-950/70 border border-sky-900/60 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-sky-300 uppercase block flex items-center gap-1">
                      <Layers className="h-3 w-3 text-sky-400" /> Multi-Modal Vision Cross-Check
                    </span>
                    <span
                      className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                        isImageMismatch
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {imageVer.matchStatus || (isImageMismatch ? 'MISMATCHED' : 'MATCHED')}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 flex items-center justify-between pt-1">
                    <span>CLIP Semantic Score:</span>
                    <span className="font-mono font-bold text-white">
                      {Math.round((imageVer.similarityScore || (isImageMismatch ? 0.15 : 0.9)) * 100)}%
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Active Pipeline:</span>
                    <span className="font-mono text-sky-300">YOLOv8 + CLIP + RF + IF</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* DEPARTMENT ASSIGNMENT CARD */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4 shadow-xs">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="h-5 w-5 text-orange-500" /> Department Assignment
              </h2>
              {renderStatusBadge(incident.status)}
            </div>

            {isAssigned ? (
              /* ALREADY ASSIGNED VIEW */
              <div className="space-y-3.5 text-xs">
                <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200 space-y-1">
                  <span className="text-[10px] font-extrabold text-orange-600 uppercase tracking-wider block">Department</span>
                  <div className="text-base font-black text-slate-900">{deptDisplayName}</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Assigned Worker Lead</span>
                  <div className="text-sm font-extrabold text-slate-900">
                    {incident.assignedWorker || incident.assignedWorkerName || incident.assigned_worker_name || 'Alex Rivera (Field Lead)'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Assigned At</span>
                    <div className="font-bold text-slate-800 text-[11px] font-mono">
                      {formatExactDate(incident.assigned_at || incident.created_at)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Assigned By</span>
                    <div className="font-bold text-slate-800 text-[11px]">
                      {incident.assigned_by || incident.assignedBy || 'Officer Robert Chen'}
                    </div>
                  </div>
                </div>

                {/* BUTTON: Change Department */}
                <div className="pt-2">
                  <button
                    onClick={() => setShowChangeDeptModal(true)}
                    disabled={submittingAction}
                    className="w-full py-3 bg-slate-900 hover:bg-orange-600 text-white font-extrabold text-xs rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4 text-orange-400" />
                    <span>Change Department</span>
                  </button>
                </div>
              </div>
            ) : (
              /* INITIAL ASSIGNMENT VIEW */
              <div className="space-y-4 text-xs">
                <p className="text-slate-500 leading-relaxed font-medium">
                  The complaint is unassigned. Verify AI recommendation, select municipal department, and choose the assigned worker lead to dispatch field repairs.
                </p>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    1. Select Department
                  </label>
                  <select
                    value={selectedDeptId}
                    onChange={(e) => setSelectedDeptId(e.target.value)}
                    className="w-full h-11 rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    2. Select Department Worker
                  </label>
                  <select
                    value={selectedWorkerId}
                    onChange={(e) => {
                      setSelectedWorkerId(e.target.value);
                      const found = availableWorkers.find((w) => w.id === e.target.value);
                      if (found) setSelectedWorkerName(found.fullName);
                    }}
                    className="w-full h-11 rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {availableWorkers && availableWorkers.length > 0 ? (
                      availableWorkers.map((w: any) => (
                        <option key={w.id} value={w.id}>
                          {w.fullName} ({w.email})
                        </option>
                      ))
                    ) : (
                      <option value="user-worker-road-001">Alex Rivera (Road Maintenance Lead)</option>
                    )}
                  </select>
                </div>

                <button
                  onClick={handleConfirmAiAnalysis}
                  disabled={submittingAction}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <Check className="h-4 w-4" /> Confirm & Assign Worker
                </button>
              </div>
            )}
          </div>

          {/* Worker Field Evidence & Verification Review Card */}
          {(resolutionEvidence || incident.status === 'WAITING_FOR_APPROVAL' || incident.status === 'WORK_COMPLETED' || incident.status === 'AWAITING_VERIFICATION' || incident.status === 'PENDING_CITIZEN_VERIFICATION' || incident.status === 'RESOLVED' || incident.status === 'CLOSED' || incident.status === 'EVIDENCE_REJECTED' || incident.status === 'REOPENED') && (
            <div className="bg-white rounded-2xl border border-emerald-300 p-6 space-y-4 shadow-sm">
              <div className="border-b border-emerald-100 pb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" /> Field Worker Resolution Proof
                </h2>
                {renderStatusBadge(incident.status)}
              </div>

              <div className="space-y-3 text-xs">
                {resolutionEvidence?.proof_image_url && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Before / After Field Repair Proof</span>
                    <div className="relative h-48 w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                      <Image src={resolutionEvidence.proof_image_url} alt="Worker Repair Proof" fill className="object-cover" />
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Field Repair Notes</span>
                  <p className="text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200 mt-1 leading-relaxed font-medium">
                    {resolutionEvidence?.resolution_notes || 'Worker completed field repair and requested authority approval.'}
                  </p>
                </div>

                {/* STATUS: PENDING CITIZEN VERIFICATION */}
                {incident.status === 'PENDING_CITIZEN_VERIFICATION' && (
                  <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 text-xs font-medium space-y-1">
                    <span className="font-extrabold text-emerald-900 flex items-center gap-1.5 text-xs">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Evidence Approved by Authority
                    </span>
                    <p className="text-emerald-800">
                      Approved by {incident.approved_by || incident.approvedBy || 'Authority Officer'} on {formatExactDate(incident.approved_at || incident.approvedAt)}.
                      Complaint is currently waiting for final citizen resolution verification.
                    </p>
                  </div>
                )}

                {/* STATUS: CLOSED / VERIFIED */}
                {(incident.status === 'CLOSED' || incident.status === 'RESOLVED' || incident.status === 'VERIFIED') && (
                  <div className="p-4 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-950 text-xs font-medium space-y-1">
                    <span className="font-extrabold text-emerald-950 flex items-center gap-1.5 text-xs">
                      <CheckCircle2 className="h-4 w-4 text-emerald-700" /> Citizen Verified & Closed
                    </span>
                    <p className="text-emerald-900">
                      Verified and closed on {formatExactDate(incident.citizen_verified_at || incident.citizenVerifiedAt || incident.resolved_at || incident.resolvedAt)}.
                    </p>
                  </div>
                )}

                {/* STATUS: REOPENED */}
                {incident.status === 'REOPENED' && (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl text-purple-950 text-xs font-medium space-y-1">
                    <span className="font-extrabold text-purple-900 flex items-center gap-1.5 text-xs">
                      <AlertTriangle className="h-4 w-4 text-purple-600" /> Citizen Rejected Resolution (Reopened)
                    </span>
                    <p className="text-purple-900 font-semibold">
                      Citizen Rejection Reason: &quot;{incident.citizen_rejection_reason || incident.citizenRejectionReason || 'Resolution was unsatisfactory.'}&quot;
                    </p>
                    <p className="text-slate-600 text-[11px] mt-1">
                      Officer can reassign the worker lead or change the assigned department below.
                    </p>
                  </div>
                )}

                {/* STATUS: EVIDENCE REJECTED */}
                {incident.status === 'EVIDENCE_REJECTED' && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs font-medium space-y-1">
                    <span className="font-extrabold text-rose-900 flex items-center gap-1.5 text-xs">
                      <AlertTriangle className="h-4 w-4 text-rose-600" /> Evidence Rejected by Authority
                    </span>
                    <p className="text-rose-900 font-semibold">
                      Rejection Reason: &quot;{incident.rejection_reason || incident.rejectionReason || 'Field repair evidence requires revision.'}&quot;
                    </p>
                    <p className="text-slate-600 text-[11px] mt-1">
                      Worker lead has been notified to fix the issue and resubmit new evidence.
                    </p>
                  </div>
                )}

                {/* ACTION BUTTONS: ONLY SHOW WHEN WAITING FOR APPROVAL */}
                {(incident.status === 'WAITING_FOR_APPROVAL' || incident.status === 'WORK_COMPLETED' || incident.status === 'AWAITING_VERIFICATION') && (
                  <>
                    {!showRejectionForm ? (
                      <div className="pt-2 flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={handleApproveResolution}
                          disabled={submittingAction}
                          className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="h-4 w-4" /> Approve Resolution
                        </button>
                        <button
                          onClick={() => setShowRejectionForm(true)}
                          disabled={submittingAction}
                          className="flex-1 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all flex items-center justify-center gap-1.5"
                        >
                          <AlertTriangle className="h-4 w-4 text-rose-600" /> Reject Evidence
                        </button>
                      </div>
                    ) : (
                      <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-rose-900 block">Reason for Rejection *</label>
                          <p className="text-[11px] text-slate-600">Provide actionable feedback for field workers to address and resubmit.</p>
                          <textarea
                            rows={3}
                            value={rejectionReasonInput}
                            onChange={(e) => setRejectionReasonInput(e.target.value)}
                            placeholder='Example: "After photo does not clearly show the repaired road."'
                            className="w-full p-2.5 bg-white border border-rose-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleRejectResolution}
                            disabled={submittingAction}
                            className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl"
                          >
                            Reject & Send Back to Worker
                          </button>
                          <button
                            onClick={() => setShowRejectionForm(false)}
                            className="py-2.5 px-4 bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CHANGE DEPARTMENT MODAL */}
      {showChangeDeptModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-50 text-orange-600 border border-orange-200">
                  <Building2 className="h-5 w-5" />
                </div>
                <h3 className="text-base font-black text-slate-900">Change Assigned Department</h3>
              </div>
              <button
                onClick={() => setShowChangeDeptModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Current Department</span>
                <div className="font-black text-slate-900 text-sm">{deptDisplayName}</div>
              </div>

              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-700 uppercase tracking-wider block">
                  Select New Department *
                </label>
                <select
                  value={newDeptInput}
                  onChange={(e) => setNewDeptInput(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-300 bg-white px-3 text-xs font-extrabold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none shadow-xs"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowChangeDeptModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleChangeDepartment}
                disabled={submittingAction}
                className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white font-black text-xs rounded-xl shadow-xs transition-colors"
              >
                Change Department
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
