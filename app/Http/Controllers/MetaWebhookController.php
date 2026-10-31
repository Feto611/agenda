<?php
namespace App\Http\Controllers;
use App\Models\{Venue,MetaConnection};use App\Services\MetaMessaging;use Illuminate\Http\Request;
class MetaWebhookController extends Controller {
 public function __invoke(Request $r,Venue $venue,string $channel,MetaMessaging $meta){$c=MetaConnection::where('venue_id',$venue->id)->where('channel',$channel)->where('enabled',true)->firstOrFail();$keys=$c->credentials;
 if($r->isMethod('get')){abort_unless(($r->query('hub_mode')??$r->query('hub.mode'))==='subscribe'&&hash_equals((string)($keys['verify_token']??''),(string)($r->query('hub_verify_token')??$r->query('hub.verify_token'))),403);$challenge=(string)($r->query('hub_challenge')??$r->query('hub.challenge'));abort_unless(strlen($challenge)<=200,422);return response($challenge,200)->header('Content-Type','text/plain');}
 abort_unless(filled($keys['app_secret']??null)&&hash_equals('sha256='.hash_hmac('sha256',$r->getContent(),$keys['app_secret']),(string)$r->header('X-Hub-Signature-256')),401);
 abort_if(strlen($r->getContent())>1000000,413);$meta->receive($c,$r->json()->all());return ['received'=>true];
 }
}
