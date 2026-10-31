> Navegación actual: consulta `IDENTIDAD_Y_PAGOS.md`. Dominios propios está deshabilitado; la identidad general se abre junto al usuario y el checkout usa tarjetas de selección.

> Instalación actual: ejecuta `bash install.sh`. Genera y guarda las claves que faltan en `.env`, conserva las existentes y aplica las migraciones. Consulta `INSTALACION_AUTOMATICA.md`; sustituye los pasos manuales de generación de claves de revisiones anteriores.

> Actualización de acceso y marca: consulta `ACCESO_Y_PERSONALIZACION.md` para el nuevo control de intentos, asistente exclusivo de clientes y logos/favicon/tipografías. Las cifras de pruebas en secciones históricas corresponden a sus revisiones.

> Actualización vigente: consulta [WEBSOCKETS.md](WEBSOCKETS.md). Las actualizaciones de interfaz usan Reverb/Echo; las consultas periódicas de 3/5/10/15 segundos descritas en versiones anteriores fueron reemplazadas.

# Encuentro — Laravel + React

Plataforma de reservas con dos portales independientes, cuentas separadas de clientes/propietarios y pagos por establecimiento. Backend Laravel 12, React 19 + TypeScript, PHP 8.3-FPM, Nginx y PostgreSQL 17. Dependencias fijadas en composer.lock y package-lock.json.

**Para instalar o actualizar lee [ACCESOS_Y_PAGOS.md](ACCESOS_Y_PAGOS.md).** Incluye puertos, invitaciones, migración de cuentas existentes, claves y Webhooks de PayPal/Mercado Pago/OXXO Pay, y validación pendiente con cuentas reales.

## Portales

- **Reservas:** catálogo, fotos, reglas, mapa, disponibilidad, cotizaciones, chatbot, registro público mínimo, Mis reservas y checkout. Puerto 8080 por defecto.
- **Gestión del negocio:** establecimientos del propietario, calendario, tarifas, anticipos, horas adicionales, fotos, comentarios, IA y pagos. Puerto 8081 privado por defecto, ruta /gestion. Registro propio desde ese panel, separado del registro de clientes.

El puerto y la ruta no son el control de acceso principal. Hay modelos, tablas, guards, sesiones y cookies distintos, y permisos comprobados desde la API. Los clientes no pueden registrar establecimientos ni iniciar sesión como propietarios con su cuenta pública. El propietario tampoco utiliza su sesión administrativa para las operaciones de un cliente.

## Funcionalidad

Reservas por jornada completa o por horas, margen de preparación/limpieza, cierre al día siguiente, aforo, días cerrados, tarifas de semana/fin de semana/fecha especial, anticipo fijo o porcentual, precio de hora extra elegido por el dueño y sugerencias que solo se aplican al aceptarlas. Los formularios nuevos comienzan sin cifras de negocio prellenadas. Se permite guardar un local como borrador antes de publicarlo.

El motor bloquea la fila del establecimiento en PostgreSQL dentro de una transacción al apartar o modificar la agenda. Los precios se recalculan en servidor, se comparan con la cotización aceptada y se conservan en la reserva. El aforo es independiente de la cantidad de reservas: cada grupo ocupa el espacio completo. No se implementan cupos compartidos por entradas.

Fotografías subidas, portada, galería y comentarios con fuente; importación manual autorizada desde Instagram profesional, con token cifrado y aprobación individual antes de publicar. No se inventan reseñas ni estrellas. El mapa usa Leaflet/OpenStreetMap y Geoapify opcional para búsqueda; la ubicación puede ajustarse manualmente y se buscan coincidencias mientras se escribe, con descarte de respuestas antiguas.

El chatbot responde sobre el local mediante reglas o adaptadores de OpenAI compatible, Claude y Ollama/Llama. Cuotas de visitante/usuario comprobadas en servidor, claves cifradas, rechazo de temas ajenos y respaldo por reglas. No se envían datos personales ni historial de reservas a un modelo de IA. No se ofrece acceso universal a APIs con protocolos arbitrarios.

Pagos: checkout PayPal y Mercado Pago, ficha OXXO Pay de Digital FEMSA, Webhooks verificados, consulta al proveedor, idempotencia, validación de moneda/importe/cuenta receptora, conciliación periódica y contabilidad de devoluciones. Los pagos tardíos con conflicto pasan a revisión. También se conserva el registro administrativo de dinero ya recibido fuera de la plataforma.

Consulta [META_DISENO_Y_UBICACION.md](META_DISENO_Y_UBICACION.md) para la bandeja de conversaciones Meta y el editor de diseño con borradores, publicación y vista previa aislada en escritorio/móvil.

## Arquitectura

Monolito modular: interfaz React y API Laravel del mismo origen, sesiones y CSRF, servicios de disponibilidad/pagos/chat y base PostgreSQL. Se despliega la misma aplicación con rol fijo de servidor distinto para cada portal. No se utiliza Inertia ni OAuth para las cuentas internas.

Entidades: users (clientes), owners (propietarios), owner_invitations, venues, bookings, booking_payments, gateway_accounts (versionadas), checkout_attempts, venue_photos, venue_reviews, venue_social_connections chat_conversations, meta_connections, message_contacts, message_threads, thread_messages y contact_links.

