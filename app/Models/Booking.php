<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Booking extends Model {
 public $incrementing=false;protected $keyType='string';protected $guarded=[];protected $appends=['order_number','paid_total','balance_due','payment_status'];
 protected function casts():array{return ['venue_id'=>'integer','user_id'=>'integer','quote'=>'array','expires_at'=>'immutable_datetime','starts_at'=>'immutable_datetime','ends_at'=>'immutable_datetime','blocked_from'=>'immutable_datetime','blocked_until'=>'immutable_datetime'];}
 public function checkoutAttempts(){return $this->hasMany(CheckoutAttempt::class)->orderByDesc('created_at');}
 public function payments(){return $this->hasMany(BookingPayment::class)->orderBy('created_at');}
 public function getOrderNumberAttribute(){return 'EV-'.strtoupper(str_replace('-','',$this->id));}
 public function getPaidTotalAttribute(){return (int)($this->attributes['payments_sum_amount']??($this->relationLoaded('payments')?$this->payments->sum('amount'):$this->payments()->sum('amount')));}
 public function getBalanceDueAttribute(){return max(0,$this->total-$this->paid_total);}
 public function getPaymentStatusAttribute(){return $this->paid_total<=0?'unpaid':($this->balance_due===0?'paid':'partial');}
 public function venue(){return $this->belongsTo(Venue::class);}
 public function user(){return $this->belongsTo(User::class);}
 public function scopeBlocking($q){return $q->where(fn($q)=>$q->whereIn('status',['confirmed','completed'])->orWhere(fn($q)=>$q->where('status','hold')->where('expires_at','>',now())));}
}
