<?php
use Illuminate\Database\Migrations\Migration;use Illuminate\Database\Schema\Blueprint;use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up():void{Schema::create('email_designs',function(Blueprint $t){$t->id();$t->string('scope',80)->unique();$t->json('settings');$t->timestamps();});}
 public function down():void{Schema::dropIfExists('email_designs');}
};
