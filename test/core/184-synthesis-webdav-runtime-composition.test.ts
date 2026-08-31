import { assert } from "chai";
import {
  rebuildSynthesisHostWebDavSyncDescription,
  rebuildSynthesisHostWebDavSyncEnsureCollectionRequest,
  rebuildSynthesisHostWebDavSyncEnsureCollectionResult,
  rebuildSynthesisHostWebDavSyncReadRequest,
  rebuildSynthesisHostWebDavSyncReadResult,
  rebuildSynthesisHostWebDavSyncWriteRequest,
  rebuildSynthesisHostWebDavSyncWriteResult,
} from "../../packages/synthesis-contracts/src/index";
import { createPrefsConfiguredSynthesisWebDavSyncPort } from "../../src/modules/synthesis/webDavSyncAdapter";
import type {
  SynthesisWebDavHttpClient,
  SynthesisWebDavHttpRequest,
} from "../../src/modules/synthesis/webDavSyncClient";

function configuredDescription(overrides: Record<string, unknown> = {}) {
  return {
    status: "available",
    configStatus: "configured",
    autoSyncEnabled: false,
    autoRetryEnabled: false,
    baseUrl: "https://dav.example.test/root",
    remotePath: "zotero-agents",
    username: "alice",
    credentialUpdatedAt: "2026-07-16T00:00:00.000Z",
    connectionTest: {
      ok: true,
      tested_at: "2026-07-16T00:00:00.000Z",
      config_status: "configured",
      diagnostics: [],
    },
    diagnostics: [],
    ...overrides,
  };
}

