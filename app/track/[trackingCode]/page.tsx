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
      <div className="min-h-screen bg-slate-50/50 p-8 flex items-center justify-center">
        <LoadingState message="Looking up complaint status timeline..." />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50/50 p-8 flex flex-col items-center justify-center text-center space-y-4">
        <div className="h-16 w-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Tracking Record Not Found</h2>
        <p className="text-xs text-slate-500 max-w-sm">
          No matching complaint found for tracking code "{trackingCode}". Please check your code and try again.
        </p>
        <Link href="/track">
          <Button variant="outline" className="min-h-[44px] border-slate-200 text-slate-700 bg-white hover:bg-slate-50">Back to Tracking Search</Button>
        </Link>
      </div>
    );
  }

  const isResolvedOrVerifying = ['RESOLVED', 'CITIZEN_VERIFICATION', 'VERIFIED'].includes(data.status);

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 my-2 pb-24">
      {/* Lightbox Image Preview Modal */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full">
            <img src={lightboxImage} alt="Expanded Evidence" className="w-full h-auto max-h-[80vh] object-contain rounded-2xl border border-slate-700 bg-white" />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-slate-900/90 text-white hover:bg-slate-800 border border-slate-700"
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
      <div className="flex items-center justify-between border border-slate-200 pb-4 bg-white p-4 rounded-2xl shadow-sm">
        <Link href="/track">
          <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 min-h-[44px]">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Search
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-slate-500 font-medium">Case ID:</span>
          <span className="font-mono text-base font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">{data.caseId}</span>
        </div>
      </div>

      {/* Responsive 2-Column Grid for Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column (2 Cols wide on Desktop) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Overview Card */}
          <Card className="p-5 sm:p-6 space-y-4 bg-white border-slate-200 shadow-sm rounded-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="cyan">{data.category.replace('_', ' ')}</Badge>
                  <StatusBadge status={data.status} />
                </div>
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">{data.title}</h1>
              </div>
              <div className="text-left sm:text-right text-xs text-slate-500">
                <span className="font-medium">Submitted: {new Date(data.submittedAt).toLocaleDateString()}</span>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200 font-normal">
              "{data.rawDescription}"
            </p>

            {data.imageUrl && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">Attached Photo Evidence:</span>
                <div className="relative group cursor-pointer max-w-sm rounded-xl overflow-hidden border border-slate-200" onClick={() => setLightboxImage(data.imageUrl)}>
                  <img src={data.imageUrl} alt="Submitted Evidence" className="h-48 w-full object-cover" />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs text-white font-medium gap-1.5">
                    <Maximize2 className="h-4 w-4" /> Tap to expand
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Dedicated Resolution & Verification Section */}
          {isResolvedOrVerifying && (
            <Card className="border-emerald-200 bg-emerald-50/50 p-5 sm:p-6 space-y-5 shadow-sm rounded-2xl">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-base">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Resolution Evidence & Proof
                </div>
                <Badge variant="emerald">{data.status.replace('_', ' ')}</Badge>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                The department has marked this issue as resolved. Please check the evidence and confirm whether the problem is actually fixed.
              </p>

              {data.resolutionEvidence ? (
                <div className="space-y-3 text-xs text-slate-700 bg-white p-4 rounded-xl border border-emerald-200 shadow-xs">
                  <p>
                    <span className="font-bold text-emerald-800">Repair Notes:</span> {data.resolutionEvidence.resolution_notes}
                  </p>

                  {data.resolutionEvidence.proof_image_url && (
                    <div className="space-y-1.5 pt-1">
                      <span className="font-bold text-slate-500 text-[11px] block uppercase">Proof of Repair Photo:</span>
                      <div className="relative group cursor-pointer max-w-sm rounded-xl overflow-hidden border border-emerald-300" onClick={() => setLightboxImage(data.resolutionEvidence.proof_image_url)}>
                        <img src={data.resolutionEvidence.proof_image_url} alt="Proof of Repair" className="h-48 w-full object-cover" />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs text-white font-medium gap-1">
                          <Maximize2 className="h-4 w-4" /> Tap to expand
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500 bg-white p-3 rounded-xl border border-slate-200">
                  Field officer marked work completed. Proof image pending upload.
                </p>
              )}

              {/* Interactive Verification Controls */}
              {data.status !== 'VERIFIED' ? (
                <div className="p-5 bg-white border border-emerald-200 rounded-2xl space-y-4 shadow-sm">
                  {!showAcceptConfirm && !showRejectForm && (
                    <>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-900">Was this issue actually resolved to your satisfaction?</h4>
                        <p className="text-xs text-slate-500">
                          Please verify if the field repair was completed properly.
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-3">
                        <Button
                          size="lg"
                          variant="primary"
                          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold min-h-[48px] px-6 text-sm rounded-xl"
                          onClick={() => setShowAcceptConfirm(true)}
                        >
                          <Check className="h-5 w-5 mr-1.5" /> Yes, it's fixed
                        </Button>
                        <Button
                          size="lg"
                          variant="outline"
                          className="w-full sm:w-auto border-rose-200 text-rose-700 hover:bg-rose-50 font-bold min-h-[48px] px-6 text-sm rounded-xl"
                          onClick={() => setShowRejectForm(true)}
                        >
                          <X className="h-5 w-5 mr-1.5" /> No, the problem still exists
                        </Button>
                      </div>
                    </>
                  )}

                  {/* Accept Confirmation Flow */}
                  {showAcceptConfirm && (
                    <div className="space-y-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl animate-in fade-in duration-200">
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-emerald-900">Are you sure the issue has been fixed?</h4>
                        <p className="text-xs text-slate-600">This will confirm the repair and officially close this case.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          size="md"
                          variant="primary"
                          isLoading={verifying}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold min-h-[44px] px-5 text-xs rounded-xl"
                          onClick={() => handleVerification('ACCEPT')}
                        >
                          Confirm & Close Ticket
                        </Button>
                        <Button
                          size="md"
                          variant="outline"
                          onClick={() => setShowAcceptConfirm(false)}
                          className="min-h-[44px] text-xs border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-xl"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Reject Reopen Flow */}
                  {showRejectForm && (
                    <div className="space-y-4 p-4 bg-rose-50 border border-rose-200 rounded-xl animate-in fade-in duration-200">
                      <div className="space-y-1.5">
                        <h4 className="text-sm font-bold text-rose-900">What is still wrong?</h4>
                        <p className="text-xs text-slate-600">Explain why the issue is not fixed so crews can reopen work.</p>
                        <textarea
                          placeholder="Example: The pothole was only partially filled and water is still leaking..."
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          rows={3}
                          className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-500"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          size="md"
                          variant="primary"
                          isLoading={verifying}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold min-h-[44px] px-5 text-xs rounded-xl"
                          onClick={() => handleVerification('REJECT')}
                        >
                          Reopen Issue for Further Action
                        </Button>
                        <Button
                          size="md"
                          variant="outline"
                          onClick={() => setShowRejectForm(false)}
                          className="min-h-[44px] text-xs border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-xl"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-emerald-100 border border-emerald-300 rounded-xl text-center space-y-1 shadow-xs">
                  <span className="text-xs font-bold text-emerald-900 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" /> Citizen Verified & Complaint Closed
                  </span>
                  <p className="text-[11px] text-emerald-800">Thank you for confirming resolution and helping improve your neighborhood!</p>
                </div>
              )}
            </Card>
          )}

          {/* Location Map Display */}
          <Card className="p-4 bg-white border-slate-200 shadow-sm rounded-2xl space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-emerald-600" /> Incident Map Location
            </h3>
            <IncidentMap latitude={data.latitude} longitude={data.longitude} title={data.title} />
          </Card>
        </div>

        {/* Right Column (1 Col wide on Desktop): Timeline & Details */}
        <div className="space-y-6">

          {/* Vertical Lifecycle Timeline with Citizen Explanations */}
          <Card className="p-5 sm:p-6 space-y-4 bg-white border-slate-200 shadow-sm rounded-2xl">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Clock className="h-4 w-4 text-emerald-600" /> Case Progress Timeline
            </h3>

            <div className="space-y-5 relative border-l-2 border-slate-200 pl-4 ml-2 my-2">
              {data.timeline.map((item: any, idx: number) => {
                const statusKey = item.label?.toUpperCase()?.replace(' ', '_');
                const explanation = statusExplanations[statusKey] || statusExplanations[item.label] || 'Stage status update.';

                return (
                  <div key={idx} className="relative space-y-0.5">
                    <div
                      className={`absolute -left-[23px] top-0.5 h-3.5 w-3.5 rounded-full border-2 ${
                        item.completed
                          ? 'bg-emerald-600 border-emerald-200 shadow-xs'
                          : 'bg-white border-slate-300'
                      }`}
                    />
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${item.completed ? 'text-slate-900' : 'text-slate-400'}`}>
                        {item.completed ? '✓ ' : '○ '}{item.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      {explanation}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Case Information Summary Panel */}
          <Card className="p-5 sm:p-6 space-y-3 text-xs bg-white border-slate-200 shadow-sm rounded-2xl">
            <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3">Case Information</h3>
            <div className="space-y-2.5 text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-500">Assigned Department:</span>
                <span className="font-bold text-slate-900">{data.departmentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Category:</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{data.category.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Submitted Date:</span>
                <span className="font-medium text-slate-800">{new Date(data.submittedAt).toLocaleDateString()}</span>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-500 block mb-1">Address / Landmark:</span>
                <span className="text-slate-800 text-[11px] block leading-relaxed font-medium">{data.address}</span>
              </div>
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
}
