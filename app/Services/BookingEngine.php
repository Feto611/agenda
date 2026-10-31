<?php
namespace App\Services;
use App\Models\Venue;use App\Models\Booking;use Carbon\CarbonImmutable;use Illuminate\Support\Facades\DB;use Illuminate\Support\Str;use Illuminate\Validation\ValidationException;
class BookingEngine {
 private function fail(string $message):never{throw ValidationException::withMessages(['reservation'=>$message]);}
 public function quote(Venue $venue,array $input):array {
 $s=$venue->settings;$date=$input['date'];$start=(float)$input['start'];$startMinutes=(int)round($start*60);if(!is_finite($start)||$start<0||$startMinutes>=2880||abs($start*60-$startMinutes)>0.00001)$this->fail('Hora de inicio no válida.');$hours=(int)$input['hours'];$guests=(int)$input['guests'];
 $d=CarbonImmutable::createFromFormat('!Y-m-d',$date,$s['timezone']);
 if(!$d||$d->format('Y-m-d')!==$date||$d->lt(CarbonImmutable::now($s['timezone'])->startOfDay())||$d->gt(CarbonImmutable::now($s['timezone'])->addYears(2)))$this->fail('Fecha fuera del período permitido.');
 if(in_array($d->dayOfWeek,$s['closed_weekdays']))$this->fail('El establecimiento no abre ese día.');
 if($guests<1||$guests>$s['capacity'])$this->fail('El número de invitados supera el aforo.');
 if($hours<1||$hours>24||($s['mode']==='day'&&$hours<$s['included_hours']))$this->fail('Duración no permitida.');
 $begins=$d->addMinutes($startMinutes);$ends=$begins->addHours($hours);$from=$begins->subMinutes($s['prep_minutes']);$until=$ends->addMinutes($s['clean_minutes']);
 if($from->lt($d->addMinutes($s['open_hour']*60+($s['open_minute']??0)))||$until->gt($d->addMinutes($s['close_hour']*60+($s['close_minute']??0)))||$begins->isPast())$this->fail('El evento y sus márgenes deben caber en el horario del local y comenzar en el futuro.');
 $kind=in_array($date,$s['holidays'])?'holiday':($d->isWeekend()?'weekend':'weekday');$rate=$s[$kind.'_price'];$extras=$s['mode']==='day'?max(0,$hours-$s['included_hours']):0;
 $total=$s['mode']==='day'?$rate+$extras*$s['extra_hour_price']:$rate*$hours;
 $items=[];$extrasTotal=0;$seen=[];
 foreach($input['extras']??[] as $choice){
 $id=$choice['id']??'';$quantity=$choice['quantity']??null;
 if(isset($seen[$id]))$this->fail('Un extra está repetido.');$seen[$id]=true;
 $item=collect($s['inventory']??[])->firstWhere('id',$id);
 if(!$item||!($item['enabled']??false)||!is_int($quantity)||$quantity<1||$quantity>$item['quantity'])$this->fail('Un servicio o cantidad ya no está disponible. Revisa los extras.');
 $cost=$item['unit_price']*$quantity;$extrasTotal+=$cost;
 $items[]=['id'=>$id,'name'=>$item['name'],'kind'=>$item['kind'],'color'=>$item['color']??null,'quantity'=>$quantity,'unit_price'=>$item['unit_price'],'total'=>$cost];
 }
 $baseTotal=$total;$total+=$extrasTotal;
 if($total>100000000)$this->fail('El total supera el límite permitido para una reserva.');
 $deposit=$s['deposit_type']==='percent'?(int)ceil($total*$s['deposit_value']/100):min($total,$s['deposit_value']);
 if($s['mode']==='day'){$from=$d->addMinutes($s['open_hour']*60+($s['open_minute']??0));$until=$d->addMinutes($s['close_hour']*60+($s['close_minute']??0));}
 return ['date'=>$date,'starts_at'=>$begins->utc()->toIso8601String(),'ends_at'=>$ends->utc()->toIso8601String(),'blocked_from'=>$from->utc()->toIso8601String(),'blocked_until'=>$until->utc()->toIso8601String(),'guests'=>$guests,'extras'=>$items,'extras_total'=>$extrasTotal,'base_total'=>$baseTotal,'total'=>$total,'deposit'=>$deposit,'balance'=>$total-$deposit,'rate'=>$rate,'extra_hours'=>$extras,'extra_cost'=>$extras*$s['extra_hour_price'],'rate_type'=>$kind,'currency'=>'MXN','timezone'=>$s['timezone'],'settings_version'=>sha1(json_encode($venue->settings))];
 }
 public function hasConflict(Venue $venue,array $q):bool{return $venue->bookings()->blocking()->where('blocked_from','<',CarbonImmutable::parse($q['blocked_until']))->where('blocked_until','>',CarbonImmutable::parse($q['blocked_from']))->exists();}
 public function reserve(Venue $venue,int $userId,array $input):Booking {
 return DB::transaction(function()use($venue,$userId,$input){
 $v=Venue::whereKey($venue->id)->lockForUpdate()->firstOrFail();abort_unless($v->published,404);
 $q=$this->quote($v,$input);if(isset($input['expected_total'])&&($input['expected_total']!==$q['total']||($input['expected_version']??null)!==$q['settings_version']))$this->fail('La tarifa o configuración cambió. Revisa la nueva cotización antes de apartar.');if($this->hasConflict($v,$q))$this->fail('Ese espacio acaba de ocuparse. Selecciona otro horario.');
 if(Booking::where('user_id',$userId)->where('status','hold')->where('expires_at','>',now())->count()>=5)$this->fail('Ya tienes cinco apartados activos.');
 if(!empty($input['policy_accepted']))$q['reservation_policy']=ReservationPolicy::acceptance();
 return Booking::create(['id'=>(string)Str::uuid(),'venue_id'=>$v->id,'user_id'=>$userId,'event_date'=>$q['date'],'starts_at'=>$q['starts_at'],'ends_at'=>$q['ends_at'],'blocked_from'=>$q['blocked_from'],'blocked_until'=>$q['blocked_until'],'guests'=>$q['guests'],'total'=>$q['total'],'deposit'=>$q['deposit'],'quote'=>$q,'status'=>'hold','expires_at'=>now()->addMinutes(15)]);
 },3);
 }
}
