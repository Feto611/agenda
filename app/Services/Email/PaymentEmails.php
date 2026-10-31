<?php
namespace App\Services\Email;
use App\Models\{Booking,BookingPayment,MailNotification,VenueMailAccount};use Illuminate\Support\Facades\DB;use Illuminate\Support\Str;use Illuminate\Http\Client\RequestException;
class PaymentEmails {
 public function enqueue(Booking $booking,BookingPayment $payment):void {
 if($payment->amount<=0||$booking->status!=='confirmed'||$booking->payment_attention)return;
 if(MailNotification::where('booking_payment_id',$payment->id)->exists())return;
 $v=$booking->venue;$u=$booking->user;$zone=$v->settings['timezone'];$money=fn($n)=>'$'.number_format($n/100,2);$paid=(int)$booking->payments()->sum('amount');
 $data=['customer_name'=>$u->name,'venue_name'=>$v->name,'order'=>$booking->order_number,'event'=>$booking->event_date,'starts'=>$booking->starts_at->setTimezone($zone)->format('d/m/Y H:i'),'ends'=>$booking->ends_at->setTimezone($zone)->format('d/m/Y H:i'),'timezone'=>$zone,'guests'=>$booking->guests,'payment'=>$money($payment->amount),'total'=>$money($booking->total),'paid'=>$money($paid),'balance'=>$money(max(0,$booking->total-$paid)),'address'=>$v->settings['address'],'account_url'=>rtrim(config('portal.customer_url'),'/').'/account'];
 $data['extras']=$booking->quote['extras']??[];
 $data['reservation_policy']=$booking->quote['reservation_policy']['text']??$booking->checkoutAttempts()->whereNotNull('policy_acceptance')->latest()->first()?->policy_acceptance['text']??null;
 $wifiSelected=collect($data['extras'])->contains(fn($item)=>($item['kind']??null)==='internet');
 $wifiState=$wifiSelected?app(\App\Services\VenueCredentials::class)->read($v,'wifi_credentials'):['value'=>null,'unreadable'=>false];
 $data['wifi']=$wifiState['value']??[];$data['wifi_unavailable']=$wifiSelected&&$wifiState['unreadable'];
 $text='Hola '.$u->name.'. Pago recibido y reserva confirmada en '.$v->name.'. Orden '.$booking->order_number.'. Horario '.$data['starts'].' a '.$data['ends'].' ('.$zone.'). Pago '.$data['payment'].' MXN. Saldo '.$data['balance'].' MXN. '.$data['account_url'];
 foreach($data['extras'] as $item)$text.=' Extra: '.$item['name'].(!empty($item['color'])?' ('.$item['color'].')':'').' × '.$item['quantity'].'.';
 if(!empty($data['wifi']['ssid']))$text.=' Wi-Fi: '.$data['wifi']['ssid'].'. Contraseña: '.($data['wifi']['password']??'').'.';
 if($data['wifi_unavailable'])$text.=' Contacta al establecimiento para recibir los datos de acceso al Wi-Fi.';
 if($data['reservation_policy'])$text.=' Política aceptada: '.$data['reservation_policy'];
 $data['action_url']=$data['account_url'];$data['security_note']='Este correo confirma el pago registrado; no es una factura fiscal.';$data['text_details']=$text;
 $payload=['to'=>$u->email,'order'=>$booking->order_number]+app(EmailDesigns::class)->render('confirmation',$data,$v);
 MailNotification::create(['id'=>(string)Str::uuid(),'venue_id'=>$v->id,'booking_id'=>$booking->id,'booking_payment_id'=>$payment->id,'status'=>'pending','payload'=>$payload]);
 }
 public function deliver(EmailDriver $driver,int $limit=50):int {
 $sent=0;$rows=MailNotification::where(fn($q)=>$q->where('status','pending')->orWhere(fn($q)=>$q->where('status','blocked')->whereIn('venue_id',VenueMailAccount::where('enabled',true)->select('venue_id'))))->orderBy('created_at')->limit($limit)->get();foreach($rows as $n){
 $account=VenueMailAccount::where('venue_id',$n->venue_id)->where('enabled',true)->first();if(!$account){$n->update(['status'=>'blocked','error'=>'Configura y habilita el servicio de correo del establecimiento.']);continue;}
 $b=$n->booking;if(!$b||$b->status!=='confirmed'||$b->starts_at->isPast()||$b->payment_attention||(int)$b->payments()->sum('amount')<$b->deposit){$n->update(['status'=>'needs_review','error'=>'La reserva cambió o requiere revisión. No se envió confirmación.']);continue;}
 if(!MailNotification::whereKey($n->id)->whereIn('status',['pending','blocked'])->update(['status'=>'sending','provider'=>$account->provider,'attempts'=>DB::raw('attempts + 1'),'updated_at'=>now()]))continue;
 try{$id=$driver->send($account,$n);$n->update(['status'=>'sent','provider'=>$account->provider,'provider_id'=>$id,'sent_at'=>now(),'error'=>null]);$sent++;}
 catch(RequestException $e){$status=$e->response->status();$knownRejected=in_array($status,[400,401,403,404,422,429],true);$n->update(['status'=>$knownRejected?'failed':'unknown','error'=>$knownRejected?'El proveedor rechazó el correo. Revisa credenciales, remitente, dominio y límites.':'Resultado de envío incierto. Revisa el proveedor antes de volver a enviar.']);}
 catch(\Throwable $e){$n->update(['status'=>'unknown','error'=>'Resultado de envío incierto. Revisa el proveedor antes de volver a enviar.']);}
 }
 return $sent;
 }
}
