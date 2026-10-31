import {PasswordRecovery} from "./PasswordRecovery";
import React, { useEffect, useState, useRef } from "react";
import { ArrowRight, X } from "lucide-react";
import { api, ApiError } from "./api";
type User = { id: number; name: string; email: string; phone?: string };
export function AuthModal({
    owner = false,
    allowOwnerSignup = false,
    onClose,
    onDone,
}: {
    owner?: boolean;
    allowOwnerSignup?:boolean;
    onClose: () => void;
    onDone: (u: User) => void;
}) {
    const invitation = owner
        ? new URLSearchParams(location.search).get("invitacion")
        : null;
    const [register, setRegister] = useState(!!invitation),
        [error, setError] = useState(""),
        [saving, setSaving] = useState(false),
        [until, setUntil] = useState(0),
        [seconds, setSeconds] = useState(0);
    const [recovery,setRecovery]=useState(new URLSearchParams(location.search || location.hash.slice(1)).has("restablecer"));
    const pending = useRef(false);
    const [invalid, setInvalid] = useState<Record<string, string[]>>({});
    const formRef = useRef<HTMLFormElement>(null);
    useEffect(() => {
        if (!until) return;
        const tick = () => {
            const left = Math.max(0, Math.ceil((until - Date.now()) / 1000));
            setSeconds(left); if (!left) window.clearInterval(timer);
        };
        const timer = window.setInterval(tick, 1000); tick();
        return () => window.clearInterval(timer);
    }, [until]);
    async function send(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (pending.current || Date.now() < until) return;
        pending.current = true;
        setSaving(true);
        setError("");
        setInvalid({});
        const f = new FormData(e.currentTarget);
        try {
            const d = await api(
                owner
                    ? register
                        ? "/owner-auth/register"
                        : "/owner-auth/login"
                    : register
                      ? "/register"
                      : "/login",
                "POST",
                { ...Object.fromEntries(f), ...(owner ? { invitation } : {}) },
            );
            onDone(d.user);
        } catch (e) {
            setError((e as Error).message);
            if (e instanceof ApiError && e.status === 422) {
                setInvalid(e.fields);
                const first = Object.keys(e.fields)[0];
                const input = first && formRef.current?.elements.namedItem(first);
                if (input instanceof HTMLInputElement) input.focus();
            }
            if (e instanceof ApiError && e.status === 429 && e.retryAfter) {
                setSeconds(e.retryAfter); setUntil(Date.now() + e.retryAfter * 1000);
            }
        } finally {
            pending.current = false;
            setSaving(false);
        }
    }
    if(recovery)return <PasswordRecovery owner={owner} onClose={onClose} onBack={()=>setRecovery(false)}/>;
    return (
        <div className="modal-backdrop">
            <section
                className="modal"
                role="dialog"
                aria-modal="true"
                aria-label="Acceder a Encuentro"
            >
                <button className="close" onClick={onClose} aria-label="Cerrar">
                    <X />
                </button>
                <span className="eyebrow">
                    {owner
                        ? "ACCESO PRIVADO · PROPIETARIOS"
                        : "TU PRÓXIMO ENCUENTRO"}
                </span>
                <h2>
                    {owner
                        ? register
                            ? "Crea tu cuenta de propietario."
                            : "Acceso de propietarios."
                        : register
                          ? "Crea tu cuenta."
                          : "Bienvenido de nuevo."}
                </h2>
                <p>
                    {register
                        ? "Nombre, correo y contraseña. El teléfono es opcional."
                        : owner
                          ? "Accede con tu cuenta exclusiva de propietario."
                          : "Inicia sesión para consultar y pagar tus reservas."}
                </p>
                <form ref={formRef} onSubmit={send}>
                    {register && (
                        <label>
                            Nombre
                            <input
                                name="name"
                                required
                                minLength={2}
                                maxLength={100}
                                autoComplete="name"
                            />
                        </label>
                    )}
                    <label>
                        Correo
                        <input
                            name="email"
                            aria-invalid={!!invalid.email}
                            aria-describedby={invalid.email ? "auth-error" : undefined}
                            type="email"
                            required
                            autoComplete="email"
                        />
                    </label>
                    <label>
                        Contraseña
                        <input
                            name="password"
                            aria-invalid={!!invalid.password}
                            aria-describedby={invalid.password ? "auth-error" : undefined}
                            type="password"
                            required
                            minLength={register ? (owner ? 12 : 10) : 1}
                            autoComplete={
                                register ? "new-password" : "current-password"
                            }
                        />
                        {register && (
                            <small>
                                Al menos {owner ? 12 : 10} caracteres, con
                                letras y números.
                            </small>
                        )}
                    </label>
                    {register && (
                        <>
                            <label>
                                Confirmar contraseña
                                <input
                                    name="password_confirmation"
                                    type="password"
                                    required
                                    autoComplete="new-password"
                                />
                            </label>
                            {!owner && (
                                <label>
                                    Teléfono <small>Opcional</small>
                                    <input
                                        name="phone"
                                        type="tel"
                                        maxLength={30}
                                        autoComplete="tel"
                                    />
                                </label>
                            )}
                        </>
                    )}
                    {error && (
                        <div id="auth-error" className="error" role="alert">
                            {error}
                        </div>
                    )}
                    <button className="primary" disabled={saving || seconds > 0}>
                        {seconds > 0 ? `Reintentar en ${seconds} s` : saving
                            ? "Un momento…"
                            : register
                              ? "Crear cuenta"
                              : "Entrar"}{" "}
                        <ArrowRight size={16} />
                    </button>
                </form>
                {(!owner||!!invitation||allowOwnerSignup)&&
                    <button
                        className="text-button"
                        disabled={saving || seconds > 0}
                        onClick={() => {
                            setRegister(!register);
                            setInvalid({});
                            setError("");
                        }}
                    >
                        {register ? "Ya tengo cuenta" : "Crear mi cuenta"}
                    </button>
                }
                {!register&&<button type="button" className="text-button" disabled={saving} onClick={()=>setRecovery(true)}>Olvidé mi contraseña</button>}
                {owner && (
                    <p className="muted">
                        El acceso es exclusivo para propietarios. Si no tienes cuenta, solicita una invitación al administrador.
                    </p>
                )}
            </section>
        </div>
    );
}
