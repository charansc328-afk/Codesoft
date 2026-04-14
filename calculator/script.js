/**
 * script.js — TechCalc Modern Calculator Logic
 * Author: TechCalc
 * Features:
 *  - Number, operator, decimal, clear, delete, percent, toggle-sign
 *  - Division by zero handling
 *  - Consecutive operator prevention
 *  - Keyboard support (0-9, operators, Enter, Backspace, Escape, %)
 *  - Real-time display size scaling
 *  - Active operator highlight
 *  - Button press animation via CSS class toggling
 */

'use strict';

/* ─────────────────────────────────────────
   STATE
───────────────────────────────────────── */
const state = {
  currentVal:   '0',      // Number currently being entered
  previousVal:  '',       // Number stored before operator
  operator:     null,     // Pending operator (÷, ×, −, +)
  shouldReset:  false,    // True after = pressed or operator chosen
  expressionStr: '',      // Human-readable expression shown above
};

/* ─────────────────────────────────────────
   DOM REFS
───────────────────────────────────────── */
const displayCurrent    = document.getElementById('current');
const displayExpression = document.getElementById('expression');
const btnGrid           = document.querySelector('.btn-grid');

/* ─────────────────────────────────────────
   DISPLAY HELPERS
───────────────────────────────────────── */

/**
 * Update the main display value and auto-scale font size.
 * @param {string} value
 */
function updateDisplay(value) {
  displayCurrent.textContent = value;

  // Remove all size classes
  displayCurrent.classList.remove('shrink', 'shrink-sm', 'shrink-xs', 'error');

  const len = String(value).length;
  if (len > 18)      displayCurrent.classList.add('shrink-xs');
  else if (len > 12) displayCurrent.classList.add('shrink-sm');
  else if (len > 8)  displayCurrent.classList.add('shrink');
}

/** Update the expression (history) line */
function updateExpression(str) {
  displayExpression.textContent = str;
}

/** Show an error on the display */
function showError(msg = 'Error') {
  displayCurrent.textContent = msg;
  displayCurrent.classList.add('error');
  displayExpression.textContent = '';
  state.currentVal  = '0';
  state.previousVal = '';
  state.operator    = null;
  state.shouldReset = false;
  state.expressionStr = '';
}

/** Trigger the result pop animation */
function animateResult() {
  displayCurrent.classList.remove('result-pop');
  // Force reflow so the animation restarts
  void displayCurrent.offsetWidth;
  displayCurrent.classList.add('result-pop');
}

/** Highlight the active operator button, clear others */
function setActiveOperator(op) {
  document.querySelectorAll('.btn-op').forEach(b => b.classList.remove('active'));
  if (op) {
    const target = document.querySelector(`.btn-op[data-value="${op}"]`);
    if (target) target.classList.add('active');
  }
}

/* ─────────────────────────────────────────
   NUMBER FORMATTING
───────────────────────────────────────── */

/**
 * Format a number string for display.
 * Adds thousand separators for integer portions but preserves decimals.
 * @param {string} str
 * @returns {string}
 */
function formatNumber(str) {
  if (str === '' || str === '-' || str === '.' || str === '-.' ) return str;

  const isNeg = str.startsWith('-');
  const abs   = isNeg ? str.slice(1) : str;
  const [intPart, decPart] = abs.split('.');

  // Avoid adding commas if currently typing a decimal
  const formattedInt = Number(intPart).toLocaleString('en-US');

  let result = isNeg ? '-' + formattedInt : formattedInt;
  if (decPart !== undefined) result += '.' + decPart;

  return result;
}

/**
 * Strip commas to get the raw numeric string.
 * @param {string} str
 * @returns {string}
 */
function stripCommas(str) {
  return str.replace(/,/g, '');
}

/* ─────────────────────────────────────────
   CORE CALCULATION
───────────────────────────────────────── */

/**
 * Perform arithmetic based on stored operator.
 * @param {number} prev
 * @param {number} curr
 * @param {string} op
 * @returns {number|string} result or 'DIVZERO'
 */
