<?php
use Illuminate\Database\Migrations\Migration;use Illuminate\Database\Schema\Blueprint;use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up():void {
 Schema::table('venues',function(Blueprint $t){$t->json('design_draft')->nullable();$t->json('design')->nullable();});
 Schema::create('meta_connections',function(Blueprint $t){$t->id();$t->foreignId('venue_id')->constrained()->cascadeOnDelete();$t->string('channel',20);$t->string('account_id',100);$t->text('credentials');$t->boolean('enabled')->default(false);$t->boolean('auto_reply')->default(false);$t->timestamps();$t->unique(['venue_id','channel']);});
 Schema::create('message_contacts',function(Blueprint $t){$t->id();$t->foreignId('venue_id')->constrained()->cascadeOnDelete();$t->foreignId('user_id')->nullable()->constrained()->nullOnDelete();$t->timestamps();$t->unique(['venue_id','user_id']);});
 Schema::create('message_threads',function(Blueprint $t){$t->id();$t->foreignId('venue_id')->constrained()->cascadeOnDelete();$t->foreignId('message_contact_id')->constrained()->cascadeOnDelete();$t->foreignId('meta_connection_id')->nullable()->constrained()->nullOnDelete();$t->string('channel',20);$t->string('external_id',150);$t->timestamp('last_inbound_at')->nullable();$t->boolean('paused')->default(false);$t->timestamps();$t->unique(['venue_id','channel','external_id']);});
 Schema::create('thread_messages',function(Blueprint $t){$t->id();$t->foreignId('message_thread_id')->constrained()->cascadeOnDelete();$t->string('external_id',200)->nullable();$t->string('direction',10);$t->text('body');$t->string('topic',30)->nullable();$t->string('status',30)->default('received');$t->timestamp('occurred_at')->nullable();$t->timestamps();$t->unique(['message_thread_id','external_id']);});
 Schema::create('contact_links',function(Blueprint $t){$t->id();$t->foreignId('message_contact_id')->constrained()->cascadeOnDelete();$t->string('token_hash',64)->unique();$t->timestamp('expires_at');$t->timestamp('used_at')->nullable();$t->timestamps();});
 }
 public function down():void {foreach(['contact_links','thread_messages','message_threads','message_contacts','meta_connections'] as $name)Schema::dropIfExists($name);Schema::table('venues',fn(Blueprint $t)=>$t->dropColumn(['design','design_draft']));}
};
