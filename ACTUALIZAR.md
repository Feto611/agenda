# Actualizar

La guía vigente está en [ACCESOS_Y_PAGOS.md](ACCESOS_Y_PAGOS.md). Esta actualización añade separación de cuentas y portales y el módulo de checkout; requiere ejecutar las migraciones pendientes.

Conserva .env, APP_KEY y volúmenes. Respalda PostgreSQL antes de actualizar. No uses migrate:fresh, down -v ni regeneres APP_KEY.

Los establecimientos y reservas existentes se conservan. Los nuevos propietarios se registran directamente desde Gestión del negocio. Las identidades antiguas pendientes se activan con invitación de consola para el correo que tenía el dueño; no se reutiliza la contraseña de cliente.

Los nuevos servicios son app-owner, web-owner y scheduler. Construye y arranca el conjunto de servicios; actualizar únicamente app y web no crea el portal privado ni la conciliación periódica.
