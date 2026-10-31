<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up():void {
 Schema::table('owners',fn(Blueprint $t)=>$t->boolean('platform_admin')->default(false));
 Schema::create('platform_settings',function(Blueprint $t){$t->unsignedBigInteger('id')->primary();$t->json('settings');$t->timestamps();});
 }
 public function down():void {Schema::dropIfExists('platform_settings');Schema::table('owners',fn(Blueprint $t)=>$t->dropColumn('platform_admin'));}
};
