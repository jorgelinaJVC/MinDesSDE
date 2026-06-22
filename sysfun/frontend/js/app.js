/**
 * ============================================
 * SISTEMA FUNEBRE - JavaScript UNIFICADO
 * ============================================
 * Versión: 1.0
 * Descripción: Controla toda la lógica del frontend
 * ============================================
 */

// ============================================
// 1. CONFIGURACIÓN Y API CLIENT
// ============================================

const API_BASE_URL = 'http://localhost:8000/backend/api/';

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

    get(endpoint) {
        return this.request(endpoint, 'GET');
    }

    post(endpoint, data) {
        return this.request(endpoint, 'POST', data);
    }

    put(endpoint, data) {
        return this.request(endpoint, 'PUT', data);
    }

    delete(endpoint) {
        return this.request(endpoint, 'DELETE');
    }
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
        'dashboard.html', 'solicitudes.html', 'empleados.html',
        'ataudes.html', 'vehiculos.html', 'proveedores.html',
        'reportes.html', 'solicitud.html'
    ];
    
    if (currentPage === 'login.html' || currentPage === 'index.html') {
        return true;
    }
    
    if (protectedPages.includes(currentPage)) {
        const userData = sessionStorage.getItem('user_data');
        if (userData) {
            try {
                window._userData = JSON.parse(userData);
                return true;
            } catch (e) {
                console.error('Error al parsear user_data:', e);
            }
        }
        
        window.location.href = 'login.html';
        return false;
    }
    
    return true;
}

function getUserData() {
    if (window._userData) {
        return window._userData;
    }
    
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
    console.log('Cerrando sesión...');
    try {
        await fetch('http://localhost:8000/backend/api/logout.php', {
            method: 'POST',
            credentials: 'include'
        });
    } catch (e) {
        // Ignorar errores en logout
    }
    
    window._userData = null;
    sessionStorage.removeItem('user_data');
    window.location.href = 'login.html';
}

// ============================================
// 2.1. FUNCIONES DE LOADING - ¡AGREGADAS!
// ============================================

function showLoading(button, text) {
    console.log('🔹 showLoading ejecutado');
    if (button) {
        button.disabled = true;
        button.textContent = text || 'Cargando...';
        button.classList.add('loading');
    }
}

function hideLoading(button, text) {
    console.log('🔹 hideLoading ejecutado');
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
    if (!loginForm) {
        console.error('❌ Formulario de login no encontrado');
        return;
    }

    console.log('✅ Formulario de login inicializado');

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('🔹 Submit capturado');
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        const errorDiv = document.getElementById('errorMessage');
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        
        console.log('🔹 Usuario:', username);
        
        errorDiv.classList.remove('show');
        errorDiv.textContent = '';
        
        if (!username || !password) {
            errorDiv.textContent = 'Por favor, complete todos los campos';
            errorDiv.classList.add('show');
            return;
        }
        
        try {
            showLoading(submitBtn, 'Iniciando...');
            console.log('🔹 Enviando petición a auth.php...');
            
            const response = await fetch('http://localhost:8000/backend/api/auth.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ 
                    username: username, 
                    password: password 
                })
            });
            
            console.log('🔹 Status:', response.status);
            
            const textResponse = await response.text();
            console.log('🔹 Respuesta RAW (primeros 100 chars):', textResponse.substring(0, 100));
            
            let data;
            try {
                data = JSON.parse(textResponse);
                console.log('🔹 JSON parseado correctamente');
            } catch (parseError) {
                console.error('❌ Error al parsear JSON:', parseError);
                console.error('❌ Respuesta completa:', textResponse);
                throw new Error('El servidor devolvió una respuesta inválida');
            }
            
            if (data.success) {
                console.log('✅ Login exitoso!');
                window._userData = data.user;
                sessionStorage.setItem('user_data', JSON.stringify(data.user));
                window.location.href = 'dashboard.html';
            } else {
                errorDiv.textContent = data.message || 'Credenciales incorrectas';
                errorDiv.classList.add('show');
                console.log('❌ Login fallido:', data.message);
                hideLoading(submitBtn, 'Iniciar Sesión');
            }
        } catch (error) {
            console.error('❌ Error en fetch:', error);
            console.error('❌ Tipo:', error.constructor.name);
            console.error('❌ Mensaje:', error.message);
            
            if (error.message.includes('JSON')) {
                errorDiv.textContent = 'Error: El servidor no devolvió JSON válido';
            } else if (error.message.includes('Failed to fetch')) {
                errorDiv.textContent = 'Error: No se puede conectar al servidor (¿está iniciado?)';
            } else {
                errorDiv.textContent = 'Error de conexión con el servidor. Revisa la consola.';
            }
            errorDiv.classList.add('show');
            hideLoading(submitBtn, 'Iniciar Sesión');
        }
    });

    // FIX: Listener directo al botón
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('🔹 Click directo en el botón');
            const event = new Event('submit', { bubbles: true, cancelable: true });
            loginForm.dispatchEvent(event);
        });
    } else {
        console.warn('⚠️ Botón con id="loginBtn" no encontrado');
    }
}

