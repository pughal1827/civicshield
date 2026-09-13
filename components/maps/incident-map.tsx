'use client';

import React, { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';

export interface IncidentMapProps {
  latitude: number;
  longitude: number;
  title?: string;
  address?: string;
  className?: string;
}

export const IncidentMap: React.FC<IncidentMapProps> = ({
  latitude,
  longitude,
  title,
  address,
  className = 'h-64 w-full rounded-xl',
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
    return (
      <div className={`${className} bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-slate-500 space-y-2 p-4 text-center`}>
        <MapPin className="h-8 w-8 text-slate-600" />
        <span className="text-xs font-medium">Location unavailable</span>
      </div>
    );
  }

  return (
    <div className={`${className} relative overflow-hidden bg-slate-900 border border-slate-800 rounded-xl`}>
      {mounted ? (
        <iframe
          title={title || 'Incident Map Location'}
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.005},${latitude - 0.005},${longitude + 0.005},${latitude + 0.005}&layer=mapnik&marker=${latitude},${longitude}`}
          className="w-full h-full border-none rounded-xl"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 animate-pulse">
          Loading OpenStreetMap tiles...
        </div>
      )}
      <div className="absolute bottom-2 left-2 z-10 bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] text-slate-300 max-w-[85%] truncate">
        <span className="font-semibold text-emerald-400">Coordinates:</span> {latitude.toFixed(5)}, {longitude.toFixed(5)}
      </div>
    </div>
  );
};
