(function() {
    const albums = {
        "asuncion": {
            title: "Juramento de Asunción - Dirección de Adultos Mayores",
            images: [
                "assets/AsuncionDireccion.jpg",
                "assets/Dire1.jpg", 
                "assets/directoraAM.jpg",
                "assets/AsuncionDireccion_4.jpg"
            ]
        },
        "virgen-valle": {
            title: "Centro Diurno Virgen del Valle",
            images: [
                "assets/Centro Diurno Virgen del Valle.jpg",
                "assets/VirgenDelValle_actividad1.jpg",
                "assets/VirgenDelValle_actividad2.jpg"
            ]
        },
        "talleres": {
            title: "Talleres Recreativos y Socio-Preventivos",
            images: [
                "assets/TalleresAdultos.jpg",
                "assets/TalleresAdultos_2.jpg"
            ]
        },
        "encuentro": {
            title: "Encuentro Provincial de Adultos Mayores",
            images: [
                "assets/EncuentroProvincial.jpg",
                "assets/EncuentroProvincial_2.jpg"
            ]
        }
    };

    let currentAlbumImages = [];
    let currentImageIndex = 0;

    function initGallery() {
        const modal = document.getElementById("gallery-modal");
        const modalTitle = document.getElementById("modal-title");
        const modalContainer = document.getElementById("modal-images-container");
        const closeBtn = document.querySelector(".modal-close");
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
            item.addEventListener("click", function() {
                const albumKey = this.getAttribute("data-album");
                const albumData = albums[albumKey];

                if (albumData && albumData.images.length > 0) {
                    modalTitle.textContent = albumData.title;
                    currentAlbumImages = albumData.images;
                    currentImageIndex = 0; // Arranca siempre mostrando la primera foto del álbum

                    renderActiveImage();

                    modal.classList.add("active");
                    document.body.style.overflow = "hidden";
                }
            });
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

    initGallery();

    // ==========================================================================
    // 3. NUEVO: LÓGICA DE DETALLES PARA NOTICIAS
    // ==========================================================================
    // ==========================================================================
    // 4. MÓDULO DE DETALLES INTEGRADOS PARA NOTICIAS
    // ==========================================================================
    const newsData = {
        "clima": {
            title: "El tiempo en Santiago del Estero para este viernes 12 de junio: cielo mayormente nublado y una máxima de 19°C",
            tag: "Locales",
            date: "Viernes 12 de Junio, 2026",
            image: "assets/clima_santiago.jpg",
            text: "El Servicio Meteorológico Nacional anticipa una jornada fresca y con alta nubosidad para la Madre de Ciudades. Se prevén vientos leves del sector sur y una humedad que rondará el 80%. Ideal para mantenerse abrigados durante las actividades matutinas de los centros de contención social."
        },
        "ranking": {
            title: "Argentina 1° en el ranking de la belleza: un diario de EE.UU asegura que tiene la hinchada más atractiva del Mundial 2026",
            tag: "Somos Deporte",
            date: "Jueves 11 de Junio, 2026",
            image: "assets/hinchada_argentina.jpg",
            text: "Un reconocido matutino estadounidense destacó el color, la pasión y el atractivo de la parcialidad albiceleste en los estadios norteamericanos. La publicación resalta cómo las familias completas y abuelos acompañan al seleccionado, contagiando alegría a todo el mundo."
        },
        "quimsa": {
            title: "Quimsa tuvo una mala noche, cayó ante Gimnasia y se complica en la final",
            tag: "Somos Deporte",
            date: "Miércoles 10 de Junio, 2026",
            image: "assets/quimsa_basquet.jpg",
            text: "La Fusión no pudo encontrar su juego característico en un partido duro y friccionado. A pesar del esfuerzo del plantel en el último cuarto, el conjunto de Comodoro Rivadavia se quedó con el punto clave. El próximo encuentro en Santiago será definitivo para las aspiraciones del campeonato."
        },
        "invierno": {
            title: "Lanzan el programa de actividades recreativas de invierno para personas mayores",
            tag: "Locales",
            date: "Viernes 12 de Junio, 2026",
            image: "assets/TalleresAdultos_2.jpg",
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

                // ... dentro del evento click de las newsCards, buscá esta parte:

            if (data) {
        mTag.textContent = data.tag;
        mTitle.textContent = data.title;
        mDate.textContent = data.date;
    
    // Inyección limpia y FORZADA de la imagen desde JavaScript
            mImgContainer.innerHTML = "";
            const img = document.createElement("img");
            img.src = data.image;
            img.alt = data.title;
    
    // --- ESTILOS EN LÍNEA DIRECTOS PARA EVITAR DESBORDES ---
    img.style.width = "100%";
    img.style.maxWidth = "100%";
    img.style.height = "380px";
    img.style.objectFit = "cover";
    img.style.display = "block";
    img.style.borderRadius = "12px";
    
    mImgContainer.appendChild(img);
    
    // Inyección limpia de texto
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