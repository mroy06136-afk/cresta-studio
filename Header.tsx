import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Image as ImageIcon,
  Video,
  Mic,
  Layers,
  Wand2,
  Download,
  Wifi,
  WifiOff,
  Camera,
  Save,
  CheckCircle2,
} from 'lucide-react';

export type ActiveTab = 'dashboard' | 'photo' | 'video' | 'audio' | 'timeline' | 'ai' | 'export';

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenQuickCamera: () => void;
  onQuickSave: () => void;
  isSaving?: boolean;
  projectName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onOpenQuickCamera,
  onQuickSave,
  isSaving = false,
  projectName = 'Untitled Studio Project',
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasSavedRecently, setHasSavedRecently] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSaveClick = () => {
    onQuickSave();
    setHasSavedRecently(true);
    setTimeout(() => setHasSavedRecently(false), 2500);
  };

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: 'Studio', icon: <Layers className="w-4 h-4" /> },
    { id: 'photo', label: 'Photo', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'video', label: 'Video', icon: <Video className="w-4 h-4" /> },
    { id: 'audio', label: 'Voice & Audio', icon: <Mic className="w-4 h-4" /> },
    { id: 'timeline', label: 'Master Timeline', icon: <Layers className="w-4 h-4" /> },
    { id: 'ai', label: 'AI Creative', icon: <Wand2 className="w-4 h-4" />, badge: 'AI' },
    { id: 'export', label: 'Export', icon: <Download className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#0a0a14]/90 backdrop-blur-md border-b border-purple-900/30 text-white">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Logo and Project Name */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => onTabChange('dashboard')}
            className="flex items-center gap-2 group text-left focus:outline-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-400 p-[1.5px] shadow-lg shadow-purple-900/40 group-hover:scale-105 transition-transform flex-shrink-0">
              <div className="w-full h-full bg-[#0d0d1a] rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-cyan-300" />
              </div>
            </div>
            <div className="hidden sm:block">
              <div className="font-extrabold tracking-wider text-base bg-gradient-to-r from-purple-300 via-pink-300 to-cyan-300 bg-clip-text text-transparent">
                NOVA EDITOR AI
              </div>
              <div className="text-[10px] uppercase font-mono tracking-widest text-slate-400 flex items-center gap-1.5 truncate max-w-[150px]">
                <span>{projectName}</span>
              </div>
            </div>
          </button>
        </div>

        {/* Center Navigation Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`relative px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50 shadow-sm shadow-purple-900/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {item.icon}
                <span className="hidden md:inline">{item.label}</span>
                {item.badge && (
                  <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Action Utilities */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Online / Offline status badge */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isOnline
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
            }`}
            title={isOnline ? 'Online: Cloud AI and full features active' : 'Offline Mode: Local editing active'}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span className="text-[11px]">{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          {/* Camera Quick Capture */}
          <button
            onClick={onOpenQuickCamera}
            title="Open Camera for Capture"
            className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 hover:text-white border border-slate-700/50 transition-colors"
          >
            <Camera className="w-4 h-4" />
          </button>

          {/* Quick Save */}
          <button
            onClick={handleSaveClick}
            disabled={isSaving}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              hasSavedRecently
                ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200'
                : 'bg-purple-600 hover:bg-purple-500 text-white border-purple-500/60 shadow-md shadow-purple-900/40'
            }`}
          >
            {hasSavedRecently ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Saved</span>
              </>
            ) : (
              <>
                <Save className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Save</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
