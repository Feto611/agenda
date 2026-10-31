<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Pago recibido y reserva confirmada</title></head><body>
<h1>Tu reserva está confirmada</h1>
<p>Hola, {{ $customer_name }}. {{ $venue_name }} registró tu pago.</p>
<p><strong>Orden:</strong> {{ $order }}<br><strong>Evento:</strong> {{ $event }}<br><strong>Horario:</strong> {{ $starts }} a {{ $ends }} ({{ $timezone }})<br><strong>Invitados:</strong> {{ $guests }}</p>
<p><strong>Pago recibido:</strong> {{ $payment }} MXN<br><strong>Total de la renta:</strong> {{ $total }} MXN<br><strong>Pagado acumulado:</strong> {{ $paid }} MXN<br><strong>Saldo restante:</strong> {{ $balance }} MXN</p>
@if(count($extras))
<h2>Servicios y extras reservados</h2><ul>
@foreach($extras as $item)<li>{{ $item['name'] }} @if(!empty($item['color']))({{ $item['color'] }})@endif · {{ $item['quantity'] }} · ${{ number_format($item['total']/100,2) }} MXN</li>@endforeach
</ul>@endif
@if($wifi_unavailable??false)<p>Contacta al establecimiento para recibir los datos de acceso al Wi-Fi.</p>@endif
@if(!empty($wifi['ssid']))
<h2>Acceso a internet para tu reserva</h2>
<p><strong>Red Wi-Fi:</strong> {{ $wifi['ssid'] }}<br><strong>Contraseña:</strong> {{ $wifi['password'] ?? '' }}</p>
@endif
<p><strong>Ubicación:</strong> {{ $address }}</p>
<p>Consulta los detalles y pagos en <a href="{{ $account_url }}">Mis reservas</a>. Este correo confirma el pago registrado, no es una factura fiscal.</p>
</body></html>

@if(!empty($reservation_policy))<p><strong>Política de cancelación y pagos</strong><br>{{ $reservation_policy }}</p>@endif
