// ================================================
// HOJA MAESTRA - HISTORIAL CONTROLLER
// Controlador de UI para historial y modales
// ================================================

class HistorialController {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.currentHojaId = null;
        this.currentTipo = null;
        this.initializeEventListeners();
    }

    // ================================================
    // INICIALIZACIÓN
    // ================================================

    initializeEventListeners() {
        // Modal selector de tipo
        const tipoForm = document.getElementById('tipo-selector-form');
        const cancelTipoBtn = document.getElementById('btn-cancel-tipo');
        const tipoRadios = document.querySelectorAll('input[name="tipo"]');

        if (tipoForm) {
            tipoForm.addEventListener('submit', (e) => this.handleTipoSubmit(e));
        }

        if (cancelTipoBtn) {
            cancelTipoBtn.addEventListener('click', () => this.hideTipoSelector());
        }

        // Cambio de radio buttons
        tipoRadios.forEach(radio => {
            radio.addEventListener('change', (e) => this.handleTipoChange(e.target.value));
        });

        // Sidebar buttons
        document.getElementById('btn-save-hoja')?.addEventListener('click', () => this.saveCurrentHoja());
        document.getElementById('btn-save-as-hoja')?.addEventListener('click', () => this.saveAsNew());
        document.getElementById('btn-export-excel')?.addEventListener('click', () => this.exportCurrentToExcel());
        document.getElementById('btn-cancel-edit')?.addEventListener('click', () => this.cancelEdition());

        console.log('[HistorialController] Event listeners inicializados');
    }

    // ================================================
    // SELECTOR DE TIPO
    // ================================================

    showTipoSelector() {
        const modal = document.getElementById('tipo-selector-modal');
        if (modal) {
            // Actualizar preview de FAC
            const facPreview = document.getElementById('fac-preview');
            if (facPreview) {
                facPreview.textContent = this.dataManager.getNextFACPreview();
            }

            modal.style.display = 'flex';
        }
    }

    hideTipoSelector() {
        const modal = document.getElementById('tipo-selector-modal');
        if (modal) {
            modal.style.display = 'none';
            // Reset form
            document.getElementById('tipo-selector-form')?.reset();
            this.hideAllConditionalInputs();
        }
    }

    // ================================================
    // MODAL DE HISTORIAL
    // ================================================

    showHistoryModal() {
        console.log('[HistorialController] Opening history modal...');
        const modal = document.getElementById('history-modal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.remove('hidden'); // Ensure hidden class is removed if present
            this.switchHistoryTab('SAP'); // Default tab
        } else {
            console.error('[HistorialController] Modal with ID "history-modal" not found.');
        }
    }

    hideHistoryModal() {
        const modal = document.getElementById('history-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    switchHistoryTab(type) {
        // Update tab styles
        ['SAP', 'FAC', 'MAQ'].forEach(t => {
            const btn = document.getElementById(`tab-${t.toLowerCase()}`);
            const content = document.getElementById(`history-${t.toLowerCase()}`);

            if (t === type) {
                btn?.classList.add('border-blue-600', 'text-blue-600', 'bg-white');
                btn?.classList.remove('border-transparent');
                content?.classList.remove('hidden');
            } else {
                btn?.classList.remove('border-blue-600', 'text-blue-600', 'bg-white');
                btn?.classList.add('border-transparent');
                content?.classList.add('hidden');
            }
        });

        // Render table
        this.renderHistoryTable(type);
    }

    renderHistoryTable(type) {
        const container = document.getElementById(`history-${type.toLowerCase()}`);
        if (!container) return;

        const hojas = this.dataManager.getAllHojas().filter(h => h.tipo === type);

        if (hojas.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <p class="text-gray-500 mb-2">No hay hojas de tipo ${type} guardadas.</p>
                    <p class="text-sm text-gray-400">Las hojas guardadas aparecerán aquí.</p>
                </div>
            `;
            return;
        }

        // Sort by modification date desc
        hojas.sort((a, b) => new Date(b.fecha_modificacion) - new Date(a.fecha_modificacion));

        let html = `
            <div class="overflow-x-auto">
                <table class="min-w-full bg-white border border-gray-200">
                    <thead class="bg-gray-100">
                        <tr>
                            <th class="py-2 px-3 border-b text-left text-xs font-semibold text-gray-600">ID</th>
                            <th class="py-2 px-3 border-b text-left text-xs font-semibold text-gray-600">Cliente</th>
                            <th class="py-2 px-3 border-b text-left text-xs font-semibold text-gray-600">Producto</th>
                            <th class="py-2 px-3 border-b text-left text-xs font-semibold text-gray-600">Fecha Mod.</th>
                            <th class="py-2 px-3 border-b text-left text-xs font-semibold text-gray-600">Estado</th>
                            <th class="py-2 px-3 border-b text-center text-xs font-semibold text-gray-600">Acciones</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
        `;

        hojas.forEach(hoja => {
            const date = new Date(hoja.fecha_modificacion).toLocaleDateString();
            const estadoClass = hoja.estado === 'aprobada' ? 'bg-green-100 text-green-800' :
                hoja.estado === 'finalizada' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800';

            html += `
                <tr class="hover:bg-gray-50">
                    <td class="py-2 px-3 text-xs font-medium text-gray-900">${hoja.id}</td>
                    <td class="py-2 px-3 text-xs text-gray-700">${hoja.cliente || '-'}</td>
                    <td class="py-2 px-3 text-xs text-gray-700">${hoja.producto || '-'}</td>
                    <td class="py-2 px-3 text-xs text-gray-500">${date}</td>
                    <td class="py-2 px-3 text-xs">
                        <span class="px-2 py-1 rounded-full text-xxs font-semibold ${estadoClass}">
                            ${hoja.estado.toUpperCase()}
                        </span>
                    </td>
                    <td class="py-2 px-3 text-center space-x-1">
                        <button onclick="historialController.loadAndClose('${hoja.id}')" 
                                class="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-xs transition-colors"
                                title="Editar Hoja">
                            Editar
                        </button>
                        <button onclick="historialController.exportHojaToExcel('${hoja.id}')" 
                                class="bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded text-xs transition-colors"
                                title="Descargar Excel">
                            ⬇️
                        </button>
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;
    }

    loadAndClose(id) {
        const hoja = this.dataManager.loadHoja(id);
        if (hoja) {
            this.loadHojaToForm(hoja);
            this.hideHistoryModal();

            // Usar la función global showSheet si existe, o replicar su lógica
            if (typeof window.showSheet === 'function') {
                window.showSheet();
            } else {
                console.warn('[HistorialController] showSheet no encontrado, usando fallback manual');
                // Fallback manual basado en index.html
                document.body.style.overflow = 'auto';

                const dashboard = document.getElementById('dashboard');
                if (dashboard) dashboard.classList.add('hidden');

                const sidebar = document.getElementById('sidebar');
                if (sidebar) sidebar.classList.remove('hidden');

                document.querySelectorAll('.sheet').forEach(el => el.classList.remove('hidden'));
                const pageBreak = document.querySelector('.page-break');
                if (pageBreak) pageBreak.classList.remove('hidden');

                window.scrollTo(0, 0);
            }

            // Ensure sidebar is visible (extra check)
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.style.display = 'flex';
        }
    }

    handleTipoChange(tipo) {
        this.hideAllConditionalInputs();

        switch (tipo) {
            case 'SAP':
                document.getElementById('sap-input').style.display = 'block';
                break;
            case 'FAC':
                document.getElementById('fac-display').style.display = 'block';
                break;
            case 'MAQ':
                document.getElementById('maq-input').style.display = 'block';
                break;
        }
    }

    hideAllConditionalInputs() {
        document.getElementById('sap-input').style.display = 'none';
        const facInput = document.getElementById('fac-input');
        if (facInput) facInput.style.display = 'none';
        document.getElementById('maq-input').style.display = 'none';
        document.getElementById('fac-display').style.display = 'none';
    }

    handleTipoSubmit(e) {
        e.preventDefault();

        const tipo = document.querySelector('input[name="tipo"]:checked')?.value;
        if (!tipo) {
            alert('Por favor selecciona un tipo de hoja');
            return;
        }

        let codigo = null;
        let generatedId = null;

        try {
            switch (tipo) {
                case 'SAP':
                    codigo = document.getElementById('sap-code-input').value.trim();
                    if (!codigo) {
                        alert('Por favor ingresa el código SAP');
                        return;
                    }
                    generatedId = this.dataManager.generateID('SAP', codigo);
                    break;

                case 'FAC':
                    generatedId = this.dataManager.generateID('FAC');
                    break;

                case 'MAQ':
                    codigo = document.getElementById('maq-code-input').value.trim();
                    if (!codigo) {
                        alert('Por favor ingresa el código del ingeniero');
                        return;
                    }
                    generatedId = this.dataManager.generateID('MAQ', codigo);
                    break;
            }

            // Verificar que el ID no esté duplicado
            if (!this.dataManager.isIDAvailable(generatedId)) {
                alert(`El ID "${generatedId}" ya existe. Por favor usa otro código.`);
                return;
            }

            // Crear nueva hoja y cargar en el formulario
            this.createNewHoja(tipo, generatedId);
            this.hideTipoSelector();

        } catch (error) {
            console.error('[HistorialController] Error al generar ID:', error);
            alert('Error: ' + error.message);
        }
    }

    createNewHoja(tipo, id, skipModal = false) {
        // Crear estructura vacía
        const newHoja = this.dataManager.createEmptyHoja(tipo, id);

        // Asignar el ID al campo sap_code
        newHoja.sap_code = id;

        // Guardar en memoria (no en localStorage todavía)
        this.currentHojaId = id;
        this.currentTipo = tipo;

        // Mostrar sidebar
        this.showSidebar(id, 'borrador');

        // Limpiar formulario
        this.clearForm();

        // Establecer fecha de hoy
        const today = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' }).replace('.', '');
        setVal('date-1', today);

        // Establecer el ID en el campo visual "No. SAP"
        setVal('sap-1', id);

        console.log(`[HistorialController] Nueva hoja creada: ${id}`);
        this.updateLastSaved('Nueva hoja - Sin guardar');

        // ABRIR INICIALIZACIÓN RÁPIDA (Solicitud del usuario)
        // Solo si no se solicita omitir (ej. importación PDF)
        if (!skipModal && typeof startNewMasterManual === 'function') {
            setTimeout(() => {
                startNewMasterManual(id);
            }, 100);
        }
    }

    // ================================================
    // SIDEBAR
    // ================================================

    showSidebar(id, estado = 'borrador') {
        const editActions = document.getElementById('edit-actions-group');
        const idDisplay = document.getElementById('current-id');
        const estadoSelect = document.getElementById('estado-selector');

        if (editActions) editActions.style.display = 'block';
        if (idDisplay) idDisplay.textContent = id;
        if (estadoSelect) estadoSelect.value = estado;
    }

    hideSidebar() {
        const editActions = document.getElementById('edit-actions-group');
        if (editActions) editActions.style.display = 'none';

        this.currentHojaId = null;
        this.currentTipo = null;
    }

    updateLastSaved(text) {
        const lastSavedEl = document.getElementById('last-saved');
        if (lastSavedEl) {
            lastSavedEl.textContent = text;
        }
    }

    // ================================================
    // FUNCIONES DE GUARDADO
    // ================================================

    saveCurrentHoja() {
        if (!this.currentHojaId) {
            alert('No hay una hoja activa para guardar');
            return;
        }

        try {
            const hojaData = this.captureFormData();
            hojaData.id = this.currentHojaId;
            hojaData.tipo = this.currentTipo;
            hojaData.estado = document.getElementById('estado-selector')?.value || 'borrador';

            // Validar
            const validation = this.dataManager.validateHoja(hojaData);
            if (!validation.valid) {
                alert('Errores de validación:\n' + validation.errors.join('\n'));
                return;
            }

            // Guardar
            const success = this.dataManager.saveHoja(hojaData);

            if (success) {
                const now = new Date().toLocaleString('es-MX');
                this.updateLastSaved(`Guardado: ${now}`);
                this.showToast('✅ Hoja guardada exitosamente');
            } else {
                alert('Error al guardar la hoja');
            }

        } catch (error) {
            console.error('[HistorialController] Error al guardar:', error);
            alert('Error al guardar: ' + error.message);
        }
    }

    saveAsNew() {
        // Mostrar selector de tipo para crear una copia
        const confirm = window.confirm(
            '¿Crear una copia de esta hoja?\n\n' +
            'Se generará un nuevo ID y podrás modificar los datos.'
        );

        if (confirm) {
            this.showTipoSelector();
        }
    }

    cancelEdition() {
        const confirm = window.confirm(
            '¿Cancelar edición?\n\n' +
            'Los cambios no guardados se perderán.'
        );

        if (confirm) {
            this.clearForm();
            this.hideSidebar();
            this.updateLastSaved('Sin guardar');
        }
    }

    // ================================================
    // CAPTURAR DATOS DEL FORMULARIO
    // ================================================

    captureFormData() {
        // Usar las funciones globales getVal/getNum
        return {
            // Meta (se agrega después)
            tipo: this.currentTipo,
            id: this.currentHojaId,

            // Identificación
            cliente: getVal('client') || '',
            producto: getVal('article') || '',
            sap_code: getVal('sap-1') || '',

            // Material
            material_class: getVal('mat-class') || '',
            material_paper: getVal('mat-paper') || '',
            caliper: getVal('caliper') || '',
            flute: getVal('flute') || '',
            liner_ext: getVal('l-ext') || '',
            medium: getVal('medium') || '',
            liner_int: getVal('l-int') || '',

            // Dimensiones
            dim_grain: getVal('dim-grain') || '',
            dim_cross: getVal('dim-cross') || '',
            paper_dim: getVal('paper-dim') || '',
            area_total: getVal('area-total') || '',

            // Pieza
            mat_area: getVal('mat-area') || '',
            pcs_sheet: getVal('pcs-sheet') || '',
            area_eff: getVal('area-eff') || '',
            waste: getVal('waste') || '',

            // Pesos
            gsm: getVal('gsm') || '',
            w_net: getVal('w-net') || '',
            w_gross: getVal('w-gross') || '',

            // Paletizado
            pcs_pack: getVal('pcs-pack') || '',
            packs_layer: getVal('packs-layer') || '',
            layers_pallet: getVal('layers-pallet') || '',
            total_pcs: getVal('total-pcs') || '',
            pallets_cont: getVal('pallets-cont') || '',
            pcs_cont: getVal('pcs-cont') || '',

            // Imágenes (URLs)
            image_urls: {
                logo_sw: '',  // Ya están en Dropbox
                logo_cliente: '',
                producto_img: ''
            },

            // Notas adicionales
            additional_notes: ''
        };
    }

    // ================================================
    // CARGAR DATOS AL FORMULARIO
    // ================================================

    loadHojaToForm(hojaData) {
        if (!hojaData) return;

        // Usar las funciones globales setVal
        setVal('client', hojaData.cliente || '');
        setVal('article', hojaData.producto || '');
        setVal('sap-1', hojaData.sap_code || '');

        // Material
        setVal('mat-class', hojaData.material_class || '');
        setVal('mat-paper', hojaData.material_paper || '');
        setVal('caliper', hojaData.caliper || '');
        setVal('flute', hojaData.flute || '');
        setVal('l-ext', hojaData.liner_ext || '');
        setVal('medium', hojaData.medium || '');
        setVal('l-int', hojaData.liner_int || '');

        // Dimensiones
        setVal('dim-grain', hojaData.dim_grain || '');
        setVal('dim-cross', hojaData.dim_cross || '');
        setVal('paper-dim', hojaData.paper_dim || '');
        setVal('area-total', hojaData.area_total || '');

        // Pieza
        setVal('mat-area', hojaData.mat_area || '');
        setVal('pcs-sheet', hojaData.pcs_sheet || '');
        setVal('area-eff', hojaData.area_eff || '');
        setVal('waste', hojaData.waste || '');

        // Pesos
        setVal('gsm', hojaData.gsm || '');
        setVal('w-net', hojaData.w_net || '');
        setVal('w-gross', hojaData.w_gross || '');

        // Paletizado
        setVal('pcs-pack', hojaData.pcs_pack || '');
        setVal('packs-layer', hojaData.packs_layer || '');
        setVal('layers-pallet', hojaData.layers_pallet || '');
        setVal('total-pcs', hojaData.total_pcs || '');
        setVal('pallets-cont', hojaData.pallets_cont || '');
        setVal('pcs-cont', hojaData.pcs_cont || '');

        // Actualizar sidebar
        this.currentHojaId = hojaData.id;
        this.currentTipo = hojaData.tipo;
        this.showSidebar(hojaData.id, hojaData.estado);

        const modDate = new Date(hojaData.fecha_modificacion).toLocaleString('es-MX');
        this.updateLastSaved(`Última modificación: ${modDate}`);

        console.log(`[HistorialController] Hoja ${hojaData.id} cargada al formulario`);
    }

    // ================================================
    // UTILIDADES
    // ================================================

    clearForm() {
        // Limpiar todos los inputs
        const inputs = document.querySelectorAll('input[data-id], textarea[data-id], select[data-id]');
        inputs.forEach(input => {
            if (input.tagName === 'SELECT') {
                input.selectedIndex = 0;
            } else {
                input.value = '';
            }
        });
    }

    showToast(message, isError = false) {
        // Usar UI global si existe
        if (window.UI && typeof window.UI.showToast === 'function') {
            window.UI.showToast(message, isError);
        } else {
            alert(message);
        }
    }

    exportCurrentToExcel() {
        if (!this.currentHojaId) {
            alert('No hay una hoja activa para exportar');
            return;
        }
        // Reutilizar la lógica de exportación
        this.exportHojaToExcel(this.currentHojaId);
    }

    exportHojaToExcel(id) {
        try {
            const hoja = this.dataManager.loadHoja(id);
            if (!hoja) {
                alert('Error al cargar los datos de la hoja.');
                return;
            }

            // Define keys and headers in desired order
            // keys correspond to 'data-id' in index.html (mostly)
            // or internal keys if dataManager saves them differently
            const exportMap = [
                // --- GENERAL ---
                { header: 'ID (SAP)', key: 'sap-1' }, // sap_code
                { header: 'Cliente', key: 'client' },
                { header: 'Articulo', key: 'article' },
                { header: 'Fecha Ingreso', key: 'date-1' },
                { header: 'Fecha Doc', key: 'date-doc' },

                // --- MATERIAL ---
                { header: 'Clase Material', key: 'mat-class' },
                { header: 'Tipo Papel', key: 'mat-paper' },
                { header: 'Area Pieza', key: 'mat-area' },
                { header: 'Calibre', key: 'caliper' },
                { header: 'Gramaje', key: 'gsm' },
                { header: 'Flauta', key: 'flute' },
                { header: 'Dim. Papel', key: 'paper-dim' },
                { header: 'Ancho Rollo', key: 'roll-width' },
                { header: 'Liner Int', key: 'l-int' },
                { header: 'Medium', key: 'medium' },
                { header: 'Liner Ext', key: 'l-ext' },
                { header: 'ECT', key: 'ect' },

                // --- DIMENSIONES INT ---
                { header: 'Largo Int', key: 'dim-l' },
                { header: 'Ancho Int', key: 'dim-w' },
                { header: 'Alto Int', key: 'dim-h' },
                { header: 'Area Total', key: 'area-total' },
                { header: 'Area Efectiva', key: 'area-eff' },
                { header: 'Merma', key: 'waste' },
                { header: 'Peso Bruto', key: 'w-gross' },
                { header: 'Peso Neto', key: 'w-net' },

                // --- IMPRESION ---
                { header: 'Impresora', key: 'printer' },
                { header: 'Sentido Hilo (Imp)', key: 'grain-print' },
                { header: 'Tinta 1', key: 'ink1' }, { header: 'SAP T1', key: 'sap1' },
                { header: 'Tinta 2', key: 'ink2' }, { header: 'SAP T2', key: 'sap2' },
                { header: 'Tinta 3', key: 'ink3' }, { header: 'SAP T3', key: 'sap3' },
                { header: 'Tinta 4', key: 'ink4' }, { header: 'SAP T4', key: 'sap4' },
                { header: 'Tinta 5', key: 'ink5' }, { header: 'SAP T5', key: 'sap5' },
                { header: 'Tinta 6', key: 'ink6' }, { header: 'SAP T6', key: 'sap6' },
                { header: 'Tinta 7', key: 'ink7' }, { header: 'SAP T7', key: 'sap7' },
                { header: 'Tinta 8', key: 'ink8' }, { header: 'SAP T8', key: 'sap8' },
                { header: 'Obs Impresion', key: 'obs-print' },

                // --- TROQUELADO ---
                { header: 'Troqueladora', key: 'die-machine' },
                { header: '# Artios', key: 'artios' },
                { header: 'Dim. Hilo', key: 'dim-grain' },
                { header: 'Dim. Contra', key: 'dim-cross' },
                { header: 'Piezas/Hoja', key: 'pcs-sheet' },
                { header: 'Cinta Ref', key: 'tape' },
                { header: 'Grosor', key: 'thickness' },
                { header: 'Tipo Troquel', key: 'die-type' },
                { header: 'Gap H', key: 'gap-h' },
                { header: 'Gap V', key: 'gap-v' },
                { header: 'Pinza', key: 'grip' },
                { header: 'Contra Pinza', key: 'grip-back' },
                { header: 'Escuadras', key: 'squares' },
                { header: 'Obs Troquel', key: 'obs-die' },

                // --- PEGADO ---
                { header: 'Pegadora', key: 'gluer' },
                { header: 'Tipo Pegado', key: 'glue-type' },
                { header: 'Adhesivo', key: 'glue-name' },
                { header: 'Obs Pegado', key: 'obs-glue' },

                // --- EMPAQUE COLECTIVO ---
                { header: 'Tipo Empaque', key: 'pack-type' },
                { header: 'Flauta Empaque', key: 'pack-flute' },
                { header: 'ECT Empaque', key: 'pack-ect' },
                { header: 'Largo Empaque', key: 'pack-l' },
                { header: 'Ancho Empaque', key: 'pack-w' },
                { header: 'Alto Empaque', key: 'pack-h' },
                { header: 'Pzas/Paquete', key: 'pcs-pack' },
                { header: 'Paq/Cama', key: 'packs-layer' },
                { header: 'Camas/Pallet', key: 'layers-pallet' },
                { header: 'Total Piezas', key: 'total-pcs' },
                { header: 'Instr. Empaque', key: 'pack-instr' },

                // --- EMBARQUES ---
                { header: 'Pzas/Contenedor', key: 'pcs-cont' },
                { header: 'Pallets/Cont', key: 'pallets-cont' },
                { header: 'Tam Contenedor', key: 'size-cont' }
            ];

            // Build Data Object
            const rowData = {};

            // Special handling for ID and internal metadata if not in 'data' object
            // The dataManager structure: hoja = { id, tipo, ...data: { 'sap-1': '...', ... } }
            // Or hoja itself has keys. Based on loadHoja, checks localStorage 'sw-data-'+id or 'hoja-'+id
            // Let's assume hoja contains the flattened data or we need to merge.
            // If loadHoja returns the full object with 'data' property?
            // Checking DataManager... loadHoja(id) returns { id, timestamp, ...localStorageData }
            // Actually, HojaMaestra saves individual fields to 'sw-data-FIELDID'. 
            // DataManager.loadHoja might just return the metadata record.
            // We need to reconstruct the full data from localStorage keys 'sw-data-' + key

            exportMap.forEach(col => {
                let val = '';

                // 1. Try direct property on hoja object (e.g. id, fecha_modificacion)
                if (hoja[col.key] !== undefined) val = hoja[col.key];

                // 2. Try loading from localStorage 'sw-data-' persistence (Primary Source for fields)
                // Note: The key in exportMap corresponds to 'data-id'
                const storedVal = localStorage.getItem('sw-data-' + col.key);
                if (storedVal !== null) val = storedVal;

                // 3. Fallback for sap-1 if mapped from ID
                if (col.key === 'sap-1' && !val) val = hoja.id || id;

                rowData[col.header] = val;
            });

            // Metadata extra
            rowData['Fecha Modificación'] = new Date(hoja.fecha_modificacion || Date.now()).toLocaleString();
            rowData['Estado'] = hoja.estado || 'Activo';

            // Create Workbook
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet([rowData]);

            // Auto-width columns
            const wscols = Object.keys(rowData).map(k => ({ wch: Math.max(k.length + 5, 15) }));
            ws['!cols'] = wscols;

            XLSX.utils.book_append_sheet(wb, ws, "Hoja Maestra");

            // Generate Filename
            const dateStr = new Date().toISOString().slice(0, 10);
            const fileName = `Hoja_Maestra_${id}_${dateStr}.xlsx`;

            // Download
            XLSX.writeFile(wb, fileName);
            console.log(`[HistorialController] Exportado a ${fileName}`);

        } catch (error) {
            console.error('[HistorialController] Error al exportar:', error);
            alert('Error al exportar a Excel: ' + error.message);
        }
    }
}

// Instancia global
window.HistorialController = HistorialController;
window.historialController = new HistorialController(window.dataManager);

console.log('[HistorialController] Módulo cargado exitosamente');
