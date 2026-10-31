<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up():void {
 Schema::table('users',function(Blueprint $t){$t->string('phone',30)->nullable();});
 Schema::create('venues',function(Blueprint $t){$t->id();$t->foreignId('owner_id')->constrained('users');$t->string('slug')->unique();$t->string('name');$t->json('settings');$t->text('ai_key')->nullable();$t->boolean('published')->default(false);$t->timestamps();});
 Schema::create('bookings',function(Blueprint $t){$t->uuid('id')->primary();$t->foreignId('venue_id')->constrained();$t->foreignId('user_id')->constrained();$t->date('event_date');$t->timestampTz('starts_at');$t->timestampTz('ends_at');$t->timestampTz('blocked_from');$t->timestampTz('blocked_until');$t->unsignedInteger('guests');$t->unsignedBigInteger('total');$t->unsignedBigInteger('deposit');$t->json('quote');$t->string('status')->default('hold');$t->timestampTz('expires_at')->nullable();$t->timestamps();$t->index(['venue_id','blocked_from','blocked_until']);});
 Schema::create('chat_conversations',function(Blueprint $t){$t->id();$t->foreignId('venue_id')->constrained();$t->string('actor',80);$t->string('ip_hash',64);$t->date('day');$t->unsignedInteger('messages')->default(0);$t->unsignedInteger('tokens')->default(0);$t->json('threads');$t->timestamps();$t->unique(['venue_id','actor','day']);});
 }
 public function down():void {Schema::dropIfExists('chat_conversations');Schema::dropIfExists('bookings');Schema::dropIfExists('venues');Schema::table('users',fn(Blueprint $t)=>$t->dropColumn('phone'));}
};
