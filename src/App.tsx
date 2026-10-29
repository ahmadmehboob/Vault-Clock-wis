import React, { useState, useEffect, useCallback } from 'react';
import { Calculator } from './components/Calculator';
import { VaultLayout } from './components/VaultLayout';
import { MediaGallery } from './components/MediaGallery';
import { MediaViewer } from './components/MediaViewer';
import { ImageEditorModal } from './components/ImageEditorModal';
import { VideoEditorModal } from './components/VideoEditorModal';
import { NotesView } from './components/NotesView';
import { SecurityCenter } from './components/SecurityCenter';
import {
  MediaItem,
  NoteItem,
  IntruderLog,
  SecurityConfig,
} from './types/vault';
import {
  getMediaItems,
  saveMediaItem,
  deleteMediaItem,
  getNotes,
  saveNote,
  deleteNote,
  getIntruderLogs,
  addIntruderLog,
  clearIntruderLogs,
  loadSecurityConfig,
  saveSecurityConfig,
  wipeAllVaultData,
  DEFAULT_SECURITY_CONFIG,
} from './utils/storage';
import {
  getInitialMasterMedia,
  getInitialDecoyMedia,
  getInitialMasterNotes,
  getInitialDecoyNotes,
  getInitialIntruderLogs,
} from './utils/demoData';
import { ShieldAlert, X } from 'lucide-react';

