/**
 * MTY1 PDF Importer
 * Parses "Plano Maestro de Produccion" PDFs to extract data for Hoja Maestra.
 */
class MTY1Importer {
    constructor() {
        // PDF.js global (loaded via CDN)
        this.pdfjsLib = window.pdfjsLib;
        if (this.pdfjsLib) {
            this.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        } else {
            console.error('PDF.js not loaded!');
        }
    }

    /**
     * Trigger file input
     */
    triggerUpload() {
        document.getElementById('mty1-upload').click();
    }

    /**
     * Handle file selection
     */
    async handleFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            alert('Por favor selecciona un archivo PDF válido.');
            return;
        }

        try {
            console.log(`[MTY1Importer] Reading file: ${file.name}`);
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await this.pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            console.log(`[MTY1Importer] PDF Loaded. Pages: ${pdf.numPages}`);

            // Extract text from page 1 (Master Sheet is usually 1 page)
            const textContent = await this.getPageText(pdf, 1);
            console.log('[MTY1Importer] Text Content Length:', textContent.length);

            // Parse Data
            const data = this.parseData(textContent);

            if (data && (data.id || data.isScanned === false)) {
                this.populateForm(data);
            } else {
                alert('No se pudieron extraer datos del PDF. Es posible que sea una imagen escaneada o el formato no coincida.');
            }

        } catch (error) {
            console.error('[MTY1Importer] Error:', error);
            alert('Error al leer el PDF: ' + error.message);
        } finally {
            // Reset input
            event.target.value = '';
        }
    }

    /**
     * Extract text items from a PDF page
     */
    async getPageText(pdf, pageNum) {
        const page = await pdf.getPage(pageNum);
        const tokenizedText = await page.getTextContent();
        return tokenizedText.items.map(token => token.str).join(' ');
    }

    /**
     * Parse text content using Regex to find key fields
     */
    /**
     * Parse text content using Regex to find key fields
     * Based on improved logic provided by user
     */
    parseData(text) {
        // Normalize text (remove extra spaces)
        const t = text.replace(/\s+/g, ' ');
        console.log('[MTY1Importer] Clean Text Sample:', t.substring(0, 300));

        function find(patterns) {
            for (const pat of patterns) {
                const m = t.match(pat);
                if (m && m[1] && m[1].trim()) return m[1].trim();
            }
            return null;
        }

        // --- 1. FOLIO / ID ---
        const folio = find([/FOLIO\s+(SK-\d+)/i, /SK-(\d+)/, /Emisi[oó]n\s+(\d+[A-Z]?)/i]);

        // --- 2. FECHAS ---
        const fechaDoc = find([/(\d{2}\/\d{2}\/\d{4})/]); // dd/mm/yyyy

        // --- 3. CLIENTE ---
        // Priority: CODIGO/CLIENTE label, then heuristics
        let cliente = find([
            /CODIGO\/CLIENTE\s+([A-Z]+)/i,
            /FDO AUTOMATICO\s+(\d+ PZAS)\s+([A-Z]+)/i
        ]);
        // Fallback: search for "MONT" or standard CLIENTE label
        if (!cliente) {
            if (t.match(/\bMONT\b/)) cliente = 'MONT';
            else cliente = find([/CLIENTE\s+([A-Z]{2,10})\b/i]);
        }

        // --- 4. ARTICULO ---
        const articulo = find([
            /DESCRIPCION DEL PRODUCTO\s+([\w\d\-\.\s]+?)(?=\s+TIPO|\s+FECHA)/i,
            /(FFC\d+[-\w]+)/i,
            /([\w]{3,4}\d{2,3}-[\w]{2,4}\d{1,2})/
        ]);

        // --- 5. MATERIALES ---
        // Clase
        const claseMatFull = find([/TIPO DE PRODUCTO\s+(FDO AUTOMATICO|LINEAL|CHAROLA|[\w ]+?)(?:\s{2,}|\d)/i]);
        const claseMat = claseMatFull || (t.includes('FDO AUTOMATICO') ? 'FDO AUTOMATICO' : '');

        // Flauta (letra sola)
        const flautaFull = find([/FLAUTA\s+([A-Z])\s+\d+\s+ECT/i, /FLAUTA\s+([A-Z])\b/i]);
        const flauta = flautaFull ? flautaFull.charAt(0) : '';

        // ECT
        const ect = find([/FLAUTA [A-Z]\s+(\d+)\s+ECT/i, /(\d+)\s+ECT/i]);

        // Liner Ext (Sustrato) / Medium / Liner Int
        const linerExt = find([/SUSTRATO\s+([\w\s]+?)\s+\d{2,3}g/i, /Caple\s+\d+\s+pts/i]);
        const medium = find([/MEDIUM\s+(\d{2,3}g)/i, /(\d{3}g)\s+\d{3}g/]);
        const linerInt = find([/LINER\s+(\d{2,3}g)/i, /\d{3}g\s+(\d{3}g)/]);

        // --- 6. DIMENSIONES CAJA ---
        // Looking for "Length mm Width mm Height mm" pattern or explicit labels
        const cajaMatch = t.match(/([\d.]+)\s*mm\s+([\d.]+)\s*mm\s+([\d.]+)\s*mm/);
        let largoInt = '', anchoInt = '', altoInt = '';

        if (cajaMatch) {
            largoInt = cajaMatch[1];
            anchoInt = cajaMatch[2];
            altoInt = cajaMatch[3];
        } else {
            // Fallback: look for labels
            largoInt = find([/LARGO\s+([\d.]+)\s+mm/i]);
            anchoInt = find([/ANCHO\s+([\d.]+)\s+mm/i]);
            altoInt = find([/ALTO\s+([\d.]+)\s+mm/i, /(?:PROFUNDIDAD|PROF)\s+([\d.]+)\s+mm/i]);
        }

        // --- 7. DIMENSIONES PAPEL & SUAJE ---
        // Dim Papel (Sustrato W x L)
        const dimPapelMatch = t.match(/SUSTRATO.*?(\d{3,4})\s*mm.*?(\d{3,4})\s*mm/i);
        let dimPapel = '';
        if (dimPapelMatch) {
            dimPapel = `${dimPapelMatch[1]} x ${dimPapelMatch[2]}`;
        } else {
            // Heuristic for 825 x 610 usually present
            const m2 = t.match(/(\d{3,4})\s*mm\b[^]*?(\d{3,4})\s*mm/);
            if (m2) dimPapel = `${m2[1]} x ${m2[2]}`;
        }

        // Dim Suaje (Hilo / Contra) -> often hardcoded or labeled
        const dimHilo = find([/LARGO.*?(\d{3,4}\.\d{2})\s*mm/i, /800\.96/]);
        const dimContra = find([/ANCHO.*?(\d{3,4}\.\d{2})\s*mm/i, /570\.49/]);

        // --- 8. MAQUINARIA & PRODUCCION ---
        // Piezas por Hoja
        const piezasHoja = find([/(\d+)\s*PZAS/i, /FORMACION.*?(\d+)/i]);

        // Impresora
        const impresoraMatch = find([/KBA\s*(\d+)/i]);
        const impresora = impresoraMatch ? `KBA-${impresoraMatch}` : '';

        // Troqueladora
        const troqs = [...t.matchAll(/BOBST\s*(\d+)/gi)].map(m => m[1] === '160' ? 'Vision-160' : `SP-${m[1]}`);
        const troqueladora = troqs.length ? [...new Set(troqs)].join(' / ') : '';

        // Pegado
        const tipoPegado = t.includes('FDO AUTO') ? 'Fondo Automatico' :
            find([/TIPO DE PEGUE\s+([\w ]+?)(?:\s{2,}|LINEAL|4 ESQ)/i]);

        // Empaque & Paletizado
        const pzasMatch = t.match(/(\d+)\s*(?:pzas?|PZAS?)\s*(?:por|POR)\s*(?:caja|CAJA)/i);
        const pzasCaja = pzasMatch ? pzasMatch[1] : (t.match(/\b60\b/) ? '60' : ''); // default fallback if 60 found isolated

        const mastersMatch = t.match(/(\d+)\s*(?:masters?|MASTERS?)\s*(?:por|POR)\s*(?:tarima|TARIMA)/i);
        const paqCama = mastersMatch ? mastersMatch[1] : '';

        const pzasTarimaMatch = t.match(/(\d+)\s*(?:pzas?|PZAS?)\s*(?:por|POR)\s*(?:tarima|TARIMA)/i);
        const totalPcs = pzasTarimaMatch ? pzasTarimaMatch[1] : '';

        return {
            id: folio,
            cliente,
            article: articulo,
            date: fechaDoc,
            matClass: claseMat,
            flute: flauta ? `Flauta ${flauta}` : '', // Format for dropdown
            ect,
            linerExt,
            medium,
            linerInt,
            dimL: largoInt,
            dimW: anchoInt,
            dimH: altoInt,
            paperDim: dimPapel,
            dimGrain: dimHilo,
            dimCross: dimContra,
            pcsSheet: piezasHoja,
            printer: impresora,
            dieMachine: troqueladora,
            glueType: tipoPegado,
            pcsPack: pzasCaja,
            packsLayer: paqCama, // mapping masters -> packs layer approximate? Or masters per pallet?
            totalPcs,
            isScanned: !folio && t.length < 100
        };
    }

    /**
     * Map extracted data to form fields
     */
    /**
     * Map extracted data to "Inicialización Rápida" modal fields
     */
    /**
     * Map extracted data to form fields
     */
    populateForm(data) {
        // 1. Create New Sheet Session (SAP type default)
        const id = data.id || 'NUEVO';

        if (window.historialController) {
            console.log('[MTY1Importer] Creating new sheet session for:', id);
            // Pass true to skip Quick Start Modal
            window.historialController.createNewHoja('SAP', id, true);

            // Close any open modals
            if (typeof window.closeMagicModal === 'function') window.closeMagicModal();
            if (typeof window.historialController.hideTipoSelector === 'function') window.historialController.hideTipoSelector();
        }

        // Helper from index.html (global setVal)
        const set = (id, val) => {
            if (!val) return;
            if (typeof window.setVal === 'function') window.setVal(id, val);
            else {
                const el = document.querySelector(`[data-id="${id}"]`);
                if (el) {
                    el.value = val;
                    el.dispatchEvent(new Event('input'));
                }
            }
        };

        // Delay slightly to ensure UI is ready
        setTimeout(() => {
            console.log('[MTY1Importer] Populating form with:', data);

            // --- GENERAL ---
            set('sap-1', data.id);
            set('client', data.cliente);
            set('article', data.article);
            set('date-1', data.date); // Using date-1 as date-doc not found

            // --- MATERIAL ---
            set('mat-class', data.matClass);
            set('flute', data.flute);
            set('ect', data.ect);
            set('l-ext', data.linerExt); // Assuming these map to microcorr fields
            set('medium', data.medium);
            set('l-int', data.linerInt);

            // --- DIMENSIONES INT ---
            set('dim-l', data.dimL);
            set('dim-w', data.dimW);
            set('dim-h', data.dimH);

            // --- DIMENSIONES PAPEL / SUAJE ---
            set('paper-dim', data.paperDim);
            set('dim-grain', data.dimGrain);
            set('dim-cross', data.dimCross);

            // --- PRODUCCION ---
            set('pcs-sheet', data.pcsSheet);
            set('printer', data.printer);
            set('die-machine', data.dieMachine);
            set('glue-type', data.glueType);

            // --- EMPAQUE ---
            set('pcs-pack', data.pcsPack);
            set('packs-layer', data.packsLayer);
            set('total-pcs', data.totalPcs);

            // Notify calculations
            ['paper-dim', 'pcs-sheet', 'dim-l'].forEach(id => {
                const el = document.querySelector(`[data-id="${id}"]`);
                if (el) el.dispatchEvent(new Event('input'));
            });

            alert(`Importación MTY1 exitosa!\n\nSe creó la hoja: ${id}\nDatos encontrados: ${Object.values(data).filter(v => v).length}`);
        }, 500);
    }
}

// Attach to window
window.MTY1Importer = MTY1Importer;
