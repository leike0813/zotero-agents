import { assert } from "chai";
import { config } from "../../../../package.json";
import { getPref, setPref } from "../../../../src/utils/prefs";
import {
  PiOutboundNetworkError,
  createMozillaPiNativeTransport,
  inspectPiBrokeredWebUrl,
  requestPiBrokeredWebHttp,
} from "../../../../src/modules/piBrokeredWebHttp";

type Mozilla = { classes: any; interfaces: any; utils: any; services: any };

type CapturedRequest = { raw: string; headers: Record<string, string> };

type Fixture = {
  origin: string;
  port: number;
  requests: CapturedRequest[];
  errors: string[];
  stop(): void;
};

function mozilla(): Mozilla {
  const runtime = globalThis as any;
  return {
    classes: runtime.Components?.classes || runtime.Cc,
    interfaces: runtime.Components?.interfaces || runtime.Ci,
    utils: runtime.ChromeUtils || runtime.Components?.utils || runtime.Cu,
    services: runtime.Services,
  };
}

function binaryString(bytes: Uint8Array): string {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return value;
}

function parseRequestHead(raw: string): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const line of raw.split("\r\n").slice(1)) {
    const separator = line.indexOf(":");
    if (separator <= 0) break;
    headers[line.slice(0, separator).trim().toLowerCase()] = line
      .slice(separator + 1)
      .trim();
  }
  return headers;
}

function readRequestHead(transport: any, runtime: Mozilla): Promise<string> {
  const input = transport.openInputStream(0, 0, 0);
  const scriptable = runtime.classes?.[
    "@mozilla.org/scriptableinputstream;1"
  ]?.createInstance(runtime.interfaces?.nsIScriptableInputStream);
  scriptable.init(input);
  return new Promise<string>((resolve) => {
    let raw = "";
    let attempts = 0;
    let settled = false;
    let asyncInput: any;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      asyncInput?.asyncWait(null, 0, 0, runtime.services.tm.mainThread);
      resolve(raw);
    };
    const timer = setTimeout(finish, 3_000);
    const pump = () => {
      if (settled) return;
      attempts += 1;
      try {
        const available = Number(scriptable.available());
        if (available > 0) raw += scriptable.read(available);
      } catch {
        /* No buffered data yet. */
      }
      if (raw.includes("\r\n\r\n") || attempts >= 40) {
        finish();
        return;
      }
      try {
        asyncInput = input.QueryInterface(
          runtime.interfaces?.nsIAsyncInputStream,
        );
        asyncInput.asyncWait(
          {
            QueryInterface: runtime.utils?.generateQI?.([
              runtime.interfaces?.nsIInputStreamCallback,
            ]),
            onInputStreamReady: () => pump(),
          },
          0,
          0,
          runtime.services.tm.mainThread,
        );
      } catch {
        setTimeout(pump, 20);
      }
    };
    pump();
  });
}

function startFixture(): Fixture {
  const runtime = mozilla();
  const socket = runtime.classes?.[
    "@mozilla.org/network/server-socket;1"
  ]?.createInstance(runtime.interfaces?.nsIServerSocket);
  socket.init(0, true, -1);
  const requests: CapturedRequest[] = [];
  const errors: string[] = [];
  const accepted = new Set<any>();
  const stalledOutputs = new Set<any>();
  socket.asyncListen({
    onSocketAccepted(_socket: unknown, transport: any) {
      accepted.add(transport);
      void (async () => {
        let status = 200;
        let contentType = "text/plain";
        let responseBody = "hello";
        let location: string | undefined;
        try {
          const output = transport.openOutputStream(0, 0, 0);
          const raw = await readRequestHead(transport, runtime);
          const path = /^[A-Z]+ (\S+)/.exec(raw)?.[1] || "/";
          requests.push({ raw, headers: parseRequestHead(raw) });
          if (path === "/stall") {
            const head =
              "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: 5\r\nConnection: close\r\n\r\n";
            output.write(head, head.length);
            output.flush?.();
            stalledOutputs.add(output);
            return;
          }
          if (path === "/redirect") {
            status = 302;
            location = "/ok";
            responseBody = "";
          } else if (path === "/json") {
            contentType = "application/json";
            responseBody = '{"ok":true}';
          } else if (path.startsWith("/search?")) {
            contentType = "application/json";
            responseBody = JSON.stringify({
              results: [
                {
                  title: "Fixture",
                  url: "https://example.org",
                  content: "Fixture result",
                },
              ],
            });
          }
          const bytes = new TextEncoder().encode(responseBody);
          let head = `HTTP/1.1 ${status} ${status === 302 ? "Found" : "OK"}\r\n`;
          head += `Content-Type: ${contentType}\r\n`;
          head += `Set-Cookie: fixture=1\r\n`;
          if (location) head += `Location: ${location}\r\n`;
          head += `Content-Length: ${bytes.byteLength}\r\n`;
          head += "Connection: close\r\n\r\n";
          output.write(head, head.length);
          if (bytes.byteLength)
            output.write(binaryString(bytes), bytes.byteLength);
          output.close();
        } catch (error) {
          errors.push(String(error));
          transport.close?.(0);
        }
      })();
    },
    onStopListening() {},
  });
  const port = Number(socket.port);
  return {
    origin: `http://127.0.0.1:${port}`,
    port,
    requests,
    errors,
    stop: () => {
      socket.close();
      for (const output of stalledOutputs) output.close();
      stalledOutputs.clear();
      for (const transport of accepted) transport.close(0x804b0002);
      accepted.clear();
    },
  };
}

