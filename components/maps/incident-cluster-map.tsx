'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Navigation,
  Crosshair,
  ZoomIn,
  ZoomOut,
  Layers,
  ExternalLink,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Compass,
  AlertTriangle,
  Flame,
  Clock,
  Sparkles,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Incident } from '@/types/incident';

// ─── Fix default Leaflet markers in Next.js ────────────────────────────────
if (typeof window !== 'undefined' && L?.Icon?.Default) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

import { CATEGORY_CONFIG, SEVERITY_COLORS } from '@/lib/maps/map-config';
export { CATEGORY_CONFIG, SEVERITY_COLORS };

// ─── Basemap Layer Options ────────────────────────────────────────────────
const BASEMAPS = {
  streets: {
    name: 'Street View',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  satellite: {
    name: 'Satellite View',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
  },
  topo: {
    name: 'Terrain / Topo',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
  },
};

// ─── Simple distance-based clustering ─────────────────────────────────────
function clusterIncidents(
  incidents: any[],
  zoom: number,
  enableClustering = true
): Array<any & { isCluster: boolean; count: number; clusterItems?: any[] }> {
  if (!enableClustering || zoom >= 16) {
    return incidents.map((inc) => ({ ...inc, isCluster: false, count: 1 }));
  }

  const CLUSTER_RADIUS_METERS = zoom <= 11 ? 600 : zoom <= 13 ? 200 : 90;
  const used = new Set<string>();
  const results: Array<any & { isCluster: boolean; count: number; clusterItems?: any[] }> = [];

  const latMeters = 111320;
  const lngMeters = 111320 * Math.cos(((incidents[0]?.latitude || 13.0827) * Math.PI) / 180);
  const radiusLat = CLUSTER_RADIUS_METERS / latMeters;
  const radiusLng = CLUSTER_RADIUS_METERS / lngMeters;

  for (let i = 0; i < incidents.length; i++) {
    if (used.has(incidents[i].id)) continue;

    const group = [incidents[i]];
    used.add(incidents[i].id);

    for (let j = i + 1; j < incidents.length; j++) {
      if (used.has(incidents[j].id)) continue;
      const dLat = Math.abs(Number(incidents[i].latitude) - Number(incidents[j].latitude));
      const dLng = Math.abs(Number(incidents[i].longitude) - Number(incidents[j].longitude));
      if (dLat < radiusLat && dLng < radiusLng) {
        group.push(incidents[j]);
        used.add(incidents[j].id);
      }
    }

    if (group.length === 1) {
      results.push({ ...group[0], isCluster: false, count: 1 });
    } else {
      const avgLat = group.reduce((s, inc) => s + Number(inc.latitude), 0) / group.length;
      const avgLng = group.reduce((s, inc) => s + Number(inc.longitude), 0) / group.length;
      const maxSeverity = group.reduce((best, inc) => {
        const order: Record<string, number> = { CRITICAL: 3, HIGH: 2, MEDIUM: 1, LOW: 0 };
        return (order[inc.severity] || 0) > (order[best.severity] || 0) ? inc : best;
      }, group[0]);

      results.push({
        ...maxSeverity,
        id: `cluster-${group.map((g) => g.id).join('-').slice(0, 32)}`,
        latitude: avgLat,
        longitude: avgLng,
        isCluster: true,
        count: group.length,
        clusterItems: group,
        title: `${group.length} Clustered Issues (${maxSeverity.category?.replace(/_/g, ' ') || 'Complaints'})`,
        summary: group.map((g) => `${g.caseId || ''}: ${g.title}`).join(' | '),
      });
    }
  }

  return results;
}

// ─── Map Controller (Bounds, Pan-to-Selection, GPS, Zoom Controls) ────────
function MapController({
  incidents,
  selectedIncident,
  userLocation,
  triggerFitBoundsKey,
  zoomStep,
}: {
  incidents: any[];
  selectedIncident?: any | null;
  userLocation?: { lat: number; lng: number } | null;
  triggerFitBoundsKey: number;
  zoomStep: number;
}) {
  const map = useMap();
  const prevSelectedId = useRef<string | null>(null);

  // Resize invalidation
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [map]);

  // Zoom in / Zoom out actions
  useEffect(() => {
    if (zoomStep > 0) map.zoomIn();
    if (zoomStep < 0) map.zoomOut();
  }, [zoomStep, map]);

  // Pan to selected incident smoothly
  useEffect(() => {
    if (selectedIncident && selectedIncident.latitude && selectedIncident.longitude) {
      const lat = Number(selectedIncident.latitude);
      const lng = Number(selectedIncident.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        if (prevSelectedId.current !== selectedIncident.id) {
          prevSelectedId.current = selectedIncident.id;
          map.flyTo([lat, lng], Math.max(map.getZoom(), 15), {
            duration: 0.8,
            easeLinearity: 0.4,
          });
        }
      }
    }
  }, [selectedIncident, map]);

  // Pan to user location if requested
  useEffect(() => {
    if (userLocation && !isNaN(userLocation.lat) && !isNaN(userLocation.lng)) {
      map.flyTo([userLocation.lat, userLocation.lng], 15, { duration: 0.9 });
    }
  }, [userLocation, map]);

  // Fit all active incident bounds
  useEffect(() => {
    if (!incidents.length) return;
    const valid = incidents.filter(
      (inc) =>
        inc.latitude &&
        inc.longitude &&
        !isNaN(Number(inc.latitude)) &&
        !isNaN(Number(inc.longitude))
    );
    if (valid.length === 0) return;
    if (valid.length === 1) {
      map.setView([Number(valid[0].latitude), Number(valid[0].longitude)], 14);
      return;
    }
    const bounds = L.latLngBounds(
      valid.map((inc) => [Number(inc.latitude), Number(inc.longitude)] as [number, number])
    );
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  }, [incidents, triggerFitBoundsKey, map]);

  return null;
}

