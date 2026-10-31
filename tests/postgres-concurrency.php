<?php
// Run only against a dedicated database ending in _concurrency_test.
require __DIR__.'/../vendor/autoload.php';
foreach(['APP_ENV'=>'testing','REALTIME_ENABLED'=>'false'] as $key=>$value){putenv($key.'='.$value);$_ENV[$key]=$value;$_SERVER[$key]=$value;}
$app=require __DIR__.'/../bootstrap/app.php';$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
use App\Models\{User,Owner,Venue,Booking,CheckoutAttempt,GatewayAccount};
use App\Services\{BookingEngine,VenueSettings};
use App\Services\Payments\{PaymentService,GatewayDriver};
use Illuminate\Support\Facades\{DB,Http,Artisan};
use Illuminate\Support\Str;
if(config('database.default')!=='pgsql'||!str_ends_with((string)config('database.connections.pgsql.database'),'_concurrency_test')||getenv('CONCURRENCY_TEST')!=='1'){
 fwrite(STDERR,"Se requiere CONCURRENCY_TEST=1, DB_CONNECTION=pgsql y una BD dedicada con sufijo _concurrency_test. No uses la base de producción.\n");exit(2);
}
if(!function_exists('pcntl_fork')){fwrite(STDERR,"Se requiere la extensión pcntl.\n");exit(2);}
config(['realtime.enabled'=>false,'cache.default'=>'array','mail.default'=>'array']);Http::preventStrayRequests();
$schema='concurrency_'.bin2hex(random_bytes(8));DB::statement('CREATE SCHEMA "'.$schema.'"');
config(['database.connections.pgsql.search_path'=>$schema]);DB::purge();
$work=sys_get_temp_dir().'/'.$schema;mkdir($work,0700);
function check(bool $ok,string $message):void{if(!$ok)throw new RuntimeException($message);}
// Barrier: all eight independent connections are ready before any action starts.
function race(string $name,callable $action,int $workers=8):array{
 global $work;$dir=$work.'/'.$name;mkdir($dir,0700);DB::disconnect();$pids=[];
 for($i=0;$i<$workers;$i++){
  $pid=pcntl_fork();if($pid===-1)throw new RuntimeException('No se pudo crear un proceso.');
  if($pid===0){DB::purge();try{DB::select('SELECT 1');touch($dir.'/ready-'.$i);$deadline=microtime(true)+15;while(!is_file($dir.'/go')){if(microtime(true)>$deadline)throw new RuntimeException('Barrera agotada.');usleep(10000);}$start=microtime(true);$data=$action($i);$out=['ok'=>true,'data'=>$data,'pid'=>getmypid(),'started'=>$start,'ended'=>microtime(true)];}
   catch(Throwable $e){$out=['ok'=>false,'class'=>$e::class,'error'=>$e->getMessage(),'pid'=>getmypid()];}
   file_put_contents($dir.'/result-'.$i,json_encode($out));DB::disconnect();exit(0);
  }$pids[]=$pid;
 }
 $deadline=microtime(true)+15;while(count(glob($dir.'/ready-*'))<$workers){if(microtime(true)>$deadline){foreach($pids as $pid)posix_kill($pid,SIGTERM);throw new RuntimeException('No todos los procesos llegaron a la barrera.');}usleep(10000);}touch($dir.'/go');
 foreach($pids as $pid){pcntl_waitpid($pid,$status);check(pcntl_wexitstatus($status)===0,'Proceso interrumpido.');}
 DB::purge();$results=[];for($i=0;$i<$workers;$i++){$results[]=json_decode(file_get_contents($dir.'/result-'.$i),true,512,JSON_THROW_ON_ERROR);}
 check(count(array_unique(array_column($results,'pid')))===$workers,'Los procesos deben ser independientes.');return $results;
}
class ConcurrencyGateway extends GatewayDriver {
 public function create(CheckoutAttempt $a):array{DB::table('concurrency_calls')->insert(['operation'=>'create','attempt'=>$a->id]);usleep(150000);return ['external_id'=>'ORDER'.str_replace('-','',$a->id),'checkout'=>['url'=>'https://www.sandbox.paypal.com/checkoutnow?token=TEST']];}
 public function capture(CheckoutAttempt $a):void{DB::table('concurrency_calls')->insert(['operation'=>'capture','attempt'=>$a->id]);usleep(150000);}
}
function paidData(CheckoutAttempt $a):array{return ['reference'=>$a->id,'amount'=>$a->amount,'currency'=>'MXN','merchant'=>'ABC23456789DE','paid'=>true,'transaction'=>'CAPTURE'.str_replace('-','',$a->id),'external_id'=>$a->external_id];}
try{
 Artisan::call('migrate',['--force'=>true]);
 DB::statement('CREATE TABLE concurrency_calls (id bigserial PRIMARY KEY, operation text NOT NULL, attempt text NOT NULL)');
 $ownerUser=User::create(['name'=>'Cliente','email'=>Str::lower(Str::random(16)).'@example.test','password'=>'ConcurrentPassword123']);$owner=Owner::create(['user_id'=>$ownerUser->id,'name'=>'Dueño','email'=>'owner@example.test','password'=>'OwnerPassword123','activated'=>true]);
 $venue=Venue::create(['owner_id'=>$ownerUser->id,'owner_account_id'=>$owner->id,'name'=>'Concurrencia','slug'=>'concurrencia','published'=>true,'settings'=>array_replace(VenueSettings::defaults(),['capacity'=>100,'open_hour'=>10,'close_hour'=>26,'prep_minutes'=>0,'clean_minutes'=>0,'included_hours'=>8,'weekday_price'=>100000,'weekend_price'=>100000,'holiday_price'=>100000,'extra_hour_price'=>0,'deposit_value'=>30])]);
 $users=[];for($i=0;$i<8;$i++)$users[]=User::create(['name'=>'Cliente','email'=>Str::lower(Str::random(16)).'@example.test','password'=>'ConcurrentPassword123'])->id;
 $input=['date'=>now('America/Mexico_City')->addMonth()->format('Y-m-d'),'start'=>14,'hours'=>8,'guests'=>20,'policy_accepted'=>true];
 $results=race('same-slot',fn($i)=>app(BookingEngine::class)->reserve(Venue::find($venue->id),$users[$i],$input)->id);
 $ok=array_filter($results,fn($r)=>$r['ok']);check(count($ok)===1,'Debe haber exactamente un apartado para el mismo horario.');
 foreach($results as $r)if(!$r['ok'])check($r['class']===Illuminate\Validation\ValidationException::class&&str_contains($r['error'],'ocuparse'),'El conflicto debe ser una validación esperada, no un fallo SQL.');
 check(Booking::count()===1,'Se duplicó el horario.');echo "PASS: 8 clientes, mismo horario: 1 apartado y 7 conflictos controlados.\n";
 $results=race('different-slots',function($i)use($venue,$users,$input){$d=$input;$d['date']=now('America/Mexico_City')->addMonths(2)->addDays($i)->format('Y-m-d');return app(BookingEngine::class)->reserve(Venue::find($venue->id),$users[$i],$d)->id;});
 foreach($results as $r)check($r['ok'],json_encode($r));echo "PASS: 8 clientes, fechas distintas: 8 apartados.\n";
 $g=GatewayAccount::create(['venue_id'=>$venue->id,'provider'=>'paypal','enabled'=>true,'sandbox'=>true,'credentials'=>['client_id'=>'fake','client_secret'=>'fake','merchant_id'=>'ABC23456789DE','webhook_id'=>'fake']]);
 $b=Booking::first();$results=race('same-checkout',fn($i)=>app(PaymentService::class)->start(Booking::find($b->id),'paypal','deposit',new ConcurrencyGateway,true)->id);
 foreach($results as $r)check($r['ok'],json_encode($r));$ids=array_column($results,'data');check(count(array_unique($ids))===1,'Se crearon varios intentos.');check(CheckoutAttempt::where('booking_id',$b->id)->count()===1,'Intentos duplicados.');check(DB::table('concurrency_calls')->where('operation','create')->count()===1,'Se creó más de una orden externa.');echo "PASS: 8 preparaciones simultáneas de una reserva: 1 intento y 1 creación externa simulada.\n";
 $a=CheckoutAttempt::find($ids[0]);$results=race('same-capture',function($i)use($a){$s=app(PaymentService::class);$fresh=CheckoutAttempt::find($a->id);try{$s->authorizeCapture($fresh,true);}catch(Symfony\Component\HttpKernel\Exception\HttpException $e){check($e->getStatusCode()===422,'Error no esperado.');return 'already-processing';}(new ConcurrencyGateway)->capture($fresh);$s->settle($fresh->account,paidData($fresh));return 'captured';});
 foreach($results as $r)check($r['ok'],json_encode($r));check(DB::table('concurrency_calls')->where('operation','capture')->count()===1,'Capturas duplicadas.');check($b->payments()->count()===1&&$b->fresh()->paid_total===30000,'Asientos duplicados o importe incorrecto.');echo "PASS: 8 aprobaciones simultáneas: 1 captura simulada y 1 abono de 300 pesos.\n";
 $results=race('same-webhook',fn($i)=>app(PaymentService::class)->settle(GatewayAccount::find($g->id),paidData(CheckoutAttempt::find($a->id)))->status);
 foreach($results as $r)check($r['ok'],json_encode($r));check($b->payments()->count()===1,'Webhook duplicó dinero.');echo "PASS: 8 notificaciones simultáneas del mismo pago: ningún abono duplicado.\n";
 $others=Booking::where('id','!=',$b->id)->pluck('id')->all();$results=race('different-payments',function($i)use($others){$b=Booking::find($others[$i]);$s=app(PaymentService::class);$a=$s->start($b,'paypal','deposit',new ConcurrencyGateway,true);$s->authorizeCapture($a,true);(new ConcurrencyGateway)->capture($a);$s->settle($a->account,paidData($a));return $b->fresh()->paid_total;});
 foreach($results as $r)check($r['ok']&&$r['data']===30000,json_encode($r));check(DB::table('booking_payments')->count()===9,'Conteo de pagos incorrecto.');echo "PASS: 8 clientes pagando reservas distintas: 8 abonos únicos con importes correctos.\n";
 $newInput=$input;$newInput['date']=now('America/Mexico_City')->addMonths(4)->format('Y-m-d');$switchBooking=app(BookingEngine::class)->reserve($venue,$users[0],$newInput);$old=app(PaymentService::class)->start($switchBooking,'paypal','balance',new ConcurrencyGateway,true);
 $results=race('switch-vs-capture',function($i)use($old,$switchBooking){$s=app(PaymentService::class);try{if($i%2===0){$a=CheckoutAttempt::find($old->id);$s->authorizeCapture($a,true);(new ConcurrencyGateway)->capture($a);$s->settle($a->account,paidData($a));return 'captured';}return $s->start(Booking::find($switchBooking->id),'paypal','deposit',new ConcurrencyGateway,true)->id;}catch(Symfony\Component\HttpKernel\Exception\HttpException $e){check($e->getStatusCode()===422,'Error no esperado en cambio de importe.');return 'blocked';}});
 foreach($results as $r)check($r['ok'],json_encode($r));$old=$old->fresh();$captures=DB::table('concurrency_calls')->where('operation','capture')->where('attempt',$old->id)->count();
 check($captures<=1,'La carrera emitió capturas duplicadas.');if($old->status==='superseded'){check($captures===0&&$switchBooking->payments()->count()===0,'Se cobró un intento reemplazado.');check($switchBooking->checkoutAttempts()->where('status','pending')->count()===1,'Debe quedar un solo anticipo activo.');}else{check($captures===1&&$switchBooking->fresh()->paid_total===100000,'El cobro iniciado debe conservar su importe y bloquear el reemplazo.');}
 echo "PASS: cambiar importe y aprobar a la vez: el bloqueo impide cobrar un intento reemplazado.\n";
 echo "RESULTADO: 7 escenarios concurrentes aprobados con PostgreSQL ".DB::selectOne('SHOW server_version')->server_version.". Proveedores simulados; ningún cobro real.\n";
}catch(Throwable $e){fwrite(STDERR,'FAIL: '.$e->getMessage()."\n".$e->getTraceAsString()."\n");$failed=true;}
finally{DB::disconnect();config(['database.connections.pgsql.search_path'=>'public']);DB::purge();DB::statement('DROP SCHEMA "'.$schema.'" CASCADE');foreach(glob($work.'/*') as $dir){foreach(glob($dir.'/*') as $f)unlink($f);rmdir($dir);}rmdir($work);}
exit(isset($failed)?1:0);
