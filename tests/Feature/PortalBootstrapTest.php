<?php
namespace Tests\Feature;
use Tests\TestCase;
class PortalBootstrapTest extends TestCase {
 public function test_owner_html_identifies_portal_without_a_session_api_call_and_is_not_cached():void{
 config(['portal.kind'=>'owner']);
 $this->get('/gestion/identidad')->assertOk()->assertSee('name="app-portal" content="owner"',false);
 $r=$this->get('/gestion');$r->assertOk()->assertSee('name="app-portal" content="owner"',false)->assertSee('Gestión del negocio');
 $r->assertHeader('X-Encuentro-Portal','owner');$this->assertStringContainsString('no-store',$r->headers->get('Cache-Control'));
 $this->getJson('/api/me')->assertOk()->assertJsonPath('portal.kind','owner')->assertHeader('X-Encuentro-Portal','owner');
 }
 public function test_customer_html_identifies_customer_and_does_not_expose_admin_route():void{
 config(['portal.kind'=>'client']);$this->get('/')->assertOk()->assertSee('name="app-portal" content="client"',false)->assertHeader('X-Encuentro-Portal','client');
 $this->get('/gestion/identidad')->assertNotFound();$this->get('/gestion')->assertNotFound();$this->getJson('/api/me')->assertJsonPath('portal.kind','client')->assertJsonPath('portal.owner_path',null);
 }
}
