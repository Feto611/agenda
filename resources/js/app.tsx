import {readReservationSelection,reservationDestination} from "./ReservationTransfer";
import {SiteIdentity} from "./SiteIdentity";
import {EmailVerification} from "./EmailVerification";
import {PolicyAcceptance,reservationPolicy} from "./ReservationPolicy";
import {CancelBookingDialog} from "./ConfirmAction";
import {PageIdentityLink,PlatformBrandingEditor,PlatformMeta,BrandWordmark,defaultPlatformBrand} from "./PlatformBranding";
import { PortalFailure } from "./PortalFailure";
import { pagePortalKind, loadPortalIdentity, loadCatalogueForPortal } from "./PortalBootstrap";
import { InventoryEditor, ExtrasPicker, ExtrasSummary, wifiPayload, type ExtraChoice } from "./Inventory";
import React, { useEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
    Palette as PaletteIcon,
    ImagePlus,
    Leaf,
    ArrowRight,
    ArrowUpRight,
    CalendarDays,
    MapPin,
    MessageCircle,
    Users,
    Clock,
    ShieldCheck,
    ChevronLeft,
    ChevronRight,
    Plus,
    Check,
    X,
    LogOut,
    Building2,
    Wallet,
    SlidersHorizontal,
    Link as LinkIcon,
} from "lucide-react";
import { api, money, hour, type Venue } from "./api";
import MapPicker from "./MapPicker";
import {
    Catalogue,
    VenueImage,
    PublicGallery,
    OwnerAgenda,
    MediaManager,
} from "./Experience";
import { GatewaySettings, CheckoutButton, PaymentReturn } from "./Payments";
import { PortalNavigation } from "./PortalNavigation";
import { DesignEditor, Theme, VenueBrand } from "./Design";
import { MessagingSettings, LinkChannels } from "./Messaging";
import { NumericInput, OperatingHours } from "./FormInputs";
import { useLive } from "./Live";
import { configureRealtime, disconnectRealtime } from "./Realtime";
import { ConnectionIndicator } from "./RealtimeStatus";
import { AuthModal } from "./AuthModal";
import { MailSettings } from "./MailSettings";
import "../css/app.css";
const EmailDesignEditor=React.lazy(()=>import("./EmailDesignEditor").then(m=>({default:m.EmailDesignEditor})));
type User = { id: number; name: string; email: string; phone?: string; email_verified_at?:string|null; platform_admin?:boolean };
type MapConfig = { tiles: string; attribution: string };
function App() {
    const expectedPortal=useRef(pagePortalKind());
    const [path, setPath] = useState(location.pathname),
        [user, setUser] = useState<User | null>(null),
        [venues, setVenues] = useState<Venue[]>([]),
        [platformBrand,setPlatformBrand]=useState<any>(defaultPlatformBrand),
        [ready, setReady] = useState(false),
        [identityReady,setIdentityReady]=useState(false),
        [bootstrapError,setBootstrapError]=useState(false),
        [error, setError] = useState(""),
        [map, setMap] = useState<MapConfig>({
            tiles: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            attribution: "© OpenStreetMap contributors",
        }),
        [auth, setAuth] = useState(new URLSearchParams(location.search || location.hash.slice(1)).has("restablecer")),
        [portal, setPortal] = useState<any>({
            kind: expectedPortal.current,
            customer_url: "",
            owner_path: null,
        });
    const navigate = (p: string) => {
        history.pushState({}, "", p);
        setPath(p);
        window.scrollTo(0, 0);
        setError("");
    };
    async function load() {
        let sessionLoaded=false;
        try {
            const me=await loadPortalIdentity(expectedPortal.current);
            sessionLoaded=true;
            setPortal(me.portal);
            setUser(me.user);
            setMap(me.map);
            setIdentityReady(true);
            setBootstrapError(false);
            configureRealtime(me.realtime,me.user,me.portal.kind);
            if(me.portal.kind==="owner"&&new URLSearchParams(location.search).has("invitacion")&&!me.user)setAuth(true);
            const vs=await loadCatalogueForPortal(me.portal.kind);
            setVenues(vs);
        } catch(e) {
            setError((e as Error).message);
            // An identity failure has no safe default portal.
            // Private venue failures are handled exclusively inside Owner.
            if(!sessionLoaded) {
                setIdentityReady(false);
                setAuth(false);
                setBootstrapError(true);
                disconnectRealtime();
            }
        } finally {setReady(true);}
    }
    useEffect(() => {
        load();
        const listener = () => setPath(location.pathname);
        window.addEventListener("popstate", listener);
        return () => window.removeEventListener("popstate", listener);
    }, []);
    useLive("/venues", ready && identityReady && !bootstrapError && portal.kind === "client", setVenues);
    useLive("/platform-branding",identityReady&&!bootstrapError,setPlatformBrand,undefined,"catalogue");
    const requireUser = () => {
        if (!user) {
            setAuth(true);
            return false;
        }
        return true;
    };
    if(bootstrapError)return <PortalFailure owner={expectedPortal.current==="owner"} error={error} onRetry={()=>{setReady(false);setError("");load();}}/>;
    return (
        <>
            <PlatformMeta brand={platformBrand}/>
            <header className="header">
                <button className="brand" onClick={() => navigate("/")}>
                    <BrandWordmark name={platformBrand.name} logo={platformBrand.logo_url}/>
                </button>
                {portal.kind && <PortalNavigation
                    owner={portal.kind === "owner"}
                    path={path}
                    navigate={navigate}
                    reservations={() => {
                        if (requireUser()) navigate("/account");
                    }}
                />}

                <div className="user-nav">
                    {ready && identityReady && <ConnectionIndicator owner={portal.kind==="owner"}/>}
                    {user ? (
                        <>
                            <PageIdentityLink owner={portal.kind==="owner"} admin={!!user.platform_admin} onOpen={()=>navigate("/gestion/identidad")}/>
                            <span>{user.name.split(" ")[0]}</span>
                            <button
                                aria-label="Cerrar sesión"
                                onClick={async () => {
                                    try {
                                        await api(
                                            portal.kind === "owner"
                                                ? "/owner-auth/logout"
                                                : "/logout",
                                            "POST",
                                        );
                                        disconnectRealtime();
                                        setUser(null);
                                        navigate("/");
                                    } catch (e) {
                                        setError((e as Error).message);
                                    }
                                }}
                            >
                                <LogOut size={17} />
                            </button>
                        </>
                    ) : identityReady ? (
                        <button
                            className="outline"
                            onClick={() => setAuth(true)}
                        >
                            {portal.kind === "owner"
                                ? "Acceso de propietarios"
                                : "Ingresar / Registrarme"}{" "}
                            <ArrowUpRight size={15} />
                        </button>
                    ) : null}
                </div>
            </header>
            {error && (
                <div role="alert" className="global-error">
                    {error}
                    <button onClick={() => setError("")}>
                        <X size={15} />
                    </button>
                </div>
            )}
            {ready&&identityReady&&<EmailVerification user={user} owner={portal.kind==="owner"} onVerified={()=>{api("/me").then(d=>setUser(d.user)).catch(e=>setError(e.message));}}/>}
            {!ready ? (
                <main>
                    <div className="empty">
                        Preparando tu próximo encuentro…
                    </div>
                </main>
            ) : portal.kind === "owner" && path === "/gestion/identidad" && user?.platform_admin ? (
                <main className="page-identity-main"><button type="button" className="outline" onClick={()=>navigate("/gestion")}><ChevronLeft size={16}/>Volver a Gestión del negocio</button><PlatformBrandingEditor onSaved={()=>{api("/platform-branding").then(setPlatformBrand).catch(e=>setError(e.message));}}/></main>
            ) : portal.kind === "owner" ? (
                <Owner
                    user={user}
                    map={map}
                    onLogin={() => setAuth(true)}
                    onSaved={() => {load();api("/platform-branding").then(setPlatformBrand).catch(e=>setError(e.message));}}
                    navigate={(p) => {
                        if (p.startsWith("/local/"))
                            window.open(
                                portal.customer_url + p,
                                "_blank",
                                "noopener,noreferrer",
                            );
                        else navigate("/gestion");
                    }}
                />
            ) : path.startsWith("/pago/") ? (
                user ? (
                    <PaymentReturn
                        id={path.split("/")[2]}
                        navigate={navigate}
                    />
                ) : (
                    <main>
                        <div className="empty">
                            <h2>Consulta el estado de tu pago.</h2>
                            <button
                                className="primary"
                                onClick={() => setAuth(true)}
                            >
                                Iniciar sesión
                            </button>
                        </div>
                    </main>
                )
            ) : path === "/account" ? (
                user ? (
                    <Account navigate={navigate} />
                ) : (
                    <main>
                        <div className="empty">
                            <h1>Tu agenda, en un solo lugar.</h1>
                            <button
                                className="primary"
                                onClick={() => setAuth(true)}
                            >
                                Iniciar sesión
                            </button>
                        </div>
                    </main>
                )
            ) : path.startsWith("/local/") ? (
                <PublicVenue
                    slug={decodeURIComponent(path.split("/")[2] || "")}
                    user={user}
                    onLogin={() => setAuth(true)}
                    map={map}
                    platformName={platformBrand.name}
                    navigate={navigate}
                />
            ) : (
                <Catalogue venues={venues} navigate={navigate} branding={platformBrand} />
            )}
            {ready && portal.kind === "client" && !path.startsWith("/local/") && venues.some(v => v.design?.show_chat !== false) && (
                <AssistantDock
                    venues={venues.filter(v => v.design?.show_chat !== false)}
                    user={user}
                    onLogin={() => setAuth(true)}
                />
            )}
            <footer className="footer">
                <button className="brand" onClick={() => navigate("/")}>
                    <BrandWordmark name={platformBrand.name} logo={platformBrand.logo_url}/>
                </button>
                <span>{platformBrand.tagline}</span>
                {platformBrand.support_email&&<a href={"mailto:"+platformBrand.support_email}>Contacto</a>}
                <small>Reservas y pagos en MXN</small>
            </footer>
            {auth && (
                <AuthModal
                    owner={portal.kind === "owner"}
                    allowOwnerSignup={!!portal.owner_signup}
                    onClose={() => setAuth(false)}
                    onDone={(u) => {
                        setUser(u);
                        setAuth(false);
                        load();
                    }}
                />
            )}
        </>
    );
}
function AssistantDock({
    venues,
    user,
    onLogin,
}: {
    venues: Venue[];
    user: User | null;
    onLogin: () => void;
}) {
    const [open, setOpen] = useState(false),
        [slug, setSlug] = useState(venues[0]?.slug || "");
    const venue = venues.find((v) => v.slug === slug) || venues[0];
    return (
        <>
            {open && (
                <div className="assistant-select">
                    <label>
                        ¿Sobre qué establecimiento quieres preguntar?
                        <select
                            value={venue.slug}
                            onChange={(e) => setSlug(e.target.value)}
                        >
                            {venues.map((v) => (
                                <option key={v.id} value={v.slug}>
                                    {v.name}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
            )}
            {open && (
                <Chat
                    key={venue.id}
                    venue={venue}
                    user={user}
                    onLogin={onLogin}
                    onClose={() => setOpen(false)}
                />
            )}
            <button
                className="chat-launch visible-chat"
                onClick={() => setOpen(!open)}
                aria-label="Abrir asistente de establecimientos"
            >
                <MessageCircle size={22} />
                <span>Asistente · Pregunta por un local</span>
            </button>
        </>
    );
}
function Owner({
    user,
    map,
    onLogin,
    onSaved,
    navigate,
}: {
    user: User | null;
    map: MapConfig;
    onLogin: () => void;
    onSaved: () => void;
    navigate: (p: string) => void;
}) {
    const [venues, setVenues] = useState<Venue[]>([]),
        [v, setV] = useState<Venue | null>(null),
        [tab, setTab] = useState("general"),
        [error, setError] = useState(""),
        [ok, setOk] = useState(""),
        [saving, setSaving] = useState(false),
        [aiKey, setAiKey] = useState(""),
        [clearKey, setClearKey] = useState(false),
        [reservations, setReservations] = useState<any[]>([]),
        [page, setPage] = useState(1),
        [lastPage, setLastPage] = useState(1),
        [geo, setGeo] = useState<any[]>([]),
        [searching, setSearching] = useState(false),
        [lastAddress, setLastAddress] = useState("");
    const geoRequest = useRef(0);
    const s = v?.settings;
    async function load() {
        if (!user) return;
        setError("");
        try {
            const vs = await api("/owner/venues");
            setVenues(vs);
            if (vs.length) {
                setV(vs[0]);
                setTab("bookings");
                setLastAddress(vs[0].settings.address);
            } else await fresh();
        } catch (e) {
            setError((e as Error).message);
        }
    }
    async function fresh() {
        try {
            const defaults = await api("/owner/defaults");
            setV({ name: "", slug: "", published: false, settings: defaults });
            setAiKey("");
            setClearKey(false);
            setLastAddress("");
            setTab("general");
            setError("");
            setOk("");
        } catch (e) {
            setError((e as Error).message);
        }
    }
    useEffect(() => {
        load();
    }, [user?.id]);
    useEffect(() => {
        if (tab === "bookings" && v?.id)
            api(`/owner/venues/${v.slug}/bookings?page=${page}`)
                .then((d) => {
                    setReservations(d.data);
                    setLastPage(d.last_page);
                })
                .catch((e) => setError(e.message));
    }, [tab, v?.id, page]);
    useLive(
        `/owner/venues/${v?.slug}/bookings?page=${page}`,
        !!user && tab === "bookings" && !!v?.id,
        (d) => {
            setReservations(d.data);
            setLastPage(d.last_page);
        },
        undefined,
    );
    function set(field: string, value: any) {
        setV((current) =>
            current
                ? {
                      ...current,
                      settings: { ...current.settings, [field]: value },
                  }
                : current,
        );
        setOk("");
    }
    function setAI(field: string, value: any) {
        set("ai", { ...s.ai, [field]: value });
    }
    useEffect(() => {
        if (tab !== "location") return;
        const request = ++geoRequest.current;
        setGeo([]);
        setSearching(false);
        const address = (s?.address || "").trim();
        if (address.length < 5 || address === lastAddress) return;
        const timer = setTimeout(() => {
            void search(true, request, address);
        }, 500);
        return () => {
            clearTimeout(timer);
            geoRequest.current++;
        };
    }, [s?.address, tab, v?.id]);
    async function search(force = false, expected?: number, query?: string) {
        const address = query ?? s?.address?.trim();
        if (
            !address ||
            address.length < 5 ||
            (!force && address === lastAddress)
        )
            return;
        const request = expected ?? ++geoRequest.current;
        setSearching(true);
        setError("");
        try {
            const d = await api("/owner/geocode", "POST", { address });
            if (request !== geoRequest.current) return;
            setGeo(d.results);
            setLastAddress(address);
            if (d.results.length)
                setV((current) =>
                    current
                        ? {
                              ...current,
                              settings: {
                                  ...current.settings,
                                  lat: d.results[0].lat,
                                  lng: d.results[0].lng,
                              },
                          }
                        : current,
                );
            else
                setError(
                    "No encontramos esa dirección. Coloca el punto en el mapa.",
                );
        } catch (e) {
            if (request === geoRequest.current) setError((e as Error).message);
        } finally {
            if (request === geoRequest.current) setSearching(false);
        }
    }
    async function save(e: React.FormEvent) {
        e.preventDefault();
        if (!v) return;
        setSaving(true);
        setError("");
        setOk("");
        try {
            const saved = await api(
                "/owner/venues" + (v.id ? "/" + v.slug : ""),
                v.id ? "PUT" : "POST",
                { ...v, wifi:wifiPayload((v as any).wifi), ai_key: aiKey || undefined, clear_ai_key: clearKey },
            );
            setV(saved);
            setAiKey("");
            setClearKey(false);
            setOk(
                "Cambios guardados. La página del local ya utiliza estos datos.",
            );
            setVenues(await api("/owner/venues"));
            onSaved();
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setSaving(false);
        }
    }
    if (!user)
        return (
            <main>
                <div className="owner-intro">
                    <span className="eyebrow">PARA QUIENES CREAN MOMENTOS</span>
                    <h1>
                        Tu espacio.
                        <br />
                        <em>Tu manera de trabajar.</em>
                    </h1>
                    <p>
                        Configura el local una vez. Tu página, tarifas,
                        calendario y asistente se adaptan a sus datos.
                    </p>
                    <button className="primary" onClick={onLogin}>
                        Acceder a la administración <ArrowRight size={18} />
                    </button>
                </div>
            </main>
        );
    if (!v)
        return (
            <main>
                <div className="empty">
                    <h2>Gestión del negocio</h2>
                    <p>{error ? "No se pudieron cargar tus establecimientos." : "Cargando tu establecimiento…"}</p>
                    {error&&<><p className="error" role="alert">{error}</p><button type="button" className="primary" onClick={()=>load()}>Reintentar carga</button></>}
                </div>
            </main>
        );
    const tabs = [
        ["bookings", "Reservaciones y pagos", CalendarDays],
        ["general", "Datos del establecimiento", Building2],
        ["media", "Fotos y comentarios", ImagePlus],
        ["prices", "Tarifas y anticipo", Wallet],
        ["hours", "Horarios y reglas", Clock],
        ["location", "Ubicación y redes", MapPin],
        ["chat", "Asistente y API", MessageCircle],
        ["gateways", "Pasarelas de cobro", Wallet],
        ["mail", "Correos y notificaciones", MessageCircle],
        ["email-designs", "Diseños de correo", PaletteIcon],
        ["messaging", "Conversaciones y Meta", MessageCircle],
        ["design", "Diseño y vista previa", SlidersHorizontal],
    ] as const;
    return (
        <main className="owner-main">
            <div className="owner-top">
                <div>
                    <span className="eyebrow">GESTIÓN DEL NEGOCIO</span>
                    <h1>
                        Agenda y <em>operaciones.</em>
                    </h1>
                    <p>
                        Tu establecimiento, tu agenda y tus reglas, en un solo
                        lugar.
                    </p>
                </div>
                <button className="outline" onClick={fresh}>
                    <Plus size={16} />
                    Nuevo establecimiento
                </button>
            </div>
            <div className="owner-layout">
                <aside className="owner-sidebar">
                    <span className="eyebrow">TU ESPACIO</span>
                    <select
                        aria-label="Seleccionar establecimiento"
                        value={v.id ?? ""}
                        onChange={(e) => {
                            const venue = venues.find(
                                (x) => x.id === +e.target.value,
                            );
                            if (venue) {
                                setV(venue);
                                setAiKey("");
                                setClearKey(false);
                                setPage(1);
                                setLastAddress(venue.settings.address);
                                setOk("");
                                setError("");
                            }
                        }}
                    >
                        <option value="">Nuevo establecimiento</option>
                        {venues.map((x) => (
                            <option key={x.id} value={x.id}>
                                {x.name}
                            </option>
                        ))}
                    </select>
                    <nav>
                        {tabs.map(([id, title, Icon]) => (
                            <button
                                key={id}
                                className={tab === id ? "active" : ""}
                                onClick={() => {
                                    setTab(id);
                                    setError("");
                                    setOk("");
                                }}
                            >
                                <Icon size={17} />
                                {title}
                            </button>
                        ))}
                    </nav>
                    <div className="sidebar-note">
                        <ShieldCheck size={21} />
                        <p>
                            Solo tú puedes modificar tus establecimientos. Tus
                            clientes ven su página y sus propias reservas.
                        </p>
                    </div>
                    {v.id && (
                        <button
                            className="outline"
                            onClick={() => navigate("/local/" + v.slug)}
                            disabled={!v.published}
                        >
                            Ver página del local <ArrowUpRight size={14} />
                        </button>
                    )}
                </aside>
                <section className="owner-content">
                    {(v as any).credential_warnings?.length>0&&<div className="notice" role="alert"><ul>{(v as any).credential_warnings.map((warning:string)=><li key={warning}>{warning}</li>)}</ul></div>}
                    {error && (
                        <div className="error" role="alert">
                            {error}
                        </div>
                    )}
                    {ok && (
                        <div className="success" role="status">
                            <Check size={17} />
                            {ok}
                        </div>
                    )}
                    {tab === "bookings" ? (
                        <>
                            <div className="card-heading">
                                <h2>La agenda de tu local.</h2>
                                <span>Solo datos necesarios de contacto</span>
                            </div>
                            {!v.id ? (
                                <div className="empty">
                                    Guarda primero el establecimiento.
                                </div>
                            ) : (
                                <>
                                    <OwnerAgenda
                                        venue={v}
                                        rows={reservations}
                                        onRefresh={() =>
                                            api(
                                                `/owner/venues/${v.slug}/bookings?page=${page}`,
                                            ).then((d) => {
                                                setReservations(d.data);
                                                setLastPage(d.last_page);
                                            })
                                        }
                                    />
                                    <div className="pagination">
                                        <button
                                            disabled={page <= 1}
                                            onClick={() => setPage(page - 1)}
                                        >
                                            Anterior
                                        </button>
                                        <span>
                                            {page} / {lastPage}
                                        </span>
                                        <button
                                            disabled={page >= lastPage}
                                            onClick={() => setPage(page + 1)}
                                        >
                                            Siguiente
                                        </button>
                                    </div>
                                </>
                            )}
                        </>
                    ) : tab === "design" ? (
                        <DesignEditor
                            key={v.id}
                            venue={v}
                            renderPreview={(preview) => (
                                <PublicVenue
                                    slug={v.slug}
                                    user={null}
                                    onLogin={() => {}}
                                    map={map}
                                    navigate={() => {}}
                                    previewVenue={preview}
                                />
                            )}
                        />
                    ) : tab === "messaging" ? (
                        <MessagingSettings key={v.id} venue={v} />
                    ) : tab === "email-designs" ? (
                        <React.Suspense fallback={<p role="status">Cargando editor de correos…</p>}><EmailDesignEditor key={v.id} venue={v} platformAdmin={!!user.platform_admin}/></React.Suspense>
                    ) : tab === "mail" ? (
                        <MailSettings key={v.id} venue={v} />
                    ) : tab === "gateways" ? (
                        <GatewaySettings venue={v} />
                    ) : tab === "media" ? (
                        <MediaManager
                            venue={v}
                            onChange={(updated) => {
                                setV(updated);
                                onSaved();
                            }}
                        />
                    ) : (
                        <form key={v.id ?? "new"} onSubmit={save}>
                            {tab === "general" && (
                                <>
                                    <Section
                                        number="01"
                                        title="El lugar donde todo empieza."
                                        text="Estos datos dan forma a la página que verán tus clientes."
                                    />
                                    <div className="fields">
                                        <label>
                                            Nombre del establecimiento
                                            <input
                                                required
                                                value={v.name}
                                                maxLength={120}
                                                onChange={(e) => {
                                                    const name = e.target.value;
                                                    setV({
                                                        ...v,
                                                        name,
                                                        slug: v.id
                                                            ? v.slug
                                                            : name
                                                                  .toLowerCase()
                                                                  .normalize(
                                                                      "NFD",
                                                                  )
                                                                  .replace(
                                                                      /[\u0300-\u036f]/g,
                                                                      "",
                                                                  )
                                                                  .replace(
                                                                      /[^a-z0-9]+/g,
                                                                      "-",
                                                                  )
                                                                  .replace(
                                                                      /^-|-$/g,
                                                                      "",
                                                                  ),
                                                    });
                                                }}
                                                placeholder="Ej. Jardín Magnolia"
                                            />
                                        </label>
                                        <label>
                                            Dirección de tu página
                                            <input
                                                required
                                                value={v.slug}
                                                onChange={(e) =>
                                                    setV({
                                                        ...v,
                                                        slug: e.target.value,
                                                    })
                                                }
                                                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                                                placeholder="jardin-magnolia"
                                                disabled={!!v.id}
                                            />
                                            <small>
                                                /local/
                                                {v.slug || "tu-establecimiento"}
                                            </small>
                                        </label>
                                        <label className="span-2">
                                            Descripción
                                            <textarea
                                                value={s.description || ""}
                                                maxLength={3000}
                                                onChange={(e) =>
                                                    set(
                                                        "description",
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Cuéntales qué hace especial a tu espacio."
                                            />
                                        </label>
                                        <label>
                                            Forma de reserva
                                            <select
                                                value={s.mode}
                                                onChange={(e) =>
                                                    set("mode", e.target.value)
                                                }
                                            >
                                                <option value="day">
                                                    Evento · un grupo por día
                                                </option>
                                                <option value="hour">
                                                    Horario · varios grupos al
                                                    día
                                                </option>
                                            </select>
                                        </label>
                                        <label>
                                            Aforo máximo de personas
                                            <NumericInput
                                                type="number"
                                                min="1"
                                                max="100000"
                                                placeholder="Ej. 100"
                                                value={s.capacity ?? ""}
                                                onChange={(e) =>
                                                    set(
                                                        "capacity",
                                                        e.target.value === ""
                                                            ? null
                                                            : +e.target.value,
                                                    )
                                                }
                                            />
                                        </label>
                                    </div>
                                    <div className="notice">
                                        <Users size={18} />
                                        <p>
                                            El aforo indica cuántas personas
                                            admite el espacio. Cada reserva
                                            ocupa el recurso completo, sin
                                            compartirlo con otros grupos.
                                        </p>
                                    </div>
                                    <label className="toggle">
                                        <input
                                            type="checkbox"
                                            checked={v.published}
                                            onChange={(e) =>
                                                setV({
                                                    ...v,
                                                    published: e.target.checked,
                                                })
                                            }
                                        />
                                        <span>
                                            <b>
                                                Publicar página del
                                                establecimiento
                                            </b>
                                            <small>
                                                Solo se publica después de
                                                guardar una configuración
                                                completa.
                                            </small>
                                        </span>
                                    </label>
                                </>
                            )}
                            {tab === "prices" && (
                                <>
                                    <Section
                                        number="02"
                                        title="Precios claros. A tu manera."
                                        text="Tú eliges cada importe. Las sugerencias no se aplican hasta que las aceptes."
                                    />
                                    <div className="fields">
                                        {[
                                            [
                                                "weekday_price",
                                                "Renta entre semana",
                                            ],
                                            [
                                                "weekend_price",
                                                "Renta fin de semana",
                                            ],
                                            [
                                                "holiday_price",
                                                "Renta en día feriado / especial",
                                            ],
                                            [
                                                "extra_hour_price",
                                                "Precio por hora adicional",
                                            ],
                                        ].map(([key, title]) => (
                                            <label key={key}>
                                                {title}
                                                <div className="money-input">
                                                    <span>$</span>
                                                    <NumericInput
                                                        type="number"
                                                        min="0"
                                                        max="1000000"
                                                        step="0.01"
                                                        placeholder={
                                                            (
                                                                {
                                                                    weekday_price:
                                                                        "Ej. 6500",
                                                                    weekend_price:
                                                                        "Ej. 8500",
                                                                    holiday_price:
                                                                        "Ej. 10500",
                                                                    extra_hour_price:
                                                                        "Ej. 850",
                                                                } as Record<
                                                                    string,
                                                                    string
                                                                >
                                                            )[key]
                                                        }
                                                        value={
                                                            s[key] == null
                                                                ? ""
                                                                : s[key] / 100
                                                        }
                                                        onChange={(e) =>
                                                            set(
                                                                key,
                                                                e.target
                                                                    .value ===
                                                                    ""
                                                                    ? null
                                                                    : Math.round(
                                                                          +e
                                                                              .target
                                                                              .value *
                                                                              100,
                                                                      ),
                                                            )
                                                        }
                                                    />
                                                    <span>MXN</span>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                    <div className="suggestion">
                                        <div>
                                            <SlidersHorizontal size={20} />
                                            <div>
                                                <b>
                                                    Una referencia para la hora
                                                    extra
                                                </b>
                                                <p>
                                                    Renta base ÷ horas incluidas
                                                    × 1.25 ≈{" "}
                                                    <strong>
                                                        {money(
                                                            Math.round(
                                                                (s.weekday_price /
                                                                    Math.max(
                                                                        1,
                                                                        s.included_hours,
                                                                    )) *
                                                                    1.25,
                                                            ),
                                                        )}
                                                    </strong>
                                                    . Puedes elegir otro precio.
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            className="outline"
                                            disabled={
                                                s.weekday_price == null ||
                                                s.included_hours == null
                                            }
                                            onClick={() =>
                                                set(
                                                    "extra_hour_price",
                                                    Math.round(
                                                        (s.weekday_price /
                                                            Math.max(
                                                                1,
                                                                s.included_hours,
                                                            )) *
                                                            1.25,
                                                    ),
                                                )
                                            }
                                        >
                                            Usar sugerencia
                                        </button>
                                    </div>
                                    <h3 className="subheading">
                                        El primer paso: el anticipo
                                    </h3>
                                    <div className="fields">
                                        <label>
                                            Tipo de anticipo
                                            <select
                                                value={s.deposit_type}
                                                onChange={(e) => {
                                                    set(
                                                        "deposit_type",
                                                        e.target.value,
                                                    );
                                                    set("deposit_value", null);
                                                }}
                                            >
                                                <option value="percent">
                                                    Porcentaje del total
                                                </option>
                                                <option value="fixed">
                                                    Importe fijo
                                                </option>
                                            </select>
                                        </label>
                                        <label>
                                            {s.deposit_type === "percent"
                                                ? "Porcentaje (%)"
                                                : "Importe (MXN)"}
                                            <NumericInput
                                                type="number"
                                                min="0"
                                                max={
                                                    s.deposit_type === "percent"
                                                        ? 100
                                                        : 1000000
                                                }
                                                placeholder={
                                                    s.deposit_type === "percent"
                                                        ? "Ej. 30"
                                                        : "Ej. 1950"
                                                }
                                                value={
                                                    s.deposit_value == null
                                                        ? ""
                                                        : s.deposit_type ===
                                                            "percent"
                                                          ? s.deposit_value
                                                          : s.deposit_value /
                                                            100
                                                }
                                                step={
                                                    s.deposit_type === "percent"
                                                        ? 1
                                                        : 0.01
                                                }
                                                onChange={(e) =>
                                                    set(
                                                        "deposit_value",
                                                        e.target.value === ""
                                                            ? null
                                                            : Math.round(
                                                                  +e.target
                                                                      .value *
                                                                      (s.deposit_type ===
                                                                      "percent"
                                                                          ? 1
                                                                          : 100),
                                                              ),
                                                    )
                                                }
                                            />
                                        </label>
                                    </div>
                                    <button
                                        type="button"
                                        className="text-button"
                                        onClick={() => {
                                            set("deposit_type", "percent");
                                            set("deposit_value", 30);
                                        }}
                                    >
                                        Usar anticipo sugerido del 30%
                                    </button>
                                    <label className="block-label">
                                        Días feriados y fechas especiales
                                        <textarea
                                            key={v.id ?? "new"}
                                            defaultValue={s.holidays.join("\n")}
                                            onBlur={(e) =>
                                                set(
                                                    "holidays",
                                                    e.target.value
                                                        .split(/[,\n]/)
                                                        .map((x) => x.trim())
                                                        .filter(Boolean),
                                                )
                                            }
                                            placeholder={
                                                "2026-12-25\n2027-01-01"
                                            }
                                        />
                                        <small>
                                            Una fecha AAAA-MM-DD por línea. Las
                                            fechas especiales tienen prioridad
                                            sobre fin de semana y entre semana.
                                        </small>
                                    </label>
                                    <div className="notice">
                                        <Wallet size={18} />
                                        <p>
                                            Las tarifas se expresan{" "}
                                            {s.mode === "day"
                                                ? "por evento"
                                                : "por hora"}
                                            . El anticipo fijo nunca supera el
                                            total. Esta entrega guarda apartados
                                            temporales; los pagos se verifican
                                            con la pasarela habilitada por el
                                            negocio.
                                        </p>
                                    </div>
                                </>
                            )}
                            {tab === "general" && <InventoryEditor items={s.inventory || []} onChange={items=>set("inventory",items)} wifi={(v as any).wifi} onWifi={wifi=>setV({...v,wifi} as any)} />}
                            {tab === "hours" && (
                                <>
                                    <Section
                                        number="03"
                                        title="Cada momento tiene su tiempo."
                                        text="La agenda bloquea preparación, uso y entrega para evitar cruces."
                                    />
                                    <div className="fields">
                                        <OperatingHours
                                            key={v.id ?? "new"}
                                            settings={s}
                                            onChange={(patch) =>
                                                setV((current) =>
                                                    current
                                                        ? {
                                                              ...current,
                                                              settings: {
                                                                  ...current.settings,
                                                                  ...patch,
                                                              },
                                                          }
                                                        : current,
                                                )
                                            }
                                        />
                                        {[
                                            [
                                                "included_hours",
                                                "Horas incluidas de renta",
                                                1,
                                                24,
                                            ],
                                            [
                                                "prep_minutes",
                                                "Preparación antes del uso (min)",
                                                0,
                                                1440,
                                            ],
                                            [
                                                "clean_minutes",
                                                "Entrega y limpieza después (min)",
                                                0,
                                                1440,
                                            ],
                                        ].map(([key, title, min, max]) => (
                                            <label key={key}>
                                                {title}
                                                <NumericInput
                                                    type="number"
                                                    min={min}
                                                    max={max}
                                                    placeholder={
                                                        (
                                                            {
                                                                included_hours:
                                                                    "Ej. 8",
                                                                prep_minutes:
                                                                    "Ej. 0",
                                                                clean_minutes:
                                                                    "Ej. 120",
                                                            } as Record<
                                                                string,
                                                                string
                                                            >
                                                        )[String(key)]
                                                    }
                                                    value={s[key] ?? ""}
                                                    onChange={(e) =>
                                                        set(
                                                            String(key),
                                                            e.target.value ===
                                                                ""
                                                                ? null
                                                                : +e.target
                                                                      .value,
                                                        )
                                                    }
                                                />
                                            </label>
                                        ))}
                                        <label>
                                            Zona horaria
                                            <select
                                                value={s.timezone}
                                                onChange={(e) =>
                                                    set(
                                                        "timezone",
                                                        e.target.value,
                                                    )
                                                }
                                            >
                                                {[
                                                    "America/Mexico_City",
                                                    "America/Cancun",
                                                    "America/Tijuana",
                                                    "America/Hermosillo",
                                                    "America/Monterrey",
                                                    "America/Chihuahua",
                                                    "America/Mazatlan",
                                                    "UTC",
                                                ].map((z) => (
                                                    <option key={z}>{z}</option>
                                                ))}
                                            </select>
                                        </label>
                                    </div>
                                    <div className="notice">
                                        <Clock size={19} />
                                        <p>
                                            Escribe las horas como 09:30 o
                                            22:00. Si cierras después de
                                            medianoche, selecciona al día
                                            siguiente. La preparación y la
                                            limpieza deben caber dentro del
                                            horario.
                                        </p>
                                    </div>
                                    <h3 className="subheading">
                                        Días en que permanece cerrado
                                    </h3>
                                    <div className="week-pills">
                                        {[
                                            "Domingo",
                                            "Lunes",
                                            "Martes",
                                            "Miércoles",
                                            "Jueves",
                                            "Viernes",
                                            "Sábado",
                                        ].map((label, i) => (
                                            <label
                                                key={i}
                                                className={
                                                    s.closed_weekdays.includes(
                                                        i,
                                                    )
                                                        ? "checked"
                                                        : ""
                                                }
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={s.closed_weekdays.includes(
                                                        i,
                                                    )}
                                                    onChange={(e) =>
                                                        set(
                                                            "closed_weekdays",
                                                            e.target.checked
                                                                ? [
                                                                      ...s.closed_weekdays,
                                                                      i,
                                                                  ]
                                                                : s.closed_weekdays.filter(
                                                                      (
                                                                          d: number,
                                                                      ) =>
                                                                          d !==
                                                                          i,
                                                                  ),
                                                        )
                                                    }
                                                />
                                                {label}
                                            </label>
                                        ))}
                                    </div>
                                    <label className="block-label">
                                        Reglas y políticas del establecimiento
                                        <textarea
                                            value={s.rules || ""}
                                            maxLength={5000}
                                            onChange={(e) =>
                                                set("rules", e.target.value)
                                            }
                                            placeholder="Ruido, mascotas, mobiliario, limpieza, cancelaciones… Publica solo políticas que sí aplican."
                                        />
                                    </label>
                                </>
                            )}
                            {tab === "location" && (
                                <>
                                    <Section
                                        number="04"
                                        title="Que llegar sea la parte fácil."
                                        text="Escribe la dirección. Revisa el resultado y arrastra el punto a la entrada correcta."
                                    />
                                    <label className="block-label">
                                        Dirección del establecimiento
                                        <input
                                            required
                                            value={s.address ?? ""}
                                            onChange={(e) => {
                                                geoRequest.current++;
                                                setGeo([]);
                                                set("address", e.target.value);
                                            }}
                                            aria-autocomplete="list"
                                            aria-describedby="geocode-status"
                                            placeholder="Calle, número, colonia, ciudad y estado"
                                        />
                                    </label>
                                    <button
                                        type="button"
                                        className="outline"
                                        onClick={() => search(true)}
                                        disabled={searching}
                                    >
                                        {searching
                                            ? "Buscando dirección…"
                                            : "Buscar dirección en el mapa"}
                                        <MapPin size={15} />
                                    </button>
                                    <p id="geocode-status" role="status">
                                        {searching
                                            ? "Buscando coincidencias…"
                                            : geo.length
                                              ? `${geo.length} ubicaciones encontradas. Revisa y confirma el punto.`
                                              : "Escribe al menos 5 caracteres para buscar."}
                                    </p>
                                    {geo.length > 0 && (
                                        <label className="block-label">
                                            Resultados encontrados
                                            <select
                                                defaultValue=""
                                                onChange={(e) => {
                                                    geoRequest.current++;
                                                    const x =
                                                        geo[+e.target.value];
                                                    setLastAddress(x.label);
                                                    setSearching(false);
                                                    setV((v) =>
                                                        v
                                                            ? {
                                                                  ...v,
                                                                  settings: {
                                                                      ...v.settings,
                                                                      address:
                                                                          x.label,
                                                                      lat: x.lat,
                                                                      lng: x.lng,
                                                                  },
                                                              }
                                                            : v,
                                                    );
                                                }}
                                            >
                                                <option value="" disabled>
                                                    Selecciona la ubicación
                                                    correcta
                                                </option>
                                                {geo.map((x, i) => (
                                                    <option key={i} value={i}>
                                                        {x.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    )}
                                    <MapPicker
                                        lat={s.lat}
                                        lng={s.lng}
                                        onChange={(lat, lng) => {
                                            geoRequest.current++;
                                            setSearching(false);
                                            setV((v) =>
                                                v
                                                    ? {
                                                          ...v,
                                                          settings: {
                                                              ...v.settings,
                                                              lat,
                                                              lng,
                                                          },
                                                      }
                                                    : v,
                                            );
                                        }}
                                        {...map}
                                    />
                                    <div className="coordinates">
                                        <span>
                                            {s.lat === null
                                                ? "Coloca un punto para confirmar la ubicación."
                                                : `Punto confirmado: ${Number(s.lat).toFixed(6)}, ${Number(s.lng).toFixed(6)}`}
                                        </span>
                                        <span>
                                            Haz clic o arrastra el marcador
                                        </span>
                                    </div>
                                    <div className="fields">
                                        <label>
                                            Teléfono público{" "}
                                            <small>Opcional</small>
                                            <input
                                                value={s.contact_phone || ""}
                                                type="tel"
                                                maxLength={30}
                                                onChange={(e) =>
                                                    set(
                                                        "contact_phone",
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </label>
                                        <label>
                                            Instagram <small>Opcional</small>
                                            <input
                                                type="url"
                                                value={s.instagram || ""}
                                                onChange={(e) =>
                                                    set(
                                                        "instagram",
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="https://instagram.com/tu-local"
                                            />
                                        </label>
                                        <label>
                                            Facebook <small>Opcional</small>
                                            <input
                                                type="url"
                                                value={s.facebook || ""}
                                                onChange={(e) =>
                                                    set(
                                                        "facebook",
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="https://facebook.com/tu-local"
                                            />
                                        </label>
                                    </div>
                                </>
                            )}
                            {tab === "chat" && (
                                <>
                                    <Section
                                        number="05"
                                        title="Un asistente que conoce tu local."
                                        text="Responde con tus datos y reglas. Las credenciales se guardan cifradas en el servidor."
                                    />
                                    <div className="fields">
                                        <label>
                                            Proveedor / protocolo
                                            <select
                                                value={s.ai.provider}
                                                onChange={(e) => {
                                                    const provider =
                                                        e.target.value;
                                                    set("ai", {
                                                        ...s.ai,
                                                        provider,
                                                        endpoint:
                                                            provider ===
                                                            "openai"
                                                                ? "https://api.openai.com/v1"
                                                                : provider ===
                                                                    "anthropic"
                                                                  ? "https://api.anthropic.com/v1"
                                                                  : provider ===
                                                                      "ollama"
                                                                    ? "http://ollama:11434"
                                                                    : s.ai
                                                                          .endpoint,
                                                        model: "",
                                                    });
                                                }}
                                            >
                                                <option value="rules">
                                                    Reglas · sin API ni coste de
                                                    IA
                                                </option>
                                                <option value="openai">
                                                    OpenAI · Chat Completions
                                                </option>
                                                <option value="anthropic">
                                                    Claude · Messages API
                                                </option>
                                                <option value="ollama">
                                                    Ollama · Llama y otros
                                                    modelos
                                                </option>
                                                <option value="compatible">
                                                    Otra API compatible con
                                                    OpenAI
                                                </option>
                                            </select>
                                        </label>
                                        <label>
                                            Modelo
                                            <input
                                                value={s.ai.model || ""}
                                                maxLength={100}
                                                disabled={
                                                    s.ai.provider === "rules"
                                                }
                                                onChange={(e) =>
                                                    setAI(
                                                        "model",
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Identificador disponible en tu proveedor"
                                            />
                                        </label>
                                        <label className="span-2">
                                            URL base de la API
                                            <input
                                                type="url"
                                                value={s.ai.endpoint || ""}
                                                disabled={
                                                    s.ai.provider === "rules"
                                                }
                                                onChange={(e) =>
                                                    setAI(
                                                        "endpoint",
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                            <small>
                                                El administrador del servidor
                                                debe autorizar el dominio.
                                                Meta/Llama alojado puede
                                                utilizar un proveedor
                                                compatible; una app de chat no
                                                equivale a una API.
                                            </small>
                                        </label>
                                        <label className="span-2">
                                            Clave API
                                            <input
                                                type="password"
                                                value={aiKey}
                                                disabled={
                                                    s.ai.provider === "rules"
                                                }
                                                onChange={(e) =>
                                                    setAiKey(e.target.value)
                                                }
                                                autoComplete="new-password"
                                                placeholder={
                                                    v.has_ai_key
                                                        ? "Clave guardada. Deja vacío para conservarla."
                                                        : "Introduce tu clave; no se mostrará después."
                                                }
                                            />
                                        </label>
                                        {v.has_ai_key && (
                                            <label className="toggle span-2">
                                                <input
                                                    type="checkbox"
                                                    checked={clearKey}
                                                    onChange={(e) =>
                                                        setClearKey(
                                                            e.target.checked,
                                                        )
                                                    }
                                                />
                                                Eliminar clave guardada al
                                                guardar
                                            </label>
                                        )}
                                        {[
                                            [
                                                "temperature",
                                                "Temperatura",
                                                0,
                                                1,
                                                0.1,
                                            ],
                                            [
                                                "max_tokens",
                                                "Máximo de tokens de respuesta",
                                                100,
                                                1000,
                                                1,
                                            ],
                                            [
                                                "guest_messages",
                                                "Mensajes diarios de visitante",
                                                1,
                                                20,
                                                1,
                                            ],
                                            [
                                                "guest_conversations",
                                                "Conversaciones diarias de visitante",
                                                1,
                                                5,
                                                1,
                                            ],
                                            [
                                                "guest_tokens",
                                                "Presupuesto diario de tokens visitante",
                                                300,
                                                10000,
                                                1,
                                            ],
                                            [
                                                "member_messages",
                                                "Mensajes diarios con cuenta",
                                                1,
                                                200,
                                                1,
                                            ],
                                        ].map(
                                            ([key, title, min, max, step]) => (
                                                <label key={key}>
                                                    {title}
                                                    <NumericInput
                                                        type="number"
                                                        min={min}
                                                        max={max}
                                                        step={step}
                                                        value={s.ai[key]}
                                                        onChange={(e) =>
                                                            setAI(
                                                                String(key),
                                                                e.target
                                                                    .value ===
                                                                    ""
                                                                    ? null
                                                                    : +e.target
                                                                          .value,
                                                            )
                                                        }
                                                    />
                                                </label>
                                            ),
                                        )}
                                        <label className="span-2">
                                            Estilo del asistente{" "}
                                            <small>Opcional</small>
                                            <textarea
                                                value={s.ai.instructions || ""}
                                                maxLength={2000}
                                                onChange={(e) =>
                                                    setAI(
                                                        "instructions",
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Ej. Tono cordial, respuestas breves, trata de usted."
                                            />
                                        </label>
                                    </div>
                                    <div className="notice">
                                        <ShieldCheck size={19} />
                                        <p>
                                            Los temas ajenos al local se
                                            rechazan por reglas antes de llamar
                                            a una IA. El modelo recibe hechos
                                            seleccionados del establecimiento;
                                            no recibe las instrucciones del
                                            cliente. Si la API falla, el
                                            asistente responde con las reglas.
                                            El límite de visitante también se
                                            comprueba por IP y día.
                                        </p>
                                    </div>
                                </>
                            )}
                            <div className="save-bar">
                                <span>
                                    <ShieldCheck size={15} /> Los cambios solo
                                    se aplican al guardar
                                </span>
                                <button className="primary" disabled={saving}>
                                    {saving
                                        ? "Guardando…"
                                        : v.published
                                          ? "Guardar y publicar cambios"
                                          : "Guardar borrador"}
                                    <Check size={17} />
                                </button>
                            </div>
                        </form>
                    )}
                </section>
            </div>
        </main>
    );
}
function Section({
    number,
    title,
    text,
}: {
    number: string;
    title: string;
    text: string;
}) {
    return (
        <div className="form-title">
            <span className="eyebrow">CONFIGURACIÓN / {number}</span>
            <h2>{title}</h2>
            <p>{text}</p>
        </div>
    );
}
function PublicVenue({
    slug,
    user,
    onLogin,
    map,
    navigate,
    previewVenue,
    platformName="Encuentro",
    independent=false,
    reservationUrl,
}: {
    reservationUrl?:string;
    independent?:boolean;
    platformName?:string;
    previewVenue?: Venue;
    slug: string;
    user: User | null;
    onLogin: () => void;
    map: MapConfig;
    navigate: (p: string) => void;
}) {
    const [v, setV] = useState<Venue | null>(previewVenue ?? null),
        [error, setError] = useState(""),
        [month, setMonth] = useState(() => new Date()),
        [availability, setAvailability] = useState<any[]>([]),
        [date, setDate] = useState(""),
        [start, setStart] = useState(10),
        [hours, setHours] = useState<number | null>(8),
        [guests, setGuests] = useState<number | null>(1),
        [selectedExtras, setSelectedExtras] = useState<ExtraChoice[]>([]),
        [q, setQ] = useState<any>(null),
        [loading, setLoading] = useState(true),
        [saving, setSaving] = useState(false),
        [policyAccepted,setPolicyAccepted]=useState(false),
        [confirm, setConfirm] = useState(false),
        [chat, setChat] = useState(false),
        [liveNotice, setLiveNotice] = useState("");
    useEffect(()=>{setSelectedExtras([]);},[slug]);
    useLive(
        "/venues/" + slug,
        !previewVenue && !!v?.id,
        (next) => {
            if (next.revision !== v?.revision) {
                setV(next);
                setQ(null);
                setConfirm(false);
                setLiveNotice(
                    "El establecimiento actualizó sus datos o tarifas. Revisa la cotización vigente.",
                );
            }
        },
        (e) => {
            if (e.status === 404) {
                setV(null);
                setQ(null);
                setError("Este establecimiento ya no está publicado.");
            }
        },
        v?.id ? "venue." + v.id : undefined,
    );
    useEffect(() => {
        if (q?.available === false) setConfirm(false);
    }, [q?.available]);
    const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
    async function loadAvailability() {
        if (previewVenue) {
            setAvailability([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const d = await api(
                `/venues/${slug}/availability?month=${monthKey}`,
            );
            setAvailability(d.days);
            setError("");
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        if (previewVenue) {
            setV(previewVenue);
            setStart(previewVenue.settings.open_hour ?? 10);
            setHours(
                previewVenue.settings.mode === "day"
                    ? (previewVenue.settings.included_hours ?? 8)
                    : 1,
            );
            setLoading(false);
            return;
        }
        api("/venues/" + slug)
            .then((v) => {
                setV(v);
                setStart(
                    v.settings.open_hour +
                        ((v.settings.open_minute ?? 0) +
                            v.settings.prep_minutes) /
                            60,
                );
                setHours(
                    v.settings.mode === "day" ? v.settings.included_hours : 1,
                );
                if(!independent){const selection=readReservationSelection(location.hash);if(selection){setDate(selection.date);setMonth(new Date(selection.date+"T12:00:00"));setStart(selection.start);setHours(selection.hours);setGuests(selection.guests);setSelectedExtras(selection.extras);setPolicyAccepted(false);history.replaceState({},"",location.pathname+location.search);}}

            })
            .catch((e) => setError(e.message));
    }, [slug, previewVenue]);
    useLive(
        `/venues/${slug}/availability?month=${monthKey}`,
        !!v && !previewVenue,
        (d) => {
            setAvailability(d.days);
            setLoading(false);
        },
        (e) => {
            setError(e.message);
            setLoading(false);
        },
        v?.id ? "venue." + v.id : undefined,
    );
    useEffect(() => {
        const slots = availability.find((d) => d.date === date)?.slots;
        if (slots?.length && !slots.includes(start)) setStart(slots[0]);
    }, [availability, date]);
    useEffect(() => {
        let active = true;
        setQ(null);
        if (date && v && hours !== null && guests !== null && !previewVenue)
            api(`/venues/${slug}/quote`, "POST", { date, start, hours, guests, extras:selectedExtras })
                .then((d) => {
                    if (active) {
                        setQ(d);
                        setError("");
                    }
                })
                .catch((e) => {
                    if (active) setError(e.message);
                });
        return () => {
            active = false;
        };
    }, [date, start, hours, guests, selectedExtras, slug, v?.revision, availability]);
    if (!v)
        return (
            <main>
                <div className="empty">
                    {error || "Cargando el establecimiento…"}
                </div>
            </main>
        );
    const s = v.settings;
    const selected = availability.find((d) => d.date === date);
    const shift = (n: number) => {
        setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
        setDate("");
        setQ(null);
    };
    const first =
        (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
    async function reserve() {
        if (previewVenue || !policyAccepted || saving) return;
        setSaving(true);
        try {
            await api(`/venues/${slug}/bookings`, "POST", {
                date,
                start,
                hours,
                guests,
                extras: selectedExtras,
                policy_accepted:policyAccepted,
                expected_total: q.quote.total,
                expected_version: q.quote.settings_version,
            });
            setConfirm(false);
            navigate("/account");
        } catch (e) {
            setError((e as Error).message);
            setConfirm(false);
            loadAvailability();
        } finally {
            setSaving(false);
        }
    }
    return (
        <Theme design={v.design}>
            <main>
                <SiteIdentity venue={v} platformName={platformName} independent={independent}/><VenueBrand venue={v} />
                {liveNotice && (
                    <p className="notice" role="status">
                        {liveNotice}
                    </p>
                )}
                {previewVenue && (
                    <p className="notice">
                        Vista previa · calendario y pagos deshabilitados
                    </p>
                )}
                <div className="topline">
                    <span>
                        <i />{" "}
                        {v.design?.welcome || "UN ESPACIO PARA TUS MOMENTOS"}
                    </span>
                    <span>
                        {s.mode === "day"
                            ? "Renta por evento"
                            : "Renta por hora"}{" "}
                        · MXN
                    </span>
                </div>
                <section className="venue-hero">
                    <div>
                        <span className="eyebrow">
                            <MapPin size={13} />
                            {s.address}
                        </span>
                        <h1>
                            {v.name}
                            <span>.</span>
                        </h1>
                        <p>
                            {s.description ||
                                "Elige una fecha y empieza a planear tu próximo encuentro."}
                        </p>
                        <div className="hero-facts">
                            <span>
                                <Users size={16} /> Hasta {s.capacity} personas
                            </span>
                            <span>
                                <Clock size={16} />
                                {hour(
                                    s.open_hour + (s.open_minute ?? 0) / 60,
                                )}{" "}
                                —{" "}
                                {hour(
                                    s.close_hour + (s.close_minute ?? 0) / 60,
                                )}
                            </span>
                        </div>
                    </div>
                    <div className="venue-visual real-venue">
                        <VenueImage venue={v} controls />
                    </div>
                </section>
                <PublicGallery
                    venue={
                        v.design?.show_reviews === false
                            ? { ...v, reviews: [] }
                            : v
                    }
                />
                <div className="section-heading">
                    <div>
                        <span className="eyebrow">PLANEAMOS CONTIGO</span>
                        <h2>Tu próximo encuentro empieza aquí.</h2>
                    </div>
                    <span>01 Fecha · 02 Detalles · 03 Apartado</span>
                </div>
                {error && (
                    <div className="error" role="alert">
                        {error}
                    </div>
                )}
                <div className="reservation-layout">
                    <div>
                        <section className="card calendar-card">
                            <div className="card-heading">
                                <div>
                                    <h3>Elige una fecha</h3>
                                    <p>
                                        Los días sin horarios disponibles están
                                        deshabilitados.
                                    </p>
                                </div>
                                <CalendarDays size={23} />
                            </div>
                            <div className="calendar-toolbar">
                                <h3>
                                    {month.toLocaleDateString("es-MX", {
                                        month: "long",
                                        year: "numeric",
                                    })}
                                </h3>
                                <div>
                                    <button
                                        aria-label="Mes anterior"
                                        onClick={() => shift(-1)}
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <button
                                        aria-label="Mes siguiente"
                                        onClick={() => shift(1)}
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                            <div className="weekdays">
                                {[
                                    "LUN",
                                    "MAR",
                                    "MIÉ",
                                    "JUE",
                                    "VIE",
                                    "SÁB",
                                    "DOM",
                                ].map((d) => (
                                    <span key={d}>{d}</span>
                                ))}
                            </div>
                            <div className="calendar-grid">
                                {Array.from({ length: first }, (_, i) => (
                                    <span key={"b" + i} />
                                ))}
                                {availability.map((d) => (
                                    <button
                                        key={d.date}
                                        disabled={!d.available || loading}
                                        aria-pressed={date === d.date}
                                        className={
                                            date === d.date ? "chosen" : ""
                                        }
                                        onClick={() => {
                                            setDate(d.date);
                                            setStart(d.slots[0]);
                                        }}
                                    >
                                        <b>{+d.date.slice(-2)}</b>
                                        <small>
                                            {d.available
                                                ? "Disponible"
                                                : "Sin cupo"}
                                        </small>
                                    </button>
                                ))}
                            </div>
                            {loading && (
                                <p className="muted">
                                    Consultando disponibilidad…
                                </p>
                            )}
                            <div className="legend">
                                <span>
                                    <i />
                                    Disponible
                                </span>
                                <span>
                                    <i />
                                    Sin cupo
                                </span>
                                <span>
                                    <i />
                                    Tu selección
                                </span>
                            </div>
                        </section>
                        <section className="card details">
                            <div className="card-heading">
                                <div>
                                    <h3>Hazlo a tu medida</h3>
                                    <p>
                                        El tiempo de entrega también está
                                        considerado.
                                    </p>
                                </div>
                                <SlidersHorizontal size={21} />
                            </div>
                            <div className="fields three">
                                <label>
                                    Hora de inicio
                                    <select
                                        value={start}
                                        onChange={(e) =>
                                            setStart(+e.target.value)
                                        }
                                    >
                                        {(selected?.slots || [start]).map(
                                            (h: number) => (
                                                <option key={h} value={h}>
                                                    {hour(h)}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </label>
                                <label>
                                    Duración (horas)
                                    <NumericInput
                                        type="number"
                                        min={
                                            s.mode === "day"
                                                ? s.included_hours
                                                : 1
                                        }
                                        max={24}
                                        value={hours ?? ""}
                                        onChange={(e) =>
                                            setHours(
                                                e.target.value === ""
                                                    ? null
                                                    : +e.target.value,
                                            )
                                        }
                                    />
                                </label>
                                <label>
                                    Invitados
                                    <NumericInput
                                        type="number"
                                        min={1}
                                        max={s.capacity}
                                        value={guests ?? ""}
                                        onChange={(e) =>
                                            setGuests(
                                                e.target.value === ""
                                                    ? null
                                                    : +e.target.value,
                                            )
                                        }
                                    />
                                </label>
                            </div>
                            <ExtrasPicker items={s.inventory || []} selected={selectedExtras} onChange={setSelectedExtras} />
                            <small className="muted">
                                Preparación: {s.prep_minutes} min · Entrega y
                                limpieza: {s.clean_minutes} min
                            </small>
                        </section>
                        {q?.quote.extras?.length > 0 && <section className="card"><h3>Extras de tu reservación</h3><ExtrasSummary items={q.quote.extras}/><p>Extras: {money(q.quote.extras_total)}</p></section>}
                        <section className="card">
                            <h3>Nos encontramos aquí.</h3>
                            <p className="muted">{s.address}</p>
                            {v.design?.show_map !== false && <MapPicker lat={s.lat} lng={s.lng} {...map} />}
                            <div className="public-links">
                                <a
                                    target="_blank"
                                    rel="noreferrer"
                                    href={`https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`}
                                >
                                    Cómo llegar <ArrowUpRight size={14} />
                                </a>
                                {s.instagram && (
                                    <a
                                        href={s.instagram}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        Instagram
                                    </a>
                                )}
                                {s.facebook && (
                                    <a
                                        href={s.facebook}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        Facebook
                                    </a>
                                )}
                                {s.contact_phone && (
                                    <span>{s.contact_phone}</span>
                                )}
                            </div>
                        </section>
                        <section className="card reservation-policy"><h3>Cancelación y pagos</h3><p>{reservationPolicy}</p></section>
                        {s.rules && (
                            <section className="card">
                                <h3>Para disfrutar el espacio</h3>
                                <p className="rules-text">{s.rules}</p>
                            </section>
                        )}
                    </div>
                    <aside className="summary card">
                        <span className="eyebrow">TU PRÓXIMO GRAN MOMENTO</span>
                        <h2>Ya casi es tuyo.</h2>
                        <p className="muted">Tu evento, sin sorpresas.</p>
                        <div className="summary-location">
                            <Leaf size={25} />
                            <div>
                                <b>{v.name}</b>
                                <small>
                                    {date
                                        ? new Date(
                                              date + "T12:00:00",
                                          ).toLocaleDateString("es-MX", {
                                              dateStyle: "long",
                                          })
                                        : "Selecciona una fecha"}
                                </small>
                            </div>
                        </div>
                        <div className="summary-lines">
                            <span>Tarifa aplicada</span>
                            <b>
                                {q
                                    ? (
                                          {
                                              weekday: "Entre semana",
                                              weekend: "Fin de semana",
                                              holiday: "Fecha especial",
                                          } as Record<string, string>
                                      )[q.quote.rate_type]
                                    : "—"}
                            </b>
                            <span>Uso del espacio</span>
                            <b>
                                {q
                                    ? money((q.quote.base_total ?? q.quote.total) - q.quote.extra_cost)
                                    : "—"}
                            </b>
                            <span>Horas adicionales</span>
                            <b>{q ? money(q.quote.extra_cost) : "—"}</b>
                        </div>
                        <div className="total">
                            <span>Total</span>
                            <strong>{q ? money(q.quote.total) : "—"}</strong>
                        </div>
                        <div className="deposit">
                            <div>
                                <span>Anticipo</span>
                                <b>{q ? money(q.quote.deposit) : "—"}</b>
                            </div>
                            <small>
                                Saldo: {q ? money(q.quote.balance) : "—"}
                            </small>
                        </div>
                        <button
                            className="primary"
                            disabled={!q?.available || loading || saving}
                            onClick={() =>
                                independent&&reservationUrl&&date&&hours!==null&&guests!==null?window.location.assign(reservationDestination(reservationUrl,{date,start,hours,guests,extras:selectedExtras})):user ? setConfirm(true) : onLogin()
                            }
                        >
                            {v.design?.cta ||
                                (user
                                    ? "Apartar mi fecha"
                                    : "Entrar para apartar")}
                            <ArrowRight size={17} />
                        </button>
                        {q && !q.available && (
                            <p className="error">
                                Ese horario ya está ocupado.
                            </p>
                        )}
                        <p className="secure">
                            <ShieldCheck size={13} /> Apartado temporal · Paga
                            desde Mis reservas
                        </p>
                        <div className="notice compact">
                            <p>
                                El importe se valida otra vez al guardar. Este
                                apartado se confirma al verificar el pago del
                                anticipo.
                            </p>
                        </div>
                        {!independent && v.design?.show_chat !== false && <button
                            className="help-button"
                            onClick={() => setChat(true)}
                        >
                            <MessageCircle size={18} />
                            ¿Algo más en mente? Hablemos.
                        </button>}
                    </aside>
                </div>
                {!independent && v.design?.show_chat !== false && chat && (
                    <Chat
                        venue={v}
                        preview={!!previewVenue}
                        onClose={() => setChat(false)}
                        user={user}
                        onLogin={onLogin}
                    />
                )}
                {!independent && v.design?.show_chat !== false && <button
                    className="chat-launch"
                    aria-label="Abrir asistente del local"
                    onClick={() => setChat(!chat)}
                >
                    <MessageCircle size={23} />
                    <span>Asistente del local</span>
                </button>}
                {confirm && (
                    <div className="modal-backdrop">
                        <section
                            className="modal"
                            role="dialog"
                            aria-modal="true"
                            aria-label="Confirmar apartado"
                        >
                            <button
                                className="close"
                                onClick={() => setConfirm(false)}
                            >
                                <X />
                            </button>
                            <span className="eyebrow">EL PRIMER PASO</span>
                            <h2>Guarda tu fecha.</h2>
                            <p>
                                {v.name} · {date} · {hour(start)} · {hours}{" "}
                                horas
                            </p>
                            <div className="notice">
                                El apartado se guardará a nombre de {user?.name}
                                , con el correo {user?.email}. No necesitas
                                volver a escribir tus datos.
                            </div>
                            <p className="muted">
                                Total: {money(q?.quote.total || 0)}. Anticipo
                                previsto: {money(q?.quote.deposit || 0)}. Este
                                paso no realiza un cobro.
                            </p>
                            <PolicyAcceptance checked={policyAccepted} onChange={setPolicyAccepted}/>
                            <button
                                className="primary"
                                onClick={reserve}
                                disabled={saving || !policyAccepted}
                            >
                                {saving
                                    ? "Guardando…"
                                    : "Crear apartado de 15 minutos"}
                                <Check size={17} />
                            </button>
                        </section>
                    </div>
                )}
            </main>
        </Theme>
    );
}
function Chat({
    venue,
    onClose,
    user,
    onLogin,
    preview = false,
}: {
    preview?: boolean;
    venue: Venue;
    onClose: () => void;
    user: User | null;
    onLogin: () => void;
}) {
    const [messages, setMessages] = useState<
            { who: string; text: string; facts?: string }[]
        >([
            {
                who: "bot",
                text: `Hola, soy el asistente de ${venue.name}. Puedo ayudarte con sus tarifas, horarios, ubicación y reglas.`,
            },
        ]),
        [text, setText] = useState(""),
        [busy, setBusy] = useState(false),
        [error, setError] = useState(""),
        [remaining, setRemaining] = useState<number | null>(null);
    const [conversation] = useState(() => {
        const key = "chat:" + venue.id;
        let id = sessionStorage.getItem(key);
        if (!id) {
            id = crypto.randomUUID();
            sessionStorage.setItem(key, id);
        }
        return id;
    });
    async function restoreHistory() {
        if (!user) return;
        try {
            const rows = await api(
                `/venues/${venue.slug}/conversation-history`,
            );
            if (rows.length)
                setMessages(
                    rows.map((m: any) => ({
                        who: m.direction === "in" ? "user" : "bot",
                        text: `[${m.channel}] ${m.body}`,
                    })),
                );
        } catch (e) {
            setError((e as Error).message);
        }
    }
    useEffect(() => {
        restoreHistory();
    }, [user?.id, venue.id]);
    async function send(message: string) {
        if (preview) {
            setError(
                "Vista previa: no se envían mensajes ni se consume tu API.",
            );
            return;
        }
        if (!message.trim() || busy) return;
        setText("");
        setError("");
        setMessages((m) => [...m, { who: "user", text: message }]);
        setBusy(true);
        try {
            const d = await api(`/venues/${venue.slug}/chat`, "POST", {
                message,
                conversation,
            });
            setMessages((m) => [
                ...m,
                { who: "bot", text: d.reply, facts: d.facts },
            ]);
            setRemaining(d.remaining);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(false);
        }
    }
    return (
        <section className="chat-panel">
            <header>
                <div>
                    <b>{venue.name}</b>
                    <small>Asistente del establecimiento</small>
                </div>
                <button onClick={onClose} aria-label="Cerrar asistente">
                    <X size={18} />
                </button>
            </header>
            {user && <LinkChannels venue={venue} onRefresh={restoreHistory} />}
            <div className="chat-messages">
                {messages.map((m, i) => (
                    <div key={i} className={m.who}>
                        <p>{m.text}</p>
                        {m.facts && (
                            <details>
                                <summary>Ver datos oficiales del local</summary>
                                <p>{m.facts}</p>
                            </details>
                        )}
                    </div>
                ))}
                {busy && <span className="muted">Consultando…</span>}
                {error && (
                    <p className="error" role="alert">
                        {error}
                    </p>
                )}
            </div>
            <div className="chat-quick">
                {["Precios", "Horarios", "Ubicación"].map((t) => (
                    <button onClick={() => send(t)} key={t}>
                        {t}
                    </button>
                ))}
            </div>
            <small className="chat-quota">
                {remaining !== null
                    ? `${remaining} mensajes disponibles hoy`
                    : "Uso sujeto al límite diario del establecimiento"}
                {!user && <button onClick={onLogin}>Crear cuenta</button>}
            </small>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    send(text);
                }}
            >
                <input
                    value={text}
                    maxLength={700}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Pregunta sobre este local…"
                    aria-label="Mensaje para el asistente"
                />
                <button
                    disabled={busy || !text.trim()}
                    aria-label="Enviar mensaje"
                >
                    <ArrowRight size={20} />
                </button>
            </form>
        </section>
    );
}
function BookingList({
    rows,
    owner,
    onCancel,
}: {
    rows: any[];
    owner?: boolean;
    onCancel?: (id: string) => void;
}) {
    return (
        <div className="bookings">
            {!rows.length ? (
                <div className="empty">
                    <CalendarDays size={35} />
                    <h3>La agenda está lista para su primer encuentro.</h3>
                </div>
            ) : (
                rows.map((r) => {
                    const active =
                        r.status === "hold" &&
                        new Date(r.expires_at).getTime() > Date.now();
                    return (
                        <article key={r.id}>
                            <div>
                                <span className="eyebrow">
                                    {owner ? r.user.name : r.venue.name}
                                </span>
                                <h3>
                                    {new Date(r.starts_at).toLocaleString(
                                        "es-MX",
                                        {
                                            dateStyle: "long",
                                            timeStyle: "short",
                                            timeZone:
                                                r.quote?.timezone ||
                                                "America/Mexico_City",
                                        },
                                    )}
                                </h3>
                                <p>
                                    {r.guests} personas · Total {money(r.total)}{" "}
                                    · Anticipo {money(r.deposit)}
                                </p>
                                <ExtrasSummary items={r.quote?.extras || []}/>
                                {r.quote?.reservation_policy&&<details className="booking-policy"><summary>Política de cancelación aceptada</summary><p>{r.quote.reservation_policy.text}</p></details>}
                                {owner && (
                                    <p>
                                        {r.user.email}
                                        {r.user.phone
                                            ? " · " + r.user.phone
                                            : ""}
                                    </p>
                                )}
                                <p>
                                    Pagado: {money(r.paid_total || 0)} ·
                                    Restante: {money(r.balance_due ?? r.total)}
                                </p>
                                <small>Orden {r.order_number || r.id}</small>
                                {r.payment_attention && (
                                    <p className="error">
                                        {r.payment_attention}
                                    </p>
                                )}
                                {!owner &&
                                    r.balance_due > 0 &&
                                    ["hold", "confirmed"].includes(
                                        r.status,
                                    ) && <CheckoutButton booking={r} />}
                            </div>
                            <div>
                                <span
                                    className={
                                        "status " + (active ? "active" : "")
                                    }
                                >
                                    {active
                                        ? "Apartado temporal"
                                        : r.status === "hold"
                                          ? "Vencido"
                                          : r.status === "cancelled"
                                            ? "Cancelado"
                                            : r.status === "confirmed"
                                              ? "Confirmada"
                                              : r.status === "completed"
                                                ? "Finalizada"
                                                : r.status}
                                </span>
                                {active && onCancel && (
                                    <button
                                        className="text-button"
                                        onClick={() => onCancel(r.id)}
                                    >
                                        Cancelar apartado
                                    </button>
                                )}
                            </div>
                        </article>
                    );
                })
            )}
        </div>
    );
}
function Account({ navigate }: { navigate: (p: string) => void }) {
    const [rows, setRows] = useState<any[]>([]),
        [error, setError] = useState(""),
        [page, setPage] = useState(1),
        [last, setLast] = useState(1),
        [cancelTarget,setCancelTarget]=useState<any>(null),
        [success,setSuccess]=useState("");
    async function load() {
        try {
            const d = await api("/bookings?page=" + page);
            setRows(d.data);
            setLast(d.last_page);
        } catch (e) {
            setError((e as Error).message);
        }
    }
    useLive(
        "/bookings?page=" + page,
        true,
        (d) => {
            setRows(d.data);
            setLast(d.last_page);
        },
        (e) => setError(e.message),
    );
    function askCancel(id:string){const booking=rows.find(x=>x.id===id);if(booking){setCancelTarget(booking);setSuccess("");}}
    return (
        <main className="account">
            <span className="eyebrow">MIS RESERVAS</span>
            <h1>
                Mis <em>reservas.</em>
            </h1>
            <p className="muted">
                Tus apartados y sus importes, en un solo lugar.
            </p>
            <button className="outline" onClick={() => navigate("/")}>
                Encontrar otro espacio
                <ArrowRight size={16} />
            </button>
            {error && <div className="error">{error}</div>}
            {success&&<div className="success" role="status">{success}</div>}
            <BookingList rows={rows} onCancel={askCancel} />
            {cancelTarget&&<CancelBookingDialog booking={cancelTarget} onClose={()=>setCancelTarget(null)} onCancelled={()=>{setRows(current=>current.map(row=>row.id===cancelTarget.id?{...row,status:"cancelled"}:row));setCancelTarget(null);setSuccess("Apartado cancelado. El horario quedó liberado.");load();}}/>}
            <div className="pagination">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    Anterior
                </button>
                <span>
                    {page} / {last}
                </span>
                <button
                    disabled={page >= last}
                    onClick={() => setPage(page + 1)}
                >
                    Siguiente
                </button>
            </div>
        </main>
    );
}
function IndependentSite({site}:{site:any}){
 const v:Venue=site.venue;const central=()=>window.location.assign(site.canonical_url);
 return <Theme design={v.design}><header className="header"><a className="brand" href="/"><BrandWordmark name={v.design?.brand_name||v.name} logo={v.design?.logo_id?"/api/media/branding/"+v.design.logo_id:null}/></a><nav><a className="outline" href={site.account_url}>Mis reservas</a><a className="primary" href={site.canonical_url}>Reservar</a></nav></header><PublicVenue slug={v.slug} user={null} onLogin={central} map={site.map} navigate={central} independent reservationUrl={site.canonical_url}/><footer className="footer"><strong>{v.design?.brand_name||v.name}</strong><span>{v.design?.tagline||""}</span><small>Reservas y pagos en MXN · Acceso y pago en el portal seguro</small></footer></Theme>;
}
const standaloneNode=document.getElementById("standalone-site");
const standaloneData=standaloneNode?JSON.parse(standaloneNode.textContent||"null"):null;
createRoot(document.getElementById("app")!).render(standaloneData?<IndependentSite site={standaloneData}/>:<App />);
