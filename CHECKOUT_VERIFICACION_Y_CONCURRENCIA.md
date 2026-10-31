# Corrección de checkout y verificación de correo

La actualización permite cambiar entre anticipo y saldo total después de cerrar PayPal, protege los enlaces de recuperación y requiere verificar el correo para reservar, pagar y modificar el negocio. No realiza cobros de prueba en producción.

## Actualización

Respalda la base de datos y conserva el archivo .env y la APP_KEY actual. Sustituye los archivos del proyecto por esta versión y ejecuta el instalador habitual, o reconstruye los contenedores y aplica la migración nueva:

```bash
docker compose up -d --build
docker compose exec -T app php artisan migrate --force
docker compose exec -T app php artisan optimize:clear
docker compose exec -T app-owner php artisan optimize:clear
```

La migración `2026_10_29_000012_checkout_and_email_verification` agrega el propósito del checkout, la fecha de verificación de propietarios y la tabla de enlaces de verificación. No marca automáticamente como verificados los correos existentes. No regeneres APP_KEY.

## Cambiar el importe sin duplicar cobros

- El importe se calcula en el servidor y se compara con el intento vigente. Repetir la misma selección reutiliza la misma orden.
- En PayPal, un intento pendiente que aún no inició una captura puede reemplazarse al cambiar de anticipo a total o viceversa. El anterior queda `superseded` y el servidor rechaza cualquier captura posterior sobre él.
- El botón **Cambiar importe** permite volver a la selección. También puedes cerrar y volver a abrir el checkout. El formulario consulta importes actualizados y vuelve a seleccionar el anticipo si sigue pendiente.
- Si una captura ya comenzó o el resultado es incierto, el sistema conserva el seguimiento de ese intento. Cerrar la ventana de PayPal no demuestra por sí solo que no hubo un pago.
- Las fichas OXXO y los pagos redirigidos de Mercado Pago no se reemplazan con esta opción: podrían seguir siendo pagaderos externamente.
- Preparar pagos tiene un límite de 20 solicitudes por minuto por usuario autenticado. Consultar o ejecutar acciones de pago tiene otro límite por usuario. Los clientes no comparten estas cuotas por usar la misma IP. Un 429 muestra un mensaje en español y una cuenta regresiva en el botón.
- La captura de PayPal se reclama dentro de una transacción con bloqueo de local, reserva e intento. Solicitudes simultáneas no emiten otra captura. Los eventos de pago verificados siguen conciliándose de forma idempotente.

## Correos de verificación y recuperación

La cuenta de correo configurada por local para confirmaciones de pago es independiente del correo global para acceso. Configura el SMTP global en .env en ambos portales:

```dotenv
MAIL_MAILER=smtp
MAIL_HOST=smtp.tu-proveedor.com
MAIL_PORT=587
MAIL_USERNAME=tu-usuario
MAIL_PASSWORD=tu-clave
MAIL_FROM_ADDRESS=acceso@tu-dominio.com
MAIL_FROM_NAME="Tu negocio"
CUSTOMER_URL=https://tu-portal-publico.com
OWNER_URL=https://tu-portal-de-gestion.com
```

Usa el esquema y puerto TLS indicados por tu proveedor en `MAIL_SCHEME` y `MAIL_PORT`. No envíes contraseñas ni APP_KEY a terceros. Después de modificar .env, recrea los contenedores para cargar el entorno nuevo:

```bash
docker compose up -d --force-recreate
docker compose exec -T app php artisan optimize:clear
docker compose exec -T app-owner php artisan optimize:clear
```

**Verificación:** al registrar una cuenta se intenta enviar el enlace. Una franja permite solicitarlo si no llegó. El enlace vence una hora después de su creación, pertenece a una cuenta y portal concretos, requiere pulsar Confirmar mi correo y solo puede consumirse una vez. Reenviarlo durante su vigencia conserva el mismo enlace y su vencimiento. Se limita a un envío por minuto y cinco por hora por cuenta. El token no aparece en respuestas API ni registros; su copia para reenvío se cifra con APP_KEY.

