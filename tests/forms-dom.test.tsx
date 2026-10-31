import { test } from "node:test";
import assert from "node:assert/strict";
import React, { act, useState } from "react";
import { JSDOM, CookieJar } from "jsdom";
const dom = new JSDOM(
    '<!doctype html><html><head><meta name="csrf-token" content="test"></head><body></body></html>',
    { url: "https://test.invalid/" },
);
Object.assign(globalThis, {
    window: dom.window,
    location: dom.window.location,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    HTMLInputElement: dom.window.HTMLInputElement,
    Event: dom.window.Event,
    MouseEvent: dom.window.MouseEvent,
    IS_REACT_ACT_ENVIRONMENT: true,
    requestAnimationFrame: (fn: any) => {
        fn();
        return 1;
    },
});
const { createRoot } = await import("react-dom/client");
const {
    NumericInput,
    TimeInput,
    OperatingHours,
    numericDraft,
    numericError,
    clockValue,
    parseClock,
} = await import("../resources/js/FormInputs");
const { Catalogue, PublicGallery } = await import("../resources/js/Experience");
async function mount(node: React.ReactNode) {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => root.render(node));
    return {
        container,
        async close() {
            await act(async () => root.unmount());
            container.remove();
        },
    };
}
async function type(input: HTMLInputElement, text: string) {
    await act(async () => {
        Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value",
        )!.set!.call(input, text);
        input.dispatchEvent(new window.Event("input", { bubbles: true }));
    });
}
test("borrar cifras mantiene el campo vacío y permite escribir sin un cero añadido", async () => {
    let latest: number | null = 5;
    function Form() {
        const [n, setN] = useState<number | null>(5);
        return (
            <NumericInput
                value={n}
                min={1}
                max={20}
                onChange={(e) => {
                    latest = numericDraft(e.target.value);
                    setN(latest);
                }}
            />
        );
    }
    const m = await mount(<Form />);
    const input = m.container.querySelector("input")!;
    await type(input, "");
    assert.equal(input.value, "");
    assert.equal(latest, null);
    await type(input, "7");
    assert.equal(input.value, "7");
    assert.equal(latest, 7);
    await m.close();
});
test("temperatura y monedas mantienen el borrador decimal durante la edición", async () => {
    function Form() {
        const [n, setN] = useState<number | null>(0.2);
        return (
            <NumericInput
                value={n}
                min={0}
                step={0.01}
                onChange={(e) => setN(numericDraft(e.target.value))}
            />
        );
    }
    const m = await mount(<Form />);
    const input = m.container.querySelector("input")!;
    for (const text of ["", "0", "0.", "0.25"]) {
        await type(input, text);
        assert.equal(input.value, text);
    }
    await type(input, "1,50");
    assert.equal(input.value, "1.50");
    await m.close();
});
test("requisitos, enteros y rangos se validan sin reinsertar un valor", async () => {
    const m = await mount(<NumericInput required min={1} max={20} step={1} />);
    const input = m.container.querySelector("input")!;
    await type(input, "");
    assert.equal(input.checkValidity(), false);
    await type(input, "0");
    assert.equal(input.checkValidity(), false);
    await type(input, "2.5");
    assert.equal(input.checkValidity(), false);
    await type(input, "21");
    assert.equal(input.checkValidity(), false);
    await type(input, "3");
    assert.equal(input.checkValidity(), true);
    await m.close();
});
test("el control de hora muestra HH:MM, admite vacío y rechaza horas inválidas", async () => {
    let latest = "10:30";
    function Form() {
        const [time, setTime] = useState(latest);
        return (
            <TimeInput
                value={time}
                onValue={(v) => {
                    latest = v;
                    setTime(v);
                }}
            />
        );
    }
    const m = await mount(<Form />);
    const input = m.container.querySelector("input")!;
    await type(input, "");
    assert.equal(input.value, "");
    assert.equal(latest, "");
    await type(input, "09:");
    assert.equal(input.value, "09:");
    assert.equal(input.checkValidity(), false);
    await type(input, "09:45");
    assert.equal(latest, "09:45");
    assert.equal(input.checkValidity(), true);
    await type(input, "26:00");
    assert.equal(input.checkValidity(), false);
    assert.equal(latest, "09:45");
    await m.close();
});
test("las conversiones distinguen cero de vacío y expresan la medianoche correctamente", () => {
    assert.equal(numericDraft(""), null);
    assert.equal(numericDraft("0"), 0);
    assert.equal(numericDraft("0.2"), 0.2);
    assert.equal(numericError("2.5", 1, 20, 1), "Escribe un número entero.");
    assert.equal(clockValue(26, 15), "02:15");
    assert.equal(clockValue(null), "");
    assert.deepEqual(parseClock("00:00"), { hour: 0, minute: 0 });
    assert.equal(parseClock("24:00"), null);
});
test("HTML y JavaScript almacenados se muestran como texto sin nodos ejecutables", async () => {
    const attack =
        '<img src=x onerror="document.body.dataset.stolen=document.cookie"><script>document.body.dataset.stolen=document.cookie</script>';
    const venue: any = {
        id: 1,
        name: attack,
        slug: "real",
        published: true,
        settings: {
            address: attack,
            description: attack,
            capacity: 50,
            mode: "day",
            open_hour: 10,
            close_hour: 26,
            weekday_price: 10000,
            weekend_price: 10000,
            holiday_price: 10000,
        },
        photos: [],
        reviews: [{ id: 1, author: attack, body: attack, source: "owner" }],
    };
    const m = await mount(
        <>
            <Catalogue venues={[venue]} navigate={() => {}} />
            <PublicGallery venue={venue} />
        </>,
    );
    assert.ok(m.container.textContent?.includes(attack));
    assert.equal(m.container.querySelectorAll("script,img[onerror]").length, 0);
    assert.equal(document.body.dataset.stolen, undefined);
    await m.close();
});
test("la simulación de cookies HttpOnly impide leer la sesión desde document.cookie", () => {
    const jar = new CookieJar();
    jar.setCookieSync(
        "encuentro_customer_session=synthetic-test-session; Secure; HttpOnly; SameSite=Lax; Path=/",
        "https://cookie-test.invalid/",
    );
    jar.setCookieSync(
        "XSRF-TOKEN=synthetic-csrf; Secure; SameSite=Lax; Path=/",
        "https://cookie-test.invalid/",
    );
    const page = new JSDOM("<!doctype html><p>Prueba local</p>", {
        url: "https://cookie-test.invalid/",
        cookieJar: jar,
    });
    assert.ok(!page.window.document.cookie.includes("synthetic-test-session"));
    assert.ok(page.window.document.cookie.includes("synthetic-csrf"));
    assert.ok(
        jar
            .getCookieStringSync("https://cookie-test.invalid/")
            .includes("synthetic-test-session"),
    );
    page.window.close();
});

test("borrar y reescribir el cierre conserva la selección del día siguiente", async () => {
    let last: any;
    function Form() {
        const [settings, setSettings] = useState({
            open_hour: 18,
            open_minute: 0,
            close_hour: 26,
            close_minute: 0,
        });
        last = settings;
        return (
            <OperatingHours
                settings={settings}
                onChange={(patch) =>
                    setSettings((s) => ({ ...s, ...patch }) as typeof settings)
                }
            />
        );
    }
    const m = await mount(<Form />);
    const close = m.container.querySelectorAll("input")[1];
    await type(close, "");
    assert.equal(last.close_hour, null);
    assert.equal(m.container.querySelector("select")?.value, "next");
    await type(close, "02:15");
    assert.equal(last.close_hour, 26);
    assert.equal(last.close_minute, 15);
    await m.close();
});

