/* ============================================================ script.js — 
Ministerio de Desarrollo SDE (réplica)
   ============================================================ */

// Declaramos toggleMenu de forma global para que el "onclick" del HTML lo encuentre perfectamente
function toggleMenu() {
  const menu = document.getElementById('mainNav');
  const burger = document.querySelector('.nav-hamburger') || document.querySelector('.header__burger');
  
  if (menu && burger) {
    menu.classList.toggle('open');
    burger.classList.toggle('open');
    
    // Accesibilidad (Aria-expanded)
    const expanded = menu.classList.contains('open');
    burger.setAttribute('aria-expanded', expanded);
  }
}

document.addEventListener('DOMContentLoaded', () => {
/* ─────────────────────────────────────────
1. HERO CAROUSEL DINÁMICO
───────────────────────────────────────── */

window.iniciarCarruselPrincipal = function () {

    const slides =
        document.querySelectorAll(
            '.hero__slide'
        );

    const dots =
        document.querySelectorAll(
            '.hero__dot'
        );

    const prevBtn =
        document.getElementById(
            'heroPrev'
        );

    const nextBtn =
        document.getElementById(
            'heroNext'
        );

    const hero =
        document.querySelector(
            '.hero'
        );


    let current = 0;

    let autoTimer = null;

    const INTERVAL = 5000;


    /* Si MySQL no devolvió slides */

    if (!slides.length) {

        console.warn(
            'Carrusel: no hay slides para iniciar'
        );

        return;
    }


    function goTo(index) {

        slides[current]
            ?.classList
            .remove('active');

        dots[current]
            ?.classList
            .remove('active');


        current =
            (index + slides.length)
            % slides.length;


        slides[current]
            ?.classList
            .add('active');

        dots[current]
            ?.classList
            .add('active');
    }


    function startAuto() {

        clearInterval(
            autoTimer
        );


        if (slides.length <= 1) {
            return;
        }


        autoTimer =
            setInterval(
                () =>
                    goTo(current + 1),

                INTERVAL
            );
    }


    function resetAuto() {

        clearInterval(
            autoTimer
        );

        startAuto();
    }


    /* FLECHA ANTERIOR */

    prevBtn?.addEventListener(
        'click',
        () => {

            goTo(
                current - 1
            );

            resetAuto();
        }
    );


    /* FLECHA SIGUIENTE */

    nextBtn?.addEventListener(
        'click',
        () => {

            goTo(
                current + 1
            );

            resetAuto();
        }
    );


    /* PUNTOS */

    dots.forEach(dot => {

        dot.addEventListener(
            'click',
            () => {

                goTo(
                    Number(
                        dot.dataset.index
                    )
                );

                resetAuto();
            }
        );
    });


    /* PAUSA AL PASAR EL MOUSE */

    hero?.addEventListener(
        'mouseenter',
        () => {

            clearInterval(
                autoTimer
            );
        }
    );


    hero?.addEventListener(
        'mouseleave',
        () => {

            startAuto();
        }
    );


    /* TOUCH / SWIPE */

    let touchStartX = 0;


    hero?.addEventListener(
        'touchstart',
        event => {

            touchStartX =
                event
                    .changedTouches[0]
                    .clientX;

        },
        {
            passive: true
        }
    );


    hero?.addEventListener(
        'touchend',
        event => {

            const diff =
                touchStartX -
                event
                    .changedTouches[0]
                    .clientX;


            if (
                Math.abs(diff) > 50
            ) {

                if (diff > 0) {

                    goTo(
                        current + 1
                    );

                } else {

                    goTo(
                        current - 1
                    );
                }


                resetAuto();
            }

        },
        {
            passive: true
        }
    );


    /* INICIAR */

    goTo(0);

    startAuto();


};

  /* ─────────────────────────────────────────
  2. BURGER MENU (Ajustes de eventos secundarios)
  ───────────────────────────────────────── */
  const nav = document.getElementById('mainNav');
  const burger = document.querySelector('.nav-hamburger') || document.querySelector('.header__burger');

  // Cerrar al hacer clic en un enlace (móvil)
  document.querySelectorAll('.nav-links a, .nav__link').forEach(link => {
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
  CSS para las animaciones de reveal
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
document.head.appendChild(revealStyle);});
