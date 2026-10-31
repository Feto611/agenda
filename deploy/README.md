# Despliegue vigente

Lee [ACCESOS_Y_PAGOS.md](../ACCESOS_Y_PAGOS.md) antes de instalar o actualizar. Allí están el procedimiento completo, los seis servicios Docker, los puertos, el registro del propietario y la configuración de pasarelas.

Instalación nueva: copia .env.example a .env; configura PostgreSQL, dominios y contraseña; ejecuta docker compose build; genera APP_KEY una sola vez con docker compose run --rm --no-deps app php artisan key:generate --show y copia la salida en .env; ejecuta docker compose run --rm app php artisan migrate --force y docker compose up -d. Luego abre el panel privado y pulsa Crear mi cuenta. Las identidades antiguas pendientes se activan mediante la invitación de consola para conservar sus locales.

La interfaz pública y la privada utilizan PHP-FPM separados y cookies distintas. El puerto administrativo se enlaza a localhost por defecto. Para HTTPS detrás de un proxy configura las IP/CIDR reales en TRUSTED_PROXIES y los indicadores de cookie segura de cada portal; no habilites confianza universal por comodidad.

GEOAPIFY_API_KEY habilita búsqueda de direcciones. MAP_TILE_URL y MAP_ATTRIBUTION permiten cambiar el proveedor de tiles conservando atribución. AI_ALLOWED_HOSTS es la lista de dominios exactos para llamadas de IA, controlada por el administrador del servidor.

Los medios PayPal, Mercado Pago y OXXO Pay se configuran por establecimiento desde Gestión del negocio → Pasarelas de cobro. Necesitas credenciales propias y Webhooks públicos HTTPS. No hay claves comerciales incluidas ni pruebas contra comercios reales completadas desde esta sesión.
