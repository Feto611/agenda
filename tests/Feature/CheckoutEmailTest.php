<?php
namespace Tests\Feature;
use App\Models\{User,Owner,Venue,GatewayAccount,CheckoutAttempt};
use App\Services\{BookingEngine,VenueSettings,EmailVerification};
use App\Services\Payments\{PaymentService,GatewayDriver};
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\{DB,Http,Mail,RateLimiter,Crypt};
use Illuminate\Support\Str;
use Tests\TestCase;
class CheckoutEmailTest extends TestCase {
 use RefreshDatabase;
 private function fixture():array{
  $u=User::factory()->create();$o=Owner::create(['user_id'=>User::factory()->create()->id,'name'=>'Dueño','email'=>Str::random(8).'@example.com','password'=>'OwnerPassword123','activated'=>true]);
  $v=Venue::create(['owner_id'=>$o->user_id,'owner_account_id'=>$o->id,'name'=>'Jardín','slug'=>'jardin-'.Str::lower(Str::random(8)),'published'=>true,'settings'=>array_replace(VenueSettings::defaults(),['capacity'=>100,'open_hour'=>10,'close_hour'=>26,'included_hours'=>8,'extra_hour_price'=>0,'weekday_price'=>100000,'weekend_price'=>100000,'holiday_price'=>100000,'prep_minutes'=>0,'clean_minutes'=>0,'deposit_value'=>30])]);
  $b=app(BookingEngine::class)->reserve($v,$u->id,['date'=>now('America/Mexico_City')->addMonth()->format('Y-m-d'),'start'=>14,'hours'=>8,'guests'=>10,'policy_accepted'=>true]);
  $g=GatewayAccount::create(['venue_id'=>$v->id,'provider'=>'paypal','enabled'=>true,'sandbox'=>true,'credentials'=>['client_id'=>'client','client_secret'=>'secret','merchant_id'=>'ABC23456789DE','webhook_id'=>'webhook']]);
  Http::fake(['*/v1/oauth2/token'=>Http::response(['access_token'=>'token']),'*/v2/checkout/orders'=>function(){static $n=0;$id='ORDER'.++$n;return Http::response(['id'=>$id,'links'=>[['rel'=>'approve','href'=>'https://www.sandbox.paypal.com/checkoutnow?token='.$id]]]);}]);$this->actingAs($u);return [$u,$o,$v,$b,$g];
 }
 private function pay($b,$purpose='deposit'){return $this->postJson('/api/bookings/'.$b->id.'/checkout',['provider'=>'paypal','purpose'=>$purpose,'policy_accepted'=>true]);}
 public function test_full_payment_can_be_replaced_by_deposit_and_old_order_cannot_capture():void{
  [$u,$o,$v,$b]=$this->fixture();$old=$this->pay($b,'balance')->assertOk()->assertJsonPath('amount',100000)->json();$new=$this->pay($b)->assertOk()->assertJsonPath('amount',30000)->assertJsonPath('purpose','deposit')->json();
  $this->assertNotSame($old['id'],$new['id']);$this->assertSame('superseded',CheckoutAttempt::find($old['id'])->status);
  Http::fake(['*/v1/oauth2/token'=>Http::response(['access_token'=>'token']),'*/v2/checkout/orders/'.$old['external_id']=>Http::response(['id'=>$old['external_id'],'status'=>'APPROVED'])]);
  $this->postJson('/api/checkout/'.$old['id'].'/capture')->assertUnprocessable();Http::assertNotSent(fn($r)=>str_ends_with($r->url(),'/capture'));$this->assertSame(0,$b->payments()->count());
 }
 public function test_same_choice_reuses_order_and_switch_back_uses_correct_server_amount():void{
  [$u,$o,$v,$b]=$this->fixture();$a=$this->pay($b)->assertOk()->json();$this->pay($b)->assertOk()->assertJsonPath('id',$a['id']);$full=$this->pay($b,'balance')->assertOk()->assertJsonPath('amount',100000)->json();$this->assertNotSame($full['id'],$a['id']);$this->assertSame(2,$b->checkoutAttempts()->count());Http::assertSentCount(4);
 }
 public function test_unknown_or_capture_started_attempt_is_not_replaced():void{
  [$u,$o,$v,$b]=$this->fixture();$a=$this->pay($b)->assertOk()->json();$row=CheckoutAttempt::find($a['id']);$row->update(['status'=>'unknown']);$this->pay($b,'balance')->assertUnprocessable();$row->update(['status'=>'pending','checkout'=>array_merge($row->checkout,['capture_started_at'=>now()->toIso8601String()])]);$this->pay($b,'balance')->assertUnprocessable();$this->assertSame(1,$b->checkoutAttempts()->count());
 }
 public function test_capture_claim_can_only_be_obtained_once():void{
  [$u,$o,$v,$b]=$this->fixture();$a=CheckoutAttempt::find($this->pay($b)->json('id'));app(PaymentService::class)->authorizeCapture($a,true);$this->expectException(\Symfony\Component\HttpKernel\Exception\HttpException::class);app(PaymentService::class)->authorizeCapture($a,true);
 }
 public function test_checkout_limit_is_per_authenticated_user_and_returns_spanish_wait():void{
  [$u,$o,$v,$b]=$this->fixture();for($i=0;$i<20;$i++)$this->pay($b)->assertOk();$this->pay($b)->assertStatus(429)->assertJsonPath('retry_after',fn($n)=>$n>0)->assertSee('Espera');$other=User::factory()->create();$b->update(['user_id'=>$other->id]);$this->actingAs($other);$this->pay($b)->assertOk();$this->assertSame(1,$b->checkoutAttempts()->count());
 }
 public function test_unverified_customer_cannot_reserve_or_start_payment_but_can_read_reservations():void{
  [$u,$o,$v,$b]=$this->fixture();$u->forceFill(['email_verified_at'=>null])->save();$this->pay($b)->assertForbidden()->assertJsonPath('code','email_verification_required');$this->postJson('/api/venues/'.$v->slug.'/bookings',[])->assertForbidden();$this->getJson('/api/bookings')->assertOk();Http::assertNothingSent();
 }
 public function test_verification_link_is_hashed_portal_bound_single_use_and_survives_resend():void{
  [$u,$o]=$this->fixture();$u->forceFill(['email_verified_at'=>null])->save();Mail::fake();$service=app(EmailVerification::class);$key=$service->key($u);$this->postJson('/api/email/send')->assertOk();$before=DB::table('account_email_tokens')->where('key',$key)->first();$this->travel(61)->seconds();$this->postJson('/api/email/send')->assertOk();$after=DB::table('account_email_tokens')->where('key',$key)->first();$this->assertSame($before->token_hash,$after->token_hash);$this->assertSame($before->created_at,$after->created_at);$token=Crypt::decryptString($before->token_secret);$this->assertSame(hash('sha256',$token),$before->token_hash);
  config(['portal.kind'=>'owner']);$this->postJson('/api/email/verify',['account'=>$u->id,'token'=>$token])->assertUnprocessable();config(['portal.kind'=>'client']);$this->postJson('/api/email/verify',['account'=>$u->id,'token'=>$token])->assertOk();$this->assertNotNull($u->fresh()->email_verified_at);$this->postJson('/api/email/verify',['account'=>$u->id,'token'=>$token])->assertUnprocessable();$this->travelBack();
 }
 public function test_expired_verification_and_changed_email_are_rejected():void{
  [$u]=$this->fixture();$u->forceFill(['email_verified_at'=>null])->save();Mail::fake();app(EmailVerification::class)->send($u);$row=DB::table('account_email_tokens')->first();$token=Crypt::decryptString($row->token_secret);$u->update(['email'=>'changed@example.com']);$this->postJson('/api/email/verify',['account'=>$u->id,'token'=>$token])->assertUnprocessable();$u->update(['email'=>$row->email]);$this->travel(61)->minutes();$this->postJson('/api/email/verify',['account'=>$u->id,'token'=>$token])->assertUnprocessable();$this->travelBack();
 }
 public function test_owner_must_verify_to_modify_but_can_request_link_and_read_panel():void{
  [$u,$o,$v]=$this->fixture();$this->actingAs($o,'owner');$this->getJson('/api/owner/venues')->assertOk();$this->putJson('/api/owner/venues/'.$v->slug,[])->assertForbidden()->assertJsonPath('code','email_verification_required');Mail::fake();$this->postJson('/api/email/send')->assertOk();$o->forceFill(['email_verified_at'=>now()])->save();$this->putJson('/api/owner/venues/'.$v->slug,[])->assertUnprocessable();
 }
 public function test_recovery_after_cooldown_keeps_original_token_and_expiry_until_thirty_minutes():void{
  $u=User::factory()->create();Mail::fake();$d=['email'=>$u->email];$this->postJson('/api/password/forgot',$d)->assertOk();$row=DB::table('account_recovery_tokens')->first();$this->travel(2)->minutes();$this->postJson('/api/password/forgot',$d)->assertOk();$again=DB::table('account_recovery_tokens')->first();$this->assertSame($row->token_hash,$again->token_hash);$this->assertSame($row->created_at,$again->created_at);$this->travel(29)->minutes();$this->postJson('/api/password/forgot',$d)->assertOk();$this->assertNotSame($row->token_hash,DB::table('account_recovery_tokens')->first()->token_hash);$this->travelBack();
 }
 public function test_signup_verification_cannot_be_forged_from_payload():void{
  Mail::fake();$this->postJson('/api/register',['name'=>'Cliente','email'=>'new@example.com','password'=>'Password12345','password_confirmation'=>'Password12345','email_verified_at'=>now()->toIso8601String()])->assertCreated()->assertJsonPath('user.email_verified_at',null);$this->assertDatabaseCount('account_email_tokens',1);
 }
}
