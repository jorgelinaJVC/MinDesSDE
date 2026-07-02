/* ============================================================
   funebres.js — Servicios Funerarios
   Versión: 4.0 - Completamente Corregido
   ============================================================ */

// ============================================================
// 1. BURGER MENU
// ============================================================
(function() {
    'use strict';
    
    const burger = document.getElementById('burgerBtn');
    const navMenu = document.getElementById('mainNav');

    if (burger && navMenu) {
        burger.addEventListener('click', function() {
            navMenu.classList.toggle('open');
            burger.classList.toggle('open');
            burger.setAttribute('aria-expanded', navMenu.classList.contains('open'));
        });

        // Cerrar menú al hacer click en enlaces
        document.querySelectorAll('.nav__link').forEach(function(link) {
            link.addEventListener('click', function() {
                navMenu.classList.remove('open');
                burger.classList.remove('open');
                burger.setAttribute('aria-expanded', 'false');
            });
        });

        // Cerrar al hacer clic fuera
        document.addEventListener('click', function(e) {
            if (!navMenu.contains(e.target) && !burger.contains(e.target)) {
                navMenu.classList.remove('open');
                burger.classList.remove('open');
                burger.setAttribute('aria-expanded', 'false');
            }
        });

        // Cerrar con ESC
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && navMenu.classList.contains('open')) {
                navMenu.classList.remove('open');
                burger.classList.remove('open');
                burger.setAttribute('aria-expanded', 'false');
                burger.focus();
            }
        });
    }
})();

