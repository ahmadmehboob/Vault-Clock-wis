import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CalculatorState,
  initialCalculatorState,
  handleCalculatorInput,
  checkSecretPasscode,
} from '../utils/calculator';
import { SecurityConfig } from '../types/vault';
import { playTactileClick } from '../utils/audio';
import {
  History,
  Info,
  Shield,
  Eye,
  EyeOff,
  Sparkles,
  Delete,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface CalculatorProps {
  securityConfig: SecurityConfig;
  onUnlock: (vaultType: 'master' | 'decoy') => void;
  onFailedAttempt: (entered: string) => void;
}

export const Calculator: React.FC<CalculatorProps> = ({
  securityConfig,
  onUnlock,
  onFailedAttempt,
}) => {
  const [calcState, setCalcState] = useState<CalculatorState>(initialCalculatorState);
  const [showHistory, setShowHistory] = useState(false);
  const [showHint, setShowHint] = useState(!securityConfig.hasCompletedFirstTimeSetup);
  const [scientificMode, setScientificMode] = useState(false);
  const [keyFlash, setKeyFlash] = useState<string | null>(null);
  const equalsTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerKeyFeedback = (key: string) => {
    setKeyFlash(key);
    setTimeout(() => setKeyFlash(null), 120);
  };

  const handleAction = useCallback(
    (actionType: string, val?: string) => {
      triggerKeyFeedback(val || actionType);

      if (actionType === 'digit' && val) {
        playTactileClick('number');
        setCalcState((prev) => handleCalculatorInput(prev, { type: 'digit', value: val }));
        return;
      }
      if (actionType === 'dot') {
        playTactileClick('number');
        setCalcState((prev) => handleCalculatorInput(prev, { type: 'dot' }));
        return;
      }
      if (actionType === 'operation' && val) {
        playTactileClick('operator');
        setCalcState((prev) => handleCalculatorInput(prev, { type: 'operation', op: val }));
        return;
      }
      if (actionType === 'clear') {
        playTactileClick('operator');
        setCalcState((prev) => handleCalculatorInput(prev, { type: 'clear' }));
        return;
      }
      if (actionType === 'all_clear') {
        playTactileClick('operator');
        setCalcState((prev) => handleCalculatorInput(prev, { type: 'all_clear' }));
        return;
      }
      if (actionType === 'backspace') {
        playTactileClick('operator');
        setCalcState((prev) => handleCalculatorInput(prev, { type: 'backspace' }));
        return;
      }
      if (actionType === 'toggle_sign') {
        playTactileClick('operator');
        setCalcState((prev) => handleCalculatorInput(prev, { type: 'toggle_sign' }));
        return;
      }
      if (actionType === 'percent') {
        playTactileClick('operator');
        if (securityConfig.triggerKey === '%') {
          // Check secret trigger on percent key
          const match = checkSecretPasscode(
            calcState.display,
            calcState.rawInputSequence,
            securityConfig.masterPin,
            securityConfig.decoyPin
          );
          if (match.isMatch && match.vaultType) {
            playTactileClick('unlock');
            onUnlock(match.vaultType);
            return;
          }
        }
        setCalcState((prev) => handleCalculatorInput(prev, { type: 'percent' }));
        return;
      }
      if (actionType === 'sqrt') {
        playTactileClick('operator');
        setCalcState((prev) => handleCalculatorInput(prev, { type: 'sqrt' }));
        return;
      }
      if (actionType === 'square') {
        playTactileClick('operator');
        setCalcState((prev) => handleCalculatorInput(prev, { type: 'square' }));
        return;
      }

      if (actionType === 'equals') {
        playTactileClick('equals');

        // Check if entered input matches secret PIN
        const match = checkSecretPasscode(
          calcState.display,
          calcState.rawInputSequence,
          securityConfig.masterPin,
          securityConfig.decoyPin
        );

        if (match.isMatch && match.vaultType) {
          playTactileClick('unlock');
          onUnlock(match.vaultType);
          return;
        }

        // If not matched, but looks like someone tried an unauthorized 4+ digit PIN
        if (
          calcState.rawInputSequence.length >= 4 &&
          calcState.rawInputSequence !== securityConfig.masterPin &&
          calcState.operation === null
        ) {
          onFailedAttempt(calcState.rawInputSequence);
        }

        // Normal calculator behavior
        setCalcState((prev) => handleCalculatorInput(prev, { type: 'equals' }));
      }
    },
    [calcState, securityConfig, onUnlock, onFailedAttempt]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleAction('digit', e.key);
      } else if (e.key === '.') {
        e.preventDefault();
        handleAction('dot');
      } else if (e.key === '+' || e.key === '-') {
        e.preventDefault();
        handleAction('operation', e.key);
      } else if (e.key === '*') {
        e.preventDefault();
        handleAction('operation', '×');
      } else if (e.key === '/') {
        e.preventDefault();
        handleAction('operation', '÷');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleAction('equals');
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleAction('backspace');
      } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        handleAction('clear');
      } else if (e.key === '%') {
        e.preventDefault();
        handleAction('percent');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAction]);

  // Handle long press on equals if configured
  const handleEqualsTouchStart = () => {
    if (securityConfig.triggerKey === 'long_equals') {
      equalsTimerRef.current = setTimeout(() => {
        const match = checkSecretPasscode(
          calcState.display,
          calcState.rawInputSequence,
          securityConfig.masterPin,
          securityConfig.decoyPin
        );
        if (match.isMatch && match.vaultType) {
          playTactileClick('unlock');
          onUnlock(match.vaultType);
        }
      }, 900);
    }
  };

  const handleEqualsTouchEnd = () => {
    if (equalsTimerRef.current) {
      clearTimeout(equalsTimerRef.current);
      equalsTimerRef.current = null;
    }
  };

  // Theme styles
  const isOled = securityConfig.camouflageStyle === 'retro_oled';
  const isSlate = securityConfig.camouflageStyle === 'scientific_slate';
  const isLight = securityConfig.camouflageStyle === 'clean_light';

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center p-3 select-none transition-colors duration-200 ${
        isLight ? 'bg-zinc-100 text-zinc-900' : 'bg-black text-white'
      }`}
    >
      {/* Discreet onboarding instruction banner */}
      {showHint && (
        <div className="w-full max-w-sm mb-3 bg-zinc-900/90 border border-emerald-500/30 rounded-xl p-3 text-xs text-zinc-300 shadow-xl backdrop-blur-md flex items-start gap-2.5 animate-fadeIn">
          <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0 mt-0.5">
            <Shield className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-emerald-400">Secret Vault Disguise</span>
              <button
                onClick={() => setShowHint(false)}
                className="text-zinc-400 hover:text-white p-0.5"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
            <p className="mt-1 text-zinc-300 leading-relaxed">
              This app behaves as an authentic calculator. To unlock the hidden vault, enter PIN{' '}
              <span className="font-mono bg-zinc-800 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/40 font-bold">
                {securityConfig.masterPin}=
              </span>{' '}
              (or Decoy PIN{' '}
              <span className="font-mono bg-zinc-800 text-amber-300 px-1 py-0.5 rounded border border-amber-500/40">
                {securityConfig.decoyPin}=
              </span>
              ).
            </p>
          </div>
        </div>
      )}

      {/* Main Calculator Body */}
      <div
        className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl flex flex-col gap-3 transition-all ${
          isLight
            ? 'bg-white border border-zinc-200 shadow-zinc-300/40'
            : isSlate
            ? 'bg-slate-900 border border-slate-800 shadow-cyan-950/20'
            : isOled
            ? 'bg-zinc-950 border border-green-900/40 shadow-green-950/20'
            : 'bg-zinc-950 border border-zinc-800/80 shadow-black'
        }`}
      >
        {/* Top toolbar */}
        <div className="flex items-center justify-between px-1 text-zinc-400 text-xs">
          <div className="flex items-center gap-1.5 font-medium tracking-wider">
            <span
              className={`w-2 h-2 rounded-full ${
                isOled ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-500'
              }`}
            />
            <span className={isOled ? 'font-mono text-emerald-400' : 'text-zinc-400'}>
              {isOled ? 'OLED-CALC v4.8' : isSlate ? 'TITANIUM LAB' : 'CALCULATOR'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setScientificMode(!scientificMode)}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
              title={scientificMode ? 'Compact' : 'Scientific Mode'}
              aria-label="Toggle Scientific Mode"
            >
              {scientificMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Calculation History"
              aria-label="Calculation History"
            >
              <History className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowHint(!showHint)}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-emerald-400 transition-colors"
              title="Vault Key Info"
              aria-label="Vault Key Info"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Calculation History Dropdown */}
        {showHistory && (
          <div
            className={`p-3 rounded-xl max-h-36 overflow-y-auto text-xs flex flex-col gap-1 border ${
              isLight
                ? 'bg-zinc-50 border-zinc-200 text-zinc-700'
                : 'bg-zinc-900 border-zinc-800 text-zinc-300'
            }`}
          >
            <div className="flex items-center justify-between font-semibold pb-1 border-b border-zinc-700/50">
              <span>Recent Computations</span>
              <button
                onClick={() => setCalcState((prev) => ({ ...prev, history: [] }))}
                className="text-[10px] text-zinc-400 hover:text-red-400"
              >
                Clear
              </button>
            </div>
            {calcState.history.length === 0 ? (
              <span className="text-zinc-500 italic py-2 text-center">No calculations yet</span>
            ) : (
              calcState.history.map((item, idx) => (
                <div key={idx} className="font-mono text-right hover:text-emerald-400 py-0.5">
                  {item}
                </div>
              ))
            )}
          </div>
        )}

        {/* Calculator Display Screen */}
        <div
          className={`h-24 px-4 py-2 rounded-2xl flex flex-col justify-end items-end overflow-hidden ${
            isOled
              ? 'bg-black border border-emerald-900/60 font-mono text-emerald-400'
              : isLight
              ? 'bg-zinc-100 text-zinc-900'
              : 'bg-zinc-900/60 border border-zinc-800/50 text-white'
          }`}
        >
          {/* Previous operand / operation indicator */}
          <div className="text-xs text-zinc-400 font-mono h-4 tracking-wider">
            {calcState.prevValue !== null && calcState.operation
              ? `${calcState.prevValue} ${calcState.operation}`
              : ''}
          </div>
          {/* Main big display */}
          <div
            className="text-4xl md:text-5xl font-light tracking-tight truncate max-w-full font-mono"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {calcState.display}
          </div>
        </div>

        {/* Scientific function row (when expanded) */}
        {scientificMode && (
          <div className="grid grid-cols-4 gap-2 pt-1 animate-fadeIn">
            <button
              onClick={() => handleAction('square')}
              className="h-10 rounded-xl bg-zinc-800/70 hover:bg-zinc-700 text-xs font-mono text-zinc-300 active:scale-95 transition-all"
            >
              x²
            </button>
            <button
              onClick={() => handleAction('sqrt')}
              className="h-10 rounded-xl bg-zinc-800/70 hover:bg-zinc-700 text-xs font-mono text-zinc-300 active:scale-95 transition-all"
            >
              √x
            </button>
            <button
              onClick={() => handleAction('digit', '3.14159')}
              className="h-10 rounded-xl bg-zinc-800/70 hover:bg-zinc-700 text-xs font-mono text-zinc-300 active:scale-95 transition-all"
            >
              π
            </button>
            <button
              onClick={() => handleAction('digit', '2.71828')}
              className="h-10 rounded-xl bg-zinc-800/70 hover:bg-zinc-700 text-xs font-mono text-zinc-300 active:scale-95 transition-all"
            >
              e
            </button>
          </div>
        )}

        {/* Standard Keypad Grid */}
        <div className="grid grid-cols-4 gap-2.5 pt-1">
          {/* Row 1 */}
          <button
            onClick={() => handleAction(calcState.display === '0' ? 'all_clear' : 'clear')}
            className={`h-14 rounded-2xl font-medium text-lg active:scale-95 transition-all ${
              isLight
                ? 'bg-zinc-200 text-zinc-800 hover:bg-zinc-300'
                : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
            }`}
          >
            {calcState.display === '0' ? 'AC' : 'C'}
          </button>
          <button
            onClick={() => handleAction('toggle_sign')}
            className={`h-14 rounded-2xl font-medium text-lg active:scale-95 transition-all ${
              isLight
                ? 'bg-zinc-200 text-zinc-800 hover:bg-zinc-300'
                : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
            }`}
          >
            ±
          </button>
          <button
            onClick={() => handleAction('percent')}
            className={`h-14 rounded-2xl font-medium text-lg active:scale-95 transition-all ${
              isLight
                ? 'bg-zinc-200 text-zinc-800 hover:bg-zinc-300'
                : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
            }`}
          >
            %
          </button>
          <button
            onClick={() => handleAction('operation', '÷')}
            className={`h-14 rounded-2xl font-semibold text-xl active:scale-95 transition-all ${
              isOled
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                : 'bg-amber-600 text-white hover:bg-amber-500 shadow-md shadow-amber-900/30'
            }`}
          >
            ÷
          </button>

          {/* Row 2 */}
          <button
            onClick={() => handleAction('digit', '7')}
            className={`h-14 rounded-2xl font-medium text-xl active:scale-95 transition-all ${
              isLight
                ? 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'
                : 'bg-zinc-900 text-zinc-100 hover:bg-zinc-800'
            }`}
          >
            7
          </button>
          <button
            onClick={() => handleAction('digit', '8')}
            className={`h-14 rounded-2xl font-medium text-xl active:scale-95 transition-all ${
              isLight
                ? 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'
                : 'bg-zinc-900 text-zinc-100 hover:bg-zinc-800'
            }`}
          >
            8
          </button>
          <button
            onClick={() => handleAction('digit', '9')}
            className={`h-14 rounded-2xl font-medium text-xl active:scale-95 transition-all ${
              isLight
                ? 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'
                : 'bg-zinc-900 text-zinc-100 hover:bg-zinc-800'
            }`}
          >
            9
          </button>
          <button
            onClick={() => handleAction('operation', '×')}
            className={`h-14 rounded-2xl font-semibold text-xl active:scale-95 transition-all ${
              isOled
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                : 'bg-amber-600 text-white hover:bg-amber-500 shadow-md shadow-amber-900/30'
            }`}
          >
            ×
          </button>

          {/* Row 3 */}
          <button
            onClick={() => handleAction('digit', '4')}
            className={`h-14 rounded-2xl font-medium text-xl active:scale-95 transition-all ${
              isLight
                ? 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'
                : 'bg-zinc-900 text-zinc-100 hover:bg-zinc-800'
            }`}
          >
            4
          </button>
          <button
            onClick={() => handleAction('digit', '5')}
            className={`h-14 rounded-2xl font-medium text-xl active:scale-95 transition-all ${
              isLight
                ? 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'
                : 'bg-zinc-900 text-zinc-100 hover:bg-zinc-800'
            }`}
          >
            5
          </button>
          <button
            onClick={() => handleAction('digit', '6')}
            className={`h-14 rounded-2xl font-medium text-xl active:scale-95 transition-all ${
              isLight
                ? 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'
                : 'bg-zinc-900 text-zinc-100 hover:bg-zinc-800'
            }`}
          >
            6
          </button>
          <button
            onClick={() => handleAction('operation', '-')}
            className={`h-14 rounded-2xl font-semibold text-2xl active:scale-95 transition-all ${
              isOled
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                : 'bg-amber-600 text-white hover:bg-amber-500 shadow-md shadow-amber-900/30'
            }`}
          >
            −
          </button>

          {/* Row 4 */}
          <button
            onClick={() => handleAction('digit', '1')}
            className={`h-14 rounded-2xl font-medium text-xl active:scale-95 transition-all ${
              isLight
                ? 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'
                : 'bg-zinc-900 text-zinc-100 hover:bg-zinc-800'
            }`}
          >
            1
          </button>
          <button
            onClick={() => handleAction('digit', '2')}
            className={`h-14 rounded-2xl font-medium text-xl active:scale-95 transition-all ${
              isLight
                ? 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'
                : 'bg-zinc-900 text-zinc-100 hover:bg-zinc-800'
            }`}
          >
            2
          </button>
          <button
            onClick={() => handleAction('digit', '3')}
            className={`h-14 rounded-2xl font-medium text-xl active:scale-95 transition-all ${
              isLight
                ? 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'
                : 'bg-zinc-900 text-zinc-100 hover:bg-zinc-800'
            }`}
          >
            3
          </button>
          <button
            onClick={() => handleAction('operation', '+')}
            className={`h-14 rounded-2xl font-semibold text-xl active:scale-95 transition-all ${
              isOled
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                : 'bg-amber-600 text-white hover:bg-amber-500 shadow-md shadow-amber-900/30'
            }`}
          >
            +
          </button>

          {/* Row 5 */}
          <button
            onClick={() => handleAction('backspace')}
            className={`h-14 rounded-2xl font-medium text-lg flex items-center justify-center active:scale-95 transition-all ${
              isLight
                ? 'bg-zinc-200 text-zinc-800 hover:bg-zinc-300'
                : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
            }`}
            title="Backspace"
            aria-label="Backspace"
          >
            <Delete className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleAction('digit', '0')}
            className={`h-14 rounded-2xl font-medium text-xl active:scale-95 transition-all ${
              isLight
                ? 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'
                : 'bg-zinc-900 text-zinc-100 hover:bg-zinc-800'
            }`}
          >
            0
          </button>
          <button
            onClick={() => handleAction('dot')}
            className={`h-14 rounded-2xl font-semibold text-xl active:scale-95 transition-all ${
              isLight
                ? 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'
                : 'bg-zinc-900 text-zinc-100 hover:bg-zinc-800'
            }`}
          >
            .
          </button>
          <button
            onClick={() => handleAction('equals')}
            onTouchStart={handleEqualsTouchStart}
            onTouchEnd={handleEqualsTouchEnd}
            onMouseDown={handleEqualsTouchStart}
            onMouseUp={handleEqualsTouchEnd}
            className={`h-14 rounded-2xl font-bold text-2xl active:scale-95 transition-all ${
              isOled
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/30'
            }`}
            title="Calculate or Unlock Secret Vault"
            aria-label="Equals"
          >
            =
          </button>
        </div>

        {/* Bottom stealth status indicator */}
        <div className="flex items-center justify-between pt-1 px-1 text-[11px] text-zinc-500">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
            <span>Battery 98%</span>
          </div>
          <span className="font-mono">MATH CORE EN-2026</span>
        </div>
      </div>
    </div>
  );
};
