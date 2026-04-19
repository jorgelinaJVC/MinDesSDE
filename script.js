/* ============================================================ script.js — 
Ministerio de Desarrollo SDE (réplica)
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ─────────────────────────────────────────
  1. HERO CAROUSEL
  ───────────────────────────────────────── */
  const slides    = document.querySelectorAll('.hero__slide');
  const dots      = document.querySelectorAll('.hero__dot');
  const prevBtn   = document.getElementById('heroPrev');
  const nextBtn   = document.getElementById('heroNext');

  let current     = 0;
  let autoTimer   = null;
  const INTERVAL  = 5000; // ms

  function goTo(index) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = (index + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
  }

  function startAuto() {
    autoTimer = setInterval(() => goTo(current + 1), INTERVAL);
  }

  function resetAuto() {
    clearInterval(autoTimer);
    startAuto();
  }

  if (slides.length) {
    prevBtn?.addEventListener('click', () => { goTo(current - 1); resetAuto(); });
    nextBtn?.addEventListener('click', () => { goTo(current + 1); resetAuto(); });

    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        goTo(parseInt(dot.dataset.index));
        resetAuto();
      });
    });

    startAuto();

    // Pause on hover
    const hero = document.querySelector('.hero');
    hero?.addEventListener('mouseenter', () => clearInterval(autoTimer));
    hero?.addEventListener('mouseleave', startAuto);
  }


  /* ─────────────────────────────────────────
  2. BURGER MENU (mobile)
  ───────────────────────────────────────── */
  const burger  = document.getElementById('burgerBtn');
  const nav     = document.getElementById('mainNav');

  burger?.addEventListener('click', () => {
    burger.classList.toggle('open');
    nav.classList.toggle('open');
    // Accessibility
    const expanded = burger.classList.contains('open');
    burger.setAttribute('aria-expanded', expanded);
  });

  // Cerrar al hacer clic en un enlace (móvil)
  document.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', () => {
      burger?.classList.remove('open');
      nav?.classList.remove('open');
    });
  });


  /* ─────────────────────────────────────────
  3. HEADER: sombra al hacer scroll
  ───────────────────────────────────────── */
  const header = document.getElementById('header');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 10) {
      header?.classList.add('scrolled');
    } else {
      header?.classList.remove('scrolled');
    }
  }, { passive: true });


  /* ─────────────────────────────────────────
  4. SCROLL REVEAL (IntersectionObserver)
  ───────────────────────────────────────── */
  const revealTargets = document.querySelectorAll(
    '.noticia-card, .policial-card, .ingreso-card, .servicio-card, .busqueda-card'
  );

  // Añadir clase base para la animación (invisible inicialmente)
  revealTargets.forEach(el => el.classList.add('reveal'));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target); // ejecutar solo una vez
      }
    });
  }, { threshold: 0.12 });

  revealTargets.forEach(el => observer.observe(el));


  /* ─────────────────────────────────────────
  5. TOUCH SWIPE en el carousel
  ───────────────────────────────────────── */
  let touchStartX = 0;
  const heroEl = document.querySelector('.hero');

  heroEl?.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].clientX;
  }, { passive: true });

  heroEl?.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? goTo(current + 1) : goTo(current - 1);
      resetAuto();
    }
  }, { passive: true });

});

/* ─────────────────────────────────────────
  CSS para las animaciones de reveal
  (inyectado dinámicamente para mantener JS y CSS separados
    pero también funciona si lo añadís al styles.css)
───────────────────────────────────────── */
const revealStyle = document.createElement('style');
revealStyle.textContent = `
  .reveal {
    opacity: 0;
    transform: translateY(22px);
    transition: opacity .5s ease, transform .5s ease;
  }
  .reveal.revealed {
    opacity: 1;
    transform: none;
  }
  .header.scrolled {
    box-shadow: 0 4px 20px rgba(0,0,0,.45);
  }
`;
document.head.appendChild(revealStyle);