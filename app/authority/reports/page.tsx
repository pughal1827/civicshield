'use client';

import React, { useEffect, useState } from 'react';
import { BarChart3, Download, Printer, Calendar, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';
import { LoadingState } from '@/components/ui/loading-state';

interface IncidentItem {
  id: string;
  caseId: string;
  title: string;
  category: string;
  severity: string;
  status: string;
  priorityScore: number;
  departmentName?: string;
  address?: string;
  createdAt: string;
}

export default function AuthorityReportsPage() {
  const [loading, setLoading] = useState(false);
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [fromDate, setFromDate] = useState<string>('2026-09-01');
  const [toDate, setToDate] = useState<string>('2026-09-14');

  const fetchIncidentsForReport = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/incidents');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data?.incidents)) {
          setIncidents(json.data.incidents);
        }
      }
    } catch (err) {
      console.error('Error fetching report data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidentsForReport();
  }, []);

  const filteredForDateRange = incidents.filter((inc) => {
    if (!inc.createdAt) return true;
    const incDate = inc.createdAt.split('T')[0];
    if (fromDate && incDate < fromDate) return false;
    if (toDate && incDate > toDate) return false;
    return true;
  });

  const totalCount = filteredForDateRange.length;
  const criticalCount = filteredForDateRange.filter((i) => i.severity === 'CRITICAL' || i.priorityScore >= 80).length;
  const highCount = filteredForDateRange.filter((i) => i.severity === 'HIGH' || (i.priorityScore >= 60 && i.priorityScore < 80)).length;
  const mediumCount = filteredForDateRange.filter((i) => i.severity === 'MEDIUM' || (i.priorityScore >= 40 && i.priorityScore < 60)).length;
  const lowCount = filteredForDateRange.filter((i) => i.severity === 'LOW' || i.priorityScore < 40).length;

  const workingCount = filteredForDateRange.filter((i) => i.status === 'ASSIGNED' || i.status === 'IN_PROGRESS').length;
  const solvedCount = filteredForDateRange.filter((i) => i.status === 'RESOLVED' || i.status === 'VERIFIED').length;
  const lateCount = filteredForDateRange.filter((i) => {
    const isUnsolved = i.status !== 'RESOLVED' && i.status !== 'VERIFIED';
    const createdTime = new Date(i.createdAt).getTime();
    const hoursElapsed = (Date.now() - createdTime) / (1000 * 3600);
    return isUnsolved && ((i.severity === 'CRITICAL' && hoursElapsed > 4) || (i.severity === 'HIGH' && hoursElapsed > 24) || hoursElapsed > 72);
  }).length;

  const deptCounts: Record<string, number> = {};
  filteredForDateRange.forEach((i) => {
    const dName = i.departmentName || 'Road Maintenance';
    deptCounts[dName] = (deptCounts[dName] || 0) + 1;
  });

  const handleDownloadReport = () => {
    const reportText = `
==================================================
CIVICSHIELD AI — MUNICIPAL AUTHORITY EXECUTIVE REPORT
==================================================
Jurisdiction: Gummidipoondi Zone
Date Range: ${fromDate} to ${toDate}
Generated On: ${new Date().toLocaleString()}

SUMMARY STATISTICS:
--------------------------------------------------
Total Complaints: ${totalCount}
Critical Priority: ${criticalCount}
High Priority: ${highCount}
Medium Priority: ${mediumCount}
Low Priority: ${lowCount}

WORKFLOW STATUS:
--------------------------------------------------
In Progress / Working: ${workingCount}
Resolved / Solved: ${solvedCount}
Late / SLA Overdue: ${lateCount}

DEPARTMENT BREAKDOWN:
--------------------------------------------------
${Object.entries(deptCounts)
  .map(([dept, count]) => `${dept}: ${count} complaints`)
  .join('\n')}

==================================================
End of Official Municipal Telemetry Report
==================================================
`;

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CivicShield_Report_${fromDate}_to_${toDate}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:p-0">
      {/* Header (Hidden in print) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4 print:hidden">
        <div>
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-sky-100 text-sky-700 tracking-wider">
            Executive Reporting
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-sky-600" /> Municipal Authority Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Generate official complaint resolution telemetry reports for higher authorities.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={handleDownloadReport}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1.5"
          >
            <Download className="h-4 w-4 text-sky-600" /> Download Report
          </button>
          <button
            onClick={handlePrintReport}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl transition-all shadow-2xs flex items-center gap-1.5"
          >
            <Printer className="h-4 w-4" /> Print Report
          </button>
        </div>
      </div>

      {/* Date Range Selector Form (Hidden in print) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-3 shadow-2xs print:hidden">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-sky-600" /> Select Date Range
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
            />
          </div>

          <div>
            <button
              onClick={fetchIncidentsForReport}
              disabled={loading}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-2xs"
            >
              Generate Official Report
            </button>
          </div>
        </div>
      </div>

      {/* Report Summary */}
      {loading ? (
        <LoadingState message="Generating executive report..." />
      ) : (
        <div className="bg-white p-8 rounded-2xl border border-slate-200/80 space-y-8 shadow-xs print:border-none print:shadow-none print:p-0">
          <div className="border-b border-slate-200 pb-4 flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-sky-600 uppercase tracking-widest block">
                CivicShield AI • Municipal Telemetry Report
              </span>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                Executive Complaint Resolution Summary
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Zone: <strong>Gummidipoondi Zone</strong> • Period: <strong>{fromDate}</strong> to <strong>{toDate}</strong>
              </p>
            </div>
            <div className="text-right text-xs text-slate-500 font-mono">
              <span>Generated: {new Date().toLocaleDateString('en-GB')}</span>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Complaints</span>
              <span className="text-3xl font-black text-slate-900 mt-1 block">{totalCount}</span>
            </div>
            <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 text-center">
              <span className="text-[10px] font-bold text-rose-600 uppercase block">Critical Priority</span>
              <span className="text-3xl font-black text-rose-600 mt-1 block">{criticalCount}</span>
            </div>
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-center">
              <span className="text-[10px] font-bold text-amber-600 uppercase block">High Priority</span>
              <span className="text-3xl font-black text-amber-600 mt-1 block">{highCount}</span>
            </div>
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-center">
              <span className="text-[10px] font-bold text-emerald-600 uppercase block">Resolved / Solved</span>
              <span className="text-3xl font-black text-emerald-600 mt-1 block">{solvedCount}</span>
            </div>
          </div>

          {/* Department Breakdown Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Department Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px]">
                    <th className="py-2 px-3">Department Name</th>
                    <th className="py-2 px-3 text-right">Complaint Count</th>
                    <th className="py-2 px-3 text-right">Percentage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(deptCounts).map(([dept, count]) => {
                    const pct = totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) : '0';
                    return (
                      <tr key={dept} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{dept}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-sky-600">{count}</td>
                        <td className="py-2.5 px-3 text-right text-slate-500">{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
