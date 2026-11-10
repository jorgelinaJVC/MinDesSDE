// frontend/js/nueva_solicitud.js

document.addEventListener('DOMContentLoaded', function() {
    // ============================================
    // 1. MENÚ HAMBURGUESA
    // ============================================
    const hamburger = document.getElementById('hamburgerBtn');
    const navLinks = document.getElementById('navLinks');
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', function() {
            navLinks.classList.toggle('open');
        });
    }

    // ============================================
    // 2. FECHAS POR DEFECTO (HOY)
    // ============================================
    const hoy = new Date().toISOString().split('T')[0];
    const fechaInput = document.getElementById('fecha_registro');
    const fechaFalle = document.getElementById('fallecido_fecha');
    
    if (fechaInput) fechaInput.value = hoy;
    if (fechaFalle) fechaFalle.value = hoy;

    // ============================================
    // 3. LÓGICA DE SELECCIÓN DE SERVICIO Y ATAÚD
    // ============================================
    const serviceRadios = document.querySelectorAll('input[name="tipo_servicio"]');
    const ataudSection = document.getElementById('ataudSection');
    const serviceCards = document.querySelectorAll('.service-card');
    let ataudesCargados = false;

    serviceRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            serviceCards.forEach(card => card.classList.remove('selected'));
            const parentCard = this.closest('.service-card');
            if (parentCard) parentCard.classList.add('selected');

            const serviciosConAtaud = ['ataud', 'ataud_soldadura', 'calle'];
            if (serviciosConAtaud.includes(this.value)) {
                ataudSection.style.display = 'block';
                if (!ataudesCargados) {
                    cargarAtaudes();
                    ataudesCargados = true;
                }
            } else {
                ataudSection.style.display = 'none';
            }
        });
    });

    serviceCards.forEach(card => {
        card.addEventListener('click', function() {
            const radio = this.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
                radio.dispatchEvent(new Event('change'));
            }
        });
    });

    // ============================================
    // 4. CARGAR ATAÚDES DESDE LA API
    // ============================================
    function cargarAtaudes() {
        const container = document.getElementById('ataudSelector');
        
        api.get('ataudes.php')
            .then(data => {
                container.innerHTML = '';
                data.forEach(ataud => {
                    const div = document.createElement('div');
                    div.className = 'ataud-option';
                    div.dataset.id = ataud.id_ataud;
                    const stockBajo = ataud.stock_actual < ataud.stock_minimo;
                    
                    div.innerHTML = `
                        <input type="radio" name="ataud_seleccionado" value="${ataud.id_ataud}" id="ataud_${ataud.id_ataud}">
                        <label for="ataud_${ataud.id_ataud}" style="cursor:pointer; display:block;">
                            <strong>${ataud.nombre}</strong>
                            <div class="ataud-stock ${stockBajo ? 'bajo' : ''}">
                                Stock: ${ataud.stock_actual} ${stockBajo ? '⚠️' : '✅'}
                            </div>
                        </label>
                    `;
                    
                    div.addEventListener('click', function() {
                        const radio = this.querySelector('input[type="radio"]');
                        if (radio) {
                            radio.checked = true;
                            document.querySelectorAll('.ataud-option').forEach(opt => opt.classList.remove('selected'));
                            this.classList.add('selected');
                        }
                    });
                    container.appendChild(div);
                });
            })
            .catch(error => {
                console.error('Error cargando ataúdes:', error);
                container.innerHTML = '<p style="color: red;">Error al cargar el catálogo de ataúdes</p>';
            });
    }

    // ============================================
    // 5. GENERAR NÚMERO DE PEDIDO VISUAL
    // ============================================
    function generarNroPedidoVisual() {
        const fecha = new Date();
        const year = fecha.getFullYear().toString().slice(-2);
        const month = String(fecha.getMonth() + 1).padStart(2, '0');
        const day = String(fecha.getDate()).padStart(2, '0');
        const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
        return `${year}${month}${day}-${random}`;
    }

    const nroDisplay = document.getElementById('nroPedidoDisplay');
    if (nroDisplay) nroDisplay.textContent = generarNroPedidoVisual();

    // ============================================
    // 6. ENVÍO DEL FORMULARIO
    // ============================================
    const form = document.getElementById('nuevaSolicitudForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();

            const formData = {
                fallecido: {
                    tipo_doc: document.getElementById('fallecido_tipo_doc').value,
                    nro_doc: document.getElementById('fallecido_doc').value,
                    nombre: document.getElementById('fallecido_nombre').value,
                    departamento: document.getElementById('fallecido_departamento').value,
                    localidad: document.getElementById('fallecido_localidad').value,
                    barrio: document.getElementById('fallecido_barrio').value,
                    domicilio: document.getElementById('fallecido_domicilio').value,
                    fecha_fallecimiento: document.getElementById('fallecido_fecha').value,
                    progenitor_doc: document.getElementById('progenitor_doc')?.value || '',
                    progenitor_nombre: document.getElementById('progenitor_nombre')?.value || '',
                    observaciones: document.getElementById('fallecido_observaciones').value
                },
                responsable: {
                    tipo_doc: document.getElementById('responsable_tipo_doc').value,
                    nro_doc: document.getElementById('responsable_doc').value,
                    nombre: document.getElementById('responsable_nombre').value,
                    provincia: document.getElementById('responsable_provincia').value,
                    localidad: document.getElementById('responsable_localidad').value,
                    barrio: document.getElementById('responsable_barrio').value,
                    domicilio: document.getElementById('responsable_domicilio').value,
                    fecha_registro: document.getElementById('fecha_registro').value,
                    telefono: document.getElementById('responsable_telefono').value,
                    email: document.getElementById('responsable_email').value
                },
                servicio: {
                    tipo: document.querySelector('input[name="tipo_servicio"]:checked')?.value || '',
                    ataud_id: document.querySelector('input[name="ataud_seleccionado"]:checked')?.value || null,
                    lugar_origen: document.getElementById('lugar_origen').value,
                    lugar_destino: document.getElementById('lugar_destino').value,
                    observaciones: document.getElementById('servicio_observaciones').value
                }
            };

            if (!formData.fallecido.tipo_doc || !formData.fallecido.nro_doc || !formData.fallecido.nombre) {
                alert('⚠️ Complete los datos obligatorios del fallecido');
                return;
            }
            if (!formData.responsable.tipo_doc || !formData.responsable.nro_doc || !formData.responsable.nombre) {
                alert('⚠️ Complete los datos obligatorios del responsable');
                return;
            }
            if (!formData.servicio.tipo) {
                alert('⚠️ Seleccione un tipo de servicio');
                return;
            }

            api.post('solicitudes.php', formData)
                .then(data => {
                    if (data.success) {
                        alert('✅ Solicitud creada exitosamente!');
                        window.location.href = 'solicitudes.html';
                    } else {
                        alert('❌ Error al crear la solicitud: ' + (data.message || 'Error desconocido'));
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('❌ Error de conexión con el servidor');
                });
        });
    }

    // ============================================
    // 7. ✅ VALIDACIONES EN TIEMPO REAL (UNIFICADAS)
    // ============================================
    
    // A. NOMBRES (Solo letras, espacios, acentos y guiones)
    const camposNombre = [
        'fallecido_nombre', 'fallecido_apellido', 
        'responsable_nombre', 'responsable_apellido',
        'progenitor_nombre'
    ];
    camposNombre.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', function() {
                this.value = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s\-]/g, '');
            });
        }
    });

    // B. UBICACIONES (Letras, números, espacios y puntos)
    const camposUbicacion = [
        'fallecido_departamento', 'fallecido_localidad', 'fallecido_barrio', 'fallecido_domicilio',
        'responsable_provincia', 'responsable_localidad', 'responsable_barrio', 'responsable_domicilio',
        'lugar_origen', 'lugar_destino'
    ];
    camposUbicacion.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', function() {
                this.value = this.value.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\.\-]/g, '');
            });
        }
    });

    // C. TELÉFONOS (Solo números, espacios, guiones y +)
    const campoTelefono = document.getElementById('responsable_telefono');
    if (campoTelefono) {
        campoTelefono.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9\s\-\+]/g, '');
        });
    }

    // D. DOCUMENTOS DEL FALLECIDO Y RESPONSABLE
    function validarDocumento(input, selectTipo) {
        if (!input || !selectTipo) return;
        input.addEventListener('input', function() {
            const tipo = selectTipo.value;
            if (tipo === 'DNI') {
                this.value = this.value.replace(/[^0-9]/g, '').slice(0, 8);
            } else if (tipo === 'PASAPORTE') {
                this.value = this.value.replace(/[^A-Za-z0-9\-]/g, '').slice(0, 20);
            } else if (tipo === 'RNF' || tipo === 'S/D') {
                this.value = this.value.replace(/[^A-Za-z0-9\-\/]/g, '').slice(0, 20);
            }
        });
    }
    validarDocumento(document.getElementById('fallecido_doc'), document.getElementById('fallecido_tipo_doc'));
    validarDocumento(document.getElementById('responsable_doc'), document.getElementById('responsable_tipo_doc'));

    // E. ✅ DOCUMENTO DEL PROGENITOR (Solo números, máx 8 dígitos)
    const progenitorDoc = document.getElementById('progenitor_doc');
    if (progenitorDoc) {
        progenitorDoc.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '').slice(0, 8);
        });
    }

    // F. ✅ EDAD (Si existe el campo, solo números hasta 120)
    const edadFallecido = document.getElementById('edad_fallecido') || document.getElementById('fallecido_edad');
    if (edadFallecido) {
        edadFallecido.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '').slice(0, 3);
            if (parseInt(this.value) > 120) {
                this.value = '120';
            }
        });
    }

    // G. EMAIL (Validación al perder el foco)
    const campoEmail = document.getElementById('responsable_email');
    if (campoEmail) {
        campoEmail.addEventListener('blur', function() {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (this.value && !emailRegex.test(this.value)) {
                this.style.borderColor = '#e74c3c'; // Rojo si es inválido
            } else {
                this.style.borderColor = ''; // Normal si es válido
            }
        });
        // Quitar el rojo en cuanto empiece a corregir
        campoEmail.addEventListener('input', function() {
            if (this.style.borderColor === 'rgb(231, 76, 60)') {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (emailRegex.test(this.value)) this.style.borderColor = '';
            }
        });
    }
});