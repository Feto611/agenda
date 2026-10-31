import {ConfirmAction} from "./ConfirmAction";
import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { api, type Venue } from "./api";
export const defaultDesign = {
    cover_mode: "fixed", cover_interval: 5,
    primary: "#254d3c",
    accent: "#b86c43",
    background: "#faf8f3",
    text: "#202d26",
    radius: "rounded",
    font: "modern",
    layout: "editorial",
    modal: "center",
    button: "solid",
    show_reviews: true,
    welcome: "Encuentra tu próxima fecha",
    cta: "Reservar mi fecha",
    logo_id: null, favicon_id: null, brand_name: "", tagline: "", page_title: "",
    font_size: "normal", heading_weight: "normal", logo_size: "medium", hero: "split", show_chat: true, show_map: true,
};
function PreviewFrame({ children }: { children: React.ReactNode }) {
    const [doc, setDoc] = useState<Document | null>(null);
    return (
        <iframe
            title="Vista previa de la página del cliente"
            onLoad={(e) => {
                const d = e.currentTarget.contentDocument;
                if (!d) return;
                d.documentElement.lang = "es";
                document
                    .querySelectorAll('link[rel="stylesheet"],style')
                    .forEach((n) => d.head.appendChild(n.cloneNode(true)));
                const viewport = d.createElement("meta");
                viewport.name = "viewport";
                viewport.content = "width=device-width, initial-scale=1";
                d.head.appendChild(viewport);
                setDoc(d);
            }}
            srcDoc="<!doctype html><html lang='es'><head><title>Vista previa</title></head><body></body></html>"
        >
            {doc && createPortal(children, doc.body)}
        </iframe>
    );
}
export function Theme({
    design,
    children,
}: {
    design: any;
    children: React.ReactNode;
}) {
    const d = { ...defaultDesign, ...design };
    return (
        <div
            className={`venue-theme font-${d.font} layout-${d.layout} modal-${d.modal} button-${d.button} text-${d.font_size} weight-${d.heading_weight} hero-${d.hero} logo-${d.logo_size}`}
            style={
                {
                    "--green": d.primary,
                    "--accent": d.accent,
                    "--paper": d.background,
                    "--ink": d.text,
                    "--radius":
                        d.radius === "square"
                            ? "0px"
                            : d.radius === "pill"
                              ? "28px"
                              : "12px",
                } as React.CSSProperties
            }
        >
            {children}
        </div>
    );
}
export function DesignEditor({
    venue,
    renderPreview,
}: {
    venue: Venue;
    renderPreview: (venue: Venue) => React.ReactNode;
}) {
    const [design, setDesign] = useState<any>(defaultDesign),
        [notice, setNotice] = useState(""),
        [busy, setBusy] = useState(false),
        [mobile, setMobile] = useState(false),
        [modal, setModal] = useState(false),
        [assets, setAssets] = useState<any[]>([]),
        [removeTarget,setRemoveTarget]=useState<number|null>(null);
    useEffect(() => {
        let active = true;
        if (venue.id) {
            setNotice(""); setDesign(defaultDesign); setAssets([]);
            api(`/owner/venues/${venue.slug}/design/assets`).then(items => { if (active) setAssets(items); }).catch(e => { if (active) setNotice(e.message); });
            api(`/owner/venues/${venue.slug}/design`)
                .then((d) => { if (active) setDesign({ ...defaultDesign, ...d.draft }); })
                .catch((e) => { if (active) setNotice(e.message); });
        }
        return () => { active = false; };
    }, [venue.id, venue.slug]);
    const set = (key: string, value: any) => {
        setDesign((d: any) => ({ ...d, [key]: value }));
        setNotice("Cambios sin guardar");
    };
    async function save(publish: boolean) {
        setBusy(true);
        try {
            await api(`/owner/venues/${venue.slug}/design`, "PUT", {
                ...design,
                publish,
            });
            setNotice(
                publish
                    ? "Diseño publicado en la página del establecimiento."
                    : "Borrador guardado. Los clientes conservan el diseño publicado.",
            );
        } catch (e) {
            setNotice((e as Error).message);
        } finally {
            setBusy(false);
        }
    }
    async function upload(kind: string, input: HTMLInputElement) {
        const image = input.files?.[0]; if (!image) return;
        setBusy(true);
        try {
            const body = new FormData(); body.set("kind", kind); body.set("image", image);
            const asset = await api(`/owner/venues/${venue.slug}/design/assets`, "POST", body);
            setAssets(items => [asset, ...items]); set(kind + "_id", asset.id);
            setNotice("Archivo subido al borrador. Guarda o publica para conservar la selección.");
        } catch (e) { setNotice((e as Error).message); }
        finally { setBusy(false); input.value = ""; }
    }
    async function removeAsset(id: number) {
        if(busy)return;
        setBusy(true);
        try { await api(`/owner/venues/${venue.slug}/design/assets/${id}`, "DELETE"); setAssets(items => items.filter(x => x.id !== id)); setNotice("Archivo eliminado.");setRemoveTarget(null); }
        catch (e) { setNotice((e as Error).message); }
        finally { setBusy(false); }
    }
    if (!venue.id)
        return (
            <p className="empty">
                Guarda primero tu establecimiento para personalizarlo.
            </p>
        );
    const preview = {
        ...venue,
        design,
        photos: venue.photos?.filter((x) => x.visible),
        reviews: venue.reviews?.filter((x) => x.visible),
    };
    return (
        <section className="design-editor">
            {removeTarget!==null&&<ConfirmAction title="¿Eliminar este archivo de marca?" busy={busy} onCancel={()=>setRemoveTarget(null)} onConfirm={()=>removeAsset(removeTarget)} cancelLabel="Conservar archivo" confirmLabel="Sí, eliminar archivo"><p>Se eliminará el archivo seleccionado. Si está en uso, tendrás que retirarlo del diseño antes de borrarlo.</p></ConfirmAction>}
            <span className="eyebrow">DISEÑO DEL ESTABLECIMIENTO</span>
            <h2>Tu marca, a tu manera.</h2>
            <p>
                Personaliza la página de este local. La vista previa utiliza sus
                datos y fotografías; no crea reservas ni pagos.
            </p>
            <fieldset disabled={busy} className="branding-fields">
                <legend>Identidad del establecimiento</legend>
                <div className="fields">
                    {(["brand_name", "tagline"] as const).map((key, i) => <label key={key}>
                        {["Nombre de marca", "Eslogan", "Título de la pestaña"][i]}
                        <input value={design[key] || ""} maxLength={key === "tagline" ? 160 : 80} placeholder={key === "tagline" ? "Un lugar para celebrar" : venue.name} onChange={e => set(key, e.target.value)} />
                    </label>)}
                    {(["logo"] as ("logo" | "favicon")[]).map(kind => <div className="brand-upload" key={kind}>
                        <label>{kind === "logo" ? "Logo del establecimiento" : "Icono de la página independiente (favicon)"}
                            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => upload(kind, e.currentTarget)} />
                        </label>
                        <small>PNG, JPG o WebP · hasta 3 MB. {kind === "favicon" ? "Recomendado: cuadrado, 256 × 256 px." : "Recomendado: PNG con transparencia."}</small>
                        <label>Archivo seleccionado
                            <select value={design[kind + "_id"] || ""} onChange={e => set(kind + "_id", e.target.value ? Number(e.target.value) : null)}>
                                <option value="">Sin {kind === "logo" ? "logo" : "icono personalizado"}</option>
                                {assets.filter(a => a.kind === kind).map(a => <option key={a.id} value={a.id}>{kind === "logo" ? "Logo" : "Icono"} #{a.id}</option>)}
                            </select>
                        </label>
                        {design[kind + "_id"] && <img className="brand-file-preview" src={brandingUrl(design[kind + "_id"])} alt={kind === "logo" ? "Logo seleccionado" : "Icono seleccionado"} />}
                        <details><summary>Administrar archivos anteriores</summary><div className="brand-asset-list">
                            {assets.filter(a => a.kind === kind).map(a => <div key={a.id}><img src={brandingUrl(a.id)} alt={`${kind} ${a.id}`} /><span>#{a.id}</span><button type="button" className="text-button" onClick={() => setRemoveTarget(a.id)}>Eliminar archivo #{a.id}</button></div>)}
                            <small>Solo se pueden eliminar archivos que no estén en el borrador guardado ni en el diseño publicado.</small>
                        </div></details>
                    </div>)}
                </div>
            </fieldset>
            <fieldset disabled={busy} className="branding-fields"><legend>Estilo y contenido</legend>
            <div className="design-controls fields">
                {(["primary", "accent", "background", "text"] as const).map(
                    (k, i) => (
                        <label key={k}>
                            {
                                [
                                    "Color principal",
                                    "Acentos",
                                    "Fondo",
                                    "Texto",
                                ][i]
                            }
                            <input
                                type="color"
                                value={design[k]}
                                onChange={(e) => set(k, e.target.value)}
                            />
                        </label>
                    ),
                )}
                {Object.entries({
                    radius: [
                        "Bordes",
                        {
                            square: "Rectos",
                            rounded: "Suaves",
                            pill: "Redondos",
                        },
                    ],
                    font: [
                        "Tipografía",
                        { modern: "Moderna · DM Sans", classic: "Editorial · Playfair Display", system: "Sistema · Arial / Helvetica", humanist: "Humanista · Trebuchet", serif: "Tradicional · Georgia", mono: "Monoespaciada · Courier" },
                    ],
                    font_size: ["Tamaño de lectura", { normal: "Normal", large: "Grande" }],
                    heading_weight: ["Peso de los títulos", { normal: "Normal", bold: "Negrita" }],
                    logo_size: ["Tamaño del logo", { small: "Pequeño", medium: "Mediano", large: "Grande" }],
                    cover_mode: ["Imágenes de portada", { fixed: "Imagen fija", carousel: "Carrusel automático" }],
                    hero: ["Portada", { split: "Texto y foto lado a lado", stacked: "Foto debajo del texto" }],
                    layout: [
                        "Distribución",
                        { editorial: "Amplia", compact: "Compacta" },
                    ],
                    modal: [
                        "Ventanas emergentes",
                        { center: "Centradas", side: "Laterales" },
                    ],
                    button: [
                        "Botones",
                        { solid: "Sólidos", outline: "Contorno" },
                    ],
                }).map(([key, [label, options]]) => (
                    <label key={key}>
                        {label as string}
                        <select
                            value={design[key]}
                            onChange={(e) => set(key, e.target.value)}
                        >
                            {Object.entries(
                                options as Record<string, string>,
                            ).map(([v, t]) => (
                                <option key={v} value={v}>
                                    {t}
                                </option>
                            ))}
                        </select>
                    </label>
                ))}
                {design.cover_mode==="carousel"&&<label>Tiempo entre fotografías<select value={design.cover_interval} onChange={e=>set("cover_interval",Number(e.target.value))}>{[3,5,8,10,15,20].map(n=><option key={n} value={n}>{n} segundos</option>)}</select><small>Usa las fotos publicadas. Se pausa al pasar el cursor, al enfocar los controles y si el dispositivo solicita reducir el movimiento.</small></label>}
                <label>
                    Encabezado
                    <input
                        value={design.welcome}
                        maxLength={120}
                        onChange={(e) => set("welcome", e.target.value)}
                    />
                </label>
                <label>
                    Botón de reserva
                    <input
                        value={design.cta}
                        maxLength={60}
                        onChange={(e) => set("cta", e.target.value)}
                    />
                </label>
                <label>
                    <input
                        type="checkbox"
                        checked={design.show_reviews}
                        onChange={(e) => set("show_reviews", e.target.checked)}
                    />{" "}
                    Mostrar comentarios publicados
                </label>
                {[['show_chat', 'Mostrar asistente para clientes'], ['show_map', 'Mostrar mapa de ubicación']].map(([key, label]) => <label key={key}><input type="checkbox" checked={design[key] !== false} onChange={e => set(key, e.target.checked)} /> {label}</label>)}
            </div>
            </fieldset>
            <div className="design-actions">
                <button
                    className="outline"
                    disabled={busy}
                    onClick={() => setDesign({ ...defaultDesign })}
                >
                    Restablecer borrador
                </button>
                <button
                    className="outline"
                    disabled={busy}
                    onClick={() => save(false)}
                >
                    Guardar borrador
                </button>
                <button
                    className="primary"
                    disabled={busy}
                    onClick={() => save(true)}
                >
                    Publicar diseño
                </button>
            </div>
            <p role="status">{notice}</p>
            <div className="preview-toolbar">
                <strong>Vista de cliente</strong>
                <button className="outline" onClick={() => setMobile(!mobile)}>
                    {mobile ? "Ver escritorio" : "Ver móvil"}
                </button>
                <button className="outline" onClick={() => setModal(!modal)}>
                    Probar ventana
                </button>
            </div>
            <div className={"design-preview " + (mobile ? "mobile" : "")}>
                <PreviewFrame>
                    <Theme design={design}>
                        {renderPreview(preview)}
                        {modal && (
                            <div className="modal-backdrop preview-modal">
                                <section
                                    className="modal"
                                    role="dialog"
                                    aria-label="Vista previa de ventana"
                                >
                                    <button
                                        className="close"
                                        onClick={() => setModal(false)}
                                    >
                                        ×
                                    </button>
                                    <h2>Reserva en {venue.name}</h2>
                                    <p>
                                        Así se verán las ventanas con tu diseño.
                                    </p>
                                    <button
                                        className="primary"
                                        onClick={() => setModal(false)}
                                    >
                                        {design.cta}
                                    </button>
                                </section>
                            </div>
                        )}
                    </Theme>
                </PreviewFrame>
            </div>
        </section>
    );
}

export const brandingUrl = (id: number) => `/api/media/branding/${id}`;
export function VenueBrand({ venue }: { venue: Venue }) {
    const ref = useRef<HTMLDivElement>(null);
    const d = { ...defaultDesign, ...venue.design };
    return <div ref={ref} className={`venue-brand logo-${d.logo_size}`}>
        {d.logo_id && <img src={brandingUrl(d.logo_id)} alt={`Logo de ${d.brand_name || venue.name}`} />}
        <div><strong>{d.brand_name || venue.name}</strong>{d.tagline && <p>{d.tagline}</p>}</div>
    </div>;
}
