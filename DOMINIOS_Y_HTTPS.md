# Páginas independientes y HTTPS

Esta versión distingue el catálogo compartido de las páginas con dominio propio. El catálogo usa nombre, logo e icono generales; cada local conserva su marca dentro de la ficha. Una página independiente utiliza el nombre, logo, icono y título del negocio y solo muestra ese establecimiento.

La cuenta del cliente, verificación de correo, recuperación de contraseña, creación de reservas, pagos y notificaciones de pasarelas permanecen en los portales centrales. Al continuar desde un dominio propio se trasladan fecha, horario, invitados y extras al portal seguro; el servidor vuelve a cotizar y exige aceptar la política. No se comparte una sesión entre dominios de distintos propietarios. Esta entrega ofrece páginas de presentación y cotización independientes con reserva centralizada, no un checkout ni un acceso completamente independientes o de marca blanca.

## Actualizar el proyecto

Conserva .env, APP_KEY y los volúmenes. Respalda la base antes de sustituir los archivos y ejecutar:

```bash
cd ~/agendavirtual/encuentro
docker compose up -d --build
docker compose exec -T app php artisan migrate --force
docker compose exec -T app php artisan optimize:clear
docker compose exec -T app-owner php artisan optimize:clear
```

Se agrega la migración `2026_10_30_000014_venue_domains`. La reconstrucción instala cURL en PHP para comprobar HTTPS con validación de certificado y destino público fijado. Las configuraciones de correo, pagos y reservas existentes se conservan. No regeneres APP_KEY.

## Configuración del panel

Abre **Dominio propio y HTTPS** en Gestión del negocio.

1. El administrador con permiso `platform_admin` habilita la función general. Puede seleccionar y administrar locales de otros dueños. El propietario ordinario solo puede configurar su propio local.
2. Guarda el nombre exacto del dominio, por ejemplo `jardinmagnolia.com`. No incluyas protocolo, rutas, puertos ni comodines. `www.jardinmagnolia.com` sería otro nombre; esta versión admite un nombre por local, no alias automáticos. El dominio no puede estar asignado a otro local ni coincidir con los portales centrales.
3. En el DNS crea el TXT indicado por el panel: nombre completo `_encuentro.jardinmagnolia.com`, valor `encuentro-verification=...`. El panel muestra el valor único de ese local. Si tu proveedor agrega automáticamente la zona, escribe solo `_encuentro` en el campo de nombre. Conserva el TXT mientras uses la página.
4. Pulsa **Verificar DNS**. Después configura el dominio y HTTPS en el proxy mediante una de las opciones siguientes.
5. Pulsa **Comprobar HTTPS**. La aplicación exige un certificado válido y que el dominio llegue a su ruta de comprobación. No sigue redirecciones ni permite direcciones de red privadas.
6. El administrador general activa la página, con el local ya publicado. DNS y HTTPS verificados no activan por sí solos el dominio.

En **Diseño y vista previa**, el nombre, eslogan y logo son del local. El título y favicon de **Identidad de página independiente** solo afectan al dominio propio. El catálogo conserva el favicon y encabezado generales, y usa un título como `Jardín Magnolia · Encuentro`.

Cambiar el dominio elimina sus comprobaciones y desactiva la página hasta completar de nuevo el proceso. Desactivar la función general detiene todas las páginas independientes; el panel pide confirmación. La ficha del catálogo y los registros de reservas se mantienen. La dirección interna del local, o slug, queda inmutable para conservar enlaces de reservas y notificaciones de pago.

## Opción A con tu proxy existente

Si ya utilizas Nginx Proxy Manager, Cloudflare Tunnel u otro proxy, configura allí el dominio nuevo. No necesitas ejecutar Caddy además de ese proxy.

