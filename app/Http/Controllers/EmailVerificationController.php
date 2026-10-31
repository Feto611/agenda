<?php
namespace App\Http\Controllers;
use App\Services\EmailVerification;
use Illuminate\Http\Request;
class EmailVerificationController extends Controller {
 public function send(Request $r,EmailVerification $emails){return $emails->send($r->user());}
 public function confirm(Request $r,EmailVerification $emails){$d=$r->validate(['account'=>'required|integer|min:1','token'=>'required|string|size:64']);$emails->confirm((int)$d['account'],$d['token'],config('portal.kind')==='owner');return ['message'=>'Correo verificado. Ya puedes continuar.'];}
}