test("la hora inserta los dos puntos al escribir solo dígitos y bloquea letras", async () => {
    function Form() {
        const [time, setTime] = useState("");
        return <TimeInput value={time} onValue={setTime} />;
    }
    const m = await mount(<Form />);
    const input = m.container.querySelector("input")!;
    for (const [raw, wanted] of [
        ["1", "1"],
        ["12", "12:"],
        ["12:3", "12:3"],
        ["12:30", "12:30"],
    ]) {
        await type(input, raw);
        assert.equal(input.value, wanted);
    }
    await type(input, "12a30");
    assert.equal(input.value, "12:30");
    const event = new window.KeyboardEvent("keydown", {
        key: "a",
        bubbles: true,
        cancelable: true,
    });
    await act(async () => {
        input.dispatchEvent(event);
    });
    assert.equal(event.defaultPrevented, true);
    await m.close();
});
test("los campos numéricos rechazan letras y notación científica incluso al pegar", async () => {
    function Form() {
        const [n, setN] = useState<number | null>(12);
        return (
            <NumericInput
                value={n}
                min={0}
                onChange={(e) => setN(numericDraft(e.target.value))}
            />
        );
    }
    const m = await mount(<Form />);
    const input = m.container.querySelector("input")!;
    for (const raw of ["12abc", "1e3", "15.5", "<script>"]) {
        await type(input, raw);
        assert.equal(input.value, "12");
    }
    const event = new window.KeyboardEvent("keydown", {
        key: "e",
        bubbles: true,
        cancelable: true,
    });
    await act(async () => {
        input.dispatchEvent(event);
    });
    assert.equal(event.defaultPrevented, true);
    await type(input, "");
    assert.equal(input.value, "");
    await m.close();
});
const { fetchLive, useLive } = await import("../resources/js/Live");
test("las revisiones del servidor actualizan sin recargar y 304 conserva el estado", async () => {
    const original = globalThis.fetch;
    let calls = 0,
        lastHeader = "";
    globalThis.fetch = async (_input: any, init: any) => {
        calls++;
        lastHeader = init?.headers?.["If-None-Match"] || "";
        return calls === 1
            ? new Response(JSON.stringify({ revision: "first", price: 500 }), {
                  headers: {
                      ETag: '"first"',
                      "Content-Type": "application/json",
                  },
              })
            : new Response(null, { status: 304 });
    };
    try {
        const first = await fetchLive("/venues");
        assert.equal(first.data.price, 500);
        const second = await fetchLive("/venues", first.etag);
        assert.equal(second.unchanged, true);
        assert.equal(lastHeader, '"first"');
    } finally {
        globalThis.fetch = original;
    }
});
test("el recurso vivo vuelve a consultar al recuperar el foco y limpia su suscripción", async () => {
    const original = globalThis.fetch;
    let calls = 0;
    Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "visible",
    });
    globalThis.fetch = async () =>
        new Response(JSON.stringify({ name: "Actualizado " + ++calls }), {
            headers: {
                "Content-Type": "application/json",
                ETag: '"' + calls + '"',
            },
        });
    function View() {
        const [name, setName] = useState("Inicial");
        useLive("/venues", true, (d) => setName(d.name));
        return <p>{name}</p>;
    }
    try {
        const m = await mount(<View />);
        await act(async () => {
            window.dispatchEvent(new window.Event("focus"));
            await new Promise((r) => setTimeout(r, 0));
        });
        assert.equal(m.container.textContent, "Actualizado 2");
        await m.close();
        window.dispatchEvent(new window.Event("focus"));
        assert.equal(calls, 2);
    } finally {
        globalThis.fetch = original;
    }
});

test("retroceso permite borrar la hora completa sin quedar atrapado en los dos puntos", async () => {
    function Form() {
        const [time, setTime] = useState("12:30");
        return <TimeInput value={time} onValue={setTime} />;
    }
    const m = await mount(<Form />);
    const input = m.container.querySelector("input")!;
    for (const [raw, wanted] of [
        ["12:3", "12:3"],
        ["12:", "12:"],
        ["12", "1"],
        ["", ""],
    ]) {
        await act(async () => {
            Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype,
                "value",
            )!.set!.call(input, raw);
            input.dispatchEvent(
                new window.InputEvent("input", {
                    bubbles: true,
                    inputType: "deleteContentBackward",
                }),
            );
        });
        assert.equal(input.value, wanted);
    }
    await m.close();
});

const {
    configureRealtime,
    disconnectRealtime,
    watchRealtime,
    resourceChannel,
} = await import("../resources/js/Realtime");
function fakeRealtime() {
    const states: any = {},
        channels = new Map<string, any>();
    const fake: any = {
        connector: {
            pusher: {
                connection: {
                    bind: (name: string, cb: any) => (states[name] = cb),
                },
            },
        },
        disconnected: false,
        left: [] as string[],
        disconnect() {
            this.disconnected = true;
        },
        leaveChannel(name: string) {
            this.left.push(name);
            channels.delete(name);
        },
        channel(name: string) {
            if (!channels.has(name))
                channels.set(name, {
                    listen(_event: string, cb: any) {
                        this.event = cb;
                        return this;
                    },
                    subscribed(cb: any) {
                        this.ready = cb;
                        return this;
                    },
                    error(cb: any) {
                        this.failed = cb;
                        return this;
                    },
                });
            return channels.get(name);
        },
        private(name: string) {
            return this.channel("private-" + name);
        },
    };
    return { fake, states, channels };
}
test("con WebSocket conectado no hay sondeo y los eventos y reconexión actualizan", async () => {
    const originalFetch = globalThis.fetch,
        originalSet = globalThis.setInterval,
        originalClear = globalThis.clearInterval;
    let calls = 0;
    const timers: any[] = [];
    const { fake, states, channels } = fakeRealtime();
    globalThis.fetch = async () =>
        new Response(JSON.stringify({ value: ++calls }), {
            headers: { "Content-Type": "application/json" },
        });
    globalThis.setInterval = ((fn: any, ms: any) => {
        timers.push({ fn, ms });
        return timers.length;
    }) as any;
    globalThis.clearInterval = (() => {}) as any;
    let mounted: any;
    try {
        configureRealtime(
            { enabled: true, key: "ws-ui-test" },
            null,
            "client",
            () => fake,
        );
        function View() {
            const [n, setN] = useState(0);
            useLive("/venues", true, (d) => setN(d.value));
            return <p>{n}</p>;
        }
        mounted = await mount(<View />);
        assert.equal(calls, 1);
        assert.equal(timers[0].ms, 60000);
        await act(async () => {
            states.state_change({ current: "connected" });
            channels.get("catalogue").ready();
            await new Promise((r) => setTimeout(r, 0));
        });
        assert.equal(calls, 2);
        await act(async () => {
            timers[0].fn();
            await Promise.resolve();
        });
        assert.equal(calls, 2);
        await act(async () => {
            channels.get("catalogue").event({ kind: "venue", version: 1 });
            await new Promise((r) => setTimeout(r, 0));
        });
        assert.equal(calls, 3);
        await act(async () => {
            states.state_change({ current: "disconnected" });
            timers[0].fn();
            await new Promise((r) => setTimeout(r, 0));
        });
        assert.equal(calls, 4);
        await act(async () => {
            states.state_change({ current: "connected" });
            channels.get("catalogue").ready();
            await new Promise((r) => setTimeout(r, 0));
        });
        assert.equal(calls, 5);
        assert.equal(mounted.container.textContent, "5");
    } finally {
        if (mounted) await mounted.close();
        disconnectRealtime();
        globalThis.fetch = originalFetch;
        globalThis.setInterval = originalSet;
        globalThis.clearInterval = originalClear;
    }
});
test("consumidores comparten un canal y solo el último lo desuscribe", () => {
    const { fake } = fakeRealtime();
    configureRealtime(
        { enabled: true, key: "ws-shared-test" },
        { id: 3 },
        "owner",
        () => fake,
    );
    assert.equal(
        resourceChannel("/owner/venues/local/bookings"),
        "private-owner.3",
    );
    const a = watchRealtime("private-owner.3", () => {}),
        b = watchRealtime("private-owner.3", () => {});
    a();
    assert.equal(fake.left.length, 0);
    b();
    assert.deepEqual(fake.left, ["private-owner.3"]);
    disconnectRealtime();
});
test("cerrar sesión desconecta el socket privado y descarta sus callbacks antiguos", () => {
    const { fake, channels } = fakeRealtime();
    configureRealtime(
        { enabled: true, key: "ws-logout-test" },
        { id: 5 },
        "owner",
        () => fake,
    );
    let calls = 0;
    watchRealtime("private-owner.5", () => calls++);
    const old = channels.get("private-owner.5");
    disconnectRealtime();
    old.event({ kind: "booking", version: 1 });
    assert.equal(fake.disconnected, true);
    assert.equal(calls, 0);
    assert.equal(resourceChannel("/owner/venues/local/bookings"), undefined);
});

