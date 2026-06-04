import { assert } from "chai";
import fs from "node:fs";
import {
  configureHostBridgeServerForTests,
  getHostBridgeServerStatus,
  handleHostBridgeHttpRequestForTests,
  hostBridgeServerInternalsForTests,
  redactHostBridgeToken,
  resetHostBridgeServerForTests,
  restartHostBridgeServer,
  rotateHostBridgeMasterToken,
  rotateHostBridgeToken,
  shutdownHostBridgeServer,
  startHostBridgeSupervisor,
} from "../../src/modules/hostBridgeServer";
import { HOST_BRIDGE_PROTOCOL_VERSION } from "../../src/modules/hostBridgeProtocol";
import { getPref, setPref } from "../../src/utils/prefs";

function parseRawHttpResponse(raw: string) {
  const splitIndex = raw.indexOf("\r\n\r\n");
  const head = splitIndex >= 0 ? raw.slice(0, splitIndex) : raw;
  const body = splitIndex >= 0 ? raw.slice(splitIndex + 4) : "";
  const status = Number(head.match(/^HTTP\/1\.1\s+(\d+)/)?.[1] || 0);
  return {
    status,
    body,
    json: JSON.parse(body),
  };
}

function rawHttpRequestBytes(args: {
  method: string;
  path: string;
  headers?: Record<string, string>;
  bodyBytes?: Uint8Array;
}) {
  const bodyBytes = args.bodyBytes || new Uint8Array();
  const headers = {
    "Content-Length": String(bodyBytes.byteLength),
    ...(args.headers || {}),
  };
  const head = [
    `${args.method} ${args.path} HTTP/1.1`,
    ...Object.entries(headers).map(([name, value]) => `${name}: ${value}`),
    "",
    "",
  ].join("\r\n");
  return new Uint8Array(
    Buffer.concat([Buffer.from(head, "latin1"), Buffer.from(bodyBytes)]),
  );
}

