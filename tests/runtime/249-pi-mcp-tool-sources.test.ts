import { assert } from "chai";
import { getPref, setPref } from "../../src/utils/prefs";
import {
  applyPiMcpSourceChange,
  commitPiMcpChange,
  classifyPiMcpHttpUrl,
  exportPiMcpJson,
  loadPiMcpSourceRegistry,
  piMcpSourceBindingIdentity,
  preparePiMcpChange,
  previewPiMcpJson,
} from "../../src/modules/piMcpSourceRegistry";
import {
  listPiCredentials,
  readPiCredential,
} from "../../src/modules/piCredentialStore";
import type {
  PiMcpSourceChangeSet,
  PiMcpSourceInput,
} from "../../src/shared/piMcpSourceContract";
import { PiMcpStdioTransport } from "../../src/modules/piMcpStdioTransport";
import type {
  PiNativeHttpTransport,
  PiNativeResponseHead,
} from "../../src/modules/piBrokeredWebHttp";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import { installPluginStateNodeSqliteAdapter } from "../helpers/pluginStateNodeSqliteAdapter";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";
import {
  createPiMcpToolSources,
  freezePiMcpGatewayTurn,
  normalizePiMcpCallResult,
  openPiMcpSource,
  piMcpGatewayDefinitions,
  resolvePiMcpRequestHeaders,
} from "../../src/modules/piMcpToolSources";
import http from "node:http";

function httpInput(
  overrides: Partial<PiMcpSourceInput> & { id: string },
): PiMcpSourceInput {
  return {
    label: overrides.id,
    transport: "http",
    enabled: true,
    url: "https://example.org/mcp",
    authentication: { kind: "none" },
    bindings: [],
    ...overrides,
  };
}

async function adopt(change: PiMcpSourceChangeSet) {
  return applyPiMcpSourceChange(change);
}

