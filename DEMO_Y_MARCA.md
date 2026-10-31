# Demo: marca general, carrusel y confirmaciones

## Instalar la actualización
Respalda la base de datos y conserva .env, APP_KEY, claves de Reverb y volúmenes.
Extrae el ZIP sobre tu instalación y ejecuta desde encuentro:

```bash
bash install.sh
```

Esta versión añade la migración 2026_10_27_000009_platform_branding:
permiso global en owners y una tabla de configuración de marca.
No genera ni reemplaza claves que ya estén configuradas.
Recarga con Ctrl+F5.

## Dar permiso de marca general a tu cuenta
Como la plataforma admite varios dueños, la marca del catálogo general no
puede quedar editable por cualquier propietario que se registre.

Concede el permiso desde la consola usando el correo de TU cuenta de propietario:

```bash
docker compose exec app-owner php artisan platform:admin tu-correo@ejemplo.com
```

Cierra sesión y vuelve a entrar. En la administración aparecerá “Marca de la plataforma”.
El comando solo acepta propietarios activos existentes; no crea cuentas ni manda correos.
Para retirar el permiso:

```bash
docker compose exec app-owner php artisan platform:admin tu-correo@ejemplo.com --revoke
```

Los registros públicos nunca conceden este permiso automáticamente.

## Cambiar Encuentro por tu negocio
En “Marca de la plataforma” puedes editar:
- Nombre que sustituye Encuentro en encabezado y pie.
- Logo general e icono de pestaña.
- Título de la pestaña, texto del pie y título/descripción del catálogo.
- Correo y teléfono de contacto; el correo aparece como enlace de contacto en el pie.

Los textos se aplican al pulsar “Publicar marca de la plataforma”.
Logo e icono se publican al subirlos. PNG, JPG y WebP, hasta 3 MB; SVG no se admite.
Retirar un archivo requiere confirmación. La vista previa muestra el nombre y logo.
Los cambios se notifican con los eventos de catálogo existentes.

La marca general identifica a la plataforma. Cada local conserva su diseño propio,
logo y favicon desde “Diseño y vista previa”; la página del local puede mostrar
su identidad particular. Si esta plataforma representa un solo negocio, usa
el mismo nombre y archivos en ambos apartados.

## Carrusel animado
Activa Carrusel automático desde Diseño y vista previa → Imágenes de portada
y publica el diseño. Cambia las fotos con fundido y un acercamiento muy leve
durante 700 ms. Conserva las pausas al interactuar y los controles de la portada.
La preferencia de movimiento reducido desactiva la animación y el avance automático.
Las tarjetas muestran un contador discreto. Solo se usan fotos publicadas reales;
no se añadieron fotos ficticias a tus establecimientos.

## Confirmación de cancelación
En Mis reservas, “Cancelar apartado” abre una confirmación con local, folio y fecha.
“Conservar mi reserva” recibe el foco inicial. Escape permite cerrar si no se
está procesando; el teclado permanece dentro del diálogo.
La cancelación solo se envía al confirmar expresamente. Durante la solicitud
se bloquean los botones y los dobles clics. Un rechazo del servidor aparece
dentro del diálogo sin informar falsamente que se canceló.
Al completar, se actualiza el listado y se muestra una confirmación.

Se mantiene el alcance existente: el cliente cancela apartados pendientes.
El servidor impide esta cancelación si hay pagos registrados o un checkout/ficha
vigente. Las reservas pagadas y los reembolsos necesitan intervención del local.
No se implementaron devoluciones automáticas en esta actualización.

También se pide confirmación para eliminar logos/iconos del diseño de un local.
La eliminación de fotos del local ya tenía su propia confirmación.

## Limpieza del sitio público y búsqueda
Se retira el indicador técnico de conexión de las pantallas públicas, incluida
“Actualización de respaldo”. Los eventos WebSocket y el respaldo siguen funcionando.
La administración conserva su indicador para diagnosticar la conexión.

El catálogo incluye búsqueda por nombre, dirección y descripción, sin distinguir
mayúsculas o tildes, y permite limpiar una búsqueda sin resultados.

## Preparación de la demo
“Marca de la plataforma” incluye una revisión de configuración de:
locales publicados, fotos visibles, marca guardada, correo y pasarelas habilitados
y configuración de actualizaciones. Esto no prueba conexiones externas.

Antes de presentarla:
1. Publica tus locales con fotos, nombre, dirección, horarios y precios definitivos.
2. Configura marca, logo e icono. Activa y publica el carrusel.
3. Crea una cuenta cliente diferente de la cuenta del dueño.
4. Haz un apartado con extras y revisa total, anticipo y disponibilidad en otro navegador.
5. Abre cancelar, elige conservar y verifica que no se cancele. Luego confirma
   otro apartado y comprueba que el horario se libere.
6. Para demostrar pagos, usa la cuenta sandbox y los datos de prueba oficiales
   de tu proveedor. No uses tarjetas ni pagos reales como si fueran simulaciones.
7. Comprueba un pago verificado y la confirmación por correo, incluidos extras
   y Wi-Fi si Internet fue seleccionado.
8. Si vas a mostrar Meta, valida las cuentas y webhooks reales autorizados.
9. Comprueba escritorio y móvil en tu dominio HTTPS.

## Pendiente antes de un uso comercial real
- Pruebas de extremo a extremo con tus credenciales de cada pasarela y correo,
  webhooks, casos pendientes y fallos de red.
- Configuración y validación de Meta con permisos reales, si se utilizará.
- Respaldos automáticos de base de datos, archivos y claves, y una restauración ensayada.
- Definir políticas de cancelación, reembolsos y privacidad para tu negocio.
- Revisar flujo de recuperación de contraseña, soporte y el procedimiento del
  dueño para cancelaciones de reservas pagadas y devoluciones; esta entrega
  incorpora recuperación por correo al configurar el SMTP global; no incluye reembolsos automáticos.
- Monitoreo del servidor y pruebas sobre el dominio y proxy instalados.

La actualización incluye pruebas locales de permisos, carga de imágenes,
cancelación y confirmación, marca general, accesibilidad del diálogo, búsqueda
y carrusel. No acredita que el servidor remoto o las integraciones reales
estén ya configurados y probados.
