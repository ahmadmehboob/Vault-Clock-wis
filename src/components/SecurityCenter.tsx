import React, { useState } from 'react';
import { SecurityConfig, IntruderLog } from '../types/vault';
import { calculateSecurityScore } from '../utils/crypto';
import {
  Shield,
  ShieldAlert,
  Key,
  Lock,
  Camera,
  Flame,
  Download,
  Upload,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Palette,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react';

interface SecurityCenterProps {
  securityConfig: SecurityConfig;
  intruderLogs: IntruderLog[];
  onUpdateConfig: (config: SecurityConfig) => void;
  onClearIntruderLogs: () => void;
  onExportBackup: () => void;
  onImportBackup: (json: string) => void;
  onWipeVault: () => void;
}

export const SecurityCenter: React.FC<SecurityCenterProps> = ({
  securityConfig,
  intruderLogs,
  onUpdateConfig,
  onClearIntruderLogs,
  onExportBackup,
  onImportBackup,
  onWipeVault,
}) => {
  const [masterPinInput, setMasterPinInput] = useState(securityConfig.masterPin);
  const [decoyPinInput, setDecoyPinInput] = useState(securityConfig.decoyPin);
  const [showPins, setShowPins] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);

  // Security score
  const health = calculateSecurityScore({
    masterPinLength: securityConfig.masterPin.length,
    hasDecoyPin: !!securityConfig.decoyPin && securityConfig.decoyPin !== securityConfig.masterPin,
    intruderDetection: securityConfig.intruderDetectionEnabled,
    autoLockMinutes: securityConfig.autoLockDelaySeconds / 60,
    lockOnBlur: securityConfig.lockOnWindowBlur,
    wipeProtection: securityConfig.maxFailedAttemptsBeforeWipe > 0,
  });

  const handleSavePinChanges = (e: React.FormEvent) => {
    e.preventDefault();
    if (masterPinInput.length < 4) {
      alert('Master PIN must be at least 4 digits');
      return;
    }
    if (masterPinInput === decoyPinInput) {
      alert('Decoy PIN must be different from Master PIN');
      return;
    }

    onUpdateConfig({
      ...securityConfig,
      masterPin: masterPinInput,
      decoyPin: decoyPinInput,
      hasCompletedFirstTimeSetup: true,
    });

    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 2500);
  };

  const handleBackupFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onImportBackup(reader.result as string);
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-10">
      {/* Security Health Score Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center border border-zinc-700">
            <Shield className="w-8 h-8 text-emerald-400" />
            <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-emerald-500 text-[10px] font-bold text-black font-mono">
              {health.score}%
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white">Vault Security Health</h2>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  health.level === 'Military-Grade'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                    : health.level === 'Strong'
                    ? 'bg-cyan-950 text-cyan-400 border border-cyan-500/40'
                    : 'bg-amber-950 text-amber-400 border border-amber-500/40'
                }`}
              >
                {health.level}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Encrypted with AES-GCM 256-bit PBKDF2 with client-side zero-knowledge storage.
            </p>
          </div>
        </div>

        {health.recommendations.length > 0 && (
          <div className="bg-zinc-950/80 p-3 rounded-2xl border border-zinc-800/80 text-xs text-zinc-300 max-w-sm">
            <span className="font-semibold text-amber-400 block mb-1">Recommended Action:</span>
            <ul className="list-disc list-inside text-zinc-400 space-y-0.5">
              {health.recommendations.slice(0, 2).map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-600/90 text-white text-xs rounded-xl flex items-center gap-2 animate-fadeIn shadow-lg border border-emerald-400/40">
          <CheckCircle2 className="w-4 h-4" />
          <span>Security configuration successfully updated and saved!</span>
        </div>
      )}

      {/* Grid of Security Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Passcode & Decoy Settings */}
        <div className="p-5 rounded-3xl bg-zinc-900/60 border border-zinc-800 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2 text-white font-semibold text-sm">
              <Key className="w-4 h-4 text-emerald-400" />
              <span>Passcode & Anti-Coercion</span>
            </div>
            <button
              onClick={() => setShowPins(!showPins)}
              className="text-zinc-400 hover:text-white text-xs flex items-center gap-1"
            >
              {showPins ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showPins ? 'Hide' : 'Show'}</span>
            </button>
          </div>

          <form onSubmit={handleSavePinChanges} className="flex flex-col gap-3 text-xs">
            {/* Master PIN */}
            <div className="flex flex-col gap-1">
              <label className="text-zinc-400 font-medium">Master Secret Vault PIN</label>
              <div className="relative">
                <input
                  type={showPins ? 'text' : 'password'}
                  value={masterPinInput}
                  onChange={(e) => setMasterPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="e.g. 1234"
                  maxLength={10}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono text-sm tracking-widest focus:outline-none focus:border-emerald-500"
                />
                <span className="absolute right-3 top-2.5 text-[10px] text-zinc-500 font-mono">
                  Press = to unlock
                </span>
              </div>
              <span className="text-[11px] text-zinc-500">
                Unlock trigger sequence on calculator (e.g. {masterPinInput || '1234'}=).
              </span>
            </div>

            {/* Decoy PIN */}
            <div className="flex flex-col gap-1 pt-2">
              <label className="text-amber-400 font-medium flex items-center gap-1">
                <span>Anti-Coercion Decoy PIN</span>
                <span className="text-[10px] bg-amber-950/80 px-1.5 py-0.5 rounded text-amber-300 border border-amber-800/40">
                  Duress Shield
                </span>
              </label>
              <div className="relative">
                <input
                  type={showPins ? 'text' : 'password'}
                  value={decoyPinInput}
                  onChange={(e) => setDecoyPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="e.g. 9999"
                  maxLength={10}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono text-sm tracking-widest focus:outline-none focus:border-amber-500"
                />
                <span className="absolute right-3 top-2.5 text-[10px] text-zinc-500 font-mono">
                  Press = to unlock
                </span>
              </div>
              <span className="text-[11px] text-zinc-500">
                Entering this PIN opens an innocent decoy vault with dummy photos and notes.
              </span>
            </div>

            {/* Trigger Key */}
            <div className="flex flex-col gap-1 pt-2">
              <label className="text-zinc-400 font-medium">Calculator Unlock Trigger Key</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateConfig({ ...securityConfig, triggerKey: '=' })}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    securityConfig.triggerKey === '='
                      ? 'bg-emerald-600/30 border-emerald-500 text-white font-semibold'
                      : 'border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  Standard [ = ] Key
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateConfig({ ...securityConfig, triggerKey: 'long_equals' })}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    securityConfig.triggerKey === 'long_equals'
                      ? 'bg-emerald-600/30 border-emerald-500 text-white font-semibold'
                      : 'border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  Long-Press [ = ] (1s)
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="mt-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
            >
              Update Passcodes
            </button>
          </form>
        </div>

        {/* Card 2: Auto-Lock & Stealth Controls */}
        <div className="p-5 rounded-3xl bg-zinc-900/60 border border-zinc-800 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-white font-semibold text-sm pb-3 border-b border-zinc-800">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>Auto-Lock & Camouflage</span>
          </div>

          <div className="flex flex-col gap-4 text-xs">
            {/* Auto Lock Timer */}
            <div className="flex flex-col gap-1.5">
              <label className="text-zinc-400 font-medium">Inactivity Auto-Lock</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { sec: 30, label: '30s' },
                  { sec: 60, label: '1m' },
                  { sec: 180, label: '3m' },
                  { sec: 0, label: 'Off' },
                ].map((opt) => (
                  <button
                    key={opt.sec}
                    onClick={() =>
                      onUpdateConfig({ ...securityConfig, autoLockDelaySeconds: opt.sec })
                    }
                    className={`py-1.5 rounded-xl border text-center font-mono ${
                      securityConfig.autoLockDelaySeconds === opt.sec
                        ? 'bg-emerald-600 text-white font-bold border-emerald-500'
                        : 'border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Flip to Hide on Window Blur */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950 border border-zinc-800">
              <div className="flex flex-col">
                <span className="font-semibold text-white">Flip-to-Hide (Tab Switch)</span>
                <span className="text-[11px] text-zinc-400">
                  Instantly relocks to calculator when window loses focus
                </span>
              </div>
              <input
                type="checkbox"
                checked={securityConfig.lockOnWindowBlur}
                onChange={(e) =>
                  onUpdateConfig({ ...securityConfig, lockOnWindowBlur: e.target.checked })
                }
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </div>

            {/* Camouflage Theme */}
            <div className="flex flex-col gap-1.5">
              <label className="text-zinc-400 font-medium flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-zinc-400" />
                <span>Calculator Camouflage Skin</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'apple_dark', label: 'Titanium Dark' },
                  { id: 'scientific_slate', label: 'Scientific Slate' },
                  { id: 'retro_oled', label: 'Retro OLED Green' },
                  { id: 'clean_light', label: 'Minimalist Light' },
                ].map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() =>
                      onUpdateConfig({
                        ...securityConfig,
                        camouflageStyle: theme.id as SecurityConfig['camouflageStyle'],
                      })
                    }
                    className={`p-2 rounded-xl border text-left text-xs ${
                      securityConfig.camouflageStyle === theme.id
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-400 font-semibold'
                        : 'border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    {theme.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Emergency Wipe After Failed Attempts */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950 border border-zinc-800">
              <div className="flex flex-col">
                <span className="font-semibold text-red-400 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" />
                  <span>Self-Destruct Protection</span>
                </span>
                <span className="text-[11px] text-zinc-500">
                  Wipes data after 5 consecutive failed break-in attempts
                </span>
              </div>
              <input
                type="checkbox"
                checked={securityConfig.maxFailedAttemptsBeforeWipe > 0}
                onChange={(e) =>
                  onUpdateConfig({
                    ...securityConfig,
                    maxFailedAttemptsBeforeWipe: e.target.checked ? 5 : 0,
                  })
                }
                className="w-4 h-4 accent-red-500 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Card 3: Intruder Break-In Logs */}
        <div className="p-5 rounded-3xl bg-zinc-900/60 border border-zinc-800 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2 text-white font-semibold text-sm">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span>Intruder Break-In Detection</span>
            </div>

            <button
              onClick={onClearIntruderLogs}
              className="text-zinc-500 hover:text-red-400 text-xs"
            >
              Clear Logs
            </button>
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400 bg-zinc-950 p-3 rounded-2xl border border-zinc-800">
            <span>Intruder Break-in Sentinel:</span>
            <span
              className={`px-2 py-0.5 rounded-full font-bold font-mono text-[10px] ${
                securityConfig.intruderDetectionEnabled
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {securityConfig.intruderDetectionEnabled ? 'ACTIVE MONITOR' : 'DISABLED'}
            </span>
          </div>

          {/* Logs List */}
          <div className="flex-1 max-h-52 overflow-y-auto flex flex-col gap-2">
            {intruderLogs.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-xs italic">
                No unauthorized break-in attempts recorded.
              </div>
            ) : (
              intruderLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-xl bg-red-950/20 border border-red-900/30 text-xs flex items-center justify-between"
                >
                  <div>
                    <span className="font-semibold text-red-400">Failed PIN: {log.enteredInput}</span>
                    <p className="text-[10px] text-zinc-400">{log.reason}</p>
                  </div>
                  <span className="font-mono text-[10px] text-zinc-500">
                    {new Date(log.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card 4: Encrypted Backup & Hard Wipe */}
        <div className="p-5 rounded-3xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-white font-semibold text-sm pb-3 border-b border-zinc-800">
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Encrypted Vault Backup</span>
            </div>

            <p className="text-xs text-zinc-400 mt-3 leading-relaxed">
              Export your photos, videos, and notes into an encrypted JSON file for cold offsite
              storage or device transfer.
            </p>

            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={onExportBackup}
                className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 border border-zinc-700"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Download Encrypted Backup</span>
              </button>

              <label className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 border border-zinc-700 cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>Restore Backup</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleBackupFileSelect}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Hard Wipe */}
          <div className="pt-4 border-t border-zinc-800/80">
            {showWipeConfirm ? (
              <div className="p-3 bg-red-950/80 border border-red-700 rounded-2xl flex flex-col gap-2 text-xs">
                <span className="font-bold text-red-200">
                  WARNING: This will permanently shred all vault photos, videos, and notes!
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onWipeVault();
                      setShowWipeConfirm(false);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold"
                  >
                    Confirm Shred Everything
                  </button>
                  <button
                    onClick={() => setShowWipeConfirm(false)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowWipeConfirm(true)}
                className="w-full py-2 rounded-xl bg-red-950/30 hover:bg-red-950/60 border border-red-900/50 text-red-400 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Emergency Shred & Reset Vault</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
