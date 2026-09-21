'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Shield,
  Users,
  Building2,
  ArrowRight,
  Globe,
  ChevronDown,
  Camera,
  FileText,
  MapPin,
  HeartHandshake,
  BarChart3,
  Building,
  FileCheck,
  CheckCircle2,
  Sparkles,
  Leaf,
  HardHat,
  ClipboardList,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingRoleSelectionPage() {
  const [selectedLang, setSelectedLang] = useState('English');
  const [showLangDropdown, setShowLangDropdown] = useState(false);

  const languages = ['English', 'Tamil (தமிழ்)', 'Hindi (हिंदी)', 'Spanish (Español)'];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-between relative overflow-x-hidden">
      
      {/* BACKGROUND CITY SKYLINE IMAGE OVERLAY */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-25 pointer-events-none"
        style={{ backgroundImage: `url('/images/civic_city_bg.jpg')` }}
      />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-slate-50/90 via-sky-50/40 to-slate-100/90 pointer-events-none" />

      {/* HEADER BAR (CLEAN PUBLIC HEADER - NO SIDEBAR, NO USER LOGGED IN DATA) */}
      <header className="w-full bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo & Tagline */}
          <Link href="/" className="flex items-center gap-3 group">
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

          {/* Right Navigation Links & Language Picker */}
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-600">
              <a href="#about" className="hover:text-emerald-600 transition-colors">About</a>
              <a href="#how-it-works" className="hover:text-emerald-600 transition-colors">How It Works</a>
              <a href="#impact" className="hover:text-emerald-600 transition-colors">Impact</a>
              <a href="#contact" className="hover:text-emerald-600 transition-colors">Contact</a>
            </nav>

            {/* Language Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowLangDropdown(!showLangDropdown)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 text-slate-700 text-xs font-bold transition-all border border-slate-200/80 min-h-[40px]"
              >
                <Globe className="h-4 w-4 text-emerald-600" />
                <span>Language</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </button>

              {showLangDropdown && (
                <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  {languages.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        setSelectedLang(lang.split(' ')[0]);
                        setShowLangDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 sm:space-y-12 z-10">

        {/* HERO SECTION */}
        <section className="text-center space-y-3 sm:space-y-4 max-w-3xl mx-auto">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50/90 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-xs backdrop-blur-xs">
            <Shield className="h-4 w-4 text-emerald-600 fill-emerald-600/20" />
            <span>Official Municipal Digital Civic Service</span>
          </div>

          {/* Main Heading with Green Emphasis */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            A Cleaner City <span className="text-emerald-600 underline decoration-emerald-300 decoration-wavy underline-offset-8">Starts with You</span>
          </h1>

          {/* Supporting Text */}
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed font-medium">
            Report issues. Track progress. Build a better, safer, and healthier community together.
          </p>
        </section>

        {/* THREE CARDS (CITIZEN, AUTHORITY, & DEPARTMENT WORKER) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-6 max-w-7xl mx-auto items-stretch">
          
          {/* LEFT CARD: CITIZEN LOGIN */}
          <div className="bg-white/95 backdrop-blur-md rounded-3xl border-2 border-emerald-100 hover:border-emerald-300 p-6 sm:p-8 flex flex-col justify-between shadow-xl shadow-emerald-950/5 hover:shadow-2xl hover:shadow-emerald-600/10 transition-all group relative overflow-hidden">
            
            <div className="space-y-5">
              
              {/* Image Container with Floating Badge */}
              <div className="relative h-48 sm:h-52 w-full rounded-2xl overflow-hidden border border-emerald-100/80 shadow-inner bg-emerald-50">
                <Image
                  src="/images/citizen_reporting.jpg"
                  alt="Citizen reporting issue using smartphone"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  priority
                />

                {/* Floating Green Circle Badge */}
                <div className="absolute top-3 left-3 h-12 w-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-900/30 border-2 border-white">
                  <Users className="h-6 w-6" />
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-1.5">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Citizen Login</h2>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Report civic issues, track your complaints, and help make your city a better place.
                </p>
              </div>

              {/* Feature List */}
              <ul className="space-y-2.5 text-xs text-slate-700 font-bold">
                <li className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Camera className="h-4 w-4" />
                  </div>
                  <span>Report Issues with Photos</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <span>Track Complaint Status</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <span>View Nearby Issues</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <HeartHandshake className="h-4 w-4" />
                  </div>
                  <span>Be a Part of Change</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="pt-6 space-y-3 border-t border-slate-100 mt-6">
              <Link href="/login" className="block w-full">
                <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 group-hover:gap-3 transition-all">
                  <span>Login as Citizen</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <div className="text-center">
                <Link href="/signup" className="text-xs font-extrabold text-emerald-600 hover:text-emerald-700 hover:underline">
                  New Citizen? <span className="underline">Create an Account</span>
                </Link>
              </div>
            </div>

          </div>

          {/* MIDDLE CARD: AUTHORITY LOGIN */}
          <div className="bg-white/95 backdrop-blur-md rounded-3xl border-2 border-slate-200 hover:border-blue-300 p-6 sm:p-8 flex flex-col justify-between shadow-xl shadow-slate-900/5 hover:shadow-2xl hover:shadow-blue-600/10 transition-all group relative overflow-hidden">
            
            <div className="space-y-5">
              
              {/* Image Container with Floating Badge */}
              <div className="relative h-48 sm:h-52 w-full rounded-2xl overflow-hidden border border-blue-100/80 shadow-inner bg-blue-50">
                <Image
                  src="/images/officer_command.jpg"
                  alt="Municipal officer at workstation dashboard"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  priority
                />

                {/* Floating Blue Circle Badge */}
                <div className="absolute top-3 left-3 h-12 w-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-900/30 border-2 border-white">
                  <Building2 className="h-6 w-6" />
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-1.5">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Authority Login</h2>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Manage complaints, assign departments, monitor progress, and keep the city running smoothly.
                </p>
              </div>

              {/* Feature List */}
              <ul className="space-y-2.5 text-xs text-slate-700 font-bold">
                <li className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <span>View & Manage Complaints</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Building className="h-4 w-4" />
                  </div>
                  <span>Assign Departments</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <span>Monitor on Map</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <FileCheck className="h-4 w-4" />
                  </div>
                  <span>Generate Reports</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="pt-6 space-y-3 border-t border-slate-100 mt-6">
              <Link href="/authority/login" className="block w-full">
                <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 group-hover:gap-3 transition-all">
                  <span>Login as Authority</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <div className="text-center">
                <span className="text-[11px] font-semibold text-slate-500">
                  Municipal Officers, Ward Inspectors & Admin Personnel
                </span>
              </div>
            </div>

          </div>

          {/* RIGHT CARD: DEPARTMENT WORKER LOGIN */}
          <div className="bg-white/95 backdrop-blur-md rounded-3xl border-2 border-slate-200 hover:border-orange-300 p-6 sm:p-8 flex flex-col justify-between shadow-xl shadow-slate-900/5 hover:shadow-2xl hover:shadow-orange-600/10 transition-all group relative overflow-hidden">
            
            <div className="space-y-5">
              
              {/* Image Container with Floating Badge */}
              <div className="relative h-48 sm:h-52 w-full rounded-2xl overflow-hidden border border-orange-100/80 shadow-inner bg-orange-50">
                <Image
                  src="/images/worker_field_hero.jpg"
                  alt="Department field worker wearing safety gear"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  priority
                />

                {/* Floating Orange Circle Badge */}
                <div className="absolute top-3 left-3 h-12 w-12 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-900/30 border-2 border-white">
                  <HardHat className="h-6 w-6" />
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-1.5">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Department Worker Login</h2>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  View assigned tasks, update work progress, and submit on-ground evidence to keep the city clean and functional.
                </p>
              </div>

              {/* Feature List */}
              <ul className="space-y-2.5 text-xs text-slate-700 font-bold">
                <li className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                    <ClipboardList className="h-4 w-4" />
                  </div>
                  <span>View Assigned Tasks</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                    <RefreshCw className="h-4 w-4" />
                  </div>
                  <span>Update Work Status</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                    <Camera className="h-4 w-4" />
                  </div>
                  <span>Upload Before/After Photos</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <span>Mark Task as Completed</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="pt-6 space-y-3 border-t border-slate-100 mt-6">
              <Link href="/worker/login" className="block w-full">
                <Button className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 group-hover:gap-3 transition-all">
                  <span>Login as Worker</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <div className="text-center">
                <span className="text-[11px] font-bold text-orange-600">
                  Field Staff, Engineers & Department Personnel
                </span>
              </div>
            </div>

          </div>

        </section>

        {/* BOTTOM IMPACT BAR */}
        <section id="impact" className="pt-4">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              
              <div className="flex items-center justify-center gap-2.5 p-2">
                <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Leaf className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <span className="block text-xs font-extrabold text-slate-900">Cleaner</span>
                  <span className="block text-[11px] text-slate-500 font-medium">Environment</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2.5 p-2">
                <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Shield className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <span className="block text-xs font-extrabold text-slate-900">Safer</span>
                  <span className="block text-[11px] text-slate-500 font-medium">Communities</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2.5 p-2">
                <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <span className="block text-xs font-extrabold text-slate-900">More</span>
                  <span className="block text-[11px] text-slate-500 font-medium">Accountability</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2.5 p-2">
                <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <span className="block text-xs font-extrabold text-slate-900">Better</span>
                  <span className="block text-[11px] text-slate-500 font-medium">Cities</span>
                </div>
              </div>

            </div>
          </div>
        </section>

      </main>

      {/* FOOTER BAR */}
      <footer className="w-full bg-white/90 backdrop-blur-md border-t border-slate-200/80 py-5 mt-8 z-10">
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