function calculate(prev, curr, op) {
  switch (op) {
    case '+': return prev + curr;
    case '−': return prev - curr;
    case '×': return prev * curr;
    case '÷':
      if (curr === 0) return 'DIVZERO';
      return prev / curr;
    default: return curr;
  }
}

/* ─────────────────────────────────────────
   ACTIONS
───────────────────────────────────────── */

/** Handle digit / number input */
function handleNumber(digit) {
  // If previous result shown, start fresh
  if (state.shouldReset) {
    state.currentVal  = digit === '.' ? '0.' : digit;
    state.shouldReset = false;
  } else {
    if (state.currentVal === '0' && digit !== '.') {
      state.currentVal = digit;
    } else {
      // Limit input to 15 chars (prevent absurdly long numbers)
      if (stripCommas(state.currentVal).length >= 15) return;
      state.currentVal += digit;
    }
  }
  updateDisplay(formatNumber(state.currentVal));
}

/** Handle decimal point */
function handleDecimal() {
  if (state.shouldReset) {
    state.currentVal  = '0.';
    state.shouldReset = false;
    updateDisplay('0.');
    return;
  }
  if (!state.currentVal.includes('.')) {
    state.currentVal += '.';
    updateDisplay(state.currentVal);
  }
}

/** Handle an operator */
function handleOperator(op) {
  const curr = parseFloat(stripCommas(state.currentVal));

  if (state.operator && !state.shouldReset) {
    // Chain operations: compute running total
    const prev   = parseFloat(stripCommas(state.previousVal));
    const result = calculate(prev, curr, state.operator);

    if (result === 'DIVZERO') { showError('Cannot ÷ 0'); return; }
    if (!isFinite(result))    { showError('Math Error'); return; }

    const resultStr = parseFloat(result.toPrecision(10)).toString();
    state.previousVal = resultStr;
    state.currentVal  = resultStr;
    updateDisplay(formatNumber(resultStr));
    animateResult();
  } else {
    state.previousVal = state.currentVal;
  }

  state.operator     = op;
  state.shouldReset  = true;
  state.expressionStr = formatNumber(state.previousVal) + ' ' + op;
  updateExpression(state.expressionStr);
  setActiveOperator(op);
}

/** Handle the equals button */
function handleEquals() {
  if (!state.operator || state.previousVal === '') return;

  const curr   = parseFloat(stripCommas(state.currentVal));
  const prev   = parseFloat(stripCommas(state.previousVal));
  const result = calculate(prev, curr, state.operator);

  // Build expression string
  const exprFull = formatNumber(state.previousVal) + ' ' + state.operator + ' ' + formatNumber(state.currentVal) + ' =';
  updateExpression(exprFull);

  if (result === 'DIVZERO') { showError('Cannot ÷ 0'); return; }
  if (!isFinite(result))    { showError('Math Error'); return; }

  const resultStr = parseFloat(result.toPrecision(12)).toString();
  state.currentVal  = resultStr;
  state.previousVal = '';
  state.operator    = null;
  state.shouldReset = true;

  updateDisplay(formatNumber(resultStr));
  animateResult();
  setActiveOperator(null);
}

/** Toggle sign: positive ↔ negative */
function handleSign() {
  if (state.currentVal === '0') return;
  state.currentVal = state.currentVal.startsWith('-')
    ? state.currentVal.slice(1)
    : '-' + state.currentVal;
  updateDisplay(formatNumber(state.currentVal));
}

/** Percentage: divide current value by 100 */
function handlePercent() {
  const val = parseFloat(stripCommas(state.currentVal));
  if (isNaN(val)) return;

  const result    = val / 100;
  const resultStr = parseFloat(result.toPrecision(10)).toString();
  state.currentVal = resultStr;
  updateDisplay(formatNumber(resultStr));
}

/** Delete last character (backspace) */
function handleDelete() {
  if (state.shouldReset) {
    // After = was pressed; reset fully
    handleClear();
    return;
  }
  if (state.currentVal.length <= 1 || state.currentVal === '-0') {
    state.currentVal = '0';
  } else {
    state.currentVal = state.currentVal.slice(0, -1);
    // If only '-' left, reset to '0'
    if (state.currentVal === '-') state.currentVal = '0';
  }
  updateDisplay(formatNumber(state.currentVal));
}

