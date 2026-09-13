'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthorityDashboard from '@/app/dashboard/page';
import { LoadingState } from '@/components/ui/loading-state';
import { Card } from '@/components/ui/card';
import { AlertTriangle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AuthorityPortalPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && (json.data?.user?.role === 'AUTHORITY' || json.data?.user?.role === 'ADMIN')) {
          setAuthorized(true);
        } else {
          setAuthorized(false);
        }
      })
      .catch(() => setAuthorized(false));
  }, []);

  if (authorized === null) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-8">
        <LoadingState message="Verifying authority security credentials..." />
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <Card variant="glass" className="w-full max-w-md p-6 text-center space-y-4 border-rose-900/60 bg-rose-950/20">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-white">403 Forbidden — Access Denied</h1>
          <p className="text-xs text-rose-200/90 leading-relaxed">
            Only authenticated municipal officers and authority personnel can access the CivicShield Operations Portal.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link href="/authority/login">
              <Button size="md" variant="cyan" className="w-full font-bold">
                Go to Authority Login
              </Button>
            </Link>
            <Link href="/">
              <Button size="md" variant="outline" className="w-full border-slate-700">
                Back to Public Home
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return <AuthorityDashboard />;
}
