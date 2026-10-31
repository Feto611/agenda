<?php
namespace Tests\Feature;
use App\Models\{Venue,Owner,User,MailNotification};
use App\Services\{VenueSettings,BookingEngine};
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;
class InventoryTest extends TestCase {
 use RefreshDatabase;
 private function venue():Venue {
 $u=User::factory()->create();$o=Owner::unguarded(fn()=>Owner::create(['user_id'=>$u->id,'name'=>'Dueño','email'=>$u->email,'password'=>'OwnerPassword12345','activated'=>true,'email_verified_at'=>now()]));
 return Venue::create(['owner_id'=>$u->id,'owner_account_id'=>$o->id,'name'=>'Local extras','slug'=>'extras-'.Str::lower(Str::random(8)),'published'=>true,
 'wifi_credentials'=>['ssid'=>'PrivateNetwork','password'=>'PrivateWifiSecret'],
 'settings'=>array_replace(VenueSettings::defaults(),['capacity'=>100,'open_hour'=>10,'close_hour'=>26,'prep_minutes'=>0,'clean_minutes'=>60,'included_hours'=>8,'weekday_price'=>100000,'weekend_price'=>100000,'holiday_price'=>100000,'extra_hour_price'=>10000,'deposit_value'=>30,'address'=>'Colima','lat'=>19.2,'lng'=>-103.7,'inventory'=>[
 ['id'=>'chairs','name'=>'Sillas','kind'=>'chairs','color'=>'','quantity'=>50,'unit_price'=>2500,'enabled'=>true],
 ['id'=>'linen-blue','name'=>'Mantel','kind'=>'tablecloths','color'=>'Azul','quantity'=>5,'unit_price'=>10000,'enabled'=>true],
 ['id'=>'wifi','name'=>'Internet','kind'=>'internet','color'=>'','quantity'=>1,'unit_price'=>0,'enabled'=>true]
 ]])]);
 }
 private function input(array $extras=[]):array{return ['policy_accepted'=>true,'date'=>now()->addMonth()->format('Y-m-d'),'start'=>12,'hours'=>8,'guests'=>10,'extras'=>$extras];}
 public function test_server_prices_extras_and_preserves_color_and_reservation_snapshot():void {
 $v=$this->venue();$i=$this->input([['id'=>'chairs','quantity'=>4],['id'=>'linen-blue','quantity'=>2]]);
 $q=app(BookingEngine::class)->quote($v,$i);$this->assertSame(130000,$q['total']);$this->assertSame(39000,$q['deposit']);$this->assertSame('Azul',$q['extras'][1]['color']);
 $b=app(BookingEngine::class)->reserve($v,User::factory()->create()->id,$i);
 $s=$v->settings;$s['inventory'][0]['unit_price']=5000;$v->update(['settings'=>$s]);
 $this->assertSame(2500,$b->fresh()->quote['extras'][0]['unit_price']);
 }
 public function test_invalid_unavailable_duplicate_and_excess_quantities_are_rejected():void{
 $v=$this->venue();foreach([[['id'=>'missing','quantity'=>1]],[['id'=>'chairs','quantity'=>51]],[['id'=>'chairs','quantity'=>0]],[['id'=>'chairs','quantity'=>1],['id'=>'chairs','quantity'=>1]],[['id'=>'chairs','quantity'=>1.5]]] as $extras)
 $this->postJson('/api/venues/'.$v->slug.'/quote',$this->input($extras))->assertUnprocessable();
 $s=$v->settings;$s['inventory'][0]['enabled']=false;$v->update(['settings'=>$s]);
 $this->postJson('/api/venues/'.$v->slug.'/quote',$this->input([['id'=>'chairs','quantity'=>1]]))->assertUnprocessable();
 }
 public function test_wifi_is_encrypted_and_never_in_public_or_owner_responses():void{
 $v=$this->venue();$this->assertStringNotContainsString('PrivateWifiSecret',$v->getRawOriginal('wifi_credentials'));
 $this->getJson('/api/venues/'.$v->slug)->assertOk()->assertDontSee('PrivateWifiSecret')->assertDontSee('PrivateNetwork')->assertJsonMissingPath('wifi_credentials');
 $this->actingAs($v->owner)->getJson('/api/owner/venues')->assertOk()->assertDontSee('PrivateWifiSecret')->assertJsonPath('0.wifi.ssid','PrivateNetwork');
 $this->postJson('/api/venues/'.$v->slug.'/quote',$this->input([['id'=>'wifi','quantity'=>1]]))->assertOk()->assertDontSee('PrivateWifiSecret');
 }
 public function test_owner_can_change_wifi_preserve_password_and_clear_it():void{
 $v=$this->venue();$this->actingAs($v->owner);$data=['name'=>$v->name,'slug'=>$v->slug,'published'=>true,'settings'=>$v->settings,'wifi'=>['ssid'=>'UpdatedNetwork','password'=>'']];
 $this->putJson('/api/owner/venues/'.$v->slug,$data)->assertOk()->assertDontSee('PrivateWifiSecret');$this->assertSame('PrivateWifiSecret',$v->fresh()->wifi_credentials['password']);
 $other=$this->venue();$this->actingAs($other->owner)->putJson('/api/owner/venues/'.$v->slug,$data)->assertForbidden();
 $this->actingAs($v->owner);$data['wifi']=['clear'=>true];$this->putJson('/api/owner/venues/'.$v->slug,$data)->assertOk();$this->assertNull($v->fresh()->wifi_credentials);
 }
 public function test_inventory_validation_rejects_duplicate_ids_and_missing_prices():void {
 $v=$this->venue();$this->actingAs($v->owner);$s=$v->settings;$s['inventory'][1]['id']='chairs';
 $data=['name'=>$v->name,'slug'=>$v->slug,'published'=>true,'settings'=>$s];$this->putJson('/api/owner/venues/'.$v->slug,$data)->assertUnprocessable();
 $s=$v->settings;$s['inventory'][0]['unit_price']=null;$data['settings']=$s;$this->putJson('/api/owner/venues/'.$v->slug,$data)->assertUnprocessable();
 }
 public function test_only_confirmed_payment_with_selected_internet_enqueues_wifi_once():void {
 $v=$this->venue();$b=app(BookingEngine::class)->reserve($v,User::factory()->create()->id,$this->input([['id'=>'wifi','quantity'=>1]]));
 $this->assertSame(0,MailNotification::count());$this->actingAs($v->owner);
 $payload=['amount'=>$b->deposit,'method'=>'cash','idempotency_key'=>(string)Str::uuid()];
 $url='/api/owner/venues/'.$v->slug.'/bookings/'.$b->id.'/payments';
 $this->postJson($url,$payload)->assertOk();$this->postJson($url,$payload)->assertOk();$this->assertSame(1,MailNotification::count());
 $n=MailNotification::first();$this->assertStringContainsString('PrivateWifiSecret',$n->payload['text']);$this->assertStringContainsString('PrivateNetwork',$n->payload['html']);$this->assertStringNotContainsString('PrivateWifiSecret',$n->getRawOriginal('payload'));
 }
 public function test_payment_without_internet_selection_never_includes_wifi():void {
 $v=$this->venue();$b=app(BookingEngine::class)->reserve($v,User::factory()->create()->id,$this->input());
 $this->actingAs($v->owner)->postJson('/api/owner/venues/'.$v->slug.'/bookings/'.$b->id.'/payments',['amount'=>$b->deposit,'method'=>'cash','idempotency_key'=>(string)Str::uuid()])->assertOk();
 $this->assertStringNotContainsString('PrivateWifiSecret',MailNotification::first()->payload['html']);
 }
 public function test_stale_quote_cannot_purchase_old_extra_prices():void {
 $v=$this->venue();$i=$this->input([['id'=>'chairs','quantity'=>1]]);$q=app(BookingEngine::class)->quote($v,$i);$s=$v->settings;$s['inventory'][0]['unit_price']=3000;$v->update(['settings'=>$s]);$this->actingAs(User::factory()->create());
 $this->postJson('/api/venues/'.$v->slug.'/bookings',$i+['expected_total'=>$q['total'],'expected_version'=>$q['settings_version']])->assertUnprocessable();
 }
}
