'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus, ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function CitizenSignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password }),
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 my-4">
      <Card variant="glass" className="w-full max-w-md p-6 sm:p-8 space-y-6 border-slate-800 shadow-2xl">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <UserPlus className="h-6 w-6" />
          </div>
          <Badge variant="emerald">Citizen Registration</Badge>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Create your CivicShield account</h1>
          <p className="text-xs text-slate-400">
            Create an account to easily manage and track your reports.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-950/50 border border-rose-800/80 rounded-xl flex items-start gap-2.5 text-xs text-rose-200">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSignup} className="space-y-4">
          <Input
            label="Full Name"
            type="text"
            placeholder="Jane Citizen"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="bg-slate-950 text-xs min-h-[44px]"
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-slate-950 text-xs min-h-[44px]"
          />

          <Input
            label="Password"
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-slate-950 text-xs min-h-[44px]"
          />

          <Input
            label="Confirm Password"
            type="password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="bg-slate-950 text-xs min-h-[44px]"
          />

          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-[11px] text-slate-400">
            ✓ New accounts are registered as verified Citizen profiles.
          </div>

          <Button
            type="submit"
            size="lg"
            variant="primary"
            isLoading={loading}
            disabled={loading}
            className="w-full min-h-[48px] font-bold shadow-lg shadow-emerald-950/80"
          >
            <span>Create Account</span>
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </form>

        {/* Footer Link */}
        <div className="text-center border-t border-slate-800 pt-4 text-xs text-slate-400">
          Already have an account?{' '}
          <Link href="/login" className="text-emerald-400 hover:underline font-bold">
            Sign In
          </Link>
        </div>
      </Card>
    </div>
  );
}
