'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Shield,
  HardHat,
  Wrench,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertTriangle,
  UserCheck,
  Building2,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { setStoredWorker } from '@/lib/auth/worker-client';

export default function DepartmentWorkerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('road.worker@civicshield.demo');
  const [password, setPassword] = useState('Worker@123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const demoAccounts = [
    {
      role: 'Road Maintenance Worker',
      email: 'road.worker@civicshield.demo',
      pass: 'Worker@123',
      dept: 'Road Maintenance',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
      icon: '🚗',
    },
    {
      role: 'Electrical Worker',
      email: 'electrical.worker@civicshield.demo',
      pass: 'Worker@123',
      dept: 'Electrical',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      icon: '⚡',
    },
    {
      role: 'Garbage / Sanitation Worker',
      email: 'garbage.worker@civicshield.demo',
      pass: 'Worker@123',
      dept: 'Garbage / Sanitation',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      icon: '🗑️',
    },
    {
      role: 'Water Worker',
      email: 'water.worker@civicshield.demo',
      pass: 'Worker@123',
      dept: 'Water',
      badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      icon: '💧',
    },
    {
      role: 'Drainage Worker',
      email: 'drainage.worker@civicshield.demo',
      pass: 'Worker@123',
      dept: 'Drainage',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: '🌊',
    },
    {
      role: 'Traffic Worker',
      email: 'traffic.worker@civicshield.demo',
      pass: 'Worker@123',
      dept: 'Traffic',
      badgeColor: 'bg-orange-100 text-orange-800 border-orange-200',
      icon: '🚦',
    },
    {
      role: 'Public Works Worker',
      email: 'publicworks.worker@civicshield.demo',
      pass: 'Worker@123',
      dept: 'Public Works',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      icon: '🏛️',
    },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your department email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, portal: 'WORKER' }),
      });

      const json = await res.json();

      if (json.success) {
        if (json.data.user?.role === 'CITIZEN') {
          setError('Access Denied: Citizen accounts cannot access the Department Worker Portal.');
        } else {
          setStoredWorker(json.data.user, json.data.token);
          router.push('/worker/dashboard');
          router.refresh();
        }
      } else {
        setError(json.error?.message || 'Invalid department worker credentials.');
      }
    } catch {
      setError('Connection error. Please check network connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (acc: typeof demoAccounts[0]) => {
    setEmail(acc.email);
    setPassword(acc.pass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-between relative overflow-x-hidden">
      
      {/* SPLIT SCREEN CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-screen">
        
        {/* LEFT SIDE: BRAND & MUNICIPAL FIELD WORKER HERO */}
        <div className="lg:col-span-6 relative flex flex-col justify-between p-6 sm:p-10 lg:p-14 overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-200/80 min-h-[440px] lg:min-h-auto">
          
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/worker_field_hero.jpg"
              alt="Department worker in safety gear"
              fill
              className="object-cover object-center"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-50/95 via-slate-50/80 to-slate-50/40" />
          </div>

          <div className="relative z-10">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="h-11 w-11 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
                <Shield className="h-6 w-6 fill-white/20 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-extrabold tracking-tight text-slate-900">CivicShield</span>
                  <span className="text-xl font-extrabold text-orange-500">WORKER</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium tracking-wide">Safer Cities. Stronger Communities.</p>
              </div>
            </Link>
          </div>

          <div className="relative z-10 my-auto py-8 max-w-xl space-y-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100/90 border border-orange-200/90 text-orange-900 text-xs font-black shadow-xs">
              <HardHat className="h-4 w-4 text-orange-600" />
              <span>Department Field Operations Portal</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Department Worker <span className="text-orange-600 underline decoration-orange-300 decoration-wavy underline-offset-8">Field Access</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-medium">
              Access your assigned department civic jobs, update status, and submit on-ground evidence.
            </p>

            <div className="p-4 rounded-2xl bg-white/90 border border-slate-200/90 shadow-xs space-y-2 backdrop-blur-xs">
              <div className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                <Shield className="h-4 w-4 text-orange-600" />
                Backend Department Isolation Active
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Each worker account is strictly locked to their department. Workers can only view and complete complaints assigned to their specific department.
              </p>
            </div>
          </div>

          <div className="relative z-10 pt-4 flex items-center gap-2 text-xs font-bold text-slate-600">
            <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
            <span>Authorized Department Personnel & Field Staff Only</span>
          </div>

        </div>

        {/* RIGHT SIDE: FORM & 7 DEMO ACCOUNTS PRESETS */}
        <div className="lg:col-span-6 bg-white flex flex-col justify-between p-6 sm:p-8 lg:p-12 overflow-y-auto">
          
          <div className="max-w-lg w-full mx-auto space-y-6 my-auto">
            
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-extrabold">
                <HardHat className="h-3.5 w-3.5" />
                <span>Field Operations Portal</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Department Worker Login</h2>
              <p className="text-xs text-slate-500 font-medium">
                Select your department worker account below or enter credentials to sign in.
              </p>
            </div>

            {/* 7 DEPARTMENT DEMO PRESETS */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 text-orange-600" />
                  Select Department Worker Account (Demo)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                  7 Dept Accounts
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {demoAccounts.map((acc) => {
                  const isSelected = email === acc.email;
                  return (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => handleSelectPreset(acc)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50 text-slate-900 ring-2 ring-orange-500/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-orange-300 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="text-lg">{acc.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-[11px] leading-tight truncate">{acc.dept}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">{acc.email}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-start gap-2.5 animate-in fade-in">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* LOGIN FORM */}
            <form onSubmit={handleLogin} className="space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700">Department Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="road.worker@civicshield.demo"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Worker@123"
                    required
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all mt-2"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Authenticating Worker Account...
                  </span>
                ) : (
                  <>
                    <span>Sign In to Worker Dashboard</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
              <Link href="/login" className="hover:text-emerald-600 transition-colors">
                ← Citizen Portal
              </Link>
              <Link href="/authority/login" className="hover:text-blue-600 transition-colors">
                Authority Portal →
              </Link>
            </div>

          </div>

          <div className="text-center text-[11px] font-semibold text-slate-400 pt-6">
            © 2026 CivicShield AI · Department Field Operations Portal
          </div>

        </div>

      </div>

    </div>
  );
}
