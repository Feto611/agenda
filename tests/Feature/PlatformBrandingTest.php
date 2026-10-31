<?php
namespace Tests\Feature;
use App\Models\{Owner,User,PlatformSetting};
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\{Storage,DB};
use Illuminate\Http\UploadedFile;
use Tests\TestCase;
class PlatformBrandingTest extends TestCase {
 use RefreshDatabase;
 private function owner(bool $admin=false):Owner{
 $u=User::factory()->create();$o=Owner::unguarded(fn()=>Owner::create(['user_id'=>$u->id,'name'=>$u->name,'email'=>$u->email,'password'=>'Password12345','activated'=>true,'email_verified_at'=>now()]));$o->forceFill(['platform_admin'=>$admin])->save();return $o;
 }
 private function data():array{return ['name'=>'Mi Jardín','tagline'=>'Celebra aquí','page_title'=>'Reserva tu fecha','catalogue_title'=>'Nuestros espacios','catalogue_intro'=>'Jardines y salones','support_email'=>'reservas@example.com','support_phone'=>'3121234567'];}
 public function test_only_platform_admin_can_modify_global_brand_and_config_is_public():void{
 $o=$this->owner();$this->actingAs($o)->putJson('/api/owner/platform-branding',$this->data())->assertForbidden();
 $this->actingAs(User::factory()->create())->putJson('/api/owner/platform-branding',$this->data())->assertForbidden();
 $this->actingAs($this->owner(true))->putJson('/api/owner/platform-branding',$this->data())->assertOk()->assertJsonPath('name','Mi Jardín')->assertJsonMissingPath('logo_path');
 $this->getJson('/api/platform-branding')->assertOk()->assertJsonPath('catalogue_title','Nuestros espacios')->assertJsonPath('name','Mi Jardín');
 $this->assertDatabaseHas('realtime_outbox',['kind'=>'platform']);
 }
 public function test_platform_admin_is_assigned_only_from_console_and_can_be_revoked():void{
 $o=$this->owner();$this->artisan('platform:admin',['email'=>$o->email])->assertSuccessful();$this->assertTrue($o->fresh()->platform_admin);
 $this->actingAs($o->fresh())->getJson('/api/me')->assertJsonPath('user.platform_admin',true);
 $this->artisan('platform:admin',['email'=>$o->email,'--revoke'=>true])->assertSuccessful();$this->assertFalse($o->fresh()->platform_admin);
 }
 public function test_public_registration_cannot_grant_platform_permissions():void{config(['portal.owner_registration'=>'open']);
 config(['portal.kind'=>'owner']);$this->postJson('/api/owner-auth/register',['name'=>'Dueño nuevo','email'=>'new@example.com','password'=>'Password12345','password_confirmation'=>'Password12345','platform_admin'=>true])->assertCreated()->assertJsonPath('user.platform_admin',false);
 $this->assertFalse(Owner::first()->platform_admin);
 }
 public function test_upload_logo_and_favicon_validate_files_and_only_serve_current_image():void{
 Storage::fake('local');$o=$this->owner(true);$this->actingAs($o);
 foreach(['logo','favicon'] as $kind){
 $this->postJson('/api/owner/platform-branding/images/'.$kind,['image'=>UploadedFile::fake()->image('asset.png',128,128)])->assertOk()->assertJsonMissingPath($kind.'_path');
 $path=PlatformSetting::current()[$kind.'_path'];Storage::disk('local')->assertExists($path);$this->get('/api/platform-branding/images/'.$kind)->assertOk();
 $this->deleteJson('/api/owner/platform-branding/images/'.$kind)->assertOk();Storage::disk('local')->assertMissing($path);$this->get('/api/platform-branding/images/'.$kind)->assertNotFound();
 }
 $this->postJson('/api/owner/platform-branding/images/logo',['image'=>UploadedFile::fake()->createWithContent('bad.svg','<svg onload="alert(1)"/>')])->assertUnprocessable();
 }
 public function test_global_brand_preserves_other_fields_on_upload_and_rejects_invalid_input():void{
 Storage::fake('local');$this->actingAs($this->owner(true))->putJson('/api/owner/platform-branding',$this->data())->assertOk();
 $this->postJson('/api/owner/platform-branding/images/logo',['image'=>UploadedFile::fake()->image('logo.png')])->assertOk()->assertJsonPath('name','Mi Jardín');
 $d=$this->data();$d['name']='';$this->putJson('/api/owner/platform-branding',$d)->assertUnprocessable();
 $this->getJson('/api/platform-branding')->assertJsonPath('name','Mi Jardín');
 }
 public function test_readiness_is_admin_only_and_does_not_claim_live_checks():void{
 $this->actingAs($this->owner())->getJson('/api/owner/platform-branding/readiness')->assertForbidden();
 $r=$this->actingAs($this->owner(true))->getJson('/api/owner/platform-branding/readiness')->assertOk()->assertJsonPath('checks.0.ok',false);
 $this->assertStringContainsString('prueba',$r->getContent());
 }
}
