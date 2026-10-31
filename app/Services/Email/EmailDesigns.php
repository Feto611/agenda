<?php
namespace App\Services\Email;
use App\Models\{EmailDesign,PlatformSetting,Venue};
use Illuminate\Support\Facades\{Mail,Validator};
use Illuminate\Validation\Rule;
class EmailDesigns {
 public function defaults(?Venue $venue=null):array {
  $brand=PlatformSetting::publicData();$logo=$venue&&isset($venue->design['logo_id'])?'/api/media/branding/'.$venue->design['logo_id']:($brand['logo_url']??'');
  if($logo&&str_starts_with($logo,'/'))$logo=rtrim(config('portal.customer_url'),'/').$logo;
  $defaults=['brand_name'=>$venue?->name??$brand['name'],'tagline'=>$venue?'Un espacio para celebrar tus mejores momentos.':$brand['tagline'],'logo_url'=>$logo??'','primary'=>'#285e48','accent'=>'#c2a46d','background'=>'#f1f4ef','surface'=>'#ffffff','text'=>'#18382c','muted'=>'#66766e','font'=>'sans','alignment'=>'left','radius'=>16,'width'=>600,'logo_width'=>140,'font_size'=>16,'footer'=>'Gracias por confiar en nosotros.','support_email'=>$brand['support_email']??'','support_phone'=>$brand['support_phone']??'','show_location'=>true,'show_extras'=>true,'templates'=>[
   'verification'=>['subject'=>'Verifica tu correo · {{negocio}}','eyebrow'=>'CONFIRMA TU CUENTA','title'=>'Un paso más para comenzar.','intro'=>'Hola, {{cliente}}. Confirma tu correo para reservar y disfrutar de todos los servicios de {{negocio}}.','button'=>'Verificar mi correo','closing'=>'Si no creaste esta cuenta, puedes ignorar este mensaje.'],
   'recovery'=>['subject'=>'Recupera tu acceso · {{negocio}}','eyebrow'=>'RECUPERACIÓN DE ACCESO','title'=>'Vuelve a tu cuenta.','intro'=>'Hola, {{cliente}}. Recibimos una solicitud para cambiar tu contraseña. Usa el siguiente botón para elegir una nueva.','button'=>'Cambiar mi contraseña','closing'=>'Si no solicitaste este cambio, ignora este correo. Tu contraseña seguirá igual.'],
   'confirmation'=>['subject'=>'Reserva confirmada · {{orden}}','eyebrow'=>'TU PRÓXIMO EVENTO','title'=>'Tu reserva está confirmada.','intro'=>'Hola, {{cliente}}. Recibimos tu pago de {{importe}} MXN para {{negocio}}. Estos son los detalles de tu evento.','button'=>'Ver mi reservación','closing'=>'Estamos listos para recibirte. Conserva este correo para consultar los detalles de tu reserva.']
  ]];
  if($venue){$global=EmailDesign::where('scope','platform')->value('settings')??[];unset($global['brand_name'],$global['tagline']);if(!empty($venue->design['logo_id']))unset($global['logo_url']);$defaults=array_replace_recursive($defaults,$global);}
  return $defaults;
 }
 public function scope(?Venue $venue):string{return $venue?'venue:'.$venue->id:'platform';}
 public function settings(?Venue $venue=null):array{return array_replace_recursive($this->defaults($venue),EmailDesign::where('scope',$this->scope($venue))->value('settings')??[]);}
 public function validate(array $input,?Venue $venue=null):array {
  $rules=['brand_name'=>'sometimes|required|string|max:100','tagline'=>'sometimes|nullable|string|max:200','logo_url'=>'sometimes|nullable|url:https|max:1500','font'=>['sometimes',Rule::in(['sans','serif'])],'alignment'=>['sometimes',Rule::in(['left','center'])],'radius'=>'sometimes|integer|between:0,24','width'=>'sometimes|integer|between:480,720','logo_width'=>'sometimes|integer|between:40,220','font_size'=>'sometimes|integer|between:14,18','footer'=>'sometimes|nullable|string|max:500','support_email'=>'sometimes|nullable|email|max:254','support_phone'=>'sometimes|nullable|string|max:40','show_location'=>'sometimes|boolean','show_extras'=>'sometimes|boolean','templates'=>'sometimes|array:verification,recovery,confirmation'];
  foreach(['primary','accent','background','surface','text','muted'] as $key)$rules[$key]=['sometimes','regex:/^#[a-fA-F0-9]{6}$/'];
  foreach(['verification','recovery','confirmation'] as $type){$rules['templates.'.$type]='sometimes|array:subject,eyebrow,title,intro,button,closing';foreach(['subject'=>150,'eyebrow'=>60,'title'=>150,'intro'=>1200,'button'=>60,'closing'=>800] as $key=>$max)$rules['templates.'.$type.'.'.$key]=['sometimes','required','string','max:'.$max,function($attribute,$value,$fail){if(preg_match('/[\r\n]/',$value)&&str_ends_with($attribute,'.subject'))$fail('El asunto debe estar en una sola línea.');preg_match_all('/\{\{(.*?)\}\}/s',$value,$matches);foreach($matches[1] as $name)if(!in_array($name,['cliente','negocio','orden','importe','saldo'],true))$fail('Variable no disponible: '.$name);}];}
  $data=Validator::make($input,$rules)->validate();return array_replace_recursive($this->settings($venue),$data);
 }
 public function render(string $type,array $data=[],?Venue $venue=null,?array $settings=null):array {
  abort_unless(in_array($type,['verification','recovery','confirmation'],true),404);$s=$settings??$this->settings($venue);$data+=['customer_name'=>'Cliente','venue_name'=>$s['brand_name'],'order'=>'','payment'=>'','balance'=>'','action_url'=>'','security_note'=>''];
  $vars=['{{cliente}}'=>$data['customer_name'],'{{negocio}}'=>$data['venue_name'],'{{orden}}'=>$data['order'],'{{importe}}'=>$data['payment'],'{{saldo}}'=>$data['balance']];$copy=array_map(fn($v)=>strtr($v,$vars),$s['templates'][$type]);$copy['subject']=preg_replace('/[\r\n]+/',' ',$copy['subject']);
  $html=view('mail.designed',['s'=>$s,'copy'=>$copy,'type'=>$type,'data'=>$data])->render();
  $text=$copy['title']."\n\n".$copy['intro']."\n\n".($data['text_details']??'')."\n".$copy['button'].': '.$data['action_url']."\n\n".$data['security_note']."\n".$copy['closing']."\n".$s['brand_name']."\n".$s['footer'];
  return ['subject'=>$copy['subject'],'html'=>$html,'text'=>$text];
 }
 public function sendAccess(string $type,string $to,string $name,string $url,string $note):void {
  $p=$this->render($type,['customer_name'=>$name,'action_url'=>$url,'security_note'=>$note]);
  Mail::html($p['html'],function($m)use($p,$to){$m->to($to)->subject($p['subject']);$m->getSymfonyMessage()->text($p['text']);});
 }
 public function sample(string $type,?Venue $venue=null,?array $settings=null):array {
  $data=['customer_name'=>'María López','venue_name'=>$venue?->name??($settings['brand_name']??$this->defaults()['brand_name']),'order'=>'EV-DEMO-2026','starts'=>'20/12/2026 16:00','ends'=>'21/12/2026 00:00','timezone'=>'America/Mexico_City','guests'=>80,'payment'=>'$450.00','total'=>'$1,500.00','paid'=>'$450.00','balance'=>'$1,050.00','address'=>$venue?->settings['address']??'Av. de las Flores 120, Colima','extras'=>[['name'=>'Sillas','color'=>'Blanco','quantity'=>80,'total'=>0],['name'=>'Manteles','color'=>'Arena','quantity'=>8,'total'=>16000]],'wifi'=>['ssid'=>'Red de ejemplo','password'=>'Solo para vista previa'],'reservation_policy'=>\App\Services\ReservationPolicy::TEXT,'action_url'=>'https://example.invalid/vista-previa','security_note'=>$type==='verification'?'El enlace vence una hora después de su emisión original. Reenviarlo no invalida el anterior.':($type==='recovery'?'El enlace vence en 30 minutos y solo puede usarse una vez.':'Este correo confirma un pago registrado; no es una factura fiscal.'),'text_details'=>'VISTA PREVIA. Los importes y datos son de ejemplo.'];
  if($type!=='confirmation')unset($data['reservation_policy']);
  return $this->render($type,$data,$venue,$settings);
 }
}
