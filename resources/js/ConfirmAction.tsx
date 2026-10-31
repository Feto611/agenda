import {api} from "./api";
import React,{useEffect,useId,useRef} from "react";
export function ConfirmAction({title,children,confirmLabel="Confirmar",cancelLabel="Volver",busy=false,error,onCancel,onConfirm}:{title:string;children:React.ReactNode;confirmLabel?:string;cancelLabel?:string;busy?:boolean;error?:string;onCancel:()=>void;onConfirm:()=>void}){
 const box=useRef<HTMLDivElement>(null),safe=useRef<HTMLButtonElement>(null),id=useId(),busyRef=useRef(busy);busyRef.current=busy;
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null;const overflow=document.body.style.overflow;document.body.style.overflow="hidden";safe.current?.focus();
  const keys=(e:KeyboardEvent)=>{
   if(e.key==="Escape"){e.preventDefault();if(!busyRef.current)onCancel();}
   if(e.key==="Tab"){
    const items=Array.from(box.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled)')||[]);
    if(!items.length){e.preventDefault();return;}const first=items[0],last=items[items.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
   }
  };
  document.addEventListener("keydown",keys);return()=>{document.removeEventListener("keydown",keys);document.body.style.overflow=overflow;previous?.focus();};
 },[]);
 return <div className="modal-overlay confirmation-overlay"><div className="modal confirmation-dialog" ref={box} role="dialog" aria-modal="true" aria-labelledby={id} aria-describedby={id+"-description"} aria-busy={busy}>
  <h2 id={id}>{title}</h2><div id={id+"-description"}>{children}</div>{error&&<p className="error" role="alert">{error}</p>}
  <div className="confirmation-actions"><button type="button" className="outline" ref={safe} disabled={busy} onClick={onCancel}>{cancelLabel}</button><button type="button" className="danger-action" disabled={busy} onClick={onConfirm}>{busy?"Procesando…":confirmLabel}</button></div>
 </div></div>;
}
export function CancelBookingDialog({booking,onClose,onCancelled}:{booking:any;onClose:()=>void;onCancelled:()=>void}){
 const [busy,setBusy]=React.useState(false),[error,setError]=React.useState("");const lock=useRef(false);
 async function cancel(){if(lock.current)return;lock.current=true;setBusy(true);setError("");
  try{await api("/bookings/"+booking.id+"/cancel","POST");onCancelled();}
  catch(e){setError((e as Error).message);}
  finally{lock.current=false;setBusy(false);}
 }
 return <ConfirmAction title="¿Cancelar este apartado?" cancelLabel="Conservar mi reserva" confirmLabel="Sí, cancelar apartado" busy={busy} error={error} onCancel={onClose} onConfirm={cancel}>
  <p><strong>{booking.venue?.name}</strong></p><p>Orden: {booking.order_number}</p>{booking.starts_at&&<p>Fecha: {new Date(booking.starts_at).toLocaleString("es-MX",{timeZone:booking.quote?.timezone||"America/Mexico_City",dateStyle:"long",timeStyle:"short"})}</p>}<p>Se liberará este horario y no podrás deshacer la cancelación. Podrás solicitar un nuevo apartado si continúa disponible.</p><p>Esta acción no tramita devoluciones de dinero. Si ya realizaste un pago, contacta al establecimiento.</p>
 </ConfirmAction>;
}
