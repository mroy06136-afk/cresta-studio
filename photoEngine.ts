/**
 * Professional HTML5 Canvas Photo Processing Engine for NOVA EDITOR AI
 * Supports real-time pixel adjustments, convolution sharpening, vintage tone curves,
 * vignetting, text overlays, stickers, retouch erasing, and high-res export.
 */

import { PhotoAdjustments, TextOverlay, StickerOverlay } from './storage';

export const FILTER_PRESETS: Record<
  string,
  { name: string; adjustments: Partial<PhotoAdjustments>; label: string; tag: string }
> = {
  normal: {
    name: 'Normal',
    label: 'Original',
    tag: 'Neutral',
    adjustments: {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      vibrance: 0,
      exposure: 0,
      warmth: 0,
      tint: 0,
      vignette: 0,
      blur: 0,
      sepia: 0,
      vintage: 0,
      sharpen: 0,
      invert: 0,
    },
  },
  cyberpunk: {
    name: 'Cyberpunk',
    label: 'Cyberpunk',
    tag: 'Neon Sci-Fi',
    adjustments: {
      contrast: 28,
      saturation: 45,
      vibrance: 35,
      warmth: -20,
      tint: 30,
      vignette: 25,
      sharpen: 20,
    },
  },
  cinematic: {
    name: 'Teal & Orange',
    label: 'Cinematic',
    tag: 'Hollywood LUT',
    adjustments: {
      contrast: 22,
      saturation: 20,
      warmth: 24,
      tint: -15,
      vignette: 30,
      sharpen: 15,
    },
  },
  golden_hour: {
    name: 'Golden Hour',
    label: 'Golden Hour',
    tag: 'Sunset Warmth',
    adjustments: {
      brightness: 8,
      contrast: 12,
      saturation: 30,
      warmth: 48,
      tint: -5,
      vignette: 18,
    },
  },
  noir_vintage: {
    name: 'Noir Drama',
    label: 'Noir B&W',
    tag: 'Classic 35mm',
    adjustments: {
      contrast: 40,
      saturation: -100,
      vibrance: -100,
      exposure: -5,
      vignette: 45,
      sharpen: 30,
      vintage: 40,
    },
  },
  emerald_matrix: {
    name: 'Matrix Emerald',
    label: 'Matrix',
    tag: 'Acid Green',
    adjustments: {
      contrast: 30,
      saturation: 15,
      warmth: -25,
      tint: -45,
      vignette: 35,
      sharpen: 25,
    },
  },
  vaporwave: {
    name: 'Vaporwave',
    label: 'Vaporwave',
    tag: 'Retro Pastel',
    adjustments: {
      brightness: 12,
      contrast: 15,
      saturation: 40,
      warmth: -10,
      tint: 40,
      vignette: 15,
    },
  },
  vivid_hdr: {
    name: 'Vivid HDR',
    label: 'Vivid HDR',
    tag: 'High Dynamic',
    adjustments: {
      contrast: 30,
      saturation: 40,
      vibrance: 45,
      exposure: 5,
      sharpen: 35,
      vignette: 10,
    },
  },
  pastel_soft: {
    name: 'Pastel Dream',
    label: 'Pastel Dream',
    tag: 'Aesthetic Soft',
    adjustments: {
      brightness: 15,
      contrast: -12,
      saturation: -10,
      vibrance: 15,
      warmth: 15,
      blur: 2,
    },
  },
  lofi_chrome: {
    name: 'Lo-Fi Chrome',
    label: 'Lo-Fi Chrome',
    tag: 'Analog Film',
    adjustments: {
      brightness: -5,
      contrast: 25,
      saturation: -25,
      warmth: 10,
      vintage: 65,
      vignette: 40,
      sepia: 20,
    },
  },
};

export const DEFAULT_ADJUSTMENTS: PhotoAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  vibrance: 0,
  exposure: 0,
  warmth: 0,
  tint: 0,
  vignette: 0,
  blur: 0,
  sepia: 0,
  vintage: 0,
  sharpen: 0,
  invert: 0,
};

/**
 * Applies full pixel manipulation to canvas ImageData
 */
