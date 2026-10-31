<?php
use Illuminate\Database\Migrations\Migration;use Illuminate\Database\Schema\Blueprint;use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up():void{Schema::create('venue_domains',function(Blueprint $t){$t->id();$t->foreignId('venue_id')->unique()->constrained()->cascadeOnDelete();$t->string('hostname',253)->unique();$t->string('verification_token',64);$t->boolean('enabled')->default(false);$t->timestamp('dns_verified_at')->nullable();$t->timestamp('https_verified_at')->nullable();$t->string('last_error',300)->nullable();$t->timestamps();});}
 public function down():void{Schema::dropIfExists('venue_domains');}
};