describe("host bridge server phase 1", function () {
  afterEach(function () {
    resetHostBridgeServerForTests();
    setPref("hostBridgeLanEnabled", false);
    setPref("hostBridgePinPortEnabled", false);
    setPref("hostBridgePinnedPort", 26570);
    setPref("hostBridgeAdvertisedHost", "");
    setPref("hostBridgeMasterTokenEncryptedJson", "");
    setPref("hostBridgeMasterTokenMasked", "");
    setPref("hostBridgeMasterTokenUpdatedAt", "");
    setPref("hostBridgeMasterTokenKeyMaterial", "");
  });

  it("serves unauthenticated health without leaking token or paths", async function () {
    const token = configureHostBridgeServerForTests({
      token: "phase-one-secret-token",
    });

    const parsed = parseRawHttpResponse(
      await handleHostBridgeHttpRequestForTests({
        method: "GET",
        path: "/bridge/v1/health",
      }),
    );

    assert.strictEqual(parsed.status, 200);
    assert.deepInclude(parsed.json, { status: "ok" });
    assert.deepInclude(parsed.json.result, {
      protocol: HOST_BRIDGE_PROTOCOL_VERSION,
      bindMode: "loopback",
      lanEnabled: false,
      authRequired: true,
    });
    assert.notInclude(parsed.body, token);
    assert.notInclude(parsed.body, "localPath");
  });

  it("requires bearer auth for manifest", async function () {
    configureHostBridgeServerForTests({ token: "manifest-token" });

    const parsed = parseRawHttpResponse(
      await handleHostBridgeHttpRequestForTests({
        method: "GET",
        path: "/bridge/v1/manifest",
      }),
    );

    assert.strictEqual(parsed.status, 401);
    assert.deepInclude(parsed.json, { status: "error" });
    assert.strictEqual(parsed.json.error.code, "unauthorized");
    assert.notProperty(parsed.json, "result");
  });

  it("serves authenticated manifest with redacted capability metadata", async function () {
    const token = configureHostBridgeServerForTests({
      token: "manifest-token",
    });

    const parsed = parseRawHttpResponse(
      await handleHostBridgeHttpRequestForTests({
        method: "GET",
        path: "/bridge/v1/manifest",
        headers: {
          authorization: `Bearer ${token}`,
        },
      }),
    );

    assert.strictEqual(parsed.status, 200);
    assert.deepInclude(parsed.json, { status: "ok" });
    assert.deepInclude(parsed.json.result, {
      protocol: HOST_BRIDGE_PROTOCOL_VERSION,
    });
    assert.include(
      parsed.json.result.capabilities.map(
        (capability: { name: string }) => capability.name,
      ),
      "library.get_item_detail",
    );
    assert.include(
      parsed.json.result.capabilities.map(
        (capability: { name: string }) => capability.name,
      ),
      "mutation.preview",
    );
    assert.deepInclude(parsed.json.result.workflowControl, {
      supported: true,
      explicitInputRequired: true,
      submitRequiresApproval: true,
    });
    assert.deepInclude(parsed.json.result.fileDownloads, {
      supported: true,
      endpoint: "GET /bridge/v1/files/{fileId}",
      urlTemplate: "{endpoint}/files/{fileId}",
      auth: "bearer",
      supportsRemoteClients: true,
      arbitraryPathAllowed: false,
      approvalRequired: false,
    });
    assert.deepEqual(parsed.json.result.cli, {
      supported: true,
      schema: "zotero-bridge.cli.v1",
    });
    assert.strictEqual(
      parsed.json.result.auth.tokenMasked,
      redactHostBridgeToken(token),
    );
    assert.notInclude(parsed.body, token);
    assert.notInclude(parsed.body, "localPath");
    assert.notInclude(parsed.body, "handler");
  });

  it("invalidates the old bearer token after rotation", async function () {
    const oldToken = configureHostBridgeServerForTests({ token: "old-token" });
    const rotated = rotateHostBridgeToken();

    const oldTokenResponse = parseRawHttpResponse(
      await handleHostBridgeHttpRequestForTests({
        method: "GET",
        path: "/bridge/v1/manifest",
        headers: {
          authorization: `Bearer ${oldToken}`,
        },
      }),
    );
    assert.strictEqual(oldTokenResponse.status, 401);

    const newTokenResponse = parseRawHttpResponse(
      await handleHostBridgeHttpRequestForTests({
        method: "GET",
        path: "/bridge/v1/manifest",
        headers: {
          authorization: `Bearer ${rotated.token}`,
        },
      }),
    );
    assert.strictEqual(newTokenResponse.status, 200);
  });

  it("returns structured routing errors", async function () {
    configureHostBridgeServerForTests({ token: "routing-token" });

    const missing = parseRawHttpResponse(
      await handleHostBridgeHttpRequestForTests({
        method: "GET",
        path: "/bridge/v1/unknown",
        headers: {
          authorization: "Bearer routing-token",
        },
      }),
    );
    assert.strictEqual(missing.status, 404);
    assert.strictEqual(missing.json.status, "error");
    assert.strictEqual(missing.json.error.code, "not_found");

    const invalidMethod = parseRawHttpResponse(
      await handleHostBridgeHttpRequestForTests({
        method: "POST",
        path: "/bridge/v1/health",
      }),
    );
    assert.strictEqual(invalidMethod.status, 405);
    assert.strictEqual(invalidMethod.json.status, "error");
    assert.strictEqual(invalidMethod.json.error.code, "method_not_allowed");
  });

  it("rejects malformed UTF-8 request bodies before JSON parsing", async function () {
    const token = configureHostBridgeServerForTests({ token: "utf8-token" });
    const parsed = parseRawHttpResponse(
      await handleHostBridgeHttpRequestForTests({
        method: "POST",
        path: "/bridge/v1/call",
        rawRequestBytes: rawHttpRequestBytes({
          method: "POST",
          path: "/bridge/v1/call",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json; charset=utf-8",
          },
          bodyBytes: new Uint8Array([0x7b, 0xff, 0x7d]),
        }),
      }),
    );

    assert.strictEqual(parsed.status, 400);
    assert.strictEqual(parsed.json.status, "error");
    assert.strictEqual(parsed.json.error.code, "bad_request");
    assert.include(parsed.json.error.message, "invalid_utf8_body");
  });

  it("reports loopback bind mode by default", function () {
    configureHostBridgeServerForTests();
    const status = getHostBridgeServerStatus();

    assert.strictEqual(status.protocol, HOST_BRIDGE_PROTOCOL_VERSION);
    assert.strictEqual(status.bindMode, "loopback");
    assert.isFalse(status.lanEnabled);
    assert.strictEqual(status.host, "127.0.0.1");
    assert.strictEqual(status.portMode, "random");
    assert.isFalse(status.pinPortEnabled);
    assert.strictEqual(status.pinnedPort, 26570);
  });

  it("uses the configured pinned port when pin port is enabled", async function () {
    const listened: number[] = [];
    setPref("hostBridgePinPortEnabled", true);
    setPref("hostBridgePinnedPort", 27654);
    hostBridgeServerInternalsForTests.setServerSocketFactory((port) => ({
      asyncListen: () => listened.push(port),
      close: () => undefined,
    }));

    const status = await restartHostBridgeServer();

    assert.strictEqual(status.status, "running");
    assert.strictEqual(status.port, 27654);
    assert.strictEqual(status.portMode, "pinned");
    assert.isTrue(status.pinPortEnabled);
    assert.deepEqual(listened, [27654]);
  });

  it("forces a fixed port for LAN mode and exposes remote endpoint hints", async function () {
    const listened: Array<{ port: number; bindMode: string }> = [];
    setPref("hostBridgeLanEnabled", true);
    setPref("hostBridgePinPortEnabled", false);
    setPref("hostBridgePinnedPort", 27655);
    setPref("hostBridgeAdvertisedHost", "192.0.2.25");
    hostBridgeServerInternalsForTests.setServerSocketFactory(
      (port, bindMode) => ({
        asyncListen: () => listened.push({ port, bindMode }),
        close: () => undefined,
      }),
    );

    const status = await restartHostBridgeServer();

    assert.strictEqual(status.status, "running");
    assert.strictEqual(status.bindMode, "lan");
    assert.isTrue(status.lanEnabled);
    assert.strictEqual(status.host, "0.0.0.0");
    assert.strictEqual(
      status.endpoint,
      "http://127.0.0.1:27655/bridge/v1",
    );
    assert.isTrue(status.pinPortEnabled);
    assert.strictEqual(status.portMode, "pinned");
    assert.strictEqual(status.port, 27655);
    assert.strictEqual(
      status.remoteEndpoint,
      "http://192.0.2.25:27655/bridge/v1",
    );
    assert.isFalse(status.remoteEndpointUsesPlaceholder);
    assert.deepEqual(listened, [{ port: 27655, bindMode: "lan" }]);

    const manifest = parseRawHttpResponse(
      await handleHostBridgeHttpRequestForTests({
        method: "GET",
        path: "/bridge/v1/manifest",
        headers: {
          authorization: `Bearer ${getPref("hostBridgeToken")}`,
        },
      }),
    );
    assert.strictEqual(manifest.status, 200);
    assert.strictEqual(
      manifest.json.result.endpoint.url,
      "http://127.0.0.1:27655/bridge/v1",
    );
    assert.strictEqual(
      manifest.json.result.endpoint.remoteUrl,
      "http://192.0.2.25:27655/bridge/v1",
    );
  });

  it("does not fall back to a random port when the LAN fixed port is unavailable", async function () {
    setPref("hostBridgeLanEnabled", true);
    setPref("hostBridgePinPortEnabled", true);
    setPref("hostBridgePinnedPort", 27656);
    hostBridgeServerInternalsForTests.setServerSocketFactory(() => {
      throw new Error("port unavailable");
    });

    const status = await restartHostBridgeServer();

    assert.strictEqual(status.status, "error");
    assert.strictEqual(status.bindMode, "lan");
    assert.isTrue(status.pinPortEnabled);
    assert.strictEqual(status.portMode, "pinned");
    assert.include(status.lastRecoveryReason, "LAN port");
  });

  it("allows local token and encrypted master token authentication independently", async function () {
    const localToken = configureHostBridgeServerForTests({
      token: "local-token",
    });
    const master = await rotateHostBridgeMasterToken();

    const encrypted = String(
      getPref("hostBridgeMasterTokenEncryptedJson") || "",
    );
    assert.isNotEmpty(encrypted);
    assert.notInclude(encrypted, master.token);

    const masterManifest = parseRawHttpResponse(
      await handleHostBridgeHttpRequestForTests({
        method: "GET",
        path: "/bridge/v1/manifest",
        headers: {
          authorization: `Bearer ${master.token}`,
        },
      }),
    );
    assert.strictEqual(masterManifest.status, 200);
    assert.isTrue(masterManifest.json.result.auth.masterTokenConfigured);
    assert.strictEqual(
      masterManifest.json.result.auth.masterTokenMasked,
      master.tokenMasked,
    );
    assert.notInclude(masterManifest.body, master.token);

    const rotated = await rotateHostBridgeMasterToken();
    const oldMaster = parseRawHttpResponse(
      await handleHostBridgeHttpRequestForTests({
        method: "GET",
        path: "/bridge/v1/manifest",
        headers: {
          authorization: `Bearer ${master.token}`,
        },
      }),
    );
    assert.strictEqual(oldMaster.status, 401);

    const newMaster = parseRawHttpResponse(
      await handleHostBridgeHttpRequestForTests({
        method: "GET",
        path: "/bridge/v1/manifest",
        headers: {
          authorization: `Bearer ${rotated.token}`,
        },
      }),
    );
    assert.strictEqual(newMaster.status, 200);

    const local = parseRawHttpResponse(
      await handleHostBridgeHttpRequestForTests({
        method: "GET",
        path: "/bridge/v1/manifest",
        headers: {
          authorization: `Bearer ${localToken}`,
        },
      }),
    );
    assert.strictEqual(local.status, 200);
  });

  it("disables pin port and falls back to the random range on pinned port conflict", async function () {
    const attempted: number[] = [];
    setPref("hostBridgePinPortEnabled", true);
    setPref("hostBridgePinnedPort", 27655);
    hostBridgeServerInternalsForTests.setServerSocketFactory((port) => {
      attempted.push(port);
      if (port === 27655) {
        throw new Error("address already in use");
      }
      return {
        asyncListen: () => undefined,
        close: () => undefined,
      };
    });

    const status = await restartHostBridgeServer();

    assert.strictEqual(status.status, "running");
    assert.strictEqual(attempted[0], 27655);
    assert.notStrictEqual(status.port, 27655);
    assert.isAtLeast(status.port, 26570);
    assert.isBelow(status.port, 26570 + 200);
    assert.strictEqual(status.portMode, "fallback");
    assert.isFalse(status.pinPortEnabled);
    assert.isFalse(getPref("hostBridgePinPortEnabled"));
    assert.include(status.lastRecoveryReason, "Pinned Host Bridge port");
  });

  it("supervisor restarts after an unexpected socket stop but not after shutdown", async function () {
    this.timeout(5000);
    let listener: { onStopListening?: () => void } | null = null;
    let listenCount = 0;
    hostBridgeServerInternalsForTests.setServerSocketFactory(() => ({
      asyncListen: (nextListener: { onStopListening?: () => void }) => {
        listener = nextListener;
        listenCount += 1;
      },
      close: () => undefined,
    }));

    startHostBridgeSupervisor();
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.strictEqual(getHostBridgeServerStatus().status, "running");
    assert.strictEqual(listenCount, 1);

    listener?.onStopListening?.();
    assert.strictEqual(getHostBridgeServerStatus().status, "stopped");
    assert.include(
      getHostBridgeServerStatus().lastRecoveryReason,
      "socket stopped",
    );
    await new Promise((resolve) =>
      setTimeout(
        resolve,
        hostBridgeServerInternalsForTests.constants.RECOVERY_DELAY_MS + 20,
      ),
    );
    assert.strictEqual(getHostBridgeServerStatus().status, "running");
    assert.strictEqual(listenCount, 2);
    assert.strictEqual(getHostBridgeServerStatus().restartCount, 1);

    await shutdownHostBridgeServer();
    assert.strictEqual(getHostBridgeServerStatus().status, "stopped");
    await new Promise((resolve) =>
      setTimeout(
        resolve,
        hostBridgeServerInternalsForTests.constants.RECOVERY_DELAY_MS + 20,
      ),
    );
    assert.strictEqual(getHostBridgeServerStatus().status, "stopped");
    assert.strictEqual(listenCount, 2);
  });

  it("declares Host Bridge prefs and settings controls", function () {
    const prefs = fs.readFileSync("addon/prefs.js", "utf8");
    assert.include(prefs, 'pref("hostBridgeLanEnabled", false)');
    assert.include(prefs, 'pref("hostBridgePinPortEnabled", false)');
    assert.include(prefs, 'pref("hostBridgePinnedPort", 26570)');
    assert.include(prefs, 'pref("hostBridgeToken", "")');
    assert.include(prefs, 'pref("hostBridgeTokenCreatedAt", "")');
    assert.include(prefs, 'pref("hostBridgeTokenRotatedAt", "")');

    setPref("hostBridgeLanEnabled", true);
    setPref("hostBridgePinPortEnabled", true);
    setPref("hostBridgePinnedPort", 27653);
    setPref("hostBridgeToken", "typed-token");
    setPref("hostBridgeTokenCreatedAt", "created");
    setPref("hostBridgeTokenRotatedAt", "rotated");
    assert.isTrue(getPref("hostBridgeLanEnabled"));
    assert.isTrue(getPref("hostBridgePinPortEnabled"));
    assert.strictEqual(getPref("hostBridgePinnedPort"), 27653);
    assert.strictEqual(getPref("hostBridgeToken"), "typed-token");
    assert.strictEqual(getPref("hostBridgeTokenCreatedAt"), "created");
    assert.strictEqual(getPref("hostBridgeTokenRotatedAt"), "rotated");

    const preferences = fs.readFileSync(
      "addon/content/preferences.xhtml",
      "utf8",
    );
    assert.include(preferences, "host-bridge-lan-enabled");
    assert.include(preferences, "host-bridge-pin-port-enabled");
    assert.include(preferences, "host-bridge-pinned-port");
    assert.include(preferences, "host-bridge-show-endpoint");
    assert.include(preferences, "host-bridge-rotate-token");
    assert.include(preferences, "host-bridge-install-cli");
    assert.notInclude(preferences, "host-bridge-custom-cli");

    const hooks = fs.readFileSync("src/hooks.ts", "utf8");
    assert.include(hooks, "startHostBridgeSupervisor");
    assert.include(hooks, "stopHostBridgeSupervisor");
    assert.include(hooks, "setHostBridgePinPort");
  });
});
