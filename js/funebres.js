/* ============================================================
   funebres.js — Servicios Fúnebres (Versión 10.1 - Corregida)
   Incluye: Menú, Scroll, Zoom, Contraste, Formulario 4 pasos, 
   Validaciones de seguridad (Honeypot, Archivos), FAQ y Fallback local.
   ============================================================ */

'use strict';

// ============================================================
// UTILIDAD: Mostrar mensaje flotante (Toast)
// ============================================================
function mostrarMensajeAccesibilidad(texto) {
    let msg = document.getElementById('msgAccesibilidad');
    if (!msg) {
        msg = document.createElement('div');
        msg.id = 'msgAccesibilidad';
        msg.style.cssText = 'position:fixed; bottom:160px; right:24px; background:#1a3a6b; color:white; padding:12px 20px; border-radius:30px; font-size:14px; z-index:100000; font-family:sans-serif; box-shadow:0 4px 12px rgba(0,0,0,0.3); transition: opacity 0.3s ease; pointer-events: none; opacity: 0;';
        document.body.appendChild(msg);
    }
    msg.textContent = texto;
    msg.style.opacity = '1';
    clearTimeout(msg._timeout);
    msg._timeout = setTimeout(function() {
        msg.style.opacity = '0';
    }, 2500);
}

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
                
                faqButtons.forEach(function(btn) {
                    btn.setAttribute('aria-expanded', 'false');
                    btn.nextElementSibling.classList.remove('active');
                });

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
// 7. ACCESIBILIDAD: ZOOM Y CONTRASTE
// ============================================================
(function() {
    const btnZoom = document.getElementById('btnZoomToggle');
    const btnContraste = document.getElementById('btnContraste');
    
    if (btnContraste) {
        if (localStorage.getItem('altoContraste') === 'true') {
            document.body.classList.add('alto-contraste');
            btnContraste.classList.add('activo');
        }
        
        btnContraste.addEventListener('click', function(e) {
            e.preventDefault();
            document.body.classList.toggle('alto-contraste');
            this.classList.toggle('activo');
            
            const isActive = document.body.classList.contains('alto-contraste');
            localStorage.setItem('altoContraste', isActive);
            mostrarMensajeAccesibilidad(isActive ? '🌗 Alto contraste activado' : '☀️ Modo normal activado');
        });
    }

    if (btnZoom) {
        const niveles = ['zoom-normal', 'zoom-grande', 'zoom-muy-grande'];
        const mensajes = ['📏 Texto normal (100%)', '🔍 Texto grande (120%)', '🔍🔍 Texto muy grande (140%)'];
        
        let nivelActual = parseInt(localStorage.getItem('nivelZoom') || '0');
        if (nivelActual > 0) {
            document.body.classList.add(niveles[nivelActual]);
        } else {
            document.body.classList.add('zoom-normal');
        }

        btnZoom.addEventListener('click', function(e) {
            e.preventDefault();
            document.body.classList.remove(niveles[nivelActual]);
            nivelActual = (nivelActual + 1) % niveles.length;
            document.body.classList.add(niveles[nivelActual]);
            localStorage.setItem('nivelZoom', nivelActual);
            mostrarMensajeAccesibilidad(mensajes[nivelActual]);
        });
    }
})();

