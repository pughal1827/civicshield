'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, LogOut, Clock, Bell, Edit2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function CitizenProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.user) {
          setUser(json.data.user);
          setFullName(json.data.user.fullName);
        } else {
          const mockUser = { id: 'user-001', fullName: 'Jane Citizen', email: 'citizen@civicshield.org', role: 'CITIZEN' };
          setUser(mockUser);
          setFullName(mockUser.fullName);
        }
      })
      .catch(() => {
        const mockUser = { id: 'user-001', fullName: 'Jane Citizen', email: 'citizen@civicshield.org', role: 'CITIZEN' };
        setUser(mockUser);
        setFullName(mockUser.fullName);
      });
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

  const handleSave = () => {
    setUser((prev: any) => ({ ...prev, fullName }));
    setIsEditing(false);
    setSavedMessage('Profile updated!');
    setTimeout(() => setSavedMessage(null), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 max-w-lg mx-auto space-y-5 my-2 pb-24">
      <div className="text-center space-y-1">
        <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Citizen Profile</h1>
        <p className="text-xs text-slate-400">Account details & quick actions</p>
      </div>

      <Card variant="glass" className="p-5 space-y-5 border-slate-800 rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{user?.fullName || 'Citizen User'}</h2>
              <p className="text-xs text-slate-400 font-mono">{user?.email || 'citizen@civicshield.org'}</p>
            </div>
          </div>
          <Badge variant="emerald">{user?.role || 'CITIZEN'}</Badge>
        </div>

        {savedMessage && (
          <div className="p-3 bg-emerald-950/50 border border-emerald-800 text-xs text-emerald-300 rounded-xl flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-400" />
            <span>{savedMessage}</span>
          </div>
        )}

        {/* Profile Info Fields */}
        <div className="space-y-3 text-xs">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400 font-semibold text-[10px] uppercase">
              <span>Name</span>
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="text-emerald-400 hover:underline flex items-center gap-1 text-xs"
              >
                <Edit2 className="h-3 w-3" />
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
            </div>
            {isEditing ? (
              <div className="flex items-center gap-2 pt-1">
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-slate-900 text-xs h-10 min-h-[40px]"
                />
                <Button size="sm" variant="primary" onClick={handleSave} className="text-xs shrink-0 min-h-[40px] px-3">
                  Save
                </Button>
              </div>
            ) : (
              <p className="text-slate-100 font-bold text-sm pt-0.5">{user?.fullName}</p>
            )}
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-400 font-semibold text-[10px] uppercase">Email</span>
            <p className="text-slate-200 font-mono text-xs pt-0.5">{user?.email}</p>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-400 font-semibold text-[10px] uppercase">Account Type</span>
            <p className="text-emerald-400 font-bold text-xs pt-0.5">{user?.role || 'Citizen Portal'}</p>
          </div>
        </div>

        {/* Actions List */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <Link href="/my-reports" className="block w-full">
            <Button size="md" variant="outline" className="w-full min-h-[48px] justify-start text-xs font-semibold border-slate-800 rounded-xl">
              <Clock className="h-4 w-4 mr-2.5 text-emerald-400" />
              <span>My Reports</span>
            </Button>
          </Link>

          <Link href="/citizen/notifications" className="block w-full">
            <Button size="md" variant="outline" className="w-full min-h-[48px] justify-start text-xs font-semibold border-slate-800 rounded-xl">
              <Bell className="h-4 w-4 mr-2.5 text-cyan-400" />
              <span>Notifications</span>
            </Button>
          </Link>

          <Button
            size="md"
            variant="outline"
            onClick={handleLogout}
            className="w-full min-h-[48px] justify-start text-xs font-semibold border-rose-900/60 text-rose-400 hover:bg-rose-950/40 rounded-xl"
          >
            <LogOut className="h-4 w-4 mr-2.5 text-rose-400" />
            <span>Logout</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}
