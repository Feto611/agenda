<?php
namespace App\Services\Payments;
use App\Models\Booking;
use Carbon\CarbonImmutable;
class CheckoutWindow {
 public function assess(Booking $booking,string $provider):array {
  $now=CarbonImmutable::now();$zone=$booking->quote['timezone']??$booking->venue->settings['timezone']??'America/Mexico_City';
  $event=$booking->starts_at->setTimezone($zone)->format('d/m/Y H:i').' ('.$zone.')';
  $deny=fn($reason)=>['available'=>false,'unavailable_reason'=>$reason,'expires_at'=>null];
  if(!in_array($booking->status,['hold','confirmed'],true))return $deny('Esta reserva no admite pagos en línea. Consulta su estado en Mis reservas.');
  if($booking->balance_due<=0)return $deny('Esta reserva ya no tiene saldo pendiente.');
  if($booking->status==='hold'&&!$booking->expires_at?->isFuture())return $deny('El apartado venció. Crea uno nuevo si el horario sigue disponible.');
  if($booking->status==='hold'&&$booking->starts_at->lte($now))return $deny('El evento del '.$event.' ya comenzó. No se puede confirmar un apartado nuevo para ese horario.');
  $expires=$now->addMinutes($provider==='oxxo'?1440:15);
  if($provider==='oxxo'){
   $cutoff=$booking->starts_at->subMinutes(30);if($cutoff->lt($expires))$expires=$cutoff;
   if($expires->lt($now->addMinutes(5)))return $deny('OXXO necesita al menos 35 minutos antes del evento del '.$event.'. Utiliza PayPal o tarjeta si están disponibles, o contacta al establecimiento.');
  }elseif($booking->status==='hold'){
   if($booking->starts_at->lt($expires))$expires=$booking->starts_at;
   if($expires->lt($now->addMinutes(5)))return $deny('El evento inicia el '.$event.'. Para pagar este apartado en línea deben quedar al menos 5 minutos. Revisa la fecha y hora o contacta al establecimiento.');
  }
  return ['available'=>true,'unavailable_reason'=>null,'expires_at'=>$expires->toIso8601String()];
 }
}
