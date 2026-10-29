import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MediaItem } from '../types/vault';
import {
  Play,
  Pause,
  Scissors,
  Camera,
  Volume2,
  VolumeX,
  Gauge,
  Sliders,
  Sparkles,
  Download,
  Save,
  Check,
  X,
  RotateCcw,
} from 'lucide-react';

interface VideoEditorModalProps {
  item: MediaItem;
  onClose: () => void;
  onSaveVideo: (updatedDataUrl: string, asNew: boolean) => void;
  onCaptureFrame: (frameDataUrl: string) => void;
}

type VideoFilter = 'none' | 'monochrome' | 'nightvision' | 'cyberpunk' | 'high_contrast';

export const VideoEditorModal: React.FC<VideoEditorModalProps> = ({
  item,
  onClose,
  onSaveVideo,
  onCaptureFrame,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Trimming handles
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

  // Audio & playback
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [activeFilter, setActiveFilter] = useState<VideoFilter>('none');

  // Export progress
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [frameCapturedToast, setFrameCapturedToast] = useState(false);

  // Load video metadata
  const handleLoadedMetadata = () => {
    const vid = videoRef.current;
    if (!vid) return;
    const dur = vid.duration || 4;
    setDuration(dur);
    setTrimStart(0);
    setTrimEnd(dur);
  };

  const handleTimeUpdate = () => {
    const vid = videoRef.current;
    if (!vid) return;
    setCurrentTime(vid.currentTime);

    // Loop within trim boundaries during preview
    if (vid.currentTime >= trimEnd && isPlaying) {
      vid.currentTime = trimStart;
    }
  };

  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (isPlaying) {
      vid.pause();
      setIsPlaying(false);
    } else {
      if (vid.currentTime < trimStart || vid.currentTime >= trimEnd) {
        vid.currentTime = trimStart;
      }
      vid.play();
      setIsPlaying(true);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const captureCurrentFrame = () => {
    const vid = videoRef.current;
    if (!vid) return;

    const canvas = document.createElement('canvas');
    canvas.width = vid.videoWidth || 640;
    canvas.height = vid.videoHeight || 360;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Apply any active visual filter to the extracted frame
    ctx.filter = getFilterCss(activeFilter);
    ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);

    const frameUrl = canvas.toDataURL('image/png');
    onCaptureFrame(frameUrl);

    setFrameCapturedToast(true);
    setTimeout(() => setFrameCapturedToast(false), 2200);
  };

  const getFilterCss = (f: VideoFilter): string => {
    switch (f) {
      case 'monochrome':
        return 'grayscale(100%) contrast(120%)';
      case 'nightvision':
        return 'hue-rotate(90deg) saturate(200%) brightness(110%)';
      case 'cyberpunk':
        return 'hue-rotate(240deg) saturate(180%) contrast(130%)';
      case 'high_contrast':
        return 'contrast(160%) brightness(95%)';
      default:
        return 'none';
    }
  };

  // Re-encode trimmed / filtered video using canvas stream and MediaRecorder
  const exportEditedVideo = async (saveAsNew: boolean) => {
    const vid = videoRef.current;
    if (!vid) return;

    setIsExporting(true);
    setExportProgress(10);
    vid.pause();
    setIsPlaying(false);

    const canvas = document.createElement('canvas');
    canvas.width = vid.videoWidth || 640;
    canvas.height = vid.videoHeight || 360;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsExporting(false);
      return;
    }

    const stream = canvas.captureStream(30);
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    } catch {
      recorder = new MediaRecorder(stream);
    }

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const reader = new FileReader();
      reader.onloadend = () => {
        setIsExporting(false);
        onSaveVideo(reader.result as string, saveAsNew);
      };
      reader.readAsDataURL(blob);
    };

    // Prepare recording timeline
    vid.currentTime = trimStart;
    recorder.start();

    const trimDuration = Math.max(0.5, trimEnd - trimStart);
    const stepTime = 1000 / 30;

    const renderLoop = setInterval(() => {
      if (!vid || vid.currentTime >= trimEnd) {
        clearInterval(renderLoop);
        recorder.stop();
        return;
      }

      ctx.filter = getFilterCss(activeFilter);
      ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);

      const progress = Math.min(99, Math.floor(((vid.currentTime - trimStart) / trimDuration) * 100));
      setExportProgress(progress);

      vid.currentTime += 0.033;
    }, stepTime);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between animate-fadeIn text-white">
      {/* Top Bar */}
      <div className="w-full h-16 bg-zinc-900 border-b border-zinc-800 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-sm font-semibold truncate max-w-xs md:max-w-md">
              Secure Video Studio: {item.title}
            </h2>
            <p className="text-[11px] text-zinc-400">
              Trimming, Stealth Color Grading & Frame Extraction
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={captureCurrentFrame}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-cyan-400 text-xs font-medium flex items-center gap-1.5 border border-cyan-500/30 shadow"
            title="Extract High-Res Snapshot into Vault"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Grab Frame</span>
          </button>

          <button
            disabled={isExporting}
            onClick={() => exportEditedVideo(true)}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-emerald-400 text-xs font-medium flex items-center gap-1.5 border border-emerald-500/30"
          >
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">Save as Copy</span>
          </button>

          <button
            disabled={isExporting}
            onClick={() => exportEditedVideo(false)}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-600/30"
          >
            <Check className="w-4 h-4" />
            <span>Apply to Vault</span>
          </button>
        </div>
      </div>

      {/* Frame Captured Toast */}
      {frameCapturedToast && (
        <div className="absolute top-20 bg-emerald-600/90 text-white text-xs px-4 py-2 rounded-full shadow-lg border border-emerald-400/50 flex items-center gap-2 animate-fadeIn z-50">
          <Check className="w-4 h-4" />
          <span>Frame captured and added to your Secret Photo Vault!</span>
        </div>
      )}

      {/* Main Video Viewport */}
      <div className="flex-1 w-full flex flex-col items-center justify-center p-4 relative">
        <video
          ref={videoRef}
          src={item.dataUrl}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          muted={isMuted}
          playsInline
          style={{ filter: getFilterCss(activeFilter) }}
          className="max-h-[58vh] max-w-full rounded-xl shadow-2xl border border-zinc-800 object-contain bg-black"
        />

        {/* Video HUD Overlay Controls */}
        <div className="mt-3 flex items-center gap-4 bg-zinc-900/90 border border-zinc-800 px-4 py-2 rounded-2xl shadow-xl backdrop-blur-md">
          <button
            onClick={togglePlay}
            className="p-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white transition-transform active:scale-90"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          <div className="text-xs font-mono text-zinc-300">
            {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
          </div>

          <div className="h-4 w-px bg-zinc-700" />

          {/* Mute button */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-1.5 rounded-lg ${isMuted ? 'text-red-400 bg-red-950/40' : 'text-zinc-400 hover:text-white'}`}
            title={isMuted ? 'Unmute' : 'Mute Track'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Playback speed */}
          <div className="flex items-center gap-1 text-xs">
            <Gauge className="w-3.5 h-3.5 text-zinc-400" />
            {[0.5, 1, 1.5, 2].map((s) => (
              <button
                key={s}
                onClick={() => handleSpeedChange(s)}
                className={`px-1.5 py-0.5 rounded font-mono ${
                  playbackSpeed === s
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Timeline & Trimming Deck */}
      <div className="w-full bg-zinc-900 border-t border-zinc-800 p-4 flex flex-col gap-3">
        {/* Export progress bar */}
        {isExporting && (
          <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-150"
              style={{ width: `${exportProgress}%` }}
            />
          </div>
        )}

        {/* Trimming Timeline */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <Scissors className="w-3.5 h-3.5" />
              <span>Trim Range:</span>
              <span className="font-mono text-white">
                {trimStart.toFixed(1)}s - {trimEnd.toFixed(1)}s
              </span>
              <span className="text-zinc-500 font-mono">
                (Duration: {(trimEnd - trimStart).toFixed(1)}s)
              </span>
            </div>

            <button
              onClick={() => {
                setTrimStart(0);
                setTrimEnd(duration);
              }}
              className="text-[11px] text-zinc-400 hover:text-emerald-400 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Range</span>
            </button>
          </div>

          {/* Dual range timeline sliders */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Start Handle</span>
              <input
                type="range"
                min="0"
                max={Math.max(0, trimEnd - 0.2)}
                step="0.1"
                value={trimStart}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setTrimStart(val);
                  if (videoRef.current) videoRef.current.currentTime = val;
                }}
                className="accent-emerald-500 h-1.5 bg-zinc-700 rounded-lg cursor-pointer"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">End Handle</span>
              <input
                type="range"
                min={trimStart + 0.2}
                max={duration || 10}
                step="0.1"
                value={trimEnd}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setTrimEnd(val);
                  if (videoRef.current) videoRef.current.currentTime = val;
                }}
                className="accent-emerald-500 h-1.5 bg-zinc-700 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Color Grading / Stealth Video Filters */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-zinc-800 text-xs">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-zinc-400" />
            <span className="text-zinc-400 font-medium">Video Filter:</span>
            {(
              [
                { id: 'none', label: 'Standard' },
                { id: 'monochrome', label: 'B&W Stealth' },
                { id: 'nightvision', label: 'Night Vision' },
                { id: 'cyberpunk', label: 'Cyber Blue' },
                { id: 'high_contrast', label: 'Security Hi-Con' },
              ] as const
            ).map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`px-2.5 py-1 rounded-lg border transition-all ${
                  activeFilter === filter.id
                    ? 'bg-emerald-600 text-white border-emerald-500 font-semibold shadow'
                    : 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <span className="text-[11px] text-zinc-500 italic">
            Trimming and filters run 100% locally on your machine with zero server transmission.
          </span>
        </div>
      </div>
    </div>
  );
};
