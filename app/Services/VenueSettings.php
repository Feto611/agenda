<?php
namespace App\Services;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
class VenueSettings {
 public static function defaults():array{return ['inventory'=>[],'description'=>'','address'=>'','lat'=>null,'lng'=>null,'timezone'=>'America/Mexico_City','mode'=>'day','capacity'=>null,'open_hour'=>null,'close_hour'=>null,'open_minute'=>0,'close_minute'=>0,'prep_minutes'=>null,'clean_minutes'=>null,'included_hours'=>null,'weekday_price'=>null,'weekend_price'=>null,'holiday_price'=>null,'extra_hour_price'=>null,'deposit_type'=>'percent','deposit_value'=>null,'holidays'=>[],'closed_weekdays'=>[],'contact_phone'=>'','instagram'=>'','facebook'=>'','rules'=>'','ai'=>['provider'=>'rules','endpoint'=>'','model'=>'','temperature'=>0.2,'max_tokens'=>350,'guest_messages'=>5,'guest_conversations'=>1,'guest_tokens'=>10000,'member_messages'=>30,'instructions'=>'']];}
 public function validate(array $data):array {
 $required=($data['published']??false)?'required':'nullable';
 $v=Validator::make($data,[
 'name'=>'required|string|min:2|max:120','slug'=>['required','string','regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/','max:100'],
 'published'=>'required|boolean','settings'=>'required|array','settings.description'=>'nullable|string|max:3000','settings.address'=>$required.'|string|max:350',
 'settings.lat'=>$required.'|numeric|between:-85,85','settings.lng'=>$required.'|numeric|between:-180,180','settings.timezone'=>'required|timezone','settings.mode'=>['required',Rule::in(['day','hour'])],
 'settings.capacity'=>$required.'|integer|min:1|max:100000','settings.open_hour'=>$required.'|integer|min:0|max:23','settings.close_hour'=>$required.'|integer|min:0|max:47','settings.open_minute'=>'sometimes|integer|between:0,59','settings.close_minute'=>'sometimes|integer|between:0,59',
 'settings.prep_minutes'=>$required.'|integer|min:0|max:1440','settings.clean_minutes'=>$required.'|integer|min:0|max:1440','settings.included_hours'=>$required.'|integer|min:1|max:24',
 'settings.weekday_price'=>$required.'|integer|min:0|max:100000000','settings.weekend_price'=>$required.'|integer|min:0|max:100000000','settings.holiday_price'=>$required.'|integer|min:0|max:100000000','settings.extra_hour_price'=>$required.'|integer|min:0|max:100000000',
 'settings.deposit_type'=>['required',Rule::in(['percent','fixed'])],'settings.deposit_value'=>$required.'|integer|min:0|max:100000000',
 'settings.holidays'=>'present|array|max:500','settings.holidays.*'=>'date_format:Y-m-d|distinct','settings.closed_weekdays'=>'present|array|max:7','settings.closed_weekdays.*'=>'integer|between:0,6|distinct',
 'settings.contact_phone'=>'nullable|string|max:30','settings.instagram'=>'nullable|url:https|max:250','settings.facebook'=>'nullable|url:https|max:250','settings.rules'=>'nullable|string|max:5000',
 'settings.ai'=>'required|array','settings.ai.provider'=>['required',Rule::in(['rules','openai','anthropic','ollama','compatible'])],'settings.ai.endpoint'=>'nullable|url|max:250','settings.ai.model'=>'nullable|string|max:100',
 'settings.ai.temperature'=>'required|numeric|between:0,1','settings.ai.max_tokens'=>'required|integer|between:100,1000','settings.ai.guest_messages'=>'required|integer|between:1,20','settings.ai.guest_conversations'=>'required|integer|between:1,5','settings.ai.guest_tokens'=>'required|integer|between:300,10000','settings.ai.member_messages'=>'required|integer|between:1,200','settings.ai.instructions'=>'nullable|string|max:2000',
 'settings.inventory'=>'sometimes|array|max:100',
 'settings.inventory.*'=>'array:id,name,kind,color,quantity,unit_price,enabled',
 'settings.inventory.*.id'=>'required|string|regex:/^[a-zA-Z0-9_-]+$/|max:64|distinct',
 'settings.inventory.*.name'=>'required|string|max:100',
 'settings.inventory.*.kind'=>['required',Rule::in(['chairs','tables','tablecloths','decoration','speakers','refrigerator','stove','internet','pool','trampoline','other'])],
 'settings.inventory.*.color'=>'nullable|string|max:50',
 'settings.inventory.*.quantity'=>'required|integer|between:1,100000',
 'settings.inventory.*.unit_price'=>'required|integer|between:0,100000000',
 'settings.inventory.*.enabled'=>'required|boolean',
 'wifi'=>'sometimes|array:ssid,password,clear,replace',
 'wifi.ssid'=>'nullable|string|max:100','wifi.password'=>'nullable|string|max:200','wifi.clear'=>'sometimes|boolean','wifi.replace'=>'sometimes|boolean',
 'ai_key'=>'nullable|string|max:1000','clear_ai_key'=>'sometimes|boolean'
 ])->validate();
 $s=$v['settings'];$open=$s['open_hour']*60+($s['open_minute']??0);$close=$s['close_hour']*60+($s['close_minute']??0);if(!$v['published'])return $v;abort_if($close<=$open,422,'El cierre debe ser posterior a la apertura. Si cierra después de medianoche, selecciona al día siguiente.');
 abort_if($s['included_hours']*60+$s['clean_minutes']+$s['prep_minutes']>$close-$open,422,'Las horas incluidas y los márgenes no caben en el horario.');
 abort_if($s['deposit_type']==='percent'&&$s['deposit_value']>100,422,'El anticipo porcentual no puede superar 100%.');
 return $v;
 }
}
