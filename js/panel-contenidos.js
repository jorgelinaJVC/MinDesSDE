/* =========================================================
   PANEL DE CONTENIDOS - MINISTERIO DE DESARROLLO SOCIAL
   Panel administrativo conectado a MySQL mediante API
========================================================= */
/* =========================================
   SESIÓN ADMINISTRATIVA
========================================= */

const adminSession =
    window.ADMIN_SESSION || {};
const csrfToken =
    adminSession.csrfToken || '';

const esSuperAdmin =
    adminSession.rol === 'superadmin';

const adminAreaId =
    adminSession.areaId !== null &&
        adminSession.areaId !== undefined
        ? Number(adminSession.areaId)
        : null;
let usuariosAdmin = [];


const data = {
    noticias: [],
    carrusel: [],
    videos: [],
    areas: [],
    papelera: []

};

let apiBase =
    '../backend-contenidos/api.php';
const $ = s => document.querySelector(s); const $$ = s => document.querySelectorAll(s);


function abrirModalNuevoUsuario() {

    if (!esSuperAdmin) {
        return;
    }


    const modal =
        document.querySelector(
            '#modalNuevoUsuario'
        );


    const form =
        document.querySelector(
            '#formNuevoUsuario'
        );


    const error =
        document.querySelector(
            '#errorNuevoUsuario'
        );


    if (!modal || !form) {
        return;
    }
    form.reset();
    if (error) {

        error.hidden = true;
        error.textContent = '';

    }

    cargarAreasNuevoUsuario();

    modal.classList.add('show');
}


function cerrarModalNuevoUsuario() {

    const modal =
        document.querySelector(
            '#modalNuevoUsuario'
        );


    if (modal) {
        modal.classList.remove('show');
    }
}

async function crearNuevoUsuario(event) {

    event.preventDefault();


    if (!esSuperAdmin) {
        return;
    }


    const form =
        event.currentTarget;


    const error =
        document.querySelector(
            '#errorNuevoUsuario'
        );


    const boton =
        document.querySelector(
            '#guardarNuevoUsuario'
        );


    const formData =
        new FormData(form);


    const nombre =
        String(
            formData.get('nombre') || ''
        ).trim();


    const usuario =
        String(
            formData.get('usuario') || ''
        ).trim();


    const areaId =
        Number(
            formData.get('area_id')
        );


    const password =
        String(
            formData.get('password') || ''
        );


    const password2 =
        String(
            document.querySelector(
                '#nuevoUsuarioPassword2'
            )?.value || ''
        );


    if (password !== password2) {

        if (error) {

            error.textContent =
                'Las contraseñas no coinciden.';

            error.hidden = false;

        }

        return;
    }


    if (password.length < 8) {

        if (error) {

            error.textContent =
                'La contraseña debe tener al menos 8 caracteres.';

            error.hidden = false;

        }

        return;
    }


    if (!areaId) {

        if (error) {

            error.textContent =
                'Seleccioná un área.';

            error.hidden = false;

        }

        return;
    }


    if (error) {

        error.hidden = true;
        error.textContent = '';

    }


    try {

        if (boton) {

            boton.disabled = true;
            boton.textContent =
                'Creando...';

        }


        const respuesta =
            await api(
                '?action=user-create',
                {
                    method: 'POST',

                    body: JSON.stringify({
                        nombre: nombre,
                        usuario: usuario,
                        password: password,
                        area_id: areaId
                    })
                }
            );


        if (!respuesta.ok) {

            throw new Error(
                respuesta.message ||
                'No se pudo crear el administrador'
            );
        }


        cerrarModalNuevoUsuario();


        toast(
            'Administrador creado correctamente'
        );


        /*
           Volvemos a consultar MySQL.
        */

        await cargarUsuarios();


    } catch (err) {

        console.error(
            'Error creando administrador:',
            err
        );


        if (error) {

            error.textContent =
                err.message ||
                'No se pudo crear el administrador.';

            error.hidden = false;

        }

    } finally {

        if (boton) {

            boton.disabled = false;
            boton.textContent =
                'Crear administrador';

        }

    }
}
function campoAreaContenido(item = null) {

    /*
       SuperAdmin:
       por ahora no modificamos su comportamiento.
    */

    if (esSuperAdmin) {
        return '';
    }


    /*
       Admin6 - Promoción Humana

       Puede publicar contenido para:
       6 = Subsecretaría de Promoción Humana
       8 = Viviendas
    */

    if (adminAreaId === 6) {

        const areaSeleccionada =
            item?.area_id
                ? Number(item.area_id)
                : 6;

        return `
            <div class="field">
                <label>Área de publicación</label>

                <select name="area_id" required>

                    <option
                        value="6"
                        ${areaSeleccionada === 6 ? 'selected' : ''}
                    >
                        Subsecretaría de Promoción Humana
                    </option>

                    <option
                        value="8"
                        ${areaSeleccionada === 8 ? 'selected' : ''}
                    >
                        Viviendas
                    </option>

                </select>

                <small>
                    Seleccioná dónde se publicará el contenido.
                </small>
            </div>
        `;
    }


    /*
       Los demás administradores solamente
       pueden utilizar su propia área.

       No necesitan elegirla manualmente.
    */

    return '';
}
function escapeHTML(v = '') { return String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;') }
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2500) }


/* NAVEGACIÓN */
const descriptions = {
    dashboard: 'Resumen general del contenido institucional.',
    noticias: 'Crear y administrar publicaciones institucionales.',
    carrusel: 'Administrar imágenes destacadas de la portada.',
    videos: 'Administrar videos institucionales.',
    areas: 'Administrar áreas institucionales.',
    usuarios: 'Administrar usuarios y permisos del panel.',
    auditoria: 'Consultar el historial de acciones realizadas en el panel.',
    papelera: 'Restaurar o eliminar contenidos.'
};
$$('.menu button').forEach(b => {

    b.onclick = () => {

        const section = b.dataset.section;

        /* Quitar selección del menú */
        $$('.menu button').forEach(x =>
            x.classList.remove('active')
        );

        b.classList.add('active');


        /* Ocultar todas las secciones */
        $$('.section').forEach(s =>
            s.classList.remove('active')
        );


        /* Mostrar sección seleccionada */
        const seccionActual = $('#' + section);

        if (seccionActual) {
            seccionActual.classList.add('active');
        }


        /* Título */
        const textoTitulo =
            b.querySelector('span')?.childNodes[0]?.textContent.trim()
            || b.textContent.trim();

        $('#pageTitle').textContent =
            textoTitulo;


        /* Descripción */
        $('#pageDescription').textContent =
            descriptions[section] || '';


        /* Render general */
        renderAll();
        /* =========================================
           SOLICITUDES PENDIENTES - SUPERADMIN
        ========================================= */
        if (
            section === 'solicitudes' &&
            esSuperAdmin
        ) {
            renderSolicitudesPendientes();
        }
        /* =====================================
           USUARIOS - SOLO SUPERADMIN
        ===================================== */

        if (
            section === 'usuarios' &&
            esSuperAdmin
        ) {
            cargarUsuarios();
        }
        /* =====================================
           AUDITORÍA - SOLO SUPERADMIN
            ===================================== */
        if (
            section === 'auditoria' &&
            esSuperAdmin
        ) {
            cargarAuditoria();
        }

    };
});
/* MODAL */
const modal = $('#modal'); const form = $('#modalForm');
let modalAnterior = null;
function guardarModalActual() {

    modalAnterior = {
        titulo: $('#modalTitle').textContent,
        subtitulo: $('#modalSubtitle').textContent,
        contenido: Array.from(form.childNodes),
        onsubmit: form.onsubmit
    };

}
function volverModalAnterior() {

    if (!modalAnterior) {
        closeModal();
        return;
    }

    $('#modalTitle').textContent =
        modalAnterior.titulo;

    $('#modalSubtitle').textContent =
        modalAnterior.subtitulo;

    form.replaceChildren(
        ...modalAnterior.contenido
    );

    form.onsubmit =
        modalAnterior.onsubmit;

    modalAnterior = null;
}
$('#modalClose').onclick = () => {
    if (modalAnterior) {
        volverModalAnterior();
    } else {
        closeModal();
    }
};

modal.onclick = e => {
    if (e.target === modal) {
        if (modalAnterior) {
            volverModalAnterior();
        } else {
            closeModal();
        }
    }
};
function openModal(title, subtitle, html, submit) { $('#modalTitle').textContent = title; $('#modalSubtitle').textContent = subtitle || ''; form.innerHTML = html; form.onsubmit = e => { e.preventDefault(); submit(new FormData(form)) }; modal.classList.add('show'); bindImagePreview() }
function closeModal() { modal.classList.remove('show'); form.innerHTML = '' }
function imageField() { return `<div class="field full"><label>Imagen</label><input type="file" name="imagen" accept="image/*"><div class="img-holder"></div></div>` }
function bindImagePreview() { const input = form.querySelector('input[type=file]'); if (!input) return; input.onchange = () => { const f = input.files[0]; if (!f) return; const r = new FileReader(); r.onload = e => { const h = form.querySelector('.img-holder'); h.innerHTML = `<img class="image-preview" src="${e.target.result}">`; }; r.readAsDataURL(f) } }

