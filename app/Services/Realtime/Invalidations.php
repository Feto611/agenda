<?php
namespace App\Services\Realtime;
use App\Models\{Venue,Booking};use Illuminate\Support\Facades\{DB,Broadcast};
class Invalidations {
 public function record(array $channels,string $kind):void {if(!$channels)return;DB::table('realtime_outbox')->insert(['channels'=>json_encode(array_values(array_unique($channels))),'kind'=>$kind,'status'=>'pending','attempts'=>0,'available_at'=>now(),'created_at'=>now(),'updated_at'=>now()]);}
 public function venue(Venue $v):void {$public=$v->published||($v->getOriginal('published')??false);$channels=['private-owner.'.$v->owner_account_id];if($public)$channels=array_merge($channels,['catalogue','venue.'.$v->id]);$this->record($channels,'venue');}
 public function booking(Booking $b):void {$v=Venue::find($b->venue_id);if(!$v)return;$channels=['private-owner.'.$v->owner_account_id,'private-customer.'.$b->user_id];if($v->published)$channels[]='venue.'.$v->id;$this->record($channels,'booking');}
 public function owner(int $venueId,string $kind):void {$v=Venue::find($venueId);if($v)$this->record(['private-owner.'.$v->owner_account_id],$kind);}
 public function expireHolds(int $limit=100):int {
 $count=0;$rows=Booking::where('status','hold')->where('expires_at','<=',now())->where(fn($q)=>$q->whereNull('live_expiry_notified_at')->orWhereColumn('live_expiry_notified_at','<','expires_at'))->limit($limit)->get();foreach($rows as $b){DB::transaction(function()use($b,&$count){$row=Booking::whereKey($b->id)->lockForUpdate()->first();if(!$row||$row->status!=='hold'||!$row->expires_at||$row->expires_at->isFuture())return;if($row->live_expiry_notified_at&&\Carbon\Carbon::parse($row->live_expiry_notified_at)->gte($row->expires_at))return;DB::table('bookings')->where('id',$row->id)->update(['live_expiry_notified_at'=>now()]);$this->booking($row);$count++;});}return $count;
 }
 public function flush(int $limit=100):int {
 if(!config('realtime.enabled'))return 0;
 // Recover a crashed publisher. Repeated invalidations only trigger an idempotent API refresh.
 DB::table('realtime_outbox')->where('status','sending')->where('updated_at','<',now()->subMinute())->update(['status'=>'pending','available_at'=>now()]);
 $count=0;$rows=DB::table('realtime_outbox')->where('status','pending')->where('available_at','<=',now())->orderBy('id')->limit($limit)->get();$groups=[];
 foreach($rows as $row){if(!DB::table('realtime_outbox')->where('id',$row->id)->where('status','pending')->update(['status'=>'sending','updated_at'=>now(),'attempts'=>DB::raw('attempts + 1')]))continue;$groups[$row->kind][]=$row;}
 foreach($groups as $kind=>$group){$channels=[];foreach($group as $r)$channels=array_merge($channels,json_decode($r->channels,true));$ids=array_column($group,'id');try{Broadcast::connection('reverb')->broadcast(array_values(array_unique($channels)),'platform.changed',['kind'=>$kind,'version'=>max($ids)]);DB::table('realtime_outbox')->whereIn('id',$ids)->delete();$count+=count($ids);}catch(\Throwable $e){DB::table('realtime_outbox')->whereIn('id',$ids)->update(['status'=>'pending','available_at'=>now()->addSeconds(5),'updated_at'=>now()]);}}
 return $count;
 }
}
