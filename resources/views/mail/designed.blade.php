<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>{{ $copy['subject'] }}</title></head>
<body style="margin:0;padding:0;background-color:{{ $s['background'] }};color:{{ $s['text'] }};font-family:{{ $s['font']==='serif'?'Georgia,Times,serif':'Arial,Helvetica,sans-serif' }};font-size:{{ $s['font_size'] }}px;line-height:1.65;">
<div style="display:none;font-size:1px;color:{{ $s['background'] }};max-height:0;overflow:hidden;">{{ $copy['intro'] }}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:{{ $s['background'] }};"><tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="{{ $s['width'] }}" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:{{ $s['width'] }}px;background-color:{{ $s['surface'] }};border-radius:{{ $s['radius'] }}px;border:1px solid #e2e7e1;">
<tr><td style="height:6px;background-color:{{ $s['accent'] }};border-radius:{{ $s['radius'] }}px {{ $s['radius'] }}px 0 0;font-size:1px;">&nbsp;</td></tr>
<tr><td align="{{ $s['alignment'] }}" style="text-align:{{ $s['alignment'] }};padding:32px 28px 24px;border-bottom:1px solid #e8ece7;">
@if(!empty($s['logo_url']))<img src="{{ $s['logo_url'] }}" width="{{ $s['logo_width'] }}" alt="{{ $s['brand_name'] }}" style="display:block;max-width:100%;height:auto;border:0;margin-bottom:12px;">@endif
<div style="font-size:24px;line-height:1.3;font-weight:bold;color:{{ $s['primary'] }};">{{ $s['brand_name'] }}</div>
@if(!empty($s['tagline']))<div style="font-size:13px;color:{{ $s['muted'] }};margin-top:6px;">{{ $s['tagline'] }}</div>@endif
</td></tr>
<tr><td style="padding:32px 28px;">
<p style="margin:0 0 12px;font-size:11px;letter-spacing:2px;font-weight:bold;color:{{ $s['primary'] }};">{{ $copy['eyebrow'] }}</p>
<h1 style="margin:0 0 18px;font-size:30px;line-height:1.25;color:{{ $s['text'] }};">{{ $copy['title'] }}</h1>
<p style="margin:0 0 24px;">{!! nl2br(e($copy['intro'])) !!}</p>
@if($type==='confirmation')
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e7e1;border-radius:8px;margin-bottom:24px;">
<tr><td colspan="2" style="padding:18px 16px;border-bottom:1px solid #e8ece7;"><strong>{{ $data['venue_name'] }}</strong><br><span style="font-size:12px;color:{{ $s['muted'] }};">Orden {{ $data['order'] }}</span></td></tr>
@foreach(['Inicio'=>$data['starts'],'Finalización'=>$data['ends'],'Zona horaria'=>$data['timezone'],'Invitados'=>$data['guests']] as $label=>$value)
<tr><td style="padding:7px 16px;color:{{ $s['muted'] }};font-size:13px;">{{ $label }}</td><td align="right" style="text-align:right;padding:7px 16px;font-size:13px;">{{ $value }}</td></tr>
@endforeach
@if($s['show_location']&&!empty($data['address']))<tr><td colspan="2" style="padding:12px 16px;font-size:13px;border-top:1px solid #e8ece7;"><strong>Ubicación</strong><br>{{ $data['address'] }}</td></tr>@endif
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
<tr><td style="padding:16px;background:{{ $s['primary'] }};color:#ffffff;font-size:14px;">Pago recibido</td><td align="right" style="text-align:right;padding:16px;background:{{ $s['primary'] }};color:#ffffff;font-size:22px;font-weight:bold;">{{ $data['payment'] }} MXN</td></tr>
@foreach(['Total de la reserva'=>$data['total'],'Pagado acumulado'=>$data['paid'],'Saldo restante'=>$data['balance']] as $label=>$value)<tr><td style="padding:8px 12px 8px 0;font-size:13px;">{{ $label }}</td><td align="right" style="text-align:right;padding:8px 0;font-size:13px;">{{ $value }} MXN</td></tr>@endforeach
</table>
@if($s['show_extras']&&count($data['extras']??[]))<h2 style="font-size:18px;">Servicios y extras reservados</h2><table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
@foreach($data['extras'] as $item)<tr><td style="padding:10px 0;border-bottom:1px solid #e8ece7;font-size:13px;">{{ $item['name'] }} @if(!empty($item['color']))({{ $item['color'] }})@endif<br><span style="color:{{ $s['muted'] }};">Cantidad: {{ $item['quantity'] }}</span></td><td align="right" style="text-align:right;font-size:13px;border-bottom:1px solid #e8ece7;">${{ number_format(($item['total']??0)/100,2) }} MXN</td></tr>@endforeach
</table>@endif
@if(!empty($data['wifi']['ssid']))<h2 style="font-size:18px;">Acceso a internet para tu reserva</h2><p style="font-size:14px;"><strong>Red Wi-Fi:</strong> {{ $data['wifi']['ssid'] }}<br><strong>Contraseña:</strong> {{ $data['wifi']['password']??'' }}</p>@endif
@if($data['wifi_unavailable']??false)<p>Contacta al establecimiento para recibir los datos de acceso al Wi-Fi.</p>@endif
@endif
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;"><tr><td bgcolor="{{ $s['primary'] }}" style="border-radius:6px;"><a href="{{ $data['action_url'] }}" style="background-color:{{ $s['primary'] }};border:1px solid {{ $s['primary'] }};border-radius:6px;color:#ffffff;display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;padding:15px 24px;">{{ $copy['button'] }}</a></td></tr></table>
<p style="font-size:13px;color:{{ $s['muted'] }};margin:0 0 16px;">{{ $data['security_note'] }}</p>
<p style="margin:0 0 20px;">{!! nl2br(e($copy['closing'])) !!}</p>
@if($type!=='confirmation')<p style="font-size:12px;color:{{ $s['muted'] }};">Si el botón no funciona, copia y pega este enlace en tu navegador:</p><p style="font-size:11px;word-break:break-all;overflow-wrap:anywhere;"><a style="color:{{ $s['primary'] }};" href="{{ $data['action_url'] }}">{{ $data['action_url'] }}</a></p>@endif
@if(!empty($data['reservation_policy']))<p style="border-top:1px solid #e8ece7;padding-top:20px;font-size:12px;color:{{ $s['muted'] }};"><strong>Política de cancelación y pagos</strong><br>{{ $data['reservation_policy'] }}</p>@endif
</td></tr>
<tr><td align="{{ $s['alignment'] }}" style="text-align:{{ $s['alignment'] }};padding:24px 28px;border-top:1px solid #e8ece7;font-size:12px;color:{{ $s['muted'] }};">
<strong>{{ $s['brand_name'] }}</strong><p style="margin:6px 0;">{!! nl2br(e($s['footer'])) !!}</p>
@if(!empty($s['support_email']))<a style="color:{{ $s['primary'] }};" href="mailto:{{ $s['support_email'] }}">{{ $s['support_email'] }}</a>@endif
@if(!empty($s['support_phone']))<div>{{ $s['support_phone'] }}</div>@endif
</td></tr></table>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:{{ $s['muted'] }};">Mensaje automático · Conserva tus datos de acceso en privado.</p>
</td></tr></table></body></html>