/* 2. CARRUSEL */
$('#btnNuevoSlide').onclick = () => openSlide();
function openSlide(item = null) {
    openModal(
        item ? 'Editar slide' : 'Nuevo slide',
        'Contenido destacado de portada',
        `
        <div class="form-grid">
            <div class="field">
                <label>Título</label>
                <input
                    name="titulo"
                    required
                    value="${escapeHTML(item?.titulo || '')}"
                >
            </div>
            ${campoAreaContenido(item)}
            <div class="field">
                <label>Botón</label>
                <input
                    name="boton"
                    value="${escapeHTML(item?.boton || 'Ver más')}"
                >
            </div>
            <div class="field full">
                <label>Texto</label>
                <textarea
                    name="texto"
                >${escapeHTML(item?.texto || '')}</textarea>
            </div>
            ${imageField()}
            <div class="field">
                <label>Enlace</label>
                <input
                    name="enlace"
                    type="url"
                    value="${escapeHTML(item?.enlace || '')}">
            </div>
            <div class="field">
                <label>Orden</label>
                <input
                    name="orden"
                    type="number"
                    min="1"
                    value="${item?.orden || data.carrusel.length + 1}">
            </div>
            <div class="field">
               <label>Estado</label>

               <input
                  type="text"
                  name="estado"
                  value="${escapeHTML(item?.estado || 'Borrador')}"
                  readonly
                >

                <small>
                  La publicación debe ser aprobada por el SuperAdministrador.
                </small>
            </div>
        </div>
        <div class="form-actions">
        <button
        type="button"
        class="btn-secondary"
        onclick="volverModalAnterior()"
        >
        Cancelar
        </button>
        <button
        type="button"
        class="btn-light"
        id="slidePreview"
        >
        Vista previa
        </button>
        <button class="btn-primary">
        Guardar
        </button>
        </div>
        `,
        async fd => {
            const archivo =
                fd.get('imagen');
            if (item) {
                try {
                    const imagenAnterior =
                        item.imagen || null;
                    let rutaImagen =
                        imagenAnterior;
                    let cambioImagen =
                        false;

                    /* =====================================
                       SI SELECCIONÓ UNA IMAGEN NUEVA
                    ===================================== */
                    if (
                        archivo &&
                        archivo.size > 0
                    ) {
                        rutaImagen =
                            await subirImagenCarrusel(
                                archivo
                            );
                        cambioImagen = true;
                    }


                    /* =====================================
                       PREPARAR DATOS
                    ===================================== */

                    const slideEditado = {
                        id:
                            Number(item.id),
                        area_id:
                            adminAreaId === 6
                                ? Number(fd.get('area_id'))
                                : item.area_id,
                        titulo:
                            fd.get('titulo'),
                        categoria:
                            null,
                        descripcion:
                            fd.get('texto'),
                        imagen:
                            rutaImagen,
                        url:
                            fd.get('enlace') || null,
                        estado:
                            item?.estado || 'Borrador',
                        orden:
                            Number(
                                fd.get('orden')
                            ) || 1,
                        activo:
                            item?.estado === 'Publicada'
                                ? 1
                                : 0
                    };


                    /* =====================================
                       ACTUALIZAR MYSQL
                    ===================================== */

                    const respuesta =
                        await api(
                            '?action=update',
                            {
                                method: 'POST',

                                body:
                                    JSON.stringify(
                                        slideEditado
                                    )
                            }
                        );


                    if (!respuesta.ok) {

                        throw new Error(
                            respuesta.message ||
                            "No se pudo editar el slide"
                        );
                    }

                    /* =====================================
                       ACTUALIZAR PANEL
                    ===================================== */

                    closeModal();

                    toast(
                        "Slide modificado correctamente"
                    );

                    await cargarCarruselDesdeMySQL();


                } catch (error) {

                    console.error(
                        "Error editando slide:",
                        error
                    );

                    alert(
                        "No se pudo modificar el slide.\n\n" +
                        error.message
                    );
                }


                return;
            }
            let rutaImagen = null;
            try {

                /* =====================================
                   1. COMPROBAR IMAGEN
                ===================================== */

                if (
                    !archivo ||
                    archivo.size === 0
                ) {

                    toast(
                        'Seleccioná una imagen'
                    );

                    return;
                }


                /* =====================================
                   2. SUBIR IMAGEN
                ===================================== */

                rutaImagen =
                    await subirImagenCarrusel(
                        archivo
                    );

                /* =====================================
                   3. PREPARAR DATOS
                ===================================== */

                const diapositiva = {

                    tipo:
                        'carrusel',
                    area_id:
                        adminAreaId === 6
                            ? Number(fd.get('area_id'))
                            : adminAreaId,

                    titulo:
                        fd.get('titulo'),

                    categoria:
                        null,

                    descripcion:
                        fd.get('texto'),

                    imagen:
                        rutaImagen,

                    url:
                        fd.get('enlace') || null,

                    estado:
                        'Borrador',

                    orden:
                        Number(
                            fd.get('orden')
                        ) || 1,

                    activo:
                        0
                };


                /* =====================================
                   4. GUARDAR EN MYSQL
                ===================================== */

                const respuesta =
                    await api(
                        '?action=create',
                        {
                            method: 'POST',

                            body:
                                JSON.stringify(
                                    diapositiva
                                )
                        }
                    );

                if (!respuesta.ok) {

                    throw new Error(
                        respuesta.message ||
                        'No se pudo guardar el slide'
                    );
                }


                /* =====================================
                   5. CERRAR Y ACTUALIZAR
                ===================================== */

                closeModal();

                toast(
                    'Slide guardado en MySQL'
                );

                await cargarCarruselDesdeMySQL();


            } catch (error) {
                console.error(
                    'Error guardando slide:',
                    error
                );

                alert(
                    'No se pudo guardar el slide.\n\n' +
                    error.message
                );
            }
        }
    );




}
function renderCarrusel() {
    $('#listaCarrusel').innerHTML =
        data.carrusel
            .sort(
                (a, b) =>
                    a.orden - b.orden
            )
            .map(x => `
                <article class="card">
                    <div class="card-img">
                        ${x.imagen
                    ? `
                                <img
                                    src="${x.imagen}"
                                    alt="${escapeHTML(x.titulo)}"
                                >
                              `
                    : `
                                <div class="empty">
                                    Sin imagen
                                </div>
                              `
                }
                    </div>
                    <div class="card-body">
                        <div class="meta">
                            Orden ${x.orden}
                            ·
                            ${x.activo
                    ? 'Activo'
                    : 'Inactivo'
                }
                        </div>
                        <h3>
                            ${escapeHTML(x.titulo)}
                        </h3>
                        <p>
                            ${escapeHTML(x.texto || '')}
                        </p>
                        <div class="actions">

                            ${esSuperAdmin || ['Borrador', 'Rechazada'].includes(x.estado)
                    ? `
                                 <button
                                     class="btn-light"
                                     type="button"
                                     onclick="editItem('carrusel', ${x.id})"
                                 >
                                   Editar
                                 </button>
                                 `
                    : ''
                }

                            ${!esSuperAdmin && ['Borrador', 'Rechazada'].includes(x.estado)
                    ? `
                                  <button
                                     class="btn-primary"
                                     type="button"
                                     onclick="enviarCarruselAprobacion(${x.id})"
                                  >
                                     Enviar a aprobación
                                  </button>
                              `
                    : ''
                }

                            ${x.estado === 'Pendiente'
                    ? `
                                 <span class="badge pending">
                                      Pendiente de aprobación
                                 </span>
                                `
                    : ''
                }

                           ${x.estado === 'Publicada'
                    ? `
                                 <span class="badge published">
                                    Publicado
                                </span>
                                `
                    : ''
                }

                            ${x.estado === 'Rechazada'
                    ? `
                                 <span class="badge rejected">
                                     Rechazado
                                 </span>

                                 ${x.motivo_rechazo
                        ? `
                                         <div class="motivo-rechazo">
                                           <strong>Motivo del rechazo:</strong>
                                           ${escapeHTML(x.motivo_rechazo)}
                                        </div>
                                       `
                        : ''
                    }
                                `
                    : ''
                }


                            <button
                                class="btn-danger"
                                type="button"
                                onclick="enviarCarruselPapelera(${x.id})"
                            >
                                Papelera
                            </button>

                        </div>

                    </div>

                </article>

            `)

            .join('')

        ||

        empty(
            'No hay slides en el carrusel.'
        );
}
async function cargarCarruselDesdeMySQL() {

    try {

        const respuesta =
            await api(
                "?action=list&tipo=carrusel"
            );


        if (!respuesta.ok) {

            throw new Error(
                respuesta.message ||
                "No se pudo cargar el carrusel"
            );
        }


        data.carrusel =
            respuesta.data.map(slide => ({

                id:
                    Number(slide.id),

                titulo:
                    slide.titulo || "",

                texto:
                    slide.descripcion || "",

                /*
                   Por ahora no tenemos una columna
                   específica para el texto del botón.
                */
                boton:
                    "Ver más",

                enlace:
                    slide.url || "",

                imagen:
                    slide.imagen || "",

                orden:
                    Number(slide.orden) || 1,
                estado:
                    slide.estado || 'Borrador',

                motivo_rechazo:
                    slide.motivo_rechazo || '',

                area_id:
                    slide.area_id !== null &&
                        slide.area_id !== undefined
                        ? Number(slide.area_id)
                        : null,

                activo:
                    Number(slide.activo) === 1

            }));


        renderCarrusel();

        updateDashboard();
        if (esSuperAdmin) {
            renderSolicitudesPendientes();
        }
    } catch (error) {

        console.error(
            "Error cargando carrusel:",
            error
        );

        toast(
            "No se pudo cargar el carrusel"
        );
    }
}
/* =========================================
   CARRUSEL - ENVIAR A APROBACIÓN
========================================= */

async function enviarCarruselAprobacion(id) {

    if (esSuperAdmin) {
        return;
    }

    const confirmar = confirm(
        '¿Querés enviar este slide a Sosa para su aprobación?'
    );

    if (!confirmar) {
        return;
    }

    try {

        const respuesta = await api(
            '?action=submit-carousel',
            {
                method: 'POST',

                body: JSON.stringify({
                    id: Number(id)
                })
            }
        );

        if (!respuesta.ok) {

            throw new Error(
                respuesta.message ||
                'No se pudo enviar el slide a aprobación'
            );
        }

        toast(
            'Slide enviado a aprobación'
        );

        /*
           Volvemos a consultar MySQL.

           El slide ahora debería llegar
           con estado = Pendiente.
        */

        await cargarCarruselDesdeMySQL();

    } catch (error) {

        console.error(
            'Error enviando carrusel a aprobación:',
            error
        );

        alert(
            'No se pudo enviar el slide a aprobación.\n\n' +
            error.message
        );
    }
}
async function enviarCarruselPapelera(id) {

    const confirmar = confirm(
        "¿Querés enviar este slide del carrusel a la papelera?"
    );

    if (!confirmar) {
        return;
    }


    try {

        const respuesta = await api(
            '?action=trash',
            {
                method: 'POST',

                body: JSON.stringify({
                    id: Number(id)
                })
            }
        );

        if (!respuesta.ok) {

            throw new Error(
                respuesta.message ||
                "No se pudo enviar el slide a la papelera"
            );
        }


        toast(
            "Slide enviado a la papelera"
        );


        /* Recargar carrusel */

        await cargarCarruselDesdeMySQL();


        /* Recargar papelera */

        await cargarPapeleraDesdeMySQL();


    } catch (error) {

        console.error(
            "Error enviando slide a papelera:",
            error
        );


        alert(
            "No se pudo enviar el slide a la papelera.\n\n" +
            error.message
        );
    }
}

/* =========================================================
   4. VIDEOS - MYSQL
========================================================= */

$('#btnNuevoVideo').onclick = () => openVideo();


function youtubeId(url = '') {

    const m = url.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/
    );

    return m ? m[1] : '';
}
async function subirVideoPropio(archivo) {

    if (!archivo || archivo.size === 0) {
        throw new Error(
            'Seleccioná un video'
        );
    }

    const datos =
        new FormData();

    datos.append(
        'tipo',
        'videos'
    );

    datos.append(
        'video',
        archivo
    );

    const respuesta =
        await fetch(
            '../backend-contenidos/upload.php',
            {
                method: 'POST',

                headers: {
                    'X-CSRF-Token':
                        csrfToken
                },

                body:
                    datos
            }
        );

    const textoRespuesta =
        await respuesta.text();

    let resultado;

    try {

        resultado =
            JSON.parse(textoRespuesta);

    } catch (error) {

        console.error(
            'El servidor devolvió una respuesta inválida.'
        );

        throw new Error(
            'No se pudo procesar la respuesta del servidor.'
        );
    }

    if (
        !respuesta.ok ||
        !resultado.ok
    ) {
        throw new Error(
            resultado.message ||
            'No se pudo subir el video'
        );
    }

    if (!resultado.ruta) {
        throw new Error(
            'El servidor no devolvió la ruta del video'
        );
    }

    return resultado.ruta;
}


