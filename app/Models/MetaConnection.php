<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class MetaConnection extends Model {protected $guarded=['id'];protected $hidden=['credentials'];protected function casts():array{return ['credentials'=>'encrypted:array','enabled'=>'boolean','auto_reply'=>'boolean'];}public function venue(){return $this->belongsTo(Venue::class);}}
