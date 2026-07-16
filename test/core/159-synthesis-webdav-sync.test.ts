import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { createSynthesisService } from "../../src/modules/synthesis/service";
import { createSynthesisRepository } from "../../src/modules/synthesis/repository";
import { createPrefsConfiguredSynthesisWebDavSyncPort } from "../../src/modules/synthesis/webDavSyncAdapter";
import {
  clearWebDavSyncCredential,
  getWebDavSyncPrefsStatus,
  saveWebDavSyncCredential,
  saveWebDavSyncPrefs,
} from "../../src/modules/synthesis/webDavSyncPrefs";
import {
  type SynthesisWebDavHttpClient,
  type SynthesisWebDavHttpRequest,
} from "../../src/modules/synthesis/webDavSyncClient";
import { getPref, setPref } from "../../src/utils/prefs";

async function makeRuntimeRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), "zs-webdav-sync-"));
}

async function waitFor(predicate: () => boolean, timeoutMs = 1000) {
  const startedAt = Date.now();
  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error("timed out waiting for WebDAV test condition");
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

function resetWebDavPrefs() {
  setPref("synthesisWebDavSyncEnabled", false);
  setPref("synthesisWebDavSyncBaseUrl", "");
  setPref("synthesisWebDavSyncRemotePath", "zotero-agents");
  setPref("synthesisWebDavSyncUsername", "");
  setPref("synthesisWebDavSyncCredentialEncryptedJson", "");
  setPref("synthesisWebDavSyncCredentialMasked", "");
  setPref("synthesisWebDavSyncCredentialUpdatedAt", "");
  setPref("synthesisWebDavSyncAutoSyncEnabled", false);
  setPref("synthesisWebDavSyncAutoRetryEnabled", false);
  setPref("synthesisWebDavSyncConnectionTestJson", "");
}

function seedConcept(root: string, label = "Alpha concept") {
  const repository = createSynthesisRepository({ runtimeRoot: root });
  repository.upsertConcept({
    conceptId: "concept:alpha",
    label,
    conceptType: "method",
    domain: "vision",
    status: "accepted",
    shortDefinition: "A durable concept.",
  });
  repository.upsertTagVocabularyEntry({
    tag: "field:webdav",
    facet: "field",
    source: "manual",
  });
}

class MemoryWebDavClient implements SynthesisWebDavHttpClient {
  readonly files = new Map<string, string>();
  readonly collections = new Set<string>(["https://dav.example.test/root"]);
  readonly requests: SynthesisWebDavHttpRequest[] = [];
  mutateBeforeHeadPut?: () => void;
  failHeadReads = false;

  async request(request: SynthesisWebDavHttpRequest) {
    this.requests.push(request);
    const url = request.url.replace(/\\/g, "/");
    const parent = url.replace(/\/[^/]*$/g, "");
    if (request.method === "PROPFIND") {
      return { status: 207, ok: true, text: "" };
    }
    if (request.method === "MKCOL") {
      if (this.collections.has(url)) {
        return { status: 405, ok: false, text: "already exists" };
      }
      if (!this.collections.has(parent)) {
        return { status: 409, ok: false, text: "parent missing" };
      }
      this.collections.add(url);
      return { status: 201, ok: true, text: "" };
    }
    if (request.method === "GET") {
      if (url.endsWith("/HEAD.json") && this.failHeadReads) {
        return { status: 503, ok: false, text: "temporarily unavailable" };
      }
      if (!this.files.has(url)) {
        return { status: 404, ok: false, text: "" };
      }
      return {
        status: 200,
        ok: true,
        text: this.files.get(url),
        etag: `etag:${this.files.get(url)?.length || 0}`,
      };
    }
    if (request.method === "PUT") {
      if (url.endsWith("/HEAD.json") && this.mutateBeforeHeadPut) {
        this.mutateBeforeHeadPut();
        this.mutateBeforeHeadPut = undefined;
        const current = this.files.get(url) || "";
        if (
          request.headers?.["If-Match"] &&
          request.headers["If-Match"] !== `etag:${current.length}`
        ) {
          return { status: 412, ok: false, text: "precondition failed" };
        }
      }
      if (!this.collections.has(parent)) {
        return { status: 409, ok: false, text: "parent missing" };
      }
      this.files.set(url, String(request.body || ""));
      return { status: 201, ok: true, text: "" };
    }
    return { status: 201, ok: true, text: "" };
  }
}

describe("Synthesis WebDAV sync", function () {
  beforeEach(function () {
    resetWebDavPrefs();
  });

  it("stores WebDAV prefs and encrypted credentials without plaintext", async function () {
    const saved = saveWebDavSyncPrefs({
      enabled: true,
      baseUrl: "https://dav.example.test/root",
      remotePath: "zotero-agents",
      username: "alice",
      autoSyncEnabled: false,
      autoRetryEnabled: false,
    });
    assert.isTrue(saved.ok);
    assert.deepInclude(getWebDavSyncPrefsStatus(), {
      enabled: true,
      base_url: "https://dav.example.test/root",
      remote_path: "zotero-agents",
      username: "alice",
      auto_sync_enabled: false,
      auto_retry_enabled: false,
      config_status: "configured",
    });

    await saveWebDavSyncCredential("super-secret");
    const encrypted = String(
      getPref("synthesisWebDavSyncCredentialEncryptedJson") || "",
    );
    const status = getWebDavSyncPrefsStatus() as Record<string, unknown>;
    assert.notInclude(encrypted, "super-secret");
    assert.equal(getPref("synthesisWebDavSyncCredentialMasked"), "");
    assert.notProperty(status, "credential_masked");

    await clearWebDavSyncCredential();
    assert.equal(getPref("synthesisWebDavSyncCredentialEncryptedJson"), "");
  });

  it("preserves disabled WebDAV draft settings without validating them as active config", function () {
    saveWebDavSyncPrefs({
      enabled: true,
      baseUrl: "https://dav.example.test/root",
      remotePath: "zotero-agents",
      username: "alice",
    });

    const saved = saveWebDavSyncPrefs({
      enabled: false,
      baseUrl: "draft-host-without-scheme",
      remotePath: "draft/path",
      username: "bob",
    });

    assert.isTrue(saved.ok);
    assert.deepInclude(getWebDavSyncPrefsStatus(), {
      enabled: false,
      base_url: "draft-host-without-scheme",
      remote_path: "draft/path",
      username: "bob",
      config_status: "disabled",
    });
  });

  it("does not autosync service-level canonical writes by default", async function () {
    const root = await makeRuntimeRoot();
    const client = new MemoryWebDavClient();
    saveWebDavSyncPrefs({
      enabled: true,
      baseUrl: "https://dav.example.test/root",
      remotePath: "zotero-agents",
    });
    const service = createSynthesisService({
      root,
      libraryId: 1,
      hostWebDavSyncPort: createPrefsConfiguredSynthesisWebDavSyncPort({
        client,
      }),
    });

    await service.saveTagVocabulary({
      transactionId: "webdav-autosync-default-off",
      entries: [{ tag: "field:webdav", facet: "field", source: "manual" }],
    });

    assert.isFalse(client.requests.some((entry) => entry.method === "PUT"));
  });

  it("debounces enabled canonical-write autosync into one WebDAV run", async function () {
    const root = await makeRuntimeRoot();
    const client = new MemoryWebDavClient();
    saveWebDavSyncPrefs({
      enabled: true,
      baseUrl: "https://dav.example.test/root",
      remotePath: "zotero-agents",
      autoSyncEnabled: true,
    });
    const port = createPrefsConfiguredSynthesisWebDavSyncPort({ client });
    assert.deepInclude(await port.describe(), {
      autoSyncEnabled: true,
      autoRetryEnabled: false,
    });
    const service = createSynthesisService({
      root,
      libraryId: 1,
      hostWebDavSyncPort: port,
      webDavSyncDebounceMs: 5,
    });

    await service.saveTagVocabulary({
      transactionId: "webdav-autosync-1",
      entries: [{ tag: "field:webdav", facet: "field", source: "manual" }],
    });
    await service.saveTagVocabulary({
      transactionId: "webdav-autosync-2",
      entries: [{ tag: "field:sync", facet: "field", source: "manual" }],
    });

    await waitFor(() =>
      client.requests.some(
        (entry) => entry.method === "PUT" && entry.url.endsWith("/HEAD.json"),
      ),
    );
    assert.equal(
      client.requests.filter(
        (entry) => entry.method === "PUT" && entry.url.endsWith("/HEAD.json"),
      ).length,
      1,
    );
  });

  it("bounds automatic retries to four delays per trigger", async function () {
    const root = await makeRuntimeRoot();
    const client = new MemoryWebDavClient();
    client.failHeadReads = true;
    saveWebDavSyncPrefs({
      enabled: true,
      baseUrl: "https://dav.example.test/root",
      remotePath: "zotero-agents",
      autoRetryEnabled: true,
    });
    const service = createSynthesisService({
      root,
      libraryId: 1,
      hostWebDavSyncPort: createPrefsConfiguredSynthesisWebDavSyncPort({
        client,
      }),
      webDavSyncRetryDelaysMs: [0, 0, 0, 0],
    });

    await service.syncWebDavNow();
    await waitFor(
      () =>
        client.requests.filter(
          (entry) => entry.method === "GET" && entry.url.endsWith("/HEAD.json"),
        ).length === 5,
    );
    await new Promise((resolve) => setTimeout(resolve, 20));

    assert.equal(
      client.requests.filter(
        (entry) => entry.method === "GET" && entry.url.endsWith("/HEAD.json"),
      ).length,
      5,
    );
  });

  it("does not retry a terminal WebDAV snapshot failure", async function () {
    const root = await makeRuntimeRoot();
    const client = new MemoryWebDavClient();
    client.files.set(
      "https://dav.example.test/root/zotero-agents/HEAD.json",
      "not-json",
    );
    saveWebDavSyncPrefs({
      enabled: true,
      baseUrl: "https://dav.example.test/root",
      remotePath: "zotero-agents",
      autoRetryEnabled: true,
    });
    const service = createSynthesisService({
      root,
      libraryId: 1,
      hostWebDavSyncPort: createPrefsConfiguredSynthesisWebDavSyncPort({
        client,
      }),
      webDavSyncRetryDelaysMs: [0, 0, 0, 0],
    });

    const state = await service.syncWebDavNow();
    await new Promise((resolve) => setTimeout(resolve, 20));

    assert.equal(state.queue_state, "failed_permanent");
    assert.equal(
      client.requests.filter(
        (entry) => entry.method === "GET" && entry.url.endsWith("/HEAD.json"),
      ).length,
      1,
    );
  });

  for (const cancellation of ["pause", "conflict", "abort"] as const) {
    it(`cancels a pending WebDAV retry on ${cancellation}`, async function () {
      const root = await makeRuntimeRoot();
      const client = new MemoryWebDavClient();
      client.failHeadReads = true;
      saveWebDavSyncPrefs({
        enabled: true,
        baseUrl: "https://dav.example.test/root",
        remotePath: "zotero-agents",
        autoRetryEnabled: true,
      });
      const abortController = new AbortController();
      const service = createSynthesisService({
        root,
        libraryId: 1,
        hostWebDavSyncPort: createPrefsConfiguredSynthesisWebDavSyncPort({
          client,
        }),
        webDavSyncRetryDelaysMs: [40],
        runtimeAbortSignal: abortController.signal,
      });

      await service.syncWebDavNow();
      if (cancellation === "pause") {
        await service.pauseWebDavSync();
      } else if (cancellation === "conflict") {
        await service.resolveWebDavSyncConflict({ action: "use_remote" });
      } else {
        abortController.abort();
      }
      await new Promise((resolve) => setTimeout(resolve, 80));

      assert.equal(
        client.requests.filter(
          (entry) => entry.method === "GET" && entry.url.endsWith("/HEAD.json"),
        ).length,
        1,
      );
    });
  }

  it("initializes an empty WebDAV remote with durable bundles", async function () {
    const root = await makeRuntimeRoot();
    seedConcept(root);
    const client = new MemoryWebDavClient();
    saveWebDavSyncPrefs({
      enabled: true,
      baseUrl: "https://dav.example.test/root",
      remotePath: "zotero-agents",
    });
    const service = createSynthesisService({
      root,
      libraryId: 1,
      hostWebDavSyncPort: createPrefsConfiguredSynthesisWebDavSyncPort({
        client,
      }),
    });

    const state = await service.syncWebDavNow();

    assert.equal(state.queue_state, "idle");
    assert.isTrue(
      Array.from(client.files.keys()).some((entry) =>
        entry.endsWith("/HEAD.json"),
      ),
    );
    assert.isTrue(
      Array.from(client.files.keys()).some(
        (entry) =>
          entry.includes("/snapshots/") && entry.endsWith("/manifest.json"),
      ),
    );
    assert.isTrue(
      Array.from(client.files.keys()).some(
        (entry) => entry.includes("/snapshots/") && entry.includes("/bundles/"),
      ),
    );
    assert.isTrue(
      client.requests.some(
        (entry) =>
          entry.method === "MKCOL" && entry.url.includes("/snapshots/"),
      ),
    );
    const operations = createSynthesisRepository({
      runtimeRoot: root,
    }).listOperations({
      operationTypes: ["webdav_sync"],
      includeCompleted: true,
    });
    assert.equal(operations[0]?.status, "completed");
    assert.equal(operations[0]?.phase, "complete");
  });

  it("recovers a stale persisted WebDAV syncing state", async function () {
    const root = await makeRuntimeRoot();
    const client = new MemoryWebDavClient();
    saveWebDavSyncPrefs({
      enabled: true,
      baseUrl: "https://dav.example.test/root",
      remotePath: "zotero-agents",
    });
    const stateRoot = path.join(root, "runtime", "synthesis", "webdav-sync");
    await fs.mkdir(stateRoot, { recursive: true });
    await fs.writeFile(
      path.join(stateRoot, "webdav-sync-state.json"),
      JSON.stringify({
        schema_id: "synthesis.webdav_sync_state",
        schema_version: "1.0.0",
        queue_state: "syncing",
        paused: false,
        adapter_configured: true,
        config_status: "configured",
        base_url: "https://dav.example.test/root",
        remote_path: "zotero-agents",
        diagnostics: [],
        allowed_actions: ["pauseWebDavSync"],
        updated_at: "2026-06-16T00:00:00.000Z",
      }),
      "utf8",
    );

    const state = await createSynthesisService({
      root,
      libraryId: 1,
      hostWebDavSyncPort: createPrefsConfiguredSynthesisWebDavSyncPort({
        client,
      }),
      now: () => "2026-06-16T00:10:01.000Z",
    }).loadWebDavSyncState();

    assert.equal(state.queue_state, "failed_retryable");
    assert.include(
      state.diagnostics.map((entry) => entry.code),
      "webdav_sync_stale_running_recovered",
    );
  });

  it("hydrates a clean SQLite store from a WebDAV snapshot", async function () {
    const sourceRoot = await makeRuntimeRoot();
    seedConcept(sourceRoot, "Remote concept");
    const client = new MemoryWebDavClient();
    saveWebDavSyncPrefs({
      enabled: true,
      baseUrl: "https://dav.example.test/root",
      remotePath: "zotero-agents",
    });
    await createSynthesisService({
      root: sourceRoot,
      libraryId: 1,
      hostWebDavSyncPort: createPrefsConfiguredSynthesisWebDavSyncPort({
        client,
      }),
    }).syncWebDavNow();

    const targetRoot = await makeRuntimeRoot();
    const targetService = createSynthesisService({
      root: targetRoot,
      libraryId: 1,
      hostWebDavSyncPort: createPrefsConfiguredSynthesisWebDavSyncPort({
        client,
      }),
    });
    const state = await targetService.syncWebDavNow();
    const concepts = createSynthesisRepository({
      runtimeRoot: targetRoot,
    }).listConcepts();

    assert.equal(state.queue_state, "idle");
    assert.isTrue(concepts.some((entry) => entry.label === "Remote concept"));
  });

  it("rejects remote HEAD changes during upload", async function () {
    const root = await makeRuntimeRoot();
    seedConcept(root);
    const client = new MemoryWebDavClient();
    saveWebDavSyncPrefs({
      enabled: true,
      baseUrl: "https://dav.example.test/root",
      remotePath: "zotero-agents",
    });
    await createSynthesisService({
      root,
      libraryId: 1,
      hostWebDavSyncPort: createPrefsConfiguredSynthesisWebDavSyncPort({
        client,
      }),
    }).syncWebDavNow();
    seedConcept(root, "Local changed concept");
    client.mutateBeforeHeadPut = () => {
      client.files.set(
        "https://dav.example.test/root/zotero-agents/HEAD.json",
        JSON.stringify({
          schema_id: "synthesis.webdav_sync_head",
          schema_version: "1.0.0",
          snapshot_id: "external",
          manifest_hash: "sha256:external",
          updated_at: "2026-06-16T00:00:00.000Z",
        }),
      );
    };

    const state = await createSynthesisService({
      root,
      libraryId: 1,
      hostWebDavSyncPort: createPrefsConfiguredSynthesisWebDavSyncPort({
        client,
      }),
    }).syncWebDavNow();

    assert.equal(state.queue_state, "failed_retryable");
    assert.include(
      state.diagnostics.map((entry) => entry.code),
      "webdav_sync_remote_changed_during_sync",
    );
    const operations = createSynthesisRepository({
      runtimeRoot: root,
    }).listOperations({
      operationTypes: ["webdav_sync"],
      includeCompleted: true,
    });
    assert.equal(operations[0]?.status, "failed");
  });
});
