<?php
namespace App\Services\Payments;
use App\Models\CheckoutAttempt;
use Illuminate\Http\Client\{RequestException,ConnectionException};
use Illuminate\Support\Facades\Log;
class PaymentFailure {
 public function rejected(\Throwable $e):bool{return $e instanceof RequestException&&in_array($e->response->status(),[400,401,403,404,422],true);}
 public function describe(\Throwable $e,string $operation):array {
  $status=$e instanceof RequestException?$e->response->status():null;$body=$e instanceof RequestException?$e->response->json():[];if(!is_array($body))$body=[];
  $names=['INVALID_REQUEST','AUTHENTICATION_FAILURE','invalid_client','invalid_token','UNPROCESSABLE_ENTITY','NOT_AUTHORIZED','INTERNAL_SERVER_ERROR','RESOURCE_NOT_FOUND','RATE_LIMIT_REACHED','PERMISSION_DENIED','invalid_request'];
  $issues=['INVALID_STRING_LENGTH','INVALID_PARAMETER_VALUE','MISSING_REQUIRED_PARAMETER','INVALID_ACCOUNT_STATUS','PAYEE_ACCOUNT_INVALID','PAYEE_ACCOUNT_RESTRICTED','PAYEE_ACCOUNT_NOT_VERIFIED','PAYEE_NOT_ENABLED_FOR_CARD_PROCESSING','CURRENCY_NOT_SUPPORTED','PERMISSION_DENIED','PAYEE_NOT_CONSENTED','PAYEE_ACCOUNT_LOCKED_OR_CLOSED','NOT_AUTHORIZED','INSTRUMENT_DECLINED','PAYER_ACTION_REQUIRED','ORDER_ALREADY_CAPTURED','ORDER_NOT_APPROVED','DUPLICATE_INVOICE_ID','REQUEST_ALREADY_PROCESSED','INVALID_RESOURCE_ID','AUTHENTICATION_FAILURE','MALFORMED_REQUEST_JSON'];
  $fields=['/purchase_units/0/payee/merchant_id','/purchase_units/0/amount/value','/purchase_units/0/amount/currency_code','/purchase_units/0/invoice_id','/purchase_units/0/custom_id','/application_context/return_url','/application_context/cancel_url','/application_context/user_action','/application_context/shipping_preference','/payment_source/paypal/experience_context/return_url','/payment_source/paypal/experience_context/cancel_url','client_id','client_secret'];
  $name=$body['name']??$body['error']??null;$detail=is_array($body['details'][0]??null)?$body['details'][0]:[];
  $debug=$body['debug_id']??($e instanceof RequestException?$e->response->header('PayPal-Debug-Id'):null);
  $issue=$detail['issue']??null;$field=$detail['field']??null;
  $known=['PayPal no devolvió un checkout válido.'=>'INVALID_CHECKOUT_RESPONSE','La cuenta receptora no coincide.'=>'RECEIVER_MISMATCH','La cuenta receptora de Mercado Pago no coincide.'=>'RECEIVER_MISMATCH','El importe o moneda no coincide.'=>'AMOUNT_CURRENCY_MISMATCH','Autenticación PayPal fallida.'=>'EMPTY_OAUTH_RESPONSE'];
  $type=class_basename($e);if(!in_array($type,['RequestException','ConnectionException','HttpException','RuntimeException','ErrorException','TypeError','DecryptException'],true))$type='OTHER';
  preg_match('/cURL error (6|7|28|35|60|55|56)\b/',$e->getMessage(),$curl);$connection=[6=>'DNS',7=>'CONNECT',28=>'TIMEOUT',35=>'TLS',60=>'TLS_CERTIFICATE',55=>'TRANSFER',56=>'TRANSFER'];
  return ['connection_code'=>isset($curl[1])?$connection[(int)$curl[1]]:null,'exception_type'=>$type,'location'=>basename($e->getFile()).':'.$e->getLine(),'internal_code'=>$known[$e->getMessage()]??null,'operation'=>$operation,'kind'=>$e instanceof ConnectionException?'connection':($e instanceof RequestException?'http':'internal'),'http_status'=>$status,'name'=>in_array($name,$names,true)?$name:'OTHER','issue'=>in_array($issue,$issues,true)?$issue:null,'field'=>in_array($field,$fields,true)?$field:null,'debug_id'=>is_string($debug)&&preg_match('/^[a-fA-F0-9]{10,32}$/',$debug)?$debug:null,'occurred_at'=>now()->toIso8601String()];
 }
 public function record(CheckoutAttempt $attempt,\Throwable $e,string $operation):array {
  $data=$this->describe($e,$operation);$attempt->update(['provider_error'=>$data]);
  Log::warning('payment_gateway_failure',['attempt_id'=>$attempt->id,'venue_id'=>$attempt->booking->venue_id,'provider'=>$attempt->provider,'gateway_account_id'=>$attempt->gateway_account_id]+$data);
  return $data;
 }
}
