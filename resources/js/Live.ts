import { useEffect, useRef } from "react";
import { watchRealtime, realtimeReady, resourceChannel } from "./Realtime";
export async function fetchLive(
    path: string,
    etag?: string,
    signal?: AbortSignal,
) {
    const r = await fetch("/api" + path, {
        credentials: "same-origin",
        headers: {
            Accept: "application/json",
            ...(etag ? { "If-None-Match": etag } : {}),
        },
        signal,
    });
    if (r.status === 304) return { unchanged: true, etag };
    const data = await r.json();
    if (!r.ok)
        throw Object.assign(
            Error(data.message || "No se pudo actualizar la información."),
            { status: r.status },
        );
    return { data, etag: r.headers.get("ETag") ?? undefined, unchanged: false };
}
export function useLive(
    path: string,
    enabled: boolean,
    onData: (data: any) => void,
    onError?: (e: any) => void,
    channel?: string,
) {
    const callback = useRef(onData),
        failure = useRef(onError);
    callback.current = onData;
    failure.current = onError;
    useEffect(() => {
        if (!enabled) return;
        let active = true,
            busy = false,
            dirty = false,
            etag: string | undefined,
            topic = resourceChannel(path, channel);
        const controller = new AbortController();
        const hidden = () => document.visibilityState === "hidden";
        let stop = () => {};
        const refresh = async () => {
            if (hidden()) {
                dirty = true;
                return;
            }
            if (busy) {
                dirty = true;
                return;
            }
            busy = true;
            dirty = false;
            try {
                const r = await fetchLive(path, etag, controller.signal);
                if (active) {
                    etag = r.etag;
                    if (!r.unchanged) callback.current(r.data);
                }
            } catch (e) {
                if (active && (e as Error).name !== "AbortError")
                    failure.current?.(e);
            } finally {
                busy = false;
                if (active && dirty && !hidden()) {
                    dirty = false;
                    queueMicrotask(refresh);
                }
            }
        };
        const rebind = () => {
            stop();
            topic = resourceChannel(path, channel);
            stop = watchRealtime(topic, refresh);
            void refresh();
        };
        rebind();
        const fallback = setInterval(() => {
            if (!realtimeReady(topic)) void refresh();
        }, 60000);
        window.addEventListener("focus", refresh);
        document.addEventListener("visibilitychange", refresh);
        window.addEventListener("encuentro:realtime", rebind);
        return () => {
            active = false;
            stop();
            controller.abort();
            clearInterval(fallback);
            window.removeEventListener("focus", refresh);
            document.removeEventListener("visibilitychange", refresh);
            window.removeEventListener("encuentro:realtime", rebind);
        };
    }, [path, enabled, channel]);
}
