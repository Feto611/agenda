<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class CheckoutAttempt extends Model {public $incrementing=false;protected $keyType='string';protected $guarded=[];protected $hidden=['provider_error','review_reason','last_sync_at','sync_locked_until','sync_attempts'];protected function casts():array{return ['provider_error'=>'array','last_sync_at'=>'immutable_datetime','sync_locked_until'=>'immutable_datetime','sync_attempts'=>'integer','amount'=>'integer','policy_acceptance'=>'array','checkout'=>'array','expires_at'=>'immutable_datetime'];}public function booking(){return $this->belongsTo(Booking::class);}public function account(){return $this->belongsTo(GatewayAccount::class,'gateway_account_id');}}
