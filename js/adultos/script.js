<script>
  const hamburger = document.querySelector('.nav-hamburger');
  const navLinks = document.querySelector('.nav-links');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      // Abre/cierra el menú desplegándolo
      navLinks.classList.toggle('active');
      // Transforma las 3 barritas en una "X"
      hamburger.classList.toggle('active');
    });

    // Cierra el menú al hacer clic en cualquier enlace
    document.querySelectorAll('.nav-links a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        hamburger.classList.remove('active');
      });
    });
  }
</script>