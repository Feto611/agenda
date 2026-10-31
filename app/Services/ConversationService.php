<?php
namespace App\Services;
use App\Models\Venue;use Illuminate\Support\Facades\DB;
class ConversationService {
 public function webThread(Venue $v,string $actor,?int $userId=null):object {
 return DB::transaction(function()use($v,$actor,$userId){Venue::whereKey($v->id)->lockForUpdate()->firstOrFail();$thread=DB::table('message_threads')->where('venue_id',$v->id)->where('channel','web')->where('external_id',$actor)->first();if($thread)return $thread;
 $contact=$userId?DB::table('message_contacts')->where('venue_id',$v->id)->where('user_id',$userId)->first():null;
 $contactId=$contact?->id??DB::table('message_contacts')->insertGetId(['venue_id'=>$v->id,'user_id'=>$userId,'created_at'=>now(),'updated_at'=>now()]);
 $id=DB::table('message_threads')->insertGetId(['venue_id'=>$v->id,'message_contact_id'=>$contactId,'channel'=>'web','external_id'=>$actor,'created_at'=>now(),'updated_at'=>now()]);return DB::table('message_threads')->find($id);},3);
 }
 public function facts(Venue $v,object $thread,string $text,ChatService $chat):array {
 // Only use the category of prior verified replies as context, never treat external chat text as model instructions.
 $direct=$chat->facts($v,$text);if(in_array($direct['topic'],['outside','welcome'])&&preg_match('/^(y |¿?y |eso|esos|esas|cu[aá]nto|cu[aá]les|s[ií]|m[aá]s|dime m[aá]s|contin[uú]a)/ui',trim($text))){$ids=DB::table('message_threads')->where('venue_id',$v->id)->where('message_contact_id',$thread->message_contact_id)->pluck('id');$last=DB::table('thread_messages')->whereIn('message_thread_id',$ids)->where('direction','out')->whereNotNull('topic')->whereNotIn('topic',['outside','welcome','link'])->latest('id')->first();$hints=['prices'=>'precios','hours'=>'horarios','location'=>'ubicación','capacity'=>'capacidad','rules'=>'reglas','availability'=>'disponibilidad','contact'=>'contacto'];if($last&&isset($hints[$last->topic]))$text.=' '.$hints[$last->topic];}
 return $chat->facts($v,$text);
 }
 public function record(object $thread,string $direction,string $body,?string $topic=null,string $status='received',?string $externalId=null,?string $occurred=null):int {
 DB::table('message_threads')->where('id',$thread->id)->update(['updated_at'=>now()]);return DB::table('thread_messages')->insertGetId(['message_thread_id'=>$thread->id,'external_id'=>$externalId,'direction'=>$direction,'body'=>mb_substr($body,0,5000),'topic'=>$topic,'status'=>$status,'occurred_at'=>$occurred??now(),'created_at'=>now(),'updated_at'=>now()]);
 }
 public function link(Venue $v,object $thread,string $code):bool {
 return DB::transaction(function()use($v,$thread,$code){Venue::whereKey($v->id)->lockForUpdate()->firstOrFail();$link=DB::table('contact_links')->where('token_hash',hash('sha256',strtoupper(trim($code))))->lockForUpdate()->first();if(!$link||$link->used_at||now()->gte($link->expires_at))return false;$contact=DB::table('message_contacts')->where('id',$link->message_contact_id)->where('venue_id',$v->id)->first();if(!$contact)return false;$old=DB::table('message_contacts')->find($thread->message_contact_id);if($old?->user_id&&$old->id!==$contact->id)return false;DB::table('message_threads')->where('venue_id',$v->id)->where('message_contact_id',$thread->message_contact_id)->update(['message_contact_id'=>$contact->id,'updated_at'=>now()]);DB::table('contact_links')->where('id',$link->id)->update(['used_at'=>now()]);return true;},3);
 }
}
