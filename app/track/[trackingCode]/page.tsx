'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Building2, 
  Check, 
  X, 
  AlertCircle,
  RotateCcw,
  Maximize2,
  Minimize2,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { LoadingState } from '@/components/ui/loading-state';
import { IncidentMap } from '@/components/maps/incident-map';
import { ToastNotification } from '@/components/ui/toast';

export default function CitizenStatusPage({ params }: { params: Promise<{ trackingCode: string }> }) {
  const resolvedParams = use(params);
  const trackingCode = resolvedParams.trackingCode;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  // Verification UI State
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const [toast, setToast] = useState<{ id: string; type: 'success' | 'error' | 'warning'; title: string; message?: string } | null>(null);

  const statusExplanations: Record<string, string> = {
    'SUBMITTED': 'We received your report.',
    'AI_ANALYSED': 'Our system analysed the issue.',
    'ASSIGNED': 'Your report was sent to the responsible department.',
    'IN_PROGRESS': 'Work is currently being carried out.',
    'RESOLVED': 'The department has marked this issue as fixed.',
    'VERIFIED': 'The resolution was confirmed.',
  };

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/track?code=${encodeURIComponent(trackingCode)}`);
      const json = await res.json();

      if (json.success) {
        setData(json.data);
      } else {
        setToast({ id: '1', type: 'error', title: 'Lookup Failed', message: json.error?.message || 'Report not found.' });
      }
    } catch (err) {
      console.error('Error fetching tracking status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (trackingCode) {
      fetchStatus();
    }
  }, [trackingCode]);

  // Handle Citizen Verification (ACCEPT vs REJECT)
  const handleVerification = async (action: 'ACCEPT' | 'REJECT') => {
    if (action === 'REJECT' && !rejectReason.trim()) {
      alert('Please explain what is still wrong before submitting.');
      return;
    }

    setVerifying(true);
    try {
      const res = await fetch('/api/incidents/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackingCode: data.trackingCode,
          action,
          feedback: action === 'ACCEPT' ? 'Citizen verified repair completed.' : rejectReason.trim(),
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowAcceptConfirm(false);
        setShowRejectForm(false);
        setRejectReason('');
        setToast({
          id: Date.now().toString(),
          type: 'success',
          title: action === 'ACCEPT' ? 'Thank you for confirming' : 'Issue Reopened',
          message: action === 'ACCEPT' ? 'The report is now closed.' : 'The issue has been reopened for further action.',
        });
        fetchStatus();
      } else {
        setToast({ id: Date.now().toString(), type: 'error', title: 'Verification Error', message: json.error?.message });
      }
    } catch (err) {
      console.error('Error verifying resolution:', err);
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 flex items-center justify-center">
        <LoadingState message="Looking up complaint status timeline..." />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 flex flex-col items-center justify-center text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-rose-400" />
        <h2 className="text-xl font-bold text-slate-100">Tracking Record Not Found</h2>
        <p className="text-xs text-slate-400 max-w-sm">
          No matching complaint found for tracking code "{trackingCode}". Please check your code and try again.
        </p>
        <Link href="/track">
          <Button variant="outline" className="min-h-[44px]">Back to Tracking Search</Button>
        </Link>
      </div>
    );
  }

  const isResolvedOrVerifying = ['RESOLVED', 'CITIZEN_VERIFICATION', 'VERIFIED'].includes(data.status);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 my-4">
      {/* Lightbox Image Preview Modal */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full">
            <img src={lightboxImage} alt="Expanded Evidence" className="w-full h-auto max-h-[80vh] object-contain rounded-2xl border border-slate-800" />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-slate-950/80 text-white hover:bg-slate-900 border border-slate-700"
            >
              <Minimize2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Toast Banner */}
      {toast && (
        <div className="fixed top-20 right-4 z-50">
          <ToastNotification {...toast} onDismiss={() => setToast(null)} />
        </div>
      )}

      {/* Header Navigation */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <Link href="/track">
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-200 min-h-[44px]">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Search
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-slate-400">Case ID:</span>
          <span className="font-mono text-base font-bold text-emerald-400">{data.caseId}</span>
        </div>
      </div>

      {/* Responsive 2-Column Grid for Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column (2 Cols wide on Desktop) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Overview Card */}
          <Card variant="glass" className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="cyan">{data.category.replace('_', ' ')}</Badge>
                  <StatusBadge status={data.status} />
                </div>
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">{data.title}</h1>
              </div>
              <div className="text-left sm:text-right text-xs text-slate-400">
                <span>Submitted: {new Date(data.submittedAt).toLocaleDateString()}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
              "{data.rawDescription}"
            </p>

            {data.imageUrl && (
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">Attached Photo Evidence:</span>
                <div className="relative group cursor-pointer max-w-sm" onClick={() => setLightboxImage(data.imageUrl)}>
                  <img src={data.imageUrl} alt="Submitted Evidence" className="h-44 w-full object-cover rounded-xl border border-slate-800" />
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs text-white gap-1 rounded-xl">
                    <Maximize2 className="h-4 w-4" /> Tap to expand
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Dedicated Resolution & Verification Section */}
          {isResolvedOrVerifying && (
            <Card variant="glass" className="border-emerald-800/80 bg-emerald-950/20 p-5 sm:p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-emerald-900/60 pb-3">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-base">
                  <CheckCircle2 className="h-5 w-5" /> Resolution Evidence & Proof
                </div>
                <Badge variant="emerald">{data.status.replace('_', ' ')}</Badge>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                The department has marked this issue as resolved. Please check the evidence and confirm whether the problem is actually fixed.
              </p>

              {data.resolutionEvidence ? (
                <div className="space-y-3 text-xs text-slate-300 bg-slate-950/90 p-4 rounded-xl border border-emerald-900/60">
                  <p>
                    <span className="font-semibold text-emerald-400">Repair Notes:</span> {data.resolutionEvidence.resolution_notes}
                  </p>

                  {data.resolutionEvidence.proof_image_url && (
                    <div className="space-y-1 pt-1">
                      <span className="font-semibold text-slate-400 text-[11px] block">Proof of Repair Photo:</span>
                      <div className="relative group cursor-pointer max-w-sm" onClick={() => setLightboxImage(data.resolutionEvidence.proof_image_url)}>
                        <img src={data.resolutionEvidence.proof_image_url} alt="Proof of Repair" className="h-48 w-full object-cover rounded-xl border border-emerald-800" />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs text-white gap-1 rounded-xl">
                          <Maximize2 className="h-4 w-4" /> Tap to expand
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                  Field officer marked work completed. Proof image pending upload.
                </p>
              )}

              {/* Interactive Verification Controls */}
              {data.status !== 'VERIFIED' ? (
                <div className="p-5 bg-slate-950 border border-emerald-800/60 rounded-2xl space-y-4">
                  {!showAcceptConfirm && !showRejectForm && (
                    <>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white">Was this issue actually resolved to your satisfaction?</h4>
                        <p className="text-xs text-slate-400">
                          Please verify if the field repair was completed properly.
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-3">
                        <Button
                          size="lg"
                          variant="primary"
                          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 font-bold min-h-[48px] px-6 text-sm"
                          onClick={() => setShowAcceptConfirm(true)}
                        >
                          <Check className="h-5 w-5 mr-1.5" /> Yes, it's fixed
                        </Button>
                        <Button
                          size="lg"
                          variant="outline"
                          className="w-full sm:w-auto border-rose-800 text-rose-300 hover:bg-rose-950 font-bold min-h-[48px] px-6 text-sm"
                          onClick={() => setShowRejectForm(true)}
                        >
                          <X className="h-5 w-5 mr-1.5" /> No, the problem still exists
                        </Button>
                      </div>
                    </>
                  )}

                  {/* Accept Confirmation Flow */}
                  {showAcceptConfirm && (
                    <div className="space-y-4 p-4 bg-emerald-950/40 border border-emerald-800 rounded-xl animate-in fade-in duration-200">
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-emerald-300">Are you sure the issue has been fixed?</h4>
                        <p className="text-xs text-slate-300">This will confirm the repair and officially close this case.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          size="md"
                          variant="primary"
                          isLoading={verifying}
                          className="bg-emerald-600 hover:bg-emerald-700 font-bold min-h-[44px] px-5 text-xs"
                          onClick={() => handleVerification('ACCEPT')}
                        >
                          Confirm & Close Ticket
                        </Button>
                        <Button
                          size="md"
                          variant="outline"
                          onClick={() => setShowAcceptConfirm(false)}
                          className="min-h-[44px] text-xs border-slate-700"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Reject Reopen Flow */}
                  {showRejectForm && (
                    <div className="space-y-4 p-4 bg-rose-950/40 border border-rose-800 rounded-xl animate-in fade-in duration-200">
                      <div className="space-y-1.5">
                        <h4 className="text-sm font-bold text-rose-300">What is still wrong?</h4>
                        <p className="text-xs text-slate-300">Explain why the issue is not fixed so crews can reopen work.</p>
                        <textarea
                          placeholder="Example: The pothole was only partially filled and water is still leaking..."
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          rows={3}
                          className="w-full text-xs p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          size="md"
                          variant="primary"
                          isLoading={verifying}
                          className="bg-rose-600 hover:bg-rose-700 font-bold min-h-[44px] px-5 text-xs"
                          onClick={() => handleVerification('REJECT')}
                        >
                          Reopen Issue for Further Action
                        </Button>
                        <Button
                          size="md"
                          variant="outline"
                          onClick={() => setShowRejectForm(false)}
                          className="min-h-[44px] text-xs border-slate-700"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-emerald-950/80 border border-emerald-700/80 rounded-xl text-center space-y-1">
                  <span className="text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> Citizen Verified & Complaint Closed
                  </span>
                  <p className="text-[11px] text-slate-400">Thank you for confirming resolution and helping improve your neighborhood!</p>
                </div>
              )}
            </Card>
          )}

          {/* Location Map Display */}
          <IncidentMap latitude={data.latitude} longitude={data.longitude} title={data.title} />
        </div>

        {/* Right Column (1 Col wide on Desktop): Timeline & Details */}
        <div className="space-y-6">

          {/* Vertical Lifecycle Timeline with Citizen Explanations */}
          <Card variant="glass" className="p-4 sm:p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
              <Clock className="h-4 w-4 text-emerald-400" /> Case Progress Timeline
            </h3>

            <div className="space-y-5 relative border-l-2 border-slate-800 pl-4 ml-2 my-2">
              {data.timeline.map((item: any, idx: number) => {
                const statusKey = item.label?.toUpperCase()?.replace(' ', '_');
                const explanation = statusExplanations[statusKey] || statusExplanations[item.label] || 'Stage status update.';

                return (
                  <div key={idx} className="relative space-y-0.5">
                    <div
                      className={`absolute -left-[23px] top-0.5 h-3.5 w-3.5 rounded-full border-2 ${
                        item.completed
                          ? 'bg-emerald-500 border-emerald-400 shadow-md shadow-emerald-950'
                          : 'bg-slate-900 border-slate-700'
                      }`}
                    />
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${item.completed ? 'text-slate-100' : 'text-slate-500'}`}>
                        {item.completed ? '✓ ' : '○ '}{item.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      {explanation}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Case Information Summary Panel */}
          <Card variant="glass" className="p-4 sm:p-6 space-y-3 text-xs">
            <h3 className="font-bold text-slate-200 border-b border-slate-800 pb-2">Case Information</h3>
            <div className="space-y-2 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Assigned Department:</span>
                <span className="font-semibold text-slate-100">{data.departmentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Category:</span>
                <span className="font-semibold text-cyan-400">{data.category.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Submitted Date:</span>
                <span>{new Date(data.submittedAt).toLocaleDateString()}</span>
              </div>
              <div className="pt-1 border-t border-slate-800">
                <span className="text-slate-400 block mb-0.5">Address / Landmark:</span>
                <span className="text-slate-200 text-[11px] block leading-relaxed">{data.address}</span>
              </div>
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
}