// ============================================
// 4. DASHBOARD
// ============================================

async function loadDashboard() {
    const userData = getUserData();
    const userName = document.getElementById('userName');
    if (userName && userData) {
        userName.textContent = userData.usuario || 'Usuario';
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
        const pendientes = estados.filter(e => e.estado === 'PENDIENTE' || e.estado === 'EN_REVISION')
            .reduce((sum, e) => sum + e.total, 0);
        const completados = estados.filter(e => e.estado === 'COMPLETADO')
            .reduce((sum, e) => sum + e.total, 0);
        
        document.getElementById('totalSolicitudes').textContent = total;
        document.getElementById('solicitudesPendientes').textContent = pendientes;
        document.getElementById('solicitudesCompletadas').textContent = completados;
        
        const stockCritico = (stats.stock || [])
            .filter(s => s.estado_stock === 'Sin Stock' || s.estado_stock === 'Bajo Stock')
            .reduce((sum, s) => sum + s.total, 0);
        document.getElementById('stockCritico').textContent = stockCritico;
        
        if (typeof Chart !== 'undefined' && document.getElementById('chartEstados')) {
            initCharts(stats);
        }
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
                <td>
                    <button class="btn btn-primary btn-sm" onclick="verSolicitud(${s.id_solicitud})">Ver</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error al cargar solicitudes recientes:', error);
    }
}

function verSolicitud(id) {
    window.location.href = `solicitud.html?id=${id}`;
}

