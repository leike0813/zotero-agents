// THROWAWAY HOST CAPABILITY PROTOTYPE. Never import from production.
import fixtures from "./fixtures.json";

type Step = { name: string; passed: boolean; observation?: string };
const encoder = new TextEncoder();
const decode = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const encode = (b: Uint8Array) =>
  btoa(String.fromCharCode(...b)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

export async function probeCrypto(hostCrypto: Crypto): Promise<Step[]> {
  const steps: Step[] = [];
  const add = (name: string, passed: boolean, observation?: string) =>
    steps.push({ name, passed, ...(observation ? { observation } : {}) });
  const importKey = (jwk: JsonWebKey) => hostCrypto.subtle.importKey(
    "jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"],
  );
  const verify = (key: CryptoKey, input: string, signature: string) =>
    hostCrypto.subtle.verify("RSASSA-PKCS1-v1_5", key, decode(signature), encoder.encode(input));
  const random = () => encode(hostCrypto.getRandomValues(new Uint8Array(32)));
  add("random-state-nonce", random().length === 43 && random() !== random());
  const challenge = encode(new Uint8Array(await hostCrypto.subtle.digest("SHA-256",
    encoder.encode("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"))));
  add("pkce-rfc7636-s256", challenge === "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  const rfcKey = await importKey(fixtures.rfc.jwk);
  add("rfc7515-rs256-valid", await verify(rfcKey, fixtures.rfc.input, fixtures.rfc.signature));
  const badSignature = decode(fixtures.rfc.signature);
  badSignature[0] ^= 1;
  add("rfc7515-rs256-invalid", !(await verify(rfcKey, fixtures.rfc.input, encode(badSignature))));

  // Controlled JWKS transport, deliberately never contacting an identity service.
  let reads = 0;
  let serverKeys = [fixtures.keys[0]];
  let cache: typeof serverKeys | undefined;
  const imported = new Map<string, CryptoKey>();
  async function readKeys() { reads++; cache = [...serverKeys]; }
  async function validate(token: string) {
    const [h, p, signature] = token.split(".");
    const header = JSON.parse(new TextDecoder().decode(decode(h)));
    if (header.alg !== "RS256") return "algorithm";
    if (!cache) await readKeys();
    let jwk = cache!.find((key) => key.kid === header.kid);
    if (!jwk) { await readKeys(); jwk = cache!.find((key) => key.kid === header.kid); }
    if (!jwk) return "key";
    let key = imported.get(jwk.kid);
    if (!key) { key = await importKey(jwk); imported.set(jwk.kid, key); }
    if (!(await verify(key, `${h}.${p}`, signature))) return "signature";
    const claims = JSON.parse(new TextDecoder().decode(decode(p)));
    if (claims.iss !== fixtures.expected.issuer) return "issuer";
    if (claims.aud !== fixtures.expected.audience) return "audience";
    if (!Number.isFinite(claims.exp) || claims.exp <= fixtures.expected.now) return "expiry";
    if (claims.nonce !== fixtures.expected.nonce) return "nonce";
    return "accepted";
  }
  for (const item of fixtures.cases) {
    if (item.name === "rotated") serverKeys = fixtures.keys;
    const before = reads;
    const result = await validate(item.token);
    add(`jwt-${item.name}`, result === item.expected, result);
    if (item.name === "audience") add("jwks-cache-reuse", reads === 1);
    if (item.name === "rotated") add("jwks-rotation-one-refresh", reads - before === 1);
    if (item.name === "missing-key") add("jwks-unknown-kid-one-refresh", reads - before === 1);
  }
  return steps;
}

export async function probeLoopback(hostCrypto: Crypto, zotero: any): Promise<Step[]> {
  const g = globalThis as any;
  const Cc = g.Components?.classes || g.Cc;
  const Ci = g.Components?.interfaces || g.Ci;
  const tm = Cc["@mozilla.org/thread-manager;1"].getService(Ci.nsIThreadManager).mainThread;
  const steps: Step[] = [];
  const add = (name: string, passed: boolean, observation?: string) =>
    steps.push({ name, passed, ...(observation ? { observation } : {}) });
  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
  const newSocket = () => Cc["@mozilla.org/network/server-socket;1"].createInstance(Ci.nsIServerSocket);
  const random = () => encode(hostCrypto.getRandomValues(new Uint8Array(32)));
  const open = (preferred = 0) => {
    let socket = newSocket();
    let fallback = false;
    try { socket.init(preferred, true, 8); }
    catch {
      socket.close(); socket = newSocket(); socket.init(0, true, 8); fallback = true;
    }
    const port = Number(socket.port);
    const state = random();
    const uri = `http://127.0.0.1:${port}/auth/callback`;
    let generation = 1;
    let phase = "active";
    let commits = 0;
    let callbacks = 0;
    let closedObserved = false;
    const accepted = new Map<any, () => void>();
    function stop(reason = "canceled") {
      generation++; phase = reason;
      socket.close();
      for (const [transport, abort] of accepted) {
        abort(); transport.close(0x804b0002);
      }
      accepted.clear();
    }
    socket.asyncListen({
      onSocketAccepted(_socket: any, transport: any) {
        if (phase !== "active" && phase !== "completed" && phase !== "exchanging") {
          transport.close(0x804b0002); return;
        }
        const input = transport.openInputStream(0, 0, 0);
        const output = transport.openOutputStream(0, 0, 0);
        const scriptable = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsIScriptableInputStream);
        scriptable.init(input);
        const asyncInput = input.QueryInterface(Ci.nsIAsyncInputStream);
        let raw = "";
        let finished = false;
        let timer: ReturnType<typeof setTimeout>;
        const abort = () => {
          if (finished) return;
          finished = true; clearTimeout(timer);
          asyncInput.asyncWait(null, 0, 0, tm);
          input.close(); output.close();
        };
        accepted.set(transport, abort);
        const respond = () => {
          if (finished) return;
          finished = true; clearTimeout(timer);
          asyncInput.asyncWait(null, 0, 0, tm);
          let status = 400;
          try {
            const match = /^GET (\S+) HTTP\/1\.[01]\r\n/.exec(raw);
            const target = match ? new URL(match[1], uri) : undefined;
            if (target?.pathname === "/auth/callback") {
              callbacks++;
              if (phase !== "active") status = 409;
              else if (target.searchParams.get("state") === state && target.searchParams.get("code") === "prototype-code") {
                status = 200; phase = "exchanging";
                const observedGeneration = generation;
                void sleep(250).then(() => {
                  if (generation === observedGeneration && phase === "exchanging") {
                    commits++; phase = "completed";
                  }
                });
              }
            }
            // No URL, header, code, state or verifier leaves this transient reader.
            const body = status === 200 ? "Synthetic callback received. No account was accessed." : "Synthetic callback rejected.";
            const response = `HTTP/1.1 ${status} Result\r\nContent-Type: text/plain\r\nContent-Length: ${body.length}\r\nConnection: close\r\nCache-Control: no-store\r\n\r\n${body}`;
            output.write(response, response.length); output.close(); input.close();
          } catch { transport.close(0x804b0002); }
          accepted.delete(transport); raw = "";
        };
        const pump = () => {
          if (finished) return;
          try {
            const available = Number(scriptable.available());
            if (available > 0) raw += scriptable.read(Math.min(available, 8192 - raw.length));
            if (raw.includes("\r\n\r\n") || raw.length >= 8192) { respond(); return; }
            asyncInput.asyncWait({
              QueryInterface: g.ChromeUtils.generateQI([Ci.nsIInputStreamCallback]),
              onInputStreamReady: pump,
            }, 0, 0, tm);
          } catch { abort(); accepted.delete(transport); transport.close(0x804b0002); }
        };
        timer = setTimeout(() => { abort(); accepted.delete(transport); transport.close(0x804b0002); }, 1000);
        pump();
      },
      onStopListening() { closedObserved = true; },
    });
    return {
      port, uri, state, fallback, stop,
      target: (s = state) => `${uri}?state=${encodeURIComponent(s)}&code=prototype-code`,
      snapshot: () => ({ phase, commits, callbacks, activeConnections: accepted.size, closedObserved }),
    };
  };
  const request = async (uri: string) => {
    try {
      const response = await zotero.HTTP.request("GET", uri, { successCodes: false, timeout: 1500 });
      return response.status as number;
    } catch { return 0; }
  };
  const waitUntil = async (predicate: () => boolean, ms = 1500) => {
    const deadline = Date.now() + ms;
    while (!predicate() && Date.now() < deadline) await sleep(10);
    return predicate();
  };
  const listeners: ReturnType<typeof open>[] = [];
  try {
    const occupied = open(); listeners.push(occupied);
    const next = open(occupied.port); listeners.push(next);
    add("occupied-port-fallback", next.fallback && next.port !== occupied.port);
    add("wrong-state-rejected", await request(next.target("wrong")) === 400 && next.snapshot().commits === 0);
    add("old-request-state-rejected", await request(next.target(occupied.state)) === 400 && next.snapshot().commits === 0);
    const originalUri = next.uri;
    add("valid-callback-http", await request(next.target()) === 200);
    add("valid-callback-single-commit", await waitUntil(() => next.snapshot().commits === 1));
    add("duplicate-callback-rejected", await request(next.target()) === 409 && next.snapshot().commits === 1);
    add("attempt-uri-stable", originalUri === next.uri && new URL(next.uri).hostname === "127.0.0.1");
    next.stop();
    add("listener-stop-observed", await waitUntil(() => next.snapshot().closedObserved));
    add("closed-listener-reconnect-refused", await request(next.target()) === 0);

    for (const reason of ["canceled", "window_closed", "shutdown", "timeout"]) {
      const attempt = open(); listeners.push(attempt);
      const win = reason === "window_closed"
        ? zotero.getMainWindow().openDialog("about:blank", "siwc-prototype", "chrome,dialog=no,width=200,height=100")
        : undefined;
      if (win) {
        await sleep(100);
        win.addEventListener("unload", () => attempt.stop(reason), { once: true });
      }
      const status = await request(attempt.target());
      if (win) {
        win.close();
        await waitUntil(() => attempt.snapshot().closedObserved);
      } else if (reason === "timeout") {
        setTimeout(() => attempt.stop(reason), 10);
      } else { attempt.stop(reason); }
      await sleep(300);
      add(`late-result-${reason}-rejected`, status === 200 && attempt.snapshot().commits === 0 && attempt.snapshot().phase === reason);
    }

    const browser = open(); listeners.push(browser);
    // Listener is already active. Only synthetic public data goes to the system browser.
    zotero.launchURL(browser.target());
    add("system-browser-loopback", await waitUntil(() => browser.snapshot().commits === 1, 15000));
    browser.stop();
    add("browser-connections-drained", browser.snapshot().activeConnections === 0 && await waitUntil(() => browser.snapshot().closedObserved));

    const stalled = open(); listeners.push(stalled);
    const socketService = Cc["@mozilla.org/network/socket-transport-service;1"].getService(Ci.nsISocketTransportService);
    const client = socketService.createTransport([], "127.0.0.1", stalled.port, null, null);
    const clientOutput = client.openOutputStream(0, 0, 0);
    const clientInput = client.openInputStream(0, 0, 0).QueryInterface(Ci.nsIAsyncInputStream);
    let peerClosed = false;
    clientInput.asyncWait({
      QueryInterface: g.ChromeUtils.generateQI([Ci.nsIInputStreamCallback]),
      onInputStreamReady() { peerClosed = true; },
    }, Ci.nsIAsyncInputStream.WAIT_CLOSURE_ONLY, 0, tm);
    clientOutput.write("GET /auth/callback HTTP/1.1\r\n", 29);
    add("partial-http-connection-accepted", await waitUntil(() => stalled.snapshot().activeConnections === 1));
    const before = Date.now(); stalled.stop("shutdown");
    add("accepted-connection-peer-closure", await waitUntil(() => peerClosed, 500));
    add("accepted-connection-bounded-close", stalled.snapshot().activeConnections === 0 && await waitUntil(() => stalled.snapshot().closedObserved, 500) && Date.now() - before < 500);
    clientInput.asyncWait(null, 0, 0, tm);
    clientInput.close(); clientOutput.close(); client.close(0x804b0002);
  } finally { for (const listener of listeners) listener.stop("shutdown"); }
  return steps;
}
