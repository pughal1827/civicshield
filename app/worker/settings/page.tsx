'use client';

import React from 'react';
import { Settings, Bell, Shield, Smartphone, HardHat } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function WorkerSettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6 text-orange-500" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Worker Portal Settings</h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Telemetry, Dispatch Notifications & Evidence Preferences
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6 shadow-xs text-xs">
        <div className="space-y-4">
          <h2 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <Bell className="h-4 w-4 text-orange-500" />
            Notification & Alert Preferences
          </h2>

          <div className="space-y-3 pl-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded text-orange-500 focus:ring-orange-500" />
              <span className="font-bold text-slate-700">Push alert when new complaint assigned to my department</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded text-orange-500 focus:ring-orange-500" />
              <span className="font-bold text-slate-700">Sound alarm on High/Critical priority dispatches</span>
            </label>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-6 space-y-4">
          <h2 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-orange-500" />
            Field Device & GPS Telemetry Settings
          </h2>

          <div className="space-y-3 pl-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded text-orange-500 focus:ring-orange-500" />
              <span className="font-bold text-slate-700">Attach automatic GPS coordinates to resolution photo uploads</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded text-orange-500 focus:ring-orange-500" />
              <span className="font-bold text-slate-700">High-accuracy location tracking during active repairs</span>
            </label>
          </div>
        </div>

        <div className="pt-2">
          <Button className="bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs rounded-xl h-10">
            Save Preferences
          </Button>
        </div>
      </div>
    </div>
  );
}
