import React,{useEffect,useRef,useState} from 'react';
import {api,ApiError} from './api';
export function EmailVerification({user,owner,onVerified}:{user:any;owner:boolean;onVerified:()=>void}){
 const [link]=useState(()=>{const q=new URLSearchParams(location.hash.slice(1));return {token:q.get('verificar')||'',account:q.get('cuenta')||''};});
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[done,setDone]=useState(false),[wait,setWait]=useState(0);const lock=useRef(false);
 useEffect(()=>{if(link.token){const url=new URL(location.href);url.hash='';history.replaceState({},'',url.pathname+url.search);}},[]);
 useEffect(()=>{if(!wait)return;const timer=window.setTimeout(()=>setWait(n=>Math.max(0,n-1)),1000);return()=>window.clearTimeout(timer);},[wait]);
 if(!link.token&&(!user||user.email_verified_at))return null;
 async function send(confirm=false){if(lock.current||(!confirm&&wait))return;lock.current=true;setBusy(true);setError('');try{const d=await api('/email/'+(confirm?'verify':'send'),'POST',confirm?{token:link.token,account:Number(link.account)}:undefined);setMessage(d.message);setWait(d.retry_after||0);if(confirm){setDone(true);onVerified();}}catch(e){setError((e as Error).message);if(e instanceof ApiError&&e.status===429)setWait(e.retryAfter||60);}finally{lock.current=false;setBusy(false);}}
 return <section className="email-verification" aria-label="Verificación de correo"><strong>{done?'Correo verificado':link.token?'Confirma tu correo':'Verifica tu correo para continuar'}</strong><p>{link.token?'Confirma este enlace para comprobar que el correo te pertenece.':`Enviaremos un enlace a ${user.email}. ${owner?'Necesitas verificarlo para modificar tu negocio.':'Necesitas verificarlo para reservar y pagar.'}`}</p>{!done&&<button type="button" className="outline" disabled={busy||(!link.token&&wait>0)} onClick={()=>send(!!link.token)}>{busy?'Procesando…':link.token?'Confirmar mi correo':wait?`Volver a enviar en ${wait} s`:'Enviar enlace de verificación'}</button>}{message&&<p role="status">{message}</p>}{error&&<p className="error" role="alert">{error}</p>}</section>;
}
