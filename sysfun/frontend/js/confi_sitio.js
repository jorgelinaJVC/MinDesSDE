// ============================================
// CONFIGURACIÓN DEL SITIO - LÓGICA EXCLUSIVA
// ============================================

const API_CONFIG = '../backend/api/configuracion_sitio.php';
const API_FUENTES = '../backend/api/fuentes_solicitud.php';

let faqData = [];
let pasosData = [];

// ============================================
// 1. INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    const userData = JSON.parse(sessionStorage.getItem('user_data') || '{}');
    const userNameEl = document.getElementById('userName');
    if (userNameEl && userData) {
        userNameEl.textContent = userData.nombre || userData.usuario || 'Usuario';
    }
    
    initTabs();
    initFormFuenteListener();
    await cargarConfiguracion();
    
    // Menú hamburguesa (si existe en esta página)
    const hamburger = document.getElementById('hamburgerBtn');
    const navLinks = document.getElementById('navLinks');
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));
    }
});

// ============================================
// 2. NAVEGACIÓN POR PESTAÑAS (TABS)
// ============================================
function initTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            this.classList.add('active');
            const tabId = this.dataset.tab;
            document.getElementById('tab-' + tabId).classList.add('active');
            
            // Cargar fuentes solo cuando se abre la pestaña
            if (tabId === 'fuentes') {
                cargarFuentesConfig();
            }
        });
    });
}

// ============================================
// 3. CARGAR CONFIGURACIÓN GENERAL
// ============================================
async function cargarConfiguracion() {
    try {
        const response = await fetch(API_CONFIG);
        if (!response.ok) throw new Error('Error en la respuesta de la red');
        const config = await response.json();
        const sitio = config.sitio || {};
        
        // Cargar inputs simples de texto
        document.querySelectorAll('[data-seccion="sitio"][data-clave]').forEach(input => {
            if (sitio[input.dataset.clave]) {
                input.value = sitio[input.dataset.clave];
            }
        });
        
        // Cargar FAQ
        try { 
            faqData = sitio.faq_json ? JSON.parse(sitio.faq_json) : []; 
        } catch(e) { 
            faqData = []; 
        }
        
        if (faqData.length === 0) {
            faqData = [
                { pregunta: "¿Qué hago si el fallecimiento ocurre fuera del horario?", respuesta: "Puede realizar la solicitud al día siguiente a partir de las 7:00 hs." },
                { pregunta: "¿Puedo elegir el tipo de ataúd?", respuesta: "El Ministerio provee ataúdes estándar. Consulte disponibilidad para casos especiales." }
            ];
        }
        renderFaq();
        
        // Cargar Pasos
        try { 
            pasosData = sitio.pasos_json ? JSON.parse(sitio.pasos_json) : []; 
        } catch(e) { 
            pasosData = []; 
        }
        
        if (pasosData.length === 0) {
            pasosData = [
                { titulo: "Iniciar Trámite", descripcion: "Haga clic en el botón 'Solicitar Acompañamiento'.", icono: "fa-hands-helping" },
                { titulo: "Completar Datos", descripcion: "Complete la información del solicitante y del fallecido.", icono: "fa-user-edit" },
                { titulo: "Adjuntar Documentación", descripcion: "Suba fotos o PDFs de los documentos necesarios.", icono: "fa-file-upload" },
                { titulo: "Seguimiento", descripcion: "Un representante se comunicará con usted.", icono: "fa-phone" }
            ];
        }
        renderPasos();
        
    } catch (error) {
        console.error('Error al cargar configuración:', error);
        alert('Error al cargar la configuración. Verifica la consola.');
    }
}

// ============================================
// 4. GUARDAR SECCIONES DE TEXTO
// ============================================
async function guardarSeccion(seccion, claves) {
    const config = {};
    claves.forEach(clave => {
        const el = document.querySelector(`[data-seccion="${seccion}"][data-clave="${clave}"]`);
        if (el) config[clave] = el.value;
    });
    
    try {
        const response = await fetch(API_CONFIG, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seccion, config })
        });
        
        const data = await response.json();
        if (data.success) {
            mostrarExito('✅ Cambios guardados correctamente');
        } else {
            alert('❌ Error: ' + (data.message || 'Desconocido'));
        }
    } catch (error) {
        console.error(error);
        alert('❌ Error de conexión al guardar');
    }
}