export function applyAdjustmentsToImageData(
  imageData: ImageData,
  adj: PhotoAdjustments,
  filterPresetName: string = 'normal',
  intensity: number = 100
) {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  // Combine preset with user adjustments scaled by filter intensity
  const preset = FILTER_PRESETS[filterPresetName]?.adjustments || {};
  const factor = intensity / 100;

  const b = (adj.brightness + (preset.brightness || 0) * factor) * 2.55;
  const c = (adj.contrast + (preset.contrast || 0) * factor) / 100;
  const contrastFactor = (259 * (c * 255 + 255)) / (255 * (259 - c * 255));
  const sat = 1 + (adj.saturation + (preset.saturation || 0) * factor) / 100;
  const vib = (adj.vibrance + (preset.vibrance || 0) * factor) / 100;
  const expFactor = Math.pow(2, (adj.exposure + (preset.exposure || 0) * factor) / 50);
  const warmth = (adj.warmth + (preset.warmth || 0) * factor) / 100;
  const tint = (adj.tint + (preset.tint || 0) * factor) / 100;
  const sepia = Math.min(100, Math.max(0, adj.sepia + (preset.sepia || 0) * factor)) / 100;
  const vintage = Math.min(100, Math.max(0, adj.vintage + (preset.vintage || 0) * factor)) / 100;
  const invert = Math.min(100, Math.max(0, adj.invert + (preset.invert || 0) * factor)) / 100;

  const cx = width / 2;
  const cy = height / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);
  const vignetteAmount = (adj.vignette + (preset.vignette || 0) * factor) / 100;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      let r = data[idx];
      let g = data[idx + 1];
      let bVal = data[idx + 2];

      // Exposure
      if (expFactor !== 1) {
        r *= expFactor;
        g *= expFactor;
        bVal *= expFactor;
      }

      // Brightness
      if (b !== 0) {
        r += b;
        g += b;
        bVal += b;
      }

      // Contrast
      if (contrastFactor !== 1) {
        r = contrastFactor * (r - 128) + 128;
        g = contrastFactor * (g - 128) + 128;
        bVal = contrastFactor * (bVal - 128) + 128;
      }

      // Warmth & Tint
      if (warmth !== 0) {
        r += warmth * 30;
        bVal -= warmth * 30;
      }
      if (tint !== 0) {
        g -= tint * 25;
        r += tint * 15;
        bVal += tint * 15;
      }

      // Saturation & Vibrance
      const gray = 0.299 * r + 0.587 * g + 0.114 * bVal;
      if (sat !== 1) {
        r = gray + sat * (r - gray);
        g = gray + sat * (g - gray);
        bVal = gray + sat * (bVal - gray);
      }
      if (vib !== 0) {
        const max = Math.max(r, g, bVal);
        const avg = (r + g + bVal) / 3;
        const amt = ((max - avg) / 255) * -vib;
        r += (max - r) * amt;
        g += (max - g) * amt;
        bVal += (max - bVal) * amt;
      }

      // Sepia tone
      if (sepia > 0) {
        const sr = r * 0.393 + g * 0.769 + bVal * 0.189;
        const sg = r * 0.349 + g * 0.686 + bVal * 0.168;
        const sb = r * 0.272 + g * 0.534 + bVal * 0.131;
        r = r * (1 - sepia) + sr * sepia;
        g = g * (1 - sepia) + sg * sepia;
        bVal = bVal * (1 - sepia) + sb * sepia;
      }

      // Vintage curve (fade shadows and lift blacks, slight warm highlight)
      if (vintage > 0) {
        const v = vintage * 0.4;
        r = r * (1 - v) + (r * 0.9 + 25) * v;
        g = g * (1 - v) + (g * 0.85 + 20) * v;
        bVal = bVal * (1 - v) + (bVal * 0.75 + 35) * v;
      }

      // Invert
      if (invert > 0) {
        r = r * (1 - invert) + (255 - r) * invert;
        g = g * (1 - invert) + (255 - g) * invert;
        bVal = bVal * (1 - invert) + (255 - bVal) * invert;
      }

      // Vignette
      if (vignetteAmount > 0) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const vigFactor = Math.max(0, 1 - (dist / maxDist) * vignetteAmount * 1.2);
        r *= vigFactor;
        g *= vigFactor;
        bVal *= vigFactor;
      }

      data[idx] = Math.min(255, Math.max(0, r));
      data[idx + 1] = Math.min(255, Math.max(0, g));
      data[idx + 2] = Math.min(255, Math.max(0, bVal));
    }
  }

  // Sharpening via convolution kernel if sharpen > 0
  const sharpenVal = adj.sharpen + (preset.sharpen || 0) * factor;
  if (sharpenVal > 0) {
    applySharpenKernel(imageData, sharpenVal / 100);
  }
}

