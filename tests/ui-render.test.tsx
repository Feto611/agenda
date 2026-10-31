import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
(globalThis as any).document={querySelector:()=>({content:'test-csrf'})};
const {Catalogue,OwnerAgenda,PublicGallery}=await import('../resources/js/Experience');
const venue:any={id:1,name:'Local real',slug:'local-real',published:true,settings:{address:'Colima',description:'Jardín real',capacity:80,mode:'day',open_hour:10,close_hour:26,weekday_price:650000,weekend_price:850000,holiday_price:1000000},photos:[{id:1,image_url:'/api/media/photos/1',cover:true,caption:'Jardín'}],reviews:[{id:1,author:'Autor real',body:'Una opinión real',source:'instagram',source_url:'https://instagram.com/p/example/'}]};
test('el catálogo usa las fotos del local y omite el encabezado genérico',()=>{const html=renderToStaticMarkup(<Catalogue venues={[venue]} navigate={()=>{}}/>);assert.match(html,/\/api\/media\/photos\/1/);assert.match(html,/Local real/);assert.doesNotMatch(html,/unsplash|El lugar perfecto/);assert.match(html,/Comentario de Instagram/)});
test('el panel financiero distingue anticipo solicitado de dinero pagado',()=>{const row={id:'order-1',order_number:'EV-ORDER-1',user:{name:'Cliente real',email:'cliente@example.com'},starts_at:'2027-02-03T20:00:00Z',guests:50,quote:{timezone:'America/Mexico_City'},total:650000,deposit:195000,paid_total:0,balance_due:650000,payment_status:'unpaid',status:'hold',expires_at:'2099-01-01T00:00:00Z',payments:[]};const html=renderToStaticMarkup(<OwnerAgenda venue={venue} rows={[row]} onRefresh={()=>{}}/>);assert.match(html,/Cliente real/);assert.match(html,/EV-ORDER-1/);assert.match(html,/Sin pagos registrados/);assert.match(html,/Restante:/);assert.match(html,/Recibido:/)});
test('los comentarios importados muestran fuente y no se etiquetan como verificados',()=>{const html=renderToStaticMarkup(<PublicGallery venue={venue}/>);assert.match(html,/Ver fuente original/);assert.match(html,/no acreditan una reserva verificada/);assert.match(html,/Una opinión real/)});
test('no se inventan fotos cuando el dueño aún no ha publicado ninguna',()=>{const html=renderToStaticMarkup(<Catalogue venues={[{...venue,photos:[],reviews:[]}]} navigate={()=>{}}/>);assert.match(html,/aún no ha publicado fotografías/);assert.doesNotMatch(html,/unsplash/)});

const {PortalNavigation}=await import('../resources/js/PortalNavigation');
test('el portal público no muestra acceso ni registro de propietarios',()=>{const html=renderToStaticMarkup(<PortalNavigation owner={false} path="/" navigate={()=>{}} reservations={()=>{}}/>);assert.match(html,/Mis reservas/);assert.doesNotMatch(html,/Gestión del negocio|Administración|dueño|propietario/)});
test('la navegación privada no mezcla el panel del cliente',()=>{const html=renderToStaticMarkup(<PortalNavigation owner={true} path="/gestion" navigate={()=>{}} reservations={()=>{}}/>);assert.match(html,/Gestión del negocio/);assert.doesNotMatch(html,/Mis reservas|Explorar espacios|Área del cliente/)});

