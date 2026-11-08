import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Mic,
  Square,
  Play,
  Pause,
  Sliders,
  Scissors,
  Download,
  Volume2,
  VolumeX,
  Sparkles,
  RefreshCw,
  Layers,
  Wand2,
  CheckCircle2,
  AlertCircle,
  Radio,
  FileAudio,
} from 'lucide-react';
import { audioEngine } from '../../services/audioEngine';
import { AudioTrackItem, AudioProjectState, Project } from '../../services/storage';

interface AudioStudioProps {
  project: Project | null;
  onUpdateProjectState: (state: AudioProjectState) => void;
}

export const AudioStudio: React.FC<AudioStudioProps> = ({
  project,
  onUpdateProjectState,
}) => {
  const visualizerCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Recording State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const recordTimerRef = useRef<any>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<any>(null);

  // Playback & Tracks State
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackStopper, setPlaybackStopper] = useState<(() => void) | null>(null);

  // Trimming State
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(0);

  // 5-Band Equalizer
  const [eq, setEq] = useState<{
    bass: number;
    lowMid: number;
    mid: number;
    highMid: number;
    treble: number;
  }>({
    bass: 0,
    lowMid: 0,
    mid: 0,
    highMid: 0,
    treble: 0,
  });

  // Effects & Enhancers
  const [masterVolume, setMasterVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [noiseGate, setNoiseGate] = useState<boolean>(true);
  const [vocalEnhance, setVocalEnhance] = useState<boolean>(true);
  const [fadeInTime, setFadeInTime] = useState<number>(0.2);
  const [fadeOutTime, setFadeOutTime] = useState<number>(0.5);

  // Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sync to parent
  const notifyParent = useCallback(() => {
    onUpdateProjectState({
      tracks: [
        {
          id: 'audio_master_track',
          name: 'Master Audio Track',
          src: '',
          duration,
          startTime: 0,
          volume: masterVolume,
          muted: isMuted,
          pan: 0,
          eq,
          trimStart,
          trimEnd,
          fadeIn: fadeInTime,
          fadeOut: fadeOutTime,
          noiseGate,
          vocalEnhance,
          reverb: false,
        },
      ],
      masterVolume,
      bpm: 110,
      currentTime,
    });
  }, [
    duration,
    masterVolume,
    isMuted,
    eq,
    trimStart,
    trimEnd,
    fadeInTime,
    fadeOutTime,
    noiseGate,
    vocalEnhance,
    currentTime,
    onUpdateProjectState,
  ]);

  useEffect(() => {
    notifyParent();
  }, [notifyParent]);

  // Initial load: generate or decode sample audio beat so user can test immediately!
  useEffect(() => {
    try {
      const sample = audioEngine.generateSampleBeat();
      setAudioBuffer(sample);
      setDuration(sample.duration);
      setTrimStart(0);
      setTrimEnd(sample.duration);
    } catch (err) {
      console.warn('AudioContext init delayed:', err);
    }
  }, []);

  // Visualizer drawing loop
  useEffect(() => {
    const canvas = visualizerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderVisualizer = () => {
      animFrameRef.current = requestAnimationFrame(renderVisualizer);

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Gradient background
      const bg = ctx.createLinearGradient(0, 0, width, height);
      bg.addColorStop(0, '#0a0a16');
      bg.addColorStop(1, '#0f0f22');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      // Center reference line
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      if (analyserRef.current) {
        const bufferLength = analyserRef.current.frequencyBinCount;
        const timeData = new Uint8Array(bufferLength);
        analyserRef.current.getByteTimeDomainData(timeData);

        // Draw glowing neon waveform
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = isRecording ? '#ef4444' : '#38bdf8';
        ctx.shadowColor = isRecording ? '#ef4444' : '#a855f7';
        ctx.shadowBlur = 12;
        ctx.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = timeData[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();

        // Frequency Bars (bottom half)
        const freqData = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(freqData);

        const barWidth = (width / 64) - 2;
        for (let i = 0; i < 64; i++) {
          const barHeight = (freqData[i * 4] / 255) * (height / 2.5);
          const barX = i * (barWidth + 2);
          const barY = height - barHeight;

          const barGrad = ctx.createLinearGradient(0, barY, 0, height);
          barGrad.addColorStop(0, '#a855f7');
          barGrad.addColorStop(1, 'rgba(56, 189, 248, 0.2)');
          ctx.fillStyle = barGrad;
          ctx.fillRect(barX, barY, barWidth, barHeight);
        }
      } else {
        // Idle ambient waves
        const t = Date.now() / 800;
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x < width; x += 5) {
          const y = height / 2 + Math.sin(x * 0.02 + t) * 12 + Math.cos(x * 0.01 - t) * 8;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    };

    renderVisualizer();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isRecording]);

  // Start microphone recording
  const handleStartRecording = async () => {
    try {
      if (isPlaying) handleStopPlayback();
      const analyser = await audioEngine.startRecording();
      analyserRef.current = analyser;
      setIsRecording(true);
      setIsRecordingPaused(false);
      setRecordingSeconds(0);

      recordTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 0.1);
      }, 100);
      showToast('Recording microphone audio...');
    } catch (err) {
      console.error(err);
      showToast('Microphone access denied or unavailable');
    }
  };

  // Pause / Resume recording
  const handleTogglePauseRecording = () => {
    if (isRecordingPaused) {
      audioEngine.resumeRecording();
      setIsRecordingPaused(false);
    } else {
      audioEngine.pauseRecording();
      setIsRecordingPaused(true);
    }
  };

  // Stop recording and process buffer
  const handleStopRecording = async () => {
    if (!isRecording) return;
    clearInterval(recordTimerRef.current);
    setIsRecording(false);
    setIsRecordingPaused(false);

    try {
      const blob = await audioEngine.stopRecording();
      const buffer = await audioEngine.decodeAudio(blob);
      setAudioBuffer(buffer);
      setDuration(buffer.duration);
      setTrimStart(0);
      setTrimEnd(buffer.duration);
      showToast(`Recorded ${buffer.duration.toFixed(1)}s audio clip!`);
    } catch (err) {
      console.error(err);
      showToast('Error decoding recorded audio');
    }
  };

  // Play audio buffer
  const handlePlay = () => {
    if (!audioBuffer) return;
    if (isPlaying) {
      handleStopPlayback();
      return;
    }

    const { stop, analyser } = audioEngine.playBuffer(audioBuffer, {
      offset: trimStart,
      duration: Math.max(0.1, trimEnd - trimStart),
      volume: isMuted ? 0 : masterVolume,
      eq,
      noiseGate,
      vocalEnhance,
      onEnded: () => {
        setIsPlaying(false);
        setCurrentTime(trimStart);
      },
    });

    analyserRef.current = analyser;
    setPlaybackStopper(() => stop);
    setIsPlaying(true);
  };

  const handleStopPlayback = () => {
    if (playbackStopper) playbackStopper();
    audioEngine.stopPlayback();
    setIsPlaying(false);
  };

  // Apply Trim
  const handleApplyTrim = () => {
    if (!audioBuffer) return;
    const trimmed = audioEngine.trimAudioBuffer(audioBuffer, trimStart, trimEnd);
    setAudioBuffer(trimmed);
    setDuration(trimmed.duration);
    setTrimStart(0);
    setTrimEnd(trimmed.duration);
    showToast(`Audio trimmed to ${trimmed.duration.toFixed(1)}s`);
  };

  // Load custom audio file
  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await audioEngine.decodeAudio(file);
      setAudioBuffer(buffer);
      setDuration(buffer.duration);
      setTrimStart(0);
      setTrimEnd(buffer.duration);
      showToast(`Loaded ${file.name}`);
    } catch (err) {
      console.error(err);
      showToast('Failed to load audio file');
    }
    e.target.value = '';
  };

  // Real WAV export download
  const handleExportWav = () => {
    if (!audioBuffer) return;
    const wavBlob = audioEngine.audioBufferToWav(audioBuffer);
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nova-audio-${Date.now()}.wav`;
    a.click();
    showToast('Downloaded 16-bit PCM WAV audio file');
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] bg-[#07070d] text-slate-200 overflow-hidden">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-pink-600/95 text-white text-xs font-bold shadow-2xl backdrop-blur-md border border-pink-400/50 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {toastMessage}
        </div>
      )}

      {/* Main Waveform & Control Center */}
      <div className="flex-1 flex flex-col relative bg-[#090913] overflow-hidden">
        {/* Top Audio Toolbar */}
        <div className="h-12 border-b border-purple-900/30 px-4 flex items-center justify-between bg-[#0b0b16] gap-2">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-pink-400 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-pink-500/30">
              {isRecording
                ? `REC 00:${Math.floor(recordingSeconds).toString().padStart(2, '0')}`
                : `DUR ${duration.toFixed(2)}s`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <label className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer flex items-center gap-1.5 transition-colors">
              <FileAudio className="w-3.5 h-3.5 text-pink-400" />
              Import Audio
              <input type="file" accept="audio/*" onChange={handleAudioFileUpload} className="hidden" />
            </label>
            <div className="h-4 w-[1px] bg-purple-900/40 mx-1" />
            <button
              onClick={handleExportWav}
              disabled={!audioBuffer}
              className="px-3.5 py-1 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-pink-900/40 flex items-center gap-1.5 disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              Export 16-Bit WAV
            </button>
          </div>
        </div>

        {/* Live Audio Waveform Canvas */}
        <div className="flex-1 relative flex items-center justify-center p-4">
          <canvas
            ref={visualizerCanvasRef}
            width={1200}
            height={450}
            className="w-full h-full max-h-[55vh] rounded-2xl border border-pink-900/30 shadow-2xl"
          />

          {/* Big Recording Indicator Badge */}
          {isRecording && (
            <div className="absolute top-8 left-8 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/90 text-white font-mono text-xs font-bold shadow-lg shadow-red-900/50 animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
              LIVE MICROPHONE RECORDING
            </div>
          )}
        </div>

        {/* Audio Transport Dock */}
        <div className="h-32 bg-[#0b0b18] border-t border-purple-900/40 p-4 flex flex-col justify-between">
          {/* Timeline Trimming Range Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-slate-400 font-mono">
              <span>Trim In: {trimStart.toFixed(2)}s</span>
              <button
                onClick={handleApplyTrim}
                className="px-2 py-0.5 rounded bg-pink-950/60 hover:bg-pink-900 text-pink-300 font-bold border border-pink-500/40 flex items-center gap-1"
              >
                <Scissors className="w-3 h-3" />
                Apply Trim
              </button>
              <span>Trim Out: {trimEnd.toFixed(2)}s</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max={duration || 1}
                step="0.05"
                value={trimStart}
                onChange={(e) => setTrimStart(Math.min(parseFloat(e.target.value), trimEnd - 0.1))}
                className="w-1/2"
              />
              <input
                type="range"
                min="0"
                max={duration || 1}
                step="0.05"
                value={trimEnd}
                onChange={(e) => setTrimEnd(Math.max(parseFloat(e.target.value), trimStart + 0.1))}
                className="w-1/2"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Play / Pause */}
              <button
                onClick={handlePlay}
                disabled={!audioBuffer || isRecording}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-900/50 transition-all disabled:opacity-40"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                {isPlaying ? 'Pause' : 'Play Buffer'}
              </button>

              {/* Volume Slider */}
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 rounded-xl bg-slate-800 text-slate-300 border border-slate-700"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.05"
                value={isMuted ? 0 : masterVolume}
                onChange={(e) => {
                  const vol = parseFloat(e.target.value);
                  setMasterVolume(vol);
                  setIsMuted(false);
                  audioEngine.updateVolume(vol);
                }}
                className="w-24"
              />
            </div>

            {/* Mic Record Controls */}
            <div className="flex items-center gap-2">
              {!isRecording ? (
                <button
                  onClick={handleStartRecording}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-900/50 flex items-center gap-2 transition-all"
                >
                  <Mic className="w-4 h-4 animate-pulse" />
                  Record Mic
                </button>
              ) : (
                <>
                  <button
                    onClick={handleTogglePauseRecording}
                    className="px-3 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold"
                  >
                    {isRecordingPaused ? 'Resume' : 'Pause'}
                  </button>
                  <button
                    onClick={handleStopRecording}
                    className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    <Square className="w-4 h-4 fill-white" />
                    Stop & Keep
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Drawer: 5-Band Equalizer & Vocal Enhancer */}
      <div className="w-full lg:w-80 bg-[#0c0c18] border-t lg:border-t-0 lg:border-l border-purple-900/30 p-4 space-y-6 overflow-y-auto">
        {/* 5-Band Graphic Equalizer */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
              <Sliders className="w-4 h-4" />
              5-Band Equalizer
            </span>
            <button
              onClick={() => {
                setEq({ bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0 });
                ['bass', 'lowMid', 'mid', 'highMid', 'treble'].forEach((b: any) =>
                  audioEngine.updateEq(b, 0)
                );
              }}
              className="text-[10px] text-slate-400 hover:text-pink-300"
            >
              Flat EQ
            </button>
          </div>

          <div className="space-y-3">
            {[
              { band: 'bass', label: 'Sub & Bass (80 Hz)', min: -12, max: 12 },
              { band: 'lowMid', label: 'Low-Mid (250 Hz)', min: -12, max: 12 },
              { band: 'mid', label: 'Midrange (1 kHz)', min: -12, max: 12 },
              { band: 'highMid', label: 'Presence (4 kHz)', min: -12, max: 12 },
              { band: 'treble', label: 'Air & Treble (12 kHz)', min: -12, max: 12 },
            ].map(({ band, label, min, max }) => {
              const val = eq[band as keyof typeof eq];
              return (
                <div key={band} className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>{label}</span>
                    <span className="font-mono text-pink-300">
                      {val > 0 ? `+${val}` : val} dB
                    </span>
                  </div>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    value={val}
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      setEq((prev) => ({ ...prev, [band]: v }));
                      audioEngine.updateEq(band as any, v);
                    }}
                    className="w-full"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Audio Filters & Enhancers */}
        <div className="space-y-3 pt-3 border-t border-purple-900/30">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
            Voice Processing & FX
          </span>

          {/* Noise Gate */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#121224] border border-purple-900/20">
            <div>
              <div className="text-xs font-bold text-white">Noise Rumble Filter</div>
              <div className="text-[10px] text-slate-400">Cuts sub-120Hz air conditioner hum</div>
            </div>
            <button
              onClick={() => setNoiseGate(!noiseGate)}
              className={`w-10 h-5 rounded-full transition-colors relative ${
                noiseGate ? 'bg-pink-600' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                  noiseGate ? 'right-0.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {/* Vocal Enhancer Compressor */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#121224] border border-purple-900/20">
            <div>
              <div className="text-xs font-bold text-white">Vocal Presence Enhancer</div>
              <div className="text-[10px] text-slate-400">Dynamic compression for punchy voice</div>
            </div>
            <button
              onClick={() => setVocalEnhance(!vocalEnhance)}
              className={`w-10 h-5 rounded-full transition-colors relative ${
                vocalEnhance ? 'bg-purple-600' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                  vocalEnhance ? 'right-0.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
