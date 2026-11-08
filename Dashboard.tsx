import React, { useState } from 'react';
import {
  Sparkles,
  Image as ImageIcon,
  Video,
  Mic,
  Layers,
  Wand2,
  Download,
  Plus,
  Trash2,
  Copy,
  Clock,
  HardDrive,
  Upload,
  Camera,
  FolderOpen,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Project, deleteProject, exportProjectBackup, importProjectBackup } from '../../services/storage';
import { ActiveTab } from '../layout/Header';

interface DashboardProps {
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (project: Project) => void;
  onCreateProject: (type: 'photo' | 'video' | 'audio' | 'unified', name?: string) => void;
  onRefreshProjects: () => void;
  onTabChange: (tab: ActiveTab) => void;
  onOpenQuickCamera: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  projects,
  activeProject,
  onSelectProject,
  onCreateProject,
  onRefreshProjects,
  onTabChange,
  onOpenQuickCamera,
}) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteProject(id);
      setDeleteConfirmId(null);
      showNotification('Project deleted successfully');
      onRefreshProjects();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDuplicate = async (proj: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    const copy: Project = {
      ...proj,
      id: 'proj_' + Math.random().toString(36).substring(2, 9),
      name: `${proj.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onSelectProject(copy);
    showNotification('Project duplicated');
    onRefreshProjects();
  };

  const handleExportBackup = async () => {
    setIsExportingBackup(true);
    try {
      const json = await exportProjectBackup();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nova-editor-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showNotification('Project backup exported to device');
    } catch (err) {
      console.error(err);
      showNotification('Failed to export backup');
    } finally {
      setIsExportingBackup(false);
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const count = await importProjectBackup(text);
        showNotification(`Successfully restored ${count} project(s)`);
        onRefreshProjects();
      } catch (err: any) {
        showNotification('Invalid backup file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-purple-600/90 text-white text-sm font-semibold shadow-2xl backdrop-blur-md border border-purple-400/40 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-300" />
          {notification}
        </div>
      )}

      {/* Hero Studio Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-950/70 via-indigo-950/60 to-[#0c0c1e] border border-purple-500/25 p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-900/40 border border-purple-500/40 text-purple-300 text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Next-Gen Creative Suite
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            NOVA EDITOR <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">AI</span>
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Professional photo retouching, multi-track video editing, audio mastering, and Gemini-powered creative tools. All in one unified browser studio with 100% offline persistence.
          </p>

          {/* Quick CTA Actions */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                onCreateProject('unified', 'Unified Master Project');
                onTabChange('timeline');
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-purple-900/50 hover:shadow-purple-700/50 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Master Project
            </button>
            <button
              onClick={onOpenQuickCamera}
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Camera className="w-4 h-4 text-cyan-400" />
              Camera Capture
            </button>
            <button
              onClick={handleExportBackup}
              disabled={isExportingBackup}
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-purple-400" />
              Backup Studio
            </button>
            <label className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 flex items-center gap-2 transition-colors cursor-pointer">
              <Upload className="w-4 h-4 text-indigo-400" />
              Restore Backup
              <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* Studio Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#0f0f1c] border border-purple-900/20 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Total Projects</span>
            <FolderOpen className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">{projects.length}</div>
        </div>
        <div className="p-4 rounded-2xl bg-[#0f0f1c] border border-purple-900/20 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Active Project</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-sm font-bold text-slate-200 truncate" title={activeProject?.name}>
            {activeProject ? activeProject.name : 'None selected'}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-[#0f0f1c] border border-purple-900/20 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Storage Status</span>
            <HardDrive className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 text-xs sm:text-sm">IndexedDB Ready</div>
        </div>
        <div className="p-4 rounded-2xl bg-[#0f0f1c] border border-purple-900/20 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Offline Engine</span>
            <ShieldCheck className="w-4 h-4 text-pink-400" />
          </div>
          <div className="text-xs sm:text-sm font-bold text-purple-300">100% Standalone</div>
        </div>
      </div>

      {/* Editor Shortcuts Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-400" />
            Studio Creative Workspaces
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Photo Editor Card */}
          <div
            onClick={() => {
              onCreateProject('photo', 'Photo Studio Art');
              onTabChange('photo');
            }}
            className="group relative p-5 rounded-2xl bg-[#0f0f1e] hover:bg-[#16162a] border border-purple-900/30 hover:border-purple-500/50 shadow-lg transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-900/40 border border-purple-500/30 flex items-center justify-center text-purple-300 mb-4 group-hover:scale-110 transition-transform">
                <ImageIcon className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="font-bold text-white text-base mb-1">Photo Editor</h3>
              <p className="text-slate-400 text-xs line-clamp-2">
                Filters, tone curves, retouch brush, background cutout, crop, and text overlays.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-purple-900/20 flex items-center justify-between text-purple-300 text-xs font-semibold">
              <span>Open Studio</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Video Editor Card */}
          <div
            onClick={() => {
              onCreateProject('video', 'Video Reel Master');
              onTabChange('video');
            }}
            className="group relative p-5 rounded-2xl bg-[#0f0f1e] hover:bg-[#16162a] border border-purple-900/30 hover:border-cyan-500/50 shadow-lg transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-cyan-900/40 border border-cyan-500/30 flex items-center justify-center text-cyan-300 mb-4 group-hover:scale-110 transition-transform">
                <Video className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="font-bold text-white text-base mb-1">Video Editor</h3>
              <p className="text-slate-400 text-xs line-clamp-2">
                Multi-clip trim, glitch cuts, color grading, subtitles, and real MP4/WebM export.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-purple-900/20 flex items-center justify-between text-cyan-300 text-xs font-semibold">
              <span>Open Studio</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Voice & Audio Studio Card */}
          <div
            onClick={() => {
              onCreateProject('audio', 'Audio Master Session');
              onTabChange('audio');
            }}
            className="group relative p-5 rounded-2xl bg-[#0f0f1e] hover:bg-[#16162a] border border-purple-900/30 hover:border-pink-500/50 shadow-lg transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-pink-900/40 border border-pink-500/30 flex items-center justify-center text-pink-300 mb-4 group-hover:scale-110 transition-transform">
                <Mic className="w-6 h-6 text-pink-400" />
              </div>
              <h3 className="font-bold text-white text-base mb-1">Voice & Audio</h3>
              <p className="text-slate-400 text-xs line-clamp-2">
                Mic recorder, live waveform, 5-band EQ, noise reduction, and 16-bit PCM WAV.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-purple-900/20 flex items-center justify-between text-pink-300 text-xs font-semibold">
              <span>Open Studio</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Master Timeline Card */}
          <div
            onClick={() => {
              onCreateProject('unified', 'Unified Master Project');
              onTabChange('timeline');
            }}
            className="group relative p-5 rounded-2xl bg-[#0f0f1e] hover:bg-[#16162a] border border-purple-900/30 hover:border-indigo-500/50 shadow-lg transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-900/40 border border-indigo-500/30 flex items-center justify-center text-indigo-300 mb-4 group-hover:scale-110 transition-transform">
                <Layers className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="font-bold text-white text-base mb-1">Master Timeline</h3>
              <p className="text-slate-400 text-xs line-clamp-2">
                Unified multi-track DAW timeline: sync video, overlay photos, voice, music & text.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-purple-900/20 flex items-center justify-between text-indigo-300 text-xs font-semibold">
              <span>Open Timeline</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* AI Creative Studio Card */}
          <div
            onClick={() => onTabChange('ai')}
            className="group relative p-5 rounded-2xl bg-gradient-to-b from-[#181028] to-[#0f0f1e] hover:from-[#221638] border border-purple-500/40 shadow-lg transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-300 mb-4 group-hover:scale-110 transition-transform">
                <Wand2 className="w-6 h-6 text-purple-300" />
              </div>
              <h3 className="font-bold text-white text-base mb-1 flex items-center gap-1.5">
                AI Studio
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500 text-white">
                  GEMINI
                </span>
              </h3>
              <p className="text-slate-400 text-xs line-clamp-2">
                AI image synthesis, Hollywood color grading suggestions, and voiceover scripts.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-purple-900/20 flex items-center justify-between text-purple-300 text-xs font-semibold">
              <span>Open AI Hub</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Projects and Drafts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            Recent Projects & Drafts ({projects.length})
          </h2>
        </div>

        {projects.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-[#0f0f1c] border border-slate-800 text-slate-400 space-y-3">
            <Layers className="w-10 h-10 mx-auto text-slate-600" />
            <p>No projects created yet. Start creating your masterpiece!</p>
            <button
              onClick={() => {
                onCreateProject('photo', 'My First Project');
                onTabChange('photo');
              }}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors"
            >
              Create Starter Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((proj) => {
              const isSelected = activeProject?.id === proj.id;
              return (
                <div
                  key={proj.id}
                  onClick={() => {
                    onSelectProject(proj);
                    onTabChange(proj.type === 'unified' ? 'timeline' : proj.type);
                  }}
                  className={`relative p-4 rounded-2xl bg-[#0f0f1e] hover:bg-[#141426] border transition-all cursor-pointer group flex flex-col justify-between ${
                    isSelected
                      ? 'border-purple-500 shadow-lg shadow-purple-900/30'
                      : 'border-purple-900/20 hover:border-purple-500/40'
                  }`}
                >
                  <div>
                    {/* Thumbnail if available */}
                    <div className="relative aspect-video w-full rounded-xl bg-[#080811] overflow-hidden mb-3 border border-purple-900/20">
                      {proj.thumbnail ? (
                        <img
                          src={proj.thumbnail}
                          alt={proj.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
                          {proj.type === 'photo' && <ImageIcon className="w-8 h-8 text-purple-500/50" />}
                          {proj.type === 'video' && <Video className="w-8 h-8 text-cyan-500/50" />}
                          {proj.type === 'audio' && <Mic className="w-8 h-8 text-pink-500/50" />}
                          {proj.type === 'unified' && <Layers className="w-8 h-8 text-indigo-500/50" />}
                        </div>
                      )}
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                        {proj.type}
                      </div>
                    </div>

                    <h4 className="font-bold text-sm text-white group-hover:text-purple-300 transition-colors truncate">
                      {proj.name}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Updated {new Date(proj.updatedAt || proj.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {/* Action Controls */}
                  <div className="mt-4 pt-3 border-t border-purple-900/20 flex items-center justify-between">
                    <button
                      onClick={(e) => handleDuplicate(proj, e)}
                      title="Duplicate project"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    {deleteConfirmId === proj.id ? (
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[10px] text-rose-300">Delete?</span>
                        <button
                          onClick={(e) => handleDelete(proj.id, e)}
                          className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold"
                        >
                          Yes
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(null);
                          }}
                          className="px-2 py-0.5 rounded bg-slate-700 text-slate-300 text-[10px]"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(proj.id);
                        }}
                        title="Delete project"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
