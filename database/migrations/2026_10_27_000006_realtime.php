<?php
use Illuminate\Database\Migrations\Migration;use Illuminate\Database\Schema\Blueprint;use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up():void {Schema::create('realtime_outbox',function(Blueprint $t){$t->id();$t->json('channels');$t->string('kind',30);$t->string('status',15)->default('pending');$t->unsignedInteger('attempts')->default(0);$t->timestamp('available_at')->nullable();$t->timestamps();$t->index(['status','available_at']);});Schema::table('bookings',function(Blueprint $t){$t->timestamp('live_expiry_notified_at')->nullable();$t->index(['status','expires_at'],'bookings_live_expiry');});}
 public function down():void {Schema::table('bookings',function(Blueprint $t){$t->dropIndex('bookings_live_expiry');$t->dropColumn('live_expiry_notified_at');});Schema::dropIfExists('realtime_outbox');}
};