// ============================================
// 5. LÓGICA DE PREGUNTAS FRECUENTES (FAQ)
// ============================================
function renderFaq() {
    const container = document.getElementById('faqContainer');
    if (!container) return;
    
    container.innerHTML = faqData.map((item, index) => `
        <div class="dynamic-item">
            <button type="button" class="remove-btn" onclick="eliminarFaq(${index})"><i class="fas fa-times"></i></button>
            <div class="config-item">
                <label>Pregunta</label>
                <input type="text" value="${item.pregunta}" onchange="faqData[${index}].pregunta = this.value">
            </div>
            <div class="config-item">
                <label>Respuesta</label>
                <textarea onchange="faqData[${index}].respuesta = this.value">${item.respuesta}</textarea>
            </div>
        </div>
    `).join('');
}

function agregarFaqItem() { 
    faqData.push({ pregunta: "", respuesta: "" }); 
    renderFaq(); 
}

function eliminarFaq(index) { 
    faqData.splice(index, 1); 
    renderFaq(); 
}

async function guardarFaq() {
    try {
        const response = await fetch(API_CONFIG, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seccion: 'sitio', config: { faq_json: JSON.stringify(faqData) } })
        });
        
        const data = await response.json();
        if (data.success) {
            mostrarExito('✅ Preguntas frecuentes guardadas');
        } else {
            alert('❌ Error: ' + (data.message || 'Desconocido'));
        }
    } catch (error) { 
        console.error(error);
        alert('❌ Error de conexión al guardar FAQ'); 
    }
}

// ============================================
// 6. LÓGICA DE PASOS DEL PROCESO
// ============================================
function renderPasos() {
    const container = document.getElementById('pasosContainer');
    if (!container) return;
    
    container.innerHTML = pasosData.map((item, index) => `
        <div class="dynamic-item">
            <button type="button" class="remove-btn" onclick="eliminarPaso(${index})"><i class="fas fa-times"></i></button>
            <div class="config-item">
                <label>Título del Paso</label>
                <input type="text" value="${item.titulo}" onchange="pasosData[${index}].titulo = this.value">
            </div>
            <div class="config-item">
                <label>Descripción</label>
                <textarea onchange="pasosData[${index}].descripcion = this.value">${item.descripcion}</textarea>
            </div>
            <div class="config-item">
                <label>Icono (clase de FontAwesome, ej: fa-clock)</label>
                <input type="text" value="${item.icono || 'fa-circle'}" onchange="pasosData[${index}].icono = this.value">
            </div>
        </div>
    `).join('');
}

function agregarPasoItem() { 
    pasosData.push({ titulo: "", descripcion: "", icono: "fa-circle" }); 
    renderPasos(); 
}

function eliminarPaso(index) { 
    pasosData.splice(index, 1); 
    renderPasos(); 
}

async function guardarPasos() {
    try {
        const response = await fetch(API_CONFIG, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seccion: 'sitio', config: { pasos_json: JSON.stringify(pasosData) } })
        });
        
        const data = await response.json();
        if (data.success) {
            mostrarExito('✅ Pasos del proceso guardados');
        } else {
            alert('❌ Error: ' + (data.message || 'Desconocido'));
        }
    } catch (error) { 
        console.error(error);
        alert('❌ Error de conexión al guardar Pasos'); 
    }
}

