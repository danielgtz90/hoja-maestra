// ================================================
// CALCULATOR.JS — Lógica de cálculo, modal, navegación y persistencia
// HojaMaestra | Consumer Packaging Monterrey
// ================================================

// === MACHINE & MATERIAL CONSTANTS ===
const MACHINE_LISTS = {
    PRINTERS: ['KBA-164', 'KBA-106', 'Landa'],
    DIE_CUTTERS: ['Vision-160', 'SP-104', 'SP-162', 'SPANTHERA'],
    GLUING_MACHINES: ['ExpertFold', 'Diana', 'Amazon'],
    LAMINATORS: ['Asitrade Olivini']
};

const WEIGHT_DB = {
    FLUTE_FACTORS: { 'E': 1.32, 'B': 1.35, 'C': 1.48 },
    ADHESIVES: { STARCH: 18, PVA: 26 }, // g/m2
    FOLDING_GRAMMAGE: {
        'EPL_PONDEROSA': { '8': 0, '10': 0, '11': 220, '12': 240, '14': 280, '16': 320, '18': 360, '20': 395, '22': 430, '24': 465, '26': 500, '28': 515 },
        'CNK_WRK': { '12': 264, '14': 293, '15': 317, '16': 332, '17': 347, '18': 361, '20': 391, '22': 420, '24': 454, '26': 488, '28': 522, '30': 557 }
    }
};

const DEFAULT_PROCESS_MACHINES = {
    DIE_CUTTERS: [
        { name: 'Vision-160', maxWidth: 1620, maxHeight: 1103 },
        { name: 'SP-104', maxWidth: 1050, maxHeight: 735 },
        { name: 'SP-162', maxWidth: 1650, maxHeight: 1133 },
        { name: 'SPANTHERA', maxWidth: 1460, maxHeight: 1060 },
    ],
    PRINTERS: [
        { name: 'KBA-164', maxWidth: 1640, maxHeight: 1205, minWidth: 800, minHeight: 600 },
        { name: 'KBA-106', maxWidth: 1060, maxHeight: 740, minWidth: 480, minHeight: 340 },
        { name: 'Landa', maxWidth: 1050, maxHeight: 750, minWidth: 360, minHeight: 297 },
    ],
    LAMINATORS: [{ name: 'Asitrade Olivini' }]
};

const DEFAULT_GENERAL_SETTINGS = {
    adhesives: { starch: 18, pva: 26 },
    mediumFactors: { 'Flauta E': 1.32, 'Flauta B': 1.35, 'Flauta C': 1.48 },
    automaticBottomCompensation: 0.3,
    foldingCartonGrammage: {
        'EPL_PONDEROSA': { 8: 0, 10: 0, 11: 220, 12: 240, 14: 280, 16: 320, 18: 360, 20: 395, 22: 430, 24: 465, 26: 500, 28: 515 },
        'CNK_WRK': { 12: 264, 14: 293, 15: 317, 16: 332, 17: 347, 18: 361, 20: 391, 22: 420, 24: 454, 26: 488, 28: 522, 30: 557 },
        'SBS/Printkote': { 10: 202, 12: 227, 14: 255, 16: 284, 18: 311, 20: 345, 22: 379, 24: 407, 26: 435, 28: 462 }
    }
};

// Global variables - load from localStorage or use defaults
let PROCESS_MACHINES = JSON.parse(localStorage.getItem('printOptimizerSettings_v3') || 'null')?.machines || JSON.parse(JSON.stringify(DEFAULT_PROCESS_MACHINES));
let GENERAL_SETTINGS = JSON.parse(localStorage.getItem('printOptimizerSettings_v3') || 'null')?.general || JSON.parse(JSON.stringify(DEFAULT_GENERAL_SETTINGS));

// Force merge SBS gramage if missing
if (!GENERAL_SETTINGS.foldingCartonGrammage['SBS/Printkote']) {
    GENERAL_SETTINGS.foldingCartonGrammage = {
        ...GENERAL_SETTINGS.foldingCartonGrammage,
        ...DEFAULT_GENERAL_SETTINGS.foldingCartonGrammage
    };
}

