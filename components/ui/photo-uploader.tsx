'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Camera, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  RefreshCw, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle,
  X,
  Check,
  RotateCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { compressImageFile } from '@/lib/utils/image-compressor';

export interface PhotoUploaderProps {
  selectedFile: File | null;
  previewUrl: string;
  externalUrl: string;
  onFileSelect: (file: File | null, previewUrl: string) => void;
  onExternalUrlSelect: (url: string) => void;
  disabled?: boolean;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  selectedFile,
  previewUrl,
  externalUrl,
  onFileSelect,
  onExternalUrlSelect,
  disabled = false,
}) => {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState(externalUrl || '');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // WebRTC Live Camera State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedBlobUrl, setCapturedBlobUrl] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Stop MediaStream tracks completely
  const stopCameraStream = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => {
        track.stop();
      });
      setCameraStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [cameraStream]);

  // Clean up stream and blob URLs on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      if (capturedBlobUrl && capturedBlobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(capturedBlobUrl);
      }
    };
  }, [stopCameraStream, previewUrl, capturedBlobUrl]);

  // Start WebRTC camera stream with specified facingMode
  const startCamera = async (facing: 'environment' | 'user' = 'environment') => {
    if (disabled) return;

    // Reset previous captured state
    if (capturedBlobUrl) {
      URL.revokeObjectURL(capturedBlobUrl);
      setCapturedBlobUrl(null);
      setCapturedFile(null);
    }

    stopCameraStream();
    setCameraError(null);
    setErrorMessage('');
    setIsCameraActive(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported by your current browser. Please choose a photo from your gallery.');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {
          // Play Promise may be rejected if interrupted, harmless
        });
      }
    } catch (err: any) {
      console.warn('[PhotoUploader] Camera access error:', err);
      let msg = 'Could not open camera. Please check browser permissions or choose a photo from your gallery.';

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please allow camera access in your browser settings or choose a photo from your gallery.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera device found. Please choose a photo from your gallery.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = 'Camera is currently in use by another application. Please close other apps using the camera.';
      }

      setCameraError(msg);
      stopCameraStream();
    }
  };

  // Toggle between Rear ('environment') and Front ('user') camera
  const toggleCameraFacing = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  // Capture frame from live video feed into HTML5 canvas snapshot
  const captureSnapshot = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !cameraStream) return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError('Failed to capture photo frame. Please try again.');
          return;
        }

        const filename = `camera_photo_${Date.now()}.jpg`;
        const file = new File([blob], filename, { type: 'image/jpeg', lastModified: Date.now() });
        const localBlobUrl = URL.createObjectURL(blob);

        // Freeze camera stream after capturing snapshot
        stopCameraStream();

        setCapturedFile(file);
        setCapturedBlobUrl(localBlobUrl);
      },
      'image/jpeg',
      0.92
    );
  };

  // User accepts the captured camera photo
  const handleUseCapturedPhoto = () => {
    if (!capturedFile || !capturedBlobUrl) return;

    // Revoke old preview URL if any
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    onFileSelect(capturedFile, capturedBlobUrl);
    onExternalUrlSelect('');

    // Reset local camera UI states
    setCapturedFile(null);
    setCapturedBlobUrl(null);
    setIsCameraActive(false);
    stopCameraStream();
  };

  // User requests Retake during active camera capture mode
  const handleRetakeCamera = () => {
    if (capturedBlobUrl) {
      URL.revokeObjectURL(capturedBlobUrl);
      setCapturedBlobUrl(null);
      setCapturedFile(null);
    }
    startCamera(facingMode);
  };

  // User cancels live camera view
  const handleCancelCamera = () => {
    if (capturedBlobUrl) {
      URL.revokeObjectURL(capturedBlobUrl);
      setCapturedBlobUrl(null);
      setCapturedFile(null);
    }
    stopCameraStream();
    setIsCameraActive(false);
    setCameraError(null);
  };

  // Trigger gallery input with input value reset
  const triggerGallery = () => {
    if (disabled) return;
    if (galleryInputRef.current) {
      galleryInputRef.current.value = '';
    }
    setErrorMessage('');
    galleryInputRef.current?.click();
  };

  // Handle standard gallery file selection
  const handleGalleryFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const rawFile = files[0];
    if (!rawFile.type.startsWith('image/')) {
      setErrorMessage('Please choose a valid JPG, PNG, or WEBP photo.');
      e.target.value = '';
      return;
    }

    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    const compressed = await compressImageFile(rawFile, 1280, 0.8);
    const newObjectUrl = URL.createObjectURL(compressed);
    setErrorMessage('');
    onFileSelect(compressed, newObjectUrl);
    onExternalUrlSelect('');
  };

  // Retake or replace current main preview image
  const handleRetakeMain = () => {
    if (disabled) return;
    handleRemoveMain();
    startCamera('environment');
  };

  // Remove current main preview image
  const handleRemoveMain = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    setUrlInput('');
    setErrorMessage('');
    onFileSelect(null, '');
    onExternalUrlSelect('');
  };

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) return;
    const cleanUrl = urlInput.trim();
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    onFileSelect(null, cleanUrl);
    onExternalUrlSelect(cleanUrl);
    setErrorMessage('');
  };

  const activePreview = previewUrl || externalUrl;

  return (
    <div className="space-y-4">
      {/* Hidden Canvas for Canvas Snapshot */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Hidden File Input for Gallery */}
      <input
        type="file"
        ref={galleryInputRef}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleGalleryFileChange}
        disabled={disabled}
      />

      {/* Mode Selector Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl max-w-xs">
        <button
          type="button"
          onClick={() => setMode('upload')}
          disabled={disabled || isCameraActive}
          className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
            mode === 'upload'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Camera className="h-3.5 w-3.5" />
          <span>Camera / File</span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (isCameraActive) handleCancelCamera();
            setMode('url');
          }}
          disabled={disabled}
          className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
            mode === 'url'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LinkIcon className="h-3.5 w-3.5" />
          <span>Image URL</span>
        </button>
      </div>

      {mode === 'upload' ? (
        <div className="space-y-4">
          {/* LIVE WEBRTC CAMERA VIEWFINDER MODAL / CONTAINER */}
          {isCameraActive ? (
            <div className="relative rounded-2xl overflow-hidden border border-emerald-500/40 bg-slate-950 p-2 space-y-3 shadow-2xl animate-in fade-in duration-200">
              <div className="flex items-center justify-between px-2 pt-1">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Camera className="h-4 w-4 animate-pulse" />
                  <span>Live Camera Viewfinder</span>
                </span>
                <button
                  type="button"
                  onClick={handleCancelCamera}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
                  title="Close Camera"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Camera Error Notice */}
              {cameraError ? (
                <div className="p-5 text-center space-y-3 bg-slate-900/90 rounded-xl border border-rose-800/80 my-2">
                  <AlertTriangle className="h-8 w-8 text-rose-400 mx-auto" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-rose-300">Camera Unavailable</h4>
                    <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">{cameraError}</p>
                  </div>
                  <div className="flex justify-center gap-3 pt-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      onClick={triggerGallery}
                      className="text-xs font-bold min-h-[40px] px-4"
                    >
                      <ImageIcon className="h-4 w-4 mr-1.5" />
                      Choose from Gallery
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleCancelCamera}
                      className="text-xs border-slate-700 min-h-[40px] px-3"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : capturedBlobUrl ? (
                /* CAPTURED SNAPSHOT PREVIEW (Retake / Use Photo) */
                <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden border border-emerald-500/50 bg-slate-900 h-64">
                    <img
                      src={capturedBlobUrl}
                      alt="Captured Photo Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-emerald-950/90 backdrop-blur-md px-2.5 py-1 rounded-md border border-emerald-500/40 text-[11px] text-emerald-300 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Photo Captured</span>
                    </div>
                  </div>

                  {/* Captured Photo Control Actions */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <Button
                      type="button"
                      size="md"
                      variant="outline"
                      onClick={handleRetakeCamera}
                      className="flex-1 text-xs font-bold border-slate-700 min-h-[44px] gap-1.5"
                    >
                      <RefreshCw className="h-4 w-4 text-emerald-400" />
                      <span>Retake</span>
                    </Button>
                    <Button
                      type="button"
                      size="md"
                      variant="primary"
                      onClick={handleUseCapturedPhoto}
                      className="flex-1 text-xs font-extrabold shadow-lg shadow-emerald-950/80 min-h-[44px] gap-1.5"
                    >
                      <Check className="h-4 w-4" />
                      <span>Use Photo</span>
                    </Button>
                  </div>
                </div>
              ) : (
                /* LIVE VIDEO FEED & CAPTURE BUTTON */
                <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden bg-black h-64 border border-slate-800 flex items-center justify-center">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />

                    {/* Camera Toggle Button (Front/Rear) */}
                    <button
                      type="button"
                      onClick={toggleCameraFacing}
                      className="absolute top-3 right-3 p-2 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-slate-200 backdrop-blur-md shadow-lg"
                      title="Switch Camera (Rear/Front)"
                    >
                      <RotateCw className="h-4 w-4 text-emerald-400" />
                    </button>
                  </div>

                  {/* Shutter Controls */}
                  <div className="flex items-center justify-between gap-3 pt-1 px-1">
                    <Button
                      type="button"
                      size="md"
                      variant="outline"
                      onClick={handleCancelCamera}
                      className="text-xs border-slate-800 text-slate-400 hover:text-slate-200 min-h-[44px] px-4"
                    >
                      Cancel
                    </Button>

                    <Button
                      type="button"
                      size="lg"
                      variant="primary"
                      onClick={captureSnapshot}
                      className="flex-1 font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 min-h-[48px] shadow-xl shadow-emerald-950/80 gap-2"
                    >
                      <div className="h-4 w-4 rounded-full border-2 border-white bg-transparent shrink-0" />
                      <span>Capture Photo</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* MAIN ACTION BUTTONS: Take Photo (Camera) vs Choose from Gallery */}
          {!activePreview && !isCameraActive && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                type="button"
                size="lg"
                variant="primary"
                onClick={() => startCamera('environment')}
                disabled={disabled}
                className="h-14 py-3 text-sm font-bold shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2.5 rounded-xl border-emerald-400/30 min-h-[44px]"
              >
                <Camera className="h-5 w-5" />
                <span>📷 Take Photo</span>
              </Button>
              <Button
                type="button"
                size="lg"
                variant="secondary"
                onClick={triggerGallery}
                disabled={disabled}
                className="h-14 py-3 text-sm font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 flex items-center justify-center gap-2.5 rounded-xl min-h-[44px]"
              >
                <ImageIcon className="h-5 w-5 text-emerald-400" />
                <span>🖼 Choose from Gallery</span>
              </Button>
            </div>
          )}

          {/* User-Friendly Error Message Notice */}
          {errorMessage && !isCameraActive && (
            <div className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-xl space-y-2 text-rose-200 text-xs">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-rose-300">Photo Selection Notice</span>
                  <p>{errorMessage}</p>
                </div>
              </div>
            </div>
          )}

          {/* Image Preview Card (When photo is accepted & ready) */}
          {activePreview && !isCameraActive && (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 group">
                <img
                  src={activePreview}
                  alt="Selected Photo Preview"
                  className="w-full h-56 object-cover"
                />
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRetakeMain}
                    disabled={disabled}
                    className="p-2 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-slate-200 text-xs flex items-center gap-1.5 backdrop-blur-md shadow-lg min-h-[44px]"
                    title="Retake Photo"
                  >
                    <RefreshCw className="h-4 w-4 text-emerald-400" />
                    <span className="font-semibold">Retake</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveMain}
                    disabled={disabled}
                    className="p-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs flex items-center gap-1.5 backdrop-blur-md shadow-lg min-h-[44px]"
                    title="Remove Photo"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="font-semibold">Remove</span>
                  </button>
                </div>

                <div className="absolute bottom-3 left-3 bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Photo Ready for Report</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* External Image URL Option */
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Paste direct photo URL (e.g. https://example.com/photo.jpg)..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              disabled={disabled}
              className="text-xs bg-slate-950 min-h-[44px]"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleUrlSubmit}
              disabled={disabled || !urlInput.trim()}
              className="shrink-0 text-xs min-h-[44px] px-4 font-bold"
            >
              Attach
            </Button>
          </div>
          {activePreview && (
            <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
              <img src={activePreview} alt="URL Preview" className="w-full h-40 object-cover" />
              <button
                type="button"
                onClick={handleRemoveMain}
                disabled={disabled}
                className="absolute top-2 right-2 p-2 rounded-lg bg-rose-950/80 text-rose-300 border border-rose-800 text-xs min-h-[44px]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
