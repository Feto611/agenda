# Errores al abrir el pago y estado automático

## Qué explican las capturas

El cambio de horario de la revisión anterior resolvía el HTTP 422 por la proximidad del evento. No eliminaba la causa del HTTP 502 al crear una orden nueva. El código anterior convertía cualquier excepción de creación en 502 y guardaba un mensaje genérico; no conservaba el código de rechazo útil de PayPal. Por eso una credencial incorrecta, una petición rechazada o una conexión interrumpida podían verse iguales.

Esta revisión corrige ese manejo y permite identificar el fallo real de tu servidor/cuenta. No se afirma que se haya probado tu cuenta de PayPal ni que se conozca su respuesta concreta a partir de una captura sin el cuerpo de la respuesta.

## Cliente

- Se retiraron «Verificar con el proveedor» y las instrucciones de revisar su cuenta, confirmar manualmente el checkout o volver a cobrar.
- Se muestran mensajes de pago listo, en proceso, completado o pendiente de atención del establecimiento. No se afirma que un pago haya sido recibido mientras no esté verificado.
- El estado se sincroniza automáticamente mientras la pantalla está abierta y se siguen recibiendo las actualizaciones existentes. El cliente puede volver a Mis reservas.
- Abrir la página de estado o sincronizar no captura dinero. La captura PayPal sigue requiriendo la aprobación del cliente mediante PayPal o su retorno de aprobación. Los cargos de tarjeta siguen requiriendo el envío del formulario oficial.
- Las instrucciones técnicas antiguas guardadas en `review_reason` tampoco se exponen en la API del cliente. Los diagnósticos privados no aparecen en el catálogo, Mis reservas ni el estado de checkout.

## Manejo del fallo

- Un rechazo explícito de creación HTTP 400/401/403/404/422 se guarda como `failed`. El cliente recibe una explicación sencilla y puede elegir otra opción. No se marca como resultado incierto por defecto.
- Un timeout, respuesta 5xx o resultado realmente incierto queda `unknown`, sin confirmar la reserva ni iniciar un cargo alternativo automáticamente.
- Para creación PayPal incierta, se puede recuperar el mismo intento hasta tres veces durante su vigencia y dentro de los primeros 15 minutos, siempre con el mismo `PayPal-Request-Id` y la misma orden local. Esto solo prepara/recupera la orden; no la aprueba ni captura dinero. Hay una espera entre consultas y un bloqueo compartido en base de datos para reducir consultas simultáneas.
- Si ya hay un ID PayPal, la sincronización consulta la orden. Un pago ya completado se verifica y aplica una sola vez. Una orden aún aprobada pero no cobrada puede volver a mostrar la opción de continuar; no se captura desde el sincronizador.
- Se conserva `Prefer: return=representation` y se admiten enlaces de aprobación `approve` y `payer-action` válidos de PayPal.
- OXXO sigue usando sus notificaciones y consultas de estado. Mercado Pago utiliza el ID de pago conocido o busca por la referencia de la orden. No se reenvía automáticamente una tarjeta ni se genera otra ficha OXXO para suplir una respuesta incierta.
- El conciliador programado sigue activo aunque el cliente cierre la página. Puede recuperar la creación PayPal con la misma clave dentro de esos límites. Los pagos ya completados y las devoluciones siguen requiriendo comprobación del servidor.

Referencia de idempotencia: https://developer.paypal.com/api/rest/requests/

## Diagnóstico privado

En Gestión del negocio → Pasarelas de pago → PayPal → **Diagnóstico privado de pagos** se muestran los fallos nuevos del establecimiento: entorno Sandbox/Producción, operación, HTTP, nombre del error, campo/issue reconocido y PayPal Debug ID cuando está disponible. El acceso está limitado al propietario del local.

Solo se guardan campos permitidos. No se guardan el cuerpo completo de solicitud/respuesta, Client Secret, access token, datos de tarjeta ni mensajes crudos de excepciones. El log `payment_gateway_failure` utiliza los mismos datos limitados. En conexiones fallidas se extrae únicamente un código seguro de DNS/conexión/timeout/TLS cuando puede identificarse.

Los errores que ocurrieron antes de esta actualización no pueden reconstruirse si el código anterior descartó la respuesta. Después de actualizar, reproduce el fallo una vez si sigue sucediendo y consulta el diagnóstico nuevo.

Desde el servidor:

```bash
cd ~/agendavirtual/encuentro
docker compose exec -T app-owner php artisan payments:diagnose jardin-magnolia paypal
```

Sustituye `jardin-magnolia` si el slug de tu local es otro. El comando muestra entorno y estado de configuración, realiza una prueba **OAuth sin crear órdenes ni cobrar**, y muestra el último diagnóstico guardado. No imprime las claves. Se puede compartir su salida para investigar el error.

Interpretación orientativa:

- `401` + `invalid_client`: comprobar Client ID/Secret y que correspondan al entorno elegido.
- `400`/`422` + un campo de la solicitud: corregir ese campo con el detalle de PayPal; por ejemplo, `merchant_id` debe ser el ID real del receptor.
- `403`: revisar habilitación/permisos de la cuenta y del receptor.
- `DNS`, `CONNECT`, `TIMEOUT`, `TLS_CERTIFICATE`: revisar salida de red, DNS, certificados y conectividad del contenedor.
- OAuth correcto no prueba que la creación/captura de órdenes esté habilitada ni que el Merchant ID corresponda al receptor previsto. Para eso se necesita el error de esa operación y una prueba Sandbox completa.

Las advertencias amarillas de `Permissions-Policy` de la captura no identifican el motivo de la creación fallida. Tampoco es suficiente un `Fetch failed` sin estado/respuesta. Si el proxy devuelve 502 antes de alcanzar Laravel, hay que revisar además sus logs y el estado de Docker; esta revisión no atribuye todos los 502 posibles a PayPal.

## Instalar

Conserva `.env`, copia los archivos actualizados y ejecuta:

```bash
cd ~/agendavirtual/encuentro
bash install.sh
```

Aplica la migración `2026_10_28_000011_payment_diagnostics` y carga los archivos nuevos. Recarga con Ctrl + F5. No regeneres APP_KEY ni borres datos. La captura anterior muestra un archivo JavaScript de una revisión anterior, por lo que es importante comprobar que el navegador cargue el nuevo build.

## Validación

Se simulan rechazos PayPal 400/401, fallos 503 y de conexión, recuperación de la misma orden, captura con respuesta perdida resuelta por consulta, prohibición de cargos desde sincronización, límites y bloqueos, separación de propietarios y clientes, ocultación de secretos y mensajes técnicos antiguos. Las pruebas no usan cuentas reales de pago ni verifican tu servidor público.

Validación de esta revisión: 255 pruebas PHP (1146 aserciones), 66 pruebas React/DOM y compilación TypeScript/Vite correctas.