let PALLETIZING_SETTINGS = JSON.parse(localStorage.getItem('printOptimizerSettings_v3') || 'null')?.palletizing
    || { standardPalletHeightCm: 150, pallets: [{ name: '40x48', width: 40, height: 48 }, { name: '48x40', width: 48, height: 40 }] };
let COLLECTIVE_BOXES = JSON.parse(localStorage.getItem('COLLECTIVE_BOXES') || '[]');

const SETTINGS_STORAGE_KEY = 'printOptimizerSettings_v3';
const HISTORY_STORAGE_KEY = 'printOptimizerHistory_v2';

// === EXCEL DATA LOADING ===
let excelDataIndex = {};
let assetFilesIndex = {};

// Excel mapping: header → data-id
const excelMapping = {
    'cliente': 'client', 'articulo': 'article', 'descripcion': 'article',
    'fecha': 'date-doc', 'version': 'version', 'ect': 'ect',
    'largo': 'dim-l', 'ancho': 'dim-w', 'alto': 'dim-h', 'profundidad': 'dim-h',
    'area total': 'area-total', 'area_total': 'area-total',
    'area efectiva': 'area-eff', 'merma': 'waste',
    'peso bruto': 'w-gross', 'peso ok': 'w-net', 'peso': 'w-net',
    'papel': 'mat-paper', 'gramaje': 'gsm', 'flauta': 'flute',
    'calibre': 'caliper', 'clase': 'mat-class', 'impresora': 'printer',
    'troqueladora': 'die-machine', 'artios': 'artios', 'pegadora': 'gluer',
    'piezas paq': 'pcs-pack', 'piezas pallet': 'total-pcs',
    'pallets contenedor': 'pallets-cont'
};

document.addEventListener('DOMContentLoaded', function () {
    const excelInputEl = document.getElementById('excelInput');
    if (excelInputEl) {
        excelInputEl.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function (e) {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (jsonData.length < 2) { alert("El archivo Excel parece vacío o sin encabezados."); return; }

                const headers = jsonData[0].map(h => h ? h.toString().trim().toLowerCase() : '');
                let sapColIndex = headers.findIndex(h => h.includes('sap') || h.includes('material') || h === 'codigo');
                if (sapColIndex === -1) { alert("No se encontró columna 'SAP'. Usando primera columna."); sapColIndex = 0; }

                excelDataIndex = {};
                let count = 0;
                for (let i = 1; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    const sapVal = row[sapColIndex];
                    if (sapVal) {
                        const key = sapVal.toString().trim();
                        const rowObj = {};
                        headers.forEach((h, idx) => { if (h) rowObj[h] = row[idx]; });
                        excelDataIndex[key] = rowObj;
                        count++;
                    }
                }

                document.getElementById('excelStatus').innerText = `✅ ${count} registros cargados.`;
                document.getElementById('excelStatus').style.color = 'green';

                const currentSap = document.querySelector('input[data-id="sap-1"]').value;
                if (currentSap) searchAndFillData(currentSap);

                if (!document.getElementById('dashboard').classList.contains('hidden')) {
                    showSheet();
                }
            };
            reader.readAsArrayBuffer(file);
        });
    }

    // Folder input for assets (only if element present)
    const _folderInputEl = document.getElementById('folderInput');
    if (_folderInputEl) {
        _folderInputEl.addEventListener('change', function (e) {
            const files = e.target.files;
            assetFilesIndex = {};
            let count = 0;
            if (files.length > 0) {
                for (let i = 0; i < files.length; i++) {
                    assetFilesIndex[files[i].name.toLowerCase()] = files[i];
                    count++;
                }
                const folderStatusEl = document.getElementById('folderStatus');
                if (folderStatusEl) {
                    folderStatusEl.innerText = `✅ ${count} archivos indexados.`;
                    folderStatusEl.style.color = 'green';
                }
                const currentSap = document.querySelector('input[data-id="sap-1"]').value;
                if (currentSap) searchAndLoadAssets(currentSap);
            }
        });
    }
});

