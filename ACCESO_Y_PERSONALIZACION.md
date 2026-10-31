> Instalación actual: ejecuta `bash install.sh`. Genera y guarda las claves que faltan en `.env`, conserva las existentes y aplica las migraciones. Consulta `INSTALACION_AUTOMATICA.md`; sustituye los pasos manuales de generación de claves de revisiones anteriores.

# Inicio de sesión, asistente y marca del establecimiento

Actualización del 27 de octubre de 2026. Incluye los WebSockets, correos y ajustes anteriores.

## Qué causaba «Too Many Attempts»

El código anterior usaba `throttle:5,1` en los logins. Contaba también los accesos correctos y podía compartir la bolsa genérica con otras solicitudes del mismo origen. Detrás de un proxy, varios usuarios pueden aparecer con la misma IP. La captura muestra HTTP 429 en `/api/login`, compatible con ese bloqueo; no demuestra por sí sola si hubo dobles clics o intentos de otros usuarios.

Ahora el login utiliza bolsas separadas por portal y por cuenta normalizada/IP. Permite cinco contraseñas incorrectas por minuto en esa combinación; el siguiente intento devuelve 429. También hay un límite independiente de 60 fallos por IP y portal por minuto para contener intentos contra muchas cuentas. Los accesos correctos no suman fallos y limpian la bolsa de esa cuenta. No se eliminó la protección contra fuerza bruta. El correo se busca sin distinguir mayúsculas, con parámetros SQL, conservando la separación entre cuentas de cliente y propietario.

El formulario no envía dos peticiones mientras espera la primera. Si el servidor responde 429, muestra un mensaje en español y el tiempo restante obtenido de `Retry-After`. El botón queda deshabilitado durante la espera. No reintenta contraseñas automáticamente. Los errores de validación no son contraseñas fallidas.

Conserva `TRUSTED_PROXIES` restringido a las IP/CIDR de tus proxies reales; no lo cambies a `*` para resolver un bloqueo. Esta actualización no cambia automáticamente la configuración de Cloudflare ni del proxy de tu servidor. Un ataque distribuido requiere además protección del perímetro.

## Asistente del dueño

Se quitó el asistente del local de la interfaz administrativa. Ese bot conoce precios y servicios del establecimiento para atender a clientes; no tiene un contexto de ayuda del panel. Crear otro bot con acceso a pagos o configuración ampliaría sus permisos sin que fuera necesario para esta función.

Las solicitudes al endpoint de chat de clientes también se rechazan desde el portal del dueño. Se conservan la configuración de proveedores de IA, Meta y la bandeja de conversaciones. La vista previa de cliente permite probar visualmente la ventana del asistente, pero no envía mensajes ni consume APIs.

El dueño puede ocultar el asistente web desde Diseño. La selección se publica con el diseño; también lo retira del selector público de locales y bloquea el endpoint web. Esta opción no suspende las respuestas automáticas de Meta: se configuran por separado en sus canales.

## Diseño e identidad

En Gestión del negocio, elige tu local y entra a Diseño:

- Logo en PNG, JPG o WebP (PNG transparente recomendado), máximo 3 MB y 4096 × 4096 píxeles.
- Icono de pestaña en esos mismos formatos; se recomienda una imagen cuadrada de 256 × 256. No se admiten SVG, HTML ni archivos ICO en esta versión.
- Nombre de marca, eslogan y título de pestaña.
- Seis familias: DM Sans, Playfair Display, Arial/Helvetica, Trebuchet, Georgia y Courier. Las cuatro últimas usan fuentes del equipo con alternativas; DM Sans y Playfair usan el proveedor de fuentes que ya tenía la plataforma, con fuentes de respaldo.
- Texto normal o grande, títulos normales o en negrita, tamaño del logo.
- Portada dividida o apilada, distribución amplia o compacta, colores, botones, bordes, ventanas emergentes y textos de bienvenida/reserva.
- Mostrar u ocultar mapa, comentarios y asistente web.
- Vista previa móvil o de escritorio, guardar borrador y publicar diseño.

Los cambios pertenecen a cada establecimiento. Al visitar su página pública se aplican su marca, logo en el encabezado, contenido del local e icono/título de pestaña. El catálogo común y el panel administrativo conservan la identidad de la plataforma: un propietario no puede cambiar la marca de otros locales.

Los archivos recién subidos quedan disponibles para el dueño, pero no se publican automáticamente. Selecciona el archivo y guarda el borrador o publica. Los archivos del borrador no sustituyen los que ya ven los clientes. El favicon de la vista previa se aplica dentro de su iframe, y al salir de una página de local se restaura el título e icono anteriores.

Hay un límite de 30 archivos de marca por local. En «Administrar archivos anteriores» se pueden eliminar los que no estén en el borrador guardado ni en el diseño publicado. Para retirar uno en uso, quita su selección y publica/guarda el cambio antes de eliminar el archivo. No se permiten URLs arbitrarias para logos ni fuentes o CSS ejecutable.

Al publicar, el cambio utiliza los avisos WebSocket existentes para actualizar los datos públicos. Subir un archivo sin publicarlo no modifica la página del cliente.

## Instalar la actualización

Respalda primero `.env`, PostgreSQL y las fotos. Extrae el ZIP sobre tu proyecto conservando `.env`, `APP_KEY`, el nombre de Compose y los volúmenes. Si la instalación tiene cambios propios, integra el código antes de construir. Conserva las claves Reverb ya generadas; si aún no las configuraste, sigue `WEBSOCKETS.md`.

Desde la carpeta del proyecto:

```bash
docker compose build
docker compose run --rm app php artisan migrate --force
docker compose up -d --force-recreate
docker compose exec app php artisan optimize:clear
docker compose exec app-owner php artisan optimize:clear
docker compose ps
```

La migración nueva crea `design_assets`. No uses `migrate:fresh`, `down -v` ni vuelvas a generar `APP_KEY`. Recarga la página después de instalar. Reverb, realtime-worker y scheduler deben permanecer activos.

## Validación

Resultado: 164 pruebas PHP y 673 aserciones; 32 pruebas React/DOM; compilación TypeScript/Vite correcta.

Consulta `audit/phpunit-results.xml`, `audit/phpunit-latest.txt` y `audit/react-tests.txt` para los resultados de esta entrega. Las pruebas nuevas cubren límites de login, separación de cuentas/portales, reinicio y vencimiento del bloqueo, limitación de fallos contra múltiples cuentas, duplicados del formulario, cuenta regresiva, publicación y acceso a archivos, permisos, rechazo de SVG, preferencias tipográficas e aislamiento del favicon en vista previa.

Se verificó el código y las pruebas locales; no se instaló en tu servidor ni se comprobó visualmente el proxy, Docker/PostgreSQL o un navegador real.
