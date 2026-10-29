import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateExpression,
  handleCalculatorInput,
  initialCalculatorState,
  checkSecretPasscode,
} from './calculator';

test('evaluateExpression performs standard arithmetic operations', () => {
  assert.equal(evaluateExpression(10, 5, '+'), 15);
  assert.equal(evaluateExpression(10, 5, '-'), 5);
  assert.equal(evaluateExpression(10, 5, '×'), 50);
  assert.equal(evaluateExpression(10, 5, '÷'), 2);
  assert.equal(evaluateExpression(10, 0, '÷'), 0); // divide by zero safety
});

test('handleCalculatorInput handles continuous key entry', () => {
  let state = initialCalculatorState;
  state = handleCalculatorInput(state, { type: 'digit', value: '1' });
  state = handleCalculatorInput(state, { type: 'digit', value: '2' });
  state = handleCalculatorInput(state, { type: 'digit', value: '3' });
  state = handleCalculatorInput(state, { type: 'digit', value: '4' });
  assert.equal(state.display, '1234');
  assert.equal(state.rawInputSequence, '1234');

  // Add decimal
  state = handleCalculatorInput(state, { type: 'dot' });
  state = handleCalculatorInput(state, { type: 'digit', value: '5' });
  assert.equal(state.display, '1234.5');

  // Backspace
  state = handleCalculatorInput(state, { type: 'backspace' });
  assert.equal(state.display, '1234.');
});

test('handleCalculatorInput calculates chain of operations with equals', () => {
  let state = initialCalculatorState;
  state = handleCalculatorInput(state, { type: 'digit', value: '8' });
  state = handleCalculatorInput(state, { type: 'operation', op: '×' });
  state = handleCalculatorInput(state, { type: 'digit', value: '7' });
  state = handleCalculatorInput(state, { type: 'equals' });
  assert.equal(state.display, '56');
  assert.equal(state.history.length, 1);
  assert.equal(state.history[0], '8 × 7 = 56');
});

test('checkSecretPasscode identifies master PIN and decoy PIN', () => {
  // Master PIN check
  const masterCheck = checkSecretPasscode('1234', '1234', '1234', '9999');
  assert.equal(masterCheck.isMatch, true);
  assert.equal(masterCheck.vaultType, 'master');

  // Decoy PIN check
  const decoyCheck = checkSecretPasscode('9999', '9999', '1234', '9999');
  assert.equal(decoyCheck.isMatch, true);
  assert.equal(decoyCheck.vaultType, 'decoy');

  // Unmatched normal calculation
  const unmatched = checkSecretPasscode('56', '8*7', '1234', '9999');
  assert.equal(unmatched.isMatch, false);
  assert.equal(unmatched.vaultType, null);
});
