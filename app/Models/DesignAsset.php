<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class DesignAsset extends Model {
 protected $fillable=['venue_id','kind','path'];protected $hidden=['path'];
 protected function casts():array{return ['venue_id'=>'integer'];}
 public function venue(){return $this->belongsTo(Venue::class);}
}