function searchAndFillData(sapValue) {
    const cleanSap = sapValue.replace('#', '').trim();
    if (!cleanSap || Object.keys(excelDataIndex).length === 0) return;

    const rowData = excelDataIndex[cleanSap];
    if (rowData) {
        const inputs = document.querySelectorAll('input[data-id], textarea[data-id]');
        inputs.forEach(input => {
            const id = input.getAttribute('data-id');
            let val = null;
            for (const [header, targetId] of Object.entries(excelMapping)) {
                if (targetId === id && rowData[header] !== undefined) { val = rowData[header]; break; }
            }
            if (val === null && rowData[id] !== undefined) val = rowData[id];
            if (val !== null && val !== undefined) {
                input.value = val;
                input.dispatchEvent(new Event('input'));
                input.style.backgroundColor = '#e6fffa';
                setTimeout(() => input.style.backgroundColor = '', 1000);
            }
        });
    }
}

function searchAndLoadAssets(sapValue) {
    const cleanSap = sapValue.replace('#', '').trim();
    if (!cleanSap) return;
    searchAndFillData(cleanSap);
    if (Object.keys(assetFilesIndex).length === 0) return;

    const mappings = [
        { suffix: '_plano', targetId: 'img-flat' },
        { suffix: '_codigo', targetId: 'img-barcode' },
        { suffix: '_paletizado', targetId: 'img-pallet-layout' },
        { suffix: '_dibujo', targetId: 'img-ext-dims' }
    ];

    mappings.forEach(map => {
        const targetImg = document.getElementById(map.targetId);
        if (!targetImg) return;
        const searchKey = map.suffix.toLowerCase();
        let foundFile = null;
        for (const fileName in assetFilesIndex) {
            if (fileName.includes(cleanSap) && fileName.includes(searchKey)) {
                foundFile = assetFilesIndex[fileName]; break;
            }
        }
        if (foundFile) {
            const objectUrl = URL.createObjectURL(foundFile);
            targetImg.src = objectUrl;
            targetImg.style.display = 'block';
            const container = targetImg.parentElement;
            const text = container.querySelector('.upload-text');
            if (text) text.style.display = 'none';
        }
    });
}

// === FORM HELPERS ===

const inkDatabase = {
    "CYAN": "SAP-001", "MAGENTA": "SAP-002", "YELLOW": "SAP-003",
    "BLACK": "SAP-004", "BARNIZ ACUOSO": "SAP-101", "BARNIZ UV": "SAP-102"
};

function autoFillSAP(input, index) {
    const val = input.value.toUpperCase();
    const sapInput = document.querySelector(`input[data-id="sap${index}"]`);
    if (inkDatabase[val]) { sapInput.value = inkDatabase[val]; }
    else { sapInput.value = ""; }
}

function updateGrainArrow(val) {
    const arrowEl = document.getElementById('grain-arrow');
    if (arrowEl) {
        const isHoriz = val && val.toUpperCase().includes('HORIZ');
        arrowEl.textContent = isHoriz ? '↔' : '↕';
        arrowEl.style.fontSize = isHoriz ? '30px' : '24px';
    }
}

function clearFormData() {
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sw-data-')) localStorage.removeItem(key);
    });
    document.querySelectorAll('input[data-id], textarea[data-id]').forEach(input => { input.value = ''; });

    const setDef = (id, val) => { const el = document.querySelector(`[data-id="${id}"]`); if (el) el.value = val; };
    setDef('die-type', 'EXTERIOR');
    setDef('ink8', 'BARNIZ BRILLANTE');
    setDef('ink1', 'CYAN');
    setDef('ink2', 'MAGENTA');
    setDef('ink3', 'YELLOW');
    setDef('ink4', 'BLACK');
    setDef('date-doc', new Date().toLocaleDateString('es-MX'));

    ['img-print', 'img-flat', 'img-barcode', 'img-piece', 'img-ship', 'img-pallet1', 'img-pallet2', 'img-ext-dims', 'img-pallet-layout'].forEach(imgId => {
        const img = document.getElementById(imgId);
        if (img) {
            img.src = ''; img.style.display = 'none';
            const text = img.parentElement.querySelector('.upload-text');
            if (text) text.style.display = 'block';
            localStorage.removeItem('sw-img-' + imgId);
        }
    });
}

