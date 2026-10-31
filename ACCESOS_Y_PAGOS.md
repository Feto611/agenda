> Instalación actual: ejecuta `bash install.sh`. Genera y guarda las claves que faltan en `.env`, conserva las existentes y aplica las migraciones. Consulta `INSTALACION_AUTOMATICA.md`; sustituye los pasos manuales de generación de claves de revisiones anteriores.

> Actualización vigente: consulta [WEBSOCKETS.md](WEBSOCKETS.md). Las actualizaciones de interfaz usan Reverb/Echo; las consultas periódicas de 3/5/10/15 segundos descritas en versiones anteriores fueron reemplazadas.

# Portales independientes y pagos

Esta versión reemplaza la cuenta compartida de la primera entrega. El código se entrega actualizado; no se ha instalado en tu servidor ni contiene credenciales comerciales reales.

## Accesos y nombres

| Portal | Entrada predeterminada | Cuenta | Registro |
| --- | --- | --- | --- |
| Reservas | Puerto 8080 | Cliente | Público; nombre, correo y contraseña, teléfono opcional |
| Gestión del negocio | Puerto 8081, ruta `/gestion` | Propietario | Registro propio desde el panel privado |

El portal de propietarios se enlaza a `127.0.0.1` de forma predeterminada. El sitio público no muestra su enlace ni permite acceder a sus rutas administrativas. Cambiar un encabezado HTTP, un campo role o la URL no cambia el portal de servidor. El propietario solo administra sus establecimientos; sus credenciales no sirven como credenciales de cliente y viceversa. Una persona que quiera ambos usos necesita ambas cuentas independientes.

Se utilizan modelos/tablas separados (`users` y `owners`), guards Laravel distintos y cookies `encuentro_customer_session` y `encuentro_owner_session`. Los puertos por sí mismos no aíslan cookies en un navegador; por eso se separan los nombres de cookie, las sesiones autenticadas y el backend de cada portal. Los prefijos de caché también son independientes. Los propietarios nuevos crean su cuenta desde el panel privado, con nombre, correo y contraseña de al menos 12 caracteres con letras y números. Las invitaciones de consola se conservan para activar identidades antiguas migradas, sin permitir que un registro nuevo reclame sus establecimientos.

## Actualizar conservando datos

Conserva `.env`, APP_KEY, el nombre del proyecto Compose y los volúmenes. Antes de sustituir el código:

```bash
cd ~/agendavirtual/encuentro
cp .env .env.respaldo
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > ../encuentro-respaldo.sql
docker compose exec app php artisan down
```

Sube el ZIP actualizado a `~/agendavirtual/encuentro-laravel-react.zip` y extrae:

```bash
cd ~/agendavirtual
unzip -o encuentro-laravel-react.zip
cd encuentro
```

Agrega o ajusta estas variables en tu `.env`:

```dotenv
# URL real del público: obligatoriamente HTTPS para activar pagos en producción.
CUSTOMER_URL=https://reservas.tu-dominio.com
APP_URL=https://reservas.tu-dominio.com
SESSION_SECURE_COOKIE=true

# Acceso privado por túnel SSH en este ejemplo.
OWNER_URL=http://localhost:8081
OWNER_BIND=127.0.0.1
OWNER_PORT=8081
OWNER_SECURE_COOKIE=false

# Configura solo las IP o CIDR reales de tu proxy inverso, si corresponde.
TRUSTED_PROXIES=
```

No copies literalmente el dominio de ejemplo. Si configuras un dominio HTTPS exclusivo para Gestión del negocio, ajusta OWNER_URL y OWNER_SECURE_COOKIE=true, conecta su proxy al servicio web-owner y restringe su acceso en tu red o proveedor de acceso. No reutilices la ruta del sitio público como si fuera el panel privado.

Construye, migra y arranca:

```bash
docker compose build
docker compose run --rm app php artisan migrate --force
docker compose up -d
docker compose exec app php artisan optimize:clear
docker compose exec app-owner php artisan optimize:clear
docker compose exec app php artisan optimize
docker compose exec app-owner php artisan optimize
docker compose exec app php artisan up
docker compose ps
```

Se ejecutan seis servicios: app y web para clientes, app-owner y web-owner para propietarios, PostgreSQL y scheduler. El scheduler concilia pagos cada cinco minutos y procesa mensajes Meta cada minuto. No hay que instalar PHP o Node en el host.

