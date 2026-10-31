# Recuperación de Wi-Fi cifrado y error “The MAC is invalid”

## Causa confirmada por el registro
La excepción ocurre al leer wifi_credentials en VenueController::ownerData.
El MAC de ese valor no es válido para las claves de cifrado disponibles.
Una APP_KEY diferente de la utilizada al guardarlo o un dato cifrado dañado
pueden producir este error. El registro no permite distinguir por sí solo
entre esas causas. No es un error de contraseña de inicio de sesión.

## Actualizar sin eliminar datos
Conserva .env, APP_KEY, claves de Reverb y los volúmenes.
Extrae este ZIP sobre tu instalación y ejecuta:

```bash
cd ~/agendavirtual/encuentro
bash install.sh
```

No hay migraciones nuevas en esta corrección. Recarga con Ctrl+F5.

Ahora el listado y la edición conservan el local accesible si el Wi-Fi o
la credencial del asistente no se pueden descifrar.
El panel muestra un aviso sin devolver el texto cifrado ni la contraseña.
Guardar nombre, precios, horarios u otros campos conserva las credenciales
ilegibles. No se borran automáticamente.

La comparación de cambios de Eloquent también maneja el caso de reemplazar
un valor cifrado antiguo que ya no se puede abrir. El reemplazo se cifra
con la clave actual y mantiene el guardado normal y los eventos del modelo.

## Opción A: recuperar con una clave anterior conocida
Si conservas una copia privada del .env utilizado cuando se guardaron los datos,
añade su APP_KEY a APP_PREVIOUS_KEYS en tu .env actual. No cambies APP_KEY actual
sin revisar qué otros datos se cifraron con ella.

```dotenv
APP_PREVIOUS_KEYS="PEGA_LOCALMENTE_LA_APP_KEY_ANTERIOR_COMPLETA"
```

Usa el valor completo real de la clave anterior, con su prefijo base64: cuando
corresponda. Si ya tienes claves anteriores, conserva las existentes y añade
la otra separada por coma. Nunca envíes estas claves por chat ni publiques .env.

Después ejecuta bash install.sh para recrear los procesos con la misma configuración
y limpiar las cachés. Laravel intenta descifrar con la clave actual y después con
las anteriores. Si la clave correcta existe y el dato está intacto, el Wi-Fi vuelve
a ser legible sin reemplazarlo.

Documentación oficial:
https://laravel.com/docs/12.x/encryption#gracefully-rotating-encryption-keys

## Opción B: reemplazar únicamente el Wi-Fi del local
Si no tienes la clave anterior o el dato está dañado:
1. Entra en Gestión del negocio.
2. Abre el local → Datos del establecimiento → Wi-Fi privado.
3. Marca “Reemplazar credenciales de Wi-Fi con los datos que escribiré”.
4. Escribe de nuevo el nombre de red y su contraseña y guarda.
   Deja la contraseña vacía solo si la red no requiere contraseña.

Este paso reemplaza explícitamente el valor del Wi-Fi de ese local.
Para retirarlo, usa la casilla de borrar los datos guardados.
Ambas acciones siguen restringidas al dueño del establecimiento.
No cambian reservas, clientes, inventario ni otras integraciones.
Haz un respaldo antes de reemplazar si deseas conservar el valor cifrado anterior.

Para una credencial del asistente ilegible, vuelve a introducirla en Asistente y API.
Si APP_KEY cambió, otras credenciales cifradas de correo, pagos o Meta también
podrían necesitar la clave anterior o una nueva configuración.

## Confirmaciones de pago
Si Internet fue seleccionado pero el Wi-Fi es ilegible, el pago verificado y la
reserva se registran normalmente. El correo confirma la operación e indica al
cliente que contacte al local para recibir el acceso. No inventa contraseñas ni
duplica correos. No se envían contraseñas de reservas anteriores retroactivamente
al reparar el Wi-Fi.

## Comprobar claves de procesos sin imprimir sus valores
Estas dos salidas muestran solo una huella SHA-256 de la variable del entorno.
Deben coincidir; no revelan la clave completa:

```bash
docker compose exec -T app php -r 'echo substr(hash("sha256", getenv("APP_KEY")), 0, 16), PHP_EOL;'
docker compose exec -T app-owner php -r 'echo substr(hash("sha256", getenv("APP_KEY")), 0, 16), PHP_EOL;'
```

Si difieren, revisa las variables de Compose y recrea los servicios con el mismo
.env conservando la clave prevista. Las huellas iguales no demuestran que sea
la clave histórica con la que se cifraron los registros.

## Validación local
Pruebas con datos cifrados mediante otra clave para reproducir “The MAC is invalid”,
listado de locales, preservación al editar otros campos, reemplazo y borrado explícitos,
permisos por dueño, recuperación mediante clave anterior y pago con Wi-Fi ilegible.
Las pruebas verifican ausencia de contraseñas y texto cifrado en las respuestas.
No se ha modificado el servidor del usuario ni se ha recuperado su clave histórica.
