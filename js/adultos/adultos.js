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

    function initGallery() {
        const modal = document.getElementById("gallery-modal");
        const modalTitle = document.getElementById("modal-title");
        const modalContainer = document.getElementById("modal-images-container");
        
        // CORREGIDO: Busca la cruz de cierre específicamente dentro del modal de galería
        const closeBtn = modal ? modal.querySelector(".modal-close") : null; 
        const galleryItems = document.querySelectorAll(".gallery-item");

        if (!modal || !modalContainer || !modalTitle || galleryItems.length === 0) {
            setTimeout(initGallery, 100);
            return;
        }

        // Crear las flechas de navegación dinámicamente si no existen
        let prevBtn = modal.querySelector(".modal-nav-btn.prev");
        let nextBtn = modal.querySelector(".modal-nav-btn.next");

        if (!prevBtn) {
            prevBtn = document.createElement("button");
            prevBtn.className = "modal-nav-btn prev";
            prevBtn.innerHTML = "&#10094;"; // Flecha izquierda ❮
            modal.querySelector(".modal-content").appendChild(prevBtn);
        }

        if (!nextBtn) {
            nextBtn = document.createElement("button");
            nextBtn.className = "modal-nav-btn next";
            nextBtn.innerHTML = "&#10095;"; // Flecha derecha ❯
            modal.querySelector(".modal-content").appendChild(nextBtn);
        }

        // Función interna para renderizar la foto actual en base al índice
        function renderActiveImage() {
            modalContainer.innerHTML = ""; // Limpia la foto anterior
            
            if (currentAlbumImages.length > 0) {
                const img = document.createElement("img");
                img.src = currentAlbumImages[currentImageIndex];
                img.alt = modalTitle.textContent;
                img.loading = "eager"; // Carga inmediata para evitar parpadeos
                modalContainer.appendChild(img);
            }
        }

        // Eventos de las flechas
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

        // Al hacer clic en una tarjeta de la galería principal
        galleryItems.forEach(item => {
            // Validamos que pertenezca a la galería y no a la sección de noticias
            if (item.getAttribute("data-album")) {
                item.addEventListener("click", function() {
                    const albumKey = this.getAttribute("data-album");
                    const albumData = albums[albumKey];

                    if (albumData && albumData.images.length > 0) {
                        modalTitle.textContent = albumData.title;
                        currentAlbumImages = albumData.images;
                        currentImageIndex = 0; // Arranca siempre mostrando la primera foto

                        renderActiveImage();

                        modal.classList.add("active");
                        document.body.style.overflow = "hidden";
                    }
                });
            }
        });

        // Lógica de cierre de la ventana modal
        const closeModal = () => {
            modal.classList.remove("active");
            document.body.style.overflow = "auto";
        };

        if (closeBtn) closeBtn.onclick = closeModal;
        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };
    }

    // Inicializar el módulo de galería
    initGallery();

    // ==========================================================================
    // MÓDULO DE DETALLES INTEGRADOS PARA NOTICIAS
    // ==========================================================================
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
                
                    // Inyección limpia y forzada de la imagen
                    mImgContainer.innerHTML = "";
                    const img = document.createElement("img");
                    img.src = data.image;
                    img.alt = data.title;
                
                    // Estilos en línea directos para mantener consistencia
                    img.style.width = "100%";
                    img.style.maxWidth = "100%";
                    img.style.height = "380px";
                    img.style.objectFit = "cover";
                    img.style.display = "block";
                    img.style.borderRadius = "12px";
                
                    mImgContainer.appendChild(img);
                
                    // Inyección limpia del texto
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

    /// ==========================================================================
    // CONTROL DEL FORMULARIO DE CONTACTO (VALIDACIÓN INSTITUCIONAL)
    // ==========================================================================
    const formulario = document.getElementById("contactForm");
    if (formulario) {
        formulario.addEventListener("submit", function(event) {
            // Evitamos el comportamiento nativo de refresco
            event.preventDefault();

            // Capturamos los valores eliminando espacios en blanco extras con .trim()
            const nombreUser = document.getElementById("nombre").value.trim();
            const apellidoUser = document.getElementById("apellido").value.trim();
            const emailUser = document.getElementById("email").value.trim();
            const servicioSelect = document.getElementById("servicio");
            const servicioTexto = servicioSelect.options[servicioSelect.selectedIndex].text;

            // Validación manual de seguridad por si falla el atributo "required" de HTML
            if (nombreUser === "" || apellidoUser === "" || emailUser === "" || servicioSelect.value === "") {
                alert("Por favor, completá todos los campos obligatorios marcados con asterisco (*).");
                return; // Corta la ejecución del código si hay campos vacíos
            }

            // Si pasa la validación, muestra el cartel institucional de éxito
            alert(`¡Muchas gracias, ${nombreUser}!\n\nTu consulta sobre "${servicioTexto}" ha sido procesada con éxito.\nEl equipo de la Dirección General se pondrá en contacto con vos en menos de 24 horas.`);

            // Reseteamos el formulario limpiando los inputs
            formulario.reset();
        });
    }

})(); // Este es el cierre final de todo tu archivo