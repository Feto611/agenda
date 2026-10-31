<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class VenueSocialConnection extends Model {protected $guarded=['id'];protected $hidden=['token'];protected function casts():array{return ['token'=>'encrypted'];}}
