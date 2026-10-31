<?php
namespace App\Http\Middleware;
use Closure;use Illuminate\Http\Request;use App\Models\{Owner,User};
class RequirePortal {public function handle(Request $r,Closure $next,string $kind){if(config('portal.kind')!==$kind){abort($r->user()?403:404,'Este acceso pertenece a otro portal.');}if($kind==='owner'&&$r->user()&&!($r->user() instanceof Owner))abort(403);if($kind==='client'&&$r->user()&&!($r->user() instanceof User))abort(403);return $next($r);}}
