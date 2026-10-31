import React, { useEffect, useState } from "react";
import { api, type Venue } from "./api";
import { useLive } from "./Live";
const labels: Record<string, string> = {
    pending: "Pendiente",
    blocked: "Falta configurar correo",
    sending: "Enviando · verificar si persiste",
    sent: "Aceptado por el proveedor",
    failed: "Rechazado · revisa configuración",
    unknown: "Envío incierto · revisa el proveedor",
    needs_review: "Reserva en revisión",
};
export function MailSettings({ venue }: { venue: Venue }) {
    const [provider, setProvider] = useState("resend"),
        [enabled, setEnabled] = useState(false),
        [from, setFrom] = useState(""),
        [name, setName] = useState(""),
        [reply, setReply] = useState(""),
        [credentials, setCredentials] = useState<any>({}),
        [configured, setConfigured] = useState<string[]>([]),
        [hosts, setHosts] = useState<string[]>([]),
        [rows, setRows] = useState<any[]>([]),
        [notice, setNotice] = useState(""),
        [busy, setBusy] = useState(false),
        [page, setPage] = useState(1),
        [last, setLast] = useState(1);
    async function history() {
        const d = await api(
            `/owner/venues/${venue.slug}/mail/history?page=${page}`,
        );
        setRows(d.data);
        setLast(d.last_page);
    }
    async function load() {
        try {
            const d = await api(`/owner/venues/${venue.slug}/mail`);
            setHosts(d.smtp_hosts);
            const a = d.account;
            if (a) {
                setProvider(a.provider);
                setEnabled(a.enabled);
                setFrom(a.from_email);
                setName(a.from_name);
                setReply(a.reply_to || "");
                setConfigured(a.configured);
                setCredentials(a.smtp || {});
            }
            await history();
        } catch (e) {
            setNotice((e as Error).message);
        }
    }
    useEffect(() => {
        if (venue.id) load();
    }, [venue.id]);
    useEffect(() => {
        if (venue.id) history().catch((e) => setNotice(e.message));
    }, [page]);
    useLive(
        `/owner/venues/${venue.slug}/mail/history?page=${page}`,
        !!venue.id,
        (d) => {
            setRows(d.data);
            setLast(d.last_page);
        },
        undefined,
    );
    const set = (k: string, v: any) =>
        setCredentials((c: any) => ({ ...c, [k]: v }));
    async function save(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        try {
            await api(`/owner/venues/${venue.slug}/mail`, "PUT", {
                provider,
                enabled,
                from_email: from,
                from_name: name,
                reply_to: reply || null,
                credentials,
            });
            await load();
            setNotice(
                "Configuración guardada. El remitente y su dominio deben estar autorizados en tu proveedor.",
            );
        } catch (e) {
            setNotice((e as Error).message);
        } finally {
            setBusy(false);
        }
    }
    if (!venue.id)
        return (
            <p className="empty">
                Guarda primero el establecimiento para configurar sus correos.
            </p>
        );
    return (
        <section className="mail-settings">
            <span className="eyebrow">CORREOS TRANSACCIONALES</span>
            <h2>La confirmación, en su correo.</h2>
            <p className="notice">
                El correo se genera cuando se verifica el pago y se confirma la
                reserva. Una ficha OXXO o un checkout pendiente no generan
                confirmación. El estado “Aceptado” no garantiza llegada a la
                bandeja de entrada.
            </p>
            <form onSubmit={save}>
                <div className="fields">
                    <label>
                        Proveedor
                        <select
                            value={provider}
                            onChange={(e) => {
                                setProvider(e.target.value);
                                setCredentials({});
                                setConfigured([]);
                            }}
                        >
                            <option value="resend">Resend</option>
                            <option value="postmark">Postmark</option>
                            <option value="smtp">SMTP · otros servicios</option>
                        </select>
                    </label>
                    <label className="toggle control-check">
                        <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => setEnabled(e.target.checked)}
                        />{" "}
                        Habilitar confirmaciones de pago
                    </label>
                    <label>
                        Nombre del remitente
                        <input
                            required
                            maxLength={100}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej. Jardín Magnolia"
                        />
                    </label>
                    <label>
                        Correo del remitente
                        <input
                            required
                            type="email"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            placeholder="reservas@tu-dominio.com"
                        />
                    </label>
                    <label>
                        Responder a · opcional
                        <input
                            type="email"
                            value={reply}
                            onChange={(e) => setReply(e.target.value)}
                            placeholder="contacto@tu-dominio.com"
                        />
                    </label>
                    {provider === "smtp" ? (
                        <>
                            <label>
                                Servidor SMTP
                                <select
                                    value={credentials.host || ""}
                                    onChange={(e) =>
                                        set("host", e.target.value)
                                    }
                                >
                                    <option value="">
                                        Selecciona un servidor autorizado
                                    </option>
                                    {hosts.map((h) => (
                                        <option key={h} value={h}>
                                            {h}
                                        </option>
                                    ))}
                                </select>
                                <small>
                                    El administrador del servidor puede
                                    autorizar otros hosts.
                                </small>
                            </label>
                            <label>
                                Puerto TLS
                                <select
                                    value={credentials.port ?? ""}
                                    onChange={(e) =>
                                        set(
                                            "port",
                                            e.target.value === ""
                                                ? null
                                                : Number(e.target.value),
                                        )
                                    }
                                >
                                    <option value="">
                                        Selecciona un puerto
                                    </option>
                                    <option value="587">587 · STARTTLS</option>
                                    <option value="465">465 · TLS</option>
                                </select>
                                <small>587 con STARTTLS o 465 con TLS.</small>
                            </label>
                            <label>
                                Usuario SMTP
                                <input
                                    value={credentials.username || ""}
                                    onChange={(e) =>
                                        set("username", e.target.value)
                                    }
                                    autoComplete="off"
                                />
                            </label>
                            <label>
                                Contraseña SMTP
                                <input
                                    type="password"
                                    autoComplete="new-password"
                                    value={credentials.password || ""}
                                    onChange={(e) =>
                                        set("password", e.target.value)
                                    }
                                    placeholder={
                                        configured.includes("password")
                                            ? "Guardada · deja vacío para conservar"
                                            : "Contraseña del servicio"
                                    }
                                />
                            </label>
                        </>
                    ) : (
                        <label>
                            {provider === "postmark"
                                ? "Server API Token"
                                : "API Key"}
                            <input
                                type="password"
                                autoComplete="new-password"
                                value={credentials.api_key || ""}
                                onChange={(e) => set("api_key", e.target.value)}
                                placeholder={
                                    configured.includes("api_key")
                                        ? "Guardada · deja vacío para conservar"
                                        : "Credencial del proveedor"
                                }
                            />
                        </label>
                    )}
                </div>
                <button className="primary" disabled={busy}>
                    Guardar servicio de correo
                </button>
            </form>
            <p role="status">{notice}</p>
            <div className="preview-toolbar">
                <h3>Confirmaciones de este establecimiento</h3>
                <button
                    className="outline"
                    onClick={() => history().catch((e) => setNotice(e.message))}
                >
                    Actualizar estados
                </button>
            </div>
            {rows.length === 0 && (
                <p>No hay confirmaciones pendientes ni enviadas.</p>
            )}
            {rows.map((n) => (
                <article className="notice" key={n.id}>
                    <div>
                        <strong>{n.order}</strong>
                        <p>
                            {n.recipient} · {labels[n.status] || n.status}
                        </p>
                        {n.error && <p>{n.error}</p>}
                        {["failed", "blocked"].includes(n.status) && (
                            <button
                                className="text-button"
                                onClick={async () => {
                                    try {
                                        await api(
                                            `/owner/venues/${venue.slug}/mail/retry/${n.id}`,
                                            "POST",
                                        );
                                        await history();
                                    } catch (e) {
                                        setNotice((e as Error).message);
                                    }
                                }}
                            >
                                Volver a poner en cola
                            </button>
                        )}
                    </div>
                </article>
            ))}
            <div className="pagination">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    Anterior
                </button>
                <span>
                    {page}/{last}
                </span>
                <button
                    disabled={page >= last}
                    onClick={() => setPage(page + 1)}
                >
                    Siguiente
                </button>
            </div>
        </section>
    );
}