// ============================================
// 7. LÓGICA DE GESTIÓN DE FUENTES
// ============================================
async function cargarFuentesConfig() {
    try {
        const response = await fetch(API_FUENTES);
        if (!response.ok) throw new Error('Error al cargar fuentes');
        const fuentes = await response.json();
        const tbody = document.getElementById('tablaFuentesConfig');
        
        if (!tbody) return;

        tbody.innerHTML = fuentes.map(f => `
            <tr>
                <td><strong>${f.nombre}</strong></td>
                <td><span class="estado-badge estado-${f.tipo === 'HOSPITAL' ? 'EN_REVISION' : f.tipo === 'MORGUE' ? 'ANULADO' : 'COMPLETADO'}">${f.tipo.replace('_', ' ')}</span></td>
                <td>${f.direccion || '-'}</td>
                <td>${f.telefono || '-'}</td>
                <td>${f.orden}</td>
                <td>${f.activo ? '<span style="color:#2ecc71; font-weight:600;">✓ Activa</span>' : '<span style="color:#e74c3c; font-weight:600;">✗ Inactiva</span>'}</td>
                <td>
                    <button type="button" class="btn btn-warning btn-sm" onclick="editarFuenteConfig(${f.id_fuente})"><i class="fas fa-edit"></i></button>
                    <button type="button" class="btn btn-danger btn-sm" onclick="eliminarFuenteConfig(${f.id_fuente})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="7" style="text-align:center;">No hay fuentes registradas</td></tr>';
    } catch (error) {
        console.error('Error al cargar fuentes:', error);
        const tbody = document.getElementById('tablaFuentesConfig');
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red;">Error al cargar datos</td></tr>';
    }
}

function abrirModalFuente(id = null) {
    const modal = document.getElementById('modalFuente');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('formFuente').reset();
        document.getElementById('fuenteId').value = '';
        document.getElementById('modalTituloFuente').textContent = 'Nueva Fuente';
        if (id) cargarFuenteParaEditarConfig(id);
    }
}

function cerrarModalFuente() {
    const modal = document.getElementById('modalFuente');
    if (modal) modal.style.display = 'none';
}

async function cargarFuenteParaEditarConfig(id) {
    try {
        const response = await fetch(`${API_FUENTES}?id=${id}`);
        const f = await response.json();
        document.getElementById('fuenteId').value = f.id_fuente;
        document.getElementById('fuenteNombre').value = f.nombre;
        document.getElementById('fuenteTipo').value = f.tipo;
        document.getElementById('fuenteDireccion').value = f.direccion || '';
        document.getElementById('fuenteTelefono').value = f.telefono || '';
        document.getElementById('fuenteOrden').value = f.orden;
        document.getElementById('modalTituloFuente').textContent = 'Editar Fuente';
    } catch (error) {
        console.error('Error al cargar fuente:', error);
        alert('Error al cargar los datos de la fuente');
    }
}

function editarFuenteConfig(id) { 
    abrirModalFuente(id); 
}

async function eliminarFuenteConfig(id) {
    if (!confirm('¿Desactivar esta fuente?')) return;
    try {
        const response = await fetch(`${API_FUENTES}?id=${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (data.success) {
            cargarFuentesConfig();
            mostrarExito('✅ Fuente desactivada');
        } else {
            alert('❌ Error: ' + (data.message || 'Desconocido'));
        }
    } catch (error) {
        console.error(error);
        alert('❌ Error de conexión al eliminar');
    }
}

function initFormFuenteListener() {
    const formFuente = document.getElementById('formFuente');
    if (formFuente) {
        formFuente.addEventListener('submit', async (e) => {
            e.preventDefault();
            await guardarFuente();
        });
    }
}

async function guardarFuente() {
    const id = document.getElementById('fuenteId').value;
    const data = {
        nombre: document.getElementById('fuenteNombre').value,
        tipo: document.getElementById('fuenteTipo').value,
        direccion: document.getElementById('fuenteDireccion').value,
        telefono: document.getElementById('fuenteTelefono').value,
        orden: parseInt(document.getElementById('fuenteOrden').value) || 0
    };
    
    const url = id ? `${API_FUENTES}?id=${id}` : API_FUENTES;
    const method = id ? 'PUT' : 'POST';
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        if (result.success) {
            cerrarModalFuente();
            cargarFuentesConfig();
            mostrarExito('✅ Fuente guardada exitosamente');
        } else {
            alert('❌ Error al guardar: ' + (result.message || 'Error desconocido'));
        }
    } catch (error) {
        console.error('❌ Error de conexión:', error);
        alert('❌ Error de conexión al guardar');
    }
}

// ============================================
// 8. UTILIDADES
// ============================================
function mostrarExito(mensaje = 'Configuración guardada exitosamente') {
    let msg = document.getElementById('successMessage');
    if (!msg) {
        msg = document.createElement('div');
        msg.id = 'successMessage';
        msg.className = 'success-message';
        const header = document.querySelector('.page-header');
        if (header) {
            header.insertAdjacentElement('afterend', msg);
        } else {
            document.querySelector('.main-content').prepend(msg);
        }
    }
    
    msg.textContent = mensaje;
    msg.classList.add('show');
    msg.style.display = 'block';
    
    setTimeout(() => {
        msg.classList.remove('show');
        msg.style.display = 'none';
    }, 3000);
}

// ============================================
// 9. LÓGICA DE TARJETAS DE DOCUMENTACIÓN
// ============================================
let docCardsData = [];

function renderDocCards() {
    const container = document.getElementById('docCardsContainer');
    if (!container) return;
    
    container.innerHTML = docCardsData.map((item, index) => `
        <div class="dynamic-item">
            <button type="button" class="remove-btn" onclick="eliminarDocCard(${index})"><i class="fas fa-times"></i></button>
            <div class="config-item">
                <label>Icono (clase de FontAwesome, ej: fa-file-medical)</label>
                <input type="text" value="${item.icono}" onchange="docCardsData[${index}].icono = this.value">
            </div>
            <div class="config-item">
                <label>Título de la Tarjeta</label>
                <input type="text" value="${item.titulo}" onchange="docCardsData[${index}].titulo = this.value">
            </div>
            <div class="config-item">
                <label>Descripción</label>
                <textarea onchange="docCardsData[${index}].descripcion = this.value">${item.descripcion}</textarea>
            </div>
        </div>
    `).join('');
}

function agregarDocCard() {
    docCardsData.push({ icono: "fa-file-medical", titulo: "", descripcion: "" });
    renderDocCards();
}

function eliminarDocCard(index) {
    docCardsData.splice(index, 1);
    renderDocCards();
}

async function guardarDocCards() {
    try {
        const response = await fetch(API_CONFIG, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seccion: 'sitio', config: { doc_cards_json: JSON.stringify(docCardsData) } })
        });
        
        const data = await response.json();
        if (data.success) {
            mostrarExito('✅ Tarjetas de documentación guardadas');
        } else {
            alert('❌ Error: ' + (data.message || 'Desconocido'));
        }
    } catch (error) {
        console.error(error);
        alert('❌ Error de conexión al guardar tarjetas');
    }
}

