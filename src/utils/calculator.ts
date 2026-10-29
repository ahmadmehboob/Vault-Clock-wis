/**
 * Pure calculator state machine and evaluation logic for CalcVault
 */

export interface CalculatorState {
  display: string;
  prevValue: number | null;
  operation: string | null;
  waitingForNewOperand: boolean;
  history: string[];
  rawInputSequence: string; // tracks consecutive keystrokes for secret pin matching
}

export const initialCalculatorState: CalculatorState = {
  display: '0',
  prevValue: null,
  operation: null,
  waitingForNewOperand: false,
  history: [],
  rawInputSequence: '',
};

export function evaluateExpression(prev: number, current: number, op: string): number {
  switch (op) {
    case '+':
      return prev + current;
    case '-':
    case '−':
      return prev - current;
    case '×':
    case '*':
      return prev * current;
    case '÷':
    case '/':
      return current !== 0 ? prev / current : 0;
    default:
      return current;
  }
}

export type CalcAction =
  | { type: 'digit'; value: string }
  | { type: 'dot' }
  | { type: 'operation'; op: string }
  | { type: 'equals' }
  | { type: 'clear' }
  | { type: 'all_clear' }
  | { type: 'toggle_sign' }
  | { type: 'percent' }
  | { type: 'backspace' }
  | { type: 'sqrt' }
  | { type: 'square' };

export function formatDisplay(num: number): string {
  if (isNaN(num)) return 'Error';
  if (!isFinite(num)) return 'Overflow';
  const str = num.toString();
  if (str.length > 12) {
    return num.toPrecision(8).replace(/\.?0+$/, '');
  }
  return str;
}

export function handleCalculatorInput(
  state: CalculatorState,
  action: CalcAction
): CalculatorState {
  switch (action.type) {
    case 'digit': {
      const isStart = state.display === '0' || state.waitingForNewOperand;
      const nextDisplay = isStart ? action.value : state.display + action.value;
      return {
        ...state,
        display: nextDisplay,
        waitingForNewOperand: false,
        rawInputSequence: state.rawInputSequence + action.value,
      };
    }

    case 'dot': {
      if (state.waitingForNewOperand) {
        return {
          ...state,
          display: '0.',
          waitingForNewOperand: false,
          rawInputSequence: state.rawInputSequence + '.',
        };
      }
      if (!state.display.includes('.')) {
        return {
          ...state,
          display: state.display + '.',
          rawInputSequence: state.rawInputSequence + '.',
        };
      }
      return state;
    }

    case 'operation': {
      const currentValue = parseFloat(state.display);

      if (state.prevValue !== null && state.operation && !state.waitingForNewOperand) {
        const computed = evaluateExpression(state.prevValue, currentValue, state.operation);
        return {
          ...state,
          display: formatDisplay(computed),
          prevValue: computed,
          operation: action.op,
          waitingForNewOperand: true,
          rawInputSequence: '', // reset pin on standard math op
        };
      }

      return {
        ...state,
        prevValue: currentValue,
        operation: action.op,
        waitingForNewOperand: true,
        rawInputSequence: '', // reset pin sequence when math operator is pressed
      };
    }

    case 'equals': {
      const currentValue = parseFloat(state.display);
      if (state.prevValue !== null && state.operation) {
        const computed = evaluateExpression(state.prevValue, currentValue, state.operation);
        const historyItem = `${state.prevValue} ${state.operation} ${currentValue} = ${formatDisplay(computed)}`;
        return {
          ...state,
          display: formatDisplay(computed),
          prevValue: null,
          operation: null,
          waitingForNewOperand: true,
          history: [historyItem, ...state.history].slice(0, 20),
        };
      }
      return state;
    }

    case 'clear':
      return {
        ...state,
        display: '0',
        waitingForNewOperand: false,
        rawInputSequence: '',
      };

    case 'all_clear':
      return {
        ...initialCalculatorState,
        history: state.history,
      };

    case 'toggle_sign': {
      const val = parseFloat(state.display);
      if (val === 0) return state;
      return {
        ...state,
        display: formatDisplay(-val),
      };
    }

    case 'percent': {
      const val = parseFloat(state.display);
      return {
        ...state,
        display: formatDisplay(val / 100),
      };
    }

    case 'backspace': {
      if (state.waitingForNewOperand || state.display.length <= 1) {
        return {
          ...state,
          display: '0',
          rawInputSequence: state.rawInputSequence.slice(0, -1),
        };
      }
      return {
        ...state,
        display: state.display.slice(0, -1),
        rawInputSequence: state.rawInputSequence.slice(0, -1),
      };
    }

    case 'sqrt': {
      const val = parseFloat(state.display);
      if (val < 0) return { ...state, display: 'Error' };
      return {
        ...state,
        display: formatDisplay(Math.sqrt(val)),
        waitingForNewOperand: true,
      };
    }

    case 'square': {
      const val = parseFloat(state.display);
      return {
        ...state,
        display: formatDisplay(val * val),
        waitingForNewOperand: true,
      };
    }

    default:
      return state;
  }
}

/**
 * Checks if the user entered passcode triggers vault unlock.
 * Matches either the current display string or the rawInputSequence before '='.
 */
export function checkSecretPasscode(
  currentDisplay: string,
  rawSequence: string,
  masterPin: string,
  decoyPin: string
): { isMatch: boolean; vaultType: 'master' | 'decoy' | null } {
  const cleanDisplay = currentDisplay.trim();
  const cleanRaw = rawSequence.trim();

  if (cleanDisplay === masterPin || cleanRaw.endsWith(masterPin)) {
    return { isMatch: true, vaultType: 'master' };
  }
  if (cleanDisplay === decoyPin || cleanRaw.endsWith(decoyPin)) {
    return { isMatch: true, vaultType: 'decoy' };
  }

  return { isMatch: false, vaultType: null };
}
