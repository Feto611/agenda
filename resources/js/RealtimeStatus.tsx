import React, { useEffect, useState } from "react";
import { realtimeStatus } from "./Realtime";
export function RealtimeStatus() {
    const [state, setState] = useState(realtimeStatus);
    useEffect(() => {
        const sync = () => setState(realtimeStatus());
        window.addEventListener("encuentro:connection", sync);
        window.addEventListener("encuentro:realtime", sync);
        return () => {
            window.removeEventListener("encuentro:connection", sync);
            window.removeEventListener("encuentro:realtime", sync);
        };
    }, []);
    return (
        <small className={"realtime-status " + state} role="status">
            <i />
            {state === "connected"
                ? "En vivo"
                : state === "connecting"
                  ? "Conectando actualizaciones…"
                  : "Actualización de respaldo"}
        </small>
    );
}

export function ConnectionIndicator({owner}:{owner:boolean}){return owner?<RealtimeStatus/>:null;}
