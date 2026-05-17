/* ============================================
   PORTAL ADULTOS MAYORES
   Script principal
   ============================================ */
   // Intersection Observer para animaciones de entrada (fade-in)
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

// Aplicar el observador a todos los elementos con la clase .fade-in
document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// Función para alternar el menú en dispositivos móviles
function toggleMenu() {
  const navLinks = document.querySelector('.nav-links');
  if (navLinks.style.display === 'flex') {
    navLinks.style.display = 'none';
  } else {
    navLinks.style.display = 'flex';
    navLinks.style.flexDirection = 'column';
    navLinks.style.position = 'absolute';
    navLinks.style.top = '68px';
    navLinks.style.left = '0';
    navLinks.style.right = '0';
    navLinks.style.background = 'rgba(45,55,72,0.98)';
    navLinks.style.padding = '1rem 2rem';
  }
}

// Cambiar el fondo de la barra de navegación al hacer scroll
window.addEventListener('scroll', () => {
  const nav = document.querySelector('nav');
  if (window.scrollY > 50) {
    nav.style.background = 'rgba(45,55,72,0.99)';
  } else {
    nav.style.background = 'rgba(45,55,72,0.97)';
  }
});

// Manejo del envío del formulario (Redirección a WhatsApp)
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

  const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// ===== BUSCADOR DE GERIÁTRICOS =====

// Base de datos de geriátricos (agregá los reales acá)
const geriatricos = [
  {
    nombre: "Geriátrico San José",
    provincia: "santiago",
    direccion: "Av. Belgrano 1250, Santiago del Estero",
    telefono: "(0385) 421-0001",
    habilitado: true
  },
  {
    nombre: "Residencia Los Abuelos",
    provincia: "capital",
    direccion: "Mitre 456, Santiago del Estero",
    telefono: "(0385) 421-0002",
    habilitado: true
  },
  {
    nombre: "Hogar del Atardecer",
    provincia: "banda",
    direccion: "Sarmiento 789, La Banda",
    telefono: "(0385) 432-0003",
    habilitado: true
  },
  {
    nombre: "Geriátrico Vida Plena",
    provincia: "termas",
    direccion: "San Martín 321, Termas de Río Hondo",
    telefono: "(0385) 461-0004",
    habilitado: true
  }
];

function buscarInstitucion() {
    const categoria = document.getElementById('categoria').value;
    const localidad = document.getElementById('localidad').value;
    const nombre = document.getElementById('nombre').value.toLowerCase();
    const resultadosDiv = document.getElementById('buscadorResultados');
    
    // Limpiar resultados anteriores
    resultadosDiv.innerHTML = "";

    // Simulación de base de datos (aquí podrías usar un JSON real)
    const baseDeDatos = [
        { nombre: "Centro Virgen del Valle", tipo: "centro", localidad: "santiago", direccion: "Av. Sáenz Peña" },
        { nombre: "Residencia San Agustín", tipo: "geriatrico", localidad: "banda", direccion: "Calle Falsa 123" },
        { nombre: "Centro de Día Corazones Contentos", tipo: "dia", localidad: "termas", direccion: "Centro Cívico" }
    ];

    // Filtrado lógico
    const filtrados = baseDeDatos.filter(item => {
        const coincideCategoria = (item.tipo === categoria);
        const coincideLocalidad = (localidad === "" || item.localidad === localidad);
        const coincideNombre = (item.nombre.toLowerCase().includes(nombre));
        return coincideCategoria && coincideLocalidad && coincideNombre;
    });

    // Mostrar resultados
    if (filtrados.length > 0) {
        filtrados.forEach(res => {
            resultadosDiv.innerHTML += `
                <div class="resultado-item">
                    <h4>${res.nombre}</h4>
                    <p>📍 ${res.direccion} - ${res.localidad.toUpperCase()}</p>
                    <span class="badge-tipo">${res.tipo.toUpperCase()}</span>
                </div>
            `;
        });
    } else {
        resultadosDiv.innerHTML = "<p>No se encontraron resultados para esta búsqueda.</p>";
    }
}

}