async function loadAdditionalStats() {
    try {
        const [empleados, vehiculos, ataudes, proveedores, solicitudes] = await Promise.all([
            api.get('empleados.php'),
            api.get('vehiculos.php'),
            api.get('ataudes.php'),
            api.get('proveedores.php'),
            api.get('solicitudes.php')
        ]);
        
        const empleadosActivos = (empleados || []).filter(e => e.activo == 1).length;
        document.getElementById('totalEmpleados').textContent = empleadosActivos;
        
        const vehiculosDisponibles = (vehiculos || []).filter(v => v.estado === 'DISPONIBLE').length;
        document.getElementById('totalVehiculos').textContent = vehiculosDisponibles;
        
        const stockTotal = (ataudes || []).reduce((sum, a) => sum + parseInt(a.stock_actual || 0), 0);
        document.getElementById('totalAtaudes').textContent = stockTotal;
        
        const proveedoresActivos = (proveedores || []).filter(p => p.activo == 1).length;
        document.getElementById('totalProveedores').textContent = proveedoresActivos;
        
        const serviciosRealizados = (solicitudes || []).filter(s => s.estado === 'COMPLETADO').length;
        document.getElementById('totalServicios').textContent = serviciosRealizados;
        
        const total = (solicitudes || []).length;
        const completados = serviciosRealizados;
        const eficiencia = total > 0 ? Math.round((completados / total) * 100) : 0;
        document.getElementById('tasaEficiencia').textContent = eficiencia + '%';
        
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
        const estados = stats.estados || [];
        new Chart(ctx1, {
            type: 'doughnut',
            data: {
                labels: estados.map(e => e.estado.replace('_', ' ')),
                datasets: [{
                    data: estados.map(e => e.total),
                    backgroundColor: ['#ffeaa7', '#74b9ff', '#a29bfe', '#fd79a8', '#55efc4', '#ff7675'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }
    
    const ctx2 = document.getElementById('chartMensual');
    if (ctx2) {
        const mensual = stats.mensual || [];
        const meses = mensual.map(m => {
            const [year, month] = m.mes.split('-');
            const nombres = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
            return `${nombres[parseInt(month)-1]} ${year}`;
        });
        new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: meses,
                datasets: [{
                    label: 'Solicitudes',
                    data: mensual.map(m => m.total),
                    backgroundColor: '#3498db',
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } }
            }
        });
    }
    
    const ctx3 = document.getElementById('chartStock');
    if (ctx3) {
        const stock = stats.stock || [];
        const coloresStock = { 'Normal': '#2ecc71', 'Bajo Stock': '#f39c12', 'Sin Stock': '#e74c3c' };
        new Chart(ctx3, {
            type: 'pie',
            data: {
                labels: stock.map(s => s.estado_stock),
                datasets: [{
                    data: stock.map(s => s.total),
                    backgroundColor: stock.map(s => coloresStock[s.estado_stock] || '#95a5a6'),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }
    
    const ctx4 = document.getElementById('chartTopAtaudes');
    if (ctx4) {
        const topAtaudes = stats.top_ataudes || [];
        new Chart(ctx4, {
            type: 'bar',
            data: {
                labels: topAtaudes.map(a => a.nombre),
                datasets: [{
                    label: 'Veces Usado',
                    data: topAtaudes.map(a => a.total),
                    backgroundColor: '#9b59b6',
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { x: { beginAtZero: true } }
            }
        });
    }
    
    const ctx5 = document.getElementById('chartTiposServicio');
    if (ctx5) {
        const tiposServicio = stats.tipos_servicio || [];
        new Chart(ctx5, {
            type: 'doughnut',
            data: {
                labels: tiposServicio.map(t => t.tipo_servicio || 'No especificado'),
                datasets: [{
                    data: tiposServicio.map(t => t.total),
                    backgroundColor: ['#3498db', '#2ecc71', '#f39c12', '#e74c3c', '#9b59b6', '#1abc9c'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'bottom' } }
            }
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
                    <button class="btn btn-primary btn-sm" onclick="verSolicitud(${s.id_solicitud})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-warning btn-sm" onclick="editarSolicitud(${s.id_solicitud})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="eliminarSolicitud(${s.id_solicitud})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error al cargar solicitudes:', error);
        document.getElementById('tablaSolicitudes').innerHTML = 
            '<tr><td colspan="7" style="text-align:center;color:red">Error al cargar datos</td></tr>';
    }
}

function editarSolicitud(id) {
    window.location.href = `solicitud.html?id=${id}`;
}

async function eliminarSolicitud(id) {
    const confirmar = confirm('⚠️ ¿Estás seguro de eliminar esta solicitud?\n\nEsta acción no se puede deshacer.');
    if (!confirmar) return;
    
    const buttons = document.querySelectorAll(`button[onclick*="eliminarSolicitud(${id})"]`);
    buttons.forEach(btn => {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    });
    
    try {
        const response = await api.delete(`solicitudes.php?id=${id}`);
        if (response.message || response.success !== false) {
            alert('✅ Solicitud eliminada exitosamente');
            await loadSolicitudes();
        } else {
            alert('❌ Error al eliminar: ' + (response.message || 'Error desconocido'));
        }
    } catch (error) {
        alert('❌ Error de conexión al eliminar');
        console.error(error);
    } finally {
        buttons.forEach(btn => {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-trash"></i>';
        });
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
    
    console.log('🔹 ID de solicitud:', solicitudId);
    
    if (!solicitudId) {
        alert('ID de solicitud no especificado');
        window.location.href = 'solicitudes.html';
        return;
    }
    
    try {
        console.log('🔹 Cargando detalle de solicitud ID:', solicitudId);
        const data = await api.get(`solicitud_detalle.php?id=${solicitudId}`);
        console.log('🔹 Datos recibidos:', data);
        
        if (data.message) {
            alert(data.message);
            window.location.href = 'solicitudes.html';
            return;
        }
        detalleData = data;
        renderDetalle(data);
        await cargarSelectores(data);
    } catch (error) {
        console.error('❌ Error:', error);
        alert('Error al cargar el detalle');
    }
}

function renderDetalle(data) {
    // N° Pedido
    document.getElementById('nroPedido').textContent = `#${data.nro_pedido}`;
    document.getElementById('det_nro_pedido').textContent = data.nro_pedido;
    document.getElementById('det_fecha').textContent = new Date(data.fecha_solicitud).toLocaleDateString('es-AR');
    document.getElementById('det_estado').innerHTML = 
        `<span class="estado-badge estado-${data.estado}">${data.estado.replace('_', ' ')}</span>`;
    document.getElementById('det_tipo').textContent = data.tipo_servicio;
    document.getElementById('det_origen').textContent = data.origen || 'WEB';
    
    // Fallecido - Combinar nombre y apellido
    const fallecidoNombre = data.fallecido_nombre || '';
    const fallecidoApellido = data.fallecido_apellido || '';
    document.getElementById('det_fallecido').textContent = `${fallecidoNombre} ${fallecidoApellido}`.trim() || 'No especificado';
    document.getElementById('det_fallecido_dni').textContent = data.fallecido_dni || 'No especificado';
    document.getElementById('det_fecha_fallecimiento').textContent = 
        data.fecha_fallecimiento ? new Date(data.fecha_fallecimiento).toLocaleDateString('es-AR') : 'No especificado';
    document.getElementById('det_departamento').textContent = data.fallecido_departamento || 'No especificado';
    document.getElementById('det_domicilio').textContent = data.fallecido_domicilio || 'No especificado';
    
    // Responsable - Combinar nombre y apellido
    const respNombre = data.responsable_nombre || '';
    const respApellido = data.responsable_apellido || '';
    document.getElementById('det_responsable').textContent = `${respNombre} ${respApellido}`.trim() || 'No especificado';
    document.getElementById('det_responsable_dni').textContent = data.responsable_dni || 'No especificado';
    document.getElementById('det_responsable_telefono').textContent = data.responsable_telefono || 'No especificado';
    document.getElementById('det_responsable_email').textContent = data.responsable_email || 'No especificado';
    
    // Asignaciones
    document.getElementById('det_ataud').textContent = data.ataud_nombre ? 
        `${data.ataud_nombre} (Cód: ${data.ataud_codigo})` : 'Sin asignar';
    document.getElementById('det_vehiculo').textContent = data.vehiculo_patente ? 
        `${data.vehiculo_marca} ${data.vehiculo_modelo} - ${data.vehiculo_patente}` : 'Sin asignar';
    document.getElementById('det_chofer').textContent = data.chofer_nombre || 'Sin asignar';
    document.getElementById('det_procesado').textContent = data.procesado_por_nombre || 'No procesado';
    
    // Documentos
    document.getElementById('det_certificado').textContent = data.certificado_defuncion ? '✅ Entregado' : '❌ No entregado';
    document.getElementById('det_dni_fallecido').textContent = data.dni_fallecido ? '✅ Entregado' : '❌ No entregado';
    document.getElementById('det_docs_extra').textContent = data.documentos_extra ? '✅ Entregado' : '❌ No entregado';
    
    // Observaciones
    document.getElementById('det_observaciones').textContent = data.observaciones || 'Sin observaciones';
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
                    <button class="btn btn-warning btn-sm" onclick="editarEmpleado(${e.id_empleado})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="eliminarEmpleado(${e.id_empleado})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error al cargar empleados:', error);
    }
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
    } catch (error) {
        console.error('Error al cargar roles:', error);
    }
}

function mostrarFormularioEmpleado() {
    editandoEmpleado = false;
    document.getElementById('formTitle').textContent = 'Nuevo Empleado';
    document.getElementById('editId').value = '';
    document.getElementById('empleadoForm').reset();
    document.getElementById('password').required = true;
    document.getElementById('formContainer').classList.remove('hidden');
}

function ocultarFormularioEmpleado() {
    document.getElementById('formContainer').classList.add('hidden');
}

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
    } catch (error) {
        alert('Error al cargar datos del empleado');
    }
}

async function guardarEmpleado(e) {
    e.preventDefault();

    const form = document.getElementById('empleadoForm');
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        field.classList.remove('error');
        field.style.borderColor = '';
    });
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.classList.add('error');
            field.style.borderColor = '#e74c3c';
            isValid = false;
        }
    });
    
    if (!isValid) {
        alert('⚠️ Por favor, complete todos los campos obligatorios');
        const firstError = form.querySelector('.error');
        if (firstError) firstError.focus();
        return;
    }
    
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
        if (id) {
            await api.put(`empleados.php?id=${id}`, data);
        } else {
            await api.post('empleados.php', data);
        }
        alert('Empleado guardado exitosamente');
        ocultarFormularioEmpleado();
        loadEmpleados();
    } catch (error) {
        alert('Error al guardar empleado');
    }
}

async function eliminarEmpleado(id) {
    if (confirm('¿Estás seguro de eliminar este empleado?')) {
        try {
            await api.delete(`empleados.php?id=${id}`);
            alert('Empleado eliminado');
            loadEmpleados();
        } catch (error) {
            alert('Error al eliminar');
        }
    }
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
                <td>
                    <span class="${a.stock_actual <= 0 ? 'estado-inactivo' : a.stock_actual < a.stock_minimo ? 'estado-activo' : ''}">
                        ${a.stock_actual <= 0 ? 'Sin Stock' : a.stock_actual < a.stock_minimo ? '⚠️ Bajo Stock' : '✅ Disponible'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="editarAtaud(${a.id_ataud})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="eliminarAtaud(${a.id_ataud})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error al cargar ataudes:', error);
        document.getElementById('tablaAtaudes').innerHTML = 
            '<tr><td colspan="7" style="text-align:center;color:red">Error al cargar los datos</td></tr>';
    }
}

function mostrarFormularioAtaud() {
    editandoAtaud = false;
    document.getElementById('formTitle').textContent = 'Nuevo Ataúd';
    document.getElementById('editId').value = '';
    document.getElementById('ataudForm').reset();
    document.getElementById('formContainer').classList.remove('hidden');
}

function ocultarFormularioAtaud() {
    document.getElementById('formContainer').classList.add('hidden');
}

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
    } catch (error) {
        alert('Error al cargar datos del ataúd');
    }
}

async function guardarAtaud(e) {
    e.preventDefault();
    const form = document.getElementById('ataudForm');
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        field.classList.remove('error');
        field.style.borderColor = '';
        if (!field.value.trim()) {
            field.classList.add('error');
            field.style.borderColor = '#e74c3c';
            isValid = false;
        }
    });
    
    if (!isValid) {
        alert('⚠️ Por favor, complete todos los campos obligatorios');
        const firstError = form.querySelector('.error');
        if (firstError) firstError.focus();
        return;
    }
    
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
        if (id) {
            await api.put(`ataudes.php?id=${id}`, data);
        } else {
            await api.post('ataudes.php', data);
        }
        alert('Ataúd guardado exitosamente');
        ocultarFormularioAtaud();
        loadAtaudes();
    } catch (error) {
        alert('Error al guardar ataúd');
    }
}

