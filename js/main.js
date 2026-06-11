/* ============================================
   PORTAL ADULTOS MAYORES
   Script principal unificado y optimizado
   ============================================ */

// 1. Intersection Observer para animaciones de entrada (fade-in)
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

// Aplicar el observador a todos los elementos con la clase .fade-in
document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// 2. Función para alternar el menú en dispositivos móviles (Hamburguesa)
function toggleMenu() {
  const navLinks = document.querySelector('.nav-links');
  const navHamburger = document.querySelector('.nav-hamburger');
  
  if (navLinks && navHamburger) {
    navLinks.classList.toggle('active');
    navHamburger.classList.toggle('active');
  }
}

// 3. Cambiar el fondo de la barra de navegación al hacer scroll (Sincronizado con Navbar Azul)
window.addEventListener('scroll', () => {
  const nav = document.querySelector('nav');
  if (nav) {
    if (window.scrollY > 50) {
      nav.style.background = 'rgba(0, 51, 102, 0.99)';
    } else {
      nav.style.background = 'rgba(0, 51, 102, 0.95)';
    }
  }
});

// 4. Manejo del envío del formulario de contacto (Redirección automatizada a WhatsApp)
function handleSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const nombre = form.nombre.value;
  const servicio = form.servicio.options[form.servicio.selectedIndex].text;
  const mensaje = form.mensaje.value;

  const waText = encodeURIComponent(
    `Hola! Me llamo ${nombre} y me interesa el servicio: ${servicio}. ${mensaje ? 'Consulta: ' + mensaje : ''}`
  );
  
  window.open(`https://wa.me/5493854169685?text=${waText}`, '_blank');
  form.reset();
}

// 5. ===== BUSCADOR REGULADO DE LA RED PROVINCIAL =====
function buscarInstitucion() {
    const categoria = document.getElementById('categoria').value;
    const localidad = document.getElementById('localidad').value;
    const nombreInput = document.getElementById('nombre').value.toLowerCase();
    const resultadosDiv = document.getElementById('buscadorResultados');
    
    if (!resultadosDiv) return;
    
    // Limpiar caja de resultados anteriores
    resultadosDiv.innerHTML = "";

    // Base de datos integrada de establecimientos (Cumplen Ley Provincial N.º 7149)
    const baseDeDatos = [
        { nombre: "Centro Diurno Virgen del Valle", tipo: "centro", localidad: "santiago", direccion: "Av. Sáenz Peña" },
        { nombre: "Residencia San Agustín", tipo: "geriatrico", localidad: "banda", direccion: "Av. San Martín 456" },
        { nombre: "Hogar San José", tipo: "geriatrico", localidad: "santiago", direccion: "Av. Belgrano 1250" },
        { nombre: "Hogar del Atardecer", tipo: "geriatrico", localidad: "banda", direccion: "Calle Sarmiento 789" },
        { nombre: "Geriátrico Vida Plena", tipo: "geriatrico", localidad: "termas", direccion: "Calle San Martín 321" },
        { nombre: "Centro de Día Corazones Contentos", tipo: "dia", localidad: "termas", direccion: "Pasaje Centro Cívico" },
        { nombre: "Hogar de Ancianos Frías", tipo: "geriatrico", localidad: "frias", direccion: "Calle Pellegrini 150" }
    ];

    // Filtrado lógico estricto
    const filtrados = baseDeDatos.filter(item => {
        const coincideCategoria = (item.tipo === categoria);
        const coincideLocalidad = (localidad === "" || item.localidad === localidad);
        const coincideNombre = (item.nombre.toLowerCase().includes(nombreInput));
        return coincideCategoria && coincideLocalidad && coincideNombre;
    });

    // Renderizar resultados en pantalla
    if (filtrados.length > 0) {
        filtrados.forEach(res => {
            let tipoFormateado = "";
            if(res.tipo === "centro") tipoFormateado = "Centro de Jubilados";
            if(res.tipo === "dia") tipoFormateado = "Centro de Día";
            if(res.tipo === "geriatrico") tipoFormateado = "Geriátrico / Residencia";

            resultadosDiv.innerHTML += `
                <div class="resultado-item fade-in visible">
                    <div class="resultado-info">
                        <h4>${res.nombre}</h4>
                        <p>📍 ${res.direccion} - ${res.localidad.toUpperCase()} (Santiago del Estero)</p>
                        <span class="badge-tipo">${tipoFormateado}</span>
                    </div>
                    <span class="resultado-badge">✓ Habilitado</span>
                </div>
            `;
        });
    } else {
        resultadosDiv.innerHTML = `
            <div class="sin-resultados">
                <p>⚠️ No se encontraron establecimientos habilitados que coincidan con los criterios de búsqueda.</p>
            </div>
        `;
    }
}

