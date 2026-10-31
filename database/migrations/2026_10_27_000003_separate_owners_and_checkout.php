<?php
use Illuminate\Database\Migrations\Migration;use Illuminate\Database\Schema\Blueprint;use Illuminate\Support\Facades\{Schema,DB,Hash};use Illuminate\Support\Str;
return new class extends Migration {
 public function up():void {
 Schema::table('users',fn(Blueprint $t)=>$t->string('account_type')->default('customer'));
 Schema::create('owners',function(Blueprint $t){$t->id();$t->foreignId('user_id')->unique()->constrained('users');$t->string('name');$t->string('email')->unique();$t->string('password');$t->boolean('activated')->default(false);$t->rememberToken();$t->timestamps();});
 Schema::create('owner_invitations',function(Blueprint $t){$t->id();$t->string('email');$t->string('token_hash',64)->unique();$t->timestamp('expires_at');$t->timestamp('used_at')->nullable();$t->timestamps();});
 Schema::table('venues',fn(Blueprint $t)=>$t->foreignId('owner_account_id')->nullable()->constrained('owners'));
 // Conservar la propiedad previa, sin copiar contraseñas de clientes al nuevo portal.
 $ids=DB::table('venues')->distinct()->pluck('owner_id');foreach($ids as $uid){$u=DB::table('users')->where('id',$uid)->first();$oid=DB::table('owners')->insertGetId(['user_id'=>$uid,'name'=>$u->name,'email'=>mb_strtolower($u->email),'password'=>Hash::make(Str::random(64)),'activated'=>false,'created_at'=>now(),'updated_at'=>now()]);DB::table('venues')->where('owner_id',$uid)->update(['owner_account_id'=>$oid]);}
 Schema::table('booking_payments',function(Blueprint $t){$t->foreignId('recorded_by_owner_id')->nullable()->constrained('owners');$t->string('provider_transaction_id')->nullable()->unique();});
 Schema::table('bookings',fn(Blueprint $t)=>$t->string('payment_attention')->nullable());
 Schema::create('gateway_accounts',function(Blueprint $t){$t->id();$t->foreignId('venue_id')->constrained();$t->string('provider');$t->boolean('enabled')->default(false);$t->boolean('sandbox')->default(true);$t->boolean('current')->default(true);$t->text('credentials');$t->timestamps();$t->index(['venue_id','provider','current']);});
 DB::statement('CREATE UNIQUE INDEX gateway_one_current ON gateway_accounts(venue_id, provider) WHERE "current" = true');
 Schema::create('checkout_attempts',function(Blueprint $t){$t->uuid('id')->primary();$t->foreignUuid('booking_id')->constrained('bookings');$t->foreignId('gateway_account_id')->constrained();$t->string('provider');$t->unsignedBigInteger('amount');$t->string('currency',3)->default('MXN');$t->string('status')->default('creating');$t->string('external_id')->nullable();$t->json('checkout')->nullable();$t->timestamp('expires_at');$t->string('review_reason')->nullable();$t->string('paid_transaction_id')->nullable();$t->timestamps();$t->unique(['gateway_account_id','external_id']);});
 }
 public function down():void{Schema::dropIfExists('checkout_attempts');Schema::table('bookings',fn(Blueprint $t)=>$t->dropColumn('payment_attention'));Schema::dropIfExists('gateway_accounts');Schema::table('booking_payments',function(Blueprint $t){$t->dropConstrainedForeignId('recorded_by_owner_id');$t->dropColumn('provider_transaction_id');});Schema::table('venues',fn(Blueprint $t)=>$t->dropConstrainedForeignId('owner_account_id'));Schema::dropIfExists('owner_invitations');Schema::dropIfExists('owners');Schema::table('users',fn(Blueprint $t)=>$t->dropColumn('account_type'));}
};