// === WEIGHT CALCULATIONS ===

function calculateWeights() {
    const _getVal = (id) => { const el = document.querySelector(`[data-id="${id}"]`); return el ? (parseFloat(el.value) || 0) : 0; };
    const _setVal = (id, val) => { const el = document.querySelector(`[data-id="${id}"]`); if (el) el.value = val.toFixed(2); };

    const dimGrain = _getVal('dim-grain');
    const dimCross = _getVal('dim-cross');
    let areaTotal = _getVal('area-total');

    if (dimGrain > 0 && dimCross > 0) { areaTotal = (dimGrain * dimCross) / 1000000; _setVal('area-total', areaTotal); }

    const matClass = document.querySelector('[data-id="mat-class"]')?.value?.toUpperCase() || '';
    const areaPiece = _getVal('mat-area');
    let totalGsm = 0;

    if (matClass === 'PLEGADIZO') {
        totalGsm = _getVal('gsm');
    } else if (matClass === 'MICROCORRUGADO') {
        const linerExt = _getVal('l-ext');
        const medium = _getVal('medium');
        const linerInt = _getVal('l-int');
        const flute = document.querySelector('[data-id="flute"]')?.value || '';
        let factor = 1.0;
        if (GENERAL_SETTINGS.mediumFactors[flute]) factor = GENERAL_SETTINGS.mediumFactors[flute];
        else if (flute.includes('E')) factor = 1.32;
        else if (flute.includes('B')) factor = 1.35;
        else if (flute.includes('C')) factor = 1.48;
        const adhesive = GENERAL_SETTINGS.adhesives?.starch || 18;
        totalGsm = linerExt + (medium * factor) + linerInt + adhesive;
        _setVal('gsm', totalGsm);
    } else {
        totalGsm = _getVal('gsm');
    }

    if (matClass === 'PLEGADIZO') {
        if (areaPiece > 0 && totalGsm > 0) _setVal('w-net', totalGsm * areaPiece);
        const outs = _getVal('pcs-sheet');
        if (areaTotal > 0 && outs > 0 && totalGsm > 0) _setVal('w-gross', (totalGsm * areaTotal) / outs);
    } else {
        if (areaTotal > 0 && totalGsm > 0) {
            const w = totalGsm * areaTotal;
            _setVal('w-gross', w); _setVal('w-net', w);
        }
    }
}

function updateGrammageFromCaliper() {
    const matClass = document.querySelector('[data-id="mat-class"]')?.value;
    if (matClass !== 'PLEGADIZO') return;
    const paperType = document.querySelector('[data-id="mat-paper"]')?.value || '';
    const caliper = document.querySelector('[data-id="caliper"]')?.value || '';
    const gsmInput = document.querySelector('[data-id="gsm"]');
    if (!paperType || !caliper || !gsmInput) return;

    let dbKey = null;
    const p = paperType.toUpperCase();
    if (p.includes('PONDEROSA') || p.includes('EPL') || p === 'PON' || p === 'CMPC') dbKey = 'EPL_PONDEROSA';
    else if (p.includes('WRK') || p.includes('CNK') || p.includes('CARRIER')) dbKey = 'CNK_WRK';
    else if (p.includes('SBS') || p.includes('PRINTKOTE')) dbKey = 'SBS/Printkote';

    if (!dbKey) {
        const keys = Object.keys(GENERAL_SETTINGS.foldingCartonGrammage);
        dbKey = keys.find(k => k.toUpperCase() === p) || null;
    }

    if (dbKey && GENERAL_SETTINGS.foldingCartonGrammage[dbKey]) {
        const gsm = GENERAL_SETTINGS.foldingCartonGrammage[dbKey][caliper];
        if (gsm) {
            gsmInput.value = gsm;
            gsmInput.dispatchEvent(new Event('input'));
            gsmInput.style.backgroundColor = '#e6fffa';
            setTimeout(() => gsmInput.style.backgroundColor = '', 500);
        }
    }
}

