<?php
namespace App\Http\Controllers;
use App\Models\Venue;use App\Services\VenueSettings;use Illuminate\Http\Request;use Illuminate\Support\Facades\DB;use Illuminate\Validation\ValidationException;
class VenueController extends Controller {
 public function index(Request $r){return Venue::where('owner_account_id',$r->user()->id)->get()->map(fn($v)=>$this->ownerData($v));}
 private function ownerData(Venue $v){
 $secrets=app(\App\Services\VenueCredentials::class);$wifi=$secrets->read($v,'wifi_credentials');$ai=$secrets->read($v,'ai_key');$warnings=[];
 if($wifi['unreadable'])$warnings[]='No se pueden descifrar los datos del Wi-Fi. Se conservaron. Recupera la clave anterior o reemplázalos en Datos del establecimiento.';
 if($ai['unreadable'])$warnings[]='No se puede descifrar la credencial del asistente. Se conservó. Recupera la clave anterior o vuelve a configurarla en Asistente y API.';
 return array_merge($v->toArray(),['wifi'=>['ssid'=>$wifi['value']['ssid']??'','has_password'=>filled($wifi['value']['password']??null),'unreadable'=>$wifi['unreadable']],'credential_warnings'=>$warnings,'has_ai_key'=>filled($ai['value']),'photos'=>$v->photos,'reviews'=>$v->reviews]);
 }
 private function saveWifi(Venue $v,array $d):void {
 if(!array_key_exists('wifi',$d))return;
 $w=$d['wifi'];if($w['clear']??false){$v->wifi_credentials=null;$v->save();return;}
 $state=app(\App\Services\VenueCredentials::class)->read($v,'wifi_credentials');
 $replace=$w['replace']??false;
 if($state['unreadable']&&!$replace){
  if(filled($w['ssid']??null)||filled($w['password']??null))throw ValidationException::withMessages(['wifi.replace'=>'Confirma que deseas reemplazar las credenciales de Wi-Fi que no se pueden descifrar.']);
  return;
 }
 if($replace&&!filled($w['ssid']??null))throw ValidationException::withMessages(['wifi.ssid'=>'Escribe el nombre de la red para reemplazar sus credenciales.']);
 $old=$replace?[]:($state['value']??[]);$ssid=trim($w['ssid']??($old['ssid']??''));
 $password=filled($w['password']??null)?$w['password']:($old['password']??'');
 $v->wifi_credentials=['ssid'=>$ssid,'password'=>$password];$v->save();
 }
 private function authorizeOwner(Request $r,Venue $v){abort_unless($v->owner_account_id===$r->user()->id,403);}
 public function show(Request $r,Venue $venue){abort_unless($venue->published,404);return $this->versioned($r,$venue->publicData());}
 public function listing(Request $r){return $this->versioned($r,Venue::where('published',true)->with(['photos','reviews'])->orderBy('id')->limit(100)->get()->map(fn($v)=>$v->publicData()));}
 private function versioned(Request $r,mixed $data){$response=response()->json($data);$response->setEtag(hash('sha256',$response->getContent()));$response->isNotModified($r);return $response;}
 public function defaults(){return VenueSettings::defaults();}
 public function store(Request $r,VenueSettings $settings){$d=$settings->validate($r->all());if(Venue::where('slug',$d['slug'])->exists())throw ValidationException::withMessages(['slug'=>'Esa dirección web ya está ocupada.']);$v=Venue::create(['owner_id'=>$r->user()->user_id,'owner_account_id'=>$r->user()->id,'name'=>$d['name'],'slug'=>$d['slug'],'settings'=>$d['settings'],'published'=>$d['published'],'ai_key'=>$d['ai_key']??null]);$this->saveWifi($v,$d);return response()->json($this->ownerData($v),201);}
 public function update(Request $r,Venue $venue,VenueSettings $settings){$this->authorizeOwner($r,$venue);$d=$settings->validate($r->all());if($d['slug']!==$venue->slug)throw ValidationException::withMessages(['slug'=>'La dirección del local no puede cambiarse después de crearlo: conserva sus enlaces de reservas y pagos.']);if(Venue::where('slug',$d['slug'])->where('id','!=',$venue->id)->exists())throw ValidationException::withMessages(['slug'=>'Esa dirección web ya está ocupada.']);return DB::transaction(function()use($venue,$d){$v=Venue::whereKey($venue->id)->lockForUpdate()->firstOrFail();$v->fill(['name'=>$d['name'],'slug'=>$d['slug'],'settings'=>$d['settings'],'published'=>$d['published']]);if($d['clear_ai_key']??false)$v->ai_key=null;elseif(filled($d['ai_key']??null))$v->ai_key=$d['ai_key'];$v->save();$this->saveWifi($v,$d);return $this->ownerData($v);});}
 public function bookings(Request $r,Venue $venue){$this->authorizeOwner($r,$venue);return $venue->bookings()->with(['user:id,name,email,phone','payments'])->withSum('payments','amount')->orderByDesc('created_at')->paginate(30);}
}
