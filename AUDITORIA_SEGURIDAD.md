> Actualización de acceso y marca: consulta `ACCESO_Y_PERSONALIZACION.md` para el nuevo control de intentos, asistente exclusivo de clientes y logos/favicon/tipografías. Las cifras de pruebas en secciones históricas corresponden a sus revisiones.

> Actualización vigente: consulta [WEBSOCKETS.md](WEBSOCKETS.md). Las actualizaciones de interfaz usan Reverb/Echo; las consultas periódicas de 3/5/10/15 segundos descritas en versiones anteriores fueron reemplazadas.

# Auditoría de seguridad y corrección de formularios

Fecha: 27 de octubre de 2026. Aplicación: Encuentro, Laravel + React.

## Resultado y alcance

Se revisó el código entregado y se ejecutaron pruebas locales con peticiones HTTP de Laravel, base SQLite, renderizado React y simulación DOM con JSDOM. **133 pruebas PHP y 476 aserciones pasaron**, incluidas **23 pruebas nuevas de auditoría** y 8 de horarios. También pasaron **24 pruebas React/DOM** y la compilación TypeScript/Vite.

No se atacó tu dominio, servidor ni cuentas reales. No se usaron recolectores externos de cookies. Los usuarios, contraseñas, tokens y cargas de ataque de las pruebas son sintéticos. Este informe no certifica que un despliegue esté libre de vulnerabilidades.

## Correcciones solicitadas

- Apertura y cierre se escriben como `HH:MM`, en formato de 24 horas: `09:30`, `18:00`, `02:15`.
- **Día del cierre** distingue “El mismo día” y “Al día siguiente”; ya no necesitas escribir 24, 25 o 26 como si fueran horas del reloj.
- Borrar y volver a escribir la hora no cambia la selección de día siguiente.
- Los horarios ahora conservan minutos reales en configuración, disponibilidad, cotización y chatbot. El selector de inicio ofrece opciones cada 30 minutos a partir de la apertura más la preparación; no altera los precios ni la duración de renta en horas enteras.
- Los campos numéricos mantienen un borrador de texto: borrar todo deja vacío, no `0`. Se conserva el punto decimal mientras escribes; la coma decimal se normaliza a punto.
- Los mínimos, máximos, enteros e incrementos se validan al intentar enviar el formulario, además de la validación del servidor. Un campo obligatorio vacío sigue siendo inválido: no se sustituye silenciosamente por cero.
- Las reservas y horarios antiguos se conservan. Si no contienen los nuevos campos de minutos, se interpretan con minuto `00`.

## Hallazgos y medidas

Los niveles describen el riesgo condicionado a la configuración o al dato de entrada; no se afirma que se haya explotado tu servidor.

| ID | Clasificación previa | Observación | Corrección y estado |
| --- | --- | --- | --- |
| AUD-01 | Alto, si se desplegaba con depuración activa | Compose heredaba APP_ENV/APP_DEBUG del `.env`, cuyo ejemplo sirve para desarrollo. | app, app-owner y scheduler fijan `APP_ENV=production`, `APP_DEBUG=false`. Comprobado en la configuración Compose. |
| AUD-02 | Refuerzo frente a XSS | No había CSP en la aplicación. | CSP en entornos distintos de local, sin scripts inline no autorizados ni eval, con nonce por respuesta, con objetos deshabilitados y marcos limitados al mismo origen. Se mantienen estilos inline porque React/Leaflet y el editor los usan. Cabeceras verificadas. |
| AUD-03 | Refuerzo de confidencialidad | Las respuestas de API privadas no imponían explícitamente `no-store`. | Todas las respuestas API añaden `Cache-Control: no-store, private` y `Pragma: no-cache`. Comprobado con /me y reservas. |
| AUD-04 | Medio, ante una URL inesperada del proveedor | La expresión de checkout de PayPal tenía un punto sin escapar y admitía un dominio parecido en una respuesta simulada. | Análisis de URL con HTTPS y lista exacta de hosts PayPal; se rechaza el caso `paypalXcom`. Prueba de regresión. |
| AUD-05 | Refuerzo de sesión, dependiente del despliegue | Secure/HttpOnly podían quedar sujetos a valores de entorno inadecuados. | HttpOnly obligatorio para la cookie de sesión; Secure se fuerza si la URL configurada del portal es HTTPS. SameSite=Lax y cookies independientes se conservan. |
| AUD-06 | Refuerzo de navegación y transporte | Política de referencia y protección HTTPS mejorables. | Referrer-Policy=strict-origin-when-cross-origin, nosniff, SAMEORIGIN, política de permisos y HSTS cuando Laravel reconoce HTTPS; Nginx oculta X-Powered-By. |

