<?php
namespace App\Http\Controllers;
use Illuminate\Http\Request;use Illuminate\Support\Facades\Broadcast;use App\Models\{Owner,User};
class RealtimeAuthController extends Controller {
 public function __invoke(Request $r){abort_unless(config('realtime.enabled'),503);$r->validate(['socket_id'=>['required','string','regex:/^[0-9]+\.[0-9]+$/','max:100'],'channel_name'=>['required','string','regex:/^private-(owner|customer)\.[0-9]+$/','max:120']]);$actor=$r->user();$kind=config('portal.kind');abort_unless($actor&&($kind==='owner'?$actor instanceof Owner&&$actor->activated:$actor instanceof User&&User::whereKey($actor->id)->where('account_type','customer')->exists()),403);$expected='private-'.($kind==='owner'?'owner':'customer').'.'.$actor->id;abort_unless(hash_equals($expected,$r->input('channel_name')),403);$broadcaster=Broadcast::connection('reverb');$broadcaster->channel(($kind==='owner'?'owner':'customer').'.{id}',fn($user,$id)=>$user->id===(int)$id,['guards'=>[$kind==='owner'?'owner':'web']]);return $broadcaster->auth($r);}
}
