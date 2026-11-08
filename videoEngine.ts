/**
 * Video Processing, Compositing, and Real-Time Export Engine for NOVA EDITOR AI
 * Supports multi-clip playback, transitions, color grading, subtitles,
 * and real video file rendering via Canvas capture stream + MediaRecorder.
 */

import { VideoClip, SubtitleCue } from './storage';

export interface ExportVideoOptions {
  clips: VideoClip[];
  subtitles: SubtitleCue[];
  aspectRatio: '16:9' | '9:16' | '1:1';
  resolution: '720p' | '1080p' | '4k';
  fps: 24 | 30 | 60;
  audioTrackSrc?: string | null;
  audioVolume?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  onProgress?: (percent: number, statusText: string) => void;
  signal?: AbortSignal;
}

export function getResolutionDimensions(
  resolution: '720p' | '1080p' | '4k',
  aspectRatio: '16:9' | '9:16' | '1:1'
): { width: number; height: number } {
  let baseWidth = 1280;
  let baseHeight = 720;

  if (resolution === '1080p') {
    baseWidth = 1920;
    baseHeight = 1080;
  } else if (resolution === '4k') {
    // High-res canvas (scaled for browser performance)
    baseWidth = 2560;
    baseHeight = 1440;
  }

  if (aspectRatio === '9:16') {
    return { width: baseHeight, height: baseWidth };
  } else if (aspectRatio === '1:1') {
    const size = Math.min(baseWidth, baseHeight);
    return { width: size, height: size };
  }
  return { width: baseWidth, height: baseHeight };
}

/**
 * Creates high quality procedural sample video clips for initial testing
 */
export function createSampleVideoBlob(
  type: 'intro' | 'landscape',
  durationSec: number = 4
): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d')!;

    const stream = canvas.captureStream(30);
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm')
      ? 'video/webm'
      : 'video/mp4';

    const recorder = new MediaRecorder(stream, { mimeType: mime });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mime });
      resolve(URL.createObjectURL(blob));
    };

    recorder.start();

    const fps = 30;
    const totalFrames = durationSec * fps;
    let frame = 0;

    const interval = setInterval(() => {
      const t = frame / fps;

      ctx.clearRect(0, 0, 1280, 720);

      if (type === 'intro') {
        // Futuristic cyber grid intro
        const bg = ctx.createLinearGradient(0, 0, 1280, 720);
        bg.addColorStop(0, '#0a0a1a');
        bg.addColorStop(0.5, '#1e113a');
        bg.addColorStop(1, '#0b0c20');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, 1280, 720);

        // Animated neon circles
        const count = 4;
        for (let i = 0; i < count; i++) {
          const r = ((t * 120 + i * 90) % 400);
          ctx.strokeStyle = `hsla(${270 + i * 25}, 90%, 65%, ${Math.max(0, 1 - r / 400)})`;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(640, 360, r, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.font = '800 64px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 30;
        ctx.fillText('NOVA EDITOR AI', 640, 370);

        ctx.font = '600 24px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 15;
        ctx.fillText(`SCENE 01 • DURATION ${durationSec}S`, 640, 430);
      } else {
        // Landscape Synthwave sunset clip
        const bg = ctx.createLinearGradient(0, 0, 0, 720);
        bg.addColorStop(0, '#110c2a');
        bg.addColorStop(0.6, '#4c1d95');
        bg.addColorStop(1, '#ec4899');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, 1280, 720);

        // Sun
        const sunY = 360 + Math.sin(t * 0.8) * 20;
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(640, sunY, 140, 0, Math.PI * 2);
        ctx.fill();

        // Animated wireframe floor
        ctx.fillStyle = '#090814';
        ctx.fillRect(0, 440, 1280, 280);

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 2;
        const offset = (t * 60) % 40;
        for (let y = 440 + offset; y < 720; y += 30) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(1280, y);
          ctx.stroke();
        }

        ctx.font = '700 48px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 20;
        ctx.fillText('NEON HORIZON', 640, 220);
      }

      frame++;
      if (frame >= totalFrames) {
        clearInterval(interval);
        recorder.stop();
      }
    }, 1000 / fps);
  });
}

/**
 * Composite and render full video project into an actual downloadable video file
 */
