// ================================================
// HOJA MAESTRA - DATA MANAGER
// Sistema de gestión de historial y localStorage
// ================================================

class HojaMaestraDataManager {
    constructor() {
        this.STORAGE_KEY = 'HM_HISTORIAL';
        this.FAC_COUNTER_KEY = 'HM_FAC_COUNTER';
        this.SETTINGS_KEY = 'HM_SETTINGS';
    }

    // ================================================
    // GESTIÓN DE HISTORIAL
    // ================================================

    /**
     * Obtener todas las hojas del historial
     * @returns {Array} Array de objetos hoja maestra
     */
    getAllHojas() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('[DataManager] Error al cargar historial:', error);
            return [];
        }
    }

    /**
     * Guardar o actualizar una hoja maestra
     * @param {Object} hojaData - Datos de la hoja
     * @returns {boolean} Éxito de la operación
     */
    saveHoja(hojaData) {
        try {
            const hojas = this.getAllHojas();
            const existingIndex = hojas.findIndex(h => h.id === hojaData.id);

            const timestamp = new Date().toISOString();

            if (existingIndex >= 0) {
                // Actualizar existente
                hojaData.fecha_modificacion = timestamp;
                hojas[existingIndex] = hojaData;
            } else {
                // Nueva hoja
                hojaData.fecha_creacion = timestamp;
                hojaData.fecha_modificacion = timestamp;
                hojas.push(hojaData);
            }

            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(hojas));
            console.log(`[DataManager] Hoja ${hojaData.id} guardada exitosamente`);
            return true;

        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                console.error('[DataManager] LocalStorage lleno');
                alert('⚠️ Almacenamiento lleno. Exporta el historial a Excel y limpia hojas antiguas.');
            } else {
                console.error('[DataManager] Error al guardar hoja:', error);
            }
            return false;
        }
    }

    /**
     * Cargar una hoja específica por ID
     * @param {string} id - ID de la hoja
     * @returns {Object|null} Datos de la hoja o null
     */
    loadHoja(id) {
        const hojas = this.getAllHojas();
        const hoja = hojas.find(h => h.id === id);

        if (hoja) {
            console.log(`[DataManager] Hoja ${id} cargada`);
            return hoja;
        }

        console.warn(`[DataManager] Hoja ${id} no encontrada`);
        return null;
    }

    /**
     * Eliminar una hoja del historial
     * @param {string} id - ID de la hoja a eliminar
     * @returns {boolean} Éxito de la operación
     */
    deleteHoja(id) {
        try {
            const hojas = this.getAllHojas();
            const filteredHojas = hojas.filter(h => h.id !== id);

            if (filteredHojas.length === hojas.length) {
                console.warn(`[DataManager] Hoja ${id} no encontrada para eliminar`);
                return false;
            }

            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredHojas));
            console.log(`[DataManager] Hoja ${id} eliminada`);
            return true;

        } catch (error) {
            console.error('[DataManager] Error al eliminar hoja:', error);
            return false;
        }
    }

    // ================================================
    // BÚSQUEDA Y FILTRADO
    // ================================================

    /**
     * Buscar hojas por texto
     * @param {string} query - Texto a buscar
     * @returns {Array} Hojas que coinciden
     */
    searchHojas(query) {
        if (!query || query.trim() === '') {
            return this.getAllHojas();
        }

        const hojas = this.getAllHojas();
        const lowerQuery = query.toLowerCase();

        return hojas.filter(hoja => {
            return (
                hoja.id?.toLowerCase().includes(lowerQuery) ||
                hoja.cliente?.toLowerCase().includes(lowerQuery) ||
                hoja.producto?.toLowerCase().includes(lowerQuery) ||
                hoja.sap_code?.toLowerCase().includes(lowerQuery)
            );
        });
    }

    /**
     * Filtrar hojas por criterios
     * @param {Object} filters - Criterios de filtrado
     * @returns {Array} Hojas filtradas
     */
    filterHojas(filters = {}) {
        let hojas = this.getAllHojas();

        if (filters.tipo) {
            hojas = hojas.filter(h => h.tipo === filters.tipo);
        }

        if (filters.estado) {
            hojas = hojas.filter(h => h.estado === filters.estado);
        }

        if (filters.fechaInicio) {
            hojas = hojas.filter(h => new Date(h.fecha_creacion) >= new Date(filters.fechaInicio));
        }

        if (filters.fechaFin) {
            hojas = hojas.filter(h => new Date(h.fecha_creacion) <= new Date(filters.fechaFin));
        }

        return hojas;
    }

    // ================================================
    // SISTEMA DE IDs
    // ================================================

    /**
     * Generar ID según tipo
     * @param {string} tipo - 'SAP', 'FAC', o 'MAQ'
     * @param {string} codigo - Código SAP o Maquila (opcional para FAC)
     * @returns {string} ID generado
     */
    generateID(tipo, codigo = null) {
        switch (tipo) {
            case 'SAP':
                if (!codigo) {
                    throw new Error('Código SAP es requerido');
                }
                return codigo.trim();

            case 'FAC':
                const nextNumber = this.getNextFACNumber();
                return `FAC-${String(nextNumber).padStart(3, '0')}`;

            case 'MAQ':
                if (!codigo) {
                    throw new Error('Código de ingeniero es requerido');
                }
                return `M-${codigo.trim()}`;

            default:
                throw new Error(`Tipo inválido: ${tipo}`);
        }
    }

    /**
     * Obtener siguiente número consecutivo FAC
     * @returns {number} Siguiente número
     */
    getNextFACNumber() {
        try {
            const current = parseInt(localStorage.getItem(this.FAC_COUNTER_KEY) || '0', 10);
            const next = current + 1;
            localStorage.setItem(this.FAC_COUNTER_KEY, next.toString());
            return next;
        } catch (error) {
            console.error('[DataManager] Error al generar número FAC:', error);
            return 1;
        }
    }

    /**
     * Obtener preview del próximo ID FAC
     * @returns {string} Preview del ID
     */
    getNextFACPreview() {
        const current = parseInt(localStorage.getItem(this.FAC_COUNTER_KEY) || '0', 10);
        const next = current + 1;
        return `FAC-${String(next).padStart(3, '0')}`;
    }

    /**
     * Validar que un ID no esté duplicado
     * @param {string} id - ID a validar
     * @returns {boolean} true si está disponible
     */
    isIDAvailable(id) {
        const hojas = this.getAllHojas();
        return !hojas.some(h => h.id === id);
    }

    // ================================================
    // VALIDACIÓN
    // ================================================

    /**
     * Validar datos de hoja maestra
     * @param {Object} hojaData - Datos a validar
     * @returns {Object} { valid: boolean, errors: Array }
     */
    validateHoja(hojaData) {
        const errors = [];

        // Campos requeridos mínimos
        if (!hojaData.tipo) {
            errors.push('Tipo de hoja es requerido');
        }

        if (!hojaData.id) {
            errors.push('ID es requerido');
        }

        // Validar formato de ID según tipo
        if (hojaData.tipo === 'FAC' && !hojaData.id.startsWith('FAC-')) {
            errors.push('ID FAC debe tener formato FAC-XXX');
        }

        if (hojaData.tipo === 'MAQ' && !hojaData.id.startsWith('M-')) {
            errors.push('ID Maquila debe tener formato M-CODIGO');
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Crear estructura de datos vacía con schema completo
     * @param {string} tipo - Tipo de hoja
     * @param {string} id - ID de la hoja
     * @returns {Object} Estructura de datos completa
     */
    createEmptyHoja(tipo, id) {
        return {
            // Meta información
            tipo: tipo,
            id: id,
            fecha_creacion: null,  // Se asigna al guardar
            fecha_modificacion: null,
            estado: 'borrador',

            // Identificación
            cliente: '',
            producto: '',
            sap_code: '',

            // Material
            material_class: '',
            material_paper: '',
            caliper: '',
            flute: '',
            liner_ext: '',
            medium: '',
            liner_int: '',

            // Dimensiones
            dim_grain: '',
            dim_cross: '',
            paper_dim: '',
            area_total: '',

            // Pieza
            mat_area: '',
            pcs_sheet: '',
            area_eff: '',
            waste: '',

            // Pesos
            gsm: '',
            w_net: '',
            w_gross: '',

            // Paletizado
            pcs_pack: '',
            packs_layer: '',
            layers_pallet: '',
            total_pcs: '',
            pallets_cont: '',
            pcs_cont: '',

            // Imágenes (solo URLs)
            image_urls: {
                logo_sw: '',
                logo_cliente: '',
                producto_img: ''
            },

            // Campos adicionales que puedan existir en el formulario
            additional_notes: ''
        };
    }

    // ================================================
    // UTILIDADES
    // ================================================

    /**
     * Limpiar todo el historial (CON CONFIRMACIÓN)
     * @returns {boolean} Éxito de la operación
     */
    clearAllHistory() {
        const confirmacion = confirm(
            '⚠️ ¿Estás seguro de eliminar TODO el historial?\n\n' +
            'Esta acción no se puede deshacer.\n\n' +
            'Recomendación: Exporta a Excel antes de continuar.'
        );

        if (confirmacion) {
            try {
                localStorage.removeItem(this.STORAGE_KEY);
                console.log('[DataManager] Historial eliminado completamente');
                return true;
            } catch (error) {
                console.error('[DataManager] Error al limpiar historial:', error);
                return false;
            }
        }

        return false;
    }

    /**
     * Obtener estadísticas del historial
     * @returns {Object} Estadísticas
     */
    getStats() {
        const hojas = this.getAllHojas();

        return {
            total: hojas.length,
            por_tipo: {
                SAP: hojas.filter(h => h.tipo === 'SAP').length,
                FAC: hojas.filter(h => h.tipo === 'FAC').length,
                MAQ: hojas.filter(h => h.tipo === 'MAQ').length
            },
            por_estado: {
                borrador: hojas.filter(h => h.estado === 'borrador').length,
                finalizada: hojas.filter(h => h.estado === 'finalizada').length,
                aprobada: hojas.filter(h => h.estado === 'aprobada').length
            },
            ultimo_fac: this.getNextFACPreview()
        };
    }

    /**
     * Exportar datos para debugging
     * @returns {string} JSON del historial
     */
    exportJSON() {
        return JSON.stringify(this.getAllHojas(), null, 2);
    }

    /**
     * Importar datos desde JSON (para migración)
     * @param {string} jsonData - JSON del historial
     * @returns {boolean} Éxito de la operación
     */
    importJSON(jsonData) {
        try {
            const hojas = JSON.parse(jsonData);

            if (!Array.isArray(hojas)) {
                throw new Error('Formato inválido: debe ser un array');
            }

            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(hojas));
            console.log(`[DataManager] Importadas ${hojas.length} hojas`);
            return true;

        } catch (error) {
            console.error('[DataManager] Error al importar JSON:', error);
            alert('Error al importar datos: ' + error.message);
            return false;
        }
    }
}

// Instancia global
window.HojaMaestraDataManager = HojaMaestraDataManager;
window.dataManager = new HojaMaestraDataManager();

console.log('[DataManager] Módulo cargado exitosamente');
