# Mobiliario, servicios y Wi-Fi

## Actualizar
Respalda tu base de datos y conserva el archivo .env y los volúmenes existentes.
Extrae el ZIP actualizado sobre tu proyecto y, desde la carpeta encuentro, ejecuta:

```bash
bash install.sh
```

El instalador aplica la migración 2026_10_27_000008_venue_wifi y reconstruye los servicios.
Conserva APP_KEY: cifra las credenciales existentes y las nuevas del Wi-Fi.
Recarga el navegador con Ctrl+F5. Mantén activo scheduler para enviar los correos.

## Configuración del dueño
En Gestión del negocio, selecciona el local y abre Datos del establecimiento.
En “Mobiliario, servicios y extras” añade los recursos que ofrece:
sillas, mesas, manteles, barra de decoración, bocinas, refrigerador, estufa,
internet, alberca, trampolín u otros servicios.

Cada recurso tiene nombre, color/variante opcional, cantidad disponible,
precio unitario por evento y disponibilidad. El precio $0 significa incluido sin
costo adicional. Para servicios indivisibles como internet o alberca usa cantidad 1.
Para manteles de varios colores crea una fila por color con su propia cantidad.
No se comparten existencias entre establecimientos: las cantidades son por
evento en ese local. La exclusión de horarios del local sigue evitando reservas
simultáneas; no es un almacén con movimientos de inventario.

Registra el SSID y contraseña en “Wi-Fi privado”. Estos datos se guardan cifrados,
fuera de la configuración pública y del chatbot. El dueño ve el nombre de red y
si ya existe una contraseña; dejar la contraseña vacía conserva la anterior.
La casilla “Borrar los datos de Wi-Fi guardados” elimina ambos datos.
Añade también un servicio del tipo Internet y marca su disponibilidad.

Guarda los cambios con el botón del formulario. Los checkbox de correo y
canales ahora colocan casilla y texto en la misma fila, con ajuste en pantallas pequeñas.

## Reserva y precios
El cliente marca los extras y elige cantidades. La cotización calcula:
renta y horas extra + servicios elegidos. El anticipo se calcula sobre el total
con extras. El servidor toma precios y límites del inventario del dueño,
rechaza cantidades inválidas, identificadores repetidos o servicios deshabilitados.
El resumen del cliente, la agenda del dueño y el correo incluyen nombre, color,
cantidad y subtotal. Las reservas conservan una copia de lo contratado;
editar o eliminar un recurso no cambia las reservas previas.
Los cambios de inventario usan los eventos WebSocket ya existentes.

## Correo y privacidad
Cuando un pago verificado confirma la reserva (incluido el anticipo configurado),
el correo de confirmación incluye los datos del Wi-Fi solo si se seleccionó Internet.
Un checkout o ficha pendiente no envía las credenciales. Tampoco se incluyen si el
pago requiere revisión. El servicio de correo debe estar configurado y habilitado
en “Correos y notificaciones”; scheduler procesa la cola existente.
La cola conserva su contenido cifrado, y los eventos WebSocket no transportan contraseñas.
No se envían mensajes nuevos a reservas antiguas solo por actualizar la aplicación.
No se realizaron envíos reales ni pruebas contra pasarelas de producción en esta actualización.

## Verificación
Se añadieron pruebas de cálculo de extras, variantes, límites, precios obsoletos,
permisos de otro dueño, conservación y borrado de contraseña, cifrado y ausencia
de credenciales en respuestas públicas, y envío de Wi-Fi únicamente tras confirmar
el pago con Internet seleccionado. Las pruebas de correo usan el flujo local sin
entregar mensajes reales.
