<?php
namespace App\Services;
class ReservationPolicy {
 const VERSION='2026-10-28';
 const TEXT='Los pagos de la reservación, incluidos anticipos y servicios adicionales, no son reembolsables por cancelación del cliente o inasistencia. Se respetan los derechos y las excepciones que establezca la legislación aplicable.';
 public static function acceptance():array{return ['version'=>self::VERSION,'text'=>self::TEXT,'accepted_at'=>now()->toIso8601String()];}
}
