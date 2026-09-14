'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield,
  User,
  Mail,
  Building2,
  MapPin,
  Award,
  CheckCircle2,
  Clock,
  ShieldCheck,
  LogOut,
  ArrowLeft,
  Key,
  BadgeCheck,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OfficerData {
  id: string;
  fullName: string;
  email: string;
  role: string;
  departmentName: string;
  area: string;
  officerId: string;
}

export default function AuthorityProfilePage() {
  const router = useRouter();
  const [officer, setOfficer] = useState<OfficerData>({
    id: '',
    fullName: 'Officer Robert Chen',
    email: 'officer@civicshield.gov',
    role: 'AUTHORITY',
    departmentName: 'Road Maintenance & Infrastructure',
    area: 'Gummidipoondi Municipal Zone',
    officerId: 'CS-OFF-9042',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.user) {
          const u = json.data.user;
          setOfficer({
            id: u.id || '',
            fullName: u.fullName || 'Officer Robert Chen',
            email: u.email || 'officer@civicshield.gov',
            role: u.role || 'AUTHORITY',
            departmentName: u.department?.name || 'Road Maintenance & Infrastructure',
            area: u.area || u.department?.name || 'Gummidipoondi Municipal Zone',
            officerId: `CS-OFF-${(u.id || '9042').slice(0, 4).toUpperCase()}`,
          });
        }
      })
      .catch((err) => console.error('Failed to fetch officer profile:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/authority/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'RC';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[#0b132b] text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <Link
            href="/authority"
            className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold mb-2 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold uppercase tracking-wider">
              Official Profile
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-xs text-slate-400 font-mono">Municipal Authority</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            Officer Profile & Credentials
          </h1>
        </div>

        {/* Action Logout Button */}
        <Button
          onClick={handleLogout}
          variant="outline"
          className="border-rose-900/60 bg-rose-950/30 text-rose-300 hover:bg-rose-900/50 hover:border-rose-700 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </Button>
      </div>

      {/* Main Profile Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Officer Identity Card */}
        <div className="lg:col-span-1 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl flex flex-col justify-between">
          <div className="space-y-5 text-center">
            
            {/* Avatar Circle */}
            <div className="relative inline-block">
              <div className="h-24 w-24 rounded-3xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white font-black text-2xl flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/20 border-2 border-cyan-400/40">
                {getInitials(officer.fullName)}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 p-1.5 rounded-full shadow-md border-2 border-slate-900">
                <BadgeCheck className="h-4 w-4" />
              </div>
            </div>

            {/* Officer Name & Badge */}
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-white">{officer.fullName}</h2>
              <p className="text-xs font-mono text-cyan-400 font-bold">{officer.officerId}</p>
              <div className="pt-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-[11px] font-semibold border border-slate-700">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  Verified Municipal Officer
                </span>
              </div>
            </div>

          </div>

          {/* Quick Contact Details */}
          <div className="space-y-3 pt-4 border-t border-slate-800/80 text-xs">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/60">
              <Mail className="h-4 w-4 text-cyan-400 shrink-0" />
              <div className="truncate">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Official Email</span>
                <span className="text-slate-200 font-mono font-medium truncate block">{officer.email}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/60">
              <Building2 className="h-4 w-4 text-cyan-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Department</span>
                <span className="text-slate-200 font-semibold block">{officer.departmentName}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/60">
              <MapPin className="h-4 w-4 text-cyan-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Assigned Zone</span>
                <span className="text-slate-200 font-semibold block">{officer.area}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Operational Metrics & System Privileges */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Performance Overview Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-extrabold uppercase">Total Handled</span>
                <Activity className="h-4 w-4 text-cyan-400" />
              </div>
              <p className="text-2xl font-black text-white">142</p>
              <p className="text-[10px] text-emerald-400 font-medium">+12 this month</p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-extrabold uppercase">Resolution Rate</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-black text-white">96.4%</p>
              <p className="text-[10px] text-slate-400 font-medium">Top 5% Officers</p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-extrabold uppercase">Avg SLA Speed</span>
                <Clock className="h-4 w-4 text-amber-400" />
              </div>
              <p className="text-2xl font-black text-white">1.8d</p>
              <p className="text-[10px] text-emerald-400 font-medium">Under SLA Limit</p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-extrabold uppercase">Rating</span>
                <Award className="h-4 w-4 text-yellow-400" />
              </div>
              <p className="text-2xl font-black text-white">4.9/5</p>
              <p className="text-[10px] text-slate-400 font-medium">Citizen Verified</p>
            </div>

          </div>

          {/* System Permissions & Access Details Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <ShieldCheck className="h-5 w-5 text-cyan-400" />
              <span>Portal System Privileges & RBAC Role</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-1.5">
                <span className="text-cyan-400 font-bold block">Access Level</span>
                <p className="text-slate-300 font-medium leading-relaxed">
                  Full Authority Triage & Incident Dispatch permissions enabled for {officer.area}.
                </p>
              </div>

              <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-1.5">
                <span className="text-cyan-400 font-bold block">AI Assist Cross-Check</span>
                <p className="text-slate-300 font-medium leading-relaxed">
                  Authorized to override or confirm Gemini AI severity scores and department routing.
                </p>
              </div>

              <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-1.5">
                <span className="text-cyan-400 font-bold block">Duplicate Merge Override</span>
                <p className="text-slate-300 font-medium leading-relaxed">
                  Master candidate duplicate merge and complaint linking privileges active.
                </p>
              </div>

              <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-1.5">
                <span className="text-cyan-400 font-bold block">Executive Reporting</span>
                <p className="text-slate-300 font-medium leading-relaxed">
                  Export permission for ward summary performance reports and SLA audit logs.
                </p>
              </div>
            </div>
          </div>

          {/* Account Security Box */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Key className="h-5 w-5 text-amber-400" />
              <span>Security & Credentials</span>
            </h3>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              <div>
                <span className="font-bold text-slate-200 block">Supabase Authentication</span>
                <span className="text-slate-400 text-[11px] block mt-0.5">
                  Connected via RBAC Authority Guard (`role: AUTHORITY`)
                </span>
              </div>
              <Button variant="outline" className="text-xs border-slate-700 text-slate-300 hover:bg-slate-800">
                Change Password
              </Button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
