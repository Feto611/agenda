> Actualización vigente: consulta [WEBSOCKETS.md](WEBSOCKETS.md). Las actualizaciones de interfaz usan Reverb/Echo; las consultas periódicas de 3/5/10/15 segundos descritas en versiones anteriores fueron reemplazadas.

# Mapas, horarios automáticos, actualización de datos y correos

## Qué se corrigió

El mapa de la captura muestra una imagen de bloqueo 403 enviada por OpenStreetMap. La política `no-referrer` incorporada en la revisión anterior impedía enviar el Referer que exige ese servicio. Esta revisión utiliza `strict-origin-when-cross-origin` tanto en Laravel/Nginx como en la capa Leaflet: hacia un servidor externo se envía el origen del sitio, sin la ruta ni parámetros privados.

No se cambia de servidor para eludir un bloqueo, no se descargan mapas en masa ni se oculta la atribución. El mapa conserva la configuración `MAP_TILE_URL` y `MAP_ATTRIBUTION`, para poder utilizar un proveedor con el servicio/capacidad adecuados. Si el servidor sigue bloqueando tu dominio/IP tras actualizar, revisa su política y utiliza un proveedor de teselas autorizado para tu aplicación. La búsqueda de direcciones Geoapify es un servicio separado de la carga de imágenes del mapa.

Se muestra una advertencia cuando Leaflet informa de un fallo al cargar una imagen y se ofrece un enlace externo a la ubicación. Algunos proveedores devuelven una imagen que contiene su propio aviso de bloqueo; en ese caso el aviso puede aparecer dentro del mapa.

### Aviso de CSP de la consola

El bloqueo de teselas y la advertencia de script inline son problemas distintos. Se añadió un nonce aleatorio por respuesta a CSP y a los scripts generados por Vite, manteniendo bloqueados los scripts inline sin autorización y sin permitir unsafe-eval. Los scripts de Vite reciben el nonce de la respuesta.

Si la consola sigue señalando un script inyectado por un proxy, analítica, extensión u optimización de Cloudflare, identifica su origen. Para una integración de Cloudflare incompatible con CSP, desactiva esa optimización para la aplicación o configura la integración de acuerdo con su documentación. No copies el hash de un script desconocido ni añadas unsafe-inline de forma global. Las detecciones de Cloudflare compatibles con nonce pueden utilizar el nonce de la cabecera; no se ha probado tu configuración concreta de Cloudflare desde aquí.

