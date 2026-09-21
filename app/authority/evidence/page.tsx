'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Camera,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck,
  Search,
  Filter,
  Calendar,
  Building2,
  UserCheck,
  MapPin,
  Eye,
  X,
  Check,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AuthorityEvidenceApprovalPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [evidenceItems, setEvidenceItems] = useState<any[]>([]);
  const [stats, setStats] = useState({ pendingCount: 0, approvedCount: 0, rejectedCount: 0, totalCount: 0 });

  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchEvidenceData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/authority/evidence');
      const json = await res.json();

      if (res.status === 403) {
        setError(json.error?.message || 'Access Denied: Only Authority Officers can access Evidence Approval.');
        return;
      }

      if (!res.ok || !json.success) {
        setError(json.error?.message || 'Failed to fetch evidence records.');
        return;
      }

      setEvidenceItems(json.data.evidenceItems || []);
      setStats(json.data.stats || { pendingCount: 0, approvedCount: 0, rejectedCount: 0, totalCount: 0 });
    } catch (err) {
      console.error('Error fetching evidence approval data:', err);
      setError('Connection error loading evidence records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvidenceData();
  }, []);

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return 'N/A';
    try {
      const d = new Date(isoStr);
      return (
        d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
        ', ' +
        d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      );
    } catch {
      return isoStr;
    }
  };

  // Filter Logic
  const filteredItems = evidenceItems.filter((item) => {
    // Tab Filter
    if (activeTab === 'PENDING' && item.evidenceStatus !== 'PENDING') return false;
    if (activeTab === 'APPROVED' && item.evidenceStatus !== 'APPROVED') return false;
    if (activeTab === 'REJECTED' && item.evidenceStatus !== 'REJECTED') return false;

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const caseId = (item.caseId || '').toLowerCase();
      const title = (item.title || '').toLowerCase();
      const worker = (item.workerName || '').toLowerCase();
      const dept = (item.departmentName || '').toLowerCase();
      const address = (item.address || '').toLowerCase();
      const matches = caseId.includes(q) || title.includes(q) || worker.includes(q) || dept.includes(q) || address.includes(q);
      if (!matches) return false;
    }

    // Date Range Filter
    if (fromDate) {
      const itemDate = new Date(item.submittedAt).getTime();
      const filterFrom = new Date(fromDate).getTime();
      if (itemDate < filterFrom) return false;
    }

    if (toDate) {
      const itemDate = new Date(item.submittedAt).getTime();
      const filterTo = new Date(toDate).getTime() + 86400000; // include full toDate
      if (itemDate > filterTo) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* PAGE TITLE & SUBTITLE */}
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-orange-500 text-white shadow-md shadow-orange-500/20">
            <Camera className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Evidence Approval</h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Review field evidence submitted by department workers before closing complaints.
            </p>
          </div>
        </div>
      </div>

      {/* ERROR / ACCESS DENIED STATE */}
      {error && (
        <div className="p-6 rounded-3xl bg-rose-50 border-2 border-rose-200 text-rose-900 space-y-3">
          <div className="flex items-center gap-2 text-rose-800 font-black text-sm">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
            <span>Authorization Error</span>
          </div>
          <p className="text-xs font-semibold">{error}</p>
        </div>
      )}

      {/* SUMMARY METRIC CARDS GRID (4 CARDS) */}
      {!loading && !error && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            onClick={() => setActiveTab('PENDING')}
            className={`p-5 rounded-3xl border transition-all cursor-pointer shadow-xs ${
              activeTab === 'PENDING'
                ? 'bg-amber-500 text-white border-amber-600 shadow-md scale-[1.02]'
                : 'bg-white text-slate-900 border-slate-200 hover:border-amber-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-extrabold uppercase opacity-90">
              <span>Pending Review</span>
              <Clock className="h-4 w-4" />
            </div>
            <div className="text-3xl font-black mt-2 tracking-tight">{stats.pendingCount}</div>
            <div className="text-[10px] font-bold mt-1 opacity-80">Awaiting officer verification</div>
          </div>

          <div
            onClick={() => setActiveTab('APPROVED')}
            className={`p-5 rounded-3xl border transition-all cursor-pointer shadow-xs ${
              activeTab === 'APPROVED'
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-md scale-[1.02]'
                : 'bg-white text-slate-900 border-slate-200 hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-extrabold uppercase opacity-90">
              <span>Approved</span>
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="text-3xl font-black mt-2 tracking-tight">{stats.approvedCount}</div>
            <div className="text-[10px] font-bold mt-1 opacity-80">Resolved & closed complaints</div>
          </div>

          <div
            onClick={() => setActiveTab('REJECTED')}
            className={`p-5 rounded-3xl border transition-all cursor-pointer shadow-xs ${
              activeTab === 'REJECTED'
                ? 'bg-rose-600 text-white border-rose-700 shadow-md scale-[1.02]'
                : 'bg-white text-slate-900 border-slate-200 hover:border-rose-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-extrabold uppercase opacity-90">
              <span>Rejected</span>
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="text-3xl font-black mt-2 tracking-tight">{stats.rejectedCount}</div>
            <div className="text-[10px] font-bold mt-1 opacity-80">Returned for field rework</div>
          </div>

          <div
            onClick={() => setActiveTab('ALL')}
            className={`p-5 rounded-3xl border transition-all cursor-pointer shadow-xs ${
              activeTab === 'ALL'
                ? 'bg-slate-900 text-white border-slate-950 shadow-md scale-[1.02]'
                : 'bg-white text-slate-900 border-slate-200 hover:border-slate-400'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-extrabold uppercase opacity-90">
              <span>Total Evidence</span>
              <FileCheck className="h-4 w-4" />
            </div>
            <div className="text-3xl font-black mt-2 tracking-tight">{stats.totalCount}</div>
            <div className="text-[10px] font-bold mt-1 opacity-80">Total submitted field proofs</div>
          </div>
        </div>
      )}

      {/* FILTER TABS & SEARCH / DATE CONTROLS */}
      {!loading && !error && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-4 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* TABS */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
              <button
                onClick={() => setActiveTab('PENDING')}
                className={`px-4 py-2 rounded-2xl text-xs font-black transition-all shrink-0 flex items-center gap-2 ${
                  activeTab === 'PENDING'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-amber-50'
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                Pending Review ({stats.pendingCount})
              </button>
              <button
                onClick={() => setActiveTab('APPROVED')}
                className={`px-4 py-2 rounded-2xl text-xs font-black transition-all shrink-0 flex items-center gap-2 ${
                  activeTab === 'APPROVED'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-emerald-50'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Approved ({stats.approvedCount})
              </button>
              <button
                onClick={() => setActiveTab('REJECTED')}
                className={`px-4 py-2 rounded-2xl text-xs font-black transition-all shrink-0 flex items-center gap-2 ${
                  activeTab === 'REJECTED'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-rose-50'
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Rejected ({stats.rejectedCount})
              </button>
              <button
                onClick={() => setActiveTab('ALL')}
                className={`px-4 py-2 rounded-2xl text-xs font-black transition-all shrink-0 ${
                  activeTab === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All ({stats.totalCount})
              </button>
            </div>

            {/* SEARCH BOX */}
            <div className="relative min-w-[260px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search Case ID, complaint, worker..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* DATE RANGE FILTER */}
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 text-xs">
            <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-500" /> Date Range:
            </span>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium text-[11px]">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium text-[11px]">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800"
              />
            </div>
            {(fromDate || toDate || searchQuery) && (
              <button
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                  setSearchQuery('');
                }}
                className="text-[11px] font-extrabold text-orange-600 hover:text-orange-700 bg-orange-50 px-2.5 py-1 rounded-xl border border-orange-200"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* LOADING STATE */}
      {loading && (
        <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-slate-200">
          <div className="h-8 w-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-xs font-bold text-slate-500">Loading submitted evidence records...</div>
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && !error && filteredItems.length === 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 max-w-md mx-auto my-6 shadow-xs">
          <div className="h-16 w-16 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mx-auto border border-orange-100 shadow-xs">
            <Camera className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-900">No Evidence Records Found</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {searchQuery || fromDate || toDate
                ? 'No evidence submissions match your search query or date range filters.'
                : activeTab === 'PENDING'
                ? 'No pending field evidence requiring officer review at this time.'
                : `No evidence records in the ${activeTab.toLowerCase()} list.`}
            </p>
          </div>
        </div>
      )}

      {/* EVIDENCE CARDS LIST */}
      {!loading && !error && filteredItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const hasAfterPhoto = Boolean(item.afterPhotoUrl && item.afterPhotoUrl !== '/images/officer_command.jpg');

            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div className="space-y-3.5">
                  {/* CASE ID & STATUS BADGE */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <span className="font-mono font-black text-xs text-sky-700 bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
                      #{item.caseId}
                    </span>
                    {item.evidenceStatus === 'PENDING' && (
                      <span className="font-extrabold text-amber-900 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full text-[11px] flex items-center gap-1">
                        <Clock className="h-3 w-3 text-amber-600 animate-pulse" />
                        <span>🟡 WAITING FOR APPROVAL</span>
                      </span>
                    )}
                    {item.evidenceStatus === 'APPROVED' && (
                      <span className="font-extrabold text-emerald-900 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full text-[11px] flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        <span>🟢 APPROVED</span>
                      </span>
                    )}
                    {item.evidenceStatus === 'REJECTED' && (
                      <span className="font-extrabold text-rose-900 bg-rose-100 border border-rose-300 px-3 py-1 rounded-full text-[11px] flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-rose-600" />
                        <span>🔴 REJECTED</span>
                      </span>
                    )}
                  </div>

                  {/* TITLE */}
                  <h3 className="font-black text-slate-900 text-sm leading-snug line-clamp-2 min-h-[2.5rem]">
                    {item.title}
                  </h3>

                  {/* PHOTO PREVIEW */}
                  <div className="relative h-44 w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 group">
                    {hasAfterPhoto ? (
                      <>
                        <Image
                          src={item.afterPhotoUrl}
                          alt={`Field evidence for #${item.caseId}`}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute bottom-2 right-2 bg-slate-900/85 text-white px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1">
                          <Camera className="h-3 w-3 text-orange-400" />
                          <span>Submitted Evidence</span>
                        </div>
                      </>
                    ) : (
                      <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 space-y-1 p-4 text-center">
                        <Camera className="h-7 w-7 text-slate-300" />
                        <span className="text-[11px] font-semibold text-slate-500">Field Photo Attached</span>
                      </div>
                    )}
                  </div>

                  {/* DETAILS GRID */}
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-semibold">Department:</span>
                      <span className="font-bold text-slate-900 line-clamp-1">{item.departmentName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-semibold">Worker:</span>
                      <span className="font-bold text-orange-600">{item.workerName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-semibold">Submitted:</span>
                      <span className="font-mono font-bold text-slate-700 text-[11px]">{formatDate(item.submittedAt)}</span>
                    </div>
                    {item.evidenceStatus === 'REJECTED' && item.rejectionReason && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-[11px] mt-1 italic">
                        &quot;{item.rejectionReason}&quot;
                      </div>
                    )}
                  </div>
                </div>

                {/* ACTION BUTTON */}
                <div className="pt-3">
                  <Link href={`/authority/evidence/${item.id}`} className="block">
                    <Button className="w-full bg-slate-900 hover:bg-orange-600 text-white text-xs font-bold rounded-xl h-10 gap-2 transition-colors shadow-xs">
                      <Eye className="h-3.5 w-3.5 text-orange-400" />
                      <span>View Evidence</span>
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
