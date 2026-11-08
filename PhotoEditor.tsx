import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Sliders,
  Sparkles,
  Crop,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Undo2,
  Redo2,
  RotateCcw,
  Download,
  Type,
  Smile,
  Scissors,
  Eraser,
  Eye,
  Camera,
  Upload,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Check,
} from 'lucide-react';
import {
  PhotoAdjustments,
  TextOverlay,
  StickerOverlay,
  PhotoProjectState,
  Project,
} from '../../services/storage';
import {
  DEFAULT_ADJUSTMENTS,
  FILTER_PRESETS,
  applyAdjustmentsToImageData,
  removeBackgroundCanvas,
  createDefaultSampleImage,
} from '../../services/photoEngine';

interface PhotoEditorProps {
  project: Project | null;
  onUpdateProjectState: (state: PhotoProjectState) => void;
  onOpenQuickCamera: () => void;
}

type TabType = 'adjust' | 'filters' | 'crop_rotate' | 'retouch' | 'text' | 'stickers';

const EMOJI_STICKERS = ['🔥', '✨', '⚡', '🚀', '💎', '👑', '⭐', '❤️', '🕶️', '🎬', '📸', '🎵'];
const SHAPE_STICKERS = [
  { id: 'neon_badge', label: 'Badge', svg: 'badge' },
  { id: 'star_burst', label: 'Star', svg: 'star' },
  { id: 'cyber_frame', label: 'Cyber Box', svg: 'box' },
  { id: 'arrow_neon', label: 'Arrow', svg: 'arrow' },
];