/** Full clear / reset */
function handleClear() {
  state.currentVal    = '0';
  state.previousVal   = '';
  state.operator      = null;
  state.shouldReset   = false;
  state.expressionStr = '';
  displayCurrent.classList.remove('error', 'result-pop', 'shrink', 'shrink-sm', 'shrink-xs');
  updateDisplay('0');
  updateExpression('');
  setActiveOperator(null);
}

/* ─────────────────────────────────────────
   EVENT ROUTING (via delegation)
───────────────────────────────────────── */

btnGrid.addEventListener('click', function (e) {
  const btn = e.target.closest('.btn');
  if (!btn) return;

  const action = btn.dataset.action;
  const value  = btn.dataset.value;

  switch (action) {
    case 'number':   handleNumber(value);   break;
    case 'decimal':  handleDecimal();       break;
    case 'operator': handleOperator(value); break;
    case 'equals':   handleEquals();        break;
    case 'sign':     handleSign();          break;
    case 'percent':  handlePercent();       break;
    case 'delete':   handleDelete();        break;
    case 'clear':    handleClear();         break;
  }
});

/* ─────────────────────────────────────────
   KEYBOARD SUPPORT
───────────────────────────────────────── */

const KEY_MAP = {
  '0': () => handleNumber('0'),
  '1': () => handleNumber('1'),
  '2': () => handleNumber('2'),
  '3': () => handleNumber('3'),
  '4': () => handleNumber('4'),
  '5': () => handleNumber('5'),
  '6': () => handleNumber('6'),
  '7': () => handleNumber('7'),
  '8': () => handleNumber('8'),
  '9': () => handleNumber('9'),
  '.': () => handleDecimal(),
  ',': () => handleDecimal(),
  '+': () => handleOperator('+'),
  '-': () => handleOperator('−'),
  '*': () => handleOperator('×'),
  '/': () => handleOperator('÷'),
  'Enter':     () => handleEquals(),
  '=':         () => handleEquals(),
  'Backspace': () => handleDelete(),
  'Delete':    () => handleClear(),
  'Escape':    () => handleClear(),
  '%':         () => handlePercent(),
};

document.addEventListener('keydown', (e) => {
  // Prevent default browser action for /, * to avoid find, zoom etc.
  if (['/', '*', '+', '-'].includes(e.key)) e.preventDefault();

  const handler = KEY_MAP[e.key];
  if (handler) {
    handler();

    // Visual feedback: briefly highlight the corresponding button
    highlightKeyButton(e.key);
  }
});

/**
 * Briefly flash the matching on-screen button when a keyboard key is pressed.
 * @param {string} key
 */
function highlightKeyButton(key) {
  let selector = null;

  const keyToData = {
    '0': '[data-value="0"]',
    '1': '[data-value="1"]',
    '2': '[data-value="2"]',
    '3': '[data-value="3"]',
    '4': '[data-value="4"]',
    '5': '[data-value="5"]',
    '6': '[data-value="6"]',
    '7': '[data-value="7"]',
    '8': '[data-value="8"]',
    '9': '[data-value="9"]',
    '.': '[data-action="decimal"]',
    ',': '[data-action="decimal"]',
    '+': '[data-value="+"]',
    '-': '[data-value="−"]',
    '*': '[data-value="×"]',
    '/': '[data-value="÷"]',
    'Enter':     '[data-action="equals"]',
    '=':         '[data-action="equals"]',
    'Backspace': '[data-action="delete"]',
    'Delete':    '[data-action="clear"]',
    'Escape':    '[data-action="clear"]',
    '%':         '[data-action="percent"]',
  };

  selector = keyToData[key];
  if (!selector) return;

  const btn = document.querySelector(`.btn${selector}`);
  if (!btn) return;

  btn.classList.add('key-pressed');
  btn.style.filter = 'brightness(1.4)';
  btn.style.transform = 'scale(0.93)';

  setTimeout(() => {
    btn.style.filter   = '';
    btn.style.transform = '';
  }, 120);
}

/* ─────────────────────────────────────────
   INIT — ensure display is correct on load
───────────────────────────────────────── */
updateDisplay('0');