describe("Pi MCP Tool Sources registry", function () {
  this.timeout(15_000);
  let prior: string;
  let priorCredentials: string;
  let root: string;
  let priorRoot: string | undefined;
  before(async function () {
    priorRoot = process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    root = await fs.mkdtemp(path.join(os.tmpdir(), "pi-mcp-registry-"));
    process.env.ZOTERO_SKILLS_RUNTIME_ROOT = root;
    installPluginStateNodeSqliteAdapter();
    resetPluginStateStoreForTests();
  });
  after(async function () {
    resetPluginStateStoreForTests();
    if (priorRoot === undefined) delete process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    else process.env.ZOTERO_SKILLS_RUNTIME_ROOT = priorRoot;
    await fs.rm(root, { recursive: true, force: true });
  });
  beforeEach(function () {
    prior = String(getPref("piMcpSourceRegistryJson") || "");
    priorCredentials = String(getPref("piCredentialEncryptedJson") || "");
    setPref("piMcpSourceRegistryJson", "");
    setPref("piCredentialEncryptedJson", "");
  });
  afterEach(function () {
    setPref("piMcpSourceRegistryJson", prior);
    setPref("piCredentialEncryptedJson", priorCredentials);
  });

  it("binds one exact authentication field and forms a single Bearer prefix", async function () {
    await adopt({
      sources: [
        httpInput({
          id: "bearer",
          authentication: { kind: "bearer", field: "Authorization" },
          bindings: [{ field: "Authorization", secret: "fixture-token" }],
        }),
      ],
    });
    const source = loadPiMcpSourceRegistry().sources[0];
    assert.deepEqual(source.authentication, {
      kind: "bearer",
      field: "Authorization",
    });
    const ref = source.credentialSlots.Authorization;
    assert.isString(ref);
    const secret = await readPiCredential(ref, "mcp-source");
    assert.isTrue(secret.ok);
    assert.equal(
      secret.material.kind === "mcp-secret" && secret.material.secret,
      "fixture-token",
    );
    const headers = await resolvePiMcpRequestHeaders(source);
    assert.deepEqual(headers, { Authorization: "Bearer fixture-token" });
    assert.notInclude(
      String(getPref("piMcpSourceRegistryJson")),
      "fixture-token",
    );
  });

  it("sends an API key unchanged in the field the user chose", async function () {
    await adopt({
      sources: [
        httpInput({
          id: "api-key",
          authentication: { kind: "apiKey", field: "X-Api-Key" },
          bindings: [{ field: "X-Api-Key", secret: "raw-key" }],
        }),
      ],
    });
    const source = loadPiMcpSourceRegistry().sources[0];
    assert.deepEqual(await resolvePiMcpRequestHeaders(source), {
      "X-Api-Key": "raw-key",
    });
  });

  it("rejects a changed field that arrives without its own secret", async function () {
    await adopt({
      sources: [
        httpInput({
          id: "fields",
          authentication: { kind: "apiKey", field: "X-First" },
          bindings: [{ field: "X-First", secret: "first-secret" }],
        }),
      ],
    });
    assert.throws(
      () =>
        preparePiMcpChange({
          sources: [
            httpInput({
              id: "fields",
              authentication: { kind: "apiKey", field: "X-Second" },
              bindings: [{ field: "X-First" }, { field: "X-Second" }],
            }),
          ],
        }),
      /mcp_source_field_secret_required/,
    );
    const source = loadPiMcpSourceRegistry().sources[0];
    assert.equal(
      (await readPiMcpCredential(source.credentialSlots["X-First"])).secret,
      "first-secret",
    );
  });

  it("keeps same-field bindings and clears only explicitly removed ones", async function () {
    await adopt({
      sources: [
        httpInput({
          id: "keep",
          authentication: { kind: "apiKey", field: "X-Key" },
          bindings: [
            { field: "X-Key", secret: "stable" },
            { field: "X-Extra", secret: "extra" },
          ],
        }),
      ],
    });
    const before = loadPiMcpSourceRegistry().sources[0];
    await adopt({
      sources: [
        httpInput({
          id: "keep",
          label: "Renamed",
          authentication: { kind: "apiKey", field: "X-Key" },
          bindings: [
            { field: "X-Key" },
            { field: "X-Extra", secret: "replaced" },
          ],
        }),
      ],
    });
    const after = loadPiMcpSourceRegistry().sources[0];
    assert.equal(after.label, "Renamed");
    assert.equal(
      after.credentialSlots["X-Key"],
      before.credentialSlots["X-Key"],
    );
    assert.equal(
      after.credentialSlots["X-Extra"],
      before.credentialSlots["X-Extra"],
    );
    assert.equal(
      (await readPiMcpCredential(after.credentialSlots["X-Key"])).secret,
      "stable",
    );
    assert.equal(
      (await readPiMcpCredential(after.credentialSlots["X-Extra"])).secret,
      "replaced",
    );
    const plan = preparePiMcpChange({
      sources: [
        httpInput({
          id: "keep",
          authentication: { kind: "apiKey", field: "X-Key" },
          bindings: [{ field: "X-Key" }],
        }),
      ],
    });
    await commitPiMcpChange(plan);
    const cleared = loadPiMcpSourceRegistry().sources[0];
    assert.deepEqual(Object.keys(cleared.credentialSlots), ["X-Key"]);
    assert.deepEqual(plan.secretRemovals, [before.credentialSlots["X-Extra"]]);
    assert.isFalse(
      (await readPiMcpCredential(before.credentialSlots["X-Extra"])).present,
    );
  });

  it("preserves ordered argv entries and omits an empty working directory", async function () {
    await adopt({
      sources: [
        {
          id: "stdio",
          label: "Local",
          transport: "stdio",
          enabled: true,
          executable: "/usr/bin/node",
          argv: ["--flag", "value with spaces", ""],
          cwd: "",
          authentication: { kind: "none" },
          bindings: [{ field: "SERVER_TOKEN", secret: "stdio-secret" }],
        },
      ],
    });
    const source = loadPiMcpSourceRegistry().sources[0];
    assert.deepEqual(source.argv, ["--flag", "value with spaces", ""]);
    assert.isUndefined(source.cwd);
    assert.equal(source.credentialSlots.SERVER_TOKEN.length > 0, true);
  });

  it("rejects duplicate header fields and reserved stdio environment names", function () {
    assert.throws(
      () =>
        preparePiMcpChange({
          sources: [
            httpInput({
              id: "dupe",
              authentication: { kind: "apiKey", field: "X-Key" },
              bindings: [
                { field: "X-Key", secret: "one" },
                { field: "x-key", secret: "two" },
              ],
            }),
          ],
        }),
      /mcp_source_duplicate_field/,
    );
    assert.throws(
      () =>
        preparePiMcpChange({
          sources: [
            {
              id: "reserved",
              label: "Reserved",
              transport: "stdio",
              enabled: true,
              executable: "/usr/bin/node",
              argv: [],
              authentication: { kind: "none" },
              bindings: [{ field: "PATH", secret: "hijack" }],
            },
          ],
        }),
      /mcp_source_reserved_environment/,
    );
  });

  it("denies unsafe targets, private cleartext credentials and missing approval", async function () {
    assert.equal(
      classifyPiMcpHttpUrl("https://localhost.:8443/mcp").location,
      "loopback",
    );
    assert.throws(
      () =>
        preparePiMcpChange({
          sources: [httpInput({ id: "clear", url: "http://example.org/mcp" })],
        }),
      /mcp_source_https_required/,
    );
    assert.throws(
      () =>
        preparePiMcpChange({
          sources: [
            httpInput({
              id: "private",
              url: "http://192.168.1.2/mcp",
              authentication: { kind: "bearer", field: "Authorization" },
              bindings: [{ field: "Authorization", secret: "secret" }],
            }),
          ],
        }),
      /mcp_source_cleartext_credential_denied/,
    );
    const plan = preparePiMcpChange({
      sources: [httpInput({ id: "lan", url: "http://192.168.1.2/mcp" })],
    });
    assert.deepEqual(plan.approvalsRequired, [
      { sourceId: "lan", origin: "http://192.168.1.2", cleartext: false },
      { sourceId: "lan", origin: "http://192.168.1.2", cleartext: true },
    ]);
    let denied = false;
    try {
      await commitPiMcpChange(plan);
    } catch (error) {
      denied =
        error instanceof Error &&
        error.message === "mcp_source_approval_required";
    }
    assert.isTrue(denied);
    assert.lengthOf(loadPiMcpSourceRegistry().sources, 0);
    const approved = commitPiMcpChange(
      preparePiMcpChange({
        sources: [
          httpInput({
            id: "lan",
            url: "http://192.168.1.2/mcp",
            approveLocalNetwork: true,
            approveCleartext: true,
          }),
        ],
      }),
    );
    const saved = (await approved)[0];
    assert.equal(saved.localNetworkApproval, "http://192.168.1.2");
    assert.equal(saved.cleartextApproval, "http://192.168.1.2");
  });

  it("moves imported literal secrets into the store and exports rebinding slots", async function () {
    const preview = previewPiMcpJson(
      JSON.stringify({
        mcpServers: {
          papers: {
            type: "http",
            url: "https://example.org/mcp",
            headers: { Authorization: "Bearer fixture-secret" },
          },
        },
      }),
    );
    assert.deepEqual(preview.change.sources[0].authentication, {
      kind: "bearer",
      field: "Authorization",
    });
    assert.equal(
      preview.change.sources[0].bindings[0].secret,
      "fixture-secret",
    );
    await adopt(preview.change);
    const source = loadPiMcpSourceRegistry().sources[0];
    assert.notInclude(
      String(getPref("piMcpSourceRegistryJson")),
      "fixture-secret",
    );
    assert.equal(
      (await readPiMcpCredential(source.credentialSlots.Authorization)).secret,
      "fixture-secret",
    );
    const exported = exportPiMcpJson();
    assert.notInclude(exported, "fixture-secret");
    assert.notInclude(exported, source.credentialSlots.Authorization);
    assert.include(exported, '"Authorization": ""');
  });

  it("keeps the authentication field identity across export and re-import", async function () {
    await adopt({
      sources: [
        httpInput({
          id: "bearer-round-trip",
          authentication: { kind: "bearer", field: "Authorization" },
          bindings: [{ field: "Authorization", secret: "round-trip-token" }],
        }),
      ],
    });
    const exported = exportPiMcpJson();
    assert.include(exported, '"kind": "bearer"');
    assert.notInclude(exported, "round-trip-token");
    setPref("piMcpSourceRegistryJson", "");
    const reimported = previewPiMcpJson(
      JSON.stringify({
        mcpServers: {
          "bearer-round-trip": {
            type: "http",
            url: "https://example.org/mcp",
            authentication: { kind: "bearer", field: "Authorization" },
            headers: { Authorization: "Bearer reentered-token" },
          },
        },
      }),
    );
    assert.deepEqual(reimported.change.sources[0].authentication, {
      kind: "bearer",
      field: "Authorization",
    });
    assert.equal(
      reimported.change.sources[0].bindings[0].secret,
      "reentered-token",
    );
    await adopt(reimported.change);
    assert.deepEqual(
      await resolvePiMcpRequestHeaders(loadPiMcpSourceRegistry().sources[0]),
      { Authorization: "Bearer reentered-token" },
    );
    let needsReentry = false;
    try {
      // A receiving profile that holds no same-field binding cannot adopt the
      // rebinding slot until the secret is entered again.
      setPref("piMcpSourceRegistryJson", "");
      preparePiMcpChange(previewPiMcpJson(exported).change);
    } catch (error) {
      needsReentry =
        error instanceof Error &&
        error.message === "mcp_source_field_secret_required";
    }
    assert.isTrue(needsReentry, "an exported empty slot needs re-entry");
  });

  it("keeps a same-name import by default and adopts an explicit replacement", async function () {
    await adopt({
      sources: [
        httpInput({
          id: "papers",
          url: "https://kept.example/mcp",
          authentication: { kind: "apiKey", field: "X-Key" },
          bindings: [{ field: "X-Key", secret: "kept-secret" }],
        }),
        httpInput({ id: "other", url: "https://other.example/mcp" }),
      ],
    });
    const preview = previewPiMcpJson(
      JSON.stringify({
        mcpServers: {
          papers: { url: "https://incoming.example/mcp" },
          fresh: { url: "https://fresh.example/mcp" },
        },
      }),
    );
    const kept = preparePiMcpChange(preview.change);
    assert.deepEqual(kept.conflictsKept, ["papers"]);
    await commitPiMcpChange(kept);
    assert.equal(
      loadPiMcpSourceRegistry().sources.find((item) => item.id === "papers")!
        .url,
      "https://kept.example/mcp",
    );
    assert.isTrue(
      loadPiMcpSourceRegistry().sources.some((item) => item.id === "other"),
    );
    const replaced = preparePiMcpChange({
      mode: "merge",
      sources: [
        httpInput({ id: "papers", url: "https://incoming.example/mcp" }),
      ],
      conflicts: { papers: "replace" },
    });
    assert.deepEqual(replaced.conflictsKept, []);
    await commitPiMcpChange(replaced);
    assert.equal(
      loadPiMcpSourceRegistry().sources.find((item) => item.id === "papers")!
        .url,
      "https://incoming.example/mcp",
    );
  });

  it("removes only explicitly named sources and their orphaned bindings", async function () {
    await adopt({
      sources: [
        httpInput({
          id: "doomed",
          authentication: { kind: "apiKey", field: "X-Key" },
          bindings: [{ field: "X-Key", secret: "orphan" }],
        }),
        httpInput({ id: "stays" }),
      ],
    });
    const doomed = loadPiMcpSourceRegistry().sources.find(
      (item) => item.id === "doomed",
    )!;
    const plan = preparePiMcpChange({ sources: [], removals: ["doomed"] });
    assert.deepEqual(plan.removals, ["doomed"]);
    assert.deepEqual(plan.secretRemovals, [doomed.credentialSlots["X-Key"]]);
    await commitPiMcpChange(plan);
    assert.deepEqual(
      loadPiMcpSourceRegistry().sources.map((item) => item.id),
      ["stays"],
    );
    assert.isFalse(
      (await readPiMcpCredential(doomed.credentialSlots["X-Key"])).present,
    );
  });

  it("keeps previous authoritative state when a coordinated write fails", async function () {
    await adopt({
      sources: [
        httpInput({
          id: "atomic",
          authentication: { kind: "apiKey", field: "X-Key" },
          bindings: [{ field: "X-Key", secret: "original" }],
        }),
      ],
    });
    const before = loadPiMcpSourceRegistry().sources[0];
    const plan = preparePiMcpChange({
      sources: [
        httpInput({
          id: "atomic",
          label: "Attempted",
          authentication: { kind: "apiKey", field: "X-Key" },
          bindings: [{ field: "X-Key", secret: "replacement" }],
        }),
        httpInput({
          id: "second",
          authentication: { kind: "apiKey", field: "X-Key" },
          bindings: [{ field: "X-Key", secret: "second-secret" }],
        }),
      ],
    });
    const prior = Zotero.Prefs.set;
    Zotero.Prefs.set = ((key: string, value: unknown, global?: boolean) => {
      if (String(key).endsWith("piMcpSourceRegistryJson"))
        throw new Error("config_write_failed");
      return (prior as (k: string, v: unknown, g?: boolean) => unknown)(
        key,
        value,
        global,
      );
    }) as typeof Zotero.Prefs.set;
    try {
      let failed = false;
      try {
        await commitPiMcpChange(plan);
      } catch (error) {
        failed = true;
        assert.match(String((error as Error).message), /config_write_failed/);
      }
      assert.isTrue(failed);
    } finally {
      Zotero.Prefs.set = prior as typeof Zotero.Prefs.set;
    }
    const after = loadPiMcpSourceRegistry().sources;
    assert.deepEqual(
      after.map((item) => item.id),
      ["atomic"],
    );
    assert.equal(after[0].label, before.label);
    assert.equal(
      (await readPiMcpCredential(before.credentialSlots["X-Key"])).secret,
      "original",
    );
    assert.deepEqual(
      listPiCredentials("mcp-source").map((entry) => entry.id),
      [before.credentialSlots["X-Key"]],
    );
  });

  it("rejects an adoption prepared against a superseded registry revision", async function () {
    await adopt({ sources: [httpInput({ id: "one" })] });
    const stale = loadPiMcpSourceRegistry().revision;
    await adopt({ sources: [httpInput({ id: "two" })] });
    let failed = false;
    try {
      await applyPiMcpSourceChange(
        preparePiMcpChange({
          sources: [httpInput({ id: "three" })],
          expectedRevision: stale,
        }),
      );
    } catch (error) {
      failed =
        error instanceof Error &&
        /mcp_source_revision_conflict/.test(error.message);
    }
    assert.isTrue(failed);
    assert.deepEqual(
      loadPiMcpSourceRegistry().sources.map((item) => item.id),
      ["one", "two"],
    );
  });

  it("admits a saved source without any connection test", async function () {
    let opens = 0;
    await adopt({ sources: [httpInput({ id: "untested" })] });
    const runtime = createPiMcpToolSources({
      openClient: async () => {
        opens++;
        return {
          listTools: async () => ({
            tools: [
              {
                name: "read",
                inputSchema: { type: "object", properties: {} },
              },
            ],
          }),
          callTool: async () => ({ content: [{ type: "text", text: "ok" }] }),
          close: async () => undefined,
        };
      },
    });
    const catalog = await runtime.getCatalogForTurn();
    assert.equal(opens, 1);
    assert.deepEqual(
      catalog.tools.map((tool) => tool.name),
      ["read"],
    );
    await runtime.dispose();
  });
});