const {Theme,DesignEditor}=await import('../resources/js/Design');
const {MessagingSettings,LinkChannels}=await import('../resources/js/Messaging');
test('el tema compartido aplica colores, bordes, tipografía, distribución y modales',()=>{const html=renderToStaticMarkup(<Theme design={{primary:'#123456',accent:'#654321',radius:'pill',font:'classic',layout:'compact',modal:'side',button:'outline'}}><button className="primary">Reservar</button></Theme>);assert.match(html,/--green:#123456/);assert.match(html,/--radius:28px/);assert.match(html,/font-classic layout-compact modal-side button-outline/)});
test('el editor distingue borrador y publicación e incluye vista de cliente en iframe',()=>{const html=renderToStaticMarkup(<DesignEditor venue={venue} renderPreview={()=><p>Página real del local</p>}/>);assert.match(html,/Guardar borrador/);assert.match(html,/Publicar diseño/);assert.match(html,/Vista de cliente/);assert.match(html,/<iframe/);assert.match(html,/Ver móvil/)});
test('la conexión de Meta pide secretos como contraseña y permite configurar los tres canales',()=>{const html=renderToStaticMarkup(<MessagingSettings venue={venue}/>);assert.match(html,/WhatsApp Business/);assert.match(html,/Instagram/);assert.match(html,/Facebook Messenger/);assert.match(html,/type="password"/);assert.match(html,/Responder automáticamente/);assert.match(html,/Bandeja de conversaciones/)});
test('el cliente vincula canales de forma explícita con un código',()=>{const html=renderToStaticMarkup(<LinkChannels venue={venue} onRefresh={()=>{}}/>);assert.match(html,/Generar código de vinculación/);assert.match(html,/únicamente tus propios canales/)});
const {MailSettings}=await import('../resources/js/MailSettings');
test('el dueño puede elegir servicio de correo y ver la cola sin exponer secretos',()=>{const html=renderToStaticMarkup(<MailSettings venue={venue}/>);assert.match(html,/Resend/);assert.match(html,/Postmark/);assert.match(html,/SMTP/);assert.match(html,/Correo del remitente/);assert.match(html,/type="password"/);assert.match(html,/checkout pendiente no generan confirmación/);assert.match(html,/Aceptado/)});
test('el editor ofrece logo y fuentes y visibilidad de mapa y asistente',()=>{const html=renderToStaticMarkup(<DesignEditor venue={venue} renderPreview={()=><p>Local</p>}/>);for(const text of ['Logo del establecimiento','Humanista','Monoespaciada','Tamaño de lectura','Portada','Mostrar asistente para clientes','Mostrar mapa de ubicación']) assert.ok(html.includes(text),text);assert.doesNotMatch(html,/accept="[^"]*svg/)});

const {InventoryEditor,ExtrasPicker,ExtrasSummary}=await import('../resources/js/Inventory');
const inventory:any[]=[{id:'linen',name:'Manteles',kind:'tablecloths',color:'Azul',quantity:5,unit_price:2500,enabled:true},{id:'wifi',name:'Internet',kind:'internet',color:'',quantity:1,unit_price:0,enabled:true}];
test('el inventario ofrece variantes, precios, cantidades y contraseña privada sin recuperarla',()=>{
 const html=renderToStaticMarkup(<InventoryEditor items={inventory} onChange={()=>{}} wifi={{ssid:'Red local',has_password:true}} onWifi={()=>{}}/>);
 for(const value of ['Cantidad disponible','Color o variante','Wi-Fi privado','Guardada. Deja vacío','Barra de decoración','Trampolín'])assert.ok(html.includes(value),value);
 assert.match(html,/type="password"/);
});
test('el cliente elige extras y ve que internet llegará solo tras confirmar el pago',()=>{
 const html=renderToStaticMarkup(<ExtrasPicker items={inventory} selected={[{id:'wifi',quantity:1}]} onChange={()=>{}}/>);
 assert.match(html,/Manteles · Azul/);assert.match(html,/Incluido sin costo/);assert.match(html,/verificar tu pago/);assert.match(html,/Cantidad/);
});
test('las reservas presentan el color y la cantidad elegidos en su resumen',()=>{
 const html=renderToStaticMarkup(<ExtrasSummary items={[{id:'linen',name:'Mantel',color:'Azul',quantity:3,total:7500}]}/>);
 assert.match(html,/Mantel · Azul × 3/);
});
test('los controles de correo y canales usan etiquetas horizontales junto a la casilla',()=>{
 for(const component of [<MessagingSettings venue={venue}/>,<MailSettings venue={venue}/>]){
 const html=renderToStaticMarkup(component);assert.match(html,/<label class="toggle control-check"><input type="checkbox"/);
 }
});

test('guardar Wi-Fi omite la bandera de contraseña guardada del formulario',async()=>{
 const {wifiPayload}=await import('../resources/js/Inventory');
 assert.deepEqual(wifiPayload({ssid:'Red',has_password:true,password:'',clear:false}),{ssid:'Red',password:'',clear:false});
 assert.equal(wifiPayload(undefined),undefined);
});

const {VenueImage,coverPhotos}=await import('../resources/js/CoverImage');
test('el diseño permite elegir portada fija o carrusel y no publica fotos ocultas',()=>{
 const html=renderToStaticMarkup(<DesignEditor venue={venue} renderPreview={()=><p>Local</p>}/>);
 assert.match(html,/Imágenes de portada/);assert.match(html,/Imagen fija/);assert.match(html,/Carrusel automático/);
 const items=[{id:1,visible:true,cover:false},{id:2,visible:false,cover:true},{id:3,visible:true,cover:true}];
 assert.deepEqual(coverPhotos(items).map(x=>x.id),[3,1]);
});
test('los botones de servicios tienen clases visibles e iconos y las tarjetas no anidan botones',()=>{
 const html=renderToStaticMarkup(<InventoryEditor items={inventory} onChange={()=>{}} wifi={{}} onWifi={()=>{}}/>);
 assert.match(html,/class="inventory-add"/);assert.match(html,/class="danger-action"/);assert.match(html,/lucide-trash/);assert.match(html,/lucide-plus/);
 const img=renderToStaticMarkup(<VenueImage venue={{...venue,design:{cover_mode:"carousel"},photos:[{id:1,image_url:'/1.jpg',cover:true},{id:2,image_url:'/2.jpg'}]}}/>);
 assert.doesNotMatch(img,/<button/);
});

const {PortalFailure}=await import("../resources/js/PortalFailure");
test('el error de arranque administrativo ofrece reintentar y no muestra catálogo ni acceso de clientes',()=>{
 const html=renderToStaticMarkup(<PortalFailure owner error="Server Error" onRetry={()=>{}}/>);
 assert.match(html,/Gestión del negocio/);assert.match(html,/Reintentar conexión/);
 assert.doesNotMatch(html,/Explorar espacios|Mis reservas|Ingresar \/ Registrarme|Asistente ·/);
});

test('un Wi-Fi ilegible se conserva al guardar otros campos y exige reemplazo explícito',async()=>{
 const {wifiPayload}=await import('../resources/js/Inventory');
 assert.equal(wifiPayload({unreadable:true,ssid:'',password:''}),undefined);
 assert.deepEqual(wifiPayload({unreadable:true,replace:true,ssid:'Nueva',password:'Secreto'}),{ssid:'Nueva',password:'Secreto',clear:false,replace:true});
 const html=renderToStaticMarkup(<InventoryEditor items={[]} onChange={()=>{}} wifi={{unreadable:true,ssid:''}} onWifi={()=>{}}/>);
 assert.match(html,/Reemplazar credenciales de Wi-Fi/);assert.match(html,/datos originales se conservarán/);assert.match(html,/disabled=""/);
});

const {BrandWordmark}=await import("../resources/js/PlatformBranding");
const {ConnectionIndicator}=await import("../resources/js/RealtimeStatus");
test('la marca general acepta nombre y logo y el indicador técnico no se muestra al público',()=>{
 const html=renderToStaticMarkup(<BrandWordmark name="Marca de mi negocio" logo="/api/platform-branding/images/logo"/>);
 assert.match(html,/Marca de mi negocio/);assert.match(html,/platform-branding\/images\/logo/);assert.doesNotMatch(html,/encuentro/);
 assert.equal(renderToStaticMarkup(<ConnectionIndicator owner={false}/>),"");
 assert.match(renderToStaticMarkup(<ConnectionIndicator owner/>),/realtime-status/);
});
