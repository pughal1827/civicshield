'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, Sparkles, CheckCircle2, FilePlus, ArrowLeft, Building2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-8 my-4">
      <div className="space-y-2 text-center sm:text-left">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 mb-2">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Home</span>
        </Link>
        <div className="flex items-center gap-2 justify-center sm:justify-start">
          <Badge variant="emerald">Public Service Platform</Badge>
          <span className="text-xs text-slate-500">• Mission & Governance</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">About CivicShield AI</h1>
        <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
          CivicShield AI is an intelligent civic tech platform designed to streamline problem reporting for citizens and triage operations for local municipal authorities.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card variant="glass" className="p-6 space-y-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <Shield className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-bold text-white">Our Mission</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            To empower citizens to report community hazards easily and ensure that local governments have transparent, priority-driven workflows to resolve them quickly.
          </p>
        </Card>

        <Card variant="glass" className="p-6 space-y-4">
          <div className="h-10 w-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-bold text-white">Responsible AI Use</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Artificial Intelligence is utilized exclusively to assist human officers—by classifying image categories, estimating safety risk scores, and detecting candidate duplicates.
          </p>
        </Card>
      </div>

      <Card className="p-6 bg-slate-900 border-slate-800 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          Human-in-the-Loop Guarantee
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          CivicShield AI enforces strict human oversight. No report is automatically merged or closed without explicit review and approval by an authorized municipal officer. Citizens retain full rights to inspect evidence and verify resolution satisfaction.
        </p>
        <div className="pt-2 flex items-center gap-4 text-xs text-slate-400 border-t border-slate-800">
          <span>✓ Prototype Demonstration</span>
          <span>✓ Open Civic Technology</span>
          <span>✓ 100% Transparent Governance</span>
        </div>
      </Card>

      <div className="flex justify-center pt-4">
        <Link href="/report">
          <Button size="lg" variant="primary" className="px-8 min-h-[48px] font-bold">
            <FilePlus className="h-4 w-4 mr-2" />
            Report an Issue Now
          </Button>
        </Link>
      </div>
    </div>
  );
}
