/**
 * ============================================
 * SOLICITAR SERVICIO - Lógica específica
 * ============================================
 * Descripción: Carga la configuración dinámica del formulario
 *              desde el backend para actualizar títulos, descripciones
 *              y textos de privacidad.
 * ============================================
 */

async function cargarConfigFormulario() {
    try {
        const response = await fetch('../sysfun/backend/api/configuracion_sitio.php?seccion=sitio');
        const config = await response.json();
        const sitio = config.sitio || config; // Soporte para ambos formatos de respuesta
        
        if (sitio.form_titulo) {
            const formTitle = document.querySelector('.form-header h1');
            if (formTitle) formTitle.innerHTML = `<i class="fas fa-hands-helping"></i> ${sitio.form_titulo}`;
        }
        
        if (sitio.form_desc) {
            const formDesc = document.querySelector('.form-header p');
            if (formDesc) formDesc.textContent = sitio.form_desc;
        }
        
        if (sitio.form_privacidad) {
            const privacidadText = document.querySelector('.checkbox-text');
            if (privacidadText) {
                privacidadText.innerHTML = `${sitio.form_privacidad} *`;
            }
        }
    } catch (error) {
        console.error('⚠️ Error al cargar configuración del formulario:', error);
    }
}

// Ejecutar al cargar la página
document.addEventListener('DOMContentLoaded', cargarConfigFormulario);