export async function renderAndExportVideo(options: ExportVideoOptions): Promise<Blob> {
  const {
    clips,
    subtitles,
    aspectRatio,
    resolution,
    fps,
    brightness = 0,
    contrast = 0,
    saturation = 0,
    onProgress,
    signal,
  } = options;

  if (clips.length === 0) {
    throw new Error('Please add at least one video clip to export.');
  }

  const { width, height } = getResolutionDimensions(resolution, aspectRatio);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Determine export MIME type
  let mimeType = 'video/webm;codecs=vp9';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/mp4';
    }
  }

  // Pre-load video elements for all clips
  onProgress?.(5, 'Loading video clip assets into rendering pipeline...');
  const videoElements: Map<string, HTMLVideoElement> = new Map();

  for (const clip of clips) {
    if (signal?.aborted) throw new Error('Export cancelled');
    const v = document.createElement('video');
    v.src = clip.src;
    v.crossOrigin = 'anonymous';
    v.muted = true;
    v.playsInline = true;
    await new Promise((res) => {
      v.onloadeddata = () => res(null);
      v.onerror = () => res(null); // Continue gracefully
    });
    videoElements.set(clip.id, v);
  }

  // Total duration of clips sequence
  const totalDuration = clips.reduce((acc, c) => acc + (c.trimOut - c.trimIn) / (c.speed || 1), 0);

  // Setup Canvas Stream & MediaRecorder
  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: resolution === '4k' ? 25000000 : resolution === '1080p' ? 12000000 : 6000000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const recordingPromise = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      const videoBlob = new Blob(chunks, { type: mimeType });
      resolve(videoBlob);
    };
    recorder.onerror = (e) => reject(e);
  });

  recorder.start();

  // Render loop
  const totalFrames = Math.max(1, Math.floor(totalDuration * fps));
  let currentFrame = 0;

  for (let f = 0; f < totalFrames; f++) {
    if (signal?.aborted) {
      recorder.stop();
      throw new Error('Export cancelled by user');
    }

    const timelineTime = f / fps;

    // Find which clip is active at timelineTime
    let accumulatedTime = 0;
    let activeClip: VideoClip | null = null;
    let clipLocalTime = 0;

    for (const clip of clips) {
      const clipDuration = (clip.trimOut - clip.trimIn) / (clip.speed || 1);
      if (timelineTime >= accumulatedTime && timelineTime <= accumulatedTime + clipDuration) {
        activeClip = clip;
        const relativeTimeline = timelineTime - accumulatedTime;
        clipLocalTime = clip.trimIn + relativeTimeline * (clip.speed || 1);
        break;
      }
      accumulatedTime += clipDuration;
    }

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Filter string
    ctx.filter = `brightness(${100 + brightness}%) contrast(${100 + contrast}%) saturate(${100 + saturation}%)`;

    if (activeClip) {
      const videoEl = videoElements.get(activeClip.id);
      if (videoEl && videoEl.readyState >= 2) {
        // Fast seek
        videoEl.currentTime = clipLocalTime;
        // Draw frame with aspect ratio cover/fit
        const vRatio = videoEl.videoWidth / (videoEl.videoHeight || 1);
        const cRatio = width / height;
        let dw = width;
        let dh = height;
        let dx = 0;
        let dy = 0;

        if (vRatio > cRatio) {
          dw = height * vRatio;
          dx = -(dw - width) / 2;
        } else {
          dh = width / vRatio;
          dy = -(dh - height) / 2;
        }

        ctx.drawImage(videoEl, dx, dy, dw, dh);
      } else {
        // Fallback procedural frame if video decode delayed
        ctx.fillStyle = '#18182b';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#a855f7';
        ctx.font = '700 36px "Plus Jakarta Sans"';
        ctx.textAlign = 'center';
        ctx.fillText(activeClip.name, width / 2, height / 2);
      }

      // Check transition effects (glitch, fade)
      if (activeClip.transition === 'glitch' && timelineTime % 1.5 < 0.2) {
        // Real glitch effect: RGB channel offset
        const sliceH = 40;
        const sliceY = (timelineTime * 300) % (height - sliceH);
        const imgData = ctx.getImageData(0, sliceY, width, sliceH);
        ctx.putImageData(imgData, (Math.random() - 0.5) * 30, sliceY);
      }
    }

    // Reset filter for subtitle text overlay
    ctx.filter = 'none';

    // Render active subtitles
    const activeSub = subtitles.find((s) => timelineTime >= s.start && timelineTime <= s.end);
    if (activeSub) {
      ctx.save();
      const subFontSize = Math.max(22, Math.round(height * 0.045));
      ctx.font = `700 ${subFontSize}px "Plus Jakarta Sans", sans-serif`;
      ctx.textAlign = 'center';
      const textMetrics = ctx.measureText(activeSub.text);
      const textW = textMetrics.width + 40;
      const textH = subFontSize * 1.5;
      const subX = width / 2;
      const subY = height - height * 0.12;

      // Dark background pill with glowing border
      ctx.fillStyle = 'rgba(10, 10, 20, 0.85)';
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(subX - textW / 2, subY - textH / 2, textW, textH, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 8;
      ctx.fillText(activeSub.text, subX, subY + subFontSize * 0.35);
      ctx.restore();
    }

    currentFrame++;
    const progressPercent = Math.min(98, Math.round((currentFrame / totalFrames) * 90) + 8);
    if (f % 5 === 0 || f === totalFrames - 1) {
      onProgress?.(
        progressPercent,
        `Rendering frame ${currentFrame} of ${totalFrames} (${Math.round(timelineTime)}s / ${Math.round(totalDuration)}s)...`
      );
      // Let event loop breathe
      await new Promise((r) => setTimeout(r, 1000 / fps));
    }
  }

  onProgress?.(99, 'Finalizing video stream encoding and packaging...');
  recorder.stop();
  const finalBlob = await recordingPromise;

  onProgress?.(100, 'Video export complete!');
  return finalBlob;
}