describe("Pi MCP transport authentication seam", function () {
  this.timeout(20_000);
  let server: http.Server;
  let origin: string;
  const received: string[] = [];
  // The native socket layer is the only part that cannot run outside the
  // plugin host; the brokered policy and the MCP transport above it are real.
  const nodeTransport: PiNativeHttpTransport = {
    resolve: async () => ["127.0.0.1"],
    open(options) {
      const controller = new AbortController();
      options.signal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
      const request = http.request(
        options.url,
        {
          method: options.method,
          headers: options.headers,
          signal: controller.signal,
        },
        (response) => {
          const chunks: Buffer[] = [];
          response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
          response.on("end", () => {
            const bytes = new Uint8Array(Buffer.concat(chunks));
            bodyStream = new ReadableStream({
              start(controller) {
                controller.enqueue(bytes);
                controller.close();
              },
            });
            resolveHead({
              status: response.statusCode || 0,
              headers: Object.fromEntries(
                Object.entries(response.headers).map(([name, value]) => [
                  name,
                  Array.isArray(value) ? value.join(", ") : String(value ?? ""),
                ]),
              ),
              peerAddress: "127.0.0.1",
              url: options.url,
            });
          });
        },
      );
      request.on("error", rejectHead);
      request.end(options.body);
      return {
        head: new Promise<PiNativeResponseHead>((resolve, reject) => {
          resolveHead = resolve;
          rejectHead = reject;
        }),
        get body() {
          return bodyStream;
        },
        abort: () => controller.abort(),
      };
    },
  };
  let bodyStream = new ReadableStream<Uint8Array>();
  let resolveHead: (head: PiNativeResponseHead) => void = () => undefined;
  let rejectHead: (error: unknown) => void = () => undefined;

  before(async function () {
    server = http.createServer((request, response) => {
      received.push(JSON.stringify(request.headers));
      response.writeHead(400, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: { code: -32600, message: "stop" },
        }),
      );
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", () => resolve()),
    );
    const address = server.address();
    origin = `http://127.0.0.1:${
      typeof address === "object" && address ? address.port : 0
    }`;
  });
  after(async function () {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  beforeEach(function () {
    received.length = 0;
  });

  async function observedHeader(
    authentication: PiMcpSourceInput["authentication"],
    field: string,
    token: string,
  ) {
    let failed = false;
    let reason = "";
    try {
      await openPiMcpSource(
        {
          id: "seam",
          label: "Seam",
          transport: "http",
          url: `${origin}/mcp`,
          enabled: true,
          authentication,
          credentialSlots: { [field]: "mcp-seam-token" },
          localNetworkApproval: origin,
        },
        () => undefined,
        { [field]: token },
        new AbortController().signal,
        { transport: nodeTransport },
      );
    } catch (error) {
      failed = true;
      reason = error instanceof Error ? error.message : String(error);
    }
    assert.isTrue(failed, "the fixture server refuses the handshake");
    assert.isAbove(received.length, 0, reason);
    const headers = JSON.parse(received[0]) as Record<string, string>;
    return headers[field.toLowerCase()] || "";
  }

  it("sends exactly one Bearer prefix over the live HTTP transport", async function () {
    const header = await observedHeader(
      { kind: "bearer", field: "Authorization" },
      "Authorization",
      "fixture-token",
    );
    assert.equal(header, "Bearer fixture-token");
    assert.equal(header.split("Bearer ").length - 1, 1);
  });

  it("keeps a single prefix when the entered token already carries one", async function () {
    const header = await observedHeader(
      { kind: "bearer", field: "Authorization" },
      "Authorization",
      "Bearer fixture-token",
    );
    assert.equal(header, "Bearer fixture-token");
  });

  it("sends an API key unchanged in its chosen field", async function () {
    const header = await observedHeader(
      { kind: "apiKey", field: "X-Api-Key" },
      "X-Api-Key",
      "raw-key",
    );
    assert.equal(header, "raw-key");
  });
});

async function readPiMcpCredential(ref: string) {
  const result = await readPiCredential(ref, "mcp-source");
  return {
    present: result.ok,
    secret:
      result.ok && result.material.kind === "mcp-secret"
        ? result.material.secret
        : "",
  };
}

describe("Pi MCP Tool Sources runtime", function () {
  this.timeout(15_000);
  let prior: string;
  beforeEach(function () {
    prior = String(getPref("piMcpSourceRegistryJson") || "");
    setPref("piMcpSourceRegistryJson", "");
  });
  afterEach(function () {
    setPref("piMcpSourceRegistryJson", prior);
  });
  async function save(overrides: Partial<PiMcpSourceInput> & { id: string }) {
    setPref(
      "piMcpSourceRegistryJson",
      JSON.stringify({
        version: 1,
        sources: [
          {
            id: overrides.id,
            label: overrides.id,
            transport: "http",
            url: "https://example.org/mcp",
            enabled: true,
            authentication: { kind: "none" },
            credentialSlots: {},
            ...overrides,
          },
        ],
      }),
    );
  }

  it("never replays a dispatched call and reports an unknown outcome", async function () {
    let calls = 0;
    const controller = new AbortController();
    let failure = "disconnected";
    const tool = {
      name: "search",
      description: "Search",
      inputSchema: { type: "object", properties: {} },
    };
    const runtime = createPiMcpToolSources({
      openClient: async () => ({
        listTools: async () => ({ tools: [tool] }),
        callTool: async (_args, options) => {
          calls++;
          assert.equal(options?.signal, controller.signal);
          controller.abort();
          throw new Error(failure);
        },
        close: async () => undefined,
      }),
    });
    await save({ id: "s" });
    const frozen = await runtime.getCatalogForTurn();
    assert.lengthOf(frozen.tools, 1);
    const failed = await runtime.callTool(
      frozen,
      "s",
      "search",
      {},
      controller.signal,
    );
    assert.equal(failed.effectCertainty, "unknown");
    assert.equal(calls, 1);
    failure = "oauth_not_supported";
    const oauth = await runtime.callTool(
      frozen,
      "s",
      "search",
      {},
      controller.signal,
    );
    assert.equal(oauth.code, "oauth_not_supported");
    assert.equal(oauth.effectCertainty, "unknown");
    assert.equal(calls, 2);
    await runtime.dispose();
  });

  it("freezes the turn catalog and validates a changed descriptor for a later turn", async function () {
    let changed: () => void = () => undefined;
    let description = "first";
    const runtime = createPiMcpToolSources({
      openClient: async (_source, invalidate) => {
        changed = invalidate;
        return {
          listTools: async () => ({
            tools: [
              { name: "search", description, inputSchema: { type: "object" } },
            ],
          }),
          callTool: async () => ({ content: [{ type: "text", text: "ok" }] }),
          close: async () => undefined,
        };
      },
    });
    await save({ id: "changed" });
    const frozen = await runtime.getCatalogForTurn();
    assert.lengthOf(frozen.tools, 1);
    assert.equal(frozen.tools[0].description, "first");
    description = "second";
    changed();
    const later = await runtime.getCatalogForTurn();
    assert.equal(later.tools[0].description, "second");
    assert.equal(frozen.tools[0].description, "first");
    assert.equal(later.digest === frozen.digest, false);
    await runtime.dispose();
  });

  it("derives conservative effects from the transport alone", async function () {
    const runtime = createPiMcpToolSources({
      openClient: async () => ({
        listTools: async () => ({
          tools: [{ name: "read", inputSchema: { type: "object" } }],
        }),
        callTool: async () => ({ content: [{ type: "text", text: "ok" }] }),
        close: async () => undefined,
      }),
    });
    setPref(
      "piMcpSourceRegistryJson",
      JSON.stringify({
        version: 1,
        sources: [
          {
            id: "remote",
            label: "Remote",
            transport: "http",
            url: "https://example.org/mcp",
            enabled: true,
            authentication: { kind: "none" },
            credentialSlots: {},
          },
          {
            id: "local",
            label: "Local",
            transport: "stdio",
            executable: process.execPath,
            argv: [],
            enabled: true,
            authentication: { kind: "none" },
            credentialSlots: {},
          },
        ],
      }),
    );
    const catalog = await runtime.getCatalogForTurn();
    assert.includeMembers(
      catalog.tools.find((tool) => tool.sourceId === "remote")!.effects,
      ["external-egress", "external-mutation"],
    );
    assert.includeMembers(
      catalog.tools.find((tool) => tool.sourceId === "local")!.effects,
      ["code-execution", "host-control"],
    );
    await runtime.dispose();
  });

  it("binds the source identity to its authentication field", async function () {
    const runtime = createPiMcpToolSources({
      openClient: async () => ({
        listTools: async () => ({
          tools: [{ name: "read", inputSchema: { type: "object" } }],
        }),
        callTool: async () => ({ content: [{ type: "text", text: "ok" }] }),
        close: async () => undefined,
      }),
    });
    await save({
      id: "auth-drift",
      authentication: { kind: "bearer", field: "Authorization" },
      credentialSlots: { Authorization: "mcp-auth-drift-authorization" },
    });
    const saved = () =>
      loadPiMcpSourceRegistry().sources.find(
        (item) => item.id === "auth-drift",
      )!;
    const base = piMcpSourceBindingIdentity(saved());
    await save({
      id: "auth-drift",
      label: "Renamed",
      enabled: false,
      authentication: { kind: "bearer", field: "Authorization" },
      credentialSlots: { Authorization: "mcp-auth-drift-authorization" },
    });
    assert.equal(piMcpSourceBindingIdentity(saved()), base);
    await save({
      id: "auth-drift",
      enabled: true,
      authentication: { kind: "apiKey", field: "Authorization" },
      credentialSlots: { Authorization: "mcp-auth-drift-authorization" },
    });
    assert.notEqual(piMcpSourceBindingIdentity(saved()), base);
    const catalog = await runtime.getCatalogForTurn();
    assert.lengthOf(catalog.tools, 1);
    await save({
      id: "auth-drift",
      enabled: true,
      authentication: { kind: "apiKey", field: "X-Api-Key" },
      credentialSlots: { Authorization: "mcp-auth-drift-authorization" },
    });
    const stale = await runtime.callTool(
      catalog,
      "auth-drift",
      "read",
      {},
      new AbortController().signal,
    );
    assert.equal(stale.code, "mcp_source_unavailable");
    await runtime.dispose();
  });

  it("bounds complete results before Gateway projection", function () {
    const text = normalizePiMcpCallResult({
      content: [{ type: "text", text: "answer" }],
      structuredContent: { count: 2 },
    });
    assert.equal(text.status, "completed");
    assert.include(JSON.stringify(text.value), "answer");
    const unsupported = normalizePiMcpCallResult({
      content: [{ type: "audio", data: "AA==", mimeType: "audio/wav" }],
    });
    assert.equal(unsupported.code, "unsupported_result_content");
    assert.notInclude(JSON.stringify(unsupported), "AA==");
    const mixed = normalizePiMcpCallResult({
      content: [
        { type: "text", text: "usable" },
        { type: "audio", data: "AA==", mimeType: "audio/wav" },
      ],
    });
    assert.equal(mixed.status, "completed");
    assert.notInclude(JSON.stringify(mixed), "AA==");
  });

  it("routes the frozen proxy through Gateway evidence and refuses a changed source", async function () {
    let calls = 0;
    const runtime = createPiMcpToolSources({
      openClient: async () => ({
        listTools: async () => ({
          tools: [
            {
              name: "write",
              description: "Write",
              inputSchema: { type: "object", properties: {} },
            },
          ],
        }),
        callTool: async () => {
          calls++;
          return { content: [{ type: "text", text: "ok" }] };
        },
        close: async () => undefined,
      }),
    });
    await save({ id: "gateway" });
    const catalog = await runtime.getCatalogForTurn();
    const definitions = piMcpGatewayDefinitions(catalog, runtime);
    assert.deepEqual(
      definitions.map((item) => item.capabilityId),
      ["mcp.proxy"],
    );
    const receipts: string[] = [];
    const turn = await freezePiMcpGatewayTurn(catalog, runtime, {
      owner: { kind: "conversation", ownerId: "mcp-owner" },
      turnId: "mcp-turn",
      definitions: [],
      runtimeCapability: {
        identity: "mcp-test",
        availableCapabilityIds: ["mcp.proxy"],
      },
      policy: {
        mode: "automatic",
        systemAllowedEffects: [
          "bounded-read",
          "external-egress",
          "external-mutation",
        ],
        authorizedEffects: [
          "bounded-read",
          "external-egress",
          "external-mutation",
        ],
        authorizedKeys: ["mcp:gateway"],
        maxCalls: 2,
        maxConcurrent: 1,
        maxCost: 2,
      },
      hooks: {
        recordStarted: async () => {
          receipts.push("started");
        },
        recordReceipt: async () => {
          receipts.push("terminal");
        },
        recordPermission: async () => undefined,
      },
    });
    const result = await turn.executeBatch([
      {
        callId: "one",
        name: "mcp",
        arguments: {
          action: "call",
          sourceId: "gateway",
          name: "write",
          arguments: {},
        },
      },
    ]);
    assert.equal(result.results[0].status, "completed");
    assert.deepEqual(receipts, ["started", "terminal"]);
    assert.equal(calls, 1);
    const missing = await turn.executeBatch([
      {
        callId: "two",
        name: "mcp",
        arguments: {
          action: "call",
          sourceId: "gateway",
          name: "absent",
          arguments: {},
        },
      },
    ]);
    assert.equal(missing.results[0].status, "failed");
    assert.equal(calls, 1);
    setPref(
      "piMcpSourceRegistryJson",
      JSON.stringify({
        version: 1,
        sources: [
          {
            id: "gateway",
            label: "Gateway",
            transport: "http",
            url: "https://other.example/mcp",
            enabled: true,
            authentication: { kind: "none" },
            credentialSlots: {},
          },
        ],
      }),
    );
    const stale = await runtime.callTool(
      catalog,
      "gateway",
      "write",
      {},
      new AbortController().signal,
    );
    assert.equal(stale.code, "mcp_source_unavailable");
    assert.equal(calls, 1);
    setPref(
      "piMcpSourceRegistryJson",
      '{"version":1,"sources":[{"id":"broken"}]}',
    );
    assert.lengthOf((await runtime.getCatalogForTurn()).tools, 0);
    assert.equal(
      (
        await runtime.callTool(
          catalog,
          "gateway",
          "write",
          {},
          new AbortController().signal,
        )
      ).code,
      "mcp_source_unavailable",
    );
    await runtime.dispose();
  });
});

describe("Pi MCP stdio transport", function () {
  this.timeout(15_000);
  it("rejects a late startup after the transport was closed", async function () {
    const transport = new PiMcpStdioTransport({
      executable: process.execPath,
      argv: ["-e", "setTimeout(() => {}, 200)"],
      cwd: process.cwd(),
      environment: { PATH: process.env.PATH || "" },
    });
    const starting = transport.start();
    await transport.close();
    const [result] = await Promise.allSettled([starting]);
    assert.equal(result.status, "rejected");
  });
  it("passes JSON-RPC through the protocol-neutral process bridge", async function () {
    const transport = new PiMcpStdioTransport({
      executable: process.execPath,
      argv: [path.resolve("tests/fixtures/pi/mcp-stdio-server.mjs")],
      cwd: process.cwd(),
      environment: { PATH: process.env.PATH || "" },
    });
    const received = new Promise<unknown>((resolve) => {
      transport.onmessage = resolve;
    });
    await transport.start();
    await transport.send({ jsonrpc: "2.0", id: 1, method: "ping" });
    assert.deepEqual(await received, { jsonrpc: "2.0", id: 1, result: {} });
    await transport.close();
  });
});
