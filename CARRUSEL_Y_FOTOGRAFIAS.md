# Portada, fotografías y botones de servicios

## Instalación y actualización
Extrae este ZIP sobre tu instalación conservando el archivo .env, APP_KEY,
las claves de Reverb y los volúmenes. Desde la carpeta encuentro ejecuta:

```bash
bash install.sh
```

No hay una migración nueva para el carrusel: se guarda en el diseño existente.
El instalador aplica cualquier migración pendiente de actualizaciones anteriores.
Recarga con Ctrl+F5 al terminar. La actualización no se despliega automáticamente
en tu servidor al descargar el ZIP.

## Portada fija o carrusel
En Gestión del negocio abre tu local → Diseño y vista previa.
En “Imágenes de portada” elige “Imagen fija” o “Carrusel automático”.
Para el carrusel elige el intervalo: 3, 5, 8, 10, 15 o 20 segundos.

Revisa la vista previa y pulsa “Publicar diseño” para aplicarlo al sitio.
“Guardar borrador” conserva el cambio sin publicarlo.
Los locales existentes mantienen una portada fija hasta activar el carrusel.

El carrusel:
- Empieza con la portada seleccionada y continúa con las demás fotos publicadas.
- Se muestra en la portada del local y en su tarjeta del catálogo.
- Con una sola foto funciona como imagen fija, sin temporizador ni controles.
- En la página del local ofrece anterior, siguiente y pausa/reanudación.
- Se pausa al pasar el cursor sobre la imagen, enfocar sus controles o enfocar
  la tarjeta del catálogo, y mientras la pestaña está oculta.
- Desactiva el avance automático si el dispositivo pide reducir el movimiento.
- Omite fotografías ocultas y las que no se puedan cargar.
- Al cambiar de página elimina sus temporizadores y escuchas.

## Eliminar fotografías
En “Fotos y comentarios”, cada fotografía tiene “Eliminar imagen”.
Primero se muestra una confirmación con “Conservar imagen” y
“Sí, eliminar imagen”. Solo el dueño de ese establecimiento puede borrarla.

Al eliminar:
- Se quita la fotografía del catálogo, galería y carrusel.
- Si era la portada, se selecciona otra fotografía publicada.
- Si no quedan fotografías publicadas, se muestra el estado sin imágenes.
- Si se cargó desde el servidor, se elimina el archivo local tras confirmar
  la operación en la base de datos.
- Si se importó de Instagram, solo se elimina la copia de referencia del local;
  la publicación original en Instagram se conserva.

Ocultar una portada también selecciona otra foto visible. Las pantallas conectadas
reciben el cambio mediante los eventos WebSocket existentes.

## Botones del inventario
“Añadir mobiliario o servicio” tiene fondo verde, icono + y área de clic amplia.
“Eliminar servicio” tiene icono de papelera, fondo tenue y borde rojo, dentro
del pie de cada tarjeta. Ambos incluyen estilos para foco, hover y móvil.
Los cambios de inventario siguen guardándose con el formulario del local.
Eliminar un servicio no modifica el desglose de reservas anteriores.

## Validación
Pruebas locales cubren publicación de diseño y borrador, intervalos,
avance y pausa, preferencia de movimiento reducido, exclusión de fotos ocultas,
errores de carga, limpieza de temporizadores, confirmación de borrado,
permisos por local, retirada del archivo local y selección de portada sustituta.
La imagen generada en la conversación es una propuesta visual de los botones;
las funcionalidades se implementan en React, CSS y Laravel.
