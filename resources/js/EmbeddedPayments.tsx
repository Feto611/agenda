import React,{useEffect,useId,useRef,useState} from 'react';
import {api} from './api';
const scripts=new Map<string,Promise<any>>();let sequence=0;
export function loadPaymentSdk(provider:'paypal'|'mercadopago',key:string):Promise<any>{
 const cacheKey=provider+':'+key;if(scripts.has(cacheKey))return scripts.get(cacheKey)!;
 const promise=new Promise((resolve,reject)=>{const script=document.createElement('script');const namespace='encuentroPayPal'+(++sequence);
  if(provider==='paypal'){const q=new URLSearchParams({'client-id':key,currency:'MXN',intent:'capture',components:'buttons',locale:'es_MX'});script.src='https://www.paypal.com/sdk/js?'+q;script.setAttribute('data-namespace',namespace);}
  else script.src='https://sdk.mercadopago.com/js/v2';
  const nonce=document.querySelector<HTMLMetaElement>('meta[name=csp-nonce]')?.content;if(nonce){script.nonce=nonce;script.setAttribute('data-csp-nonce',nonce);}
  script.async=true;const timeout=window.setTimeout(()=>fail(),20000);
  const fail=()=>{window.clearTimeout(timeout);scripts.delete(cacheKey);script.remove();reject(new Error('No se pudo cargar el componente de pago. Revisa tu conexión o el bloqueador de contenido.'));};
  script.onerror=fail;script.onload=()=>{window.clearTimeout(timeout);const sdk=(window as any)[provider==='paypal'?namespace:'MercadoPago'];if(sdk)resolve(sdk);else fail();};document.head.appendChild(script);
 });scripts.set(cacheKey,promise);return promise;
}
export function EmbeddedPayment({attempt,onPaid,onError}:{attempt:any;onPaid:(a:any)=>void;onError:(message:string)=>void}){
 const target=useRef<HTMLDivElement>(null),id='payment-'+useId().replace(/[^a-zA-Z0-9]/g,''),lock=useRef(false),[loading,setLoading]=useState(true),[processing,setProcessing]=useState(false);
 const latest=useRef({onPaid,onError});latest.current={onPaid,onError};
 useEffect(()=>{let disposed=false,controller:any;setLoading(true);const provider=attempt.provider;const key=provider==='paypal'?attempt.sdk?.client_id:attempt.sdk?.public_key;
  const error=(e:any)=>{if(!disposed){setLoading(false);latest.current.onError('No pudimos completar este paso. El estado de tu pago se actualizará automáticamente.');}};
  (async()=>{try{if(!key)throw new Error('Falta la credencial pública de esta pasarela. Contacta al establecimiento.');const sdk=await loadPaymentSdk(provider,key);if(disposed||!target.current)return;
   if(provider==='paypal'){
    controller=sdk.Buttons({style:{layout:'vertical',label:'pay'},createOrder:()=>attempt.external_id,
     onApprove:async()=>{if(lock.current)return;lock.current=true;setProcessing(true);try{const a=await api('/checkout/'+attempt.id+'/capture','POST');if(!disposed)latest.current.onPaid(a);}catch(e){error(e);}finally{lock.current=false;if(!disposed)setProcessing(false);}},
     onCancel:()=>{if(!disposed)latest.current.onError('Cerraste la ventana de PayPal. Puedes continuar con este pago cuando lo desees.');},onError:()=>error(new Error('No pudimos completar este paso. El estado de tu pago se actualizará automáticamente.'))});
    await controller.render(target.current);
   }else{
    const mp=new sdk(key,{locale:'es-MX'});controller=await mp.bricks().create('payment',id,{initialization:{amount:attempt.amount/100},customization:{paymentMethods:{creditCard:'all',debitCard:'all',maxInstallments:1}},callbacks:{onReady:()=>{if(!disposed)setLoading(false);},onError:()=>error(new Error('No se pudo cargar el formulario de tarjetas. Revisa la Public Key del establecimiento.')),onSubmit:async({formData}:any)=>{if(lock.current)throw new Error('Pago en proceso.');lock.current=true;setProcessing(true);try{const a=await api('/checkout/'+attempt.id+'/card','POST',formData);if(!disposed)latest.current.onPaid(a);}catch(e){error(e);throw e;}finally{lock.current=false;if(!disposed)setProcessing(false);}}}});
    if(disposed){controller?.unmount?.();return;}
   }
   if(disposed)controller?.close?.();else setLoading(false);
  }catch(e){error(e);}})();
  return()=>{disposed=true;try{controller?.close?.();controller?.unmount?.();}catch{}};
 },[attempt.id]);
 return <div className="embedded-payment" aria-busy={loading||processing}>{loading&&<p role="status">Cargando pago seguro…</p>}{processing&&<p role="status">Verificando el pago. No cierres esta ventana ni repitas el cargo.</p>}<div id={id} ref={target}/><p className="muted payment-security">Los datos de pago los procesa {attempt.provider==='paypal'?'PayPal':'Mercado Pago'}. Al finalizar podrás ver el resultado en Mis reservas.</p></div>;
}
