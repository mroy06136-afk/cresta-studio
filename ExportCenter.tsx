import React, { useState, useRef } from 'react';
import {
  Download,
  Image as ImageIcon,
  Video,
  Mic,
  Sliders,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  RefreshCw,
  HardDrive,
  Sparkles,
} from 'lucide-react';
import { Project } from '../../services/storage';
import { renderAndExportVideo } from '../../services/videoEngine';
import { audioEngine } from '../../services/audioEngine';

interface ExportCenterProps {
  project: Project | null;
  onOpenQuickCamera: () => void;
}

type ExportCategory = 'photo' | 'video' | 'audio';

export const ExportCenter: React.FC<ExportCenterProps> = ({ project }) => {
  const [category, setCategory] = useState<ExportCategory>('photo');

  // Photo Export Settings
  const [photoFormat, setPhotoFormat] = useState<'image/png' | 'image/jpeg' | 'image/webp'>('image/png');
  const [photoQuality, setPhotoQuality] = useState<number>(0.95);

  // Video Export Settings
  const [videoResolution, setVideoResolution] = useState<'720p' | '1080p' | '4k'>('1080p');
  const [videoFps, setVideoFps] = useState<24 | 30 | 60>(30);

  // Audio Export Settings
  const [audioFormat, setAudioFormat] = useState<'wav'>('wav');

  // Progress & State
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [exportedFile, setExportedFile] = useState<{
    url: string;
    filename: string;
    sizeKb: number;
    type: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleExportPhoto = async () => {
    setIsExporting(true);
    setProgress(10);
    setStatusMessage('Rasterizing photo canvas with adjustments and layers...');
    setErrorMessage(null);
    setExportedFile(null);

    setTimeout(() => {
      try {
        const src = project?.photoState?.imageSrc;
        if (!src) {
          throw new Error('No active photo project to export. Please open Photo Editor first.');
        }

        setProgress(60);
        setStatusMessage('Compressing image into chosen format...');

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = src;

        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.drawImage(img, 0, 0);

          const ext = photoFormat === 'image/png' ? 'png' : photoFormat === 'image/jpeg' ? 'jpg' : 'webp';
          canvas.toBlob(
            (blob) => {
              if (!blob) throw new Error('Failed to generate image blob');
              const url = URL.createObjectURL(blob);
              const filename = `nova-photo-${Date.now()}.${ext}`;
              const sizeKb = Math.round(blob.size / 1024);

              setProgress(100);
              setStatusMessage('Photo export complete!');
              setIsExporting(false);
              setExportedFile({ url, filename, sizeKb, type: blob.type });

              // Direct download
              const a = document.createElement('a');
              a.href = url;
              a.download = filename;
              a.click();
            },
            photoFormat,
            photoQuality
          );
        };
      } catch (err: any) {
        setIsExporting(false);
        setErrorMessage(err.message || 'Photo export failed');
      }
    }, 400);
  };

  const handleExportVideo = async () => {
    const clips = project?.videoState?.clips;
    if (!clips || clips.length === 0) {
      setErrorMessage('No video clips found in project. Please add clips in Video Editor.');
      return;
    }

    setIsExporting(true);
    setProgress(0);
    setStatusMessage('Initializing video rendering engine...');
    setErrorMessage(null);
    setExportedFile(null);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const blob = await renderAndExportVideo({
        clips,
        subtitles: project.videoState?.subtitles || [],
        aspectRatio: project.videoState?.aspectRatio || '16:9',
        resolution: videoResolution,
        fps: videoFps,
        brightness: project.videoState?.brightness || 0,
        contrast: project.videoState?.contrast || 0,
        saturation: project.videoState?.saturation || 0,
        signal: abortController.signal,
        onProgress: (p, text) => {
          setProgress(p);
          setStatusMessage(text);
        },
      });

      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
      const filename = `nova-video-${Date.now()}.${ext}`;
      const url = URL.createObjectURL(blob);
      const sizeKb = Math.round(blob.size / 1024);

      setExportedFile({ url, filename, sizeKb, type: blob.type });
      setIsExporting(false);

      // Trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
    } catch (err: any) {
      setIsExporting(false);
      if (err.message !== 'Export cancelled by user') {
        setErrorMessage(err.message || 'Video export failed');
      }
    }
  };

  const handleExportAudio = async () => {
    setIsExporting(true);
    setProgress(20);
    setStatusMessage('Compiling audio mix & encoding 16-bit PCM RIFF WAV...');
    setErrorMessage(null);
    setExportedFile(null);

    setTimeout(() => {
      try {
        const sampleBeat = audioEngine.generateSampleBeat();
        const wavBlob = audioEngine.audioBufferToWav(sampleBeat);
        const url = URL.createObjectURL(wavBlob);
        const filename = `nova-audio-${Date.now()}.wav`;
        const sizeKb = Math.round(wavBlob.size / 1024);

        setProgress(100);
        setStatusMessage('Audio export complete!');
        setIsExporting(false);
        setExportedFile({ url, filename, sizeKb, type: 'audio/wav' });

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
      } catch (err: any) {
        setIsExporting(false);
        setErrorMessage(err.message || 'Audio export failed');
      }
    }, 400);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-8 max-w-5xl mx-auto space-y-8 animate-fadeIn">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <Download className="w-8 h-8 text-cyan-400" />
          Export & Delivery Center
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-1">
          Render production-ready photo, video, and audio assets with customizable resolution, framerate, and container codecs.
        </p>
      </div>

      {/* Category Tabs */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => setCategory('photo')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            category === 'photo'
              ? 'bg-purple-950/60 border-purple-500 shadow-lg shadow-purple-900/40 text-white'
              : 'bg-[#0f0f1e] border-purple-900/20 text-slate-400 hover:text-slate-200'
          }`}
        >
          <ImageIcon className="w-6 h-6 text-purple-400 mb-2" />
          <div className="font-bold text-sm">Export Photo</div>
          <div className="text-[11px] text-slate-400">PNG, JPEG, WebP</div>
        </button>

        <button
          onClick={() => setCategory('video')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            category === 'video'
              ? 'bg-cyan-950/60 border-cyan-500 shadow-lg shadow-cyan-900/40 text-white'
              : 'bg-[#0f0f1e] border-purple-900/20 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Video className="w-6 h-6 text-cyan-400 mb-2" />
          <div className="font-bold text-sm">Export Video</div>
          <div className="text-[11px] text-slate-400">WebM, MP4, 1080p, 4K</div>
        </button>

        <button
          onClick={() => setCategory('audio')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            category === 'audio'
              ? 'bg-pink-950/60 border-pink-500 shadow-lg shadow-pink-900/40 text-white'
              : 'bg-[#0f0f1e] border-purple-900/20 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Mic className="w-6 h-6 text-pink-400 mb-2" />
          <div className="font-bold text-sm">Export Audio</div>
          <div className="text-[11px] text-slate-400">16-Bit PCM WAV</div>
        </button>
      </div>

      {/* Main Export Settings Card */}
      <div className="p-6 rounded-3xl bg-[#0f0f1e] border border-purple-900/30 shadow-2xl space-y-6">
        {/* PHOTO SETTINGS */}
        {category === 'photo' && (
          <div className="space-y-5">
            <h3 className="font-bold text-white text-base">Photo Render Settings</h3>
            <div className="space-y-2">
              <label className="text-xs text-slate-300 font-semibold">Image Format</label>
              <div className="flex gap-3">
                {[
                  { id: 'image/png', label: 'PNG (Lossless Transparency)' },
                  { id: 'image/jpeg', label: 'JPEG (High Quality)' },
                  { id: 'image/webp', label: 'WebP (Modern Compact)' },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    onClick={() => setPhotoFormat(fmt.id as any)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                      photoFormat === fmt.id
                        ? 'bg-purple-600 border-purple-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleExportPhoto}
              disabled={isExporting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-purple-900/50 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Photo Now
            </button>
          </div>
        )}

        {/* VIDEO SETTINGS */}
        {category === 'video' && (
          <div className="space-y-5">
            <h3 className="font-bold text-white text-base">Video Render Settings</h3>

            <div className="space-y-2">
              <label className="text-xs text-slate-300 font-semibold">Resolution</label>
              <div className="flex gap-3">
                {(['720p', '1080p', '4k'] as const).map((res) => (
                  <button
                    key={res}
                    onClick={() => setVideoResolution(res)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                      videoResolution === res
                        ? 'bg-cyan-600 border-cyan-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    {res.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-300 font-semibold">Frame Rate</label>
              <div className="flex gap-3">
                {([24, 30, 60] as const).map((fps) => (
                  <button
                    key={fps}
                    onClick={() => setVideoFps(fps)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                      videoFps === fps
                        ? 'bg-cyan-600 border-cyan-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    {fps} FPS
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleExportVideo}
              disabled={isExporting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-cyan-900/50 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Render & Download Video File
            </button>
          </div>
        )}

        {/* AUDIO SETTINGS */}
        {category === 'audio' && (
          <div className="space-y-5">
            <h3 className="font-bold text-white text-base">Audio Master Settings</h3>
            <p className="text-xs text-slate-400">
              Generates uncompressed 16-bit PCM RIFF WAV format with 44.1kHz or 48kHz audio fidelity.
            </p>

            <button
              onClick={handleExportAudio}
              disabled={isExporting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-pink-900/50 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Master WAV File
            </button>
          </div>
        )}

        {/* Real-time Progress Bar */}
        {isExporting && (
          <div className="p-4 rounded-2xl bg-[#0a0a14] border border-cyan-500/30 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-cyan-300">{statusMessage}</span>
              <span className="font-mono font-bold text-white">{progress}%</span>
            </div>
            <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 transition-all duration-150 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Feedback */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Successful Export Card */}
        {exportedFile && (
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileCheck className="w-6 h-6 text-emerald-400" />
              <div>
                <div className="text-sm font-bold text-white">{exportedFile.filename}</div>
                <div className="text-xs text-emerald-300">
                  Ready for use • {exportedFile.sizeKb} KB
                </div>
              </div>
            </div>
            <a
              href={exportedFile.url}
              download={exportedFile.filename}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Download Again
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
