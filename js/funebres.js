// ========== BURGER MENU ==========
(function() {
const burger = document.getElementById('burgerBtn');
const navMenu = document.getElementById('mainNav');

if (burger && navMenu) {
    burger.addEventListener('click', function() {
    navMenu.classList.toggle('open');
    burger.classList.toggle('open');
    });
}

  // Cerrar menú al hacer click en enlaces
document.querySelectorAll('.nav__link').forEach(function(link) {
    link.addEventListener('click', function() {
    if (navMenu) navMenu.classList.remove('open');
    if (burger) burger.classList.remove('open');
    });
});
})();

// ========== MODAL DE SOLICITUD ==========
(function() {
    const openBtn = document.getElementById('openSolicitudModalBtn');
    const closeBtn = document.getElementById('cerrarModalBtn');
    const enviarBtn = document.getElementById('enviarSolicitudBtn');
    const feedbackSpan = document.getElementById('modalFeedback');

function openModal() {
    if (modal) modal.style.display = 'flex';
}

function closeModal() {
    if (modal) modal.style.display = 'none';
    if (feedbackSpan) feedbackSpan.innerHTML = '';
    const nombreInput = document.getElementById('nombreSolicitante');
    const telefonoInput = document.getElementById('telefonoSolicitante');
    const mensajeInput = document.getElementById('mensajeSolicitud');
    if (nombreInput) nombreInput.value = '';
    if (telefonoInput) telefonoInput.value = '';
    if (mensajeInput) mensajeInput.value = '';
}

if (openBtn) openBtn.addEventListener('click', openModal);
if (closeBtn) closeBtn.addEventListener('click', closeModal);

if (window) {
    window.addEventListener('click', function(e) {
    if (modal && e.target === modal) closeModal();
    });
}

if (enviarBtn) {
    enviarBtn.addEventListener('click', function() {
    const nombre = document.getElementById('nombreSolicitante')?.value.trim() || '';
    const telefono = document.getElementById('telefonoSolicitante')?.value.trim() || '';

    if (!nombre || !telefono) {
        if (feedbackSpan) {
        feedbackSpan.innerHTML = '⚠️ Por favor, complete nombre y teléfono.';
        feedbackSpan.style.color = '#e30613';
        }
        return;
    }

    if (feedbackSpan) {
        feedbackSpan.innerHTML = '✅ ¡Gracias ' + nombre + '! Su solicitud ha sido registrada. Un asesor se comunicará al ' + telefono + ' dentro del horario de atención.';
        feedbackSpan.style.color = '#10b981';
    }

    setTimeout(function() {
        closeModal();
    }, 2800);
    });
}
})();

// ========== SMOOTH SCROLL CON OFFSET ==========
(function() {
document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
    anchor.addEventListener('click', function(e) {
    const href = this.getAttribute('href');
    if (href === '#' || href === '' || href === 'javascript:void(0)') return;
    if (this.id === 'openSolicitudModalBtn') return;

    const targetElem = document.querySelector(href);
    if (targetElem) {
        e.preventDefault();
        const header = document.querySelector('.header');
        const headerHeight = header ? header.offsetHeight : 70;
        const targetPosition = targetElem.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = targetPosition - headerHeight - 15;

        window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
        });
    }
    });
});
})();

