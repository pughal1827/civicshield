'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { MapPin, Navigation, ExternalLink, RefreshCw, Eye, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Dynamically import Leaflet map to prevent SSR issues
const IncidentClusterMap = dynamic(
  () => import('@/components/maps/incident-cluster-map').then((mod) => mod.IncidentClusterMap),
  { ssr: false }
);

export default function WorkerMapLocationsPage() {
  const [loading, setLoading] = useState(true);
  const [workerInfo, setWorkerInfo] = useState<any>(null);
  const [incidents, setIncidents] = useState<any[]>([]);

  const fetchWorkerMap = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/worker/incidents');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setWorkerInfo(json.data.worker);
          setIncidents(json.data.incidents || []);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkerMap();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="h-6 w-6 text-orange-500" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Job Locations & Map Telemetry</h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Geographic dispatch map for <span className="font-extrabold text-orange-600">{workerInfo?.departmentName || 'your department'}</span> complaints.
          </p>
        </div>

        <Button onClick={fetchWorkerMap} variant="outline" className="text-xs font-bold gap-2 rounded-xl h-10 border-slate-200">
          <RefreshCw className="h-4 w-4 text-orange-500" />
          <span>Refresh Map</span>
        </Button>
      </div>

      {/* MAP CONTAINER */}
      <div className="bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-xl h-[500px] relative">
        <IncidentClusterMap incidents={incidents} baseCaseUrl="/worker/jobs" />
      </div>

      {/* JOB LOCATIONS DISPATCH CARDS */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
        <div className="font-black text-base text-slate-900 flex items-center gap-2">
          <Navigation className="h-5 w-5 text-orange-500" />
          On-Ground GPS Field Navigation Links
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {incidents.map((inc) => {
            const caseId = inc.caseId || inc.case_id || `CS-${inc.id.substring(0, 4)}`;

            return (
              <div key={inc.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-black text-orange-600">{caseId}</span>
                  <span className="font-bold text-slate-500">{inc.category}</span>
                </div>

                <div className="font-bold text-slate-900 line-clamp-1">{inc.title}</div>
                <div className="text-slate-600 font-medium line-clamp-1">{inc.address}</div>

                <div className="pt-2 flex items-center justify-between">
                  {inc.latitude && inc.longitude ? (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${inc.latitude},${inc.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold transition-colors"
                    >
                      <Navigation className="h-3.5 w-3.5" />
                      <span>Open Navigation</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-medium">GPS pending</span>
                  )}

                  <Link href={`/worker/jobs/${inc.id}`}>
                    <Button size="sm" variant="ghost" className="text-slate-700 hover:text-slate-900 text-xs font-bold gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      <span>Job Details</span>
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