function openVideo(item = null) {
    const itemTieneVideoPropio =
        Boolean(
            item?.url &&
            /uploads\/videos\/[a-f0-9]{32}\.(mp4|webm)$/i.test(
                item.url
            )
        );

    openModal(

        item ? 'Editar video' : 'Nuevo video',

        'Elegí YouTube o subí un video propio',

        `
        <div class="form-grid">

            <div class="field full">
                <label>Título</label>

                <input
                    name="titulo"
                    required
                    value="${escapeHTML(item?.titulo || '')}"
                >
            </div>


            <div class="field full">
              <label>Origen del video</label>

              <select name="origen_video" id="origenVideo">
                 <option
                     value="youtube"
                     ${itemTieneVideoPropio ? '' : 'selected'}
                >
                  YouTube
                </option>
                <option
                   value="propio"
                   ${itemTieneVideoPropio ? 'selected' : ''}
                >
                   Subir video propio
                </option>
              </select>
            </div>

            <div
               class="field full"
               id="campoYoutube"
            >
               <label>URL de YouTube</label>

               <input
                  name="url"
                  id="urlVideo"
                  type="url"
                  value="${escapeHTML(
            item?.url && !itemTieneVideoPropio
                ? item.url
                : ''
        )}"
                >

                <small>
                    Pegá el enlace del video de YouTube.
                </small>
            </div>

            <div
               class="field full"
               id="campoVideoPropio"
               hidden
            >
                 <label>Video propio</label>

                <input
                     name="archivo_video"
                     id="archivoVideo"
                     type="file"
                     accept="video/mp4,video/webm"
                >

                <small>
                    Formatos permitidos: MP4 o WEBM.
                    Máximo: 100 MB.
                </small>
            </div>


            <div class="field full">
                <label>Descripción</label>

                <textarea
                    name="descripcion"
                >${escapeHTML(item?.descripcion || '')}</textarea>
            </div>
                ${campoAreaContenido(item)}
                <div class="field">
                <label>Estado</label>
                <input
                type="text"
                name="estado"
                value="${escapeHTML(item?.estado || 'Borrador')}"
                readonly
                >
                <small>
                El video debe ser aprobado por el SuperAdministrador.
                </small>
                </div>
        </div>

        <div class="form-actions">
        <button
        type="button"
        class="btn-secondary"
        onclick="closeModal()"
        >
        Cancelar
        </button>

    <button
        type="button"
        class="btn-light"
        id="videoPreview"
        >
         Vista previa
         </button>

    <button class="btn-primary">
        Guardar
    </button>
    </div>
        `,


        async fd => {

            const origen =
                fd.get('origen_video');

            let url =
                String(fd.get('url') || '').trim();

            const archivoVideo =
                fd.get('archivo_video');

            try {

                /* YOUTUBE */
                if (origen === 'youtube') {

                    const idYoutube =
                        youtubeId(url);

                    if (!idYoutube) {
                        toast(
                            'La URL de YouTube no es válida'
                        );
                        return;
                    }
                }

                /* VIDEO PROPIO */
                if (origen === 'propio') {

                    const hayArchivoNuevo =
                        archivoVideo &&
                        archivoVideo.size > 0;

                    if (hayArchivoNuevo) {

                        toast('Subiendo video...');

                        url =
                            await subirVideoPropio(
                                archivoVideo
                            );

                    } else if (
                        item &&
                        itemTieneVideoPropio
                    ) {

                        url = item.url;

                    } else {

                        toast(
                            'Seleccioná un video'
                        );

                        return;
                    }
                }

                /* DATOS DEL VIDEO */
                const video = {

                    titulo:
                        fd.get('titulo'),

                    categoria:
                        null,

                    descripcion:
                        fd.get('descripcion'),

                    imagen:
                        null,

                    url:
                        url,

                    area_id:
                        adminAreaId === 6
                            ? Number(fd.get('area_id'))
                            : adminAreaId,

                    estado:
                        item?.estado || 'Borrador',

                    orden:
                        1,

                    activo:
                        item?.estado === 'Publicada'
                            ? 1
                            : 0
                };

                /* EDITAR */
                if (item) {

                    video.id =
                        Number(item.id);

                    const respuesta =
                        await api(
                            '?action=update',
                            {
                                method: 'POST',
                                body:
                                    JSON.stringify(video)
                            }
                        );

                    if (!respuesta.ok) {
                        throw new Error(
                            respuesta.message ||
                            'No se pudo modificar el video'
                        );
                    }

                    closeModal();

                    toast(
                        'Video modificado correctamente'
                    );

                    await cargarVideosDesdeMySQL();

                    return;
                }

                /* CREAR */
                video.tipo =
                    'video';

                video.estado =
                    'Borrador';

                video.activo =
                    0;

                const respuesta =
                    await api(
                        '?action=create',
                        {
                            method: 'POST',
                            body:
                                JSON.stringify(video)
                        }
                    );

                if (!respuesta.ok) {
                    throw new Error(
                        respuesta.message ||
                        'No se pudo guardar el video'
                    );
                }

                closeModal();

                toast(
                    'Video guardado en MySQL'
                );

                await cargarVideosDesdeMySQL();

            } catch (error) {

                console.error(
                    'Error guardando video:',
                    error
                );

                alert(
                    'No se pudo guardar el video.\n\n' +
                    error.message
                );
            }
        }
    );
    const configurarOrigenVideo = () => {

        const selector =
            $('#origenVideo');

        const campoYoutube =
            $('#campoYoutube');

        const campoVideoPropio =
            $('#campoVideoPropio');

        const inputYoutube =
            $('#urlVideo');

        const inputArchivo =
            $('#archivoVideo');

        if (
            !selector ||
            !campoYoutube ||
            !campoVideoPropio
        ) {
            return;
        }

        const actualizarCampos = () => {

            const esVideoPropio =
                selector.value === 'propio';

            campoYoutube.hidden =
                esVideoPropio;

            campoVideoPropio.hidden =
                !esVideoPropio;

            if (inputYoutube) {
                inputYoutube.required =
                    !esVideoPropio;
            }

            if (inputArchivo) {

                inputArchivo.required =
                    esVideoPropio &&
                    !itemTieneVideoPropio;
            }
        };

        selector.onchange =
            actualizarCampos;

        actualizarCampos();
    };

    configurarOrigenVideo();

    setTimeout(() => {

        const botonPreview =
            $('#videoPreview');

        if (!botonPreview) {
            return;
        }

        botonPreview.onclick = () => {

            const origen =
                $('#origenVideo')?.value;

            const titulo =
                $('#modalForm [name=titulo]')?.value || '';

            const descripcion =
                $('#modalForm [name=descripcion]')?.value || '';

            /* =====================================
               VIDEO PROPIO
            ===================================== */
            if (origen === 'propio') {

                const inputArchivo =
                    $('#archivoVideo');

                const archivo =
                    inputArchivo?.files?.[0];

                let urlPreview = '';

                /*
                   Si seleccionó un archivo nuevo,
                   usamos una URL temporal del navegador.
                */
                if (archivo && archivo.size > 0) {

                    urlPreview =
                        URL.createObjectURL(
                            archivo
                        );

                    /*
                       Si está editando un video propio
                       y no eligió otro archivo,
                       mostramos el que ya existe.
                    */
                } else if (
                    item &&
                    itemTieneVideoPropio
                ) {

                    urlPreview =
                        item.url;

                } else {

                    toast(
                        'Seleccioná un video para la vista previa'
                    );

                    return;
                }

                guardarModalActual();

                abrirVistaPreviaSolicitud(
                    'video',
                    {
                        titulo: titulo,
                        url: urlPreview,
                        youtubeId: '',
                        descripcion: descripcion
                    }
                );

                return;
            }

            /* =====================================
               YOUTUBE
            ===================================== */

            const url =
                $('#urlVideo')?.value?.trim() || '';

            const idYoutube =
                youtubeId(url);

            if (!idYoutube) {

                toast(
                    'Ingresá una URL válida de YouTube'
                );

                return;
            }

            guardarModalActual();

            abrirVistaPreviaSolicitud(
                'video',
                {
                    titulo: titulo,
                    url: url,
                    youtubeId: idYoutube,
                    descripcion: descripcion
                }
            );
        };

    }, 0);
}
async function cargarVideosDesdeMySQL() {

    try {
        const respuesta =
            await api(
                '?action=list&tipo=video'
            );

        if (!respuesta.ok) {

            throw new Error(
                respuesta.message ||
                'No se pudieron cargar los videos'
            );
        }


        data.videos =
            respuesta.data.map(video => ({

                id:
                    Number(video.id),

                titulo:
                    video.titulo || '',

                url:
                    video.url || '',

                youtubeId:
                    youtubeId(
                        video.url || ''
                    ),

                descripcion:
                    video.descripcion || '',

                area_id:
                    video.area_id !== null &&
                        video.area_id !== undefined
                        ? Number(video.area_id)
                        : null,

                area:
                    video.area ||
                    nombreAreaPorId(video.area_id),

                estado:
                    video.estado || 'Borrador',

                motivo_rechazo:
                    video.motivo_rechazo || '',

                activo:
                    Number(video.activo) === 1

            }));


        renderVideos();

        updateDashboard();
        if (esSuperAdmin) {
            renderSolicitudesPendientes();
        }


    } catch (error) {

        console.error(
            'Error cargando videos:',
            error
        );


        toast(
            'No se pudieron cargar los videos'
        );
    }
}
function renderVideos() {

    $('#listaVideos').innerHTML =

        data.videos.map(x => {

            let acciones = '';

            /*
               EDITAR

               El administrador de área solamente puede
               editar videos en Borrador o Rechazados.

               El SuperAdmin puede visualizar y gestionar
               el contenido desde su rol.
            */
            if (
                esSuperAdmin ||
                x.estado === 'Borrador' ||
                x.estado === 'Rechazada'
            ) {
                acciones += `
                    <button
                        class="btn-light"
                        type="button"
                        onclick="editItem('videos', ${x.id})"
                    >
                        Editar
                    </button>
                `;
            }


            /*
               ENVIAR A APROBACIÓN

               Solo administradores de área.
            */
            if (
                !esSuperAdmin &&
                (
                    x.estado === 'Borrador' ||
                    x.estado === 'Rechazada'
                )
            ) {
                acciones += `
                    <button
                        class="btn-primary"
                        type="button"
                        onclick="enviarVideoAprobacion(${x.id})"
                    >
                        Enviar a aprobación
                    </button>
                `;
            }


            /*
               PAPELERA

               Un administrador de área no puede enviar
               un video pendiente a la papelera.
            */
            if (
                esSuperAdmin ||
                x.estado !== 'Pendiente'
            ) {
                acciones += `
                    <button
                        class="btn-danger"
                        type="button"
                        onclick="enviarVideoPapelera(${x.id})"
                    >
                        Papelera
                    </button>
                `;
            }


            /*
               MOTIVO DEL RECHAZO
            */
            let rechazo = '';

            if (
                x.estado === 'Rechazada' &&
                x.motivo_rechazo
            ) {
                rechazo = `
                    <div class="motivo-rechazo">
                        <strong>Motivo del rechazo:</strong>
                        ${escapeHTML(x.motivo_rechazo)}
                    </div>
                `;
            }


            return `
                <article class="card">

                    <div class="video-thumb">

                        ${x.youtubeId

                    ? `
        <iframe
            src="https://www.youtube.com/embed/${encodeURIComponent(x.youtubeId)}"
            title="${escapeHTML(x.titulo)}"
            loading="lazy"
            allowfullscreen>
        </iframe>
      `

                    : (
                        x.url &&
                            /uploads\/videos\/[a-f0-9]{32}\.(mp4|webm)$/i.test(x.url)

                            ? `
                <video
                    controls
                    preload="metadata"
                    style="width:100%; height:100%; object-fit:cover;"
                >
                    <source
                        src="${escapeHTML(x.url)}"
                    >
                    Tu navegador no puede reproducir este video.
                </video>
              `

                            : `
                <div class="empty">
                    Video no disponible
                </div>
              `
                    )
                }

                    </div>

                    <div class="card-body">

                        <span class="badge ${claseEstadoNoticia(x.estado)}">
                            ${escapeHTML(x.estado)}
                        </span>

                        <div class="meta">
                            ${escapeHTML(x.area || 'Sin área')}
                        </div>

                        <h3>
                            ${escapeHTML(x.titulo)}
                        </h3>

                        <p>
                            ${escapeHTML(x.descripcion || '')}
                        </p>

                        ${rechazo}

                        <div class="actions">
                            ${acciones}
                        </div>

                    </div>

                </article>
            `;

        }).join('')

        ||

        empty(
            'No hay videos.'
        );
}
/* =========================================
   VIDEO - ENVIAR A APROBACIÓN
========================================= */

async function enviarVideoAprobacion(id) {

    if (esSuperAdmin) {
        return;
    }

    const video =
        data.videos.find(
            item => Number(item.id) === Number(id)
        );

    if (!video) {
        alert(
            'No se encontró el video.'
        );

        return;
    }

    if (
        video.estado !== 'Borrador' &&
        video.estado !== 'Rechazada'
    ) {
        alert(
            'Este video no puede enviarse a aprobación.'
        );

        return;
    }

    const confirmar = confirm(
        `¿Querés enviar este video a Sosa para su aprobación?\n\n${video.titulo}`
    );

    if (!confirmar) {
        return;
    }

    try {

        const respuesta = await api(
            '?action=submit-video',
            {
                method: 'POST',

                body: JSON.stringify({
                    id: Number(id)
                })
            }
        );

        if (!respuesta.ok) {
            throw new Error(
                respuesta.message ||
                'No se pudo enviar el video a aprobación'
            );
        }

        toast(
            'Video enviado a aprobación'
        );

        await cargarVideosDesdeMySQL();

        renderSolicitudesPendientes();

    } catch (error) {

        console.error(
            'Error enviando video a aprobación:',
            error
        );

        alert(
            'No se pudo enviar el video a aprobación.\n\n' +
            error.message
        );
    }
}
async function enviarVideoPapelera(id) {

    const confirmar = confirm(
        '¿Querés enviar este video a la papelera?'
    );


    if (!confirmar) {
        return;
    }


    try {

        const respuesta =
            await api(
                '?action=trash',
                {
                    method: 'POST',

                    body:
                        JSON.stringify({
                            id: Number(id)
                        })
                }
            );


        if (!respuesta.ok) {

            throw new Error(
                respuesta.message ||
                'No se pudo enviar el video a la papelera'
            );
        }


        toast(
            'Video enviado a la papelera'
        );


        await cargarVideosDesdeMySQL();

        await cargarPapeleraDesdeMySQL();


    } catch (error) {

        console.error(
            'Error enviando video a papelera:',
            error
        );


        alert(
            'No se pudo enviar el video a la papelera.\n\n' +
            error.message
        );
    }
}

/* 5. ÁREAS */
function renderAreas() {
    $('#listaAreas').innerHTML =
        data.areas
            .sort((a, b) => a.id - b.id)
            .map(x => `
                <article class="card">
                    <div class="card-body">
                        <span class="badge ${x.activo ? 'published' : 'draft'}">
                            ${x.activo ? 'Activa' : 'Inactiva'}
                        </span>

                        <h3>${escapeHTML(x.nombre)}</h3>

                        <p>
                            ${escapeHTML(x.codigo || '')}
                        </p>

                        <div class="meta">
                            ID ${x.id}
                        </div>
                    </div>
                </article>
            `)
            .join('');
}

/* 6. PAPELERA */

function renderTrash() {

    $('#listaPapelera').innerHTML =
        data.papelera.map(x => `

            <article class="card">
            ${x.type === 'video'
                ? `
        <div class="card-img">

            ${youtubeId(x.item.url || '')
                    ? `
                    <img
                        src="https://img.youtube.com/vi/${encodeURIComponent(
                        youtubeId(x.item.url || '')
                    )}/hqdefault.jpg"
                        alt="${escapeHTML(x.item.titulo || 'Video')}"
                    >
                  `

                    : (
                        x.item.url &&
                            /uploads\/videos\/[a-f0-9]{32}\.(mp4|webm)$/i.test(
                                x.item.url
                            )

                            ? `
                    <video
                        controls
                        preload="metadata"
                        style="width:100%; height:100%; object-fit:cover;"
                    >
                        <source
                            src="${escapeHTML(x.item.url)}"
                        >
                        Tu navegador no puede reproducir este video.
                    </video>
                  `

                            : `
                    <div class="empty">
                        Video no disponible
                    </div>
                  `
                    )
                }

        </div>
      `
                : x.item.imagen
                    ? `
                    <div class="card-img">
                        <img
                            src="${x.item.imagen}"
                            alt="${escapeHTML(x.item.titulo || 'Contenido')}"
                        >
                    </div>
                  `
                    : ''
            }

                <div class="card-body">

                    <span class="badge draft">
                        ${escapeHTML(x.type)}
                    </span>

                    <h3>
                        ${escapeHTML(
                x.item.titulo ||
                x.item.nombre ||
                'Elemento'
            )}
                    </h3>

                    <div class="meta">
                        Eliminado:
                        ${escapeHTML(
                x.deletedAt || ''
            )}
                    </div>

                    <div class="actions">

                        <button
                            class="btn-light"
                            onclick="restaurarContenidoMySQL(${x.originalId})"
                        >
                            Restaurar
                        </button>

                        <button
                            class="btn-danger"
                            onclick="eliminarDefinitivamenteMySQL(${x.originalId})"
                        >
                            Eliminar definitivamente
                        </button>

                    </div>

                </div>

            </article>

        `).join('') ||
        empty('La papelera está vacía.');
}