describe("Synthesis WebDAV runtime composition", function () {
  it("canonically rebuilds exact WebDAV description and operation DTOs", function () {
    assert.deepEqual(
      rebuildSynthesisHostWebDavSyncDescription(configuredDescription()),
      configuredDescription(),
    );
    assert.deepEqual(
      rebuildSynthesisHostWebDavSyncDescription({
        status: "disabled",
        configStatus: "incomplete",
        autoSyncEnabled: false,
        autoRetryEnabled: false,
        baseUrl: "",
        remotePath: "zotero-agents",
        username: "",
        diagnostics: ["webdav_sync_not_configured"],
      }),
      {
        status: "disabled",
        configStatus: "incomplete",
        autoSyncEnabled: false,
        autoRetryEnabled: false,
        baseUrl: "",
        remotePath: "zotero-agents",
        username: "",
        diagnostics: ["webdav_sync_not_configured"],
      },
    );
    assert.deepEqual(
      rebuildSynthesisHostWebDavSyncReadRequest({
        path: "snapshots/example/manifest.json",
      }),
      { path: "snapshots/example/manifest.json" },
    );
    assert.deepEqual(
      rebuildSynthesisHostWebDavSyncReadResult({
        status: "available",
        text: "{}",
        etag: '"example"',
        diagnostics: [],
      }),
      {
        status: "available",
        text: "{}",
        etag: '"example"',
        diagnostics: [],
      },
    );
    assert.deepEqual(
      rebuildSynthesisHostWebDavSyncWriteRequest({
        path: "HEAD.json",
        text: "{}",
        ifMatch: '"old"',
      }),
      { path: "HEAD.json", text: "{}", ifMatch: '"old"' },
    );
    assert.deepEqual(
      rebuildSynthesisHostWebDavSyncWriteResult({
        status: "conflict",
        diagnostics: ["webdav_sync_remote_changed_during_sync"],
      }),
      {
        status: "conflict",
        diagnostics: ["webdav_sync_remote_changed_during_sync"],
      },
    );
    assert.deepEqual(
      rebuildSynthesisHostWebDavSyncEnsureCollectionRequest({
        path: "snapshots/example/bundles",
      }),
      { path: "snapshots/example/bundles" },
    );
    assert.deepEqual(
      rebuildSynthesisHostWebDavSyncEnsureCollectionResult({
        status: "ready",
        diagnostics: [],
      }),
      { status: "ready", diagnostics: [] },
    );
  });

  it("rejects non-JSON, unsafe paths, secret-bearing descriptions, and malformed results", function () {
    const invalid = [
      () =>
        rebuildSynthesisHostWebDavSyncDescription({
          ...configuredDescription(),
          ignored: true,
        }),
      () =>
        rebuildSynthesisHostWebDavSyncReadRequest({
          path: "HEAD.json",
          ignored: true,
        }),
      () => rebuildSynthesisHostWebDavSyncReadRequest({ path: "/absolute" }),
      () => rebuildSynthesisHostWebDavSyncReadRequest({ path: "a/../b" }),
      () => rebuildSynthesisHostWebDavSyncReadRequest({ path: "a\\b" }),
      () =>
        rebuildSynthesisHostWebDavSyncWriteRequest({
          path: "HEAD.json",
          text: "{}",
          callback() {},
        }),
      () =>
        rebuildSynthesisHostWebDavSyncDescription(
          configuredDescription({
            baseUrl: "https://user:secret@dav.example.test/root",
          }),
        ),
      () =>
        rebuildSynthesisHostWebDavSyncDescription(
          configuredDescription({
            baseUrl: "https://dav.example.test/root?token=secret",
          }),
        ),
      () =>
        rebuildSynthesisHostWebDavSyncDescription(
          configuredDescription({ autoSyncEnabled: 1 }),
        ),
      () =>
        rebuildSynthesisHostWebDavSyncReadResult({
          status: "available",
          text: "{}",
          diagnostics: ["must-be-empty"],
        }),
      () =>
        rebuildSynthesisHostWebDavSyncWriteResult({
          status: "unavailable",
          diagnostics: [],
        }),
      () =>
        rebuildSynthesisHostWebDavSyncEnsureCollectionResult({
          status: "unknown",
          diagnostics: [],
        }),
    ];
    for (const operation of invalid) {
      assert.throws(operation);
    }
  });

  it("validates before Host I/O and reads current config and credential per operation", async function () {
    const requests: SynthesisWebDavHttpRequest[] = [];
    let credential = "first-secret";
    let configReads = 0;
    let credentialReads = 0;
    const client: SynthesisWebDavHttpClient = {
      async request(request) {
        requests.push(request);
        return request.method === "GET"
          ? { status: 200, ok: true, text: "{}", etag: '"head"' }
          : { status: 201, ok: true, text: "" };
      },
    };
    const port = createPrefsConfiguredSynthesisWebDavSyncPort({
      client,
      readConfig() {
        configReads += 1;
        return {
          enabled: true,
          baseUrl: "https://dav.example.test/root",
          remotePath: "zotero-agents",
          username: "alice",
          autoSyncEnabled: false,
          autoRetryEnabled: false,
        };
      },
      readStatus: () => ({
        enabled: true,
        base_url: "https://dav.example.test/root",
        remote_path: "zotero-agents",
        username: "alice",
        auto_sync_enabled: false,
        auto_retry_enabled: false,
        credential_configured: true,
        credential_updated_at: "2026-07-16T00:00:00.000Z",
        config_status: "configured",
        diagnostics: [],
      }),
      async readCredential() {
        credentialReads += 1;
        return credential;
      },
    });

    let rejected = false;
    try {
      await port.readText({ path: "../escape" });
    } catch {
      rejected = true;
    }
    assert.isTrue(rejected);
    assert.equal(configReads, 0);
    assert.equal(credentialReads, 0);
    assert.lengthOf(requests, 0);

    assert.deepEqual(await port.readText({ path: "HEAD.json" }), {
      status: "available",
      text: "{}",
      etag: '"head"',
      diagnostics: [],
    });
    credential = "second-secret";
    assert.deepEqual(await port.writeText({ path: "HEAD.json", text: "{}" }), {
      status: "written",
      diagnostics: [],
    });
    assert.equal(configReads, 2);
    assert.equal(credentialReads, 2);
    assert.deepEqual(
      requests.map((request) => ({
        method: request.method,
        url: request.url,
        username: request.username,
        credential: request.credential,
      })),
      [
        {
          method: "GET",
          url: "https://dav.example.test/root/zotero-agents/HEAD.json",
          username: "alice",
          credential: "first-secret",
        },
        {
          method: "PUT",
          url: "https://dav.example.test/root/zotero-agents/HEAD.json",
          username: "alice",
          credential: "second-secret",
        },
      ],
    );
    assert.notInclude(JSON.stringify(await port.describe()), "secret");
  });

  it("normalizes missing, ETag conflict, collection readiness, and Host failures", async function () {
    const requests: SynthesisWebDavHttpRequest[] = [];
    const client: SynthesisWebDavHttpClient = {
      async request(request) {
        requests.push(request);
        if (request.method === "GET") {
          return { status: 404, ok: false, text: "/private/secret" };
        }
        if (request.method === "PUT") {
          return { status: 412, ok: false, text: "secret conflict" };
        }
        if (request.method === "MKCOL") {
          return { status: 405, ok: false, text: "already exists" };
        }
        throw new Error("unexpected");
      },
    };
    const port = createPrefsConfiguredSynthesisWebDavSyncPort({
      client,
      readConfig: () => ({
        enabled: true,
        baseUrl: "https://dav.example.test/root",
        remotePath: "zotero-agents",
        username: "",
        autoSyncEnabled: false,
        autoRetryEnabled: false,
      }),
      readStatus: () => ({
        enabled: true,
        base_url: "https://dav.example.test/root",
        remote_path: "zotero-agents",
        username: "",
        auto_sync_enabled: false,
        auto_retry_enabled: false,
        credential_configured: false,
        config_status: "configured",
        diagnostics: [],
      }),
      readCredential: async () => "",
    });

    assert.deepEqual(await port.readText({ path: "HEAD.json" }), {
      status: "missing",
      diagnostics: [],
    });
    assert.deepEqual(
      await port.writeText({
        path: "HEAD.json",
        text: "{}",
        ifMatch: '"before"',
      }),
      {
        status: "conflict",
        diagnostics: ["webdav_sync_remote_changed_during_sync"],
      },
    );
    assert.deepEqual(
      await port.ensureCollection({ path: "snapshots/example/bundles" }),
      { status: "ready", diagnostics: [] },
    );
    assert.include(
      requests.map((request) => request.url),
      "https://dav.example.test/root/zotero-agents/snapshots/example/bundles",
    );

    const failed = createPrefsConfiguredSynthesisWebDavSyncPort({
      client: {
        async request() {
          throw new Error("/private/secret credential=raw");
        },
      },
      readConfig: () => ({
        enabled: true,
        baseUrl: "https://dav.example.test/root",
        remotePath: "zotero-agents",
        username: "",
        autoSyncEnabled: false,
        autoRetryEnabled: false,
      }),
      readStatus: () => ({
        enabled: true,
        base_url: "https://dav.example.test/root",
        remote_path: "zotero-agents",
        username: "",
        auto_sync_enabled: false,
        auto_retry_enabled: false,
        credential_configured: false,
        config_status: "configured",
        diagnostics: [],
      }),
      readCredential: async () => "raw-secret",
    });
    const result = await failed.readText({ path: "HEAD.json" });
    assert.deepEqual(result, {
      status: "unavailable",
      diagnostics: ["webdav_sync_host_read_failed"],
    });
    assert.notInclude(JSON.stringify(result), "secret");
  });
});
