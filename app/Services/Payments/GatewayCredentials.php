<?php
namespace App\Services\Payments;
use App\Models\GatewayAccount;
use Illuminate\Contracts\Encryption\DecryptException;
class GatewayCredentials {
 public function read(GatewayAccount $account):array {
  try{$value=$account->credentials;return is_array($value)?['value'=>$value,'unreadable'=>false]:['value'=>[],'unreadable'=>true];}
  catch(DecryptException $e){return ['value'=>[],'unreadable'=>true];}
 }
 public static function required(string $provider):array{return match($provider){'paypal'=>['client_id','client_secret','merchant_id','webhook_id'],'mercadopago'=>['access_token','webhook_secret','merchant_id'],'oxxo'=>['private_key','webhook_public_key'],default=>[]};}
 public function usable(GatewayAccount $account):bool{$state=$this->read($account);if($state['unreadable'])return false;foreach(self::required($account->provider) as $key)if(!filled($state['value'][$key]??null))return false;return true;}
 public function require(GatewayAccount $account,bool $complete=false):array {
  $state=$this->read($account);
  abort_if($state['unreadable'],422,'La configuración de esta pasarela no puede leerse. El establecimiento debe recuperar o reemplazar sus credenciales antes de continuar.');
  if($complete)foreach(self::required($account->provider) as $key)abort_unless(filled($state['value'][$key]??null),422,'La pasarela tiene una configuración incompleta. Contacta al establecimiento.');
  return $state['value'];
 }
}
