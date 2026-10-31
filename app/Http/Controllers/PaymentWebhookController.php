<?php
namespace App\Http\Controllers;
use App\Models\{Venue,GatewayAccount};use App\Services\Payments\{GatewayDriver,PaymentService};use Illuminate\Http\Request;
class PaymentWebhookController extends Controller {
 public function __invoke(Request $r,Venue $venue,string $provider,GatewayDriver $driver,PaymentService $payments,?GatewayAccount $account=null){
 abort_unless(in_array($provider,['paypal','mercadopago','oxxo']),404);$g=$account??GatewayAccount::where('venue_id',$venue->id)->where('provider',$provider)->where('current',true)->firstOrFail();abort_unless($g->venue_id===$venue->id&&$g->provider===$provider,404);abort_unless($driver->verify($r,$g),401,'Firma del proveedor no válida.');
 if($provider==='mercadopago'){$query=$r->query->all();$id=$query['data.id']??$query['data_id']??$r->input('data.id');abort_unless(preg_match('/^[0-9]{1,30}$/',(string)$id),422);if($r->input('data.id'))abort_unless((string)$r->input('data.id')===(string)$id,401);$data=$driver->read($g,(string)$id);}
 elseif($provider==='paypal'){$type=$r->input('event_type');if($type==='PAYMENT.CAPTURE.REFUNDED'){$refund=$driver->paypalRefund($g,(string)$r->input('resource.id'));if($refund['order_id']){$payments->settle($g,$driver->read($g,$refund['order_id']));}$payments->refundPayPal($g,$refund);return ['ok'=>true];}if($type!=='PAYMENT.CAPTURE.COMPLETED')return ['ok'=>true];$id=$r->input('resource.supplementary_data.related_ids.order_id');abort_unless(is_string($id)&&preg_match('/^[A-Za-z0-9]{1,50}$/',$id),422);$data=$driver->read($g,$id);}
 else{if(!in_array($r->input('type'),['order.paid','order.refunded','order.partially_refunded','charge.refunded']))return ['ok'=>true];$id=$r->input('data.object.id');if($r->input('type')==='charge.refunded')$id=$r->input('data.object.order_id');abort_unless(is_string($id)&&preg_match('/^[A-Za-z0-9_]{1,80}$/',$id),422);$data=$driver->read($g,$id);}
 $payments->settle($g,$data);return ['ok'=>true];
 }
}
