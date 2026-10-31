<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class VenueMailAccount extends Model {protected $guarded=['id'];protected $hidden=['credentials'];protected function casts():array{return ['venue_id'=>'integer','enabled'=>'boolean','credentials'=>'encrypted:array'];}}
