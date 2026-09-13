'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn, ArrowRight, AlertTriangle, ShieldCheck, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function CitizenLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 my-4">
      <Card variant="glass" className="w-full max-w-md p-6 sm:p-8 space-y-6 border-slate-800 shadow-2xl">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <LogIn className="h-6 w-6" />
          </div>
          <Badge variant="emerald">Citizen Portal</Badge>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Welcome back</h1>
          <p className="text-xs text-slate-400">
            Sign in to manage and track your civic reports.
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
        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-slate-950 text-xs min-h-[44px]"
          />

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Password
              </label>
              <button
                type="button"
                onClick={() => alert('Password reset link sent to your registered email.')}
                className="text-[11px] text-emerald-400 hover:underline font-medium"
              >
                Forgot password?
              </button>
            </div>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-slate-950 text-xs min-h-[44px]"
            />
          </div>

          {/* Quick Demo Fill Button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                setEmail('citizen@civicshield.org');
                setPassword('citizen123');
              }}
              className="w-full text-[11px] text-slate-400 hover:text-emerald-400 text-center py-1 bg-slate-900 border border-slate-800 rounded-lg"
            >
              ⚡ Fill Demo Citizen Credentials (citizen@civicshield.org)
            </button>
          </div>

          <Button
            type="submit"
            size="lg"
            variant="primary"
            isLoading={loading}
            disabled={loading}
            className="w-full min-h-[48px] font-bold shadow-lg shadow-emerald-950/80"
          >
            <span>Sign In</span>
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </form>

        {/* Footer Link */}
        <div className="text-center border-t border-slate-800 pt-4 text-xs text-slate-400">
          Don't have an account?{' '}
          <Link href="/signup" className="text-emerald-400 hover:underline font-bold">
            Create Account
          </Link>
        </div>
      </Card>
    </div>
  );
}
