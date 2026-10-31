<?php
namespace App\Http\Controllers;
use App\Models\{Venue,VenueSocialConnection};use App\Services\InstagramImporter;use Illuminate\Http\Request;
class SocialController extends Controller {
 private function owner(Request $r,Venue $v){abort_unless($v->owner_account_id===$r->user()->id,403);}
 public function status(Request $r,Venue $venue){$this->owner($r,$venue);$c=VenueSocialConnection::where('venue_id',$venue->id)->where('provider','instagram')->first();return ['connected'=>(bool)$c,'account_id'=>$c?->account_id];}
 public function connect(Request $r,Venue $venue){$this->owner($r,$venue);$d=$r->validate(['account_id'=>'required|regex:/^[0-9]{5,30}$/','token'=>'required|string|min:10|max:3000']);$c=VenueSocialConnection::updateOrCreate(['venue_id'=>$venue->id,'provider'=>'instagram'],['account_id'=>$d['account_id'],'token'=>$d['token']]);return ['connected'=>true,'account_id'=>$c->account_id];}
 public function preview(Request $r,Venue $venue,InstagramImporter $importer){$this->owner($r,$venue);$c=VenueSocialConnection::where('venue_id',$venue->id)->where('provider','instagram')->firstOrFail();return $importer->preview($c,$r->boolean('comments'));}
 public function import(Request $r,Venue $venue,InstagramImporter $importer){$this->owner($r,$venue);$d=$r->validate(['photos'=>'present|array|max:12','photos.*'=>'string|max:50','comments'=>'present|array|max:60','comments.*'=>'string|max:50']);$c=VenueSocialConnection::where('venue_id',$venue->id)->where('provider','instagram')->firstOrFail();$data=$importer->preview($c,count($d['comments'])>0);return $importer->import($venue,$data['items'],$d['photos'],$d['comments']);}
 public function disconnect(Request $r,Venue $venue){$this->owner($r,$venue);VenueSocialConnection::where('venue_id',$venue->id)->where('provider','instagram')->delete();return ['connected'=>false];}
}