/* NOTICIAS: compatibilidad con módulo 1 */
$('#btnNuevaNoticia').onclick = () => openNews();
function openNews(item = null) {

    openModal(
        item ? 'Editar noticia' : 'Nueva noticia',
        'Publicación institucional',

        `
        <div class="form-grid">

            <div class="field full">
                <label>Título</label>
                <input
                    name="titulo"
                    required
                    value="${escapeHTML(item?.titulo || '')}"
                >
            </div>
            ${campoAreaContenido(item)}


            ${imageField()}
            <div class="field full">
                <label>Resumen corto</label>
                <textarea
                  name="resumen"
                  rows="3"
                  maxlength="250"
                  placeholder="Escribí un resumen breve para mostrar en la tarjeta de la noticia..."
                >${escapeHTML(item?.resumen || '')}</textarea>

                <small>
                   Este texto aparecerá en la tarjeta de Noticias Institucionales.
                </small>
            </div>

            <div class="field full">
                <label>Contenido de la noticia</label>
                <div class="toolbar">
                    <button type="button" data-cmd="bold">
                        <b>B</b>
                    </button>
                    <button type="button" data-cmd="italic">
                        <i>I</i>
                    </button>
                    <button type="button" data-cmd="underline">
                        <u>U</u>
                    </button>
                </div>

                <div
                    class="editor"
                    contenteditable="true"
                    id="newsEditor"
                >${item?.descripcion || ''}</div>

            </div>

        </div>

        <div class="form-actions">

            <button
                type="button"
                class="btn-secondary"
                onclick="closeModal()"
            >
                Cancelar
            </button>

            <button
                type="button"
                class="btn-light"
                id="newsPreview"
            >
                Vista previa
            </button>

            <button
                class="btn-primary"
            >
                Guardar
            </button>

        </div>
        `,

        async fd => {

            const editor = $('#newsEditor');

            const archivo = fd.get('imagen');

            /* =========================================
               EDITAR
               Todavía queda funcionando localmente
            ========================================= */

            if (item) {
                try {
                    const imagenAnterior =
                        item.imagen || null;
                    let rutaImagen = imagenAnterior;
                    let imagenNuevaSubida = null;
                    let cambioImagen = false;

                    /* Si eligió una imagen nueva */

                    if (
                        archivo &&
                        archivo.size > 0
                    ) {
                        imagenNuevaSubida = await subirImagenCarrusel(
                            archivo
                        );
                        rutaImagen = imagenNuevaSubida;
                        cambioImagen = true;

                    }
                    const noticiaEditada = {

                        id: Number(item.id),
                        area_id:
                            adminAreaId === 6
                                ? Number(fd.get('area_id'))
                                : item.area_id,

                        titulo: fd.get('titulo'),

                        categoria: 'Institucional',

                        resumen: fd.get('resumen'),

                        descripcion: editor.innerHTML,

                        imagen: rutaImagen,

                        url: null,

                        estado:
                            item?.estado || 'Borrador',

                        orden: 1,

                        activo:
                            item?.estado === 'Publicada'
                                ? 1
                                : 0
                    };

                    const respuesta = await api(
                        '?action=update',
                        {
                            method: 'POST',
                            body: JSON.stringify(
                                noticiaEditada
                            )
                        }
                    );

                    if (!respuesta.ok) {

                        throw new Error(
                            respuesta.message ||
                            "No se pudo editar la noticia"
                        );
                    }

                    closeModal();

                    toast(
                        "Noticia modificada correctamente"
                    );

                    await cargarNoticiasDesdeMySQL();

                } catch (error) {

                    console.error(
                        "Error editando noticia:",
                        error
                    );

                    alert(
                        "No se pudo modificar la noticia.\n\n" +
                        error.message
                    );
                }

                return;
            }

            /* =========================================
               CREAR NOTICIA EN MYSQL
            ========================================= */

            try {
                const rutaImagen =
                    await subirImagenNoticia(archivo);

                const noticia = {
                    tipo: 'noticia',
                    titulo:
                        fd.get('titulo'),
                    area_id:
                        adminAreaId === 6
                            ? Number(fd.get('area_id'))
                            : adminAreaId,
                    categoria:
                        'Institucional',
                    resumen:
                        fd.get('resumen'),

                    descripcion:
                        editor.innerHTML,

                    imagen:
                        rutaImagen,

                    url:
                        null,

                    estado:
                        'Borrador',

                    orden: 1,

                    activo: 0
                };

                const respuesta = await api(
                    '?action=create',
                    {
                        method: 'POST',

                        body:
                            JSON.stringify(
                                noticia
                            )
                    }
                );
            
                if (!respuesta.ok) {

                    throw new Error(
                        respuesta.message ||
                        'No se pudo guardar'
                    );
                }


                closeModal();


                toast(
                    'Noticia guardada en MySQL'
                );


                alert(
                    'Noticia guardada correctamente en MySQL.'
                );
                await cargarNoticiasDesdeMySQL();


            } catch (error) {

                console.error(
                    'Error al guardar noticia:',
                    error
                );


                alert(
                    'No se pudo guardar la noticia.\n\n' +
                    error.message
                );

            }

        }
    );


    /* Botones del editor */

    setTimeout(() => {

        $$('#modalForm [data-cmd]')
            .forEach(b => {

                b.onclick = () => {

                    document.execCommand(
                        b.dataset.cmd,
                        false,
                        null
                    );

                };

            });


        $('#newsPreview').onclick = () => {
            guardarModalActual();

            const inputImagen =
                $('#modalForm [name=imagen]');

            const imagenSeleccionada =
                inputImagen?.files?.[0];

            const imagenActual =
                item?.imagen || '';

            if (imagenSeleccionada) {

                const lector = new FileReader();

                lector.onload = evento => {

                    previewNews(
                        $('#newsEditor').innerHTML,
                        $('#modalForm [name=titulo]').value,
                        evento.target.result
                    );

                };

                lector.readAsDataURL(
                    imagenSeleccionada
                );

                return;
            }

            previewNews(
                $('#newsEditor').innerHTML,
                $('#modalForm [name=titulo]').value,
                imagenActual
            );

        };

    }, 0);
}
/* =========================================
   SOLICITUDES PENDIENTES - SUPERADMIN
========================================= */
function verSolicitudPendiente(tipo, id) {

    let item = null;

    if (tipo === 'noticia') {
        item = data.noticias.find(
            x => Number(x.id) === Number(id)
        );
    }

    if (tipo === 'carrusel') {
        item = data.carrusel.find(
            x => Number(x.id) === Number(id)
        );
    }

    if (tipo === 'video') {
        item = data.videos.find(
            x => Number(x.id) === Number(id)
        );
    }

    if (!item) {
        alert('No se encontró el contenido.');
        return;
    }

    abrirVistaPreviaSolicitud(tipo, item);
}
function abrirVistaPreviaSolicitud(tipo, item) {

    let contenidoVisual = '';
    let descripcion = '';
    let subtitulo = 'Vista previa del contenido';

    if (tipo === 'noticia') {

        subtitulo = 'Vista previa de la noticia';

        if (item.imagen) {
            contenidoVisual = `
                <div class="preview-media">
                    <img
                        src="${item.imagen}"
                        alt="${escapeHTML(item.titulo || '')}"
                    >
                </div>
            `;
        }

        descripcion =
            item.descripcion || item.resumen || '';
    }

    if (tipo === 'carrusel') {

        subtitulo = 'Vista previa del carrusel';

        if (item.imagen) {
            contenidoVisual = `
                <div class="preview-media">
                    <img
                        src="${item.imagen}"
                        alt="${escapeHTML(item.titulo || '')}"
                    >
                </div>
            `;
        }

        descripcion =
            escapeHTML(item.texto || '');
    }

    if (tipo === 'video') {

        subtitulo = 'Vista previa del video';

        const esVideoPropio =
            item.url &&
            (
                item.url.includes('uploads/videos/') ||
                item.url.includes('uploads\\videos\\') ||
                item.url.startsWith('blob:')
            );

        if (item.youtubeId) {

            contenidoVisual = `
            <div class="preview-video">
                <iframe
                    src="https://www.youtube.com/embed/${encodeURIComponent(item.youtubeId)}"
                    title="${escapeHTML(item.titulo || '')}"
                    allowfullscreen
                ></iframe>
            </div>
        `;

        } else if (esVideoPropio) {

            contenidoVisual = `
              <div class="video-propio-contenedor">
                 <video
                      class="video-propio-reproductor"
                      controls
                      preload="metadata"
                 >
                      <source src="${escapeHTML(item.url)}">
                         Tu navegador no puede reproducir este video.
                 </video>
              </div>
            `;

        } else {

            contenidoVisual = `
            <div class="empty">
                Video no disponible
            </div>
        `;
        }

        descripcion =
            escapeHTML(item.descripcion || '');
    }

    openModal(
        'Vista previa',
        subtitulo,
        `
            <article class="preview solicitud-preview">

                ${contenidoVisual}

                <h1>
                    ${escapeHTML(item.titulo || '')}
                </h1>

                <div class="preview-descripcion">
                    ${descripcion}
                </div>

                <div class="form-actions">
                    <button
                        type="button"
                        class="btn-secondary"
                        onclick="modalAnterior ? volverModalAnterior() : closeModal()"
                    >
                        Cerrar
                    </button>
                </div>

            </article>
        `,
        () => { }
    );
}
function renderSolicitudesPendientes() {

    const contenedor =
        document.querySelector('#listaSolicitudes');

    if (!contenedor || !esSuperAdmin) {
        return;
    }


    /* =====================================
       NOTICIAS PENDIENTES
    ===================================== */

    const noticiasPendientes =
        data.noticias
            .filter(
                noticia =>
                    noticia.estado === 'Pendiente'
            )
            .map(noticia => ({
                ...noticia,
                tipoSolicitud: 'noticia'
            }));


    /* =====================================
       CARRUSEL PENDIENTE
    ===================================== */

    const carruselPendiente =
        data.carrusel
            .filter(
                slide =>
                    slide.estado === 'Pendiente'
            )
            .map(slide => ({
                ...slide,
                tipoSolicitud: 'carrusel'
            }));
    /* =====================================
   VIDEOS PENDIENTES
===================================== */

    const videosPendientes =
        data.videos
            .filter(
                video =>
                    video.estado === 'Pendiente'
            )
            .map(video => ({
                ...video,
                tipoSolicitud: 'video'
            }));


    /* Unimos ambos tipos de solicitudes */

    const pendientes = [
        ...noticiasPendientes,
        ...carruselPendiente,
        ...videosPendientes
    ];


    /* =====================================
       CONTADOR
    ===================================== */

    const contador =
        document.querySelector(
            '#contadorSolicitudes'
        );

    if (contador) {
        contador.textContent =
            pendientes.length;
    }


    /* =====================================
       SIN SOLICITUDES
    ===================================== */

    if (pendientes.length === 0) {

        contenedor.innerHTML = `
            <div class="empty">
                No hay solicitudes pendientes.
            </div>
        `;

        return;
    }


    /* =====================================
       MOSTRAR SOLICITUDES
    ===================================== */

    contenedor.innerHTML =
        pendientes.map(item => {

            /*
               Noticias usan descripcion.
               Carrusel usa texto.
            */

            const descripcionSolicitud =
                item.tipoSolicitud === 'carrusel'
                    ? (item.texto || '')
                    : (item.descripcion || '');


            /*
               Etiqueta para distinguir
               Noticia de Carrusel.
            */

            const nombreTipo =
                item.tipoSolicitud === 'carrusel'
                    ? 'Carrusel'
                    : item.tipoSolicitud === 'video'
                        ? 'Video'
                        : 'Noticia';


            return `

                <article class="card solicitud-card">

                    <div class="card-img">
                    ${item.tipoSolicitud === 'video' && item.youtubeId
                    ? `
                        <img
                        src="https://img.youtube.com/vi/${encodeURIComponent(item.youtubeId)}/hqdefault.jpg"
                        alt="${escapeHTML(item.titulo || '')}"
                        >
                        `
                    : (
                        item.tipoSolicitud === 'video' &&
                            item.url &&
                            /uploads\/videos\/[a-f0-9]{32}\.(mp4|webm)$/i.test(item.url)

                            ? `
                            <video
                            controls
                            preload="metadata"
                            style="width:100%; height:100%; object-fit:cover;"
                            >
                            <source
                            src="${escapeHTML(item.url)}"
                            >
                            Tu navegador no puede reproducir este video.
                            </video>
                            `

                            : item.imagen

                                ? `
                                <img
                                src="${item.imagen}"
                                alt="${escapeHTML(item.titulo || '')}"
                                >
                                `

                                : `
                                <div class="empty">
                                Sin imagen
                                </div>
                                `
                    )
                }
                        </div>


                    <div class="card-body">

                        <span class="badge pending">
                            Pendiente
                        </span>

                        <div class="meta">
                            ${nombreTipo}
                            ·
                            ${escapeHTML(
                    item.area || nombreAreaPorId(item.area_id)
                )}
                        </div>
                        <h3>
                            ${escapeHTML(
                    item.titulo || ''
                )}
                        </h3>


                        ${item.resumen
                    ? `
                                    <p class="solicitud-resumen">
                                        ${escapeHTML(
                        item.resumen
                    )}
                                    </p>
                                  `
                    : ''
                }


                        ${item.tipoSolicitud === 'noticia' &&
                    descripcionSolicitud
                    ? `
                                    <p class="solicitud-resumen">
                                        ${escapeHTML(
                        descripcionSolicitud
                    )}
                                    </p>
                                  `
                    : ''
                }


                        <div class="actions">

                            <button
                            class="btn-light"
                            type="button"
                            onclick="verSolicitudPendiente(
                            '${item.tipoSolicitud}',
                            ${Number(item.id)}
                            )"
                            >
                            Ver
                            </button>


                            <button
                                class="btn-primary"
                                type="button"
                                onclick="aprobarSolicitud(
                                    '${item.tipoSolicitud}',
                                    ${item.id}
                                )"
                            >
                                Aprobar
                            </button>


                            <button
                                class="btn-danger"
                                type="button"
                                onclick="rechazarSolicitud(
                                    '${item.tipoSolicitud}',
                                    ${item.id}
                                )"
                            >
                                Rechazar
                            </button>

                        </div>

                    </div>

                </article>

            `;

        }).join('');
}

/* =========================================
   AUDITORÍA - SUPERADMIN
========================================= */

