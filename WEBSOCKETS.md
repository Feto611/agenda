> Instalación actual: ejecuta `bash install.sh`. Genera y guarda las claves que faltan en `.env`, conserva las existentes y aplica las migraciones. Consulta `INSTALACION_AUTOMATICA.md`; sustituye los pasos manuales de generación de claves de revisiones anteriores.

# Actualizaciones con WebSockets: Laravel Reverb + Echo

Esta versión reemplaza el sondeo de 3/5/10/15 segundos de catálogo, página del local, disponibilidad, agenda del dueño, reservas del cliente, estado del pago y bandeja de correos.

## Comportamiento

- Una conexión WebSocket compartida por pestaña, con Laravel Echo y Pusher JS sobre Laravel Reverb.
- El catálogo recibe invalidaciones públicas. Cada local publicado tiene su canal de datos/disponibilidad.
- El dueño y el cliente tienen canales privados distintos, autorizados por sus cuentas y guards independientes.
- Al recibir un evento, la pantalla consulta su API autorizada para obtener el estado vigente. El evento no lleva nombres, correos, importes, secretos ni datos de reservas.
- Al suscribirse o volver a suscribirse, y al recuperar el foco/visibilidad, se consulta el estado actual. Así se recuperan cambios perdidos durante una desconexión.
- **Con el canal conectado y suscrito no hay consultas periódicas.** Si no se puede mantener la suscripción, se utiliza una consulta de respaldo cada 60 segundos mientras la pestaña está visible.
- El indicador del encabezado muestra En vivo, Conectando actualizaciones o Actualización de respaldo. La cotización y disponibilidad siguen validándose al apartar; una conexión abierta no constituye autorización para cobrar ni reservar.

Los formularios del dueño que aún no se guardan conservan sus cambios. Los cambios de datos publicados invalidan la cotización mostrada y cierran una confirmación abierta para que el cliente revise la tarifa vigente.

## Qué dispara las actualizaciones

Los observadores de modelos guardan invalidaciones en `realtime_outbox`: establecimiento, fotos, comentarios, reservas, movimientos de pago, checkout y estados de correo. En las transacciones de reservas/pagos, esos registros se confirman o revierten junto con la operación.

El proceso `realtime-worker` recoge las invalidaciones aproximadamente cada 250 ms, agrupa las del mismo tipo y las publica en Reverb. Esa es una consulta interna del servidor, no una consulta periódica de cada navegador. Las entregas pueden repetirse tras un reinicio; la interfaz solo vuelve a consultar la API, por lo que no genera otra reserva, cargo o correo.

Si Reverb no responde, el pago o cambio de datos no depende de la conexión al servidor WebSocket: queda una invalidación pendiente y se reintenta. Se recuperan registros que quedaron enviándose tras un reinicio. La cola de invalidaciones se limpia tras dos días; la recuperación de una pantalla desconectada se basa en consultar el estado actual, no en reproducir todos los eventos históricos. No se borra el historial financiero.

El worker también detecta el vencimiento de apartados y avisa para que el calendario libere la fecha. No cambia el estado comercial de la reserva ni su política de pagos tardíos. Esto evita depender de un temporizador periódico del navegador para los vencimientos.

## Seguridad y red

Canales:

| Canal | Acceso | Evento |
| --- | --- | --- |
| catalogue | Público | Invalidación del catálogo |
| venue.ID | Público para los datos de un local ya publicado | Datos/disponibilidad; solo tipo y versión |
| private-owner.ID | Cuenta de propietario de ese ID | Invalidación de sus recursos |
| private-customer.ID | Cuenta de cliente de ese ID | Invalidación de sus reservas y pagos |

Los borradores no emiten avisos públicos. Al despublicar un local se avisa al canal que antes era público para que la página deje de permitir reservar. Los avisos públicos de una reserva nunca incluyen sus datos privados.

