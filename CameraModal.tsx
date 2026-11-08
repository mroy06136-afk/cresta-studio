import React, { useRef, useState, useEffect } from 'react';
import { Camera, Video, X, RotateCcw, Check, StopCircle } from 'lucide-react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapturePhoto: (dataUrl: string) => void;
  onCaptureVideo?: (videoBlobUrl: string) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  onCapturePhoto,
  onCaptureVideo,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordTimer, setRecordTimer] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }
    startCamera();
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  useEffect(() => {
    let interval: any;
    if (isRecordingVideo) {
      interval = setInterval(() => setRecordTimer((t) => t + 1), 1000);
    } else {
      setRecordTimer(0);
    }
    return () => clearInterval(interval);
  }, [isRecordingVideo]);

  const startCamera = async () => {
    setErrorMessage(null);
    try {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: true,
      });
      setStream(media);
      if (videoRef.current) {
        videoRef.current.srcObject = media;
      }
    } catch (err: any) {
      console.warn('Camera error:', err);
      setErrorMessage(
        'Could not access camera/microphone. Please ensure permissions are granted in browser settings.'
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    setIsRecordingVideo(false);
  };

  const handleTakePhoto = () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth || 1280;
    canvas.height = v.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip if front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    onCapturePhoto(dataUrl);
    stopCamera();
    onClose();
  };

  const handleStartVideoRecording = () => {
    if (!stream) return;
    const chunks: Blob[] = [];
    const mime = MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4';
    const rec = new MediaRecorder(stream, { mimeType: mime });

    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    rec.onstop = () => {
      const blob = new Blob(chunks, { type: mime });
      const url = URL.createObjectURL(blob);
      if (onCaptureVideo) {
        onCaptureVideo(url);
      }
      stopCamera();
      onClose();
    };

    rec.start();
    setMediaRecorder(rec);
    setIsRecordingVideo(true);
  };

  const handleStopVideoRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecordingVideo(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-2xl bg-[#0f0f1c] border border-purple-500/30 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-purple-900/30">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-sm text-white">Device Camera Capture</h3>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Viewport */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
          {errorMessage ? (
            <div className="p-6 text-center text-rose-300 text-sm max-w-md">
              {errorMessage}
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />
          )}

          {/* Recording Timer Badge */}
          {isRecordingVideo && (
            <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/90 text-white font-mono text-xs font-bold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              REC {Math.floor(recordTimer / 60)}:{(recordTimer % 60).toString().padStart(2, '0')}
            </div>
          )}

          {/* Flip camera button */}
          <button
            onClick={() => setFacingMode((m) => (m === 'user' ? 'environment' : 'user'))}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm border border-white/20 transition-all"
            title="Switch front/back camera"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6 p-4 bg-[#0a0a14] border-t border-purple-900/20">
          {/* Photo Capture */}
          {!isRecordingVideo ? (
            <>
              <button
                onClick={handleTakePhoto}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-purple-900/50 transition-all active:scale-95"
              >
                <Camera className="w-4 h-4" />
                Snap Photo
              </button>

              {onCaptureVideo && (
                <button
                  onClick={handleStartVideoRecording}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition-all active:scale-95"
                >
                  <Video className="w-4 h-4 text-red-400" />
                  Record Video
                </button>
              )}
            </>
          ) : (
            <button
              onClick={handleStopVideoRecording}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-900/50 transition-all active:scale-95"
            >
              <StopCircle className="w-5 h-5" />
              Stop & Use Video
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