Clientes sin verificar pueden entrar y consultar sus reservas, pero no crear nuevas reservas ni iniciar cobros. Los propietarios sin verificar pueden entrar y leer el panel, pero deben verificar para modificar el negocio. Las cuentas existentes también deben verificar. La desactivación de un propietario invalida su acceso durante las solicitudes.

**Recuperación:** el primer enlace permanece válido durante 30 minutos. Solicitudes posteriores durante ese periodo no lo reemplazan, no extienden su vigencia y no envían otro correo. Al vencer se puede solicitar uno nuevo. Se conservan las respuestas genéricas para correos desconocidos, límites por IP/correo, almacenamiento mediante hash, uso único e invalidación de sesiones al cambiar contraseña.

## Prueba concurrente con PostgreSQL

El archivo `tests/postgres-concurrency.php` inicia ocho procesos PHP independientes con una barrera de salida y conexiones distintas a PostgreSQL. Ejecuta siete escenarios:

1. Ocho clientes reservan el mismo horario: exactamente un apartado y siete conflictos controlados.
2. Ocho clientes reservan fechas distintas: ocho apartados válidos.
3. Ocho solicitudes preparan el pago de la misma reserva: un intento y una creación externa simulada.
4. Ocho solicitudes aprueban la misma orden: una captura simulada y un abono.
5. Ocho notificaciones del mismo pago: ningún asiento duplicado.
6. Ocho clientes pagan reservas distintas: ocho abonos únicos con sus importes correctos.
7. Cambiar el importe y aprobar el intento anterior simultáneamente: o se reemplaza antes de cobrar, o el cobro iniciado impide reemplazarlo.

Las pasarelas se simulan y se bloquean llamadas HTTP no previstas. Esta prueba verifica bloqueos y contabilidad de la aplicación; no prueba latencia, límites o fallas reales de PayPal. No constituye una prueba de capacidad de producción.

Para reproducir con Docker en un entorno aislado:

```bash
docker compose -f compose.concurrency.yaml up --build --abort-on-container-exit --exit-code-from concurrency
docker compose -f compose.concurrency.yaml down
```

Este archivo Compose tiene nombre propio, base temporal en memoria, sin puertos publicados, sin .env ni volúmenes de producción. Las credenciales que contiene son exclusivamente locales para pruebas. Requiere recursos de memoria suficientes para PostgreSQL, ocho procesos PHP y la compilación.

Para ejecutarla directamente, prepara una base dedicada cuyo nombre termine en `_concurrency_test`, configura `DB_CONNECTION=pgsql`, sus credenciales y `CONCURRENCY_TEST=1`, y ejecuta `php tests/postgres-concurrency.php`. Se requiere PDO PostgreSQL y pcntl. La prueba crea un esquema aleatorio y elimina únicamente ese esquema al finalizar; rechaza bases con otro sufijo. No uses la base de producción.

La conexión PostgreSQL de la aplicación fija su zona horaria de sesión en UTC. Las pruebas detectaron que, con un servidor cuya zona predeterminada era distinta, un apartado nuevo podía interpretarse como vencido al guardar timestamps sin desplazamiento explícito. Los horarios mostrados al cliente siguen utilizando la zona del local. No se alteran retroactivamente fechas existentes: revisa cualquier registro previo generado con una configuración horaria incorrecta.

## Validación de esta entrega

El 29 de octubre de 2026 se ejecutaron 266 pruebas PHP con 1224 aserciones, 69 pruebas de interfaz y siete escenarios concurrentes con PostgreSQL 16.15. Todos pasaron. TypeScript y la compilación de producción también pasaron. Las pruebas de correo interceptan la entrega; las de pago usan proveedores simulados. La configuración SMTP y una transacción Sandbox completa deben comprobarse en el despliegue.
