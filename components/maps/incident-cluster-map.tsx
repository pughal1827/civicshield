'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ShieldAlert, MapPin } from 'lucide-react';
import type { Incident } from '@/types/incident';

// ─── Fix default Leaflet markers in Next.js ────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// ─── Category → color & label ─────────────────────────────────────────────
const CATEGORY_CONFIG: Record<string, { color: string; label: string }> = {
  ROAD_POTHOLE:         { color: '#ef4444', label: 'Pothole' },
  DRAINAGE_BLOCKAGE:    { color: '#3b82f6', label: 'Drainage' },
  GARBAGE_OVERFLOW:     { color: '#f59e0b', label: 'Garbage' },
  BROKEN_STREETLIGHT:   { color: '#eab308', label: 'Light' },
  WATER_LEAKAGE:        { color: '#06b6d4', label: 'Water' },
  ELECTRICAL_HAZARD:    { color: '#f97316', label: 'Electrical' },
  OPEN_MANHOLE:         { color: '#a855f7', label: 'Manhole' },
  SEWAGE_OVERFLOW:      { color: '#6366f1', label: 'Sewage' },
  FLOOD:                { color: '#0ea5e9', label: 'Flood' },
  ILLEGAL_CONSTRUCTION: { color: '#ec4899', label: 'Build' },
  TRAFFIC_SIGNAL_DAMAGED: { color: '#f43f5e', label: 'Signal' },
  PUBLIC_INFRA_DAMAGE:  { color: '#78716c', label: 'Infra' },
};

const SEVERITY_COLORS: Record<string, string> = {
  LOW: '#6b7280',
  MEDIUM: '#f59e0b',
  HIGH: '#f97316',
  CRITICAL: '#ef4444',
};

// ─── Simple distance-based clustering ─────────────────────────────────────
// No external dependency — clusters markers within ~80m of each other
function clusterIncidents(incidents: Incident[], zoom: number): Array<Incident & { isCluster: boolean; count: number }> {
  const CLUSTER_RADIUS_METERS = 80;
  const used = new Set<string>();
  const results: Array<Incident & { isCluster: boolean; count: number }> = [];

  // Convert meters to approximate lat/lng degrees
  const latMeters = 111320;
  const lngMeters = 111320 * Math.cos((incidents[0]?.latitude || 13) * Math.PI / 180);
  const radiusLat = CLUSTER_RADIUS_METERS / latMeters;
  const radiusLng = CLUSTER_RADIUS_METERS / lngMeters;

  for (let i = 0; i < incidents.length; i++) {
    if (used.has(incidents[i].id)) continue;

    const group = [incidents[i]];
    used.add(incidents[i].id);

    for (let j = i + 1; j < incidents.length; j++) {
      if (used.has(incidents[j].id)) continue;
      const dLat = Math.abs(incidents[i].latitude - incidents[j].latitude);
      const dLng = Math.abs(incidents[i].longitude - incidents[j].longitude);
      if (dLat < radiusLat && dLng < radiusLng) {
        group.push(incidents[j]);
        used.add(incidents[j].id);
      }
    }

    if (group.length === 1) {
      results.push({ ...group[0], isCluster: false, count: 1 });
    } else {
      // Centroid
      const avgLat = group.reduce((s, inc) => s + inc.latitude, 0) / group.length;
      const avgLng = group.reduce((s, inc) => s + inc.longitude, 0) / group.length;
      const maxSeverity = group.reduce((best, inc) => {
        const order = { CRITICAL: 3, HIGH: 2, MEDIUM: 1, LOW: 0 };
        return (order[inc.severity] || 0) > (order[best.severity] || 0) ? inc : best;
      }, group[0]);

      results.push({
        ...maxSeverity,
        latitude: avgLat,
        longitude: avgLng,
        isCluster: true,
        count: group.length,
        title: `${group.length} reports — ${maxSeverity.category.replace(/_/g, ' ')}`,
        summary: group.map(g => g.summary).join(' | '),
      });
    }
  }

  return results;
}