// ========== ACCESIBILIDAD: TAMAÑO DE LETRA ==========
(function() {
console.log('Script de accesibilidad cargado');

const aumentarBtn = document.getElementById('aumentarLetraBtn');
const disminuirBtn = document.getElementById('disminuirLetraBtn');
const resetBtn = document.getElementById('resetLetraBtn');

console.log('Botones encontrados:', { 
    aumentar: aumentarBtn ? 'SI' : 'NO', 
    disminuir: disminuirBtn ? 'SI' : 'NO', 
    reset: resetBtn ? 'SI' : 'NO' 
});

function mostrarMensaje(texto) {
    let msg = document.getElementById('accesibilidadMsg');
    if (!msg) {
    msg = document.createElement('div');
    msg.id = 'accesibilidadMsg';
    msg.style.cssText = 'position:fixed; bottom:80px; right:20px; background:#1a3a6b; color:white; padding:8px 16px; border-radius:30px; font-size:0.8rem; z-index:10000; font-family:sans-serif;';
    document.body.appendChild(msg);
    }
    msg.textContent = texto;
    msg.style.opacity = '1';
    setTimeout(function() {
    msg.style.opacity = '0';
    }, 1500);
}

function aplicarTamaño(tamaño) {
    // Limpiar clases existentes
    document.body.classList.remove('letra-grande', 'letra-muy-grande');
    
    if (tamaño === 'grande') {
    document.body.classList.add('letra-grande');
    localStorage.setItem('tamañoLetra', 'grande');
    mostrarMensaje('🔍 Texto aumentado (20px)');
    console.log('Aplicando tamaño: GRANDE');
    } else if (tamaño === 'muy-grande') {
    document.body.classList.add('letra-muy-grande');
    localStorage.setItem('tamañoLetra', 'muy-grande');
    mostrarMensaje('🔍🔍 Texto muy grande (24px)');
    console.log('Aplicando tamaño: MUY GRANDE');
    } else {
    localStorage.setItem('tamañoLetra', 'normal');
    mostrarMensaje('📏 Texto normal (16px)');
    console.log('Aplicando tamaño: NORMAL');
    }
    
    // Forzar reflow para que los cambios se apliquen
    document.body.style.display = 'none';
    document.body.offsetHeight;
    document.body.style.display = '';
}

  // Ciclo de tamaños: normal -> grande -> muy-grande -> normal
function siguienteTamaño(actual) {
    if (actual === 'muy-grande') return 'normal';
    if (actual === 'grande') return 'muy-grande';
    return 'grande';
}

function anteriorTamaño(actual) {
    if (actual === 'grande') return 'normal';
    if (actual === 'muy-grande') return 'grande';
    return 'muy-grande';
}

if (aumentarBtn) {
    aumentarBtn.onclick = function(e) {
    e.preventDefault();
    const actual = localStorage.getItem('tamañoLetra') || 'normal';
    console.log('Click A+, actual:', actual);
    const nuevo = siguienteTamaño(actual);
    console.log('Nuevo tamaño:', nuevo);
    aplicarTamaño(nuevo);
    };
}

if (disminuirBtn) {
    disminuirBtn.onclick = function(e) {
    e.preventDefault();
    const actual = localStorage.getItem('tamañoLetra') || 'normal';
    console.log('Click A-, actual:', actual);
    const nuevo = anteriorTamaño(actual);
    console.log('Nuevo tamaño:', nuevo);
    aplicarTamaño(nuevo);
    };
}

if (resetBtn) {
    resetBtn.onclick = function(e) {
    e.preventDefault();
    console.log('Click Reset');
    aplicarTamaño('normal');
    };
}

  // Cargar preferencia guardada
const letraGuardada = localStorage.getItem('tamañoLetra');
console.log('Preferencia cargada al inicio:', letraGuardada || 'normal');
if (letraGuardada === 'grande') {
    document.body.classList.add('letra-grande');
} else if (letraGuardada === 'muy-grande') {
    document.body.classList.add('letra-muy-grande');
}
})();
// ========== ACCESIBILIDAD: ZOOM DE TEXTO (VERSIÓN SIMPLE Y FUNCIONAL) ==========
(function() {
console.log('✅ Iniciando botones de accesibilidad...');
  // Buscar los botones
const btnMas = document.getElementById('btnZoomMas');
const btnMenos = document.getElementById('btnZoomMenos');
const btnNormal = document.getElementById('btnZoomNormal');
console.log('Botón A+:', btnMas ? '✅ Encontrado' : '❌ No encontrado');
console.log('Botón A-:', btnMenos ? '✅ Encontrado' : '❌ No encontrado');
console.log('Botón A:', btnNormal ? '✅ Encontrado' : '❌ No encontrado');
  // Función para cambiar el zoom
function cambiarZoom(tipo) {
    // Eliminar todas las clases de zoom
    document.body.classList.remove('zoom-normal', 'zoom-grande', 'zoom-muy-grande');
    
    if (tipo === 'mas') {
      // Obtener el zoom actual
    if (document.body.classList.contains('zoom-grande')) {
        document.body.classList.add('zoom-muy-grande');
        localStorage.setItem('zoom', 'muy-grande');
        mostrarMensaje('🔍 Texto muy grande (140%)');
    } else if (document.body.classList.contains('zoom-muy-grande')) {
        document.body.classList.add('zoom-muy-grande');
        mostrarMensaje('🔍🔍 Ya está en máximo');
    } else {
        document.body.classList.add('zoom-grande');
        localStorage.setItem('zoom', 'grande');
        mostrarMensaje('🔍 Texto grande (120%)');
    }
    } 
    else if (tipo === 'menos') {
    if (document.body.classList.contains('zoom-muy-grande')) {
        document.body.classList.add('zoom-grande');
        localStorage.setItem('zoom', 'grande');
        mostrarMensage('🔍 Texto grande (120%)');
    } else if (document.body.classList.contains('zoom-grande')) {
        document.body.classList.add('zoom-normal');
        localStorage.setItem('zoom', 'normal');
        mostrarMensaje('📏 Texto normal (100%)');
    } else {
        mostrarMensaje('📏 Ya está en tamaño normal');
    }
    } 
    else if (tipo === 'normal') {
    document.body.classList.add('zoom-normal');
    localStorage.setItem('zoom', 'normal');
    mostrarMensaje('📏 Texto normal (100%)');
    }
    
    console.log('Zoom aplicado. Clases actuales:', document.body.className);
} 
  // Función para mostrar mensaje flotante
function mostrarMensaje(texto) {
    let msg = document.getElementById('zoomMensaje');
    if (!msg) {
    msg = document.createElement('div');
    msg.id = 'zoomMensaje';
    msg.style.cssText = 'position:fixed; bottom:80px; right:20px; background:#1a3a6b; color:white; padding:8px 16px; border-radius:30px; font-size:14px; z-index:10000; font-family:Arial; box-shadow:0 2px 8px rgba(0,0,0,0.2);';
    document.body.appendChild(msg);
    }
    msg.textContent = texto;
    msg.style.display = 'block';
    setTimeout(() => {
    msg.style.display = 'none';
    }, 1500);
}
  // Asignar eventos
if (btnMas) {
    btnMas.onclick = function() {
    console.log('✅ Click en A+');
    cambiarZoom('mas');
    };
}
if (btnMenos) {
    btnMenos.onclick = function() {
    console.log('✅ Click en A-');
    cambiarZoom('menos');
    };
}
if (btnNormal) {
    btnNormal.onclick = function() {
    console.log('✅ Click en A');
    cambiarZoom('normal');
    };
}
  // Cargar zoom guardado
const zoomGuardado = localStorage.getItem('zoom');
console.log('Zoom guardado:', zoomGuardado);
if (zoomGuardado === 'grande') {
    document.body.classList.add('zoom-grande');
} else if (zoomGuardado === 'muy-grande') {
    document.body.classList.add('zoom-muy-grande');
} else {
    document.body.classList.add('zoom-normal');
}
console.log('✅ Botones de accesibilidad listos!');
})();