// ================================================
// IMAGE-HANDLER.JS — Manejo de imágenes (Zoom, Pan, Upload, Delete)
// HojaMaestra | Consumer Packaging Monterrey
// ================================================

// --- Drag State ---
let draggedImg = null;
let startX, startY;
let initialX, initialY;

// --- Zoom & Pan ---

function updateImageScale(input, imgId) {
    const img = document.getElementById(imgId);
    if (img) {
        const scale = parseFloat(input.value);
        img.dataset.scale = scale;
        updateTransform(img);

        if (scale > 1) {
            img.classList.add('img-pan');
        } else {
            img.classList.remove('img-pan');
            if (scale === 1) {
                img.dataset.x = 0;
                img.dataset.y = 0;
                updateTransform(img);
            }
        }
    }
}

function updateTransform(img) {
    const scale = img.dataset.scale || 1;
    const x = img.dataset.x || 0;
    const y = img.dataset.y || 0;
    img.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
}

function startDrag(e) {
    if (e.target.tagName !== 'IMG') return;
    const img = e.target;

    // Only start drag if scale > 1
    if ((parseFloat(img.dataset.scale) || 1) <= 1) return;

    e.preventDefault();
    draggedImg = img;
    img.dataset.isDraggingNow = 'true';

    const clientX = e.clientX || (e.touches ? e.touches[0].clientX : 0);
    const clientY = e.clientY || (e.touches ? e.touches[0].clientY : 0);

    startX = clientX;
    startY = clientY;
    initialX = parseFloat(img.dataset.x) || 0;
    initialY = parseFloat(img.dataset.y) || 0;

    img.style.cursor = 'grabbing';
}

function drag(e) {
    if (!draggedImg) return;
    e.preventDefault();

    const clientX = e.clientX || (e.touches ? e.touches[0].clientX : 0);
    const clientY = e.clientY || (e.touches ? e.touches[0].clientY : 0);

    const dx = clientX - startX;
    const dy = clientY - startY;

    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        draggedImg.dataset.wasDragging = 'true';
    }

    draggedImg.dataset.x = initialX + dx;
    draggedImg.dataset.y = initialY + dy;

    updateTransform(draggedImg);
}

function endDrag() {
    if (draggedImg) {
        draggedImg.style.cursor = 'grab';
        draggedImg.dataset.isDraggingNow = 'false';

        const tmpImg = draggedImg;
        draggedImg = null;
        setTimeout(() => {
            if (tmpImg) tmpImg.dataset.wasDragging = 'false';
        }, 100);
    }
}

// Global drag listeners
document.addEventListener('mousemove', drag);
document.addEventListener('mouseup', endDrag);
document.addEventListener('touchmove', drag, { passive: false });
document.addEventListener('touchend', endDrag);

// Prevent file picker trigger when finishing a drag
document.addEventListener('click', function (e) {
    if (e.target.closest('.upload-area')) {
        if (e.target.tagName === 'IMG' && e.target.dataset.wasDragging === 'true') {
            e.preventDefault();
            e.stopPropagation();
            e.target.dataset.wasDragging = 'false';
            return false;
        }
    }
}, true);

// --- Image Upload ---

function handleImage(input, imgId) {
    const preview = document.getElementById(imgId);
    const container = input.parentElement;

    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            preview.src = e.target.result;
            preview.style.display = 'block';

            // Reset transform state
            preview.dataset.scale = 1;
            preview.dataset.x = 0;
            preview.dataset.y = 0;
            updateTransform(preview);

            // Reset zoom slider if present
            if (container.parentElement.querySelector('input[type="range"]')) {
                container.parentElement.querySelector('input[type="range"]').value = 1;
            }

            // Attach drag events
            preview.onmousedown = startDrag;
            preview.ontouchstart = startDrag;
            preview.classList.add('img-pan');

            // Hide placeholder text
            const text = container.querySelector('.upload-text');
            if (text) text.style.display = 'none';

            // Show delete button
            _ensureDeleteBtn(container, imgId);

            // Persist to localStorage
            try {
                localStorage.setItem('sw-img-' + imgId, e.target.result);
            } catch (e) {
                console.log('[ImageHandler] Imagen muy grande para localStorage.');
            }
        };
        reader.readAsDataURL(input.files[0]);
    }
}

/** Inject or reveal the ✕ delete button inside an upload-area */
function _ensureDeleteBtn(container, imgId) {
    let btn = container.querySelector('.img-delete-btn');
    if (!btn) {
        btn = document.createElement('button');
        btn.className = 'img-delete-btn no-print';
        btn.innerHTML = '×';
        btn.title = 'Borrar imagen';
        btn.addEventListener('click', function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            clearImage(imgId);
        });
        container.appendChild(btn);
    }
    btn.classList.add('visible');
}

/** Clear a loaded image: resets DOM, localStorage, zoom, and file input */
function clearImage(imgId) {
    const img = document.getElementById(imgId);
    if (!img) return;

    img.src = '';
    img.style.display = 'none';
    img.style.transform = '';
    img.dataset.scale = 1;
    img.dataset.x = 0;
    img.dataset.y = 0;

    const container = img.closest('.upload-area');
    if (container) {
        const text = container.querySelector('.upload-text');
        if (text) text.style.display = '';

        const btn = container.querySelector('.img-delete-btn');
        if (btn) btn.classList.remove('visible');

        const fileInput = container.querySelector('input[type="file"]');
        if (fileInput) fileInput.value = '';

        const zoomSlider = container.parentElement?.querySelector('input[type="range"]');
        if (zoomSlider) zoomSlider.value = 1;
    }

    localStorage.removeItem('sw-img-' + imgId);
    console.log('[ImageHandler] Imagen eliminada:', imgId);
}

// --- Print image state management ---
const _printImageStates = [];

window.addEventListener('beforeprint', function () {
    _printImageStates.length = 0;
    document.querySelectorAll('.upload-area img').forEach(function (img) {
        _printImageStates.push({
            img: img,
            transform: img.style.transform,
            maxWidth: img.style.maxWidth,
            maxHeight: img.style.maxHeight,
            position: img.style.position,
            top: img.style.top,
            left: img.style.left
        });
        img.style.transform = 'none';
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.style.position = 'static';
        img.style.top = '';
        img.style.left = '';
    });
});

window.addEventListener('afterprint', function () {
    _printImageStates.forEach(function (state) {
        state.img.style.transform = state.transform;
        state.img.style.maxWidth = state.maxWidth;
        state.img.style.maxHeight = state.maxHeight;
        state.img.style.position = state.position;
        state.img.style.top = state.top;
        state.img.style.left = state.left;
    });
    _printImageStates.length = 0;
});

console.log('[ImageHandler] Módulo cargado');
