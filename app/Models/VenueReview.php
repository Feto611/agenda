<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class VenueReview extends Model {protected $guarded=['id'];protected function casts():array{return ['venue_id'=>'integer','visible'=>'boolean','rating'=>'integer'];}public function venue(){return $this->belongsTo(Venue::class);}}
