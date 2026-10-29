(function () {
  const nav = document.querySelector('nav');
  if (!nav) return;
  const links = nav.querySelector('.nav-links');
  const burger = nav.querySelector('.nav-hamburger');
  const drops = nav.querySelectorAll('.dropdown');
  const mq = window.matchMedia('(max-width: 900px)');

  burger.setAttribute('aria-expanded', 'false');

  function cerrarSubmenus() {
    drops.forEach(d => {
      d.classList.remove('open');
      d.querySelector('.dropdown-toggle').setAttribute('aria-expanded', 'false');
    });
  }

  function cerrarMenu() {
    links.classList.remove('open');
    burger.classList.remove('active');
    burger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-abierto');
    cerrarSubmenus();
  }

  // Reemplaza la función toggleMenu() que usa el botón (onclick="toggleMenu()")
  window.toggleMenu = function () {
    const abierto = links.classList.toggle('open');
    burger.classList.toggle('active', abierto);
    burger.setAttribute('aria-expanded', abierto);
    document.body.classList.toggle('menu-abierto', abierto && mq.matches);
    if (!abierto) cerrarSubmenus();
  };

  // Abrir/cerrar cada submenú con clic o toque
  drops.forEach(d => {
    const toggle = d.querySelector('.dropdown-toggle');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      const abrir = !d.classList.contains('open');
      cerrarSubmenus();
      if (abrir) {
        d.classList.add('open');
        toggle.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // Al elegir un enlace, cerrar el menú (para que se vea la sección)
  links.querySelectorAll('.dropdown-menu a, .nav-links > li > a:not(.dropdown-toggle)')
    .forEach(a => a.addEventListener('click', cerrarMenu));

  // Cerrar al tocar afuera, con Escape o al cambiar de tamaño de pantalla
  document.addEventListener('click', e => { if (!nav.contains(e.target)) cerrarMenu(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarMenu(); });
  mq.addEventListener('change', cerrarMenu);
})();