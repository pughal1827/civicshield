'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, CheckCircle2, AlertTriangle, Crosshair, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface LocationPickerProps {
  latitude: number;
  longitude: number;
  onLocationChange: (lat: number, lng: number, addressText: string) => void;
  className?: string;
}

export type LocationStatus = 'idle' | 'locating' | 'gps_success' | 'denied' | 'manual';

export const LocationPicker: React.FC<LocationPickerProps> = ({
  latitude,
  longitude,
  onLocationChange,
  className = 'w-full rounded-2xl',
}) => {
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showAdjustControls, setShowAdjustControls] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const validateCoordinates = (lat: number, lng: number): boolean => {
    return (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setStatus('denied');
      setErrorMessage('Geolocation is not supported by your browser. You can choose the location manually.');
      return;
    }

    setStatus('locating');
    setErrorMessage('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Math.round(pos.coords.latitude * 1000000) / 1000000;
        const lng = Math.round(pos.coords.longitude * 1000000) / 1000000;

        if (validateCoordinates(lat, lng)) {
          const address = `GPS Geo-Pin (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
          onLocationChange(lat, lng, address);
          setStatus('gps_success');
        } else {
          setStatus('denied');
          setErrorMessage('Invalid GPS coordinates received. Please set location manually.');
        }
      },
      (err) => {
        console.warn('[LocationPicker] Geolocation error:', err);
        setStatus('denied');
        if (err.code === err.PERMISSION_DENIED) {
          setErrorMessage('Location permission was denied. You can choose the location manually.');
        } else {
          setErrorMessage('Could not determine current location. You can choose the location manually.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  };

  // Adjust pin slightly (for manual fine-tuning)
  const handleShiftLocation = (deltaLat: number, deltaLng: number) => {
    const newLat = Math.round((latitude + deltaLat) * 1000000) / 1000000;
    const newLng = Math.round((longitude + deltaLng) * 1000000) / 1000000;

    if (validateCoordinates(newLat, newLng)) {
      onLocationChange(newLat, newLng, `Adjusted Pin (${newLat.toFixed(5)}, ${newLng.toFixed(5)})`);
      setStatus('manual');
    }
  };

  return (
    <div className="space-y-3">
      {/* Primary Action & Status Banner */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <Button
          type="button"
          size="md"
          variant="primary"
          isLoading={status === 'locating'}
          onClick={handleGetCurrentLocation}
          className="min-h-[44px] px-4 shadow-md text-xs sm:text-sm font-bold flex items-center justify-center gap-2"
        >
          <Navigation className="h-4 w-4" />
          <span>{status === 'locating' ? 'Detecting location...' : 'Use my current location'}</span>
        </Button>

        {/* Location Status Badge */}
        {status === 'gps_success' && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Location detected</span>
          </div>
        )}

        {status === 'manual' && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold">
            <Crosshair className="h-4 w-4 shrink-0" />
            <span>Location manually set</span>
          </div>
        )}
      </div>

      {/* Permission Denied / Error Banner */}
      {status === 'denied' && (
        <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-xl text-amber-200 text-xs flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-amber-300">Manual Location Required</span>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Map Display Container */}
      <div className={`${className} h-64 relative overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl shadow-inner`}>
        {mounted ? (
          <iframe
            title="Location Picker Map"
            width="100%"
            height="100%"
            frameBorder="0"
            scrolling="no"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.004},${latitude - 0.004},${longitude + 0.004},${latitude + 0.004}&layer=mapnik&marker=${latitude},${longitude}`}
            className="w-full h-full border-none rounded-2xl"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 animate-pulse">
            Loading map preview...
          </div>
        )}

        {/* Current Pin Coordinates Overlay */}
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto z-10 bg-slate-950/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between gap-3 shadow-lg">
          <span className="truncate">
            <strong className="text-emerald-400">Pin:</strong> {latitude.toFixed(5)}, {longitude.toFixed(5)}
          </span>
          <button
            type="button"
            onClick={() => setShowAdjustControls(!showAdjustControls)}
            className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-semibold shrink-0"
          >
            <Move className="h-3 w-3" />
            <span>{showAdjustControls ? 'Hide Controls' : 'Adjust Pin'}</span>
          </button>
        </div>
      </div>

      {/* Optional Pin Nudge Controls for Fine Adjustment */}
      {showAdjustControls && (
        <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
              <Crosshair className="h-3.5 w-3.5 text-cyan-400" />
              Adjust Location Pin Position
            </span>
            <span className="text-[10px] text-slate-500">Tap arrows to shift pin</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleShiftLocation(0.0005, 0)}
              className="text-xs py-1 min-h-[36px]"
            >
              ⬆️ North
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleShiftLocation(-0.0005, 0)}
              className="text-xs py-1 min-h-[36px]"
            >
              ⬇️ South
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleShiftLocation(0, -0.0005)}
              className="text-xs py-1 min-h-[36px]"
            >
              ⬅️ West
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleShiftLocation(0, 0.0005)}
              className="text-xs py-1 min-h-[36px]"
            >
              ➡️ East
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
