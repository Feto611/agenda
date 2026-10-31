# Diseños de correo

La plataforma incorpora correos HTML con versión de texto para verificación de cuentas, recuperación de contraseña y confirmación de reservas con pago verificado. Los mensajes utilizan tablas e instrucciones de estilo en línea, tipografías comunes, un botón visible y un enlace alternativo para acceder a la cuenta.

## Actualizar

Sustituye los archivos por esta versión conservando .env, APP_KEY y los volúmenes. Después ejecuta:

```bash
docker compose up -d --build
docker compose exec -T app php artisan migrate --force
docker compose exec -T app php artisan optimize:clear
docker compose exec -T app-owner php artisan optimize:clear
```

La migración `2026_10_29_000013_email_designs` crea la tabla de diseños. No cambia proveedores, contraseñas ni configuraciones SMTP. Conserva el SMTP global de Resend configurado para acceso y el proveedor de confirmaciones configurado por local.

## Personalizar desde el panel

En Gestión del negocio abre **Diseños de correo**.

- Cada propietario puede modificar las confirmaciones de sus propios locales.
- El administrador de la plataforma puede seleccionar **Acceso y correos de la plataforma** para editar verificación, recuperación y el diseño base de confirmaciones. Este permiso es el mismo de Marca de la plataforma.
- Si necesitas asignar ese permiso al propietario que administra toda la instalación, utiliza desde la consola del servidor el comando ya existente `docker compose exec -T app-owner php artisan platform:admin correo@example.com`. No se concede automáticamente a todos los propietarios.
- El estilo global se hereda en locales sin personalización. El nombre y eslogan del local se conservan; su logo registrado tiene prioridad sobre el global. Guardar un diseño local fija su configuración independiente.

El editor ofrece cuatro estilos base, seis colores, nombre de marca, eslogan, URL de logo, tipografía moderna o clásica, alineación del encabezado y pie, ancho del mensaje, tamaño del texto y logo, esquinas, información de contacto y visibilidad de ubicación y servicios. El logo debe ser una imagen pública HTTPS; **Usar logo registrado** recupera el logo del negocio o la plataforma. Los destinatarios pueden tener deshabilitada la descarga de imágenes; el nombre de la marca también aparece como texto.

Cada tipo de correo permite editar asunto, etiqueta superior, título, introducción, texto del botón y despedida. Las variables admitidas son `{{cliente}}`, `{{negocio}}`, `{{orden}}`, `{{importe}}` y `{{saldo}}`. Las variables de reserva solo tienen contenido en confirmaciones. No se admiten código HTML, CSS o enlaces de acción arbitrarios; el texto se escapa antes de renderizarse.

La vista previa se actualiza tras una pausa al escribir y utiliza la misma plantilla del servidor que los envíos. Incluye vistas de escritorio, celular y texto plano. Siempre utiliza una identidad, una reserva y accesos Wi-Fi de ejemplo; no consulta ni muestra reservas reales ni credenciales. No envía correos. Restablecer modifica el borrador y requiere guardar para aplicarlo. Cambiar de local o salir descarta cambios sin guardar.

Guardar aplica los cambios a los próximos mensajes generados. Los correos ya enviados no se modifican, y los pendientes mantienen el contenido que tenían al generarse, para conservar el registro de su confirmación.

## Datos que conserva el servidor

El editor no modifica destinatarios, importes, fechas, vencimientos, enlaces de verificación o recuperación ni la política aceptada. Los datos Wi-Fi solo se incorporan al mensaje real tras el pago verificado y cuando se seleccionó Internet para esa reserva. No se elimina esa condición al editar el diseño. La versión de texto conserva la información operativa aunque se oculten secciones decorativas en HTML.

Los botones de acceso utilizan CUSTOMER_URL u OWNER_URL configurados, sin usar el dominio recibido en la solicitud. La vista previa queda dentro de un iframe aislado y no utiliza enlaces de acceso reales. Personalizar los diseños no altera la duración ni el uso único de los tokens.

El **nombre de marca dentro del mensaje** y el **remitente del envío** son configuraciones distintas: el remitente de acceso se cambia en MAIL_FROM_NAME y MAIL_FROM_ADDRESS; el de confirmaciones, en Correos y notificaciones. El dominio remitente debe continuar verificado en Resend.

## Validación y alcance

Se verifican permisos por propietario, permisos de administrador global, conservación de campos omitidos, variables, URLs y colores, contenido HTML escapado, versiones HTML y texto, datos obligatorios, vista previa sin envíos, guardado y controles del editor. También se ejecutan las pruebas existentes de pagos y verificación de cuenta.

Las representaciones visuales de Gmail, Outlook y otros lectores pueden variar. Las pruebas locales no envían mensajes a destinatarios reales. Tras actualizar, comprueba un correo de verificación y una confirmación de prueba en los lectores que utilizarán tus clientes. Los correos HTML siguen conservando la alternativa de texto.

Resultado local de esta entrega: 275 pruebas PHP, 1273 aserciones, 71 pruebas de interfaz y siete escenarios concurrentes PostgreSQL aprobados. La compilación de producción pasó. Se renderizaron las tres plantillas a anchos de escritorio y celular para revisión visual; esto no sustituye la comprobación en lectores de correo reales.