const { AuthModal } = await import('../resources/js/AuthModal');
const { VenueBrand } = await import('../resources/js/Design');
const {SiteIdentity}=await import('../resources/js/SiteIdentity');
test('el login ignora envíos duplicados mientras espera respuesta', async () => {
    const previousFetch = globalThis.fetch, previousFormData = globalThis.FormData;
    let calls = 0, finish: any, done = 0;
    globalThis.FormData = dom.window.FormData as any;
    globalThis.fetch = (async () => { calls++; return new Promise(resolve => { finish = resolve; }); }) as any;
    const m = await mount(<AuthModal onClose={() => {}} onDone={() => done++} />);
    try {
        const form = m.container.querySelector('form')!;
        await act(async () => {
            form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
            form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
        });
        assert.equal(calls, 1);
        await act(async () => finish(new Response(JSON.stringify({ user: { id: 1, name: 'Cliente' } }), { status: 200, headers: { 'Content-Type': 'application/json' } })));
        assert.equal(done, 1);
    } finally { await m.close(); globalThis.fetch = previousFetch; globalThis.FormData = previousFormData; }
});
test('el login muestra Retry-After y no reintenta automáticamente un 429', async () => {
    const previousFetch = globalThis.fetch, previousFormData = globalThis.FormData;
    let calls = 0;
    globalThis.FormData = dom.window.FormData as any;
    globalThis.fetch = (async () => { calls++; return new Response(JSON.stringify({ message: 'Espera antes de volver a intentar.', retry_after: 30 }), { status: 429, headers: { 'Retry-After': '30' } }); }) as any;
    const m = await mount(<AuthModal onClose={() => {}} onDone={() => assert.fail('no debe autenticar')} />);
    try {
        const form = m.container.querySelector('form')!;
        await act(async () => { form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })); });
        assert.match(m.container.textContent!, /Reintentar en 30 s/);
        assert.equal((m.container.querySelector('button.primary') as HTMLButtonElement).disabled, true);
        await act(async () => { form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })); });
        assert.equal(calls, 1);
    } finally { await m.close(); globalThis.fetch = previousFetch; globalThis.FormData = previousFormData; }
});
test('el catálogo conserva el favicon general y usa un título compuesto por local y plataforma',async()=>{
 document.title='Plataforma';const icon=document.createElement('link');icon.rel='icon';icon.href='/general.png';document.head.append(icon);
 const venue={id:4,slug:'local',name:'Local',published:true,settings:{},design:{brand_name:'Mi marca',favicon_id:11,page_title:'Título independiente'}};
 const m=await mount(<><SiteIdentity venue={venue} platformName="Mi plataforma"/><VenueBrand venue={venue}/></>);
 try{assert.equal(document.title,'Mi marca · Mi plataforma');assert.equal(document.querySelector('link[rel="icon"]'),icon);}finally{await m.close();icon.remove();}assert.equal(document.title,'Plataforma');
});
test('solo la página independiente utiliza y restaura el favicon y el título propios',async()=>{
 document.title='Plataforma';const icon=document.createElement('link');icon.rel='icon';icon.href='/general.png';document.head.append(icon);
 const m=await mount(<SiteIdentity independent venue={{slug:'local',name:'Local',published:true,settings:{},design:{favicon_id:11,page_title:'Mi dominio'}}}/>);
 try{assert.equal(document.title,'Mi dominio');assert.match(document.querySelector<HTMLLinkElement>('link[rel="icon"]')!.href,/branding\/11$/);}finally{await m.close();}assert.equal(document.title,'Plataforma');assert.equal(document.querySelector('link[rel="icon"]'),icon);icon.remove();
});
test('la identidad independiente de la vista previa modifica solo su iframe',async()=>{
 document.title='Administración';const iframe=document.createElement('iframe');document.body.append(iframe);const child=iframe.contentDocument!;child.title='Vista previa';const root=createRoot(child.body);
 try{await act(async()=>root.render(<SiteIdentity independent venue={{slug:'local',name:'Local',published:true,settings:{},design:{page_title:'Mi diseño',favicon_id:5}}}/>));assert.equal(document.title,'Administración');assert.equal(child.title,'Mi diseño');assert.equal(document.querySelector('link[rel="icon"]'),null);assert.match(child.querySelector('link[rel="icon"]')!.getAttribute('href')!,/branding\/5/);}finally{await act(async()=>root.unmount());iframe.remove();}
});
test('el login explica un 422 y marca el campo sin reintentar credenciales', async () => {
    const previousFetch = globalThis.fetch, previousFormData = globalThis.FormData;
    let calls = 0;
    globalThis.FormData = dom.window.FormData as any;
    globalThis.fetch = (async () => { calls++; return new Response(JSON.stringify({ message: 'Correo o contraseña incorrectos.', errors: { email: ['Correo o contraseña incorrectos.'] } }), { status: 422 }); }) as any;
    const m = await mount(<AuthModal onClose={() => {}} onDone={() => assert.fail('no debe autenticar')} />);
    try {
        await act(async () => { m.container.querySelector('form')!.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })); });
        const email = m.container.querySelector('input[name="email"]')!;
        assert.equal(email.getAttribute('aria-invalid'), 'true');
        assert.equal(document.activeElement, email);
        assert.match(m.container.querySelector('[role="alert"]')!.textContent!, /Correo o contraseña incorrectos/);
        assert.equal(calls, 1);
    } finally { await m.close(); globalThis.fetch = previousFetch; globalThis.FormData = previousFormData; }
});
test('una conexión WebSocket no disponible muestra respaldo y se recupera al suscribir', async () => {
    const { realtimeStatus } = await import('../resources/js/Realtime');
    const { fake, states, channels } = fakeRealtime();
    configureRealtime({ enabled: true, key: 'ws-status-test' }, null, 'client', () => fake);
    const stop = watchRealtime('catalogue', () => {});
    assert.equal(realtimeStatus(), 'connecting');
    states.state_change({ current: 'unavailable' });
    assert.equal(realtimeStatus(), 'fallback');
    states.state_change({ current: 'connected' }); channels.get('catalogue').ready();
    assert.equal(realtimeStatus(), 'connected'); stop(); disconnectRealtime();
});
test('una conexión anterior no cambia el estado de la sesión WebSocket nueva', async () => {
    const { realtimeStatus } = await import('../resources/js/Realtime');
    const old = fakeRealtime(), current = fakeRealtime();
    configureRealtime({ enabled: true, key: 'ws-old-status' }, { id: 1 }, 'client', () => old.fake);
    watchRealtime('private-customer.1', () => {});
    configureRealtime({ enabled: true, key: 'ws-new-status' }, { id: 2 }, 'client', () => current.fake);
    const stop = watchRealtime('private-customer.2', () => {});
    current.states.state_change({ current: 'connected' }); current.channels.get('private-customer.2').ready();
    old.states.state_change({ current: 'disconnected' });
    assert.equal(realtimeStatus(), 'connected'); stop(); disconnectRealtime();
});

