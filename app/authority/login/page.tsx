'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Building2,
  BarChart3,
  Building,
  MapPin,
  FileCheck,
  Leaf,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AuthorityLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter official email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, portal: 'AUTHORITY' }),
      });

      const json = await res.json();

      if (json.success) {
        if (json.data.user?.role === 'CITIZEN') {
          setError('Access Denied: Citizen accounts cannot access the Authority Portal.');
        } else {
          router.push('/authority');
          router.refresh();
        }
      } else {
        setError(json.error?.message || 'Invalid official credentials.');
      }
    } catch {
      setError('Connection error. Please check network connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = () => {
    setEmail('officer@civicshield.gov');
    setPassword('authority123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-between relative overflow-x-hidden">
      
      {/* MAIN SPLIT-SCREEN CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-[calc(100vh-60px)]">
        
        {/* LEFT SIDE: BRAND & MUNICIPAL OPERATION HERO AREA (~55% width on desktop) */}
        <div className="lg:col-span-7 xl:col-span-7 relative flex flex-col justify-between p-6 sm:p-10 lg:p-14 overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-200/80 min-h-[440px] lg:min-h-auto">
          
          {/* Crisp Vector Background Illustration */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/officer_login_hero_v2.jpg"
              alt="Male municipal officer at workstation dashboard"
              fill
              className="object-cover object-center"
              priority
            />
            {/* Subtle gradient overlay for text readability while preserving artwork vibrancy */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-50/90 via-slate-50/70 to-slate-50/30" />
          </div>

          {/* Top Logo & Tagline Header */}
          <div className="relative z-10">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="h-11 w-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20 group-hover:scale-105 transition-transform">
                <Building2 className="h-6 w-6 fill-white/20 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-extrabold tracking-tight text-slate-900">CivicShield</span>
                  <span className="text-xl font-extrabold text-blue-600">AI</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium tracking-wide">Safer Cities. Stronger Communities.</p>
              </div>
            </Link>
          </div>

          {/* Center Hero Heading & Feature List */}
          <div className="relative z-10 my-8 sm:my-12 space-y-6 max-w-lg">
            
            {/* Headline */}
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                Manage Your City.<br />
                <span className="text-blue-600">Make a Difference.</span>
              </h1>
              <p className="text-sm sm:text-base text-slate-700 font-bold leading-relaxed">
                Monitor civic issues, coordinate departments, and help build a safer, cleaner community.
              </p>
            </div>

            {/* 4 Feature Items with Circular Blue Icons */}
            <div className="space-y-4 pt-2">
              
              <div className="flex items-start gap-3.5">
                <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <BarChart3 className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">Manage Civic Complaints</h4>
                  <p className="text-xs text-slate-600 font-semibold">Review and manage reported issues</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <Building className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">Assign Departments</h4>
                  <p className="text-xs text-slate-600 font-semibold">Send complaints to the right team</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <MapPin className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">Monitor Problems</h4>
                  <p className="text-xs text-slate-600 font-semibold">See civic issues on the map</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <FileCheck className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">Generate Reports</h4>
                  <p className="text-xs text-slate-600 font-semibold">Create reports for municipal review</p>
                </div>
              </div>

            </div>

          </div>

          {/* Bottom Left Glassmorphic / Soft Blue Message Card */}
          <div className="relative z-10">
            <div className="p-4 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-700 text-white max-w-sm flex items-center gap-3.5 shadow-xl">
              <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-700/30">
                <Leaf className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold leading-snug text-slate-100">
                Efficient governance today for a cleaner, brighter tomorrow.
              </p>
            </div>
          </div>

        </div>

        {/* RIGHT SIDE: AUTHORITY LOGIN FORM & CARD AREA (~45% width on desktop) */}
        <div className="lg:col-span-5 xl:col-span-5 bg-blue-50/40 backdrop-blur-xs flex flex-col justify-between p-6 sm:p-10 relative">
          
          {/* Top-Right Header Link (Citizen user? Go to Citizen Login →) */}
          <div className="flex justify-end items-center gap-3 text-xs font-semibold text-slate-600">
            <span>Citizen user?</span>
            <Link href="/login">
              <Button variant="outline" className="border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 font-bold rounded-xl text-xs px-4 h-9">
                Go to Citizen Login →
              </Button>
            </Link>
          </div>

          {/* Centered White Rounded Authority Login Card */}
          <div className="my-auto py-8">
            <div className="max-w-md w-full mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-blue-100 shadow-2xl shadow-blue-900/10 space-y-6">
              
              {/* Card Header & Badge */}
              <div className="text-center space-y-2">
                <div className="mx-auto h-12 w-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-md shadow-blue-600/15">
                  <Building2 className="h-6 w-6" />
                </div>
                <div className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-extrabold border border-blue-200">
                  Municipal Authority
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Authority Login</h2>
                  <p className="text-xs text-slate-500 font-medium">Sign in to manage civic operations in your assigned area.</p>
                </div>
              </div>

              {/* Error Alert Box */}
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 font-semibold">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                
                {/* Official Email Address Field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Official Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      placeholder="officer@example.gov"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 h-12 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs font-semibold text-slate-900 transition-all outline-hidden"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">Password</label>
                    <button
                      type="button"
                      onClick={() => alert('Password reset instructions have been sent to your official municipal email.')}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-10 h-12 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs font-semibold text-slate-900 transition-all outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Security Box */}
                <div className="p-3.5 bg-blue-50 border border-blue-200/80 rounded-xl flex items-center gap-3 text-xs text-blue-950 font-medium">
                  <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Lock className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block font-bold text-slate-900">Authorized personnel only</span>
                    <span className="block text-[11px] text-slate-600">Access to the Authority Portal is restricted to verified municipal personnel.</span>
                  </div>
                </div>

                {/* Main CTA Sign In Button */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 group transition-all"
                >
                  <span>{loading ? 'Signing in...' : 'Sign In to Authority Portal'}</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>

              </form>

              {/* OR Divider */}
              <div className="relative flex py-1 items-center">
                <div className="grow border-t border-slate-200"></div>
                <span className="shrink mx-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">OR</span>
                <div className="grow border-t border-slate-200"></div>
              </div>

              {/* Demo Authority Access Button */}
              <div className="space-y-1 text-center">
                <button
                  type="button"
                  onClick={handleDemoFill}
                  className="w-full h-11 bg-slate-50 hover:bg-blue-50 border border-blue-200 text-blue-700 font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <UserCheck className="h-4 w-4 text-blue-600" />
                  <span>Demo Authority Access</span>
                </button>
                <span className="text-[10px] text-slate-400 font-medium block">
                  For authorized demo use only (officer@civicshield.gov)
                </span>
              </div>

              {/* Citizen Login Footer Link */}
              <div className="text-center text-xs text-slate-500 font-medium pt-2 border-t border-slate-100">
                Citizen user?{' '}
                <Link href="/login" className="text-emerald-600 font-extrabold hover:underline">
                  Go to Citizen Login
                </Link>
              </div>

            </div>
          </div>

          {/* Footer Bar Alignment Placeholder */}
          <div className="hidden lg:block h-4" />

        </div>

      </div>

      {/* FOOTER BAR */}
      <footer className="w-full bg-white border-t border-slate-200/80 py-4 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
          <div>© 2026 CivicShield AI. All rights reserved.</div>
          
          <div className="flex items-center gap-6">
            <Link href="/about" className="hover:text-slate-900 transition-colors">Privacy</Link>
            <Link href="/about" className="hover:text-slate-900 transition-colors">Terms</Link>
            <Link href="/about" className="hover:text-slate-900 transition-colors">Support</Link>
          </div>

          <div className="text-emerald-700 font-bold flex items-center gap-1.5">
            <span>Together for a Cleaner, Safer Tomorrow</span>
            <Leaf className="h-3.5 w-3.5" />
          </div>
        </div>
      </footer>

    </div>
  );
}