// ============================================================
// 8. LÓGICA DEL FORMULARIO MULTIPASO CON VALIDACIONES
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
            if(rnfFields) rnfFields.classList.add('visible');
        } else {
            if(rnfFields) rnfFields.classList.remove('visible');
        }
        
        if (tipoServicio && (tipoServicio.value === 'TRASLADO' || tipoServicio.value === 'ATAUD_Y_TRASLADO')) {
            if(trasladoFields) trasladoFields.classList.add('visible');
        } else {
            if(trasladoFields) trasladoFields.classList.remove('visible');
        }
        
        if (ataudInfo) {
            if (tipoServicio && (tipoServicio.value === 'ATAUD' || tipoServicio.value === 'ATAUD_Y_TRASLADO')) {
                ataudInfo.style.display = 'block';
            } else {
                ataudInfo.style.display = 'none';
            }
        }
    }
    
    if (tipoDocFallecido) tipoDocFallecido.addEventListener('change', updateConditionalFields);
    if (tipoServicio) tipoServicio.addEventListener('change', updateConditionalFields);

    // ============================================================
    // VALIDACIÓN DE DNI: Solo números para DNI, alfanumérico para otros
    // ============================================================
    function configurarValidacionDocumento(selectTipoDoc, inputNroDoc) {
        if (!selectTipoDoc || !inputNroDoc) return;

        selectTipoDoc.addEventListener('change', function() {
            const tipo = this.value;
            
            if (tipo === 'DNI') {
                inputNroDoc.setAttribute('pattern', '[0-9]{1,8}');
                inputNroDoc.setAttribute('title', 'El DNI debe contener solo números (máximo 8 dígitos)');
                inputNroDoc.setAttribute('maxlength', '8');
                inputNroDoc.setAttribute('inputmode', 'numeric');
                inputNroDoc.placeholder = 'Ej: 20123456';
            } else if (tipo === 'PASAPORTE') {
                inputNroDoc.setAttribute('pattern', '[A-Za-z0-9]{1,20}');
                inputNroDoc.setAttribute('title', 'El pasaporte puede contener letras y números');
                inputNroDoc.setAttribute('maxlength', '20');
                inputNroDoc.setAttribute('inputmode', 'text');
                inputNroDoc.placeholder = 'Ej: AA1234567';
            } else if (tipo === 'RNF') {
                inputNroDoc.setAttribute('pattern', '[A-Za-z0-9\\-]{1,20}');
                inputNroDoc.setAttribute('title', 'RNF puede contener letras, números y guiones');
                inputNroDoc.setAttribute('maxlength', '20');
                inputNroDoc.setAttribute('inputmode', 'text');
                inputNroDoc.placeholder = 'Número de RNF';
            } else {
                inputNroDoc.removeAttribute('pattern');
                inputNroDoc.removeAttribute('maxlength');
                inputNroDoc.placeholder = 'Número de documento';
            }
        });

        // Validación en tiempo real
        inputNroDoc.addEventListener('input', function() {
            const tipo = selectTipoDoc.value;
            if (tipo === 'DNI') {
                this.value = this.value.replace(/[^0-9]/g, '');
            } else if (tipo === 'PASAPORTE' || tipo === 'RNF') {
                this.value = this.value.replace(/[^A-Za-z0-9\-]/g, '');
            }
        });
    }

    configurarValidacionDocumento(
        document.getElementById('tipoDocFallecido'),
        document.getElementById('nroDocFallecido')
    );

    configurarValidacionDocumento(
        document.getElementById('tipoDocResponsable'),
        document.getElementById('nroDocResponsable')
    );
    
    function populateSummary() {
        const getVal = (id) => {
            const el = document.getElementById(id);
            return el ? (el.value.trim() || '-') : '-';
        };

        const sumNombreF = document.getElementById('sum-nombre-fallecido');
        if(sumNombreF) sumNombreF.textContent = getVal('nombreFallecido') + ' ' + getVal('apellidoFallecido');
        
        const sumDocF = document.getElementById('sum-doc-fallecido');
        if(sumDocF) sumDocF.textContent = getVal('tipoDocFallecido') + ': ' + getVal('nroDocFallecido');
        
        const sumFechaF = document.getElementById('sum-fecha-fallecido');
        if(sumFechaF) sumFechaF.textContent = getVal('fechaFallecimiento');
        
        const sumLocF = document.getElementById('sum-localidad-fallecido');
        if(sumLocF) sumLocF.textContent = getVal('localidadFallecido') + ', ' + getVal('deptoFallecido');
        
        const sumTipoServ = document.getElementById('sum-tipo-servicio');
        if(sumTipoServ && tipoServicio) sumTipoServ.textContent = tipoServicio.options[tipoServicio.selectedIndex].text;

        const sumNombreR = document.getElementById('sum-nombre-responsable');
        if(sumNombreR) sumNombreR.textContent = getVal('nombreResponsable') + ' ' + getVal('apellidoResponsable');
        
        const sumDocR = document.getElementById('sum-doc-responsable');
        if(sumDocR) sumDocR.textContent = getVal('tipoDocResponsable') + ': ' + getVal('nroDocResponsable');
        
        const sumParent = document.getElementById('sum-parentesco');
        if(sumParent) sumParent.textContent = getVal('parentesco');
        
        const sumTelR = document.getElementById('sum-telefono-responsable');
        if(sumTelR) sumTelR.textContent = getVal('telefonoResponsable');
        
        const sumEmailR = document.getElementById('sum-email-responsable');
        if(sumEmailR) sumEmailR.textContent = getVal('emailResponsable');
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
            if (field.offsetParent === null) return;
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
            alert('⚠️ Por favor, complete todos los campos obligatorios (*) marcados en rojo para continuar.');
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
    
    updateSteps();
    updateConditionalFields();

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
    });

    // ============================================================
    // 10. MANEJO DE ARCHIVOS
    // ============================================================
    const fileInput = document.getElementById('archivosInput');
    const fileList = document.getElementById('fileList');
    const fileCount = document.getElementById('fileCount');
    let files = [];
    const MAX_FILES = 10;
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const newFiles = Array.from(e.target.files);
            
            if (files.length + newFiles.length > MAX_FILES) {
                alert('⚠️ Solo puede adjuntar hasta 10 archivos en total.');
                this.value = '';
                return;
            }
            
            for (let file of newFiles) {
                if (file.size > MAX_FILE_SIZE) {
                    alert('⚠️ El archivo "' + file.name + '" excede el límite de 5MB.');
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
                fileList.innerHTML = '<span style="color: #666; font-size: 0.85rem;">No hay archivos seleccionados aún</span>';
            } else {
                let html = '<ul style="list-style:none; padding:0; margin:0;">';
                files.forEach(function(file, index) {
                    const size = (file.size / 1024).toFixed(1);
                    html += '<li style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid #eee; font-size:0.85rem;">';
                    html += '<span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:200px;"><i class="fas fa-file" style="color:#c9a962; margin-right:8px;"></i> ' + file.name + ' (' + size + ' KB)</span>';
                    html += '<button type="button" class="remove-file-btn" data-index="' + index + '" style="background:none; border:none; color:#e30613; cursor:pointer; padding: 4px;" title="Eliminar"><i class="fas fa-times"></i></button>';
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
    }

    // ============================================================
    // 11. ENVÍO DEL FORMULARIO CON VALIDACIONES DE SEGURIDAD
    // ============================================================
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const honeypot = document.getElementById('website');
        if (honeypot && honeypot.value.trim() !== '') {
            console.warn('🤖 Actividad de bot detectada. Solicitud bloqueada silenciosamente.');
            return; 
        }

        if (files.length === 0) {
            alert('⚠️ Por favor, adjunte al menos un documento (Certificado de defunción o DNI).');
            return;
        }

        const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        for (let file of files) {
            if (!allowedMimes.includes(file.type)) {
                alert(`⚠️ El archivo "${file.name}" tiene un formato no permitido. Solo PDF, JPG o PNG.`);
                return;
            }
            if (file.size > MAX_FILE_SIZE) {
                alert(`⚠️ El archivo "${file.name}" excede el límite de 5MB.`);
                return;
            }
        }
        
        const aceptaPrivacidad = document.getElementById('aceptaPrivacidad');
        if (aceptaPrivacidad && !aceptaPrivacidad.checked) {
            alert('⚠️ Debe aceptar la Política de Privacidad para enviar la solicitud.');
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
                
                alert('⚠️ No pudimos conectar con el servidor en este momento.\n\n✅ Su solicitud ha sido GUARDADA de forma segura en este dispositivo.\n📋 Número de referencia: #' + nroPedido + '\n\n💡 Por favor, llámenos al (385) 4892389 para confirmar su trámite mencionando este número.');
                
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

    // ============================================================
    // 12. CARGA DINÁMICA DE FUENTES DE SOLICITUD (Paso 0)
    // ============================================================
    (function() {
        const selectFuente = document.getElementById('fuenteSolicitudId');
        if (!selectFuente) return;

        async function cargarFuentesEnFormulario() {
            try {
                const response = await fetch('../sysfun/backend/api/fuentes_solicitud.php?activas=1');
                const fuentes = await response.json();
                
                selectFuente.innerHTML = '<option value="">Seleccionar...</option>';
                fuentes.forEach(f => {
                    selectFuente.innerHTML += `<option value="${f.id_fuente}">${f.nombre} (${f.tipo.replace('_', ' ')})</option>`;
                });
            } catch (error) {
                console.error('Error cargando fuentes:', error);
                selectFuente.innerHTML = '<option value="">Error al cargar instituciones</option>';
            }
        }

        window.mostrarCamposSegunFuente = function() {
            const opcionTexto = selectFuente.options[selectFuente.selectedIndex].text;
            const camposInst = document.getElementById('camposInstitucion');
            const nombreFunc = document.getElementById('nombreFuncionario');
            
            if (selectFuente.value && !opcionTexto.includes('FAMILIAR')) {
                camposInst.style.display = 'block';
                if(nombreFunc) nombreFunc.required = true;
            } else {
                camposInst.style.display = 'none';
                if(nombreFunc) nombreFunc.required = false;
            }
        };

        cargarFuentesEnFormulario();
        selectFuente.addEventListener('change', window.mostrarCamposSegunFuente);
    })();
})();

// ============================================
// VALIDACIONES EN TIEMPO REAL POR TIPO DE CAMPO (GLOBAL)
// ============================================
function aplicarReglasValidacion() {
    
    // 1. NOMBRES Y APELLIDOS (Solo letras, espacios, acentos y guiones)
    const camposNombre = document.querySelectorAll(
        '#nombreFallecido, #apellidoFallecido, #nombreResponsable, #apellidoResponsable, ' +
        '#progenitor_nombre, #nombreFuncionario, #cfg_beneficios_1_titulo, #razon_social, #nombre_comercial, #contacto_nombre'
    );
    camposNombre.forEach(input => {
        input.addEventListener('input', function() {
            this.value = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s\-]/g, '');
        });
    });

    // 2. LOCALIDADES, BARRIOS Y DIRECCIONES
    const camposUbicacion = document.querySelectorAll(
        '#fallecido_departamento, #fallecido_localidad, #fallecido_barrio, #fallecido_domicilio, ' +
        '#responsable_provincia, #responsable_localidad, #responsable_barrio, #responsable_domicilio, ' +
        '#lugar_origen, #lugar_destino, #direccion, #fuenteDireccion'
    );
    camposUbicacion.forEach(input => {
        input.addEventListener('input', function() {
            this.value = this.value.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\.\-]/g, '');
        });
    });

    // 3. TELÉFONOS (Solo números, espacios, guiones y el signo +)
    const camposTelefono = document.querySelectorAll(
        '#responsable_telefono, #telefonoSecundario, #contacto_telefono, #fuenteTelefono, #telefono'
    );
    camposTelefono.forEach(input => {
        input.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9\s\-\+]/g, '');
        });
    });

    // 4. NÚMEROS DE DOCUMENTO (Fallecido y Responsable)
    const camposDocumento = document.querySelectorAll('#nroDocFallecido, #nroDocResponsable');
    camposDocumento.forEach(input => {
        input.addEventListener('input', function() {
            const selectId = input.id === 'nroDocFallecido' ? 'tipoDocFallecido' : 'tipoDocResponsable';
            const tipoDocSelect = document.getElementById(selectId);
            const tipoDoc = tipoDocSelect ? tipoDocSelect.value : 'DNI';

            if (tipoDoc === 'DNI') {
                this.value = this.value.replace(/[^0-9]/g, '').slice(0, 8);
            } else if (tipoDoc === 'PASAPORTE') {
                this.value = this.value.replace(/[^A-Za-z0-9\-]/g, '').slice(0, 20);
            } else if (tipoDoc === 'RNF' || tipoDoc === 'S/D') {
                this.value = this.value.replace(/[^A-Za-z0-9\-\/]/g, '').slice(0, 20);
            }
        });
    });

    // 5. DOCUMENTO DEL PROGENITOR (Siempre DNI en el formulario público)
    const nroDocProgenitor = document.getElementById('nroDocProgenitor');
    if (nroDocProgenitor) {
        nroDocProgenitor.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '').slice(0, 8);
        });
    }

    // 6. CORREOS ELECTRÓNICOS (Validación al salir del campo)
    const camposEmail = document.querySelectorAll(
        '#responsable_email, #cfg_contacto_email, #emailNotificaciones, #email'
    );
    camposEmail.forEach(input => {
        input.addEventListener('blur', function() {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (this.value && !emailRegex.test(this.value)) {
                this.setCustomValidity('Por favor, ingrese un correo electrónico válido.');
                this.style.borderColor = '#e74c3c';
            } else {
                this.setCustomValidity('');
                this.style.borderColor = '';
            }
        });
        input.addEventListener('input', function() {
            if (this.style.borderColor === 'rgb(231, 76, 60)') {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (emailRegex.test(this.value)) {
                    this.setCustomValidity('');
                    this.style.borderColor = '';
                }
            }
        });
    });

    // 7. CAMPOS NUMÉRICOS PUROS (Edad, Stock, Orden, Capacidad, etc.)
    // ✅ CORREGIDO: Se agregó #edadFallecido para evitar que tome la letra "e"
    const camposNumericos = document.querySelectorAll(
        '#edadFallecido, #año, #stock_actual, #stock_minimo, #fuenteOrden, #capacidad_ataudes, #capacidad_acompañantes'
    );
    camposNumericos.forEach(input => {
        input.addEventListener('input', function() {
            // Elimina cualquier carácter que no sea un número (incluye la 'e' de notación científica)
            this.value = this.value.replace(/[^0-9]/g, '');
        });
    });
}

// Ejecutar la validación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', aplicarReglasValidacion);
console.log('✅ Servicios Funerarios - Sistema v10.1 (Validaciones corregidas) cargado correctamente');