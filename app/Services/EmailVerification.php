<?php
namespace App\Services;
use App\Models\{User,Owner};
use Illuminate\Support\Facades\{Crypt,DB,Log,Mail,RateLimiter};
use Illuminate\Support\Str;
class EmailVerification {
 public function key(User|Owner $actor):string{return hash('sha256',($actor instanceof Owner?'owner:':'client:').$actor->id);}
 public function send(User|Owner $actor):array {
  if($actor->email_verified_at)return ['message'=>'Tu correo ya está verificado.','verified'=>true,'retry_after'=>0];
  $key=$this->key($actor);$limit='email-verification:'.$key;
  if(RateLimiter::tooManyAttempts($limit,1))return ['message'=>'Revisa tu correo y la carpeta de spam. El enlace anterior sigue siendo válido.','retry_after'=>RateLimiter::availableIn($limit)];
  $base=rtrim(config($actor instanceof Owner?'portal.owner_url':'portal.customer_url'),'/');
  abort_unless(app()->environment(['local','testing'])||str_starts_with($base,'https://'),503,'No se pudo enviar la verificación. Contacta al establecimiento.');
  abort_unless(app()->environment('testing')||!in_array(config('mail.default'),['log','array','failover']),503,'No se pudo enviar la verificación. Contacta al establecimiento.');
  if(RateLimiter::tooManyAttempts($limit.':hour',5))return ['message'=>'Revisa el último enlace recibido. Podrás solicitar otro más tarde.','retry_after'=>RateLimiter::availableIn($limit.':hour')];
  RateLimiter::hit($limit,60);RateLimiter::hit($limit.':hour',3600);
  $row=DB::transaction(function()use($actor,$key){
   $a=$actor->newQuery()->whereKey($actor->id)->lockForUpdate()->firstOrFail();if($a->email_verified_at)return null;
   $row=DB::table('account_email_tokens')->where('key',$key)->first();
   if(!$row||$row->email!==$a->email||now()->subHour()->gte($row->created_at)){
    $token=Str::random(64);$values=['email'=>$a->email,'token_hash'=>hash('sha256',$token),'token_secret'=>Crypt::encryptString($token),'created_at'=>now(),'sent_at'=>null];
    DB::table('account_email_tokens')->updateOrInsert(['key'=>$key],$values);$row=DB::table('account_email_tokens')->where('key',$key)->first();
   }
   if($row->sent_at&&now()->subMinute()->lt($row->sent_at))return null;
   DB::table('account_email_tokens')->where('key',$key)->update(['sent_at'=>now()]);return $row;
  },3);
  if(!$row)return ['message'=>'Revisa el enlace enviado a tu correo.','retry_after'=>60];
  $token=Crypt::decryptString($row->token_secret);$url=$base.($actor instanceof Owner?'/gestion':'/verificar').'#verificar='.$token.'&cuenta='.$actor->id;
  try{app(\App\Services\Email\EmailDesigns::class)->sendAccess('verification',$row->email,$actor->name,$url,'El enlace vence una hora después de su emisión original. Reenviarlo no invalida el anterior. Solo puede usarse una vez.');
  }catch(\Throwable $e){DB::table('account_email_tokens')->where('key',$key)->where('token_hash',$row->token_hash)->update(['sent_at'=>null]);Log::warning('No se pudo entregar la verificación de correo.');abort(503,'No se pudo enviar la verificación. Intenta más tarde o contacta al establecimiento.');}
  return ['message'=>'Enviamos el enlace de verificación a tu correo. Revisa también spam.','retry_after'=>60];
 }
 public function confirm(int $id,string $token,bool $owner):void {
  DB::transaction(function()use($id,$token,$owner){
   $actor=($owner?Owner::query():User::query()->where('account_type','customer'))->whereKey($id)->lockForUpdate()->first();
   abort_unless($actor&&(!$owner||$actor->activated),422,'El enlace no es válido o ha vencido.');$key=$this->key($actor);$row=DB::table('account_email_tokens')->where('key',$key)->lockForUpdate()->first();
   abort_unless($row&&$row->email===$actor->email&&now()->subHour()->lt($row->created_at)&&hash_equals($row->token_hash,hash('sha256',$token)),422,'El enlace no es válido o ha vencido.');
   $actor->forceFill(['email_verified_at'=>now()])->save();DB::table('account_email_tokens')->where('key',$key)->delete();
  },3);
 }
}
