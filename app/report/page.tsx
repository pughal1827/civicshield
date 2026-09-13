'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  FilePlus, 
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
  Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { LocationPicker } from '@/components/maps/location-picker';
import { PhotoUploader } from '@/components/ui/photo-uploader';

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
  const [submittedResult, setSubmittedResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const steps = [
    { id: 1, title: 'Photo', icon: Camera },
    { id: 2, title: 'Describe', icon: FileText },
    { id: 3, title: 'Location', icon: MapPin },
    { id: 4, title: 'Review', icon: Eye },
  ];

  const categoryPills = [
    { id: 'ROAD_POTHOLE', label: '🛣 Road / Pothole' },
    { id: 'GARBAGE_OVERFLOW', label: '🗑 Garbage' },
    { id: 'BROKEN_STREETLIGHT', label: '💡 Streetlight' },
    { id: 'WATER_LEAKAGE', label: '💧 Water' },
    { id: 'DRAINAGE_BLOCKAGE', label: '🚰 Drainage' },
    { id: 'TRAFFIC_SIGNAL_DAMAGED', label: '🚦 Traffic Signal' },
    { id: 'PUBLIC_INFRA_DAMAGE', label: '🏗 Public Damage' },
    { id: 'OTHER', label: 'Other' },
  ];

  const categoryLabels: Record<string, string> = {
    '': 'Automatic Category Detection',
    'ROAD_POTHOLE': 'Road / Pothole',
    'GARBAGE_OVERFLOW': 'Garbage Overflow',
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
        setSubmissionStageMessage('Uploading photo...');
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
          throw new Error(uploadJson.error?.message || 'Photo upload failed. Please try again.');
        }
      }

      // 2. Submit report payload to API
      setSubmissionStageMessage('Sending your report...');
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
        setSubmissionError(json.error?.message || "We couldn't submit your report. Please check your details and try again.");
      }
    } catch (err: any) {
      console.error('Error submitting report:', err);
      setSubmissionError(err.message || "We couldn't submit your report right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // SUCCESS SCREEN (Section 7)
  if (submittedResult) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 max-w-lg mx-auto flex flex-col justify-center my-4 pb-24">
        <Card variant="glass" className="border-emerald-800/80 bg-slate-900/90 text-center p-6 space-y-6 shadow-2xl rounded-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-9 w-9" />
          </div>

          <div className="space-y-1.5">
            <Badge variant="emerald">Report Submitted ✓</Badge>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              ✅ Report Submitted
            </h1>
            <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
              Your report has been registered for municipal resolution.
            </p>
          </div>

          {/* Case & Tracking Info Card */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3 text-left">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <span className="text-xs text-slate-400 font-medium">Case ID</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xl font-extrabold text-emerald-400">{submittedResult.caseId}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(submittedResult.caseId)}
                  className="h-8 px-2.5 text-xs border-slate-700 min-h-[36px]"
                  title="Copy Case ID"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span className="ml-1">{copied ? 'Copied!' : 'Copy'}</span>
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <span className="text-xs text-slate-400 font-medium">Status</span>
              <span className="text-xs font-semibold text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2.5 py-1 rounded-lg">
                Submitted
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-1">
            <Link href={`/track/${submittedResult.trackingCode}`} className="w-full">
              <Button size="lg" variant="primary" className="w-full min-h-[50px] font-extrabold text-sm rounded-xl">
                <Search className="h-4 w-4 mr-2" />
                Track My Report
              </Button>
            </Link>

            <Link href="/" className="w-full">
              <Button size="md" variant="outline" className="w-full min-h-[44px] text-xs border-slate-700 rounded-xl">
                <Home className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 max-w-2xl mx-auto space-y-5 my-2 pb-24">
      {/* Page Header */}
      <div className="space-y-1 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <FilePlus className="h-3.5 w-3.5" />
          <span>Report a Civic Problem</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Report an Issue</h1>
      </div>

      {/* 4-Step Progress Bar (Mobile Optimized 44px Touch Targets) */}
      <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-2xl">
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
                if (s.id <= step || (s.id === 2 && (selectedFile || previewUrl || externalUrl)) || (s.id === 3 && description.length >= 10)) {
                  setStep(s.id);
                }
              }}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all min-h-[44px] ${
                isCurrent
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm font-bold'
                  : isCompleted
                  ? 'text-slate-300 hover:bg-slate-800/60'
                  : 'text-slate-500 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-1">
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <StepIcon className="h-3.5 w-3.5" />
                )}
                <span className="text-[11px]">
                  {s.id}. {s.title}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Submission Failure Error Box */}
      {submissionError && (
        <Card className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-2xl space-y-3 text-rose-200">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-bold text-rose-300 text-xs">Submission Error</h3>
              <p className="text-xs text-rose-200/90 leading-relaxed">{submissionError}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              size="md"
              variant="primary"
              disabled={submitting}
              onClick={() => handleSubmit()}
              className="text-xs bg-rose-600 hover:bg-rose-500 border-none min-h-[44px] px-4 font-bold"
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
              className="text-xs border-slate-700 min-h-[44px] px-3"
            >
              Go Back
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 1: PHOTO ("Take a photo") */}
      {step === 1 && (
        <Card variant="glass" className="p-4 sm:p-5 space-y-5 rounded-2xl border-slate-800">
          <div className="space-y-1 border-b border-slate-800 pb-3">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <Camera className="h-5 w-5 text-emerald-400" />
              Take a photo
            </h2>
            <p className="text-xs text-slate-400">
              Capture a live photo of the hazard or select one from gallery.
            </p>
          </div>

          <PhotoUploader
            selectedFile={selectedFile}
            previewUrl={previewUrl}
            externalUrl={externalUrl}
            onFileSelect={(file, url) => {
              setSelectedFile(file);
              setPreviewUrl(url);
            }}
            onExternalUrlSelect={(url) => setExternalUrl(url)}
            disabled={submitting}
          />

          <div className="flex items-center justify-between pt-3 border-t border-slate-800 gap-3">
            <span className="text-[11px] text-slate-400">
              {previewUrl || externalUrl ? '✓ Photo attached' : 'Photo is optional.'}
            </span>
            <Button
              type="button"
              size="md"
              variant="primary"
              disabled={submitting}
              onClick={handleNextFromStep1}
              className="px-5 min-h-[48px] font-bold text-xs rounded-xl"
            >
              <span>Continue to Description</span>
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 2: DESCRIPTION ("What happened?" + Quick Category Choices) */}
      {step === 2 && (
        <Card variant="glass" className="p-4 sm:p-5 space-y-5 rounded-2xl border-slate-800">
          <div className="space-y-1 border-b border-slate-800 pb-3">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-400" />
              What happened?
            </h2>
            <p className="text-xs text-slate-400">
              Describe the civic problem in simple words.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Textarea
                label="Problem Description"
                placeholder="Example: There is a large pothole near the bus stop causing traffic slowdowns."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                required
                disabled={submitting}
                className="text-xs sm:text-sm bg-slate-950 min-h-[110px] rounded-xl"
              />
              <div className="flex justify-between items-center text-[11px] text-slate-400 px-1">
                <span>Minimum 10 characters</span>
                <span className={description.length >= 10 ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                  {description.length} / 500
                </span>
              </div>
            </div>

            {/* Quick Category Choices (Pills) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">
                Choose Category (Optional):
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
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 ring-1 ring-emerald-500/40'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {pill.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-800 gap-3">
            <Button
              type="button"
              size="md"
              variant="outline"
              disabled={submitting}
              onClick={() => setStep(1)}
              className="px-4 min-h-[48px] text-xs rounded-xl"
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
              className="px-5 min-h-[48px] font-bold text-xs rounded-xl"
            >
              <span>Continue to Location</span>
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 3: LOCATION ("Where is the problem?" + Use My Location GPS) */}
      {step === 3 && (
        <Card variant="glass" className="p-4 sm:p-5 space-y-5 rounded-2xl border-slate-800">
          <div className="space-y-1 border-b border-slate-800 pb-3">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <MapPin className="h-5 w-5 text-emerald-400" />
              Where is the problem?
            </h2>
            <p className="text-xs text-slate-400">
              Pin the issue location using GPS or select manually on the map.
            </p>
          </div>

          {/* Primary GPS Location Button */}
          <div className="space-y-2">
            <Button
              type="button"
              size="lg"
              variant="primary"
              disabled={submitting || locatingGPS}
              onClick={handleUseMyLocation}
              className="w-full min-h-[50px] font-bold text-xs rounded-xl shadow-md gap-2"
            >
              {locatingGPS ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Fetching GPS Location...</span>
                </>
              ) : (
                <>
                  <Navigation className="h-4 w-4 text-emerald-300" />
                  <span>📍 Use My Location</span>
                </>
              )}
            </Button>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="line-clamp-1 font-medium">{addressText}</span>
            </div>
          </div>

          {/* Manual Map Picker */}
          <div className="space-y-2 pt-1">
            <label className="block text-xs font-bold text-slate-300">
              Choose location manually:
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

          <div className="flex items-center justify-between pt-3 border-t border-slate-800 gap-3">
            <Button
              type="button"
              size="md"
              variant="outline"
              disabled={submitting}
              onClick={() => setStep(2)}
              className="px-4 min-h-[48px] text-xs rounded-xl"
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
              className="px-5 min-h-[48px] font-bold text-xs rounded-xl"
            >
              <span>Review Report</span>
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 4: REVIEW ("Review Screen" + Explicit Upload Note + Submit Button) */}
      {step === 4 && (
        <Card variant="glass" className="p-4 sm:p-5 space-y-5 rounded-2xl border-slate-800">
          <div className="space-y-1 border-b border-slate-800 pb-3">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <Eye className="h-5 w-5 text-emerald-400" />
              Review Summary
            </h2>
            <p className="text-xs text-slate-400">
              Check your details before submitting to municipal authorities.
            </p>
          </div>

          {/* Explicit Upload Notice */}
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-[11px] text-emerald-300 flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Your photo will be uploaded when you submit.</span>
          </div>

          <div className="space-y-3">
            {/* Review: Photo */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Photo</span>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setStep(1)}
                  className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-semibold min-h-[36px]"
                >
                  <Edit2 className="h-3 w-3" />
                  <span>Edit</span>
                </button>
              </div>
              {previewUrl || externalUrl ? (
                <div className="relative rounded-lg overflow-hidden h-32 border border-slate-800 max-w-xs">
                  <img src={previewUrl || externalUrl} alt="Attached Preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No photo attached.</p>
              )}
            </div>

            {/* Review: Description */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Problem Description</span>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setStep(2)}
                  className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-semibold min-h-[36px]"
                >
                  <Edit2 className="h-3 w-3" />
                  <span>Edit</span>
                </button>
              </div>
              <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">{description}</p>
            </div>

            {/* Review: Category */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Category</span>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setStep(2)}
                  className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-semibold min-h-[36px]"
                >
                  <Edit2 className="h-3 w-3" />
                  <span>Edit</span>
                </button>
              </div>
              <p className="text-xs text-emerald-400 font-semibold">{categoryLabels[category] || 'Automatic Category'}</p>
            </div>

            {/* Review: Location */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Location</span>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setStep(3)}
                  className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-semibold min-h-[36px]"
                >
                  <Edit2 className="h-3 w-3" />
                  <span>Edit</span>
                </button>
              </div>
              <p className="text-xs text-slate-200 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>{addressText}</span>
              </p>
            </div>
          </div>

          {/* Submission Action Button */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800 gap-3">
            <Button
              type="button"
              size="md"
              variant="outline"
              disabled={submitting}
              onClick={() => setStep(3)}
              className="px-4 min-h-[48px] text-xs rounded-xl"
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
              className="flex-1 min-h-[52px] font-extrabold text-sm shadow-xl shadow-emerald-950/80 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500"
            >
              {submitting ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>{submissionStageMessage}</span>
                </div>
              ) : (
                <span>🚨 Submit Report</span>
              )}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
