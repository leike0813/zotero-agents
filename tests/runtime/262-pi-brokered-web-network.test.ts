import { assert } from "chai";
import {
  installRuntimeBridgeOverrideForTests,
  resetRuntimeBridgeOverrideForTests,
} from "../../src/utils/runtimeBridge";
import {
  PI_OUTBOUND_MAX_BODY_BYTES,
  PI_OUTBOUND_IDLE_TIMEOUT_MS,
  PI_OUTBOUND_TOTAL_TIMEOUT_MS,
  PiOutboundNetworkError,
  assertPiOutboundResolvedAllowed,
  classifyPiOutboundAddress,
  classifyPiOutboundUrl,
} from "../../src/modules/piOutboundNetworkPolicy";
import {
  createPiBrokeredMcpFetch,
  createMozillaPiNativeTransport,
  requestPiBrokeredWebHttp,
  requestPiBrokeredWebOperation,
  type PiNativeExchange,
  type PiNativeHttpOptions,
  type PiNativeHttpTransport,
} from "../../src/modules/piBrokeredWebHttp";

const PUBLIC_ADDRESS = "93.184.216.34";
const LOOPBACK = "http://127.0.0.1:8080";

type FakeHop = {
  status?: number;
  headers?: Record<string, string>;
  body?: string | string[];
  peerAddress?: string | null;
  failHead?: string;
  hang?: boolean;
};

type FakeOptions = {
  addresses?: string[] | ((hostname: string) => string[]);
  resolveError?: string;
  hops: FakeHop[];
  seen?: PiNativeHttpOptions[];
  requestedUrls?: string[];
};

function fakeTransport(options: FakeOptions): PiNativeHttpTransport {
  let index = 0;
  return {
    async resolve(hostname: string) {
      if (options.resolveError)
        throw new PiOutboundNetworkError(options.resolveError);
      const addresses = options.addresses ?? [PUBLIC_ADDRESS];
      return typeof addresses === "function" ? addresses(hostname) : addresses;
    },
    open(request: PiNativeHttpOptions): PiNativeExchange {
      options.seen?.push(request);
      options.requestedUrls?.push(request.url);
      const hop = options.hops[Math.min(index, options.hops.length - 1)];
      index += 1;
      let controllerRef:
        | ReadableStreamDefaultController<Uint8Array>
        | undefined;
      let failed = false;
      const preAborted = request.signal.aborted;
      const error = (code: string) => {
        failed = true;
        try {
          controllerRef?.error(new PiOutboundNetworkError(code));
        } catch {
          /* already errored */
        }
      };
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controllerRef = controller;
          if (hop.failHead || hop.hang || preAborted) return;
          for (const chunk of Array.isArray(hop.body ?? "")
            ? (hop.body as string[])
            : [String(hop.body ?? "")])
            controller.enqueue(new TextEncoder().encode(chunk));
          controller.close();
        },
      });
      const headFailure = preAborted ? "pi_network_aborted" : hop.failHead;
      const head = headFailure
        ? Promise.reject(new PiOutboundNetworkError(headFailure))
        : Promise.resolve({
            status: hop.status ?? 200,
            headers: hop.headers ?? {},
            ...(hop.peerAddress === null
              ? {}
              : { peerAddress: hop.peerAddress ?? PUBLIC_ADDRESS }),
            url: request.url,
          });
      head.catch(() => undefined);
      request.signal.addEventListener?.("abort", () => {
        if (!failed) error("pi_network_aborted");
      });
      return { head, body, abort: () => error("pi_network_aborted") };
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

type FakeNativeRuntime = {
  transport: PiNativeHttpTransport;
  channels: any[];
  pendingTimers(): number;
};

