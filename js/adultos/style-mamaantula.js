document.addEventListener('DOMContentLoaded', () => {
    console.log("Script cargado correctamente."); // Verificá esto en F12 > Console

    const directForm = document.getElementById('directContactForm');
    const formAlert = document.getElementById('form-alert');
    const submitBtn = document.getElementById('btn-submit-form');

    if (!directForm) {
        console.error("No se encontró el formulario con id 'directContactForm'");
        return;
    }

    if (!formAlert) {
        console.error("No se encontró el contenedor de alertas con id 'form-alert'");
        return;
    }

    directForm.addEventListener('submit', (e) => {
        e.preventDefault();
        console.log("Evento submit interceptado con éxito.");

        // Capturamos los valores
        const nombre = document.getElementById('form-nombre') ? document.getElementById('form-nombre').value.trim() : '';
        const apellido = document.getElementById('form-apellido') ? document.getElementById('form-apellido').value.trim() : '';
        const telefono = document.getElementById('form-telefono') ? document.getElementById('form-telefono').value.trim() : '';
        const asunto = document.getElementById('form-asunto') ? document.getElementById('form-asunto').value : '';
        const mensaje = document.getElementById('form-mensaje') ? document.getElementById('form-mensaje').value.trim() : '';

        // Validación de campos obligatorios
        if (!nombre || !apellido || !telefono || !asunto || !mensaje) {
            formAlert.style.display = 'block';
            formAlert.className = 'alert-box error';
            formAlert.textContent = 'Por favor, complete todos los campos obligatorios marcados con (*).';
            formAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return;
        }

        // Si pasa la validación
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Registrando consulta...';
        }

        setTimeout(() => {
            formAlert.style.display = 'block';
            formAlert.className = 'alert-box success';
            formAlert.textContent = `¡Mensaje enviado con éxito! Estimado/a ${nombre} ${apellido}, su consulta ha sido radicada con éxito. Nos comunicaremos al ${telefono}.`;
            formAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            
            directForm.reset();

            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enviar Mensaje a Secretaría de Mama Antula';
            }
        }, 1000);
    });
});

document.addEventListener('DOMContentLoaded', () => {
    /* ============================================================
       PANEL FLOTANTE DE ACCESIBILIDAD - LÓGICA DE FUNCIONAMIENTO
       ============================================================ */
    const toggleBtn = document.getElementById('accessibility-toggle');
    const panel = document.getElementById('accessibility-panel');
    const btnInc = document.getElementById('btn-inc-font');
    const btnDec = document.getElementById('btn-desc-font');
    const fontSizeIndicator = document.getElementById('font-size-indicator');
    const btnContrast = document.getElementById('btn-toggle-contrast');
    const btnLinks = document.getElementById('btn-toggle-links');
    const btnReset = document.getElementById('btn-reset-accessibility');
    const body = document.getElementById('page-body');

    let currentScaleIndex = 0; // 0 = 100%, 1 = 112%, 2 = 125%, 3 = 140%, 4 = 155%
    const scaleClasses = ['', 'text-size-1', 'text-size-2', 'text-size-3', 'text-size-4'];
    const scalePercentages = ['100%', '112%', '125%', '140%', '155%'];

    if (toggleBtn && panel) {
        // Abrir / Cerrar panel al hacer clic en el botón del ojo
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            panel.classList.toggle('active');
        });

        // Ocultar el panel si se hace clic fuera de él
        document.addEventListener('click', (e) => {
            if (!panel.contains(e.target) && !toggleBtn.contains(e.target)) {
                panel.classList.remove('active');
            }
        });

        // Aumentar fuente (+)
        if (btnInc && fontSizeIndicator) {
            btnInc.addEventListener('click', () => {
                if (currentScaleIndex < scaleClasses.length - 1) {
                    if (scaleClasses[currentScaleIndex]) {
                        body.classList.remove(scaleClasses[currentScaleIndex]);
                    }
                    currentScaleIndex++;
                    if (scaleClasses[currentScaleIndex]) {
                        body.classList.add(scaleClasses[currentScaleIndex]);
                    }
                    fontSizeIndicator.textContent = scalePercentages[currentScaleIndex];
                }
            });
        }

        // Disminuir fuente (-)
        if (btnDec && fontSizeIndicator) {
            btnDec.addEventListener('click', () => {
                if (currentScaleIndex > 0) {
                    if (scaleClasses[currentScaleIndex]) {
                        body.classList.remove(scaleClasses[currentScaleIndex]);
                    }
                    currentScaleIndex--;
                    if (scaleClasses[currentScaleIndex]) {
                        body.classList.add(scaleClasses[currentScaleIndex]);
                    }
                    fontSizeIndicator.textContent = scalePercentages[currentScaleIndex];
                }
            });
        }

        // Modo Alto Contraste
        if (btnContrast) {
            btnContrast.addEventListener('click', () => {
                body.classList.toggle('high-contrast');
            });
        }

        // Resaltar Enlaces
        if (btnLinks) {
            btnLinks.addEventListener('click', () => {
                body.classList.toggle('highlight-links');
            });
        }

        // Restablecer valores originales
        if (btnReset) {
            btnReset.addEventListener('click', () => {
                scaleClasses.forEach(cls => {
                    if (cls) body.classList.remove(cls);
                });
                currentScaleIndex = 0;
                if (fontSizeIndicator) fontSizeIndicator.textContent = '100%';
                body.classList.remove('high-contrast');
                body.classList.remove('highlight-links');
                panel.classList.remove('active');
            });
        }
    }
});
// Control del Menú Móvil (Hamburguesa)
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mainNav = document.getElementById('mainNav');

if (mobileMenuBtn && mainNav) {
    mobileMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        mainNav.classList.toggle('active');
    });

    // Cerrar menú al hacer clic en cualquier enlace interno o fuera del menú
    document.addEventListener('click', (e) => {
        if (!mainNav.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
            mainNav.classList.remove('active');
        }
    });

    // Cerrar al hacer clic en un enlace de navegación móvil
    mainNav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            mainNav.classList.remove('active');
        });
    });
}