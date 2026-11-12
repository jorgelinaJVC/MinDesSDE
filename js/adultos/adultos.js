(function() {
    const albums = {
        "asuncion": {
            title: "Juramento de Asunción - Dirección de Adultos Mayores",
            images: [
                "assets/AsuncionDireccion.jpg",
                "assets/Dire1.jpg", 
                "assets/directoraAM.webp"
            ]
        },
        "virgen-valle": {
            title: "Centro Diurno Virgen del Valle",
            images: [
                "assets/Centro Diurno Virgen del Valle.jpg",
                "assets/virgendelvalle1.jpg",
                "assets/virgendelvalle2.jpg",
            ]
        },
        "residencia": {
            title: "Residencia Mama Antula",
            images: [
                "assets/mamaantula1.jpg",
                "assets/mamaantula2.jpg"
            ]
        },
        "encuentro": {
            title: "Encuentro Provincial de Adultos Mayores",
            images: [
                "assets/encuentro1.jpg",
                "assets/encuentro2.jpg",
                "assets/encuentro3.jpg",
            ]
        }
    };

    let currentAlbumImages = [];
    let currentImageIndex = 0;

    let intentosGaleria = 0;

    function initGallery() {
        const modal = document.getElementById("gallery-modal");
        const modalTitle = document.getElementById("modal-title");
        const modalContainer = document.getElementById("modal-images-container");
        
        const closeBtn = modal ? modal.querySelector(".modal-close") : null; 
        const galleryItems = document.querySelectorAll(".gallery-item");

        if (!modal || !modalContainer || !modalTitle || galleryItems.length === 0) {
            // La galería ahora la dibuja Nexo (js/nexo/secciones.js) con su propio visor: si este modal no está,
            // se reintenta unas pocas veces y se deja de buscar (antes quedaba reintentando para siempre).
            if (++intentosGaleria < 20) setTimeout(initGallery, 100);
            return;
        }

        let prevBtn = modal.querySelector(".modal-nav-btn.prev");
        let nextBtn = modal.querySelector(".modal-nav-btn.next");

        if (!prevBtn) {
            prevBtn = document.createElement("button");
            prevBtn.className = "modal-nav-btn prev";
            prevBtn.innerHTML = "&#10094;";
            modal.querySelector(".modal-content").appendChild(prevBtn);
        }

        if (!nextBtn) {
            nextBtn = document.createElement("button");
            nextBtn.className = "modal-nav-btn next";
            nextBtn.innerHTML = "&#10095;";
            modal.querySelector(".modal-content").appendChild(nextBtn);
        }

        function renderActiveImage() {
            modalContainer.innerHTML = "";
            
            if (currentAlbumImages.length > 0) {
                const img = document.createElement("img");
                img.src = currentAlbumImages[currentImageIndex];
                img.alt = modalTitle.textContent;
                img.loading = "eager";
                modalContainer.appendChild(img);
            }
        }

        prevBtn.onclick = (e) => {
            e.stopPropagation();
            currentImageIndex = (currentImageIndex - 1 + currentAlbumImages.length) % currentAlbumImages.length;
            renderActiveImage();
        };

        nextBtn.onclick = (e) => {
            e.stopPropagation();
            currentImageIndex = (currentImageIndex + 1) % currentAlbumImages.length;
            renderActiveImage();
        };

        galleryItems.forEach(item => {
            if (item.getAttribute("data-album")) {
                item.addEventListener("click", function() {
                    const albumKey = this.getAttribute("data-album");
                    const albumData = albums[albumKey];

                    if (albumData && albumData.images.length > 0) {
                        modalTitle.textContent = albumData.title;
                        currentAlbumImages = albumData.images;
                        currentImageIndex = 0;

                        renderActiveImage();

                        modal.classList.add("active");
                        document.body.style.overflow = "hidden";
                    }
                });
            }
        });

        const closeModal = () => {
            modal.classList.remove("active");
            document.body.style.overflow = "auto";
        };

        if (closeBtn) closeBtn.onclick = closeModal;
        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };
    }

    initGallery();

    const newsData = {
        "noti1": {
            title: "El valor del respeto: Claves para promover el buen trato hacia las personas mayores",
            tag: "Locales",
            date: "Viernes 12 de Junio, 2026",
            image: "assets/Buen-trato-a-las-personas-mayores-1024x576.png",
            text: "Pequeñas acciones diarias en la familia, los comercios y el transporte público pueden hacer una gran diferencia. Conocé cómo construir entre todos una comunidad más inclusiva y respetuosa."
        },
        "noti2": {
            title: "Visibilizar para proteger: Hablemos sobre el abandono y la soledad en la vejez",
            tag: "Conciencia Social",
            date: "Jueves 11 de Junio, 2026",
            image: "assets/maltrato.png",
            text: "El aislamiento social es una reality que afecta a muchos de nuestros mayores. Te contamos cómo identificar las señales de alerta y de qué manera las redes de contención barrial pueden intervenir a tiempo."
        },
        "noti3": {
            title: "Cuidá tus ahorros: Cómo detectar y prevenir el abuso financiero",
            tag: "Precaucion",
            date: "Miércoles 10 de Junio, 2026",
            image: "assets/ahorro.avif",
            text: "Desde estafas telefónicas hasta firmas de documentos sin consentimiento claro. Te acercamos una guía práctica con consejos de seguridad para proteger tu economía y mantener tu autonomía."
        },
        "noti4": {
            title: "Nunca es tarde para aprender: ¡Abren las inscripciones para las nuevas actividades educativas!",
            tag: "Locales",
            date: "Viernes 12 de Junio, 2026",
            image: "assets/talleres.png",
            text: "La Dirección General de Adultos Mayores presentó formalmente la grilla de encuentros, peñas y caminatas saludables adaptadas para los meses de frío. Las actividades se desarrollarán en los distintos centros diurnos de la capital y el interior santiagueño, buscando promover un envejecimiento activo y saludable."
        }
    };

    const newsModal = document.getElementById("news-modal");
    const newsCards = document.querySelectorAll("#news .gallery-item");

    if (newsCards.length > 0 && newsModal) {
        const mTag = document.getElementById("modal-news-tag");
        const mTitle = document.getElementById("modal-news-title");
        const mDate = document.getElementById("modal-news-date");
        const mImgContainer = document.getElementById("modal-news-image-container");
        const mText = document.getElementById("modal-news-text");
        const mClose = document.querySelector(".news-modal-close");

        newsCards.forEach(card => {
            card.addEventListener("click", function() {
                const key = this.getAttribute("data-notice");
                const data = newsData[key];

                if (data) {
                    mTag.textContent = data.tag;
                    mTitle.textContent = data.title;
                    mDate.textContent = data.date;
                
                    mImgContainer.innerHTML = "";
                    const img = document.createElement("img");
                    img.src = data.image;
                    img.alt = data.title;
                
                    img.style.width = "100%";
                    img.style.maxWidth = "100%";
                    img.style.height = "380px";
                    img.style.objectFit = "cover";
                    img.style.display = "block";
                    img.style.borderRadius = "12px";
                
                    mImgContainer.appendChild(img);
                
                    mText.innerHTML = `<p>${data.text}</p>`;

                    newsModal.classList.add("active");
                    document.body.style.overflow = "hidden";
                }
            });
        });

        const closeNews = () => {
            newsModal.classList.remove("active");
            document.body.style.overflow = "auto";
        };

        if (mClose) mClose.onclick = closeNews;
        newsModal.onclick = (e) => {
            if (e.target === newsModal) closeNews();
        };
    }

})(); 

