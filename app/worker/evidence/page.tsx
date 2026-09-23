'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Camera,
  CheckCircle2,
  Shield,
  Eye,
  Clock,
  MapPin,
  Search,
  Filter,
  AlertTriangle,
  FileCheck,
  Building,
  ImageOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getWorkerAuthHeaders } from '@/lib/auth/worker-client';

export default function WorkerEvidenceVaultPage() {
  const [loading, setLoading] = useState(true);
  const [workerInfo, setWorkerInfo] = useState<any>(null);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'WAITING_FOR_APPROVAL' | 'RESOLVED' | 'EVIDENCE_REJECTED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/worker/incidents', {
      credentials: 'same-origin',
      headers: getWorkerAuthHeaders(),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setWorkerInfo(json.data.worker);
          setIncidents(json.data.incidents || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Filter & Search Logic
  const filteredIncidents = incidents.filter((inc) => {
    // Status Filter
    if (activeFilter === 'WAITING_FOR_APPROVAL' && inc.status !== 'WAITING_FOR_APPROVAL') {
      return false;
    }
    if (activeFilter === 'RESOLVED' && inc.status !== 'RESOLVED' && inc.status !== 'VERIFIED') {
      return false;
    }
    if (activeFilter === 'EVIDENCE_REJECTED' && inc.status !== 'EVIDENCE_REJECTED') {
      return false;
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const caseId = (inc.caseId || inc.case_id || `CS-${inc.id.substring(0, 4)}`).toLowerCase();
      const title = (inc.title || '').toLowerCase();
      const address = (inc.address || '').toLowerCase();
      return caseId.includes(q) || title.includes(q) || address.includes(q);
    }

    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'WAITING_FOR_APPROVAL':
        return (
          <span className="font-extrabold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 flex items-center gap-1 text-[11px]">
            <Clock className="h-3 w-3 text-amber-600 animate-pulse" />
            <span>WAITING FOR APPROVAL</span>
          </span>
        );
      case 'RESOLVED':
      case 'VERIFIED':
        return (
          <span className="font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1 text-[11px]">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            <span>RESOLVED</span>
          </span>
        );
      case 'EVIDENCE_REJECTED':
        return (
          <span className="font-extrabold text-rose-800 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200 flex items-center gap-1 text-[11px]">
            <AlertTriangle className="h-3 w-3 text-rose-600" />
            <span>EVIDENCE REJECTED</span>
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="font-extrabold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 text-[11px]">
            IN PROGRESS
          </span>
        );
      default:
        return (
          <span className="font-extrabold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 text-[11px]">
            {status.replace(/_/g, ' ')}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-50 border border-orange-200 text-orange-600">
              <Camera className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">On-Ground Evidence Vault</h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1.5 flex items-center gap-1.5">
            <Building className="h-3.5 w-3.5 text-orange-500" />
            <span>Proof of resolution submitted for</span>
            <span className="font-extrabold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
              {workerInfo?.departmentName || 'Department'}
            </span>
          </p>
        </div>

        {/* SEARCH BOX */}
        <div className="relative min-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Case ID or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder:text-slate-400 shadow-xs"
          />
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1 shrink-0">
          <Filter className="h-3.5 w-3.5" />
          Filter:
        </span>
        <button
          onClick={() => setActiveFilter('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeFilter === 'ALL'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All ({incidents.length})
        </button>
        <button
          onClick={() => setActiveFilter('WAITING_FOR_APPROVAL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            activeFilter === 'WAITING_FOR_APPROVAL'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
          }`}
        >
          <Clock className="h-3 w-3" />
          Waiting for Approval ({incidents.filter((i) => i.status === 'WAITING_FOR_APPROVAL').length})
        </button>
        <button
          onClick={() => setActiveFilter('RESOLVED')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            activeFilter === 'RESOLVED'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
          }`}
        >
          <CheckCircle2 className="h-3 w-3" />
          Approved / Resolved ({incidents.filter((i) => i.status === 'RESOLVED' || i.status === 'VERIFIED').length})
        </button>
        <button
          onClick={() => setActiveFilter('EVIDENCE_REJECTED')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            activeFilter === 'EVIDENCE_REJECTED'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
          }`}
        >
          <AlertTriangle className="h-3 w-3" />
          Rejected ({incidents.filter((i) => i.status === 'EVIDENCE_REJECTED').length})
        </button>
      </div>

      {/* LOADING STATE */}
      {loading && (
        <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-slate-200">
          <div className="h-8 w-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-xs font-bold text-slate-500">Loading department evidence records...</div>
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && filteredIncidents.length === 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 max-w-md mx-auto my-6 shadow-xs">
          <div className="h-16 w-16 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mx-auto border border-orange-100 shadow-xs">
            <Camera className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-900">No Evidence Records Found</h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
              {searchQuery || activeFilter !== 'ALL'
                ? 'No evidence records match your filter criteria or search query.'
                : `Completed field jobs with submitted photo evidence for ${workerInfo?.departmentName || 'your department'} will appear here.`}
            </p>
          </div>
          {(searchQuery || activeFilter !== 'ALL') && (
            <Button
              onClick={() => {
                setActiveFilter('ALL');
                setSearchQuery('');
              }}
              variant="outline"
              className="text-xs font-bold rounded-xl border-slate-200"
            >
              Reset Filters
            </Button>
          )}
        </div>
      )}

      {/* CARD GRID */}
      {!loading && filteredIncidents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIncidents.map((inc) => {
            const caseId = inc.caseId || inc.case_id || `CS-${inc.id.substring(0, 4)}`;

            // Photo Resolution Logic: Prefer uploaded after photo, evidence proof photo, before photo, or clean fallback
            const proofImg =
              inc.evidence?.proof_image_url ||
              inc.after_photo_url ||
              inc.afterPhotoUrl ||
              inc.afterPhoto ||
              inc.before_photo_url ||
              inc.imageUrl;

            // Check if proofImg is a real uploaded or seed image (and not default officer illustration)
            const hasRealPhoto =
              proofImg &&
              typeof proofImg === 'string' &&
              proofImg !== '/images/officer_command.jpg' &&
              (proofImg.startsWith('data:image') ||
                proofImg.startsWith('http://') ||
                proofImg.startsWith('https://') ||
                proofImg.startsWith('/images/') ||
                proofImg.startsWith('/uploads/'));

            return (
              <div
                key={inc.id}
                className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div className="space-y-3.5">
                  {/* TOP ROW: CASE ID & STATUS BADGE */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black text-orange-700 bg-orange-50 px-3 py-1 rounded-full border border-orange-200 text-xs tracking-wide">
                      {caseId}
                    </span>
                    {getStatusBadge(inc.status)}
                  </div>

                  {/* TITLE */}
                  <h3 className="font-black text-slate-900 text-sm leading-snug line-clamp-2 min-h-[2.5rem]">
                    {inc.title}
                  </h3>

                  {/* PHOTO EVIDENCE PREVIEW */}
                  <div className="relative h-48 w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 group">
                    {hasRealPhoto ? (
                      <>
                        <Image
                          src={proofImg}
                          alt={`Evidence for ${caseId}`}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur-md text-white px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1">
                          <Camera className="h-3 w-3 text-orange-400" />
                          <span>Field Evidence</span>
                        </div>
                      </>
                    ) : (
                      <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 space-y-1.5 p-4 text-center">
                        <ImageOff className="h-8 w-8 text-slate-300" />
                        <span className="text-xs font-semibold text-slate-500">No evidence image uploaded</span>
                      </div>
                    )}
                  </div>

                  {/* LOCATION & NOTES PREVIEW */}
                  <div className="space-y-1 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                      <MapPin className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                      <span className="line-clamp-1">{inc.address || 'Location on spatial map'}</span>
                    </div>

                    {inc.evidence?.resolution_notes && (
                      <p className="text-[11px] text-slate-500 line-clamp-1 italic pt-0.5">
                        &quot;{inc.evidence.resolution_notes}&quot;
                      </p>
                    )}
                  </div>
                </div>

                {/* ACTION BUTTON */}
                <div className="pt-2">
                  <Link href={`/worker/evidence/${inc.id}`} className="block">
                    <Button className="w-full bg-slate-900 hover:bg-orange-600 text-white text-xs font-bold rounded-xl h-10 gap-2 transition-colors shadow-xs">
                      <Eye className="h-3.5 w-3.5 text-orange-400" />
                      <span>View Evidence Record</span>
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
