let token =
    document.querySelector<HTMLMetaElement>("meta[name=csrf-token]")?.content ||
    "";
export class ApiError extends Error {
    constructor(message: string, public status: number, public retryAfter = 0, public fields: Record<string, string[]> = {}) { super(message); }
}
export async function api(
    path: string,
    method = "GET",
    body?: unknown,
): Promise<any> {
    const r = await fetch("/api" + path, {
        method,
        credentials: "same-origin",
        headers: {
            Accept: "application/json",
            ...(body instanceof FormData
                ? {}
                : { "Content-Type": "application/json" }),
            "X-CSRF-TOKEN": token,
        },
        body:
            body === undefined
                ? undefined
                : body instanceof FormData
                  ? body
                  : JSON.stringify(body),
    });
    const d = await r
        .json()
        .catch(() => ({ message: "Respuesta inesperada del servidor." }));
    if (d.csrf) token = d.csrf;
    if (!r.ok) {
        const errors = d.errors ? Object.values(d.errors).flat().join(" ") : "";
        const retry = Number(r.headers.get("Retry-After") || d.retry_after || 0);
        throw new ApiError((r.status===429&&!errors&&(!d.message||/too many/i.test(d.message))?"Demasiados intentos seguidos. Espera unos segundos antes de continuar.":errors || d.message) || "No se pudo completar la operación.", r.status, Number.isFinite(retry) ? Math.max(0, retry) : 0, d.errors || {});
    }
    return d;
}
export const money = (n: number) =>
    new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(n / 100);
export const hour = (n: number) => {
    const minutes = Math.round(n * 60),
        day = Math.floor(minutes / 1440),
        clock = ((minutes % 1440) + 1440) % 1440;
    return `${String(Math.floor(clock / 60)).padStart(2, "0")}:${String(clock % 60).padStart(2, "0")}${day > 0 ? " (+1 día)" : ""}`;
};
export type Venue = {
    id?: number;
    slug: string;
    name: string;
    published: boolean;
    settings: any;
    design?: any;
    revision?: string;
    has_ai_key?: boolean;
    photos?: any[];
    reviews?: any[];
};