Después de reconstruir, recarga el navegador y comprueba que HTML y cabeceras proceden de la misma versión. No configures el CDN para guardar datos privados ni devolver copias antiguas de /api/*.

## Horarios y campos numéricos

- Escribe `0930`: el control muestra `09:30`. Al escribir dos dígitos se añade `:` automáticamente; también puedes pegar `09:30`.
- La hora debe tener cuatro dígitos en formato de 24 horas. `29:00` o `12:99` no son válidos. Se conserva el selector “El mismo día / Al día siguiente”.
- Retroceso permite borrar la hora completa, incluyendo el separador, sin quedarse atascado.
- Los campos numéricos bloquean letras y notación científica tanto al teclear como al pegar. Los enteros no aceptan separador decimal; los importes y otros campos decimales admiten punto o coma decimal.
- Borrar un campo sigue dejándolo vacío. No se inserta un cero. Las validaciones de rango y obligatoriedad se conservan en navegador y servidor.

## Actualización sin recargar

La implementación utiliza consultas periódicas con revisiones y ETag, no WebSockets:

- Catálogo y datos publicados de un local: cada **3 segundos** mientras la pestaña está visible, y al volver a ella.
- Calendario/disponibilidad: cada **10 segundos**, además de al cambiar la configuración pública del local.
- Agenda del dueño, reservas del cliente y estados de correo: cada **5 segundos** cuando corresponde a la vista abierta.

Se actualizan nombre, precios, ubicación, diseño publicado, fotos y comentarios visibles. Si el local se despublica, su página deja de permitir reservar. Un cambio en la revisión del local invalida la cotización mostrada y cierra una confirmación abierta para que el cliente revise la nueva información. El servidor recalcula y comprueba el precio al apartar, incluso aunque haya un retraso de red.

Los formularios sin guardar del propietario no se sustituyen con consultas periódicas. Si el navegador está desconectado o el proxy no permite revalidar las respuestas, no puede garantizarse que los cambios aparezcan en ese intervalo. No se conserva un precio viejo como autorización para cobrar.

## Configurar correos desde el panel

Abre el establecimiento en Gestión del negocio y entra en **Correos y notificaciones**. La configuración pertenece únicamente a ese establecimiento. Un propietario no puede leer o modificar el correo de otro.

| Proveedor | Credenciales en el panel |
| --- | --- |
| Resend | API Key, correo y nombre del remitente; dirección de respuesta opcional |
| Postmark | Server API Token, correo y nombre del remitente; dirección de respuesta opcional |
| SMTP | Servidor autorizado, puerto 587 STARTTLS o 465 TLS, usuario, contraseña y remitente |

1. Crea/configura el servicio en el proveedor elegido y autoriza el remitente o verifica tu dominio con los registros DNS que solicite.
2. Introduce los datos en el panel. Las claves se guardan cifradas con APP_KEY y no se devuelven al navegador. Dejar un secreto vacío conserva el guardado para el mismo proveedor; al cambiar de proveedor se requieren credenciales nuevas.
3. Marca **Habilitar confirmaciones de pago** y guarda.
4. Comprueba la bandeja de estados del panel cuando se registre un pago real o de pruebas. Las respuestas HTTP aceptadas por el proveedor se muestran como **Aceptado por el proveedor**, no como entrega garantizada en la bandeja de entrada.

Los adaptadores API usan únicamente los endpoints oficiales de Resend y Postmark. Para otros servicios se utiliza SMTP con TLS obligatorio. No se admite una URL API arbitraria ni un servidor SMTP interno elegido desde el navegador.

### Autorizar un SMTP propio

Por seguridad, el panel permite elegir hosts de una lista administrada en el servidor. Para ampliar la lista añade `SMTP_ALLOWED_HOSTS` a `.env` con los nombres exactos, separados por comas, de los servidores de correo que autorizas. Por ejemplo:

```dotenv
SMTP_ALLOWED_HOSTS=smtp.resend.com,smtp.postmarkapp.com,smtp.tu-proveedor.com
```

Esto reemplaza la lista inicial, por lo que debes incluir los que quieras conservar. No añadas localhost, IP privadas o servicios de administración. Reinicia/recrea los servicios que leen `.env` y limpia su caché de configuración. El administrador del negocio conserva la selección del proveedor y sus credenciales desde su panel; la lista de hosts es una restricción del operador del servidor.

## Cuándo se envía el correo

- Solo cuando hay un movimiento de pago positivo verificado y la reserva está confirmada sin incidencias.
- También funciona para pagos recibidos fuera de la plataforma y registrados por el dueño en el panel.
- Emitir una referencia OXXO, abrir el checkout o volver del proveedor no genera por sí mismo un correo de confirmación.
- Cada movimiento de pago puede generar un comprobante. Una notificación repetida del mismo pago no genera otro. Un segundo pago legítimo, como el saldo, genera su propio correo actualizado.
- El mensaje contiene local, orden, fecha/horario con zona horaria, invitados, importe recibido, total, pagado acumulado, saldo, dirección y enlace a Mis reservas. Se genera con los datos del pago, no con un importe enviado por el navegador. No es una factura fiscal.

El registro del correo pendiente se guarda en la misma transacción de base de datos que el pago. El envío al proveedor se realiza después, mediante el scheduler, para no retrasar ni deshacer un pago porque el servicio de correo falle. El servicio **scheduler** debe estar activo; procesa hasta 50 mensajes por ejecución cada minuto.

Para procesar manualmente la cola desde el servidor, si lo necesitas:

```bash
docker compose exec app php artisan notifications:deliver --limit=50
```

Este comando sí intentará enviar correos pendientes con tus credenciales configuradas. No se ejecutó aquí con cuentas reales.

### Estados y duplicados

- **Pendiente:** espera el procesamiento.
- **Falta configurar correo:** no hay un proveedor habilitado. Al habilitarlo se vuelven a considerar estos mensajes.
- **Aceptado por el proveedor:** la API/SMTP devolvió un identificador de aceptación. No se implementó seguimiento de rebotes, aperturas o entrega mediante webhooks.
- **Rechazado:** el proveedor devolvió un rechazo HTTP conocido. Corrige la configuración y utiliza Volver a poner en cola.
- **Envío incierto / Enviando persistente:** hubo un resultado ambiguo o un reinicio durante el envío. Contrasta el estado con el proveedor. No se habilita un reenvío automático que pueda duplicarlo.
- **Reserva en revisión:** el estado de la reserva cambió, tiene una incidencia, el anticipo no está cubierto o el evento ya empezó. No se envía una confirmación antigua automáticamente.

Resend recibe una Idempotency-Key estable por mensaje. Sus claves tienen una ventana de 24 horas; la aplicación no depende de esa ventana para reintentar indefinidamente. SMTP y Postmark no se tratan como si garantizaran exactamente un envío en caso de fallo de red.

Los datos del correo pendiente también se cifran en la base. Conserva APP_KEY al actualizar. No se envían campañas comerciales ni correos a contactos ajenos a la reserva.

## Actualizar conservando datos

Respalda `.env`, la base PostgreSQL y las fotos siguiendo `ACCESOS_Y_PAGOS.md`. Extrae el ZIP conservando `.env`, APP_KEY, nombre del proyecto Compose y volúmenes. Después:

```bash
cd ~/agendavirtual/encuentro
docker compose build
docker compose run --rm app php artisan migrate --force
docker compose up -d
docker compose exec app php artisan optimize:clear
docker compose exec app-owner php artisan optimize:clear
docker compose exec app php artisan up
docker compose ps
```

**La migración nueva es necesaria:** `2026_10_27_000005_transactional_email.php` crea las tablas de configuración y cola de correos. Nginx debe reconstruirse para corregir también su cabecera Referrer-Policy. Mantén activo scheduler. No uses down -v, migrate:fresh ni generes otra APP_KEY. Recarga el navegador después de actualizar.

## Verificación

Se ejecutaron pruebas locales de nonce/CSP y política de referencias, revisión/ETag de precios y fotos, visibilidad, campos sin letras, máscara de hora, borrado, consultas al recuperar el foco y aislamiento de configuración de correo. Los adaptadores Resend/Postmark y la construcción del transporte SMTP se comprobaron con respuestas simuladas, sin conexión a una cuenta real.

También se comprobaron pagos pendientes sin correo, registro duplicado sin doble envío, bloqueo por cancelación/devolución, errores del proveedor sin deshacer el pago y privacidad de secretos/datos de la cola. Los resultados actualizados están en `audit/phpunit-results.xml` y `audit/react-tests.txt`.

No se desplegó en tu servidor ni se envió correo real. Debes verificar DNS del remitente, límites del proveedor, llegada/bandeja de spam, SMTP/TLS y comportamiento visual en tu instalación. Las pruebas PHP usan PHP.wasm y SQLite; no sustituyen verificar Docker/PostgreSQL y Cloudflare reales.

Referencias oficiales:

- Política de teselas OSM: https://operations.osmfoundation.org/policies/tiles/
- Resend API: https://resend.com/docs/api-reference/emails/send-email
- Resend Idempotency: https://resend.com/docs/dashboard/emails/idempotency-keys
- Postmark Email API: https://postmarkapp.com/developer/api/email-api
- CSP y Cloudflare: https://developers.cloudflare.com/fundamentals/reference/policies-compliances/content-security-policies/
- Scripts y Rocket Loader: https://developers.cloudflare.com/speed/optimization/content/rocket-loader/ignore-javascripts/
- Laravel Vite nonce: https://api.laravel.com/docs/12.x/Illuminate/Foundation/Vite.html
