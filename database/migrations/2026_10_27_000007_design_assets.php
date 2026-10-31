<?php
use Illuminate\Database\Migrations\Migration;use Illuminate\Database\Schema\Blueprint;use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up():void {Schema::create('design_assets',function(Blueprint $t){$t->id();$t->foreignId('venue_id')->constrained()->cascadeOnDelete();$t->string('kind',10);$t->string('path');$t->timestamps();});}
 public function down():void {Schema::dropIfExists('design_assets');}
};
