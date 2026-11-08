/**
 * IndexedDB and Persistent Storage Service for NOVA EDITOR AI
 * Supports offline storage, media caching, project backups, and instant restore.
 */

export interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  rotation: number;
  opacity: number;
}

export interface StickerOverlay {
  id: string;
  type: 'emoji' | 'shape' | 'badge';
  content: string; // emoji char or svg shape identifier
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
}

export interface PhotoAdjustments {
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100
  vibrance: number; // -100 to 100
  exposure: number; // -100 to 100
  warmth: number; // -100 to 100 (temperature)
  tint: number; // -100 to 100
  vignette: number; // 0 to 100
  blur: number; // 0 to 50
  sepia: number; // 0 to 100
  vintage: number; // 0 to 100
  sharpen: number; // 0 to 100
  invert: number; // 0 to 100
}

export interface PhotoProjectState {
  imageSrc: string | null;
  originalImageSrc: string | null;
  adjustments: PhotoAdjustments;
  filterPreset: string;
  filterIntensity: number; // 0 to 100
  rotation: number; // 0, 90, 180, 270 or arbitrary
  flipH: boolean;
  flipV: boolean;
  cropBox: { x: number; y: number; width: number; height: number } | null;
  textOverlays: TextOverlay[];
  stickers: StickerOverlay[];
  maskDataUrl?: string | null; // For retouching / background removal
}

export interface VideoClip {
  id: string;
  name: string;
  src: string; // Object URL or Base64 / Blob
  duration: number; // in seconds
  startTime: number; // in timeline
  trimIn: number; // trim start
  trimOut: number; // trim end
  speed: number; // 0.5 to 2.0
  volume: number; // 0.0 to 2.0
  muted: boolean;
  filter: string;
  transition?: 'none' | 'fade' | 'glitch' | 'flash' | 'zoom';
  trackIndex: number;
}

export interface SubtitleCue {
  id: string;
  start: number; // seconds
  end: number; // seconds
  text: string;
}

export interface VideoProjectState {
  clips: VideoClip[];
  subtitles: SubtitleCue[];
  aspectRatio: '16:9' | '9:16' | '1:1';
  duration: number;
  currentTime: number;
  audioTrackSrc?: string | null;
  audioTrackVolume: number;
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
}

export interface AudioTrackItem {
  id: string;
  name: string;
  src: string;
  duration: number;
  startTime: number;
  volume: number;
  muted: boolean;
  pan: number; // -1 to 1
  eq: {
    bass: number; // dB -12 to +12
    lowMid: number;
    mid: number;
    highMid: number;
    treble: number;
  };
  trimStart: number;
  trimEnd: number;
  fadeIn: number; // seconds
  fadeOut: number; // seconds
  noiseGate: boolean;
  vocalEnhance: boolean;
  reverb: boolean;
}

export interface AudioProjectState {
  tracks: AudioTrackItem[];
  masterVolume: number;
  bpm: number;
  currentTime: number;
}

export interface MasterTimelineClip {
  id: string;
  trackId: 'video' | 'overlay' | 'subtitle' | 'voiceover' | 'music';
  type: 'video' | 'photo' | 'text' | 'audio';
  name: string;
  src?: string;
  text?: string;
  startTime: number; // seconds
  duration: number; // seconds
  trimIn?: number;
  trimOut?: number;
  volume?: number;
  color?: string;
}

export interface Project {
  id: string;
  name: string;
  type: 'photo' | 'video' | 'audio' | 'unified';
  createdAt: number;
  updatedAt: number;
  thumbnail?: string;
  photoState?: PhotoProjectState;
  videoState?: VideoProjectState;
  audioState?: AudioProjectState;
  timelineClips?: MasterTimelineClip[];
}

const DB_NAME = 'NOVA_EDITOR_AI_DB';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_MEDIA = 'media_blobs';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_MEDIA)) {
        db.createObjectStore(STORE_MEDIA, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveProject(project: Project): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    const store = tx.objectStore(STORE_PROJECTS);
    project.updatedAt = Date.now();
    const req = store.put(project);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getProject(id: string): Promise<Project | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readonly');
    const store = tx.objectStore(STORE_PROJECTS);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllProjects(): Promise<Project[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readonly');
    const store = tx.objectStore(STORE_PROJECTS);
    const req = store.getAll();
    req.onsuccess = () => {
      const projects: Project[] = req.result || [];
      // Sort newest updated first
      projects.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      resolve(projects);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteProject(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    const store = tx.objectStore(STORE_PROJECTS);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function saveMediaBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MEDIA, 'readwrite');
    const store = tx.objectStore(STORE_MEDIA);
    const req = store.put({ id, blob, updatedAt: Date.now() });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getMediaBlob(id: string): Promise<Blob | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MEDIA, 'readonly');
    const store = tx.objectStore(STORE_MEDIA);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result ? req.result.blob : undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function exportProjectBackup(): Promise<string> {
  const projects = await getAllProjects();
  return JSON.stringify({
    appName: 'NOVA EDITOR AI',
    version: '1.0',
    exportDate: new Date().toISOString(),
    projects,
  }, null, 2);
}

export async function importProjectBackup(jsonStr: string): Promise<number> {
  const data = JSON.parse(jsonStr);
  if (!data.projects || !Array.isArray(data.projects)) {
    throw new Error('Invalid backup file format');
  }
  const db = await openDB();
  let count = 0;
  for (const proj of data.projects) {
    if (proj.id && proj.name) {
      await saveProject(proj);
      count++;
    }
  }
  return count;
}
