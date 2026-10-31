import {api} from "./api";
export type PortalKind = "client" | "owner";
export function pagePortalKind():PortalKind|null {
 const kind=document.querySelector<HTMLMetaElement>('meta[name="app-portal"]')?.content;
 return kind==="owner"||kind==="client"?kind:null;
}
export async function loadPortalIdentity(expected:PortalKind|null,fetcher:typeof api=api){
 const me=await fetcher("/me");
 const kind=me?.portal?.kind;
 if(kind!=="client"&&kind!=="owner")throw new Error("No se pudo identificar el portal. Recarga la página o revisa la configuración del servidor.");
 if(expected&&kind!==expected)throw new Error("La página y la API corresponden a portales distintos. Revisa el destino del proxy de administración.");
 return me;
}
// The owner dashboard loads its own private data. A failure there must never select the public portal.
export async function loadCatalogueForPortal(kind:PortalKind,fetcher:typeof api=api){
 return kind==="owner"?[]:await fetcher("/venues");
}