// ─── Fit map to show all markers ──────────────────────────────────────────
function FitBounds({ incidents }: { incidents: Incident[] }) {
  const map = useMap();

  useEffect(() => {
    if (!incidents.length) return;
    const valid = incidents.filter(
      (inc) => inc.latitude && inc.longitude && !isNaN(inc.latitude) && !isNaN(inc.longitude)
    );
    if (valid.length === 0) return;
    if (valid.length === 1) {
      map.setView([valid[0].latitude, valid[0].longitude], 14);
      return;
    }
    const bounds = L.latLngBounds(valid.map((inc) => [inc.latitude, inc.longitude] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [incidents, map]);

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

// ─── Component ────────────────────────────────────────────────────────────
export interface IncidentClusterMapProps {
  incidents: Incident[] | any[];
  height?: string;
  className?: string;
  onIncidentClick?: (incident: Incident | any) => void;
}

export const IncidentClusterMap: React.FC<IncidentClusterMapProps> = ({
  incidents,
  height = '500px',
  className = '',
  onIncidentClick,
}) => {
  const [mounted, setMounted] = useState(false);
  const [zoom, setZoom] = useState(13);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMarkerClick = useCallback(
    (incident: Incident) => {
      onIncidentClick?.(incident);
    },
    [onIncidentClick]
  );

  const validIncidents = useMemo(
    () => incidents.filter((inc) => inc.latitude && inc.longitude && !isNaN(inc.latitude) && !isNaN(inc.longitude)),
    [incidents]
  );

  // Cluster on every render based on current zoom
  const clustered = useMemo(() => clusterIncidents(validIncidents, zoom), [validIncidents, zoom]);

  const getCategoryColor = (category: string) => CATEGORY_CONFIG[category]?.color || '#6b7280';
  const getSeverityColor = (severity: string) => SEVERITY_COLORS[severity] || SEVERITY_COLORS['MEDIUM'];

  if (!mounted) {
    return (
      <div className={`${className} ${height} bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center`}>
        <div className="text-slate-500 text-sm animate-pulse">Loading map…</div>
      </div>
    );
  }

  const center: [number, number] = [12.9716, 77.5946];

  return (
    <div className={`relative ${className}`}>
      <MapContainer
        center={center}
        zoom={13}
        className="h-full w-full rounded-xl border border-slate-800 z-0"
        scrollWheelZoom
      >
        <ZoomListener onZoomChange={setZoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <FitBounds incidents={validIncidents} />

        {clustered.map((item) => {
          if (item.isCluster) {
            // Cluster marker — big numbered circle
            const clusterColor = getSeverityColor(item.severity);
            const size = item.count >= 10 ? 52 : item.count >= 5 ? 44 : 36;

            const clusterIcon = L.divIcon({
              html: `<div style="
                width:${size}px;height:${size}px;border-radius:50%;
                background:${clusterColor};
                border:3px solid #fff;
                box-shadow:0 2px 12px rgba(0,0,0,0.5);
                display:flex;align-items:center;justify-content:center;
                color:#fff;font-weight:700;font-size:${size >= 44 ? '14px' : '12px'};
              ">${item.count}</div>`,
              className: 'custom-cluster',
              iconSize: L.point(size, size),
            });

            return (
              <Marker key={`cluster-${item.id || item.caseId}`} position={[item.latitude, item.longitude]} icon={clusterIcon}>
                <Popup>
                  <div className="text-xs space-y-1 p-1">
                    <p className="font-bold text-slate-900">{item.count} reports clustered here</p>
                    <p className="text-slate-600">{item.title}</p>
                    <p className="text-slate-500">{item.summary?.slice(0, 100)}</p>
                  </div>
                </Popup>
              </Marker>
            );
          }

          // Single incident marker
          const catColor = getCategoryColor(item.category);
          const sevColor = getSeverityColor(item.severity);

          const markerIcon = L.divIcon({
            html: `<div style="
              width:32px;height:32px;border-radius:50%;
              background:${sevColor};
              border:3px solid #fff;
              box-shadow:0 2px 8px rgba(0,0,0,0.4);
              display:flex;align-items:center;justify-content:center;
              font-size:12px;color:#fff;font-weight:bold;
            "><span style="
              display:inline-block;width:10px;height:10px;border-radius:50%;
              background:${catColor};border:2px solid #fff;
            "></span></div>`,
            className: 'custom-marker',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -18],
          });

          return (
            <Marker
              key={item.id}
              position={[item.latitude, item.longitude]}
              icon={markerIcon}
              eventHandlers={{
                click: () => handleMarkerClick(item),
              }}
            >
              <Popup>
                <div className="text-xs space-y-1 p-1 min-w-[180px]">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white" style={{ background: sevColor }}>
                      {item.severity}
                    </span>
                    <span className="font-mono font-bold text-slate-700">#{item.caseId}</span>
                  </div>
                  <p className="font-bold text-slate-900">{item.title}</p>
                  <p className="text-slate-600">{item.summary?.slice(0, 120)}</p>
                  <p className="text-slate-500 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />{item.address}
                  </p>
                  <p className="text-slate-400">{item.reportCount} reports</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
