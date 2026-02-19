// ================================================
// MANUAL-CALC.JS — Auto-Calculation & Shipping Calculations
// HojaMaestra | Consumer Packaging Monterrey
// ================================================

// === MANUAL SPECS AUTO-CALCULATION ===

function recalculateSpecsFromManualInputs(event) {
    try {
        const sourceId = event ? event.target.getAttribute('data-id') : null;

        let dimGrain = getNum('dim-grain');
        let dimCross = getNum('dim-cross');

        // Handle Paper Dim Parsing
        if (sourceId === 'paper-dim') {
            const dimStr = getVal('paper-dim').toLowerCase();
            const parts = dimStr.split(/[xX\s]+/).filter(s => s.trim() !== '').map(s => parseFloat(s));
            if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                dimGrain = parts[0]; dimCross = parts[1];
                setVal('dim-grain', dimGrain, { skipIfFocused: true });
                setVal('dim-cross', dimCross, { skipIfFocused: true });
            }
        } else if (sourceId === 'dim-grain' || sourceId === 'dim-cross') {
            if (dimGrain > 0 && dimCross > 0) {
                setVal('paper-dim', `${dimGrain} X ${dimCross}`, { skipIfFocused: true });
            }
        } else if (!sourceId) {
            if ((!dimGrain || !dimCross) && getVal('paper-dim')) {
                const dimStr = getVal('paper-dim').toLowerCase();
                const parts = dimStr.split(/[xX\s]+/).filter(s => s.trim() !== '').map(s => parseFloat(s));
                if (parts.length >= 2) {
                    dimGrain = parts[0]; dimCross = parts[1];
                    setVal('dim-grain', dimGrain, { skipIfFocused: true });
                    setVal('dim-cross', dimCross, { skipIfFocused: true });
                }
            }
        }

        // Re-read in case updated
        dimGrain = getNum('dim-grain');
        dimCross = getNum('dim-cross');
        const pcsSheet = getNum('pcs-sheet');

        let areaTotal = 0;
        if (dimGrain > 0 && dimCross > 0) {
            areaTotal = (dimGrain * dimCross) / 1000000;
            setVal('area-total', areaTotal.toFixed(3), { skipIfFocused: true });
        }

        // Efficiency
        const pieceArea = getNum('mat-area');
        if (pieceArea > 0 && pcsSheet > 0 && areaTotal > 0) {
            const effArea = (pieceArea * pcsSheet) / areaTotal;
            setVal('area-eff', (effArea * 100).toFixed(2) + '%', { skipIfFocused: true });
            setVal('waste', (100 - effArea * 100).toFixed(2) + '%', { skipIfFocused: true });
        }

        // Weight calculation using MATERIAL_CONSTANTS from app-utils.js
        const matClass = getVal('mat-class').toUpperCase();
        let totalGrammage = 0;

        if (matClass.includes('MICRO') || matClass === 'MICROCORRUGADO') {
            const linerExt = getNum('l-ext');
            const medium = getNum('medium');
            const linerInt = getNum('l-int');
            let flute = getVal('flute').toUpperCase().replace('FLAUTA', '').replace(/[^A-Z]/g, '').trim();

            const fluteFactor = MATERIAL_CONSTANTS.FLUTE_FACTORS[flute] || MATERIAL_CONSTANTS.FLUTE_FACTORS.B;
            const adhesives = MATERIAL_CONSTANTS.ADHESIVES.TOTAL;

            if (linerExt > 0 && medium > 0 && linerInt > 0) {
                totalGrammage = linerExt + (medium * fluteFactor) + linerInt + adhesives;
            }
        } else if (matClass.includes('PLEGADIZO') || matClass === 'FOLDING') {
            const matPaper = getVal('mat-paper');
            const caliper = getVal('caliper');
            let dbKey = null;
            if (matPaper.toUpperCase().includes('PONDEROSA')) dbKey = 'EPL_PONDEROSA';
            if (matPaper.toUpperCase().includes('WRK') || matPaper.toUpperCase().includes('CNK')) dbKey = 'CNK_WRK';
            if (dbKey && window.WEIGHT_DB && window.WEIGHT_DB.FOLDING_GRAMMAGE[dbKey]) {
                const cleanCaliper = caliper.replace(/\D/g, '');
                totalGrammage = window.WEIGHT_DB.FOLDING_GRAMMAGE[dbKey][cleanCaliper] || 0;
            }
        }

        if (totalGrammage > 0) {
            setVal('gsm', Math.round(totalGrammage), { skipIfFocused: true });
            if (pieceArea > 0) setVal('w-net', Math.round(totalGrammage * pieceArea), { skipIfFocused: true });
            if (areaTotal > 0 && pcsSheet > 0) {
                setVal('w-gross', Math.round((totalGrammage * areaTotal) / pcsSheet), { skipIfFocused: true });
            }
        }
    } catch (error) {
        console.error('[ManualCalc] Error en recalculateSpecsFromManualInputs:', error);
    }
}

