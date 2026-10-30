<?php

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/auth.php';

function responder($datos, $codigo = 200)
{
    http_response_code($codigo);

    echo json_encode(
        $datos,
        JSON_UNESCAPED_UNICODE
    );

    exit;
}
/* =========================================
   SEGURIDAD
========================================= */

if (!usuarioAutenticado()) {

    responder([
        'ok' => false,
        'message' => 'No autorizado'
    ], 401);
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {

    responder([
        'ok' => false,
        'message' => 'Método no permitido'
    ], 405);
}
/* =========================================
   PROTECCIÓN CSRF
========================================= */

$tokenCsrf =
    $_SERVER['HTTP_X_CSRF_TOKEN'] ?? null;

if (!validarTokenCsrf($tokenCsrf)) {

    responder([
        'ok' => false,
        'message' =>
        'Token CSRF inválido o ausente'
    ], 403);
}
/* =========================================
   CARGA DE VIDEOS PROPIOS
========================================= */

$tipo = $_POST['tipo'] ?? '';

if ($tipo === 'videos') {

    if (
        !isset($_FILES['video']) ||
        $_FILES['video']['error'] !== UPLOAD_ERR_OK
    ) {
        responder([
            'ok' => false,
            'message' => 'No se recibió un video válido'
        ], 400);
    }

    $archivoVideo = $_FILES['video'];

    if (!is_uploaded_file($archivoVideo['tmp_name'])) {
        responder([
            'ok' => false,
            'message' => 'El archivo no proviene de una carga válida'
        ], 400);
    }

    $tamanoVideo = filesize(
        $archivoVideo['tmp_name']
    );

    if (
        $tamanoVideo === false ||
        $tamanoVideo < 100
    ) {
        responder([
            'ok' => false,
            'message' => 'El video está vacío o es inválido'
        ], 400);
    }

    /*
       Máximo para videos propios: 100 MB
    */
    $maximoVideo =
        100 * 1024 * 1024;

    if ($tamanoVideo > $maximoVideo) {
        responder([
            'ok' => false,
            'message' =>
            'El video supera el máximo de 100 MB'
        ], 400);
    }

    /*
       Comprobar el MIME real del archivo.
    */
    $finfoVideo =
        new finfo(FILEINFO_MIME_TYPE);

    $mimeVideo =
        $finfoVideo->file(
            $archivoVideo['tmp_name']
        );

    $videosPermitidos = [
        'video/mp4' => 'mp4',
        'video/webm' => 'webm'
    ];

    if (
        !isset(
            $videosPermitidos[$mimeVideo]
        )
    ) {
        responder([
            'ok' => false,
            'message' =>
            'Formato de video no permitido. Usá MP4 o WEBM.'
        ], 400);
    }

    /*
       Nombre aleatorio para evitar usar
       el nombre enviado por el usuario.
    */
    $extensionVideo =
        $videosPermitidos[$mimeVideo];

    $nombreVideo =
        bin2hex(random_bytes(16))
        . '.'
        . $extensionVideo;

    $carpetaVideo =
        dirname(__DIR__)
        . DIRECTORY_SEPARATOR
        . 'uploads'
        . DIRECTORY_SEPARATOR
        . 'videos';

    if (!file_exists($carpetaVideo)) {

        if (
            !mkdir(
                $carpetaVideo,
                0755,
                true
            )
        ) {
            responder([
                'ok' => false,
                'message' =>
                'No se pudo crear la carpeta de videos'
            ], 500);
        }
    }

    if (!is_dir($carpetaVideo)) {

        responder([
            'ok' => false,
            'message' =>
            'La ruta uploads/videos existe pero no es una carpeta'
        ], 500);
    }

    $destinoVideo =
        $carpetaVideo
        . DIRECTORY_SEPARATOR
        . $nombreVideo;

    if (
        !move_uploaded_file(
            $archivoVideo['tmp_name'],
            $destinoVideo
        )
    ) {
        responder([
            'ok' => false,
            'message' =>
            'No se pudo guardar el video'
        ], 500);
    }

    $rutaVideo =
        '../uploads/videos/'
        . $nombreVideo;

    responder([
        'ok' => true,
        'ruta' => $rutaVideo,
        'tipo' => 'video'
    ]);
}


/* =========================================
   1. VERIFICAR QUE LLEGÓ UNA IMAGEN
========================================= */

if (
    !isset($_FILES['imagen']) ||
    $_FILES['imagen']['error'] !== UPLOAD_ERR_OK
) {

    responder([
        'ok' => false,
        'message' => 'No se recibió una imagen válida'
    ], 400);
}


$archivo = $_FILES['imagen'];
if (!is_uploaded_file($archivo['tmp_name'])) {

    responder([
        'ok' => false,
        'message' => 'El archivo no proviene de una carga válida'
    ], 400);
}
$tamanoReal = filesize(
    $archivo['tmp_name']
);

if ($tamanoReal === false) {

    responder([
        'ok' => false,
        'message' =>
        'No se pudo verificar el tamaño del archivo'
    ], 400);
}
$tipo = $_POST['tipo'] ?? '';

$carpetasPermitidas = [
    'noticias',
    'carrusel'
];

if (!in_array($tipo, $carpetasPermitidas, true)) {

    responder([
        'ok' => false,
        'message' => 'Tipo de contenido no permitido'
    ], 400);
}


/* =========================================
   2. LIMITAR TAMAÑO
   Máximo: 5 MB
========================================= */
$minimo = 100;

if ($tamanoReal < $minimo) {

    responder([
        'ok' => false,
        'message' => 'El archivo recibido está vacío o es inválido'
    ], 400);
}
$maximo = 5 * 1024 * 1024;

if ($tamanoReal > $maximo) {

    responder([
        'ok' => false,
        'message' => 'La imagen supera el máximo de 5 MB'
    ], 400);
}


/* =========================================
   3. COMPROBAR EL MIME REAL
========================================= */

$finfo = new finfo(FILEINFO_MIME_TYPE);

$mime = $finfo->file(
    $archivo['tmp_name']
);
/* =========================================
   VERIFICAR QUE SEA UNA IMAGEN REAL
========================================= */

$datosImagen = @getimagesize(
    $archivo['tmp_name']
);

if ($datosImagen === false) {

    responder([
        'ok' => false,
        'message' => 'El archivo no es una imagen válida'
    ], 400);
}
$ancho = (int)$datosImagen[0];
$alto = (int)$datosImagen[1];

$dimensionMaxima = 8000;

if (
    $ancho <= 0 ||
    $alto <= 0 ||
    $ancho > $dimensionMaxima ||
    $alto > $dimensionMaxima
) {

    responder([
        'ok' => false,
        'message' =>
        'Las dimensiones de la imagen no son válidas. Máximo: 8000 x 8000 píxeles.'
    ], 400);
}


$tiposPermitidos = [

    'image/jpeg' => 'jpg',

    'image/png' => 'png',

    'image/webp' => 'webp'

];
$mimeImagen =
    $datosImagen['mime'] ?? '';

if ($mimeImagen !== $mime) {

    responder([
        'ok' => false,
        'message' =>
        'El tipo real de la imagen no coincide con el archivo recibido'
    ], 400);
}


if (!isset($tiposPermitidos[$mime])) {

    responder([
        'ok' => false,
        'message' =>
        'Formato no permitido. Usá JPG, PNG o WEBP.'
    ], 400);
}


/* =========================================
   4. CREAR NOMBRE SEGURO
========================================= */

$extension = $tiposPermitidos[$mime];

$nombreNuevo =
    bin2hex(random_bytes(16))
    . '.'
    . $extension;


/* =========================================
   5. CARPETA DESTINO
========================================= */

$carpeta =
    dirname(__DIR__)
    . DIRECTORY_SEPARATOR
    . 'uploads'
    . DIRECTORY_SEPARATOR
    . $tipo;


if (!is_dir($carpeta)) {

    if (!mkdir($carpeta, 0755, true)) {

        responder([
            'ok' => false,
            'message' =>
            'No se pudo crear la carpeta de imágenes'
        ], 500);
    }
}


/* =========================================
   6. GUARDAR ARCHIVO
========================================= */

$destino =
    $carpeta
    . DIRECTORY_SEPARATOR
    . $nombreNuevo;


if (
    !move_uploaded_file(
        $archivo['tmp_name'],
        $destino
    )
) {

    responder([
        'ok' => false,
        'message' =>
        'No se pudo guardar la imagen'
    ], 500);
}


/* =========================================
   7. DEVOLVER LA RUTA
========================================= */

$rutaPublica =
    '../uploads/'
    . $tipo
    . '/'
    . $nombreNuevo;


responder([
    'ok' => true,
    'ruta' => $rutaPublica
]);
