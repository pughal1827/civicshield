'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Shield, 
  UserPlus, 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertTriangle, 
  CheckCircle2,
  Megaphone,
  Users,
  MapPin,
  Leaf,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CitizenSignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: fullName.trim(), email: email.trim(), password }),
      });

      const json = await res.json();

      if (json.success) {
        router.push('/citizen');
        router.refresh();
      } else {
        setError(json.error?.message || 'Could not create account. Please try again.');
      }
    } catch {
      setError('Connection error. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 flex flex-col lg:flex-row relative overflow-x-hidden font-sans text-slate-900">
      
      {/* LEFT SIDE: CIVIC CITY HERO & BRANDING (~55% WIDTH ON DESKTOP) */}
      <div className="relative lg:w-[55%] bg-slate-950 flex flex-col justify-between p-6 sm:p-10 lg:p-12 overflow-hidden min-h-[520px] lg:min-h-screen text-white shrink-0">
        
        {/* Background Artwork Layer */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 mix-blend-overlay pointer-events-none"
          style={{ backgroundImage: `url('/images/citizen_login_hero.jpg')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/85 via-slate-900/90 to-slate-950/95 pointer-events-none" />

        {/* Top Header Logo */}
        <div className="relative z-10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-11 w-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 group-hover:scale-105 transition-transform">
              <Shield className="h-6 w-6 fill-white/20 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xl font-black tracking-tight text-white">CivicShield</span>
                <span className="text-xl font-black text-emerald-400">AI</span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium tracking-wide">Safer Cities. Stronger Communities.</p>
            </div>
          </Link>
        </div>

        {/* Hero Banner & Cursive Tagline */}
        <div className="relative z-10 space-y-6 my-auto py-8">
          
          <div className="flex items-center justify-between">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black shadow-xs">
              <UserPlus className="h-4 w-4 text-emerald-400" />
              <span>Citizen Registration</span>
            </div>

            {/* Right Cursive Floating Text */}
            <div className="hidden sm:block text-right">
              <span className="text-xl font-extrabold text-emerald-300 font-serif italic block leading-tight">
                My City
              </span>
              <span className="text-xl font-extrabold text-white font-serif italic block leading-tight">
                My Responsibility
              </span>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            Be the Change <br />
            in <span className="text-emerald-400 underline decoration-emerald-500/50 decoration-wavy underline-offset-8">Your City</span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed max-w-xl">
            Create your CivicShield account and help make your city cleaner, safer, and better for everyone.
          </p>

          {/* 4 Feature Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold border border-emerald-500/30">
                <Megaphone className="h-5 w-5" />
              </div>
              <div>
                <span className="font-extrabold text-xs text-white block">Report Civic Issues</span>
                <span className="text-[11px] text-slate-300 font-medium leading-tight block mt-0.5">
                  Help us identify and fix problems in your area.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold border border-emerald-500/30">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <span className="font-extrabold text-xs text-white block">Make a Real Impact</span>
                <span className="text-[11px] text-slate-300 font-medium leading-tight block mt-0.5">
                  Cleaner streets, safer communities, better tomorrow.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold border border-emerald-500/30">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <span className="font-extrabold text-xs text-white block">Track Progress</span>
                <span className="text-[11px] text-slate-300 font-medium leading-tight block mt-0.5">
                  Stay updated on the status of your reports.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold border border-emerald-500/30">
                <Leaf className="h-5 w-5" />
              </div>
              <div>
                <span className="font-extrabold text-xs text-white block">Be a Responsible Citizen</span>
                <span className="text-[11px] text-slate-300 font-medium leading-tight block mt-0.5">
                  Together for a cleaner, greener city.
                </span>
              </div>
            </div>

          </div>

          {/* Cursive Accent Tagline */}
          <div className="pt-2 flex items-center justify-between">
            <span className="text-lg font-serif italic text-emerald-300 font-bold">
              Cleaner Cities Happier People 😊
            </span>
            <div className="px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700 text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5 backdrop-blur-md">
              <Leaf className="h-3.5 w-3.5 text-emerald-400" />
              <span>Together for a Cleaner, Safer Tomorrow</span>
            </div>
          </div>

        </div>

        {/* Left Bottom Copyright */}
        <div className="relative z-10 text-xs text-slate-400 font-medium">
          © 2026 CivicShield AI. All rights reserved.
        </div>

      </div>

      {/* RIGHT SIDE: CITIZEN REGISTRATION FORM (~45% WIDTH ON DESKTOP) */}
      <div className="w-full lg:w-[45%] bg-slate-50 flex flex-col justify-between p-4 sm:p-8 lg:p-12 relative z-10">
        
        {/* Top Navigation Sign In Link */}
        <div className="flex justify-end text-xs font-bold text-slate-600 mb-6 sm:mb-8">
          <span>Already have an account?</span>
          <Link href="/login" className="text-emerald-600 hover:text-emerald-700 hover:underline font-extrabold ml-1.5 flex items-center gap-0.5">
            <span>Sign In</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Centered Registration Card */}
        <div className="w-full max-w-md mx-auto my-auto space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl p-6 sm:p-8 space-y-6">
            
            {/* Card Header & Icon */}
            <div className="text-center space-y-2">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs border border-emerald-200">
                <UserPlus className="h-7 w-7 text-emerald-600" />
              </div>
              <div className="inline-block px-3 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[11px] font-black">
                Citizen Registration
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Create your CivicShield account
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Create an account to easily manage and track your reports.
              </p>
            </div>

            {/* Error Notice Box */}
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in duration-150">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSignup} className="space-y-4">
              
              {/* FIELD 1: FULL NAME */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Jane Citizen"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all min-h-[44px]"
                  />
                </div>
              </div>

              {/* FIELD 2: EMAIL ADDRESS */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all min-h-[44px]"
                  />
                </div>
              </div>

              {/* FIELD 3: PASSWORD */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* FIELD 4: CONFIRM PASSWORD */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Verified Citizen Notice Box */}
              <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl text-xs text-emerald-900 font-bold flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>New accounts are registered as verified Citizen profiles.</span>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                size="lg"
                variant="primary"
                disabled={loading}
                className="w-full min-h-[48px] bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 mt-2"
              >
                <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>

            </form>

            {/* Divider OR Sign In Link */}
            <div className="space-y-4 pt-2 border-t border-slate-100 text-center">
              <div className="text-xs text-slate-500 font-bold">
                Already have an account?{' '}
                <Link href="/login" className="text-emerald-600 hover:text-emerald-700 hover:underline font-extrabold">
                  Sign In
                </Link>
              </div>
            </div>

          </div>
        </div>

        {/* Right Footer Links */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-6 text-xs text-slate-500 font-medium border-t border-slate-200/60 mt-8">
          <div>© 2026 CivicShield AI. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <Link href="/about" className="hover:text-slate-900 transition-colors">Privacy</Link>
            <Link href="/about" className="hover:text-slate-900 transition-colors">Terms</Link>
            <Link href="/about" className="hover:text-slate-900 transition-colors">Support</Link>
            <span className="text-slate-300">|</span>
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              Together for a Cleaner, Safer Tomorrow <Leaf className="h-3.5 w-3.5 text-emerald-600 inline" />
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
