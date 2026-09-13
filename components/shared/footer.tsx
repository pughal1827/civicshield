import React from 'react';
import Link from 'next/link';
import { Shield, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-800/80 bg-slate-950 py-12 text-slate-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <Shield className="h-4 w-4 fill-current" />
              </div>
              <span className="text-base font-bold text-slate-100">CivicShield AI</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-400 max-w-sm">
              AI-Powered Civic Issue Detection, Prioritization & Resolution Platform. Transforming citizen reports into intelligent, prioritized, and trackable municipal actions.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">Quick Navigation</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/report" className="hover:text-emerald-400 transition-colors">
                  Report a Civic Issue
                </Link>
              </li>
              <li>
                <Link href="/track" className="hover:text-emerald-400 transition-colors">
                  Track Complaint Status
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-cyan-400 transition-colors">
                  Authority Triage Dashboard
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">Platform Intelligence</h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-1.5 text-slate-300">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                <span>Multi-modal Vision AI</span>
              </li>
              <li className="flex items-center gap-1.5 text-slate-300">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                <span>Vector Duplicate Match Engine</span>
              </li>
              <li className="flex items-center gap-1.5 text-slate-300">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>Explainable 5-Factor Priority</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800/60 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} CivicShield AI. Built for smart municipal governance.</p>
          <p className="mt-2 sm:mt-0 text-slate-400">Decision-support system for civic authorities.</p>
        </div>
      </div>
    </footer>
  );
};