// === MAGIC MODAL ===

function startNewMasterManual(existingId = null) {
    clearFormData();
    const modal = document.getElementById('magic-modal');
    modal.classList.remove('hidden');
    modal.style.display = 'flex';

    if (existingId) {
        const sapInput = document.getElementById('magic-sap');
        if (sapInput) sapInput.value = existingId;
    }

    const matClassSelect = document.getElementById('magic-class');
    const microFields = document.getElementById('magic-micro-fields');
    const toggleFields = () => {
        if (matClassSelect.value === 'MICROCORRUGADO') microFields.style.display = 'grid';
        else microFields.style.display = 'none';
    };
    matClassSelect.addEventListener('change', toggleFields);
    toggleFields();
}

function closeMagicModal() {
    document.getElementById('magic-modal').classList.add('hidden');
    document.getElementById('magic-modal').style.display = 'none';
    showSheet();
}

function applyMagicCalculations() {
    const _setVal = (id, val) => {
        const el = document.querySelector(`input[data-id="${id}"], textarea[data-id="${id}"], select[data-id="${id}"]`);
        if (el) { el.value = val; el.dispatchEvent(new Event('input')); }
    };
    const _getVal = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
    const _getNum = (id) => { const val = parseFloat(_getVal(id)); return isNaN(val) ? 0 : val; };

    // Datos Generales
    _setVal('client', _getVal('magic-client'));
    _setVal('article', _getVal('magic-article'));
    const sap = _getVal('magic-sap');
    if (sap) {
        _setVal('sap-1', sap); _setVal('ref-sap-2', sap);
        if (typeof searchAndLoadAssets === 'function') searchAndLoadAssets(sap);
    }

    // Material
    const matClass = _getVal('magic-class');
    const matPaper = _getVal('magic-paper');
    const caliper = _getVal('magic-caliper');
    const flute = _getVal('magic-flute').toUpperCase().trim();
    _setVal('mat-class', matClass); _setVal('mat-paper', matPaper);
    _setVal('caliper', caliper); _setVal('flute', flute);
    _setVal('ect', _getVal('magic-ect'));

    const linerExt = _getNum('magic-liner-ext');
    const medium = _getNum('magic-medium');
    const linerInt = _getNum('magic-liner-int');
    if (matClass === 'MICROCORRUGADO') {
        _setVal('l-ext', linerExt); _setVal('medium', medium); _setVal('l-int', linerInt);
    } else {
        _setVal('l-ext', ''); _setVal('medium', ''); _setVal('l-int', '');
    }

    // Dimensiones
    _setVal('dim-l', _getVal('magic-dim-l'));
    _setVal('dim-w', _getVal('magic-dim-w'));
    _setVal('dim-h', _getVal('magic-dim-h'));

    // Hilo
    const grainDir = _getVal('magic-grain-dir');
    _setVal('grain-dir-visual', grainDir);
    const arrowEl = document.getElementById('grain-arrow');
    if (arrowEl) {
        arrowEl.textContent = (grainDir === 'HORIZONTAL') ? '↔' : '↕';
        arrowEl.style.transform = (grainDir === 'HORIZONTAL') ? 'scaleX(1.5)' : 'scale(1)';
    }
    _setVal('die-type', _getVal('magic-die-type'));
    _setVal('grip', _getVal('magic-grip'));
    _setVal('gap-h', _getVal('magic-gap-h'));
    _setVal('gap-v', _getVal('magic-gap-v'));
    _setVal('glue-type', _getVal('magic-gluing'));

    // Cálculos de hoja
    const lSheet = _getNum('magic-l');
    const wSheet = _getNum('magic-w');
    const pieceArea = _getNum('magic-area');
    const pcs = _getNum('magic-pcs');

    if (grainDir === 'VERTICAL') { _setVal('dim-grain', lSheet); _setVal('dim-cross', wSheet); }
    else { _setVal('dim-grain', wSheet); _setVal('dim-cross', lSheet); }

    if (lSheet > 0 && wSheet > 0) {
        _setVal('paper-dim', `${lSheet} X ${wSheet}`);
        _setVal('roll-width', Math.min(lSheet, wSheet));
        const areaTotal = (lSheet * wSheet) / 1000000;
        _setVal('area-total', areaTotal.toFixed(3));

        if (pieceArea > 0 && pcs > 0) {
            _setVal('pcs-sheet', pcs); _setVal('mat-area', pieceArea);
            const effArea = (pieceArea * pcs) / areaTotal;
            _setVal('area-eff', (effArea * 100).toFixed(2) + '%');
            _setVal('waste', (100 - effArea * 100).toFixed(2) + '%');
        }

        // Peso
        let totalGrammage = 0;
        if (matClass === 'MICROCORRUGADO') {
            const fluteFactors = { 'E': 1.32, 'B': 1.35, 'C': 1.48 };
            const fluteFactor = fluteFactors[flute] || 1.35;
            const adhesives = 44;
            if (linerExt > 0 && medium > 0 && linerInt > 0) {
                totalGrammage = linerExt + (medium * fluteFactor) + linerInt + adhesives;
                if (totalGrammage > 0 && areaTotal > 0 && pcs > 0) {
                    const grossWeight = (totalGrammage * areaTotal) / pcs;
                    _setVal('w-gross', Math.round(grossWeight));
                }
            }
        } else if (matClass === 'PLEGADIZO') {
            let dbKey = null;
            if (matPaper.toUpperCase().includes('PONDEROSA')) dbKey = 'EPL_PONDEROSA';
            if (matPaper.toUpperCase().includes('WRK') || matPaper.toUpperCase().includes('CNK')) dbKey = 'CNK_WRK';
            if (dbKey && WEIGHT_DB.FOLDING_GRAMMAGE[dbKey]) {
                const cleanCaliper = caliper.replace(/\D/g, '');
                totalGrammage = WEIGHT_DB.FOLDING_GRAMMAGE[dbKey][cleanCaliper] || 0;
                const grossWeight = (totalGrammage * areaTotal) / pcs;
                _setVal('w-gross', Math.round(grossWeight));
            }
        }

        if (totalGrammage > 0) {
            _setVal('gsm', Math.round(totalGrammage));
            if (pieceArea > 0) _setVal('w-net', Math.round(totalGrammage * pieceArea));
        }
    }
    closeMagicModal();
}