function initManualCalculations() {
    const inputIds = [
        'dim-grain', 'dim-cross', 'paper-dim', 'pcs-sheet',
        'mat-class', 'mat-paper', 'caliper', 'flute',
        'l-ext', 'medium', 'l-int', 'mat-area', 'roll-width'
    ];

    inputIds.forEach(id => {
        const el = document.querySelector(`[data-id="${id}"]`);
        if (el) {
            el.removeEventListener('input', recalculateSpecsFromManualInputs);
            el.addEventListener('input', recalculateSpecsFromManualInputs);
            el.addEventListener('change', recalculateSpecsFromManualInputs);
            el.addEventListener('blur', recalculateSpecsFromManualInputs);
        }
    });

    // Lock calculated fields
    const lockedIds = ['area-total', 'area-eff', 'waste', 'gsm', 'w-net', 'w-gross'];
    lockedIds.forEach(id => {
        const el = document.querySelector(`[data-id="${id}"]`);
        if (el) {
            el.setAttribute('readonly', true);
            el.style.backgroundColor = '#f3f4f6';
            el.style.color = '#6b7280';
        }
    });

    recalculateSpecsFromManualInputs();
}

document.addEventListener('DOMContentLoaded', initManualCalculations);
if (document.readyState !== 'loading') initManualCalculations();

// === SHIPPING CALCULATIONS ===

function initShippingCalculations() {
    try {
        const updatePalletStats = () => {
            const pcs = getNum('pcs-pack');
            const packs = getNum('packs-layer');
            const layers = getNum('layers-pallet');
            if (pcs > 0 && packs > 0 && layers > 0) {
                setVal('total-pcs', pcs * packs * layers, { formatCommas: true });
                updateContainerStats();
            }
        };

        const updateContainerStats = () => {
            const totalPcsEl = document.querySelector('[data-id="total-pcs"]');
            let totalPcs = 0;
            if (totalPcsEl) totalPcs = parseFloat(totalPcsEl.value.replace(/,/g, '')) || 0;
            const pallets = getNum('pallets-cont');
            if (totalPcs > 0 && pallets > 0) setVal('pcs-cont', totalPcs * pallets, { formatCommas: true });
        };

        [
            { id: 'pcs-pack', handler: updatePalletStats },
            { id: 'packs-layer', handler: updatePalletStats },
            { id: 'layers-pallet', handler: updatePalletStats },
            { id: 'total-pcs', handler: updateContainerStats },
            { id: 'pallets-cont', handler: updateContainerStats }
        ].forEach(item => {
            const el = document.querySelector(`[data-id="${item.id}"]`);
            if (el) el.addEventListener('input', item.handler);
        });
    } catch (error) {
        console.error('[ManualCalc] Error en initShippingCalculations:', error);
    }
}

window.addEventListener('DOMContentLoaded', initShippingCalculations);

// === DYNAMIC CALIPER DROPDOWN ===

document.addEventListener('DOMContentLoaded', function () {
    function setupDynamicCaliper(paperSelector, caliperSelector) {
        const paperEl = typeof paperSelector === 'string' ? document.querySelector(paperSelector) : paperSelector;
        const caliperEl = typeof caliperSelector === 'string' ? document.querySelector(caliperSelector) : caliperSelector;
        if (!paperEl || !caliperEl) return;

        const caliperMap = {
            'CBR': [12, 14, 16, 18, 20, 22, 24, 26, 28],
            'PON': [12, 14, 16, 18, 20, 22, 24, 26, 28],
            'CNK': [16, 18, 20, 21, 22, 23, 24, 25, 26, 27, 28],
            'Carrier kote': [16, 18, 20, 21, 22, 23, 24, 25, 26, 27, 28],
            'CMPC': [11, 12, 14, 15, 17, 18, 20, 21, 22, 24, 26, 28],
            'LinerBlanco': [10, 11, 12, 13, 14, 16, 18, 20, 22, 24],
            'SBS/Printkote': [10, 12, 14, 16, 18, 20, 22, 24, 26, 28],
            'Otro': [10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32]
        };

        paperEl.addEventListener('change', function () {
            const selectedPaper = this.value;
            caliperEl.innerHTML = '<option value="">Seleccionar...</option>';
            const options = caliperMap[selectedPaper] || (selectedPaper === 'Otro' ? caliperMap['Otro'] : null);
            if (options) {
                options.forEach(cal => {
                    const opt = document.createElement('option');
                    opt.value = cal; opt.textContent = cal;
                    caliperEl.appendChild(opt);
                });
                caliperEl.disabled = false;
            } else {
                caliperEl.disabled = true;
            }
        });
    }

    // Setup for Quick Start Modal
    setupDynamicCaliper('#magic-paper', '#magic-caliper');
    // Setup for Manual Main Form
    setupDynamicCaliper('[data-id="mat-paper"]', '[data-id="caliper"]');
});

// === CLIENT AUTOCOMPLETE ===

document.addEventListener('DOMContentLoaded', function () {
    const clientInput = document.getElementById('magic-client');
    if (clientInput) {
        clientInput.addEventListener('input', function (e) {
            const input = e.target;
            const val = input.value.toLowerCase();
            const list = document.getElementById('clients-list');
            if (!list) return;
            for (let option of list.options) {
                if (option.value.toLowerCase() === val) {
                    if (input.value !== option.value) input.value = option.value;
                    break;
                }
            }
        });
    }
});

console.log('[ManualCalc] Módulo cargado');
