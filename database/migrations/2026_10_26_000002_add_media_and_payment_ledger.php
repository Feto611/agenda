<?php
use Illuminate\Database\Migrations\Migration;use Illuminate\Database\Schema\Blueprint;use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up():void{
 Schema::create('venue_photos',function(Blueprint $t){$t->id();$t->foreignId('venue_id')->constrained();$t->string('source')->default('upload');$t->string('external_id')->nullable();$t->string('path')->nullable();$t->text('url')->nullable();$t->text('source_url')->nullable();$t->string('caption',500)->nullable();$t->string('author')->nullable();$t->boolean('visible')->default(false);$t->boolean('cover')->default(false);$t->timestamps();$t->unique(['venue_id','source','external_id']);});
 Schema::create('venue_reviews',function(Blueprint $t){$t->id();$t->foreignId('venue_id')->constrained();$t->string('source')->default('owner');$t->string('external_id')->nullable();$t->string('author',150);$t->text('body');$t->unsignedTinyInteger('rating')->nullable();$t->text('source_url')->nullable();$t->boolean('visible')->default(false);$t->timestamps();$t->unique(['venue_id','source','external_id']);});
 Schema::create('venue_social_connections',function(Blueprint $t){$t->id();$t->foreignId('venue_id')->constrained();$t->string('provider');$t->string('account_id');$t->text('token');$t->timestamps();$t->unique(['venue_id','provider']);});
 Schema::create('booking_payments',function(Blueprint $t){$t->uuid('id')->primary();$t->foreignUuid('booking_id')->constrained('bookings');$t->foreignId('recorded_by')->constrained('users');$t->unsignedBigInteger('amount');$t->string('method',30);$t->string('reference',150)->nullable();$t->uuid('idempotency_key');$t->timestamps();$t->unique(['booking_id','idempotency_key']);});
 }
 public function down():void{Schema::dropIfExists('booking_payments');Schema::dropIfExists('venue_social_connections');Schema::dropIfExists('venue_reviews');Schema::dropIfExists('venue_photos');}
};