function fakeNativeRuntime(): FakeNativeRuntime {
  const handles = new Set<any>();
  const channels: any[] = [];
  const interfaces: any = {
    nsIRequest: {
      LOAD_ANONYMOUS: 16384,
      LOAD_BYPASS_CACHE: 512,
      INHIBIT_CACHING: 128,
      INHIBIT_PERSISTENT_CACHING: 256,
      LOAD_NORMAL: 0,
    },
    nsIHttpChannel: "nsIHttpChannel",
    nsIHttpChannelInternal: "nsIHttpChannelInternal",
    nsIUploadChannel: "nsIUploadChannel",
    nsIStringInputStream: "nsIStringInputStream",
    nsIScriptableInputStream: "nsIScriptableInputStream",
    nsIHttpHeaderVisitor: "nsIHttpHeaderVisitor",
    nsIStreamListener: "nsIStreamListener",
    nsIRequestObserver: "nsIRequestObserver",
    nsIScriptSecurityManager: "nsIScriptSecurityManager",
    nsIDNSListener: "nsIDNSListener",
    nsIDNSAddrRecord: "nsIDNSAddrRecord",
    nsITimer: "nsITimer",
    nsITimerCallback: "nsITimerCallback",
    nsIProgressEventSink: "nsIProgressEventSink",
    nsIInterfaceRequestor: "nsIInterfaceRequestor",
  };
  const classes: any = {
    "@mozilla.org/scriptsecuritymanager;1": {
      getService: () => ({ getSystemPrincipal: () => ({}) }),
    },
    "@mozilla.org/io/string-input-stream;1": {
      createInstance: () => ({ setData() {} }),
    },
    "@mozilla.org/timer;1": {
      createInstance: () => {
        let handle: any = null;
        return {
          initWithCallback(callback: any, delay: number) {
            if (handle) clearTimeout(handle);
            handle = setTimeout(() => {
              handles.delete(handle);
              handle = null;
              callback.notify();
            }, delay);
            handles.add(handle);
          },
          cancel() {
            if (handle) clearTimeout(handle);
            handles.delete(handle);
            handle = null;
          },
        };
      },
    },
  };
  const transport = createMozillaPiNativeTransport({
    services: {
      io: {
        newURI: () => ({}),
        newChannelFromURI: () => {
          const http: any = {
            requestMethod: "GET",
            responseStatus: 0,
            setRequestHeader() {},
            setEmptyRequestHeader() {},
            visitResponseHeaders() {},
          };
          const internal: any = {
            redirectMode: 0,
            fetchCacheMode: 0,
            remoteAddress: "93.184.216.34",
          };
          const channel: any = {
            loadFlags: 0,
            canceled: false,
            listener: undefined as any,
            QueryInterface: (id: unknown) =>
              id === interfaces.nsIHttpChannel
                ? http
                : id === interfaces.nsIHttpChannelInternal
                  ? internal
                  : id === interfaces.nsIUploadChannel
                    ? { setUploadStream() {} }
                    : undefined,
            cancel() {
              channel.canceled = true;
            },
            asyncOpen(listener: any) {
              channel.listener = listener;
            },
            http,
            internal,
          };
          channels.push(channel);
          return channel;
        },
      },
    },
    interfaces,
    classes,
  });
  return { transport, channels, pendingTimers: () => handles.size };
}

function openNative(
  runtime: FakeNativeRuntime,
  timeouts: { idle: number; total: number },
) {
  return runtime.transport.open({
    url: "https://example.org/a",
    method: "GET",
    headers: {},
    signal: new AbortController().signal,
    maxBodyBytes: 1024,
    idleTimeoutMs: timeouts.idle,
    totalTimeoutMs: timeouts.total,
  });
}