const {VenueImage}=await import("../resources/js/CoverImage");
const carouselVenue:any={id:1,slug:"local-fotos",name:"Local con fotos",published:true,settings:{},design:{cover_mode:"carousel",cover_interval:5},photos:[
 {id:1,image_url:"/one.jpg",caption:"Primera",cover:true,visible:true},
 {id:2,image_url:"/two.jpg",caption:"Segunda",cover:false,visible:true},
 {id:3,image_url:"/private.jpg",caption:"Oculta",cover:false,visible:false}
]};
test("el carrusel rota, permite pausar, omite fotos ocultas y limpia su temporizador",async()=>{
 const oldSet=globalThis.setInterval,oldClear=globalThis.clearInterval;
 const timers=new Map<number,()=>void>();let id=0;
 const oldHidden=Object.getOwnPropertyDescriptor(document,"hidden");
 Object.defineProperty(document,"hidden",{configurable:true,value:false});
 globalThis.setInterval=((fn:any)=>{timers.set(++id,fn);return id;}) as any;
 globalThis.clearInterval=((key:any)=>{timers.delete(key);}) as any;
 const mounted=await mount(<VenueImage venue={carouselVenue} controls/>);
 try{
  const img=()=>mounted.container.querySelector("img")!;
  assert.equal(img().getAttribute("src"),"/one.jpg");assert.equal(timers.size,1);
  await act(async()=>{[...timers.values()][0]();});
  assert.equal(img().getAttribute("src"),"/two.jpg");
  assert.ok(img().classList.contains("cover-current"));
  assert.equal(mounted.container.querySelector("img.cover-outgoing")?.getAttribute("src"),"/one.jpg");
  await act(async()=>mounted.container.querySelector<HTMLButtonElement>('[aria-label="Pausar carrusel"]')!.click());
  assert.equal(timers.size,0);
  await act(async()=>mounted.container.querySelector<HTMLButtonElement>('[aria-label="Fotografía siguiente"]')!.click());
  assert.equal(img().getAttribute("src"),"/one.jpg");
  assert.doesNotMatch(mounted.container.innerHTML,/private.jpg/);
 }finally{
  await mounted.close();assert.equal(timers.size,0);globalThis.setInterval=oldSet;globalThis.clearInterval=oldClear;
  if(oldHidden)Object.defineProperty(document,"hidden",oldHidden);else delete (document as any).hidden;
 }
});
test("la imagen fija y una sola foto no generan intervalos; una foto rota no vacía el carrusel",async()=>{
 const fixed=await mount(<VenueImage venue={{...carouselVenue,design:{cover_mode:"fixed"}}} controls/>);
 assert.equal(fixed.container.querySelector(".cover-controls"),null);await fixed.close();
 const single=await mount(<VenueImage venue={{...carouselVenue,photos:carouselVenue.photos.slice(0,1)}} controls/>);
 assert.equal(single.container.querySelector(".cover-controls"),null);await single.close();
 const m=await mount(<VenueImage venue={carouselVenue} controls/>);
 await act(async()=>m.container.querySelector("img")!.dispatchEvent(new window.Event("error")));
 assert.equal(m.container.querySelector("img")!.getAttribute("src"),"/two.jpg");
 assert.equal(m.container.querySelector(".cover-controls"),null);
 await m.close();
});
test("reducir movimiento desactiva el avance automático sin quitar la navegación manual",async()=>{
 const oldMatch=window.matchMedia;const oldSet=globalThis.setInterval;let count=0;
 window.matchMedia=(()=>({matches:true,addEventListener(){},removeEventListener(){}})) as any;
 globalThis.setInterval=((...args:any[])=>{count++;return 0;}) as any;
 const m=await mount(<VenueImage venue={carouselVenue} controls/>);
 try{
  assert.equal(count,0);assert.equal(m.container.querySelector('[aria-label="Pausar carrusel"]'),null);
  await act(async()=>m.container.querySelector<HTMLButtonElement>('[aria-label="Fotografía siguiente"]')!.click());
  assert.equal(m.container.querySelector("img")!.getAttribute("src"),"/two.jpg");
 }finally{await m.close();window.matchMedia=oldMatch;globalThis.setInterval=oldSet;}
});
const {MediaManager}=await import("../resources/js/Experience");
test("eliminar una imagen exige confirmación antes de enviar DELETE y permite cancelar",async()=>{
 const original=globalThis.fetch;let deletes=0;
 globalThis.fetch=async(_url:any,init:any)=>{
  if(init?.method==="DELETE")deletes++;
  const data=String(_url).endsWith("/instagram")?{connected:false}:String(_url)==="/api/owner/venues"?[{...carouselVenue,photos:[]}]:{ok:true};
  return new Response(JSON.stringify(data),{headers:{"Content-Type":"application/json"}});
 };
 const m=await mount(<MediaManager venue={carouselVenue} onChange={()=>{}}/>);
 const button=(text:string)=>[...m.container.querySelectorAll<HTMLButtonElement>("button")].find(x=>x.textContent===text)!;
 try{
  await act(async()=>button("Eliminar imagen").click());assert.equal(deletes,0);
  await act(async()=>button("Conservar imagen").click());assert.equal(deletes,0);
  await act(async()=>button("Eliminar imagen").click());
  await act(async()=>button("Sí, eliminar imagen").click());assert.equal(deletes,1);
 }finally{await m.close();globalThis.fetch=original;}
});

const {pagePortalKind,loadPortalIdentity,loadCatalogueForPortal}=await import("../resources/js/PortalBootstrap");
test("el HTML fija el portal propietario y un fallo de sesión no lo convierte en cliente",async()=>{
 const meta=document.createElement("meta");meta.name="app-portal";meta.content="owner";document.head.append(meta);
 try{
  assert.equal(pagePortalKind(),"owner");
  await assert.rejects(()=>loadPortalIdentity(pagePortalKind(),async()=>{throw new Error("Server Error");}),/Server Error/);
  assert.equal(pagePortalKind(),"owner");
 }finally{meta.remove();}
});
test("el arranque propietario no depende de cargar locales privados ni consulta el catálogo público",async()=>{
 const calls:string[]=[];
 const fake=async(path:string)=>{calls.push(path);if(path==="/me")return {portal:{kind:"owner"},user:{id:1}};throw new Error("Server Error al cargar locales");};
 const me=await loadPortalIdentity("owner",fake);
 assert.equal(me.portal.kind,"owner");
 assert.deepEqual(await loadCatalogueForPortal(me.portal.kind,fake),[]);
 assert.deepEqual(calls,["/me"]);
});
test("un proxy que mezcle página y API de portales diferentes se rechaza sin elegir otro portal",async()=>{
 await assert.rejects(()=>loadPortalIdentity("owner",async()=>({portal:{kind:"client"}})),/portales distintos/);
 await assert.rejects(()=>loadPortalIdentity(null,async()=>({})),/identificar el portal/);
 const calls:string[]=[];await loadCatalogueForPortal("client",async path=>{calls.push(path);return [];});
 assert.deepEqual(calls,["/venues"]);
});