let registrosAuditoria = [];
async function cargarAuditoria() {

    if (!esSuperAdmin) {
        return;
    }


    const contenedor =
        document.querySelector('#listaAuditoria');


    if (!contenedor) {
        return;
    }


    contenedor.innerHTML = `
        <div class="empty">
            Cargando historial de auditoría...
        </div>
    `;


    try {

        const respuesta =
            await api('?action=audit-list');


        if (!respuesta.ok) {

            throw new Error(
                respuesta.message ||
                'No se pudo cargar la auditoría'
            );
        }


        registrosAuditoria =
            Array.isArray(respuesta.data)
                ? respuesta.data
                : [];


        cargarOpcionesFiltrosAuditoria();
        configurarFiltrosAuditoria();
        aplicarFiltrosAuditoria();


    } catch (error) {

        console.error(
            'Error cargando auditoría:',
            error
        );


        contenedor.innerHTML = `
            <div class="empty">
                No se pudo cargar el historial de auditoría.
            </div>
        `;
    }
}
function cargarOpcionesFiltrosAuditoria() {

    const selectAccion =
        document.querySelector('#filtroAuditoriaAccion');

    const selectArea =
        document.querySelector('#filtroAuditoriaArea');


    if (!selectAccion || !selectArea) {
        return;
    }


    const accionSeleccionada =
        selectAccion.value;

    const areaSeleccionada =
        selectArea.value;


    const acciones = [
        ...new Set(
            registrosAuditoria
                .map(registro => registro.accion)
                .filter(Boolean)
        )
    ].sort();


    const areas = [
        ...new Set(
            registrosAuditoria
                .map(registro =>
                    registro.area_nombre || 'Sin área'
                )
                .filter(Boolean)
        )
    ].sort();


    selectAccion.innerHTML = `
        <option value="">
            Todas las acciones
        </option>

        ${acciones.map(accion => `
            <option value="${escapeHTML(accion)}">
                ${escapeHTML(accion)}
            </option>
        `).join('')}
    `;


    selectArea.innerHTML = `
        <option value="">
            Todas las áreas
        </option>

        ${areas.map(area => `
            <option value="${escapeHTML(area)}">
                ${escapeHTML(area)}
            </option>
        `).join('')}
    `;


    if (acciones.includes(accionSeleccionada)) {
        selectAccion.value = accionSeleccionada;
    }


    if (areas.includes(areaSeleccionada)) {
        selectArea.value = areaSeleccionada;
    }
}
function aplicarFiltrosAuditoria() {

    const inputTexto =
        document.querySelector('#filtroAuditoriaTexto');

    const selectAccion =
        document.querySelector('#filtroAuditoriaAccion');

    const selectArea =
        document.querySelector('#filtroAuditoriaArea');


    if (
        !inputTexto ||
        !selectAccion ||
        !selectArea
    ) {
        renderAuditoria(registrosAuditoria);
        return;
    }


    const texto =
        inputTexto.value
            .trim()
            .toLowerCase();

    const accion =
        selectAccion.value;

    const area =
        selectArea.value;


    const filtrados =
        registrosAuditoria.filter(registro => {

            const areaRegistro =
                registro.area_nombre ||
                'Sin área';


            const textoRegistro = [
                registro.usuario_nombre,
                registro.usuario,
                registro.descripcion,
                registro.entidad,
                registro.entidad_id
            ]
                .filter(valor =>
                    valor !== null &&
                    valor !== undefined
                )
                .join(' ')
                .toLowerCase();


            const coincideTexto =
                !texto ||
                textoRegistro.includes(texto);


            const coincideAccion =
                !accion ||
                registro.accion === accion;


            const coincideArea =
                !area ||
                areaRegistro === area;


            return (
                coincideTexto &&
                coincideAccion &&
                coincideArea
            );
        });


    renderAuditoria(filtrados);
}
function configurarFiltrosAuditoria() {

    const inputTexto =
        document.querySelector('#filtroAuditoriaTexto');

    const selectAccion =
        document.querySelector('#filtroAuditoriaAccion');

    const selectArea =
        document.querySelector('#filtroAuditoriaArea');

    const btnLimpiar =
        document.querySelector('#btnLimpiarAuditoria');


    if (
        !inputTexto ||
        !selectAccion ||
        !selectArea ||
        !btnLimpiar
    ) {
        return;
    }
    if (inputTexto.dataset.filtrosConfigurados === '1') {
        return;
    }

    inputTexto.dataset.filtrosConfigurados = '1';


    inputTexto.addEventListener(
        'input',
        aplicarFiltrosAuditoria
    );


    selectAccion.addEventListener(
        'change',
        aplicarFiltrosAuditoria
    );


    selectArea.addEventListener(
        'change',
        aplicarFiltrosAuditoria
    );


    btnLimpiar.addEventListener(
        'click',
        () => {

            inputTexto.value = '';
            selectAccion.value = '';
            selectArea.value = '';

            aplicarFiltrosAuditoria();
        }
    );
}
function renderAuditoria(registros) {

    const contenedor =
        document.querySelector('#listaAuditoria');


    if (!contenedor) {
        return;
    }


    if (registros.length === 0) {

        contenedor.innerHTML = `
            <div class="empty">
                Todavía no hay registros de auditoría.
            </div>
        `;

        return;
    }


    contenedor.innerHTML = `

        <div class="auditoria-tabla-contenedor">

            <table class="auditoria-tabla">

                <thead>

                    <tr>
                        <th>Fecha</th>
                        <th>Usuario</th>
                        <th>Área</th>
                        <th>Acción</th>
                        <th>Descripción</th>
                        <th>Entidad</th>
                        <th>ID</th>
                    </tr>

                </thead>

                <tbody>

                    ${registros.map(registro => `

                        <tr>

                            <td>
                                ${escapeHTML(
        formatearFechaAuditoria(
            registro.fecha
        )
    )}
                            </td>

                            <td>
                                <strong>
                                    ${escapeHTML(
        registro.usuario_nombre ||
        registro.usuario ||
        'Usuario desconocido'
    )}
                                </strong>

                                ${registro.usuario
            ? `
                                        <small>
                                            ${escapeHTML(
                registro.usuario
            )}
                                        </small>
                                      `
            : ''
        }
                            </td>

                            <td>
                                ${escapeHTML(
            registro.area_nombre ||
            'Sin área'
        )}
                            </td>

                            <td>
                                <span class="auditoria-accion">
                                    ${escapeHTML(
            registro.accion || ''
        )}
                                </span>
                            </td>

                            <td>
                                ${escapeHTML(
            registro.descripcion || ''
        )}
                            </td>

                            <td>
                                ${escapeHTML(
            registro.entidad || '-'
        )}
                            </td>

                            <td>
                                ${escapeHTML(
            registro.entidad_id ?? '-'
        )}
                            </td>

                        </tr>

                    `).join('')}

                </tbody>

            </table>

        </div>
    `;
}
function formatearFechaAuditoria(fecha) {

    if (!fecha) {
        return '-';
    }


    const partes =
        String(fecha).split(/[- :]/);


    if (partes.length < 6) {
        return fecha;
    }


    const [
        anio,
        mes,
        dia,
        hora,
        minuto,
        segundo
    ] = partes;


    return (
        `${dia}/${mes}/${anio} ` +
        `${hora}:${minuto}:${segundo}`
    );
}
/* =========================================
   USUARIOS ADMINISTRATIVOS
========================================= */

async function cargarUsuarios() {

    /*
       Los administradores normales
       no deben solicitar esta información.
    */

    if (!esSuperAdmin) {
        return;
    }


    const contenedor =
        document.querySelector('#listaUsuarios');


    if (!contenedor) {
        return;
    }


    contenedor.innerHTML = `
        <div class="empty">
            Cargando usuarios...
        </div>
    `;


    try {

        const respuesta =
            await api('?action=users-list');


        if (!respuesta.ok) {

            throw new Error(
                respuesta.message ||
                'No se pudieron cargar los usuarios'
            );
        }


        usuariosAdmin =
            Array.isArray(respuesta.data)
                ? respuesta.data
                : [];


        renderUsuarios();


    } catch (error) {

        console.error(
            'Error cargando usuarios:',
            error
        );


        contenedor.innerHTML = `
            <div class="empty">
                No se pudieron cargar los usuarios.
            </div>
        `;
    }
}
/* =========================================
   MODAL NUEVO ADMINISTRADOR
========================================= */

async function cargarAreasNuevoUsuario() {

    const select =
        document.querySelector(
            '#nuevoUsuarioArea'
        );

    if (!select) {
        return;
    }


    select.innerHTML = `
        <option value="">
            Cargando áreas...
        </option>
    `;


    try {

        const respuesta =
            await api(
                '?action=areas-users-list'
            );


        if (!respuesta.ok) {

            throw new Error(
                respuesta.message ||
                'No se pudieron cargar las áreas'
            );
        }


        const areas =
            Array.isArray(respuesta.data)
                ? respuesta.data
                : [];


        select.innerHTML = `
            <option value="">
                Seleccionar área
            </option>
        `;


        areas.forEach(area => {

            const option =
                document.createElement(
                    'option'
                );

            option.value =
                area.id;

            option.textContent =
                area.nombre;

            select.appendChild(option);

        });


    } catch (error) {

        console.error(
            'Error cargando áreas:',
            error
        );


        select.innerHTML = `
            <option value="">
                Error al cargar las áreas
            </option>
        `;

    }
}
async function cargarAreasEditarUsuario(
    areaSeleccionada = null
) {

    const select =
        document.querySelector(
            '#editarUsuarioArea'
        );

    if (!select) {
        return;
    }


    select.innerHTML = `
        <option value="">
            Cargando áreas...
        </option>
    `;


    try {

        const respuesta =
            await api(
                '?action=areas-users-list'
            );


        if (!respuesta.ok) {

            throw new Error(
                respuesta.message ||
                'No se pudieron cargar las áreas'
            );
        }


        const areas =
            Array.isArray(respuesta.data)
                ? respuesta.data
                : [];


        select.innerHTML = `
            <option value="">
                Seleccionar área
            </option>
        `;


        areas.forEach(area => {

            const option =
                document.createElement(
                    'option'
                );

            option.value =
                area.id;

            option.textContent =
                area.nombre;


            if (
                Number(area.id) ===
                Number(areaSeleccionada)
            ) {

                option.selected = true;

            }


            select.appendChild(option);

        });


    } catch (error) {

        console.error(
            'Error cargando áreas:',
            error
        );


        select.innerHTML = `
            <option value="">
                Error al cargar las áreas
            </option>
        `;
    }
}
async function abrirEditarUsuario(id) {

    if (!esSuperAdmin) {
        return;
    }


    const usuario =
        usuariosAdmin.find(
            item =>
                Number(item.id) === Number(id)
        );


    if (!usuario) {

        toast(
            'No se encontró el administrador'
        );

        return;
    }


    /*
       Sosa no se modifica desde
       este formulario.
    */

    if (usuario.rol === 'superadmin') {

        toast(
            'El SuperAdministrador no se edita desde esta opción'
        );

        return;
    }


    const modal =
        document.querySelector(
            '#modalEditarUsuario'
        );


    if (!modal) {
        return;
    }


    document.querySelector(
        '#editarUsuarioId'
    ).value = usuario.id;


    document.querySelector(
        '#editarUsuarioNombre'
    ).value = usuario.nombre || '';


    document.querySelector(
        '#editarUsuarioLogin'
    ).value = usuario.usuario || '';


    const error =
        document.querySelector(
            '#errorEditarUsuario'
        );


    if (error) {

        error.hidden = true;
        error.textContent = '';

    }


    await cargarAreasEditarUsuario(
        usuario.area_id
    );


    modal.classList.add('show');
}
function cerrarEditarUsuario() {

    const modal =
        document.querySelector(
            '#modalEditarUsuario'
        );


    if (modal) {
        modal.classList.remove('show');
    }
}
async function guardarEdicionUsuario(event) {

    event.preventDefault();


    if (!esSuperAdmin) {
        return;
    }


    const error =
        document.querySelector(
            '#errorEditarUsuario'
        );


    const boton =
        document.querySelector(
            '#guardarEditarUsuario'
        );


    const id =
        Number(
            document.querySelector(
                '#editarUsuarioId'
            )?.value
        );


    const nombre =
        String(
            document.querySelector(
                '#editarUsuarioNombre'
            )?.value || ''
        ).trim();


    const usuario =
        String(
            document.querySelector(
                '#editarUsuarioLogin'
            )?.value || ''
        ).trim();


    const areaId =
        Number(
            document.querySelector(
                '#editarUsuarioArea'
            )?.value
        );


    try {

        if (error) {
            error.hidden = true;
            error.textContent = '';
        }


        if (boton) {

            boton.disabled = true;
            boton.textContent =
                'Guardando...';

        }


        const respuesta =
            await api(
                '?action=user-update',
                {
                    method: 'POST',

                    body: JSON.stringify({
                        id: id,
                        nombre: nombre,
                        usuario: usuario,
                        area_id: areaId
                    })
                }
            );


        if (!respuesta.ok) {

            throw new Error(
                respuesta.message ||
                'No se pudo actualizar el administrador'
            );
        }


        cerrarEditarUsuario();


        toast(
            'Administrador actualizado correctamente'
        );


        await cargarUsuarios();


    } catch (err) {

        console.error(
            'Error editando usuario:',
            err
        );


        if (error) {

            error.textContent =
                err.message ||
                'No se pudo guardar el administrador.';

            error.hidden = false;

        }


    } finally {

        if (boton) {

            boton.disabled = false;
            boton.textContent =
                'Guardar cambios';

        }

    }
}
/* =========================================
   CAMBIAR MI CONTRASEÑA
========================================= */

function abrirCambiarMiPassword() {

    const modal =
        document.querySelector(
            '#modalCambiarMiPassword'
        );

    const form =
        document.querySelector(
            '#formCambiarMiPassword'
        );

    const error =
        document.querySelector(
            '#errorCambiarMiPassword'
        );

    if (!modal || !form) {
        return;
    }

    form.reset();

    if (error) {
        error.hidden = true;
        error.textContent = '';
    }

    modal.classList.add('show');
}


function cerrarCambiarMiPassword() {

    const modal =
        document.querySelector(
            '#modalCambiarMiPassword'
        );

    if (modal) {
        modal.classList.remove('show');
    }
}


