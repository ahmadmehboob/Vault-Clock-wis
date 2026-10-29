import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MediaItem } from '../types/vault';
import {
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Sliders,
  Crop,
  ShieldAlert,
  Type,
  PenTool,
  Undo2,
  Save,
  X,
  Check,
  Download,
  Eraser,
} from 'lucide-react';

interface ImageEditorModalProps {
  item: MediaItem;
  onClose: () => void;
  onSave: (updatedDataUrl: string, asNew: boolean) => void;
}

type ToolMode = 'adjust' | 'crop' | 'redact' | 'draw' | 'text';

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({
  item,
  onClose,
  onSave,
}) => {
  const [toolMode, setToolMode] = useState<ToolMode>('adjust');

  // Adjustment state
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [blur, setBlur] = useState(0);
  const [grayscale, setGrayscale] = useState(false);
  const [sepia, setSepia] = useState(false);
  const [invert, setInvert] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  // Redaction / Draw state
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(24);
  const [redactionType, setRedactionType] = useState<'blackout' | 'pixelate'>('blackout');
  const [textInput, setTextInput] = useState('CONFIDENTIAL');
  const [textColor, setTextColor] = useState('#ef4444');

  // History stack for undo
  const [history, setHistory] = useState<ImageData[]>([]);
  const isDrawing = useRef(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const baseImageRef = useRef<HTMLImageElement | null>(null);

  // Load image
  useEffect(() => {
    const img = new Image();
    if (!item.dataUrl.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      baseImageRef.current = img;
      renderBaseImage();
    };
    img.onerror = (e) => {
      console.warn('Image failed to load in editor', e);
    };
    img.src = item.dataUrl;
  }, [item.dataUrl]);

  const renderBaseImage = useCallback(() => {
    const canvas = canvasRef.current;
    const img = baseImageRef.current;
    if (!canvas || !img) return;

    const imgW = img.naturalWidth || img.width || 1200;
    const imgH = img.naturalHeight || img.height || 800;

    // Dimensions respecting 90/270 rotation
    const isRotated90 = Math.abs(rotation) % 180 === 90;
    const targetW = isRotated90 ? imgH : imgW;
    const targetH = isRotated90 ? imgW : imgH;

    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Filter pipeline
    let filterString = `brightness(${100 + brightness}%) contrast(${100 + contrast}%) saturate(${saturation}%)`;
    if (blur > 0) filterString += ` blur(${blur}px)`;
    if (grayscale) filterString += ` grayscale(100%)`;
    if (sepia) filterString += ` sepia(100%)`;
    if (invert) filterString += ` invert(100%)`;
    ctx.filter = filterString;

    // Transform
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);

    ctx.restore();
    ctx.filter = 'none';

    // Save initial state to history if empty
    if (history.length === 0) {
      const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory([snap]);
    }
  }, [brightness, contrast, saturation, blur, grayscale, sepia, invert, rotation, flipH, flipV, history.length]);

  // Re-render when basic adjustments change
  useEffect(() => {
    if (baseImageRef.current) {
      renderBaseImage();
    }
  }, [renderBaseImage]);

  // Drawing & Redacting handlers
  const pushHistorySnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev.slice(-15), snap]);
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newHistory = [...history];
    newHistory.pop(); // remove current
    const previous = newHistory[newHistory.length - 1];
    ctx.putImageData(previous, 0, 0);
    setHistory(newHistory);
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (toolMode !== 'draw' && toolMode !== 'redact') return;
    isDrawing.current = true;
    drawPointOrRedact(e);
  };

  const continueDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || (toolMode !== 'draw' && toolMode !== 'redact')) return;
    drawPointOrRedact(e);
  };

  const stopDrawing = () => {
    if (isDrawing.current) {
      isDrawing.current = false;
      pushHistorySnapshot();
    }
  };

  const drawPointOrRedact = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);

    if (toolMode === 'draw') {
      ctx.fillStyle = brushColor;
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (toolMode === 'redact') {
      if (redactionType === 'blackout') {
        // High-security blackout bar
        ctx.fillStyle = '#000000';
        ctx.fillRect(x - brushSize, y - brushSize / 2, brushSize * 2, brushSize);
      } else {
        // Pixelate area
        const block = Math.max(8, Math.floor(brushSize / 2));
        const startX = Math.max(0, Math.floor((x - brushSize) / block) * block);
        const startY = Math.max(0, Math.floor((y - brushSize) / block) * block);
        const w = Math.min(canvas.width - startX, brushSize * 2);
        const h = Math.min(canvas.height - startY, brushSize * 2);

        try {
          const imgData = ctx.getImageData(startX, startY, w, h);
          const d = imgData.data;
          for (let py = 0; py < h; py += block) {
            for (let px = 0; px < w; px += block) {
              const pIndex = (py * w + px) * 4;
              const r = d[pIndex];
              const g = d[pIndex + 1];
              const b = d[pIndex + 2];

              for (let by = 0; by < block && py + by < h; by++) {
                for (let bx = 0; bx < block && px + bx < w; bx++) {
                  const bIndex = ((py + by) * w + (px + bx)) * 4;
                  d[bIndex] = r;
                  d[bIndex + 1] = g;
                  d[bIndex + 2] = b;
                }
              }
            }
          }
          ctx.putImageData(imgData, startX, startY);
        } catch {
          // Fallback blackout
          ctx.fillStyle = '#000000';
          ctx.fillRect(startX, startY, w, h);
        }
      }
    }
  };

  const stampText = () => {
    const canvas = canvasRef.current;
    if (!canvas || !textInput.trim()) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Text badge background
    const metrics = ctx.measureText(textInput);
    const textW = metrics.width + 30;
    const textH = 50;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(centerX - textW / 2, centerY - textH / 2, textW, textH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.fillText(textInput, centerX, centerY);
    ctx.restore();

    pushHistorySnapshot();
  };

  // Crop presets
  const applyCropRatio = (ratio: '1:1' | '4:3' | '16:9') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let targetW = canvas.width;
    let targetH = canvas.height;

    if (ratio === '1:1') {
      const min = Math.min(targetW, targetH);
      targetW = min;
      targetH = min;
    } else if (ratio === '4:3') {
      targetH = (targetW * 3) / 4;
      if (targetH > canvas.height) {
        targetH = canvas.height;
        targetW = (targetH * 4) / 3;
      }
    } else if (ratio === '16:9') {
      targetH = (targetW * 9) / 16;
      if (targetH > canvas.height) {
        targetH = canvas.height;
        targetW = (targetH * 16) / 9;
      }
    }

    const startX = (canvas.width - targetW) / 2;
    const startY = (canvas.height - targetH) / 2;

    const croppedData = ctx.getImageData(startX, startY, targetW, targetH);
    canvas.width = targetW;
    canvas.height = targetH;
    ctx.putImageData(croppedData, 0, 0);

    pushHistorySnapshot();
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `calc_vault_edited_${Date.now()}.png`;
    a.click();
  };

  const handleSaveToVault = (asNew: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl, asNew);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between animate-fadeIn">
      {/* Top Header */}
      <div className="w-full h-16 bg-zinc-900/90 border-b border-zinc-800 px-4 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-sm font-semibold truncate max-w-xs md:max-w-md">
              Secure Image Studio: {item.title}
            </h2>
            <p className="text-[11px] text-zinc-400">
              Military-Grade Redaction & Visual Enhancement
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={history.length <= 1}
            className="p-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-zinc-800"
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleDownload}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5"
            title="Export Image File"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={() => handleSaveToVault(true)}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-emerald-400 text-xs font-medium flex items-center gap-1.5 border border-emerald-500/30"
          >
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">Save as Copy</span>
          </button>
          <button
            onClick={() => handleSaveToVault(false)}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-600/30"
          >
            <Check className="w-4 h-4" />
            <span>Save to Vault</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Workspace */}
      <div className="flex-1 w-full overflow-auto flex items-center justify-center p-4 bg-zinc-950/80">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={continueDrawing}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="max-h-[62vh] max-w-full rounded-lg shadow-2xl border border-zinc-800 cursor-crosshair object-contain bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px]"
        />
      </div>

      {/* Bottom Tool Panel */}
      <div className="w-full bg-zinc-900 border-t border-zinc-800 flex flex-col p-3 gap-3">
        {/* Tool Mode Tabs */}
        <div className="flex items-center justify-center gap-2 border-b border-zinc-800/80 pb-2">
          <button
            onClick={() => setToolMode('adjust')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              toolMode === 'adjust'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Enhance & Filters</span>
          </button>
          <button
            onClick={() => setToolMode('redact')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              toolMode === 'redact'
                ? 'bg-red-600 text-white shadow'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Privacy Redactor</span>
          </button>
          <button
            onClick={() => setToolMode('draw')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              toolMode === 'draw'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <PenTool className="w-4 h-4" />
            <span>Markup Pen</span>
          </button>
          <button
            onClick={() => setToolMode('crop')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              toolMode === 'crop'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Crop className="w-4 h-4" />
            <span>Crop & Aspect</span>
          </button>
          <button
            onClick={() => setToolMode('text')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              toolMode === 'text'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Type className="w-4 h-4" />
            <span>Watermark</span>
          </button>
        </div>

        {/* Dynamic Tool Controls */}
        <div className="max-w-4xl mx-auto w-full px-2">
          {toolMode === 'adjust' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-zinc-300">
              {/* Brightness */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between">
                  <span>Brightness</span>
                  <span className="font-mono text-emerald-400">{brightness}%</span>
                </div>
                <input
                  type="range"
                  min="-80"
                  max="80"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="accent-emerald-500 h-1.5 bg-zinc-700 rounded-lg"
                />
              </div>

              {/* Contrast */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between">
                  <span>Contrast</span>
                  <span className="font-mono text-emerald-400">{contrast}%</span>
                </div>
                <input
                  type="range"
                  min="-80"
                  max="80"
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="accent-emerald-500 h-1.5 bg-zinc-700 rounded-lg"
                />
              </div>

              {/* Saturation */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between">
                  <span>Saturation</span>
                  <span className="font-mono text-emerald-400">{saturation}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={saturation}
                  onChange={(e) => setSaturation(Number(e.target.value))}
                  className="accent-emerald-500 h-1.5 bg-zinc-700 rounded-lg"
                />
              </div>

              {/* Blur */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between">
                  <span>Soft Blur</span>
                  <span className="font-mono text-emerald-400">{blur}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="12"
                  value={blur}
                  onChange={(e) => setBlur(Number(e.target.value))}
                  className="accent-emerald-500 h-1.5 bg-zinc-700 rounded-lg"
                />
              </div>

              {/* Quick toggles row */}
              <div className="col-span-2 md:col-span-4 flex items-center justify-between pt-1 gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setGrayscale(!grayscale)}
                    className={`px-2.5 py-1 rounded text-xs border ${
                      grayscale
                        ? 'bg-zinc-700 border-emerald-400 text-emerald-400'
                        : 'border-zinc-700 hover:bg-zinc-800'
                    }`}
                  >
                    B&W
                  </button>
                  <button
                    onClick={() => setSepia(!sepia)}
                    className={`px-2.5 py-1 rounded text-xs border ${
                      sepia
                        ? 'bg-zinc-700 border-amber-400 text-amber-400'
                        : 'border-zinc-700 hover:bg-zinc-800'
                    }`}
                  >
                    Sepia
                  </button>
                  <button
                    onClick={() => setInvert(!invert)}
                    className={`px-2.5 py-1 rounded text-xs border ${
                      invert
                        ? 'bg-zinc-700 border-cyan-400 text-cyan-400'
                        : 'border-zinc-700 hover:bg-zinc-800'
                    }`}
                  >
                    Invert
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setRotation((r) => r - 90)}
                    className="p-1.5 hover:bg-zinc-800 rounded text-zinc-300"
                    title="Rotate -90°"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setRotation((r) => r + 90)}
                    className="p-1.5 hover:bg-zinc-800 rounded text-zinc-300"
                    title="Rotate +90°"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setFlipH(!flipH)}
                    className={`p-1.5 rounded ${flipH ? 'bg-zinc-700 text-emerald-400' : 'hover:bg-zinc-800 text-zinc-300'}`}
                    title="Flip Horizontal"
                  >
                    <FlipHorizontal className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setFlipV(!flipV)}
                    className={`p-1.5 rounded ${flipV ? 'bg-zinc-700 text-emerald-400' : 'hover:bg-zinc-800 text-zinc-300'}`}
                    title="Flip Vertical"
                  >
                    <FlipVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {toolMode === 'redact' && (
            <div className="flex items-center justify-between flex-wrap gap-4 text-xs text-zinc-300">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-red-400">Redaction Style:</span>
                <button
                  onClick={() => setRedactionType('blackout')}
                  className={`px-3 py-1.5 rounded-lg border ${
                    redactionType === 'blackout'
                      ? 'bg-black border-red-500 text-white font-bold'
                      : 'border-zinc-700 hover:bg-zinc-800'
                  }`}
                >
                  ■ Blackout Bar
                </button>
                <button
                  onClick={() => setRedactionType('pixelate')}
                  className={`px-3 py-1.5 rounded-lg border ${
                    redactionType === 'pixelate'
                      ? 'bg-zinc-800 border-red-500 text-emerald-400 font-bold'
                      : 'border-zinc-700 hover:bg-zinc-800'
                  }`}
                >
                  ▦ Mosaic Blur
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span>Brush Width:</span>
                <input
                  type="range"
                  min="12"
                  max="64"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="accent-red-500 w-32"
                />
                <span className="font-mono text-red-400">{brushSize}px</span>
              </div>
              <span className="text-[11px] text-zinc-400 italic">
                Drag over IDs, bank codes, or faces to mask permanently.
              </span>
            </div>
          )}

          {toolMode === 'draw' && (
            <div className="flex items-center justify-between flex-wrap gap-4 text-xs text-zinc-300">
              <div className="flex items-center gap-2">
                <span>Color:</span>
                {['#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#ffffff', '#000000'].map(
                  (col) => (
                    <button
                      key={col}
                      onClick={() => setBrushColor(col)}
                      style={{ backgroundColor: col }}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        brushColor === col ? 'scale-125 border-white' : 'border-transparent'
                      }`}
                    />
                  )
                )}
              </div>

              <div className="flex items-center gap-3">
                <span>Stroke Size:</span>
                <input
                  type="range"
                  min="2"
                  max="36"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="accent-emerald-500 w-28"
                />
                <span className="font-mono text-emerald-400">{brushSize}px</span>
              </div>
            </div>
          )}

          {toolMode === 'crop' && (
            <div className="flex items-center justify-center gap-3 text-xs text-zinc-300">
              <span className="font-medium text-zinc-400">Quick Ratio Crop:</span>
              <button
                onClick={() => applyCropRatio('1:1')}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200"
              >
                1:1 Square
              </button>
              <button
                onClick={() => applyCropRatio('4:3')}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200"
              >
                4:3 Document
              </button>
              <button
                onClick={() => applyCropRatio('16:9')}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200"
              >
                16:9 Widescreen
              </button>
            </div>
          )}

          {toolMode === 'text' && (
            <div className="flex items-center justify-center gap-3 text-xs text-zinc-300">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Watermark Text..."
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-white w-48 text-xs focus:outline-none focus:border-emerald-500"
              />
              <div className="flex items-center gap-1.5">
                {['#ef4444', '#10b981', '#38bdf8', '#f59e0b', '#ffffff'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setTextColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-5 h-5 rounded-full border ${textColor === c ? 'border-white scale-110' : 'border-zinc-700'}`}
                  />
                ))}
              </div>
              <button
                onClick={stampText}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow"
              >
                Stamp Centered
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
