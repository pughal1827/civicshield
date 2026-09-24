'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  Square,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Volume2,
  Languages,
  Sparkles,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type {
  ISpeechRecognition,
  SpeechRecognitionEvent,
  SpeechRecognitionErrorEvent,
} from '@/types/speech-recognition';

export type VoiceLanguage = 'en-IN' | 'ta-IN' | 'hi-IN';

export type VoiceStatus =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'completed'
  | 'error'
  | 'unsupported';

export interface VoiceReporterProps {
  onTranscriptChange: (transcript: string) => void;
  disabled?: boolean;
  language?: VoiceLanguage;
}

const LANGUAGE_CONFIG: Record<
  VoiceLanguage,
  { label: string; samplePrompt: string }
> = {
  'en-IN': {
    label: 'English (India)',
    samplePrompt: 'e.g. "There is a large pothole near the school entrance causing traffic problems."',
  },
  'ta-IN': {
    label: 'தமிழ் (Tamil)',
    samplePrompt: 'எ.கா. "பஸ் ஸ்டாப் அருகில் பெரிய பள்ளம் உள்ளது, உடனடியாக சரிசெய்யவும்."',
  },
  'hi-IN': {
    label: 'हिन्दी (Hindi)',
    samplePrompt: 'उदा. "मुख्य सड़क पर गहरा गड्ढा है जिससे वाहनों को भारी परेशानी हो रही है."',
  },
};

