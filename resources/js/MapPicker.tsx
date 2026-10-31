import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
const icon = L.divIcon({
    className: "map-pin",
    html: "<span>●</span>",
    iconSize: [30, 38],
    iconAnchor: [15, 34],
});
export default function MapPicker({
    lat,
    lng,
    onChange,
    tiles,
    attribution,
}: {
    lat: number | null;
    lng: number | null;
    onChange?: (lat: number, lng: number) => void;
    tiles: string;
    attribution: string;
}) {
    const [failed, setFailed] = useState(false);
    const container = useRef<HTMLDivElement>(null),
        map = useRef<L.Map | null>(null),
        marker = useRef<L.Marker | null>(null),
        handler = useRef(onChange);
    handler.current = onChange;
    useEffect(() => {
        if (!container.current) return;
        const center: L.LatLngExpression = [lat ?? 19.2433, lng ?? -103.725];
        const m = L.map(container.current).setView(
            center,
            lat === null ? 12 : 16,
        );
        map.current = m;
        setFailed(false);
        const layer = L.tileLayer(tiles, {
            attribution,
            maxZoom: 19,
            referrerPolicy: "strict-origin-when-cross-origin",
        }).addTo(m);
        layer.on("tileerror", () => setFailed(true));
        const pin = L.marker(center, { draggable: !!onChange, icon }).addTo(m);
        marker.current = pin;
        if (lat === null || lng === null) pin.setOpacity(0.35);
        const update = (a: number, b: number) => {
            pin.setLatLng([a, b]).setOpacity(1);
            handler.current?.(a, b);
        };
        m.on("click", (e) => {
            if (handler.current) update(e.latlng.lat, e.latlng.lng);
        });
        pin.on("dragend", () => {
            const a = pin.getLatLng();
            update(a.lat, a.lng);
        });
        const t = setTimeout(() => m.invalidateSize(), 50);
        return () => {
            clearTimeout(t);
            m.remove();
            map.current = null;
        };
    }, [tiles, attribution, !!onChange]);
    useEffect(() => {
        if (lat !== null && lng !== null) {
            marker.current?.setLatLng([lat, lng]).setOpacity(1);
            map.current?.setView([lat, lng], 16);
        }
    }, [lat, lng]);
    return (
        <div>
            <div
                className="map-container"
                ref={container}
                aria-label={
                    onChange
                        ? "Mapa: haz clic o arrastra el marcador para confirmar ubicación"
                        : "Ubicación del establecimiento"
                }
            />
            {failed && (
                <p className="notice" role="status">
                    No se pudieron cargar las imágenes del mapa. Revisa tu
                    proveedor de mapas; puedes abrir la ubicación y el marcador
                    sigue disponible.{" "}
                    {lat != null && lng != null && (
                        <a
                            href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Abrir ubicación
                        </a>
                    )}
                </p>
            )}
        </div>
    );
}