function applySharpenKernel(imageData: ImageData, amount: number) {
  const src = new Uint8ClampedArray(imageData.data);
  const dst = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  // 3x3 sharpen kernel: [0, -a, 0, -a, 1 + 4a, -a, 0, -a, 0]
  const a = amount * 0.75;
  const center = 1 + 4 * a;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const top = ((y - 1) * width + x) * 4;
      const bottom = ((y + 1) * width + x) * 4;
      const left = (y * width + (x - 1)) * 4;
      const right = (y * width + (x + 1)) * 4;

      for (let c = 0; c < 3; c++) {
        const val =
          src[idx + c] * center -
          (src[top + c] + src[bottom + c] + src[left + c] + src[right + c]) * a;
        dst[idx + c] = Math.min(255, Math.max(0, val));
      }
    }
  }
}

/**
 * Removes background using intelligent color & luminance edge flood-fill
 */
export function removeBackgroundCanvas(
  canvas: HTMLCanvasElement,
  tolerance: number = 32
): HTMLCanvasElement {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Sample corner pixels to determine background colors
  const corners = [
    0, // top-left
    (width - 1) * 4, // top-right
    ((height - 1) * width) * 4, // bottom-left
    ((height - 1) * width + (width - 1)) * 4, // bottom-right
  ];

  const bgR = (data[corners[0]] + data[corners[1]] + data[corners[2]] + data[corners[3]]) / 4;
  const bgG =
    (data[corners[0] + 1] + data[corners[1] + 1] + data[corners[2] + 1] + data[corners[3] + 1]) / 4;
  const bgB =
    (data[corners[0] + 2] + data[corners[1] + 2] + data[corners[2] + 2] + data[corners[3] + 2]) / 4;

  const tolSq = tolerance * tolerance * 3;

  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - bgR;
    const dg = data[i + 1] - bgG;
    const db = data[i + 2] - bgB;
    const distSq = dr * dr + dg * dg + db * db;

    if (distSq < tolSq) {
      // Soft falloff for edge anti-aliasing
      const alpha = Math.min(255, Math.max(0, ((distSq / tolSq) - 0.7) * 255 * 3));
      data[i + 3] = alpha;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Creates high resolution default sample image for testing
 */
export function createDefaultSampleImage(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 800;
  const ctx = canvas.getContext('2d')!;

  // Dark cyber-sunset background gradient
  const grad = ctx.createLinearGradient(0, 0, 1200, 800);
  grad.addColorStop(0, '#0a0b1e');
  grad.addColorStop(0.4, '#1e1145');
  grad.addColorStop(0.7, '#6b21a8');
  grad.addColorStop(1, '#ec4899');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1200, 800);

  // Futuristic sun / portal
  const sunGrad = ctx.createRadialGradient(600, 480, 20, 600, 480, 220);
  sunGrad.addColorStop(0, '#fef08a');
  sunGrad.addColorStop(0.3, '#f97316');
  sunGrad.addColorStop(0.7, '#db2777');
  sunGrad.addColorStop(1, 'rgba(219, 39, 119, 0)');
  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.arc(600, 480, 220, 0, Math.PI * 2);
  ctx.fill();

  // Grid lines
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
  ctx.lineWidth = 2;
  for (let x = 0; x <= 1200; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 480);
    ctx.lineTo(600 + (x - 600) * 2.5, 800);
    ctx.stroke();
  }
  for (let y = 480; y <= 800; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1200, y);
    ctx.stroke();
  }

  // Mountain silhouettes
  ctx.fillStyle = '#080811';
  ctx.beginPath();
  ctx.moveTo(0, 480);
  ctx.lineTo(180, 360);
  ctx.lineTo(340, 440);
  ctx.lineTo(490, 310);
  ctx.lineTo(600, 410);
  ctx.lineTo(760, 280);
  ctx.lineTo(920, 400);
  ctx.lineTo(1080, 330);
  ctx.lineTo(1200, 480);
  ctx.lineTo(1200, 800);
  ctx.lineTo(0, 800);
  ctx.closePath();
  ctx.fill();

  // Neon text badge
  ctx.font = '800 64px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#a855f7';
  ctx.shadowBlur = 25;
  ctx.fillText('NOVA STUDIO AI', 600, 160);

  ctx.font = '500 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 15;
  ctx.fillText('PRO MASTER PHOTO & VIDEO SUITE', 600, 210);

  return canvas.toDataURL('image/png');
}
