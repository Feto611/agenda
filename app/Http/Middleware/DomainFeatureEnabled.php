<?php
namespace App\Http\Middleware;
use Closure;
use Illuminate\Http\Request;
class DomainFeatureEnabled {
 public function handle(Request $request,Closure $next){
  abort_unless(config('domains.enabled',false),404);
  return $next($request);
 }
}
