<?php
namespace App\Services;
use App\Models\Venue;
use Illuminate\Contracts\Encryption\DecryptException;
class VenueCredentials {
 public function read(Venue $venue,string $field):array {
  if(!in_array($field,['wifi_credentials','ai_key'],true))throw new \InvalidArgumentException('Campo de credencial no permitido.');
  try {
   $value=$venue->getAttribute($field);
   if($field==='wifi_credentials'&&$value!==null&&!is_array($value))return ['value'=>null,'unreadable'=>true];
   return ['value'=>$value,'unreadable'=>false];
  }catch(DecryptException $e){return ['value'=>null,'unreadable'=>true];}
 }
}