describe("Pi outbound network policy", function () {
  it("classifies hosts and rejects cleartext, userinfo and metadata targets", function () {
    assert.equal(
      classifyPiOutboundUrl("https://example.org/a").location,
      "public",
    );
    assert.equal(
      classifyPiOutboundUrl("http://localhost.:1/a").location,
      "loopback",
    );
    assert.equal(
      classifyPiOutboundUrl("https://10.0.0.5/a").location,
      "private",
    );
    assert.equal(
      classifyPiOutboundUrl("https://169.254.169.254/a").location,
      "private",
    );
    assert.throws(
      () =>
        assertPiOutboundResolvedAllowed({
          facts: classifyPiOutboundUrl("http://example.org/a"),
          credentialed: false,
          addresses: [PUBLIC_ADDRESS],
        }),
      /pi_network_https_required/,
    );
    assert.throws(
      () => classifyPiOutboundUrl("https://user:pw@example.org/a"),
      /pi_network_userinfo_denied/,
    );
    assert.throws(
      () => classifyPiOutboundUrl(`https://example.org/${"a".repeat(9000)}`),
      /pi_network_url_too_long/,
    );
  });

  it("denies cloud metadata permanently and classifies every resolved address", function () {
    for (const address of [
      "169.254.169.254",
      "169.254.170.2",
      "100.100.100.200",
      "192.0.0.192",
      "168.63.129.16",
      "fd00:ec2::254",
      "fe80::1",
    ])
      assert.isTrue(classifyPiOutboundAddress(address).metadata, address);
    assert.equal(
      classifyPiOutboundAddress("::ffff:10.0.0.1").location,
      "private",
    );
    assert.equal(classifyPiOutboundAddress("93.184.216.34").location, "public");
  });

  it("requires canonical-origin approval and denies cleartext credentials", function () {
    const facts = classifyPiOutboundUrl("http://192.168.1.5/mcp");
    assert.throws(
      () =>
        assertPiOutboundResolvedAllowed({
          facts,
          credentialed: false,
          addresses: ["192.168.1.5"],
        }),
      /pi_network_local_approval_required/,
    );
    assert.throws(
      () =>
        assertPiOutboundResolvedAllowed({
          facts,
          credentialed: true,
          localNetworkApprovedOrigin: facts.origin,
          addresses: ["192.168.1.5"],
        }),
      /pi_network_cleartext_credential_denied/,
    );
    assert.doesNotThrow(() =>
      assertPiOutboundResolvedAllowed({
        facts,
        credentialed: false,
        localNetworkApprovedOrigin: facts.origin,
        addresses: ["192.168.1.5"],
      }),
    );
    const mixed = classifyPiOutboundUrl("http://localhost:8080/mcp");
    assert.throws(
      () =>
        assertPiOutboundResolvedAllowed({
          facts: mixed,
          credentialed: true,
          localNetworkApprovedOrigin: mixed.origin,
          addresses: ["127.0.0.1", "192.168.1.5"],
        }),
      /pi_network_cleartext_credential_denied/,
    );
  });

  it("denies a public host that resolves to a private or missing address", function () {
    const facts = classifyPiOutboundUrl("https://example.org/a");
    assert.throws(
      () =>
        assertPiOutboundResolvedAllowed({
          facts,
          credentialed: false,
          addresses: ["93.184.216.34", "10.1.2.3"],
        }),
      /pi_network_local_approval_required/,
    );
    assert.throws(
      () =>
        assertPiOutboundResolvedAllowed({
          facts,
          credentialed: false,
          addresses: [],
        }),
      /pi_network_address_unavailable/,
    );
  });
});

