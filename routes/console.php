<?php
use Illuminate\Support\Facades\{Artisan,DB};use Illuminate\Support\Str;use App\Models\Owner;
Artisan::command('owners:invite {email}',function(){ $email=mb_strtolower($this->argument('email'));if(!filter_var($email,FILTER_VALIDATE_EMAIL))return $this->error('Correo inválido.');if(Owner::where('email',$email)->where('activated',true)->exists())return $this->error('El propietario ya está activado.');$token=Str::random(64);DB::table('owner_invitations')->where('email',$email)->whereNull('used_at')->update(['expires_at'=>now()]);DB::table('owner_invitations')->insert(['email'=>$email,'token_hash'=>hash('sha256',$token),'expires_at'=>now()->addHours(24),'created_at'=>now(),'updated_at'=>now()]);$this->info('Invitación válida por 24 horas. Entrega este enlace únicamente al propietario:');$this->line(config('portal.owner_url').'/gestion?invitacion='.$token); })->purpose('Invitar un propietario desde la consola del servidor');

Artisan::command('payments:reconcile {--days=30} {--limit=100}',function(\App\Services\Payments\GatewayDriver $driver,\App\Services\Payments\PaymentService $service){$days=max(1,min(365,(int)$this->option('days')));$limit=max(1,min(1000,(int)$this->option('limit')));$rows=\App\Models\CheckoutAttempt::whereIn('status',['creating','pending','paid','unknown','partially_refunded'])->where('created_at','>=',now()->subDays($days))->orderBy('updated_at')->limit($limit)->get();foreach($rows as $a){try{if($a->provider==='paypal'&&!$a->external_id){app(\App\Services\Payments\PaymentSync::class)->sync($a,$driver,$service);$this->line($a->id.': sincronizado');continue;}$ids=$a->provider==='mercadopago'?$driver->findMercadoPayments($a):($a->external_id?[$a->external_id]:[]);foreach($ids as $id)$service->settle($a->account,$driver->read($a->account,$id));$this->line($a->id.': revisado');}catch(\Throwable $e){$this->warn($a->id.': no se pudo conciliar; revisa la cuenta del proveedor.');}}})->purpose('Conciliar pagos y notificaciones perdidas sin emitir cargos nuevos');
\Illuminate\Support\Facades\Schedule::command('payments:reconcile --days=30 --limit=100')->everyFiveMinutes()->withoutOverlapping();

Artisan::command('owners:list',function(){foreach(Owner::orderBy('id')->get() as $o)$this->line($o->id.' | '.$o->name.' | '.$o->email.' | '.($o->activated?'activado':'pendiente de invitación'));})->purpose('Consultar propietarios desde la consola del servidor');

Artisan::command('meta:process {--limit=50}',function(\App\Services\MetaMessaging $meta){$this->info('Mensajes respondidos: '.$meta->process(max(1,min(200,(int)$this->option('limit')))));})->purpose('Procesar mensajes Meta firmados, sin duplicar envíos inciertos');
\Illuminate\Support\Facades\Schedule::command('meta:process --limit=50')->everyMinute()->withoutOverlapping();

Artisan::command('notifications:deliver {--limit=50}',function(\App\Services\Email\PaymentEmails $emails,\App\Services\Email\EmailDriver $driver){$this->info('Correos aceptados por el proveedor: '.$emails->deliver($driver,max(1,min(200,(int)$this->option('limit')))));})->purpose('Entregar confirmaciones de pago verificadas');
\Illuminate\Support\Facades\Schedule::command('notifications:deliver --limit=50')->everyMinute()->withoutOverlapping();

Artisan::command('realtime:flush {--limit=100}',function(\App\Services\Realtime\Invalidations $live){$live->expireHolds();$this->info('Actualizaciones publicadas: '.$live->flush(max(1,min(1000,(int)$this->option('limit')))));});
Artisan::command('realtime:work',function(\App\Services\Realtime\Invalidations $live){$this->info('Publicador realtime iniciado.');$lastExpiry=0;$lastClean=0;while(true){try{if(time()!==$lastExpiry){$live->expireHolds();$lastExpiry=time();}if(time()-$lastClean>=3600){\Illuminate\Support\Facades\DB::table('realtime_outbox')->where('created_at','<',now()->subDays(2))->delete();$lastClean=time();}$live->flush();}catch(\Throwable $e){$this->warn('Realtime temporalmente no disponible. Se reintentará.');}usleep(250000);}})->purpose('Publicar invalidaciones WebSocket y vencimientos de apartados');

Artisan::command('platform:admin {email} {--revoke}',function(){
 $email=mb_strtolower(trim($this->argument('email')));
 $owner=Owner::whereRaw('LOWER(email) = ?',[$email])->where('activated',true)->first();
 if(!$owner){$this->error('No existe un propietario activo con ese correo.');return 1;}
 $owner->forceFill(['platform_admin'=>!$this->option('revoke')])->save();
 $this->info($this->option('revoke')?'Permiso global retirado.':'Permiso global concedido. Cierra sesión y vuelve a entrar.');
 return 0;
})->purpose('Asignar o retirar desde el servidor el permiso de marca de toda la plataforma');

