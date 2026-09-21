const checkPermission = (requiredRoles) => {
    return (req, res, next) => {
        const userRole = req.user?.role; // Asumiendo que el token o sesión inyecta req.user

        if (!userRole || !requiredRoles.includes(userRole)) {
            return.status(403).json({ 
                error: 'Acceso restringido: tu rol actual no cuenta con los permisos necesarios para esta acción.' 
            });
        }
        next();
    };
};

// Ejemplo de uso en rutas:
// router.post('/contents', checkPermission(['Administrador', 'Director de área', 'Colaborador']), createContent);
// router.patch('/contents/:id/review', checkPermission(['Administrador', 'Director de área']), reviewContent);
// router.patch('/users/:id/role', checkPermission(['Administrador']), updateRole);

module.exports = { checkPermission };