async function guardarCambiarMiPassword(event) {

    event.preventDefault();

    const passwordActual =
        document.querySelector(
            '#miPasswordActual'
        )?.value || '';

    const passwordNueva =
        document.querySelector(
            '#miPasswordNueva'
        )?.value || '';

    const passwordConfirmar =
        document.querySelector(
            '#miPasswordConfirmar'
        )?.value || '';

    const error =
        document.querySelector(
            '#errorCambiarMiPassword'
        );

    const boton =
        document.querySelector(
            '#guardarCambiarMiPassword'
        );


    /* -------------------------
       VALIDACIONES
    ------------------------- */

    if (error) {
        error.hidden = true;
        error.textContent = '';
    }


    if (!passwordActual) {

        if (error) {
            error.textContent =
                'Ingresá tu contraseña actual.';
            error.hidden = false;
        }

        return;
    }


    if (passwordNueva.length < 8) {

        if (error) {
            error.textContent =
                'La nueva contraseña debe tener al menos 8 caracteres.';
            error.hidden = false;
        }

        return;
    }


    if (passwordNueva !== passwordConfirmar) {

        if (error) {
            error.textContent =
                'Las nuevas contraseñas no coinciden.';
            error.hidden = false;
        }

        return;
    }


    if (passwordActual === passwordNueva) {

        if (error) {
            error.textContent =
                'La nueva contraseña debe ser diferente de la actual.';
            error.hidden = false;
        }

        return;
    }


    try {

        if (boton) {
            boton.disabled = true;
            boton.textContent =
                'Cambiando...';
        }


        const respuesta =
            await api(
                '?action=change-own-password',
                {
                    method: 'POST',

                    body: JSON.stringify({
                        password_actual:
                            passwordActual,

                        password_nueva:
                            passwordNueva
                    })
                }
            );


        if (!respuesta.ok) {

            throw new Error(
                respuesta.message ||
                'No se pudo cambiar la contraseña'
            );
        }


        cerrarCambiarMiPassword();


        toast(
            'Contraseña cambiada correctamente'
        );


    } catch (err) {

        console.error(
            'Error cambiando contraseña:',
            err
        );


        if (error) {

            error.textContent =
                err.message ||
                'No se pudo cambiar la contraseña.';

            error.hidden = false;
        }


    } finally {

        if (boton) {

            boton.disabled = false;

            boton.textContent =
                'Cambiar contraseña';
        }
    }
}
async function cambiarEstadoUsuario(id) {

    if (!esSuperAdmin) {
        return;
    }


    const usuario =
        usuariosAdmin.find(
            item =>
                Number(item.id) === Number(id)
        );


    if (!usuario) {
        return;
    }


    if (usuario.rol === 'superadmin') {

        toast(
            'No se puede desactivar al SuperAdministrador'
        );

        return;
    }


    const estaActivo =
        Number(usuario.activo) === 1;


    const mensaje =
        estaActivo
            ? `¿Desactivar a ${usuario.nombre}?`
            : `¿Activar a ${usuario.nombre}?`;


    if (!confirm(mensaje)) {
        return;
    }


    try {

        const respuesta =
            await api(
                '?action=user-toggle-active',
                {
                    method: 'POST',

                    body: JSON.stringify({
                        id: Number(id)
                    })
                }
            );


        if (!respuesta.ok) {

            throw new Error(
                respuesta.message ||
                'No se pudo cambiar el estado'
            );
        }


        toast(respuesta.message);


        await cargarUsuarios();


    } catch (error) {

        console.error(
            'Error cambiando estado:',
            error
        );


        toast(
            error.message ||
            'No se pudo cambiar el estado'
        );

    }
}
/* =========================================
   RESTABLECER CONTRASEÑA
========================================= */

function abrirResetPassword(id) {

    if (!esSuperAdmin) {
        return;
    }


    const usuario =
        usuariosAdmin.find(
            item =>
                Number(item.id) === Number(id)
        );


    if (!usuario) {

        toast(
            'No se encontró el administrador'
        );

        return;
    }


    if (usuario.rol === 'superadmin') {

        toast(
            'No se puede restablecer la contraseña del SuperAdministrador desde esta opción'
        );

        return;
    }


    const modal =
        document.querySelector(
            '#modalResetPassword'
        );


    if (!modal) {

        console.error(
            'No se encontró modalResetPassword'
        );

        return;
    }


    document.querySelector(
        '#resetPasswordUsuarioId'
    ).value = usuario.id;


    document.querySelector(
        '#resetPasswordNombreUsuario'
    ).textContent =
        usuario.nombre || usuario.usuario;


    document.querySelector(
        '#resetPasswordNueva'
    ).value = '';


    document.querySelector(
        '#resetPasswordConfirmar'
    ).value = '';


    const error =
        document.querySelector(
            '#errorResetPassword'
        );


    if (error) {

        error.hidden = true;
        error.textContent = '';

    }


    modal.classList.add('show');

}


function cerrarResetPassword() {

    const modal =
        document.querySelector(
            '#modalResetPassword'
        );


    if (modal) {
        modal.classList.remove('show');
    }

}


async function guardarResetPassword(event) {

    event.preventDefault();


    if (!esSuperAdmin) {
        return;
    }


    const id =
        Number(
            document.querySelector(
                '#resetPasswordUsuarioId'
            )?.value
        );


    const password =
        String(
            document.querySelector(
                '#resetPasswordNueva'
            )?.value || ''
        );


    const confirmar =
        String(
            document.querySelector(
                '#resetPasswordConfirmar'
            )?.value || ''
        );


    const error =
        document.querySelector(
            '#errorResetPassword'
        );


    const boton =
        document.querySelector(
            '#guardarResetPassword'
        );


    if (error) {
        error.hidden = true;
        error.textContent = '';
    }


    if (password.length < 8) {

        if (error) {
            error.textContent =
                'La contraseña debe tener al menos 8 caracteres.';
            error.hidden = false;
        }

        return;
    }


    if (password !== confirmar) {

        if (error) {
            error.textContent =
                'Las contraseñas no coinciden.';
            error.hidden = false;
        }

        return;
    }


    try {

        if (boton) {
            boton.disabled = true;
            boton.textContent =
                'Guardando...';
        }


        const respuesta =
            await api(
                '?action=user-reset-password',
                {
                    method: 'POST',

                    body: JSON.stringify({
                        id: id,
                        password: password
                    })
                }
            );


        if (!respuesta.ok) {

            throw new Error(
                respuesta.message ||
                'No se pudo restablecer la contraseña'
            );
        }


        cerrarResetPassword();


        toast(
            'Contraseña restablecida correctamente'
        );


    } catch (err) {

        console.error(
            'Error restableciendo contraseña:',
            err
        );


        if (error) {

            error.textContent =
                err.message ||
                'No se pudo restablecer la contraseña.';

            error.hidden = false;
        }


    } finally {

        if (boton) {

            boton.disabled = false;
            boton.textContent =
                'Guardar contraseña';

        }

    }

}
function renderUsuarios() {

    const contenedor =
        document.querySelector('#listaUsuarios');


    if (!contenedor) {
        return;
    }


    /*
       CONTADORES
    */

    const total =
        usuariosAdmin.length;


    const activos =
        usuariosAdmin.filter(
            usuario =>
                Number(usuario.activo) === 1
        ).length;


    const adminsArea =
        usuariosAdmin.filter(
            usuario =>
                usuario.rol === 'admin_area'
        ).length;


    const totalElemento =
        document.querySelector('#totalUsuarios');

    const activosElemento =
        document.querySelector('#usuariosActivos');

    const adminsElemento =
        document.querySelector('#totalAdminsArea');


    if (totalElemento) {
        totalElemento.textContent = total;
    }


    if (activosElemento) {
        activosElemento.textContent = activos;
    }


    if (adminsElemento) {
        adminsElemento.textContent = adminsArea;
    }


    /*
       SIN USUARIOS
    */

    if (usuariosAdmin.length === 0) {

        contenedor.innerHTML = `
            <div class="empty">
                No hay usuarios administrativos.
            </div>
        `;

        return;
    }


    /*
       TARJETAS
    */

    contenedor.innerHTML =
        usuariosAdmin.map(usuario => {

            const activo =
                Number(usuario.activo) === 1;


            const rolTexto =
                usuario.rol === 'superadmin'
                    ? 'SuperAdministrador'
                    : 'Administrador de Área';


            const areaTexto =
                usuario.rol === 'superadmin'
                    ? 'Acceso a todas las áreas'
                    : (
                        usuario.area_nombre ||
                        'Sin área asignada'
                    );


            const ultimoAcceso =
                usuario.ultimo_acceso
                    ? usuario.ultimo_acceso
                    : 'Sin registros';


            return `

                <article class="usuario-card">

                    <div class="usuario-avatar">

                        ${usuario.rol === 'superadmin'
                    ? 'SA'
                    : 'AD'
                }

                    </div>


                    <div class="usuario-contenido">

                        <div class="usuario-cabecera">

                            <div>

                                <h3>
                                    ${escapeHTML(
                    usuario.nombre
                )}
                                </h3>

                                <span class="usuario-login">
                                    @${escapeHTML(
                    usuario.usuario
                )}
                                </span>

                            </div>


                            <span
                                class="
                                    usuario-estado
                                    ${activo
                    ? 'activo'
                    : 'inactivo'
                }
                                "
                            >

                                ${activo
                    ? 'Activo'
                    : 'Inactivo'
                }

                            </span>

                        </div>


                        <div class="usuario-datos">

                            <div>
                                <strong>Rol</strong>

                                <span>
                                    ${rolTexto}
                                </span>
                            </div>


                            <div>
                                <strong>Área</strong>

                                <span>
                                    ${escapeHTML(
                    areaTexto
                )}
                                </span>
                            </div>


                            <div>
                                <strong>Último acceso</strong>

                                <span>
                                    ${escapeHTML(
                    ultimoAcceso
                )}
                                </span>
                            </div>

                        </div>
                        <div class="usuario-acciones">

                           <button
                             class="btn-light btn-editar-usuario"
                             type="button"
                             data-id="${usuario.id}"
                            >
                              Editar
                            </button>
                        ${usuario.rol !== 'superadmin' ? `

                            <button
                             class="btn-light btn-estado-usuario"
                             type="button"
                             data-id="${usuario.id}"
                            >
                              ${activo ? 'Desactivar' : 'Activar'}
                            </button>

                        ` : ''}

                            ${usuario.rol !== 'superadmin' ? `
                                <button
                                class="btn-light btn-reset-password"
                                type="button"
                                data-id="${usuario.id}"
                                >
                                 Restablecer contraseña
                                </button>

                            ` : ''}

                        </div>

                    </div>

                </article>

            `;

        }).join('');
    const botonesEditarUsuario =
        contenedor.querySelectorAll(
            '.btn-editar-usuario'
        );


    botonesEditarUsuario.forEach(boton => {

        boton.addEventListener(
            'click',
            () => {

                const id =
                    Number(
                        boton.dataset.id
                    );

                abrirEditarUsuario(id);

            }
        );

    });
    const botonesEstadoUsuario =
        contenedor.querySelectorAll(
            '.btn-estado-usuario'
        );


    botonesEstadoUsuario.forEach(boton => {

        boton.addEventListener(
            'click',
            () => {

                const id =
                    Number(
                        boton.dataset.id
                    );

                cambiarEstadoUsuario(id);

            }
        );

    });
    const botonesResetPassword =
        contenedor.querySelectorAll(
            '.btn-reset-password'
        );


    botonesResetPassword.forEach(boton => {

        boton.addEventListener(
            'click',
            () => {

                const id =
                    Number(
                        boton.dataset.id
                    );

                abrirResetPassword(id);

            }
        );

    });

}


/* =========================================
   EVENTOS - NUEVO ADMINISTRADOR
========================================= */

const btnNuevoUsuario =
    document.querySelector('#btnNuevoUsuario');

const cerrarUsuario =
    document.querySelector('#cerrarModalUsuario');

const cancelarUsuario =
    document.querySelector('#cancelarNuevoUsuario');

const formNuevoUsuario =
    document.querySelector('#formNuevoUsuario');


if (btnNuevoUsuario) {
    btnNuevoUsuario.addEventListener(
        'click',
        abrirModalNuevoUsuario
    );
}


if (cerrarUsuario) {
    cerrarUsuario.addEventListener(
        'click',
        cerrarModalNuevoUsuario
    );
}


if (cancelarUsuario) {
    cancelarUsuario.addEventListener(
        'click',
        cerrarModalNuevoUsuario
    );
}


if (formNuevoUsuario) {
    formNuevoUsuario.addEventListener(
        'submit',
        crearNuevoUsuario
    );
}
/* =========================================
   EVENTOS - EDITAR ADMINISTRADOR
========================================= */

const cerrarEditarUsuarioBtn =
    document.querySelector(
        '#cerrarModalEditarUsuario'
    );

const cancelarEditarUsuarioBtn =
    document.querySelector(
        '#cancelarEditarUsuario'
    );

const formEditarUsuario =
    document.querySelector(
        '#formEditarUsuario'
    );


if (cerrarEditarUsuarioBtn) {

    cerrarEditarUsuarioBtn.addEventListener(
        'click',
        cerrarEditarUsuario
    );

}
if (cancelarEditarUsuarioBtn) {

    cancelarEditarUsuarioBtn.addEventListener(
        'click',
        cerrarEditarUsuario
    );
}


if (formEditarUsuario) {

    formEditarUsuario.addEventListener(
        'submit',
        guardarEdicionUsuario
    );

}
/* =========================================
   EVENTOS - RESTABLECER CONTRASEÑA
========================================= */

const cerrarResetPasswordBtn =
    document.querySelector(
        '#cerrarModalResetPassword'
    );

const cancelarResetPasswordBtn =
    document.querySelector(
        '#cancelarResetPassword'
    );

const formResetPassword =
    document.querySelector(
        '#formResetPassword'
    );


if (cerrarResetPasswordBtn) {

    cerrarResetPasswordBtn.addEventListener(
        'click',
        cerrarResetPassword
    );

}