const {CancelBookingDialog}=await import("../resources/js/ConfirmAction");
const cancelBooking:any={id:"demo-booking",order_number:"EV-DEMO",venue:{name:"Jardín de prueba"},starts_at:"2027-01-02T18:00:00Z",quote:{timezone:"America/Mexico_City"}};
test("cancelar requiere confirmar; conservar no envía solicitudes y enfoca la opción segura",async()=>{
 const original=globalThis.fetch;let calls=0,closed=0;
 globalThis.fetch=async()=>{calls++;return new Response("{}");};
 const m=await mount(<CancelBookingDialog booking={cancelBooking} onClose={()=>closed++} onCancelled={()=>{}}/>);
 try{
 const keep=m.container.querySelector<HTMLButtonElement>("button")!;
 assert.equal(keep.textContent,"Conservar mi reserva");assert.equal(document.activeElement,keep);
 await act(async()=>keep.click());assert.equal(closed,1);assert.equal(calls,0);
 }finally{await m.close();globalThis.fetch=original;}
});
test("confirmar una cancelación bloquea dobles clics y muestra rechazos del servidor",async()=>{
 const original=globalThis.fetch;let calls=0,success=0;let finish:(value:Response)=>void=()=>{};
 globalThis.fetch=async()=>{calls++;return new Promise<Response>(resolve=>{finish=resolve;});};
 const m=await mount(<CancelBookingDialog booking={cancelBooking} onClose={()=>{}} onCancelled={()=>success++}/>);
 try{
 const yes=m.container.querySelector<HTMLButtonElement>(".danger-action")!;
 await act(async()=>{yes.click();yes.click();});assert.equal(calls,1);assert.equal(yes.disabled,true);
 await act(async()=>finish(new Response(JSON.stringify({message:"Hay un pago vigente."}),{status:422})));
 assert.equal(success,0);assert.match(m.container.textContent||"",/Hay un pago vigente/);assert.equal(yes.disabled,false);
 }finally{await m.close();globalThis.fetch=original;}
});
test("la búsqueda del catálogo filtra por nombre sin distinguir tildes ni mayúsculas",async()=>{
 const venues:any[]=[{id:1,name:"Jardín Azul",slug:"azul",settings:{address:"Colima",capacity:50,weekday_price:10000,weekend_price:10000,holiday_price:10000,open_hour:10,close_hour:20},photos:[]},{id:2,name:"Salón Norte",slug:"norte",settings:{address:"Centro",capacity:50,weekday_price:10000,weekend_price:10000,holiday_price:10000,open_hour:10,close_hour:20},photos:[]}];
 const m=await mount(<Catalogue venues={venues} navigate={()=>{}}/>);
 try{
 await type(m.container.querySelector<HTMLInputElement>('input[type="search"]')!,"JARDIN");
 assert.equal(m.container.querySelectorAll(".place-card").length,1);assert.match(m.container.textContent||"",/Jardín Azul/);
 await type(m.container.querySelector<HTMLInputElement>('input[type="search"]')!,"sin coincidencias");
 assert.equal(m.container.querySelectorAll(".place-card").length,0);assert.match(m.container.textContent||"",/Limpiar búsqueda/);
 }finally{await m.close();}
});
const {PlatformMeta}=await import("../resources/js/PlatformBranding");
test("la marca general actualiza título y favicon y restaura los originales al desmontar",async()=>{
 const before=document.title;const icon=document.createElement("link");icon.rel="icon";icon.href="/original.ico";document.head.append(icon);
 const m=await mount(<PlatformMeta brand={{name:"Marca demo",page_title:"Reservas",favicon_url:"/demo.png"}}/>);
 assert.equal(document.title,"Marca demo · Reservas");assert.equal(document.querySelector<HTMLLinkElement>('link[rel="icon"]')!.getAttribute("href"),"/demo.png");
 await m.close();assert.equal(document.title,before);assert.ok(document.head.contains(icon));icon.remove();
});
const {EmbeddedPayment,loadPaymentSdk}=await import('../resources/js/EmbeddedPayments');
const {PolicyAcceptance}=await import('../resources/js/ReservationPolicy');
const {PasswordRecovery}=await import('../resources/js/PasswordRecovery');
test('PayPal usa la orden del servidor, captura una sola vez y desmonta el botón oficial',async()=>{
 const previous=globalThis.fetch;let callbacks:any,closed=0,requests=0,resolveCapture:any,paid:any;
 globalThis.fetch=(async()=>{requests++;return new Promise(resolve=>{resolveCapture=resolve;});}) as any;
 const a={id:'sdk-attempt',external_id:'SERVER-ORDER',provider:'paypal',amount:45000,sdk:{client_id:'dom-test-client'}};
 const m=await mount(<EmbeddedPayment attempt={a} onPaid={value=>{paid=value;}} onError={message=>assert.fail(message)}/>);
 try{const script=Array.from(document.querySelectorAll('script')).find(x=>x.src.startsWith('https://www.paypal.com/sdk/js'))!;assert.ok(script);const namespace=script.getAttribute('data-namespace')!;(window as any)[namespace]={Buttons:(opts:any)=>{callbacks=opts;return {render:async()=>{},close:()=>{closed++;}};}};
 await act(async()=>{script.dispatchEvent(new window.Event('load'));});assert.equal(callbacks.createOrder(),'SERVER-ORDER');
 let first:any;await act(async()=>{first=callbacks.onApprove();callbacks.onApprove();});assert.equal(requests,1);await act(async()=>{resolveCapture(new Response(JSON.stringify({...a,status:'paid'})));await first;});assert.equal(paid.status,'paid');
 }finally{await m.close();globalThis.fetch=previous;}assert.equal(closed,1);
});
test('el consentimiento de pagos no reembolsables empieza sin marcar y debe elegirse',async()=>{
 let accepted=false;function Form(){const [value,setValue]=useState(false);return <PolicyAcceptance checked={value} onChange={v=>{accepted=v;setValue(v);}}/>;}
 const m=await mount(<Form/>);try{const input=m.container.querySelector<HTMLInputElement>('input[type=checkbox]')!;assert.equal(input.checked,false);assert.match(m.container.textContent||'',/no son reembolsables/);await act(async()=>input.click());assert.equal(accepted,true);}finally{await m.close();}
});
test('la recuperación elimina el token de la URL y envía la contraseña una sola vez',async()=>{
 const previousFetch=globalThis.fetch,previousForm=globalThis.FormData,previousHistory=(globalThis as any).history;Object.assign(globalThis,{history:window.history});window.history.replaceState({},'','/recuperar#restablecer='+('a'.repeat(64))+'&correo=cliente%40example.com');globalThis.FormData=dom.window.FormData as any;let calls=0,payload:any,complete:any;
 globalThis.fetch=(async(_url:any,init:any)=>{calls++;payload=JSON.parse(init.body);return new Promise(resolve=>{complete=resolve;});}) as any;
 const m=await mount(<PasswordRecovery owner={false} onClose={()=>{}} onBack={()=>{}}/>);
 try{assert.equal(location.search,'');assert.equal(location.hash,'');assert.equal(m.container.querySelector<HTMLInputElement>('[name=email]')!.value,'cliente@example.com');await type(m.container.querySelector('[name=password]')!,'NuevaPassword123');await type(m.container.querySelector('[name=password_confirmation]')!,'NuevaPassword123');const form=m.container.querySelector('form')!;await act(async()=>{form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));});assert.equal(calls,1);assert.equal(payload.token,'a'.repeat(64));assert.equal(payload.email,'cliente@example.com');await act(async()=>{complete(new Response(JSON.stringify({message:'Contraseña actualizada.'})));});assert.match(m.container.textContent||'',/Contraseña actualizada/);assert.equal(m.container.querySelector('form'),null);
 }finally{await m.close();globalThis.fetch=previousFetch;globalThis.FormData=previousForm;(globalThis as any).history=previousHistory;window.history.replaceState({},'','/');}
});
test('el SDK oficial de Mercado Pago envía solo el formulario tokenizado al endpoint del intento',async()=>{
 const previous=globalThis.fetch;let config:any,paid:any;globalThis.fetch=(async(url:any,init:any)=>{assert.equal(url,'/api/checkout/mp-dom/card');const body=JSON.parse(init.body);assert.equal(body.token,'tokenized');return new Response(JSON.stringify({id:'mp-dom',status:'pending'}));}) as any;
 const a={id:'mp-dom',provider:'mercadopago',amount:45000,sdk:{public_key:'dom-public-key'}};const m=await mount(<EmbeddedPayment attempt={a} onPaid={value=>{paid=value;}} onError={message=>assert.fail(message)}/>);
 try{const script=Array.from(document.querySelectorAll('script')).find(x=>x.src==='https://sdk.mercadopago.com/js/v2')!;assert.ok(script);(window as any).MercadoPago=class{bricks(){return {create:async(_kind:any,_id:any,opts:any)=>{config=opts;return {unmount:()=>{}};}};}};await act(async()=>script.dispatchEvent(new window.Event('load')));assert.equal(config.initialization.amount,450);await act(async()=>{await config.callbacks.onSubmit({formData:{token:'tokenized',payment_method_id:'visa',installments:1}});});assert.equal(paid.status,'pending');
 }finally{await m.close();globalThis.fetch=previous;}
});
const {GatewaySettings}=await import('../resources/js/Payments');
test('una pasarela ilegible exige reemplazo explícito y el formulario bloquea envíos duplicados',async()=>{
 const previousFetch=globalThis.fetch;let saves=0,body:any,finish:any;
 globalThis.fetch=(async(_url:any,init:any)=>{if(init.method==='PUT'){saves++;body=JSON.parse(init.body);return new Promise(resolve=>{finish=resolve;});}return new Response(JSON.stringify([{provider:'paypal',enabled:true,sandbox:true,unreadable:true,credential_warning:'No se pueden descifrar las credenciales guardadas.',public_fields:{},configured_keys:[],webhook_url:'https://test.invalid/webhook/1'}]));}) as any;
 const m=await mount(<GatewaySettings venue={{id:1,name:'Local',slug:'local',settings:{},published:true}}/>);
 try{const text=()=>m.container.textContent||'';assert.match(text(),/Es necesario recuperar las credenciales/);const input=m.container.querySelector<HTMLInputElement>('input[type=text]')!;assert.equal(input.disabled,true);const replace=Array.from(m.container.querySelectorAll<HTMLLabelElement>('label')).find(x=>x.textContent?.includes('Reemplazar credenciales'))!.querySelector<HTMLInputElement>('input')!;assert.equal(replace.checked,false);await act(async()=>replace.click());assert.equal(input.disabled,false);const form=m.container.querySelector('form')!;await act(async()=>{form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));});assert.equal(saves,1);assert.equal(body.replace,true);await act(async()=>{finish(new Response(JSON.stringify({message:'Falta configurar: client_secret'}),{status:422}));});assert.match(text(),/Falta configurar: client_secret/);assert.equal(input.disabled,false);
 }finally{await m.close();globalThis.fetch=previousFetch;}
});
test('un fallo al cargar pasarelas no permite guardar un formulario vacío y ofrece reintentar',async()=>{
 const previousFetch=globalThis.fetch;let saves=0;globalThis.fetch=(async(_url:any,init:any)=>{if(init.method==='PUT')saves++;return new Response(JSON.stringify({message:'Server Error'}),{status:500});}) as any;
 const m=await mount(<GatewaySettings venue={{id:2,name:'Local',slug:'local2',settings:{},published:true}}/>);
 try{assert.match(m.container.textContent||'',/No se pudo cargar la configuración/);assert.match(m.container.textContent||'',/Reintentar carga/);const save=Array.from(m.container.querySelectorAll<HTMLButtonElement>('button')).find(x=>x.textContent?.includes('Guardar pasarela'))!;assert.equal(save.disabled,true);const form=m.container.querySelector('form')!;await act(async()=>form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true})));assert.equal(saves,0);}finally{await m.close();globalThis.fetch=previousFetch;}
});
const {CheckoutButton}=await import('../resources/js/Payments');
test('el checkout muestra fecha local y la restricción antes de enviar un pago no disponible',async()=>{
 const previousFetch=globalThis.fetch;let posts=0;
 globalThis.fetch=(async(url:any,init:any)=>{if(init.method==='POST')posts++;return new Response(JSON.stringify({booking:{id:'near-event',venue_name:'Jardín real',order_number:'EV-NEAR',starts_at:'2030-05-20T16:04:00Z',timezone:'America/Mexico_City'},providers:[{provider:'paypal',sandbox:true,available:false,unavailable_reason:'Deben quedar al menos 5 minutos. Revisa la fecha de tu reserva.'}]}));}) as any;
 const b={id:'near-event',status:'hold',expires_at:'2099-01-01T00:00:00Z',starts_at:'2030-05-20T16:04:00Z',deposit:45000,paid_total:0,balance_due:150000,quote:{timezone:'America/Mexico_City'}};
 const m=await mount(<CheckoutButton booking={b}/>);try{const open=Array.from(m.container.querySelectorAll<HTMLButtonElement>('button')).find(x=>x.textContent?.includes('Pagar reserva'))!;await act(async()=>open.click());assert.match(m.container.textContent||'',/Jardín real/);assert.match(m.container.textContent||'',/EV-NEAR/);assert.match(m.container.textContent||'',/America\/Mexico_City/);assert.match(m.container.textContent||'',/al menos 5 minutos/);const policy=m.container.querySelector<HTMLInputElement>('input[type=checkbox]')!;await act(async()=>policy.click());const button=Array.from(m.container.querySelectorAll<HTMLButtonElement>('button')).find(x=>x.textContent?.includes('Preparar pago'))!;assert.equal(button.disabled,true);const form=m.container.querySelector('form')!;await act(async()=>form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true})));assert.equal(posts,0);}finally{await m.close();globalThis.fetch=previousFetch;}
});
test('se selecciona una pasarela disponible y OXXO indica por qué no puede usarse cerca del evento',async()=>{
 const previousFetch=globalThis.fetch;
 globalThis.fetch=(async()=>new Response(JSON.stringify({providers:[{provider:'oxxo',available:false,unavailable_reason:'OXXO necesita al menos 35 minutos antes del evento.'},{provider:'paypal',sandbox:true,available:true}]}))) as any;
 const m=await mount(<CheckoutButton booking={{id:'near-oxxo',status:'hold',expires_at:'2099-01-01T00:00:00Z',deposit:45000,paid_total:0,balance_due:150000}}/>);
 try{await act(async()=>Array.from(m.container.querySelectorAll<HTMLButtonElement>('button')).find(x=>x.textContent?.includes('Pagar reserva'))!.click());assert.equal(m.container.querySelector<HTMLInputElement>('input[type=radio][value=paypal]')!.checked,true);assert.equal(m.container.querySelector<HTMLInputElement>('input[type=radio][value=oxxo]')!.disabled,true);assert.equal(m.container.querySelector('select'),null);assert.match(m.container.textContent||'',/35 minutos/);}finally{await m.close();globalThis.fetch=previousFetch;}
});
const {PaymentReturn,useAutomaticPaymentStatus}=await import('../resources/js/Payments');
test('la pantalla del cliente no pide verificar con el proveedor ni muestra instrucciones técnicas antiguas',async()=>{
 const previous=globalThis.fetch;const oldUrl=location.href;window.history.replaceState({},'','/pago/customer-pending');const a={id:'customer-pending',provider:'paypal',status:'unknown',amount:45000,expires_at:'2099-01-01T00:00:00Z',review_reason:'Revisa la cuenta del proveedor antes de volver a cobrar.',customer_message:'Estamos comprobando el estado de tu pago automáticamente.'};
 globalThis.fetch=(async()=>new Response(JSON.stringify(a))) as any;
 const m=await mount(<PaymentReturn id={a.id} navigate={()=>{}}/>);try{const text=m.container.textContent||'';assert.match(text,/automáticamente/);assert.doesNotMatch(text,/Verificar con el proveedor|cuenta del proveedor|confirmó la creación|checkout con el proveedor/);assert.ok(Array.from(m.container.querySelectorAll('button')).some(x=>x.textContent?.includes('Ver mis reservas')));}finally{await m.close();globalThis.fetch=previous;window.history.replaceState({},'',oldUrl);}
});
test('la actualización automática consulta el estado sin emitir capturas y se detiene al desmontar',async()=>{
 const previous=globalThis.fetch,previousTimeout=window.setTimeout,previousClear=window.clearTimeout;const timers=new Map<number,()=>any>();let index=0;let calls:string[]=[];
 window.setTimeout=((fn:any)=>{const id=++index;timers.set(id,fn);return id;}) as any;window.clearTimeout=((id:number)=>timers.delete(id)) as any;
 globalThis.fetch=(async(url:any)=>{calls.push(url);return new Response(JSON.stringify({id:'auto-payment',status:'paid',provider:'paypal',expires_at:'2099-01-01T00:00:00Z'}));}) as any;
 function Screen(){const [a,setA]=useState<any>({id:'auto-payment',status:'unknown',expires_at:'2099-01-01T00:00:00Z'});useAutomaticPaymentStatus(a,setA);return <p>{a.status}</p>;}
 const m=await mount(<Screen/>);try{const tick=timers.values().next().value!;await act(async()=>{await tick();});assert.deepEqual(calls,['/api/checkout/auto-payment/sync']);assert.match(m.container.textContent||'',/paid/);await m.close();await act(async()=>{await tick();});assert.equal(calls.length,1);}finally{globalThis.fetch=previous;window.setTimeout=previousTimeout;window.clearTimeout=previousClear;}
});
const {EmailVerification}=await import('../resources/js/EmailVerification');
test('cambiar importe vuelve al formulario y envía el anticipo elegido después de preparar el total',async()=>{
 const previous=globalThis.fetch;const sent:any[]=[];globalThis.fetch=(async(url:any,init:any)=>{
 if(url.endsWith('payment-options'))return new Response(JSON.stringify({booking:{deposit:30000,paid_total:0,balance_due:100000},providers:[{provider:'paypal',available:true}]}));
 const body=JSON.parse(init.body);sent.push(body);return new Response(JSON.stringify({id:'switch-'+sent.length,provider:'paypal',status:'pending',amount:body.purpose==='balance'?100000:30000,expires_at:'2099-01-01T00:00:00Z',checkout:{},sdk:{}}));
 }) as any;
 const m=await mount(<CheckoutButton booking={{id:'switch-booking',status:'hold',expires_at:'2099-01-01T00:00:00Z',deposit:30000,paid_total:0,balance_due:100000}}/>);
 try{
  await act(async()=>m.container.querySelector<HTMLButtonElement>('button')!.click());const total=m.container.querySelector<HTMLInputElement>('input[type=radio][value=balance]')!;
  await act(async()=>total.click());await act(async()=>m.container.querySelector<HTMLInputElement>('input[type=checkbox]')!.click());
  await act(async()=>m.container.querySelector('form')!.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true})));assert.equal(sent[0].purpose,'balance');assert.match(m.container.textContent||'',/1,000/);
  const change=Array.from(m.container.querySelectorAll<HTMLButtonElement>('button')).find(b=>b.textContent==='Cambiar importe')!;assert.ok(change);await act(async()=>change.click());
  const next=m.container.querySelector<HTMLInputElement>('input[type=radio][value=deposit]')!;await act(async()=>next.click());await act(async()=>m.container.querySelector<HTMLInputElement>('input[type=checkbox]')!.click());
  await act(async()=>m.container.querySelector('form')!.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true})));assert.equal(sent[1].purpose,'deposit');assert.match(m.container.querySelector('.checkout-total')?.textContent||'',/300/);
 }finally{await m.close();globalThis.fetch=previous;}
});
test('un 429 de preparar pago muestra espera en español y bloquea reenvíos durante el plazo',async()=>{
 const previous=globalThis.fetch;let posts=0;globalThis.fetch=(async(url:any,init:any)=>{if(init.method==='POST'){posts++;return new Response(JSON.stringify({message:'Too Many Attempts.'}),{status:429,headers:{'Retry-After':'12'}});}return new Response(JSON.stringify({providers:[{provider:'paypal',available:true}]}));}) as any;
 const m=await mount(<CheckoutButton booking={{id:'cooldown',status:'hold',expires_at:'2099-01-01T00:00:00Z',deposit:30000,paid_total:0,balance_due:100000}}/>);
 try{await act(async()=>m.container.querySelector<HTMLButtonElement>('button')!.click());await act(async()=>m.container.querySelector<HTMLInputElement>('input[type=checkbox]')!.click());const form=m.container.querySelector('form')!;await act(async()=>form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true})));assert.match(m.container.textContent||'',/Reintentar en 12 s/);assert.doesNotMatch(m.container.textContent||'',/Too Many/);assert.equal(m.container.querySelector<HTMLButtonElement>('form button')!.disabled,true);await act(async()=>form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true})));assert.equal(posts,1);}finally{await m.close();globalThis.fetch=previous;}
});
test('verificar correo exige confirmación explícita, elimina el token de URL y evita doble envío',async()=>{
 const previous=globalThis.fetch,oldHistory=(globalThis as any).history;Object.assign(globalThis,{history:window.history});window.history.replaceState({},'','/verificar#verificar='+('v'.repeat(64))+'&cuenta=8');let posts=0,finish:any,verified=0;
 globalThis.fetch=(async(url:any,init:any)=>{posts++;assert.equal(url,'/api/email/verify');assert.equal(JSON.parse(init.body).account,8);return new Promise(resolve=>{finish=resolve;});}) as any;
 const m=await mount(<EmailVerification user={null} owner={false} onVerified={()=>verified++}/>);
 try{assert.equal(location.hash,'');assert.equal(posts,0);const button=m.container.querySelector<HTMLButtonElement>('button')!;await act(async()=>{button.click();button.click();});assert.equal(posts,1);await act(async()=>finish(new Response(JSON.stringify({message:'Correo verificado.'}))));assert.equal(verified,1);assert.equal(m.container.querySelector('button'),null);}finally{await m.close();globalThis.fetch=previous;(globalThis as any).history=oldHistory;window.history.replaceState({},'','/');}
});
const {EmailDesignEditor}=await import('../resources/js/EmailDesignEditor');
function emailDesignFixture(){const copy={subject:'Reserva {{orden}}',eyebrow:'TU RESERVA',title:'Reserva confirmada',intro:'Hola {{cliente}}',button:'Ver reserva',closing:'Te esperamos.'};return {brand_name:'Mi jardín',tagline:'Celebra con nosotros',logo_url:'',primary:'#285e48',accent:'#c2a46d',background:'#f1f4ef',surface:'#ffffff',text:'#18382c',muted:'#66766e',font:'sans',alignment:'left',radius:16,width:600,logo_width:140,font_size:16,footer:'Gracias',support_email:'',support_phone:'',show_location:true,show_extras:true,templates:{confirmation:{...copy},verification:{...copy,title:'Verifica tu correo'},recovery:{...copy,title:'Recupera tu cuenta'}}};}
test('el editor de correos muestra vista previa aislada, cambia textos y guarda una sola vez',async()=>{
 const oldFetch=globalThis.fetch;let saves=0,payload:any,finish:any;const settings=emailDesignFixture();
 globalThis.fetch=(async(url:any,init:any)=>{if(init.method==='PUT'){saves++;payload=JSON.parse(init.body);return new Promise(resolve=>{finish=resolve;});}if(url.endsWith('/preview'))return new Response(JSON.stringify({subject:'Ejemplo',html:'<html><body>Reserva de María</body></html>',text:'Reserva de María'}));return new Response(JSON.stringify({settings,defaults:settings,types:['confirmation']}));}) as any;
 const m=await mount(<EmailDesignEditor venue={{id:1,slug:'jardin',name:'Jardín',settings:{},published:true}}/>);
 try{const frame=m.container.querySelector<HTMLIFrameElement>('iframe')!;assert.equal(frame.getAttribute('sandbox'),'');const title=Array.from(m.container.querySelectorAll('label')).find(x=>x.textContent?.startsWith('Título principal'))!.querySelector('input')!;await type(title,'¡Nos vemos pronto!');const save=Array.from(m.container.querySelectorAll<HTMLButtonElement>('button')).find(x=>x.textContent?.includes('Guardar diseño'))!;await act(async()=>{save.click();save.click();});assert.equal(saves,1);assert.equal(payload.settings.templates.confirmation.title,'¡Nos vemos pronto!');await act(async()=>finish(new Response(JSON.stringify({settings:payload.settings,defaults:settings,types:['confirmation']}))));assert.match(m.container.textContent||'',/Diseño guardado/);await act(async()=>m.container.querySelector<HTMLButtonElement>('[aria-label="Vista de celular"]')!.click());assert.equal(frame.style.width,'375px');assert.equal(save.disabled,true);}finally{await m.close();globalThis.fetch=oldFetch;}
});
test('solo el editor de plataforma ofrece las plantillas de verificación y recuperación',async()=>{
 const old=globalThis.fetch;const s=emailDesignFixture();globalThis.fetch=(async()=>new Response(JSON.stringify({settings:s,defaults:s,types:['verification','recovery','confirmation']}))) as any;
 const m=await mount(<EmailDesignEditor platformAdmin/>);try{assert.match(m.container.textContent||'',/Verificación de correo/);assert.match(m.container.textContent||'',/Recuperación de contraseña/);assert.ok(m.container.querySelector('.email-scope'));assert.match(m.container.textContent||'',/no envía correos/);}finally{await m.close();globalThis.fetch=old;}
});
const {VenueSiteSettings}=await import('../resources/js/VenueSiteSettings');
const {readReservationSelection,reservationDestination}=await import('../resources/js/ReservationTransfer');
test('el dueño puede configurar el dominio pero la activación está reservada al administrador general',async()=>{
 const previous=globalThis.fetch;globalThis.fetch=(async()=>new Response(JSON.stringify({site:{hostname:'magnolia.example.com',enabled:false,active:false,dns_fresh:false,https_fresh:false,txt_name:'_encuentro.magnolia.example.com',txt_value:'encuentro-verification=demo'},general_enabled:true,can_activate:false,canonical_url:'https://reservas.example.com/local/magnolia'}))) as any;
 const m=await mount(<VenueSiteSettings venue={{id:1,slug:'magnolia',name:'Magnolia',published:true,settings:{}}}/>);
 try{assert.match(m.container.textContent||'',/activación corresponde al administrador general/);assert.match(m.container.textContent||'',/encuentro-verification=demo/);assert.equal(m.container.querySelector('input[type=checkbox]'),null);assert.equal(Array.from(m.container.querySelectorAll<HTMLButtonElement>('button')).find(b=>b.textContent?.includes('Comprobar HTTPS'))!.disabled,true);}finally{await m.close();globalThis.fetch=previous;}
});
test('trasladar una selección al portal seguro conserva fecha y extras sin aceptar precios del navegador',()=>{
 const selection={date:'2030-12-20',start:14,hours:8,guests:40,extras:[{id:'chairs',quantity:40}]};const url=reservationDestination('https://reservas.example.com/local/magnolia',selection);assert.deepEqual(readReservationSelection(new URL(url).hash),selection);assert.equal(readReservationSelection('#reserva='+encodeURIComponent(JSON.stringify({...selection,hours:999,total:1}))),null);assert.equal(readReservationSelection('#reserva=malformado'),null);
 const forged=readReservationSelection('#reserva='+encodeURIComponent(JSON.stringify({...selection,total:1,policy_accepted:true}))) as any;assert.equal(forged.total,undefined);assert.equal(forged.policy_accepted,undefined);
});

