# Checkout integrado, celular y recuperación de acceso

## Actualizar sin borrar datos

Copia los archivos del ZIP actualizado sobre la carpeta del proyecto, conserva `.env` y ejecuta:

```bash
cd ~/agendavirtual/encuentro
bash install.sh
```

El instalador compila las imágenes, aplica la migración `2026_10_28_000010_recovery_and_checkout` y recrea los servicios conservando los volúmenes y claves. Recarga el navegador. No uses `migrate:fresh`, `down -v` ni regeneres `APP_KEY`.

## Pago dentro del checkout

- **PayPal:** el importe se calcula en servidor. Al preparar el pago aparecen los botones oficiales dentro de la ventana. PayPal abre su experiencia de autorización cuando el cliente pulsa su botón; puede abrir ventana, aplicación o redirección según navegador/dispositivo. El servidor consulta y captura la orden y verifica importe, moneda y receptor antes de confirmar la reserva. Si el componente no carga hay un enlace al checkout oficial ya creado. No se incrusta la página de PayPal manualmente.
- **Tarjetas con Mercado Pago:** en Pasarelas de cobro → Mercado Pago registra la **Public Key** de la misma cuenta y entorno que el Access Token. Con ella se habilita Payment Brick para tarjetas de crédito y débito, un solo pago. La tarjeta se tokeniza con el SDK oficial; el servidor recibe el token y solo cobra el importe de la orden. El Access Token se conserva en el servidor. Sin Public Key se conserva la redirección anterior a Checkout Pro. No hay fallback entre canales después de enviar una tarjeta: se consulta el resultado para evitar dobles cargos.
- **OXXO:** muestra referencia, importe y vencimiento dentro de la ventana, con descarga de instrucciones `.txt`. La referencia no equivale a un pago. Una ficha vencida no debe utilizarse.
- Los componentes y conexiones de los proveedores se permiten explícitamente en CSP del portal público. El panel de propietarios conserva su política sin SDK de pagos. No se añadió `unsafe-eval`.
- Un rechazo o cancelación definitivos de tarjeta permite iniciar otro intento. Un resultado desconocido se bloquea hasta verificarlo o vencer. Se usa una clave de idempotencia por intento. Las notificaciones firmadas y la conciliación siguen activas.
- PayPal exige un Merchant ID de 13 caracteres de la cuenta receptora. El formulario ahora rechaza nombres de aplicación como `paymenter` antes de guardarlos.

No se han realizado cobros reales ni llamadas a tus cuentas. Antes de usar tarjetas en producción, prueba con tus cuentas Sandbox y los escenarios de autenticación que exija tu cuenta/banco. El checkout integrado depende de la habilitación comercial del proveedor.

## Recuperación por correo

Existe **Olvidé mi contraseña** en el acceso de clientes y en el de propietarios. Las cuentas y los tokens están separados por portal, aunque ambas cuentas usen el mismo correo. Enlace de un uso, válido 30 minutos, guardado solo como hash; límites por IP y dirección; respuesta genérica para no revelar cuentas. Un nuevo enlace sustituye al anterior. Al cambiar la contraseña se invalidan las sesiones anteriores y no se inicia sesión automáticamente.

Configura el **correo global** en `.env`. Es independiente de los correos por local que confirman pagos. No se elige el correo de un local para recuperar cuentas porque una persona puede reservar en varios establecimientos.

```dotenv
MAIL_MAILER=smtp
MAIL_HOST=smtp.tu-proveedor.com
MAIL_PORT=587
MAIL_USERNAME=tu-usuario-smtp
MAIL_PASSWORD="tu-credencial-smtp"
MAIL_FROM_ADDRESS=cuentas@tu-dominio.com
MAIL_FROM_NAME="Nombre de tu negocio"
```

Utiliza los datos SMTP reales del proveedor y un remitente autorizado. Se exige TLS. `CUSTOMER_URL` debe ser el dominio HTTPS público y `OWNER_URL` el dominio HTTPS real del panel. Los enlaces se construyen con esos valores, nunca con el Host enviado por el visitante. No pegues tus claves en chats ni las publiques. No modifiques `APP_KEY`.