// Modificar cargarConfiguracion para incluir doc_cards
async function cargarConfiguracion() {
    try {
        const response = await fetch(API_CONFIG);
        if (!response.ok) throw new Error('Error en la respuesta de la red');
        const config = await response.json();
        const sitio = config.sitio || config;
        
        // Cargar inputs simples de texto
        document.querySelectorAll('[data-seccion="sitio"][data-clave]').forEach(input => {
            if (sitio[input.dataset.clave]) {
                input.value = sitio[input.dataset.clave];
            }
        });
        
        // Cargar FAQ
        try { faqData = sitio.faq_json ? JSON.parse(sitio.faq_json) : []; } catch(e) { faqData = []; }
        if (faqData.length === 0) {
            faqData = [
                { pregunta: "¿Qué hago si el fallecimiento ocurre fuera del horario?", respuesta: "Puede realizar la solicitud al día siguiente a partir de las 7:00 hs." },
                { pregunta: "¿Puedo elegir el tipo de ataúd?", respuesta: "El Ministerio provee ataúdes estándar. Consulte disponibilidad para casos especiales." }
            ];
        }
        renderFaq();
        
        // Cargar Pasos
        try { pasosData = sitio.pasos_json ? JSON.parse(sitio.pasos_json) : []; } catch(e) { pasosData = []; }
        if (pasosData.length === 0) {
            pasosData = [
                { titulo: "Iniciar Trámite", descripcion: "Haga clic en el botón 'Solicitar Acompañamiento'.", icono: "fa-hands-helping" },
                { titulo: "Completar Datos", descripcion: "Complete la información del solicitante y del fallecido.", icono: "fa-user-edit" },
                { titulo: "Adjuntar Documentación", descripcion: "Suba fotos o PDFs de los documentos necesarios.", icono: "fa-file-upload" },
                { titulo: "Seguimiento", descripcion: "Un representante se comunicará con usted.", icono: "fa-phone" }
            ];
        }
        renderPasos();
        
        // ✅ Cargar Tarjetas de Documentación
        try { docCardsData = sitio.doc_cards_json ? JSON.parse(sitio.doc_cards_json) : []; } catch(e) { docCardsData = []; }
        if (docCardsData.length === 0) {
            docCardsData = [
                { icono: "fa-file-medical", titulo: "Certificado de Defunción", descripcion: "Original o copia certificada. Es el documento indispensable para iniciar el trámite." },
                { icono: "fa-id-card", titulo: "DNI del Fallecido", descripcion: "Fotocopia clara de ambas caras o una imagen digital legible tomada con el celular." },
                { icono: "fa-baby", titulo: "Para Bebés Recién Nacidos", descripcion: "Certificado de defunción + DNI de la madre o persona responsable a cargo." },
                { icono: "fa-truck-moving", titulo: "Traslados Interprovinciales", descripcion: "El fallecido debe acreditar domicilio en Santiago del Estero mediante su último DNI vigente." }
            ];
        }
        renderDocCards();
        
    } catch (error) {
        console.error('Error al cargar configuración:', error);
        alert('Error al cargar la configuración. Verifica la consola.');
    }
}

// Cerrar modal al hacer clic fuera
document.addEventListener('click', (e) => {
    const modal = document.getElementById('modalFuente');
    if (modal && e.target.id === 'modalFuente') {
        cerrarModalFuente();
    }
});