// ==========================================================================
// CONTROLADOR INTEGRADO DE ACCESIBILIDAD (SANTIAGO ADULTOS MAYORES)
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  let currentFontSize = 100;
  let isHighContrast = false;
  let isHighlightLinks = false;

  const btnInc = document.getElementById('btn-inc-font');
  const btnDesc = document.getElementById('btn-desc-font');
  const btnContrast = document.getElementById('btn-toggle-contrast');
  const btnLinks = document.getElementById('btn-toggle-links');
  const btnReset = document.getElementById('btn-reset-accessibility');
  const indicator = document.getElementById('font-size-indicator');

  // Control de Tamaño de Texto (+ / -)
  if (btnInc && btnDesc && indicator) {
    btnInc.addEventListener('click', () => {
      if (currentFontSize < 150) {
        currentFontSize += 10;
        document.documentElement.style.fontSize = `${currentFontSize}%`;
        indicator.textContent = `${currentFontSize}%`;
      }
    });

    btnDesc.addEventListener('click', () => {
      if (currentFontSize > 80) {
        currentFontSize -= 10;
        document.documentElement.style.fontSize = `${currentFontSize}%`;
        indicator.textContent = `${currentFontSize}%`;
      }
    });
  }

  // Modulador de Modo Alto Contraste
  if (btnContrast) {
    btnContrast.addEventListener('click', () => {
      isHighContrast = !isHighContrast;
      document.body.classList.toggle('high-contrast', isHighContrast);
      document.documentElement.classList.toggle('high-contrast', isHighContrast);
      
      if (isHighContrast) {
        btnContrast.textContent = '✓ Contraste Activo';
        btnContrast.style.background = '#000000';
        btnContrast.style.color = '#ffff00';
        btnContrast.style.borderColor = '#ffff00';
      } else {
        btnContrast.textContent = 'Modo Alto Contraste';
        btnContrast.style.background = '';
        btnContrast.style.color = '';
        btnContrast.style.borderColor = '';
      }
    });
  }

  // Modulador de Resaltar Enlaces de Interés
  if (btnLinks) {
    btnLinks.addEventListener('click', () => {
      isHighlightLinks = !isHighlightLinks;
      document.documentElement.classList.toggle('highlight-links', isHighlightLinks);
      
      if (isHighlightLinks) {
        btnLinks.textContent = '✓ Enlaces Resaltados';
        btnLinks.style.background = '#ffff00';
        btnLinks.style.color = '#000000';
        btnLinks.style.borderColor = '#b45309';
      } else {
        btnLinks.textContent = 'Resaltar Enlaces';
        btnLinks.style.background = '';
        btnLinks.style.color = '';
        btnLinks.style.borderColor = '';
      }
    });
  }

  // Botón de Restablecer Valores de Fábrica
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      currentFontSize = 100;
      isHighContrast = false;
      isHighlightLinks = false;
      
      document.documentElement.style.fontSize = '100%';
      if (indicator) indicator.textContent = '100%';
      
      document.body.classList.remove('high-contrast');
      document.documentElement.classList.remove('high-contrast');
      document.documentElement.classList.remove('highlight-links');

      if (btnContrast) {
        btnContrast.textContent = 'Modo Alto Contraste';
        btnContrast.style.background = '';
        btnContrast.style.color = '';
        btnContrast.style.borderColor = '';
      }
      if (btnLinks) {
        btnLinks.textContent = 'Resaltar Enlaces';
        btnLinks.style.background = '';
        btnLinks.style.color = '';
        btnLinks.style.borderColor = '';
      }
    });
  }
});

const menuToggle = document.getElementById('menu-toggle');
const navMenu = document.getElementById('nav-menu');

menuToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
});