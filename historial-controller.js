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

    createNewHoja(tipo, id) {
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
        if (typeof startNewMasterManual === 'function') {
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

        try {
            const hojaData = this.captureFormData();
            hojaData.id = this.currentHojaId;
            hojaData.tipo = this.currentTipo;

            // Exportar usando SheetJS (implementar en siguiente fase)
            console.log('[HistorialController] Exportar a Excel:', hojaData);
            alert('Funcionalidad de exportación en desarrollo');

        } catch (error) {
            console.error('[HistorialController] Error al exportar:', error);
            alert('Error al exportar: ' + error.message);
        }
    }
}

// Instancia global
window.HistorialController = HistorialController;
window.historialController = new HistorialController(window.dataManager);

console.log('[HistorialController] Módulo cargado exitosamente');
