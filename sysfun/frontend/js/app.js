/**
 * ============================================
 * SISTEMA FUNEBRE - JavaScript UNIFICADO
 * ============================================
 * Versión: 2.1 (Corregido)
 * ============================================
 */

// ============================================
// 1. CONFIGURACIÓN Y API CLIENT
// ============================================
const API_BASE_URL = '../backend/api/';

class ApiClient {
    constructor() {
        this.token = null;
    }

    async request(endpoint, method, data) {
        const url = API_BASE_URL + endpoint;
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include'
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(url, options);
            if (response.status === 401) {
                logout();
                throw new Error('Sesión expirada');
            }
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    get(endpoint) { return this.request(endpoint, 'GET'); }
    post(endpoint, data) { return this.request(endpoint, 'POST', data); }
    put(endpoint, data) { return this.request(endpoint, 'PUT', data); }
    delete(endpoint) { return this.request(endpoint, 'DELETE'); }
}

const api = new ApiClient();

// ============================================
// 2. UTILIDADES GLOBALES
// ============================================
function getCurrentPage() {
    const path = window.location.pathname;
    return path.split('/').pop() || 'index.html';
}

function checkAuth() {
    const currentPage = getCurrentPage();
    const protectedPages = [
        'panel_datos.html', 'solicitudes.html', 'empleados.html',
        'ataudes.html', 'vehiculos.html', 'proveedores.html',
        'reportes.html', 'solicitud.html', 'configuracion_sitio.html', 'perfil.html'
    ];
    
    if (currentPage === 'login.html' || currentPage === 'index.html') {
        return true;
    }
    
    if (protectedPages.includes(currentPage)) {
        const userData = sessionStorage.getItem('user_data');
        if (userData) {
            try {
                window._userData = JSON.parse(userData);
                return verificarPrimerIngreso(); // Verificar primer ingreso
            } catch (e) {
                console.error('Error al parsear user_data:', e);
            }
        }
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Verificar si debe cambiar contraseña (primer ingreso)
function verificarPrimerIngreso() {
    const currentPage = getCurrentPage();
    const userData = JSON.parse(sessionStorage.getItem('user_data') || '{}');
    
    // Si es primer ingreso y no está en perfil.html, redirigir
    if (userData.primer_ingreso && currentPage !== 'perfil.html') {
        window.location.href = 'perfil.html';
        return false;
    }
    return true;
}

function getUserData() {
    if (window._userData) return window._userData;
    try {
        const data = sessionStorage.getItem('user_data');
        if (data) {
            window._userData = JSON.parse(data);
            return window._userData;
        }
    } catch (e) {
        console.error('Error al obtener user_data:', e);
    }
    return null;
}

async function logout() {
    try {
        await fetch(API_BASE_URL + 'logout.php', { method: 'POST', credentials: 'include' });
    } catch (e) {}
    window._userData = null;
    sessionStorage.removeItem('user_data');
    window.location.href = 'login.html';
}

function showLoading(button, text) {
    if (button) {
        button.disabled = true;
        button.textContent = text || 'Cargando...';
        button.classList.add('loading');
    }
}

function hideLoading(button, text) {
    if (button) {
        button.disabled = false;
        button.textContent = text || 'Iniciar Sesión';
        button.classList.remove('loading');
    }
}

// ============================================
// 3. LOGIN
// ============================================
function initLogin() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        const errorDiv = document.getElementById('errorMessage');
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        
        errorDiv.classList.remove('show');
        errorDiv.textContent = '';

        if (!username || !password) {
            errorDiv.textContent = 'Por favor, complete todos los campos';
            errorDiv.classList.add('show');
            return;
        }

        try {
            showLoading(submitBtn, 'Iniciando...');
            const response = await fetch(API_BASE_URL + 'auth.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();

            if (data.success) {
                window._userData = data.user;
                sessionStorage.setItem('user_data', JSON.stringify(data.user));
                window.location.href = 'panel_datos.html';
            } else {
                errorDiv.textContent = data.message || 'Credenciales incorrectas';
                errorDiv.classList.add('show');
                hideLoading(submitBtn, 'Iniciar Sesión');
            }
        } catch (error) {
            errorDiv.textContent = 'Error de conexión con el servidor.';
            errorDiv.classList.add('show');
            hideLoading(submitBtn, 'Iniciar Sesión');
        }
    });
}

// ============================================
// 4. DASHBOARD
// ============================================
async function loadDashboard() {
    const userData = getUserData();
    
    // ✅ NUEVO: Mostrar nombre del usuario en el enlace del perfil (esquina derecha)
    const userNameEl = document.getElementById('userName');
    if (userNameEl && userData) {
        userNameEl.textContent = userData.nombre || userData.usuario || 'Usuario';
    }
    
    await loadDashboardStats();
    await loadAdditionalStats();
    await loadRecentSolicitudes();
}

async function loadDashboardStats() {
    try {
        const stats = await api.get('dashboard_stats.php');
        const estados = stats.estados || [];
        const total = estados.reduce((sum, e) => sum + e.total, 0);
        const pendientes = estados.filter(e => e.estado === 'PENDIENTE' || e.estado === 'EN_REVISION').reduce((sum, e) => sum + e.total, 0);
        const completados = estados.filter(e => e.estado === 'COMPLETADO').reduce((sum, e) => sum + e.total, 0);
        
        document.getElementById('totalSolicitudes').textContent = total;
        document.getElementById('solicitudesPendientes').textContent = pendientes;
        document.getElementById('solicitudesCompletadas').textContent = completados;
        
        const stockCritico = (stats.stock || []).filter(s => s.estado_stock === 'Sin Stock' || s.estado_stock === 'Bajo Stock').reduce((sum, s) => sum + s.total, 0);
        document.getElementById('stockCritico').textContent = stockCritico;
        
        if (typeof Chart !== 'undefined' && document.getElementById('chartEstados')) initCharts(stats);
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
    }
}

async function loadRecentSolicitudes() {
    try {
        const solicitudes = await api.get('solicitudes.php');
        const recientes = solicitudes.slice(0, 5);
        const tbody = document.getElementById('tablaSolicitudes');
        if (!tbody) return;
        
        if (!recientes || recientes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">No hay solicitudes registradas</td></tr>';
            return;
        }
        
        tbody.innerHTML = recientes.map(s => `
            <tr>
                <td>${s.nro_pedido}</td>
                <td>${s.fallecido_nombre || 'No especificado'}</td>
                <td>${s.responsable_nombre || 'No especificado'}</td>
                <td>${new Date(s.fecha_solicitud).toLocaleDateString()}</td>
                <td><span class="estado-badge estado-${s.estado}">${s.estado.replace('_', ' ')}</span></td>
                <td><button class="btn btn-primary btn-sm" onclick="verSolicitud(${s.id_solicitud})">Ver</button></td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error al cargar solicitudes recientes:', error);
    }
}

function verSolicitud(id) { window.location.href = `solicitud.html?id=${id}`; }

async function loadAdditionalStats() {
    try {
        const [empleados, vehiculos, ataudes, proveedores, solicitudes] = await Promise.all([
            api.get('empleados.php'), api.get('vehiculos.php'), api.get('ataudes.php'),
            api.get('proveedores.php'), api.get('solicitudes.php')
        ]);
        
        document.getElementById('totalEmpleados').textContent = (empleados || []).filter(e => e.activo == 1).length;
        document.getElementById('totalVehiculos').textContent = (vehiculos || []).filter(v => v.estado === 'DISPONIBLE').length;
        document.getElementById('totalAtaudes').textContent = (ataudes || []).reduce((sum, a) => sum + parseInt(a.stock_actual || 0), 0);
        document.getElementById('totalProveedores').textContent = (proveedores || []).filter(p => p.activo == 1).length;
        
        const completados = (solicitudes || []).filter(s => s.estado === 'COMPLETADO').length;
        document.getElementById('totalServicios').textContent = completados;
        
        const total = (solicitudes || []).length;
        document.getElementById('tasaEficiencia').textContent = total > 0 ? Math.round((completados / total) * 100) + '%' : '0%';
    } catch (error) {
        console.error('Error al cargar estadísticas adicionales:', error);
    }
}

// ============================================
// 5. GRÁFICOS (Chart.js)
// ============================================
function initCharts(stats) {
    const ctx1 = document.getElementById('chartEstados');
    if (ctx1) {
        new Chart(ctx1, {
            type: 'doughnut',
            data: {
                labels: (stats.estados || []).map(e => e.estado.replace('_', ' ')),
                datasets: [{ data: (stats.estados || []).map(e => e.total), backgroundColor: ['#ffeaa7', '#74b9ff', '#a29bfe', '#fd79a8', '#55efc4', '#ff7675'], borderWidth: 2 }]
            },
            options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
        });
    }
    
    const ctx2 = document.getElementById('chartMensual');
    if (ctx2) {
        const meses = (stats.mensual || []).map(m => {
            const [year, month] = m.mes.split('-');
            const nombres = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
            return `${nombres[parseInt(month)-1]} ${year}`;
        });
        new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: meses,
                datasets: [{ label: 'Solicitudes', data: (stats.mensual || []).map(m => m.total), backgroundColor: '#3498db', borderRadius: 5 }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });
    }
}

// ============================================
// 6. SOLICITUDES
// ============================================
async function loadSolicitudes() {
    try {
        const solicitudes = await api.get('solicitudes.php');
        const tbody = document.getElementById('tablaSolicitudes');
        if (!tbody) return;
        
        if (!solicitudes || solicitudes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">No hay solicitudes registradas</td></tr>';
            return;
        }
        
        tbody.innerHTML = solicitudes.map(s => `
            <tr>
                <td>${s.nro_pedido}</td>
                <td>${s.fallecido_nombre || 'No especificado'}</td>
                <td>${s.responsable_nombre || 'No especificado'}</td>
                <td>${new Date(s.fecha_solicitud).toLocaleDateString()}</td>
                <td>${s.tipo_servicio || 'No especificado'}</td>
                <td><span class="estado-badge estado-${s.estado}">${s.estado.replace('_', ' ')}</span></td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="verSolicitud(${s.id_solicitud})"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-warning btn-sm" onclick="editarSolicitud(${s.id_solicitud})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="eliminarSolicitud(${s.id_solicitud})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error al cargar solicitudes:', error);
    }
}

function editarSolicitud(id) { window.location.href = `solicitud.html?id=${id}`; }

async function eliminarSolicitud(id) {
    if (!confirm('⚠️ ¿Estás seguro de eliminar esta solicitud?')) return;
    try {
        await api.delete(`solicitudes.php?id=${id}`);
        alert('✅ Solicitud eliminada exitosamente');
        loadSolicitudes();
    } catch (error) {
        alert('❌ Error de conexión al eliminar');
    }
}

// ============================================
// 7. DETALLE DE SOLICITUD
// ============================================
let solicitudId = null;
let detalleData = null;

async function loadSolicitudDetalle() {
    const urlParams = new URLSearchParams(window.location.search);
    solicitudId = urlParams.get('id');
    if (!solicitudId) {
        alert('ID de solicitud no especificado');
        window.location.href = 'solicitudes.html';
        return;
    }
    
    try {
        const data = await api.get(`solicitud_detalle.php?id=${solicitudId}`);
        if (data.message) {
            alert(data.message);
            window.location.href = 'solicitudes.html';
            return;
        }
        detalleData = data;
        renderDetalle(data);
        if (typeof cargarSelectores === 'function') await cargarSelectores(data);
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar el detalle');
    }
}

function renderDetalle(data) {
    document.getElementById('nroPedido').textContent = `#${data.nro_pedido}`;
    document.getElementById('det_nro_pedido').textContent = data.nro_pedido;
    document.getElementById('det_fecha').textContent = new Date(data.fecha_solicitud).toLocaleDateString('es-AR');
    document.getElementById('det_estado').innerHTML = `<span class="estado-badge estado-${data.estado}">${data.estado.replace('_', ' ')}</span>`;
    document.getElementById('det_tipo').textContent = data.tipo_servicio;
    document.getElementById('det_origen').textContent = data.origen || 'WEB';
    
    document.getElementById('det_fallecido').textContent = `${data.fallecido_nombre || ''} ${data.fallecido_apellido || ''}`.trim() || 'No especificado';
    document.getElementById('det_fallecido_dni').textContent = data.fallecido_dni || 'No especificado';
    document.getElementById('det_fecha_fallecimiento').textContent = data.fecha_fallecimiento ? new Date(data.fecha_fallecimiento).toLocaleDateString('es-AR') : 'No especificado';
    document.getElementById('det_departamento').textContent = data.fallecido_departamento || 'No especificado';
    document.getElementById('det_domicilio').textContent = data.fallecido_domicilio || 'No especificado';
    
    document.getElementById('det_responsable').textContent = `${data.responsable_nombre || ''} ${data.responsable_apellido || ''}`.trim() || 'No especificado';
    document.getElementById('det_responsable_dni').textContent = data.responsable_dni || 'No especificado';
    document.getElementById('det_responsable_telefono').textContent = data.responsable_telefono || 'No especificado';
    document.getElementById('det_responsable_email').textContent = data.responsable_email || 'No especificado';
    
    document.getElementById('det_ataud').textContent = data.ataud_nombre ? `${data.ataud_nombre} (Cód: ${data.ataud_codigo})` : 'Sin asignar';
    document.getElementById('det_vehiculo').textContent = data.vehiculo_patente ? `${data.vehiculo_marca} ${data.vehiculo_modelo} - ${data.vehiculo_patente}` : 'Sin asignar';
    document.getElementById('det_chofer').textContent = data.chofer_nombre || 'Sin asignar';
    document.getElementById('det_procesado').textContent = data.procesado_por_nombre || 'No procesado';
    
    document.getElementById('det_certificado').textContent = data.certificado_defuncion ? '✅ Entregado' : '❌ No entregado';
    document.getElementById('det_dni_fallecido').textContent = data.dni_fallecido ? '✅ Entregado' : '❌ No entregado';
    document.getElementById('det_docs_extra').textContent = data.documentos_extra ? '✅ Entregado' : '❌ No entregado';
    document.getElementById('det_observaciones').textContent = data.observaciones || 'Sin observaciones';
}

async function cargarSelectores(data) {
    try {
        const ataudes = await api.get('ataudes.php');
        const selectAtaud = document.getElementById('id_ataud_asignado');
        if (selectAtaud) {
            selectAtaud.innerHTML = '<option value="">Sin asignar...</option>';
            ataudes.forEach(a => {
                const option = document.createElement('option');
                option.value = a.id_ataud;
                option.textContent = `${a.nombre} (Stock: ${a.stock_actual})`;
                if (data.id_ataud_asignado == a.id_ataud) option.selected = true;
                selectAtaud.appendChild(option);
            });
        }
        
        const vehiculos = await api.get('vehiculos.php');
        const selectVehiculo = document.getElementById('id_vehiculo_asignado');
        if (selectVehiculo) {
            selectVehiculo.innerHTML = '<option value="">Sin asignar...</option>';
            vehiculos.forEach(v => {
                const option = document.createElement('option');
                option.value = v.id_vehiculo;
                option.textContent = `${v.patente} - ${v.marca} ${v.modelo}`;
                if (data.id_vehiculo_asignado == v.id_vehiculo) option.selected = true;
                selectVehiculo.appendChild(option);
            });
        }
        
        const empleados = await api.get('empleados.php');
        const selectChofer = document.getElementById('id_chofer_asignado');
        if (selectChofer) {
            selectChofer.innerHTML = '<option value="">Sin asignar...</option>';
            empleados.filter(e => e.activo == 1).forEach(e => {
                const option = document.createElement('option');
                option.value = e.id_empleado;
                option.textContent = `${e.nombre} ${e.apellido}`;
                if (data.id_chofer_asignado == e.id_empleado) option.selected = true;
                selectChofer.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error al cargar selectores:', error);
    }
}

function editarSolicitudDetalle() {
    document.getElementById('detalleContainer').classList.add('hidden');
    document.getElementById('formContainer').classList.remove('hidden');
    document.getElementById('btnEditar').classList.add('hidden');
    if (detalleData) {
        document.getElementById('estado').value = detalleData.estado;
        document.getElementById('id_ataud_asignado').value = detalleData.id_ataud_asignado || '';
        document.getElementById('id_vehiculo_asignado').value = detalleData.id_vehiculo_asignado || '';
        document.getElementById('id_chofer_asignado').value = detalleData.id_chofer_asignado || '';
        document.getElementById('observaciones').value = detalleData.observaciones || '';
    }
}

function cancelarEdicion() {
    document.getElementById('detalleContainer').classList.remove('hidden');
    document.getElementById('formContainer').classList.add('hidden');
    document.getElementById('btnEditar').classList.remove('hidden');
}

async function guardarCambiosSolicitud(e) {
    e.preventDefault();
    const data = {
        estado: document.getElementById('estado').value,
        id_ataud_asignado: document.getElementById('id_ataud_asignado').value || null,
        id_vehiculo_asignado: document.getElementById('id_vehiculo_asignado').value || null,
        id_chofer_asignado: document.getElementById('id_chofer_asignado').value || null,
        observaciones: document.getElementById('observaciones').value
    };
    try {
        const response = await api.put(`solicitud_detalle.php?id=${solicitudId}`, data);
        if (response.success) {
            alert('✅ Solicitud actualizada exitosamente');
            cancelarEdicion();
            loadSolicitudDetalle();
        } else {
            alert('❌ Error: ' + (response.message || 'No se pudo actualizar'));
        }
    } catch (error) {
        alert('❌ Error de conexión al actualizar');
    }
}

// ============================================
// 8. EMPLEADOS
// ============================================
let editandoEmpleado = false;

async function loadEmpleados() {
    try {
        const empleados = await api.get('empleados.php');
        const tbody = document.getElementById('tablaEmpleados');
        if (!tbody) return;
        if (!empleados || empleados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center">No hay empleados registrados</td></tr>';
            return;
        }
        tbody.innerHTML = empleados.map(e => `
            <tr>
                <td>${e.id_empleado}</td>
                <td>${e.nombre} ${e.apellido}</td>
                <td>${e.usuario}</td>
                <td>${e.email}</td>
                <td>${e.telefono}</td>
                <td>${e.nombre_rol || 'Sin rol'}</td>
                <td><span class="${e.activo ? 'estado-activo' : 'estado-inactivo'}">${e.activo ? 'Activo' : 'Inactivo'}</span></td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="editarEmpleado(${e.id_empleado})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="eliminarEmpleado(${e.id_empleado})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (error) { console.error('Error al cargar empleados:', error); }
}

async function loadRoles() {
    try {
        const roles = await api.get('roles.php');
        const select = document.getElementById('id_rol');
        if (!select) return;
        roles.forEach(rol => {
            const option = document.createElement('option');
            option.value = rol.id_rol;
            option.textContent = rol.nombre_rol;
            select.appendChild(option);
        });
    } catch (error) { console.error('Error al cargar roles:', error); }
}

function mostrarFormularioEmpleado() {
    editandoEmpleado = false;
    document.getElementById('formTitle').textContent = 'Nuevo Empleado';
    document.getElementById('editId').value = '';
    document.getElementById('empleadoForm').reset();
    document.getElementById('password').required = true;
    document.getElementById('formContainer').classList.remove('hidden');
}

function ocultarFormularioEmpleado() { document.getElementById('formContainer').classList.add('hidden'); }

async function editarEmpleado(id) {
    try {
        const empleados = await api.get('empleados.php');
        const empleado = empleados.find(e => e.id_empleado === id);
        if (!empleado) { alert('Empleado no encontrado'); return; }
        editandoEmpleado = true;
        document.getElementById('formTitle').textContent = 'Editar Empleado';
        document.getElementById('editId').value = id;
        document.getElementById('nombre').value = empleado.nombre;
        document.getElementById('apellido').value = empleado.apellido;
        document.getElementById('usuario').value = empleado.usuario;
        document.getElementById('email').value = empleado.email;
        document.getElementById('telefono').value = empleado.telefono;
        document.getElementById('id_rol').value = empleado.id_rol;
        document.getElementById('activo').value = empleado.activo;
        document.getElementById('password').required = false;
        document.getElementById('password').placeholder = 'Dejar en blanco para mantener';
        document.getElementById('formContainer').classList.remove('hidden');
    } catch (error) { alert('Error al cargar datos del empleado'); }
}

async function guardarEmpleado(e) {
    e.preventDefault();
    const form = document.getElementById('empleadoForm');
    let isValid = true;
    form.querySelectorAll('[required]').forEach(field => {
        if (!field.value.trim()) {
            field.classList.add('error');
            field.style.borderColor = '#e74c3c';
            isValid = false;
        } else {
            field.classList.remove('error');
            field.style.borderColor = '';
        }
    });
    if (!isValid) { alert('⚠️ Por favor, complete todos los campos obligatorios'); return; }
    
    const id = document.getElementById('editId').value;
    const data = {
        nombre: document.getElementById('nombre').value,
        apellido: document.getElementById('apellido').value,
        usuario: document.getElementById('usuario').value,
        email: document.getElementById('email').value,
        telefono: document.getElementById('telefono').value,
        id_rol: document.getElementById('id_rol').value,
        activo: document.getElementById('activo').value
    };
    const password = document.getElementById('password').value;
    if (password) data.password = password;
    
    try {
        if (id) await api.put(`empleados.php?id=${id}`, data);
        else await api.post('empleados.php', data);
        alert('Empleado guardado exitosamente');
        ocultarFormularioEmpleado();
        loadEmpleados();
    } catch (error) { alert('Error al guardar empleado'); }
}

async function eliminarEmpleado(id) {
    if (!confirm('¿Estás seguro de eliminar este empleado?')) return;
    try {
        await api.delete(`empleados.php?id=${id}`);
        alert('Empleado eliminado');
        loadEmpleados();
    } catch (error) { alert('Error al eliminar'); }
}

// ============================================
// 9. ATAÚDES
// ============================================
let editandoAtaud = false;

async function loadAtaudes() {
    try {
        const ataudes = await api.get('ataudes.php');
        const tbody = document.getElementById('tablaAtaudes');
        if (!tbody) return;
        if (!ataudes || ataudes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">No hay ataúdes registrados</td></tr>';
            return;
        }
        tbody.innerHTML = ataudes.map(a => `
            <tr>
                <td>${a.codigo_renglon || '-'}</td>
                <td>${a.nombre}</td>
                <td>${a.largo_mts}m</td>
                <td>${a.tiene_chapa ? '✅ Sí' : '❌ No'}</td>
                <td>${a.stock_actual}</td>
                <td><span class="${a.stock_actual <= 0 ? 'estado-inactivo' : a.stock_actual < a.stock_minimo ? 'estado-activo' : ''}">${a.stock_actual <= 0 ? 'Sin Stock' : a.stock_actual < a.stock_minimo ? '⚠️ Bajo Stock' : '✅ Disponible'}</span></td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="editarAtaud(${a.id_ataud})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="eliminarAtaud(${a.id_ataud})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (error) { console.error('Error al cargar ataudes:', error); }
}

function mostrarFormularioAtaud() {
    editandoAtaud = false;
    document.getElementById('formTitle').textContent = 'Nuevo Ataúd';
    document.getElementById('editId').value = '';
    document.getElementById('ataudForm').reset();
    document.getElementById('formContainer').classList.remove('hidden');
}
function ocultarFormularioAtaud() { document.getElementById('formContainer').classList.add('hidden'); }

async function editarAtaud(id) {
    try {
        const ataudes = await api.get('ataudes.php');
        const ataud = ataudes.find(a => a.id_ataud === id);
        if (!ataud) { alert('Ataúd no encontrado'); return; }
        editandoAtaud = true;
        document.getElementById('formTitle').textContent = 'Editar Ataúd';
        document.getElementById('editId').value = id;
        document.getElementById('codigo_renglon').value = ataud.codigo_renglon || '';
        document.getElementById('nombre').value = ataud.nombre;
        document.getElementById('largo_mts').value = ataud.largo_mts;
        document.getElementById('tiene_chapa').value = ataud.tiene_chapa;
        document.getElementById('stock_actual').value = ataud.stock_actual;
        document.getElementById('stock_minimo').value = ataud.stock_minimo;
        document.getElementById('formContainer').classList.remove('hidden');
    } catch (error) { alert('Error al cargar datos del ataúd'); }
}

async function guardarAtaud(e) {
    e.preventDefault();
    const form = document.getElementById('ataudForm');
    let isValid = true;
    form.querySelectorAll('[required]').forEach(field => {
        if (!field.value.trim()) {
            field.classList.add('error');
            field.style.borderColor = '#e74c3c';
            isValid = false;
        } else {
            field.classList.remove('error');
            field.style.borderColor = '';
        }
    });
    if (!isValid) { alert('⚠️ Por favor, complete todos los campos obligatorios'); return; }
    
    const id = document.getElementById('editId').value;
    const data = {
        codigo_renglon: document.getElementById('codigo_renglon').value,
        nombre: document.getElementById('nombre').value,
        largo_mts: document.getElementById('largo_mts').value,
        tiene_chapa: document.getElementById('tiene_chapa').value,
        stock_actual: document.getElementById('stock_actual').value,
        stock_minimo: document.getElementById('stock_minimo').value
    };
    try {
        if (id) await api.put(`ataudes.php?id=${id}`, data);
        else await api.post('ataudes.php', data);
        alert('Ataúd guardado exitosamente');
        ocultarFormularioAtaud();
        loadAtaudes();
    } catch (error) { alert('Error al guardar ataúd'); }
}

async function eliminarAtaud(id) {
    if (!confirm('⚠️ ¿Estás seguro de eliminar este ataúd?')) return;
    try {
        await api.delete(`ataudes.php?id=${id}`);
        alert('Ataúd eliminado');
        loadAtaudes();
    } catch (error) { alert('Error al eliminar'); }
}

// ============================================
// 10. VEHÍCULOS
// ============================================
let editandoVehiculo = false;

async function loadVehiculos() {
    try {
        const vehiculos = await api.get('vehiculos.php');
        const tbody = document.getElementById('tablaVehiculos');
        if (!tbody) return;
        if (!vehiculos || vehiculos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">No hay vehículos registrados</td></tr>';
            return;
        }
        tbody.innerHTML = vehiculos.map(v => `
            <tr>
                <td>${v.id_vehiculo}</td>
                <td><strong>${v.patente}</strong></td>
                <td>${v.marca} ${v.modelo} (${v.año || 'N/A'})</td>
                <td>${v.tipo}</td>
                <td>A:${v.capacidad_ataudes} | P:${v.capacidad_acompañantes}</td>
                <td><span class="estado-badge estado-${v.estado}">${v.estado.replace('_', ' ')}</span></td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="editarVehiculo(${v.id_vehiculo})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="eliminarVehiculo(${v.id_vehiculo})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (error) { console.error('Error:', error); }
}

function mostrarFormularioVehiculo() {
    editandoVehiculo = false;
    document.getElementById('formTitle').textContent = 'Nuevo Vehículo';
    document.getElementById('editId').value = '';
    document.getElementById('vehiculoForm').reset();
    document.getElementById('formContainer').classList.remove('hidden');
}
function ocultarFormularioVehiculo() { document.getElementById('formContainer').classList.add('hidden'); }

async function editarVehiculo(id) {
    try {
        const vehiculo = await api.get(`vehiculos.php?id=${id}`);
        editandoVehiculo = true;
        document.getElementById('formTitle').textContent = 'Editar Vehículo';
        document.getElementById('editId').value = id;
        document.getElementById('patente').value = vehiculo.patente;
        document.getElementById('numero_interno').value = vehiculo.numero_interno || '';
        document.getElementById('marca').value = vehiculo.marca;
        document.getElementById('modelo').value = vehiculo.modelo;
        document.getElementById('año').value = vehiculo.año || '';
        document.getElementById('tipo').value = vehiculo.tipo;
        document.getElementById('capacidad_ataudes').value = vehiculo.capacidad_ataudes;
        document.getElementById('capacidad_acompañantes').value = vehiculo.capacidad_acompañantes;
        document.getElementById('estado').value = vehiculo.estado;
        document.getElementById('activo').value = vehiculo.activo;
        document.getElementById('seguro_poliza').value = vehiculo.seguro_poliza || '';
        document.getElementById('seguro_vencimiento').value = vehiculo.seguro_vencimiento || '';
        document.getElementById('vtv_vencimiento').value = vehiculo.vtv_vencimiento || '';
        document.getElementById('formContainer').classList.remove('hidden');
    } catch (error) { alert('Error al cargar datos del vehículo'); }
}

async function guardarVehiculo(e) {
    e.preventDefault();
    const form = document.getElementById('vehiculoForm');
    let isValid = true;
    form.querySelectorAll('[required]').forEach(field => {
        if (!field.value.trim()) {
            field.classList.add('error');
            field.style.borderColor = '#e74c3c';
            isValid = false;
        } else {
            field.classList.remove('error');
            field.style.borderColor = '';
        }
    });
    if (!isValid) { alert('⚠️ Por favor, complete todos los campos obligatorios'); return; }
    
    const id = document.getElementById('editId').value;
    const data = {
        patente: document.getElementById('patente').value.toUpperCase(),
        numero_interno: document.getElementById('numero_interno').value,
        marca: document.getElementById('marca').value,
        modelo: document.getElementById('modelo').value,
        año: document.getElementById('año').value,
        tipo: document.getElementById('tipo').value,
        capacidad_ataudes: document.getElementById('capacidad_ataudes').value,
        capacidad_acompañantes: document.getElementById('capacidad_acompañantes').value,
        estado: document.getElementById('estado').value,
        activo: document.getElementById('activo').value,
        seguro_poliza: document.getElementById('seguro_poliza').value,
        seguro_vencimiento: document.getElementById('seguro_vencimiento').value,
        vtv_vencimiento: document.getElementById('vtv_vencimiento').value
    };
    try {
        if (id) await api.put(`vehiculos.php?id=${id}`, data);
        else await api.post('vehiculos.php', data);
        alert('Vehículo guardado exitosamente');
        ocultarFormularioVehiculo();
        loadVehiculos();
    } catch (error) { alert('Error al guardar vehículo'); }
}

async function eliminarVehiculo(id) {
    if (!confirm('¿Estás seguro de eliminar este vehículo?')) return;
    try {
        await api.delete(`vehiculos.php?id=${id}`);
        alert('Vehículo eliminado');
        loadVehiculos();
    } catch (error) { alert('Error al eliminar'); }
}

// ============================================
// 11. PROVEEDORES
// ============================================
let editandoProveedor = false;

async function loadProveedores() {
    try {
        const proveedores = await api.get('proveedores.php');
        const tbody = document.getElementById('tablaProveedores');
        if (!tbody) return;
        if (!proveedores || proveedores.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">No hay proveedores registrados</td></tr>';
            return;
        }
        tbody.innerHTML = proveedores.map(p => `
            <tr>
                <td>${p.id_proveedor}</td>
                <td>${p.razon_social}</td>
                <td>${p.cuit || '-'}</td>
                <td>${p.telefono || '-'}</td>
                <td>${p.contacto_nombre || 'N/A'}</td>
                <td><span class="${p.activo ? 'estado-activo' : 'estado-inactivo'}">${p.activo ? 'Activo' : 'Inactivo'}</span></td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="editarProveedor(${p.id_proveedor})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="eliminarProveedor(${p.id_proveedor})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (error) { console.error('Error:', error); }
}

function mostrarFormularioProveedor() {
    editandoProveedor = false;
    document.getElementById('formTitle').textContent = 'Nuevo Proveedor';
    document.getElementById('editId').value = '';
    document.getElementById('proveedorForm').reset();
    document.getElementById('formContainer').classList.remove('hidden');
}
function ocultarFormularioProveedor() { document.getElementById('formContainer').classList.add('hidden'); }

async function editarProveedor(id) {
    try {
        const proveedor = await api.get(`proveedores.php?id=${id}`);
        editandoProveedor = true;
        document.getElementById('formTitle').textContent = 'Editar Proveedor';
        document.getElementById('editId').value = id;
        document.getElementById('razon_social').value = proveedor.razon_social;
        document.getElementById('nombre_comercial').value = proveedor.nombre_comercial || '';
        document.getElementById('cuit').value = proveedor.cuit || '';
        document.getElementById('direccion').value = proveedor.direccion || '';
        document.getElementById('telefono').value = proveedor.telefono || '';
        document.getElementById('email').value = proveedor.email || '';
        document.getElementById('contacto_nombre').value = proveedor.contacto_nombre || '';
        document.getElementById('contacto_telefono').value = proveedor.contacto_telefono || '';
        document.getElementById('condicion_iva').value = proveedor.condicion_iva || '';
        document.getElementById('activo').value = proveedor.activo;
        document.getElementById('formContainer').classList.remove('hidden');
    } catch (error) { alert('Error al cargar datos del proveedor'); }
}

async function guardarProveedor(e) {
    e.preventDefault();
    const form = document.getElementById('proveedorForm');
    let isValid = true;
    form.querySelectorAll('[required]').forEach(field => {
        if (!field.value.trim()) {
            field.classList.add('error');
            field.style.borderColor = '#e74c3c';
            isValid = false;
        } else {
            field.classList.remove('error');
            field.style.borderColor = '';
        }
    });
    if (!isValid) { alert('⚠️ Por favor, complete todos los campos obligatorios'); return; }
    
    const id = document.getElementById('editId').value;
    const data = {
        razon_social: document.getElementById('razon_social').value,
        nombre_comercial: document.getElementById('nombre_comercial').value,
        cuit: document.getElementById('cuit').value,
        direccion: document.getElementById('direccion').value,
        telefono: document.getElementById('telefono').value,
        email: document.getElementById('email').value,
        contacto_nombre: document.getElementById('contacto_nombre').value,
        contacto_telefono: document.getElementById('contacto_telefono').value,
        condicion_iva: document.getElementById('condicion_iva').value,
        activo: document.getElementById('activo').value
    };
    try {
        if (id) await api.put(`proveedores.php?id=${id}`, data);
        else await api.post('proveedores.php', data);
        alert('Proveedor guardado exitosamente');
        ocultarFormularioProveedor();
        loadProveedores();
    } catch (error) { alert('Error al guardar proveedor'); }
}

async function eliminarProveedor(id) {
    if (!confirm('¿Estás seguro de eliminar este proveedor?')) return;
    try {
        await api.delete(`proveedores.php?id=${id}`);
        alert('Proveedor eliminado');
        loadProveedores();
    } catch (error) { alert('Error al eliminar'); }
}

// ============================================
// 12. REPORTES
// ============================================
let datosReporte = [];

async function loadReportes() {
    const hoy = new Date();
    const mesAtras = new Date();
    mesAtras.setMonth(mesAtras.getMonth() - 1);
    const fechaInicio = document.getElementById('fecha_inicio');
    const fechaFin = document.getElementById('fecha_fin');
    if (fechaInicio) fechaInicio.value = mesAtras.toISOString().split('T')[0];
    if (fechaFin) fechaFin.value = hoy.toISOString().split('T')[0];
    generarReporte();
}

async function generarReporte() {
    const fecha_inicio = document.getElementById('fecha_inicio').value;
    const fecha_fin = document.getElementById('fecha_fin').value;
    const tipo = document.getElementById('tipo_reporte').value;
    try {
        let url = `reportes.php?tipo=${tipo}`;
        if (fecha_inicio && fecha_fin) url += `&fecha_inicio=${fecha_inicio}&fecha_fin=${fecha_fin}`;
        datosReporte = await api.get(url);
        
        const thead = document.getElementById('theadReporte');
        const tbody = document.getElementById('tbodyReporte');
        if (!thead || !tbody) return;

        if (tipo === 'solicitudes') renderReporteSolicitudes(datosReporte, thead, tbody);
        else if (tipo === 'stock') renderReporteStock(datosReporte, thead, tbody);
        else if (tipo === 'empleados') renderReporteEmpleados(datosReporte, thead, tbody);
        else if (tipo === 'vehiculos') renderReporteVehiculos(datosReporte, thead, tbody);
    } catch (error) {
        console.error('Error:', error);
        alert('Error al generar el reporte');
    }
}

function renderReporteSolicitudes(data, thead, tbody) {
    thead.innerHTML = `<tr><th>N° Pedido</th><th>Fecha</th><th>Fallecido</th><th>Responsable</th><th>Servicio</th><th>Ataúd</th><th>Vehículo</th><th>Estado</th></tr>`;
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center">No hay datos para mostrar</td></tr>';
        return;
    }
    tbody.innerHTML = data.map(d => `
        <tr>
            <td>${d.nro_pedido}</td>
            <td>${new Date(d.fecha_solicitud).toLocaleDateString('es-AR')}</td>
            <td>${d.fallecido || 'N/A'}</td>
            <td>${d.responsable || 'N/A'}</td>
            <td>${d.tipo_servicio || 'N/A'}</td>
            <td>${d.ataud || 'Sin asignar'}</td>
            <td>${d.vehiculo || 'Sin asignar'}</td>
            <td><span class="estado-badge estado-${d.estado}">${d.estado.replace('_', ' ')}</span></td>
        </tr>
    `).join('');
}

function renderReporteStock(data, thead, tbody) {
    thead.innerHTML = `<tr><th>Código</th><th>Nombre</th><th>Stock Actual</th><th>Stock Mínimo</th><th>Estado</th></tr>`;
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No hay datos para mostrar</td></tr>';
        return;
    }
    tbody.innerHTML = data.map(d => {
        let estado = 'Normal', color = '#2ecc71';
        if (d.stock_actual <= 0) { estado = 'Sin Stock'; color = '#e74c3c'; }
        else if (d.stock_actual < d.stock_minimo) { estado = 'Bajo Stock'; color = '#f39c12'; }
        return `<tr><td>${d.codigo_renglon || '-'}</td><td>${d.nombre}</td><td>${d.stock_actual}</td><td>${d.stock_minimo}</td><td><span style="color:${color};font-weight:600">${estado}</span></td></tr>`;
    }).join('');
}

function renderReporteEmpleados(data, thead, tbody) {
    thead.innerHTML = `<tr><th>ID</th><th>Nombre</th><th>Usuario</th><th>Email</th><th>Teléfono</th><th>Rol</th><th>Estado</th></tr>`;
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">No hay datos para mostrar</td></tr>';
        return;
    }
    tbody.innerHTML = data.map(d => `<tr><td>${d.id_empleado}</td><td>${d.nombre} ${d.apellido}</td><td>${d.usuario}</td><td>${d.email}</td><td>${d.telefono}</td><td>${d.nombre_rol || 'N/A'}</td><td><span class="${d.activo ? 'estado-activo' : 'estado-inactivo'}">${d.activo ? 'Activo' : 'Inactivo'}</span></td></tr>`).join('');
}

function renderReporteVehiculos(data, thead, tbody) {
    thead.innerHTML = `<tr><th>ID</th><th>Patente</th><th>Marca/Modelo</th><th>Tipo</th><th>Estado</th><th>Activo</th></tr>`;
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">No hay datos para mostrar</td></tr>';
        return;
    }
    tbody.innerHTML = data.map(d => `<tr><td>${d.id_vehiculo}</td><td>${d.patente}</td><td>${d.marca} ${d.modelo}</td><td>${d.tipo}</td><td><span class="estado-badge estado-${d.estado}">${d.estado.replace('_', ' ')}</span></td><td><span class="${d.activo ? 'estado-activo' : 'estado-inactivo'}">${d.activo ? '✅' : '❌'}</span></td></tr>`).join('');
}

function exportarPDF() {
    if (!datosReporte || datosReporte.length === 0) { alert('No hay datos para exportar'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape', 'mm', 'a4');
    doc.setFontSize(18);
    doc.text('Reporte de Solicitudes - Servicios Funebres', 14, 20);
    doc.setFontSize(11);
    const fechaInicio = document.getElementById('fecha_inicio').value;
    const fechaFin = document.getElementById('fecha_fin').value;
    doc.text(`Período: ${fechaInicio} - ${fechaFin}`, 14, 28);
    
    const headers = [['N° Pedido', 'Fecha', 'Fallecido', 'Responsable', 'Servicio', 'Ataúd', 'Vehículo', 'Estado']];
    const rows = datosReporte.map(d => [d.nro_pedido, new Date(d.fecha_solicitud).toLocaleDateString('es-AR'), d.fallecido || 'N/A', d.responsable || 'N/A', d.tipo_servicio || 'N/A', d.ataud || 'Sin asignar', d.vehiculo || 'Sin asignar', d.estado.replace('_', ' ')]);
    
    doc.autoTable({ head: headers, body: rows, startY: 35, theme: 'grid', styles: { fontSize: 8 }, headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255] } });
    doc.save(`Reporte_Solicitudes_${new Date().toISOString().split('T')[0]}.pdf`);
}

function exportarExcel() {
    if (!datosReporte || datosReporte.length === 0) { alert('No hay datos para exportar'); return; }
    const data = datosReporte.map(d => ({ 'N° Pedido': d.nro_pedido, 'Fecha': new Date(d.fecha_solicitud).toLocaleDateString('es-AR'), 'Fallecido': d.fallecido || 'N/A', 'Responsable': d.responsable || 'N/A', 'Servicio': d.tipo_servicio || 'N/A', 'Ataúd': d.ataud || 'Sin asignar', 'Vehículo': d.vehiculo || 'Sin asignar', 'Estado': d.estado.replace('_', ' ') }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Solicitudes');
    XLSX.writeFile(wb, `Reporte_Solicitudes_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ============================================
// 13. INICIALIZACIÓN POR PÁGINA
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    const currentPage = getCurrentPage();
    if (!checkAuth()) return;
    initNavigation();
    
    switch(currentPage) {
        case 'login.html': initLogin(); break;
        case 'panel_datos.html': loadDashboard(); break;
        case 'solicitudes.html': loadSolicitudes(); break;
        case 'solicitud.html': 
            loadSolicitudDetalle();
            const form = document.getElementById('solicitudForm');
            if (form) form.addEventListener('submit', guardarCambiosSolicitud);
            break;
        case 'empleados.html': 
            loadEmpleados(); loadRoles();
            const empForm = document.getElementById('empleadoForm');
            if (empForm) empForm.addEventListener('submit', guardarEmpleado);
            break;
        case 'ataudes.html': 
            loadAtaudes();
            const ataudForm = document.getElementById('ataudForm');
            if (ataudForm) ataudForm.addEventListener('submit', guardarAtaud);
            break;
        case 'vehiculos.html': 
            loadVehiculos();
            const vehForm = document.getElementById('vehiculoForm');
            if (vehForm) vehForm.addEventListener('submit', guardarVehiculo);
            break;
        case 'proveedores.html': 
            loadProveedores();
            const provForm = document.getElementById('proveedorForm');
            if (provForm) provForm.addEventListener('submit', guardarProveedor);
            break;
        case 'reportes.html': loadReportes(); break;
        // NOTA: 'configuracion_sitio.html' tiene su propio script al final del archivo HTML, 
        // por lo que no necesita inicialización aquí para evitar conflictos.
    }
    
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
});

// Funciones globales para onclick
window.verSolicitud = verSolicitud;
window.editarSolicitud = editarSolicitud;
window.eliminarSolicitud = eliminarSolicitud;
window.editarEmpleado = editarEmpleado;
window.eliminarEmpleado = eliminarEmpleado;
window.mostrarFormularioEmpleado = mostrarFormularioEmpleado;
window.ocultarFormularioEmpleado = ocultarFormularioEmpleado;
window.editarVehiculo = editarVehiculo;
window.eliminarVehiculo = eliminarVehiculo;
window.mostrarFormularioVehiculo = mostrarFormularioVehiculo;
window.ocultarFormularioVehiculo = ocultarFormularioVehiculo;
window.editarProveedor = editarProveedor;
window.eliminarProveedor = eliminarProveedor;
window.mostrarFormularioProveedor = mostrarFormularioProveedor;
window.ocultarFormularioProveedor = ocultarFormularioProveedor;
window.generarReporte = generarReporte;
window.exportarPDF = exportarPDF;
window.exportarExcel = exportarExcel;
window.editarSolicitudDetalle = editarSolicitudDetalle;
window.cancelarEdicion = cancelarEdicion;

// ============================================
// 16. NAVEGACIÓN: MENÚ ACTIVO Y HAMBURGUESA
// ============================================
function initNavigation() {
    // 1. Resaltar enlace activo automáticamente
    const currentPage = window.location.pathname.split('/').pop() || 'panel_datos.html';
    const navLinks = document.querySelectorAll('.nav-links a');
    
    navLinks.forEach(link => {
        // Quitamos 'active' de todos por seguridad
        link.classList.remove('active');
        const href = link.getAttribute('href');
        
        // Si el href coincide con la página actual, lo marcamos
        if (href === currentPage) {
            link.classList.add('active');
        }
    });

    // 2. Lógica del Menú Hamburguesa (Mobile)
    const hamburger = document.getElementById('hamburgerBtn');
    const navLinksMenu = document.getElementById('navLinks');
    
    if (hamburger && navLinksMenu) {
        // Abrir/cerrar al hacer clic en el botón
        hamburger.addEventListener('click', function(e) {
            e.stopPropagation();
            navLinksMenu.classList.toggle('open');
            
            // Cambiar ícono de hamburguesa a X
            const icon = hamburger.querySelector('i');
            if (icon) {
                if (navLinksMenu.classList.contains('open')) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-times');
                } else {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });
        
        // Cerrar menú al hacer clic en un enlace (UX móvil)
        navLinksMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', function() {
                if (window.innerWidth <= 1024) { // Coincide con tu @media de style.css
                    navLinksMenu.classList.remove('open');
                    const icon = hamburger.querySelector('i');
                    if (icon) {
                        icon.classList.remove('fa-times');
                        icon.classList.add('fa-bars');
                    }
                }
            });
        });
        
        // Cerrar menú al hacer clic fuera de él
        document.addEventListener('click', function(e) {
            if (window.innerWidth <= 1024) {
                const isClickInside = navLinksMenu.contains(e.target) || hamburger.contains(e.target);
                if (!isClickInside && navLinksMenu.classList.contains('open')) {
                    navLinksMenu.classList.remove('open');
                    const icon = hamburger.querySelector('i');
                    if (icon) {
                        icon.classList.remove('fa-times');
                        icon.classList.add('fa-bars');
                    }
                }
            }
        });
    }
}

// ============================================
// CARGAR TOKEN CSRF DESDE LA COOKIE
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Buscar la cookie 'csrf_token' que establecimos en el login
    const csrfCookie = document.cookie.split('; ').find(row => row.startsWith('csrf_token='));
    
    if (csrfCookie) {
        const token = csrfCookie.split('=')[1];
        const csrfInput = document.getElementById('csrf_token');
        if (csrfInput) {
            csrfInput.value = token;
        }
    }
});

// ============================================
// VALIDACIONES EN TIEMPO REAL PARA EL PANEL DE ADMINISTRACIÓN
// ============================================
function aplicarReglasValidacionAdmin() {
    
    // 1. NOMBRES Y APELLIDOS (Solo letras, espacios, acentos y guiones)
    const camposNombre = document.querySelectorAll(
        '#nombre, #apellido, #razon_social, #nombre_comercial, #contacto_nombre, #nombreFuncionario'
    );
    camposNombre.forEach(input => {
        input.addEventListener('input', function() {
            this.value = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s\-]/g, '');
        });
    });

    // 2. LOCALIDADES, BARRIOS Y DIRECCIONES
    const camposUbicacion = document.querySelectorAll(
        '#direccion, #fuenteDireccion, #localidad, #barrio, #departamento, #provincia, #lugar_origen, #lugar_destino'
    );
    camposUbicacion.forEach(input => {
        input.addEventListener('input', function() {
            this.value = this.value.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\.\-]/g, '');
        });
    });

    // 3. TELÉFONOS (Solo números, espacios, guiones y el signo +)
    const camposTelefono = document.querySelectorAll(
        '#telefono, #telefonoSecundario, #contacto_telefono, #fuenteTelefono'
    );
    camposTelefono.forEach(input => {
        input.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9\s\-\+]/g, '');
        });
    });

    // 4. CORREOS ELECTRÓNICOS (Validación al salir del campo)
    const camposEmail = document.querySelectorAll(
        '#email, #emailNotificaciones, #contacto_email'
    );
    camposEmail.forEach(input => {
        input.addEventListener('blur', function() {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (this.value && !emailRegex.test(this.value)) {
                this.style.borderColor = '#e74c3c'; // Rojo
            } else {
                this.style.borderColor = ''; // Resetear
            }
        });
        input.addEventListener('input', function() {
            if (this.style.borderColor === 'rgb(231, 76, 60)') {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (emailRegex.test(this.value)) this.style.borderColor = '';
            }
        });
    });

    // 5. CAMPOS NUMÉRICOS PUROS (Año, Stock, Orden, Capacidad, CUIT)
    const camposNumericos = document.querySelectorAll(
        '#año, #stock_actual, #stock_minimo, #fuenteOrden, #capacidad_ataudes, #capacidad_acompañantes, #cuit'
    );
    camposNumericos.forEach(input => {
        input.addEventListener('input', function() {
            // Para CUIT permitimos guiones, para el resto solo números
            if (this.id === 'cuit') {
                this.value = this.value.replace(/[^0-9\-]/g, '');
            } else {
                this.value = this.value.replace(/[^0-9]/g, '');
            }
        });
    });
}

// Ejecutar la validación cada vez que se carga una página del panel
document.addEventListener('DOMContentLoaded', aplicarReglasValidacionAdmin);