<?php
namespace App\Services;
use App\Models\MetaConnection;use Illuminate\Support\Facades\{DB,Http};use Carbon\Carbon;
class MetaMessaging {
 public function receive(MetaConnection $c,array $payload):void {
 $expected=$c->channel==='whatsapp'?'whatsapp_business_account':($c->channel==='instagram'?'instagram':'page');if(($payload['object']??'')!==$expected)return;
 foreach(array_slice($payload['entry']??[],0,100) as $entry){
 if($c->channel==='whatsapp'){foreach($entry['changes']??[] as $change){$v=$change['value']??[];if((string)($v['metadata']['phone_number_id']??'')!==$c->account_id)continue;foreach($v['messages']??[] as $m){if(($m['type']??'')!=='text')continue;$this->inbound($c,(string)($m['from']??''),(string)($m['id']??''),(string)($m['text']['body']??''),(int)($m['timestamp']??0));}}}
 else {if((string)($entry['id']??'')!==$c->account_id)continue;foreach($entry['messaging']??[] as $m){if(!empty($m['message']['is_echo'])||(string)($m['recipient']['id']??'')!==$c->account_id)continue;$this->inbound($c,(string)($m['sender']['id']??''),(string)($m['message']['mid']??''),(string)($m['message']['text']??''),(int)floor(($m['timestamp']??0)/1000));}}
 }
 }
 private function inbound(MetaConnection $c,string $sender,string $id,string $text,int $timestamp):void {
 if(!preg_match('/^[0-9]{1,150}$/',$sender)||!$id||strlen($id)>200||!trim($text)||$timestamp<=0||$timestamp>now()->addMinutes(5)->timestamp)return;
 DB::transaction(function()use($c,$sender,$id,$text,$timestamp){$venue=$c->venue()->lockForUpdate()->firstOrFail();$t=DB::table('message_threads')->where('venue_id',$c->venue_id)->where('channel',$c->channel)->where('external_id',$sender)->first();if(!$t){$contact=DB::table('message_contacts')->insertGetId(['venue_id'=>$c->venue_id,'created_at'=>now(),'updated_at'=>now()]);$tid=DB::table('message_threads')->insertGetId(['venue_id'=>$c->venue_id,'message_contact_id'=>$contact,'meta_connection_id'=>$c->id,'channel'=>$c->channel,'external_id'=>$sender,'created_at'=>now(),'updated_at'=>now()]);$t=DB::table('message_threads')->find($tid);}if(DB::table('thread_messages')->where('message_thread_id',$t->id)->where('external_id',$id)->exists())return;
 $occurred=Carbon::createFromTimestampUTC($timestamp);app(ConversationService::class)->record($t,'in',mb_substr($text,0,700),null,'pending',$id,$occurred->toDateTimeString());$last=$t->last_inbound_at&&Carbon::parse($t->last_inbound_at)->gt($occurred)?$t->last_inbound_at:$occurred->toDateTimeString();DB::table('message_threads')->where('id',$t->id)->update(['last_inbound_at'=>$last,'updated_at'=>now()]);},3);
 }
 public function process(int $limit=50):int {
 $count=0;foreach(DB::table('thread_messages')->where('direction','in')->where('status','pending')->orderBy('id')->limit($limit)->get() as $m){
 if(!DB::table('thread_messages')->where('id',$m->id)->where('status','pending')->update(['status'=>'processing','updated_at'=>now()]))continue;
 $t=DB::table('message_threads')->find($m->message_thread_id);$c=$t?MetaConnection::find($t->meta_connection_id):null;$outId=null;
 try{
 if(!$c||!$c->enabled){$this->status($m->id,'stored');continue;}
 $v=$c->venue;$service=app(ConversationService::class);$chat=app(ChatService::class);
 if(!$v->published||$t->paused||!$c->auto_reply){$this->status($m->id,'stored');continue;}
 if(!$t->last_inbound_at||Carbon::parse($t->last_inbound_at)->lt(now()->subHours(24))){$this->status($m->id,'outside_window');continue;}
 // Bound automation cost independently of web guest quotas and ignore webhook retries.
 $daily=DB::table('thread_messages')->where('message_thread_id',$t->id)->where('direction','out')->where('created_at','>=',now()->startOfDay())->count();if($daily>=30){$this->status($m->id,'quota');continue;}
 if(preg_match('/^VINCULAR\s+([A-Z0-9]{24})$/i',trim($m->body),$matches)){$ok=$service->link($v,$t,$matches[1]);$facts=['topic'=>'link','text'=>$ok?'Listo. Vinculamos este canal a tu cuenta de reservas para continuar el hilo.':'El código no es válido o ha vencido. Genera otro desde tu cuenta en la web.'];$reply=$facts['text'];DB::table('thread_messages')->where('id',$m->id)->update(['body'=>'[Solicitud de vinculación]']);}
 else {$facts=$service->facts($v,$t,$m->body,$chat);$reply=$chat->answer($v,$facts)['reply'];}
 $outId=$service->record($t,'out',$reply,$facts['topic'],'sending');$result=$this->send($c,$t->external_id,$reply);DB::table('thread_messages')->where('id',$outId)->update(['status'=>'sent','external_id'=>$result,'updated_at'=>now()]);$this->status($m->id,'handled');$count++;
 }catch(\Throwable $e){if($outId)DB::table('thread_messages')->where('id',$outId)->update(['status'=>'unknown','updated_at'=>now()]);$this->status($m->id,'needs_review');}
 }return $count;
 }
 private function status(int $id,string $status):void {DB::table('thread_messages')->where('id',$id)->update(['status'=>$status,'updated_at'=>now()]);}
 public function send(MetaConnection $c,string $recipient,string $text):string {
 $k=$c->credentials;$version=$k['version']??'v26.0';if(!preg_match('/^v[0-9]{2}\.0$/',$version)||!preg_match('/^[0-9]+$/',$c->account_id)||!preg_match('/^[0-9]+$/',$recipient))throw new \RuntimeException('Configuración inválida');
 $host=$c->channel==='instagram'?'graph.instagram.com':'graph.facebook.com';$url='https://'.$host.'/'.$version.'/'.$c->account_id.'/messages';
 $body=$c->channel==='whatsapp'?['messaging_product'=>'whatsapp','to'=>$recipient,'type'=>'text','text'=>['body'=>mb_substr($text,0,4000)]]:['recipient'=>['id'=>$recipient],'message'=>['text'=>mb_substr($text,0,$c->channel==='instagram'?1000:2000)]];
 if($c->channel==='facebook')$body['messaging_type']='RESPONSE';
 $r=Http::withToken($k['access_token'])->acceptJson()->timeout(15)->connectTimeout(5)->withoutRedirecting()->post($url,$body)->throw()->json();$id=$r['messages'][0]['id']??$r['message_id']??null;if(!is_string($id)||!$id)throw new \RuntimeException('Resultado incierto');return $id;
 }
}
