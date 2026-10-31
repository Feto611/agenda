# Corrección del arranque de administración

## Fallo corregido
La interfaz inicializaba el portal como cliente y consultaba /api/me.
Si la sesión era de propietario, consultaba también /api/owner/venues antes
de actualizar la identidad visual. Si esta segunda petición fallaba, el estado
seguía siendo cliente, y la suscripción pública podía cargar el catálogo.

Ahora:
- El HTML identifica el portal configurado en el servidor antes de consultar la API.
- /api/me confirma esa identidad; no se elige cliente como alternativa ante errores.
- El arranque del portal propietario no consulta el catálogo ni carga locales
  privados para decidir qué interfaz mostrar.
- Gestión del negocio carga sus locales independientemente. Si falla, conserva
  el contexto administrativo y ofrece “Reintentar carga”.
- Si /api/me falla, aparece una pantalla de recuperación sin catálogo, chatbot
  ni formulario de acceso de clientes.
- Si la página y la API corresponden a portales diferentes, se informa de una
  configuración inconsistente del proxy.
- El HTML deja de ser cacheable y las respuestas incluyen X-Encuentro-Portal
  para diagnosticar el destino del proxy.
- No cambian los guards, las cuentas ni los permisos del servidor.

## Actualización
Extrae el ZIP sobre la instalación conservando .env, APP_KEY, las claves Reverb
y los volúmenes. Desde la carpeta encuentro:

```bash
bash install.sh
```

Después recarga con Ctrl+F5. No hay migraciones nuevas en esta corrección.
El instalador aplica las que sigan pendientes de versiones anteriores.

## Verificación del proxy
El puerto 8080 sirve el portal cliente.
El puerto 8081 sirve Gestión del negocio y debe apuntar a web-owner.
En Compose, app-owner configura APP_PORTAL=owner.
El puerto 8081 escucha en localhost por defecto.

La respuesta del dominio administrativo debe incluir:
X-Encuentro-Portal: owner

Si indica client, revisa el destino del dominio en Nginx Proxy Manager,
Cloudflared o el proxy utilizado: está llegando al servicio público.
No basta con añadir /gestion al dominio público, ni se deben desactivar los
permisos para forzar que una cuenta cliente entre a la administración.
Si ambos portales usan dominios, configura CUSTOMER_URL y OWNER_URL en .env.

## Un error 500 requiere su registro
Esta corrección evita que un error privado cambie la interfaz a cliente.
No identifica por sí sola la excepción que produjo el 500 en el servidor
del usuario ni demuestra que esa excepción esté resuelta.

Si todavía falla la carga o el guardado, reproduce el fallo y ejecuta:

```bash
docker compose exec -T app-owner sh -c 'tail -n 100 storage/logs/laravel.log'
```

Si no existe el archivo:

```bash
docker compose logs --tail=100 app-owner
```

Conserva APP_KEY. No publiques el archivo .env ni credenciales.
La migración venue_wifi debe estar aplicada si se instaló la versión de inventario.

## Validación local
Pruebas de renderizado del HTML de ambos portales, cabeceras y caché.
Pruebas de carga de identidad, error de /api/me, API/página inconsistentes y
arranque propietario sin llamadas al catálogo público ni a locales privados.
La prueba de pantalla de recuperación comprueba que no muestra navegación de
clientes ni chatbot. No se ha desplegado ni inspeccionado el servidor remoto.
