import Echo from "laravel-echo";
import Pusher from "pusher-js";
import { api } from "./api";
type Config = { enabled: boolean; key?: string };
type Identity = { id: number } | null;
type Entry = { callbacks: Set<() => void>; channel: any; ready: boolean };
let echo: Echo<"reverb"> | null = null,
    identity: Identity = null,
    portal = "client",
    signature = "",
    connected = false,
    degraded = false,
    connectingTimer: number | undefined;
const entries = new Map<string, Entry>();
export function configureRealtime(
    config: Config | undefined,
    user: Identity,
    kind: string,
    factory: (options: any) => Echo<"reverb"> = (options) => new Echo(options),
) {
    const next = JSON.stringify([config?.enabled, config?.key, user?.id, kind]);
    if (next === signature) return;
    signature = next;
    window.clearTimeout(connectingTimer);
    echo?.disconnect();
    entries.forEach((e) => {
        e.callbacks.clear();
        e.ready = false;
    });
    entries.clear();
    echo = null;
    connected = false;
    degraded = false;
    identity = user;
    portal = kind;
    if (config?.enabled && config.key) {
        echo = factory({
            broadcaster: "reverb",
            Pusher,
            key: config.key,
            wsHost: location.hostname,
            wsPort: Number(location.port || 80),
            wssPort: Number(location.port || 443),
            forceTLS: location.protocol === "https:",
            enabledTransports: ["ws", "wss"],
            disableStats: true,
            authorizer: (channel: any) => ({
                authorize: (socketId: string, callback: any) => {
                    api("/realtime/auth", "POST", {
                        socket_id: socketId,
                        channel_name: channel.name,
                    })
                        .then((data) => callback(null, data))
                        .catch((error) => callback(error, null));
                },
            }),
        });
        const generation = signature;
        const connection = (echo.connector as any).pusher.connection;
        const waitForSubscriptions = () => {
            if (signature !== generation) return;
            window.clearTimeout(connectingTimer);
            connectingTimer = window.setTimeout(() => {
                if (signature === generation && (!connected || [...entries.values()].some(e => !e.ready))) {
                    degraded = true; window.dispatchEvent(new Event("encuentro:connection"));
                }
            }, 15000);
        };
        connected = connection.state === "connected";
        waitForSubscriptions();
        connection.bind("state_change", ({ current }: any) => {
            if (signature !== generation) return;
            connected = current === "connected";
            degraded = ["unavailable", "failed", "disconnected"].includes(current);
            waitForSubscriptions();
            if (!connected) entries.forEach((e) => (e.ready = false));
            window.dispatchEvent(new Event("encuentro:connection"));
        });
    }
    window.dispatchEvent(new Event("encuentro:realtime"));
}
export function resourceChannel(
    path: string,
    explicit?: string,
): string | undefined {
    if (explicit) return explicit;
    if (path === "/venues") return "catalogue";
    if (path.startsWith("/owner/") && identity && portal === "owner")
        return "private-owner." + identity.id;
    if (
        (path.startsWith("/bookings") || path.startsWith("/checkout/")) &&
        identity &&
        portal === "client"
    )
        return "private-customer." + identity.id;
    return undefined;
}
export function watchRealtime(
    name: string | undefined,
    callback: () => void,
): () => void {
    if (!name || !echo) return () => {};
    let entry = entries.get(name);
    if (!entry) {
        const privateName = name.startsWith("private-");
        const channel = privateName
            ? echo.private(name.slice(8))
            : echo.channel(name);
        entry = { callbacks: new Set(), channel, ready: false };
        const selected = entry;
        channel
            .listen(".platform.changed", () =>
                selected.callbacks.forEach((cb) => cb()),
            )
            .subscribed(() => {
                if (entries.get(name) !== selected) return;
                selected.ready = true;
                degraded = false;
                window.dispatchEvent(new Event("encuentro:connection"));
                selected.callbacks.forEach((cb) => cb());
            })
            .error(() => {
                if (entries.get(name) !== selected) return;
                selected.ready = false;
                degraded = true;
                window.dispatchEvent(new Event("encuentro:connection"));
            });
        entries.set(name, entry);
    }
    entry.callbacks.add(callback);
    return () => {
        entry?.callbacks.delete(callback);
        if (entry && !entry.callbacks.size) {
            echo?.leaveChannel(name);
            entries.delete(name);
        }
    };
}
export function realtimeReady(name: string | undefined): boolean {
    return !!name && connected && !!entries.get(name)?.ready;
}
export function disconnectRealtime() {
    configureRealtime(undefined, null, "client");
}

export function realtimeStatus() {
    return connected && [...entries.values()].every((e) => e.ready)
        ? "connected"
        : echo && !degraded
          ? "connecting"
          : "fallback";
}
