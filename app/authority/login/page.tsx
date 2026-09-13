'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldAlert, ArrowRight, AlertTriangle, Lock, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function AuthorityLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
          router.push('/dashboard');
          router.refresh();
        }
      } else {
        setError(json.error?.message || 'Invalid official credentials.');
      }
    } catch {
      setError('Connection error. Please check network connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 my-4">
      <Card variant="glass" className="w-full max-w-md p-6 sm:p-8 space-y-6 border-cyan-900/60 bg-slate-900/90 shadow-2xl">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Building2 className="h-6 w-6" />
          </div>
          <Badge variant="cyan">Municipal Portal</Badge>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">CivicShield Authority Portal</h1>
          <p className="text-xs text-cyan-300/80 font-medium">
            Authorized personnel only
          </p>
        </div>

        {/* Security Disclaimer Banner */}
        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400 space-y-1">
          <div className="flex items-center gap-1.5 text-cyan-400 font-semibold text-[11px] uppercase tracking-wider">
            <Lock className="h-3.5 w-3.5" />
            Restricted Operational System
          </div>
          <p className="text-[11px] leading-relaxed">
            Restricted access for authorized civic personnel, department leads, and system administrators. Unauthorized access attempts are audited.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl flex items-start gap-2.5 text-xs text-rose-200">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="Official Email Address"
            type="email"
            placeholder="officer@civicshield.gov"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-slate-950 text-xs min-h-[44px]"
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-slate-950 text-xs min-h-[44px]"
          />

          {/* Quick Demo Fill Button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                setEmail('officer@civicshield.gov');
                setPassword('authority123');
              }}
              className="w-full text-[11px] text-cyan-300 hover:text-cyan-200 text-center py-1.5 bg-cyan-950/40 border border-cyan-800/80 rounded-lg font-medium"
            >
              ⚡ Fill Demo Officer Credentials (officer@civicshield.gov)
            </button>
          </div>

          <Button
            type="submit"
            size="lg"
            variant="cyan"
            isLoading={loading}
            disabled={loading}
            className="w-full min-h-[48px] font-bold shadow-lg shadow-cyan-950/80"
          >
            <span>Sign in to Authority Portal</span>
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </form>

        {/* Footer Link */}
        <div className="text-center border-t border-slate-800 pt-4 text-xs text-slate-500">
          Citizen user?{' '}
          <Link href="/login" className="text-slate-300 hover:underline">
            Go to Citizen Login
          </Link>
        </div>
      </Card>
    </div>
  );
}
