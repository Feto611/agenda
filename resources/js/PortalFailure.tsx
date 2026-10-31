import React from "react";
import {ShieldCheck} from "lucide-react";
export function PortalFailure({owner,error,onRetry}:{owner:boolean;error:string;onRetry:()=>void}) {
 return <main className="portal-unavailable" role="alert">
  <ShieldCheck size={32}/>
  <h1>{owner?"Gestión del negocio":"No se pudo abrir el portal"}</h1>
  <p>No se pudo cargar la información de acceso. Reintenta la conexión para continuar en este portal.</p>
  <p className="error">{error}</p>
  <button type="button" className="primary" onClick={onRetry}>Reintentar conexión</button>
 </main>;
}
