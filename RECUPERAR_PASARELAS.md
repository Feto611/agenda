# Pasarelas: «The MAC is invalid» al guardar

El registro confirma que Laravel no puede validar/descifrar un dato cifrado. En este caso la ruta de guardado intenta leer las credenciales existentes antes de mezclarlas con el formulario. Por eso introducir datos nuevos no evitaba el error 500. Puede ocurrir por una clave de cifrado distinta, una restauración con otra clave o un valor alterado. El registro por sí solo no identifica cuál de esos cambios ocurrió.

Esta corrección no recupera una clave perdida ni desactiva la validación del cifrado. Permite cargar la configuración con una advertencia y recuperar el servicio de manera explícita.

## 1. Actualizar conservando datos y claves

Copia los archivos del ZIP sobre el proyecto conservando `.env` y ejecuta:

```bash
cd ~/agendavirtual/encuentro
bash install.sh
```

No requiere una migración adicional a las de la entrega anterior. El instalador aplica las pendientes si tu instalación estaba atrasada. No uses `key:generate`, `migrate:fresh` ni `down -v`.

## 2. Comparar los contenedores sin mostrar secretos

```bash
docker compose exec -T app php artisan security:key-status
docker compose exec -T app-owner php artisan security:key-status
```

La huella de `clave_actual_huella` y las listas de `claves_anteriores_huellas` deben coincidir entre ambos. Son huellas SHA-256, no las claves ni sus valores cifrados. El comando también cuenta las pasarelas actuales que no pueden leerse.

Si difieren, revisa en el servidor que ambos servicios lean el mismo `.env` y que no haya una variable o configuración cacheada que sobrescriba las claves. Conserva las claves correctas de tus respaldos; no generes otra. Revisa el Compose efectivo localmente sin publicar su salida porque contiene secretos. Después de corregir `.env`, recrea los servicios y limpia las configuraciones:

```bash
docker compose up -d --force-recreate
docker compose exec -T app php artisan optimize:clear
docker compose exec -T app-owner php artisan optimize:clear
```

Repite la comparación. No reemplaces credenciales todavía si los contenedores usan claves diferentes: el portal público no podría leer lo guardado por el panel.

## 3. Si dispones de la clave anterior

La opción preferida para conservar acceso a órdenes antiguas es añadir la clave original en `APP_PREVIOUS_KEYS` del `.env`, sin cambiar la clave actual a ciegas:

```dotenv
APP_PREVIOUS_KEYS="base64:TU_CLAVE_ANTERIOR_REAL"
```

Ese valor es un marcador; utiliza únicamente una clave real de tu respaldo. Si ya tienes claves anteriores, conserva la lista y añade la necesaria separada por comas. No compartas estas claves. Recrea y limpia las configuraciones con los comandos anteriores. Laravel podrá probar las claves anteriores al descifrar. Si vuelve a leer la configuración, no hace falta reemplazarla.

Referencia oficial: https://laravel.com/framework/docs/12.x/encryption#gracefully-rotating-encryption-keys

## 4. Si no puedes recuperar las credenciales originales

1. Entra a Pasarelas de pago. Ahora se muestra una advertencia en lugar de bloquear la pantalla con un error 500.
2. Marca **Reemplazar credenciales de esta pasarela**.
3. Introduce todos los datos de la misma cuenta y modo:
   - PayPal: Client ID, Client Secret, Merchant ID de 13 caracteres y Webhook ID.
   - Mercado Pago: Access Token, secreto de Webhooks y Collector ID; Public Key para tarjetas integradas.
   - OXXO: clave privada y clave pública RSA de verificación.
4. Guarda primero con **Habilitar** desmarcado. Se crea una configuración nueva cifrada con la clave actual.
5. Copia la URL de notificación que muestra el panel y registra/actualiza esa URL en el proveedor. Si cambiaste el webhook en PayPal, guarda también su Webhook ID correcto. Luego habilita la pasarela y prueba un pago Sandbox completo y su notificación.

El registro anterior conserva su ID y su valor cifrado exacto. Pasa a no vigente y deshabilitado, y las órdenes anteriores mantienen su referencia a él. La nueva configuración no convierte automáticamente esas órdenes en legibles ni confirma sus pagos. Para conciliarlas puede ser necesaria la clave anterior o una revisión en el proveedor. No vuelvas a cobrar una orden cuyo resultado sea incierto.

También se permite deshabilitar una pasarela ilegible sin reemplazar sus datos. La API rechaza reemplazos incompletos y cambios de otro propietario. Las pasarelas ilegibles no se ofrecen para cobros nuevos; las consultas de intentos anteriores muestran una advertencia y no emiten cargos sin poder verificar sus credenciales.

## Cambios adicionales del guardado

La edición se serializa por establecimiento. Si una configuración ya tiene intentos de pago y cambias sus secretos, receptor o entorno, se conserva una versión anterior para esas órdenes. La pantalla bloquea guardados duplicados y no permite guardar datos vacíos cuando la carga inicial ha fallado. No se muestran Client Secret, Access Token, claves privadas ni el valor cifrado en las respuestas.

## Comprobación

Incluye pruebas con credenciales cifradas mediante otra clave: lectura sin error 500, conservación exacta del valor original, reemplazo explícito/completo, separación de propietarios, recuperación mediante clave anterior, bloqueo de cobros sin credenciales legibles y preservación de órdenes anteriores. Las pruebas usan proveedores simulados; no se ha accedido a tu servidor ni a tus cuentas reales.

Validación de esta entrega: 231 pruebas PHP (1024 aserciones), 62 pruebas React/DOM y compilación TypeScript/Vite correctas.