async function eliminarAtaud(id) {
    if (!confirm('⚠️ ¿Estás seguro de eliminar este ataúd?')) return;
    
    try {
        await api.delete(`ataudes.php?id=${id}`);
        alert('Ataúd eliminado');
        loadAtaudes();
    } catch (error) {
        alert('Error al eliminar');
    }
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
                    <button class="btn btn-warning btn-sm" onclick="editarVehiculo(${v.id_vehiculo})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="eliminarVehiculo(${v.id_vehiculo})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error:', error);
    }
}

function mostrarFormularioVehiculo() {
    editandoVehiculo = false;
    document.getElementById('formTitle').textContent = 'Nuevo Vehículo';
    document.getElementById('editId').value = '';
    document.getElementById('vehiculoForm').reset();
    document.getElementById('formContainer').classList.remove('hidden');
}

function ocultarFormularioVehiculo() {
    document.getElementById('formContainer').classList.add('hidden');
}

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
    } catch (error) {
        alert('Error al cargar datos del vehículo');
    }
}

async function guardarVehiculo(e) {
    e.preventDefault();
    const form = document.getElementById('vehiculoForm');
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        field.classList.remove('error');
        field.style.borderColor = '';
        if (!field.value.trim()) {
            field.classList.add('error');
            field.style.borderColor = '#e74c3c';
            isValid = false;
        }
    });
    
    if (!isValid) {
        alert('⚠️ Por favor, complete todos los campos obligatorios');
        const firstError = form.querySelector('.error');
        if (firstError) firstError.focus();
        return;
    }
    
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
        if (id) {
            await api.put(`vehiculos.php?id=${id}`, data);
        } else {
            await api.post('vehiculos.php', data);
        }
        alert('Vehículo guardado exitosamente');
        ocultarFormularioVehiculo();
        loadVehiculos();
    } catch (error) {
        alert('Error al guardar vehículo');
    }
}

