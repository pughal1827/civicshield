'use client';

import React from 'react';
import Link from 'next/link';
import { Camera, Sparkles, BarChart3, Building2, CheckCircle2, Search, ArrowLeft, FilePlus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function HowItWorksPage() {
  const steps = [
    {
      num: 1,
      icon: Camera,
      color: 'emerald',
      title: '1. Capture & Report',
      desc: 'Citizens take a photo or select an image from their gallery, enter a description, and select or auto-detect their GPS location on the interactive map.',
    },
    {
      num: 2,
      icon: Sparkles,
      color: 'cyan',
      title: '2. Multi-Modal AI Analysis',
      desc: 'Gemini AI analyzes the description and photo to extract key details, categorize the issue (Road/Pothole, Garbage, Water Leak, etc.), and assess safety risks.',
    },
    {
      num: 3,
      icon: BarChart3,
      color: 'amber',
      title: '3. 5-Factor Priority Engine',
      desc: 'A weighted algorithm calculates a score (0-100) based on Safety Risk (30%), Public Impact (25%), Severity (20%), Recurrence (15%), and Location Sensitivity (10%).',
    },
    {
      num: 4,
      icon: Building2,
      color: 'blue',
      title: '4. Department Routing & Triage',
      desc: 'The issue is automatically routed to the responsible department (Road Maintenance, Sanitation, Electrical, Water). Officers review and assign field teams.',
    },
    {
      num: 5,
      icon: CheckCircle2,
      color: 'teal',
      title: '5. Repair Execution & Evidence',
      desc: 'Field teams resolve the problem on site, record repair notes, and upload photo proof of resolution to the platform.',
    },
    {
      num: 6,
      icon: Search,
      color: 'emerald',
      title: '6. Citizen Verification & Closure',
      desc: 'The reporting citizen tracks progress using their unique Case ID / Tracking Code, inspects proof photos, and accepts or rejects the resolution.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8 my-4">
      <div className="space-y-2 text-center sm:text-left">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 mb-2">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Home</span>
        </Link>
        <div className="flex items-center gap-2 justify-center sm:justify-start">
          <Badge variant="cyan">Interactive Walkthrough</Badge>
          <span className="text-xs text-slate-500">• 6-Stage Lifecycle</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">How CivicShield AI Works</h1>
        <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
          Learn how citizen complaints are transformed into prioritized, verifiable municipal repair orders.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <Card key={step.num} variant="glass" className="p-6 space-y-3 border-slate-800 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-500">STAGE {step.num}</span>
                </div>
                <h3 className="text-base font-bold text-white">{step.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-6 bg-slate-900 border-slate-800 space-y-4 text-center">
        <h2 className="text-xl font-bold text-white">Experience the Lifecycle</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Start by reporting a problem or tracking an existing complaint code.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link href="/report">
            <Button size="md" variant="primary" className="px-6 min-h-[44px] font-bold">
              <FilePlus className="h-4 w-4 mr-2" />
              Report an Issue
            </Button>
          </Link>
          <Link href="/track">
            <Button size="md" variant="outline" className="px-6 min-h-[44px] border-slate-700">
              <Search className="h-4 w-4 mr-2" />
              Track a Report
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
