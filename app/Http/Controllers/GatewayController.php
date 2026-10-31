<?php
namespace App\Http\Controllers;
use App\Models\{GatewayAccount,Venue,CheckoutAttempt};
use App\Services\Payments\GatewayCredentials;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
class GatewayController extends Controller {
 private function own(Request $r,Venue $v){abort_unless($v->owner_account_id===$r->user()->id,403);}
 private function display(GatewayAccount $g):array {
  $reader=app(GatewayCredentials::class);$state=$reader->read($g);$credentials=$state['value'];
  return ['provider'=>$g->provider,'enabled'=>$g->enabled,'sandbox'=>$g->sandbox,'unreadable'=>$state['unreadable'],'usable'=>$reader->usable($g),
   'credential_warning'=>$state['unreadable']?'No se pueden descifrar las credenciales guardadas. Los datos originales se conservan. Restaura la clave de cifrado anterior en el servidor o confirma su reemplazo y vuelve a introducir todas las credenciales.':null,
   'public_fields'=>array_intersect_key($credentials,array_flip(['client_id','merchant_id','webhook_id','public_key'])),
   'configured_keys'=>array_keys(array_filter($credentials,fn($v)=>filled($v))),
   'webhook_url'=>config('portal.customer_url').'/api/payments/webhooks/'.$g->venue->slug.'/'.$g->provider.'/'.$g->id];
 }
 public function index(Request $r,Venue $venue){$this->own($r,$venue);return GatewayAccount::where('venue_id',$venue->id)->where('current',true)->get()->map(fn($g)=>$this->display($g));}
 public function diagnostics(Request $r,Venue $venue,string $provider){$this->own($r,$venue);abort_unless(in_array($provider,['paypal','mercadopago','oxxo'],true),404);return ['attempts'=>CheckoutAttempt::whereHas('booking',fn($q)=>$q->where('venue_id',$venue->id))->where('provider',$provider)->whereNotNull('provider_error')->with('account:id,sandbox')->latest('updated_at')->limit(10)->get()->map(fn($a)=>['id'=>$a->id,'booking_id'=>$a->booking_id,'status'=>$a->status,'sandbox'=>$a->account->sandbox,'diagnostic'=>$a->provider_error])->values()];}
 public function update(Request $r,Venue $venue,string $provider){
  $this->own($r,$venue);abort_unless(in_array($provider,['paypal','mercadopago','oxxo']),404);
  $d=$r->validate(['enabled'=>'required|boolean','sandbox'=>'required|boolean','credentials'=>'present|array','credentials.*'=>'nullable|string|max:6000','clear'=>'sometimes|array','clear.*'=>'string','replace'=>'sometimes|boolean']);
  return DB::transaction(function()use($venue,$provider,$d){
   Venue::whereKey($venue->id)->lockForUpdate()->firstOrFail();
   $g=GatewayAccount::where('venue_id',$venue->id)->where('provider',$provider)->where('current',true)->lockForUpdate()->first();
   $reader=app(GatewayCredentials::class);$state=$g?$reader->read($g):['value'=>[],'unreadable'=>false];$replace=(bool)($d['replace']??false);
   if($state['unreadable']&&!$replace){
    // Disabling must not deserialize or rewrite the encrypted column.
    if(!$d['enabled']&&$d['sandbox']===$g->sandbox&&!array_filter($d['credentials'],fn($v)=>filled($v))&&empty($d['clear'])){
     DB::table('gateway_accounts')->where('id',$g->id)->update(['enabled'=>false,'updated_at'=>now()]);return $this->display($g->fresh());
    }
    abort(422,'No se pueden leer las credenciales existentes. Marca «Reemplazar credenciales» e introduce todos los datos de la pasarela, o recupera la clave anterior en el servidor.');
   }
   $allowed=match($provider){'paypal'=>['client_id','client_secret','merchant_id','webhook_id'],'mercadopago'=>['access_token','webhook_secret','merchant_id','public_key'],'oxxo'=>['private_key','webhook_public_key']};
   $incoming=array_intersect_key($d['credentials'],array_flip($allowed));
   $identityChanged=$g&&($g->sandbox!==$d['sandbox']||(filled($incoming['merchant_id']??null)&&($state['value']['merchant_id']??null)!==$incoming['merchant_id']));
   $hasAttempts=$g&&CheckoutAttempt::where('gateway_account_id',$g->id)->exists();
   $credentials=($state['unreadable']||($hasAttempts&&$identityChanged))?[]:$state['value'];
   foreach($incoming as $key=>$value)if(filled($value))$credentials[$key]=trim($value);
   foreach($d['clear']??[] as $key)if(in_array($key,$allowed,true))unset($credentials[$key]);
   if($provider==='paypal'&&filled($credentials['merchant_id']??null))abort_unless(preg_match('/^[2-9A-HJ-NP-Z]{13}$/',$credentials['merchant_id']),422,'El Merchant ID de PayPal debe ser el identificador de 13 caracteres de tu cuenta, no el nombre de la aplicación.');
   if($d['enabled']||$state['unreadable'])foreach(GatewayCredentials::required($provider) as $field)abort_unless(filled($credentials[$field]??null),422,'Falta configurar: '.$field);
   $before=$state['value'];$after=$credentials;ksort($before);ksort($after);
   $version=$g&&($state['unreadable']||($hasAttempts&&($identityChanged||$before!==$after)));
   if($version){
    // Keep the old ciphertext and account ID for existing orders and key recovery.
    DB::table('gateway_accounts')->where('id',$g->id)->update(['enabled'=>false,'current'=>false,'updated_at'=>now()]);
    $g=null;
   }
   $g??=new GatewayAccount(['venue_id'=>$venue->id,'provider'=>$provider,'current'=>true]);
   $g->fill(['enabled'=>$d['enabled'],'sandbox'=>$d['sandbox'],'credentials'=>$credentials])->save();
   return $this->display($g);
  },3);
 }
}
