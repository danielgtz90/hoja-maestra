// ================================================
// UI.JS — Global Settings Modal, Formulas Modal, Sidebar helpers
// HojaMaestra | Consumer Packaging Monterrey
// ================================================

function showCotizadorModal() {
    document.getElementById('cotizadorModalContainer').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function hideCotizadorModal() {
    document.getElementById('cotizadorModalContainer').classList.add('hidden');
    document.body.style.overflow = 'auto';
}

// === GLOBAL SETTINGS MODAL ===

function openGlobalSettings() {
    const settingsModal = document.getElementById('globalSettingsModalOverlay');
    if (settingsModal) {
        initializeGlobalSettings();
        settingsModal.classList.remove('hidden');
        setTimeout(() => {
            const modalContent = settingsModal.querySelector('div > div');
            if (modalContent) {
                modalContent.style.opacity = '1';
                modalContent.style.transform = 'scale(1)';
            }
        }, 10);
    }
}

function closeGlobalSettings() {
    const settingsModal = document.getElementById('globalSettingsModalOverlay');
    if (settingsModal) {
        settingsModal.classList.add('hidden');
        const modalContent = settingsModal.querySelector('div > div');
        if (modalContent) {
            modalContent.style.opacity = '0';
            modalContent.style.transform = 'scale(0.95)';
        }
    }
}

let globalSettingsInitialized = false;

function initializeGlobalSettings() {
    if (globalSettingsInitialized) return;
    globalSettingsInitialized = true;

    console.log('[UI] Initializing global settings...');

    const createInputGroup = (machine) =>
        `<div class="flex gap-2 mt-2"><div class="flex-1"><label class="block text-xs text-gray-500">Ancho Máx.</label><input type="text" inputmode="decimal" value="${machine.maxWidth || ''}" class="w-full p-1 border rounded-md text-sm"></div><div class="flex-1"><label class="block text-xs text-gray-500">Alto Máx.</label><input type="text" inputmode="decimal" value="${machine.maxHeight || ''}" class="w-full p-1 border rounded-md text-sm"></div><div class="flex-1"><label class="block text-xs text-gray-500">Ancho Mín.</label><input type="text" inputmode="decimal" value="${machine.minWidth || ''}" class="w-full p-1 border rounded-md text-sm"></div><div class="flex-1"><label class="block text-xs text-gray-500">Alto Mín.</label><input type="text" inputmode="decimal" value="${machine.minHeight || ''}" class="w-full p-1 border rounded-md text-sm"></div></div>`;

    const dieCutterContainer = document.getElementById('dieCutterSettingsContainer');
    const printerContainer = document.getElementById('printerSettingsContainer');

    if (typeof PROCESS_MACHINES !== 'undefined' && PROCESS_MACHINES) {
        if (dieCutterContainer && PROCESS_MACHINES.DIE_CUTTERS) {
            dieCutterContainer.innerHTML = PROCESS_MACHINES.DIE_CUTTERS.map(m =>
                `<div class="p-3 bg-gray-50 rounded-lg" data-machine-name="${m.name}" data-machine-type="DIE_CUTTERS"><p class="font-semibold">${m.name}</p>${createInputGroup(m)}</div>`
            ).join('');
        }
        if (printerContainer && PROCESS_MACHINES.PRINTERS) {
            printerContainer.innerHTML = PROCESS_MACHINES.PRINTERS.map(m =>
                `<div class="p-3 bg-gray-50 rounded-lg" data-machine-name="${m.name}" data-machine-type="PRINTERS"><p class="font-semibold">${m.name}</p>${createInputGroup(m)}</div>`
            ).join('');
        }
    }

    if (typeof GENERAL_SETTINGS !== 'undefined' && GENERAL_SETTINGS) {
        const starchInput = document.getElementById('starchAdhesiveInput');
        const pvaInput = document.getElementById('pvaAdhesiveInput');
        const mediumE = document.getElementById('mediumFactorE');
        const mediumB = document.getElementById('mediumFactorB');
        const mediumC = document.getElementById('mediumFactorC');
        if (starchInput) starchInput.value = GENERAL_SETTINGS.adhesives?.starch || 18;
        if (pvaInput) pvaInput.value = GENERAL_SETTINGS.adhesives?.pva || 26;
        if (mediumE) mediumE.value = GENERAL_SETTINGS.mediumFactors?.['Flauta E'] || 1.32;
        if (mediumB) mediumB.value = GENERAL_SETTINGS.mediumFactors?.['Flauta B'] || 1.35;
        if (mediumC) mediumC.value = GENERAL_SETTINGS.mediumFactors?.['Flauta C'] || 1.48;
    }

    if (typeof PALLETIZING_SETTINGS !== 'undefined' && PALLETIZING_SETTINGS) {
        const palletHeightInput = document.getElementById('standardPalletHeightInput');
        if (palletHeightInput) palletHeightInput.value = PALLETIZING_SETTINGS.standardPalletHeightCm || 150;
    }
}

// === FORMULAS MODAL ===

function openFormulasDoc() {
    const formulasModal = document.getElementById('formulasModal');
    if (formulasModal) {
        formulasModal.classList.remove('hidden');
        formulasModal.style.display = 'flex';
    }
}

function closeFormulasDoc() {
    const formulasModal = document.getElementById('formulasModal');
    if (formulasModal) {
        formulasModal.classList.add('hidden');
        formulasModal.style.display = 'none';
    }
}

window.addEventListener('DOMContentLoaded', function () {
    const formulasModal = document.getElementById('formulasModal');
    if (formulasModal) {
        formulasModal.addEventListener('click', function (e) {
            if (e.target === this) closeFormulasDoc();
        });
    }
});

console.log('[UI] Módulo cargado');
