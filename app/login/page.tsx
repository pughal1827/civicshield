'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Camera,
  FileText,
  MapPin,
  Users,
  Leaf,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CitizenLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, portal: 'CITIZEN' }),
      });

      const json = await res.json();

      if (json.success) {
        router.push('/citizen');
        router.refresh();
      } else {
        setError(json.error?.message || 'Invalid email address or password.');
      }
    } catch {
      setError('Connection error. Please check your network and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = () => {
    setEmail('citizen@civicshield.org');
    setPassword('citizen123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-between relative overflow-x-hidden">
      
      {/* MAIN SPLIT-SCREEN CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-[calc(100vh-60px)]">
        
        {/* LEFT SIDE: CIVICSHIELD BRAND & HERO AREA (~55% width on desktop) */}
        <div className="lg:col-span-7 xl:col-span-7 relative flex flex-col justify-between p-6 sm:p-10 lg:p-14 overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-200/80 min-h-[420px] lg:min-h-auto">
          
          {/* Background Illustration Image with Soft Light Gradient */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/citizen_login_hero.jpg"
              alt="Clean civic city skyline background"
              fill
              className="object-cover object-center"
              priority
            />
            {/* Soft gradient overlay for optimal readability */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50/95 via-sky-50/85 to-emerald-50/90" />
          </div>

          {/* Top Logo & Tagline Header */}
          <div className="relative z-10">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="h-11 w-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
                <Shield className="h-6 w-6 fill-white/20 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-extrabold tracking-tight text-slate-900">CivicShield</span>
                  <span className="text-xl font-extrabold text-emerald-600">AI</span>
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
                Welcome to <br />
                <span className="text-slate-900">CivicShield </span>
                <span className="text-emerald-600">AI</span>
              </h1>
              <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed">
                Report issues. Track progress.<br className="hidden sm:inline" /> Build a cleaner, safer, and brighter city together.
              </p>
            </div>

            {/* 4 Feature Items with Circular Green Icons */}
            <div className="space-y-4 pt-2">
              
              <div className="flex items-start gap-3.5">
                <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <Camera className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">Report Civic Issues</h4>
                  <p className="text-xs text-slate-500 font-medium">Upload photos and location</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <FileText className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">Track Your Complaints</h4>
                  <p className="text-xs text-slate-500 font-medium">Get real-time updates</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <MapPin className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">View Nearby Issues</h4>
                  <p className="text-xs text-slate-500 font-medium">See what's happening around you</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <Users className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">Be a Part of Change</h4>
                  <p className="text-xs text-slate-500 font-medium">Together for a better community</p>
                </div>
              </div>

            </div>

          </div>

          {/* Bottom Left Glassmorphic / Soft Green Message Card */}
          <div className="relative z-10">
            <div className="p-4 rounded-2xl bg-emerald-900/10 backdrop-blur-md border border-emerald-600/20 max-w-sm flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-700/20">
                <Leaf className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold text-slate-900 leading-snug">
                A cleaner city is a healthier, happier home for everyone.
              </p>
            </div>
          </div>

        </div>

        {/* RIGHT SIDE: LOGIN FORM & CARD AREA (~45% width on desktop) */}
        <div className="lg:col-span-5 xl:col-span-5 bg-slate-100/60 backdrop-blur-xs flex flex-col justify-between p-6 sm:p-10 relative">
          
          {/* Top-Right Header Link (New to CivicShield AI? Create Account) */}
          <div className="flex justify-end items-center gap-3 text-xs font-semibold text-slate-600">
            <span>New to CivicShield AI?</span>
            <Link href="/signup">
              <Button variant="outline" className="border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 font-bold rounded-xl text-xs px-4 h-9">
                Create Account
              </Button>
            </Link>
          </div>

          {/* Centered White Rounded Login Card */}
          <div className="my-auto py-8">
            <div className="max-w-md w-full mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xl shadow-slate-900/10 space-y-6">
              
              {/* Card Header & Logo Badge */}
              <div className="text-center space-y-2">
                <div className="mx-auto h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-md shadow-emerald-600/15">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Citizen Login</h2>
                  <p className="text-xs text-slate-500 font-medium">Sign in to continue to your civic portal</p>
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
                
                {/* Email Address Field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 h-12 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs font-semibold text-slate-900 transition-all outline-hidden"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">Password</label>
                    <button
                      type="button"
                      onClick={() => alert('Password reset instructions have been sent to your registered email.')}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
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
                      className="w-full pl-10 pr-10 h-12 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs font-semibold text-slate-900 transition-all outline-hidden"
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

                {/* Remember Me Checkbox & Quick Demo Fill */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                    />
                    <span>Remember me</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleDemoFill}
                    className="text-[11px] font-extrabold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors"
                  >
                    ⚡ Demo Fill
                  </button>
                </div>

                {/* Main CTA Sign In Button */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 group transition-all mt-2"
                >
                  <span>{loading ? 'Signing in...' : 'Sign In'}</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>

              </form>

              {/* Security Privacy Protection Banner */}
              <div className="p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-xl flex items-center gap-3 text-xs text-emerald-900 font-semibold">
                <Shield className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Your information is secure with strong privacy and security protection.</span>
              </div>

              {/* Create Account Link Footer */}
              <div className="text-center text-xs text-slate-500 font-medium pt-2 border-t border-slate-100">
                Don't have an account?{' '}
                <Link href="/signup" className="text-emerald-600 font-extrabold hover:underline">
                  Create Account
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