const {PaymentChoices}=await import('../resources/js/PaymentChoices');
const {PageIdentityLink}=await import('../resources/js/PlatformBranding');
const {DesignEditor}=await import('../resources/js/Design');
test('las tarjetas de pago cambian método e importe y bloquean medios no disponibles',async()=>{
 let selected='',amount='';function Screen(){const [provider,setProvider]=useState('paypal'),[purpose,setPurpose]=useState('deposit');return <PaymentChoices booking={{deposit:30000,paid_total:0,balance_due:100000}} options={[{provider:'paypal',sandbox:true},{provider:'mercadopago'},{provider:'oxxo',available:false,unavailable_reason:'La ficha requiere más tiempo'}]} provider={provider} purpose={purpose} busy={false} onProvider={v=>{selected=v;setProvider(v);}} onPurpose={v=>{amount=v;setPurpose(v);}}/>;}
 const m=await mount(<Screen/>);try{assert.equal(m.container.querySelector('select'),null);assert.equal(m.container.querySelectorAll('fieldset legend').length,2);await act(async()=>m.container.querySelector<HTMLInputElement>('input[value=mercadopago]')!.click());assert.equal(selected,'mercadopago');assert.equal(m.container.querySelector<HTMLInputElement>('input[value=paypal]')!.checked,false);await act(async()=>m.container.querySelector<HTMLInputElement>('input[value=balance]')!.click());assert.equal(amount,'balance');const blocked=m.container.querySelector<HTMLInputElement>('input[value=oxxo]')!;await act(async()=>blocked.click());assert.equal(selected,'mercadopago');assert.equal(blocked.disabled,true);assert.match(document.getElementById(blocked.getAttribute('aria-describedby')!)!.textContent||'',/más tiempo/);}finally{await m.close();}
});
test('el acceso a identidad general solo aparece al administrador en el portal de dueños',async()=>{
 let opened=0;const hidden=await mount(<PageIdentityLink owner admin={false} onOpen={()=>opened++}/>);assert.equal(hidden.container.querySelector('button'),null);await hidden.close();const client=await mount(<PageIdentityLink owner={false} admin onOpen={()=>opened++}/>);assert.equal(client.container.querySelector('button'),null);await client.close();const admin=await mount(<PageIdentityLink owner admin onOpen={()=>opened++}/>);try{assert.match(admin.container.textContent||'',/Identidad de página/);await act(async()=>admin.container.querySelector('button')!.click());assert.equal(opened,1);}finally{await admin.close();}
});
test('el editor del local oculta identidad independiente sin borrar sus datos históricos',async()=>{
 const old=globalThis.fetch;let saved:any;globalThis.fetch=(async(url:any,init:any)=>{if(init.method==='PUT'){saved=JSON.parse(init.body);return new Response(JSON.stringify({ok:true}));}return new Response(JSON.stringify(url.endsWith('/assets')?[]:{draft:{brand_name:'Local',page_title:'Título anterior',favicon_id:4}}));}) as any;
 const m=await mount(<DesignEditor venue={{id:1,slug:'local',name:'Local',settings:{},published:true}} renderPreview={()=>null}/>);try{assert.doesNotMatch(m.container.textContent||'',/Identidad de página independiente|Título en tu dominio propio|favicon/);assert.equal(m.container.querySelectorAll('input[type=file]').length,1);const save=Array.from(m.container.querySelectorAll<HTMLButtonElement>('button')).find(b=>b.textContent?.includes('Guardar borrador'))!;await act(async()=>save.click());assert.equal(saved.page_title,'Título anterior');assert.equal(saved.favicon_id,4);}finally{await m.close();globalThis.fetch=old;}
});