export default function App() {
  const [securityConfig, setSecurityConfig] = useState<SecurityConfig>(() =>
    loadSecurityConfig()
  );

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isDecoyVault, setIsDecoyVault] = useState(false);
  const [activeTab, setActiveTab] = useState<'media' | 'notes' | 'security' | 'trash'>('media');

  // Vault data state
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [intruderLogs, setIntruderLogs] = useState<IntruderLog[]>([]);

  // Modals state
  const [viewingItem, setViewingItem] = useState<MediaItem | null>(null);
  const [editingImageItem, setEditingImageItem] = useState<MediaItem | null>(null);
  const [editingVideoItem, setEditingVideoItem] = useState<MediaItem | null>(null);

  // Intruder alert notification upon unlock
  const [unseenIntruderAlerts, setUnseenIntruderAlerts] = useState<number>(0);

  // Check URL params for ?autostart=1
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1' || params.get('vault') === '1') {
        setIsUnlocked(true);
        setIsDecoyVault(false);
      }
    }
  }, []);

  // Load vault items from IndexedDB
  const refreshVaultData = useCallback(async (isDecoy: boolean) => {
    try {
      let items = await getMediaItems(isDecoy);
      let loadedNotes = await getNotes(isDecoy);
      let logs = await getIntruderLogs();

      // If database is brand new, seed with demo data
      if (items.length === 0 && !isDecoy) {
        const seededMasterMedia = getInitialMasterMedia();
        for (const item of seededMasterMedia) {
          await saveMediaItem(item, false);
        }
        items = seededMasterMedia;
      } else if (items.length === 0 && isDecoy) {
        const seededDecoyMedia = getInitialDecoyMedia();
        for (const item of seededDecoyMedia) {
          await saveMediaItem(item, true);
        }
        items = seededDecoyMedia;
      }

      if (loadedNotes.length === 0 && !isDecoy) {
        const seededMasterNotes = getInitialMasterNotes();
        for (const n of seededMasterNotes) {
          await saveNote(n, false);
        }
        loadedNotes = seededMasterNotes;
      } else if (loadedNotes.length === 0 && isDecoy) {
        const seededDecoyNotes = getInitialDecoyNotes();
        for (const n of seededDecoyNotes) {
          await saveNote(n, true);
        }
        loadedNotes = seededDecoyNotes;
      }

      if (logs.length === 0) {
        const initialLogs = getInitialIntruderLogs();
        for (const l of initialLogs) {
          await addIntruderLog(l);
        }
        logs = initialLogs;
      }

      setMediaItems(items);
      setNotes(loadedNotes);
      setIntruderLogs(logs);
    } catch (err) {
      console.warn('Storage initialisation error:', err);
    }
  }, []);

  useEffect(() => {
    refreshVaultData(isDecoyVault);
  }, [refreshVaultData, isDecoyVault]);

  // Handle successful secret unlock from calculator
  const handleUnlock = (vaultType: 'master' | 'decoy') => {
    const isDecoy = vaultType === 'decoy';
    setIsDecoyVault(isDecoy);
    setIsUnlocked(true);
    refreshVaultData(isDecoy);

    // If there are recorded intruder logs, notify user on unlock
    getIntruderLogs().then((logs) => {
      const recent = logs.filter((l) => Date.now() - l.timestamp < 86400000 * 2);
      if (recent.length > 0 && !isDecoy) {
        setUnseenIntruderAlerts(recent.length);
      }
    });
  };

  // Handle failed secret unlock attempt from calculator
  const handleFailedAttempt = async (enteredInput: string) => {
    const nextFailed = securityConfig.failedAttemptsCount + 1;
    const updatedConfig: SecurityConfig = {
      ...securityConfig,
      failedAttemptsCount: nextFailed,
    };
    setSecurityConfig(updatedConfig);
    saveSecurityConfig(updatedConfig);

    // Record intruder attempt
    const newLog: IntruderLog = {
      id: `intruder_${Date.now()}`,
      timestamp: Date.now(),
      enteredInput,
      reason: `Unauthorized attempt #${nextFailed} detected at ${new Date().toLocaleTimeString()}`,
    };
    await addIntruderLog(newLog);
    const logs = await getIntruderLogs();
    setIntruderLogs(logs);

    // Self-destruct wipe protection check
    if (
      securityConfig.maxFailedAttemptsBeforeWipe > 0 &&
      nextFailed >= securityConfig.maxFailedAttemptsBeforeWipe
    ) {
      console.warn('WIPE TRIGGERED: Exceeded maximum allowed attempts!');
      await wipeAllVaultData();
      alert('SECURITY PROTOCOL TRIGGERED: Vault wiped after consecutive failed attempts.');
      window.location.reload();
    }
  };

  // Lock vault back to calculator disguise
  const handleLock = () => {
    setIsUnlocked(false);
    setViewingItem(null);
    setEditingImageItem(null);
    setEditingVideoItem(null);
  };

  // Media CRUD handlers
  const handleSaveMedia = async (item: MediaItem) => {
    await saveMediaItem(item, isDecoyVault);
    setMediaItems((prev) => {
      const idx = prev.findIndex((i) => i.id === item.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = item;
        return copy;
      }
      return [item, ...prev];
    });
  };

  const handleDeleteMedia = async (id: string) => {
    await deleteMediaItem(id, isDecoyVault);
    setMediaItems((prev) => prev.filter((i) => i.id !== id));
    if (viewingItem?.id === id) setViewingItem(null);
  };

  const handleDeleteMultipleMedia = async (ids: string[]) => {
    for (const id of ids) {
      await deleteMediaItem(id, isDecoyVault);
    }
    setMediaItems((prev) => prev.filter((i) => !ids.includes(i.id)));
  };

  const handleToggleFavoriteMedia = async (id: string) => {
    const item = mediaItems.find((i) => i.id === id);
    if (!item) return;
    const updated = { ...item, favorite: !item.favorite, updatedAt: Date.now() };
    await handleSaveMedia(updated);
    if (viewingItem?.id === id) setViewingItem(updated);
  };

  // Notes CRUD handlers
  const handleSaveNote = async (note: NoteItem) => {
    await saveNote(note, isDecoyVault);
    setNotes((prev) => {
      const idx = prev.findIndex((n) => n.id === note.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = note;
        return copy;
      }
      return [note, ...prev];
    });
  };

  const handleDeleteNote = async (id: string) => {
    await deleteNote(id, isDecoyVault);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  // Security handlers
  const handleUpdateConfig = (newConfig: SecurityConfig) => {
    setSecurityConfig(newConfig);
    saveSecurityConfig(newConfig);
  };

  const handleClearLogs = async () => {
    await clearIntruderLogs();
    setIntruderLogs([]);
  };

  const handleWipeVault = async () => {
    await wipeAllVaultData();
    setMediaItems([]);
    setNotes([]);
    setIntruderLogs([]);
    handleLock();
  };

  const handleExportBackup = () => {
    const backupData = {
      version: 1,
      timestamp: Date.now(),
      security: {
        triggerKey: securityConfig.triggerKey,
        autoLockDelaySeconds: securityConfig.autoLockDelaySeconds,
      },
      media: mediaItems,
      notes: notes,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calc_vault_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = async (jsonStr: string) => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.media && Array.isArray(data.media)) {
        for (const item of data.media) {
          await saveMediaItem(item, isDecoyVault);
        }
      }
      if (data.notes && Array.isArray(data.notes)) {
        for (const n of data.notes) {
          await saveNote(n, isDecoyVault);
        }
      }
      await refreshVaultData(isDecoyVault);
      alert('Encrypted backup successfully restored into vault!');
    } catch {
      alert('Failed to parse backup file. Please verify JSON format.');
    }
  };

  // If still locked behind calculator disguise
  if (!isUnlocked) {
    return (
      <Calculator
        securityConfig={securityConfig}
        onUnlock={handleUnlock}
        onFailedAttempt={handleFailedAttempt}
      />
    );
  }

  return (
    <VaultLayout
      securityConfig={securityConfig}
      isDecoy={isDecoyVault}
      mediaCount={mediaItems.length}
      notesCount={notes.length}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onLock={handleLock}
    >
      {/* Intruder Alert notification if break-ins were attempted */}
      {unseenIntruderAlerts > 0 && (
        <div className="mb-4 p-3 rounded-2xl bg-red-950/80 border border-red-700/80 text-white flex items-center justify-between text-xs shadow-xl animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-900 rounded-xl text-red-200">
              <ShieldAlert className="w-5 h-5 text-red-300" />
            </div>
            <div>
              <span className="font-bold text-red-200">Security Alert:</span>{' '}
              <span>
                {unseenIntruderAlerts} unauthorized break-in attempt(s) were recorded on the
                calculator!
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('security');
                setUnseenIntruderAlerts(0);
              }}
              className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 font-semibold"
            >
              View Logs
            </button>
            <button
              onClick={() => setUnseenIntruderAlerts(0)}
              className="p-1 text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main View Tab Content */}
      {activeTab === 'media' && (
        <MediaGallery
          items={mediaItems}
          onOpenViewer={(item) => setViewingItem(item)}
          onOpenImageEditor={(item) => setEditingImageItem(item)}
          onOpenVideoEditor={(item) => setEditingVideoItem(item)}
          onToggleFavorite={handleToggleFavoriteMedia}
          onDeleteItem={handleDeleteMedia}
          onDeleteMultiple={handleDeleteMultipleMedia}
          onAddItem={handleSaveMedia}
          isDecoy={isDecoyVault}
        />
      )}

      {activeTab === 'notes' && (
        <NotesView
          notes={notes}
          onSaveNote={handleSaveNote}
          onDeleteNote={handleDeleteNote}
          isDecoy={isDecoyVault}
        />
      )}

      {activeTab === 'security' && (
        <SecurityCenter
          securityConfig={securityConfig}
          intruderLogs={intruderLogs}
          onUpdateConfig={handleUpdateConfig}
          onClearIntruderLogs={handleClearLogs}
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackup}
          onWipeVault={handleWipeVault}
        />
      )}

      {/* Fullscreen Media Viewer */}
      {viewingItem && (
        <MediaViewer
          item={viewingItem}
          itemsList={mediaItems}
          onClose={() => setViewingItem(null)}
          onNavigate={(item) => setViewingItem(item)}
          onToggleFavorite={handleToggleFavoriteMedia}
          onDelete={handleDeleteMedia}
          onOpenImageEditor={(item) => {
            setViewingItem(null);
            setEditingImageItem(item);
          }}
          onOpenVideoEditor={(item) => {
            setViewingItem(null);
            setEditingVideoItem(item);
          }}
        />
      )}

      {/* In-Built Image Editor Modal */}
      {editingImageItem && (
        <ImageEditorModal
          item={editingImageItem}
          onClose={() => setEditingImageItem(null)}
          onSave={async (updatedDataUrl, asNew) => {
            if (asNew) {
              const newPhoto: MediaItem = {
                ...editingImageItem,
                id: `photo_edited_${Date.now()}`,
                title: `${editingImageItem.title} (Edited)`,
                dataUrl: updatedDataUrl,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              };
              await handleSaveMedia(newPhoto);
            } else {
              const updatedPhoto: MediaItem = {
                ...editingImageItem,
                dataUrl: updatedDataUrl,
                updatedAt: Date.now(),
              };
              await handleSaveMedia(updatedPhoto);
            }
            setEditingImageItem(null);
          }}
        />
      )}

      {/* In-Built Video Editor Modal */}
      {editingVideoItem && (
        <VideoEditorModal
          item={editingVideoItem}
          onClose={() => setEditingVideoItem(null)}
          onSaveVideo={async (updatedDataUrl, asNew) => {
            if (asNew) {
              const newVideo: MediaItem = {
                ...editingVideoItem,
                id: `video_edited_${Date.now()}`,
                title: `${editingVideoItem.title} (Trimmed)`,
                dataUrl: updatedDataUrl,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              };
              await handleSaveMedia(newVideo);
            } else {
              const updatedVideo: MediaItem = {
                ...editingVideoItem,
                dataUrl: updatedDataUrl,
                updatedAt: Date.now(),
              };
              await handleSaveMedia(updatedVideo);
            }
            setEditingVideoItem(null);
          }}
          onCaptureFrame={async (frameDataUrl) => {
            const capturedPhoto: MediaItem = {
              id: `frame_${Date.now()}`,
              type: 'photo',
              title: `Video Frame Snapshot - ${editingVideoItem.title}`,
              dataUrl: frameDataUrl,
              sizeBytes: 420000,
              mimeType: 'image/png',
              createdAt: Date.now(),
              updatedAt: Date.now(),
              favorite: false,
              album: 'Captured Frames',
              tags: ['frame', 'snapshot', 'extracted'],
              isEncrypted: !isDecoyVault,
            };
            await handleSaveMedia(capturedPhoto);
          }}
        />
      )}
    </VaultLayout>
  );
}
