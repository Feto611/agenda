# Registro propio, conversaciones Meta, ubicación y diseño

Esta revisión amplía el proyecto Laravel + React. Incluye una migración acumulativa y assets compilados. No instala cambios en tu servidor ni conecta cuentas reales por sí sola.

## Actualizar

Sigue primero el respaldo de `.env` y PostgreSQL y la extracción del ZIP descritos en `ACCESOS_Y_PAGOS.md`. Conserva APP_KEY, `.env`, volúmenes y nombre del proyecto Compose. Después:

```bash
cd ~/agendavirtual/encuentro
docker compose build
docker compose run --rm app php artisan migrate --force
docker compose up -d
docker compose exec app php artisan optimize:clear
docker compose exec app-owner php artisan optimize:clear
docker compose exec app php artisan up
```

La migración `2026_10_27_000004_design_and_messaging.php` añade columnas de diseño y tablas de conversaciones. No borra establecimientos, reservas ni pagos. El servicio scheduler existente procesa Meta cada minuto; verifica que esté activo con `docker compose ps`. Recarga el navegador después de actualizar.

## Crear una cuenta de propietario

Abre `http://localhost:8081/gestion` mediante el túnel SSH descrito en la guía de accesos. Pulsa **Acceso de propietarios → Crear mi cuenta**. Se piden nombre, correo y contraseña con confirmación. La contraseña debe contener letras y números y al menos 12 caracteres. Ya no necesitas invitación para una cuenta nueva.

Los clientes siguen registrándose en el portal público. Se mantienen tablas, sesiones, cookies y permisos separados. Una cuenta nueva de propietario empieza sin locales y solo administra los que cree. Los propietarios migrados que ya existían y estén pendientes siguen activándose con `owners:invite correo`, porque el registro abierto no puede adjudicarle los locales antiguos a cualquiera que escriba su correo. No se implementa recuperación de contraseña por correo en esta revisión.

## Conectar WhatsApp Business, Instagram y Facebook

En el establecimiento abre **Conversaciones y Meta**. La integración utiliza APIs oficiales, sin automatizar cuentas personales ni leer mensajes de otras cuentas. La importación de fotos de Instagram sigue siendo un apartado independiente.

Necesitas una aplicación de Meta, sus permisos y las cuentas del negocio. Este flujo configura credenciales del negocio de forma manual; no implementa OAuth/Embedded Signup ni solicita por ti la revisión de la aplicación.

| Canal | Identificador | API y permisos habituales |
| --- | --- | --- |
| WhatsApp Business | Phone Number ID de Cloud API, no el número escrito con +52 | WhatsApp Business Platform, `whatsapp_business_messaging`; acceso administrativo a la WABA para suscripciones |
| Instagram | ID de cuenta profesional Business/Creator con Instagram Login | `instagram_business_basic`, `instagram_business_manage_messages`; no mezclar tokens de Facebook Login con este adaptador |
| Facebook | ID de página | Messenger Platform, token de página y permisos `pages_messaging` y `pages_manage_metadata` |

Confirma los permisos, acceso avanzado y requisitos de revisión que aparezcan en tu aplicación de Meta. Los nombres y disponibilidad dependen del producto y modo de acceso de tu app. Los permisos para publicar fotografías no conceden automáticamente permiso para recibir mensajes.

1. Selecciona el canal e introduce el ID de su cuenta, la versión Graph (inicialmente v26.0), el token de acceso, el secreto de aplicación y un token de verificación inventado por ti de al menos 16 caracteres.
2. Guarda la configuración. Los secretos se cifran en la base con APP_KEY; los campos guardados vuelven vacíos y dejarlos vacíos conserva su valor.
3. Habilita recepción. Copia la URL pública de webhook que muestra la pantalla, basada en CUSTOMER_URL. Debe ser HTTPS y accesible por Meta, aunque el panel de dueño siga privado en otro puerto.
4. En Meta configura esa URL como callback y el mismo token de verificación. Suscribe el campo de mensajes del producto y la cuenta del negocio a la aplicación según su configuración. En Messenger e Instagram habilita el acceso a mensajes de la cuenta.
5. Prueba primero con las cuentas de prueba/roles permitidos por Meta. Habilita **Responder automáticamente** cuando quieras que el asistente envíe respuestas. Tener recepción habilitada no activa por sí mismo las respuestas.
6. Envía un mensaje desde tu cuenta de prueba. Comprueba la bandeja y el procesamiento. El comando `docker compose exec app php artisan meta:process --limit=50` procesa manualmente los mensajes pendientes; el scheduler hace lo mismo cada minuto.

El webhook GET responde al challenge de verificación. El POST valida X-Hub-Signature-256 contra el cuerpo original usando el secreto de la app; después verifica el ID de la cuenta destino. Rechaza firmas inválidas y descarta ecos, eventos de otras cuentas y duplicados. Las URLs salientes se construyen exclusivamente para `graph.facebook.com` o `graph.instagram.com`.

### Historial y continuidad

Se guardan los mensajes de texto recibidos **desde que se conecta el canal**. No se descarga automáticamente todo el historial anterior de Meta. No se transcriben audios ni se analizan archivos/fotos adjuntos en esta revisión. La bandeja distingue red, entrada/salida y estado de procesamiento; muestra los últimos 60 mensajes del contacto al abrirlo. Las páginas de la bandeja contienen 30 conversaciones.

Cada canal empieza con una identidad independiente. Para continuar en varios canales:

1. El cliente inicia sesión en la página del local y abre su chatbot.
2. Abre **Continuar desde WhatsApp, Instagram o Facebook** y genera un código.
3. Envía `VINCULAR CODIGO` como mensaje privado al negocio desde la red que quiere conectar. El código dura 10 minutos, funciona una sola vez y está limitado al establecimiento. Necesita que el canal y su respuesta automática estén activos para procesar el mensaje de vinculación.
4. Actualiza la conversación vinculada en el chatbot. Repite con un código nuevo para otra red.

Esto une los historiales bajo la cuenta del cliente sin adivinar identidades por nombre o teléfono. Otro cliente o establecimiento no puede consultar ese historial. El cliente ve los últimos 40 mensajes de sus canales vinculados. Generar otro código invalida los anteriores todavía sin usar.

El asistente conserva el tema previo de las respuestas para interpretar continuaciones breves como “y fines de semana”. Siempre vuelve a los datos actuales del local para responder. Una pregunta nueva explícita cambia el tema. La IA recibe únicamente los hechos seleccionados del establecimiento, no la conversación externa completa ni datos personales. No se prometen disponibilidad, descuentos o acuerdos por lo que diga una conversación: el calendario y la cotización del servidor siguen siendo la autoridad.

Las respuestas son automáticas solo cuando lo habilitas, el local está publicado, la conversación no está pausada y el último mensaje del cliente tiene menos de 24 horas. Se limita a 30 respuestas por conversación al día. Fuera de esa ventana se conserva el mensaje sin respuesta automática; no se envían plantillas de WhatsApp ni mensajes comerciales proactivos. Los límites de Meta también pueden impedir un envío dentro de esa ventana.

Puedes **Pausar asistente** en una conversación y responder desde la aplicación de la red social. La pausa afecta a ese canal. Los envíos con error o resultado incierto quedan `needs_review` / `unknown` y no se reintentan automáticamente: revisa en la red social antes de responder manualmente para no duplicar mensajes. `processing` o `sending` persistentes después de un reinicio también requieren revisión manual. No pulses comandos SQL para reintentar sin contrastar el resultado en Meta.

El historial se almacena en tu PostgreSQL; incluye su uso en tu aviso de privacidad y política de retención. No se comparte entre negocios. No se ha implementado borrado de historial desde la interfaz en esta revisión.

## Ubicación mientras escribes

Configura `GEOAPIFY_API_KEY` en el `.env` del servidor para las búsquedas. No hace falta una clave OpenStreetMap para mover el mapa con su configuración predeterminada.

En **Ubicación y redes**, escribe al menos cinco caracteres. Tras una pausa de 500 ms se buscan hasta cinco resultados, se actualiza el mapa con la primera coincidencia y puedes elegir otra. Las respuestas de búsquedas anteriores no sustituyen una dirección más reciente. Puedes arrastrar el marcador o hacer clic para corregir la entrada. Ese ajuste manual invalida la búsqueda en curso; guarda el establecimiento para publicar su ubicación.

Si no hay clave o falla el proveedor, aparece el motivo y sigue disponible el marcador manual. La geocodificación pasa por el servidor y conserva resultados en caché; no se expone la clave al navegador. La búsqueda tiene un límite de 60 solicitudes por minuto para el propietario.

## Diseño con vista previa

Guarda el establecimiento y abre **Diseño y vista previa**. Puedes cambiar:

- Color principal, acentos, fondo y texto.
- Bordes rectos, suaves o redondos; tipografía moderna o clásica.
- Distribución amplia o compacta; botones sólidos o de contorno.
- Ventanas emergentes centradas o laterales.
- Encabezado, texto del botón para reservar y visibilidad de comentarios publicados.

La vista previa usa el mismo componente de página del cliente, con datos y fotografías visibles del local. Se aísla en un iframe para que la vista móvil responda al ancho del dispositivo simulado. El calendario y los pagos están deshabilitados en la vista previa para que no generes operaciones accidentalmente. **Probar ventana** muestra el aspecto del modal. Algunas acciones de acceso/chat de la vista previa son demostrativas y no inician sesión.

**Guardar borrador** conserva los cambios para seguir editando sin cambiar lo que ven los clientes. **Publicar diseño** aplica el diseño a la página de ese local. **Restablecer borrador** vuelve a los valores iniciales del editor; solo afecta a clientes cuando se publica después. El catálogo general y los paneles administrativos mantienen su navegación común; cada local personaliza su propia página. No se permite CSS o JavaScript arbitrario.

## Validación y límites de esta entrega

Se verificaron rutas, permisos, cifrado y ocultación de credenciales, webhooks firmados, deduplicación, ventana de respuesta, vinculación entre canales, aislamiento entre clientes/negocios y borrador/publicación del diseño mediante pruebas automatizadas con APIs simuladas. También se compila TypeScript/Vite y se comprueba renderizado de componentes React.

No se han utilizado credenciales reales de Meta, enviado mensajes reales, cobrado ni desplegado en tu servidor. Necesitas completar la configuración y pruebas de extremo a extremo con tus cuentas. Las pruebas PHP de este entorno usan SQLite/PHP.wasm; no sustituyen comprobar Docker/PostgreSQL y el comportamiento visual en tu despliegue.

Referencias oficiales:
- https://developers.facebook.com/docs/whatsapp/cloud-api/
- https://developers.facebook.com/docs/messenger-platform/
- https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/
- https://www.postman.com/meta/instagram/overview
- https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/webhooks/start/ (referencia archivada de la verificación de firma y challenge; el proyecto no depende de este SDK)