async function eliminarVehiculo(id) {
    if (confirm('¿Estás seguro de eliminar este vehículo?')) {
        try {
            await api.delete(`vehiculos.php?id=${id}`);
            alert('Vehículo eliminado');
            loadVehiculos();
        } catch (error) {
            alert('Error al eliminar');
        }
    }
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
                    <button class="btn btn-warning btn-sm" onclick="editarProveedor(${p.id_proveedor})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="eliminarProveedor(${p.id_proveedor})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error:', error);
    }
}

function mostrarFormularioProveedor() {
    editandoProveedor = false;
    document.getElementById('formTitle').textContent = 'Nuevo Proveedor';
    document.getElementById('editId').value = '';
    document.getElementById('proveedorForm').reset();
    document.getElementById('formContainer').classList.remove('hidden');
}

function ocultarFormularioProveedor() {
    document.getElementById('formContainer').classList.add('hidden');
}

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
    } catch (error) {
        alert('Error al cargar datos del proveedor');
    }
}

async function guardarProveedor(e) {
    e.preventDefault();
    const form = document.getElementById('proveedorForm');
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        field.classList.remove('error');
        field.style.borderColor = '';
        if (!field.value.trim()) {
            field.classList.add('error');
            field.style.borderColor = '#e74c3c';
            isValid = false;
        }
    });
    
    if (!isValid) {
        alert('⚠️ Por favor, complete todos los campos obligatorios');
        const firstError = form.querySelector('.error');
        if (firstError) firstError.focus();
        return;
    }
    
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
        if (id) {
            await api.put(`proveedores.php?id=${id}`, data);
        } else {
            await api.post('proveedores.php', data);
        }
        alert('Proveedor guardado exitosamente');
        ocultarFormularioProveedor();
        loadProveedores();
    } catch (error) {
        alert('Error al guardar proveedor');
    }
}

