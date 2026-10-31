<?php
namespace App\Services;
use App\Models\{PlatformSetting,VenueDomain};use Illuminate\Support\Facades\DB;use Illuminate\Validation\ValidationException;
class VenueDomains {
 public function generalEnabled():bool{return (bool)config('domains.enabled',false)&&(bool)(PlatformSetting::current()['independent_sites_enabled']??false);}
 public function canonicalHosts():array{return array_values(array_unique(array_filter(array_map(fn($key)=>strtolower(parse_url((string)config('portal.'.$key),PHP_URL_HOST)??''),['customer_url','owner_url']))));}
 public function hostname(string $host):string {
  $host=strtolower(trim($host));
  if(strlen($host)>253||!preg_match('/^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/D',$host)||filter_var($host,FILTER_VALIDATE_IP)||in_array($host,$this->canonicalHosts(),true)||preg_match('/\.(localhost|local|internal|invalid|test|example)$/',$host))throw ValidationException::withMessages(['hostname'=>'Escribe un dominio público completo, sin https://, rutas, puertos ni comodines. No puede ser un dominio de la plataforma.']);
  return $host;
 }
 public function fresh(?\Carbon\CarbonInterface $date):bool{return $date&&$date->gt(now()->subDays(config('domains.verification_days',7)));}
 public function verified(VenueDomain $site):bool{return $this->fresh($site->dns_verified_at)&&$this->fresh($site->https_verified_at);}
 public function securePortals():bool{return parse_url(config('portal.customer_url'),PHP_URL_SCHEME)==='https'&&parse_url(config('portal.owner_url'),PHP_URL_SCHEME)==='https';}
 public function active(VenueDomain $site):bool{return $this->securePortals()&&$this->generalEnabled()&&$site->enabled&&$site->venue?->published&&$this->verified($site);}
 public function checkDns(VenueDomain $site,DomainNetwork $net):VenueDomain {
  $expected='encuentro-verification='.$site->verification_token;$records=$net->txt('_encuentro.'.$site->hostname);
  if(!in_array($expected,$records,true)){$site->update(['dns_verified_at'=>null,'https_verified_at'=>null,'enabled'=>false,'last_error'=>'No se encontró el registro TXT de propiedad. Revisa el DNS y vuelve a verificar.']);return $site->fresh();}
  $site->update(['dns_verified_at'=>now(),'last_error'=>null]);return $site->fresh();
 }
 public function checkHttps(VenueDomain $site,DomainNetwork $net):VenueDomain {
  abort_unless($this->fresh($site->dns_verified_at),422,'Primero verifica la propiedad del dominio mediante DNS.');
  try{$ok=$net->https($site->hostname,$site->verification_token);}catch(\Throwable $e){$ok=false;}
  if($ok)$site->update(['https_verified_at'=>now(),'last_error'=>null]);else $site->update(['https_verified_at'=>null,'enabled'=>false,'last_error'=>'No se pudo comprobar un certificado HTTPS válido y el destino del dominio. Configura el proxy, el certificado y la ruta de comprobación antes de activarlo.']);
  return $site->fresh();
 }
 public function data(VenueDomain $site):array{return $site->toArray()+['active'=>$this->active($site),'dns_fresh'=>$this->fresh($site->dns_verified_at),'https_fresh'=>$this->fresh($site->https_verified_at),'txt_name'=>'_encuentro.'.$site->hostname,'txt_value'=>'encuentro-verification='.$site->verification_token,'url'=>'https://'.$site->hostname];}
 public function caddyfile():string {
  $email=(string)config('domains.acme_email');abort_unless(filter_var($email,FILTER_VALIDATE_EMAIL),422,'Configura ACME_EMAIL para los certificados HTTPS.');
  $customer=parse_url(config('portal.customer_url'),PHP_URL_HOST);$owner=parse_url(config('portal.owner_url'),PHP_URL_HOST);
  foreach(['customer_url','owner_url'] as $key)abort_unless(parse_url(config('portal.'.$key),PHP_URL_SCHEME)==='https',422,'CUSTOMER_URL y OWNER_URL deben usar HTTPS.');
  foreach([$customer,$owner] as $h)abort_unless(is_string($h)&&preg_match('/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/D',$h),422,'Configura dominios públicos válidos para ambos portales.');
  abort_if($customer===$owner,422,'Los portales público y de administración necesitan dominios distintos.');
  $out="# Generado por domains:caddyfile. Caddy gestiona emisión y renovación.\n{\n email {$email}\n}\n\n{$customer} {\n reverse_proxy web:80\n}\n\n{$owner} {\n reverse_proxy web-owner:80\n}\n";
  if($this->generalEnabled())foreach(VenueDomain::with('venue')->orderBy('hostname')->get() as $site)if($this->fresh($site->dns_verified_at)&&$site->venue?->published){$h=$this->hostname($site->hostname);$out.="\n{$h} {\n reverse_proxy web:80\n}\n";}
  return $out;
 }
}