## Pruebas de auditoría

| Prueba | Qué se intentó | Resultado observado |
| --- | --- | --- |
| XSS almacenado | Nombres, direcciones y comentarios con `<script>` y atributos `onerror` que intentan leer document.cookie. | React los mostró como texto. No aparecieron nodos script ni atributos onerror en el DOM de prueba. |
| JavaScript en enlaces | Guardar `javascript:alert(document.cookie)` como red social o fuente de comentario. | Validación HTTP 422. |
| Archivo ejecutable | Subir un SVG con onload de JavaScript como fotografía. | HTTP 422; no se guardó la foto. |
| Política CSP | Comprobar script-src, object-src, frame-ancestors y ausencia de unsafe-eval/scripts inline. | Cabeceras presentes y restricciones esperadas. Su ejecución real en Chrome/Firefox queda pendiente. |
| Lectura de cookies | Leer document.cookie en una simulación con CookieJar, cookie de sesión Secure/HttpOnly y token CSRF separado. | El identificador de sesión no era visible a JavaScript; el token CSRF sí, como permite Laravel por diseño. También se comprobaron los atributos de la cookie emitida por Laravel. |
| Fijación de sesión | Comparar ID de sesión y token CSRF antes y después de login/logout. | Cambian al iniciar y cerrar sesión. |
| Reutilización tras logout | Reenviar la cookie cifrada de una sesión real de pruebas, usando almacenamiento database. | Era válida antes del logout y devolvió 401 después. |
| Cookie falsificada | Presentar un valor cifrado falso como cookie de sesión. | No autenticó; HTTP 401. |
| Cruce de portales | Copiar la cookie del cliente bajo el nombre de cookie del propietario. | No autenticó en el panel del dueño; HTTP 401. |
| CSRF | POST sin token, token incorrecto y alta de propietario con Origin ajeno sin token. | HTTP 419 y ningún propietario creado. Con token válido se alcanzó la validación de credenciales. |
| SQL injection | Credenciales y rutas con comillas, OR 1=1 y comentarios SQL. | Sin autenticación ni lectura de registros; validación 422 o ruta 404. |
| Asignación masiva | Enviar role/account_type/activated o un owner_account_id ajeno. | No escaló privilegios ni cambió el propietario del establecimiento. |
| Acceso horizontal | Consultar/modificar locales, reservas, pagos y conversaciones de otra cuenta. | Pruebas de aislamiento existentes y nuevas pasaron con rechazo de acceso. |
| SSRF de IA | URLs de localhost, metadata de nube, dominios parecidos, userinfo y fragmentos. | No se emitió ninguna petición hacia esos destinos; respuesta de respaldo por reglas. |
| Inyección de instrucciones | Mensaje de usuario que pide ignorar reglas y exfiltrar cookies. | El texto de ataque no se reenvió al modelo; solo se enviaron hechos seleccionados del local. No demuestra que cualquier respuesta futura de un modelo sea correcta. |
| Webhooks falsos | Notificaciones Meta y de pago sin firma válida. | HTTP 401. Las pruebas previas también cubren firmas válidas, repetición, importes y destinatarios incorrectos. |
| Fuerza bruta | Más de cinco intentos de login en el minuto de prueba. | HTTP 429 en el exceso de intentos. |
| Caché y errores | Leer datos privados y provocar una ruta inexistente con debug=false. | No-store en API y errores sin trazas ni nombres de variables secretas. |

Para evitar un falso positivo, las pruebas CSRF activan una subclase que **no omite la comprobación al ejecutar tests**, ya que Laravel normalmente la omite en ese entorno. El código de esta subclase está exclusivamente en tests/Support; la aplicación utiliza el middleware habitual de Laravel.

## Dependencias

- `npm audit --json`: **0 avisos conocidos** para el árbol instalado, incluidas dependencias de desarrollo. Instantánea: `audit/npm-audit.json`.
- Se contrastaron **106 paquetes PHP fijados en composer.lock**, incluidos los de desarrollo, con la API oficial de avisos de Packagist: **0 coincidencias de versiones afectadas**. Instantánea: `audit/php-dependency-audit.json`.
- La comprobación PHP utilizó las reglas de versión de Composer/Semver. El comando Composer audit del runtime tuvo un timeout de red; se consultó la API directamente desde el entorno anfitrión y se compararon sus restricciones con el lock. No se presenta ese comando fallido como un audit exitoso.
- El análisis de avisos no identifica vulnerabilidades desconocidas ni equivale a una revisión manual completa de cada dependencia. No se evaluaron licencias, abandono de paquetes o vulnerabilidades de imágenes Docker/SO.