La autorización se realiza por POST a `/api/realtime/auth`, con sesión del portal correcto y CSRF. No basta con cambiar el ID del canal en JavaScript. La respuesta firmada se vincula al socket solicitado. Al cerrar sesión, el cliente desconecta su socket, descarta los callbacks anteriores y deja de usar los canales privados. Las APIs vuelven a comprobar permisos en cada lectura, incluso si un socket antiguo conserva una suscripción.

La clave pública de Reverb aparece en `/api/me`; es normal. **El secreto nunca se entrega al navegador.** No lo pongas en una variable VITE ni lo publiques. En producción la aplicación exige claves distintas, una pública de al menos 16 caracteres y un secreto de al menos 32.

Reverb acepta los hosts de CUSTOMER_URL y OWNER_URL por defecto. Puedes definir REVERB_ALLOWED_ORIGINS como lista exacta de hosts separados por comas, sin esquema ni puerto. No uses `*`. Los mensajes de clientes/whispers están deshabilitados: los navegadores no publican cambios financieros por el socket.

Nginx de ambos portales reenvía únicamente `/app/` para la conexión WebSocket. `/apps/`, la API interna de publicación de Reverb, devuelve 404 desde esos proxies. Reverb no publica un puerto en el host Docker. El servidor Laravel/worker publica por la red interna de Docker con firma.

La conexión usa el mismo host y puerto que el portal del navegador: `wss://` en HTTPS, `ws://` en HTTP local por SSH. CSP permite únicamente el origen WebSocket del portal, además de sus restricciones existentes. No se necesita abrir un nuevo puerto público.

## Actualizar tu instalación

### 1. Respaldo y extracción

Sigue el respaldo de `.env`, PostgreSQL y fotos de ACCESOS_Y_PAGOS.md. Extrae el ZIP nuevo conservando `.env`, APP_KEY, nombre de Compose y volúmenes. No uses down -v, migrate:fresh ni regeneres APP_KEY.

### 2. Claves Reverb

Antes de ejecutar Compose con esta versión, agrega claves propias a `.env`. Puedes generar dos valores independientes en el host Debian:

```bash
openssl rand -hex 16
openssl rand -hex 32
```

El primero es para la clave pública y el segundo para el secreto. Copia los resultados, no los comandos, en estas variables:

```dotenv
REALTIME_ENABLED=true
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=encuentro
REVERB_APP_KEY=TU_PRIMER_VALOR_GENERADO
REVERB_APP_SECRET=TU_SEGUNDO_VALOR_GENERADO
REVERB_HOST=reverb
REVERB_PORT=8080
REVERB_SCHEME=http
```

No uses literalmente los textos de ejemplo ni uses el mismo valor para ambas claves. Compose comprueba que no estén vacías y la aplicación comprueba su longitud en producción. No hay claves reales predefinidas en el ZIP.

CUSTOMER_URL y OWNER_URL deben seguir apuntando a los portales reales. REVERB_HOST/PORT/SCHEME de arriba describen la conexión interna del servidor a Reverb: siguen siendo HTTP dentro de Docker aunque el navegador use WSS por HTTPS.

### 3. Construir, migrar y arrancar

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

Se añade `2026_10_27_000006_realtime.php`, con la cola y la marca/índice de vencimiento de apartados. Ahora hay ocho servicios: app, web, app-owner, web-owner, db, scheduler, reverb y realtime-worker.

Reverb y realtime-worker deben quedar activos. Scheduler sigue gestionando correos, Meta y conciliación. No necesitas un queue:work adicional para estas invalidaciones. Reverb y su worker se reinician con `restart: unless-stopped`.

Para verificar procesos y registros:

```bash
docker compose logs --tail=80 reverb realtime-worker
```

Si cambias claves, orígenes o configuración, recrea los servicios correspondientes, reinicia web/web-owner y recarga el navegador. No basta con cambiar variables del frontend: la configuración es de servidor y llega por `/api/me`.

### 4. Proxy inverso, Cloudflare y panel privado

