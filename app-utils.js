// ================================================
// APP-UTILS.JS — Constantes globales y helpers de formulario
// HojaMaestra | Consumer Packaging Monterrey
// ================================================

// ========================================
// GLOBAL CONSTANTS
// ========================================
const MATERIAL_CONSTANTS = {
    FLUTE_FACTORS: {
        E: 1.32,
        B: 1.35,
        C: 1.48
    },
    ADHESIVES: {
        STARCH: 18,  // g/m²
        PVA: 26,     // g/m²
        TOTAL: 44    // g/m²
    }
};

// ========================================
// GLOBAL HELPER FUNCTIONS
// ========================================

/**
 * Get value from input element by data-id
 * @param {string} id - The data-id attribute value
 * @returns {string} The input value or empty string
 */
function getVal(id) {
    const el = document.querySelector(`input[data-id="${id}"], textarea[data-id="${id}"], select[data-id="${id}"]`);
    return el ? el.value : '';
}

/**
 * Get numeric value from input element by data-id
 * @param {string} id - The data-id attribute value
 * @returns {number} The parsed float value or 0 if invalid
 */
function getNum(id) {
    const val = parseFloat(getVal(id));
    return isNaN(val) ? 0 : val;
}

/**
 * Set value to input element by data-id (with optional formatting)
 * @param {string} id - The data-id attribute value
 * @param {any} val - The value to set
 * @param {Object} options - Optional settings
 * @param {boolean} options.skipIfFocused - Don't set if user is typing in it
 * @param {boolean} options.formatCommas - Format number with commas
 */
function setVal(id, val, options = {}) {
    const el = document.querySelector(`input[data-id="${id}"], textarea[data-id="${id}"], select[data-id="${id}"]`);
    if (!el) return;

    // Don't overwrite if user is actively typing in this field
    if (options.skipIfFocused && el === document.activeElement) return;

    // Format with commas if requested
    if (options.formatCommas && typeof val === 'number') {
        el.value = val.toLocaleString('en-US');
    } else {
        el.value = val;
    }
}

/**
 * Safe error handler wrapper for async functions
 * @param {Function} fn - Async function to wrap
 * @param {string} errorMessage - User-friendly error message
 * @returns {Function} Wrapped function with error handling
 */
function withErrorHandler(fn, errorMessage = 'Ocurrió un error') {
    return async function (...args) {
        try {
            return await fn.apply(this, args);
        } catch (error) {
            console.error(`[Error] ${errorMessage}:`, error);
            if (window.UI && typeof window.UI.showToast === 'function') {
                window.UI.showToast(errorMessage, true);
            } else {
                alert(errorMessage);
            }
            return null;
        }
    };
}

/**
 * Safe JSON parser from localStorage
 * @param {string} key - localStorage key
 * @param {any} defaultValue - Default value if parsing fails
 * @returns {any} Parsed data or default value
 */
function safeGetFromStorage(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
        console.error(`Error parsing localStorage key "${key}":`, error);
        return defaultValue;
    }
}

/**
 * Safe JSON setter to localStorage
 * @param {string} key - localStorage key
 * @param {any} value - Value to store
 * @returns {boolean} Success status
 */
function safeSetToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error(`Error saving to localStorage key "${key}":`, error);
        return false;
    }
}

// Make globally accessible
window.AppUtils = {
    getVal,
    getNum,
    setVal,
    withErrorHandler,
    safeGetFromStorage,
    safeSetToStorage,
    MATERIAL_CONSTANTS
};

console.log('[AppUtils] Módulo cargado');
