document.getElementById('btn-ingresar')?.addEventListener('click', () => {
    // 1. Objeto con los datos de la sesión institucional
    const usuarioInstitucional = {
        nombre: "Jorgelina Campos",
        email: "jorgelinacamposjc@gmail.com",
        rol: "Administrador", // Puede ser: Administrador, Director de área, Colaborador, Observador
        area: "Desarrollo de Software"
    };

    // 2. Guardamos el objeto en el almacenamiento local del navegador
    localStorage.setItem('usuarioNexo', JSON.stringify(usuarioInstitucional));

    // 3. Redirigimos al usuario hacia el panel de control (dashboard)
    window.location.href = 'dashboard.html'; 
    // Nota: Si tu archivo del dashboard está en otra carpeta, ajustá la ruta (ej. 'pages/dashboard.html')
});