function startNewMasterExcel() {
    if (confirm("¿Cargar nueva hoja desde Excel? (Esto borrará los datos actuales)")) {
        clearFormData();
        document.getElementById('excelInput').click();
    }
}

function continueMaster() { showSheet(); }

// === NAVIGATION ===

function showSheet() {
    document.body.style.overflow = 'auto';
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('sidebar').classList.remove('hidden');
    document.querySelectorAll('.sheet').forEach(el => el.classList.remove('hidden'));
    document.querySelector('.page-break').classList.remove('hidden');
    window.scrollTo(0, 0);
}

function showDashboard() {
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('sidebar').classList.add('hidden');
    document.querySelectorAll('.sheet').forEach(el => el.classList.add('hidden'));
    document.querySelector('.page-break').classList.add('hidden');
    document.body.style.overflow = 'auto';
    window.scrollTo(0, 0);
}

// === COTIZADOR → HOJA MAESTRA INTEGRATION ===

function createMasterSheetFromCalculator(machineIndex = 0) {
    if (typeof window.calculatorState === 'undefined' || !window.calculatorState.lastValidResults) {
        alert('No hay resultados de cotización disponibles.'); return;
    }
    const resultsData = window.calculatorState.lastValidResults;
    const selectedMachine = resultsData.isCustom ? resultsData : resultsData.rankedMachines?.[machineIndex];
    if (!selectedMachine) { alert('No se pudo obtener la máquina seleccionada.'); return; }

    const inputs = resultsData.userInputs;
    const route = typeof Calculator !== 'undefined' ? Calculator.generateProcessRoute(selectedMachine, inputs) : [];
    const areaTotal = (inputs.cutWidth && inputs.cutHeight) ? ((inputs.cutWidth * inputs.cutHeight) / 1000000).toFixed(4) : '';
    let pesoBruto = '';
    if (inputs.material === 'microcorrugado' && inputs.ectValue) {
        pesoBruto = areaTotal ? (parseFloat(areaTotal) * (parseInt(inputs.ectValue) || 0)).toFixed(2) : '';
    } else if (inputs.material === 'plegadizo' && inputs.foldingCartonWeight) {
        pesoBruto = areaTotal ? (parseFloat(areaTotal) * inputs.foldingCartonWeight).toFixed(2) : '';
    }

    const masterData = {
        intWidth: inputs.cutWidth || '', intHeight: inputs.cutHeight || '',
        sheetDimGrain: selectedMachine.drawing?.suggestedSheetW ? Math.round(selectedMachine.drawing.suggestedSheetW) : '',
        sheetDimCross: selectedMachine.drawing?.suggestedSheetH ? Math.round(selectedMachine.drawing.suggestedSheetH) : '',
        piecesPerSheet: selectedMachine.cuts || '',
        areaTotal: areaTotal, pesoBruto: pesoBruto,
        material: inputs.material || '', flute: inputs.flute || '', ect: inputs.ectValue || '',
        linerInt: inputs.linerInt || '', medium: inputs.medium || '', linerExt: inputs.linerExt || '',
        foldingWeight: inputs.foldingCartonWeight || '',
        printer: route.find(r => r.process === 'Impresión')?.machine || '',
        dieMachine: route.find(r => r.process === 'Troquelado')?.machine || '',
        gluer: route.find(r => r.process === 'Pegado')?.machine || '',
        glueFlap: inputs.glueFlapWidth || '',
        grainDirection: selectedMachine.orientation || 'Hilo Horizontal'
    };

    closeCotizadorModal();
    setTimeout(() => startNewMasterFromCalculator(masterData), 300);
}