/* menu */

function toggleMenu(event) {
  event.preventDefault(); 
  const submenu = document.getElementById("submenu");
  submenu.classList.toggle("show");
}

document.addEventListener("click", function (e) {
  const dropdown = document.querySelector(".dropdown");
  const submenu = document.getElementById("submenu");
  // habilitacion.html no tiene menú desplegable: sin esta guarda, cada clic daba error
  if (dropdown && submenu && !dropdown.contains(e.target)) {
    submenu.classList.remove("show");
  }
});

/* ==========================================================================
   CONTROL DEL FORMULARIO DE CONTACTO (ENVÍO DIRECTO INSTITUCIONAL)
   ========================================================================== */

function mostrarExito() {
    const successBox = document.getElementById("successMessage");
    if (successBox) {
        successBox.style.display = "block";
        
        // El mensaje flotante se ocultará automáticamente después de 6 segundos
        setTimeout(() => {
          successBox.style.display = "none";
        }, 6000);
    }
}

// Función unificada para validar campos obligatorios según el medio
function validarCamposObligatorios(medio) {
    const nombre = document.getElementById("nombre").value.trim();
    const servicio = document.getElementById("servicio").value;
    const mensaje = document.getElementById("mensaje").value.trim();

    if (!nombre || !servicio || !mensaje) {
        alert(`Por favor completá los campos obligatorios antes de enviar por ${medio}.`);
        return false;
    }
    return true;
}