Después de editar `.env`:

```bash
docker compose up -d --force-recreate
docker compose exec -T app php artisan optimize:clear
docker compose exec -T app-owner php artisan optimize:clear
```

Prueba recibir un correo desde ambos accesos. Si la configuración global sigue en `log`, `array` o `failover`, la recuperación se muestra como no disponible en producción; no se generan enlaces en los logs. Ante fallos SMTP se registra un aviso sin el token. Los enlaces nuevos llevan el token en el fragmento de la URL (`#`), que no se envía en solicitudes de página ni aparece en sus logs de acceso. Se retira de la URL al abrir el formulario y solo se envía por POST al restablecer. Se admite también el formato antiguo con parámetros de consulta; para ese caso la página desactiva el envío de referencias.

## Política de cancelación

Texto publicado:

> Los pagos de la reservación, incluidos anticipos y servicios adicionales, no son reembolsables por cancelación del cliente o inasistencia. Se respetan los derechos y las excepciones que establezca la legislación aplicable.

Se muestra en el local, antes de apartar y en checkout. La casilla comienza desmarcada; la API exige la aceptación. La reserva guarda versión, texto y fecha en su cotización y cada intento de pago guarda su propia aceptación. Las reservas anteriores no se marcan retroactivamente como aceptadas. La política aceptada se consulta en Mis reservas y se incluye en la confirmación por correo cuando está registrada.

No se anulan las devoluciones/contracargos que notifique la pasarela ni se borra dinero del historial: las excepciones y reclamaciones requieren conciliación. La cancelación por el cliente sigue limitada a apartados sin pagos y sin fichas/checkout vigentes. Conserva el diálogo de confirmación.

## Adaptación para celular

Encabezado y navegación en dos filas, textos legibles, campos de 16px para evitar zoom al escribir, formularios a una columna, botones táctiles, ventanas ajustadas a altura dinámica y zona segura, importes y referencias largos con salto de línea, tablas con desplazamiento propio, chat contenido en la pantalla y controles de servicios sin desbordarse. La revisión se basa en CSS y pruebas DOM; requiere comprobación visual final en tus dispositivos con los SDK reales.

## Comprobaciones antes de la demo y producción

1. Prueba una reserva completa en Android y iPhone, con PayPal aprobado/cancelado, tarjeta aprobada/rechazada/pendiente y OXXO pendiente/pagado. Verifica que un doble clic o un webhook repetido no duplique el dinero.
2. Prueba la recuperación: correo real, enlace vencido, enlace reutilizado, nueva contraseña y cierre de sesiones anteriores.
3. Verifica precios, disponibilidad y extras del negocio, imágenes y correos de confirmación. Revisa el checklist de Marca de la plataforma; muestra también el correo de recuperación como pendiente si falta configuración.
4. Configura SPF/DKIM/DMARC del remitente, respaldos y una restauración de prueba, supervisión de errores y HTTPS del proxy.
5. Antes de producción, concreta aviso de privacidad, datos/contacto del proveedor y condiciones de cancelación/reprogramación. La política técnica no sustituye la revisión de tus condiciones comerciales.
6. Aún no incluye verificación del correo al registrarse, segundo factor para administradores, reprogramación por el cliente, devolución emitida desde el panel ni facturación fiscal. Las devoluciones excepcionales se gestionan en el proveedor y se concilian.

## Validación

Se comprueban en pruebas automatizadas el token de un uso y vencimiento, separación de cuentas, invalidación de sesiones, campos públicos/secretos, aceptación de política, orden PayPal con importe del servidor, tarjetas con importe/receptor verificados, bloqueo de reenvíos inciertos y componentes oficiales con SDK simulado. Resultado de esta revisión: 219 pruebas PHP (963 aserciones), 60 pruebas React/DOM y compilación TypeScript/Vite correctas. No equivalen a una certificación de las cuentas comerciales ni a pruebas en tu servidor.
