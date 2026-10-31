<?php
namespace App\Http\Middleware;
use Closure;use Illuminate\Http\Request;
class RequireVerifiedEmail {
 public function handle(Request $r,Closure $next){if(!$r->user()?->email_verified_at)return response()->json(['message'=>'Verifica tu correo antes de continuar. Usa el enlace de verificación de tu cuenta.','code'=>'email_verification_required'],403);return $next($r);}
}
