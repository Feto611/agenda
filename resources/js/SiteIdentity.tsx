import React,{useEffect,useRef} from 'react';
import type {Venue} from './api';
export function SiteIdentity({venue,platformName='Encuentro',independent=false}:{venue:Venue;platformName?:string;independent?:boolean}){
 const d=venue.design||{};const ref=useRef<HTMLSpanElement>(null);
 useEffect(()=>{const doc=ref.current?.ownerDocument||document;const before=doc.title;const name=d.brand_name||venue.name;doc.title=independent?(d.page_title||name):`${name} · ${platformName}`;
  const existing=Array.from(doc.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'));let icon:HTMLLinkElement|null=null;
  if(independent&&d.favicon_id){existing.forEach(n=>n.remove());icon=doc.createElement('link');icon.rel='icon';icon.href='/api/media/branding/'+d.favicon_id;doc.head.append(icon);}
  return()=>{doc.title=before;icon?.remove();if(icon)existing.forEach(n=>doc.head.append(n));};
 },[venue.name,d.brand_name,d.page_title,d.favicon_id,platformName,independent]);return <span ref={ref} hidden/>;
}
