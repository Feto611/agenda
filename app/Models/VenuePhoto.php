<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class VenuePhoto extends Model {protected $guarded=['id'];protected $hidden=['path'];protected $appends=['image_url'];protected function casts():array{return ['venue_id'=>'integer','visible'=>'boolean','cover'=>'boolean'];}public function venue(){return $this->belongsTo(Venue::class);}public function getImageUrlAttribute(){return '/api/media/photos/'.$this->id;}}