function enviarPorWhatsApp() {
    if (!validarCamposObligatorios("WhatsApp")) return;

    const tipo = document.getElementById("tipo_tramite").value;
    const areaKey = document.getElementById("servicio").value;
    const nombre = document.getElementById("nombre").value.trim();
    const apellido = document.getElementById("apellido").value.trim();
    const telefono = document.getElementById("telefono").value.trim() || "No especificado";
    const mensaje = document.getElementById("mensaje").value.trim();

    const destino = directorioContactos[areaKey] || directorioContactos.otros;

    const textoWA = `*NUEVA COMUNICACIÓN CIUDADANA*\n` +
                    `------------------------------\n` +
                    `*Tipo:* ${tipo}\n` +
                    `*Área Destino:* ${destino.nombre}\n` +
                    `*Nombre:* ${nombre} ${apellido}\n` +
                    `*Teléfono:* ${telefono}\n` +
                    `*Detalle:*\n${mensaje}`;

    const url = `https://wa.me/${destino.telefono}?text=${encodeURIComponent(textoWA)}`;
    window.open(url, "_blank");
}

function enviarPorEmail() {
    if (!validarCamposObligatorios("Correo")) return;

    const tipo = document.getElementById("tipo_tramite").value;
    const areaKey = document.getElementById("servicio").value;
    const nombre = document.getElementById("nombre").value.trim();
    const apellido = document.getElementById("apellido").value.trim();
    const remitenteEmail = document.getElementById("email").value.trim() || "No informado";
    const telefono = document.getElementById("telefono").value.trim() || "No informado";
    const mensaje = document.getElementById("mensaje").value.trim();

    const destino = directorioContactos[areaKey] || directorioContactos.otros;

    const asunto = `[${tipo.toUpperCase()}] - ${destino.nombre} - ${nombre} ${apellido}`;
    
    const cuerpo = `Tipo de trámite: ${tipo}\n` +
                   `Área: ${destino.nombre}\n` +
                   `Remitente: ${nombre} ${apellido}\n` +
                   `Correo de contacto: ${remitenteEmail}\n` +
                   `Teléfono: ${telefono}\n\n` +
                   `Detalle / Descripción:\n${mensaje}`;

    // 1. Muestra el mensaje flotante de éxito en la esquina
    mostrarExito();

    // 2. Limpia todos los campos del formulario automáticamente
    document.getElementById("tipo_tramite").selectedIndex = 0;
    document.getElementById("nombre").value = "";
    document.getElementById("apellido").value = "";
    document.getElementById("email").value = "";
    document.getElementById("telefono").value = "";
    document.getElementById("servicio").value = "";
    document.getElementById("mensaje").value = "";
    document.getElementById("destinoFeedback").style.display = "none";

    // 3. Abre el cliente de correo del usuario apuntando directamente al email institucional
    setTimeout(() => {
      window.location.href = `mailto:${destino.email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
    }, 300);
}

/* ==========================================================================
   CONTROL DE ENVÍO Y CONFIRMACIÓN - BUZÓN DIRECTO RESIDENCIA MAMA ANTULA
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("directContactForm");
    const formAlert = document.getElementById("form-alert");

    if (form && formAlert) {
        // Nos aseguramos de interceptar el evento submit
        form.addEventListener("submit", function(event) {
            event.preventDefault(); // Detiene por completo cualquier recarga de página

            // Capturamos los valores actuales
            const nombre = document.getElementById("form-nombre").value.trim();
            const apellido = document.getElementById("form-apellido").value.trim();
            const telefono = document.getElementById("form-telefono").value.trim();
            const asunto = document.getElementById("form-asunto").value;
            const mensaje = document.getElementById("form-mensaje").value.trim();

            // Validación estricta propia (muestra aviso si falta algún campo obligatorio)
            if (!nombre || !apellido || !telefono || !asunto || !mensaje) {
                formAlert.className = "alert-box error";
                formAlert.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Por favor, completá todos los campos obligatorios marcados con asterisco (*) antes de enviar.`;
                formAlert.style.display = "block";
                
                // Hace scroll suave hacia la alerta para que el usuario la vea
                formAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                return; // Corta la ejecución para que no se envíe
            }

            // Si todo está completo, mostramos el mensaje de éxito institucional
            formAlert.className = "alert-box success";
            formAlert.innerHTML = `<i class="fa-solid fa-circle-check"></i> ¡Mensaje enviado con éxito! Su consulta fue derivada a la secretaría de la Residencia "Mama Antula". Nos pondremos en contacto en un plazo de 24 a 48 hs hábiles.`;
            formAlert.style.display = "block";

            // Limpiamos los campos del formulario
            form.reset();

            // Hace scroll suave hacia el mensaje de éxito
            formAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            // Oculta el mensaje de éxito automáticamente después de 8 segundos
            setTimeout(() => {
                formAlert.style.display = "none";
            }, 8000);
        });
    }
});