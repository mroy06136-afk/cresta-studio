import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Scissors,
  Copy,
  Trash2,
  Volume2,
  VolumeX,
  FastForward,
  Sparkles,
  Sliders,
  Type,
  Download,
  Plus,
  RefreshCw,
  Maximize,
  Layers,
  CheckCircle2,
  AlertCircle,
  Video as VideoIcon,
  Music,
} from 'lucide-react';
import { VideoClip, SubtitleCue, VideoProjectState, Project } from '../../services/storage';
import {
  createSampleVideoBlob,
  renderAndExportVideo,
  getResolutionDimensions,
} from '../../services/videoEngine';

interface VideoEditorProps {
  project: Project | null;
  onUpdateProjectState: (state: VideoProjectState) => void;
  onOpenQuickCamera: () => void;
}

export const VideoEditor: React.FC<VideoEditorProps> = ({
  project,
  onUpdateProjectState,
  onOpenQuickCamera,
}) => {
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);
  const canvasPreviewRef = useRef<HTMLCanvasElement | null>(null);

  // Clips sequence
  const [clips, setClips] = useState<VideoClip[]>(() => {
    return project?.videoState?.clips && project.videoState.clips.length > 0
      ? project.videoState.clips
      : [];
  });
  const [activeClipIndex, setActiveClipIndex] = useState<number>(0);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  // Project Settings
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>(() => {
    return project?.videoState?.aspectRatio || '16:9';
  });
  const [brightness, setBrightness] = useState<number>(project?.videoState?.brightness || 0);
  const [contrast, setContrast] = useState<number>(project?.videoState?.contrast || 0);
  const [saturation, setSaturation] = useState<number>(project?.videoState?.saturation || 0);
  const [warmth, setWarmth] = useState<number>(project?.videoState?.warmth || 0);

  // Subtitles
  const [subtitles, setSubtitles] = useState<SubtitleCue[]>(() => {
    return project?.videoState?.subtitles || [];
  });
  const [newSubText, setNewSubText] = useState<string>('');

  // Audio / Music track
  const [audioVolume, setAudioVolume] = useState<number>(project?.videoState?.audioTrackVolume ?? 1);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Export Modal state
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportStatusText, setExportStatusText] = useState<string>('');
  const [exportResolution, setExportResolution] = useState<'720p' | '1080p' | '4k'>('1080p');
  const [exportFps, setExportFps] = useState<24 | 30 | 60>(30);
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Current active clip
  const currentClip = clips[activeClipIndex] || null;

  // Sync to parent project
  const notifyParent = useCallback(() => {
    onUpdateProjectState({
      clips,
      subtitles,
      aspectRatio,
      duration,
      currentTime,
      audioTrackVolume: audioVolume,
      brightness,
      contrast,
      saturation,
      warmth,
    });
  }, [
    clips,
    subtitles,
    aspectRatio,
    duration,
    currentTime,
    audioVolume,
    brightness,
    contrast,
    saturation,
    warmth,
    onUpdateProjectState,
  ]);

  useEffect(() => {
    notifyParent();
  }, [notifyParent]);

  // Recalculate total sequence duration
  useEffect(() => {
    const total = clips.reduce((acc, c) => acc + (c.trimOut - c.trimIn) / (c.speed || 1), 0);
    setDuration(total);
  }, [clips]);

  // Load sample demo clips if none exist
  useEffect(() => {
    if (clips.length === 0) {
      loadInitialSampleClips();
    }
  }, []);

  const loadInitialSampleClips = async () => {
    try {
      const url1 = await createSampleVideoBlob('intro', 3);
      const url2 = await createSampleVideoBlob('landscape', 4);
      const initialClips: VideoClip[] = [
        {
          id: 'clip_' + Math.random().toString(36).substring(2, 7),
          name: 'Cyber Intro Sequence',
          src: url1,
          duration: 3,
          startTime: 0,
          trimIn: 0,
          trimOut: 3,
          speed: 1,
          volume: 1,
          muted: false,
          filter: 'normal',
          transition: 'glitch',
          trackIndex: 0,
        },
        {
          id: 'clip_' + Math.random().toString(36).substring(2, 7),
          name: 'Neon Horizon Sunset',
          src: url2,
          duration: 4,
          startTime: 3,
          trimIn: 0,
          trimOut: 4,
          speed: 1,
          volume: 1,
          muted: false,
          filter: 'normal',
          transition: 'fade',
          trackIndex: 0,
        },
      ];
      setClips(initialClips);
      setSelectedClipId(initialClips[0].id);

      setSubtitles([
        { id: 'sub_1', start: 0.5, end: 2.5, text: 'Welcome to NOVA Studio AI' },
        { id: 'sub_2', start: 3.2, end: 6.5, text: 'Real-time multi-track video processing' },
      ]);
    } catch (err) {
      console.error('Error loading sample clips:', err);
    }
  };

  // Play / Pause video sequence
  const togglePlay = () => {
    const player = videoPlayerRef.current;
    if (!player) return;
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play().catch((err) => console.warn(err));
      setIsPlaying(true);
    }
  };

  // Handle player time update
  const handleTimeUpdate = () => {
    const player = videoPlayerRef.current;
    if (!player || !currentClip) return;

    // Check if past current clip trimOut
    if (player.currentTime >= currentClip.trimOut) {
      if (activeClipIndex < clips.length - 1) {
        // Next clip in sequence
        const nextIdx = activeClipIndex + 1;
        setActiveClipIndex(nextIdx);
        const nextClip = clips[nextIdx];
        player.src = nextClip.src;
        player.currentTime = nextClip.trimIn;
        player.playbackRate = nextClip.speed || 1;
        if (isPlaying) player.play();
      } else {
        // Loop back to start
        setActiveClipIndex(0);
        const first = clips[0];
        player.src = first.src;
        player.currentTime = first.trimIn;
        player.playbackRate = first.speed || 1;
        if (isPlaying) player.play();
      }
    }

    // Calculate global timeline time
    let accumulated = 0;
    for (let i = 0; i < activeClipIndex; i++) {
      accumulated += (clips[i].trimOut - clips[i].trimIn) / (clips[i].speed || 1);
    }
    const clipOffset = (player.currentTime - currentClip.trimIn) / (currentClip.speed || 1);
    setCurrentTime(Math.max(0, accumulated + clipOffset));
  };

  // Switch active clip in player
  const selectClip = (index: number) => {
    const clip = clips[index];
    if (!clip) return;
    setActiveClipIndex(index);
    setSelectedClipId(clip.id);
    const player = videoPlayerRef.current;
    if (player) {
      player.src = clip.src;
      player.currentTime = clip.trimIn;
      player.playbackRate = clip.speed || 1;
      player.volume = isMuted ? 0 : clip.volume * audioVolume;
      if (isPlaying) player.play();
    }
  };

  // Add video clip from local file
  const handleAddVideoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const tempVideo = document.createElement('video');
    tempVideo.src = url;
    tempVideo.onloadedmetadata = () => {
      const dur = tempVideo.duration || 5;
      const newClip: VideoClip = {
        id: 'clip_' + Math.random().toString(36).substring(2, 8),
        name: file.name.replace(/\.[^/.]+$/, ''),
        src: url,
        duration: dur,
        startTime: duration,
        trimIn: 0,
        trimOut: dur,
        speed: 1,
        volume: 1,
        muted: false,
        filter: 'normal',
        transition: 'none',
        trackIndex: 0,
      };
      setClips([...clips, newClip]);
      setSelectedClipId(newClip.id);
    };
    e.target.value = '';
  };

  // Split clip at current playhead
  const handleSplitClip = () => {
    const player = videoPlayerRef.current;
    if (!player || !currentClip) return;
    const splitPoint = player.currentTime;
    if (splitPoint <= currentClip.trimIn + 0.3 || splitPoint >= currentClip.trimOut - 0.3) {
      return; // Too close to edge
    }

    const firstHalf: VideoClip = {
      ...currentClip,
      trimOut: splitPoint,
    };
    const secondHalf: VideoClip = {
      ...currentClip,
      id: 'clip_' + Math.random().toString(36).substring(2, 8),
      name: `${currentClip.name} (Part 2)`,
      trimIn: splitPoint,
    };

    const newClips = [...clips];
    newClips.splice(activeClipIndex, 1, firstHalf, secondHalf);
    setClips(newClips);
  };

  // Duplicate clip
  const handleDuplicateClip = () => {
    if (!currentClip) return;
    const dup: VideoClip = {
      ...currentClip,
      id: 'clip_' + Math.random().toString(36).substring(2, 8),
      name: `${currentClip.name} (Copy)`,
    };
    const newClips = [...clips];
    newClips.splice(activeClipIndex + 1, 0, dup);
    setClips(newClips);
  };

  // Delete clip
  const handleDeleteClip = () => {
    if (clips.length <= 1) return;
    const newClips = clips.filter((_, idx) => idx !== activeClipIndex);
    setClips(newClips);
    const newIdx = Math.max(0, activeClipIndex - 1);
    selectClip(newIdx);
  };

  // Speed change
  const handleSpeedChange = (speed: number) => {
    if (!currentClip) return;
    const updated = clips.map((c, i) => (i === activeClipIndex ? { ...c, speed } : c));
    setClips(updated);
    if (videoPlayerRef.current) {
      videoPlayerRef.current.playbackRate = speed;
    }
  };

  // Add subtitle
  const handleAddSubtitle = () => {
    if (!newSubText.trim()) return;
    const newSub: SubtitleCue = {
      id: 'sub_' + Math.random().toString(36).substring(2, 7),
      start: Math.max(0, currentTime),
      end: currentTime + 3,
      text: newSubText.trim(),
    };
    setSubtitles([...subtitles, newSub]);
    setNewSubText('');
  };

  // Real Export Video Execution
  const handleStartExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    setExportStatusText('Preparing video rendering pipeline...');
    setExportedVideoUrl(null);
    setExportError(null);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const blob = await renderAndExportVideo({
        clips,
        subtitles,
        aspectRatio,
        resolution: exportResolution,
        fps: exportFps,
        brightness,
        contrast,
        saturation,
        signal: abortController.signal,
        onProgress: (percent, statusText) => {
          setExportProgress(percent);
          setExportStatusText(statusText);
        },
      });

      const url = URL.createObjectURL(blob);
      setExportedVideoUrl(url);

      // Auto trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `nova-video-${Date.now()}.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`;
      a.click();
    } catch (err: any) {
      if (err.message !== 'Export cancelled by user') {
        console.error('Export failed:', err);
        setExportError(err.message || 'Failed to export video');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleCancelExport = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsExporting(false);
      setExportStatusText('Export cancelled');
    }
  };

  // Find active subtitle for current time
  const activeSubtitle = subtitles.find((s) => currentTime >= s.start && currentTime <= s.end);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#07070d] text-slate-200 overflow-hidden">
      {/* Top Controls Bar */}
      <div className="h-12 border-b border-purple-900/30 px-4 flex items-center justify-between bg-[#0b0b16] gap-2">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-bold text-cyan-300 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-cyan-500/30">
            {new Date(currentTime * 1000).toISOString().substr(14, 5)} /{' '}
            {new Date(duration * 1000).toISOString().substr(14, 5)}
          </span>

          {/* Aspect Ratio Switch */}
          <div className="flex items-center rounded-lg bg-slate-900/80 p-0.5 border border-purple-900/40 text-xs">
            {(['16:9', '9:16', '1:1'] as const).map((ratio) => (
              <button
                key={ratio}
                onClick={() => setAspectRatio(ratio)}
                className={`px-2 py-0.5 rounded font-semibold transition-all ${
                  aspectRatio === ratio
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {ratio}
              </button>
            ))}
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          <label className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer flex items-center gap-1.5 transition-colors">
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            Add Video File
            <input type="file" accept="video/*" onChange={handleAddVideoFile} className="hidden" />
          </label>
          <button
            onClick={onOpenQuickCamera}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            title="Record video with camera"
          >
            <VideoIcon className="w-4 h-4 text-purple-400" />
          </button>
          <div className="h-4 w-[1px] bg-purple-900/40 mx-1" />
          <button
            onClick={() => handleStartExport()}
            className="px-3.5 py-1 rounded-lg bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-cyan-900/40 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Render & Export Video
          </button>
        </div>
      </div>

      {/* Main Video Viewport & Properties */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Central Video Player Viewport */}
        <div className="flex-1 relative bg-[#090912] flex items-center justify-center p-4 overflow-hidden">
          <div
            className={`relative rounded-xl overflow-hidden shadow-2xl border border-purple-900/40 bg-black flex items-center justify-center transition-all ${
              aspectRatio === '16:9'
                ? 'w-full max-w-4xl aspect-video'
                : aspectRatio === '9:16'
                ? 'h-full max-h-[70vh] aspect-[9/16]'
                : 'h-full max-h-[70vh] aspect-square'
            }`}
          >
            {/* HTML5 Video Player */}
            <video
              ref={videoPlayerRef}
              src={currentClip?.src}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => {
                if (activeClipIndex < clips.length - 1) {
                  selectClip(activeClipIndex + 1);
                }
              }}
              playsInline
              className="w-full h-full object-cover"
              style={{
                filter: `brightness(${100 + brightness}%) contrast(${100 + contrast}%) saturate(${
                  100 + saturation
                }%)`,
              }}
            />

            {/* Subtitle Overlay Badge */}
            {activeSubtitle && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 max-w-[85%] px-4 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-purple-500/40 text-white font-bold text-center text-sm shadow-xl pointer-events-none">
                {activeSubtitle.text}
              </div>
            )}

            {/* Play / Pause Big Center Button Overlay */}
            <button
              onClick={togglePlay}
              className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-purple-600/60 hover:bg-purple-600/90 text-white flex items-center justify-center backdrop-blur-sm shadow-2xl transition-all opacity-0 hover:opacity-100 focus:opacity-100"
            >
              {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
            </button>
          </div>
        </div>

        {/* Right Settings & Color Grading Drawer */}
        <div className="w-full lg:w-80 bg-[#0c0c18] border-t lg:border-t-0 lg:border-l border-purple-900/30 p-4 space-y-5 overflow-y-auto">
          {/* Clip Tools */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              Active Clip Settings
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleSplitClip}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold flex flex-col items-center gap-1 border border-slate-700 text-slate-200"
                title="Split clip at playhead"
              >
                <Scissors className="w-4 h-4 text-cyan-400" />
                Split Clip
              </button>
              <button
                onClick={handleDuplicateClip}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold flex flex-col items-center gap-1 border border-slate-700 text-slate-200"
                title="Duplicate clip"
              >
                <Copy className="w-4 h-4 text-purple-400" />
                Duplicate
              </button>
              <button
                onClick={handleDeleteClip}
                disabled={clips.length <= 1}
                className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-xs font-semibold flex flex-col items-center gap-1 border border-slate-700 text-rose-300 disabled:opacity-30"
                title="Delete clip"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                Delete
              </button>
            </div>
          </div>

          {/* Speed Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
              <span className="flex items-center gap-1">
                <FastForward className="w-3.5 h-3.5 text-cyan-400" />
                Speed Multiplier
              </span>
              <span className="text-cyan-300 font-mono">{currentClip?.speed || 1}x</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[0.5, 1.0, 1.5, 2.0].map((s) => (
                <button
                  key={s}
                  onClick={() => handleSpeedChange(s)}
                  className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    currentClip?.speed === s
                      ? 'bg-cyan-600 border-cyan-400 text-white'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Video Color Grading */}
          <div className="space-y-3 pt-2 border-t border-purple-900/30">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
              Color Grading & LUT
            </span>
            {[
              { label: 'Brightness', val: brightness, set: setBrightness },
              { label: 'Contrast', val: contrast, set: setContrast },
              { label: 'Saturation', val: saturation, set: setSaturation },
            ].map(({ label, val, set }) => (
              <div key={label} className="space-y-1">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>{label}</span>
                  <span className="font-mono text-purple-300">{val}</span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="60"
                  value={val}
                  onChange={(e) => set(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            ))}
          </div>

          {/* Subtitles Manager */}
          <div className="space-y-3 pt-2 border-t border-purple-900/30">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              Subtitle Overlays ({subtitles.length})
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type subtitle line..."
                value={newSubText}
                onChange={(e) => setNewSubText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSubtitle()}
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleAddSubtitle}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold"
              >
                Add
              </button>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {subtitles.map((sub) => (
                <div
                  key={sub.id}
                  className="p-2 rounded-lg bg-[#121224] border border-purple-900/20 flex items-center justify-between text-xs"
                >
                  <div className="truncate flex-1 pr-2">
                    <span className="font-mono text-[10px] text-purple-300 mr-2">
                      {sub.start.toFixed(1)}s
                    </span>
                    <span className="text-slate-200">{sub.text}</span>
                  </div>
                  <button
                    onClick={() => setSubtitles(subtitles.filter((s) => s.id !== sub.id))}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Timeline Clips Strip */}
      <div className="h-44 bg-[#0a0a16] border-t border-purple-900/40 p-3 flex flex-col justify-between">
        {/* Scrubbing & Controls */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-900/50 transition-all"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex-1 flex items-center gap-3">
            <input
              type="range"
              min="0"
              max={duration || 1}
              step="0.05"
              value={currentTime}
              onChange={(e) => {
                const targetTime = parseFloat(e.target.value);
                setCurrentTime(targetTime);
                // Seek player
                let acc = 0;
                for (let i = 0; i < clips.length; i++) {
                  const clipDur = (clips[i].trimOut - clips[i].trimIn) / (clips[i].speed || 1);
                  if (targetTime >= acc && targetTime <= acc + clipDur) {
                    if (activeClipIndex !== i) selectClip(i);
                    if (videoPlayerRef.current) {
                      videoPlayerRef.current.currentTime =
                        clips[i].trimIn + (targetTime - acc) * (clips[i].speed || 1);
                    }
                    break;
                  }
                  acc += clipDur;
                }
              }}
              className="w-full"
            />
          </div>
        </div>

        {/* Video Track Clip Cards */}
        <div className="flex items-center gap-2 overflow-x-auto py-2 scrollbar-none">
          {clips.map((clip, index) => {
            const isSelected = index === activeClipIndex;
            const clipDur = (clip.trimOut - clip.trimIn) / (clip.speed || 1);
            return (
              <div
                key={clip.id}
                onClick={() => selectClip(index)}
                className={`flex-shrink-0 h-20 w-48 rounded-xl border p-2 flex flex-col justify-between cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-purple-950/60 border-purple-500 shadow-lg shadow-purple-900/50'
                    : 'bg-[#111124] border-purple-900/30 hover:border-purple-500/50 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200 truncate pr-1">{clip.name}</span>
                  <span className="font-mono text-[10px] text-cyan-300">{clipDur.toFixed(1)}s</span>
                </div>

                {/* Clip Trim In & Out Slider Controls */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] text-slate-400">
                    <span>Trim: {clip.trimIn.toFixed(1)}s</span>
                    <span>{clip.trimOut.toFixed(1)}s</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full"
                      style={{
                        width: `${Math.min(100, (clipDur / (clip.duration || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Exporting Progress Modal */}
      {isExporting && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#101020] border border-cyan-500/40 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <VideoIcon className="w-5 h-5 text-cyan-400" />
                Rendering Video
              </h3>
              <span className="text-cyan-400 font-mono font-bold text-sm">{exportProgress}%</span>
            </div>

            {/* Neon Progress Bar */}
            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-cyan-900/40">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 transition-all duration-200 rounded-full shadow-lg shadow-cyan-500/50"
                style={{ width: `${exportProgress}%` }}
              />
            </div>

            <p className="text-xs text-slate-300 font-mono">{exportStatusText}</p>

            <button
              onClick={handleCancelExport}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-rose-950/50 border border-slate-700 text-rose-300 text-xs font-semibold"
            >
              Cancel Render
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