function ZoomListener({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMap();
  useEffect(() => {
    const handleZoom = () => onZoomChange(map.getZoom());
    map.on('zoomend', handleZoom);
    return () => {
      map.off('zoomend', handleZoom);
    };
  }, [map, onZoomChange]);
  return null;
}

// ─── Component Props ───────────────────────────────────────────────────────
export interface IncidentClusterMapProps {
  incidents: Incident[] | any[];
  selectedIncident?: Incident | any | null;
  selectedIncidentId?: string | null;
  height?: string;
  className?: string;
  onIncidentClick?: (incident: Incident | any) => void;
  showControls?: boolean;
  baseCaseUrl?: string;
}

export const IncidentClusterMap: React.FC<IncidentClusterMapProps> = ({
  incidents,
  selectedIncident,
  selectedIncidentId,
  height = '520px',
  className = '',
  onIncidentClick,
  showControls = true,
  baseCaseUrl,
}) => {
  const pathname = usePathname();
  const defaultBaseUrl = pathname?.startsWith('/worker') ? '/worker/jobs' : '/authority/complaints';
  const targetBaseUrl = baseCaseUrl || defaultBaseUrl;

  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [zoom, setZoom] = useState(13);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [fitKey, setFitKey] = useState(0);
  const [zoomStep, setZoomStep] = useState(0);
  const [activeBasemap, setActiveBasemap] = useState<'streets' | 'satellite' | 'topo'>('streets');
  const [enableClustering, setEnableClustering] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedCoords, setCopiedCoords] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMarkerClick = useCallback(
    (incident: any) => {
      onIncidentClick?.(incident);
    },
    [onIncidentClick]
  );

  const validIncidents = useMemo(
    () =>
      incidents.filter(
        (inc) =>
          inc.latitude != null &&
          inc.longitude != null &&
          !isNaN(Number(inc.latitude)) &&
          !isNaN(Number(inc.longitude))
      ),
    [incidents]
  );

  const clustered = useMemo(
    () => clusterIncidents(validIncidents, zoom, enableClustering),
    [validIncidents, zoom, enableClustering]
  );

  const getCategoryColor = (category?: string) =>
    (category && CATEGORY_CONFIG[category]?.color) || '#3b82f6';
  const getSeverityColor = (severity?: string) =>
    (severity && SEVERITY_COLORS[severity]) || SEVERITY_COLORS['CRITICAL'];

  // GPS Current Location
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        setLocating(false);
        console.warn('Geolocation error:', err);
        setGpsError('Could not get GPS location. Please check browser permissions.');
        setTimeout(() => setGpsError(null), 4000);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleResetBounds = () => {
    setFitKey((k) => k + 1);
  };

  // Fullscreen Command Center Toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => {});
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => {});
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleCopyCoords = (lat: number, lng: number) => {
    const text = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    navigator.clipboard.writeText(text);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  if (!mounted) {
    return (
      <div
        className={`${className} ${height} bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center`}
      >
        <div className="text-slate-400 text-xs font-semibold flex items-center gap-2 animate-pulse">
          <div className="h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
          Loading interactive spatial command map…
        </div>
      </div>
    );
  }

  // Fallback Center: first incident or Gummidipoondi Jurisdiction coordinates
  const defaultCenter: [number, number] =
    validIncidents.length > 0
      ? [Number(validIncidents[0].latitude), Number(validIncidents[0].longitude)]
      : [13.34071, 80.19434];

  const currentBasemap = BASEMAPS[activeBasemap];

  return (
    <div
      ref={containerRef}
      className={`relative ${className} overflow-hidden rounded-2xl border border-slate-200 shadow-sm bg-slate-950 ${
        isFullscreen ? 'fixed inset-0 z-[9999] rounded-none border-none h-screen w-screen' : ''
      }`}
      style={{ height: isFullscreen ? '100vh' : height }}
    >
      {/* ─── TOP-RIGHT FLOATING HUD CONTROLS ───────────────────────────────── */}
      {showControls && (
        <div className="absolute top-3 right-3 z-[1000] flex flex-col items-end gap-2">
          {/* Basemap & Display Mode Controls */}
          <div className="flex items-center gap-1.5 p-1 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 text-xs font-semibold">
            <select
              value={activeBasemap}
              onChange={(e) => setActiveBasemap(e.target.value as any)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-2.5 py-1.5 rounded-lg border-none text-xs cursor-pointer outline-none"
              title="Change Map Style"
            >
              <option value="streets">🗺️ Street View</option>
              <option value="satellite">🛰️ Satellite View</option>
              <option value="topo">⛰️ Terrain / Topo</option>
            </select>

            <button
              type="button"
              onClick={() => setEnableClustering(!enableClustering)}
              title={enableClustering ? 'Disable Clustering (Show All Pins)' : 'Enable Clustering'}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                enableClustering
                  ? 'bg-sky-100 text-sky-700 hover:bg-sky-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {enableClustering ? '🧩 Clustered' : '📍 Raw Pins'}
            </button>
          </div>

          {/* Quick Action Buttons Column */}
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={handleLocateMe}
              disabled={locating}
              title="Locate Officer GPS Position"
              className="p-2.5 bg-white/95 backdrop-blur-md hover:bg-white text-slate-800 rounded-xl shadow-md border border-slate-200/80 transition-all hover:scale-105 active:scale-95 flex items-center justify-center group"
            >
              <Crosshair
                className={`h-4 w-4 text-sky-600 ${locating ? 'animate-spin' : 'group-hover:text-sky-700'}`}
              />
            </button>

            <button
              type="button"
              onClick={handleResetBounds}
              title="Fit All Active Complaint Markers"
              className="p-2.5 bg-white/95 backdrop-blur-md hover:bg-white text-slate-800 rounded-xl shadow-md border border-slate-200/80 transition-all hover:scale-105 active:scale-95 flex items-center justify-center group"
            >
              <Layers className="h-4 w-4 text-emerald-600 group-hover:text-emerald-700" />
            </button>

            <button
              type="button"
              onClick={() => setZoomStep((s) => (s >= 0 ? s + 1 : 1))}
              title="Zoom In"
              className="p-2.5 bg-white/95 backdrop-blur-md hover:bg-white text-slate-800 rounded-xl shadow-md border border-slate-200/80 transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
            >
              <ZoomIn className="h-4 w-4 text-slate-700" />
            </button>

            <button
              type="button"
              onClick={() => setZoomStep((s) => (s <= 0 ? s - 1 : -1))}
              title="Zoom Out"
              className="p-2.5 bg-white/95 backdrop-blur-md hover:bg-white text-slate-800 rounded-xl shadow-md border border-slate-200/80 transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
            >
              <ZoomOut className="h-4 w-4 text-slate-700" />
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Command Center'}
              className="p-2.5 bg-slate-900/95 backdrop-blur-md hover:bg-slate-900 text-white rounded-xl shadow-md border border-slate-800 transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4 text-sky-400" /> : <Maximize2 className="h-4 w-4 text-sky-400" />}
            </button>
          </div>
        </div>
      )}

      {/* ─── TOP-LEFT JURISDICTION STATUS BADGE ────────────────────────────── */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-1.5 pointer-events-none">
        <div className="bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-white shadow-lg flex items-center gap-2 pointer-events-auto">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-extrabold tracking-wide">
            Gummidipoondi Spatial Zone
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
            {validIncidents.length} Issues Active
          </span>
        </div>

        {gpsError && (
          <div className="p-2 bg-amber-950/90 backdrop-blur-md border border-amber-800 rounded-xl text-[11px] font-semibold text-amber-200 shadow-lg animate-in fade-in pointer-events-auto">
            {gpsError}
          </div>
        )}
      </div>

      {/* ─── BOTTOM-LEFT SELECTED INCIDENT MINI INSPECTOR HUD ──────────────── */}
      {selectedIncident && (
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-md z-[1000] bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200 shadow-2xl space-y-2.5 animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase text-white shadow-xs"
                  style={{ background: getSeverityColor(selectedIncident.severity) }}
                >
                  {selectedIncident.severity || 'CRITICAL'}
                </span>
                <span className="font-mono font-extrabold text-xs text-slate-800">
                  #{selectedIncident.caseId || selectedIncident.id?.slice(0, 8)}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  • {selectedIncident.reportCount || 1} Citizen Report{selectedIncident.reportCount > 1 ? 's' : ''}
                </span>
              </div>
              <h3 className="text-xs font-bold text-slate-900 mt-1 line-clamp-1">
                {selectedIncident.title}
              </h3>
            </div>

            <button
              type="button"
              onClick={() => onIncidentClick?.(null)}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
              title="Close Preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600">
            <span className="flex items-center gap-1 font-medium truncate">
              <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
              <span className="truncate">{selectedIncident.address || 'GPS Coordinates Registered'}</span>
            </span>

            <button
              type="button"
              onClick={() => handleCopyCoords(Number(selectedIncident.latitude), Number(selectedIncident.longitude))}
              className="text-[10px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md shrink-0"
              title="Copy GPS Coordinates"
            >
              {copiedCoords ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
              <span>{copiedCoords ? 'Copied' : 'GPS'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Link
              href={`${targetBaseUrl}/${selectedIncident.id}`}
              className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl text-center shadow-xs transition-colors flex items-center justify-center gap-1"
            >
              <span>{targetBaseUrl.startsWith('/worker') ? 'View Job Details' : 'Inspect Full Dossier'}</span>
              <ExternalLink className="h-3 w-3" />
            </Link>

            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${selectedIncident.latitude},${selectedIncident.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold rounded-xl border border-sky-200 transition-colors flex items-center gap-1"
              title="Open Navigation in Google Maps"
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Directions</span>
            </a>
          </div>
        </div>
      )}

      {/* ─── MAP CANVAS ────────────────────────────────────────────────────── */}
      <MapContainer
        center={defaultCenter}
        zoom={13}
        className="h-full w-full z-0"
        scrollWheelZoom
      >
        <ZoomListener onZoomChange={setZoom} />

        {/* Selected Basemap Tile Provider */}
        <TileLayer
          key={activeBasemap}
          attribution={currentBasemap.attribution}
          url={currentBasemap.url}
        />

        <MapController
          incidents={validIncidents}
          selectedIncident={selectedIncident}
          userLocation={userLocation}
          triggerFitBoundsKey={fitKey}
          zoomStep={zoomStep}
        />

        {/* Officer Live GPS Location Marker & Pulse Ring */}
        {userLocation && (
          <>
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={100}
              pathOptions={{ fillColor: '#0284c7', fillOpacity: 0.15, color: '#0284c7', weight: 1.5 }}
            />
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={L.divIcon({
                html: `<div style="
                  width: 24px; height: 24px; border-radius: 50%;
                  background: #0284c7; border: 3px solid #ffffff;
                  box-shadow: 0 0 16px rgba(2, 132, 199, 0.9);
                  display: flex; align-items: center; justify-content: center;
                "><div style="width: 8px; height: 8px; border-radius: 50%; background: #ffffff;"></div></div>`,
                className: 'officer-gps-marker',
                iconSize: [24, 24],
                iconAnchor: [12, 12],
              })}
            >
              <Popup>
                <div className="text-xs p-1 font-bold text-sky-900 flex items-center gap-1">
                  <Navigation className="h-3.5 w-3.5 text-sky-600" />
                  <span>Officer Telemetry GPS Location</span>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* Clustered & Single Incident Markers */}
        {clustered.map((item) => {
          const isSelected = selectedIncidentId
            ? item.id === selectedIncidentId ||
              item.clusterItems?.some((c: any) => c.id === selectedIncidentId)
            : false;

          if (item.isCluster) {
            // Clustered Pin
            const clusterColor = getSeverityColor(item.severity);
            const size = item.count >= 10 ? 48 : item.count >= 5 ? 40 : 34;

            const clusterIcon = L.divIcon({
              html: `<div style="
                width:${size}px; height:${size}px; border-radius:50%;
                background:${clusterColor};
                border:3px solid #ffffff;
                box-shadow:${
                  isSelected
                    ? '0 0 0 5px #0284c7, 0 6px 18px rgba(0,0,0,0.5)'
                    : '0 3px 12px rgba(0,0,0,0.35)'
                };
                display:flex; align-items:center; justify-content:center;
                color:#ffffff; font-weight:800; font-size:${size >= 40 ? '13px' : '11px'};
                transform: ${isSelected ? 'scale(1.18)' : 'scale(1)'};
                transition: transform 0.2s ease;
              ">${item.count}</div>`,
              className: 'custom-cluster-marker',
              iconSize: L.point(size, size),
              iconAnchor: [size / 2, size / 2],
            });

            return (
              <Marker
                key={item.id}
                position={[Number(item.latitude), Number(item.longitude)]}
                icon={clusterIcon}
                zIndexOffset={isSelected ? 1000 : 100}
                eventHandlers={{
                  click: () => {
                    if (item.clusterItems && item.clusterItems.length > 0) {
                      handleMarkerClick(item.clusterItems[0]);
                    }
                  },
                }}
              >
                <Popup>
                  <div className="text-xs space-y-1.5 p-1 min-w-[210px]">
                    <div className="flex items-center justify-between gap-2 border-b pb-1">
                      <span className="font-extrabold text-slate-900">
                        {item.count} Clustered Issues
                      </span>
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white uppercase"
                        style={{ background: clusterColor }}
                      >
                        {item.severity}
                      </span>
                    </div>
                    <p className="text-slate-700 font-semibold text-[11px]">{item.title}</p>
                    <div className="space-y-1 pt-1 max-h-36 overflow-y-auto">
                      {item.clusterItems?.map((ci: any) => (
                        <div
                          key={ci.id}
                          onClick={() => handleMarkerClick(ci)}
                          className="p-1.5 bg-slate-50 hover:bg-sky-50 rounded border border-slate-200 cursor-pointer text-[11px] transition-colors"
                        >
                          <span className="font-bold text-slate-800">
                            #{ci.caseId || ci.id?.slice(0, 6)}
                          </span>
                          : {ci.title}
                        </div>
                      ))}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          }

          // Single Marker Pin
          const sevColor = getSeverityColor(item.severity);
          const catConfig = CATEGORY_CONFIG[item.category] || {
            color: '#3b82f6',
            label: 'Issue',
            icon: '📍',
          };
          const isCritical = item.severity === 'CRITICAL';
          const pinSize = isSelected ? 42 : isCritical ? 36 : 32;

          const markerIcon = L.divIcon({
            html: `<div style="
              width:${pinSize}px; height:${pinSize}px; border-radius:50%;
              background:${sevColor};
              border:${isSelected ? '3.5px solid #0284c7' : '2.5px solid #ffffff'};
              box-shadow:${
                isSelected
                  ? '0 0 0 5px rgba(2, 132, 199, 0.45), 0 4px 16px rgba(0,0,0,0.5)'
                  : isCritical
                  ? '0 0 0 3px rgba(239, 68, 68, 0.35), 0 3px 10px rgba(0,0,0,0.35)'
                  : '0 2px 8px rgba(0,0,0,0.3)'
              };
              display:flex; align-items:center; justify-content:center;
              font-size:${isSelected ? '15px' : '12px'};
              color:#ffffff; font-weight:bold;
              transform:${isSelected ? 'scale(1.2)' : 'scale(1)'};
              transition: transform 0.2s ease;
            ">
              <span style="display:flex; align-items:center; justify-content:center;">${catConfig.icon || '📍'}</span>
            </div>`,
            className: `custom-incident-pin ${isSelected ? 'selected-pin' : ''}`,
            iconSize: [pinSize, pinSize],
            iconAnchor: [pinSize / 2, pinSize / 2],
            popupAnchor: [0, -(pinSize / 2 + 4)],
          });

          return (
            <Marker
              key={item.id}
              position={[Number(item.latitude), Number(item.longitude)]}
              icon={markerIcon}
              zIndexOffset={isSelected ? 1000 : isCritical ? 300 : 200}
              eventHandlers={{
                click: () => handleMarkerClick(item),
              }}
            >
              <Popup>
                <div className="text-xs space-y-1.5 p-1 min-w-[220px]">
                  <div className="flex items-center justify-between gap-1.5 border-b pb-1">
                    <span className="font-mono font-bold text-slate-800">
                      #{item.caseId || item.id?.slice(0, 8)}
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-extrabold text-white uppercase"
                      style={{ background: sevColor }}
                    >
                      {item.severity}
                    </span>
                  </div>

                  <p className="font-bold text-slate-900 leading-tight">{item.title}</p>

                  {item.address && (
                    <p className="text-slate-600 flex items-center gap-1 text-[11px]">
                      <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                      <span className="truncate">{item.address}</span>
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t">
                    <span>
                      {item.reportCount || 1} Report{item.reportCount > 1 ? 's' : ''}
                    </span>
                    <Link
                      href={`${targetBaseUrl}/${item.id}`}
                      className="text-sky-600 hover:text-sky-700 font-bold flex items-center gap-0.5 hover:underline"
                    >
                      View Case <ExternalLink className="h-2.5 w-2.5" />
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