async function eliminarProveedor(id) {
    if (confirm('¿Estás seguro de eliminar este proveedor?')) {
        try {
            await api.delete(`proveedores.php?id=${id}`);
            alert('Proveedor eliminado');
            loadProveedores();
        } catch (error) {
            alert('Error al eliminar');
        }
    }
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
        if (fecha_inicio && fecha_fin) {
            url += `&fecha_inicio=${fecha_inicio}&fecha_fin=${fecha_fin}`;
        }
        const data = await api.get(url);
        datosReporte = data;

        const thead = document.getElementById('theadReporte');
        const tbody = document.getElementById('tbodyReporte');
        
        if (!thead || !tbody) return;

        if (tipo === 'solicitudes') {
            renderReporteSolicitudes(data, thead, tbody);
        } else if (tipo === 'stock') {
            renderReporteStock(data, thead, tbody);
        } else if (tipo === 'empleados') {
            renderReporteEmpleados(data, thead, tbody);
        } else if (tipo === 'vehiculos') {
            renderReporteVehiculos(data, thead, tbody);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al generar el reporte');
    }
}

function renderReporteSolicitudes(data, thead, tbody) {
    thead.innerHTML = `
        <tr>
            <th>N° Pedido</th><th>Fecha</th><th>Fallecido</th>
            <th>Responsable</th><th>Servicio</th><th>Ataúd</th>
            <th>Vehículo</th><th>Estado</th>
        </tr>
    `;
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center">No hay datos para mostrar</td></tr>';
        actualizarResumenReporte([]);
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
    actualizarResumenReporte(data);
}

function renderReporteStock(data, thead, tbody) {
    thead.innerHTML = `
        <tr><th>Código</th><th>Nombre</th><th>Stock Actual</th><th>Stock Mínimo</th><th>Estado</th></tr>
    `;
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No hay datos para mostrar</td></tr>';
        return;
    }
    tbody.innerHTML = data.map(d => {
        let estado = 'Normal', color = '#2ecc71';
        if (d.stock_actual <= 0) { estado = 'Sin Stock'; color = '#e74c3c'; }
        else if (d.stock_actual < d.stock_minimo) { estado = 'Bajo Stock'; color = '#f39c12'; }
        return `
            <tr>
                <td>${d.codigo_renglon || '-'}</td>
                <td>${d.nombre}</td>
                <td>${d.stock_actual}</td>
                <td>${d.stock_minimo}</td>
                <td><span style="color:${color};font-weight:600">${estado}</span></td>
            </tr>
        `;
    }).join('');
}