export const PhotoEditor: React.FC<PhotoEditorProps> = ({
  project,
  onUpdateProjectState,
  onOpenQuickCamera,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const beforeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Active Tool Tab
  const [activeTab, setActiveTab] = useState<TabType>('adjust');

  // Image source state
  const [imageSrc, setImageSrc] = useState<string>(() => {
    return project?.photoState?.imageSrc || createDefaultSampleImage();
  });
  const [originalImageSrc, setOriginalImageSrc] = useState<string>(() => {
    return project?.photoState?.originalImageSrc || imageSrc;
  });

  // Photo Adjustments state
  const [adjustments, setAdjustments] = useState<PhotoAdjustments>(() => {
    return project?.photoState?.adjustments || { ...DEFAULT_ADJUSTMENTS };
  });

  // Filter Preset & Intensity
  const [filterPreset, setFilterPreset] = useState<string>(() => {
    return project?.photoState?.filterPreset || 'normal';
  });
  const [filterIntensity, setFilterIntensity] = useState<number>(() => {
    return project?.photoState?.filterIntensity ?? 100;
  });

  // Rotation & Flip
  const [rotation, setRotation] = useState<number>(() => {
    return project?.photoState?.rotation ?? 0;
  });
  const [flipH, setFlipH] = useState<boolean>(() => {
    return project?.photoState?.flipH ?? false;
  });
  const [flipV, setFlipV] = useState<boolean>(() => {
    return project?.photoState?.flipV ?? false;
  });

  // Text & Sticker Overlays
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>(() => {
    return project?.photoState?.textOverlays || [];
  });
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

  const [stickers, setStickers] = useState<StickerOverlay[]>(() => {
    return project?.photoState?.stickers || [];
  });
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);

  // Comparison slider (0 to 100)
  const [showCompare, setShowCompare] = useState<boolean>(false);
  const [compareSplit, setCompareSplit] = useState<number>(50);

  // Retouch Brush & Eraser
  const [isRetouching, setIsRetouching] = useState<boolean>(false);
  const [brushSize, setBrushSize] = useState<number>(20);
  const [brushMode, setBrushMode] = useState<'erase' | 'restore'>('erase');
  const [isBgRemoving, setIsBgRemoving] = useState<boolean>(false);
  const [bgRemoveStatus, setBgRemoveStatus] = useState<string | null>(null);

  // Undo / Redo History Stack
  const historyRef = useRef<
    {
      adjustments: PhotoAdjustments;
      filterPreset: string;
      filterIntensity: number;
      rotation: number;
      flipH: boolean;
      flipV: boolean;
      textOverlays: TextOverlay[];
      stickers: StickerOverlay[];
    }[]
  >([]);
  const historyIndexRef = useRef<number>(-1);

  // Sync to parent project state
  const notifyParent = useCallback(() => {
    onUpdateProjectState({
      imageSrc,
      originalImageSrc,
      adjustments,
      filterPreset,
      filterIntensity,
      rotation,
      flipH,
      flipV,
      cropBox: null,
      textOverlays,
      stickers,
    });
  }, [
    imageSrc,
    originalImageSrc,
    adjustments,
    filterPreset,
    filterIntensity,
    rotation,
    flipH,
    flipV,
    textOverlays,
    stickers,
    onUpdateProjectState,
  ]);

  // Push history snapshot
  const pushHistory = useCallback(() => {
    const snapshot = {
      adjustments: { ...adjustments },
      filterPreset,
      filterIntensity,
      rotation,
      flipH,
      flipV,
      textOverlays: [...textOverlays],
      stickers: [...stickers],
    };
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(snapshot);
    if (newHistory.length > 25) newHistory.shift();
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
    notifyParent();
  }, [
    adjustments,
    filterPreset,
    filterIntensity,
    rotation,
    flipH,
    flipV,
    textOverlays,
    stickers,
    notifyParent,
  ]);

  // Undo action
  const handleUndo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const snap = historyRef.current[historyIndexRef.current];
      setAdjustments(snap.adjustments);
      setFilterPreset(snap.filterPreset);
      setFilterIntensity(snap.filterIntensity);
      setRotation(snap.rotation);
      setFlipH(snap.flipH);
      setFlipV(snap.flipV);
      setTextOverlays(snap.textOverlays);
      setStickers(snap.stickers);
    }
  };

  // Redo action
  const handleRedo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const snap = historyRef.current[historyIndexRef.current];
      setAdjustments(snap.adjustments);
      setFilterPreset(snap.filterPreset);
      setFilterIntensity(snap.filterIntensity);
      setRotation(snap.rotation);
      setFlipH(snap.flipH);
      setFlipV(snap.flipV);
      setTextOverlays(snap.textOverlays);
      setStickers(snap.stickers);
    }
  };

  // Reset adjustments
  const handleResetAdjustments = () => {
    setAdjustments({ ...DEFAULT_ADJUSTMENTS });
    setFilterPreset('normal');
    setFilterIntensity(100);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    pushHistory();
  };

  // Main Canvas Render
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageSrc) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;

    img.onload = () => {
      const isRotated90 = rotation % 180 !== 0;
      const targetW = isRotated90 ? img.height : img.width;
      const targetH = isRotated90 ? img.width : img.height;

      canvas.width = targetW;
      canvas.height = targetH;

      ctx.save();
      ctx.clearRect(0, 0, targetW, targetH);

      // Handle orientation transform
      ctx.translate(targetW / 2, targetH / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();

      // Apply pixel adjustments & filters
      const imgData = ctx.getImageData(0, 0, targetW, targetH);
      applyAdjustmentsToImageData(imgData, adjustments, filterPreset, filterIntensity);
      ctx.putImageData(imgData, 0, 0);

      // Render Stickers
      for (const st of stickers) {
        ctx.save();
        ctx.globalAlpha = st.opacity;
        ctx.translate(st.x, st.y);
        ctx.rotate((st.rotation * Math.PI) / 180);

        if (st.type === 'emoji') {
          ctx.font = `${st.width}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(st.content, 0, 0);
        } else {
          // Cyber shapes / badges
          ctx.strokeStyle = '#a855f7';
          ctx.lineWidth = 4;
          ctx.fillStyle = 'rgba(168, 85, 247, 0.2)';
          if (st.content === 'badge') {
            ctx.beginPath();
            ctx.roundRect(-st.width / 2, -st.height / 2, st.width, st.height, 12);
            ctx.fill();
            ctx.stroke();
            ctx.font = 'bold 20px "Plus Jakarta Sans"';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText('NOVA PRO', 0, 6);
          } else {
            ctx.beginPath();
            ctx.arc(0, 0, st.width / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      // Render Text Overlays
      for (const t of textOverlays) {
        ctx.save();
        ctx.globalAlpha = t.opacity;
        ctx.translate(t.x, t.y);
        ctx.rotate((t.rotation * Math.PI) / 180);
        ctx.font = `bold ${t.fontSize}px "${t.fontFamily}", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (t.strokeWidth > 0) {
          ctx.strokeStyle = t.strokeColor;
          ctx.lineWidth = t.strokeWidth;
          ctx.strokeText(t.text, 0, 0);
        }

        ctx.fillStyle = t.fillColor;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 8;
        ctx.fillText(t.text, 0, 0);
        ctx.restore();
      }
    };
  }, [
    imageSrc,
    rotation,
    flipH,
    flipV,
    adjustments,
    filterPreset,
    filterIntensity,
    stickers,
    textOverlays,
  ]);

  // Initial and reactive render
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Render before-canvas when comparison is toggled
  useEffect(() => {
    if (showCompare && beforeCanvasRef.current && originalImageSrc) {
      const bCanvas = beforeCanvasRef.current;
      const bCtx = bCanvas.getContext('2d');
      if (!bCtx) return;
      const orig = new Image();
      orig.crossOrigin = 'anonymous';
      orig.src = originalImageSrc;
      orig.onload = () => {
        bCanvas.width = orig.width;
        bCanvas.height = orig.height;
        bCtx.drawImage(orig, 0, 0);
      };
    }
  }, [showCompare, originalImageSrc]);

  // Image file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      setImageSrc(dataUrl);
      setOriginalImageSrc(dataUrl);
      handleResetAdjustments();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Add new text overlay
  const handleAddText = () => {
    const canvas = canvasRef.current;
    const newText: TextOverlay = {
      id: 'txt_' + Math.random().toString(36).substring(2, 8),
      text: 'CYBER TITLE',
      x: canvas ? canvas.width / 2 : 600,
      y: canvas ? canvas.height / 2 : 400,
      fontSize: 48,
      fontFamily: 'Plus Jakarta Sans',
      fillColor: '#ffffff',
      strokeColor: '#a855f7',
      strokeWidth: 4,
      rotation: 0,
      opacity: 1,
    };
    setTextOverlays([...textOverlays, newText]);
    setSelectedTextId(newText.id);
    pushHistory();
  };

  // Add emoji sticker
  const handleAddSticker = (emoji: string) => {
    const canvas = canvasRef.current;
    const newSticker: StickerOverlay = {
      id: 'stk_' + Math.random().toString(36).substring(2, 8),
      type: 'emoji',
      content: emoji,
      x: canvas ? canvas.width / 2 : 600,
      y: canvas ? canvas.height / 2 : 400,
      width: 72,
      height: 72,
      rotation: 0,
      opacity: 1,
    };
    setStickers([...stickers, newSticker]);
    setSelectedStickerId(newSticker.id);
    pushHistory();
  };

  // Background removal
  const handleBackgroundRemoval = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsBgRemoving(true);
    setBgRemoveStatus('Analyzing edge contours and color luminance...');

    setTimeout(() => {
      try {
        setBgRemoveStatus('Segmenting foreground subject...');
        const processed = removeBackgroundCanvas(canvas, 38);
        const dataUrl = processed.toDataURL('image/png');
        setImageSrc(dataUrl);
        setBgRemoveStatus('Background removed successfully!');
        pushHistory();
      } catch (err) {
        console.error(err);
        setBgRemoveStatus('Background removal failed');
      } finally {
        setTimeout(() => {
          setIsBgRemoving(false);
          setBgRemoveStatus(null);
        }, 1500);
      }
    }, 600);
  };

  // Interactive Canvas Retouch / Eraser
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isRetouching) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    if (brushMode === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, brushSize, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  // Direct export download
  const handleQuickDownload = (format: 'image/png' | 'image/jpeg' | 'image/webp') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ext = format === 'image/png' ? 'png' : format === 'image/jpeg' ? 'jpg' : 'webp';
    const dataUrl = canvas.toDataURL(format, 0.95);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `nova-edit-${Date.now()}.${ext}`;
    a.click();
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] bg-[#07070d] text-slate-200 overflow-hidden">
      {/* Central Viewport Workspace */}
      <div className="flex-1 flex flex-col relative bg-[#090913] overflow-hidden">
        {/* Top Viewport Toolbar */}
        <div className="h-12 border-b border-purple-900/30 px-4 flex items-center justify-between bg-[#0b0b16] gap-2">
          {/* History & Reset */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleUndo}
              title="Undo (Ctrl+Z)"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              title="Redo (Ctrl+Y)"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30"
            >
              <Redo2 className="w-4 h-4" />
            </button>
            <div className="h-4 w-[1px] bg-purple-900/40 mx-1" />
            <button
              onClick={handleResetAdjustments}
              className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-purple-300 hover:bg-purple-900/20 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>

          {/* Center Before / After Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCompare(!showCompare)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                showCompare
                  ? 'bg-purple-600 border-purple-400 text-white shadow-md shadow-purple-900/50'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              {showCompare ? 'Exit Compare' : 'Before / After'}
            </button>
          </div>

          {/* Right Import & Download actions */}
          <div className="flex items-center gap-2">
            <label className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
            <button
              onClick={onOpenQuickCamera}
              title="Snap photo with camera"
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            >
              <Camera className="w-4 h-4" />
            </button>
            <div className="h-4 w-[1px] bg-purple-900/40 mx-1" />
            <button
              onClick={() => handleQuickDownload('image/png')}
              className="px-3 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-900/40 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Save Image
            </button>
          </div>
        </div>

        {/* Canvas Display Container */}
        <div
          ref={containerRef}
          className="flex-1 flex items-center justify-center p-4 overflow-auto relative select-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 50%, rgba(30, 27, 75, 0.25) 0%, rgba(9, 9, 19, 1) 100%)',
          }}
        >
          {/* Comparison Split Mode */}
          {showCompare ? (
            <div className="relative max-w-full max-h-full flex items-center justify-center">
              <canvas
                ref={beforeCanvasRef}
                className="max-h-[75vh] max-w-[85vw] object-contain rounded-lg shadow-2xl opacity-80"
              />
              <div className="absolute top-4 left-4 bg-black/80 px-2.5 py-1 rounded text-xs font-mono font-bold text-amber-300 border border-amber-500/40">
                ORIGINAL BEFORE
              </div>
            </div>
          ) : null}

          {/* Working Canvas */}
          <canvas
            ref={canvasRef}
            onMouseDown={handleCanvasMouseDown}
            className={`max-h-[75vh] max-w-[85vw] object-contain rounded-lg shadow-2xl border border-purple-900/30 ${
              showCompare ? 'hidden' : 'block'
            } ${isRetouching ? 'cursor-crosshair' : 'cursor-default'}`}
          />

          {/* Background removal loading badge */}
          {isBgRemoving && (
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30">
              <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-purple-300 font-bold text-sm tracking-wide">{bgRemoveStatus}</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Controls Panel */}
      <div className="w-full lg:w-96 bg-[#0c0c18] border-t lg:border-t-0 lg:border-l border-purple-900/30 flex flex-col h-auto lg:h-full">
        {/* Tool Category Tabs */}
        <div className="flex border-b border-purple-900/30 overflow-x-auto scrollbar-none bg-[#090914]">
          <button
            onClick={() => setActiveTab('adjust')}
            className={`flex-1 min-w-[70px] py-3 text-xs font-bold flex flex-col items-center gap-1 border-b-2 transition-all ${
              activeTab === 'adjust'
                ? 'border-purple-500 text-purple-300 bg-purple-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Adjust
          </button>
          <button
            onClick={() => setActiveTab('filters')}
            className={`flex-1 min-w-[70px] py-3 text-xs font-bold flex flex-col items-center gap-1 border-b-2 transition-all ${
              activeTab === 'filters'
                ? 'border-purple-500 text-purple-300 bg-purple-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Filters
          </button>
          <button
            onClick={() => setActiveTab('crop_rotate')}
            className={`flex-1 min-w-[70px] py-3 text-xs font-bold flex flex-col items-center gap-1 border-b-2 transition-all ${
              activeTab === 'crop_rotate'
                ? 'border-purple-500 text-purple-300 bg-purple-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Crop className="w-4 h-4" />
            Crop/Flip
          </button>
          <button
            onClick={() => setActiveTab('retouch')}
            className={`flex-1 min-w-[70px] py-3 text-xs font-bold flex flex-col items-center gap-1 border-b-2 transition-all ${
              activeTab === 'retouch'
                ? 'border-purple-500 text-purple-300 bg-purple-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scissors className="w-4 h-4" />
            Cutout
          </button>
          <button
            onClick={() => setActiveTab('text')}
            className={`flex-1 min-w-[70px] py-3 text-xs font-bold flex flex-col items-center gap-1 border-b-2 transition-all ${
              activeTab === 'text'
                ? 'border-purple-500 text-purple-300 bg-purple-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Type className="w-4 h-4" />
            Text
          </button>
          <button
            onClick={() => setActiveTab('stickers')}
            className={`flex-1 min-w-[70px] py-3 text-xs font-bold flex flex-col items-center gap-1 border-b-2 transition-all ${
              activeTab === 'stickers'
                ? 'border-purple-500 text-purple-300 bg-purple-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smile className="w-4 h-4" />
            Stickers
          </button>
        </div>

        {/* Tab Content Panes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* TAB 1: ADJUSTMENTS */}
          {activeTab === 'adjust' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                  Color & Tone Sliders
                </span>
                <button
                  onClick={handleResetAdjustments}
                  className="text-[11px] text-slate-400 hover:text-purple-300"
                >
                  Reset All
                </button>
              </div>

              {[
                { key: 'brightness', label: 'Brightness', min: -100, max: 100 },
                { key: 'contrast', label: 'Contrast', min: -100, max: 100 },
                { key: 'saturation', label: 'Saturation', min: -100, max: 100 },
                { key: 'vibrance', label: 'Vibrance', min: -100, max: 100 },
                { key: 'exposure', label: 'Exposure', min: -100, max: 100 },
                { key: 'warmth', label: 'Warmth (Temp)', min: -100, max: 100 },
                { key: 'tint', label: 'Tint (Hue Shift)', min: -100, max: 100 },
                { key: 'vignette', label: 'Vignette Darkening', min: 0, max: 100 },
                { key: 'sharpen', label: 'Sharpening Detail', min: 0, max: 100 },
                { key: 'sepia', label: 'Sepia Warmth', min: 0, max: 100 },
                { key: 'vintage', label: 'Vintage 35mm Tone', min: 0, max: 100 },
                { key: 'invert', label: 'Color Invert', min: 0, max: 100 },
              ].map(({ key, label, min, max }) => {
                const val = adjustments[key as keyof PhotoAdjustments];
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-slate-300">
                      <span>{label}</span>
                      <span className="font-mono text-purple-300">{val}</span>
                    </div>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      value={val}
                      onChange={(e) => {
                        const num = parseInt(e.target.value);
                        setAdjustments((prev) => ({ ...prev, [key]: num }));
                      }}
                      onMouseUp={pushHistory}
                      onTouchEnd={pushHistory}
                      className="w-full"
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: FILTERS & PRESETS */}
          {activeTab === 'filters' && (
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium text-slate-300">
                  <span>Filter Intensity</span>
                  <span className="font-mono text-purple-300">{filterIntensity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filterIntensity}
                  onChange={(e) => setFilterIntensity(parseInt(e.target.value))}
                  onMouseUp={pushHistory}
                  onTouchEnd={pushHistory}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {Object.entries(FILTER_PRESETS).map(([id, preset]) => {
                  const isSelected = filterPreset === id;
                  return (
                    <button
                      key={id}
                      onClick={() => {
                        setFilterPreset(id);
                        pushHistory();
                      }}
                      className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-purple-950/60 border-purple-500 shadow-md shadow-purple-900/30 text-white'
                          : 'bg-[#121224] border-purple-900/20 hover:border-purple-500/40 text-slate-300'
                      }`}
                    >
                      <div className="font-bold text-xs">{preset.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{preset.tag}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: CROP & ROTATE */}
          {activeTab === 'crop_rotate' && (
            <div className="space-y-5">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                  Rotation & Orientation
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setRotation((r) => (r + 90) % 360);
                      pushHistory();
                    }}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700"
                  >
                    <RotateCw className="w-4 h-4 text-purple-400" />
                    Rotate 90°
                  </button>
                  <button
                    onClick={() => {
                      setRotation((r) => (r - 90 + 360) % 360);
                      pushHistory();
                    }}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700"
                  >
                    <RotateCcw className="w-4 h-4 text-purple-400" />
                    Rotate -90°
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                  Flip Axis
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setFlipH(!flipH);
                      pushHistory();
                    }}
                    className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                      flipH
                        ? 'bg-purple-600 border-purple-400 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                    }`}
                  >
                    <FlipHorizontal className="w-4 h-4" />
                    Flip Horizontal
                  </button>
                  <button
                    onClick={() => {
                      setFlipV(!flipV);
                      pushHistory();
                    }}
                    className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                      flipV
                        ? 'bg-purple-600 border-purple-400 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                    }`}
                  >
                    <FlipVertical className="w-4 h-4" />
                    Flip Vertical
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: RETOUCH & BACKGROUND REMOVAL */}
          {activeTab === 'retouch' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 to-indigo-950/30 border border-purple-500/30 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Scissors className="w-4 h-4 text-cyan-400" />
                  Instant Background Cutout
                </div>
                <p className="text-xs text-slate-400">
                  Separates foreground subject with boundary flood-fill and soft alpha edges.
                </p>
                <button
                  onClick={handleBackgroundRemoval}
                  disabled={isBgRemoving}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-900/40 flex items-center justify-center gap-2"
                >
                  <Scissors className="w-4 h-4" />
                  Remove Background Now
                </button>
              </div>

              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                  Interactive Erase Brush
                </span>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setIsRetouching(!isRetouching)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                      isRetouching
                        ? 'bg-rose-600 border-rose-400 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                  >
                    <Eraser className="w-4 h-4 inline mr-1.5" />
                    {isRetouching ? 'Brush Active (Click on image)' : 'Enable Erase Brush'}
                  </button>
                </div>

                {isRetouching && (
                  <div className="space-y-2 p-3 rounded-xl bg-[#121224] border border-purple-900/30">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Brush Size</span>
                      <span className="font-mono text-purple-300">{brushSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      value={brushSize}
                      onChange={(e) => setBrushSize(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: TEXT OVERLAYS */}
          {activeTab === 'text' && (
            <div className="space-y-4">
              <button
                onClick={handleAddText}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-900/40 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add New Text Layer
              </button>

              <div className="space-y-3">
                {textOverlays.map((t, index) => {
                  const isSelected = selectedTextId === t.id;
                  return (
                    <div
                      key={t.id}
                      className={`p-3 rounded-xl bg-[#121224] border transition-all space-y-3 ${
                        isSelected ? 'border-purple-500 shadow-md' : 'border-purple-900/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-300">Layer {index + 1}</span>
                        <button
                          onClick={() => {
                            setTextOverlays(textOverlays.filter((item) => item.id !== t.id));
                            pushHistory();
                          }}
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={t.text}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTextOverlays((prev) =>
                            prev.map((item) => (item.id === t.id ? { ...item, text: val } : item))
                          );
                        }}
                        onBlur={pushHistory}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-purple-500 font-bold"
                      />

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] text-slate-400">Size ({t.fontSize}px)</label>
                          <input
                            type="range"
                            min="16"
                            max="140"
                            value={t.fontSize}
                            onChange={(e) => {
                              const s = parseInt(e.target.value);
                              setTextOverlays((prev) =>
                                prev.map((item) =>
                                  item.id === t.id ? { ...item, fontSize: s } : item
                                )
                              );
                            }}
                            onMouseUp={pushHistory}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400">Color</label>
                          <input
                            type="color"
                            value={t.fillColor}
                            onChange={(e) => {
                              const c = e.target.value;
                              setTextOverlays((prev) =>
                                prev.map((item) =>
                                  item.id === t.id ? { ...item, fillColor: c } : item
                                )
                              );
                              pushHistory();
                            }}
                            className="w-full h-8 rounded bg-transparent cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] text-slate-400">Position X</label>
                          <input
                            type="range"
                            min="0"
                            max={canvasRef.current?.width || 1200}
                            value={t.x}
                            onChange={(e) => {
                              const x = parseInt(e.target.value);
                              setTextOverlays((prev) =>
                                prev.map((item) => (item.id === t.id ? { ...item, x } : item))
                              );
                            }}
                            onMouseUp={pushHistory}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400">Position Y</label>
                          <input
                            type="range"
                            min="0"
                            max={canvasRef.current?.height || 800}
                            value={t.y}
                            onChange={(e) => {
                              const y = parseInt(e.target.value);
                              setTextOverlays((prev) =>
                                prev.map((item) => (item.id === t.id ? { ...item, y } : item))
                              );
                            }}
                            onMouseUp={pushHistory}
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 6: STICKERS & SHAPES */}
          {activeTab === 'stickers' && (
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                Emoji & Cyber Badges
              </span>
              <div className="grid grid-cols-4 gap-2">
                {EMOJI_STICKERS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleAddSticker(emoji)}
                    className="p-3 rounded-xl bg-[#121224] hover:bg-purple-900/30 border border-purple-900/20 text-2xl flex items-center justify-center hover:scale-110 transition-transform cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                  Active Stickers ({stickers.length})
                </span>
                <div className="space-y-2 mt-2">
                  {stickers.map((s, idx) => (
                    <div
                      key={s.id}
                      className="p-2.5 rounded-xl bg-[#121224] border border-purple-900/20 flex items-center justify-between text-xs"
                    >
                      <span className="text-base">{s.content}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="30"
                          max="200"
                          value={s.width}
                          onChange={(e) => {
                            const w = parseInt(e.target.value);
                            setStickers((prev) =>
                              prev.map((item) =>
                                item.id === s.id ? { ...item, width: w, height: w } : item
                              )
                            );
                          }}
                          onMouseUp={pushHistory}
                          className="w-20"
                        />
                        <button
                          onClick={() => {
                            setStickers(stickers.filter((item) => item.id !== s.id));
                            pushHistory();
                          }}
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
