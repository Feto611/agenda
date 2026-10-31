import { VenueImage } from "./CoverImage";
export { VenueImage } from "./CoverImage";
import { ExtrasSummary } from "./Inventory";
import React, { useEffect, useState } from "react";
import {
    ArrowRight,
    ArrowUpRight,
    CalendarDays,
    Check,
    Clock,
    ImagePlus,
    Trash2,
    MapPin,
    MessageCircle,
    Plus,
    ShieldCheck,
    Users,
    Wallet,
    X,
} from "lucide-react";
import { api, money, hour, type Venue } from "./api";
import { NumericInput } from "./FormInputs";
export function Catalogue({
    venues,
    navigate,
    branding,
}: {
    venues: Venue[];
    navigate: (p: string) => void;
    branding?:any;
}) {
    const [query,setQuery]=useState("");
    const normalize=(text:string)=>text.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
    const visible=venues.filter(v=>normalize([v.name,v.settings.address,v.settings.description].join(" ")).includes(normalize(query.trim())));
    return (
        <main className="catalogue">
            <div className="catalogue-heading">
                <div>
                    <span className="eyebrow">
                        ESTABLECIMIENTOS · DISPONIBILIDAD Y RESERVAS
                    </span>
                    <h1>
                        {branding?.catalogue_title || <>Elige dónde <em>encontrarse.</em></>}
                    </h1>
                    <p>
                        {branding?.catalogue_intro ?? "Fotos del lugar, información útil y precios publicados por cada establecimiento."}
                    </p>
                </div>
                <span>
                    {venues.length}{" "}
                    {venues.length === 1
                        ? "establecimiento"
                        : "establecimientos"}
                </span>
            </div>
            <label className="catalogue-search">Buscar un espacio<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nombre, ubicación o descripción"/></label>
            {venues.length>0&&!visible.length&&<div className="empty"><h3>No encontramos espacios con esa búsqueda.</h3><button type="button" className="outline" onClick={()=>setQuery("")}>Limpiar búsqueda</button></div>}
            <div
                className={
                    "place-cards " + (visible.length === 1 ? "single" : "")
                }
            >
                {visible.map((v) => (
                    <article className="place-card" key={v.id}>
                        <button
                            className="place-photo-button"
                            onClick={() => navigate("/local/" + v.slug)}
                        >
                            <VenueImage venue={v} />
                            <span className="place-badge">
                                {v.settings.mode === "day"
                                    ? "Renta por evento"
                                    : "Renta por hora"}
                            </span>
                        </button>
                        <div className="place-content">
                            <small>
                                <MapPin size={13} />
                                {v.settings.address}
                            </small>
                            <h2>{v.name}</h2>
                            <p>{v.settings.description}</p>
                            <div className="place-facts">
                                <span>
                                    <Users size={14} />
                                    {v.settings.capacity} personas
                                </span>
                                <span>
                                    <Clock size={14} />
                                    {hour(
                                        v.settings.open_hour +
                                            (v.settings.open_minute ?? 0) / 60,
                                    )}{" "}
                                    —{" "}
                                    {hour(
                                        v.settings.close_hour +
                                            (v.settings.close_minute ?? 0) / 60,
                                    )}
                                </span>
                            </div>
                            {v.reviews?.[0] && (
                                <blockquote>
                                    <p>“{v.reviews[0].body}”</p>
                                    <cite>
                                        {v.reviews[0].author} ·{" "}
                                        {v.reviews[0].source === "instagram"
                                            ? "Comentario de Instagram"
                                            : "Comentario seleccionado por el dueño"}
                                    </cite>
                                </blockquote>
                            )}
                            <div className="place-price">
                                <span>
                                    Desde{" "}
                                    <strong>
                                        {money(
                                            Math.min(
                                                v.settings.weekday_price,
                                                v.settings.weekend_price,
                                                v.settings.holiday_price,
                                            ),
                                        )}
                                    </strong>
                                    <small>
                                        {" "}
                                        MXN{" "}
                                        {v.settings.mode === "hour"
                                            ? "/ hora"
                                            : "/ evento"}
                                    </small>
                                </span>
                                <button
                                    className="primary"
                                    onClick={() => navigate("/local/" + v.slug)}
                                >
                                    Ver fotos y disponibilidad{" "}
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    </article>
                ))}
            </div>
            {!venues.length && (
                <div className="empty">
                    <ImagePlus size={40} />
                    <h2>Los establecimientos aparecerán aquí.</h2>
                    <p>
                        Pronto podrás consultar los espacios disponibles con sus
                        fotos, precios y calendario.
                    </p>
                    <button className="primary" onClick={() => navigate("/")}>
                        Volver al catálogo <ArrowRight size={16} />
                    </button>
                </div>
            )}
        </main>
    );
}
export function PublicGallery({ venue }: { venue: Venue }) {
    const [opened, setOpened] = useState<any>(null);
    return (
        <>
            {!!venue.photos?.length && (
                <section className="card venue-gallery">
                    <div className="card-heading">
                        <div>
                            <h3>Conoce el establecimiento</h3>
                            <p>
                                Fotografías publicadas por el dueño y fuentes
                                identificadas.
                            </p>
                        </div>
                        <ImagePlus size={22} />
                    </div>
                    <div className="gallery-grid">
                        {venue.photos.map((photo: any) => (
                            <figure key={photo.id}>
                                <button onClick={() => setOpened(photo)}>
                                    <img
                                        loading="lazy"
                                        src={photo.image_url}
                                        alt={photo.caption || venue.name}
                                    />
                                </button>
                                <figcaption>
                                    {photo.caption && (
                                        <span>{photo.caption}</span>
                                    )}
                                    {photo.source_url && (
                                        <a
                                            href={photo.source_url}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            {photo.author
                                                ? "@" + photo.author + " · "
                                                : ""}
                                            Ver publicación original{" "}
                                            <ArrowUpRight size={12} />
                                        </a>
                                    )}
                                </figcaption>
                            </figure>
                        ))}
                    </div>
                </section>
            )}
            {!!venue.reviews?.length && (
                <section className="card public-reviews">
                    <h3>Lo que se comenta del lugar</h3>
                    <p className="muted">
                        Selección del dueño con fuente identificada. Los
                        comentarios sociales no acreditan una reserva
                        verificada.
                    </p>
                    <div>
                        {venue.reviews.map((r: any) => (
                            <blockquote key={r.id}>
                                <p>“{r.body}”</p>
                                <cite>
                                    {r.author} ·{" "}
                                    {r.source === "instagram"
                                        ? "Instagram"
                                        : "Seleccionado por el dueño"}
                                </cite>
                                {r.source_url && (
                                    <a
                                        target="_blank"
                                        rel="noreferrer"
                                        href={r.source_url}
                                    >
                                        Ver fuente original{" "}
                                        <ArrowUpRight size={12} />
                                    </a>
                                )}
                            </blockquote>
                        ))}
                    </div>
                </section>
            )}
            {opened && (
                <div className="modal-backdrop" onClick={() => setOpened(null)}>
                    <section
                        className="photo-lightbox"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Fotografía del establecimiento"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="close"
                            aria-label="Cerrar fotografía"
                            onClick={() => setOpened(null)}
                        >
                            <X />
                        </button>
                        <img
                            src={opened.image_url}
                            alt={opened.caption || venue.name}
                        />
                        <p>{opened.caption}</p>
                        {opened.source_url && (
                            <a
                                href={opened.source_url}
                                target="_blank"
                                rel="noreferrer"
                            >
                                Ver fuente original
                            </a>
                        )}
                    </section>
                </div>
            )}
        </>
    );
}
export function OwnerAgenda({
    venue,
    rows,
    onRefresh,
}: {
    venue: Venue;
    rows: any[];
    onRefresh: () => void;
}) {
    const [search, setSearch] = useState(""),
        [selected, setSelected] = useState<any>(null),
        [error, setError] = useState(""),
        [saving, setSaving] = useState(false),
        [key, setKey] = useState("");
    const visible = rows.filter((r) =>
        [r.user?.name, r.user?.email, r.order_number, r.id]
            .join(" ")
            .toLowerCase()
            .includes(search.toLowerCase()),
    );
    const total = rows
        .filter(
            (r) =>
                r.status === "confirmed" ||
                (r.status === "hold" &&
                    new Date(r.expires_at).getTime() > Date.now()),
        )
        .reduce((sum, r) => sum + r.balance_due, 0);
    async function record(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        setSaving(true);
        const form = new FormData(e.currentTarget);
        try {
            await api(
                `/owner/venues/${venue.slug}/bookings/${selected.id}/payments`,
                "POST",
                {
                    amount: Math.round(Number(form.get("amount")) * 100),
                    method: form.get("method"),
                    reference: form.get("reference"),
                    idempotency_key: key,
                },
            );
            setSelected(null);
            onRefresh();
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setSaving(false);
        }
    }
    return (
        <>
            <div className="agenda-heading">
                <div>
                    <span className="eyebrow">
                        ADMINISTRACIÓN · {venue.name}
                    </span>
                    <h2>Reservaciones y pagos.</h2>
                    <p>
                        Cliente, orden, importes recibidos y saldo de cada
                        evento.
                    </p>
                </div>
            </div>
            <div className="agenda-stats">
                <div>
                    <CalendarDays size={20} />
                    <span>Órdenes en esta página</span>
                    <strong>{rows.length}</strong>
                </div>
                <div>
                    <Wallet size={20} />
                    <span>Pagos registrados en esta página</span>
                    <strong>
                        {money(
                            rows.reduce(
                                (sum, r) => sum + (r.paid_total || 0),
                                0,
                            ),
                        )}
                    </strong>
                </div>
                <div>
                    <Clock size={20} />
                    <span>Saldo de órdenes activas en esta página</span>
                    <strong>{money(total)}</strong>
                </div>
            </div>
            <label className="agenda-search">
                Buscar cliente, correo u orden en esta página
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Ej. nombre del cliente o número de orden"
                />
            </label>
            <div className="agenda-table-wrap">
                <table className="agenda-table">
                    <thead>
                        <tr>
                            <th>Cliente y orden</th>
                            <th>Evento</th>
                            <th>Total / anticipo</th>
                            <th>Pagado / restante</th>
                            <th>Estado y acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visible.map((r) => {
                            const hold =
                                r.status === "hold" &&
                                new Date(r.expires_at).getTime() > Date.now();
                            return (
                                <React.Fragment key={r.id}>
                                    <tr>
                                        <td>
                                            <b>{r.user.name}</b>
                                            <span>{r.user.email}</span>
                                            {r.user.phone && (
                                                <span>{r.user.phone}</span>
                                            )}
                                            <small title={r.order_number}>
                                                {r.order_number}
                                            </small>
                                        </td>
                                        <td>
                                            <b>
                                                {new Date(
                                                    r.starts_at,
                                                ).toLocaleString("es-MX", {
                                                    dateStyle: "medium",
                                                    timeStyle: "short",
                                                    timeZone: r.quote.timezone,
                                                })}
                                            </b>
                                            <span>{r.guests} invitados</span><ExtrasSummary items={r.quote?.extras || []}/>
                                        </td>
                                        <td>
                                            <b>{money(r.total)}</b>
                                            <span>
                                                Anticipo acordado:{" "}
                                                {money(r.deposit)}
                                            </span>
                                        </td>
                                        <td>
                                            <b className="received">
                                                Recibido: {money(r.paid_total)}
                                            </b>
                                            <span>
                                                Restante: {money(r.balance_due)}
                                            </span>
                                            <small>
                                                {r.payment_status === "paid"
                                                    ? "Liquidado"
                                                    : r.payment_status ===
                                                        "partial"
                                                      ? "Pago parcial"
                                                      : "Sin pagos registrados"}
                                            </small>
                                        </td>
                                        <td>
                                            {r.payment_attention && (
                                                <p className="error">
                                                    {r.payment_attention}
                                                </p>
                                            )}
                                            <span className="status">
                                                {r.status === "confirmed"
                                                    ? "Confirmada"
                                                    : r.status === "hold"
                                                      ? hold
                                                          ? "Apartado temporal"
                                                          : "Apartado vencido"
                                                      : r.status === "cancelled"
                                                        ? "Cancelada"
                                                        : r.status}
                                            </span>
                                            {r.balance_due > 0 &&
                                                ["hold", "confirmed"].includes(
                                                    r.status,
                                                ) && (
                                                    <button
                                                        className="outline"
                                                        onClick={() => {
                                                            setSelected(r);
                                                            setKey(
                                                                crypto.randomUUID(),
                                                            );
                                                            setError("");
                                                        }}
                                                    >
                                                        Registrar pago recibido
                                                    </button>
                                                )}
                                        </td>
                                    </tr>
                                    {r.payments?.length > 0 && (
                                        <tr className="payment-history">
                                            <td colSpan={5}>
                                                <details>
                                                    <summary>
                                                        Ver {r.payments.length}{" "}
                                                        movimiento(s)
                                                        registrado(s)
                                                    </summary>
                                                    {r.payments.map(
                                                        (p: any) => (
                                                            <p key={p.id}>
                                                                {new Date(
                                                                    p.created_at,
                                                                ).toLocaleString(
                                                                    "es-MX",
                                                                )}{" "}
                                                                ·{" "}
                                                                {money(
                                                                    p.amount,
                                                                )}{" "}
                                                                ·{" "}
                                                                {
                                                                    (
                                                                        {
                                                                            cash: "Efectivo",
                                                                            transfer:
                                                                                "Transferencia",
                                                                            external:
                                                                                "Otro medio externo",
                                                                        } as Record<
                                                                            string,
                                                                            string
                                                                        >
                                                                    )[p.method]
                                                                }
                                                                {p.reference
                                                                    ? " · Ref. " +
                                                                      p.reference
                                                                    : ""}
                                                            </p>
                                                        ),
                                                    )}
                                                </details>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
                {!visible.length && (
                    <div className="empty">
                        <CalendarDays size={32} />
                        <h3>No hay reservaciones que mostrar.</h3>
                        <p>
                            Las órdenes aparecerán cuando un cliente aparte una
                            fecha.
                        </p>
                    </div>
                )}
            </div>
            {selected && (
                <div className="modal-backdrop">
                    <section
                        className="modal"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Registrar pago recibido"
                    >
                        <button
                            className="close"
                            onClick={() => setSelected(null)}
                            aria-label="Cerrar"
                        >
                            <X />
                        </button>
                        <span className="eyebrow">REGISTRO ADMINISTRATIVO</span>
                        <h2>Pago recibido.</h2>
                        <p>
                            {selected.user.name} · Saldo{" "}
                            {money(selected.balance_due)}
                        </p>
                        <div className="notice">
                            Registra únicamente dinero que ya recibiste. Esta
                            acción no cobra tarjetas ni llama a una pasarela. El
                            primer pago debe cubrir el anticipo y confirmar que
                            el horario sigue disponible.
                        </div>
                        <form onSubmit={record}>
                            <label>
                                Importe recibido (MXN)
                                <NumericInput
                                    name="amount"
                                    type="number"
                                    required
                                    min="0.01"
                                    max={selected.balance_due / 100}
                                    step="0.01"
                                    placeholder={`Ej. ${(selected.paid_total ? selected.balance_due : selected.deposit) / 100}`}
                                />
                            </label>
                            <label>
                                Medio de pago
                                <select name="method">
                                    <option value="cash">Efectivo</option>
                                    <option value="transfer">
                                        Transferencia
                                    </option>
                                    <option value="external">
                                        Otro medio externo
                                    </option>
                                </select>
                            </label>
                            <label>
                                Referencia <small>Opcional</small>
                                <input
                                    name="reference"
                                    maxLength={150}
                                    placeholder="Ej. referencia bancaria o recibo"
                                />
                            </label>
                            <label className="toggle">
                                <input type="checkbox" required />
                                Confirmo que este pago ya fue recibido.
                            </label>
                            {error && (
                                <div className="error" role="alert">
                                    {error}
                                </div>
                            )}
                            <button className="primary" disabled={saving}>
                                {saving
                                    ? "Registrando…"
                                    : "Guardar pago recibido"}
                                <Check size={16} />
                            </button>
                        </form>
                    </section>
                </div>
            )}
        </>
    );
}
export function MediaManager({
    venue,
    onChange,
}: {
    venue: Venue;
    onChange: (venue: Venue) => void;
}) {
    const [error, setError] = useState(""),
        [ok, setOk] = useState(""),
        [busy, setBusy] = useState(false),
        [connected, setConnected] = useState(false),
        [items, setItems] = useState<any[]>([]),
        [photos, setPhotos] = useState<string[]>([]),
        [comments, setComments] = useState<string[]>([]),
        [pendingDelete, setPendingDelete] = useState<number|null>(null);
    useEffect(() => {
        if (venue.id)
            api(`/owner/venues/${venue.slug}/instagram`)
                .then((d) => setConnected(d.connected))
                .catch((e) => setError(e.message));
        setPendingDelete(null);
        setItems([]);
        setPhotos([]);
        setComments([]);
    }, [venue.id]);
    async function refresh() {
        const all = await api("/owner/venues");
        const v = all.find((x: Venue) => x.id === venue.id);
        if (v) onChange(v);
    }
    async function action(task: () => Promise<any>, message: string) {
        setError("");
        setOk("");
        setBusy(true);
        try {
            await task();
            await refresh();
            setOk(message);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(false);
        }
    }
    const toggle = (id: string, values: string[], set: (x: string[]) => void) =>
        set(
            values.includes(id)
                ? values.filter((x) => x !== id)
                : [...values, id],
        );
    if (!venue.id)
        return (
            <div className="notice">
                Guarda primero el nombre del local como borrador para cargar sus
                fotografías y comentarios. No necesitas publicarlo todavía.
            </div>
        );
    return (
        <div className="media-manager">
            <span className="eyebrow">PRESENTACIÓN DEL ESTABLECIMIENTO</span>
            <h2>Que el lugar hable por sí mismo.</h2>
            <p className="muted">
                Elige una portada, agrega fotos y publica comentarios con su
                fuente. No se generan opiniones ni puntuaciones ficticias.
            </p>
            {error && (
                <div className="error" role="alert">
                    {error}
                </div>
            )}
            {ok && <div className="success">{ok}</div>}
            <form
                className="upload-form"
                onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const fd = new FormData(form);
                    action(async () => {
                        await api(
                            `/owner/venues/${venue.slug}/photos`,
                            "POST",
                            fd,
                        );
                        form.reset();
                    }, "Foto cargada. Ya puedes elegirla como portada.");
                }}
            >
                <label>
                    Subir fotografía propia
                    <input
                        name="photo"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        required
                    />
                    <small>
                        JPG, PNG o WebP · hasta 5 MB · máximo 30 fotos
                    </small>
                </label>
                <label>
                    Descripción de la fotografía <small>Opcional</small>
                    <input
                        name="caption"
                        maxLength={500}
                        placeholder="Ej. área de mesas y jardín"
                    />
                </label>
                <button className="primary" disabled={busy}>
                    Subir fotografía <ImagePlus size={16} />
                </button>
            </form>
            <div className="owner-photo-grid">
                {venue.photos?.map((p: any) => (
                    <article key={p.id}>
                        <img
                            loading="lazy"
                            src={p.image_url}
                            alt={p.caption || venue.name}
                        />
                        <p>{p.caption || "Sin descripción"}</p>
                        <small>
                            {p.source === "instagram"
                                ? "Instagram · @" +
                                  (p.author || "cuenta autorizada")
                                : "Fotografía cargada por el dueño"}
                        </small>
                        <div>
                            <button
                                type="button"
                                className="outline"
                                disabled={busy || p.cover}
                                onClick={() =>
                                    action(
                                        () =>
                                            api(
                                                `/owner/venues/${venue.slug}/photos/${p.id}`,
                                                "PATCH",
                                                { cover: true, visible: true },
                                            ),
                                        "Portada actualizada.",
                                    )
                                }
                            >
                                {p.cover ? "Portada" : "Usar de portada"}
                            </button>
                            <button
                                type="button"
                                className="outline"
                                disabled={busy}
                                onClick={() =>
                                    action(
                                        () =>
                                            api(
                                                `/owner/venues/${venue.slug}/photos/${p.id}`,
                                                "PATCH",
                                                { visible: !p.visible },
                                            ),
                                        "Visibilidad actualizada.",
                                    )
                                }
                            >
                                {p.visible ? "Ocultar" : "Publicar foto"}
                            </button>
                            <button type="button" className="danger-action" disabled={busy} onClick={()=>setPendingDelete(p.id)}><Trash2 size={16} aria-hidden="true"/>Eliminar imagen</button>
                        </div>
                        {pendingDelete===p.id&&<div className="photo-delete-confirm" role="alert">
                            <p>¿Eliminar esta imagen definitivamente?{p.cover?" Otra fotografía publicada se usará como portada.":""}</p>
                            <div><button type="button" className="outline" disabled={busy} onClick={()=>setPendingDelete(null)}>Conservar imagen</button>
                            <button type="button" className="danger-action" disabled={busy} onClick={()=>action(async()=>{await api(`/owner/venues/${venue.slug}/photos/${p.id}`,"DELETE");setPendingDelete(null);},"Imagen eliminada.")}>Sí, eliminar imagen</button></div>
                        </div>}
                    </article>
                ))}
            </div>
            <p className="notice">Puedes activar la portada con carrusel automático en Diseño y vista previa → Imágenes de portada. El carrusel usa únicamente fotografías publicadas.</p>
            <section className="social-import">
                <h3>Importar de Instagram profesional</h3>
                <p className="muted">
                    Conexión manual mediante API oficial. Necesitas una cuenta
                    profesional, su identificador y un token autorizado de Meta.
                    No basta con pegar el enlace público de un perfil.
                </p>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.currentTarget;
                        const f = new FormData(form);
                        action(async () => {
                            await api(
                                `/owner/venues/${venue.slug}/instagram`,
                                "POST",
                                {
                                    account_id: f.get("account_id"),
                                    token: f.get("token"),
                                },
                            );
                            setConnected(true);
                            form.reset();
                        }, "Conexión guardada. Consulta las publicaciones para comprobar el acceso.");
                    }}
                >
                    <div className="fields">
                        <label>
                            ID de la cuenta profesional
                            <input
                                name="account_id"
                                required
                                pattern="[0-9]{5,30}"
                                placeholder="Identificador numérico de Instagram"
                            />
                        </label>
                        <label>
                            Token de acceso autorizado
                            <input
                                name="token"
                                type="password"
                                required
                                autoComplete="new-password"
                                placeholder="Token de la API de Meta"
                            />
                        </label>
                    </div>
                    <button className="outline" disabled={busy}>
                        Guardar conexión cifrada
                    </button>
                </form>
                {connected && (
                    <div className="social-actions">
                        <button
                            className="outline"
                            disabled={busy}
                            onClick={() =>
                                action(async () => {
                                    const d = await api(
                                        `/owner/venues/${venue.slug}/instagram/preview?comments=1`,
                                    );
                                    setItems(d.items);
                                    setPhotos([]);
                                    setComments([]);
                                    if (d.warnings.length)
                                        setError(d.warnings.join(" "));
                                }, "Publicaciones consultadas. Selecciona lo que quieras importar.")
                            }
                        >
                            Consultar fotos y comentarios
                        </button>
                        <button
                            className="text-button"
                            disabled={busy}
                            onClick={() =>
                                action(async () => {
                                    await api(
                                        `/owner/venues/${venue.slug}/instagram`,
                                        "DELETE",
                                    );
                                    setConnected(false);
                                    setPendingDelete(null);
        setItems([]);
                                }, "Conexión eliminada. Las publicaciones ya importadas permanecen ocultables desde este panel.")
                            }
                        >
                            Desconectar cuenta
                        </button>
                    </div>
                )}
                <div className="social-candidates">
                    {items.map((item) => (
                        <article key={item.id}>
                            <img
                                src={item.url}
                                alt={item.caption || "Publicación de Instagram"}
                            />
                            <label className="toggle">
                                <input
                                    type="checkbox"
                                    checked={photos.includes(item.id)}
                                    onChange={() =>
                                        toggle(item.id, photos, setPhotos)
                                    }
                                />
                                Importar fotografía
                            </label>
                            <p>{item.caption}</p>
                            {item.comments.map((c: any) => (
                                <label className="toggle" key={c.id}>
                                    <input
                                        type="checkbox"
                                        checked={comments.includes(c.id)}
                                        onChange={() =>
                                            toggle(c.id, comments, setComments)
                                        }
                                    />
                                    <span>
                                        @{c.author}: {c.body}
                                    </span>
                                </label>
                            ))}
                        </article>
                    ))}
                </div>
                {items.length > 0 && (
                    <button
                        className="primary"
                        disabled={busy || (!photos.length && !comments.length)}
                        onClick={() =>
                            action(
                                () =>
                                    api(
                                        `/owner/venues/${venue.slug}/instagram/import`,
                                        "POST",
                                        { photos, comments },
                                    ),
                                "Selección importada como borrador. Revisa y publica cada elemento.",
                            )
                        }
                    >
                        Importar selección como borrador
                    </button>
                )}
            </section>
            <section>
                <h3>Comentarios destacados</h3>
                <p className="muted">
                    Los comentarios importados se publican solo cuando tú los
                    apruebas. No se muestran como reservas verificadas.
                </p>
                <div className="moderation-list">
                    {venue.reviews?.map((r: any) => (
                        <article key={r.id}>
                            <b>{r.author}</b>
                            <p>{r.body}</p>
                            <small>
                                {r.source === "instagram"
                                    ? "Importado de Instagram"
                                    : "Seleccionado manualmente por el dueño"}
                            </small>
                            {r.source_url && (
                                <a
                                    href={r.source_url}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Ver fuente
                                </a>
                            )}
                            <button
                                className="outline"
                                disabled={busy}
                                onClick={() =>
                                    action(
                                        () =>
                                            api(
                                                `/owner/venues/${venue.slug}/reviews/${r.id}`,
                                                "PATCH",
                                                { visible: !r.visible },
                                            ),
                                        "Comentario actualizado.",
                                    )
                                }
                            >
                                {r.visible
                                    ? "Ocultar comentario"
                                    : "Publicar comentario"}
                            </button>
                        </article>
                    ))}
                </div>
                <details>
                    <summary>Agregar comentario con fuente manualmente</summary>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            const form = e.currentTarget;
                            const f = new FormData(form);
                            action(async () => {
                                await api(
                                    `/owner/venues/${venue.slug}/reviews`,
                                    "POST",
                                    Object.fromEntries(f),
                                );
                                form.reset();
                            }, "Comentario guardado como borrador. Revisa su fuente antes de publicarlo.");
                        }}
                    >
                        <label>
                            Autor
                            <input
                                name="author"
                                required
                                maxLength={150}
                                placeholder="Nombre tal como aparece en la fuente"
                            />
                        </label>
                        <label>
                            Comentario
                            <textarea
                                name="body"
                                required
                                maxLength={2000}
                                placeholder="Texto real del comentario, con autorización para mostrarlo"
                            />
                        </label>
                        <label>
                            Enlace de la fuente
                            <input
                                name="source_url"
                                type="url"
                                placeholder="https://…"
                            />
                        </label>
                        <button className="outline" disabled={busy}>
                            Guardar comentario como borrador
                        </button>
                    </form>
                </details>
            </section>
        </div>
    );
}