describe("Pi brokered web HTTP", function () {
  it("fetches anonymously and never returns cookies or encoding headers", async function () {
    const seen: PiNativeHttpOptions[] = [];
    const response = await requestPiBrokeredWebHttp(
      { url: "https://example.org/data" },
      {
        transport: fakeTransport({
          seen,
          hops: [
            {
              status: 200,
              headers: {
                "content-type": "text/plain",
                "set-cookie": "session=1",
                "content-encoding": "gzip",
                "content-length": "5",
              },
              body: "hello",
            },
          ],
        }),
      },
    );
    assert.equal(response.status, 200);
    assert.equal(new TextDecoder().decode(response.body), "hello");
    assert.equal(response.headers["content-type"], "text/plain");
    assert.notProperty(response.headers, "set-cookie");
    assert.notProperty(response.headers, "content-encoding");
    assert.equal(seen[0].method, "GET");
  });

  it("revalidates every redirect hop and stops at the redirect limit", async function () {
    const requestedUrls: string[] = [];
    const followed = await requestPiBrokeredWebHttp(
      { url: "https://example.org/start" },
      {
        transport: fakeTransport({
          requestedUrls,
          hops: [
            { status: 302, headers: { location: "/next" } },
            { status: 200, body: "done" },
          ],
        }),
      },
    );
    assert.deepEqual(requestedUrls, [
      "https://example.org/start",
      "https://example.org/next",
    ]);
    assert.equal(followed.finalUrl, "https://example.org/next");
    assert.equal(new TextDecoder().decode(followed.body), "done");

    assert.equal(
      await codeOf(() =>
        requestPiBrokeredWebHttp(
          { url: "https://example.org/start" },
          {
            transport: fakeTransport({
              hops: [
                { status: 302, headers: { location: "http://10.0.0.9/x" } },
              ],
            }),
          },
        ),
      ),
      "pi_network_local_approval_required",
    );
    assert.equal(
      await codeOf(() =>
        requestPiBrokeredWebHttp(
          { url: "https://example.org/start" },
          {
            transport: fakeTransport({
              hops: [
                {
                  status: 302,
                  headers: { location: "https://example.org/again" },
                },
              ],
            }),
          },
        ),
      ),
      "pi_network_too_many_redirects",
    );
    assert.equal(
      await codeOf(() =>
        requestPiBrokeredWebHttp(
          { url: "https://example.org/start", allowRedirects: false },
          {
            transport: fakeTransport({
              hops: [{ status: 302, headers: { location: "/next" } }],
            }),
          },
        ),
      ),
      "pi_network_redirect_denied",
    );
  });

  it("bounds the body, honors abort and fails closed on missing peer evidence", async function () {
    assert.equal(
      await codeOf(() =>
        requestPiBrokeredWebHttp(
          { url: "https://example.org/big", maxBodyBytes: 8 },
          { transport: fakeTransport({ hops: [{ body: "x".repeat(64) }] }) },
        ),
      ),
      "pi_network_body_too_large",
    );

    const controller = new AbortController();
    const hung = requestPiBrokeredWebHttp(
      { url: "https://example.org/slow", signal: controller.signal },
      { transport: fakeTransport({ hops: [{ hang: true }] }) },
    );
    controller.abort();
    assert.equal(await codeOf(() => hung), "pi_network_aborted");

    assert.equal(
      await codeOf(() =>
        requestPiBrokeredWebHttp(
          { url: "https://example.org/a" },
          { transport: fakeTransport({ hops: [{ peerAddress: null }] }) },
        ),
      ),
      "pi_network_peer_unavailable",
    );
    assert.equal(
      await codeOf(() =>
        requestPiBrokeredWebHttp(
          { url: "https://example.org/a" },
          { transport: fakeTransport({ hops: [{ peerAddress: "10.0.0.4" }] }) },
        ),
      ),
      "pi_network_peer_denied",
    );
  });

  it("keeps the default body bound at the decompressed limit", function () {
    assert.equal(PI_OUTBOUND_MAX_BODY_BYTES, 5 * 1024 * 1024);
  });
});

