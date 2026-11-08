import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Body parsers with generous limits for media/audio base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper to initialize GoogleGenAI securely
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health & status endpoint
app.get('/api/health', (req, res) => {
  const apiKeyConfigured = Boolean(
    process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
  );
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    geminiConfigured: apiKeyConfigured,
    appName: 'NOVA EDITOR AI',
  });
});

// Gemini AI - Image Generation API
app.post('/api/gemini/generate-image', async (req, res) => {
  try {
    const { prompt, aspectRatio = '1:1' } = req.body;
    if (!prompt) {
      return res.status(400).json({ ok: false, error: 'Prompt is required' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        ok: false,
        error: 'Gemini API key is not configured in Settings > Secrets. Please configure your key to use cloud AI features.',
      });
    }

    // Call gemini-3.1-flash-lite-image or gemini-2.5-flash-image
    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: (['1:1', '3:4', '4:3', '9:16', '16:9'].includes(aspectRatio) ? aspectRatio : '1:1') as any,
        outputMimeType: 'image/jpeg',
      },
    });

    const generatedImage = response.generatedImages?.[0];
    if (generatedImage?.image?.imageBytes) {
      const base64 = generatedImage.image.imageBytes;
      const dataUrl = `data:image/jpeg;base64,${base64}`;
      return res.json({ ok: true, imageUrl: dataUrl });
    }

    return res.status(500).json({ ok: false, error: 'No image data returned from AI service.' });
  } catch (error: any) {
    console.error('Error generating image:', error);
    return res.status(500).json({
      ok: false,
      error: error?.message || 'Failed to generate image with AI',
    });
  }
});

// Gemini AI - Smart Color Grading & Creative Suggestions
app.post('/api/gemini/analyze-and-suggest', async (req, res) => {
  try {
    const { mode, context, imageBase64 } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(503).json({
        ok: false,
        error: 'Gemini API key is not configured in Settings > Secrets.',
      });
    }

    let prompt = '';
    const parts: any[] = [];

    if (imageBase64) {
      // Clean base64 header if present
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: cleanBase64,
        },
      });
    }

    if (mode === 'color_grading') {
      prompt = `You are a Hollywood colorist and visual master.
Analyze this image or request (${context || 'modern cinematic aesthetic'}) and suggest color grading parameters.
Return a strictly valid JSON object with these exact keys:
{
  "title": "Style title (e.g. Cyberpunk Teal & Orange / Golden Nostalgia / Noir High Contrast)",
  "description": "Short explanation of the mood and aesthetic",
  "brightness": integer between -40 and 40,
  "contrast": integer between -40 and 60,
  "saturation": integer between -50 and 60,
  "vibrance": integer between -30 and 50,
  "exposure": integer between -30 and 40,
  "warmth": integer between -50 and 50,
  "tint": integer between -40 and 40,
  "vignette": integer between 0 and 60,
  "sharpen": integer between 0 and 40,
  "filterName": "preset name (e.g. Cinematic, Cyberpunk, Golden, Noir, Emerald, Pastel)",
  "creativeTips": ["tip 1", "tip 2", "tip 3"]
}
Only output the JSON object, nothing else.`;
    } else if (mode === 'voiceover_script') {
      prompt = `You are an award-winning video producer and scriptwriter.
Write an engaging voiceover script and scene pacing for: "${context || 'Cinematic video promo'}".
Return a strictly valid JSON object with:
{
  "title": "Script Title",
  "estimatedDurationSeconds": 30,
  "tone": "Energetic / Cinematic / Inspiring / Dramatic",
  "lines": [
    { "timestamp": "00:00", "speaker": "Narrator", "text": "...", "soundCue": "Bass drop / soft synth" }
  ],
  "creativeDirection": "Advice for video editing cuts and transitions"
}
Only output the JSON object, nothing else.`;
    } else {
      prompt = `You are an expert video and photo creative director for NOVA EDITOR AI.
Provide creative editing ideas, transition ideas, and music pairing for: "${context || 'general video project'}".
Return a strictly valid JSON object with:
{
  "headline": "Creative direction headline",
  "visualPacing": "Fast cuts / slow contemplative / beat-synced",
  "transitions": ["transition 1", "transition 2"],
  "colorPaletteAdvice": "Description of lighting and color mood",
  "audioSoundtrackAdvice": "Type of beats or ambient texture",
  "subtitlesAdvice": "Font style and animation recommendations"
}
Only output the JSON object, nothing else.`;
    }

    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    let parsed = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text };
    }

    return res.json({ ok: true, data: parsed });
  } catch (error: any) {
    console.error('Error in analyze-and-suggest:', error);
    return res.status(500).json({
      ok: false,
      error: error?.message || 'Failed to generate suggestions with AI',
    });
  }
});

// Gemini AI - Speech-to-Text / Audio Subtitle Generation
app.post('/api/gemini/transcribe-audio', async (req, res) => {
  try {
    const { audioBase64, mimeType = 'audio/webm' } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ ok: false, error: 'Audio data is required' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        ok: false,
        error: 'Gemini API key is not configured in Settings > Secrets.',
      });
    }

    const cleanBase64 = audioBase64.replace(/^data:audio\/\w+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType.includes('wav') ? 'audio/wav' : 'audio/webm',
              data: cleanBase64,
            },
          },
          {
            text: `Transcribe this speech accurately with timestamps formatted for video subtitles.
Return a valid JSON array of subtitle cues:
[
  { "id": 1, "start": 0.0, "end": 2.5, "text": "Transcribed phrase" }
]
Output only the JSON array.`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '[]';
    let subtitles = [];
    try {
      subtitles = JSON.parse(text);
    } catch {
      subtitles = [{ id: 1, start: 0, end: 5, text: text }];
    }

    return res.json({ ok: true, subtitles });
  } catch (error: any) {
    console.error('Error transcribing audio:', error);
    return res.status(500).json({
      ok: false,
      error: error?.message || 'Failed to transcribe audio with AI',
    });
  }
});

// Mount Vite middleware in development or static files in production
async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`NOVA EDITOR AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
