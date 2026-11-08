import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  Video,
  Image as ImageIcon,
  Type,
  Mic,
  Music,
  Clock,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { MasterTimelineClip, Project } from '../../services/storage';

interface MasterTimelineProps {
  project: Project | null;
  onUpdateTimeline: (clips: MasterTimelineClip[]) => void;
}

interface TrackDef {
  id: 'video' | 'overlay' | 'subtitle' | 'voiceover' | 'music';
  label: string;
  icon: React.ReactNode;
  color: string;
  visible: boolean;
  locked: boolean;
  muted: boolean;
}

export const MasterTimeline: React.FC<MasterTimelineProps> = ({
  project,
  onUpdateTimeline,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [zoomLevel, setZoomLevel] = useState<number>(30); // pixels per second
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  // Tracks definition
  const [tracks, setTracks] = useState<TrackDef[]>([
    {
      id: 'video',
      label: 'Video Track 1',
      icon: <Video className="w-3.5 h-3.5" />,
      color: '#38bdf8',
      visible: true,
      locked: false,
      muted: false,
    },
    {
      id: 'overlay',
      label: 'Photo Overlays',
      icon: <ImageIcon className="w-3.5 h-3.5" />,
      color: '#a855f7',
      visible: true,
      locked: false,
      muted: false,
    },
    {
      id: 'subtitle',
      label: 'Subtitles & Text',
      icon: <Type className="w-3.5 h-3.5" />,
      color: '#facc15',
      visible: true,
      locked: false,
      muted: false,
    },
    {
      id: 'voiceover',
      label: 'Voiceover Mic',
      icon: <Mic className="w-3.5 h-3.5" />,
      color: '#ec4899',
      visible: true,
      locked: false,
      muted: false,
    },
    {
      id: 'music',
      label: 'Background Music',
      icon: <Music className="w-3.5 h-3.5" />,
      color: '#10b981',
      visible: true,
      locked: false,
      muted: false,
    },
  ]);

  // Master timeline clips
  const [clips, setClips] = useState<MasterTimelineClip[]>(() => {
    return project?.timelineClips && project.timelineClips.length > 0
      ? project.timelineClips
      : [
          {
            id: 'tc_1',
            trackId: 'video',
            type: 'video',
            name: 'Intro Neon Scene',
            startTime: 0,
            duration: 4,
            color: '#38bdf8',
          },
          {
            id: 'tc_2',
            trackId: 'video',
            type: 'video',
            name: 'Cyber City Cut',
            startTime: 4,
            duration: 5,
            color: '#38bdf8',
          },
          {
            id: 'tc_3',
            trackId: 'overlay',
            type: 'photo',
            name: 'Logo Watermark',
            startTime: 1,
            duration: 6,
            color: '#a855f7',
          },
          {
            id: 'tc_4',
            trackId: 'subtitle',
            type: 'text',
            name: 'Headline Text',
            startTime: 0.5,
            duration: 3,
            color: '#facc15',
          },
          {
            id: 'tc_5',
            trackId: 'voiceover',
            type: 'audio',
            name: 'Voice Narration',
            startTime: 1,
            duration: 4.5,
            color: '#ec4899',
          },
          {
            id: 'tc_6',
            trackId: 'music',
            type: 'audio',
            name: 'Synthwave Soundtrack',
            startTime: 0,
            duration: 12,
            color: '#10b981',
          },
        ];
  });

  // Calculate timeline max length
  const maxTimelineDuration = Math.max(
    15,
    ...clips.map((c) => c.startTime + c.duration + 2)
  );

  // Playback animation frame loop
  useEffect(() => {
    let animId: any;
    let lastTimestamp = performance.now();

    const loop = (timestamp: number) => {
      const dt = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      if (isPlaying) {
        setCurrentTime((prev) => {
          const next = prev + dt;
          if (next >= maxTimelineDuration) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, maxTimelineDuration]);

  // Sync back to parent
  useEffect(() => {
    onUpdateTimeline(clips);
  }, [clips, onUpdateTimeline]);

  // Track toggles
  const toggleTrackVisibility = (trackId: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, visible: !t.visible } : t))
    );
  };

  const toggleTrackLock = (trackId: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, locked: !t.locked } : t))
    );
  };

  const toggleTrackMute = (trackId: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, muted: !t.muted } : t))
    );
  };

  // Add sample clip to a track
  const handleAddClipToTrack = (trackId: 'video' | 'overlay' | 'subtitle' | 'voiceover' | 'music') => {
    const track = tracks.find((t) => t.id === trackId);
    if (!track || track.locked) return;

    const newClip: MasterTimelineClip = {
      id: 'tc_' + Math.random().toString(36).substring(2, 8),
      trackId,
      type: trackId === 'video' ? 'video' : trackId === 'overlay' ? 'photo' : trackId === 'subtitle' ? 'text' : 'audio',
      name: `New ${track.label} Clip`,
      startTime: Math.round(currentTime * 10) / 10,
      duration: 3,
      color: track.color,
    };
    setClips([...clips, newClip]);
    setSelectedClipId(newClip.id);
  };

  // Delete selected clip
  const handleDeleteSelected = () => {
    if (!selectedClipId) return;
    setClips(clips.filter((c) => c.id !== selectedClipId));
    setSelectedClipId(null);
  };

  // Selected clip object
  const selectedClip = clips.find((c) => c.id === selectedClipId);

  // Generate ruler markers
  const rulerMarkers = [];
  for (let s = 0; s <= maxTimelineDuration; s += 1) {
    rulerMarkers.push(s);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#07070d] text-slate-200 select-none overflow-hidden">
      {/* Top Playback Toolbar */}
      <div className="h-14 border-b border-purple-900/40 px-4 flex items-center justify-between bg-[#0b0b18] gap-2">
        <div className="flex items-center gap-3">
          {/* Play/Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg shadow-purple-900/50 transition-all cursor-pointer"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentTime(0);
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
            title="Rewind to start"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Timecode Readout */}
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-purple-900/40 font-mono text-xs font-bold text-cyan-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            <span>
              {new Date(currentTime * 1000).toISOString().substr(14, 5)}:
              {Math.floor((currentTime % 1) * 100).toString().padStart(2, '0')}
            </span>
          </div>

          <div className="h-4 w-[1px] bg-purple-900/40 mx-1 hidden sm:block" />

          {/* Autosave status indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Autosave Active
          </div>
        </div>

        {/* Selected Clip Operations */}
        {selectedClip && (
          <div className="hidden md:flex items-center gap-2 bg-[#121224] px-3 py-1 rounded-xl border border-purple-500/30 text-xs">
            <span className="font-bold text-white truncate max-w-[120px]">{selectedClip.name}</span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400">Start:</span>
              <input
                type="number"
                step="0.1"
                min="0"
                value={selectedClip.startTime}
                onChange={(e) => {
                  const val = Math.max(0, parseFloat(e.target.value) || 0);
                  setClips((prev) =>
                    prev.map((c) => (c.id === selectedClip.id ? { ...c, startTime: val } : c))
                  );
                }}
                className="w-14 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-white font-mono text-[11px]"
              />
              <span className="text-[10px] text-slate-400">Dur:</span>
              <input
                type="number"
                step="0.1"
                min="0.5"
                value={selectedClip.duration}
                onChange={(e) => {
                  const val = Math.max(0.5, parseFloat(e.target.value) || 1);
                  setClips((prev) =>
                    prev.map((c) => (c.id === selectedClip.id ? { ...c, duration: val } : c))
                  );
                }}
                className="w-14 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-white font-mono text-[11px]"
              />
            </div>
            <button
              onClick={handleDeleteSelected}
              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/40"
              title="Delete clip"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoomLevel((z) => Math.max(15, z - 10))}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            title="Zoom out timeline"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="font-mono text-xs text-slate-400 w-10 text-center">{zoomLevel}px</span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(100, z + 10))}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            title="Zoom in timeline"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Multi-Track NLE Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Track Headers Column */}
        <div className="w-44 sm:w-56 bg-[#0a0a14] border-r border-purple-900/30 flex flex-col flex-shrink-0 z-20 shadow-xl">
          {/* Top ruler placeholder */}
          <div className="h-8 border-b border-purple-900/30 px-3 flex items-center text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Tracks
          </div>

          {/* Track Header rows */}
          <div className="flex-1 overflow-y-hidden">
            {tracks.map((track) => (
              <div
                key={track.id}
                className="h-16 border-b border-purple-900/20 px-3 flex items-center justify-between bg-[#0e0e1c] hover:bg-[#121224] transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span style={{ color: track.color }}>{track.icon}</span>
                  <span className="text-xs font-semibold text-slate-200 truncate">
                    {track.label}
                  </span>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Visibility */}
                  <button
                    onClick={() => toggleTrackVisibility(track.id)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    {track.visible ? (
                      <Eye className="w-3.5 h-3.5 text-purple-400" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-slate-600" />
                    )}
                  </button>

                  {/* Lock */}
                  <button
                    onClick={() => toggleTrackLock(track.id)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    {track.locked ? (
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5 text-slate-600" />
                    )}
                  </button>

                  {/* Add Clip button */}
                  <button
                    onClick={() => handleAddClipToTrack(track.id)}
                    disabled={track.locked}
                    className="p-1 text-cyan-400 hover:text-cyan-300 disabled:opacity-30"
                    title="Add clip to track"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Scrollable Timeline Canvas */}
        <div className="flex-1 flex flex-col overflow-x-auto overflow-y-hidden relative bg-[#06060c]">
          {/* Top Seconds Time Ruler */}
          <div
            className="h-8 border-b border-purple-900/30 flex items-center relative bg-[#090914]"
            style={{ width: `${maxTimelineDuration * zoomLevel}px` }}
          >
            {rulerMarkers.map((sec) => (
              <div
                key={sec}
                className="absolute top-0 bottom-0 border-l border-purple-900/30 pl-1 text-[9px] font-mono text-slate-400"
                style={{ left: `${sec * zoomLevel}px` }}
              >
                {sec % 2 === 0 ? `${sec}s` : ''}
              </div>
            ))}
          </div>

          {/* Timeline Multi-Track Rows */}
          <div
            className="flex-1 relative"
            style={{ width: `${maxTimelineDuration * zoomLevel}px` }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const newTime = Math.max(0, clickX / zoomLevel);
              setCurrentTime(newTime);
            }}
          >
            {/* Playhead Red Needle */}
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-cyan-400 z-30 pointer-events-none shadow-lg shadow-cyan-400/80"
              style={{ left: `${currentTime * zoomLevel}px` }}
            >
              <div className="w-3 h-3 bg-cyan-400 rotate-45 -ml-[5px] -mt-1 shadow-md shadow-cyan-400" />
            </div>

            {/* Track Lanes */}
            {tracks.map((track) => {
              const trackClips = clips.filter((c) => c.trackId === track.id);
              return (
                <div
                  key={track.id}
                  className={`h-16 border-b border-purple-900/20 relative transition-opacity ${
                    track.visible ? 'opacity-100' : 'opacity-25'
                  }`}
                  style={{
                    backgroundImage:
                      'linear-gradient(to right, rgba(147, 51, 234, 0.05) 1px, transparent 1px)',
                    backgroundSize: `${zoomLevel}px 100%`,
                  }}
                >
                  {/* Clip Blocks on lane */}
                  {trackClips.map((clip) => {
                    const isSelected = selectedClipId === clip.id;
                    const clipWidth = clip.duration * zoomLevel;
                    const clipLeft = clip.startTime * zoomLevel;

                    return (
                      <div
                        key={clip.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClipId(clip.id);
                        }}
                        className={`absolute top-2 bottom-2 rounded-lg px-2 flex items-center justify-between text-xs font-bold cursor-pointer transition-all border shadow-md select-none overflow-hidden ${
                          isSelected
                            ? 'ring-2 ring-white border-white scale-[1.01] z-20'
                            : 'border-white/20 hover:border-white/60 z-10'
                        }`}
                        style={{
                          left: `${clipLeft}px`,
                          width: `${Math.max(40, clipWidth)}px`,
                          backgroundColor: `${clip.color}33`,
                          borderColor: clip.color,
                        }}
                      >
                        <span className="truncate text-white text-[11px] drop-shadow">
                          {clip.name}
                        </span>
                        <span className="font-mono text-[9px] text-slate-300 ml-1">
                          {clip.duration.toFixed(1)}s
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
