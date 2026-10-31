<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up():void {
  Schema::table('checkout_attempts',fn(Blueprint $t)=>$t->string('purpose',16)->nullable());
  Schema::table('owners',fn(Blueprint $t)=>$t->timestamp('email_verified_at')->nullable());
  Schema::create('account_email_tokens',function(Blueprint $t){$t->string('key',64)->primary();$t->string('email',254);$t->string('token_hash',64);$t->text('token_secret');$t->timestamp('created_at');$t->timestamp('sent_at')->nullable();});
 }
 public function down():void {Schema::dropIfExists('account_email_tokens');Schema::table('owners',fn(Blueprint $t)=>$t->dropColumn('email_verified_at'));Schema::table('checkout_attempts',fn(Blueprint $t)=>$t->dropColumn('purpose'));}
};
