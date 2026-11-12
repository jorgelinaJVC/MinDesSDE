
-- Actualización de nombres de usuarios

UPDATE usuarios_admin
SET usuario = 'superadmi',
    nombre = 'Superadministrador'
WHERE id = 2 AND usuario = 'sosa';

UPDATE usuarios_admin
SET usuario = 'desarrollo_social',
    nombre = 'Subsecretaría de Desarrollo Social'
WHERE id = 3 AND usuario = 'admin1';

UPDATE usuarios_admin
SET usuario = 'direccion_desarrollo',
    nombre = 'Dirección General de Desarrollo Social'
WHERE id = 4 AND usuario = 'admin2';

UPDATE usuarios_admin
SET usuario = 'adultos_mayores',
    nombre = 'Dirección General de Adultos Mayores'
WHERE id = 5 AND usuario = 'admin3';

UPDATE usuarios_admin
SET usuario = 'tarjetas_sociales',
    nombre = 'Tarjetas Sociales y Celíacos'
WHERE id = 6 AND usuario = 'admin4';

UPDATE usuarios_admin
SET usuario = 'comedores_escolares',
    nombre = 'Comedores Escolares'
WHERE id = 7 AND usuario = 'admin5';

UPDATE usuarios_admin
SET usuario = 'promocion_humana',
    nombre = 'Subsecretaría de Promoción Humana'
WHERE id = 8 AND usuario = 'admin6';

UPDATE usuarios_admin
SET usuario = 'defensa_civil',
    nombre = 'Subsecretaría de Defensa Civil'
WHERE id = 9 AND usuario = 'admin7';
