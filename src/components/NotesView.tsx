import React, { useState, useMemo, useEffect } from 'react';
import { NoteItem, NoteChecklistItem } from '../types/vault';
import {
  Plus,
  Search,
  Pin,
  Trash2,
  CheckCircle2,
  Circle,
  Shield,
  FileText,
  Tag,
  CheckSquare,
  Sparkles,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';

interface NotesViewProps {
  notes: NoteItem[];
  onSaveNote: (note: NoteItem) => void;
  onDeleteNote: (id: string) => void;
  isDecoy: boolean;
}

const COLOR_MAP: Record<string, { bg: string; border: string; accent: string }> = {
  slate: { bg: 'bg-zinc-900', border: 'border-zinc-800', accent: 'text-zinc-400' },
  emerald: { bg: 'bg-emerald-950/60', border: 'border-emerald-800/60', accent: 'text-emerald-400' },
  indigo: { bg: 'bg-indigo-950/60', border: 'border-indigo-800/60', accent: 'text-indigo-400' },
  amber: { bg: 'bg-amber-950/60', border: 'border-amber-800/60', accent: 'text-amber-400' },
  crimson: { bg: 'bg-rose-950/60', border: 'border-rose-800/60', accent: 'text-rose-400' },
};

export const NotesView: React.FC<NotesViewProps> = ({
  notes,
  onSaveNote,
  onDeleteNote,
  isDecoy,
}) => {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(notes[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Currently active note state for editing
  const activeNote = notes.find((n) => n.id === selectedNoteId) || null;

  // Edit draft state
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [draftColor, setDraftColor] = useState('slate');
  const [draftCategory, setDraftCategory] = useState('Personal');
  const [draftChecklist, setDraftChecklist] = useState<NoteChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Auto-sync draft when note changes or on initial load
  useEffect(() => {
    if (activeNote && !isEditing) {
      setDraftTitle(activeNote.title);
      setDraftContent(activeNote.content);
      setDraftColor(activeNote.color || 'slate');
      setDraftCategory(activeNote.category || 'Personal');
      setDraftChecklist(activeNote.checklist || []);
    } else if (!selectedNoteId && notes.length > 0) {
      setSelectedNoteId(notes[0].id);
    }
  }, [activeNote, selectedNoteId, notes, isEditing]);

  // Sync draft when selected note changes
  const handleSelectNote = (note: NoteItem) => {
    setSelectedNoteId(note.id);
    setDraftTitle(note.title);
    setDraftContent(note.content);
    setDraftColor(note.color || 'slate');
    setDraftCategory(note.category || 'Personal');
    setDraftChecklist(note.checklist || []);
    setIsEditing(false);
  };

  const handleCreateNewNote = () => {
    const newNote: NoteItem = {
      id: `note_${Date.now()}`,
      title: 'Untitled Confidential Note',
      content: '',
      color: 'slate',
      pinned: false,
      category: isDecoy ? 'General' : 'Personal',
      tags: ['private'],
      checklist: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isEncrypted: !isDecoy,
    };
    onSaveNote(newNote);
    handleSelectNote(newNote);
    setIsEditing(true);
  };

  const handleSaveActiveDraft = () => {
    if (!activeNote) return;
    const updated: NoteItem = {
      ...activeNote,
      title: draftTitle.trim() || 'Untitled Note',
      content: draftContent,
      color: draftColor,
      category: draftCategory,
      checklist: draftChecklist,
      updatedAt: Date.now(),
    };
    onSaveNote(updated);
    setIsEditing(false);
  };

  const handleTogglePin = (note: NoteItem, e: React.MouseEvent) => {
    e.stopPropagation();
    onSaveNote({ ...note, pinned: !note.pinned, updatedAt: Date.now() });
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    const newItem: NoteChecklistItem = {
      id: `chk_${Date.now()}`,
      text: newChecklistText.trim(),
      done: false,
    };
    const updated = [...draftChecklist, newItem];
    setDraftChecklist(updated);
    setNewChecklistText('');
    if (activeNote) {
      onSaveNote({ ...activeNote, checklist: updated, updatedAt: Date.now() });
    }
  };

  const handleToggleChecklistItem = (id: string) => {
    const updated = draftChecklist.map((item) =>
      item.id === id ? { ...item, done: !item.done } : item
    );
    setDraftChecklist(updated);
    if (activeNote) {
      onSaveNote({ ...activeNote, checklist: updated, updatedAt: Date.now() });
    }
  };

  const handleDeleteChecklistItem = (id: string) => {
    const updated = draftChecklist.filter((item) => item.id !== id);
    setDraftChecklist(updated);
    if (activeNote) {
      onSaveNote({ ...activeNote, checklist: updated, updatedAt: Date.now() });
    }
  };

  // Filter notes
  const filteredNotes = useMemo(() => {
    return notes
      .filter((n) => {
        if (selectedCategory !== 'all' && n.category !== selectedCategory) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            n.title.toLowerCase().includes(q) ||
            n.content.toLowerCase().includes(q) ||
            n.tags.some((t) => t.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return b.updatedAt - a.updatedAt;
      });
  }, [notes, selectedCategory, searchQuery]);

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[72vh] min-h-[500px]">
      {/* Left Column: Note List */}
      <div className="w-full lg:w-80 flex flex-col gap-3 bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white text-sm">Personal Notes</h3>
            <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] text-zinc-400 font-mono">
              {notes.length}
            </span>
          </div>

          <button
            onClick={handleCreateNewNote}
            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow text-xs flex items-center gap-1 active:scale-95 transition-all"
            title="Create Note"
          >
            <Plus className="w-4 h-4" />
            <span className="font-semibold text-xs pr-1">New Note</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Notes Scroll List */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
          {filteredNotes.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-xs italic">
              No confidential notes found.
            </div>
          ) : (
            filteredNotes.map((note) => {
              const style = COLOR_MAP[note.color] || COLOR_MAP.slate;
              const isSelected = note.id === selectedNoteId;

              return (
                <div
                  key={note.id}
                  onClick={() => handleSelectNote(note)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${style.bg} ${
                    isSelected ? 'border-emerald-500 ring-1 ring-emerald-500/50' : style.border
                  } hover:border-zinc-600`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium text-xs text-white truncate flex-1">{note.title}</h4>
                    <button
                      onClick={(e) => handleTogglePin(note, e)}
                      className={`p-1 rounded hover:bg-zinc-800/80 transition-colors ${
                        note.pinned ? 'text-emerald-400' : 'text-zinc-500'
                      }`}
                      title={note.pinned ? 'Unpin' : 'Pin to top'}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                    {note.content || '(Empty note)'}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-white/5">
                    <span className="flex items-center gap-1 font-mono text-emerald-400">
                      <Shield className="w-2.5 h-2.5" />
                      <span>{note.category}</span>
                    </span>
                    <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Note Editor / Reader */}
      <div className="flex-1 bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 flex flex-col justify-between">
        {activeNote ? (
          <div className="flex flex-col h-full gap-3">
            {/* Top Editor Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={draftTitle}
                  onChange={(e) => {
                    setDraftTitle(e.target.value);
                    setIsEditing(true);
                  }}
                  placeholder="Note Title..."
                  className="bg-transparent text-white font-semibold text-base focus:outline-none focus:border-b border-emerald-500 pb-0.5"
                />
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 text-[10px] border border-emerald-800/40 font-mono">
                  AES-256
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {/* Color picker */}
                <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                  {Object.keys(COLOR_MAP).map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setDraftColor(c);
                        setIsEditing(true);
                      }}
                      className={`w-4 h-4 rounded-full transition-transform ${
                        c === 'slate'
                          ? 'bg-zinc-600'
                          : c === 'emerald'
                          ? 'bg-emerald-500'
                          : c === 'indigo'
                          ? 'bg-indigo-500'
                          : c === 'amber'
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      } ${draftColor === c ? 'scale-125 ring-2 ring-white' : ''}`}
                    />
                  ))}
                </div>

                {isEditing && (
                  <button
                    onClick={handleSaveActiveDraft}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow shadow-emerald-600/30"
                  >
                    Save Changes
                  </button>
                )}

                <button
                  onClick={() => onDeleteNote(activeNote.id)}
                  className="p-2 rounded-xl hover:bg-red-950/60 text-zinc-400 hover:text-red-400"
                  title="Shred Note"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Note Content Textarea */}
            <div className="flex-1 flex flex-col gap-3 min-h-0">
              <textarea
                value={draftContent}
                onChange={(e) => {
                  setDraftContent(e.target.value);
                  setIsEditing(true);
                }}
                placeholder="Write confidential note, keys, or personal journal here..."
                className="w-full flex-1 bg-transparent text-zinc-200 text-xs sm:text-sm font-sans leading-relaxed resize-none focus:outline-none placeholder-zinc-600"
              />

              {/* Task Checklist Section */}
              <div className="pt-2 border-t border-zinc-800/80 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="font-semibold flex items-center gap-1.5 text-emerald-400">
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Action Items Checklist</span>
                  </span>
                  <span className="text-[11px] font-mono">
                    {draftChecklist.filter((c) => c.done).length} / {draftChecklist.length} done
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                    placeholder="Add task item and press Enter..."
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={handleAddChecklistItem}
                    className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium"
                  >
                    Add
                  </button>
                </div>

                <div className="max-h-32 overflow-y-auto flex flex-col gap-1 pr-1">
                  {draftChecklist.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/50 text-xs text-zinc-300"
                    >
                      <button
                        onClick={() => handleToggleChecklistItem(item.id)}
                        className="flex items-center gap-2 flex-1 text-left"
                      >
                        {item.done ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Circle className="w-4 h-4 text-zinc-500" />
                        )}
                        <span className={item.done ? 'line-through text-zinc-500' : ''}>
                          {item.text}
                        </span>
                      </button>
                      <button
                        onClick={() => handleDeleteChecklistItem(item.id)}
                        className="text-zinc-500 hover:text-red-400 p-0.5"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Note Stats Footer */}
            <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
              <span>
                {draftContent.length} chars • {draftContent.split(/\s+/).filter(Boolean).length} words
              </span>
              <span>Updated {new Date(activeNote.updatedAt).toLocaleTimeString()}</span>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500">
            <FileText className="w-10 h-10 mb-2 opacity-50 text-emerald-400" />
            <p className="text-sm">Select a note or create a new one</p>
          </div>
        )}
      </div>
    </div>
  );
};
