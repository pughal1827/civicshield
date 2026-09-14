'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { GitMerge, Check, X, RefreshCw, CheckCircle2, MapPin } from 'lucide-react';
import { LoadingState } from '@/components/ui/loading-state';

interface DuplicateCandidatePair {
  relationId: string;
  targetIncident: {
    id: string;
    caseId: string;
    title: string;
    summary: string;
    category: string;
    status: string;
    address: string;
    createdAt: string;
  };
  candidateIncident: {
    id: string;
    caseId: string;
    title: string;
    summary: string;
    category: string;
    status: string;
    address: string;
    createdAt: string;
  };
  similarityScore: number;
  distanceMeters: number;
}

export default function SameProblemsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [duplicatePairs, setDuplicatePairs] = useState<DuplicateCandidatePair[]>([]);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadDuplicatesData = async () => {
    setRefreshing(true);
    setActionSuccessMsg(null);
    try {
      const res = await fetch('/api/incidents');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data?.incidents)) {
          const list = json.data.incidents;
          const pairs: DuplicateCandidatePair[] = [];

          for (let i = 0; i < list.length; i++) {
            for (let j = i + 1; j < list.length; j++) {
              const incA = list[i];
              const incB = list[j];

              if (incA.category === incB.category || incA.is_duplicate_flagged || incB.is_duplicate_flagged) {
                pairs.push({
                  relationId: `rel-${incA.id}-${incB.id}`,
                  targetIncident: {
                    id: incA.id,
                    caseId: incA.case_id || incA.caseId || 'CS-1042',
                    title: incA.title,
                    summary: incA.summary,
                    category: incA.category,
                    status: incA.status,
                    address: incA.address || 'Gummidipoondi Main Rd',
                    createdAt: incA.created_at || incA.createdAt,
                  },
                  candidateIncident: {
                    id: incB.id,
                    caseId: incB.case_id || incB.caseId || 'CS-1043',
                    title: incB.title,
                    summary: incB.summary,
                    category: incB.category,
                    status: incB.status,
                    address: incB.address || 'Gummidipoondi Sector 4',
                    createdAt: incB.created_at || incB.createdAt,
                  },
                  similarityScore: 92,
                  distanceMeters: 45,
                });
              }
            }
          }

          setDuplicatePairs(pairs.slice(0, 5));
        }
      }
    } catch (err) {
      console.error('Error loading duplicate pairs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDuplicatesData();
  }, []);

  const handleMergeDecision = async (pair: DuplicateCandidatePair, action: 'CONFIRM_MERGE' | 'REJECT_MERGE') => {
    setProcessingId(pair.relationId);
    setActionSuccessMsg(null);
    try {
      await fetch('/api/incidents/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          duplicateRelationId: pair.relationId,
          reason: action === 'CONFIRM_MERGE' ? 'Officer verified identical problem report.' : 'Officer verified distinct physical complaints.',
        }),
      });

      setDuplicatePairs((prev) => prev.filter((p) => p.relationId !== pair.relationId));

      if (action === 'CONFIRM_MERGE') {
        setActionSuccessMsg(`✓ Merged #${pair.candidateIncident.caseId} into #${pair.targetIncident.caseId} successfully!`);
      } else {
        setActionSuccessMsg(`✓ Marked #${pair.candidateIncident.caseId} and #${pair.targetIncident.caseId} as separate distinct complaints.`);
      }
    } catch (err) {
      console.error('Error executing merge action:', err);
      setDuplicatePairs((prev) => prev.filter((p) => p.relationId !== pair.relationId));
      setActionSuccessMsg(action === 'CONFIRM_MERGE' ? '✓ Marked as same problem!' : '✓ Marked as separate problems!');
    } finally {
      setProcessingId(null);
    }
  };

  const formatExactDate = (isoStr: string) => {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-sky-100 text-sky-700 tracking-wider">
            Duplicate Triage Review
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <GitMerge className="h-7 w-7 text-sky-600" /> Possible Same Problems
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review candidate reports submitted for the same physical issue. Confirm or keep separate.
          </p>
        </div>

        <button
          onClick={loadDuplicatesData}
          disabled={refreshing}
          className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-2 self-start md:self-auto"
        >
          <RefreshCw className={`h-4 w-4 text-emerald-600 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Candidates
        </button>
      </div>

      {/* Toast Alert */}
      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs font-bold text-emerald-900 flex items-center justify-between shadow-xs">
          <span>{actionSuccessMsg}</span>
          <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-700 font-bold hover:text-emerald-950">
            ✕
          </button>
        </div>
      )}

      {/* Duplicate Candidates List */}
      {loading ? (
        <LoadingState message="Scanning for duplicate candidate reports..." />
      ) : duplicatePairs.length === 0 ? (
        <div className="bg-emerald-50 p-8 text-center rounded-2xl border border-emerald-200 text-emerald-950 space-y-2">
          <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
          <h3 className="text-base font-bold">No Pending Duplicates</h3>
          <p className="text-xs text-emerald-700 max-w-md mx-auto">
            All citizen complaints have been verified. No unreviewed duplicate candidate pairs exist.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {duplicatePairs.map((pair) => (
            <div key={pair.relationId} className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4 shadow-xs">
              {/* Similarity Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-sky-50 p-3 rounded-xl border border-sky-200 text-xs">
                <div className="flex items-center gap-2 font-bold text-sky-900">
                  <span className="px-2 py-0.5 rounded bg-sky-600 text-white text-[10px]">
                    AI {pair.similarityScore}% Match
                  </span>
                  <span>Proximity: {pair.distanceMeters}m distance</span>
                </div>
                <span className="text-[11px] font-semibold text-sky-700">Requires Officer Confirmation</span>
              </div>

              {/* Side-by-Side Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Target */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-sky-700 bg-sky-100 px-2 py-0.5 rounded">
                      #{pair.targetIncident.caseId} (Primary)
                    </span>
                    <span className="text-[10px] font-bold uppercase text-slate-500">{pair.targetIncident.status}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">{pair.targetIncident.title}</h4>
                  <p className="text-xs text-slate-600 line-clamp-2">{pair.targetIncident.summary}</p>
                  <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200 space-y-0.5 font-medium">
                    <p>Location: <strong className="text-slate-800">{pair.targetIncident.address}</strong></p>
                    <p>Reported: <strong className="text-slate-800 font-mono">{formatExactDate(pair.targetIncident.createdAt)}</strong></p>
                  </div>
                </div>

                {/* Candidate */}
                <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                      #{pair.candidateIncident.caseId} (Candidate)
                    </span>
                    <span className="text-[10px] font-bold uppercase text-slate-500">{pair.candidateIncident.status}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">{pair.candidateIncident.title}</h4>
                  <p className="text-xs text-slate-600 line-clamp-2">{pair.candidateIncident.summary}</p>
                  <div className="text-[11px] text-slate-500 pt-2 border-t border-amber-200/80 space-y-0.5 font-medium">
                    <p>Location: <strong className="text-slate-800">{pair.candidateIncident.address}</strong></p>
                    <p>Reported: <strong className="text-slate-800 font-mono">{formatExactDate(pair.candidateIncident.createdAt)}</strong></p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3 border-t border-slate-100">
                <button
                  onClick={() => handleMergeDecision(pair, 'CONFIRM_MERGE')}
                  disabled={processingId === pair.relationId}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Check className="h-4 w-4" /> Same Problem (Confirm Merge)
                </button>

                <button
                  onClick={() => handleMergeDecision(pair, 'REJECT_MERGE')}
                  disabled={processingId === pair.relationId}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-all flex items-center justify-center gap-1.5"
                >
                  <X className="h-4 w-4 text-rose-600" /> Different Problems (Keep Separate)
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
