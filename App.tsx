import React, { useState, useEffect, useCallback } from 'react';
import { Header, ActiveTab } from './components/layout/Header';
import { Dashboard } from './components/dashboard/Dashboard';
import { PhotoEditor } from './components/photo/PhotoEditor';
import { VideoEditor } from './components/video/VideoEditor';
import { AudioStudio } from './components/audio/AudioStudio';
import { MasterTimeline } from './components/timeline/MasterTimeline';
import { AiCreativeStudio } from './components/ai/AiCreativeStudio';
import { ExportCenter } from './components/export/ExportCenter';
import { CameraModal } from './components/common/CameraModal';
import {
  Project,
  getAllProjects,
  saveProject,
  PhotoProjectState,
  VideoProjectState,
  AudioProjectState,
  MasterTimelineClip,
} from './services/storage';
import { createDefaultSampleImage } from './services/photoEngine';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Load all projects on initial mount
  const refreshProjects = useCallback(async () => {
    try {
      const projs = await getAllProjects();
      setProjects(projs);

      if (projs.length > 0 && !activeProject) {
        setActiveProject(projs[0]);
      } else if (projs.length === 0) {
        // Create initial starter project with sample image
        const starter: Project = {
          id: 'proj_starter',
          name: 'Cyberpunk Master Project',
          type: 'unified',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          photoState: {
            imageSrc: createDefaultSampleImage(),
            originalImageSrc: createDefaultSampleImage(),
            adjustments: {
              brightness: 0,
              contrast: 15,
              saturation: 20,
              vibrance: 10,
              exposure: 0,
              warmth: 0,
              tint: 0,
              vignette: 15,
              blur: 0,
              sepia: 0,
              vintage: 0,
              sharpen: 10,
              invert: 0,
            },
            filterPreset: 'cyberpunk',
            filterIntensity: 80,
            rotation: 0,
            flipH: false,
            flipV: false,
            cropBox: null,
            textOverlays: [
              {
                id: 'txt_init',
                text: 'NOVA MASTER AI',
                x: 600,
                y: 160,
                fontSize: 54,
                fontFamily: 'Plus Jakarta Sans',
                fillColor: '#ffffff',
                strokeColor: '#a855f7',
                strokeWidth: 4,
                rotation: 0,
                opacity: 1,
              },
            ],
            stickers: [
              {
                id: 'stk_init',
                type: 'emoji',
                content: '⚡',
                x: 600,
                y: 280,
                width: 60,
                height: 60,
                rotation: 0,
                opacity: 1,
              },
            ],
          },
        };
        await saveProject(starter);
        setProjects([starter]);
        setActiveProject(starter);
      }
    } catch (err) {
      console.error('Failed to load projects from IndexedDB:', err);
    }
  }, [activeProject]);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  // Handle Quick Save
  const handleQuickSave = async () => {
    if (!activeProject) return;
    setIsSaving(true);
    try {
      await saveProject(activeProject);
      await refreshProjects();
    } catch (err) {
      console.error('Error saving project:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Create new project
  const handleCreateProject = async (
    type: 'photo' | 'video' | 'audio' | 'unified',
    name?: string
  ) => {
    const newProj: Project = {
      id: 'proj_' + Math.random().toString(36).substring(2, 9),
      name: name || `New ${type.toUpperCase()} Project`,
      type,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      photoState:
        type === 'photo' || type === 'unified'
          ? {
              imageSrc: createDefaultSampleImage(),
              originalImageSrc: createDefaultSampleImage(),
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
              filterPreset: 'normal',
              filterIntensity: 100,
              rotation: 0,
              flipH: false,
              flipV: false,
              cropBox: null,
              textOverlays: [],
              stickers: [],
            }
          : undefined,
    };

    await saveProject(newProj);
    setActiveProject(newProj);
    await refreshProjects();
  };

  // Update Photo State
  const handleUpdatePhotoState = (state: PhotoProjectState) => {
    if (!activeProject) return;
    const updated: Project = {
      ...activeProject,
      photoState: state,
      thumbnail: state.imageSrc || undefined,
      updatedAt: Date.now(),
    };
    setActiveProject(updated);
    // Autosave to IndexedDB
    saveProject(updated).catch(console.warn);
  };

  // Update Video State
  const handleUpdateVideoState = (state: VideoProjectState) => {
    if (!activeProject) return;
    const updated: Project = {
      ...activeProject,
      videoState: state,
      updatedAt: Date.now(),
    };
    setActiveProject(updated);
    saveProject(updated).catch(console.warn);
  };

  // Update Audio State
  const handleUpdateAudioState = (state: AudioProjectState) => {
    if (!activeProject) return;
    const updated: Project = {
      ...activeProject,
      audioState: state,
      updatedAt: Date.now(),
    };
    setActiveProject(updated);
    saveProject(updated).catch(console.warn);
  };

  // Update Timeline Clips
  const handleUpdateTimeline = (clips: MasterTimelineClip[]) => {
    if (!activeProject) return;
    const updated: Project = {
      ...activeProject,
      timelineClips: clips,
      updatedAt: Date.now(),
    };
    setActiveProject(updated);
    saveProject(updated).catch(console.warn);
  };

  // Camera Photo Snap
  const handleCapturePhoto = (dataUrl: string) => {
    if (activeProject) {
      handleUpdatePhotoState({
        imageSrc: dataUrl,
        originalImageSrc: dataUrl,
        adjustments: activeProject.photoState?.adjustments || {
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
        filterPreset: 'normal',
        filterIntensity: 100,
        rotation: 0,
        flipH: false,
        flipV: false,
        cropBox: null,
        textOverlays: [],
        stickers: [],
      });
      setActiveTab('photo');
    }
  };

  // Camera Video Capture
  const handleCaptureVideo = (videoUrl: string) => {
    if (activeProject) {
      const existingClips = activeProject.videoState?.clips || [];
      const newClip = {
        id: 'clip_' + Math.random().toString(36).substring(2, 8),
        name: 'Camera Recording',
        src: videoUrl,
        duration: 5,
        startTime: 0,
        trimIn: 0,
        trimOut: 5,
        speed: 1,
        volume: 1,
        muted: false,
        filter: 'normal',
        trackIndex: 0,
      };
      handleUpdateVideoState({
        clips: [...existingClips, newClip],
        subtitles: activeProject.videoState?.subtitles || [],
        aspectRatio: activeProject.videoState?.aspectRatio || '16:9',
        duration: 5,
        currentTime: 0,
        audioTrackVolume: 1,
        brightness: 0,
        contrast: 0,
        saturation: 0,
        warmth: 0,
      });
      setActiveTab('video');
    }
  };

  // Apply AI Color Grading to Active Projects
  const handleApplyColorGrading = (grading: any) => {
    if (activeProject) {
      if (activeProject.photoState) {
        handleUpdatePhotoState({
          ...activeProject.photoState,
          adjustments: {
            ...activeProject.photoState.adjustments,
            ...grading,
          },
        });
      }
      if (activeProject.videoState) {
        handleUpdateVideoState({
          ...activeProject.videoState,
          brightness: grading.brightness ?? 0,
          contrast: grading.contrast ?? 0,
          saturation: grading.saturation ?? 0,
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#07070d] text-slate-100 flex flex-col selection:bg-purple-600 selection:text-white">
      {/* Universal Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenQuickCamera={() => setIsCameraOpen(true)}
        onQuickSave={handleQuickSave}
        isSaving={isSaving}
        projectName={activeProject?.name}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 flex flex-col">
        {activeTab === 'dashboard' && (
          <Dashboard
            projects={projects}
            activeProject={activeProject}
            onSelectProject={setActiveProject}
            onCreateProject={handleCreateProject}
            onRefreshProjects={refreshProjects}
            onTabChange={setActiveTab}
            onOpenQuickCamera={() => setIsCameraOpen(true)}
          />
        )}

        {activeTab === 'photo' && (
          <PhotoEditor
            project={activeProject}
            onUpdateProjectState={handleUpdatePhotoState}
            onOpenQuickCamera={() => setIsCameraOpen(true)}
          />
        )}

        {activeTab === 'video' && (
          <VideoEditor
            project={activeProject}
            onUpdateProjectState={handleUpdateVideoState}
            onOpenQuickCamera={() => setIsCameraOpen(true)}
          />
        )}

        {activeTab === 'audio' && (
          <AudioStudio
            project={activeProject}
            onUpdateProjectState={handleUpdateAudioState}
          />
        )}

        {activeTab === 'timeline' && (
          <MasterTimeline
            project={activeProject}
            onUpdateTimeline={handleUpdateTimeline}
          />
        )}

        {activeTab === 'ai' && (
          <AiCreativeStudio
            project={activeProject}
            onApplyColorGrading={handleApplyColorGrading}
            onAddGeneratedImageToPhoto={(url) => {
              handleCapturePhoto(url);
              setActiveTab('photo');
            }}
            onAddSubtitlesToVideo={(subs) => {
              if (activeProject?.videoState) {
                handleUpdateVideoState({
                  ...activeProject.videoState,
                  subtitles: subs,
                });
              }
              setActiveTab('video');
            }}
          />
        )}

        {activeTab === 'export' && (
          <ExportCenter
            project={activeProject}
            onOpenQuickCamera={() => setIsCameraOpen(true)}
          />
        )}
      </main>

      {/* Camera Capture Modal */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapturePhoto={handleCapturePhoto}
        onCaptureVideo={handleCaptureVideo}
      />
    </div>
  );
}
