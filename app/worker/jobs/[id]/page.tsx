'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  HardHat,
  ArrowLeft,
  MapPin,
  Clock,
  Wrench,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Shield,
  FileText,
  UserCheck,
  Check,
  Sparkles,
  ExternalLink,
  Navigation
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface JobDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function WorkerJobDetailPage({ params }: JobDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [incident, setIncident] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [evidence, setEvidence] = useState<any>(null);
  const [workerDept, setWorkerDept] = useState<any>(null);

  const [uploading, setUploading] = useState(false);
  const [proofPhotoUrl, setProofPhotoUrl] = useState<string | null>(null);
  const [workerNotes, setWorkerNotes] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchJobDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/worker/incidents/${id}`);
      const json = await res.json();

      if (res.status === 403) {
        setError(json.error?.message || 'Access Denied: This complaint belongs to a different department.');
        return;
      }

      if (!res.ok || !json.success) {
        setError(json.error?.message || `Complaint '${id}' not found.`);
        return;
      }

      setIncident(json.data.incident);
      setReports(json.data.reports || []);
      setAiAnalysis(json.data.aiAnalysis);
      setEvidence(json.data.evidence);
      setWorkerDept(json.data.workerDepartment);
      if (json.data.evidence?.proof_image_url) {
        setProofPhotoUrl(json.data.evidence.proof_image_url);
      }
    } catch (err) {
      console.error('Error fetching job detail:', err);
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobDetail();
  }, [id]);

  const handleAcceptJob = async () => {
    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/worker/incidents/${id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ACCEPT' }),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess('Job accepted successfully! Status updated to IN PROGRESS.');
        fetchJobDetail();
      } else {
        alert(json.error?.message || 'Failed to accept job.');
      }
    } catch {
      alert('Network error.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      const url = URL.createObjectURL(file);
      setTimeout(() => {
        setProofPhotoUrl(url);
        setUploading(false);
      }, 700);
    }
  };

  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofPhotoUrl && !evidence?.proof_image_url) {
      alert('Please take or upload a resolution proof photo.');
      return;
    }

    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/worker/incidents/${id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SUBMIT_EVIDENCE',
          afterPhotoUrl: proofPhotoUrl || '/images/officer_command.jpg',
          beforePhotoUrl: incident?.imageUrl || '/images/citizen_reporting.jpg',
          workerNotes,
          latitude: incident?.latitude,
          longitude: incident?.longitude,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess('Resolution evidence submitted successfully! Complaint is now WORK COMPLETED (Awaiting Authority Verification).');
        fetchJobDetail();
      } else {
        alert(json.error?.message || 'Failed to submit evidence.');
      }
    } catch {
      alert('Network error.');
    } finally {
      setSubmittingAction(false);
    }
  };

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

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="h-8 w-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <div className="text-xs font-bold text-slate-500">Loading job details & authorization...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 space-y-5">
        <div className="p-6 rounded-3xl bg-rose-50 border-2 border-rose-200 text-rose-900 space-y-3">
          <div className="flex items-center gap-2 text-rose-700 font-black text-base">
            <AlertTriangle className="h-6 w-6 text-rose-600" />
            <span>403 Forbidden — Department Access Denied</span>
          </div>
          <p className="text-xs font-semibold leading-relaxed text-rose-800">{error}</p>
        </div>

        <Link href="/worker/dashboard">
          <Button className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Return to My Department Dashboard</span>
          </Button>
        </Link>
      </div>
    );
  }

  const caseId = incident.caseId || incident.case_id || `CS-${incident.id.substring(0, 4)}`;
  const pScore = incident.priorityScore || incident.priority_score || 50;

  return (
    <div className="space-y-6">
      
      {/* TOP NAV BAR */}
      <div className="flex items-center justify-between">
        <Link href="/worker/dashboard">
          <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 text-xs font-extrabold gap-1.5 rounded-xl">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Button>
        </Link>

        <div className="flex items-center gap-2 text-xs font-extrabold text-orange-700 bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-200">
          <Shield className="h-4 w-4 text-orange-600" />
          <span>Department: {workerDept?.name || workerDept?.code || incident.departmentName}</span>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* JOB HEADER CARD */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-orange-600 bg-orange-100 px-3 py-1 rounded-full border border-orange-200">
                {caseId}
              </span>
              <span className="text-xs font-extrabold text-slate-500">Category: {incident.category}</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 mt-2">{incident.title}</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="block text-[11px] font-bold text-slate-400">Priority Score</span>
              <span className="text-lg font-black text-rose-600">{pScore} / 100</span>
            </div>

            <div
              className={`px-3 py-1.5 rounded-full font-black text-xs ${
                incident.status === 'COMPLETED' || incident.status === 'WORK_COMPLETED' || incident.status === 'RESOLVED'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : incident.status === 'IN_PROGRESS' || incident.status === 'WORKER_ACCEPTED'
                  ? 'bg-sky-100 text-sky-800 border border-sky-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              {incident.status.replace(/_/g, ' ')}
            </div>
          </div>
        </div>

        {/* DETAILS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs pt-2">
          
          {/* Left: Citizen Description & Photo */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="font-extrabold text-slate-700 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-orange-500" />
                Citizen Complaint Description
              </label>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed font-medium">
                {incident.summary || incident.raw_description || reports[0]?.raw_description || 'No description provided.'}
              </div>
            </div>

            {/* Citizen Original Photo */}
            <div className="space-y-1.5">
              <label className="font-extrabold text-slate-700 flex items-center gap-1.5">
                <Camera className="h-4 w-4 text-orange-500" />
                Original Citizen Photo
              </label>
              <div className="relative h-56 w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                <Image
                  src={incident.imageUrl || reports[0]?.image_url || '/images/citizen_reporting.jpg'}
                  alt="Citizen reported issue photo"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>

          {/* Right: Location, Timestamps & Actions */}
          <div className="space-y-4">
            
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="font-extrabold text-slate-900 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-orange-500" />
                Location & Navigation
              </div>

              <div className="text-slate-700 font-bold leading-snug">{incident.address}</div>

              {incident.latitude && incident.longitude && (
                <div className="text-[11px] text-slate-500 font-mono">
                  GPS: {incident.latitude}, {incident.longitude}
                </div>
              )}

              {incident.latitude && incident.longitude && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${incident.latitude},${incident.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-orange-600 text-white font-extrabold text-xs transition-colors"
                >
                  <Navigation className="h-4 w-4" />
                  <span>Open Navigation in Google Maps</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-slate-600 font-medium">
              <div className="flex items-center justify-between">
                <span>Reported Date:</span>
                <span className="font-bold text-slate-900">{formatDate(incident.createdAt || incident.created_at)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Assigned Department:</span>
                <span className="font-bold text-orange-700">{workerDept?.name || incident.departmentName || 'Your Department'}</span>
              </div>
            </div>

            {/* Accept Job Button if not yet in progress */}
            {incident.status !== 'IN_PROGRESS' && incident.status !== 'WORK_COMPLETED' && incident.status !== 'RESOLVED' && (
              <Button
                onClick={handleAcceptJob}
                disabled={submittingAction}
                className="w-full h-12 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-2xl shadow-md gap-2"
              >
                <Wrench className="h-4 w-4" />
                <span>Accept Job & Start Repairs →</span>
              </Button>
            )}

          </div>

        </div>
      </div>

      {/* FIELD ACTION & ON-GROUND EVIDENCE SUBMISSION PANEL */}
      <form onSubmit={handleSubmitEvidence} className="bg-white p-6 rounded-3xl border-2 border-orange-200 shadow-md space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">FIELD ACTION & ON-GROUND EVIDENCE SUBMISSION</h3>
              <p className="text-xs text-slate-500 font-medium">Upload photo evidence to mark work completed</p>
            </div>
          </div>
          <span className="text-xs font-black px-3 py-1 rounded-full bg-orange-100 text-orange-800">
            Worker Verification
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Photo Evidence Uploader */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-slate-700 flex items-center gap-2">
              <Camera className="h-4 w-4 text-orange-600" />
              Upload After / Resolution Photo Evidence *
            </label>

            <label className="w-full h-52 border-2 border-dashed border-orange-300 hover:border-orange-500 bg-orange-50/40 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group">
              {proofPhotoUrl ? (
                <Image src={proofPhotoUrl} alt="Submitted evidence" fill className="object-cover" />
              ) : (
                <div className="text-center p-4 space-y-2">
                  <Upload className="h-8 w-8 text-orange-500 mx-auto" />
                  <span className="text-xs font-extrabold text-orange-600 block">
                    {uploading ? 'Uploading Photo...' : '📷 Take Photo or 🖼️ Upload File'}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Select real repair completion image
                  </span>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>
          </div>

          {/* Worker Field Notes & GPS Timestamp */}
          <div className="space-y-4 flex flex-col justify-between">
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700">Worker Field Notes & Resolution Details</label>
              <textarea
                rows={4}
                value={workerNotes}
                onChange={(e) => setWorkerNotes(e.target.value)}
                placeholder="Describe on-ground work done, materials replaced, equipment used, and final safety checks..."
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white"
              />
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1 font-medium">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Automatic Evidence Telemetry:
              </div>
              <div>• Timestamp: {new Date().toLocaleString()}</div>
              <div>• Worker ID: {workerDept?.code || 'WORKER'}</div>
              <div>• Workflow State: WORK COMPLETED / AWAITING VERIFICATION</div>
            </div>

            <Button
              type="submit"
              disabled={submittingAction}
              className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-orange-500/25 gap-2"
            >
              {submittingAction ? (
                <span>Submitting Evidence...</span>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Submit Evidence & Mark Work Completed →</span>
                </>
              )}
            </Button>
          </div>

        </div>
      </form>

    </div>
  );
}
