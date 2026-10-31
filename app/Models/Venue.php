<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Venue extends Model {
 protected $guarded=['id'];protected $hidden=['ai_key','design_draft','wifi_credentials'];
 protected function casts():array{return ['owner_id'=>'integer','owner_account_id'=>'integer','settings'=>'array','design'=>'array','design_draft'=>'array','published'=>'boolean','ai_key'=>'encrypted','wifi_credentials'=>'encrypted:array'];}
 // Replacing an unreadable encrypted value must not try to decrypt the old value during dirty checking.
 public function originalIsEquivalent($key){
  try{return parent::originalIsEquivalent($key);}
  catch(\Illuminate\Contracts\Encryption\DecryptException $e){
   if(in_array($key,['wifi_credentials','ai_key'],true))return false;
   throw $e;
  }
 }
 public function photos(){return $this->hasMany(VenuePhoto::class)->orderByDesc('cover')->orderBy('id');}
 public function reviews(){return $this->hasMany(VenueReview::class)->orderByDesc('id');}
 public function bookings(){return $this->hasMany(Booking::class);}
 public function owner(){return $this->belongsTo(Owner::class,'owner_account_id');}
 public function getRouteKeyName(){return 'slug';}
 public function publicData():array {$s=$this->settings;unset($s['ai']);$photos=($this->relationLoaded('photos')?$this->photos:$this->photos()->get())->where('visible',true)->values();$reviews=($this->relationLoaded('reviews')?$this->reviews:$this->reviews()->get())->where('visible',true)->values();$data=['id'=>$this->id,'slug'=>$this->slug,'name'=>$this->name,'settings'=>$s,'design'=>$this->design,'photos'=>$photos,'reviews'=>$reviews];$data['revision']=hash('sha256',json_encode($data));return $data;}
}
