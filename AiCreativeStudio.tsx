import React, { useState, useEffect } from 'react';
import {
  Wand2,
  Sparkles,
  Image as ImageIcon,
  Sliders,
  Type,
  Mic,
  ArrowRight,
  Download,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Palette,
  FileText,
  Send,
  Eye,
  Plus,
} from 'lucide-react';
import { Project, PhotoProjectState, VideoProjectState } from '../../services/storage';

interface AiCreativeStudioProps {
  project: Project | null;
  onApplyColorGrading: (grading: any) => void;
  onAddGeneratedImageToPhoto: (dataUrl: string) => void;
  onAddSubtitlesToVideo: (subtitles: any[]) => void;
}

type AiTab = 'image_gen' | 'color_grading' | 'voiceover' | 'creative_director' | 'speech_to_text';

export const AiCreativeStudio: React.FC<AiCreativeStudioProps> = ({
  project,
  onApplyColorGrading,
  onAddGeneratedImageToPhoto,
  onAddSubtitlesToVideo,
}) => {
  const [activeTab, setActiveTab] = useState<AiTab>('color_grading');
  const [apiHealth, setApiHealth] = useState<{ geminiConfigured: boolean } | null>(null);

  // Image Generation State
  const [imagePrompt, setImagePrompt] = useState<string>('Futuristic cyberpunk skyline with neon purple and cyan holographic billboards');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16'>('16:9');
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  // Color Grading Suggestions State
  const [gradingMood, setGradingMood] = useState<string>('Hollywood Teal & Orange Sci-Fi Action Movie');
  const [isAnalyzingGrading, setIsAnalyzingGrading] = useState<boolean>(false);
  const [gradingResult, setGradingResult] = useState<any>(null);
  const [gradingError, setGradingError] = useState<string | null>(null);

  // Voiceover Script State
  const [scriptTopic, setScriptTopic] = useState<string>('Teaser trailer for a high-octane cyber racing game');
  const [isGeneratingScript, setIsGeneratingScript] = useState<boolean>(false);
  const [scriptResult, setScriptResult] = useState<any>(null);

  // Speech to Text Subtitles State
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcribedSubs, setTranscribedSubs] = useState<any[]>([]);

  // Status message
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check server health
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setApiHealth(data))
      .catch(() => setApiHealth({ geminiConfigured: false }));
  }, []);

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // 1. Generate Image with AI
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;
    setIsGeneratingImage(true);
    setImageError(null);
    setGeneratedImageUrl(null);

    try {
      const res = await fetch('/api/gemini/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imagePrompt, aspectRatio }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }
      setGeneratedImageUrl(data.imageUrl);
      showStatus('AI image generated successfully!');
    } catch (err: any) {
      console.error(err);
      setImageError(
        err.message ||
          'AI service unavailable. Please check your internet connection or configure Gemini API in Settings > Secrets.'
      );
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // 2. Hollywood Color Grading suggestions
  const handleAnalyzeColorGrading = async () => {
    setIsAnalyzingGrading(true);
    setGradingError(null);
    setGradingResult(null);

    try {
      const res = await fetch('/api/gemini/analyze-and-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'color_grading',
          context: gradingMood,
          imageBase64: project?.photoState?.imageSrc,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Failed to get grading suggestions');
      setGradingResult(json.data);
      showStatus('AI Color Grading recipe ready!');
    } catch (err: any) {
      console.error(err);
      setGradingError(
        err.message ||
          'Failed to connect to Gemini API. Ensure server is online and GEMINI_API_KEY is configured.'
      );
    } finally {
      setIsAnalyzingGrading(false);
    }
  };

  // Apply AI grading to current project
  const handleApplyGradingToProject = () => {
    if (!gradingResult) return;
    onApplyColorGrading({
      brightness: gradingResult.brightness ?? 10,
      contrast: gradingResult.contrast ?? 25,
      saturation: gradingResult.saturation ?? 20,
      vibrance: gradingResult.vibrance ?? 15,
      exposure: gradingResult.exposure ?? 0,
      warmth: gradingResult.warmth ?? 10,
      tint: gradingResult.tint ?? 5,
      vignette: gradingResult.vignette ?? 20,
      sharpen: gradingResult.sharpen ?? 15,
    });
    showStatus('Applied AI Color Grading to active Photo and Video projects!');
  };

  // 3. AI Voiceover Scriptwriter
  const handleGenerateVoiceoverScript = async () => {
    setIsGeneratingScript(true);
    setScriptResult(null);

    try {
      const res = await fetch('/api/gemini/analyze-and-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'voiceover_script',
          context: scriptTopic,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Failed to generate script');
      setScriptResult(json.data);
      showStatus('AI Voiceover Script generated!');
    } catch (err: any) {
      console.error(err);
      showStatus('Script generation failed');
    } finally {
      setIsGeneratingScript(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-8 max-w-6xl mx-auto space-y-6 animate-fadeIn">
      {/* Toast status */}
      {statusMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-purple-600/95 text-white text-xs font-bold shadow-2xl backdrop-blur-md border border-purple-400/50 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          {statusMessage}
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950/70 via-indigo-950/60 to-[#0e0e1e] border border-purple-500/30 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-900/40 border border-purple-500/40 text-purple-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Gemini Multimodal Suite
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            AI Creative Studio
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
            Leverage Gemini 3.8 and Imagen 3 to generate high-resolution art, generate Hollywood color grades, and write scene-by-scene voiceovers.
          </p>
        </div>

        {/* API Connection Honest Status */}
        <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#090914] border border-purple-900/30 text-xs font-medium">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              apiHealth?.geminiConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <div>
            <div className="text-slate-200 font-bold">
              {apiHealth?.geminiConfigured ? 'Gemini AI Ready' : 'API Key Pending'}
            </div>
            <div className="text-[10px] text-slate-400">
              {apiHealth?.geminiConfigured
                ? 'Server proxy configured'
                : 'Configure key in Settings > Secrets'}
            </div>
          </div>
        </div>
      </div>

      {/* AI Tool Selector Navigation */}
      <div className="flex items-center gap-2 border-b border-purple-900/30 overflow-x-auto scrollbar-none pb-2">
        <button
          onClick={() => setActiveTab('color_grading')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'color_grading'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Palette className="w-4 h-4 text-cyan-300" />
          Smart Color Grading
        </button>

        <button
          onClick={() => setActiveTab('image_gen')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'image_gen'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <ImageIcon className="w-4 h-4 text-purple-300" />
          AI Image Generator
        </button>

        <button
          onClick={() => setActiveTab('voiceover')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'voiceover'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <FileText className="w-4 h-4 text-pink-300" />
          AI Voiceover Scriptwriter
        </button>
      </div>

      {/* TAB 1: SMART COLOR GRADING */}
      {activeTab === 'color_grading' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-[#0f0f1e] border border-purple-900/30 space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Palette className="w-5 h-5 text-purple-400" />
              AI Hollywood Color Grading Master
            </h3>
            <p className="text-xs text-slate-400">
              Gemini analyzes your creative theme or current photo preview to calculate professional color grading parameters (lift, gamma, saturation, temperature, and vignette).
            </p>

            <div className="space-y-2">
              <label className="text-xs text-slate-300 font-semibold">Mood / Style Description</label>
              <textarea
                rows={3}
                value={gradingMood}
                onChange={(e) => setGradingMood(e.target.value)}
                placeholder="e.g. Cyberpunk Neon Tokyo at night, cinematic teal and orange highlights..."
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                'Cyberpunk Neon Noir',
                'Golden Hour Sunset',
                'Vintage 70s Film Stock',
                'High Contrast Black & White',
                'Nordic Cold Mystery',
              ].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setGradingMood(preset)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-[11px] text-slate-300 font-medium"
                >
                  {preset}
                </button>
              ))}
            </div>

            <button
              onClick={handleAnalyzeColorGrading}
              disabled={isAnalyzingGrading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-900/40 flex items-center justify-center gap-2"
            >
              <Wand2 className={`w-4 h-4 ${isAnalyzingGrading ? 'animate-spin' : ''}`} />
              {isAnalyzingGrading ? 'Consulting Gemini Color Master...' : 'Analyze & Generate Grade'}
            </button>

            {gradingError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{gradingError}</span>
              </div>
            )}
          </div>

          {/* Result Card */}
          <div className="p-6 rounded-2xl bg-[#0f0f1e] border border-purple-900/30 flex flex-col justify-between">
            {gradingResult ? (
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
                    Recommended LUT
                  </span>
                  <h4 className="text-xl font-extrabold text-white">{gradingResult.title}</h4>
                  <p className="text-xs text-slate-300 mt-1">{gradingResult.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-[#141426] border border-purple-900/30">
                    <span className="text-slate-400">Contrast:</span>{' '}
                    <span className="font-mono text-purple-300 font-bold">
                      {gradingResult.contrast}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#141426] border border-purple-900/30">
                    <span className="text-slate-400">Saturation:</span>{' '}
                    <span className="font-mono text-purple-300 font-bold">
                      {gradingResult.saturation}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#141426] border border-purple-900/30">
                    <span className="text-slate-400">Warmth:</span>{' '}
                    <span className="font-mono text-purple-300 font-bold">
                      {gradingResult.warmth}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#141426] border border-purple-900/30">
                    <span className="text-slate-400">Vignette:</span>{' '}
                    <span className="font-mono text-purple-300 font-bold">
                      {gradingResult.vignette}
                    </span>
                  </div>
                </div>

                {gradingResult.creativeTips && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-300">Creative Advice:</span>
                    <ul className="text-xs text-slate-400 list-disc list-inside space-y-0.5">
                      {gradingResult.creativeTips.map((tip: string, i: number) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  onClick={handleApplyGradingToProject}
                  className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-900/40 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Apply This Grade to Project
                </button>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-2 py-12">
                <Palette className="w-12 h-12 text-slate-700" />
                <p className="text-xs">Describe your desired mood and click generate to see recipe.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: AI IMAGE GENERATION */}
      {activeTab === 'image_gen' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-[#0f0f1e] border border-purple-900/30 space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-purple-400" />
              AI Studio Image Synthesis
            </h3>
            <p className="text-xs text-slate-400">
              Generate photorealistic, cyberpunk, cinematic, or 3D visual assets directly into your photo studio.
            </p>

            <div className="space-y-2">
              <label className="text-xs text-slate-300 font-semibold">Image Prompt</label>
              <textarea
                rows={4}
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="A high quality neon aesthetic scene..."
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-300 font-semibold">Aspect Ratio</label>
              <div className="flex gap-2">
                {(['1:1', '16:9', '9:16'] as const).map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      aspectRatio === ratio
                        ? 'bg-purple-600 border-purple-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerateImage}
              disabled={isGeneratingImage}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-900/40 flex items-center justify-center gap-2"
            >
              <Wand2 className={`w-4 h-4 ${isGeneratingImage ? 'animate-spin' : ''}`} />
              {isGeneratingImage ? 'Synthesizing Image with Imagen...' : 'Generate AI Image'}
            </button>

            {imageError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{imageError}</span>
              </div>
            )}
          </div>

          {/* Generated Result Preview */}
          <div className="p-6 rounded-2xl bg-[#0f0f1e] border border-purple-900/30 flex flex-col justify-between">
            {generatedImageUrl ? (
              <div className="space-y-4">
                <div className="relative aspect-video rounded-xl overflow-hidden border border-purple-900/40 bg-black">
                  <img
                    src={generatedImageUrl}
                    alt="AI Generated"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onAddGeneratedImageToPhoto(generatedImageUrl)}
                    className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-900/50"
                  >
                    <Plus className="w-4 h-4" />
                    Open in Photo Editor
                  </button>
                  <a
                    href={generatedImageUrl}
                    download="nova-ai-image.jpg"
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-2 py-12">
                <ImageIcon className="w-12 h-12 text-slate-700" />
                <p className="text-xs">Enter your prompt and generate to preview here.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: AI VOICEOVER SCRIPTWRITER */}
      {activeTab === 'voiceover' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-[#0f0f1e] border border-purple-900/30 space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-pink-400" />
              AI Scriptwriter & Narrative Director
            </h3>
            <p className="text-xs text-slate-400">
              Generates timed voiceover scripts with sound cue direction and speech rhythm for your video edits.
            </p>

            <div className="space-y-2">
              <label className="text-xs text-slate-300 font-semibold">Video Story / Topic</label>
              <textarea
                rows={4}
                value={scriptTopic}
                onChange={(e) => setScriptTopic(e.target.value)}
                placeholder="What is your video about?"
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              onClick={handleGenerateVoiceoverScript}
              disabled={isGeneratingScript}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-pink-900/40 flex items-center justify-center gap-2"
            >
              <Wand2 className={`w-4 h-4 ${isGeneratingScript ? 'animate-spin' : ''}`} />
              {isGeneratingScript ? 'Writing Script with Gemini...' : 'Generate Voiceover Script'}
            </button>
          </div>

          <div className="p-6 rounded-2xl bg-[#0f0f1e] border border-purple-900/30 flex flex-col justify-between">
            {scriptResult ? (
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                <div>
                  <h4 className="text-lg font-bold text-white">{scriptResult.title}</h4>
                  <div className="text-xs text-pink-400 font-semibold mt-0.5">
                    Tone: {scriptResult.tone} • Est. Duration: {scriptResult.estimatedDurationSeconds}s
                  </div>
                </div>

                <div className="space-y-2">
                  {scriptResult.lines?.map((line: any, index: number) => (
                    <div
                      key={index}
                      className="p-3 rounded-xl bg-[#121224] border border-purple-900/30 space-y-1"
                    >
                      <div className="flex justify-between text-[11px] text-cyan-300 font-mono">
                        <span>{line.speaker || 'Narrator'} ({line.timestamp})</span>
                        <span className="text-purple-300 text-[10px]">{line.soundCue}</span>
                      </div>
                      <p className="text-xs text-white leading-relaxed">{line.text}</p>
                    </div>
                  ))}
                </div>

                {scriptResult.creativeDirection && (
                  <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/20 text-xs text-slate-300">
                    <span className="font-bold text-purple-300 block mb-1">Director's Note:</span>
                    {scriptResult.creativeDirection}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-2 py-12">
                <FileText className="w-12 h-12 text-slate-700" />
                <p className="text-xs">Describe your scene and generate timed narrator lines.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
