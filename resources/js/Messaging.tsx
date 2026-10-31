import React, { useEffect, useState } from "react";
import { api, type Venue } from "./api";
const states: Record<string, string> = {
    pending: "Pendiente de respuesta",
    received: "Recibido",
    sent: "Enviado",
    stored: "Guardado",
    outside_window: "Fuera del plazo de respuesta",
    quota: "Límite diario alcanzado",
    handled: "Atendido",
    unknown: "Verifica el envío en Meta",
    needs_review: "Requiere revisión",
    processing: "Procesando",
    sending: "Enviando",
};
const names: Record<string, string> = {
    whatsapp: "WhatsApp Business",
    instagram: "Instagram",
    facebook: "Facebook Messenger",
    web: "Web",
};
export function MessagingSettings({ venue }: { venue: Venue }) {
    const [connections, setConnections] = useState<any[]>([]),
        [channel, setChannel] = useState("whatsapp"),
        [form, setForm] = useState<any>({}),
        [threads, setThreads] = useState<any[]>([]),
        [selected, setSelected] = useState<any>(null),
        [messages, setMessages] = useState<any[]>([]),
        [notice, setNotice] = useState(""),
        [busy, setBusy] = useState(false),
        [page, setPage] = useState(1),
        [last, setLast] = useState(1);
    const load = async () => {
        if (!venue.id) return;
        try {
            setConnections(await api(`/owner/venues/${venue.slug}/messaging`));
            const d = await api(
                `/owner/venues/${venue.slug}/inbox?page=${page}`,
            );
            setThreads(d.data);
            setLast(d.last_page);
        } catch (e) {
            setNotice((e as Error).message);
        }
    };
    useEffect(() => {
        load();
        setSelected(null);
        setMessages([]);
    }, [venue.id, page]);
    useEffect(() => {
        const c = connections.find((x) => x.channel === channel);
        setForm({
            account_id: c?.account_id || "",
            enabled: c?.enabled || false,
            auto_reply: c?.auto_reply || false,
            access_token: "",
            app_secret: "",
            verify_token: "",
            version: c?.version || "v26.0",
        });
    }, [channel, connections]);
    const change = (k: string, v: any) =>
        setForm((f: any) => ({ ...f, [k]: v }));
    async function save(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        try {
            await api(
                `/owner/venues/${venue.slug}/messaging/${channel}`,
                "PUT",
                form,
            );
            await load();
            setNotice(
                "Configuración guardada. Registra el webhook en Meta y comprueba sus permisos.",
            );
        } catch (e) {
            setNotice((e as Error).message);
        } finally {
            setBusy(false);
        }
    }
    async function open(t: any) {
        setSelected(t);
        try {
            const d = await api(`/owner/venues/${venue.slug}/inbox/${t.id}`);
            setMessages(d.data.reverse());
        } catch (e) {
            setNotice((e as Error).message);
        }
    }
    const current = connections.find((x) => x.channel === channel);
    if (!venue.id)
        return (
            <p className="empty">
                Guarda primero el establecimiento para conectar sus canales.
            </p>
        );
    return (
        <section className="messaging-settings">
            <span className="eyebrow">CONVERSACIONES Y CANALES</span>
            <h2>Una conversación que continúa.</h2>
            <p>
                Conecta cuentas de tu negocio. Se reciben mensajes nuevos desde
                la conexión; el cliente puede vincular sus canales con un código
                desde el chatbot web.
            </p>
            <form onSubmit={save}>
                <div className="fields">
                    <label>
                        Canal
                        <select
                            value={channel}
                            onChange={(e) => setChannel(e.target.value)}
                        >
                            {["whatsapp", "instagram", "facebook"].map((k) => (
                                <option key={k} value={k}>
                                    {names[k]}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        {channel === "whatsapp"
                            ? "ID del número de teléfono"
                            : channel === "instagram"
                              ? "ID de cuenta profesional (Instagram Login)"
                              : "ID de página de Facebook"}
                        <input
                            required
                            inputMode="numeric"
                            value={form.account_id || ""}
                            onChange={(e) =>
                                change("account_id", e.target.value)
                            }
                            placeholder="Identificador numérico de Meta"
                        />
                    </label>
                    <label>
                        Versión Graph API
                        <input
                            required
                            value={form.version || "v26.0"}
                            onChange={(e) => change("version", e.target.value)}
                        />
                    </label>
                    {[
                        ["access_token", "Token de acceso"],
                        ["app_secret", "Secreto de aplicación"],
                        ["verify_token", "Token de verificación del webhook"],
                    ].map(([k, label]) => (
                        <label key={k}>
                            {label}
                            <input
                                type="password"
                                autoComplete="new-password"
                                value={form[k] || ""}
                                onChange={(e) => change(k, e.target.value)}
                                placeholder={
                                    current?.configured?.includes(k)
                                        ? "Guardado · deja vacío para conservar"
                                        : "Configura tu credencial"
                                }
                            />
                        </label>
                    ))}
                    <label className="toggle control-check">
                        <input
                            type="checkbox"
                            checked={!!form.enabled}
                            onChange={(e) =>
                                change("enabled", e.target.checked)
                            }
                        />{" "}
                        Habilitar recepción
                    </label>
                    <label className="toggle control-check">
                        <input
                            type="checkbox"
                            checked={!!form.auto_reply}
                            onChange={(e) =>
                                change("auto_reply", e.target.checked)
                            }
                        />{" "}
                        Responder automáticamente con el asistente del local
                    </label>
                </div>
                <button className="primary" disabled={busy}>
                    Guardar canal
                </button>
            </form>
            {current && (
                <p className="notice">
                    Webhook público:{" "}
                    <code className="break-url">{current.webhook_url}</code>
                </p>
            )}
            <p className="muted">
                WhatsApp: Cloud API. Instagram: cuenta profesional con Instagram
                Login. Facebook: página con Messenger. Las respuestas
                automáticas usan una ventana de 24 horas y un máximo de 30
                respuestas por conversación al día. Necesitas permisos aprobados
                y HTTPS.
            </p>
            <p role="status">{notice}</p>
            <hr />
            <div className="preview-toolbar">
                <h3>Bandeja de conversaciones</h3>
                <button className="outline" onClick={load}>
                    Actualizar
                </button>
            </div>
            <div className="inbox-layout">
                <div>
                    {threads.length === 0 && <p>Aún no hay conversaciones.</p>}
                    {threads.map((t) => (
                        <button
                            key={t.id}
                            className={
                                "inbox-thread " +
                                (selected?.id === t.id ? "active" : "")
                            }
                            onClick={() => open(t)}
                        >
                            <strong>{names[t.channel]}</strong>
                            <span>
                                Contacto{" "}
                                {t.external_id.startsWith("g:")
                                    ? "visitante"
                                    : t.external_id}
                            </span>
                            <small>
                                {t.paused
                                    ? "Asistente pausado"
                                    : "Asistente disponible"}
                            </small>
                        </button>
                    ))}
                    <div className="pagination">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(page - 1)}
                        >
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
                </div>
                <div className="inbox-messages">
                    {selected && (
                        <>
                            <button
                                className="outline"
                                onClick={async () => {
                                    try {
                                        await api(
                                            `/owner/venues/${venue.slug}/inbox/${selected.id}`,
                                            "PATCH",
                                            { paused: !selected.paused },
                                        );
                                        const next = {
                                            ...selected,
                                            paused: !selected.paused,
                                        };
                                        setSelected(next);
                                        await load();
                                    } catch (e) {
                                        setNotice((e as Error).message);
                                    }
                                }}
                            >
                                {selected.paused
                                    ? "Reanudar asistente"
                                    : "Pausar asistente"}
                            </button>
                            <p className="muted">
                                Últimos 60 mensajes del contacto y sus canales
                                vinculados. Para atención manual, responde desde
                                la aplicación de la red social.
                            </p>
                            {messages.map((m) => (
                                <article
                                    key={m.id}
                                    className={"inbox-bubble " + m.direction}
                                >
                                    <small>
                                        {names[m.channel]} ·{" "}
                                        {m.direction === "in"
                                            ? "Cliente"
                                            : "Asistente"}{" "}
                                        · {states[m.status] || m.status}
                                    </small>
                                    <p>{m.body}</p>
                                </article>
                            ))}
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}
export function LinkChannels({
    venue,
    onRefresh,
}: {
    venue: Venue;
    onRefresh: () => void;
}) {
    const [text, setText] = useState("");
    return (
        <details className="channel-link">
            <summary>Continuar desde WhatsApp, Instagram o Facebook</summary>
            <p>
                Vincula únicamente tus propios canales. Su historial se
                compartirá con tu cuenta y el negocio.
            </p>
            <button
                className="outline"
                onClick={async () => {
                    try {
                        const d = await api(
                            `/venues/${venue.slug}/conversation-link`,
                            "POST",
                        );
                        setText(d.instruction);
                    } catch (e) {
                        setText((e as Error).message);
                    }
                }}
            >
                Generar código de vinculación
            </button>
            {text && (
                <p className="break-url" role="status">
                    {text}
                </p>
            )}
            <button className="text-button" onClick={onRefresh}>
                Actualizar conversación vinculada
            </button>
        </details>
    );
}
