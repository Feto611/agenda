<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class PlatformSetting extends Model {
 protected $guarded=[];protected function casts():array{return ['settings'=>'array'];}
 public static function defaults():array{return ['independent_sites_enabled'=>false,'name'=>'Encuentro','tagline'=>'Hacemos espacio para tus mejores momentos.','page_title'=>'Reservas de espacios','catalogue_title'=>'Elige dónde encontrarte.','catalogue_intro'=>'Fotos del lugar, información útil y precios publicados por cada establecimiento.','support_email'=>'','support_phone'=>'','logo_path'=>null,'favicon_path'=>null];}
 public static function current():array{return array_replace(self::defaults(),self::find(1)?->settings??[]);}
 public static function publicData():array {
 $s=self::current();$revision=sha1(json_encode($s));
 foreach(['logo','favicon'] as $kind){$s[$kind.'_url']=!empty($s[$kind.'_path'])?'/api/platform-branding/images/'.$kind.'?v='.$revision:null;unset($s[$kind.'_path']);}
 return $s+['revision'=>$revision];
 }
}
