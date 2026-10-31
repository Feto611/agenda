<?php
namespace App\Http\Controllers;
use Illuminate\Http\Request;use Illuminate\Support\Facades\Http;use Illuminate\Support\Facades\Cache;
class GeocodeController extends Controller {
 public function __invoke(Request $r){$d=$r->validate(['address'=>'required|string|min:5|max:350']);$key=config('encuentro.geocoding_key');if(!$key)return response()->json(['message'=>'La búsqueda automática requiere GEOAPIFY_API_KEY. Puedes colocar el punto manualmente en el mapa.'],503);
 try{$result=Cache::remember('geo:'.hash('sha256',mb_strtolower(trim($d['address']))),86400,fn()=>Http::timeout(12)->get('https://api.geoapify.com/v1/geocode/search',['text'=>$d['address'],'lang'=>'es','limit'=>5,'format'=>'json','apiKey'=>$key])->throw()->json('results',[]));return ['results'=>array_map(fn($x)=>['label'=>$x['formatted'],'lat'=>$x['lat'],'lng'=>$x['lon']],$result)];}catch(\Throwable $e){return response()->json(['message'=>'No se pudo consultar la dirección. Coloca el punto en el mapa o intenta de nuevo.'],503);}}
}
