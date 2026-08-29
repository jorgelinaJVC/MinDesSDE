/* ============================================================
   funebres.js — Servicios Fúnebres (Versión 8.0 - Completa)
   Incluye: Menú, Scroll, Zoom, Formulario 4 pasos, FAQ, 
   Scroll Reveal, Alto Contraste, Validación en tiempo real.
   ============================================================ */

'use strict';

// ============================================================
// 1. BURGER MENU
// ============================================================
(function() {
    const burger = document.getElementById('burgerBtn');
    const navMenu = document.getElementById('mainNav');

    if (burger && navMenu) {
        burger.addEventListener('click', function() {
            navMenu.classList.toggle('open');
            burger.classList.toggle('open');
            burger.setAttribute('aria-expanded', navMenu.classList.contains('open'));
        });

        document.querySelectorAll('.nav__link').forEach(function(link) {
            link.addEventListener('click', function() {
                navMenu.classList.remove('open');
                burger.classList.remove('open');
                burger.setAttribute('aria-expanded', 'false');
            });
        });

        document.addEventListener('click', function(e) {
            if (!navMenu.contains(e.target) && !burger.contains(e.target)) {
                navMenu.classList.remove('open');
                burger.classList.remove('open');
                burger.setAttribute('aria-expanded', 'false');
            }
        });

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
// 2. SMOOTH SCROLL CON OFFSET
// ============================================================
(function() {
    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#' || href === '' || href === 'javascript:void(0)') return;

            const targetElem = document.querySelector(href);
            if (targetElem) {
                e.preventDefault();
                const header = document.querySelector('.header');
                const headerHeight = header ? header.offsetHeight : 70;
                const targetPosition = targetElem.getBoundingClientRect().top + window.pageYOffset;
                const offsetPosition = targetPosition - headerHeight - 15;

                window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
            }
        });
    });
})();

// ============================================================
// 3. BARRA DE PROGRESO DE SCROLL
// ============================================================
(function() {
    const progressBar = document.getElementById('scrollProgressBar');
    if (progressBar) {
        window.addEventListener('scroll', function() {
            const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (winScroll / height) * 100;
            progressBar.style.width = scrolled + "%";
        });
    }
})();

// ============================================================
// 4. SCROLL REVEAL (Animaciones de entrada)
// ============================================================
(function() {
    const revealElements = document.querySelectorAll('.reveal');
    if (revealElements.length > 0) {
        const revealObserver = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('reveal-visible');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        
        revealElements.forEach(function(el) {
            revealObserver.observe(el);
        });
    }
})();

// ============================================================
// 5. FAQ ACORDEÓN
// ============================================================
(function() {
    const faqButtons = document.querySelectorAll('.faq-question');
    if (faqButtons.length > 0) {
        faqButtons.forEach(function(button) {
            button.addEventListener('click', function() {
                const expanded = this.getAttribute('aria-expanded') === 'true';
                
                // Cerrar todos los demás (comportamiento acordeón)
                faqButtons.forEach(function(btn) {
                    btn.setAttribute('aria-expanded', 'false');
                    btn.nextElementSibling.classList.remove('active');
                });

                // Abrir el actual si estaba cerrado
                if (!expanded) {
                    this.setAttribute('aria-expanded', 'true');
                    this.nextElementSibling.classList.add('active');
                }
            });
        });
    }
})();

// ============================================================
// 6. BOTÓN VOLVER ARRIBA
// ============================================================
(function() {
    const scrollTopBtn = document.getElementById('scrollTopBtn');
    if (scrollTopBtn) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 400) {
                scrollTopBtn.classList.add('visible');
            } else {
                scrollTopBtn.classList.remove('visible');
            }
        });

        scrollTopBtn.addEventListener('click', function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
})();

