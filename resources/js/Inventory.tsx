import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { NumericInput } from "./FormInputs";
import { money } from "./api";
export const kinds: Record<string,string> = {chairs:"Sillas",tables:"Mesas",tablecloths:"Manteles",decoration:"Barra de decoración",speakers:"Bocinas",refrigerator:"Refrigerador",stove:"Estufa",internet:"Internet",pool:"Alberca",trampoline:"Trampolín",other:"Otro servicio"};
export type InventoryItem={id:string;name:string;kind:string;color:string;quantity:number|null;unit_price:number|null;enabled:boolean};
export type ExtraChoice={id:string;quantity:number};
export function wifiPayload(wifi:any) {
 if(!wifi||(wifi.unreadable&&!wifi.replace&&!wifi.clear))return undefined;
 return {ssid:wifi.ssid || "",password:wifi.password || "",clear:!!wifi.clear,...(wifi.replace?{replace:true}:{})};
}
export function InventoryEditor({items,onChange,wifi,onWifi}:{items:InventoryItem[];onChange:(v:InventoryItem[])=>void;wifi:any;onWifi:(v:any)=>void}) {
 const patch=(index:number,change:Partial<InventoryItem>)=>onChange(items.map((x,i)=>i===index?{...x,...change}:x));
 return <section className="inventory-list"><h3>Mobiliario, servicios y extras</h3>
 <p>Registra lo que ofrece el local. El cliente elige cantidades por reserva. Usa precio $0 para servicios incluidos. Añade una fila por color de mantel; la cantidad indica las unidades disponibles para cada evento.</p>
 {items.map((item,i)=><article className="inventory-item" key={item.id}><div className="fields">
 <label>Tipo<select value={item.kind} onChange={e=>patch(i,{kind:e.target.value,name:kinds[e.target.value]})}>{Object.entries(kinds).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
 <label>Nombre<input required maxLength={100} value={item.name} onChange={e=>patch(i,{name:e.target.value})}/></label>
 <label>Color o variante · opcional<input maxLength={50} placeholder="Ej. Blanco, beige o azul" value={item.color||""} onChange={e=>patch(i,{color:e.target.value})}/></label>
 <label>Cantidad disponible<NumericInput required min={1} max={100000} value={item.quantity??""} onChange={e=>patch(i,{quantity:e.target.value===""?null:Number(e.target.value)})}/><small>Para instalaciones como alberca o internet usa 1.</small></label>
 <label>Precio por unidad / evento (MXN)<NumericInput required min={0} max={1000000} step={0.01} value={item.unit_price==null?"":item.unit_price/100} placeholder="Ej. 25.00" onChange={e=>patch(i,{unit_price:e.target.value===""?null:Math.round(Number(e.target.value)*100)})}/></label>
 <label className="toggle"><input type="checkbox" checked={item.enabled} onChange={e=>patch(i,{enabled:e.target.checked})}/>Disponible para reservar</label>
 </div><div className="inventory-actions"><button type="button" className="danger-action" onClick={()=>onChange(items.filter((_,index)=>index!==i))}><Trash2 size={16} aria-hidden="true"/>Eliminar servicio</button></div></article>)}
 <button type="button" className="inventory-add" disabled={items.length>=100} onClick={()=>onChange([...items,{id:globalThis.crypto?.randomUUID?.() ?? ("extra-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2)),kind:"chairs",name:"Sillas",color:"",quantity:null,unit_price:null,enabled:true}])}><Plus size={19} aria-hidden="true"/>Añadir mobiliario o servicio</button>
 <h3>Wi-Fi privado</h3><p>Estos datos solo se enviarán al cliente que seleccione Internet cuando su pago confirme la reserva. No aparecen en el catálogo ni en el chatbot.</p>
 {wifi?.unreadable&&<div className="notice" role="alert"><div><p>Las credenciales guardadas no se pueden descifrar. Tus datos originales se conservarán mientras no elijas reemplazarlos o borrarlos.</p><label className="toggle"><input type="checkbox" checked={!!wifi.replace} onChange={e=>onWifi({...wifi,replace:e.target.checked})}/>Reemplazar credenciales de Wi-Fi con los datos que escribiré</label></div></div>}
 <div className="fields"><label>Nombre de la red (SSID)<input disabled={!!wifi?.clear||!!wifi?.unreadable&&!wifi?.replace} required={!!wifi?.replace} autoComplete="off" maxLength={100} value={wifi?.ssid||""} placeholder="Nombre de tu red" onChange={e=>onWifi({...wifi,ssid:e.target.value})}/></label>
 <label>Contraseña del Wi-Fi<input disabled={!!wifi?.clear||!!wifi?.unreadable&&!wifi?.replace} type="password" autoComplete="new-password" maxLength={200} value={wifi?.password||""} placeholder={wifi?.has_password?"Guardada. Deja vacío para conservarla":"Contraseña de la red"} onChange={e=>onWifi({...wifi,password:e.target.value})}/></label>
 <label className="toggle"><input type="checkbox" checked={!!wifi?.clear} onChange={e=>onWifi({...wifi,clear:e.target.checked})}/>Borrar los datos de Wi-Fi guardados</label></div>
 </section>;
}
export function ExtrasPicker({items,selected,onChange}:{items:InventoryItem[];selected:ExtraChoice[];onChange:(v:ExtraChoice[])=>void}){
 const available=items.filter(x=>x.enabled);
 if(!available.length)return null;
 return <section className="extras-picker"><h3>Personaliza tu reservación</h3><p>Elige los servicios y cantidades que necesitas. Los precios se añaden al total.</p>
 {selected.filter(choice=>!available.some(item=>item.id===choice.id)).map(choice=><div className="notice" key={choice.id}>Un extra seleccionado dejó de estar disponible.<button type="button" onClick={()=>onChange(selected.filter(x=>x.id!==choice.id))}>Quitar de la reserva</button></div>)}
 {available.map(item=>{const choice=selected.find(x=>x.id===item.id);return <div key={item.id} className="extra-choice">
 <label className="toggle"><input type="checkbox" checked={!!choice} onChange={e=>onChange(e.target.checked?[...selected,{id:item.id,quantity:1}]:selected.filter(x=>x.id!==item.id))}/><span><b>{item.name}{item.color?" · "+item.color:""}</b><small>{item.unit_price?money(item.unit_price)+" por unidad":"Incluido sin costo"} · Disponibles: {item.quantity}</small></span></label>
 {choice&&<label>Cantidad<NumericInput required min={1} max={item.quantity??1} value={choice.quantity||""} onChange={e=>onChange(selected.map(x=>x.id===item.id?{...x,quantity:Number(e.target.value)}:x))}/></label>}
 </div>})}
 {selected.some(x=>available.some(item=>item.id===x.id&&item.kind==="internet"))&&<p className="notice">El nombre y la contraseña del Wi-Fi llegarán en el correo de confirmación después de verificar tu pago.</p>}
 </section>;
}
export function ExtrasSummary({items}:{items:any[]}){if(!items?.length)return null;return <ul>{items.map(item=><li key={item.id}>{item.name}{item.color?" · "+item.color:""} × {item.quantity} — {money(item.total)}</li>)}</ul>;}
