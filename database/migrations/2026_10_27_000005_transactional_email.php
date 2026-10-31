<?php
use Illuminate\Database\Migrations\Migration;use Illuminate\Database\Schema\Blueprint;use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up():void {
 Schema::create('venue_mail_accounts',function(Blueprint $t){$t->id();$t->foreignId('venue_id')->unique()->constrained()->cascadeOnDelete();$t->string('provider',20);$t->boolean('enabled')->default(false);$t->string('from_email',254);$t->string('from_name',100);$t->string('reply_to',254)->nullable();$t->text('credentials');$t->timestamps();});
 Schema::create('mail_notifications',function(Blueprint $t){$t->uuid('id')->primary();$t->foreignId('venue_id')->constrained()->cascadeOnDelete();$t->foreignUuid('booking_id')->constrained()->cascadeOnDelete();$t->foreignUuid('booking_payment_id')->unique()->constrained('booking_payments')->cascadeOnDelete();$t->string('status',30)->default('pending')->index();$t->text('payload');$t->string('provider',20)->nullable();$t->string('provider_id',200)->nullable();$t->string('error',300)->nullable();$t->unsignedInteger('attempts')->default(0);$t->timestamp('sent_at')->nullable();$t->timestamps();});
 }
 public function down():void {Schema::dropIfExists('mail_notifications');Schema::dropIfExists('venue_mail_accounts');}
};
