<?php
namespace App\Services\Email;
use App\Models\{VenueMailAccount,MailNotification};use Illuminate\Support\Facades\Http;use Illuminate\Mail\MailManager;
class EmailDriver {
 public function send(VenueMailAccount $account,MailNotification $notification):string {
 $p=$notification->payload;$c=$account->credentials;$from=$account->from_name.' <'.$account->from_email.'>';
 if($account->provider==='resend'){$response=Http::withToken($c['api_key'])->withHeaders(['Idempotency-Key'=>'reservation-payment/'.$notification->id])->acceptJson()->timeout(15)->connectTimeout(5)->withoutRedirecting()->post('https://api.resend.com/emails',['from'=>$from,'to'=>[$p['to']],'subject'=>$p['subject'],'html'=>$p['html'],'text'=>$p['text']]+($account->reply_to?['reply_to'=>$account->reply_to]:[]));$response->throw();$id=$response->json('id');}
 elseif($account->provider==='postmark'){$response=Http::withHeaders(['X-Postmark-Server-Token'=>$c['api_key']])->acceptJson()->timeout(15)->connectTimeout(5)->withoutRedirecting()->post('https://api.postmarkapp.com/email',['From'=>$from,'To'=>$p['to'],'Subject'=>$p['subject'],'HtmlBody'=>$p['html'],'TextBody'=>$p['text'],'MessageStream'=>'outbound','Metadata'=>['notification_id'=>$notification->id]]+($account->reply_to?['ReplyTo'=>$account->reply_to]:[]));$response->throw();if($response->json('ErrorCode')!==0)throw new \RuntimeException('Proveedor rechazó el correo.');$id=$response->json('MessageID');}
 elseif($account->provider==='smtp'){
 abort_unless(in_array($c['host']??'',config('notifications.smtp_hosts'),true)&&in_array((int)($c['port']??0),[465,587],true),422,'Servidor SMTP no autorizado.');
 $mailer=app(MailManager::class)->build(['transport'=>'smtp','scheme'=>(int)$c['port']===465?'smtps':'smtp','host'=>$c['host'],'port'=>(int)$c['port'],'username'=>$c['username'],'password'=>$c['password'],'timeout'=>15,'auto_tls'=>true,'require_tls'=>true]);
 $sent=$mailer->html($p['html'],function($m)use($p,$account,$notification){$m->from($account->from_email,$account->from_name)->to($p['to'])->subject($p['subject']);if($account->reply_to)$m->replyTo($account->reply_to);$m->getSymfonyMessage()->text($p['text']);$m->getSymfonyMessage()->getHeaders()->addTextHeader('X-Encuentro-Notification',$notification->id);});$id=$sent?->getMessageId();
 }else throw new \RuntimeException('Proveedor desconocido.');
 if(!is_string($id)||!$id||strlen($id)>200)throw new \RuntimeException('Resultado de envío incierto.');return $id;
 }
}