describe("Pi brokered web operations", function () {
  it("fixes method, redirect and header policy per closed operation", async function () {
    const seen: PiNativeHttpOptions[] = [];
    const transport = fakeTransport({
      seen,
      hops: [{ status: 200, body: "{}" }],
    });
    await requestPiBrokeredWebOperation(
      {
        kind: "anthropic",
        url: "https://api.anthropic.com/v1/messages",
        headers: { "x-api-key": "secret", "anthropic-version": "2023-06-01" },
        body: "{}",
      },
      { transport },
    );
    assert.equal(seen[0].method, "POST");
    assert.equal(seen[0].headers["anthropic-version"], "2023-06-01");

    assert.equal(
      await codeOf(() =>
        requestPiBrokeredWebOperation(
          {
            kind: "anthropic",
            url: "https://api.anthropic.com/v1/messages",
            headers: { authorization: "Bearer x" },
          },
          { transport },
        ),
      ),
      "pi_network_header_denied",
    );
    // The removed provider-specific kind is no longer an accepted operation.
    assert.equal(
      await codeOf(() =>
        requestPiBrokeredWebOperation(
          {
            kind: "deepseek" as never,
            url: "https://api.deepseek.com/anthropic/v1/messages",
          },
          { transport },
        ),
      ),
      "pi_network_operation_denied",
    );
    assert.equal(
      await codeOf(() =>
        requestPiBrokeredWebOperation(
          {
            kind: "fetch",
            url: "https://example.org/a",
            headers: { authorization: "Bearer x" },
          },
          { transport },
        ),
      ),
      "pi_network_header_denied",
    );
    assert.equal(
      await codeOf(() =>
        requestPiBrokeredWebOperation(
          { kind: "unknown" as never, url: "https://example.org/a" },
          { transport },
        ),
      ),
      "pi_network_operation_denied",
    );
  });
  it("pins provider origin and path and disallows a fetch body", async function () {
    const seen: PiNativeHttpOptions[] = [];
    const transport = fakeTransport({
      seen,
      hops: [{ status: 200, body: "{}" }],
    });
    await requestPiBrokeredWebOperation(
      {
        kind: "brave",
        url: "https://api.search.brave.com/res/v1/web/search?q=x&count=5",
        headers: { "x-subscription-token": "secret" },
      },
      { transport },
    );
    assert.equal(seen[0].method, "GET");
    assert.isUndefined(seen[0].body);

    assert.equal(
      await codeOf(() =>
        requestPiBrokeredWebOperation(
          {
            kind: "brave",
            url: "https://api.search.brave.com/res/v1/news/search?q=x",
          },
          { transport },
        ),
      ),
      "pi_network_path_denied",
    );
    assert.equal(
      await codeOf(() =>
        requestPiBrokeredWebOperation(
          {
            kind: "brave",
            url: "https://evil.example.org/res/v1/web/search?q=x",
          },
          { transport },
        ),
      ),
      "pi_network_origin_denied",
    );
    assert.equal(
      await codeOf(() =>
        requestPiBrokeredWebOperation(
          {
            kind: "anthropic",
            url: "https://api.anthropic.com/v1/complete",
            headers: { "x-api-key": "k" },
          },
          { transport },
        ),
      ),
      "pi_network_path_denied",
    );
    assert.equal(
      await codeOf(() =>
        requestPiBrokeredWebOperation(
          {
            kind: "anthropic",
            url: "https://api.deepseek.com/v1/messages",
            headers: { "x-api-key": "k" },
          },
          { transport },
        ),
      ),
      "pi_network_origin_denied",
    );
    assert.equal(
      await codeOf(() =>
        requestPiBrokeredWebOperation(
          { kind: "fetch", url: "https://example.org/a", body: "x" },
          { transport },
        ),
      ),
      "pi_network_body_denied",
    );
  });

  it("follows provider redirects only within the pinned origin", async function () {
    const requestedUrls: string[] = [];
    const response = await requestPiBrokeredWebOperation(
      {
        kind: "anthropic",
        url: "https://api.anthropic.com/v1/messages",
        headers: { "x-api-key": "k" },
        body: "{}",
      },
      {
        transport: fakeTransport({
          requestedUrls,
          hops: [
            { status: 307, headers: { location: "/v1/messages" } },
            { status: 200, body: "{}" },
          ],
        }),
      },
    );
    assert.equal(response.status, 200);
    assert.deepEqual(requestedUrls, [
      "https://api.anthropic.com/v1/messages",
      "https://api.anthropic.com/v1/messages",
    ]);
    assert.equal(
      await codeOf(() =>
        requestPiBrokeredWebOperation(
          {
            kind: "anthropic",
            url: "https://api.anthropic.com/v1/messages",
            headers: { "x-api-key": "k" },
            body: "{}",
          },
          {
            transport: fakeTransport({
              hops: [
                {
                  status: 307,
                  headers: { location: "https://evil.example.org/x" },
                },
              ],
            }),
          },
        ),
      ),
      "pi_network_redirect_denied",
    );
  });
});