async function codeOf(operation: () => Promise<unknown>): Promise<string> {
  try {
    await operation();
  } catch (error) {
    if (error instanceof PiOutboundNetworkError) return error.code;
    throw error;
  }
  throw new Error("expected a PiOutboundNetworkError");
}

describe("Pi brokered web network in real Zotero", function () {
  this.timeout(60_000);

  it("tests a source through the actual plugin sandbox and Backend Manager", async function () {
    const fixture = startFixture();
    const previous = String(getPref("piWebSourcesJson") || "");
    setPref(
      "piWebSourcesJson",
      JSON.stringify([
        {
          id: "fixture-web",
          kind: "searxng",
          label: "Fixture Web",
          enabled: true,
          endpoint: `${fixture.origin}/search`,
          localNetworkApprovedOrigin: fixture.origin,
        },
      ]),
    );
    const plugin = (Zotero as any)[config.addonInstance];
    const opened = plugin.hooks.onPrefsEvent("openBackendManager", {
      window: Zotero.getMainWindow(),
    });
    try {
      let frame: HTMLIFrameElement | null = null;
      for (let i = 0; i < 100; i++) {
        frame = plugin.data.dialog?.window?.document.querySelector(
          "[data-zs-role='backend-manager-dialog-frame']",
        );
        if (
          frame?.contentDocument?.querySelectorAll(".backend-provider-tab")
            .length === 4
        )
          break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      assert.isOk(frame?.contentDocument);
      (
        frame!.contentDocument!.querySelectorAll(
          ".backend-provider-tab",
        )[3] as HTMLElement
      ).click();
      const row = frame!.contentDocument!.querySelector(
        '[data-web-source="fixture-web"]',
      );
      assert.isOk(row);
      (row!.querySelector('[data-web-action="test"]') as HTMLElement).click();
      let status: string | null | undefined;
      for (let i = 0; i < 100; i++) {
        status = frame!
          .contentDocument!.querySelector(
            '[data-web-source="fixture-web"] [data-web-status]',
          )
          ?.getAttribute("data-web-status");
        if (status && status !== "testing") break;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      assert.equal(status, "available");
      assert.lengthOf(fixture.requests, 1);
    } finally {
      plugin.data.dialog?.window?.close();
      await opened;
      setPref("piWebSourcesJson", previous);
      fixture.stop();
    }
  });

  it("fetches anonymously from an approved loopback origin", async function () {
    const fixture = startFixture();
    try {
      const response = await requestPiBrokeredWebHttp({
        url: `${fixture.origin}/ok`,
        localNetworkApprovedOrigin: fixture.origin,
      }).catch((error) => {
        throw new Error(
          `${error.code}; fixture=${JSON.stringify({ errors: fixture.errors, requests: fixture.requests.length })}`,
        );
      });
      assert.equal(response.status, 200);
      assert.equal(new TextDecoder().decode(response.body), "hello");
      assert.equal(response.headers["content-type"], "text/plain");
      assert.notProperty(response.headers, "set-cookie");
      assert.equal(response.finalUrl, `${fixture.origin}/ok`);
      await new Promise((resolve) => setTimeout(resolve, 50));
      assert.lengthOf(fixture.requests, 1);
      assert.notProperty(fixture.requests[0].headers, "cookie");
      assert.notProperty(fixture.requests[0].headers, "referer");
    } finally {
      fixture.stop();
    }
  });

  it("follows a redirect only after validating the next hop", async function () {
    const fixture = startFixture();
    try {
      const redirected = await requestPiBrokeredWebHttp({
        url: `${fixture.origin}/redirect`,
        localNetworkApprovedOrigin: fixture.origin,
      });
      assert.equal(redirected.status, 200);
      assert.equal(redirected.finalUrl, `${fixture.origin}/ok`);
      assert.equal(new TextDecoder().decode(redirected.body), "hello");
    } finally {
      fixture.stop();
    }
  });

  it("resolves the loopback hostname and observes the connected peer", async function () {
    const fixture = startFixture();
    try {
      const origin = `http://localhost:${fixture.port}`;
      const response = await requestPiBrokeredWebHttp({
        url: `${origin}/json`,
        localNetworkApprovedOrigin: origin,
      });
      assert.equal(response.status, 200);
      assert.equal(new TextDecoder().decode(response.body), '{"ok":true}');
    } finally {
      fixture.stop();
    }
  });

  it("aborts an already connected channel", async function () {
    const fixture = startFixture();
    const controller = new AbortController();
    try {
      const response = requestPiBrokeredWebHttp({
        url: `${fixture.origin}/stall`,
        localNetworkApprovedOrigin: fixture.origin,
        signal: controller.signal,
      });
      const failed = codeOf(() => response);
      for (let i = 0; i < 100 && !fixture.requests.length; i++)
        await new Promise((resolve) => setTimeout(resolve, 10));
      assert.lengthOf(fixture.requests, 1);
      controller.abort();
      assert.equal(await failed, "pi_network_aborted");
    } finally {
      controller.abort();
      fixture.stop();
    }
  });

  it("expires the native idle timer on a connected stalled request", async function () {
    const fixture = startFixture();
    try {
      const exchange = createMozillaPiNativeTransport().open({
        url: `${fixture.origin}/stall`,
        method: "GET",
        headers: {},
        signal: new AbortController().signal,
        maxBodyBytes: 1024,
        idleTimeoutMs: 1000,
        totalTimeoutMs: 5000,
      });
      let reader: ReadableStreamDefaultReader | undefined;
      try {
        assert.equal(
          await codeOf(async () => {
            assert.equal((await exchange.head).status, 200);
            reader = exchange.body.getReader();
            await reader.read();
          }),
          "pi_network_idle_timeout",
        );
        assert.lengthOf(fixture.requests, 1);
      } finally {
        reader?.releaseLock();
        exchange.abort();
      }
    } finally {
      fixture.stop();
    }
  });

  it("denies metadata, unapproved local and public cleartext targets before connecting", async function () {
    const fixture = startFixture();
    try {
      assert.equal(
        await codeOf(() =>
          requestPiBrokeredWebHttp({
            url: "https://169.254.169.254/latest/meta-data",
          }),
        ),
        "pi_network_metadata_denied",
      );
      assert.equal(
        await codeOf(() =>
          requestPiBrokeredWebHttp({ url: `${fixture.origin}/ok` }),
        ),
        "pi_network_local_approval_required",
      );
      assert.equal(
        await codeOf(() =>
          requestPiBrokeredWebHttp({ url: "http://example.com/" }),
        ),
        "pi_network_https_required",
      );
      assert.equal(
        await codeOf(() =>
          requestPiBrokeredWebHttp({ url: "http://192.168.255.255/mcp" }),
        ),
        "pi_network_local_approval_required",
      );
    } finally {
      fixture.stop();
    }
  });

  it("fails closed on an offline port and honors abort", async function () {
    const fixture = startFixture();
    const origin = fixture.origin;
    fixture.stop();
    try {
      assert.equal(
        await codeOf(() =>
          requestPiBrokeredWebHttp({
            url: `${origin}/ok`,
            localNetworkApprovedOrigin: origin,
          }),
        ),
        "pi_network_failed",
      );
      const controller = new AbortController();
      const aborted = requestPiBrokeredWebHttp({
        url: `${origin}/ok`,
        localNetworkApprovedOrigin: origin,
        signal: controller.signal,
      });
      controller.abort();
      assert.equal(await codeOf(() => aborted), "pi_network_aborted");
    } finally {
      fixture.stop();
    }
  });
  it("classifies a target for admission before any grant is enforced", async function () {
    const fixture = startFixture();
    try {
      const inspected = await inspectPiBrokeredWebUrl(`${fixture.origin}/ok`);
      assert.equal(inspected.origin, fixture.origin);
      assert.equal(inspected.location, "loopback");
      assert.equal(
        await codeOf(() => inspectPiBrokeredWebUrl("https://169.254.169.254/")),
        "pi_network_metadata_denied",
      );
      assert.equal(
        await codeOf(() => inspectPiBrokeredWebUrl("http://example.com/")),
        "pi_network_https_required",
      );
    } finally {
      fixture.stop();
    }
  });

  it("reports a public location for a public literal without a grant", async function () {
    const inspected = await inspectPiBrokeredWebUrl("https://93.184.216.34/a");
    assert.equal(inspected.origin, "https://93.184.216.34");
    assert.equal(inspected.location, "public");
  });
});
