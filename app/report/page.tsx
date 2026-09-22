'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  MapPin, 
  Camera, 
  CheckCircle2, 
  Copy, 
  Search, 
  ArrowRight,
  ArrowLeft,
  Check,
  FileText,
  Eye,
  Edit2,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Navigation,
  Home,
  Bot,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { LocationPicker } from '@/components/maps/location-picker';
import { PhotoUploader } from '@/components/ui/photo-uploader';
import { VoiceReporter } from '@/components/report/VoiceReporter';

interface SubmittedResultData {
  caseId: string;
  trackingCode: string;
  category?: string;
}

export default function ReportIssuePage() {
  const [step, setStep] = useState<number>(1);

  // Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [externalUrl, setExternalUrl] = useState<string>('');

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [latitude, setLatitude] = useState(12.9715987);
  const [longitude, setLongitude] = useState(77.5945627);
  const [addressText, setAddressText] = useState('Central Zone, Municipal Area');

  const [locatingGPS, setLocatingGPS] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionStageMessage, setSubmissionStageMessage] = useState('Preparing your report...');
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submittedResult, setSubmittedResult] = useState<SubmittedResultData | null>(null);
  const [copied, setCopied] = useState(false);

  const activePhotoPreview = previewUrl || externalUrl;

  const steps = [
    { id: 1, title: 'Photo', icon: Camera },
    { id: 2, title: 'Describe', icon: FileText },
    { id: 3, title: 'Location', icon: MapPin },
    { id: 4, title: 'Review', icon: Eye },
  ];

  const categoryPills = [
    { id: 'ROAD_POTHOLE', label: '🛣 Road / Pothole' },
    { id: 'GARBAGE_OVERFLOW', label: '🗑 Garbage Overflow' },
    { id: 'BROKEN_STREETLIGHT', label: '💡 Streetlight Outage' },
    { id: 'WATER_LEAKAGE', label: '💧 Water Pipe Leak' },
    { id: 'DRAINAGE_BLOCKAGE', label: '🚰 Drainage Blocked' },
    { id: 'TRAFFIC_SIGNAL_DAMAGED', label: '🚦 Traffic Signal' },
    { id: 'PUBLIC_INFRA_DAMAGE', label: '🏗 Public Infrastructure' },
    { id: 'OTHER', label: 'Other Issue' },
  ];

  const categoryLabels: Record<string, string> = {
    '': 'Automatic Category Detection',
    'ROAD_POTHOLE': 'Road / Pothole Damage',
    'GARBAGE_OVERFLOW': 'Garbage Overflow & Sanitation',
    'BROKEN_STREETLIGHT': 'Streetlight Outage',
    'WATER_LEAKAGE': 'Water Pipe Leakage',
    'DRAINAGE_BLOCKAGE': 'Drainage Overflow',
    'TRAFFIC_SIGNAL_DAMAGED': 'Traffic Signal Damage',
    'PUBLIC_INFRA_DAMAGE': 'Public Infrastructure Damage',
    'OTHER': 'Other Civic Issue',
  };

  const handleNextFromStep1 = () => {
    setStep(2);
  };

  const handleNextFromStep2 = () => {
    if (!description.trim() || description.length < 10) {
      alert('Please enter a description of at least 10 characters.');
      return;
    }
    setStep(3);
  };

  const handleNextFromStep3 = () => {
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      isNaN(latitude) ||
      isNaN(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      alert('Please select a valid location before continuing.');
      return;
    }
    setStep(4);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setLocatingGPS(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setAddressText(`GPS Location (${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)})`);
        setLocatingGPS(false);
      },
      (error) => {
        console.warn('GPS location error:', error);
        alert('Could not retrieve your GPS location. Please choose your location manually on the map.');
        setLocatingGPS(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (submitting) return;

    if (!description.trim() || description.length < 10) {
      alert('Please enter a description of at least 10 characters.');
      setStep(2);
      return;
    }

    setSubmitting(true);
    setSubmissionError(null);
    setSubmissionStageMessage('Preparing your report...');

    try {
      let finalUploadedImageUrl = externalUrl.trim();

      // 1. Photo upload occurs strictly as part of explicit submission action
      if (selectedFile) {
        setSubmissionStageMessage('Uploading photo to secure server...');
        const formData = new FormData();
        formData.append('file', selectedFile);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const uploadJson = await uploadRes.json();
        if (uploadJson.success && uploadJson.data?.url) {
          finalUploadedImageUrl = uploadJson.data.url;
        } else {
          setSubmissionError(uploadJson.error?.message || 'Photo upload failed. Please try again.');
          return;
        }
      }

      // 2. Submit report payload to API (AI Analysis & Priority Engine execute on backend)
      setSubmissionStageMessage('Running AI Triage & Submitting Report...');
      const res = await fetch('/api/reports/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          category: category || undefined,
          imageUrl: finalUploadedImageUrl || undefined,
          latitude,
          longitude,
          addressText,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSubmittedResult(json.data);

        try {
          const savedStr = localStorage.getItem('civicshield_my_reports');
          const savedArr = savedStr ? JSON.parse(savedStr) : [];
          savedArr.unshift({
            caseId: json.data.caseId,
            trackingCode: json.data.trackingCode,
            category: json.data.category,
            createdAt: new Date().toISOString(),
          });
          localStorage.setItem('civicshield_my_reports', JSON.stringify(savedArr));
        } catch {
          // Ignore localStorage errors
        }
      } else {
        setSubmissionError(json.error?.message || 'Failed to submit report. Please try again.');
        if (json.error?.code === 'IMAGE_VALIDATION_ERROR') {
          setStep(1);
        }
        return;
      }
    } catch (err: unknown) {
      console.error('Submission error:', err);
      const message = err instanceof Error ? err.message : 'An unexpected error occurred during submission.';
      setSubmissionError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const copyTrackingCode = () => {
    if (submittedResult?.trackingCode) {
      navigator.clipboard.writeText(submittedResult.trackingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // SUCCESS SCREEN (Post-submission)
  if (submittedResult) {
    return (
      <div className="min-h-screen bg-slate-50/50 text-slate-900 p-4 sm:p-6 lg:p-8 max-w-xl mx-auto space-y-6 my-4 pb-24 animate-in fade-in zoom-in-95 duration-200">
        <Card className="p-6 sm:p-8 space-y-6 border-slate-200 bg-white shadow-xl rounded-3xl text-center">
          
          {/* Success Check Icon */}
          <div className="mx-auto h-20 w-20 rounded-full bg-emerald-100 border-4 border-emerald-200 flex items-center justify-center text-emerald-600 shadow-md">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <div className="space-y-2">
            <Badge variant="emerald" className="px-3 py-1 text-xs font-black uppercase">
              ✓ Complaint Submitted
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Report Filed Successfully!
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-md mx-auto leading-relaxed">
              Your civic report has been received and routed to municipal field officers for priority verification.
            </p>
          </div>

          {/* Generated Case ID Box */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Official Case ID</span>
              <span className="text-sm font-black text-slate-900 font-mono bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs">
                {submittedResult.caseId}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tracking Code</span>
              <div className="flex items-center gap-1.5 font-mono text-xs font-extrabold text-emerald-700">
                <span>{submittedResult.trackingCode}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={copyTrackingCode}
                  className="h-7 px-2 text-[10px] border-slate-300 rounded-lg hover:bg-slate-100"
                >
                  <Copy className="h-3 w-3" />
                  <span className="ml-1">{copied ? 'Copied!' : 'Copy'}</span>
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                Submitted & AI Analyzed
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-2">
            <Link href={`/track/${submittedResult.trackingCode}`} className="w-full">
              <Button size="lg" variant="primary" className="w-full min-h-[50px] font-black text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-md shadow-emerald-600/20">
                <Search className="h-4 w-4 mr-2" />
                Track My Report →
              </Button>
            </Link>

            <Link href="/my-reports" className="w-full">
              <Button size="md" variant="outline" className="w-full min-h-[46px] text-xs border-slate-300 text-slate-800 bg-white hover:bg-slate-50 rounded-2xl font-bold">
                <FileText className="h-4 w-4 mr-2 text-emerald-600" />
                View My Complaints
              </Button>
            </Link>

            <Link href="/citizen" className="w-full">
              <Button size="md" variant="ghost" className="w-full min-h-[42px] text-xs text-slate-600 hover:text-slate-900 font-bold">
                <Home className="h-4 w-4 mr-2 text-slate-400" />
                Return to Citizen Home
              </Button>
            </Link>
          </div>

        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto space-y-6 my-2 pb-24">
      
      {/* PAGE HEADER */}
      <div className="space-y-2 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black shadow-xs">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Report a Civic Problem</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Report an Issue
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-md mx-auto">
          Help us keep your neighborhood clean, safe, and functional.
        </p>
      </div>

      {/* 4-STEP PROGRESS BAR (EXACT REFERENCE DESIGN) */}
      <div className="grid grid-cols-4 gap-1.5 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-xs">
        {steps.map((s) => {
          const isCompleted = step > s.id;
          const isCurrent = step === s.id;
          const StepIcon = s.icon;

          return (
            <button
              key={s.id}
              type="button"
              disabled={submitting}
              onClick={() => {
                if (s.id <= step || (s.id === 2 && (selectedFile || activePhotoPreview)) || (s.id === 3 && description.length >= 10)) {
                  setStep(s.id);
                }
              }}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all min-h-[46px] ${
                isCurrent
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-bold'
                  : isCompleted
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className="flex items-center gap-1">
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5 text-emerald-700" />
                ) : (
                  <StepIcon className={`h-3.5 w-3.5 ${isCurrent ? 'text-white' : 'text-slate-400'}`} />
                )}
                <span className="text-[11px] sm:text-xs">
                  {s.id}. {s.title}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* SUBMISSION ERROR BOX */}
      {submissionError && (
        <Card className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3 text-rose-800 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-bold text-rose-900 text-xs">Submission Error</h3>
              <p className="text-xs text-rose-800 leading-relaxed">{submissionError}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              size="md"
              variant="primary"
              disabled={submitting}
              onClick={() => handleSubmit()}
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white border-none min-h-[44px] px-4 font-bold rounded-xl"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Try Again
            </Button>
            <Button
              type="button"
              size="md"
              variant="outline"
              disabled={submitting}
              onClick={() => setSubmissionError(null)}
              className="text-xs border-slate-200 text-slate-700 bg-white hover:bg-slate-50 min-h-[44px] px-3 rounded-xl"
            >
              Go Back
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 1: PHOTO ("Take a photo") */}
      {step === 1 && (
        <Card className="p-5 sm:p-7 space-y-6 rounded-3xl border-slate-200/90 bg-white shadow-sm">
          <div className="space-y-1 border-b border-slate-100 pb-3">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Camera className="h-5 w-5 text-emerald-600" />
              Take a photo
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              Capture a live photo of the hazard or select one from gallery.
            </p>
          </div>

          {/* Real Photo Uploader (WebRTC Camera + Gallery Picker + Preview) */}
          <PhotoUploader
            selectedFile={selectedFile}
            previewUrl={activePhotoPreview}
            externalUrl={externalUrl}
            onFileSelect={(file, url) => {
              setSelectedFile(file);
              setPreviewUrl(url);
            }}
            onExternalUrlSelect={(url) => setExternalUrl(url)}
            disabled={submitting}
          />

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-3">
            <span className="text-[11px] text-slate-500 font-medium">
              {activePhotoPreview ? '✓ Photo attached' : 'Photo is optional.'}
            </span>
            <Button
              type="button"
              size="md"
              variant="primary"
              disabled={submitting}
              onClick={handleNextFromStep1}
              className="px-6 min-h-[48px] font-black text-xs rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
            >
              <span>Continue to Description</span>
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 2: DESCRIBE ("Describe the Problem") */}
      {step === 2 && (
        <Card className="p-5 sm:p-7 space-y-6 rounded-3xl border-slate-200/90 bg-white shadow-sm">
          <div className="space-y-1 border-b border-slate-100 pb-3">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-600" />
              Describe the Problem
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              Describe the civic problem in simple words.
            </p>
          </div>

          <div className="space-y-5">
            {/* LiveKit Voice-to-Text Reporter */}
            <VoiceReporter
              onTranscriptChange={(transcript) => setDescription(transcript)}
              disabled={submitting}
            />

            {/* OR Separator */}
            <div className="relative flex items-center justify-center my-2">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                OR
              </span>
              <div className="border-t border-slate-200 w-full" />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                What happened? Describe the issue in detail:
              </label>
              <Textarea
                placeholder="Example: Large pothole near St. Jude High School entrance causing vehicle damage and traffic slowdowns."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                required
                disabled={submitting}
                className="text-xs sm:text-sm bg-slate-50/80 border-slate-200 focus:bg-white text-slate-900 min-h-[110px] rounded-2xl p-3"
              />
              <div className="flex justify-between items-center text-[11px] text-slate-500 px-1">
                <span>Minimum 10 characters required</span>
                <span className={description.length >= 10 ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                  {description.length} / 500
                </span>
              </div>
            </div>

            {/* Quick Category Choices (Pills) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Choose Category (Optional — AI can auto-detect):
              </label>
              <div className="flex flex-wrap gap-2">
                {categoryPills.map((pill) => {
                  const isSelected = category === pill.id;
                  return (
                    <button
                      key={pill.id}
                      type="button"
                      disabled={submitting}
                      onClick={() => setCategory(isSelected ? '' : pill.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all min-h-[44px] flex items-center border ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {pill.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Gemini AI Auto-Triage Indicator */}
            <div className="p-3.5 bg-sky-50/80 border border-sky-200/80 rounded-2xl text-xs text-sky-900 flex items-center gap-2.5">
              <Bot className="h-5 w-5 text-sky-600 shrink-0" />
              <div className="text-[11px] leading-tight">
                <span className="font-bold block">AI Auto-Triage Active</span>
                <span className="text-sky-700">Gemini AI will analyze issue category, severity score & safety risk upon submission.</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-3">
            <Button
              type="button"
              size="md"
              variant="outline"
              disabled={submitting}
              onClick={() => setStep(1)}
              className="px-4 min-h-[48px] text-xs rounded-2xl border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-bold"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              <span>Back</span>
            </Button>
            <Button
              type="button"
              size="md"
              variant="primary"
              disabled={submitting}
              onClick={handleNextFromStep2}
              className="px-6 min-h-[48px] font-black text-xs rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
            >
              <span>Continue to Location</span>
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 3: LOCATION ("Where is the problem?") */}
      {step === 3 && (
        <Card className="p-5 sm:p-7 space-y-6 rounded-3xl border-slate-200/90 bg-white shadow-sm">
          <div className="space-y-1 border-b border-slate-100 pb-3">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-emerald-600" />
              Where is the problem?
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              Pin the issue location using GPS or select manually on the map.
            </p>
          </div>

          {/* Primary GPS Location Button */}
          <div className="space-y-3">
            <Button
              type="button"
              size="lg"
              variant="primary"
              disabled={submitting || locatingGPS}
              onClick={handleUseMyLocation}
              className="w-full min-h-[52px] font-black text-xs rounded-2xl shadow-md shadow-emerald-600/20 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {locatingGPS ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Fetching GPS Location...</span>
                </>
              ) : (
                <>
                  <Navigation className="h-4 w-4 text-emerald-100" />
                  <span>📍 Use My Location</span>
                </>
              )}
            </Button>

            <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200 text-xs text-slate-800 flex items-center gap-2 font-medium">
              <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="line-clamp-1">{addressText}</span>
            </div>
          </div>

          {/* Manual Map Picker */}
          <div className="space-y-2 pt-1">
            <label className="block text-xs font-bold text-slate-700">
              Or choose location manually on map:
            </label>
            <LocationPicker
              latitude={latitude}
              longitude={longitude}
              onLocationChange={(lat, lng, addr) => {
                setLatitude(lat);
                setLongitude(lng);
                setAddressText(addr);
              }}
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-3">
            <Button
              type="button"
              size="md"
              variant="outline"
              disabled={submitting}
              onClick={() => setStep(2)}
              className="px-4 min-h-[48px] text-xs rounded-2xl border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-bold"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              <span>Back</span>
            </Button>
            <Button
              type="button"
              size="md"
              variant="primary"
              disabled={submitting}
              onClick={handleNextFromStep3}
              className="px-6 min-h-[48px] font-black text-xs rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
            >
              <span>Review Report</span>
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 4: REVIEW ("Review Summary" + Photo + AI Preview + Submit) */}
      {step === 4 && (
        <Card className="p-5 sm:p-7 space-y-6 rounded-3xl border-slate-200/90 bg-white shadow-sm">
          <div className="space-y-1 border-b border-slate-100 pb-3">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Eye className="h-5 w-5 text-emerald-600" />
              Review Summary
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              Check your details before submitting to municipal authorities.
            </p>
          </div>

          {/* Conditional Upload Notice */}
          {activePhotoPreview ? (
            <div className="p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center gap-2.5 font-bold shadow-xs">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>✓ Photo attached — will be securely uploaded and analyzed upon submission.</span>
            </div>
          ) : (
            <div className="p-3.5 bg-slate-100/90 border border-slate-200 rounded-2xl text-xs text-slate-700 flex items-center gap-2.5 font-medium">
              <Camera className="h-4 w-4 text-slate-500 shrink-0" />
              <span>No photo attached — submitting text report only.</span>
            </div>
          )}

          <div className="space-y-3">
            
            {/* Review: Photo Evidence */}
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Photo Evidence</span>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setStep(1)}
                  className="text-xs text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1 font-bold min-h-[36px]"
                >
                  <Edit2 className="h-3 w-3" />
                  <span>{activePhotoPreview ? 'Change Photo' : '+ Attach Photo'}</span>
                </button>
              </div>
              
              {activePhotoPreview ? (
                <div className="space-y-2">
                  <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500/30 bg-slate-950 shadow-sm max-w-sm sm:max-w-md">
                    <img 
                      src={activePhotoPreview} 
                      alt="Attached Incident Evidence" 
                      className="w-full h-48 sm:h-56 object-cover" 
                      onError={(e) => {
                        if (selectedFile) {
                          const refreshedUrl = URL.createObjectURL(selectedFile);
                          setPreviewUrl(refreshedUrl);
                          (e.target as HTMLImageElement).src = refreshedUrl;
                        }
                      }}
                    />
                    <div className="absolute top-2.5 left-2.5 bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-emerald-500/40 text-[10px] text-emerald-300 font-bold flex items-center gap-1.5 shadow-sm">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Evidence Photo Ready</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {selectedFile ? `File: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)` : 'Photo captured & ready'}
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-white rounded-xl border border-dashed border-slate-300 text-center space-y-2">
                  <p className="text-xs text-slate-500 italic font-medium">No photo attached (Optional).</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="text-xs border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-xl font-bold"
                  >
                    <Camera className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                    Attach a Photo
                  </Button>
                </div>
              )}
            </div>

            {/* Review: Description */}
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Problem Description</span>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setStep(2)}
                  className="text-xs text-emerald-600 hover:underline flex items-center gap-1 font-bold min-h-[36px]"
                >
                  <Edit2 className="h-3 w-3" />
                  <span>Edit</span>
                </button>
              </div>
              <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-semibold">{description}</p>
            </div>

            {/* Review: Category */}
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Category</span>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setStep(2)}
                  className="text-xs text-emerald-600 hover:underline flex items-center gap-1 font-bold min-h-[36px]"
                >
                  <Edit2 className="h-3 w-3" />
                  <span>Edit</span>
                </button>
              </div>
              <p className="text-xs text-emerald-700 font-extrabold">{categoryLabels[category] || 'Automatic Category Detection'}</p>
            </div>

            {/* Review: Location */}
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Location</span>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setStep(3)}
                  className="text-xs text-emerald-600 hover:underline flex items-center gap-1 font-bold min-h-[36px]"
                >
                  <Edit2 className="h-3 w-3" />
                  <span>Edit</span>
                </button>
              </div>
              <p className="text-xs text-slate-800 flex items-center gap-1.5 font-semibold">
                <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{addressText}</span>
              </p>
            </div>

            {/* AI Triage Preview Box */}
            <div className="p-4 bg-sky-50/80 border border-sky-200/90 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center gap-2 text-sky-900 font-black">
                <Bot className="h-4 w-4 text-sky-600" />
                <span>AI Auto-Triage & Routing Plan</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-slate-700 pt-1">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Estimated Priority</span>
                  <span className="font-extrabold text-amber-700">High / Medium</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Routing Department</span>
                  <span className="font-extrabold text-sky-800 flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> Municipal Dispatch
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Submission Action Button */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-3">
            <Button
              type="button"
              size="md"
              variant="outline"
              disabled={submitting}
              onClick={() => setStep(3)}
              className="px-4 min-h-[48px] text-xs rounded-2xl border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-bold"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              <span>Back</span>
            </Button>
            <Button
              type="button"
              size="lg"
              variant="primary"
              disabled={submitting}
              onClick={() => handleSubmit()}
              className="px-7 min-h-[52px] font-black text-xs rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>{submissionStageMessage}</span>
                </>
              ) : (
                <>
                  <span>Submit Complaint</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

    </div>
  );
}
