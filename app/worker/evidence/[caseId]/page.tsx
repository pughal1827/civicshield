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
  Building,
  UserCheck,
  Calendar,
  FileText,
  Navigation,
  ExternalLink,
  ShieldAlert,
  ImageOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WorkerEvidenceDetailPageProps {
  params: Promise<{ caseId: string }>;
}

export default function WorkerEvidenceDetailPage({ params }: WorkerEvidenceDetailPageProps) {
  const { caseId: caseIdParam } = use(params);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [incident, setIncident] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [evidence, setEvidence] = useState<any>(null);
  const [workerDept, setWorkerDept] = useState<any>(null);

  const fetchEvidenceDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/worker/incidents/${caseIdParam}`);
      const json = await res.json();

      if (res.status === 403) {
        setError(json.error?.message || 'Access Denied: This complaint belongs to a different department.');
        return;
      }

      if (!res.ok || !json.success) {
        setError(json.error?.message || `Evidence record '${caseIdParam}' not found.`);
        return;
      }

      setIncident(json.data.incident);
      setReports(json.data.reports || []);
      setEvidence(json.data.evidence);
      setWorkerDept(json.data.workerDepartment);
    } catch (err) {
      console.error('Error fetching evidence detail:', err);
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvidenceDetail();
  }, [caseIdParam]);

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return 'Not Recorded';
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
      <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-slate-200">
        <div className="h-8 w-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <div className="text-xs font-bold text-slate-500">Loading evidence record details...</div>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 space-y-5">
        <div className="p-6 rounded-3xl bg-rose-50 border-2 border-rose-200 text-rose-900 space-y-3">
          <div className="flex items-center gap-2 text-rose-700 font-black text-base">
            <ShieldAlert className="h-6 w-6 text-rose-600" />
            <span>Department Access Restricted</span>
          </div>
          <p className="text-xs font-semibold leading-relaxed text-rose-800">{error || 'Evidence record not found.'}</p>
        </div>

        <Link href="/worker/evidence">
          <Button className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Evidence Vault</span>
          </Button>
        </Link>
      </div>
    );
  }

  const caseId = incident.caseId || incident.case_id || `CS-${incident.id.substring(0, 4)}`;
  const status = incident.status || 'SUBMITTED';

  // Extract photo URLs
  const beforePhoto = incident.before_photo_url || incident.imageUrl;
  const afterPhoto = evidence?.proof_image_url || incident.after_photo_url || incident.afterPhoto;

  const hasBeforePhoto = beforePhoto && beforePhoto !== '/images/officer_command.jpg';
  const hasAfterPhoto = afterPhoto && afterPhoto !== '/images/officer_command.jpg';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* NAV BACK */}
      <div className="flex items-center justify-between">
        <Link href="/worker/evidence">
          <Button variant="outline" className="text-xs font-bold rounded-xl gap-2 border-slate-200 bg-white">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Evidence Vault</span>
          </Button>
        </Link>
        <span className="font-extrabold text-xs text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
          {caseId}
        </span>
      </div>

      {/* STATUS BANNER */}
      {status === 'WAITING_FOR_APPROVAL' && (
        <div className="p-5 rounded-3xl bg-amber-50 border-2 border-amber-200 text-amber-900 space-y-2 shadow-xs">
          <div className="flex items-center gap-2.5 font-black text-sm text-amber-800">
            <Clock className="h-5 w-5 text-amber-600 animate-pulse" />
            <span>WAITING FOR AUTHORITY APPROVAL</span>
          </div>
          <p className="text-xs font-medium text-amber-700 leading-relaxed">
            Field resolution evidence has been submitted by worker. Pending formal review and approval by Authority Officer.
          </p>
        </div>
      )}

      {(status === 'RESOLVED' || status === 'VERIFIED') && (
        <div className="p-5 rounded-3xl bg-emerald-50 border-2 border-emerald-200 text-emerald-900 space-y-2 shadow-xs">
          <div className="flex items-center gap-2.5 font-black text-sm text-emerald-800">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span>✓ APPROVED / RESOLVED</span>
          </div>
          <p className="text-xs font-medium text-emerald-700 leading-relaxed">
            Authority Officer has verified and approved the field work evidence. Case is officially resolved and closed.
          </p>
        </div>
      )}

      {status === 'EVIDENCE_REJECTED' && (
        <div className="p-5 rounded-3xl bg-rose-50 border-2 border-rose-200 text-rose-900 space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5 font-black text-sm text-rose-800">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
            <span>⚠️ EVIDENCE REJECTED BY AUTHORITY</span>
          </div>
          {incident.rejection_reason && (
            <div className="p-3 bg-white/80 rounded-xl border border-rose-200 text-xs font-bold text-rose-900">
              Feedback Reason: &quot;{incident.rejection_reason}&quot;
            </div>
          )}
          <p className="text-xs font-medium text-rose-700 leading-relaxed">
            The authority officer rejected the submitted evidence. You can return to the job page to resubmit updated work photos.
          </p>
          <Link href={`/worker/jobs/${incident.id}`}>
            <Button className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl h-8 gap-2 mt-1">
              <span>Go to Job Page to Resubmit</span>
            </Button>
          </Link>
        </div>
      )}

      {/* CASE OVERVIEW CARD */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-4">
          <div>
            <span className="text-[11px] font-extrabold text-orange-600 uppercase tracking-wider">Complaint Title</span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">{incident.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              {incident.departmentName || workerDept?.name || 'Department'}
            </span>
          </div>
        </div>

        {/* METADATA GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="space-y-1 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase">Case ID</span>
            <div className="font-black text-slate-900">{caseId}</div>
          </div>
          <div className="space-y-1 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase">Status</span>
            <div className="font-extrabold text-slate-900">{status.replace(/_/g, ' ')}</div>
          </div>
          <div className="space-y-1 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase">Submitted By</span>
            <div className="font-extrabold text-slate-900">
              {incident.evidence_submitted_by || incident.accepted_by || 'Assigned Worker'}
            </div>
          </div>
          <div className="space-y-1 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase">Department</span>
            <div className="font-extrabold text-slate-900 line-clamp-1">
              {incident.departmentName || workerDept?.name || 'Municipal Dept'}
            </div>
          </div>
        </div>
      </div>

      {/* WORKFLOW TIMESTAMPS CARD */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Calendar className="h-5 w-5 text-orange-500" />
          <h2 className="text-base font-black text-slate-900">Workflow Timestamps</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned Date & Time</span>
            <div className="font-bold text-slate-800">{formatDate(incident.assigned_at || incident.created_at)}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Accepted Date & Time</span>
            <div className="font-bold text-slate-800">{formatDate(incident.accepted_at)}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Work Started Date & Time</span>
            <div className="font-bold text-slate-800">{formatDate(incident.started_at)}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-orange-50 border border-orange-200 space-y-1">
            <span className="text-[10px] font-extrabold text-orange-600 uppercase">Evidence Submitted</span>
            <div className="font-black text-orange-900">{formatDate(incident.evidence_submitted_at || evidence?.created_at)}</div>
          </div>
        </div>
      </div>

      {/* PHOTO EVIDENCE SIDE-BY-SIDE */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Camera className="h-5 w-5 text-orange-500" />
          <h2 className="text-base font-black text-slate-900">Photo Evidence Comparison</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* BEFORE PHOTO */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-slate-700 uppercase tracking-wider">Before Work</span>
              <span className="text-[11px] font-bold text-slate-400">Initial Complaint Photo</span>
            </div>
            <div className="relative h-64 w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
              {hasBeforePhoto ? (
                <Image src={beforePhoto} alt="Before work photo" fill className="object-cover" />
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 space-y-1.5 p-4 text-center">
                  <ImageOff className="h-8 w-8 text-slate-300" />
                  <span className="text-xs font-semibold">No before photo available</span>
                </div>
              )}
            </div>
          </div>

          {/* AFTER PHOTO */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-orange-600 uppercase tracking-wider">After Work (Proof)</span>
              <span className="text-[11px] font-bold text-orange-500">Field Resolution Evidence</span>
            </div>
            <div className="relative h-64 w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
              {hasAfterPhoto ? (
                <Image src={afterPhoto} alt="After work evidence photo" fill className="object-cover" />
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
        <p className="text-xs text-slate-700 font-medium leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200 italic">
          &quot;{evidence?.resolution_notes || incident.worker_notes || 'Work completed as instructed. Field patch and quality checks finalized.'}&quot;
        </p>
      </div>

      {/* GPS LOCATION & MAP LINK */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-orange-500" />
            <h2 className="text-base font-black text-slate-900">GPS Location Verification</h2>
          </div>
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
    </div>
  );
}
