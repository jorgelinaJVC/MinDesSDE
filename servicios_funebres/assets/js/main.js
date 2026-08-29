// Toggle sidebar
document.addEventListener('DOMContentLoaded', function() {
    const toggleBtn = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
        });
    }
    
    // Cargar localidades al cambiar departamento
    document.querySelectorAll('.dep-select').forEach(function(select) {
        select.addEventListener('change', function() {
            const targetId = this.dataset.target;
            const target = document.getElementById(targetId);
            if (!target) return;
            
            const idDep = this.value;
            target.innerHTML = '<option value="">Cargando...</option>';
            
            if (!idDep) {
                target.innerHTML = '<option value="">--</option>';
                return;
            }
            
            fetch(BASE_URL + 'api/get_localidades.php?id_departamento=' + idDep)
                .then(r => r.json())
                .then(data => {
                    target.innerHTML = '<option value="">--</option>';
                    data.forEach(l => {
                        target.innerHTML += `<option value="${l.id_localidad}">${l.nombre}</option>`;
                    });
                });
        });
    });
    
    // Auto-hide alerts
    setTimeout(function() {
        document.querySelectorAll('.alert').forEach(a => {
            const bsAlert = new bootstrap.Alert(a);
            setTimeout(() => bsAlert.close(), 5000);
        });
    }, 5000);
});

// Confirmar acciones peligrosas
function confirmAction(msg) {
    return confirm(msg || '¿Está seguro?');
}