if (cancelarResetPasswordBtn) {

    cancelarResetPasswordBtn.addEventListener(
        'click',
        cerrarResetPassword
    );

}


if (formResetPassword) {

    formResetPassword.addEventListener(
        'submit',
        guardarResetPassword
    );

}
function nombreAreaPorId(areaId) {

    if (
        areaId === null ||
        areaId === undefined
    ) {
        return 'Sin área';
    }

    const area = data.areas.find(
        item =>
            Number(item.id) === Number(areaId)
    );

    return area
        ? area.nombre
        : 'Sin área';
}

async function cargarAreasDesdeMySQL() {

    try {


        const respuesta = await api(
            "?action=areas-list"
        );

        if (!respuesta.ok) {
            throw new Error(
                respuesta.message ||
                "No se pudieron cargar las áreas"
            );
        }

        data.areas = respuesta.data.map(area => ({
            id: Number(area.id),
            nombre: area.nombre,
            codigo: area.codigo || "",
            area_padre_id: area.area_padre_id
                ? Number(area.area_padre_id)
                : null,
            activo: Number(area.activo) === 1
        }));
        renderAreas();

    } catch (error) {

        console.error(
            "Error cargando áreas:",
            error
        );

        toast(
            "No se pudieron cargar las áreas"
        );
    }
}
async function cargarNoticiasDesdeMySQL() {

    try {

        const respuesta = await api(
            "?action=list&tipo=noticia"
        );

        if (!respuesta.ok) {
            throw new Error(
                respuesta.message ||
                "No se pudieron cargar las noticias"
            );
        }

        data.noticias = respuesta.data.map(noticia => ({
            id: Number(noticia.id),

            titulo: noticia.titulo,

            area: noticia.categoria || "",

            area_id: noticia.area_id
                ? Number(noticia.area_id)
                : null,

            usuario_id: noticia.usuario_id
                ? Number(noticia.usuario_id)
                : null,

            resumen: noticia.resumen || "",

            descripcion: noticia.descripcion || "",

            imagen: noticia.imagen || "",

            estado: noticia.estado || "Borrador",

            motivo_rechazo:
                noticia.motivo_rechazo || "",

            aprobado_por:
                noticia.aprobado_por || null,

            fecha_aprobacion:
                noticia.fecha_aprobacion || null,

            fecha:
                noticia.fecha_creacion
        }));

        renderNews();
        if (esSuperAdmin) {
            renderSolicitudesPendientes();
        }

    } catch (error) {

        console.error(
            "Error cargando noticias:",
            error
        );

        toast(
            "No se pudieron cargar las noticias"
        );
    }
}
/* =========================================
   ENVIAR NOTICIA A APROBACIÓN
========================================= */

async function enviarNoticiaAprobacion(id) {

    const confirmar = confirm(
        "¿Querés enviar esta noticia al SuperAdministrador para su aprobación?"
    );

    if (!confirmar) {
        return;
    }

    try {

        const respuesta = await api(
            '?action=submit-news',
            {
                method: 'POST',

                body: JSON.stringify({
                    id: Number(id)
                })
            }
        );

        if (!respuesta.ok) {
            throw new Error(
                respuesta.message ||
                'No se pudo enviar la noticia'
            );
        }

        toast(
            'Noticia enviada a aprobación'
        );

        alert(
            'La noticia fue enviada al SuperAdministrador.'
        );

        await cargarNoticiasDesdeMySQL();

    } catch (error) {

        console.error(
            'Error enviando noticia:',
            error
        );

        alert(
            'No se pudo enviar la noticia.\n\n' +
            error.message
        );
    }
}
/* =========================================
   APROBAR SOLICITUD
   NOTICIA O CARRUSEL
========================================= */

async function aprobarSolicitud(tipo, id) {

    if (!esSuperAdmin) {
        alert(
            'Solo el SuperAdministrador puede aprobar publicaciones.'
        );
        return;
    }

    /*
       Si es una noticia usamos
       el sistema que ya funciona.
    */
    if (tipo === 'noticia') {

        await aprobarNoticia(id);

        return;
    }

    /*
       Si es carrusel usaremos
       su propio sistema de aprobación.
    */
    if (tipo === 'carrusel') {

        await aprobarCarrusel(id);

        return;
    }
    /*
       Si es video usaremos
       su propio sistema de aprobación.
    */
    if (tipo === 'video') {
        await aprobarVideo(id);
        return;
    }

    alert('Tipo de publicación no reconocido.');
}
async function aprobarVideo(id) {

    if (!esSuperAdmin) {
        return;
    }

    const video =
        data.videos.find(
            item => Number(item.id) === Number(id)
        );

    if (!video) {
        alert(
            'No se encontró el video.'
        );

        return;
    }

    const confirmar = confirm(
        `¿Aprobar y publicar este video?\n\n${video.titulo}`
    );

    if (!confirmar) {
        return;
    }

    try {

        const respuesta = await api(
            '?action=approve-video',
            {
                method: 'POST',

                body: JSON.stringify({
                    id: Number(id)
                })
            }
        );

        if (!respuesta.ok) {
            throw new Error(
                respuesta.message ||
                'No se pudo aprobar el video'
            );
        }

        toast(
            'Video aprobado y publicado'
        );

        await cargarVideosDesdeMySQL();

        renderSolicitudesPendientes();

    } catch (error) {

        console.error(
            'Error aprobando video:',
            error
        );

        alert(
            'No se pudo aprobar el video.\n\n' +
            error.message
        );
    }
}
/* =========================================
   APROBAR CARRUSEL - SUPERADMIN
========================================= */

async function aprobarCarrusel(id) {

    if (!esSuperAdmin) {

        alert(
            'Solo el SuperAdministrador puede aprobar publicaciones del carrusel.'
        );

        return;
    }

    const slide =
        data.carrusel.find(
            item => Number(item.id) === Number(id)
        );

    if (!slide) {

        alert(
            'No se encontró la publicación del carrusel.'
        );

        return;
    }

    if (slide.estado !== 'Pendiente') {

        alert(
            'Esta publicación ya no está pendiente de aprobación.'
        );

        return;
    }

    const confirmar = confirm(
        '¿Querés aprobar esta publicación del carrusel?'
    );

    if (!confirmar) {
        return;
    }

    try {

        const respuesta = await api(
            '?action=approve-carousel',
            {
                method: 'POST',

                body: JSON.stringify({
                    id: Number(id)
                })
            }
        );

        if (!respuesta.ok) {

            throw new Error(
                respuesta.message ||
                'No se pudo aprobar la publicación del carrusel.'
            );
        }

        toast(
            'Publicación del carrusel aprobada correctamente'
        );

        /*
           Recargamos el carrusel desde MySQL.
        */

        await cargarCarruselDesdeMySQL();

        /*
           Actualizamos las solicitudes pendientes.
        */

        renderSolicitudesPendientes();

    } catch (error) {

        console.error(
            'Error aprobando carrusel:',
            error
        );

        alert(
            'No se pudo aprobar la publicación.\n\n' +
            error.message
        );
    }
}
/* =========================================
   APROBAR NOTICIA - SUPERADMIN
========================================= */

async function aprobarNoticia(id) {

    if (!esSuperAdmin) {

        alert(
            'Solo el SuperAdministrador puede aprobar noticias.'
        );

        return;
    }

    const noticia =
        data.noticias.find(
            n => Number(n.id) === Number(id)
        );

    if (!noticia) {

        alert('No se encontró la noticia.');

        return;
    }

    const confirmar = confirm(
        `¿Aprobar y publicar esta noticia?\n\n${noticia.titulo}`
    );

    if (!confirmar) {
        return;
    }

    try {

        const respuesta = await api(
            '?action=approve-news',
            {
                method: 'POST',

                body: JSON.stringify({
                    id: Number(id)
                })
            }
        );

        if (!respuesta.ok) {

            throw new Error(
                respuesta.message ||
                'No se pudo aprobar la noticia'
            );
        }

        toast(
            'Noticia aprobada correctamente'
        );

        alert(
            'La noticia fue aprobada y publicada.'
        );

        await cargarNoticiasDesdeMySQL();

    } catch (error) {

        console.error(
            'Error aprobando noticia:',
            error
        );

        alert(
            'No se pudo aprobar la noticia.\n\n' +
            error.message
        );
    }
}
/* =========================================
   RECHAZAR SOLICITUD
   NOTICIA O CARRUSEL
========================================= */

async function rechazarSolicitud(tipo, id) {

    if (!esSuperAdmin) {

        alert(
            'Solo el SuperAdministrador puede rechazar publicaciones.'
        );

        return;
    }


    /*
       NOTICIA

       Conservamos el sistema que ya funciona.
    */

    if (tipo === 'noticia') {

        await rechazarNoticia(id);

        return;
    }


    /*
       CARRUSEL
    */

    if (tipo === 'carrusel') {

        await rechazarCarrusel(id);

        return;
    }
    if (tipo === 'video') {
        await rechazarVideo(id);
        return;
    }


    alert(
        'Tipo de publicación no reconocido.'
    );
}
async function rechazarVideo(id) {

    if (!esSuperAdmin) {
        return;
    }

    const video =
        data.videos.find(
            item => Number(item.id) === Number(id)
        );

    if (!video) {
        alert(
            'No se encontró el video.'
        );

        return;
    }

    const motivo = prompt(
        `Indicá el motivo del rechazo:\n\n${video.titulo}`
    );

    if (motivo === null) {
        return;
    }

    const motivoLimpio =
        motivo.trim();

    if (!motivoLimpio) {
        alert(
            'Debés indicar un motivo para rechazar el video.'
        );

        return;
    }

    try {

        const respuesta = await api(
            '?action=reject-video',
            {
                method: 'POST',

                body: JSON.stringify({
                    id: Number(id),
                    motivo: motivoLimpio
                })
            }
        );

        if (!respuesta.ok) {
            throw new Error(
                respuesta.message ||
                'No se pudo rechazar el video'
            );
        }

        toast(
            'Video rechazado'
        );

        await cargarVideosDesdeMySQL();

        renderSolicitudesPendientes();

    } catch (error) {

        console.error(
            'Error rechazando video:',
            error
        );

        alert(
            'No se pudo rechazar el video.\n\n' +
            error.message
        );
    }
}


/* =========================================
   RECHAZAR CARRUSEL - SUPERADMIN
========================================= */

async function rechazarCarrusel(id) {

    if (!esSuperAdmin) {

        alert(
            'Solo el SuperAdministrador puede rechazar publicaciones del carrusel.'
        );

        return;
    }


    /*
       Buscar el slide cargado desde MySQL.
    */

    const slide =
        data.carrusel.find(
            item =>
                Number(item.id) === Number(id)
        );


    if (!slide) {

        alert(
            'No se encontró la publicación del carrusel.'
        );

        return;
    }


    /*
       Solamente rechazamos solicitudes pendientes.
    */

    if (slide.estado !== 'Pendiente') {

        alert(
            'Esta publicación ya no está pendiente de aprobación.'
        );

        return;
    }


    /*
       Pedir el motivo a Sosa.
    */

    const motivo = prompt(
        'Indicá el motivo del rechazo:'
    );


    /*
       Cancelar
    */

    if (motivo === null) {
        return;
    }


    /*
       No aceptar un motivo vacío.
    */

    if (motivo.trim() === '') {

        alert(
            'Debés indicar el motivo del rechazo.'
        );

        return;
    }


    try {

        const respuesta = await api(
            '?action=reject-carousel',
            {
                method: 'POST',

                body: JSON.stringify({
                    id: Number(id),
                    motivo: motivo.trim()
                })
            }
        );


        if (!respuesta.ok) {

            throw new Error(
                respuesta.message ||
                'No se pudo rechazar la publicación del carrusel.'
            );
        }


        toast(
            'Publicación del carrusel rechazada'
        );


        /*
           Volver a cargar desde MySQL.
        */

        await cargarCarruselDesdeMySQL();


        /*
           Actualizar solicitudes.
        */

        renderSolicitudesPendientes();


    } catch (error) {

        console.error(
            'Error rechazando carrusel:',
            error
        );


        alert(
            'No se pudo rechazar la publicación.\n\n' +
            error.message
        );
    }
}
/* =========================================
   RECHAZAR NOTICIA - SUPERADMIN
========================================= */

