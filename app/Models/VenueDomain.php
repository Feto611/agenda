<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class VenueDomain extends Model {
 protected $guarded=[];protected $hidden=['verification_token'];
 protected function casts():array{return ['enabled'=>'boolean','venue_id'=>'integer','dns_verified_at'=>'immutable_datetime','https_verified_at'=>'immutable_datetime'];}
 public function venue(){return $this->belongsTo(Venue::class);}
}