function closeCotizadorModal() {
    const cotizadorModal = document.getElementById('modalOverlay');
    if (cotizadorModal) { cotizadorModal.classList.add('hidden'); cotizadorModal.classList.remove('opacity-100'); }
    const cotizadorContainer = document.getElementById('cotizadorModalContainer');
    if (cotizadorContainer) cotizadorContainer.classList.add('hidden');
    const cotizadorSection = document.getElementById('calculator-section');
    if (cotizadorSection) cotizadorSection.classList.add('hidden');
}

function startNewMasterFromCalculator(calculatorData) {
    if (typeof showSheet === 'function') showSheet();
    resetAllFieldsFromCalculator();
    fillMasterSheetFields(calculatorData);
    highlightPrefilledFields();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showTemporaryNotification('Hoja Maestra pre-llenada con datos del cotizador. Complete los campos faltantes.', 'success');
}

function fillMasterSheetFields(data) {
    const fieldMappings = {
        'dim-l': data.intWidth, 'dim-w': data.intHeight,
        'dim-grain': data.sheetDimGrain, 'dim-cross': data.sheetDimCross,
        'pcs-sheet': data.piecesPerSheet, 'area-total': data.areaTotal,
        'w-gross': data.pesoBruto, 'liner-int': data.linerInt,
        'medium': data.medium, 'liner-ext': data.linerExt,
        'ect': data.ect, 'gsm': data.foldingWeight,
        'printer': data.printer, 'die-machine': data.dieMachine,
        'gluer': data.gluer, 'grain-print': data.grainDirection,
        'glue-flap': data.glueFlap
    };
    for (const [dataId, value] of Object.entries(fieldMappings)) {
        if (value !== '' && value !== undefined && value !== null) {
            const field = document.querySelector(`[data-id="${dataId}"]`);
            if (field) { field.value = value; field.setAttribute('data-prefilled', 'true'); localStorage.setItem('sw-data-' + dataId, value); }
        }
    }
}

