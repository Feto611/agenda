<?php
namespace App\Observers;
use App\Services\Realtime\Invalidations;use App\Models\{Venue,VenuePhoto,VenueReview,Booking,BookingPayment,MailNotification,CheckoutAttempt};use Illuminate\Database\Eloquent\Model;
class RealtimeObserver {
 public function saved(Model $model):void {$this->changed($model);}
 public function deleted(Model $model):void {$this->changed($model);}
 private function changed(Model $m):void {
 if(!config('realtime.enabled'))return;$events=app(Invalidations::class);
 if($m instanceof Venue){$events->venue($m);return;}
 if($m instanceof VenuePhoto||$m instanceof VenueReview){$v=Venue::find($m->venue_id);if($v)$events->venue($v);return;}
 if($m instanceof Booking){$events->booking($m);return;}
 if($m instanceof BookingPayment||$m instanceof CheckoutAttempt){$b=Booking::find($m->booking_id);if($b)$events->booking($b);return;}
 if($m instanceof MailNotification)$events->owner($m->venue_id,'mail');
 }
}
