<?php
namespace App\Services;
use Illuminate\Support\Facades\Http;
class DomainNetwork {
 public function txt(string $name):array{return array_values(array_filter(array_map(fn($r)=>$r['txt']??(isset($r['entries'])?implode('',$r['entries']):null),@dns_get_record($name,DNS_TXT)?:[])));}
 protected function records(string $host):array{return @dns_get_record($host,DNS_A|DNS_AAAA|DNS_CNAME)?:[];}
 public function addresses(string $host):array{
  $seen=[];for($i=0;$i<6;$i++){if(isset($seen[$host]))return [];$seen[$host]=true;$records=$this->records($host);$ips=array_values(array_unique(array_filter(array_map(fn($r)=>$r['ip']??$r['ipv6']??null,$records))));if($ips)return $ips;
   $aliases=array_values(array_filter(array_map(fn($r)=>$r['target']??null,$records)));if(count($aliases)!==1)return [];$host=strtolower(rtrim($aliases[0],'.'));if(strlen($host)>253||!preg_match('/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/D',$host))return [];
  }return [];
 }
 public function publicAddress(string $ip):bool {
  if(!filter_var($ip,FILTER_VALIDATE_IP,FILTER_FLAG_NO_PRIV_RANGE|FILTER_FLAG_NO_RES_RANGE))return false;
  if(str_contains($ip,':')&&!\Symfony\Component\HttpFoundation\IpUtils::checkIp($ip,'2000::/3'))return false;
  return !\Symfony\Component\HttpFoundation\IpUtils::checkIp($ip,['224.0.0.0/4','240.0.0.0/4','100.64.0.0/10','192.0.0.0/24','192.0.2.0/24','198.18.0.0/15','198.51.100.0/24','203.0.113.0/24','::ffff:0:0/96','ff00::/8','2002::/16','2001::/32']);
 }
 public function https(string $host,string $token):bool {
  // Pin an already checked public address; never follow redirects or trust a
  // second DNS lookup that could resolve into the server's private network.
  if(!extension_loaded('curl'))throw new \RuntimeException('La comprobación HTTPS requiere la extensión cURL. Reconstruye los contenedores.');
  $ips=$this->addresses($host);if(!$ips||count($ips)>16||collect($ips)->contains(fn($ip)=>!$this->publicAddress($ip)))return false;
  $ip=$ips[0];$pin=str_contains($ip,':')?'['.$ip.']':$ip;
  $response=Http::connectTimeout(3)->timeout(8)->withoutRedirecting()->withOptions(['verify'=>true,'proxy'=>'','curl'=>[CURLOPT_RESOLVE=>[$host.':443:'.$pin]]])->get('https://'.$host.'/.well-known/encuentro-domain/'.$token);
  return $response->status()===200&&hash_equals('encuentro-domain:'.$token,trim($response->body()));
 }
}