function renderReporteEmpleados(data, thead, tbody) {
    thead.innerHTML = `
        <tr><th>ID</th><th>Nombre</th><th>Usuario</th><th>Email</th><th>Teléfono</th><th>Rol</th><th>Estado</th></tr>
    `;
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">No hay datos para mostrar</td></tr>';
        return;
    }
    tbody.innerHTML = data.map(d => `
        <tr>
            <td>${d.id_empleado}</td>
            <td>${d.nombre} ${d.apellido}</td>
            <td>${d.usuario}</td>
            <td>${d.email}</td>
            <td>${d.telefono}</td>
            <td>${d.nombre_rol || 'N/A'}</td>
            <td><span class="${d.activo ? 'estado-activo' : 'estado-inactivo'}">${d.activo ? 'Activo' : 'Inactivo'}</span></td>
        </tr>
    `).join('');
}

function renderReporteVehiculos(data, thead, tbody) {
    thead.innerHTML = `
        <tr><th>ID</th><th>Patente</th><th>Marca/Modelo</th><th>Tipo</th><th>Estado</th><th>Activo</th></tr>
    `;
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">No hay datos para mostrar</td></tr>';
        return;
    }
    tbody.innerHTML = data.map(d => `
        <tr>
            <td>${d.id_vehiculo}</td>
            <td>${d.patente}</td>
            <td>${d.marca} ${d.modelo}</td>
            <td>${d.tipo}</td>
            <td><span class="estado-badge estado-${d.estado}">${d.estado.replace('_', ' ')}</span></td>
            <td><span class="${d.activo ? 'estado-activo' : 'estado-inactivo'}">${d.activo ? '✅' : '❌'}</span></td>
        </tr>
    `).join('');
}

function actualizarResumenReporte(data) {
    const totalEl = document.getElementById('totalRegistros');
    const pendientesEl = document.getElementById('totalPendientes');
    const completadosEl = document.getElementById('totalCompletados');
    const anuladosEl = document.getElementById('totalAnulados');
    
    if (totalEl) totalEl.textContent = data.length;
    if (pendientesEl) {
        const pendientes = data.filter(d => d.estado === 'PENDIENTE' || d.estado === 'EN_REVISION').length;
        pendientesEl.textContent = pendientes;
    }
    if (completadosEl) {
        const completados = data.filter(d => d.estado === 'COMPLETADO').length;
        completadosEl.textContent = completados;
    }
    if (anuladosEl) {
        const anulados = data.filter(d => d.estado === 'ANULADO').length;
        anuladosEl.textContent = anulados;
    }
}


// ============================================
// 13. EXPORTAR REPORTES (PDF, Excel, CSV)
// ============================================