- El dominio propio debe apuntar al mismo **portal público**, no al portal de propietarios. En esta instalación es el servicio `web`, normalmente puerto 8080 del servidor. El dominio administrativo usa `web-owner`, normalmente puerto 8081.
- Conserva el Host original del dominio y reenvía correctamente el protocolo HTTPS. El proxy debe sobrescribir los encabezados de protocolo recibidos del cliente.
- Publica un certificado válido para ese nombre y activa redirección HTTP a HTTPS. Con Cloudflare utiliza cifrado hasta el origen, no el modo Flexible. La ruta `/.well-known/encuentro-domain/…` debe llegar sin un bloqueo de acceso o desafío interactivo al portal público; la comprobación no lleva una sesión de navegador.
- Configura en `.env` las IP o CIDR exactas de los proxies que llegan al nginx de la aplicación, mediante `TRUSTED_PROXIES`. No uses `*`. Los contenedores deben poder llegar por HTTPS a los dominios públicos para efectuar la comprobación.
- El dominio remitente de Resend, el dominio de la web y el certificado son configuraciones distintas. No es necesario mover los correos de acceso o webhooks a cada dominio: mantienen las URL centrales.

Al cambiar variables de entorno, recrea los contenedores y limpia configuración:

```bash
docker compose up -d --force-recreate
docker compose exec -T app php artisan optimize:clear
docker compose exec -T app-owner php artisan optimize:clear
```

No modifiques `CUSTOMER_URL` por el dominio de cada cliente. Debe seguir apuntando al portal público central, y `OWNER_URL` al portal de gestión. Ambos deben usar HTTPS en producción.

## Opción B con Caddy y certificados automáticos

Incluimos `compose.https.yaml` como despliegue opcional. Utiliza Caddy 2.11.7, cuyo proceso de HTTPS automático emite y renueva certificados y redirige HTTP a HTTPS. Referencia oficial: https://caddyserver.com/docs/automatic-https

Esta opción requiere que los dominios tengan DNS público hacia este servidor, acceso entrante a los puertos 80 y 443, y salida a Internet. No la ejecutes si otro servicio ya ocupa esos puertos. Si tu instalación funciona únicamente mediante Cloudflare Tunnel, utiliza la opción A. El protocolo de aplicación no puede abrir puertos ni cambiar DNS por sí solo.

Configura `.env` con los nombres centrales públicos y un correo real para ACME:

```dotenv
CUSTOMER_URL=https://reservas.tu-plataforma.com
OWNER_URL=https://gestion.tu-plataforma.com
ACME_EMAIL=administrador@tu-dominio.com
OWNER_REGISTRATION=invite
```

Si acabas de cambiar `.env`, recrea los contenedores para cargar esos valores. Si todavía no tienes HTTPS en los portales centrales, genera y arranca primero Caddy con la configuración actual: incluirá los dos portales y podrás entrar al panel por HTTPS. Después habilita las páginas independientes, registra el dominio del cliente y verifica su TXT. Vuelve a generar y recargar Caddy para incorporarlo.

Genera el archivo en el **servidor anfitrión**, mediante redirección de la salida de consola. El comando no escribe dentro del contenedor:

```bash
docker compose exec -T app-owner php artisan domains:caddyfile --no-ansi > deploy/Caddyfile.generated.tmp && mv deploy/Caddyfile.generated.tmp deploy/Caddyfile.generated
```

Solo se incluyen los nombres centrales y los dominios de locales publicados con propiedad DNS comprobada recientemente. Los dominios verificados pero aún no activos se incluyen para que Caddy pueda emitir su certificado y se pueda realizar la comprobación HTTPS. No se habilita emisión abierta de certificados para nombres desconocidos.

Valida y arranca usando ambos archivos Compose:

```bash
docker compose -f compose.yaml -f compose.https.yaml run --rm --no-deps caddy caddy validate --config /etc/caddy/config/Caddyfile.generated --adapter caddyfile
docker compose -f compose.yaml -f compose.https.yaml up -d --build
```

Este despliegue crea la red `172.30.86.0/24`: Caddy usa `172.30.86.10`, y las aplicaciones confían exclusivamente en ese proxy. Si tu servidor ya utiliza esa subred, cambia coordinadamente la subred, las IP y los valores TRUSTED_PROXIES del archivo opcional. No agregues confianza universal para resolver un conflicto.

