<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class GatewayAccount extends Model {protected $guarded=['id'];protected $hidden=['credentials'];protected function casts():array{return ['credentials'=>'encrypted:array','enabled'=>'boolean','sandbox'=>'boolean','current'=>'boolean','venue_id'=>'integer'];}public function venue(){return $this->belongsTo(Venue::class);}}
