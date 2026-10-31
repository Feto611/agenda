import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImagePlus, Pause, Play } from "lucide-react";
import { type Venue } from "./api";

export function coverPhotos(photos:any[] = []) {
 const visible=photos.filter(p=>p.visible!==false);
 return [...visible.filter(p=>p.cover),...visible.filter(p=>!p.cover)];
}
export function VenueImage({venue,className="",controls=false}:{venue:Venue;className?:string;controls?:boolean}) {
 const all=useMemo(()=>coverPhotos(venue.photos),[venue.photos]);
 const signature=all.map(p=>p.id+":"+p.image_url).join("|");
 const [failed,setFailed]=useState<string[]>([]);
 const [index,setIndex]=useState(0);
 const [paused,setPaused]=useState(false);
 const [hovered,setHovered]=useState(false);
 const [focused,setFocused]=useState(false);
 const [reduced,setReduced]=useState(()=>typeof window!=="undefined"&&!!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
 const [hidden,setHidden]=useState(()=>typeof document!=="undefined"&&!!document.hidden);
 const [outgoing,setOutgoing]=useState<any>(null);
 const previous=useRef<any>(null);
 const stage=useRef<HTMLDivElement>(null);
 useEffect(()=>{setIndex(0);setFailed([]);setPaused(false);},[signature,venue.id]);
 useEffect(()=>{
  const media=window.matchMedia?.("(prefers-reduced-motion: reduce)");
  const preference=()=>setReduced(!!media?.matches);
  const visibility=()=>setHidden(document.hidden);
  preference();visibility();
  media?.addEventListener?.("change",preference);
  document.addEventListener("visibilitychange",visibility);
  return ()=>{media?.removeEventListener?.("change",preference);document.removeEventListener("visibilitychange",visibility);};
 },[]);
 const photos=all.filter(p=>!failed.includes(p.image_url));
 const carousel=venue.design?.cover_mode==="carousel"&&photos.length>1;
 const seconds=Math.min(20,Math.max(3,Number(venue.design?.cover_interval)||5));
 const current=photos[index % Math.max(1,photos.length)];
 useEffect(()=>{
  const old=previous.current;previous.current=current;
  if(reduced||!old||!current||old.image_url===current.image_url||failed.includes(old.image_url)){setOutgoing(null);return;}
  setOutgoing(old);const timer=setTimeout(()=>setOutgoing(null),700);return()=>clearTimeout(timer);
 },[current?.image_url,reduced]);

 useEffect(()=>{
  const parent=stage.current?.closest("button,a");if(!parent)return;
  const focus=()=>setFocused(true),blur=()=>setFocused(false);
  parent.addEventListener("focus",focus);parent.addEventListener("blur",blur);
  return ()=>{parent.removeEventListener("focus",focus);parent.removeEventListener("blur",blur);};
 },[carousel,!!current]);

 useEffect(()=>{
  if(!carousel||paused||hovered||focused||reduced||hidden)return;
  const timer=setInterval(()=>setIndex(i=>(i+1)%photos.length),seconds*1000);
  return ()=>clearInterval(timer);
 },[carousel,paused,hovered,focused,reduced,hidden,seconds,photos.length]);
 if(!current)return <div className={"photo-empty "+className}><ImagePlus size={35}/><span>{all.length?"No se pudieron cargar las fotografías":"El dueño aún no ha publicado fotografías"}</span></div>;
 // Catalogue places this inside a link-like button: controls are only rendered on the venue page.
 return <div ref={stage} className={"venue-photo-stage "+className}
  onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
  onFocusCapture={()=>setFocused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setFocused(false);}}
  role={controls&&carousel?"region":undefined} aria-roledescription={controls&&carousel?"carrusel":undefined}
  aria-label={controls&&carousel?"Fotografías de "+venue.name:undefined}>
  <img key={current.image_url} className={"venue-photo cover-current"+(reduced?" reduce-motion":"")} src={current.image_url} alt={current.caption||venue.name} onError={()=>setFailed(old=>[...old,current.image_url])}/>
  {outgoing&&!reduced&&<img className="venue-photo cover-outgoing" src={outgoing.image_url} alt="" aria-hidden="true"/>}
  {carousel&&!controls&&<span className="cover-count" aria-hidden="true">{index%photos.length+1} / {photos.length}</span>}
  {carousel&&controls&&<div className="cover-controls">
   <button type="button" aria-label="Fotografía anterior" onClick={()=>setIndex(i=>(i-1+photos.length)%photos.length)}><ChevronLeft size={18}/></button>
   <span aria-live={paused||focused?"polite":"off"}>{index%photos.length+1} / {photos.length}</span>
   <button type="button" aria-label="Fotografía siguiente" onClick={()=>setIndex(i=>(i+1)%photos.length)}><ChevronRight size={18}/></button>
   {!reduced&&<button type="button" aria-label={paused?"Reanudar carrusel":"Pausar carrusel"} aria-pressed={paused} onClick={()=>setPaused(x=>!x)}>{paused?<Play size={16}/>:<Pause size={16}/>}</button>}
  </div>}
 </div>;
}
