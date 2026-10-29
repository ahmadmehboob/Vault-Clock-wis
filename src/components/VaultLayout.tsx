import React, { useState, useEffect, useRef } from 'react';
import { MediaItem, NoteItem, SecurityConfig } from '../types/vault';
import {
  Shield,
  Image as ImageIcon,
  FileText,
  Lock,
  LogOut,
  AlertOctagon,
  Settings,
  HardDrive,
  Trash2,
  Clock,
  Zap,
} from 'lucide-react';

interface VaultLayoutProps {
  securityConfig: SecurityConfig;
  isDecoy: boolean;
  mediaCount: number;
  notesCount: number;
  activeTab: 'media' | 'notes' | 'security' | 'trash';
  onTabChange: (tab: 'media' | 'notes' | 'security' | 'trash') => void;
  onLock: () => void;
  children: React.ReactNode;
}

export const VaultLayout: React.FC<VaultLayoutProps> = ({
  securityConfig,
  isDecoy,
  mediaCount,
  notesCount,
  activeTab,
  onTabChange,
  onLock,
  children,
}) => {
  // Auto-lock countdown
  const [secondsRemaining, setSecondsRemaining] = useState<number>(
    securityConfig.autoLockDelaySeconds || 60
  );
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset timer on user activity
  const resetTimer = () => {
    if (securityConfig.autoLockDelaySeconds > 0) {
      setSecondsRemaining(securityConfig.autoLockDelaySeconds);
    }
  };

  useEffect(() => {
    if (securityConfig.autoLockDelaySeconds <= 0) return;

    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          onLock();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const handleActivity = () => resetTimer();
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);

    // Flip-to-hide on window blur (switching tabs or apps)
    const handleBlur = () => {
      if (securityConfig.lockOnWindowBlur) {
        onLock();
      }
    };
    window.addEventListener('blur', handleBlur);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('blur', handleBlur);
    };
  }, [securityConfig.autoLockDelaySeconds, securityConfig.lockOnWindowBlur, onLock]);

  // Panic button on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onLock();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onLock]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col select-none">
      {/* Top Header HUD */}
      <header className="h-16 bg-zinc-950/80 border-b border-zinc-800/80 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 backdrop-blur-xl">
        {/* Brand & Security Badge */}
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-lg ${
              isDecoy
                ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {isDecoy ? '📁' : <Shield className="w-5 h-5 text-emerald-400" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm md:text-base font-bold tracking-tight text-white font-mono">
                {isDecoy ? 'PERSONAL MEDIA VAULT' : 'CALCVAULT CORE'}
              </h1>
              {isDecoy ? (
                <span className="text-[10px] bg-amber-950/80 text-amber-300 px-2 py-0.5 rounded-full border border-amber-800/40 font-mono">
                  DECOY VAULT ACTIVE
                </span>
              ) : (
                <span className="text-[10px] bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-800/40 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>AES-256 GCM</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block">
              {isDecoy
                ? 'Safe decoy profile with mock items'
                : 'Military-grade hardware-isolated personal storage'}
            </p>
          </div>
        </div>

        {/* Right Controls: Auto-Lock timer, Panic Disguise Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          {securityConfig.autoLockDelaySeconds > 0 && (
            <div
              className="hidden sm:flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-xl text-xs font-mono text-zinc-300"
              title="Time until auto-relock"
            >
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>{secondsRemaining}s</span>
            </div>
          )}

          {/* Panic / Quick Disguise Button */}
          <button
            onClick={onLock}
            className="px-3.5 py-1.5 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-700/60 text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-red-950/40 active:scale-95 transition-all"
            title="Instant Panic Lock: Flip immediately back to normal calculator (Esc)"
          >
            <AlertOctagon className="w-4 h-4 text-red-400" />
            <span>Panic Hide (Esc)</span>
          </button>
        </div>
      </header>

      {/* Vault Navigation Tabs */}
      <nav className="bg-zinc-900/40 border-b border-zinc-800/60 px-4 md:px-6 py-2 flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => onTabChange('media')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'media'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Photos & Videos</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 font-mono">
            {mediaCount}
          </span>
        </button>

        <button
          onClick={() => onTabChange('notes')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'notes'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Personal Notes</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 font-mono">
            {notesCount}
          </span>
        </button>

        <button
          onClick={() => onTabChange('security')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'security'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Security Center</span>
        </button>
      </nav>

      {/* Main Workspace Body */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">{children}</main>
    </div>
  );
};