No uses `migrate:fresh`, `docker compose down -v` ni generes una nueva APP_KEY durante una actualización.

### Propietarios ya existentes

La migración conserva el dueño de cada local y crea su identidad de propietario pendiente de activación. **No copia la contraseña del cliente al panel privado.** Activa el acceso con una invitación para el mismo correo que utilizabas como dueño:

```bash
docker compose exec app-owner php artisan owners:list
docker compose exec app-owner php artisan owners:invite tu-correo@ejemplo.com
```

El segundo comando muestra un enlace de invitación válido durante 24 horas. Abre ese enlace para elegir la contraseña de propietario. El administrador del servidor es quien emite invitaciones; no existe una ruta pública para generarlas.

Para acceder al puerto privado desde tu PC, abre un túnel SSH:

```bash
ssh -L 8081:127.0.0.1:8081 root@IP_DEL_SERVIDOR
```

Mantén la terminal abierta y visita `http://localhost:8081/gestion`. Cambia IP_DEL_SERVIDOR por tu servidor. Si tu SSH utiliza otro usuario o puerto, ajusta el comando. Las invitaciones con OWNER_URL=http://localhost:8081 se abren a través de ese túnel.

## Cobros por establecimiento

En Gestión del negocio abre el establecimiento y después **Pasarelas de cobro**. Selecciona PayPal, Mercado Pago u OXXO Pay. Primero guarda la configuración deshabilitada para obtener su URL de notificación, registra esa URL en el proveedor y completa las credenciales; habilita cuando estén listas.

Las credenciales se guardan cifradas con APP_KEY. Las claves secretas no se devuelven al navegador. El cliente solo ve los medios habilitados y si están en modo de pruebas. El servidor obtiene el importe desde la reserva; no utiliza un precio enviado por el cliente.

### PayPal

Necesitas Client ID, Client Secret, Merchant ID de la cuenta receptora y Webhook ID. El modo sandbox utiliza `api-m.sandbox.paypal.com`; producción utiliza `api-m.paypal.com`.

Se crea una orden Orders v2, el comprador aprueba en PayPal y el servidor captura/verifica. Antes de capturar un cargo nuevo se verifica que el horario y el saldo sigan vigentes. Si el cargo ya fue capturado, se consulta y concilia sin emitir otro cargo.

Registra las notificaciones PAYMENT.CAPTURE.COMPLETED y PAYMENT.CAPTURE.REFUNDED. La firma se verifica mediante la API de verificación de PayPal; después se consulta la orden o devolución al proveedor. Se comprueban cuenta receptora, moneda, importe y referencia interna.

### Mercado Pago

Necesitas Access Token, Collector ID/ID de vendedor y secreto de firma de notificaciones. Se utiliza Checkout Pro (Preferences API). La firma HMAC de la notificación se verifica antes de consultar `/v1/payments/{id}`. Se valida también cuenta receptora y modo de prueba/producción.

Los medios de pago diferidos se excluyen de esta preferencia para no emitir referencias de efectivo con un vencimiento incompatible con el apartado de 15 minutos. El efectivo OXXO se maneja mediante su integración específica.

### OXXO Pay / Digital FEMSA

Necesitas la clave privada de API y la clave pública RSA para Webhooks de tu comercio. Activa eventos de órdenes pagadas y devoluciones. El modo de pruebas debe coincidir con el tipo de clave; el servidor verifica livemode.

La ficha contiene el importe y una referencia real generada por el proveedor. El cliente proporciona un teléfono únicamente si ese método lo requiere y no lo tenía en su cuenta. La firma RSA SHA-256 del cuerpo original se comprueba con el encabezado Digest; después se consulta la orden en Digital FEMSA. Emitir la referencia no cuenta como pagar.

El apartado para efectivo se amplía hasta un máximo de 24 horas, acotado antes del comienzo del evento. La ficha tiene ese mismo vencimiento. No se pueden cancelar silenciosamente reservas con fichas/procesos pendientes aún vigentes desde la pantalla del cliente.

### Cambiar de cuenta o pasar de pruebas a producción

