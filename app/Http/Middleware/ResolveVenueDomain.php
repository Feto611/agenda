<?php
namespace App\Http\Middleware;
use Closure;use Illuminate\Http\Request;use Illuminate\Support\Facades\RateLimiter;use App\Models\{VenueDomain,VenuePhoto,DesignAsset};use App\Services\VenueDomains;
class ResolveVenueDomain {
 public function handle(Request $r,Closure $next){
  $domains=app(VenueDomains::class);$host=strtolower($r->getHost());
  if(in_array($host,$domains->canonicalHosts(),true))return $next($r);
  if(!config('domains.enabled',false)){if(app()->environment('production'))abort(404);return $next($r);}
  // Custom sites are anonymous public presentations. Authentication, checkout,
  // callbacks and owner APIs stay exclusively on the canonical portals.
  $site=VenueDomain::with('venue')->where('hostname',$host)->first();
  if(!$site){if(app()->environment('production'))abort(404);return $next($r);}
  abort_unless(config('portal.kind')==='client'&&$domains->generalEnabled(),404);
  if(!$r->isSecure())return redirect()->away('https://'.$site->hostname.$r->getRequestUri(),308);
  if(preg_match('~^\.well-known/encuentro-domain/([A-Za-z0-9]{64})$~',$r->path(),$m)){
   abort_unless($r->isMethod('GET')&&$domains->fresh($site->dns_verified_at)&&$site->venue?->published&&hash_equals($site->verification_token,$m[1]),404);
   return response('encuentro-domain:'.$site->verification_token,200,['Content-Type'=>'text/plain','Cache-Control'=>'no-store']);
  }
  abort_unless($domains->active($site),404);$venue=$site->venue;$r->setUserResolver(fn()=>null);
  $path=$r->path();$base='api/venues/'.$venue->slug;
  if($r->isMethod('GET')&&in_array($path,['/','local/'.$venue->slug],true)){
   return response()->view('app',['standalone'=>['venue'=>$venue->publicData(),'canonical_url'=>config('portal.customer_url').'/local/'.$venue->slug,'account_url'=>config('portal.customer_url').'/account','map'=>['tiles'=>config('encuentro.tile_url'),'attribution'=>config('encuentro.tile_attribution')]]])->header('Cache-Control','no-store, private');
  }
  if($r->isMethod('GET')&&$path===$base)return response()->json($venue->publicData());
  if(($r->isMethod('GET')&&$path===$base.'/availability')||($r->isMethod('POST')&&$path===$base.'/quote')){
   $kind=$r->isMethod('GET')?'availability':'quote';$key='standalone:'.$site->id.':'.$kind.':'.hash('sha256',(string)$r->ip());
   if(RateLimiter::tooManyAttempts($key,$kind==='quote'?60:30))return response()->json(['message'=>'Demasiadas consultas. Espera un momento.'],429)->header('Retry-After',(string)RateLimiter::availableIn($key));RateLimiter::hit($key,60);
   $c=app(\App\Http\Controllers\BookingController::class);$engine=app(\App\Services\BookingEngine::class);return response()->json($kind==='quote'?$c->quote($r,$venue,$engine):$c->availability($r,$venue,$engine));
  }
  if($r->isMethod('GET')&&preg_match('~^api/media/photos/([0-9]+)$~',$path,$m)){$photo=VenuePhoto::whereKey($m[1])->where('venue_id',$venue->id)->where('visible',true)->firstOrFail();return app(\App\Http\Controllers\MediaController::class)->photo($r,$photo);}
  if($r->isMethod('GET')&&preg_match('~^api/media/branding/([0-9]+)$~',$path,$m)){$asset=DesignAsset::whereKey($m[1])->where('venue_id',$venue->id)->firstOrFail();return app(\App\Http\Controllers\DesignAssetController::class)->image($r,$asset);}
  abort(404);
 }
}
