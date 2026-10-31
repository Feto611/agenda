<?php
namespace App\Http\Controllers;
use App\Models\{Owner,PlatformSetting};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\{DB,Storage};
class PlatformBrandingController extends Controller {
 private function admin(Request $r):void {abort_unless($r->user() instanceof Owner&&$r->user()->platform_admin,403);}
 public function show(){return PlatformSetting::publicData();}
 private function change(callable $callback):array {
 return DB::transaction(function()use($callback){
 PlatformSetting::query()->insertOrIgnore(['id'=>1,'settings'=>json_encode(PlatformSetting::defaults()),'created_at'=>now(),'updated_at'=>now()]);
 $row=PlatformSetting::whereKey(1)->lockForUpdate()->firstOrFail();$row->settings=$callback(array_replace(PlatformSetting::defaults(),$row->settings));$row->save();
 app(\App\Services\Realtime\Invalidations::class)->record(['catalogue'],'platform');
 return PlatformSetting::publicData();
 });
 }
 public function readiness(Request $r){
 $this->admin($r);
 $venues=\App\Models\Venue::where('published',true)->withCount(['photos'=>fn($q)=>$q->where('visible',true)])->get();
 $ids=$venues->pluck('id');$count=$venues->count();
 $mail=\App\Models\VenueMailAccount::whereIn('venue_id',$ids)->where('enabled',true)->distinct()->count('venue_id');
 $pay=\App\Models\GatewayAccount::whereIn('venue_id',$ids)->where('enabled',true)->distinct()->count('venue_id');
 return ['checks'=>[
 ['label'=>'Establecimientos publicados','ok'=>$count>0,'detail'=>$count.' publicados'],
 ['label'=>'Fotografías para la presentación','ok'=>$count>0&&$venues->every(fn($v)=>$v->photos_count>0),'detail'=>'Cada local publicado debe tener al menos una foto visible.'],
 ['label'=>'Marca general guardada','ok'=>PlatformSetting::whereKey(1)->exists(),'detail'=>'Nombre, logo e icono se configuran en este apartado.'],
 ['label'=>'Correo habilitado','ok'=>$count>0&&$mail===$count,'detail'=>$mail.' de '.$count.' locales publicados. Falta comprobar un envío real.'],
 ['label'=>'Pasarela habilitada','ok'=>$count>0&&$pay===$count,'detail'=>$pay.' de '.$count.' locales publicados. Usa cuentas y tarjetas de prueba para la demo.'],
 ['label'=>'Recuperación de contraseña','ok'=>!in_array(config('mail.default'),['log','array','failover'],true)&&filled(config('mail.from.address')),'detail'=>'Configura el correo global en .env y prueba un enlace desde ambos portales. El correo de cada local es independiente.'],
 ['label'=>'Actualizaciones configuradas','ok'=>(bool)config('realtime.enabled')&&filled(config('realtime.key')),'detail'=>'Comprueba que el panel indique En vivo. Esto no verifica la conexión desde el navegador.']
 ]];
 }
 public function save(Request $r){
 $this->admin($r);$d=$r->validate(['name'=>'required|string|max:80','tagline'=>'nullable|string|max:200','page_title'=>'required|string|max:100','catalogue_title'=>'required|string|max:150','catalogue_intro'=>'nullable|string|max:500','support_email'=>'nullable|email|max:254','support_phone'=>'nullable|string|max:40']);
 return $this->change(fn($s)=>array_replace($s,$d));
 }
 public function upload(Request $r,string $kind){
 $this->admin($r);abort_unless(in_array($kind,['logo','favicon'],true),404);
 $r->validate(['image'=>'required|image|mimes:png,jpg,jpeg,webp|max:3072|dimensions:max_width=4096,max_height=4096']);
 $path=$r->file('image')->store('platform-branding','local');$old=null;
 try{$result=$this->change(function($s)use($kind,$path,&$old){$old=$s[$kind.'_path'];$s[$kind.'_path']=$path;return $s;});}
 catch(\Throwable $e){Storage::disk('local')->delete($path);throw $e;}
 if($old)Storage::disk('local')->delete($old);
 return $result;
 }
 public function image(string $kind){
 abort_unless(in_array($kind,['logo','favicon'],true),404);
 $path=PlatformSetting::current()[$kind.'_path'];abort_unless($path&&Storage::disk('local')->exists($path),404);
 return response()->file(Storage::disk('local')->path($path),['Cache-Control'=>'no-store','X-Content-Type-Options'=>'nosniff']);
 }
 public function destroy(Request $r,string $kind){
 $this->admin($r);abort_unless(in_array($kind,['logo','favicon'],true),404);$old=null;
 $result=$this->change(function($s)use($kind,&$old){$old=$s[$kind.'_path'];$s[$kind.'_path']=null;return $s;});
 if($old)Storage::disk('local')->delete($old);return $result;
 }
}