- Si usas Nginx Proxy Manager, habilita soporte WebSocket en el host proxy que apunta al puerto 8080 del portal público. Debe conservar Upgrade/Connection y permitir `/app/`.
- Si usas Cloudflare Tunnel u otro proxy, conserva el mismo destino web y permite el upgrade WebSocket; no publiques directamente el puerto interno de Reverb.
- El dueño puede seguir usando el túnel SSH al puerto 8081. Nginx de ese portal también reenvía `/app/`; no necesitas otro túnel para Reverb.
- Conserva TRUSTED_PROXIES restringido a las IP/CIDR reales de tu proxy. No guardes respuestas de `/api/*` en la caché del CDN.
- Comprueba en las herramientas de red del navegador una conexión WebSocket con estado 101 a `/app/CLAVE_PUBLICA`. La respuesta del endpoint de autorización privado no debe compartirse ni guardarse como caché pública.

## Comprobación funcional

1. Abre el catálogo o un local en un navegador de cliente y su configuración en el panel de dueño.
2. Guarda una nueva tarifa o nombre. La pantalla del cliente debe recibir el aviso y volver a consultar los datos sin esperar tres segundos.
3. Crea un apartado desde otra cuenta. El calendario y la agenda del dueño deben actualizarse. Espera su vencimiento para comprobar la liberación sin recargar.
4. Confirma un pago de prueba verificado: actualiza el estado de compra, la agenda y las reservas del cliente. El correo continúa gestionándose por su cola separada.
5. Interrumpe la conexión y restáurala: al volver a suscribirse se deben recuperar los datos actuales. Durante la caída funciona el respaldo de 60 segundos.
6. Comprueba que otra cuenta no pueda autorizar los canales privados de ese cliente/dueño.

La latencia depende de red, procesamiento y disponibilidad de la API; no se promete un tiempo exacto de entrega. No hay un historial de notificaciones visibles para el usuario, solo invalidaciones para refrescar los recursos actuales.

## Pruebas realizadas

- Suite completa PHP con SQLite: 148 pruebas y 516 aserciones.
- React/DOM: 27 pruebas, incluidas ausencia de sondeo con canal conectado, eventos, reconexión, foco, canal compartido y descarte de callbacks al cerrar sesión.
- Prueba de integración con **un servidor Laravel Reverb real**, PHP 8.3 y clientes WebSocket de Node sobre loopback: handshake, publicación firmada desde Laravel, recepción pública, aislamiento privado, firma privada incorrecta, origen ajeno, publicador sin firma y payload sin datos personales.
- Compilación TypeScript/Vite y auditorías de dependencias npm/Composer.

Evidencia: `audit/phpunit-results.xml`, `audit/react-tests.txt`, `audit/realtime-integration.txt`, `audit/npm-audit.json`, `audit/composer-audit.json`.

Para repetir la prueba de protocolo en un entorno de desarrollo con PHP CLI y Node:

```bash
npm ci
composer install
npm run test:realtime
```

TEST_PHP_BIN permite indicar otro ejecutable PHP. La prueba inicia y detiene un Reverb local temporal, usa solo claves sintéticas, no crea reservas ni envía mensajes a clientes. No requiere credenciales comerciales.

No se desplegó ni verificó el proxy/Cloudflare real de tu servidor. Tampoco se hizo una prueba visual en navegador, una prueba de carga o una prueba con PostgreSQL/Docker. La suite completa usa PHP.wasm/SQLite; las pruebas nuevas de autorización y el protocolo Reverb se comprobaron también con PHP 8.3 nativo. Para más de una instancia Reverb sería necesario configurar escalado y transporte compartido, fuera de esta entrega.

Referencias oficiales:
- https://reverb.laravel.com/
- https://laravel.com/docs/12.x/reverb
- https://laravel.com/docs/12.x/broadcasting
- https://api.laravel.com/docs/12.x/Illuminate/Contracts/Broadcasting/Broadcaster.html
