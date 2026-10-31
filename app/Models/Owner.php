<?php
namespace App\Models;
use Illuminate\Foundation\Auth\User as Authenticatable;
class Owner extends Authenticatable {protected $guarded=['id','platform_admin','email_verified_at'];protected $hidden=['password','remember_token','user_id'];protected function casts():array{return ['email_verified_at'=>'datetime','password'=>'hashed','activated'=>'boolean','platform_admin'=>'boolean','user_id'=>'integer'];}}
