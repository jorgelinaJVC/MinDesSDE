/**
 * ============================================
 * INICIO FUNERARIOS - Lógica específica
 * ============================================
 * Descripción: Carga la configuración dinámica desde el backend
 *              para actualizar textos, FAQs, pasos y documentación
 *              en la página pública de inicio.
 * ============================================
 */

async function cargarConfiguracionPublica() {
    console.log('🔄 Iniciando carga de configuración dinámica...');
    
    try {
        // Nota: Asegúrate de que esta ruta sea correcta desde donde se ejecuta el HTML
        const apiUrl = '../sysfun/backend/api/configuracion_sitio.php?seccion=sitio';
        console.log('📡 Consultando API:', apiUrl);
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
        }
        
        const config = await response.json();
        console.log('📦 Respuesta cruda del servidor:', config);
        
        // Soporte para ambos formatos de respuesta
        const sitio = config.sitio || config; 
        
        if (!sitio || Object.keys(sitio).length === 0) {
            console.warn('⚠️ La configuración está vacía. Verifica la tabla configuracion_sitio en la BD.');
            return;
        }

        console.log('✅ Configuración procesada:', sitio);

        // 1. HEADER / LOGO
        if (sitio.titulo_principal) {
            const logoText = document.querySelector('.logo-text');
            if (logoText) {
                logoText.textContent = sitio.titulo_principal;
                console.log('📝 Actualizado: .logo-text');
            }
        }
        if (sitio.subtitulo) {
            const logoSub = document.querySelector('.logo-sub');
            if (logoSub) {
                logoSub.textContent = sitio.subtitulo;
                console.log('📝 Actualizado: .logo-sub');
            }
        }

        // 2. HERO SECTION
        if (sitio.hero_titulo) {
            const heroTitle = document.querySelector('.hero__title');
            if (heroTitle) {
                heroTitle.textContent = sitio.hero_titulo;
                console.log('📝 Actualizado: .hero__title');
            }
        }
        if (sitio.hero_descripcion) {
            const heroDesc = document.querySelector('.hero__subtitle');
            if (heroDesc) {
                heroDesc.textContent = sitio.hero_descripcion;
                console.log('📝 Actualizado: .hero__subtitle');
            }
        }
        if (sitio.hero_tiempo) {
            const heroTime = document.querySelector('.hero__time-estimate');
            if (heroTime) {
                heroTime.innerHTML = `<i class="far fa-clock"></i> Tiempo estimado de trámite: ${sitio.hero_tiempo}`;
                console.log('📝 Actualizado: .hero__time-estimate');
            }
        }

        // 3. BENEFICIOS
        if (sitio.beneficios_titulo) {
            const benTitle = document.querySelector('#beneficios .section-title');
            if (benTitle) {
                benTitle.textContent = sitio.beneficios_titulo;
                console.log('📝 Actualizado: #beneficios .section-title');
            }
        }
        const benefitCards = document.querySelectorAll('.servicio-card');
        if (sitio.beneficio_1_titulo && benefitCards[0]) {
            benefitCards[0].querySelector('h4').textContent = sitio.beneficio_1_titulo;
        }
        if (sitio.beneficio_1_desc && benefitCards[0]) {
            benefitCards[0].querySelector('p').textContent = sitio.beneficio_1_desc;
        }
        if (sitio.beneficio_2_titulo && benefitCards[1]) {
            benefitCards[1].querySelector('h4').textContent = sitio.beneficio_2_titulo;
        }
        if (sitio.beneficio_2_desc && benefitCards[1]) {
            benefitCards[1].querySelector('p').textContent = sitio.beneficio_2_desc;
        }
        if (sitio.beneficio_3_titulo && benefitCards[2]) {
            benefitCards[2].querySelector('h4').textContent = sitio.beneficio_3_titulo;
        }
        if (sitio.beneficio_3_desc && benefitCards[2]) {
            benefitCards[2].querySelector('p').textContent = sitio.beneficio_3_desc;
        }

        // 4. CONTACTO
        if (sitio.contacto_whatsapp) {
            const cleanPhone = sitio.contacto_whatsapp.replace(/[^0-9]/g, '');
            document.querySelectorAll('a[href*="wa.me"]').forEach(link => {
                link.href = `https://wa.me/54${cleanPhone}`;
            });
        }
        if (sitio.contacto_email) {
            document.querySelectorAll('a[href*="mailto"]').forEach(link => {
                link.href = `mailto:${sitio.contacto_email}`;
            });
        }
        if (sitio.contacto_telefono) {
            const cleanTel = sitio.contacto_telefono.replace(/[^0-9+]/g, '');
            document.querySelectorAll('a[href*="tel:"]').forEach(link => {
                link.href = `tel:${cleanTel}`;
            });
        }
        if (sitio.contacto_direccion) {
            const direccionEl = document.querySelector('.footer__brand p:last-of-type');
            if (direccionEl) {
                direccionEl.textContent = sitio.contacto_direccion;
            }
        }

        // 5. HORARIOS
        if (sitio.horarios_texto) {
            const horarioText = document.querySelector('.horario-card p strong');
            if (horarioText) {
                horarioText.textContent = sitio.horarios_texto;
            }
        }
        if (sitio.horarios_aviso) {
            const horarioAviso = document.querySelector('.horario-aviso');
            if (horarioAviso) {
                horarioAviso.innerHTML = `<i class="fas fa-info-circle"></i> ${sitio.horarios_aviso}`;
            }
        }

        // 6. DOCUMENTACIÓN NECESARIA
        if (sitio.doc_titulo) {
            const docTitle = document.getElementById('docTitulo');
            if (docTitle) {
                docTitle.textContent = sitio.doc_titulo;
                console.log('📝 Actualizado: #docTitulo');
            }
        }
        if (sitio.doc_desc) {
            const docDesc = document.getElementById('docDescripcion');
            if (docDesc) {
                docDesc.textContent = sitio.doc_desc;
                console.log('📝 Actualizado: #docDescripcion');
            }
        }

        if (sitio.doc_cards_json) {
            try {
                const docCards = JSON.parse(sitio.doc_cards_json);
                const docCardsContainer = document.getElementById('docCardsContainerPublico');
                
                if (docCardsContainer && docCards.length > 0) {
                    docCardsContainer.innerHTML = docCards.map(card => `
                        <div class="requisito-card">
                            <strong><i class="fas ${card.icono}"></i> ${card.titulo}</strong>
                            <p>${card.descripcion}</p>
                        </div>
                    `).join('');
                    console.log('📝 Actualizado: Tarjetas de documentación');
                }
            } catch (e) {
                console.error('❌ Error al parsear tarjetas de documentación:', e);
            }
        }

        // 7. PREGUNTAS FRECUENTES (FAQ)
        if (sitio.faq_json) {
            try {
                const faqs = JSON.parse(sitio.faq_json);
                const faqContainer = document.getElementById('faqContainerPublico');
                if (faqContainer && faqs.length > 0) {
                    faqContainer.innerHTML = faqs.map(item => `
                        <div class="faq-item">
                            <button class="faq-question" aria-expanded="false">
                                <span>${item.pregunta}</span>
                                <i class="fas fa-chevron-down"></i>
                            </button>
                            <div class="faq-answer"><p>${item.respuesta}</p></div>
                        </div>
                    `).join('');
                    console.log('📝 Actualizado: FAQ');
                    
                    document.querySelectorAll('.faq-question').forEach(button => {
                        button.addEventListener('click', function() {
                            const expanded = this.getAttribute('aria-expanded') === 'true';
                            document.querySelectorAll('.faq-question').forEach(btn => {
                                btn.setAttribute('aria-expanded', 'false');
                                btn.nextElementSibling.classList.remove('active');
                            });
                            if (!expanded) {
                                this.setAttribute('aria-expanded', 'true');
                                this.nextElementSibling.classList.add('active');
                            }
                        });
                    });
                }
            } catch (e) { 
                console.error('❌ Error al parsear FAQ:', e); 
            }
        }

        // 8. PASOS DEL PROCESO
        if (sitio.pasos_json) {
            try {
                const pasos = JSON.parse(sitio.pasos_json);
                const pasosContainer = document.getElementById('pasosGridPublico');
                if (pasosContainer && pasos.length > 0) {
                    pasosContainer.innerHTML = '';
                    pasos.forEach((paso, index) => {
                        const div = document.createElement('div');
                        div.className = 'paso-card';
                        div.innerHTML = `
                            <div class="paso-number">${index + 1}</div>
                            <h3>${paso.titulo}</h3>
                            <p>${paso.descripcion}</p>
                        `;
                        pasosContainer.appendChild(div);
                    });
                    console.log('📝 Actualizado: Pasos del proceso');
                }
            } catch (e) { 
                console.error('❌ Error al parsear Pasos:', e); 
            }
        }

        console.log('✅ Configuración dinámica aplicada correctamente en la página pública');

    } catch (error) {
        console.error('❌ Error crítico al cargar configuración dinámica:', error);
        console.log('📄 Se mantienen los valores estáticos por defecto del HTML');
    }
}

// Ejecutar al cargar el DOM
document.addEventListener('DOMContentLoaded', cargarConfiguracionPublica);