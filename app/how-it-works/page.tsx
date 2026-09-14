'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Shield,
  Camera,
  Sparkles,
  BarChart3,
  Building2,
  CheckCircle2,
  Search,
  ArrowLeft,
  FilePlus,
  Leaf,
  MapPin,
  ChevronRight,
  Bell,
  Check,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-between relative overflow-x-hidden">
      
      {/* TOP HEADER BAR (EXACT REFERENCE HEADER) */}
      <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Tagline */}
          <Link href="/citizen" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <Shield className="h-5 w-5 fill-white/20 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-lg font-extrabold tracking-tight text-slate-900">CivicShield</span>
                <span className="text-lg font-extrabold text-teal-600">AI</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium tracking-tight">Safer Cities. Stronger Communities.</p>
            </div>
          </Link>

          {/* Right Controls (Location, Notifications, Citizen Profile) */}
          <div className="flex items-center gap-3">
            {/* Location Selector */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100/90 border border-slate-200/80 text-slate-700 text-xs font-semibold hover:bg-slate-200/70 transition-colors cursor-pointer">
              <MapPin className="h-3.5 w-3.5 text-slate-500" />
              <span>Gummidipoondi</span>
              <span className="text-[10px] text-slate-400">▼</span>
            </div>

            {/* Notification Bell */}
            <button className="h-9 w-9 rounded-full bg-slate-100/90 border border-slate-200/80 flex items-center justify-center text-slate-600 hover:bg-slate-200/70 transition-colors">
              <Bell className="h-4 w-4" />
            </button>

            {/* Citizen Profile Pill */}
            <Link href="/citizen" className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100/90 border border-slate-200/80 hover:bg-slate-200/70 transition-colors">
              <div className="h-7 w-7 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs">
                J
              </div>
              <div className="hidden md:block text-left text-xs leading-tight">
                <span className="font-extrabold text-slate-800 block">Hi, Jane</span>
                <span className="text-[10px] text-slate-500 font-medium">Citizen</span>
              </div>
            </Link>
          </div>

        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 z-10">

        {/* HERO HEADER SECTION */}
        <section className="space-y-3">
          
          {/* Back to Home Link */}
          <div>
            <Link
              href="/citizen"
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-600 hover:text-teal-600 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Home</span>
            </Link>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            
            <div className="space-y-2 max-w-3xl">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-200/80 text-sky-800 text-xs font-extrabold">
                <span className="text-sky-700">Interactive Walkthrough</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-600">6-Stage Lifecycle</span>
              </div>

              {/* Main Heading */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
                How CivicShield <span className="text-teal-600">AI Works</span>
              </h1>

              {/* Subtitle */}
              <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed max-w-2xl">
                Learn how citizen complaints are transformed into prioritized, verifiable municipal repair orders.
              </p>
            </div>

            {/* Right Cursive Accent Header (Cleaner Cities Brighter Tomorrows) */}
            <div className="hidden lg:flex items-center gap-2 text-right">
              <div>
                <span className="text-2xl font-extrabold text-teal-800 block leading-tight font-serif italic">
                  Cleaner Cities
                </span>
                <span className="text-2xl font-extrabold text-teal-700 block leading-tight font-serif italic">
                  Brighter Tomorrows
                </span>
              </div>
              <Leaf className="h-6 w-6 text-teal-600 shrink-0 transform -rotate-12" />
            </div>

          </div>

        </section>

        {/* 6-STAGE LIFECYCLE GRID (3 COLUMNS × 2 ROWS MATCHING REFERENCE IMAGE) */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          
          {/* STAGE 1: CAPTURE & REPORT */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-all group">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              
              {/* Left Column: Pill, Title, Text */}
              <div className="sm:col-span-7 space-y-3">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100/80 text-emerald-800 text-[11px] font-extrabold border border-emerald-200/60">
                  <Camera className="h-3.5 w-3.5 text-emerald-700" />
                  <span>STAGE 1</span>
                </div>

                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
                  1. Capture & Report
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Citizens take a photo or select an image from their gallery, enter a description, and select or auto-detect their GPS location on the interactive map.
                </p>
              </div>

              {/* Right Column Visual: Smartphone Mockup with Hand */}
              <div className="sm:col-span-5 h-44 w-full rounded-2xl bg-emerald-50/70 border border-emerald-100 p-2.5 relative overflow-hidden flex items-center justify-center">
                {/* Smartphone holding Pothole photo & pin */}
                <div className="relative w-32 h-38 bg-slate-900 rounded-2xl shadow-md border-2 border-emerald-400 p-1.5 flex flex-col justify-between items-center group-hover:scale-105 transition-transform">
                  {/* Phone Speaker */}
                  <div className="w-8 h-1 bg-slate-700 rounded-full mb-1" />
                  
                  {/* Screen Content */}
                  <div className="w-full flex-1 rounded-xl bg-slate-200 relative overflow-hidden border border-slate-300">
                    <Image src="/images/citizen_reporting.jpg" alt="Pothole photo report" fill className="object-cover" />
                    {/* Location Pin */}
                    <div className="absolute top-2 right-2 bg-emerald-600 text-white rounded-full p-1 shadow-md">
                      <MapPin className="h-3 w-3" />
                    </div>
                  </div>

                  {/* Report Button inside phone */}
                  <div className="w-full bg-emerald-600 text-white text-[9px] font-extrabold py-1.5 rounded-lg text-center mt-1 shadow-xs flex items-center justify-center gap-1">
                    <Camera className="h-3 w-3" /> Report Issue
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* STAGE 2: MULTI-MODAL AI ANALYSIS */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-all group">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              
              {/* Left Column: Pill, Title, Text */}
              <div className="sm:col-span-7 space-y-3">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-100/80 text-sky-800 text-[11px] font-extrabold border border-sky-200/60">
                  <Sparkles className="h-3.5 w-3.5 text-sky-700" />
                  <span>STAGE 2</span>
                </div>

                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
                  2. Multi-Modal AI Analysis
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Gemini AI analyzes the description and photo to extract key details, categorize the issue (Road/Pothole, Garbage, Water Leak, etc.), and assess safety risks.
                </p>
              </div>

              {/* Right Column Visual: Robot holding photo + floating AI tags */}
              <div className="sm:col-span-5 h-44 w-full rounded-2xl bg-sky-50/70 border border-sky-100 p-2 relative overflow-hidden flex items-center justify-center gap-2">
                {/* Robot Graphic */}
                <div className="h-16 w-14 rounded-2xl bg-sky-600 text-white flex flex-col items-center justify-center shadow-md shrink-0 border border-sky-400">
                  <Sparkles className="h-6 w-6 text-white" />
                  <span className="text-[8px] font-black mt-0.5">AI BOT</span>
                </div>

                {/* AI Extracted Tags */}
                <div className="flex-1 space-y-1 text-[9px] font-extrabold">
                  <div className="bg-white px-2 py-1 rounded-md border border-amber-200 text-amber-800 shadow-xs flex items-center gap-1">
                    <span>🚧</span> <span>Road Pothole</span>
                  </div>
                  <div className="bg-white px-2 py-1 rounded-md border border-rose-200 text-rose-800 shadow-xs flex items-center gap-1">
                    <span>⚠️</span> <span>High Priority</span>
                  </div>
                  <div className="bg-white px-2 py-1 rounded-md border border-amber-200 text-amber-800 shadow-xs flex items-center gap-1">
                    <span>⚡</span> <span>Safety Risk</span>
                  </div>
                  <div className="bg-white px-2 py-1 rounded-md border border-emerald-200 text-emerald-800 shadow-xs flex items-center gap-1">
                    <span>📍</span> <span>Location Detected</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* STAGE 3: 5-FACTOR PRIORITY ENGINE */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-all group">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              
              {/* Left Column: Pill, Title, Text */}
              <div className="sm:col-span-7 space-y-3">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100/80 text-amber-800 text-[11px] font-extrabold border border-amber-200/60">
                  <BarChart3 className="h-3.5 w-3.5 text-amber-700" />
                  <span>STAGE 3</span>
                </div>

                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
                  3. 5-Factor Priority Engine
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  A weighted algorithm calculates a score (0-100) based on Safety Risk (30%), Public Impact (25%), Severity (20%), Recurrence (15%), and Location Sensitivity (10%).
                </p>
              </div>

              {/* Right Column Visual: Priority Score Ring 85 & Legend */}
              <div className="sm:col-span-5 h-44 w-full rounded-2xl bg-amber-50/70 border border-amber-100 p-2.5 relative overflow-hidden flex items-center gap-2">
                {/* Donut Score Gauge */}
                <div className="h-20 w-20 rounded-full bg-white border-4 border-sky-600 flex flex-col items-center justify-center shrink-0 shadow-md relative">
                  <span className="text-[8px] font-extrabold text-slate-400 uppercase leading-none">AI SCORE</span>
                  <span className="text-xl font-black text-slate-900 leading-none">85</span>
                  <span className="text-[8px] font-extrabold text-rose-600 mt-0.5">High Priority</span>
                </div>

                {/* Factor Breakdown List */}
                <div className="flex-1 space-y-0.5 text-[9px] font-extrabold text-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Safety Risk</span>
                    <span className="text-slate-900 font-extrabold">30%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Public Impact</span>
                    <span className="text-slate-900 font-extrabold">25%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Severity</span>
                    <span className="text-slate-900 font-extrabold">20%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-purple-500" /> Recurrence</span>
                    <span className="text-slate-900 font-extrabold">15%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Location Sens.</span>
                    <span className="text-slate-900 font-extrabold">10%</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* STAGE 4: DEPARTMENT ROUTING & TRIAGE */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-all group">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              
              {/* Left Column: Pill, Title, Text */}
              <div className="sm:col-span-7 space-y-3">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-100/80 text-indigo-800 text-[11px] font-extrabold border border-indigo-200/60">
                  <Building2 className="h-3.5 w-3.5 text-indigo-700" />
                  <span>STAGE 4</span>
                </div>

                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
                  4. Department Routing & Triage
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  The issue is automatically routed to the responsible department (Road Maintenance, Sanitation, Electrical, Water). Officers review and assign field teams.
                </p>
              </div>

              {/* Right Column Visual: Building & Department list */}
              <div className="sm:col-span-5 h-44 w-full rounded-2xl bg-indigo-50/70 border border-indigo-100 p-2.5 relative overflow-hidden flex flex-col justify-between gap-1">
                {/* Municipal Building Banner */}
                <div className="w-full bg-slate-900 text-white rounded-xl p-1.5 text-[10px] font-black flex items-center justify-center gap-1.5 shadow-xs">
                  <Building2 className="h-3.5 w-3.5 text-sky-400" />
                  <span>Municipal Portal</span>
                </div>

                {/* Department Stack */}
                <div className="space-y-1 text-[9px] font-extrabold">
                  <div className="p-1 px-2 bg-sky-600 text-white rounded-lg flex items-center justify-between shadow-xs">
                    <span>👥 Road Maintenance</span>
                    <ChevronRight className="h-3 w-3" />
                  </div>
                  <div className="p-1 px-2 bg-white text-slate-700 border border-slate-200 rounded-lg flex items-center justify-between">
                    <span>🟢 Sanitation</span>
                    <ChevronRight className="h-3 w-3 text-slate-400" />
                  </div>
                  <div className="p-1 px-2 bg-white text-slate-700 border border-slate-200 rounded-lg flex items-center justify-between">
                    <span>⚡ Electrical</span>
                    <ChevronRight className="h-3 w-3 text-slate-400" />
                  </div>
                  <div className="p-1 px-2 bg-white text-slate-700 border border-slate-200 rounded-lg flex items-center justify-between">
                    <span>💧 Water Supply</span>
                    <ChevronRight className="h-3 w-3 text-slate-400" />
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* STAGE 5: REPAIR EXECUTION & EVIDENCE */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-all group">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              
              {/* Left Column: Pill, Title, Text */}
              <div className="sm:col-span-7 space-y-3">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100/80 text-emerald-800 text-[11px] font-extrabold border border-emerald-200/60">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                  <span>STAGE 5</span>
                </div>

                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
                  5. Repair Execution & Evidence
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Field teams resolve the problem on site, record repair notes, and upload photo proof of resolution to the platform.
                </p>
              </div>

              {/* Right Column Visual: Worker + Before/After Proof */}
              <div className="sm:col-span-5 h-44 w-full rounded-2xl bg-emerald-50/70 border border-emerald-100 p-2.5 relative overflow-hidden flex flex-col justify-between">
                {/* Field Worker Badge */}
                <div className="flex items-center justify-between text-[10px] font-black text-slate-800">
                  <span>Field Execution</span>
                  <span className="text-emerald-700 bg-emerald-200/60 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <Check className="h-3 w-3" /> Done
                  </span>
                </div>

                {/* Before vs After Photos */}
                <div className="grid grid-cols-2 gap-1.5 text-center text-[9px] font-bold">
                  <div className="space-y-0.5">
                    <span className="text-slate-500 block text-[8px]">BEFORE</span>
                    <div className="h-14 w-full rounded-lg bg-slate-200 relative overflow-hidden border border-slate-300">
                      <Image src="/images/citizen_reporting.jpg" alt="Before repair" fill className="object-cover" />
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-emerald-700 block text-[8px]">AFTER</span>
                    <div className="h-14 w-full rounded-lg bg-emerald-200 relative overflow-hidden border border-emerald-400 flex items-center justify-center">
                      <Image src="/images/civic_city_bg.jpg" alt="After repair" fill className="object-cover" />
                      <div className="absolute inset-0 bg-emerald-950/40 flex items-center justify-center">
                        <div className="h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
                          <Check className="h-3 w-3" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* STAGE 6: CITIZEN VERIFICATION & CLOSURE */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-all group">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              
              {/* Left Column: Pill, Title, Text */}
              <div className="sm:col-span-7 space-y-3">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-100/80 text-rose-800 text-[11px] font-extrabold border border-rose-200/60">
                  <Search className="h-3.5 w-3.5 text-rose-700" />
                  <span>STAGE 6</span>
                </div>

                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
                  6. Citizen Verification & Closure
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  The reporting citizen tracks progress using their unique Case ID / Tracking Code, inspects proof photos, and accepts or rejects the resolution.
                </p>
              </div>

              {/* Right Column Visual: Phone with CS-7255 timeline */}
              <div className="sm:col-span-5 h-44 w-full rounded-2xl bg-rose-50/70 border border-rose-100 p-2.5 relative overflow-hidden flex items-center justify-center">
                <div className="w-full bg-white rounded-xl p-2 border border-slate-200 shadow-sm space-y-1.5 text-[9px]">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                    <span className="font-black text-slate-800">CS-7255</span>
                    <span className="font-extrabold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded">Verified</span>
                  </div>

                  <div className="space-y-0.5 text-[8px] font-bold text-slate-600">
                    <div className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Reported</div>
                    <div className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> In Progress</div>
                    <div className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Resolved</div>
                    <div className="flex items-center gap-1 text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> Verified</div>
                  </div>

                  <div className="w-full bg-emerald-600 text-white font-extrabold py-1 rounded-lg text-center shadow-xs flex items-center justify-center gap-1 text-[9px]">
                    <CheckCircle className="h-3 w-3" /> Issue Closed ✓
                  </div>
                </div>
              </div>

            </div>
          </div>

        </section>

        {/* BOTTOM CTA SECTION: EXPERIENCE THE LIFECYCLE */}
        <section className="bg-gradient-to-r from-sky-50/90 via-teal-50/80 to-slate-50 border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            
            <div className="space-y-1.5 text-center md:text-left max-w-md">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Experience the Lifecycle</h2>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                Start by reporting a problem or tracking an existing complaint code.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
              <Link href="/report">
                <Button className="h-11 px-5 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-teal-600/20 flex items-center gap-2">
                  <FilePlus className="h-4 w-4" />
                  <span>Report an Issue →</span>
                </Button>
              </Link>

              <Link href="/track">
                <Button variant="outline" className="h-11 px-5 bg-white hover:bg-slate-50 text-slate-800 border-slate-300 font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-2">
                  <Search className="h-4 w-4 text-teal-600" />
                  <span>Track a Report</span>
                </Button>
              </Link>
            </div>

            {/* Cursive Accent Tagline */}
            <div className="hidden lg:flex items-center gap-1.5 text-teal-800 font-serif italic text-sm font-bold shrink-0">
              <span>Together for a Cleaner, Safer Tomorrow</span>
              <Leaf className="h-4 w-4 text-teal-600" />
            </div>

          </div>
        </section>

      </main>

      {/* FOOTER BAR */}
      <footer className="w-full bg-white border-t border-slate-200/80 py-4 mt-8 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
          <div>© 2026 CivicShield AI. All rights reserved.</div>
          
          <div className="flex items-center gap-6">
            <Link href="/about" className="hover:text-slate-900 transition-colors">Privacy</Link>
            <Link href="/about" className="hover:text-slate-900 transition-colors">Terms</Link>
            <Link href="/about" className="hover:text-slate-900 transition-colors">Support</Link>
            <span className="text-slate-300">|</span>
            <span className="text-teal-700 font-bold flex items-center gap-1">
              Together for a Cleaner, Safer Tomorrow <Leaf className="h-3.5 w-3.5 text-teal-600 inline" />
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
