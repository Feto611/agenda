<?php
namespace App\Http\Controllers;
use App\Models\{Venue,VenuePhoto,VenueReview};use Illuminate\Http\Request;use Illuminate\Support\Facades\{DB,Storage};
class MediaController extends Controller {
 private function owner(Request $r,Venue $v){abort_unless($v->owner_account_id===$r->user()->id,403);}
 public function upload(Request $r,Venue $venue){$this->owner($r,$venue);$d=$r->validate(['photo'=>'required|image|mimes:jpg,jpeg,png,webp|max:5120','caption'=>'nullable|string|max:500']);return DB::transaction(function()use($r,$venue,$d){Venue::whereKey($venue->id)->lockForUpdate()->firstOrFail();abort_if($venue->photos()->count()>=30,422,'El límite es de 30 fotos por establecimiento.');$path=$r->file('photo')->store('venue-photos/'.$venue->id,'local');try{return response()->json($venue->photos()->create(['path'=>$path,'source'=>'upload','caption'=>$d['caption']??null,'visible'=>true,'cover'=>$venue->photos()->where('cover',true)->doesntExist()]),201);}catch(\Throwable $e){Storage::disk('local')->delete($path);throw $e;}});}
 public function photo(Request $r,VenuePhoto $photo){$v=$photo->venue;$owner=$r->user() instanceof \App\Models\Owner&&$r->user()->id===$v->owner_account_id;abort_unless($owner||($v->published&&$photo->visible),404);if($photo->source==='upload'){abort_unless(Storage::disk('local')->exists($photo->path),404);return response()->file(Storage::disk('local')->path($photo->path),['Cache-Control'=>'private, no-store','X-Content-Type-Options'=>'nosniff']);}abort_unless($photo->url&&parse_url($photo->url,PHP_URL_SCHEME)==='https',404);return redirect()->away($photo->url)->header('Cache-Control','no-store');}
 public function update(Request $r,Venue $venue,VenuePhoto $photo){$this->owner($r,$venue);abort_unless($photo->venue_id===$venue->id,404);$d=$r->validate(['caption'=>'sometimes|nullable|string|max:500','visible'=>'sometimes|boolean','cover'=>'sometimes|boolean']);DB::transaction(function()use($venue,$photo,$d){Venue::whereKey($venue->id)->lockForUpdate()->firstOrFail();if($d['cover']??false)$venue->photos()->update(['cover'=>false]);if(($d['cover']??false)&&array_key_exists('visible',$d)&&!$d['visible'])abort(422,'La portada debe ser una fotografía publicada.');if($d['cover']??false)$d['visible']=true;$photo->update($d);$this->normalizeCover($venue);});return $photo->fresh();}
 private function normalizeCover(Venue $venue):void {
 $cover=$venue->photos()->where('visible',true)->orderByDesc('cover')->orderBy('id')->first();
 $venue->photos()->where('cover',true)->when($cover,fn($q)=>$q->where('id','!=',$cover->id))->update(['cover'=>false]);
 if($cover&&!$cover->cover)$cover->update(['cover'=>true]);
 }
 public function destroy(Request $r,Venue $venue,VenuePhoto $photo){
 $this->owner($r,$venue);abort_unless($photo->venue_id===$venue->id,404);
 $path=DB::transaction(function()use($venue,$photo){
 Venue::whereKey($venue->id)->lockForUpdate()->firstOrFail();
 $locked=$venue->photos()->whereKey($photo->id)->lockForUpdate()->firstOrFail();
 $path=$locked->source==='upload'?$locked->path:null;
 $locked->delete();$this->normalizeCover($venue);return $path;
 });
 // Only remove local bytes after the database committed. Remote Instagram media is never deleted.
 if($path){try{if(!Storage::disk('local')->delete($path))\Illuminate\Support\Facades\Log::warning('No se pudo limpiar un archivo de foto eliminado.',['venue_id'=>$venue->id,'photo_id'=>$photo->id]);}catch(\Throwable $e){report($e);}}
 return ['ok'=>true];
 }
 public function review(Request $r,Venue $venue){$this->owner($r,$venue);abort_if($venue->reviews()->count()>=50,422,'El límite es de 50 comentarios.');$d=$r->validate(['author'=>'required|string|max:150','body'=>'required|string|max:2000','source_url'=>'nullable|url:https|max:1000']);return response()->json($venue->reviews()->create($d+['source'=>'owner','visible'=>false]),201);}
 public function reviewVisibility(Request $r,Venue $venue,VenueReview $review){$this->owner($r,$venue);abort_unless($review->venue_id===$venue->id,404);$d=$r->validate(['visible'=>'required|boolean']);$review->update($d);return $review;}
}
