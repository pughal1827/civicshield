'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Clock,
  MapPin,
  AlertTriangle,
  Building2,
  UserCheck,
  Calendar,
  FileText,
  Navigation,
  ExternalLink,
  ShieldCheck,
  ImageOff,
  Check,
  X,
  History
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuthorityEvidenceReviewPageProps {
  params: Promise<{ caseId: string }>;
}

export default function AuthorityEvidenceReviewPage({ params }: AuthorityEvidenceReviewPageProps) {
  const { caseId: caseIdParam } = use(params);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [incidentData, setIncidentData] = useState<any>(null);

  // Review Action Modals
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const fetchEvidenceDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/incidents/${caseIdParam}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('Complaint or evidence record not found.');
        if (res.status === 403) throw new Error('Access Denied: Requires Authority authorization.');
        throw new Error('Failed to load evidence review record.');
      }
      const json = await res.json();
      if (json.success && json.data) {
        setIncidentData(json.data);
      } else {
        throw new Error(json.error?.message || 'Unable to parse evidence response.');
      }
    } catch (err: any) {
      console.error('Error fetching evidence detail:', err);
      setError(err.message || 'Connection error loading evidence details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvidenceDetail();
  }, [caseIdParam]);

  const formatDate = (isoStr?: string) => {
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

  // Action: Approve Evidence
  const handleConfirmApproval = async () => {
    setSubmittingAction(true);
    setActionSuccessMsg(null);
    try {
      const res = await fetch(`/api/authority/evidence/${incidentData.incident.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPROVE' }),
      });

      const json = await res.json();
      if (json.success) {
        setActionSuccessMsg('✓ Evidence approved. Complaint marked as resolved.');
        setShowApproveModal(false);
        fetchEvidenceDetail();
      } else {
        alert(json.error?.message || 'Failed to approve evidence.');
      }
    } catch (err) {
      console.error('Error approving evidence:', err);
      alert('Network error during approval.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Action: Reject Evidence
  const handleConfirmRejection = async () => {
    if (!rejectionReasonInput.trim()) {
      alert('Please enter a rejection reason.');
      return;
    }

    setSubmittingAction(true);
    setActionSuccessMsg(null);
    try {
      const res = await fetch(`/api/authority/evidence/${incidentData.incident.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REJECT',
          rejectionReason: rejectionReasonInput.trim(),
        }),
      });

      const json = await res.json();
      if (json.success) {
        setActionSuccessMsg('⚠️ Evidence rejected and sent back to worker with feedback.');
        setShowRejectModal(false);
        setRejectionReasonInput('');
        fetchEvidenceDetail();
      } else {
        alert(json.error?.message || 'Failed to reject evidence.');
      }
    } catch (err) {
      console.error('Error rejecting evidence:', err);
      alert('Network error during rejection.');
    } finally {
      setSubmittingAction(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-slate-200">
        <div className="h-8 w-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <div className="text-xs font-bold text-slate-500">Loading field evidence for authority review...</div>
      </div>
    );
  }

  if (error || !incidentData) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 space-y-5">
        <div className="p-6 rounded-3xl bg-rose-50 border-2 border-rose-200 text-rose-900 space-y-3">
          <div className="flex items-center gap-2 text-rose-700 font-black text-base">
            <AlertTriangle className="h-6 w-6 text-rose-600" />
            <span>Evidence Review Error</span>
          </div>
          <p className="text-xs font-semibold leading-relaxed text-rose-800">{error}</p>
        </div>

        <Link href="/authority/evidence">
          <Button className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Evidence Approval</span>
          </Button>
        </Link>
      </div>
    );
  }

  const { incident, reports, resolutionEvidence, auditLogs } = incidentData;
  const caseId = incident.case_id || incident.caseId;
  const mainReport = reports && reports.length > 0 ? reports[0] : null;

  const beforePhoto = incident.before_photo_url || mainReport?.image_url || incident.imageUrl;
  const afterPhoto = resolutionEvidence?.proof_image_url || incident.after_photo_url;

  const hasBeforePhoto = Boolean(beforePhoto && beforePhoto !== '/images/officer_command.jpg');
  const hasAfterPhoto = Boolean(afterPhoto && afterPhoto !== '/images/officer_command.jpg');

  const status = incident.status || 'SUBMITTED';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* NAV BACK & CASE ID */}
      <div className="flex items-center justify-between">
        <Link href="/authority/evidence">
          <Button variant="outline" className="text-xs font-bold rounded-xl gap-2 border-slate-200 bg-white">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Evidence Approval</span>
          </Button>
        </Link>
        <span className="font-mono font-black text-xs text-sky-700 bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
          Case ID: #{caseId}
        </span>
      </div>

      {/* SUCCESS TOAST BANNER */}
      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs font-bold text-emerald-900 flex items-center justify-between shadow-xs">
          <span>{actionSuccessMsg}</span>
          <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-700 font-bold hover:text-emerald-950">
            ✕
          </button>
        </div>
      )}

      {/* STATUS BANNER */}
      {status === 'WAITING_FOR_APPROVAL' && (
        <div className="p-5 rounded-3xl bg-amber-50 border-2 border-amber-300 text-amber-950 space-y-2 shadow-xs">
          <div className="flex items-center gap-2.5 font-black text-sm text-amber-900">
            <Clock className="h-5 w-5 text-amber-600 animate-pulse" />
            <span>🟡 PENDING OFFICER REVIEW & VERIFICATION</span>
          </div>
          <p className="text-xs font-medium text-amber-800 leading-relaxed">
            Field worker has submitted completion evidence. Review before/after photos and field notes below, then approve to mark complaint as resolved or reject to request rework.
          </p>
        </div>
      )}

      {(status === 'RESOLVED' || status === 'VERIFIED') && (
        <div className="p-5 rounded-3xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 space-y-2 shadow-xs">
          <div className="flex items-center gap-2.5 font-black text-sm text-emerald-900">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span>🟢 EVIDENCE APPROVED & COMPLAINT RESOLVED</span>
          </div>
          <p className="text-xs font-medium text-emerald-800 leading-relaxed">
            Approved by {incident.resolved_by || 'Authority Officer'} on {formatDate(incident.resolved_at)}. Complaint is resolved globally across Authority, Worker, and Citizen portals.
          </p>
        </div>
      )}

      {status === 'EVIDENCE_REJECTED' && (
        <div className="p-5 rounded-3xl bg-rose-50 border-2 border-rose-300 text-rose-950 space-y-2 shadow-xs">
          <div className="flex items-center gap-2.5 font-black text-sm text-rose-900">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
            <span>🔴 EVIDENCE REJECTED</span>
          </div>
          {incident.rejection_reason && (
            <div className="p-3 bg-white/80 rounded-xl border border-rose-200 text-xs font-bold text-rose-900">
              Rejection Reason: &quot;{incident.rejection_reason}&quot;
            </div>
          )}
          <p className="text-xs font-medium text-rose-800 leading-relaxed">
            Rejected by {incident.rejected_by || 'Authority Officer'} on {formatDate(incident.rejected_at)}. Worker can resubmit corrected evidence.
          </p>
        </div>
      )}

      {/* COMPLAINT OVERVIEW CARD */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-4">
          <div>
            <span className="text-[11px] font-extrabold text-orange-600 uppercase tracking-wider">Complaint Title</span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">{incident.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              {incident.departmentName || 'Department'}
            </span>
          </div>
        </div>

        {/* METADATA GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="space-y-1 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase">Case ID</span>
            <div className="font-mono font-black text-slate-900">#{caseId}</div>
          </div>
          <div className="space-y-1 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase">Priority Score</span>
            <div className="font-black text-rose-600">{incident.priority_score || incident.priorityScore || 75} / 100</div>
          </div>
          <div className="space-y-1 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase">Assigned Worker</span>
            <div className="font-extrabold text-orange-600 truncate">
              {incident.evidence_submitted_by || incident.accepted_by || 'Field Worker'}
            </div>
          </div>
          <div className="space-y-1 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase">Submitted Date</span>
            <div className="font-bold text-slate-800 font-mono text-[11px]">
              {formatDate(incident.evidence_submitted_at || resolutionEvidence?.created_at)}
            </div>
          </div>
        </div>

        {/* CITIZEN DESCRIPTION */}
        <div className="space-y-1.5 pt-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Original Citizen Description</span>
          <p className="text-xs text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200 font-medium leading-relaxed">
            {mainReport?.raw_description || mainReport?.rawDescription || incident.summary}
          </p>
        </div>
      </div>

      {/* PHOTO EVIDENCE COMPARISON (SIDE-BY-SIDE DESKTOP, STACKED MOBILE) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5 shadow-xs">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Camera className="h-5 w-5 text-orange-500" />
          <h2 className="text-base font-black text-slate-900">Photo Evidence Comparison</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* BEFORE PHOTO */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-slate-700 uppercase tracking-wider">Before Photo</span>
              <span className="text-[11px] font-bold text-slate-400">Citizen Report Image</span>
            </div>
            <div className="relative h-64 w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
              {hasBeforePhoto ? (
                <Image src={beforePhoto} alt="Before repair photo" fill className="object-cover" />
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 space-y-1.5 p-4 text-center">
                  <ImageOff className="h-8 w-8 text-slate-300" />
                  <span className="text-xs font-semibold">No before photo provided</span>
                </div>
              )}
            </div>
          </div>

          {/* AFTER PHOTO */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-orange-600 uppercase tracking-wider">After Photo (Proof)</span>
              <span className="text-[11px] font-bold text-orange-500">Worker Submitted Evidence</span>
            </div>
            <div className="relative h-64 w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
              {hasAfterPhoto ? (
                <Image src={afterPhoto} alt="After repair evidence photo" fill className="object-cover" />
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 space-y-1.5 p-4 text-center">
                  <ImageOff className="h-8 w-8 text-slate-300" />
                  <span className="text-xs font-semibold">No resolution proof photo uploaded</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* WORKER FIELD NOTES */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3 shadow-xs">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <FileText className="h-5 w-5 text-orange-500" />
          <h2 className="text-base font-black text-slate-900">Worker Field Notes</h2>
        </div>
        <p className="text-xs text-slate-800 font-medium leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200 italic">
          &quot;{resolutionEvidence?.resolution_notes || incident.worker_notes || 'Work completed as assigned. Quality check finalized.'}&quot;
        </p>
      </div>

      {/* GPS LOCATION VERIFICATION */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-orange-500" />
            <h2 className="text-base font-black text-slate-900">GPS Location Verification</h2>
          </div>
          {incident.latitude && incident.longitude && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${incident.latitude},${incident.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="text-xs font-bold rounded-xl h-8 gap-1.5 border-slate-200">
                <span>View on Maps</span>
                <ExternalLink className="h-3 w-3 text-slate-400" />
              </Button>
            </a>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Address</span>
            <div className="font-bold text-slate-800 line-clamp-2">{incident.address || 'Address provided on spatial map'}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Latitude</span>
            <div className="font-mono font-bold text-slate-800">{incident.latitude}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Longitude</span>
            <div className="font-mono font-bold text-slate-800">{incident.longitude}</div>
          </div>
        </div>
      </div>

      {/* EVIDENCE ATTEMPT HISTORY LOG */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-orange-500" />
            <h2 className="text-base font-black text-slate-900">Evidence Submission History</h2>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase">
            {resolutionEvidence?.attempts?.length || 1} Attempt(s)
          </span>
        </div>

        <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {resolutionEvidence?.attempts && resolutionEvidence.attempts.length > 0 ? (
            resolutionEvidence.attempts.map((attempt: any, idx: number) => (
              <div key={idx} className="relative pl-8 space-y-1 text-xs">
                <div className={`absolute left-1 top-1 h-4.5 w-4.5 rounded-full border-2 border-white ring-2 ring-slate-100 ${
                  attempt.status === 'APPROVED' ? 'bg-emerald-500' : attempt.status === 'REJECTED' ? 'bg-rose-500' : 'bg-amber-500'
                }`} />
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900">Evidence Attempt #{attempt.attemptNumber || idx + 1}</span>
                  <span className="text-[10px] font-mono text-slate-400">{formatDate(attempt.submittedAt)}</span>
                </div>
                <p className="text-[11px] text-slate-600 font-medium">Notes: &quot;{attempt.notes}&quot;</p>
                {attempt.rejectionReason && (
                  <p className="text-[11px] text-rose-700 font-bold bg-rose-50 p-2 rounded-lg border border-rose-100">
                    Rejection Reason: &quot;{attempt.rejectionReason}&quot; (Reviewed by {attempt.reviewedBy})
                  </p>
                )}
                {attempt.status === 'APPROVED' && (
                  <p className="text-[11px] text-emerald-700 font-bold">
                    ✓ Approved by {attempt.reviewedBy || 'Authority Officer'} on {formatDate(attempt.reviewedAt)}
                  </p>
                )}
              </div>
            ))
          ) : (
            <div className="relative pl-8 space-y-1 text-xs">
              <div className="absolute left-1 top-1 h-4.5 w-4.5 rounded-full bg-amber-500 ring-4 ring-white" />
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900">Evidence Attempt #1</span>
                <span className="text-[10px] font-mono text-slate-400">
                  {formatDate(incident.evidence_submitted_at || resolutionEvidence?.created_at)}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium">
                Submitted by {incident.evidence_submitted_by || 'Field Worker'}.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* AUTHORITY ACTION BUTTON BAR */}
      {status !== 'RESOLVED' && status !== 'VERIFIED' && (
        <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div>
            <h3 className="text-sm font-black text-slate-900">Officer Evidence Decision</h3>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Review photos, notes, and GPS above before approving resolution or rejecting.
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              onClick={() => setShowRejectModal(true)}
              disabled={submittingAction}
              className="flex-1 sm:flex-none h-12 px-6 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs rounded-2xl border-2 border-rose-200 gap-2 transition-colors"
            >
              <X className="h-4 w-4 text-rose-600" />
              <span>✕ Reject Evidence</span>
            </Button>
            <Button
              onClick={() => setShowApproveModal(true)}
              disabled={submittingAction}
              className="flex-1 sm:flex-none h-12 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-2xl shadow-lg shadow-emerald-600/20 gap-2 transition-transform active:scale-95"
            >
              <Check className="h-4 w-4" />
              <span>✓ Approve Evidence</span>
            </Button>
          </div>
        </div>
      )}

      {/* CONFIRM APPROVAL MODAL */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="text-base font-black text-slate-900">Approve Evidence?</h3>
              </div>
              <button onClick={() => setShowApproveModal(false)} className="text-slate-400 hover:text-slate-600 font-bold p-1">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-700 font-medium leading-relaxed">
              Are you sure this evidence confirms that the work has been completed satisfactorily? Approving will mark complaint <strong className="text-slate-900">#{caseId}</strong> as <strong className="text-emerald-700">RESOLVED</strong> across all portals.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowApproveModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApproval}
                disabled={submittingAction}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-xs transition-colors"
              >
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT EVIDENCE MODAL */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-100 text-rose-700 border border-rose-200">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <h3 className="text-base font-black text-slate-900">Reject Evidence</h3>
              </div>
              <button onClick={() => setShowRejectModal(false)} className="text-slate-400 hover:text-slate-600 font-bold p-1">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="font-extrabold text-slate-800 block">Reason for Rejection *</label>
              <p className="text-[11px] text-slate-500 leading-normal">
                Please provide clear instructions for the field worker on why the evidence is rejected and what needs fixing.
              </p>
              <textarea
                rows={3}
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                placeholder='Example: "After photo does not clearly show the completed repair."'
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 placeholder:text-slate-400"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRejection}
                disabled={submittingAction}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-xs transition-colors"
              >
                Reject Evidence
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
