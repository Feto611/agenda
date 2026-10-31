<?php
namespace Tests\Feature;
use App\Models\{Venue,Owner,User,MailNotification};
use App\Services\{VenueSettings,BookingEngine};
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Encryption\Encrypter;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;
class CredentialRecoveryTest extends TestCase {
 use RefreshDatabase;
 private function venue():Venue{
 $u=User::factory()->create();$o=Owner::unguarded(fn()=>Owner::create(['user_id'=>$u->id,'name'=>$u->name,'email'=>$u->email,'password'=>'OwnerPassword12345','activated'=>true,'email_verified_at'=>now()]));
 return Venue::create(['owner_id'=>$u->id,'owner_account_id'=>$o->id,'name'=>'Local de recuperación','slug'=>'recover-'.Str::lower(Str::random(8)),'published'=>true,'settings'=>array_replace(VenueSettings::defaults(),['capacity'=>100,'open_hour'=>10,'close_hour'=>26,'prep_minutes'=>0,'clean_minutes'=>60,'included_hours'=>8,'weekday_price'=>100000,'weekend_price'=>100000,'holiday_price'=>100000,'extra_hour_price'=>10000,'deposit_value'=>30,'address'=>'Colima','lat'=>19.2,'lng'=>-103.7,'inventory'=>[['id'=>'wifi','name'=>'Internet','kind'=>'internet','color'=>'','quantity'=>1,'unit_price'=>0,'enabled'=>true]]])]);
 }
 private function oldWifi(Venue $v):string{
 $old=new Encrypter(str_repeat('B',32),'AES-256-CBC');
 $cipher=$old->encryptString(json_encode(['ssid'=>'OldNetwork','password'=>'OldWifiSecret']));
 DB::table('venues')->where('id',$v->id)->update(['wifi_credentials'=>$cipher]);return $cipher;
 }
 private function data(Venue $v):array{return ['name'=>$v->name,'slug'=>$v->slug,'settings'=>$v->settings,'published'=>true];}
 public function test_bad_mac_in_wifi_and_ai_never_blocks_owner_listing_or_exposes_ciphertext():void{
 $v=$this->venue();$cipher=$this->oldWifi($v);DB::table('venues')->where('id',$v->id)->update(['ai_key'=>(new Encrypter(str_repeat('C',32),'AES-256-CBC'))->encryptString('OldAiSecret')]);
 $this->actingAs($v->owner)->getJson('/api/owner/venues')->assertOk()->assertJsonPath('0.wifi.unreadable',true)->assertJsonPath('0.wifi.ssid','')->assertJsonPath('0.has_ai_key',false)->assertJsonCount(2,'0.credential_warnings')->assertDontSee('OldWifiSecret')->assertDontSee('OldAiSecret')->assertDontSee($cipher);
 $this->assertSame($cipher,DB::table('venues')->where('id',$v->id)->value('wifi_credentials'));
 $this->getJson('/api/venues/'.$v->slug)->assertOk()->assertJsonMissingPath('wifi')->assertJsonMissingPath('credential_warnings');
 }
 public function test_saving_other_fields_preserves_unreadable_wifi_even_when_form_sends_empty_values():void{
 $v=$this->venue();$cipher=$this->oldWifi($v);$this->actingAs($v->owner);
 $data=$this->data($v);$data['name']='Nombre actualizado';$data['wifi']=['ssid'=>'','password'=>'','clear'=>false];
 $this->putJson('/api/owner/venues/'.$v->slug,$data)->assertOk()->assertJsonPath('wifi.unreadable',true);
 $this->assertSame('Nombre actualizado',$v->fresh()->name);
 $this->assertSame($cipher,DB::table('venues')->where('id',$v->id)->value('wifi_credentials'));
 }
 public function test_unreadable_wifi_replacement_requires_explicit_consent_and_rolls_back_unrelated_changes():void{
 $v=$this->venue();$cipher=$this->oldWifi($v);$data=$this->data($v);$data['name']='Should roll back';$data['wifi']=['ssid'=>'NewNetwork','password'=>'NewSecret'];
 $this->actingAs($v->owner)->putJson('/api/owner/venues/'.$v->slug,$data)->assertUnprocessable()->assertJsonValidationErrors('wifi.replace');
 $this->assertSame($v->name,$v->fresh()->name);$this->assertSame($cipher,DB::table('venues')->where('id',$v->id)->value('wifi_credentials'));
 }
 public function test_explicit_replacement_encrypts_new_wifi_and_requires_a_network_name():void{
 $v=$this->venue();$old=$this->oldWifi($v);$data=$this->data($v);$data['wifi']=['replace'=>true,'ssid'=>'','password'=>''];
 $this->actingAs($v->owner)->putJson('/api/owner/venues/'.$v->slug,$data)->assertUnprocessable();
 $data['wifi']=['replace'=>true,'ssid'=>'NewNetwork','password'=>'NewWifiSecret'];
 $this->putJson('/api/owner/venues/'.$v->slug,$data)->assertOk()->assertJsonPath('wifi.unreadable',false)->assertJsonPath('wifi.has_password',true)->assertDontSee('NewWifiSecret');
 $this->assertSame('NewWifiSecret',$v->fresh()->wifi_credentials['password']);
 $raw=$v->fresh()->getRawOriginal('wifi_credentials');$this->assertNotSame($old,$raw);$this->assertStringNotContainsString('NewWifiSecret',$raw);
 }
 public function test_ai_key_can_be_replaced_when_the_previous_ciphertext_is_unreadable():void{
 $v=$this->venue();DB::table('venues')->where('id',$v->id)->update(['ai_key'=>(new Encrypter(str_repeat('C',32),'AES-256-CBC'))->encryptString('OldAiSecret')]);
 $this->actingAs($v->owner)->putJson('/api/owner/venues/'.$v->slug,$this->data($v)+['ai_key'=>'NewAiSecret'])->assertOk()->assertJsonPath('has_ai_key',true)->assertDontSee('NewAiSecret');
 $this->assertSame('NewAiSecret',$v->fresh()->ai_key);
 }
 public function test_wifi_clear_is_explicit_and_cannot_be_done_by_another_owner():void{
 $v=$this->venue();$old=$this->oldWifi($v);$other=$this->venue();$data=$this->data($v)+['wifi'=>['clear'=>true]];
 $this->actingAs($other->owner)->putJson('/api/owner/venues/'.$v->slug,$data)->assertForbidden();
 $this->assertSame($old,DB::table('venues')->where('id',$v->id)->value('wifi_credentials'));
 $this->actingAs($v->owner)->putJson('/api/owner/venues/'.$v->slug,$data)->assertOk();$this->assertNull($v->fresh()->wifi_credentials);
 }
 public function test_previous_key_recovers_wifi_without_modifying_ciphertext():void{
 $v=$this->venue();$old=$this->oldWifi($v);app('encrypter')->previousKeys([str_repeat('B',32)]);
 try{
 $this->actingAs($v->owner)->getJson('/api/owner/venues')->assertOk()->assertJsonPath('0.wifi.unreadable',false)->assertJsonPath('0.wifi.ssid','OldNetwork')->assertJsonPath('0.wifi.has_password',true)->assertDontSee('OldWifiSecret');
 $this->assertSame($old,DB::table('venues')->where('id',$v->id)->value('wifi_credentials'));
 }finally{app('encrypter')->previousKeys([]);}
 }
 public function test_unreadable_wifi_does_not_rollback_a_verified_payment_or_repeat_confirmation():void{
 $v=$this->venue();$this->oldWifi($v);
 $b=app(BookingEngine::class)->reserve($v,User::factory()->create()->id,['date'=>now()->addMonth()->format('Y-m-d'),'start'=>12,'hours'=>8,'guests'=>10,'extras'=>[['id'=>'wifi','quantity'=>1]]]);
 $data=['amount'=>$b->deposit,'method'=>'cash','idempotency_key'=>(string)Str::uuid()];
 $url='/api/owner/venues/'.$v->slug.'/bookings/'.$b->id.'/payments';
 $this->actingAs($v->owner)->postJson($url,$data)->assertOk()->assertJsonPath('status','confirmed');$this->postJson($url,$data)->assertOk();
 $this->assertSame(1,MailNotification::count());$this->assertSame($b->deposit,$b->fresh()->paid_total);
 $text=MailNotification::first()->payload['text'];$this->assertStringContainsString('Contacta al establecimiento',$text);$this->assertStringNotContainsString('OldWifiSecret',$text);
 }
}
