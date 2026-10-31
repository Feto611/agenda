<?php
namespace App\Services\Payments;
use App\Models\CheckoutAttempt;
use Illuminate\Support\Facades\DB;
class PaymentSync {
 public function sync(CheckoutAttempt $attempt,GatewayDriver $driver,PaymentService $payments):CheckoutAttempt {
  if(in_array($attempt->status,['paid','failed','review','refunded','partially_refunded','superseded'],true))return $attempt;
  $locked=DB::table('checkout_attempts')->where('id',$attempt->id)->where(fn($q)=>$q->whereNull('sync_locked_until')->orWhere('sync_locked_until','<',now()))->where(fn($q)=>$q->whereNull('last_sync_at')->orWhere('last_sync_at','<=',now()->subSeconds(30)))->update(['sync_locked_until'=>now()->addSeconds(90),'last_sync_at'=>now(),'sync_attempts'=>DB::raw('sync_attempts + 1')]);
  if(!$locked)return $attempt->fresh();
  try{
   $a=$attempt->fresh();
   if($a->provider==='paypal'&&!$a->external_id&&in_array($a->status,['creating','unknown'],true)&&$a->expires_at->isFuture()&&$a->created_at->gt(now()->subMinutes(15))&&$a->sync_attempts<=3){
    // Resume creation with the SAME request ID. This never approves or captures money.
    if($a->status==='creating'&&$a->created_at->gt(now()->subSeconds(30)))return $a;
    $data=$driver->create($a);$a->refresh();if(!$a->external_id&&!$a->paid_transaction_id){$diagnostic=$a->provider_error;if($diagnostic)$diagnostic['resolved_at']=now()->toIso8601String();$a->update(['external_id'=>$data['external_id'],'checkout'=>$data['checkout'],'status'=>'pending','review_reason'=>null,'provider_error'=>$diagnostic]);}return $a->fresh();
   }
   $ids=[];
   if($a->provider==='mercadopago'){$id=$a->checkout['payment_id']??null;if($id)$ids=[$id];else $ids=array_slice($driver->findMercadoPayments($a),0,2);}
   elseif($a->external_id)$ids=[$a->external_id];
   foreach($ids as $id){$data=$driver->read($a->account,(string)$id);abort_unless($data['reference']===$a->id,422);$payments->settle($a->account,$data);if(!$data['paid']&&$a->provider==='paypal'&&in_array($data['provider_status']??'',['CREATED','SAVED','APPROVED','PAYER_ACTION_REQUIRED'],true))CheckoutAttempt::whereKey($a->id)->where('status','unknown')->whereNull('paid_transaction_id')->update(['status'=>'pending']);}
   return $a->fresh();
  }catch(\Throwable $e){$a=$attempt->fresh();app(PaymentFailure::class)->record($a,$e,'sync');if(!$a->external_id&&$a->provider==='paypal'&&app(PaymentFailure::class)->rejected($e)&&!$a->paid_transaction_id)$a->update(['status'=>'failed','review_reason'=>'No se pudo iniciar el pago.']);return $a->fresh();}
  finally{DB::table('checkout_attempts')->where('id',$attempt->id)->update(['sync_locked_until'=>null]);}
 }
}
