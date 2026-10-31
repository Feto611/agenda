import React,{useEffect,useState} from "react";
import {Leaf,Upload,Trash2,Settings} from "lucide-react";
import {api} from "./api";
import {ConfirmAction} from "./ConfirmAction";
export const defaultPlatformBrand={name:"Encuentro",tagline:"Hacemos espacio para tus mejores momentos.",page_title:"Reservas de espacios",catalogue_title:"Elige dónde encontrarte.",catalogue_intro:"Fotos del lugar, información útil y precios publicados por cada establecimiento.",support_email:"",support_phone:"",logo_url:null,favicon_url:null};
export function BrandWordmark({name,logo}:{name:string;logo?:string|null}){
 const [failed,setFailed]=useState(false);useEffect(()=>setFailed(false),[logo]);
 return <>{logo&&!failed?<img className="header-brand-logo" src={logo} alt="" onError={()=>setFailed(true)}/>:<Leaf size={25}/>}<span className="brand-name">{name}</span></>;
}
export function PageIdentityLink({owner,admin,onOpen}:{owner:boolean;admin:boolean;onOpen:()=>void}){
 return owner&&admin?<button type="button" className="page-identity-link" onClick={onOpen}><Settings size={16} aria-hidden="true"/><span>Identidad de página</span></button>:null;
}
export function PlatformMeta({brand}:{brand:any}){
 useEffect(()=>{
 const previous=document.title,icons=Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="icon"],link[rel="shortcut icon"]'));let icon:HTMLLinkElement|null=null;
 document.title=brand.name+" · "+brand.page_title;
 if(brand.favicon_url){icons.forEach(i=>i.remove());icon=document.createElement("link");icon.rel="icon";icon.href=brand.favicon_url;document.head.append(icon);}
 return()=>{document.title=previous;icon?.remove();if(brand.favicon_url)icons.forEach(i=>document.head.append(i));};
 },[brand.name,brand.page_title,brand.favicon_url]);return null;
}
export function PlatformBrandingEditor({onSaved}:{onSaved:()=>void}){
 const [brand,setBrand]=useState<any>(defaultPlatformBrand),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[remove,setRemove]=useState<string|null>(null);
 useEffect(()=>{let active=true;api("/platform-branding").then(d=>{if(active)setBrand(d);}).catch(e=>setMessage(e.message));return()=>{active=false;};},[]);
 async function upload(kind:string,input:HTMLInputElement){
  if(!input.files?.[0])return;const data=new FormData();data.set("image",input.files[0]);setBusy(true);
  try{setBrand(await api("/owner/platform-branding/images/"+kind,"POST",data));setMessage("Imagen publicada en la plataforma.");onSaved();}
  catch(e){setMessage((e as Error).message);}finally{setBusy(false);input.value="";}
 }
 async function erase(){if(!remove||busy)return;setBusy(true);try{setBrand(await api("/owner/platform-branding/images/"+remove,"DELETE"));setRemove(null);onSaved();setMessage("Imagen retirada de la plataforma.");}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
 return <section className="platform-brand-editor"><span className="eyebrow">IDENTIDAD GENERAL</span><h2>Identidad de página</h2><p>Configuración general de toda la plataforma. El nombre, logo, título e icono se aplican al catálogo, encabezado, pie y pestaña del navegador. La identidad de cada local se configura en Diseño y vista previa.</p>
 <div className="platform-brand-preview"><BrandWordmark name={brand.name} logo={brand.logo_url}/><small>Vista previa del encabezado</small></div>
 {message&&<p className="notice" role="status">{message}</p>}
 <form onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);try{
 const payload=Object.fromEntries(["name","tagline","page_title","catalogue_title","catalogue_intro","support_email","support_phone"].map(k=>[k,brand[k]||""]));
 setBrand(await api("/owner/platform-branding","PUT",payload));setMessage("Marca publicada.");onSaved();
 }catch(err){setMessage((err as Error).message);}finally{setBusy(false);}}}>
 <fieldset disabled={busy} className="branding-fields"><legend>Nombre y contenido</legend><div className="fields">
 {Object.entries({name:"Nombre de la plataforma",tagline:"Texto del pie",page_title:"Título de la pestaña",catalogue_title:"Título del catálogo",catalogue_intro:"Descripción del catálogo",support_email:"Correo de contacto",support_phone:"Teléfono de contacto"}).map(([key,label])=><label key={key}>{label}<input type={key==="support_email"?"email":"text"} required={["name","page_title","catalogue_title"].includes(key)} value={brand[key]||""} maxLength={key==="catalogue_intro"?500:key==="tagline"?200:key==="support_phone"?40:key==="support_email"?254:key==="catalogue_title"?150:key==="page_title"?100:80} onChange={e=>setBrand({...brand,[key]:e.target.value})}/></label>)}
 </div></fieldset><button type="submit" className="primary" disabled={busy}>{busy?"Guardando…":"Publicar marca de la plataforma"}</button></form>
 <DemoReadiness/>
 <div className="platform-brand-files">{["logo","favicon"].map(kind=><article key={kind}><h3>{kind==="logo"?"Logo de la plataforma":"Icono de la pestaña"}</h3>{brand[kind+"_url"]&&<img className="brand-file-preview" src={brand[kind+"_url"]} alt={kind}/>}<label className="brand-upload"><Upload size={17}/>Subir {kind==="logo"?"logo":"icono"}<input type="file" disabled={busy} accept="image/png,image/jpeg,image/webp" onChange={e=>upload(kind,e.currentTarget)}/><small>PNG, JPG o WebP · hasta 3 MB. El icono debe verse bien en formato cuadrado.</small></label>{brand[kind+"_url"]&&<button type="button" className="danger-action" disabled={busy} onClick={()=>setRemove(kind)}><Trash2 size={16}/>Retirar {kind==="logo"?"logo":"icono"}</button>}</article>)}</div>
 {remove&&<ConfirmAction title="¿Retirar esta imagen de la plataforma?" busy={busy} onCancel={()=>setRemove(null)} onConfirm={erase} confirmLabel="Sí, retirar imagen" cancelLabel="Conservar imagen"><p>Se quitará del encabezado o la pestaña de toda la plataforma. Puedes subir otra imagen después.</p></ConfirmAction>}
 </section>;
}

export function DemoReadiness(){
 const [checks,setChecks]=useState<any[]>([]),[error,setError]=useState("");
 async function load(){setError("");try{setChecks((await api("/owner/platform-branding/readiness")).checks);}catch(e){setError((e as Error).message);}}
 useEffect(()=>{load();},[]);
 return <section className="demo-readiness"><h3>Preparación de la demo</h3><p>Estas comprobaciones revisan la configuración; los cobros y correos requieren una prueba con tus proveedores.</p>{error&&<p className="error">{error}</p>}
 <ul>{checks.map(c=><li key={c.label}><strong>{c.ok?"Configurado":"Pendiente"} · {c.label}</strong><span>{c.detail}</span></li>)}</ul><button className="outline" type="button" onClick={()=>load()}>Revisar configuración</button></section>;
}
