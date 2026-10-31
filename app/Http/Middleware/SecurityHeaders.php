<?php
namespace App\Http\Middleware;
use Closure;use Illuminate\Http\Request;
class SecurityHeaders {
 public function handle(Request $r,Closure $next){
  $nonce=base64_encode(random_bytes(24));\Illuminate\Support\Facades\Vite::useCspNonce($nonce);$response=$next($r);
  $response->headers->set('X-Encuentro-Portal',(string)config('portal.kind'));
  $response->headers->set('X-Content-Type-Options','nosniff');
  $response->headers->set('X-Frame-Options','SAMEORIGIN');
  $response->headers->set('Referrer-Policy',$r->has('restablecer')?'no-referrer':'strict-origin-when-cross-origin');
  $response->headers->set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  $response->headers->remove('X-Powered-By');
  if($r->is('api/*')){$response->headers->set('Cache-Control','no-store, private');$response->headers->set('Pragma','no-cache');}
  // Vite HMR is available only in local development; production permits only authorized inline scripts via nonce, never eval.
  $configuredUrl=config('portal.kind')==='owner'?config('portal.owner_url'):config('portal.customer_url');$wsScheme=$r->isSecure()||parse_url((string)$configuredUrl,PHP_URL_SCHEME)==='https'?'wss':'ws';$wsOrigin=$wsScheme.'://'.$r->getHttpHost();
  $paymentSources=config('portal.kind')==='client'?' https://*.paypal.com https://*.paypalobjects.com https://sdk.mercadopago.com https://*.mercadopago.com https://*.mercadopago.com.mx https://*.mercadolibre.com https://*.mercadolibre.com.mx https://*.mlstatic.com':'';
  if(!app()->environment('local'))$response->headers->set('Content-Security-Policy',"default-src 'self'; script-src 'self' 'nonce-{$nonce}'{$paymentSources}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' https: data: blob:; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' {$wsOrigin}{$paymentSources}; frame-src 'self'{$paymentSources}; frame-ancestors 'self'; object-src 'none'; base-uri 'none'; form-action 'self'");
  if($r->isSecure())$response->headers->set('Strict-Transport-Security','max-age=31536000');
  return $response;
 }
}
