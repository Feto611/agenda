# Pago bloqueado: «El evento comienza demasiado pronto»

Ese mensaje era una validación del servidor (HTTP 422), no un rechazo de PayPal. El código anterior recortaba la vigencia de todos los checkouts a 30 minutos antes del inicio y además exigía más de 5 minutos de vigencia. En consecuencia, bloqueaba nuevos intentos cuando faltaban 35 minutos o menos y también impedía liquidar el saldo de una reserva confirmada cerca de su inicio o después.

## Comportamiento corregido

- **Apartado pendiente + PayPal/tarjeta:** puede iniciarse el pago si quedan al menos 5 minutos antes del evento. Vigencia del intento: hasta 15 minutos, limitada por la hora de inicio del evento. No se mantiene un apartado más allá de su inicio al autorizar una captura.
- **Reserva confirmada + saldo pendiente:** los pagos en línea pueden iniciarse antes o después de la hora del evento. No se aplica el margen de una reserva nueva para liquidar una deuda de una reserva ya confirmada. El servidor conserva las comprobaciones de importe, moneda, receptor y saldo disponible. Un pago válido de ese saldo no se marca como revisión solo por haber empezado el evento.
- **OXXO:** conserva su margen de 30 minutos antes del evento y al menos 5 minutos para la ficha; se requieren 35 minutos de anticipación. Su ficha tiene como máximo 24 horas de vigencia, limitada por ese margen. Se recomienda pagar con anticipación porque la notificación puede tardar. Generar la ficha no confirma el pago.
- **Apartado ya iniciado, vencido o cancelado:** no se cobra para crear una reserva nueva en ese horario. Debe elegirse otro horario disponible o consultarse con el establecimiento.
- **Intento vencido:** no se emite una captura nueva de PayPal ni un cargo de tarjeta desde ese intento. Si el proveedor ya cobró, se sigue conciliando ese dinero. Un pago tardío de un apartado no confirmado se registra para revisión; no confirma automáticamente un evento pasado ni un espacio ocupado.

## Información visible antes de pagar

El checkout ahora muestra local, orden, fecha/hora y zona horaria del evento, tomadas del servidor. La API de opciones informa qué medios están disponibles para esa reserva y por qué. Los no disponibles se muestran deshabilitados y el formulario elige uno disponible. Si ninguno puede utilizarse, no envía una solicitud de cobro al pulsar el botón. El servidor vuelve a validar las condiciones al iniciar y capturar, por si el tiempo o el saldo cambiaron mientras la ventana estaba abierta.

La fecha de la captura anterior no se puede deducir de las imágenes. Esta corrección no cambia automáticamente la fecha de una reserva existente ni omite la comprobación de si ya empezó. Para la demo elige una reserva futura con margen suficiente y confirma que la hora mostrada coincide con la que quieres reservar.

## Actualización

Copia el ZIP actualizado sobre los archivos del proyecto conservando `.env` y ejecuta:

```bash
cd ~/agendavirtual/encuentro
bash install.sh
```

No requiere migración adicional. Recarga el navegador para cargar el JavaScript nuevo. No necesitas cambiar credenciales de PayPal ni regenerar claves por esta validación.

El mensaje «Fetch failed loading GET /api/venues» de la consola es independiente de este 422. La imagen no permite determinar si fue una petición cancelada, un fallo de conexión o una respuesta del servidor; si persiste y el catálogo no carga, revisa su estado y respuesta en Network. No se afirma que un ajuste de vigencia corrija un fallo de red.

## Validación

Hay pruebas de límites de 4/5/7/20 minutos, margen de OXXO, apartados vencidos y eventos pasados, saldo confirmado tras el inicio, prohibición de capturar intentos vencidos y pagos tardíos enviados a revisión. Las pruebas del navegador usan DOM y proveedores simulados; no se han emitido cargos reales ni se ha accedido al servidor desplegado.

Validación de esta revisión: 242 pruebas PHP (1069 aserciones), 64 pruebas React/DOM y compilación TypeScript/Vite correctas.
