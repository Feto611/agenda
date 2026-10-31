import React, {useId} from "react";
import {Check, CreditCard, Wallet, Banknote} from "lucide-react";
import {money} from "./api";

type Provider = {provider:string; available?:boolean; sandbox?:boolean; unavailable_reason?:string};
const methods:Record<string,{name:string;description:string;icon:typeof Wallet}>={
 paypal:{name:"PayPal",description:"Paga con tu cuenta PayPal",icon:Wallet},
 mercadopago:{name:"Mercado Pago",description:"Pago en línea con Mercado Pago",icon:CreditCard},
 oxxo:{name:"OXXO Pay",description:"Genera una referencia para pagar en efectivo",icon:Banknote},
};
export function PaymentChoices({booking,options,purpose,provider,busy,onPurpose,onProvider}:{
 booking:{deposit:number;paid_total:number;balance_due:number};options:Provider[];
 purpose:string;provider:string;busy:boolean;onPurpose:(value:string)=>void;onProvider:(value:string)=>void;
}){
 const id=useId();
 const amounts=[...(booking.paid_total<booking.deposit?[{value:"deposit",title:"Anticipo pendiente",amount:Math.max(0,booking.deposit-booking.paid_total),detail:"Cubre el anticipo requerido para tu reserva"}]:[]),
 {value:"balance",title:booking.paid_total>0?"Liquidar saldo":"Pagar el total",amount:booking.balance_due,detail:"Cubre todo el importe pendiente"}];
 return <div className="checkout-choices">
  <fieldset className="payment-choice-group" disabled={busy}>
   <legend>Importe a pagar</legend>
   <div className="amount-choice-grid">{amounts.map(a=><label className="payment-choice amount-choice" key={a.value}>
    <input type="radio" name={id+"-purpose"} value={a.value} checked={purpose===a.value} onChange={()=>onPurpose(a.value)}/>
    <span className="payment-choice-body"><span className="payment-choice-heading"><strong>{a.title}</strong><span className="payment-choice-tick" aria-hidden="true"><Check size={13}/></span></span>
     <span className="payment-choice-amount">{money(a.amount)} <small>MXN</small></span><span className="payment-choice-description">{a.detail}</span></span>
   </label>)}</div>
  </fieldset>
  <fieldset className="payment-choice-group" disabled={busy}>
   <legend>Medio de pago</legend><p className="payment-choice-hint">Elige cómo quieres pagar</p>
   <div className="provider-choice-list">{options.map(p=>{const method=methods[p.provider]||{name:p.provider,description:"Pago en línea",icon:Wallet};const Icon=method.icon;const unavailable=p.available===false;const reasonId=id+"-"+p.provider;
    return <label className="payment-choice provider-choice" key={p.provider}>
     <input type="radio" name={id+"-provider"} value={p.provider} checked={provider===p.provider} disabled={unavailable} aria-describedby={unavailable?reasonId:undefined} onChange={()=>onProvider(p.provider)}/>
     <span className="payment-choice-body"><span className={"payment-method-icon method-"+p.provider} aria-hidden="true"><Icon size={24}/></span>
      <span className="payment-method-copy"><span className="payment-choice-heading"><strong>{method.name}</strong>{p.sandbox&&<small className="payment-test-badge">Pruebas</small>}</span>
       <span className="payment-choice-description">{method.description}</span>{unavailable&&<span className="payment-unavailable" id={reasonId}>{p.unavailable_reason||"No disponible para esta reserva"}</span>}</span>
      <span className="payment-choice-tick" aria-hidden="true"><Check size={13}/></span>
     </span>
    </label>;
   })}</div>
  </fieldset>
 </div>;
}