Después de añadir otro dominio, vuelve a generar el archivo, valida y recarga Caddy:

```bash
docker compose -f compose.yaml -f compose.https.yaml exec -T caddy caddy validate --config /etc/caddy/config/Caddyfile.generated --adapter caddyfile
docker compose -f compose.yaml -f compose.https.yaml exec -T caddy caddy reload --config /etc/caddy/config/Caddyfile.generated --adapter caddyfile
```

Luego comprueba HTTPS desde el panel y activa el dominio. Los certificados y claves se conservan en los volúmenes `caddy_data` y `caddy_config`. No borres esos volúmenes durante una actualización. Al modificar la configuración DNS en el panel, regenerar el archivo de Caddy sigue siendo una tarea del administrador del servidor; el panel no ejecuta comandos Docker.

## Renovación de las comprobaciones

El scheduler ejecuta `domains:recheck` cada hora para hasta 100 dominios activos, priorizando las comprobaciones más antiguas. Las comprobaciones tienen una vigencia máxima de siete días. Si el scheduler deja de funcionar y vencen, la página independiente deja de servirse. Si falla una comprobación de propiedad o HTTPS, se desactiva el dominio y se indica el motivo para revisar y reactivar manualmente.

Puedes ejecutar una revisión manual:

```bash
docker compose exec -T app-owner php artisan domains:recheck --limit=100
```

La renovación del certificado de Caddy es independiente de esta comprobación de la aplicación. También debes conservar DNS, proxy, salida a Internet y volúmenes de certificados.

## Incorporar a un cliente

El registro de propietarios ahora requiere una invitación de manera predeterminada. Las cuentas existentes pueden continuar entrando. Para invitar al dueño de un negocio:

```bash
docker compose exec -T app-owner php artisan owners:invite cliente@example.com
```

Entrega personalmente al propietario el enlace que devuelve la consola; no lo publiques. La invitación vence en 24 horas. La comprobación del correo sigue siendo obligatoria. Si deliberadamente quieres registro libre, configura `OWNER_REGISTRATION=open`; no se recomienda para una instalación de clientes sin supervisión.

## Alcance para publicar

El código permite desplegar un piloto para un cliente y mantener reservas, calendario y pagos centralizados. Las pruebas locales utilizan pagos y correo simulados; no certifican la configuración de tu servidor ni que una cuenta comercial pueda cobrar.

Antes de aceptar dinero real, comprueba en el despliegue:

- HTTPS correcto en los portales centrales y, si se utiliza, en el dominio propio, incluyendo redirecciones y renovación de certificados.
- Una cuenta de propietario por invitación y correo verificado; fotos, ubicación, capacidad, tarifas y disponibilidad reales del local.
- Un recorrido completo con PayPal Sandbox, incluyendo volver de PayPal, verificar el pago y comprobar que no se duplica el abono. Luego valida las credenciales Live correspondientes antes de habilitar producción.
- El correo de confirmación con los importes correctos y recepción de los enlaces de acceso. Tener Resend configurado no demuestra entrega a la bandeja de entrada.
- Scheduler y workers activos, copia de seguridad de base de datos y APP_KEY, y una restauración comprobada. Conserva también los datos de certificados si usas Caddy.

Para el primer cliente, mantén OXXO deshabilitado si no has probado aún la vigencia de fichas, bloqueo del calendario y pagos tardíos. Los apartados sin pagar todavía requieren una política operativa contra abuso; esta entrega no sustituye una prueba de carga ni una auditoría dinámica completa.

No se ha publicado ni configurado un dominio real desde esta entrega. El alta DNS, certificado, configuración del proxy y la comprobación de pagos reales deben completarse en tu infraestructura.

## Comprobaciones locales de esta entrega

Pasaron 296 pruebas PHP con 1384 aserciones, 74 pruebas de interfaz y siete escenarios concurrentes PostgreSQL. TypeScript y la compilación de producción pasaron. Caddy 2.11.7 validó una configuración de ejemplo con los dos portales y un dominio adicional. No se arrancó el despliegue Docker completo, no se emitieron certificados reales y las pasarelas se simularon.
