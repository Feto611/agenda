import {PaymentChoices} from "./PaymentChoices";
import {EmbeddedPayment} from "./EmbeddedPayments";
import {PolicyAcceptance} from "./ReservationPolicy";
import React, { useEffect, useState, useRef } from "react";
import {
    ArrowRight,
    Check,
    ExternalLink,
    ShieldCheck,
    Wallet,
    X,
} from "lucide-react";
import { useLive } from "./Live";
import { api, ApiError, money, type Venue } from "./api";
const names: Record<string, string> = {
    paypal: "PayPal",
    mercadopago: "Mercado Pago",
    oxxo: "OXXO Pay",
};
const fields: Record<
    string,
    { key: string; label: string; public?: boolean; long?: boolean }[]
> = {
    paypal: [
        { key: "client_id", label: "Client ID", public: true },
        { key: "client_secret", label: "Client Secret" },
        {
            key: "merchant_id",
            label: "Merchant ID de la cuenta receptora",
            public: true,
        },
        { key: "webhook_id", label: "Webhook ID", public: true },
    ],
    mercadopago: [
        {key:"public_key",label:"Public Key · formulario de tarjetas integrado",public:true},
        { key: "access_token", label: "Access Token" },
        { key: "webhook_secret", label: "Secreto de firma de Webhooks" },
        {
            key: "merchant_id",
            label: "Collector ID / ID de vendedor",
            public: true,
        },
    ],
    oxxo: [
        { key: "private_key", label: "Clave privada de Digital FEMSA" },
        {
            key: "webhook_public_key",
            label: "Clave pública RSA de verificación de Webhooks",
            long: true,
        },
    ],
};
export function GatewaySettings({ venue }: { venue: Venue }) {
    const [accounts, setAccounts] = useState<any[]>([]),
        [provider, setProvider] = useState("paypal"),
        [values, setValues] = useState<Record<string, string>>({}),
        [enabled, setEnabled] = useState(false),
        [sandbox, setSandbox] = useState(true),
        [error, setError] = useState(""),
        [ok, setOk] = useState(""),
        [busy, setBusy] = useState(false),[loaded,setLoaded]=useState(false),[replace,setReplace]=useState(false);
    const lock=useRef(false),loadSequence=useRef(0);
    async function load() {
        if (!venue.id) return;
        const sequence=++loadSequence.current;
        const data=await api(`/owner/venues/${venue.slug}/gateways`);
        if(sequence===loadSequence.current){setAccounts(data);setLoaded(true);}
    }
    useEffect(() => {setLoaded(false);setAccounts([]);setError("");load().catch(e=>setError(e.message));return()=>{loadSequence.current++;};}, [venue.id]);
    useEffect(() => {
        const a = accounts.find((a) => a.provider === provider);
        setEnabled(a?.enabled || false);
        setSandbox(a?.sandbox ?? true);
        setValues(a?.public_fields || {});setReplace(false);
        setOk("");
    }, [provider, accounts]);
    async function save(e: React.FormEvent) {
        e.preventDefault();
        if(lock.current||!loaded)return;lock.current=true;setOk("");
        setBusy(true);
        setError("");
        try {
            await api(
                `/owner/venues/${venue.slug}/gateways/${provider}`,
                "PUT",
                { enabled, sandbox, credentials: values, replace },
            );
            await load();
            setOk(
                "Configuración guardada. Revisa y registra la URL de notificación mostrada para esta configuración.",
            );
        } catch (e) {
            setError((e as Error).message);
        } finally {
            lock.current=false;setBusy(false);
        }
    }
    const account = accounts.find((a) => a.provider === provider);
    if (!venue.id)
        return (
            <div className="notice">
                Guarda el establecimiento como borrador antes de configurar sus
                cobros.
            </div>
        );
    return (
        <section className="gateway-settings">
            <span className="eyebrow">COBROS DEL ESTABLECIMIENTO</span>
            <h2>Pasarelas de pago.</h2>
            <p className="muted">
                Cada establecimiento utiliza su propia cuenta receptora. Primero
                configura el modo de pruebas y sus notificaciones.
            </p>
            <div className="gateway-tabs">
                {Object.keys(names).map((p) => (
                    <button
                        className={provider === p ? "active" : ""}
                        disabled={busy}
                        onClick={() => {setProvider(p);setError("");setOk("");}}
                        key={p}
                    >
                        {names[p]}
                    </button>
                ))}
            </div>
            {!loaded&&<div className="notice" role="status">{error?"No se pudo cargar la configuración de cobros.":"Cargando configuración de cobros…"}<button type="button" className="outline" onClick={()=>{setError("");load().catch(e=>setError(e.message));}}>Reintentar carga</button></div>}
            <form onSubmit={save}>
                {account?.unreadable&&<div className="credential-recovery" role="alert"><strong>Es necesario recuperar las credenciales</strong><p>{account.credential_warning}</p><label className="toggle"><input type="checkbox" checked={replace} disabled={busy} onChange={e=>{setReplace(e.target.checked);setValues({});}}/>Reemplazar credenciales de esta pasarela</label><small>Introduce todos los datos. Se creará una configuración nueva y se conservará la anterior para revisar pagos existentes. Para recuperarlos puede ser necesaria la clave anterior.</small></div>}
                <fieldset className="gateway-fields" disabled={!loaded||busy}>

                <label className="toggle">
                    <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => setEnabled(e.target.checked)}
                    />
                    Habilitar {names[provider]} para los clientes
                </label>
                <label className="toggle">
                    <input
                        type="checkbox"
                        checked={sandbox}
                        disabled={account?.unreadable&&!replace}
                        onChange={(e) => setSandbox(e.target.checked)}
                    />
                    Modo de pruebas (sandbox / claves de prueba)
                </label>
                <div className="fields">
                    {fields[provider].map((f) => (
                        <label className={f.long ? "span-2" : ""} key={f.key}>
                            {f.label}
                            {f.long ? (
                                <textarea
                                    disabled={account?.unreadable&&!replace}
                                    value={values[f.key] || ""}
                                    onChange={(e) =>
                                        setValues({
                                            ...values,
                                            [f.key]: e.target.value,
                                        })
                                    }
                                    placeholder={
                                        account?.configured_keys.includes(f.key)
                                            ? "Guardada. Deja vacío para conservarla."
                                            : "-----BEGIN PUBLIC KEY-----"
                                    }
                                />
                            ) : (
                                <input
                                    disabled={account?.unreadable&&!replace}
                                    type={f.public ? "text" : "password"}
                                    autoComplete="new-password"
                                    value={values[f.key] || ""}
                                    onChange={(e) =>
                                        setValues({
                                            ...values,
                                            [f.key]: e.target.value,
                                        })
                                    }
                                    placeholder={
                                        account?.configured_keys.includes(f.key)
                                            ? "Guardado. Deja vacío para conservarlo."
                                            : "Credencial de tu cuenta de " +
                                              names[provider]
                                    }
                                />
                            )}
                        </label>
                    ))}
                </div>
                <div className="notice">
                    <ShieldCheck size={20} />
                    <div>
                        <b>Notificación del proveedor</b>
                        <p>
                            Registra esta URL en el panel de {names[provider]}.
                            El dominio público debe usar HTTPS y permitir las
                            notificaciones entrantes.
                        </p>
                        <code>
                            {account?.webhook_url ||
                                `CUSTOMER_URL/api/payments/webhooks/${venue.slug}/${provider}`}
                        </code>
                        {provider === "paypal" && (
                            <p>
                                Eventos: PAYMENT.CAPTURE.COMPLETED y
                                PAYMENT.CAPTURE.REFUNDED.
                            </p>
                        )}
                        {provider === "mercadopago" && (
                            <p>
                                Activa notificaciones de pagos y configura el
                                secreto de firma.
                            </p>
                        )}
                        {provider === "oxxo" && (
                            <p>
                                Eventos de órdenes pagadas y devoluciones.
                                Configura la clave pública de firma de Digital
                                FEMSA.
                            </p>
                        )}
                    </div>
                </div>
                </fieldset>
                {error && (
                    <div className="error" role="alert">
                        {error}
                    </div>
                )}
                {ok && <div className="success">{ok}</div>}
                <button className="primary" disabled={busy||!loaded||(!!account?.unreadable&&!replace&&enabled)}>
                    {busy ? "Guardando…" : "Guardar pasarela"}
                    <Check size={16} />
                </button>
            </form>
            <GatewayDiagnostics venue={venue} provider={provider}/>
            <div className="notice">
                Activar una pasarela aquí no crea una cuenta comercial ni
                verifica su alta con el proveedor. Se necesitan credenciales
                válidas, un comercio aprobado y pruebas completas antes de
                cobrar en producción.
            </div>
        </section>
    );
}
export function useAutomaticPaymentStatus(attempt:any,onChange:(a:any)=>void,enabled=true){
 const callback=useRef(onChange);callback.current=onChange;
 const finished=!!attempt&&["paid","failed","review","refunded","partially_refunded","superseded"].includes(attempt.status);
 useEffect(()=>{if(!enabled||!attempt?.id||finished)return;let disposed=false,timer:number|undefined;let checks=0;
 const tick=async()=>{if(disposed)return;try{if(document.visibilityState!=="hidden"){checks++;const data=await api("/checkout/"+attempt.id+"/sync","POST");if(disposed)return;callback.current(data);if(["paid","failed","review","refunded","partially_refunded","superseded"].includes(data.status))return;}}catch{/* State will be retried; never ask the customer to inspect technical accounts. */}finally{if(!disposed&&checks<30&&new Date(attempt.expires_at).getTime()>Date.now())timer=window.setTimeout(tick,30000);}};
 timer=window.setTimeout(tick,1500);return()=>{disposed=true;window.clearTimeout(timer);};
 },[attempt?.id,enabled,finished]);
}
export function CheckoutButton({ booking }: { booking: any }) {
    const [open, setOpen] = useState(false),
        [options, setOptions] = useState<any[]>([]),
        [provider, setProvider] = useState(""),
        [purpose, setPurpose] = useState(
            booking.paid_total < booking.deposit ? "deposit" : "balance",
        ),
        [cooldown,setCooldown]=useState(0),
        [phone, setPhone] = useState(""),
        [error, setError] = useState(""),
        [busy, setBusy] = useState(false),
        [attempt, setAttempt] = useState<any>(null),[accepted,setAccepted]=useState(false),[bookingInfo,setBookingInfo]=useState<any>(null);
    const submitting=useRef(false),opening=useRef(false);
    useEffect(()=>{if(!cooldown)return;const timer=window.setTimeout(()=>setCooldown(n=>Math.max(0,n-1)),1000);return()=>window.clearTimeout(timer);},[cooldown]);
    useAutomaticPaymentStatus(attempt,setAttempt,open);
    async function start() {
        if(opening.current)return;opening.current=true;setPurpose(booking.paid_total<booking.deposit?"deposit":"balance");setOpen(true);setAttempt(null);setAccepted(false);setBookingInfo(null);setOptions([]);
        setError("");
        setBusy(true);
        try {
            const d = await api(`/bookings/${booking.id}/payment-options`);
            setOptions(d.providers);setBookingInfo(d.booking||null);setPurpose((d.booking?.paid_total??booking.paid_total)<(d.booking?.deposit??booking.deposit)?"deposit":"balance");
            setProvider(d.providers.find((p:any)=>p.available!==false)?.provider || d.providers[0]?.provider || "");
        } catch (e) {
            setError((e as Error).message);
        } finally {
            opening.current=false;setBusy(false);
        }
    }
    async function checkout(e: React.FormEvent) {
        e.preventDefault();
        if(submitting.current||cooldown>0||!accepted||options.find(p=>p.provider===provider)?.available===false)return;submitting.current=true;
        setBusy(true);
        setError("");
        try {
            const a = await api(`/bookings/${booking.id}/checkout`, "POST", {
                provider,
                policy_accepted:accepted,
                purpose,
                phone: phone || undefined,
            });
            setAttempt(a);
            if (a.checkout?.url && a.provider!=="paypal") {
                window.location.assign(a.checkout.url);
                return;
            }

        } catch (e) {
            if(e instanceof ApiError&&e.status===429)setCooldown(e.retryAfter||60);
            setError(e instanceof ApiError&&e.status>=500?"No pudimos abrir el pago en este momento. Tu reservación se conserva; vuelve a intentarlo más tarde.":(e as Error).message);
        } finally {
            submitting.current=false;setBusy(false);
        }
    }
    const currentBooking=bookingInfo&&typeof bookingInfo.balance_due==="number"?bookingInfo:booking;
    const amount =
        purpose === "deposit"
            ? Math.max(0, currentBooking.deposit - currentBooking.paid_total)
            : currentBooking.balance_due;
    const active =
        booking.status === "confirmed" ||
        (booking.status === "hold" &&
            new Date(booking.expires_at).getTime() > Date.now());
    return (
        <>
            <button
                className="primary pay-button"
                onClick={start}
                disabled={!active}
            >
                Pagar reserva <Wallet size={15} />
            </button>
            {open && (
                <div className="modal-backdrop">
                    <section
                        className="modal checkout-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Pagar reserva"
                    >
                        <button
                            className="close"
                            onClick={() => setOpen(false)}
                            aria-label="Cerrar"
                        >
                            <X />
                        </button>
                        <span className="eyebrow">CHECKOUT SEGURO</span>
                        <h2>Confirma tu encuentro.</h2>
                        <p>Revisa el importe y elige cómo pagar.</p>
                        {(bookingInfo?.starts_at||booking.starts_at)&&<div className="checkout-reservation"><strong>{bookingInfo?.venue_name||booking.venue?.name||"Tu reserva"}</strong><span>Orden: {bookingInfo?.order_number||booking.order_number}</span><span>Evento: {new Date(bookingInfo?.starts_at||booking.starts_at).toLocaleString("es-MX",{timeZone:bookingInfo?.timezone||booking.quote?.timezone||"America/Mexico_City",dateStyle:"long",timeStyle:"short"})}</span><small>Zona horaria: {bookingInfo?.timezone||booking.quote?.timezone||"America/Mexico_City"}</small></div>}
                        {!busy && !options.length && (
                            <div className="notice">
                                El establecimiento todavía no habilita pagos en
                                línea. Contacta al negocio para conocer sus
                                medios de pago.
                            </div>
                        )}
                        {options.length > 0 &&
                            !attempt && (
                                <form onSubmit={checkout}>
                                    <PaymentChoices booking={currentBooking} options={options} purpose={purpose} provider={provider} busy={busy} onPurpose={setPurpose} onProvider={setProvider}/>
                                    {provider === "oxxo" && (
                                        <label>
                                            Teléfono de contacto para la ficha
                                            OXXO
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={(e) =>
                                                    setPhone(e.target.value)
                                                }
                                                maxLength={30}
                                                placeholder="Solo si no lo registraste en tu cuenta"
                                            />
                                        </label>
                                    )}
                                    <div className="checkout-total">
                                        A pagar{" "}
                                        <strong>{money(amount)} MXN</strong>
                                    </div>
                                    <PolicyAcceptance checked={accepted} onChange={setAccepted}/>
                                    <button
                                        className="primary"
                                        disabled={busy || cooldown>0 || !provider || !accepted || options.find(p=>p.provider===provider)?.available===false}
                                    >
                                        {cooldown>0?`Reintentar en ${cooldown} s`:busy
                                            ? "Preparando…"
                                            : provider === "oxxo"
                                              ? "Generar ficha OXXO"
                                              : provider === "paypal" || options.find(p=>p.provider===provider)?.public_key ? "Preparar pago seguro" : "Continuar a " + names[provider]}
                                        <ArrowRight size={16} />
                                    </button>
                                </form>
                            )}
                        {attempt && !attempt.checkout?.reference && <div><div className="checkout-total">A pagar <strong>{money(attempt.amount)} MXN</strong></div>{attempt.status==="pending" && !attempt.checkout?.capture_started_at && !attempt.checkout?.card_submitted && (attempt.provider==="paypal"||attempt.checkout?.mode==="embedded") ? <EmbeddedPayment attempt={attempt} onError={setError} onPaid={(a)=>{setAttempt(a);window.location.assign("/pago/"+a.id);}}/> : <p className="notice">{attempt.customer_message||"Estamos comprobando el estado de tu pago automáticamente."}</p>}{attempt.provider==="paypal"&&error&&attempt.checkout?.url&&<a className="outline" href={attempt.checkout.url}>Abrir PayPal para continuar</a>}{attempt.provider==="paypal"&&attempt.status==="pending"&&!attempt.checkout?.capture_started_at&&<button type="button" className="outline" onClick={()=>{setAttempt(null);setAccepted(false);setError("");}}>Cambiar importe</button>}<a className="text-button" href={"/pago/"+attempt.id}>Ver el estado de mi pago</a></div>}
                        {attempt?.checkout?.reference && (
                            <CashReference attempt={attempt} />
                        )}{" "}
                        {error && (
                            <div className="error" role="alert">
                                {error}
                            </div>
                        )}
                    </section>
                </div>
            )}
        </>
    );
}
function CashReference({ attempt }: { attempt: any }) {
    function download(){const text=`Ficha OXXO Pay\nReferencia: ${attempt.checkout.reference}\nImporte: ${money(attempt.amount)} MXN\nVencimiento: ${new Date(attempt.expires_at).toLocaleString('es-MX',{timeZone:'America/Mexico_City'})}\nPaga el importe exacto. La comisión de la tienda se informa en caja. No utilices una ficha vencida. Emitir esta ficha no confirma la reserva.\nPagos no reembolsables por cancelación del cliente o inasistencia, salvo las excepciones legales aplicables.`;const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='ficha-oxxo-'+attempt.id+'.txt';a.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);}
    return (
        <div className="cash-reference">
            <b>OXXO Pay</b>
            <button type="button" className="outline" onClick={download}>Descargar ficha e instrucciones</button>
            <span>Referencia de pago</span>
            <strong>{attempt.checkout.reference}</strong>
            <p>Importe: {money(attempt.amount)} MXN</p>
            <p>Vence: {new Date(attempt.expires_at).toLocaleString("es-MX")}</p>
            <small>
                Paga el importe exacto en OXXO. La comisión que cobre la tienda
                se informa en caja. Emitir la ficha no confirma que ya pagaste.
                Si vence, no la utilices.
            </small>
            <a href={"/pago/" + attempt.id}>
                Consultar estado del pago <ArrowRight size={14} />
            </a>
        </div>
    );
}
export function PaymentReturn({id,navigate}:{id:string;navigate:(p:string)=>void}){
 const [a,setA]=useState<any>(null),[error,setError]=useState(""),[busy,setBusy]=useState(true);
 const accept=useRef(false);
 useEffect(()=>{let alive=true;accept.current=false;setBusy(true);setA(null);setError("");
 (async()=>{try{let data=await api("/checkout/"+id);const q=new URLSearchParams(location.search);if(!alive)return;setA(data);
 if(!["paid","failed","review","refunded","partially_refunded","superseded"].includes(data.status)&&!q.has("cancelado")){
  if(data.provider==="paypal"&&q.has("token")&&!accept.current){accept.current=true;data=await api("/checkout/"+id+"/capture","POST");}
  else if(data.provider==="mercadopago"&&q.get("payment_id"))data=await api("/checkout/"+id+"/reconcile","POST",{payment_id:q.get("payment_id")});
  else data=await api("/checkout/"+id+"/sync","POST");
 }
 if(alive)setA(data);
 }catch{if(alive)setError("No pudimos actualizar el pago en este momento. Conservamos tu reservación; el estado se actualizará automáticamente.");}finally{if(alive)setBusy(false);}})();
 return()=>{alive=false;};},[id]);
 useAutomaticPaymentStatus(a,setA,!busy);
 useLive("/checkout/"+id,true,setA,()=>{});
 const title=!a?"Cargando tu pago…":a.status==="paid"?"Tu pago se completó.":a.status==="failed"?"No se completó el pago.":a.status==="review"?"Estamos atendiendo tu reservación.":a.status==="refunded"?"Se registró una devolución.":a.status==="partially_refunded"?"Se registró una devolución parcial.":a.status==="pending"&&a.provider==="paypal"?"Continúa con tu pago.":"Estamos comprobando tu pago.";
 return <main className="payment-result"><span className="eyebrow">TU RESERVACIÓN</span><h1>{title}</h1>{a&&<><p>{names[a.provider]} · {money(a.amount)} MXN</p><div className={a.status==="paid"?"success":"notice"} role="status">{a.customer_message||"El estado de tu pago se actualiza automáticamente. Puedes volver a Mis reservas."}</div>{a.provider==="paypal"&&a.status==="pending"&&a.external_id&&!a.checkout?.capture_started_at&&!busy&&<EmbeddedPayment attempt={a} onError={setError} onPaid={setA}/>} {a.checkout?.reference&&<CashReference attempt={a}/>}</>}{error&&<p className="notice" role="status">{error}</p>}<div className="payment-actions"><button className="primary" onClick={()=>navigate("/account")}>Ver mis reservas <ArrowRight size={16}/></button></div></main>;
}
export function GatewayDiagnostics({venue,provider}:{venue:Venue;provider:string}){
 const [rows,setRows]=useState<any[]>([]),[error,setError]=useState("");
 async function load(){try{const data=await api(`/owner/venues/${venue.slug}/gateways/${provider}/diagnostics`);setRows(data.attempts||[]);setError("");}catch{setError("No se pudo cargar el diagnóstico de pagos.");}}
 useEffect(()=>{setRows([]);load();},[venue.id,provider]);
 return <details className="gateway-diagnostics"><summary>Diagnóstico privado de pagos</summary><p>Esta información solo aparece en tu panel. No incluye contraseñas, tokens ni datos de tarjetas.</p><button type="button" className="outline" onClick={load}>Actualizar diagnóstico</button>{error&&<p className="error">{error}</p>}{!rows.length&&!error&&<p>No hay errores registrados para esta pasarela.</p>}{rows.map(row=><article key={row.id}><strong>{row.sandbox?"Sandbox":"Producción"} · {row.diagnostic.resolved_at?"Recuperado":row.status}</strong><p>Intento: {row.id}</p><p>Operación: {row.diagnostic.operation} · HTTP: {row.diagnostic.http_status||"Sin respuesta HTTP"}</p><p>Error: {row.diagnostic.name}{row.diagnostic.issue?" · "+row.diagnostic.issue:""}</p>{row.diagnostic.connection_code&&<p>Conexión: {row.diagnostic.connection_code}</p>}{row.diagnostic.field&&<p>Campo: {row.diagnostic.field}</p>}{row.diagnostic.debug_id&&<p>PayPal Debug ID: {row.diagnostic.debug_id}</p>}<small>{new Date(row.diagnostic.occurred_at).toLocaleString("es-MX")}</small></article>)}</details>;
}
