<?php
namespace App\Http\Controllers;
use App\Models\{Owner,Venue,EmailDesign};use App\Services\Email\EmailDesigns;use Illuminate\Http\Request;
class EmailDesignController extends Controller {
 private function access(Request $r,?Venue $venue):void{abort_unless($r->user() instanceof Owner,403);abort_unless($venue?$venue->owner_account_id===$r->user()->id:$r->user()->platform_admin,403);}
 public function show(Request $r,EmailDesigns $designs,?Venue $venue=null){$this->access($r,$venue);return ['settings'=>$designs->settings($venue),'defaults'=>$designs->defaults($venue),'types'=>$venue?['confirmation']:['verification','recovery','confirmation']];}
 public function save(Request $r,EmailDesigns $designs,?Venue $venue=null){$this->access($r,$venue);$r->validate(['settings'=>'required|array']);$data=$designs->validate($r->input('settings'),$venue);EmailDesign::updateOrCreate(['scope'=>$designs->scope($venue)],['settings'=>$data]);return $this->show($r,$designs,$venue);}
 public function preview(Request $r,EmailDesigns $designs,?Venue $venue=null){$this->access($r,$venue);$d=$r->validate(['type'=>'required|in:verification,recovery,confirmation','settings'=>'required|array']);abort_unless(!$venue||$d['type']==='confirmation',403);$s=$designs->validate($d['settings'],$venue);return $designs->sample($d['type'],$venue,$s);}
}
