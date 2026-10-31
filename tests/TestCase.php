<?php
namespace Tests;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
abstract class TestCase extends BaseTestCase {
 public function actingAs(\Illuminate\Contracts\Auth\Authenticatable $user,$guard=null){\Illuminate\Support\Facades\Auth::forgetGuards();$owner=$user instanceof \App\Models\Owner;config(['portal.kind'=>$owner?'owner':'client']);return parent::actingAs($user,$guard??($owner?'owner':'web'));}
}