Si una configuración ya tiene operaciones, cambiar el modo o cuenta receptora crea una nueva versión de pasarela. La anterior se deshabilita para operaciones nuevas, pero conserva sus credenciales y URL de Webhook para resolver los pagos pendientes. Introduce credenciales nuevas; no se copian secretos entre entornos. Guarda primero deshabilitada, configura la nueva URL en el proveedor y después habilita.

## Confirmación, saldo y excepciones

- El retorno del navegador no confirma un pago por sí mismo.
- Solo un resultado autenticado y consultado al proveedor genera un movimiento en el saldo.
- Se registra el identificador de transacción con una restricción única para que reintentos y notificaciones repetidas no dupliquen dinero.
- Un pago recibido para una reserva cancelada, pasada o un horario que otra persona ya ocupó se contabiliza y se marca para revisión, sin quitar la reserva de otro cliente.
- Las devoluciones verificadas reducen el importe recibido y dejan una advertencia. Las devoluciones parciales de PayPal requieren su notificación verificada; si falta, debe contrastarse con el panel del proveedor. No se cancela automáticamente el evento al recibir una devolución.
- La conciliación programada recupera notificaciones perdidas. También puedes ejecutarla manualmente:

```bash
docker compose exec app php artisan payments:reconcile --days=30 --limit=100
```

La conciliación consulta pagos; no crea ni captura cargos nuevos. Una creación de checkout con respuesta ambigua queda pendiente de revisión y no se repite automáticamente como otro cobro.

El registro manual de pagos externos sigue disponible para el propietario, con su auditoría. No equivale a una confirmación bancaria automática. No hay una pantalla para emitir devoluciones: se tramitan en el proveedor y se concilian al recibir la notificación.

## Qué se verificó y qué falta configurar

Se comprobaron registro por invitación, rechazo de accesos cruzados, aislamiento de establecimientos, importe calculado por servidor, firmas inválidas, cuenta receptora/moneda incorrectas, duplicados, pagos pendientes y tardíos, devoluciones, referencia OXXO, captura PayPal y conciliación. Las peticiones a los proveedores se simularon; la prueba RSA utiliza claves generadas exclusivamente como fixtures de test, nunca credenciales de comercio.

No se efectuaron transacciones reales, ni pruebas contra cuentas sandbox reales, ni se ejecutaron contenedores Docker/PostgreSQL en esta sesión. La interfaz se compiló y tiene pruebas de renderizado, pero falta una revisión visual completa con la instalación del servidor. Debes configurar dominio HTTPS, proxies, cuentas comerciales y credenciales, registrar Webhooks y completar un ciclo real de prueba por proveedor antes de habilitar producción.

## Fuentes oficiales

- Laravel autenticación: https://laravel.com/docs/12.x/authentication
- PayPal Orders v2: https://developer.paypal.com/api/orders/v2
- PayPal verificación: https://developer.paypal.com/api/webhooks/v1
- Mercado Pago Preferences: https://www.mercadopago.com.mx/developers/es/reference/online-payments/checkout-pro-preferences/create-preference/post
- Mercado Pago notificaciones: https://www.mercadopago.com.mx/developers/es/docs/checkout-pro-preferences/additional-content/notifications/webhooks
- Digital FEMSA cargo único: https://developers.digitalfemsa.io/docs/cargo-unico-efectivo-direct-api
- Digital FEMSA firmas: https://developers.digitalfemsa.io/docs/autenticaci%C3%B3n-webhooks

## Registro propio, Meta y diseño

Consulta [META_DISENO_Y_UBICACION.md](META_DISENO_Y_UBICACION.md) para el registro directo desde Gestión del negocio, la conexión de WhatsApp/Instagram/Facebook, el historial vinculado, la búsqueda de ubicación y el editor visual.

## Revisión de formularios y seguridad

Consulta [AUDITORIA_SEGURIDAD.md](AUDITORIA_SEGURIDAD.md). Compose fija producción sin depuración; las cookies Secure se fuerzan para la URL HTTPS configurada. Los horarios se escriben como HH:MM y día de cierre, con soporte de minutos y compatibilidad con datos antiguos.

## Mapas y correo de confirmación

Consulta [MAPAS_ACTUALIZACION_Y_CORREOS.md](MAPAS_ACTUALIZACION_Y_CORREOS.md). Aplica la nueva migración y reconstruye Nginx; configura el servicio desde Correos y notificaciones de cada local. El envío se realiza después de verificar el pago y confirmar la reserva, desde scheduler.
