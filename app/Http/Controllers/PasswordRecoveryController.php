<?php
namespace App\Http\Controllers;
use App\Models\{Owner,User};use Illuminate\Http\Request;use Illuminate\Support\Facades\{DB,Hash,Mail,RateLimiter,Log};use Illuminate\Support\Str;use Illuminate\Validation\Rules\Password;
class PasswordRecoveryController extends Controller {
 private function identity(Request $r):array{$d=$r->validate(['email'=>'required|email|max:254']);$email=mb_strtolower(trim($d['email']));$owner=config('portal.kind')==='owner';return [$email,$owner,hash('sha256',($owner?'owner:':'client:').$email)];}
 private function account(string $email,bool $owner){return ($owner?Owner::query()->where('activated',true):User::query()->where('account_type','customer'))->whereRaw('LOWER(email) = ?',[$email])->get();}
 public function forgot(Request $r){[$email,$owner,$key]=$this->identity($r);$message='Si existe una cuenta con ese correo, recibirás un enlace para cambiar tu contraseña. Revisa también la carpeta de spam.';
 abort_unless(app()->environment('testing')||!in_array(config('mail.default'),['log','array','failover'],true),503,'El correo de recuperación aún no está configurado. Contacta al administrador.');
 $base=rtrim(config($owner?'portal.owner_url':'portal.customer_url'),'/');if(!app()->environment(['local','testing']))abort_unless(str_starts_with($base,'https://'),503,'Configura el dominio HTTPS del portal para recuperar contraseñas.');
 if(RateLimiter::tooManyAttempts('recovery:'.$key,1))return ['message'=>$message];RateLimiter::hit('recovery:'.$key,60);
 if(RateLimiter::tooManyAttempts('recovery-hour:'.$key,3))return ['message'=>$message];
 $token=Str::random(64);$hash=hash('sha256',$token);
 $created=DB::transaction(function()use($email,$owner,$key,$hash){
  $accounts=($owner?Owner::query()->where('activated',true):User::query()->where('account_type','customer'))->whereRaw('LOWER(email) = ?',[$email])->lockForUpdate()->get();
  if($accounts->count()!==1)return false;
  $row=DB::table('account_recovery_tokens')->where('key',$key)->first();
  // Keep the already-delivered link valid; repeated anonymous requests cannot revoke it.
  if($row&&now()->subMinutes(30)->lt($row->created_at))return false;
  DB::table('account_recovery_tokens')->updateOrInsert(['key'=>$key],['token_hash'=>$hash,'created_at'=>now()]);return true;
 },3);
 if(!$created)return ['message'=>$message];RateLimiter::hit('recovery-hour:'.$key,3600);
 $url=$base.($owner?'/gestion':'/recuperar').'#restablecer='.rawurlencode($token).'&correo='.rawurlencode($email);
 try{$account=$this->account($email,$owner)->first();app(\App\Services\Email\EmailDesigns::class)->sendAccess('recovery',$email,$account?->name??'Cliente',$url,'El enlace vence en 30 minutos y solo puede utilizarse una vez. Pedir otro durante su vigencia no lo reemplaza.');}catch(\Throwable $e){DB::table('account_recovery_tokens')->where('key',$key)->where('token_hash',$hash)->delete();Log::warning('No se pudo entregar un correo de recuperación. Revisa la configuración del correo global.');}
 return ['message'=>$message];
 }
 public function reset(Request $r){[$email,$owner,$key]=$this->identity($r);$d=$r->validate(['token'=>'required|string|size:64','password'=>['required','confirmed',Password::min($owner?12:10)->letters()->numbers()]]);
 DB::transaction(function()use($email,$owner,$key,$d){$accounts=($owner?Owner::query()->where('activated',true):User::query()->where('account_type','customer'))->whereRaw('LOWER(email) = ?',[$email])->lockForUpdate()->get();$row=DB::table('account_recovery_tokens')->where('key',$key)->lockForUpdate()->first();abort_unless($row&&now()->subMinutes(30)->lt($row->created_at)&&hash_equals($row->token_hash,hash('sha256',$d['token'])),422,'El enlace no es válido o ha vencido. Solicita uno nuevo.');abort_unless($accounts->count()===1,422,'El enlace no es válido o ha vencido. Solicita uno nuevo.');$account=$accounts->first();$account->forceFill(['password'=>Hash::make($d['password']),'remember_token'=>Str::random(60),'password_reset_at'=>now()])->save();DB::table('account_recovery_tokens')->where('key',$key)->delete();});
 return ['message'=>'Contraseña actualizada. Inicia sesión con tu nueva contraseña.'];
 }
}