export function VoiceReporter({
  onTranscriptChange,
  disabled = false,
  language: initialLanguage = 'en-IN',
}: VoiceReporterProps) {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [selectedLanguage, setSelectedLanguage] = useState<VoiceLanguage>(initialLanguage);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [finalTranscript, setFinalTranscript] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  // References for cleanup and accurate stream tracking
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isStoppingExplicitlyRef = useRef<boolean>(false);
  const accumulatedFinalTextRef = useRef<string>('');

  // Audio level visualizer loop
  const startAudioVisualizer = useCallback((mediaStream: MediaStream) => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.5;

      const source = audioCtx.createMediaStreamSource(mediaStream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((average / 128) * 100)));

        animFrameRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch {
      // AudioContext visualization is optional / non-blocking
    }
  }, []);

  // Stop microphone media tracks and audio visualizer
  const stopMediaStream = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setAudioLevel(0);

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore
        }
      });
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close().catch(() => {});
      } catch {
        // Ignore
      }
      audioContextRef.current = null;
    }
  }, []);

  // Full session cleanup
  const cleanupRecognition = useCallback(() => {
    stopMediaStream();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
      recognitionRef.current = null;
    }
  }, [stopMediaStream]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanupRecognition();
    };
  }, [cleanupRecognition]);

  // Start Voice Recording
  const startRecording = async () => {
    if (disabled) return;
    setErrorMessage(null);
    setLiveTranscript('');
    setFinalTranscript('');
    accumulatedFinalTextRef.current = '';
    isStoppingExplicitlyRef.current = false;

    // Feature Check
    if (typeof window === 'undefined') return;
    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setStatus('unsupported');
      return;
    }

    // 1. (Disabled) Request microphone access for audio level visualizer & early permission check
    // This manual getUserMedia call can sometimes lock the microphone hardware and cause 
    // a 'network' or 'audio-capture' error when SpeechRecognition tries to start.
    /*
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        mediaStreamRef.current = stream;
        startAudioVisualizer(stream);
      }
    } catch (err: unknown) {
      const errorObj = err as { name?: string; message?: string };
      console.warn('Microphone permission check notice:', err);
      if (errorObj?.name === 'NotAllowedError' || errorObj?.name === 'PermissionDeniedError') {
        setStatus('error');
        setErrorMessage(
          'Microphone access was denied. Please allow microphone access in your browser or type the issue manually.'
        );
        return;
      }
    }
    */

    // 2. Initialize native Web Speech API instance
    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = selectedLanguage;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let currentInterim = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          const transcriptText = item[0]?.transcript || '';

          if (item.isFinal) {
            accumulatedFinalTextRef.current = (
              accumulatedFinalTextRef.current +
              ' ' +
              transcriptText
            ).trim();
            setFinalTranscript(accumulatedFinalTextRef.current);
          } else {
            currentInterim += transcriptText;
          }
        }

        const combinedLive = [accumulatedFinalTextRef.current, currentInterim.trim()]
          .filter(Boolean)
          .join(' ');
        setLiveTranscript(combinedLive);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.warn('Speech recognition event error:', event.error);
        
        switch (event.error) {
          case 'not-allowed':
          case 'service-not-allowed':
            setErrorMessage(
              'Microphone access was denied. Please allow microphone access in your browser or type the issue manually.'
            );
            setStatus('error');
            cleanupRecognition();
            break;

          case 'no-speech':
            // Non-fatal while continuous recording is active
            break;

          case 'audio-capture':
            setErrorMessage(
              "We couldn't access your microphone. Please check your microphone and try again."
            );
            setStatus('error');
            cleanupRecognition();
            break;

          case 'network':
            setErrorMessage(
              'Network error during voice recognition. Please check your connection or type manually.'
            );
            setStatus('error');
            cleanupRecognition();
            break;

          case 'aborted':
            break;

          default:
            setErrorMessage(
              'Voice transcription failed. You can try again or type the issue manually.'
            );
            setStatus('error');
            cleanupRecognition();
            break;
        }
      };

      recognition.onend = () => {
        if (!isStoppingExplicitlyRef.current && status === 'listening') {
          try {
            recognition.start();
          } catch {
            // Handled
          }
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      setStatus('listening');
    } catch (err: unknown) {
      console.warn('Web Speech API initialization failure:', err);
      setStatus('error');
      setErrorMessage(
        'Could not initialize voice recognition in this browser. Please type your description below.'
      );
      cleanupRecognition();
    }
  };

  // Stop Recording and finalize transcript
  const stopRecording = () => {
    isStoppingExplicitlyRef.current = true;
    setStatus('processing');

    cleanupRecognition();

    const resultText = (
      accumulatedFinalTextRef.current ||
      liveTranscript ||
      finalTranscript
    ).trim();

    if (resultText.length > 0) {
      setFinalTranscript(resultText);
      setLiveTranscript('');
      setStatus('completed');
      onTranscriptChange(resultText);
    } else {
      setStatus('error');
      setErrorMessage('No speech was detected. Please try again or type manually.');
    }
  };

  // Record Again (Fresh Session)
  const handleRecordAgain = () => {
    cleanupRecognition();
    accumulatedFinalTextRef.current = '';
    setLiveTranscript('');
    setFinalTranscript('');
    setErrorMessage(null);
    setStatus('idle');
  };

  return (
    <div className="space-y-3">
      {/* LANGUAGE SELECTOR */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Languages className="h-3.5 w-3.5 text-emerald-600" />
          <span>Language</span>
        </span>
        <div className="flex items-center gap-1 bg-slate-100/90 p-0.5 rounded-xl border border-slate-200">
          {(Object.keys(LANGUAGE_CONFIG) as VoiceLanguage[]).map((langKey) => {
            const isSelected = selectedLanguage === langKey;
            return (
              <button
                key={langKey}
                type="button"
                disabled={status === 'listening' || disabled}
                onClick={() => setSelectedLanguage(langKey)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  isSelected
                    ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 disabled:opacity-50'
                }`}
              >
                {LANGUAGE_CONFIG[langKey].label}
              </button>
            );
          })}
        </div>
      </div>

      {/* STATE 1: IDLE - INVITING VOICE BUTTON */}
      {status === 'idle' && (
        <button
          type="button"
          disabled={disabled}
          onClick={startRecording}
          aria-label="Describe the municipal issue using your voice"
          className="w-full text-left p-5 sm:p-6 rounded-2xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-gradient-to-br from-emerald-50/60 via-white to-emerald-50/30 hover:from-emerald-50 hover:to-emerald-100/40 transition-all duration-200 shadow-xs hover:shadow-md group focus:outline-hidden focus:ring-2 focus:ring-emerald-500 min-h-[105px] flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-emerald-600 group-hover:bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform duration-200">
              <Mic className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-emerald-900">
                  🎤 Describe with Voice
                </h3>
                <span className="text-[10px] uppercase font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                  Native Speech
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Tap to speak naturally in {LANGUAGE_CONFIG[selectedLanguage].label}.
              </p>
              <p className="text-[11px] text-slate-400 italic line-clamp-1">
                {LANGUAGE_CONFIG[selectedLanguage].samplePrompt}
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center text-xs font-black text-emerald-700 group-hover:translate-x-1 transition-transform">
            <span>Start Speaking →</span>
          </div>
        </button>
      )}

      {/* STATE 2: LISTENING & REALTIME TRANSCRIPTION */}
      {status === 'listening' && (
        <div className="p-5 sm:p-6 rounded-2xl border-2 border-emerald-500 bg-white shadow-lg space-y-4 animate-in zoom-in-95 duration-200">
          {/* Header with Live Red Pulse & Visualizer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
              </span>
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Listening...
              </span>
              <Badge variant="emerald" className="text-[10px] px-2 py-0.2 font-bold">
                {LANGUAGE_CONFIG[selectedLanguage].label}
              </Badge>
            </div>

            {/* Audio Wave Visualizer */}
            <div className="flex items-center gap-1 h-5 px-2 bg-slate-100 rounded-lg">
              <Volume2 className="h-3.5 w-3.5 text-slate-500" />
              <div className="flex items-end gap-0.5 h-3">
                <span
                  className="w-1 bg-emerald-500 rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(20, Math.min(100, audioLevel * 1.2))}%` }}
                />
                <span
                  className="w-1 bg-emerald-600 rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(30, Math.min(100, audioLevel * 1.5))}%` }}
                />
                <span
                  className="w-1 bg-emerald-500 rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(20, Math.min(100, audioLevel * 0.9))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Realtime Live Transcript Feedback Box */}
          <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-xl min-h-[85px] max-h-[160px] overflow-y-auto space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Live Realtime Transcript
            </span>
            {liveTranscript ? (
              <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-relaxed italic">
                &ldquo;{liveTranscript}&rdquo;
              </p>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Speak naturally about the problem... your words will appear here in real-time.
              </p>
            )}
          </div>

          {/* Stop Action */}
          <div className="flex items-center justify-between pt-1 gap-3">
            <span className="text-[11px] text-slate-500 font-medium">
              Click Stop Recording when finished speaking.
            </span>
            <Button
              type="button"
              size="md"
              variant="primary"
              onClick={stopRecording}
              className="px-5 min-h-[44px] bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md shadow-rose-600/20"
            >
              <Square className="h-3.5 w-3.5 mr-1.5 fill-current" />
              <span>Stop Recording</span>
            </Button>
          </div>
        </div>
      )}

      {/* STATE 3: COMPLETED TRANSCRIPT SUMMARY */}
      {status === 'completed' && (
        <div className="p-4 sm:p-5 rounded-2xl border border-emerald-300 bg-emerald-50/50 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Voice Transcription Complete</span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleRecordAgain}
              className="h-8 px-3 text-xs font-bold border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-xl"
            >
              <RefreshCw className="h-3 w-3 mr-1.5 text-slate-500" />
              <span>🎤 Record Again</span>
            </Button>
          </div>

          <div className="p-3.5 bg-white border border-emerald-200/80 rounded-xl shadow-xs">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
              Captured Transcript (Populated below for editing)
            </span>
            <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-relaxed">
              {finalTranscript}
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>You can review and edit any words in the description box below before continuing.</span>
          </div>
        </div>
      )}

      {/* STATE 4: ERROR MESSAGE */}
      {status === 'error' && errorMessage && (
        <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50 space-y-2.5 animate-in fade-in duration-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-amber-900">{errorMessage}</p>
              <p className="text-[11px] text-amber-700">
                You can try voice recording again or type the description manually below.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleRecordAgain}
              className="h-8 text-xs font-bold border-amber-300 text-amber-900 bg-white hover:bg-amber-100/50 rounded-xl"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Try Voice Again
            </Button>
          </div>
        </div>
      )}

      {/* STATE 5: UNSUPPORTED BROWSER FALLBACK */}
      {status === 'unsupported' && (
        <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2 text-slate-700">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
            <p className="text-xs">
              Voice input isn&apos;t supported in this browser. Please type your description instead.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
