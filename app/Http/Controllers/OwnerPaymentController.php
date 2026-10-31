<?php
namespace App\Http\Controllers;
use App\Models\{Venue,Booking,BookingPayment};use Illuminate\Http\Request;use Illuminate\Support\Facades\DB;use Illuminate\Support\Str;use Illuminate\Validation\ValidationException;
class OwnerPaymentController extends Controller {
 public function store(Request $r,Venue $venue,Booking $booking){
 abort_unless($venue->owner_account_id===$r->user()->id&&$booking->venue_id===$venue->id,403);
 $d=$r->validate(['amount'=>'required|integer|min:1|max:100000000','method'=>'required|in:cash,transfer,external','reference'=>'nullable|string|max:150','idempotency_key'=>'required|uuid']);
 return DB::transaction(function()use($r,$venue,$booking,$d){Venue::whereKey($venue->id)->lockForUpdate()->firstOrFail();$b=Booking::whereKey($booking->id)->lockForUpdate()->firstOrFail();$old=$b->payments()->where('idempotency_key',$d['idempotency_key'])->first();if($old)return $b->load('payments');
 abort_unless(in_array($b->status,['hold','confirmed']),422,'La reserva ya no admite pagos desde esta pantalla.');$paid=$b->payments()->sum('amount');
 if($d['amount']>$b->total-$paid)throw ValidationException::withMessages(['amount'=>'El pago supera el saldo pendiente.']);
 if($paid===0&&$d['amount']<$b->deposit)throw ValidationException::withMessages(['amount'=>'El primer pago debe cubrir al menos el anticipo acordado.']);
 if($b->status==='hold'){$conflict=$venue->bookings()->blocking()->where('id','!=',$b->id)->where('blocked_from','<',$b->blocked_until)->where('blocked_until','>',$b->blocked_from)->exists();abort_if($conflict,422,'El horario ya fue ocupado por otra reserva. No registres el cobro sin resolver ese conflicto.');}
 $payment=BookingPayment::create(['id'=>(string)Str::uuid(),'booking_id'=>$b->id,'recorded_by'=>$r->user()->user_id,'recorded_by_owner_id'=>$r->user()->id,'amount'=>$d['amount'],'method'=>$d['method'],'reference'=>$d['reference']??null,'idempotency_key'=>$d['idempotency_key']]);$b->update(['status'=>'confirmed','expires_at'=>null]);app(\App\Services\Email\PaymentEmails::class)->enqueue($b,$payment);return $b->fresh()->load('payments');},3);
 }
}
