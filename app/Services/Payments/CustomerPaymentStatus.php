<?php
namespace App\Services\Payments;
use App\Models\CheckoutAttempt;
class CustomerPaymentStatus {
 public static function message(CheckoutAttempt $a):string {
  return match($a->status){
   'superseded'=>'Cambiaste el importe de este pago. Vuelve a Mis reservas para continuar con el intento actual.',
   'paid'=>'Tu pago se completó correctamente.',
   'failed'=>'El pago no se completó. Puedes intentar de nuevo o elegir otro método de pago.',
   'review'=>'Recibimos tu pago y el establecimiento está revisando tu reservación. Contacta al negocio para recibir ayuda.',
   'refunded'=>'Se registró la devolución del pago. Consulta los detalles con el establecimiento.',
   'partially_refunded'=>'Se registró una devolución parcial. Consulta tu saldo en Mis reservas.',
   'pending'=>$a->provider==='oxxo'?'Tu referencia está lista. La reserva se confirmará cuando recibamos tu pago.':((($a->checkout['card_submitted']??false)||!empty($a->checkout['capture_started_at']))?'Estamos procesando tu pago. El estado se actualizará automáticamente.':'Tu pago está listo para continuar.'),
   default=>$a->expires_at->isPast()?'Este intento necesita atención del establecimiento. Consulta tu reservación y contacta al negocio para recibir ayuda.':'Estamos comprobando el estado de tu pago automáticamente. Puedes volver a Mis reservas.'
  };
 }
}