function exportarPDF() {
    if (!datosReporte || datosReporte.length === 0) {
        alert('No hay datos para exportar');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape', 'mm', 'a4');

    doc.setFontSize(18);
    doc.setTextColor(44, 62, 80);
    doc.text('Reporte de Solicitudes - Servicios Funebres', 14, 20);

    doc.setFontSize(11);
    doc.setTextColor(100);
    const fechaInicio = document.getElementById('fecha_inicio').value;
    const fechaFin = document.getElementById('fecha_fin').value;
    doc.text(`Período: ${fechaInicio} - ${fechaFin}`, 14, 28);

    const headers = [['N° Pedido', 'Fecha', 'Fallecido', 'Responsable', 'Servicio', 'Ataúd', 'Vehículo', 'Estado']];
    const rows = datosReporte.map(d => [
        d.nro_pedido,
        new Date(d.fecha_solicitud).toLocaleDateString('es-AR'),
        d.fallecido || 'N/A',
        d.responsable || 'N/A',
        d.tipo_servicio || 'N/A',
        d.ataud || 'Sin asignar',
        d.vehiculo || 'Sin asignar',
        d.estado.replace('_', ' ')
    ]);

    doc.autoTable({
        head: headers,
        body: rows,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255] }
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Generado: ${new Date().toLocaleString('es-AR')} - Página ${i}/${pageCount}`, 14, doc.internal.pageSize.height - 10);
    }

    doc.save(`Reporte_Solicitudes_${new Date().toISOString().split('T')[0]}.pdf`);
}

function exportarExcel() {
    if (!datosReporte || datosReporte.length === 0) {
        alert('No hay datos para exportar');
        return;
    }

    const data = datosReporte.map(d => ({
        'N° Pedido': d.nro_pedido,
        'Fecha': new Date(d.fecha_solicitud).toLocaleDateString('es-AR'),
        'Fallecido': d.fallecido || 'N/A',
        'Responsable': d.responsable || 'N/A',
        'Servicio': d.tipo_servicio || 'N/A',
        'Ataúd': d.ataud || 'Sin asignar',
        'Vehículo': d.vehiculo || 'Sin asignar',
        'Estado': d.estado.replace('_', ' ')
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Solicitudes');
    XLSX.writeFile(wb, `Reporte_Solicitudes_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function exportarCSV() {
    if (!datosReporte || datosReporte.length === 0) {
        alert('No hay datos para exportar');
        return;
    }

    const headers = ['N° Pedido', 'Fecha', 'Fallecido', 'Responsable', 'Servicio', 'Ataúd', 'Vehículo', 'Estado'];
    const rows = datosReporte.map(d => [
        d.nro_pedido,
        new Date(d.fecha_solicitud).toLocaleDateString('es-AR'),
        d.fallecido || 'N/A',
        d.responsable || 'N/A',
        d.tipo_servicio || 'N/A',
        d.ataud || 'Sin asignar',
        d.vehiculo || 'Sin asignar',
        d.estado.replace('_', ' ')
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Reporte_Solicitudes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}


// ============================================
// 14. INICIALIZACIÓN POR PÁGINA
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const currentPage = getCurrentPage();
    if (!checkAuth()) return;
    initHamburgerMenu();
    switch(currentPage) {
        case 'login.html':
            initLogin();
            break;
            
        case 'dashboard.html':
            loadDashboard();
            break;
            
        case 'nueva_sol.html':
            break;    
            
        case 'solicitudes.html':
            loadSolicitudes();
            break;
            
        case 'solicitud.html':
            loadSolicitudDetalle();
            const form = document.getElementById('solicitudForm');
            if (form) {
                form.addEventListener('submit', guardarCambiosSolicitud);
            }
            break;
            
        case 'empleados.html':
            loadEmpleados();
            loadRoles();
            const empForm = document.getElementById('empleadoForm');
            if (empForm) {
                empForm.addEventListener('submit', guardarEmpleado);
            }
            break;
            
        case 'ataudes.html':
            loadAtaudes();
            break;
            
        case 'vehiculos.html':
            loadVehiculos();
            const vehForm = document.getElementById('vehiculoForm');
            if (vehForm) {
                vehForm.addEventListener('submit', guardarVehiculo);
            }
            break;
            
        case 'proveedores.html':
            loadProveedores();
            const provForm = document.getElementById('proveedorForm');
            if (provForm) {
                provForm.addEventListener('submit', guardarProveedor);
            }
            break;
            
        case 'reportes.html':
            loadReportes();
            break;
            
        default:
            console.log('Página sin inicialización específica:', currentPage);
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
window.exportarCSV = exportarCSV;
window.editarSolicitudDetalle = editarSolicitudDetalle;
window.cancelarEdicion = cancelarEdicion;

// ============================================
// 15. FUNCIÓN PARA EL MENÚ HAMBURGUESA
// ============================================

function initHamburgerMenu() {
    const hamburger = document.getElementById('hamburgerBtn');
    const navLinks = document.getElementById('navLinks');
    
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', function(e) {
            e.stopPropagation();
            navLinks.classList.toggle('open');
        });
        
        // Cerrar menú al hacer clic en un enlace
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', function() {
                if (window.innerWidth <= 768) {
                    navLinks.classList.remove('open');
                }
            });
        });
        
        // Cerrar menú al hacer clic fuera
        document.addEventListener('click', function(e) {
            if (window.innerWidth <= 768) {
                const isClickInside = navLinks.contains(e.target) || hamburger.contains(e.target);
                if (!isClickInside) {
                    navLinks.classList.remove('open');
                }
            }
        });
    }
}