describe("Pi brokered MCP fetch adapter", function () {
  it("binds to the source origin, streams the body and denies redirects", async function () {
    const seen: PiNativeHttpOptions[] = [];
    const fetchImpl = createPiBrokeredMcpFetch(
      { origin: "https://mcp.example.org" },
      {
        transport: fakeTransport({
          seen,
          hops: [{ status: 200, body: ["a", "b"] }],
        }),
      },
    );
    const response = await fetchImpl("https://mcp.example.org/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "ab");
    assert.equal(seen[0].method, "POST");
    assert.equal(new TextDecoder().decode(seen[0].body), "{}");

    assert.equal(
      await codeOf(() =>
        fetchImpl("https://other.example.org/mcp", { method: "GET" }),
      ),
      "pi_network_origin_denied",
    );

    const redirecting = createPiBrokeredMcpFetch(
      { origin: "https://mcp.example.org" },
      {
        transport: fakeTransport({
          hops: [{ status: 302, headers: { location: "/mcp" } }],
        }),
      },
    );
    assert.equal(
      await codeOf(() =>
        redirecting("https://mcp.example.org/mcp", { method: "GET" }),
      ),
      "pi_network_redirect_denied",
    );

    const empty = createPiBrokeredMcpFetch(
      { origin: "https://mcp.example.org" },
      { transport: fakeTransport({ hops: [{ status: 204 }] }) },
    );
    const deleted = await empty("https://mcp.example.org/mcp", {
      method: "DELETE",
    });
    assert.equal(deleted.status, 204);
    assert.isNull(deleted.body);

    const loopback = createPiBrokeredMcpFetch(
      { origin: LOOPBACK, localNetworkApprovedOrigin: LOOPBACK },
      {
        transport: fakeTransport({
          addresses: ["127.0.0.1"],
          hops: [{ status: 200, peerAddress: "127.0.0.1" }],
        }),
      },
    );
    const loopbackResponse = await loopback(`${LOOPBACK}/mcp`, {
      method: "GET",
    });
    assert.equal(loopbackResponse.status, 200);
  });
});

describe("Pi native Mozilla transport timers", function () {
  it("uses host window streams when the plugin global has none", async function () {
    const Stream = globalThis.ReadableStream;
    installRuntimeBridgeOverrideForTests({
      windows: [{ ReadableStream: Stream }],
    });
    (globalThis as any).ReadableStream = undefined;
    try {
      const runtime = fakeNativeRuntime();
      const exchange = openNative(runtime, { idle: 1000, total: 5000 });
      runtime.channels[0].http.responseStatus = 200;
      runtime.channels[0].listener.onStartRequest({});
      assert.equal((await exchange.head).status, 200);
      runtime.channels[0].listener.onStopRequest({}, 0);
      assert.isTrue((await exchange.body.getReader().read()).done);
    } finally {
      globalThis.ReadableStream = Stream;
      resetRuntimeBridgeOverrideForTests();
    }
  });
  it("exposes redirect evidence while refusing the channel's automatic next hop", async function () {
    const runtime = fakeNativeRuntime();
    const exchange = openNative(runtime, { idle: 1000, total: 5000 });
    const channel = runtime.channels[0];
    channel.http.responseStatus = 302;
    channel.http.visitResponseHeaders = (visitor: any) =>
      visitor.visitHeader("Location", "https://169.254.169.254/");
    let redirected = true;
    channel.notificationCallbacks.asyncOnChannelRedirect(channel, {}, 0, {
      onRedirectVerifyCallback(status: number) {
        redirected = status === 0;
      },
    });
    const head = await exchange.head;
    assert.equal(head.status, 302);
    assert.equal(head.headers.location, "https://169.254.169.254/");
    assert.isFalse(redirected);
    exchange.abort();
  });
  it("contains unavailable native response status as a typed transport failure", async function () {
    const runtime = fakeNativeRuntime();
    const exchange = openNative(runtime, { idle: 1000, total: 5000 });
    Object.defineProperty(runtime.channels[0].http, "responseStatus", {
      get() {
        throw new Error("native private failure");
      },
    });
    assert.doesNotThrow(() => runtime.channels[0].listener.onStartRequest({}));
    assert.equal(await codeOf(() => exchange.head), "pi_network_failed");
    assert.equal(runtime.pendingTimers(), 0);
  });
  it("arms idle and total timers before the channel starts", function () {
    const runtime = fakeNativeRuntime();
    openNative(runtime, { idle: 1000, total: 5000 });
    assert.lengthOf(runtime.channels, 1);
    assert.isFunction(runtime.channels[0].listener.onStartRequest);
    assert.isFunction(runtime.channels[0].listener.onStopRequest);
    assert.isAtLeast(runtime.pendingTimers(), 2);
  });

  it("fails the head with a total timeout when headers never arrive", async function () {
    this.timeout(10_000);
    const runtime = fakeNativeRuntime();
    const exchange = openNative(runtime, { idle: 5000, total: 25 });
    assert.equal(await codeOf(() => exchange.head), "pi_network_timeout");
    assert.isTrue(runtime.channels[0].canceled);
    assert.equal(runtime.pendingTimers(), 0);
  });

  it("fails the head with an idle timeout while the connection stalls", async function () {
    this.timeout(10_000);
    const runtime = fakeNativeRuntime();
    const exchange = openNative(runtime, { idle: 25, total: 5000 });
    assert.equal(await codeOf(() => exchange.head), "pi_network_idle_timeout");
    assert.isTrue(runtime.channels[0].canceled);
    assert.equal(runtime.pendingTimers(), 0);
  });

  it("clears every timer once headers and body complete", async function () {
    this.timeout(10_000);
    const runtime = fakeNativeRuntime();
    const exchange = openNative(runtime, { idle: 30, total: 60 });
    const channel = runtime.channels[0];
    channel.http.responseStatus = 200;
    channel.listener.onStartRequest({ name: "https://example.org/a" });
    const body = await exchange.head;
    assert.equal(body.status, 200);
    channel.listener.onStopRequest({ name: "https://example.org/a" }, 0);
    await new Promise((resolve) => setTimeout(resolve, 90));
    assert.equal(runtime.pendingTimers(), 0);
    assert.isFalse(channel.canceled);
  });

  it("cancels the channel and clears timers on abort", async function () {
    this.timeout(10_000);
    const runtime = fakeNativeRuntime();
    const controller = new AbortController();
    const exchange = runtime.transport.open({
      url: "https://example.org/a",
      method: "GET",
      headers: {},
      signal: controller.signal,
      maxBodyBytes: 1024,
      idleTimeoutMs: 5000,
      totalTimeoutMs: 5000,
    });
    controller.abort();
    assert.equal(await codeOf(() => exchange.head), "pi_network_aborted");
    assert.isTrue(runtime.channels[0].canceled);
    assert.equal(runtime.pendingTimers(), 0);
  });
});

describe("Pi brokered web deadline and cancellation", function () {
  it("bounds DNS resolution and never opens a connection after abort", async function () {
    this.timeout(10_000);
    let opens = 0;
    const transport: PiNativeHttpTransport = {
      resolve: () => new Promise<string[]>(() => undefined),
      open: () => {
        opens += 1;
        throw new Error("unreachable");
      },
    };
    const controller = new AbortController();
    const pending = requestPiBrokeredWebHttp(
      { url: "https://example.org/a", signal: controller.signal },
      { transport },
    );
    controller.abort();
    assert.equal(await codeOf(() => pending), "pi_network_aborted");
    assert.equal(opens, 0);
  });

  it("bounds a stalled response head", async function () {
    this.timeout(10_000);
    const transport: PiNativeHttpTransport = {
      resolve: async () => ["93.184.216.34"],
      open: () =>
        ({
          head: new Promise(() => undefined),
          body: new ReadableStream({ start() {} }),
          abort: () => undefined,
        }) as PiNativeExchange,
    };
    const controller = new AbortController();
    const pending = requestPiBrokeredWebHttp(
      { url: "https://example.org/a", signal: controller.signal },
      { transport },
    );
    controller.abort();
    assert.equal(await codeOf(() => pending), "pi_network_aborted");
  });

  it("refuses a target whose total deadline has already passed", async function () {
    let resolved = 0;
    const transport: PiNativeHttpTransport = {
      resolve: async () => {
        resolved += 1;
        return ["93.184.216.34"];
      },
      open: () => {
        throw new Error("unreachable");
      },
    };
    assert.equal(
      await codeOf(() =>
        requestPiBrokeredWebHttp(
          { url: "https://example.org/a" },
          {
            transport,
            // Each read advances a full budget, so the deadline is already
            // spent when the first hop is planned.
            now: (() => {
              let clock = 0;
              return () => (clock += PI_OUTBOUND_TOTAL_TIMEOUT_MS);
            })(),
          },
        ),
      ),
      "pi_network_timeout",
    );
    assert.equal(resolved, 0);
  });

  it("keeps the production idle and total budgets", function () {
    assert.equal(PI_OUTBOUND_IDLE_TIMEOUT_MS, 30_000);
    assert.equal(PI_OUTBOUND_TOTAL_TIMEOUT_MS, 120_000);
  });
});