async function rechazarNoticia(id) {

    if (!esSuperAdmin) {

        alert(
            'Solo el SuperAdministrador puede rechazar noticias.'
        );

        return;
    }

    const noticia =
        data.noticias.find(
            n => Number(n.id) === Number(id)
        );

    if (!noticia) {

        alert('No se encontró la noticia.');

        return;
    }

    const motivo = prompt(
        `Motivo del rechazo:\n\n${noticia.titulo}`
    );

    /*
       Cancelar
    */
    if (motivo === null) {
        return;
    }

    /*
       No permitimos motivo vacío
    */
    if (motivo.trim() === '') {

        alert(
            'Debés escribir el motivo del rechazo.'
        );

        return;
    }

    try {

        const respuesta = await api(
            '?action=reject-news',
            {
                method: 'POST',

                body: JSON.stringify({
                    id: Number(id),
                    motivo: motivo.trim()
                })
            }
        );

        if (!respuesta.ok) {

            throw new Error(
                respuesta.message ||
                'No se pudo rechazar la noticia'
            );
        }

        toast(
            'Noticia rechazada'
        );

        alert(
            'La noticia fue rechazada correctamente.'
        );

        await cargarNoticiasDesdeMySQL();

    } catch (error) {

        console.error(
            'Error rechazando noticia:',
            error
        );

        alert(
            'No se pudo rechazar la noticia.\n\n' +
            error.message
        );
    }
}
async function enviarNoticiaPapelera(id) {

    const confirmar = confirm(
        "¿Querés enviar esta noticia a la papelera?"
    );

    if (!confirmar) {
        return;
    }

    try {
        const respuesta = await api(
            '?action=trash',
            {
                method: 'POST',
                body: JSON.stringify({
                    id: Number(id)
                })
            }
        );

        if (!respuesta.ok) {
            throw new Error(
                respuesta.message ||
                "No se pudo enviar a la papelera"
            );
        }

        toast("Noticia enviada a la papelera");
        await cargarNoticiasDesdeMySQL();
        await cargarPapeleraDesdeMySQL();

    } catch (error) {

        console.error(
            "Error enviando noticia a papelera:",
            error
        );

        alert(
            "No se pudo enviar la noticia a la papelera.\n\n" +
            error.message
        );
    }
}
async function cargarPapeleraDesdeMySQL() {

    try {
        const respuesta = await api(
            '?action=trash-list'
        );

        if (!respuesta.ok) {
            throw new Error(
                respuesta.message ||
                "No se pudo cargar la papelera"
            );
        }

        data.papelera = respuesta.data.map(item => ({
            id: Number(item.id),
            originalId: Number(item.id),
            type: item.tipo,

            deletedAt:
                item.fecha_modificacion ||
                item.fecha_creacion,

            item: {
                id: Number(item.id),
                titulo: item.titulo,
                area: item.categoria || "",
                descripcion: item.descripcion || "",
                imagen: item.imagen || "",
                url: item.url || "",
                estado: item.estado || ""
            }
        }));

        renderTrash();
        updateDashboard();

    } catch (error) {

        console.error(
            "Error cargando papelera:",
            error
        );

        toast(
            "No se pudo cargar la papelera"
        );
    }
}
async function restaurarContenidoMySQL(id) {

    const confirmar = confirm(
        "¿Querés restaurar este contenido?"
    );

    if (!confirmar) {
        return;
    }

    try {

        const respuesta = await api(
            '?action=restore',
            {
                method: 'POST',
                body: JSON.stringify({
                    id: Number(id)
                })
            }
        );

        if (!respuesta.ok) {
            throw new Error(
                respuesta.message ||
                "No se pudo restaurar"
            );
        }

        toast(
            "Contenido restaurado correctamente"
        );

        await cargarPapeleraDesdeMySQL();
        await cargarNoticiasDesdeMySQL();
        await cargarCarruselDesdeMySQL();
        await cargarVideosDesdeMySQL();

    } catch (error) {

        console.error(
            "Error restaurando contenido:",
            error
        );

        alert(
            "No se pudo restaurar el contenido.\n\n" +
            error.message
        );
    }
}
async function eliminarDefinitivamenteMySQL(id) {

    const confirmar = confirm(
        "¿Eliminar definitivamente esta noticia?\n\n" +
        "Esta acción no se puede deshacer."
    );

    if (!confirmar) {
        return;
    }


    try {

        const respuesta = await api(
            '?action=delete-forever',
            {
                method: 'POST',

                body: JSON.stringify({
                    id: Number(id)
                })
            }
        );

        if (!respuesta.ok) {

            throw new Error(
                respuesta.message ||
                "No se pudo eliminar definitivamente"
            );
        }


        toast(
            "Noticia eliminada definitivamente"
        );


        await cargarPapeleraDesdeMySQL();

        await cargarNoticiasDesdeMySQL();

        await cargarCarruselDesdeMySQL();

        await cargarVideosDesdeMySQL();


    } catch (error) {

        console.error(
            "Error eliminando definitivamente:",
            error
        );


        alert(
            "No se pudo eliminar definitivamente.\n\n" +
            error.message
        );
    }
}
function claseEstadoNoticia(estado) {

    switch (estado) {

        case 'Publicada':
            return 'published';

        case 'Pendiente':
            return 'pending';

        case 'Rechazada':
            return 'rejected';

        default:
            return 'draft';
    }
}
function renderNews() {

    const q =
        ($('#buscarNoticias').value || '')
            .toLowerCase();

    const a =
        $('#filtroArea').value;

    const e =
        $('#filtroEstado').value;


    let noticias =
        data.noticias.filter(x =>

            (!q ||
                x.titulo
                    .toLowerCase()
                    .includes(q)
            )

            &&

            (!a || x.area === a)

            &&

            (!e || x.estado === e)
        );


    /*
       Un administrador de área
       solo visualiza noticias de su área.
    */

    if (!esSuperAdmin && adminAreaId !== null) {

        noticias =
            noticias.filter(
                x => x.area_id === adminAreaId
            );
    }


    $('#listaNoticias').innerHTML =
        noticias.map(x => {

            let acciones = '';


            /*
               EDITAR

               Solo Borrador o Rechazada
               para administradores de área.
            */

            if (
                esSuperAdmin ||
                x.estado === 'Borrador' ||
                x.estado === 'Rechazada'
            ) {

                acciones += `
                    <button
                        class="btn-light"
                        onclick="editItem('noticias',${x.id})"
                    >
                        Editar
                    </button>
                `;
            }


            /*
               VER
            */

            acciones += `
            <button
            class="btn-light"
            onclick="previewNews(
            ${JSON.stringify(x.descripcion)
                    .replaceAll('"', '&quot;')},
            ${JSON.stringify(x.titulo)
                    .replaceAll('"', '&quot;')},
            ${JSON.stringify(x.imagen || '')
                    .replaceAll('"', '&quot;')}
                    )"
                    >
                     Ver
                     </button>
                     `;


            /*
               ENVIAR A APROBACIÓN

               Solo administradores de área.
            */

            if (
                !esSuperAdmin &&
                (
                    x.estado === 'Borrador' ||
                    x.estado === 'Rechazada'
                )
            ) {

                acciones += `
                    <button
                        class="btn-primary"
                        onclick="enviarNoticiaAprobacion(${x.id})"
                    >
                        Enviar a aprobación
                    </button>
                `;
            }


            /*
               PAPELERA

               No permitimos mandar a papelera
               una solicitud pendiente.
            */

            if (x.estado !== 'Pendiente') {

                acciones += `
                    <button
                        class="btn-danger"
                        onclick="enviarNoticiaPapelera(${x.id})"
                    >
                        Papelera
                    </button>
                `;
            }


            let rechazo = '';

            if (
                x.estado === 'Rechazada' &&
                x.motivo_rechazo
            ) {

                rechazo = `
                    <div class="motivo-rechazo">
                        <strong>Motivo del rechazo:</strong>
                        ${escapeHTML(x.motivo_rechazo)}
                    </div>
                `;
            }


            return `
                <article class="card">

                    <div class="card-img">

                        ${x.imagen
                    ? `<img src="${x.imagen}" alt="">`
                    : '📰'
                }

                    </div>

                    <div class="card-body">

                        <span class="badge ${claseEstadoNoticia(x.estado)}">
                            ${escapeHTML(x.estado)}
                        </span>

                        <div class="meta">
                            ${escapeHTML(x.area)}
                            ·
                            ${escapeHTML(x.fecha)}
                        </div>

                        <h3>
                            ${escapeHTML(x.titulo)}
                        </h3>

                        ${rechazo}

                        <div class="actions">
                            ${acciones}
                        </div>

                    </div>

                </article>
            `;

        }).join('')

        || empty('No hay noticias.');
}
$('#buscarNoticias').oninput = renderNews; $('#filtroEstado').onchange = renderNews;

function previewNews(content, title, image = '') {

    const imagenPreview = image
        ? `
            <div class="preview-media">
                <img
                    src="${image}"
                    alt="${escapeHTML(title || '')}"
                >
            </div>
          `
        : '';

    openModal(
        'Vista previa',
        'Así se verá la noticia',
        `
            <article class="preview">

                ${imagenPreview}

                <h1>
                    ${escapeHTML(title || '')}
                </h1>

                <div>
                    ${content}
                </div>

                <div class="form-actions">
                    <button
                        type="button"
                        class="btn-secondary"
                        onclick="volverModalAnterior()"
                    >
                        Cerrar
                    </button>
                </div>

            </article>
        `,
        () => { }
    );
}


/* EDICIÓN GENÉRICA */
function editItem(type, id) {

    const item =
        data[type]?.find(
            x => Number(x.id) === Number(id)
        );

    if (!item) {
        return;
    }

    if (type === 'noticias') {
        openNews(item);
        return;
    }

    if (type === 'carrusel') {
        openSlide(item);
        return;
    }

    if (type === 'videos') {
        openVideo(item);
        return;
    }
}


/* DASHBOARD */
function updateDashboard() {

    $('#statNoticias').textContent =
        data.noticias.length;

    $('#statCarrusel').textContent =
        data.carrusel.filter(
            x => x.activo
        ).length;

    $('#statVideos').textContent =
        data.videos.filter(
            x => x.activo
        ).length;

    $('#statAreas').textContent =
        data.areas.filter(
            x => x.activo
        ).length;

    $('#statPapelera').textContent =
        data.papelera.length;


    /*
       SOLICITUDES PENDIENTES

       El contador debe incluir:
       - Noticias pendientes
       - Carrusel pendiente
       - Video pendiente
    */

    if (esSuperAdmin) {

        const totalPendientes =
            data.noticias.filter(
                x => x.estado === 'Pendiente'
            ).length
            +
            data.carrusel.filter(
                x => x.estado === 'Pendiente'
            ).length;
        +
            data.videos.filter(
                x => x.estado === 'Pendiente'
            ).length;


        const contadorSolicitudes =
            document.querySelector(
                '#contadorSolicitudes'
            );


        if (contadorSolicitudes) {
            contadorSolicitudes.textContent =
                totalPendientes;
        }
    }


    $('#actividadReciente').innerHTML =
        '<p>La actividad administrativa se registra en Auditoría.</p>';
}
function empty(msg) { return `<div class="empty">${escapeHTML(msg)}</div>` }
function renderAll() { const area = $('#filtroArea'); const current = area.value; area.innerHTML = '<option value="">Todas las áreas</option>' + data.areas.map(a => `<option value="${escapeHTML(a.nombre)}">${escapeHTML(a.nombre)}</option>`).join(''); area.value = current; renderNews(); renderCarrusel(); renderVideos(); renderAreas(); renderTrash(); updateDashboard() }
function readFile(file, cb) { if (!file) { cb(''); return } const r = new FileReader(); r.onload = e => cb(e.target.result); r.readAsDataURL(file) }

async function subirImagenNoticia(archivo) {

    if (
        !archivo ||
        archivo.size === 0
    ) {
        return null;
    }

    const formData = new FormData();

    formData.append(
        'imagen',
        archivo
    );
    formData.append(
        'tipo',
        'noticias'
    );


    const urlUpload =
        apiBase.replace(
            /api\.php\/?$/,
            'upload.php'
        );



    const respuesta = await fetch(
        urlUpload,
        {
            method: 'POST',

            headers: {
                'X-CSRF-Token': csrfToken
            },

            body: formData
        }
    );


    const resultado =
        await respuesta.json();

    if (
        !respuesta.ok ||
        !resultado.ok
    ) {

        throw new Error(
            resultado.message ||
            'No se pudo subir la imagen'
        );
    }


    return resultado.ruta;
}
async function subirImagenCarrusel(archivo) {

    if (
        !archivo ||
        archivo.size === 0
    ) {
        return null;
    }

    const formData =
        new FormData();

    formData.append(
        'imagen',
        archivo
    );

    formData.append(
        'tipo',
        'carrusel'
    );


    const urlUpload =
        apiBase.replace(
            /api\.php\/?$/,
            'upload.php'
        );

    const respuesta =
        await fetch(
            urlUpload,
            {
                method: 'POST',

                headers: {
                    'X-CSRF-Token': csrfToken
                },

                body: formData
            }
        );



    const resultado =
        await respuesta.json();



    if (
        !respuesta.ok ||
        !resultado.ok
    ) {

        throw new Error(
            resultado.message ||
            'No se pudo subir la imagen del carrusel'
        );
    }


    return resultado.ruta;
}

/* =========================================
   EVENTOS - CAMBIAR MI CONTRASEÑA
========================================= */

const btnCambiarMiPassword =
    document.querySelector(
        '#btnCambiarMiPassword'
    );

const cerrarMiPasswordBtn =
    document.querySelector(
        '#cerrarModalCambiarMiPassword'
    );

const cancelarMiPasswordBtn =
    document.querySelector(
        '#cancelarCambiarMiPassword'
    );

const formCambiarMiPassword =
    document.querySelector(
        '#formCambiarMiPassword'
    );


if (btnCambiarMiPassword) {

    btnCambiarMiPassword.addEventListener(
        'click',
        abrirCambiarMiPassword
    );
}


if (cerrarMiPasswordBtn) {

    cerrarMiPasswordBtn.addEventListener(
        'click',
        cerrarCambiarMiPassword
    );
}


if (cancelarMiPasswordBtn) {

    cancelarMiPasswordBtn.addEventListener(
        'click',
        cerrarCambiarMiPassword
    );
}


if (formCambiarMiPassword) {

    formCambiarMiPassword.addEventListener(
        'submit',
        guardarCambiarMiPassword
    );
}
/* 8. API / BACKEND */
async function api(path, options = {}) {
    if (!apiBase) {
        throw new Error(
            'API no configurada'
        );
    }
    const headers = {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        ...(options.headers || {})
    };
    const res = await fetch(
        apiBase.replace(/\/$/, '') + path,
        {
            ...options,
            headers
        }
    );
    const body =
        await res.json().catch(
            () => ({})
        );

    if (!res.ok) {
        throw new Error(
            body.message || 'Error de API'
        );
    }
    return body;
}


/* Inicio */
renderAll();
if (apiBase) {
    cargarAreasDesdeMySQL();
    cargarNoticiasDesdeMySQL();
    cargarPapeleraDesdeMySQL();
    cargarCarruselDesdeMySQL();
    cargarVideosDesdeMySQL();
}