// ============================================================
// 2. MODAL DE SOLICITUD - CORREGIDO
// ============================================================
(function() {
    'use strict';
    
    // ✅ DEFINIR LA VARIABLE modal CORRECTAMENTE
    const modal = document.getElementById('solicitudModal');
    const openBtn = document.getElementById('openSolicitudModalBtn');
    const closeBtn = document.getElementById('cerrarModalBtn');
    const enviarBtn = document.getElementById('enviarSolicitudBtn');
    const feedbackSpan = document.getElementById('modalFeedback');

    function openModal() {
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    function closeModal() {
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
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

    // Cerrar al hacer clic fuera del modal
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) closeModal();
        });
    }

    // Cerrar con ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
            closeModal();
        }
    });

    if (enviarBtn) {
        enviarBtn.addEventListener('click', function() {
            const nombreInput = document.getElementById('nombreSolicitante');
            const telefonoInput = document.getElementById('telefonoSolicitante');
            const nombre = nombreInput ? nombreInput.value.trim() : '';
            const telefono = telefonoInput ? telefonoInput.value.trim() : '';

            if (!nombre || !telefono) {
                if (feedbackSpan) {
                    feedbackSpan.innerHTML = '⚠️ Por favor, complete nombre y teléfono.';
                    feedbackSpan.style.color = '#e30613';
                }
                if (nombreInput) nombreInput.style.borderColor = nombre ? '' : '#e30613';
                if (telefonoInput) telefonoInput.style.borderColor = telefono ? '' : '#e30613';
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

// ============================================================
// 3. SMOOTH SCROLL CON OFFSET
// ============================================================
(function() {
    'use strict';
    
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

// ============================================================
// 4. ACCESIBILIDAD: ZOOM DE TEXTO - UNIFICADO Y CORREGIDO
// ============================================================
(function() {
    'use strict';
    
    console.log('✅ Iniciando botones de accesibilidad...');
    
    const btnMas = document.getElementById('btnZoomMas');
    const btnMenos = document.getElementById('btnZoomMenos');
    const btnNormal = document.getElementById('btnZoomNormal');
    
    console.log('Botón A+:', btnMas ? '✅ Encontrado' : '❌ No encontrado');
    console.log('Botón A-:', btnMenos ? '✅ Encontrado' : '❌ No encontrado');
    console.log('Botón A:', btnNormal ? '✅ Encontrado' : '❌ No encontrado');
    
    // Si no se encuentran, crearlos
    if (!btnMas || !btnMenos || !btnNormal) {
        console.warn('⚠️ Botones no encontrados, creándolos...');
        crearBotonesAccesibilidad();
        return;
    }
    
    // Función para mostrar mensaje flotante
    function mostrarMensaje(texto) {
        let msg = document.getElementById('zoomMensaje');
        if (!msg) {
            msg = document.createElement('div');
            msg.id = 'zoomMensaje';
            msg.style.cssText = 'position:fixed; bottom:80px; right:20px; background:#1a3a6b; color:white; padding:10px 20px; border-radius:30px; font-size:14px; z-index:100000; font-family:sans-serif; box-shadow:0 4px 12px rgba(0,0,0,0.3); transition: opacity 0.3s ease;';
            document.body.appendChild(msg);
        }
        msg.textContent = texto;
        msg.style.display = 'block';
        msg.style.opacity = '1';
        
        clearTimeout(msg._timeout);
        msg._timeout = setTimeout(function() {
            msg.style.opacity = '0';
            setTimeout(function() {
                msg.style.display = 'none';
            }, 300);
        }, 2000);
    }
    
    // Función para cambiar el zoom
    function cambiarZoom(tipo) {
        // Eliminar todas las clases de zoom
        document.body.classList.remove('zoom-normal', 'zoom-grande', 'zoom-muy-grande');
        
        if (tipo === 'mas') {
            if (document.body.classList.contains('zoom-grande')) {
                document.body.classList.add('zoom-muy-grande');
                localStorage.setItem('zoom', 'muy-grande');
                mostrarMensaje('🔍🔍 Texto muy grande (140%)');
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
                mostrarMensaje('🔍 Texto grande (120%)'); // ✅ CORREGIDO: mostrarMensaje (con j)
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
    
    // Asignar eventos
    if (btnMas) {
        btnMas.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('✅ Click en A+');
            cambiarZoom('mas');
        });
    }
    
    if (btnMenos) {
        btnMenos.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('✅ Click en A-');
            cambiarZoom('menos');
        });
    }
    
    if (btnNormal) {
        btnNormal.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('✅ Click en A');
            cambiarZoom('normal');
        });
    }
    
    // Hover effects
    [btnMas, btnMenos, btnNormal].forEach(function(btn) {
        btn.addEventListener('mouseenter', function() {
            this.style.background = '#c8a84b';
            this.style.color = '#0d2240';
            this.style.borderColor = 'white';
        });
        btn.addEventListener('mouseleave', function() {
            this.style.background = '#1a3a6b';
            this.style.color = 'white';
            this.style.borderColor = '#c8a84b';
        });
    });
    
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
    
    // ============================================================
    // FUNCIÓN PARA CREAR BOTONES SI NO EXISTEN
    // ============================================================
    function crearBotonesAccesibilidad() {
        const container = document.createElement('div');
        container.className = 'accesibilidad-container';
        container.setAttribute('role', 'toolbar');
        container.setAttribute('aria-label', 'Controles de accesibilidad');
        container.style.cssText = 'position:fixed; bottom:24px; right:24px; display:flex; flex-direction:column; gap:10px; z-index:99999;';
        
        // Botón A+
        const btnMas2 = document.createElement('button');
        btnMas2.id = 'btnZoomMas';
        btnMas2.className = 'accesibilidad-btn';
        btnMas2.textContent = 'A+';
        btnMas2.setAttribute('title', 'Aumentar tamaño');
        btnMas2.setAttribute('aria-label', 'Aumentar tamaño de letra');
        btnMas2.style.cssText = 'background:#1a3a6b; border:2px solid #c8a84b; color:white; font-weight:bold; width:48px; height:48px; border-radius:50%; cursor:pointer; font-size:1.2rem; box-shadow:0 4px 16px rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; font-family:Arial,sans-serif; transition:all 0.3s ease;';
        
        // Botón A-
        const btnMenos2 = document.createElement('button');
        btnMenos2.id = 'btnZoomMenos';
        btnMenos2.className = 'accesibilidad-btn';
        btnMenos2.textContent = 'A-';
        btnMenos2.setAttribute('title', 'Disminuir tamaño');
        btnMenos2.setAttribute('aria-label', 'Disminuir tamaño de letra');
        btnMenos2.style.cssText = 'background:#1a3a6b; border:2px solid #c8a84b; color:white; font-weight:bold; width:48px; height:48px; border-radius:50%; cursor:pointer; font-size:1.2rem; box-shadow:0 4px 16px rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; font-family:Arial,sans-serif; transition:all 0.3s ease;';
        
        // Botón A (normal)
        const btnNormal2 = document.createElement('button');
        btnNormal2.id = 'btnZoomNormal';
        btnNormal2.className = 'accesibilidad-btn';
        btnNormal2.textContent = 'A';
        btnNormal2.setAttribute('title', 'Tamaño normal');
        btnNormal2.setAttribute('aria-label', 'Restablecer tamaño de letra');
        btnNormal2.style.cssText = 'background:#1a3a6b; border:2px solid #c8a84b; color:white; font-weight:bold; width:48px; height:48px; border-radius:50%; cursor:pointer; font-size:1.2rem; box-shadow:0 4px 16px rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; font-family:Arial,sans-serif; transition:all 0.3s ease;';
        
        container.appendChild(btnMas2);
        container.appendChild(btnMenos2);
        container.appendChild(btnNormal2);
        document.body.appendChild(container);
        
        console.log('✅ Botones de accesibilidad creados automáticamente');
        location.reload();
    }
})();

// ============================================================
// 5. ACTIVE LINK DESTACADO AL SCROLLEAR
// ============================================================
(function() {
    'use strict';
    
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav__link');
    
    if (sections.length && navLinks.length) {
        function updateActiveLink() {
            const scrollPos = window.pageYOffset + 100;
            let currentSection = '';
            
            sections.forEach(function(section) {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.offsetHeight;
                if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
                    currentSection = section.getAttribute('id');
                }
            });
            
            navLinks.forEach(function(link) {
                link.classList.remove('active');
                const href = link.getAttribute('href');
                if (href === '#' + currentSection) {
                    link.classList.add('active');
                }
            });
        }
        
        let ticking = false;
        window.addEventListener('scroll', function() {
            if (!ticking) {
                window.requestAnimationFrame(function() {
                    updateActiveLink();
                    ticking = false;
                });
                ticking = true;
            }
        });
        
        updateActiveLink();
    }
})();

console.log('✅ Servicios Funerarios - JS cargado correctamente');