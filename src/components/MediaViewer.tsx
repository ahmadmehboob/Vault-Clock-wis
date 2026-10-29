import React, { useState } from 'react';
import { MediaItem } from '../types/vault';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Star,
  Trash2,
  Download,
  Edit,
  Shield,
  Info,
  Film,
  Image as ImageIcon,
} from 'lucide-react';

interface MediaViewerProps {
  item: MediaItem;
  itemsList: MediaItem[];
  onClose: () => void;
  onNavigate: (newItem: MediaItem) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenImageEditor: (item: MediaItem) => void;
  onOpenVideoEditor: (item: MediaItem) => void;
}

export const MediaViewer: React.FC<MediaViewerProps> = ({
  item,
  itemsList,
  onClose,
  onNavigate,
  onToggleFavorite,
  onDelete,
  onOpenImageEditor,
  onOpenVideoEditor,
}) => {
  const [zoom, setZoom] = useState(1);
  const [showMetadata, setShowMetadata] = useState(false);

  const currentIndex = itemsList.findIndex((i) => i.id === item.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < itemsList.length - 1;

  const handlePrev = () => {
    if (hasPrev) {
      setZoom(1);
      onNavigate(itemsList[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      setZoom(1);
      onNavigate(itemsList[currentIndex + 1]);
    }
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = item.dataUrl;
    a.download = `${item.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.${
      item.type === 'video' ? 'webm' : 'png'
    }`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between animate-fadeIn select-none text-white">
      {/* Top Header */}
      <div className="w-full h-16 bg-gradient-to-b from-black/80 to-transparent px-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800/80 rounded-full text-zinc-300 hover:text-white transition-colors"
            title="Back to Vault"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-sm font-semibold truncate max-w-xs md:max-w-md">{item.title}</h2>
            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
              <span className="flex items-center gap-1 text-emerald-400 font-mono">
                <Shield className="w-3 h-3" />
                <span>AES-256</span>
              </span>
              <span>•</span>
              <span>{item.album}</span>
              <span>•</span>
              <span>{new Date(item.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 sm:gap-2">
          {item.type === 'photo' ? (
            <button
              onClick={() => onOpenImageEditor(item)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow"
              title="Open in Image Editor"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit Photo</span>
            </button>
          ) : (
            <button
              onClick={() => onOpenVideoEditor(item)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow"
              title="Open in Video Editor"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit Video</span>
            </button>
          )}

          <button
            onClick={() => onToggleFavorite(item.id)}
            className={`p-2 rounded-lg hover:bg-zinc-800 transition-colors ${
              item.favorite ? 'text-amber-400' : 'text-zinc-400 hover:text-white'
            }`}
            title="Favorite"
          >
            <Star className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={handleDownload}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            title="Export / Download"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowMetadata(!showMetadata)}
            className={`p-2 rounded-lg hover:bg-zinc-800 transition-colors ${
              showMetadata ? 'text-emerald-400 bg-zinc-800' : 'text-zinc-400 hover:text-white'
            }`}
            title="Details & Metadata"
          >
            <Info className="w-4 h-4" />
          </button>

          <button
            onClick={() => onDelete(item.id)}
            className="p-2 rounded-lg hover:bg-red-950/60 text-zinc-400 hover:text-red-400 transition-colors"
            title="Delete / Shred"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full relative flex items-center justify-center p-2 overflow-hidden">
        {/* Navigation Arrows */}
        {hasPrev && (
          <button
            onClick={handlePrev}
            className="absolute left-4 z-20 p-3 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 hover:text-white transition-all shadow-xl backdrop-blur-md"
            title="Previous (Left Arrow)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {hasNext && (
          <button
            onClick={handleNext}
            className="absolute right-4 z-20 p-3 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 hover:text-white transition-all shadow-xl backdrop-blur-md"
            title="Next (Right Arrow)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Media rendering */}
        {item.type === 'photo' ? (
          <div className="relative max-h-full max-w-full flex items-center justify-center overflow-auto">
            <img
              src={item.dataUrl}
              alt={item.title}
              style={{ transform: `scale(${zoom})` }}
              className="max-h-[80vh] max-w-full object-contain rounded-lg transition-transform duration-150 shadow-2xl"
            />
          </div>
        ) : (
          <div className="relative max-h-full max-w-full flex items-center justify-center">
            <video
              src={item.dataUrl}
              controls
              autoPlay
              playsInline
              className="max-h-[80vh] max-w-full rounded-xl shadow-2xl bg-black border border-zinc-800"
            />
          </div>
        )}

        {/* Metadata Inspector Drawer */}
        {showMetadata && (
          <div className="absolute right-4 top-4 bottom-4 w-72 bg-zinc-900/95 border border-zinc-800 rounded-2xl p-4 shadow-2xl backdrop-blur-xl z-30 flex flex-col gap-3 text-xs overflow-y-auto animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <span className="font-semibold text-white">Item Details</span>
              <button
                onClick={() => setShowMetadata(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-2.5 text-zinc-300">
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase font-mono">Title</span>
                <span className="font-medium text-white">{item.title}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase font-mono">Format</span>
                <span className="capitalize flex items-center gap-1.5 text-emerald-400">
                  {item.type === 'photo' ? <ImageIcon className="w-3.5 h-3.5" /> : <Film className="w-3.5 h-3.5" />}
                  {item.mimeType || item.type}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase font-mono">Encrypted Size</span>
                <span>{(item.sizeBytes / 1024).toFixed(1)} KB</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase font-mono">Album Category</span>
                <span className="inline-block bg-zinc-800 px-2 py-0.5 rounded text-zinc-200">
                  {item.album}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase font-mono">Tags</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {item.tags.map((t) => (
                    <span key={t} className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800/40">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase font-mono">Storage Engine</span>
                <span className="font-mono text-emerald-400">IndexedDB Blob Storage</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Bar with Zoom for Photos */}
      <div className="w-full h-14 bg-gradient-to-t from-black/80 to-transparent px-4 flex items-center justify-between z-20">
        <div className="text-xs text-zinc-400 font-mono">
          {currentIndex + 1} of {itemsList.length}
        </div>

        {item.type === 'photo' && (
          <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 px-3 py-1 rounded-full text-xs">
            <button
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
              className="p-1 hover:text-emerald-400"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-zinc-300 w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
              className="p-1 hover:text-emerald-400"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="text-[10px] text-zinc-500 hover:text-white ml-1 font-mono"
            >
              Reset
            </button>
          </div>
        )}

        <div className="text-xs text-zinc-500 hidden sm:block">
          Use arrow keys to navigate • Esc to exit
        </div>
      </div>
    </div>
  );
};
