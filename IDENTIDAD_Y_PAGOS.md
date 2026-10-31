# Identidad general y selección de pagos

Esta revisión contiene únicamente los ajustes solicitados de navegación, identidad y selección de pago.

## Cambios

- Se retira Dominio propio y HTTPS del menú y se deshabilita la función de páginas independientes en el servidor. Las rutas de administración de dominios ya no están disponibles y un dominio independiente no sirve su página aunque estuviera activado anteriormente. Los registros se conservan; no se eliminan reservas ni archivos.
- Esto no desactiva HTTPS de los portales centrales. Mantén el certificado y proxy existentes para acceso y pagos seguros. Si usas Caddy, el generador de configuración solo incluye los portales centrales mientras esta función está deshabilitada; una configuración previamente generada no se recarga por sí sola.
- Se quitan el título y favicon independientes de Diseño y vista previa. El logo, nombre y estilo del establecimiento permanecen. Los valores históricos se conservan, sin controles de edición ni uso en un dominio deshabilitado.
- La configuración general se abre desde Identidad de página, junto al nombre del usuario, en el encabezado del portal de propietarios. Sustituye al antiguo acceso lateral Marca de la plataforma y permite administrar nombre, logo, título y favicon generales. Conserva el permiso platform_admin para que otro dueño no cambie la identidad de todos los negocios. Funciona también sin locales registrados.
- Los desplegables Importe a pagar y Medio de pago del checkout se sustituyen por tarjetas seleccionables. Hay controles de radio nativos, foco de teclado visible, tarjetas ajustadas al celular, modo de pruebas y razones de indisponibilidad. Se conserva el flujo de cambio de importe y validación del servidor. No se agrega Stripe ni otro proveedor.

## Actualizar

Conserva `.env`, `APP_KEY` y los volúmenes. Sustituye los archivos del proyecto y ejecuta desde la carpeta encuentro:

```bash
docker compose up -d --build
docker compose exec -T app php artisan optimize:clear
docker compose exec -T app-owner php artisan optimize:clear
```

No hay una migración nueva en esta revisión. Si omitiste actualizaciones anteriores, aplica sus migraciones pendientes mediante `docker compose exec -T app php artisan migrate --force`. Recarga el navegador con Ctrl+F5.

Si tu cuenta de propietario ya tiene el permiso de administrador general, el acceso Identidad de página aparece al iniciar sesión. Si no lo tiene, el responsable del servidor puede concederlo a una cuenta existente con `docker compose exec -T app-owner php artisan platform:admin tu-correo@ejemplo.com` y después volver a iniciar sesión. No se concede este permiso automáticamente a todos los propietarios.

El manual anterior describe la navegación de la entrega 20. Para estos tres apartados prevalecen las instrucciones de esta nota.

## Comprobaciones

Pasaron 297 pruebas PHP con 1394 aserciones y 77 pruebas de interfaz; después se verificaron además las rutas de recarga y bloqueo de dominios. TypeScript y la compilación de producción pasaron. Las pruebas de pago simulan proveedores, sin cargos reales ni cambios en el servidor remoto. La imagen generada es una referencia visual; las tarjetas reales están implementadas con React y CSS.
