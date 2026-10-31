import React from "react";
import { ShieldCheck } from "lucide-react";
export function PortalNavigation({
    owner,
    path,
    navigate,
    reservations,
}: {
    owner: boolean;
    path: string;
    navigate: (path: string) => void;
    reservations: () => void;
}) {
    return (
        <nav>
            {owner ? (
                <>
                    <span className="portal-label">
                        <ShieldCheck size={15} />
                        Gestión del negocio
                    </span>
                    <button
                        className="selected"
                        onClick={() => navigate("/gestion")}
                    >
                        Administración
                    </button>
                </>
            ) : (
                <>
                    <button
                        className={path === "/" ? "selected" : ""}
                        onClick={() => navigate("/")}
                    >
                        Explorar espacios
                    </button>
                    <button
                        className={path === "/account" ? "selected" : ""}
                        onClick={reservations}
                    >
                        Mis reservas
                    </button>
                </>
            )}
        </nav>
    );
}