## Evidencia reproducible

Archivos entregados:

- `tests/Feature/SecurityAuditTest.php`: las 23 pruebas de seguridad de esta revisión.
- `tests/Feature/ClockTest.php`: validación de minutos, medianoche y compatibilidad.
- `tests/forms-dom.test.tsx`: edición real de componentes en DOM simulado, XSS de texto y simulación de lectura de cookies.
- `audit/phpunit-results.xml`: resultados de todas las pruebas PHP.
- `audit/react-tests.txt`: resultados React/DOM.
- `audit/npm-audit.json` y `audit/php-dependency-audit.json`: instantáneas de dependencias.

Con PHP/Composer y Node instalados para desarrollo:

```bash
composer install
npm ci
php vendor/bin/phpunit --log-junit audit/phpunit-results.xml
npm run test:ui
npm run build
npm audit
composer audit --locked
```

Con Docker, las pruebas PHP necesitan dependencias de desarrollo; la imagen de producción usa `composer install --no-dev`, por lo que no contiene PHPUnit. No instales dependencias de test sobre el contenedor que está atendiendo clientes; usa un entorno de desarrollo o pruebas separado.

## Actualizar tu instalación

Respalda `.env`, PostgreSQL y los archivos de fotos siguiendo `ACCESOS_Y_PAGOS.md`; después extrae el ZIP actualizado conservando `.env` y APP_KEY. No borres volúmenes ni regeneres APP_KEY.

```bash
cd ~/agendavirtual/encuentro
docker compose build
docker compose run --rm app php artisan migrate --force
docker compose up -d
docker compose exec app php artisan optimize:clear
docker compose exec app-owner php artisan optimize:clear
docker compose exec app php artisan up
```

Esta revisión de horarios no requiere una tabla nueva: los minutos se almacenan dentro de la configuración JSON del local. El comando migrate también aplica cualquier migración anterior pendiente. Los cambios de Nginx/Compose requieren reconstruir y recrear servicios; no basta con sustituir el JavaScript. Recarga el navegador después de actualizar.

Configura CUSTOMER_URL/APP_URL con el HTTPS real del portal público. El panel de dueño puede conservar HTTP en localhost a través de un túnel SSH; si lo expones con HTTPS, configura OWNER_URL y OWNER_SECURE_COOKIE=true. Declara únicamente las IP/CIDR reales del proxy en TRUSTED_PROXIES. Laravel necesita reconocer HTTPS para emitir HSTS; la cookie Secure también se fuerza por la URL configurada del portal.

## Límites y verificaciones pendientes

- No se ha ejecutado un pentest contra tu dominio, un escáner DAST/ZAP en producción ni una prueba visual de esta revisión en un navegador real.
- Las pruebas PHP se ejecutaron con PHP.wasm 8.5 y SQLite. Se deben comprobar también PHP 8.3, Docker/Nginx/PostgreSQL, concurrencia, proxy y TLS en tu instalación.
- HttpOnly protege frente a lectura por scripts de página. No impide que una extensión con permiso para leer cookies, malware o quien ya tenga una cookie válida robe/reutilice una sesión todavía activa. No se probó ni instaló una extensión llamada CookieStalker.
- No hay MFA ni recuperación/verificación de correo implementados. La separación de roles y el registro privado por portal siguen aplicándose en servidor.
- Se deben verificar en el despliegue los atributos de ambas cookies, CSP/HSTS, caché del CDN/proxy, restricciones de acceso al panel de dueño, respaldos y credenciales de Meta/pagos. Las credenciales reales y las cuentas de proveedores no se probaron.
- No se evaluaron red interna, sistema operativo, imágenes Docker, denegación de servicio, archivos adjuntos históricos ni todas las combinaciones de navegador/proveedor de IA.

Referencias utilizadas:

- OWASP Session Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- OWASP Laravel Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Laravel_Cheat_Sheet.html
- Laravel 12, implementación CSRF: https://api.laravel.com/docs/12.x/Illuminate/Foundation/Http/Middleware/VerifyCsrfToken.html
- Packagist Security Advisories API: https://packagist.org/api/security-advisories/

## Revisión posterior: compatibilidad del mapa y correo

La política no-referrer de la revisión anterior impedía el Referer exigido por OpenStreetMap y se corrigió a strict-origin-when-cross-origin, también en Leaflet/Nginx. La CSP utiliza nonce y conserva el bloqueo de scripts inline no autorizados. Se añadieron 16 pruebas de correo/revisión pública, filtro de letras y máscara de hora. Consulta MAPAS_ACTUALIZACION_Y_CORREOS.md para la configuración y límites actuales. No se han probado credenciales ni redes reales del proveedor de correo.
