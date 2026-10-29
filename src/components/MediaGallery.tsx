import React, { useState, useMemo, useRef } from 'react';
import { MediaItem, MediaType } from '../types/vault';
import { createProceduralVideoDataUrl } from '../utils/demoData';
import {
  Plus,
  Search,
  Filter,
  Grid,
  List,
  Film,
  Image as ImageIcon,
  Star,
  Trash2,
  Download,
  Edit,
  Shield,
  Upload,
  Play,
  Video,
  Sparkles,
  CheckSquare,
  Square,
  Clock,
} from 'lucide-react';

interface MediaGalleryProps {
  items: MediaItem[];
  onOpenViewer: (item: MediaItem) => void;
  onOpenImageEditor: (item: MediaItem) => void;
  onOpenVideoEditor: (item: MediaItem) => void;
  onToggleFavorite: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onDeleteMultiple: (ids: string[]) => void;
  onAddItem: (item: MediaItem) => void;
  isDecoy: boolean;
}

export const MediaGallery: React.FC<MediaGalleryProps> = ({
  items,
  onOpenViewer,
  onOpenImageEditor,
  onOpenVideoEditor,
  onToggleFavorite,
  onDeleteItem,
  onDeleteMultiple,
  onAddItem,
  isDecoy,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'photo' | 'video' | 'favorites'>('all');
  const [selectedAlbum, setSelectedAlbum] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Multi-select mode
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Video generator loading state
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Derive unique albums
  const albums = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.album) set.add(item.album);
    });
    return Array.from(set);
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (activeTab === 'photo' && item.type !== 'photo') return false;
      if (activeTab === 'video' && item.type !== 'video') return false;
      if (activeTab === 'favorites' && !item.favorite) return false;
      if (selectedAlbum !== 'all' && item.album !== selectedAlbum) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(query);
        const matchTags = item.tags.some((t) => t.toLowerCase().includes(query));
        const matchAlbum = item.album.toLowerCase().includes(query);
        if (!matchTitle && !matchTags && !matchAlbum) return false;
      }

      return true;
    });
  }, [items, activeTab, selectedAlbum, searchQuery]);

  // Handle file uploads
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const isVideo = file.type.startsWith('video');
      const reader = new FileReader();

      reader.onload = () => {
        const dataUrl = reader.result as string;
        const newItem: MediaItem = {
          id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          type: isVideo ? 'video' : 'photo',
          title: file.name.replace(/\.[^/.]+$/, ''),
          dataUrl,
          sizeBytes: file.size,
          mimeType: file.type,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          favorite: false,
          album: isDecoy ? 'General' : isVideo ? 'Private Clips' : 'Imported Vault',
          tags: ['imported', isVideo ? 'video' : 'photo'],
          isEncrypted: !isDecoy,
        };
        onAddItem(newItem);
      };

      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Generate synthetic procedural video clip
  const handleGenerateSampleVideo = async () => {
    setIsGeneratingVideo(true);
    try {
      const videoDataUrl = await createProceduralVideoDataUrl('Confidential Surveillance Clip', 5);
      const newItem: MediaItem = {
        id: `vid_${Date.now()}`,
        type: 'video',
        title: 'CCTV Security Feed - Penthouse Safe',
        dataUrl: videoDataUrl,
        sizeBytes: 980000,
        mimeType: 'video/webm',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        favorite: true,
        album: 'Security Clips',
        tags: ['cctv', 'surveillance', 'vault'],
        duration: 5,
        isEncrypted: !isDecoy,
      };
      onAddItem(newItem);
    } catch (err) {
      console.error('Failed to generate video', err);
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const toggleSelectId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((i) => i.id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    onDeleteMultiple(selectedIds);
    setSelectedIds([]);
    setIsSelectMode(false);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Top Controls Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800">
        {/* Left: View Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'all'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            All Media ({items.length})
          </button>
          <button
            onClick={() => setActiveTab('photo')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeTab === 'photo'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Photos ({items.filter((i) => i.type === 'photo').length})</span>
          </button>
          <button
            onClick={() => setActiveTab('video')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeTab === 'video'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Videos ({items.filter((i) => i.type === 'video').length})</span>
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeTab === 'favorites'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-current text-amber-400" />
            <span>Starred ({items.filter((i) => i.favorite).length})</span>
          </button>
        </div>

        {/* Right: Search and Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 md:w-56">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search encrypted vault..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
            title="Import Photo or Video"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Import</span>
          </button>

          {/* Generate Synthetic Video */}
          <button
            disabled={isGeneratingVideo}
            onClick={handleGenerateSampleVideo}
            className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-cyan-400 border border-cyan-500/30 text-xs font-medium flex items-center gap-1.5 transition-all"
            title="Generate procedural secure CCTV video clip"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">
              {isGeneratingVideo ? 'Synthesizing...' : 'New Video'}
            </span>
          </button>

          {/* View mode toggle */}
          <div className="hidden sm:flex items-center bg-zinc-950 border border-zinc-800 rounded-xl p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg ${viewMode === 'grid' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}
              title="Grid"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg ${viewMode === 'list' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}
              title="List"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Album Filter Pills & Batch Selection Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-zinc-500 font-medium mr-1">Album:</span>
          <button
            onClick={() => setSelectedAlbum('all')}
            className={`px-2.5 py-1 rounded-lg border transition-all ${
              selectedAlbum === 'all'
                ? 'bg-zinc-800 border-zinc-700 text-white font-medium'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            All Albums
          </button>
          {albums.map((alb) => (
            <button
              key={alb}
              onClick={() => setSelectedAlbum(alb)}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                selectedAlbum === alb
                  ? 'bg-zinc-800 border-zinc-700 text-emerald-400 font-medium'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              {alb}
            </button>
          ))}
        </div>

        {/* Selection mode toggle */}
        <div className="flex items-center gap-2">
          {isSelectMode ? (
            <>
              <button
                onClick={handleSelectAll}
                className="text-zinc-400 hover:text-white flex items-center gap-1"
              >
                {selectedIds.length === filteredItems.length ? (
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Square className="w-3.5 h-3.5" />
                )}
                <span>Select All ({selectedIds.length})</span>
              </button>

              <button
                disabled={selectedIds.length === 0}
                onClick={handleDeleteSelected}
                className="px-2.5 py-1 rounded-lg bg-red-950/80 border border-red-800 text-red-300 hover:bg-red-900 disabled:opacity-40 flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Shred ({selectedIds.length})</span>
              </button>

              <button
                onClick={() => {
                  setIsSelectMode(false);
                  setSelectedIds([]);
                }}
                className="text-zinc-500 hover:text-zinc-300"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsSelectMode(true)}
              className="text-zinc-400 hover:text-white flex items-center gap-1"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Select Items</span>
            </button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <div className="w-full py-20 flex flex-col items-center justify-center text-center p-6 bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800">
          <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 text-emerald-400 flex items-center justify-center mb-4 shadow-inner">
            <Shield className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-white">No items found in this section</h3>
          <p className="text-xs text-zinc-400 max-w-sm mt-1">
            Import photos or record confidential clips to safely encrypt them within your local
            IndexedDB vault.
          </p>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow"
            >
              Import Files
            </button>
            <button
              onClick={handleGenerateSampleVideo}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-cyan-400 text-xs font-medium border border-cyan-500/30"
            >
              Create Sample Video
            </button>
          </div>
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map((item) => {
            const isSelected = selectedIds.includes(item.id);

            return (
              <div
                key={item.id}
                onClick={() => (isSelectMode ? toggleSelectId(item.id, {} as any) : onOpenViewer(item))}
                className={`group relative rounded-2xl overflow-hidden bg-zinc-900/90 border transition-all duration-200 cursor-pointer flex flex-col shadow-lg hover:shadow-2xl hover:border-zinc-700 ${
                  isSelected
                    ? 'border-emerald-500 ring-2 ring-emerald-500/50'
                    : 'border-zinc-800/90 hover:-translate-y-1'
                }`}
              >
                {/* Media Preview Box */}
                <div className="relative aspect-[4/3] w-full bg-black/60 overflow-hidden flex items-center justify-center">
                  {item.type === 'photo' ? (
                    <img
                      src={item.dataUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="relative w-full h-full flex items-center justify-center bg-zinc-950">
                      <video
                        src={item.dataUrl}
                        preload="metadata"
                        className="w-full h-full object-cover opacity-80"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-emerald-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="w-4 h-4 ml-0.5" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
                    <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-mono text-emerald-400 font-semibold border border-emerald-500/30 flex items-center gap-1">
                      <Shield className="w-2.5 h-2.5" />
                      <span>{item.type === 'video' ? 'VIDEO' : 'AES-256'}</span>
                    </span>
                  </div>

                  {/* Favorite button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(item.id);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 backdrop-blur-md text-zinc-400 hover:text-amber-400 z-10"
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${item.favorite ? 'text-amber-400 fill-current' : ''}`}
                    />
                  </button>

                  {/* Checkbox for Select Mode */}
                  {isSelectMode && (
                    <div
                      onClick={(e) => toggleSelectId(item.id, e)}
                      className="absolute inset-0 bg-black/40 flex items-center justify-center z-20"
                    >
                      {isSelected ? (
                        <div className="w-8 h-8 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow">
                          <CheckSquare className="w-5 h-5 fill-current" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full border-2 border-white/80 bg-black/40" />
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Info */}
                <div className="p-3 flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-semibold text-zinc-100 truncate flex-1">
                      {item.title}
                    </h4>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {(item.sizeBytes / 1024).toFixed(0)} KB
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span className="truncate">{item.album}</span>

                    {/* Quick Launch Editor Action */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        item.type === 'photo' ? onOpenImageEditor(item) : onOpenVideoEditor(item);
                      }}
                      className="text-emerald-400 hover:text-emerald-300 font-medium text-[11px] flex items-center gap-0.5 opacity-90 group-hover:opacity-100"
                      title="Direct Editor"
                    >
                      <Edit className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="flex flex-col gap-2">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => onOpenViewer(item)}
              className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 flex items-center justify-between gap-3 cursor-pointer hover:bg-zinc-800/50 transition-all text-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-lg bg-black overflow-hidden flex items-center justify-center shrink-0">
                  {item.type === 'photo' ? (
                    <img src={item.dataUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Film className="w-5 h-5 text-emerald-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-white truncate">{item.title}</h4>
                  <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
                    <span className="capitalize">{item.type}</span>
                    <span>•</span>
                    <span>{item.album}</span>
                    <span>•</span>
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    item.type === 'photo' ? onOpenImageEditor(item) : onOpenVideoEditor(item);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-emerald-400 flex items-center gap-1 font-medium"
                >
                  <Edit className="w-3 h-3" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(item.id);
                  }}
                  className="p-1.5 text-zinc-400 hover:text-amber-400"
                >
                  <Star className={`w-4 h-4 ${item.favorite ? 'text-amber-400 fill-current' : ''}`} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteItem(item.id);
                  }}
                  className="p-1.5 text-zinc-400 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
