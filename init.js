// ================================================
// INIT.JS — Initialization, buttons, PWA service worker, print fix
// HojaMaestra | Consumer Packaging Monterrey
// ================================================

// Expose WEIGHT_DB globally for cross-module use
window.WEIGHT_DB = typeof WEIGHT_DB !== 'undefined' ? WEIGHT_DB : null;

// === PWA SERVICE WORKER ===

if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => console.log('[Init] Service Worker registered:', reg.scope))
            .catch(err => console.warn('[Init] Service Worker registration failed:', err));
    });
}

// === MTY1 PDF IMPORTER ===

window.mty1Importer = null;
document.addEventListener('DOMContentLoaded', () => {
    if (typeof MTY1Importer !== 'undefined') {
        console.log('[Init] Initializing MTY1 Importer...');
        window.mty1Importer = new MTY1Importer();
        const fileInput = document.getElementById('mty1-upload');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => window.mty1Importer.handleFile(e));
        }
    }
});

// === PRINT FIX (duplicated from image-handler but safer to have here for final page load) ===
// This version saves extra CSS properties that the image-handler.js version doesn't
const _initPrintImageStates = [];

window.addEventListener('beforeprint', function () {
    _initPrintImageStates.length = 0;
    document.querySelectorAll('.upload-area img').forEach(function (img) {
        _initPrintImageStates.push({
            img, transform: img.style.transform,
            maxWidth: img.style.maxWidth, maxHeight: img.style.maxHeight,
            width: img.style.width, height: img.style.height,
            position: img.style.position
        });
        img.style.transform = 'none';
        img.style.maxWidth = '100%'; img.style.maxHeight = '100%';
        img.style.width = 'auto'; img.style.height = 'auto';
        img.style.position = 'static';
    });
});

window.addEventListener('afterprint', function () {
    _initPrintImageStates.forEach(function (state) {
        state.img.style.transform = state.transform;
        state.img.style.maxWidth = state.maxWidth; state.img.style.maxHeight = state.maxHeight;
        state.img.style.width = state.width; state.img.style.height = state.height;
        state.img.style.position = state.position;
    });
    _initPrintImageStates.length = 0;
});

console.log('[Init] Módulo cargado');