\Illuminate\Support\Facades\Schedule::call(fn()=>DB::table('account_recovery_tokens')->where('created_at','<',now()->subHour())->delete())->daily();

Artisan::command('security:key-status',function(){
 $cipher=app('encrypter');$fingerprint=fn($key)=>substr(hash('sha256',$key),0,16);
 $this->line('portal: '.config('portal.kind'));
 $this->line('clave_actual_huella: '.$fingerprint($cipher->getKey()));
 $previous=array_map($fingerprint,$cipher->getPreviousKeys());sort($previous);
 $this->line('claves_anteriores_huellas: '.($previous?implode(',',$previous):'ninguna'));
 $reader=app(\App\Services\Payments\GatewayCredentials::class);
 $unreadable=\App\Models\GatewayAccount::where('current',true)->get()->filter(fn($g)=>$reader->read($g)['unreadable'])->count();
 $this->line('pasarelas_actuales_ilegibles: '.$unreadable);
 $this->line('Solo se muestran huellas SHA-256, nunca las claves ni las credenciales.');
 return 0;
})->purpose('Comparar claves entre contenedores sin revelar secretos');

Artisan::command('payments:diagnose {venue} {provider=paypal}',function(\App\Services\Payments\GatewayDriver $driver,\App\Services\Payments\GatewayCredentials $reader,\App\Services\Payments\PaymentFailure $failures){
 $venue=\App\Models\Venue::where('slug',$this->argument('venue'))->first();if(!$venue){$this->error('Local no encontrado.');return 1;}
 $provider=$this->argument('provider');$g=\App\Models\GatewayAccount::where('venue_id',$venue->id)->where('provider',$provider)->where('current',true)->first();if(!$g){$this->error('Pasarela no configurada.');return 1;}
 $this->line('Proveedor: '.$provider.' | Modo: '.($g->sandbox?'Sandbox':'Producción'));
 $this->line('Credenciales legibles: '.($reader->read($g)['unreadable']?'no':'sí'));
 $this->line('Configuración completa: '.($reader->usable($g)?'sí':'no'));
 $this->line('CUSTOMER_URL usa HTTPS: '.(parse_url(config('portal.customer_url'),PHP_URL_SCHEME)==='https'?'sí':'no'));
 if($provider==='paypal'){try{$driver->paypal($g);$this->line('Conexión OAuth PayPal: correcta (no se creó una orden ni se realizó un cobro).');}catch(\Throwable $e){$this->line('Conexión OAuth PayPal: fallida.');$this->line(json_encode($failures->describe($e,'oauth_test'),JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES));}}
 $a=\App\Models\CheckoutAttempt::whereHas('booking',fn($q)=>$q->where('venue_id',$venue->id))->where('provider',$provider)->whereNotNull('provider_error')->latest('updated_at')->first();
 if($a){$this->line('Último error guardado: intento '.$a->id);$this->line(json_encode($a->provider_error,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES));}else $this->line('No hay errores guardados con el diagnóstico nuevo.');
 return 0;
})->purpose('Diagnóstico sin secretos y prueba OAuth de PayPal sin emitir cargos');

Artisan::command('domains:caddyfile',function(\App\Services\VenueDomains $domains){
 try{$this->output->write($domains->caddyfile());return 0;}catch(\Throwable $e){fwrite(STDERR,$e->getMessage().PHP_EOL);return 1;}
})->purpose('Generar configuración Caddy solo para portales y dominios con propiedad verificada');
Artisan::command('domains:recheck {--limit=100}',function(\App\Services\VenueDomains $domains,\App\Services\DomainNetwork $network){
 if(!$domains->generalEnabled())return 0;
 $rows=\App\Models\VenueDomain::where('enabled',true)->orderBy('dns_verified_at')->limit(max(1,min(1000,(int)$this->option('limit'))))->get();
 foreach($rows as $row){try{\Illuminate\Support\Facades\DB::transaction(function()use($row,$domains,$network){$site=\App\Models\VenueDomain::whereKey($row->id)->lockForUpdate()->firstOrFail();$site=$domains->checkDns($site,$network);if($domains->fresh($site->dns_verified_at))$domains->checkHttps($site,$network);});$this->line($row->hostname.': comprobado');}catch(\Throwable $e){$this->warn($row->hostname.': no se pudo comprobar.');}}
 return 0;
})->purpose('Revalidar propiedad DNS y HTTPS sin activar dominios nuevos');
\Illuminate\Support\Facades\Schedule::command('domains:recheck --limit=100')->hourly()->withoutOverlapping();
