// ===== HERRAMIENTAS DE ACCESIBILIDAD =====
(function () {
  'use strict';

  let fontSize = 100;
  let highContrast = false;
  let highlightLinks = false;

  const toggleBtn = document.getElementById('accessibility-toggle');
  const panel = document.getElementById('accessibility-panel');
  const indicator = document.getElementById('font-size-indicator');
  const contrastBtn = document.getElementById('btn-toggle-contrast');
  const linksBtn = document.getElementById('btn-toggle-links');

  // Toggle del panel
  toggleBtn.addEventListener('click', function () {
    const isVisible = panel.style.display === 'block';
    panel.style.display = isVisible ? 'none' : 'block';
    toggleBtn.setAttribute('aria-expanded', String(!isVisible));
  });

  // Cerrar panel al hacer clic fuera
  document.addEventListener('click', function (e) {
    if (!panel.contains(e.target) && !toggleBtn.contains(e.target)) {
      panel.style.display = 'none';
      toggleBtn.setAttribute('aria-expanded', 'false');
    }
  });

  // Aumentar tamaño de fuente
  document.getElementById('btn-inc-font').addEventListener('click', function () {
    if (fontSize < 150) {
      fontSize += 10;
      document.documentElement.style.fontSize = fontSize + '%';
      indicator.textContent = fontSize + '%';
    }
  });

  // Disminuir tamaño de fuente
  document.getElementById('btn-desc-font').addEventListener('click', function () {
    if (fontSize > 80) {
      fontSize -= 10;
      document.documentElement.style.fontSize = fontSize + '%';
      indicator.textContent = fontSize + '%';
    }
  });

  // Alto contraste
  contrastBtn.addEventListener('click', function () {
    highContrast = !highContrast;
    document.documentElement.classList.toggle('high-contrast', highContrast);

    if (highContrast) {
      contrastBtn.textContent = '✓ Alto Contraste Activo';
      contrastBtn.style.background = '#000000';
      contrastBtn.style.color = '#ffff00';
      contrastBtn.style.borderColor = '#ffff00';
    } else {
      contrastBtn.textContent = 'Modo Alto Contraste';
      contrastBtn.style.background = '#f1f5f9';
      contrastBtn.style.color = '#334155';
      contrastBtn.style.borderColor = '#cbd5e1';
    }
  });

  // Resaltar enlaces
  linksBtn.addEventListener('click', function () {
    highlightLinks = !highlightLinks;
    document.documentElement.classList.toggle('highlight-links', highlightLinks);

    if (highlightLinks) {
      linksBtn.textContent = '✓ Enlaces Resaltados';
      linksBtn.style.background = '#ffff00';
      linksBtn.style.color = '#000000';
      linksBtn.style.borderColor = '#b45309';
    } else {
      linksBtn.textContent = 'Resaltar Enlaces';
      linksBtn.style.background = '#f1f5f9';
      linksBtn.style.color = '#334155';
      linksBtn.style.borderColor = '#cbd5e1';
    }
  });

  // Restablecer valores
  document.getElementById('btn-reset-accessibility').addEventListener('click', function () {
    fontSize = 100;
    highContrast = false;
    highlightLinks = false;

    document.documentElement.style.fontSize = '100%';
    indicator.textContent = '100%';
    document.documentElement.classList.remove('high-contrast');
    document.documentElement.classList.remove('highlight-links');

    contrastBtn.textContent = 'Modo Alto Contraste';
    contrastBtn.style.background = '#f1f5f9';
    contrastBtn.style.color = '#334155';
    contrastBtn.style.borderColor = '#cbd5e1';

    linksBtn.textContent = 'Resaltar Enlaces';
    linksBtn.style.background = '#f1f5f9';
    linksBtn.style.color = '#334155';
    linksBtn.style.borderColor = '#cbd5e1';
  });
})();