// ============================================================
// 7. ACCESIBILIDAD: ZOOM Y ALTO CONTRASTE
// ============================================================
(function() {
    const btnZoom = document.getElementById('btnZoom');
    const btnContraste = document.getElementById('btnContraste');
    
    if (!btnZoom || !btnContraste) return; 
    
    function mostrarMensaje(texto) {
        let msg = document.getElementById('zoomMensaje');
        if (!msg) {
            msg = document.createElement('div');
            msg.id = 'zoomMensaje';
            msg.style.cssText = 'position:fixed; bottom:160px; right:24px; background:#1a3a6b; color:white; padding:10px 20px; border-radius:30px; font-size:14px; z-index:100000; font-family:sans-serif; box-shadow:0 4px 12px rgba(0,0,0,0.3); transition: opacity 0.3s ease; pointer-events: none;';
            document.body.appendChild(msg);
        }
        msg.textContent = texto;
        msg.style.display = 'block';
        msg.style.opacity = '1';
        clearTimeout(msg._timeout);
        msg._timeout = setTimeout(function() {
            msg.style.opacity = '0';
            setTimeout(() => { msg.style.display = 'none'; }, 300);
        }, 2000);
    }
    
    // Lógica de Zoom Cíclico (100% -> 115% -> 130% -> 100%)
    function cambiarZoom() {
        let currentZoom = localStorage.getItem('zoom') || 'normal';
        let nextZoom = 'normal';
        let mensaje = '';

        if (currentZoom === 'normal') {
            nextZoom = 'grande';
            mensaje = '🔍 Texto grande (115%)';
        } else if (currentZoom === 'grande') {
            nextZoom = 'muy-grande';
            mensaje = '🔍🔍 Texto muy grande (130%)';
        } else {
            nextZoom = 'normal';
            mensaje = '📏 Texto normal (100%)';
        }

        document.documentElement.classList.remove('zoom-normal', 'zoom-grande', 'zoom-muy-grande');
        if (nextZoom !== 'normal') {
            document.documentElement.classList.add('zoom-' + nextZoom);
        }
        localStorage.setItem('zoom', nextZoom);
        
        // Actualizar el texto del botón
        const textos = { 'normal': '100%', 'grande': '115%', 'muy-grande': '130%' };
        const span = btnZoom.querySelector('span');
        if (span) span.textContent = textos[nextZoom];
        
        mostrarMensaje(mensaje);
    }
    
    btnZoom.addEventListener('click', (e) => { e.preventDefault(); cambiarZoom(); });
    
    // Restaurar estado de Zoom al cargar
    const zoomGuardado = localStorage.getItem('zoom') || 'normal';
    if (zoomGuardado !== 'normal') {
        document.documentElement.classList.add('zoom-' + zoomGuardado);
        const span = btnZoom.querySelector('span');
        if (span) span.textContent = zoomGuardado === 'grande' ? '115%' : '130%';
    }

    // Lógica de Alto Contraste
    if (localStorage.getItem('highContrast') === 'true') {
        document.body.classList.add('high-contrast');
    }
    
    btnContraste.addEventListener('click', function(e) {
        e.preventDefault();
        document.body.classList.toggle('high-contrast');
        const isActive = document.body.classList.contains('high-contrast');
        localStorage.setItem('highContrast', isActive);
        mostrarMensaje(isActive ? '🌗 Alto contraste activado' : '☀️ Modo normal activado');
    });
})();
// ============================================================
// 8. LÓGICA DEL FORMULARIO MULTIPASO (4 PASOS)
// ============================================================
(function() {
    const form = document.getElementById('solicitudForm');
    if (!form) return; 

    let currentStep = 1;
    const totalSteps = 4;
    
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    const step4 = document.getElementById('step4');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');
    const steps = document.querySelectorAll('.step');
    
    const tipoDocFallecido = document.getElementById('tipoDocFallecido');
    const tipoServicio = document.getElementById('tipoServicio');
    const rnfFields = document.getElementById('rnfFields');
    const trasladoFields = document.getElementById('trasladoFields');
    const ataudInfo = document.getElementById('ataudInfo');
    
    function updateConditionalFields() {
        if (tipoDocFallecido && tipoDocFallecido.value === 'RNF') {
            rnfFields.classList.add('visible');
        } else {
            rnfFields.classList.remove('visible');
        }
        
        if (tipoServicio && (tipoServicio.value === 'TRASLADO' || tipoServicio.value === 'ATAUD_TRASLADO')) {
            trasladoFields.classList.add('visible');
        } else {
            trasladoFields.classList.remove('visible');
        }
        
        if (tipoServicio && (tipoServicio.value === 'ATAUD' || tipoServicio.value === 'ATAUD_TRASLADO')) {
            ataudInfo.style.display = 'block';
        } else {
            ataudInfo.style.display = 'none';
        }
    }
    
    if (tipoDocFallecido) tipoDocFallecido.addEventListener('change', updateConditionalFields);
    if (tipoServicio) tipoServicio.addEventListener('change', updateConditionalFields);
    
    // Función para poblar el resumen (Paso 4)
    function populateSummary() {
        const getVal = (id) => {
            const el = document.getElementById(id);
            return el ? (el.value.trim() || '-') : '-';
        };

        // Mapeo de IDs a elementos del resumen
        document.getElementById('sum-nombre-fallecido').textContent = getVal('nombreFallecido');
        document.getElementById('sum-doc-fallecido').textContent = getVal('tipoDocFallecido') + ': ' + getVal('nroDocFallecido');
        document.getElementById('sum-fecha-fallecido').textContent = getVal('fechaFallecimiento');
        document.getElementById('sum-localidad-fallecido').textContent = getVal('localidadFallecido') + ', ' + getVal('deptoFallecido');
        
        const tipoServicioText = tipoServicio ? tipoServicio.options[tipoServicio.selectedIndex].text : '-';
        document.getElementById('sum-tipo-servicio').textContent = tipoServicioText;

        document.getElementById('sum-nombre-responsable').textContent = getVal('nombreResponsable');
        document.getElementById('sum-doc-responsable').textContent = getVal('tipoDocResponsable') + ': ' + getVal('nroDocResponsable');
        document.getElementById('sum-parentesco').textContent = getVal('parentesco');
        document.getElementById('sum-telefono-responsable').textContent = getVal('telefonoResponsable');
        document.getElementById('sum-email-responsable').textContent = getVal('emailResponsable');
    }

    function updateSteps() {
        if (step1) step1.style.display = currentStep === 1 ? 'block' : 'none';
        if (step2) step2.style.display = currentStep === 2 ? 'block' : 'none';
        if (step3) step3.style.display = currentStep === 3 ? 'block' : 'none';
        if (step4) step4.style.display = currentStep === 4 ? 'block' : 'none';
        
        if (prevBtn) prevBtn.style.display = currentStep > 1 ? 'inline-flex' : 'none';
        if (nextBtn) nextBtn.style.display = currentStep < totalSteps ? 'inline-flex' : 'none';
        if (submitBtn) submitBtn.style.display = currentStep === totalSteps ? 'inline-flex' : 'none';
        
        steps.forEach(function(step, index) {
            const stepNum = index + 1;
            step.classList.remove('active', 'completed');
            if (stepNum < currentStep) step.classList.add('completed');
            else if (stepNum === currentStep) step.classList.add('active');
        });

        // Si llegamos al paso 4, poblar resumen
        if (currentStep === 4) {
            populateSummary();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
    
    function validateStep(stepNumber) {
        const stepElement = document.getElementById('step' + stepNumber);
        if (!stepElement) return true;
        
        const requiredFields = stepElement.querySelectorAll('[required]');
        let valid = true;
        
        requiredFields.forEach(function(field) {
            // Ignorar el checkbox de privacidad en la validación de pasos 1-3
            if (field.type === 'checkbox' && stepNumber < 4) return;

            const value = field.value.trim();
            if (!value || (field.type === 'select-one' && value === '')) {
                field.classList.add('field-error');
                valid = false;
            } else {
                field.classList.remove('field-error');
            }
        });
        
        if (!valid) {
            alert('Por favor, complete todos los campos obligatorios (*) para continuar.');
        }
        return valid;
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            if (validateStep(currentStep)) {
                updateConditionalFields();
                if (currentStep < totalSteps) {
                    currentStep++;
                    updateSteps();
                }
            }
        });
    }
    
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            if (currentStep > 1) {
                currentStep--;
                updateSteps();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }
    
    document.addEventListener('DOMContentLoaded', function() {
        updateSteps();
        updateConditionalFields();
    });

    // ============================================================
    // 9. VALIDACIÓN EN TIEMPO REAL
    // ============================================================
    const realtimeFields = document.querySelectorAll('.realtime-validate');
    realtimeFields.forEach(function(field) {
        field.addEventListener('input', function() {
            if (this.checkValidity() && this.value.trim() !== '') {
                this.classList.add('is-valid');
                this.classList.remove('is-invalid');
            } else {
                this.classList.add('is-invalid');
                this.classList.remove('is-valid');
            }
        });
        field.addEventListener('change', function() {
            if (this.checkValidity() && this.value.trim() !== '') {
                this.classList.add('is-valid');
                this.classList.remove('is-invalid');
            } else {
                this.classList.add('is-invalid');
                this.classList.remove('is-valid');
            }
        });
    });

    // ============================================================
    // 10. MANEJO DE ARCHIVOS
    // ============================================================
    const fileInput = document.getElementById('archivosInput');
    const fileList = document.getElementById('fileList');
    const fileCount = document.getElementById('fileCount');
    const filePreview = document.getElementById('filePreview');
    let files = [];
    const MAX_FILES = 10;
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const newFiles = Array.from(e.target.files);
            
            if (files.length + newFiles.length > MAX_FILES) {
                alert('Solo puede adjuntar hasta 10 archivos en total.');
                this.value = '';
                return;
            }
            
            for (let file of newFiles) {
                if (file.size > MAX_FILE_SIZE) {
                    alert('El archivo "' + file.name + '" excede el límite de 5MB.');
                    this.value = '';
                    return;
                }
            }
            
            files = files.concat(newFiles);
            updateFileDisplay();
            this.value = ''; 
        });
    }
    
    function updateFileDisplay() {
        if (fileCount) fileCount.textContent = files.length + '/' + MAX_FILES;
        
        if (fileList) {
            if (files.length === 0) {
                fileList.innerHTML = '<span style="color: var(--color-muted); font-size: 0.85rem;">No hay archivos seleccionados aún</span>';
            } else {
                let html = '<ul style="list-style:none; padding:0; margin:0;">';
                files.forEach(function(file, index) {
                    const size = (file.size / 1024).toFixed(1);
                    html += '<li style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid var(--color-border); font-size:0.85rem;">';
                    html += '<span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:200px;"><i class="fas fa-file" style="color:var(--color-accent-2); margin-right:8px;"></i> ' + file.name + ' (' + size + ' KB)</span>';
                    html += '<button type="button" class="remove-file-btn" data-index="' + index + '" style="background:none; border:none; color:#e30613; cursor:pointer; padding:4px;" title="Eliminar"><i class="fas fa-times"></i></button>';
                    html += '</li>';
                });
                html += '</ul>';
                fileList.innerHTML = html;
                
                document.querySelectorAll('.remove-file-btn').forEach(function(btn) {
                    btn.addEventListener('click', function() {
                        const index = parseInt(this.getAttribute('data-index'));
                        files.splice(index, 1);
                        updateFileDisplay();
                    });
                });
            }
        }
        
        if (filePreview) {
            filePreview.innerHTML = '';
            files.forEach(function(file) {
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const div = document.createElement('div');
                        div.className = 'file-preview-item';
                        div.innerHTML = '<img src="' + e.target.result + '" alt="Vista previa">';
                        filePreview.appendChild(div);
                    };
                    reader.readAsDataURL(file);
                } else {
                    const div = document.createElement('div');
                    div.className = 'file-preview-item';
                    div.innerHTML = '<i class="fas fa-file-pdf" style="font-size:32px; color:var(--color-accent-2); margin-top:10px;"></i><br><span style="font-size:0.7rem; word-break:break-all;">' + file.name + '</span>';
                    filePreview.appendChild(div);
                }
            });
        }
    }

    // ============================================================
    // 11. ENVÍO DEL FORMULARIO CON FALLBACK LOCAL
    // ============================================================
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Validar checkbox de privacidad
        const aceptaPrivacidad = document.getElementById('aceptaPrivacidad');
        if (aceptaPrivacidad && !aceptaPrivacidad.checked) {
            alert('️ Debe aceptar la Política de Privacidad para enviar la solicitud.');
            return;
        }

        if (files.length === 0) {
            alert('⚠️ Por favor, adjunte al menos una foto o copia del certificado de defunción o DNI antes de enviar.');
            return;
        }
        
        const formData = new FormData(this);
        for (let i = 0; i < files.length; i++) {
            formData.append('archivos[]', files[i]);
        }
        
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
            submitBtn.disabled = true;
        }
        
        const apiUrl = '../sysfun/backend/api/solicitudes.php';
        
        fetch(apiUrl, { method: 'POST', body: formData })
        .then(function(response) {
            if (!response.ok) throw new Error('Error del servidor');
            return response.json();
        })
        .then(function(data) {
            if (data.success) {
                alert('✅ ¡Solicitud enviada con éxito!\n\n📋 Número de pedido: #' + (data.nro_pedido || 'Generado') + '\n\nUn asesor se comunicará con usted a la brevedad.');
                if (submitBtn) {
                    submitBtn.innerHTML = '<i class="fas fa-check"></i> ¡Enviado!';
                    submitBtn.style.background = '#10b981';
                    submitBtn.style.color = 'white';
                }
                setTimeout(function() { window.location.href = 'Inicio_funerarios.html'; }, 2500);
            } else {
                throw new Error(data.message || 'Error desconocido');
            }
        })
        .catch(function(error) {
            console.warn('⚠️ Error en el backend:', error.message);
            
            try {
                let solicitudes = JSON.parse(localStorage.getItem('solicitudesPendientes') || '[]');
                const datos = {};
                for (let [key, value] of formData.entries()) {
                    if (key !== 'archivos[]') datos[key] = value;
                }
                datos.archivos_nombres = files.map(f => f.name);
                
                const nroPedido = 'PEND-' + String(Date.now()).slice(-6);
                solicitudes.push({
                    id: Date.now(), nro_pedido: nroPedido,
                    fecha: new Date().toISOString(), estado: 'pendiente', datos: datos
                });
                localStorage.setItem('solicitudesPendientes', JSON.stringify(solicitudes));
                
                alert('⚠️ No pudimos conectar con el servidor en este momento.\n\n✅ Su solicitud ha sido GUARDADA de forma segura en este dispositivo.\n Número de referencia: #' + nroPedido + '\n\n💡 Por favor, llámenos al (385) 4892389 para confirmar su trámite mencionando este número.');
                
                if (submitBtn) {
                    submitBtn.innerHTML = '<i class="fas fa-save"></i> Guardado Local';
                    submitBtn.style.background = '#f59e0b';
                    submitBtn.style.color = 'white';
                }
                setTimeout(function() { window.location.href = 'Inicio_funerarios.html'; }, 4000);
            } catch (err) {
                alert('❌ Error al guardar la solicitud. Por favor, comuníquese directamente al (385) 4892389.');
                if (submitBtn) {
                    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Reintentar';
                    submitBtn.disabled = false;
                }
            }
        });
    });
})();

console.log('✅ Servicios Funerarios - Sistema cargado correctamente');