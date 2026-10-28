/* pagina-mama-antula.js — comportamiento propio de mama-antula.html (Residencia Mama Antula): modal de proyectos, formulario de
 * contacto y menú del celular. La accesibilidad (tamaño del texto, contraste, enlaces) está en js/comun/accesibilidad.js,
 * compartido por los tres sitios. */
document.addEventListener('DOMContentLoaded', () => {
    // Modal de Proyectos
    const openModalBtn = document.getElementById('openModalBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const projectModal = document.getElementById('projectModal');

    if (openModalBtn && projectModal) {
        openModalBtn.addEventListener('click', () => {
            projectModal.style.display = 'flex';
        });
    }

    if (closeModalBtn && projectModal) {
        closeModalBtn.addEventListener('click', () => {
            projectModal.style.display = 'none';
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === projectModal) {
            projectModal.style.display = 'none';
        }
    });

    // Formulario de Contacto Directo
    const directForm = document.getElementById('directContactForm');
    const formAlert = document.getElementById('form-alert');
    const submitBtn = document.getElementById('btn-submit-form');

    if (directForm && formAlert) {
        directForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const nombre = document.getElementById('form-nombre').value.trim();
            const apellido = document.getElementById('form-apellido').value.trim();
            const telefono = document.getElementById('form-telefono').value.trim();
            const asunto = document.getElementById('form-asunto').value;
            const mensaje = document.getElementById('form-mensaje').value.trim();

            if (!nombre || !apellido || !telefono || !asunto || !mensaje) {
                formAlert.style.display = 'block';
                formAlert.className = 'alert-box alert-error';
                formAlert.textContent = 'Por favor, complete todos los campos obligatorios marcados con (*).';
                formAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                return;
            }

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Registrando consulta...';
            }

            setTimeout(() => {
                formAlert.style.display = 'block';
                formAlert.className = 'alert-box alert-success';
                formAlert.textContent = `¡Mensaje enviado con éxito! Estimado/a ${nombre} ${apellido}, su consulta ha sido radicada con éxito. Nos comunicaremos al ${telefono}.`;
                formAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

                directForm.reset();

                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enviar Mensaje a la residencia de Larga Estadía Mama Antula';
                }
            }, 1000);
        });
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

    // Cerrar el menú si se hace clic fuera de él
    document.addEventListener('click', (e) => {
        if (!mainNav.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
            mainNav.classList.remove('active');
        }
    });

    // Cerrar automáticamente al hacer clic en cualquier enlace del menú
    mainNav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            mainNav.classList.remove('active');
        });
    });
}
