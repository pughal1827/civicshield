'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  HardHat,
  Shield,
  Wrench,
  ClipboardList,
  Camera,
  CheckCircle2,
  Clock,
  MapPin,
  AlertTriangle,
  Upload,
  ArrowLeft,
  LogOut,
  RefreshCw,
  UserCheck,
  Check,
  Building2,
  ChevronRight,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getWorkerAuthHeaders } from '@/lib/auth/worker-client';

interface WorkerTask {
  id: string;
  caseId: string;
  title: string;
  category: string;
  address: string;
  priorityScore: number;
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'PENDING_PARTS';
  description: string;
  beforePhoto?: string;
  afterPhoto?: string;
  createdAt: string;
  department: string;
}

export default function DepartmentWorkerPortalPage() {
  const [tasks, setTasks] = useState<WorkerTask[]>([
    {
      id: 'inc-case-001',
      caseId: 'CASE-001',
      title: 'Deep Pothole Asphalt Repair on Main Road',
      category: 'ROAD_POTHOLE',
      address: '42 Main Road, Sector 1',
      priorityScore: 75,
      status: 'ASSIGNED',
      description: 'Deep pothole causing vehicle damage near school crossing',
      beforePhoto: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80',
      createdAt: '2026-09-21T10:00:00.000Z',
      department: 'Road Maintenance'
    }
  ]);

  const [activeTab, setActiveTab] = useState<'ALL' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  const [selectedTask, setSelectedTask] = useState<WorkerTask | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [workNotes, setWorkNotes] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/worker/incidents', {
      credentials: 'same-origin',
      headers: getWorkerAuthHeaders(),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.incidents && json.data.incidents.length > 0) {
          const mapped: WorkerTask[] = json.data.incidents.map((inc: any) => ({
            id: inc.id,
            caseId: inc.caseId || inc.case_id || 'CASE-001',
            title: inc.title,
            category: inc.category,
            address: inc.address,
            priorityScore: inc.priorityScore || inc.priority_score || 75,
            status: inc.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : inc.status === 'CLOSED' || inc.status === 'VERIFIED' || inc.status === 'RESOLVED' ? 'COMPLETED' : 'ASSIGNED',
            description: inc.summary || inc.description,
            beforePhoto: inc.imageUrl || inc.before_photo_url,
            afterPhoto: inc.evidence?.proof_image_url || inc.afterPhotoUrl,
            createdAt: inc.createdAt || inc.created_at,
            department: inc.departmentName || inc.departments?.name || 'Road Maintenance'
          }));
          setTasks(mapped);
          setSelectedTask(mapped[0]);
        } else {
          setSelectedTask(tasks[0]);
        }
      })
      .catch(() => {
        setSelectedTask(tasks[0]);
      });
  }, []);

  // Filter tasks by active tab
  const filteredTasks = tasks.filter((t) => {
    if (activeTab === 'ALL') return true;
    return t.status === activeTab;
  });

  const handleStatusChange = (taskId: string, newStatus: WorkerTask['status']) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask({ ...selectedTask, status: newStatus });
    }
    showToast(`Task ${selectedTask?.caseId || taskId} status updated to ${newStatus.replace('_', ' ')}!`);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingPhoto(true);
      const url = URL.createObjectURL(file);
      setTimeout(() => {
        setPhotoPreview(url);
        setUploadingPhoto(false);
        showToast('Proof photo attached successfully!');
      }, 800);
    }
  };

  const handleMarkCompleted = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: 'COMPLETED',
              afterPhoto: photoPreview || t.afterPhoto || '/images/officer_command.jpg',
            }
          : t
      )
    );
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask({
        ...selectedTask,
        status: 'COMPLETED',
        afterPhoto: photoPreview || selectedTask.afterPhoto || '/images/officer_command.jpg',
      });
    }
    showToast('Task marked as COMPLETED! Evidence submitted to Authority Command.');
  };

  const showToast = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-between">
      
      {/* HEADER */}
      <header className="bg-slate-900 text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="h-9 w-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-md">
                <HardHat className="h-5 w-5" />
              </div>
              <div>
                <span className="text-base font-extrabold tracking-tight">CivicShield</span>
                <span className="text-base font-extrabold text-orange-400"> WORKER</span>
              </div>
            </Link>
            <span className="hidden sm:inline-block text-xs px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-300 font-bold border border-orange-500/30 ml-2">
              Field Operations Portal
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-xs">
              <UserCheck className="h-4 w-4 text-orange-400" />
              <span className="font-bold text-slate-200">Marcus Vance</span>
              <span className="text-slate-400">(Electrical Lead)</span>
            </div>

            <Link href="/worker/login">
              <Button size="sm" variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold gap-1.5">
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </Button>
            </Link>
          </div>

        </div>
      </header>

      {/* TOAST NOTIFICATION */}
      {successMessage && (
        <div className="fixed top-20 right-4 z-50 max-w-sm bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400 animate-in slide-in-from-top duration-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="text-xs font-bold">{successMessage}</span>
        </div>
      )}

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* STATS OVERVIEW CARDS */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">{tasks.length}</div>
              <div className="text-[11px] font-bold text-slate-500">Total Assigned</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">
                {tasks.filter((t) => t.status === 'IN_PROGRESS').length}
              </div>
              <div className="text-[11px] font-bold text-slate-500">In Progress</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">4</div>
              <div className="text-[11px] font-bold text-slate-500">Photos Uploaded</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">
                {tasks.filter((t) => t.status === 'COMPLETED').length}
              </div>
              <div className="text-[11px] font-bold text-slate-500">Completed</div>
            </div>
          </div>
        </section>

        {/* TASK MANAGEMENT WORKSPACE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT LIST COLUMN (4 cols) */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-5 space-y-4 shadow-xs">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <HardHat className="h-5 w-5 text-orange-500" />
                <h2 className="text-base font-black text-slate-900">Field Task Queue</h2>
              </div>
              <span className="text-xs font-extrabold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">
                {filteredTasks.length} Tasks
              </span>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setActiveTab('ALL')}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${
                  activeTab === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab('ASSIGNED')}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${
                  activeTab === 'ASSIGNED' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Assigned
              </button>
              <button
                onClick={() => setActiveTab('IN_PROGRESS')}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${
                  activeTab === 'IN_PROGRESS' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setActiveTab('COMPLETED')}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${
                  activeTab === 'COMPLETED' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Done
              </button>
            </div>

            {/* Tasks List */}
            <div className="space-y-3">
              {filteredTasks.map((t) => {
                const isSelected = selectedTask?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTask(t)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50/50 shadow-md ring-1 ring-orange-500'
                        : 'border-slate-200 bg-white hover:border-orange-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold text-orange-600">{t.caseId}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          t.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : t.status === 'IN_PROGRESS'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {t.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-slate-900 line-clamp-1">{t.title}</div>

                    <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium line-clamp-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{t.address}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="font-bold text-slate-600">{t.category}</span>
                      <span className="font-black text-orange-600">Priority: {t.priorityScore}/100</span>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* RIGHT DETAIL WORKSPACE COLUMN (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 space-y-6 shadow-xs">
            {selectedTask ? (
              <div className="space-y-6">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-orange-600 bg-orange-100 px-2.5 py-1 rounded-full">
                        {selectedTask.caseId}
                      </span>
                      <span className="text-xs font-bold text-slate-500">{selectedTask.department}</span>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mt-1">{selectedTask.title}</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Status:</span>
                    <select
                      value={selectedTask.status}
                      onChange={(e) => handleStatusChange(selectedTask.id, e.target.value as WorkerTask['status'])}
                      className="text-xs font-bold bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="ASSIGNED">ASSIGNED</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="PENDING_PARTS">PENDING_PARTS</option>
                      <option value="COMPLETED">COMPLETED</option>
                    </select>
                  </div>
                </div>

                {/* Location & Details */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-700 font-bold">
                    <MapPin className="h-4 w-4 text-orange-500" />
                    <span>Location: {selectedTask.address}</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed font-medium pl-6">
                    {selectedTask.description}
                  </p>
                </div>

                {/* WORKER ACTION PANEL (Requirements: View Tasks, Update Status, Upload Photos, Mark Completed) */}
                <div className="p-5 rounded-2xl bg-orange-50/50 border-2 border-orange-200 space-y-5">
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-orange-600" />
                    Field Action & On-Ground Evidence Submission
                  </h4>

                  {/* Photo Upload Section */}
                  <div className="space-y-2">
                    <label className="text-xs font-extrabold text-slate-700 flex items-center gap-2">
                      <Camera className="h-4 w-4 text-orange-600" />
                      Upload Before / After Photo Evidence
                    </label>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      {/* Photo preview or uploader button */}
                      <label className="w-full sm:w-1/2 h-36 border-2 border-dashed border-orange-300 hover:border-orange-500 bg-white rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative group">
                        {photoPreview || selectedTask.afterPhoto ? (
                          <Image
                            src={photoPreview || selectedTask.afterPhoto || '/images/officer_command.jpg'}
                            alt="Uploaded evidence"
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="text-center p-4 space-y-1">
                            <Upload className="h-6 w-6 text-orange-500 mx-auto" />
                            <span className="text-xs font-extrabold text-orange-600 block">
                              {uploadingPhoto ? 'Uploading...' : 'Take or Attach Photo'}
                            </span>
                            <span className="text-[10px] text-slate-400">JPG, PNG up to 10MB</span>
                          </div>
                        )}
                        <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                      </label>

                      <div className="w-full sm:w-1/2 text-xs text-slate-600 space-y-2">
                        <div className="font-bold text-slate-800">Photo Requirements:</div>
                        <ul className="space-y-1 list-disc pl-4 text-[11px] text-slate-500 font-medium">
                          <li>Clear photo showing completed repair site</li>
                          <li>Good daylight or flashlight illumination</li>
                          <li>GPS location metadata timestamped</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Work Notes */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-700">Worker Field Notes & Parts Used</label>
                    <textarea
                      rows={2}
                      value={workNotes}
                      onChange={(e) => setWorkNotes(e.target.value)}
                      placeholder="e.g. Replaced 100W LED streetlight fixture and re-sealed junction box wiring..."
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                    <Button
                      onClick={() => handleStatusChange(selectedTask.id, 'IN_PROGRESS')}
                      variant="outline"
                      className="w-full sm:w-1/2 h-11 border-orange-300 text-orange-700 hover:bg-orange-100 text-xs font-extrabold rounded-xl"
                    >
                      <Wrench className="h-4 w-4 mr-2 text-orange-600" />
                      Set to IN_PROGRESS
                    </Button>

                    <Button
                      onClick={() => handleMarkCompleted(selectedTask.id)}
                      className="w-full sm:w-1/2 h-11 bg-orange-500 hover:bg-orange-600 text-white text-xs font-extrabold rounded-xl shadow-md shadow-orange-500/20"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Mark Task as Completed →
                    </Button>
                  </div>

                </div>

              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs font-bold">
                Select a task from the left queue to view details and submit evidence.
              </div>
            )}
          </div>

        </div>

      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs text-slate-500 font-medium">
          <div>© 2026 CivicShield AI · Department Field Worker Portal</div>
          <div className="flex items-center gap-2 text-orange-600 font-bold">
            <HardHat className="h-4 w-4" />
            <span>Field Operations Active</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