function resetAllFieldsFromCalculator() {
    document.querySelectorAll('input[data-id], select[data-id], textarea[data-id]').forEach(input => {
        if (input.type === 'checkbox') input.checked = false;
        else input.value = '';
        input.removeAttribute('data-prefilled'); input.style.backgroundColor = '';
    });
}

function highlightPrefilledFields() {
    document.querySelectorAll('[data-prefilled="true"]').forEach(field => {
        field.style.backgroundColor = '#d1fae5';
        setTimeout(() => { field.style.backgroundColor = ''; setTimeout(() => field.removeAttribute('data-prefilled'), 300); }, 5000);
    });
}

function showTemporaryNotification(message, type = 'info') {
    const notification = document.createElement('div');
    const colors = { success: 'background:#10b981;color:white', info: 'background:#3b82f6;color:white', warning: 'background:#f59e0b;color:#1f2937', error: 'background:#ef4444;color:white' };
    notification.style.cssText = `position:fixed;top:1rem;right:1rem;z-index:9999;padding:1rem;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.2);max-width:400px;${colors[type] || colors.info}`;
    notification.innerHTML = `<div style="display:flex;gap:8px;align-items:flex-start"><p style="flex:1;margin:0">${message}</p><button onclick="this.parentElement.parentElement.remove()" style="background:none;border:none;color:inherit;cursor:pointer;font-size:18px;line-height:1">×</button></div>`;
    document.body.appendChild(notification);
    setTimeout(() => { notification.style.opacity = '0'; setTimeout(() => notification.remove(), 300); }, 8000);
}

// === PERSISTENCE ===

document.addEventListener('DOMContentLoaded', () => {
    // Hide sidebar and sheets on initial load
    document.getElementById('sidebar').classList.add('hidden');
    document.querySelectorAll('.sheet').forEach(el => el.classList.add('hidden'));
    document.querySelector('.page-break').classList.add('hidden');

    // Auto-save inputs to localStorage
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        const id = input.getAttribute('data-id');
        if (id) {
            const savedVal = localStorage.getItem('sw-data-' + id);
            if (savedVal) input.value = savedVal;

            input.addEventListener('input', (e) => {
                localStorage.setItem('sw-data-' + id, e.target.value);
                if (id === 'sap-1') {
                    const val = e.target.value;
                    const el2 = document.getElementById('ref-sap-2');
                    if (el2) el2.innerText = val.replace('#', '').trim();
                    searchAndLoadAssets(val);
                }
            });
        }
    });

    // Restore images from localStorage
    ['img-print', 'img-flat', 'img-barcode', 'img-piece', 'img-ship', 'img-pallet1', 'img-pallet2', 'img-ext-dims', 'img-pallet-layout'].forEach(imgId => {
        const savedImg = localStorage.getItem('sw-img-' + imgId);
        if (savedImg) {
            const img = document.getElementById(imgId);
            if (img) {
                img.src = savedImg;
                img.style.display = 'block';
                const container = img.parentElement;
                const text = container.querySelector('.upload-text');
                if (text) text.style.display = 'none';
                if (typeof _ensureDeleteBtn === 'function') _ensureDeleteBtn(container, imgId);
            }
        }
    });
});

// Re-attach drag events on page load for restored images
window.addEventListener('load', function () {
    ['img-print', 'img-barcode', 'img-flat', 'img-piece'].forEach(function (id) {
        const img = document.getElementById(id);
        if (img && img.src && img.style.display !== 'none') {
            img.onmousedown = startDrag;
            img.ontouchstart = startDrag;
            img.classList.add('img-pan');
        }
    });
});

console.log('[Calculator] Módulo cargado');
