<?php
namespace Tests\Feature;
use App\Models\{Venue,Owner,User};
use App\Http\Controllers\DesignController;
use App\Services\VenueSettings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\{Storage,DB};
use Illuminate\Support\Str;
use Tests\TestCase;
class CoverMediaTest extends TestCase {
 use RefreshDatabase;
 private function venue():Venue{
 $u=User::factory()->create();$o=Owner::unguarded(fn()=>Owner::create(['user_id'=>$u->id,'name'=>$u->name,'email'=>$u->email,'password'=>'OwnerPassword12345','activated'=>true,'email_verified_at'=>now()]));
 return Venue::create(['owner_id'=>$u->id,'owner_account_id'=>$o->id,'name'=>'Local de fotos','slug'=>'fotos-'.Str::lower(Str::random(8)),'published'=>true,'settings'=>VenueSettings::defaults()]);
 }
 public function test_carousel_draft_is_private_until_published_and_validates_interval():void{
 $v=$this->venue();$this->actingAs($v->owner);$d=app(DesignController::class)->defaults();$d['cover_mode']='carousel';$d['cover_interval']=8;
 $url='/api/owner/venues/'.$v->slug.'/design';
 $this->putJson($url,$d)->assertOk()->assertJsonPath('draft.cover_mode','carousel');
 $this->getJson('/api/venues/'.$v->slug)->assertJsonPath('design',null);
 $this->putJson($url,$d+['publish'=>true])->assertOk();
 $this->getJson('/api/venues/'.$v->slug)->assertJsonPath('design.cover_mode','carousel')->assertJsonPath('design.cover_interval',8);
 foreach([0,2,21,'bad'] as $seconds){$bad=$d;$bad['cover_interval']=$seconds;$this->putJson($url,$bad)->assertUnprocessable();}
 $bad=$d;$bad['cover_mode']='script';$this->putJson($url,$bad)->assertUnprocessable();
 }
 public function test_owner_can_delete_local_photo_and_next_visible_photo_becomes_cover():void{
 Storage::fake('local');$v=$this->venue();
 Storage::disk('local')->put('venue-photos/'.$v->id.'/test.png','test-bytes');
 $a=$v->photos()->create(['source'=>'upload','path'=>'venue-photos/'.$v->id.'/test.png','cover'=>true,'visible'=>true]);
 $hidden=$v->photos()->create(['source'=>'instagram','url'=>'https://example.com/hidden.jpg','visible'=>false,'cover'=>false]);
 $b=$v->photos()->create(['source'=>'instagram','url'=>'https://example.com/public.jpg','visible'=>true,'cover'=>false]);
 config(['realtime.enabled'=>true]);$this->actingAs($v->owner)->deleteJson('/api/owner/venues/'.$v->slug.'/photos/'.$a->id)->assertOk();
 Storage::disk('local')->assertMissing('venue-photos/'.$v->id.'/test.png');$this->assertModelMissing($a);$this->assertTrue($b->fresh()->cover);$this->assertFalse($hidden->fresh()->cover);
 $this->assertDatabaseHas('realtime_outbox',['kind'=>'venue']);
 $this->getJson('/api/venues/'.$v->slug)->assertJsonCount(1,'photos')->assertJsonPath('photos.0.id',$b->id);
 }
 public function test_another_owner_or_mismatched_venue_cannot_delete_a_photo():void{
 $v=$this->venue();$other=$this->venue();$photo=$v->photos()->create(['source'=>'instagram','url'=>'https://example.com/photo.jpg','cover'=>true,'visible'=>true]);
 $this->actingAs($other->owner)->deleteJson('/api/owner/venues/'.$v->slug.'/photos/'.$photo->id)->assertForbidden();
 $this->actingAs($v->owner)->deleteJson('/api/owner/venues/'.$other->slug.'/photos/'.$photo->id)->assertForbidden();
 $this->assertModelExists($photo);
 }
 public function test_deleting_final_photo_leaves_an_empty_catalogue_and_repeated_delete_returns_not_found():void{
 $v=$this->venue();$p=$v->photos()->create(['source'=>'instagram','url'=>'https://example.com/photo.jpg','cover'=>true,'visible'=>true]);
 $url='/api/owner/venues/'.$v->slug.'/photos/'.$p->id;$this->actingAs($v->owner)->deleteJson($url)->assertOk();$this->deleteJson($url)->assertNotFound();
 $this->getJson('/api/venues/'.$v->slug)->assertJsonCount(0,'photos');
 }
 public function test_hiding_cover_replaces_it_with_a_published_image():void{
 $v=$this->venue();$a=$v->photos()->create(['source'=>'instagram','url'=>'https://example.com/a.jpg','cover'=>true,'visible'=>true]);
 $b=$v->photos()->create(['source'=>'instagram','url'=>'https://example.com/b.jpg','cover'=>false,'visible'=>true]);
 $this->actingAs($v->owner)->patchJson('/api/owner/venues/'.$v->slug.'/photos/'.$a->id,['visible'=>false])->assertOk();
 $this->assertFalse($a->fresh()->cover);$this->assertTrue($b->fresh()->cover);
 $this->patchJson('/api/owner/venues/'.$v->slug.'/photos/'.$b->id,['cover'=>true,'visible'=>false])->assertUnprocessable();$this->assertTrue($b->fresh()->visible);
 }
 public function test_client_cannot_delete_photos_or_enable_carousel():void{
 $v=$this->venue();$p=$v->photos()->create(['source'=>'instagram','url'=>'https://example.com/p.jpg','cover'=>true,'visible'=>true]);
 $this->actingAs(User::factory()->create())->deleteJson('/api/owner/venues/'.$v->slug.'/photos/'.$p->id)->assertForbidden();
 $this->putJson('/api/owner/venues/'.$v->slug.'/design',app(DesignController::class)->defaults())->assertForbidden();
 }
}
