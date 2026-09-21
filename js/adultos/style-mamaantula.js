document.addEventListener('DOMContentLoaded', () => {

    /* ============================================================
       1. Accesibilidad (Aumento de fuente y Alto Contraste)
       ============================================================ */
    const body = document.getElementById('page-body');
    const btnInc = document.getElementById('btn-increase-font');
    const btnDec = document.getElementById('btn-decrease-font');
    const btnContrast = document.getElementById('btn-contrast');

    let currentFontSize = 16; // Pixels base

    if (btnInc && btnDec && btnContrast) {
        btnInc.addEventListener('click', () => {
            if (currentFontSize < 21) {
                currentFontSize += 1.5;
                body.style.fontSize = `${currentFontSize}px`;
            }
        });

        btnDec.addEventListener('click', () => {
            if (currentFontSize > 13) {
                currentFontSize -= 1.5;
                body.style.fontSize = `${currentFontSize}px`;
            }
        });

        btnContrast.addEventListener('click', () => {
            body.classList.toggle('high-contrast');
        });
    }

    /* ============================================================
       2. Enlace suave para navegación
       ============================================================ */
    const smoothLinks = document.querySelectorAll('a[href^="#"]');
    smoothLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId && targetId !== '#') {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    e.preventDefault();
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });

    /* ============================================================
       3. Envío Autónomo del Formulario Directo
       ============================================================ */
    const directForm = document.getElementById('directContactForm');
    const formAlert = document.getElementById('form-alert');
    const submitBtn = document.getElementById('btn-submit-form');

    if (directForm) {
        directForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Valores de campos obligatorios
            const nombre = document.getElementById('form-nombre').value.trim();
            const telefono = document.getElementById('form-telefono').value.trim();
            const asunto = document.getElementById('form-asunto').value;
            const mensaje = document.getElementById('form-mensaje').value.trim();

            if (!nombre || !telefono || !asunto || !mensaje) {
                mostrarAlerta('Por favor, complete todos los campos obligatorios marcados con (*).', 'error');
                return;
            }

            // Deshabilitar botón durante el proceso
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Registrando consulta...';

            // Simulación de envío a la base de datos o correo interno de la Residencia
            setTimeout(() => {
                mostrarAlerta(`✓ Estimado/a ${nombre}, su consulta sobre "${obtenerTextoAsunto(asunto)}" ha sido radicada con éxito en la Secretaría de Mama Antula. Se comunicarán a la brevedad al ${telefono}.`, 'success');
                directForm.reset();
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enviar Mensaje a Secretaría de Mama Antula';
            }, 1400);
        });
    }

    function mostrarAlerta(mensaje, tipo) {
        formAlert.style.display = 'block';
        formAlert.className = `alert-box ${tipo === 'success' ? 'alert-success' : 'alert-error'}`;
        formAlert.textContent = mensaje;
    }

    function obtenerTextoAsunto(val) {
        const opciones = {
            'admision': 'Admisión y vacantes',
            'visita': 'Coordinación de visita',
            'seguimiento': 'Seguimiento de residente',
            'voluntariado': 'Talleres y voluntariado',
            'otro': 'Consulta general'
        };
        return opciones[val] || 'Consulta';
    }
});

