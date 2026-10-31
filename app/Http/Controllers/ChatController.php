<?php
namespace App\Http\Controllers;
use App\Models\Venue;use App\Services\{ChatService,ConversationService};use Illuminate\Http\Request;use Illuminate\Support\Facades\DB;use Illuminate\Support\Str;
class ChatController extends Controller {
 public function send(Request $r,Venue $venue,ChatService $chat){
 abort_unless($venue->published,404);abort_if(($venue->design['show_chat']??true)===false,423,'El asistente web está deshabilitado para este establecimiento.');$d=$r->validate(['message'=>'required|string|max:700','conversation'=>'required|uuid']);$isGuest=!$r->user();
 if(!$r->session()->has('chat_actor'))$r->session()->put('chat_actor',(string)Str::uuid());
 $actor=$isGuest?'g:'.hash('sha256',$r->session()->get('chat_actor')):($r->user() instanceof \App\Models\Owner?'o:':'u:').$r->user()->id;
 $ip=hash_hmac('sha256',(string)$r->ip(),config('app.key'));$day=now($venue->settings['timezone'])->toDateString();$ai=$venue->settings['ai'];
 $history=app(ConversationService::class);$thread=$history->webThread($venue,$actor,$r->user() instanceof \App\Models\User?$r->user()->id:null);abort_if($thread->paused,423,'El asistente está pausado. Contacta directamente al establecimiento.');$facts=$history->facts($venue,$thread,$d['message'],$chat);$reserve=$ai['provider']==='rules'||$facts['topic']==='outside'?0:$ai['max_tokens']+1500;
 $quota=DB::transaction(function()use($venue,$actor,$ip,$day,$d,$isGuest,$ai,$reserve){
 Venue::whereKey($venue->id)->lockForUpdate()->firstOrFail();
 $base=DB::table('chat_conversations')->where('venue_id',$venue->id)->where('day',$day);
 $rows=($isGuest?(clone $base)->where('ip_hash',$ip)->where('actor','like','g:%'):(clone $base)->where('actor',$actor))->get();
 $used=$rows->sum('messages');$tokens=$rows->sum('tokens');$threads=[];foreach($rows as $row)$threads=array_merge($threads,json_decode($row->threads,true)?:[]);$threads=array_unique($threads);
 $limit=$isGuest?$ai['guest_messages']:$ai['member_messages'];$tokenLimit=$isGuest?$ai['guest_tokens']:$ai['member_messages']*($ai['max_tokens']+1500);
 if($used>=$limit||($isGuest&&!in_array($d['conversation'],$threads)&&count($threads)>=$ai['guest_conversations'])||($reserve>0&&$tokens+$reserve>$tokenLimit))abort(429,$isGuest?'Alcanzaste el límite diario de visitante. Crea tu cuenta o vuelve mañana.':'Alcanzaste el límite diario del asistente.');
 $own=(clone $base)->where('actor',$actor)->first();$ownThreads=$own?json_decode($own->threads,true):[];$ownThreads[]= $d['conversation'];$values=['ip_hash'=>$ip,'messages'=>($own->messages??0)+1,'tokens'=>($own->tokens??0)+$reserve,'threads'=>json_encode(array_values(array_unique($ownThreads))),'updated_at'=>now()];
 if($own)DB::table('chat_conversations')->where('id',$own->id)->update($values);else{$values+=['venue_id'=>$venue->id,'actor'=>$actor,'day'=>$day,'created_at'=>now()];$id=DB::table('chat_conversations')->insertGetId($values);$own=(object)['id'=>$id];}
 return ['id'=>$own->id,'remaining'=>$limit-$used-1];
 },3);
 $history->record($thread,'in',$d['message']);$answer=$chat->answer($venue,$facts);$history->record($thread,'out',$answer['reply'],$facts['topic'],'sent');
 // Presupuesto conservador reservado antes de consultar: no se devuelve automáticamente para limitar gasto incluso si falta usage.
 return array_merge($answer,['remaining'=>$quota['remaining'],'guest'=>$isGuest]);
 }
}
