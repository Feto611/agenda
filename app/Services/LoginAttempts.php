<?php
namespace App\Services;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
class LoginAttempts {
 private function keys(Request $r):array {
  $base=config('portal.kind').':'.(string)$r->ip();
  return ['login-account:'.hash('sha256',$base.':'.mb_strtolower(trim((string)$r->input('email')))), 'login-network:'.hash('sha256',$base)];
 }
 public function blocked(Request $r):?\Illuminate\Http\JsonResponse {
  [$account,$network]=$this->keys($r);$seconds=0;
  foreach([[$account,5],[$network,60]] as [$key,$limit])if(RateLimiter::tooManyAttempts($key,$limit))$seconds=max($seconds,RateLimiter::availableIn($key));
  return $seconds?response()->json(['message'=>"Demasiados intentos fallidos. Espera {$seconds} segundos antes de volver a intentar.",'retry_after'=>$seconds],429)->header('Retry-After',(string)$seconds):null;
 }
 public function failed(Request $r):void {foreach($this->keys($r) as $key)RateLimiter::hit($key,60);}
 public function succeeded(Request $r):void {RateLimiter::clear($this->keys($r)[0]);}
}
