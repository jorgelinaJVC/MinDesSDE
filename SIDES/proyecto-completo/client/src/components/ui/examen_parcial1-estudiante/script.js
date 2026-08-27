/* ============================================================================
   SCRIPT.JS - CLÍNICA SALUD
   Sistema de Gestión de Turnos Médicos
   Examen Parcial I - Programación III
   ============================================================================ */

/* ============================================================================
   FUNCIONALIDAD DE FILTRADO DE MÉDICOS
   ============================================================================ */

document.addEventListener('DOMContentLoaded', function() {
    // Obtener referencias a elementos del DOM
    const botonesFiltroPrincipal = document.querySelectorAll('.boton-filtro');
    const tarjetasMedicos = document.querySelectorAll('.tarjeta-medico');
    const botonMenuMovil = document.querySelector('.boton-menu-movil');
    const menuEnlaces = document.querySelector('.menu-enlaces');
    const buscadorEntrada = document.querySelector('.buscador-entrada');
    const botonBuscar = document.querySelector('.boton-buscar');
    const botonesReservar = document.querySelectorAll('.boton-reservar');

    /* ========================================================================
       FILTRADO DE ESPECIALIDADES
       ======================================================================== */
    
    botonesFiltroPrincipal.forEach(boton => {
        boton.addEventListener('click', function() {
            const especialidadSeleccionada = this.getAttribute('data-especialidad');
            
            // Actualizar estado del botón activo
            botonesFiltroPrincipal.forEach(btn => {
                btn.classList.remove('activo');
            });
            this.classList.add('activo');
            
            // Filtrar tarjetas de médicos
            tarjetasMedicos.forEach(tarjeta => {
                const especialidadTarjeta = tarjeta.getAttribute('data-especialidad');
                
                if (especialidadSeleccionada === 'todos' || especialidadTarjeta === especialidadSeleccionada) {
                    tarjeta.style.display = 'flex';
                    // Agregar animación de entrada
                    tarjeta.style.animation = 'none';
                    setTimeout(() => {
                        tarjeta.style.animation = 'deslizar-arriba 0.6s ease-out';
                    }, 10);
                } else {
                    tarjeta.style.display = 'none';
                }
            });
        });
    });

    /* ========================================================================
       MENÚ RESPONSIVO MÓVIL
       ======================================================================== */
    
    if (botonMenuMovil) {
        botonMenuMovil.addEventListener('click', function() {
            menuEnlaces.classList.toggle('activo');
            
            // Cambiar icono del menú
            if (menuEnlaces.classList.contains('activo')) {
                this.textContent = '✕';
            } else {
                this.textContent = '☰';
            }
        });
    }

    // Cerrar menú al hacer clic en un enlace
    const enlacesMenu = document.querySelectorAll('.enlace-menu');
    enlacesMenu.forEach(enlace => {
        enlace.addEventListener('click', function() {
            if (menuEnlaces) {
                menuEnlaces.classList.remove('activo');
                if (botonMenuMovil) {
                    botonMenuMovil.textContent = '☰';
                }
            }
        });
    });

    /* ========================================================================
       FUNCIONALIDAD DE BÚSQUEDA
       ======================================================================== */
    
    function realizarBusqueda() {
        const terminoBusqueda = buscadorEntrada.value.toLowerCase().trim();
        
        if (terminoBusqueda === '') {
            // Si el buscador está vacío, mostrar todos los médicos
            tarjetasMedicos.forEach(tarjeta => {
                tarjeta.style.display = 'flex';
            });
            // Resetear filtro a "Todos"
            botonesFiltroPrincipal.forEach(btn => btn.classList.remove('activo'));
            botonesFiltroPrincipal[0].classList.add('activo');
        } else {
            // Buscar en nombre y especialidad del médico
            tarjetasMedicos.forEach(tarjeta => {
                const nombreMedico = tarjeta.querySelector('.nombre-medico').textContent.toLowerCase();
                const especialidadMedico = tarjeta.querySelector('.especialidad-medico').textContent.toLowerCase();
                
                if (nombreMedico.includes(terminoBusqueda) || especialidadMedico.includes(terminoBusqueda)) {
                    tarjeta.style.display = 'flex';
                } else {
                    tarjeta.style.display = 'none';
                }
            });
        }
    }

    // Evento de búsqueda al hacer clic en el botón
    botonBuscar.addEventListener('click', realizarBusqueda);

    // Evento de búsqueda al presionar Enter
    buscadorEntrada.addEventListener('keypress', function(evento) {
        if (evento.key === 'Enter') {
            realizarBusqueda();
        }
    });

    // Búsqueda en tiempo real (opcional - se ejecuta mientras escribes)
    buscadorEntrada.addEventListener('input', function() {
        // Comentado para que solo busque al hacer clic o presionar Enter
        // realizarBusqueda();
    });

    /* ========================================================================
       FUNCIONALIDAD DE RESERVA DE TURNO
       ======================================================================== */
    
    botonesReservar.forEach(boton => {
        boton.addEventListener('click', function(evento) {
            evento.preventDefault();
            
            // Obtener información del médico
            const tarjetaMedico = this.closest('.tarjeta-medico');
            const nombreMedico = tarjetaMedico.querySelector('.nombre-medico').textContent;
            const especialidadMedico = tarjetaMedico.querySelector('.especialidad-medico').textContent;
            
            // Mostrar alerta de confirmación
            alert(`¡Turno reservado!\n\nMédico: ${nombreMedico}\nEspecialidad: ${especialidadMedico}\n\nEn breve recibirá un correo de confirmación.`);
            
            // Aquí se podría agregar código para enviar la información a un servidor
            console.log(`Turno reservado para: ${nombreMedico} (${especialidadMedico})`);
        });
    });

    /* ========================================================================
       FUNCIONALIDAD DEL BOTÓN PRINCIPAL
       ======================================================================== */
    
    const botonPrincipal = document.querySelector('.boton-principal');
    if (botonPrincipal) {
        botonPrincipal.addEventListener('click', function() {
            // Desplazarse a la sección de profesionales
            const seccionProfesionales = document.getElementById('profesionales');
            if (seccionProfesionales) {
                seccionProfesionales.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    /* ========================================================================
       EFECTOS DE SCROLL (OPCIONAL)
       ======================================================================== */
    
    // Agregar efecto de sombra al encabezado al hacer scroll
    const encabezado = document.querySelector('.encabezado');
    window.addEventListener('scroll', function() {
        if (window.scrollY > 10) {
            encabezado.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.12)';
        } else {
            encabezado.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
        }
    });

    /* ========================================================================
       VALIDACIÓN DE FORMULARIO DE BÚSQUEDA
       ======================================================================== */
    
    buscadorEntrada.addEventListener('focus', function() {
        this.style.borderColor = '#0066cc';
    });

    buscadorEntrada.addEventListener('blur', function() {
        this.style.borderColor = '#e0e0e0';
    });

    /* ========================================================================
       INICIALIZACIÓN
       ======================================================================== */
    
    console.log('✓ Script de Clínica Salud cargado correctamente');
    console.log('✓ Funcionalidades disponibles: Filtrado, Búsqueda, Reserva de Turnos');
});

/* ============================================================================
   FUNCIÓN AUXILIAR: VALIDAR EMAIL
   ============================================================================ */

function validarEmail(email) {
    const expresionRegular = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return expresionRegular.test(email);
}

/* ============================================================================
   FUNCIÓN AUXILIAR: FORMATEAR TELÉFONO
   ============================================================================ */

function formatearTelefono(telefono) {
    // Remover caracteres no numéricos
    const soloNumeros = telefono.replace(/\D/g, '');
    
    // Formatear según el patrón
    if (soloNumeros.length === 10) {
        return `(${soloNumeros.substring(0, 3)}) ${soloNumeros.substring(3, 6)}-${soloNumeros.substring(6)}`;
    }
    
    return telefono;
}

/* ============================================================================
   FUNCIÓN AUXILIAR: OBTENER HORA ACTUAL
   ============================================================================ */

function obtenerHoraActual() {
    const ahora = new Date();
    const horas = String(ahora.getHours()).padStart(2, '0');
    const minutos = String(ahora.getMinutes()).padStart(2, '0');
    return `${horas}:${minutos}`;
}

/* ============================================================================
   FUNCIÓN AUXILIAR: OBTENER FECHA ACTUAL
   ============================================================================ */

function obtenerFechaActual() {
    const ahora = new Date();
    const opciones = { year: 'numeric', month: 'long', day: 'numeric', locale: 'es-ES' };
    return ahora.toLocaleDateString('es-ES', opciones);
}
