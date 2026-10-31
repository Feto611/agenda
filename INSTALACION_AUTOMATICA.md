# Instalación y actualización con claves automáticas

Desde esta revisión ejecuta el instalador, en vez de generar claves a mano:

```bash
cd ~/agendavirtual/encuentro
bash install.sh
```

Se necesita Docker con el complemento Docker Compose y `flock` (incluido en util-linux de Debian). No necesitas PHP instalado en el host: si no hay PHP 8.3 o superior, el instalador usa temporalmente la imagen oficial `php:8.3-cli-alpine` para preparar la configuración.

## Qué hace

1. Crea `.env` a partir de `.env.example` si todavía no existe.
2. Genera `APP_KEY`, `REVERB_APP_KEY` y `REVERB_APP_SECRET` solamente si faltan o están vacías. Usa aleatoriedad criptográfica: 32 bytes para Laravel, 16 bytes representados en hexadecimal para la clave pública Reverb y 32 bytes en hexadecimal para su secreto. Cada valor es independiente.
3. Guarda la configuración de forma atómica y con permisos 0600. No muestra los valores en consola. En una instalación nueva también genera la contraseña de PostgreSQL y establece producción sin debug. En actualizaciones conserva la contraseña de base existente.
4. Construye las imágenes, arranca la base y espera a que esté lista, aplica las migraciones, recrea servicios y limpia las cachés de configuración de ambos portales.
5. Muestra el estado de los servicios. Si falla un paso, se detiene. No borra volúmenes ni ejecuta `migrate:fresh`.

Las claves se generan **en el servidor al instalar**, antes de que Compose lea `.env`. No se generan durante `docker build`: las imágenes no deben llevar claves compartidas. Un `docker compose build` aislado no escribe tu `.env`; el punto de entrada para la instalación automática es `bash install.sh`.

Las aplicaciones, Reverb y los workers reciben las mismas claves a través de `.env`. El instalador evita que variables de clave/base exportadas en la terminal sustituyan algunos de esos valores solo en Compose. No se monta `.env` en Nginx ni se envía el secreto al navegador.

## Revisar dominios antes de instalar

Para preparar las claves sin construir ni arrancar servicios:

```bash
bash install.sh --prepare-only
nano .env
bash install.sh
```

Configura `APP_URL` y `CUSTOMER_URL` con tu URL pública real, por ejemplo `https://reservas.tu-dominio.com`, y `OWNER_URL` con el acceso real a tu panel privado. No se adivina tu dominio durante la instalación. Conserva el puerto del dueño restringido a localhost o a tu red privada.

Si tienes PHP compatible y solo quieres preparar `.env` sin Docker, también puedes ejecutar `php scripts/prepare-env.php`.

## Actualizar sin perder acceso a los datos

Respalda `.env`, PostgreSQL y las fotos antes de extraer una nueva versión. Conserva el nombre del proyecto Compose y sus volúmenes. Extrae el ZIP sin sobrescribir tu `.env` y ejecuta `bash install.sh`.

Las claves válidas existentes se conservan. Si el instalador encuentra una `APP_KEY` no vacía pero inválida, se detiene sin cambiar el archivo: restaura la clave original desde tu respaldo. No soluciona la pérdida de una clave antigua; generar otra impediría descifrar credenciales previamente almacenadas. No borres `APP_KEY` ni sus valores Reverb para volver a instalar.

Se rechazan variables de claves duplicadas y archivos `.env` que sean enlaces simbólicos. Dos ejecuciones concurrentes del instalador en la misma carpeta no lanzan migraciones simultáneas.

La instalación no configura automáticamente Cloudflare, Nginx Proxy Manager, DNS, TLS ni cuentas de pagos o correo. Para WebSockets conserva el reenvío de `/app/` y habilita soporte WebSocket en el proxy. No necesitas otro puerto público. Consulta `WEBSOCKETS.md`.

## Error de la captura: 422

La captura muestra `POST /api/login` con **422**, no 421. El 422 corresponde a datos que no pasan validación, incluido un correo o contraseña incorrectos. El navegador conserva la entrada de una solicitud fallida en la consola aunque después el usuario haya iniciado sesión; la captura muestra una sesión abierta, pero no permite conocer el motivo de la petición anterior sin su respuesta de Red/Network.

La interfaz ahora muestra el motivo del rechazo, en español, marca el campo indicado por el servidor y lleva el foco a él. No reenvía automáticamente las credenciales. Las cuentas del cliente y del dueño siguen separadas; crea o usa la cuenta del portal correspondiente. No se devuelve éxito a una contraseña incorrecta para ocultar la entrada de consola.

Los bloqueos por intentos fallidos siguen siendo 429 y muestran cuánto falta para reintentar. Son distintos del 422. Si aparece realmente un 421 de tu proxy, se necesita su respuesta y configuración de host/TLS para diagnosticarlo: ese código no aparece en esta captura.

El aviso «Conectando actualizaciones…» pasa a «Actualización de respaldo» si el transporte no está disponible, falla una suscripción o no se completa en unos 15 segundos. Al reconectar y suscribirse correctamente vuelve a «En vivo». Los avisos tardíos de una conexión anterior no alteran el estado de una sesión nueva. El respaldo de datos sigue consultando cada 60 segundos solo si el canal no está listo; no hay sondeo periódico con el canal conectado.

## Verificaciones

Las pruebas del preparador cubren generación, independencia de claves, permisos, idempotencia, actualización con claves parciales, valores vacíos entre comillas, comentarios, rechazo de claves inválidas/duplicadas y enlaces simbólicos. Hay pruebas de flujo del instalador con comandos Docker simulados: primera instalación, actualización, preparación sin PHP del host y detención ante fallo de migración. Estas últimas no arrancan contenedores reales.

Resultados y límites: `audit/installer-php-native.txt`, `audit/installer-flow.txt`, `audit/phpunit-results.xml`, `audit/react-tests.txt` y `audit/build-latest.txt`. No se ejecutó Docker/PostgreSQL ni se comprobó el proxy de tu servidor o una sesión visual en un navegador real.

Validación de esta entrega: 171 pruebas PHP (698 aserciones), 35 pruebas React/DOM, 7 pruebas del preparador también en PHP 8.3 nativo y 4 pruebas de flujo con Docker simulado. Compilación TypeScript/Vite correcta.
