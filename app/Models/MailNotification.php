<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class MailNotification extends Model {public $incrementing=false;protected $keyType='string';protected $guarded=[];protected $hidden=['payload'];protected function casts():array{return ['venue_id'=>'integer','payload'=>'encrypted:array','sent_at'=>'datetime'];}public function booking(){return $this->belongsTo(Booking::class);}}
