<?php
use Illuminate\Database\Migrations\Migration;use Illuminate\Database\Schema\Blueprint;use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up():void{Schema::table('checkout_attempts',function(Blueprint $t){$t->json('provider_error')->nullable();$t->timestamp('last_sync_at')->nullable();$t->timestamp('sync_locked_until')->nullable();$t->unsignedInteger('sync_attempts')->default(0);});}
 public function down():void{Schema::table('checkout_attempts',fn(Blueprint $t)=>$t->dropColumn(['provider_error','last_sync_at','sync_locked_until','sync_attempts']));}
};
