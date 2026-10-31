<?php
namespace App\Services;
use App\Models\{Venue,VenuePhoto,VenueReview,VenueSocialConnection};use Illuminate\Support\Facades\{Http,DB};
class InstagramImporter {
 public function preview(VenueSocialConnection $c,bool $comments=false):array{
 $base='https://graph.instagram.com/'.config('encuentro.instagram_version','v26.0');
 try{$response=Http::withToken($c->token)->timeout(15)->withoutRedirecting()->get($base.'/'.$c->account_id.'/media',['fields'=>'id,caption,media_type,media_url,thumbnail_url,permalink,username','limit'=>12])->throw()->json('data',[]);}catch(\Throwable $e){abort(422,'No se pudo consultar Instagram. Revisa la cuenta profesional, el token y sus permisos.');}
 $items=[];$warnings=[];
 foreach(array_slice($response,0,12) as $m){$url=$m['media_type']==='VIDEO'?($m['thumbnail_url']??null):($m['media_url']??null);$host=strtolower(parse_url($url??'',PHP_URL_HOST)??'');if(!$url||parse_url($url,PHP_URL_SCHEME)!=='https'||!($host==='cdninstagram.com'||str_ends_with($host,'.cdninstagram.com')||$host==='fbcdn.net'||str_ends_with($host,'.fbcdn.net')))continue;
 $item=['id'=>(string)$m['id'],'url'=>$url,'caption'=>mb_substr($m['caption']??'',0,500),'source_url'=>$m['permalink']??null,'author'=>$m['username']??null,'comments'=>[]];
 if($comments){try{$cs=Http::withToken($c->token)->timeout(10)->withoutRedirecting()->get($base.'/'.$m['id'].'/comments',['fields'=>'id,text,username,timestamp','limit'=>5])->throw()->json('data',[]);foreach($cs as $x){if(empty($x['text'])||empty($x['id']))continue;$item['comments'][]=['id'=>(string)$x['id'],'author'=>mb_substr($x['username']??'Usuario de Instagram',0,150),'body'=>mb_substr($x['text'],0,2000),'source_url'=>$m['permalink']??null];}}catch(\Throwable $e){$warnings[]='La cuenta no permitió consultar comentarios de algunas publicaciones.';}}
 $items[]=$item;}
 return ['items'=>$items,'warnings'=>array_values(array_unique($warnings))];
 }
 public function import(Venue $v,array $items,array $photoIds,array $commentIds):array{
 return DB::transaction(function()use($v,$items,$photoIds,$commentIds){Venue::whereKey($v->id)->lockForUpdate()->firstOrFail();$photos=0;$reviews=0;
 foreach($items as $item){if(in_array($item['id'],$photoIds,true)){$photo=$v->photos()->firstOrNew(['source'=>'instagram','external_id'=>$item['id']]);if(!$photo->exists&&$v->photos()->count()>=30)continue;$photo->fill(['url'=>$item['url'],'source_url'=>$item['source_url'],'caption'=>$item['caption'],'author'=>$item['author']]);$photo->save();$photos++;}foreach($item['comments'] as $x){if(!in_array($x['id'],$commentIds,true))continue;$review=$v->reviews()->firstOrNew(['source'=>'instagram','external_id'=>$x['id']]);if(!$review->exists&&$v->reviews()->count()>=50)continue;$review->fill(['author'=>$x['author'],'body'=>$x['body'],'source_url'=>$x['source_url']]);$review->save();$reviews++;}}
 return ['photos'=>$photos,'comments'=>$reviews,'message'=>'Contenido importado como borrador. Revisa cada elemento y decide si se muestra.'];});
 }
}
