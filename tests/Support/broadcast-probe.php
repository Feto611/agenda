<?php
// Synthetic loopback protocol test only. No application data is read or written.
require __DIR__.'/../../vendor/autoload.php';
$app=require __DIR__.'/../../bootstrap/app.php';$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();
if(getenv('REALTIME_PROTOCOL_TEST')!=='1'||getenv('APP_ENV')!=='testing')throw new RuntimeException('Test environment required.');
\Illuminate\Support\Facades\Broadcast::connection('reverb')->broadcast(['catalogue','private-owner.1'],'platform.changed',['kind'=>'venue','version'=>123]);
echo "published\n";
