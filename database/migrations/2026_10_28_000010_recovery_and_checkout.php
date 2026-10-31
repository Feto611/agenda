<?php
use Illuminate\Database\Migrations\Migration;use Illuminate\Database\Schema\Blueprint;use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up():void{foreach(['users','owners'] as $table)Schema::table($table,function(Blueprint $t){$t->timestamp('password_reset_at')->nullable();});Schema::create('account_recovery_tokens',function(Blueprint $t){$t->string('key',64)->primary();$t->string('token_hash',64);$t->timestamp('created_at');});Schema::table('checkout_attempts',function(Blueprint $t){$t->json('policy_acceptance')->nullable();});}
 public function down():void{Schema::table('checkout_attempts',fn(Blueprint $t)=>$t->dropColumn('policy_acceptance'));Schema::dropIfExists('account_recovery_tokens');foreach(['users','owners'] as $table)Schema::table($table,fn(Blueprint $t)=>$t->dropColumn('password_reset_at'));}
};
