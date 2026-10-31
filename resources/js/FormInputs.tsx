import React, { useEffect, useRef, useState } from "react";
export function numericDraft(raw: string): number | null {
    if (raw.trim() === "") return null;
    const n = Number(raw.replace(",", "."));
    return Number.isFinite(n) ? n : null;
}
export function numericError(
    raw: string,
    min?: number | string,
    max?: number | string,
    step?: number | string,
): string {
    if (raw === "") return "";
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw))
        return "Escribe una cifra válida.";
    const value = Number(raw);
    if (min !== undefined && value < Number(min)) return `El mínimo es ${min}.`;
    if (max !== undefined && value > Number(max)) return `El máximo es ${max}.`;
    if (step !== undefined && step !== "any") {
        const unit = Number(step),
            offset = Number(min ?? 0);
        if (
            unit > 0 &&
            Math.abs(
                (value - offset) / unit - Math.round((value - offset) / unit),
            ) > 0.000001
        )
            return unit === 1
                ? "Escribe un número entero."
                : `Usa incrementos de ${step}.`;
    }
    return "";
}
// Keep the draft as text: deleting the whole field never inserts a zero, and 0. is editable.
export function NumericInput({
    value,
    defaultValue,
    onChange,
    onBlur,
    min,
    max,
    step = 1,
    type: _type,
    ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
    const [draft, setDraft] = useState(
        value == null ? String(defaultValue ?? "") : String(value),
    );
    const lastSent = useRef<number | null | undefined>(undefined);
    const input = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (value === undefined) {
            if (input.current)
                input.current.setCustomValidity(
                    numericError(input.current.value, min, max, step),
                );
            return;
        }
        const n = value == null || value === "" ? null : Number(value);
        if (!Object.is(n, lastSent.current)) {
            const text = value == null ? "" : String(value);
            setDraft(text);
            input.current?.setCustomValidity(
                numericError(text, min, max, step),
            );
        } else if (input.current)
            input.current.setCustomValidity(
                numericError(input.current.value, min, max, step),
            );
    }, [value, min, max, step]);
    return (
        <input
            {...props}
            ref={input}
            type="text"
            inputMode={Number(step) === 1 ? "numeric" : "decimal"}
            value={draft}
            onChange={(e) => {
                const raw = e.target.value.replace(",", ".");
                if (
                    !/^(?:\d*(?:\.\d*)?)$/.test(raw) ||
                    (Number(step) === 1 && raw.includes("."))
                ) {
                    e.target.value = draft;
                    return;
                }
                e.target.value = raw;
                setDraft(raw);
                e.target.setCustomValidity(numericError(raw, min, max, step));
                if (raw === "" || /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)) {
                    lastSent.current = numericDraft(raw);
                    onChange?.(e);
                }
            }}
            onKeyDown={(e) => {
                props.onKeyDown?.(e);
                if (
                    !e.ctrlKey &&
                    !e.metaKey &&
                    !e.altKey &&
                    e.key.length === 1 &&
                    !/[0-9]/.test(e.key) &&
                    !(
                        (e.key === "." || e.key === ",") &&
                        Number(step) !== 1 &&
                        !draft.includes(".")
                    )
                )
                    e.preventDefault();
            }}
            onBlur={(e) => {
                e.target.setCustomValidity(numericError(draft, min, max, step));
                onBlur?.(e);
            }}
        />
    );
}
export function clockValue(
    hour: number | null | undefined,
    minute = 0,
): string {
    return hour == null
        ? ""
        : `${String(hour % 24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
export function parseClock(
    value: string,
): { hour: number; minute: number } | null {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
    const [hour, minute] = value.split(":").map(Number);
    return { hour, minute };
}
export function formatClockDraft(raw: string): string {
    const digits = raw.replace(/[^0-9]/g, "").slice(0, 4);
    return digits.length >= 2
        ? digits.slice(0, 2) + ":" + digits.slice(2)
        : digits;
}
export function TimeInput({
    value,
    onValue,
    ...props
}: { value: string; onValue: (value: string) => void } & Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange"
>) {
    const [draft, setDraft] = useState(value);
    const sent = useRef(value);
    const input = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (value !== sent.current) setDraft(value);
    }, [value]);
    return (
        <input
            {...props}
            type="text"
            ref={input}
            inputMode="numeric"
            placeholder="00:00"
            maxLength={5}
            pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
            title="Formato de 24 horas, por ejemplo 09:30 o 22:00"
            value={draft}
            onKeyDown={(e) => {
                props.onKeyDown?.(e);
                if (
                    !e.ctrlKey &&
                    !e.metaKey &&
                    !e.altKey &&
                    e.key.length === 1 &&
                    !/[0-9:]/.test(e.key)
                )
                    e.preventDefault();
            }}
            onChange={(e) => {
                const raw = e.target.value;
                if (!/^[0-9:]*$/.test(raw)) {
                    e.target.value = draft;
                    return;
                }
                const caret = e.target.selectionStart ?? raw.length;
                const digitsBefore = raw
                    .slice(0, caret)
                    .replace(/[^0-9]/g, "").length;
                const deletingSeparator =
                    (e.nativeEvent as InputEvent).inputType ===
                        "deleteContentBackward" &&
                    draft.length === 3 &&
                    draft.endsWith(":") &&
                    raw === draft.slice(0, 2);
                const text = deletingSeparator
                    ? raw.slice(0, 1)
                    : formatClockDraft(raw);
                e.target.value = text;
                setDraft(text);
                const position = Math.min(
                    text.length,
                    digitsBefore + (digitsBefore >= 2 ? 1 : 0),
                );
                requestAnimationFrame(() =>
                    input.current?.setSelectionRange(position, position),
                );
                if (text === "" || parseClock(text)) {
                    sent.current = text;
                    onValue(text);
                }
            }}
        />
    );
}
export function OperatingHours({
    settings,
    onChange,
}: {
    settings: any;
    onChange: (patch: Record<string, number | null>) => void;
}) {
    const [nextDay, setNextDay] = useState(
        settings.close_hour != null && settings.close_hour >= 24,
    );
    useEffect(() => {
        if (settings.close_hour != null) setNextDay(settings.close_hour >= 24);
    }, [settings.close_hour]);
    return (
        <>
            <label>
                Hora de apertura (24 horas)
                <TimeInput
                    value={clockValue(
                        settings.open_hour,
                        settings.open_minute ?? 0,
                    )}
                    onValue={(text) => {
                        const t = parseClock(text);
                        onChange({
                            open_hour: t?.hour ?? null,
                            open_minute: t?.minute ?? 0,
                        });
                    }}
                />
            </label>
            <label>
                Hora de cierre (24 horas)
                <TimeInput
                    value={clockValue(
                        settings.close_hour,
                        settings.close_minute ?? 0,
                    )}
                    onValue={(text) => {
                        const t = parseClock(text);
                        onChange({
                            close_hour: t ? t.hour + (nextDay ? 24 : 0) : null,
                            close_minute: t?.minute ?? 0,
                        });
                    }}
                />
            </label>
            <label className="span-2">
                Día del cierre
                <select
                    value={nextDay ? "next" : "same"}
                    onChange={(e) => {
                        const next = e.target.value === "next";
                        setNextDay(next);
                        if (settings.close_hour != null)
                            onChange({
                                close_hour:
                                    (settings.close_hour % 24) +
                                    (next ? 24 : 0),
                            });
                    }}
                >
                    <option value="same">El mismo día</option>
                    <option value="next">Al día siguiente</option>
                </select>
                <small>
                    Ejemplo: apertura 18:00 y cierre 02:00 al día siguiente.
                </small>
            </label>
        </>
    );
}