Archivos clave:
- app/Http/Middleware: selección y restricción de portal.
- app/Services/BookingEngine.php: tarifas y disponibilidad.
- app/Services/Payments: proveedores, confirmación y conciliación.
- app/Http/Controllers: autenticación, permisos, datos, checkout y Webhooks.
- resources/js/app.tsx: interfaz y flujos principales.
- resources/js/Payments.tsx: configuración de pasarelas, checkout y resultado.
- resources/js/PortalNavigation.tsx: navegación separada por portal.
- resources/js/Experience.tsx: catálogo, galería y panel de reservas/pagos.
- routes/console.php: invitaciones y conciliación.
- database/migrations: migraciones acumulativas; no editar las aplicadas.

## Ejecutar y probar

La instalación recomendada con Docker está en ACCESOS_Y_PAGOS.md. Para desarrollo local necesitas PHP 8.3 con extensiones Laravel/PDO, Composer 2, Node 22 y PostgreSQL. Configura .env, instala con composer install y npm ci, ejecuta php artisan migrate y npm run build. npm run dev sirve PHP con assets compilados; npm run assets:dev inicia Vite en otra terminal. Para el portal privado local establece APP_PORTAL=owner, un puerto distinto y una cookie distinta antes de arrancar su proceso PHP.

```bash
npm run build
npm run test:ui
php vendor/bin/phpunit --testdox
```

Las pruebas del servidor se ejecutaron con PHP.wasm 8.5 y SQLite en el entorno de trabajo; las dependencias de producción se resuelven para PHP 8.3. También hay pruebas de renderizado de React. No se ejecutó Docker/PostgreSQL ni se efectuaron cobros reales. El estado de integración y los pasos pendientes se explican en ACCESOS_Y_PAGOS.md.

No se entregan usuarios, contraseñas ni credenciales comerciales predeterminados. Las claves RSA de tests/Fixtures son exclusivamente material de prueba sin valor para una cuenta real. No se incluyen .env ni datos privados en el ZIP.

Quedan fuera de esta entrega la verificación de correo, contratos, cobro automático de horas extra realmente utilizadas y emisión de devoluciones desde el panel. Las devoluciones se realizan en el proveedor y luego se concilian. No se afirma que la plataforma esté validada para cobrar en producción sin configurar y probar sus cuentas reales.

Validación de esta revisión: 148 pruebas PHP y 27 pruebas React/DOM; compilación TypeScript/Vite. Incluye una prueba de actualización de la base anterior conservando la propiedad de los locales y las contraseñas de cliente, sin copiarlas a propietarios.

## Horarios, formularios y auditoría

Consulta [AUDITORIA_SEGURIDAD.md](AUDITORIA_SEGURIDAD.md) para la edición de horarios HH:MM con minutos, los campos numéricos que permanecen vacíos al borrarlos y las pruebas de XSS, cookies, sesiones, CSRF, permisos, SSRF y dependencias. Incluye resultados, correcciones y límites; no representa un pentest de tu servidor público.

## Mapas, actualización automática y correos

Lee [MAPAS_ACTUALIZACION_Y_CORREOS.md](MAPAS_ACTUALIZACION_Y_CORREOS.md). Corrige la política de referencias de OpenStreetMap, añade máscara de hora y filtro numérico, revalida los datos publicados cada tres segundos y permite configurar Resend, Postmark o SMTP por local para enviar confirmaciones de pagos verificados. Requiere aplicar la nueva migración y mantener scheduler activo.

## Checkout integrado, celular y recuperación

Consulta [CHECKOUT_MOVIL_Y_RECUPERACION.md](CHECKOUT_MOVIL_Y_RECUPERACION.md). Incluye botones oficiales de PayPal, tarjetas con Mercado Pago Bricks al configurar su Public Key, ficha OXXO descargable y recuperación por correo para clientes y propietarios. La recuperación usa el correo global de `.env`, independiente del correo de cada local. Los pagos son no reembolsables por cancelación del cliente o inasistencia, con aceptación registrada y excepciones legales aplicables. Aplica la migración 000010 mediante `bash install.sh`.

## Error de cifrado al guardar pasarelas

Consulta [RECUPERAR_PASARELAS.md](RECUPERAR_PASARELAS.md) para «The MAC is invalid»: comparación de claves sin revelarlas, recuperación con clave anterior y reemplazo explícito de credenciales conservando las configuraciones y órdenes antiguas. No requiere una migración nueva.

## Pago cerca del inicio y liquidación de saldos

Consulta [PAGOS_Y_HORA_DEL_EVENTO.md](PAGOS_Y_HORA_DEL_EVENTO.md). Corrige la restricción de 35 minutos para pagos en línea, distingue los apartados nuevos de los saldos confirmados y muestra fecha, zona horaria y disponibilidad de cada medio antes de pagar. OXXO conserva su margen; no se confirma un apartado pasado ni se captura un intento vencido.

## Diagnóstico de errores y seguimiento automático del pago

Consulta [DIAGNOSTICO_Y_ESTADO_DE_PAGOS.md](DIAGNOSTICO_Y_ESTADO_DE_PAGOS.md). Retira del cliente las instrucciones técnicas y la verificación manual con el proveedor, añade sincronización del estado y diagnóstico privado de rechazos/conexiones. Requiere la migración 000011 y conservar .env. La recuperación de creación PayPal utiliza la misma clave de idempotencia; la sincronización no captura dinero.
