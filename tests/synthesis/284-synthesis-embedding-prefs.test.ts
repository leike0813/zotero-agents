import { assert } from "chai";
import { getPref, setPref } from "../../src/utils/prefs";
import {
  readSynthesisWebDavSyncCredential,
  storeSynthesisWebDavSyncCredential,
} from "../../src/modules/synthesis/webDavSyncCredentialPrefs";
import {
  readSynthesisEmbeddingCredential,
  storeSynthesisEmbeddingCredential,
} from "../../src/modules/synthesis/synthesisEmbeddingCredentialPrefs";
import {
  createSynthesisEmbeddingHostPort,
  getSynthesisEmbeddingConnectionIdentity,
  getSynthesisEmbeddingPrefsStatus,
  saveSynthesisEmbeddingPrefs,
  submitSynthesisEmbeddingSettings,
  testSynthesisEmbeddingConnection,
} from "../../src/modules/synthesis/synthesisEmbeddingPrefs";
import {
  createSynthesisEmbeddingProvider,
  type SynthesisEmbeddingHttpClient,
} from "../../src/modules/synthesis/synthesisEmbeddingProvider";
import {
  rebuildSynthesisRetrievalConnection,
  type SynthesisRetrievalConnection,
} from "../../packages/synthesis-contracts/src";

const EMBEDDING_CONNECTION: SynthesisRetrievalConnection = {
  id: "local-ollama",
  name: "Local Ollama",
  protocol: "ollama",
  baseUrl: "http://127.0.0.1:11434",
  modelId: "qwen3-embedding:0.6b",
  queryPrefix: "q: ",
  documentPrefix: "",
};

function resetEmbeddingPrefs() {
  setPref("synthesisEmbeddingEnabled", false);
  setPref("synthesisEmbeddingConnectionsJson", "");
  setPref("synthesisEmbeddingSelectionJson", "");
  setPref("synthesisEmbeddingPendingScopeJson", "");
  setPref("synthesisEmbeddingCredentialsJson", "");
  setPref("synthesisEmbeddingConnectionTestJson", "");
  setPref("synthesisWebDavSyncCredentialEncryptedJson", "");
  setPref("synthesisWebDavSyncCredentialUpdatedAt", "");
}

function fakeClient() {
  const calls: string[] = [];
  const client: SynthesisEmbeddingHttpClient = {
    async request(args) {
      calls.push(args.body);
      const count = JSON.parse(args.body).input.length;
      return {
        status: 200,
        text: JSON.stringify({
          embeddings: Array.from({ length: count }, () => [1, 0]),
        }),
      };
    },
  };
  return { calls, client };
}

describe("Synthesis embedding preferences", function () {
  this.timeout(20_000);

  beforeEach(resetEmbeddingPrefs);

  it("defaults a new index to all four sources in the current personal library", function () {
    assert.deepEqual(getSynthesisEmbeddingPrefsStatus().pendingScope, {
      libraryIds: [Zotero.Libraries.userLibraryID],
      sourceKinds: ["metadata", "fulltext", "analysis"],
      includeTopics: true,
    });
  });

  it("retains the saved scope when a paper selection cannot resolve its personal library", function () {
    const libraries = Zotero.Libraries;
    const previousId = libraries.userLibraryID;
    const saved = JSON.stringify({
      libraryIds: [previousId],
      sourceKinds: ["metadata"],
      includeTopics: true,
    });
    setPref("synthesisEmbeddingPendingScopeJson", saved);
    try {
      libraries.userLibraryID = 0;
      const result = saveSynthesisEmbeddingPrefs({
        pendingScope: {
          libraryIds: [42],
          sourceKinds: ["fulltext"],
          includeTopics: true,
        },
      });
      assert.isFalse(result.ok);
      assert.equal(getPref("synthesisEmbeddingPendingScopeJson"), saved);
    } finally {
      libraries.userLibraryID = previousId;
    }
  });

  for (const libraryIds of [[], [7, 42]]) {
    it(`recovers saved paper sources from library scope [${libraryIds}] without resaving`, function () {
      setPref(
        "synthesisEmbeddingPendingScopeJson",
        JSON.stringify({
          libraryIds,
          sourceKinds: ["analysis"],
          includeTopics: true,
        }),
      );
      assert.deepEqual(getSynthesisEmbeddingPrefsStatus().pendingScope, {
        libraryIds: [Zotero.Libraries.userLibraryID],
        sourceKinds: ["analysis"],
        includeTopics: true,
      });
    });
  }

  it("saves and tests a selected draft without making it primary or resetting its personal library scope", async function () {
    const scope = {
      libraryIds: [Zotero.Libraries.userLibraryID],
      sourceKinds: ["metadata" as const],
      includeTopics: false,
    };
    saveSynthesisEmbeddingPrefs({ pendingScope: scope });
    const fake = fakeClient();
    const result = await submitSynthesisEmbeddingSettings(
      {
        connection: EMBEDDING_CONNECTION,
        credential: "new-secret",
        test: true,
      },
      { client: fake.client },
    );
    assert.isTrue(result.ok);
    assert.isTrue(result.test?.ok);
    assert.isNull(result.status.primaryConnectionId);
    assert.deepEqual(result.status.pendingScope, scope);
    const read = await readSynthesisEmbeddingCredential(
      EMBEDDING_CONNECTION.id,
    );
    assert.equal(read.ok && read.credential, "new-secret");
    assert.notInclude(JSON.stringify(result.status), "new-secret");
  });

  it("invalidates connection verification on endpoint or credential changes and ignores a late probe", async function () {
    saveSynthesisEmbeddingPrefs({
      connections: [EMBEDDING_CONNECTION],
      primaryConnectionId: EMBEDDING_CONNECTION.id,
    });
    const fake = fakeClient();
    await testSynthesisEmbeddingConnection({ client: fake.client });
    assert.isNotNull(
      getSynthesisEmbeddingConnectionIdentity(EMBEDDING_CONNECTION.id),
    );
    saveSynthesisEmbeddingPrefs({
      connections: [{ ...EMBEDDING_CONNECTION, baseUrl: "http://other:11434" }],
    });
    assert.isNull(
      getSynthesisEmbeddingConnectionIdentity(EMBEDDING_CONNECTION.id),
    );
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const late = testSynthesisEmbeddingConnection({
      client: {
        async request() {
          await gate;
          return {
            status: 200,
            text: JSON.stringify({ embeddings: [[1, 0]] }),
          };
        },
      },
    });
    await storeSynthesisEmbeddingCredential(
      EMBEDDING_CONNECTION.id,
      "replacement",
    );
    release();
    await late;
    assert.isNull(
      getSynthesisEmbeddingConnectionIdentity(EMBEDDING_CONNECTION.id),
    );
  });

  it("deletes only the requested connection and keeps ordered selection and credentials isolated", async function () {
    const other = { ...EMBEDDING_CONNECTION, id: "other", name: "Other" };
    const third = { ...EMBEDDING_CONNECTION, id: "third", name: "Third" };
    saveSynthesisEmbeddingPrefs({
      connections: [EMBEDDING_CONNECTION, other, third],
      primaryConnectionId: EMBEDDING_CONNECTION.id,
      fallbackConnectionIds: [third.id, other.id],
    });
    await storeSynthesisEmbeddingCredential(
      EMBEDDING_CONNECTION.id,
      "first-secret",
    );
    await storeSynthesisEmbeddingCredential(other.id, "other-secret");
    const removed = await submitSynthesisEmbeddingSettings({
      removeConnectionId: EMBEDDING_CONNECTION.id,
    });
    assert.isTrue(removed.ok);
    assert.isNull(removed.status.primaryConnectionId);
    assert.deepEqual(removed.status.fallbackConnectionIds, [
      third.id,
      other.id,
    ]);
    assert.deepEqual(
      removed.status.connections.map((entry) => entry.id),
      [other.id, third.id],
    );
    assert.isFalse(
      (await readSynthesisEmbeddingCredential(EMBEDDING_CONNECTION.id)).ok,
    );
    const retained = await readSynthesisEmbeddingCredential(other.id);
    assert.equal(retained.ok && retained.credential, "other-secret");
  });

  it("rejects invalid request overrides before storing a credential or changing configuration", async function () {
    for (const common of [{ truncate: true }, { api_key: "secret" }]) {
      const saved = await submitSynthesisEmbeddingSettings({
        connection: { ...EMBEDDING_CONNECTION, parameters: { common } },
        credential: "must-not-save",
      });
      assert.isFalse(saved.ok);
      assert.isEmpty(saved.status.connections);
      assert.isFalse(
        (await readSynthesisEmbeddingCredential(EMBEDDING_CONNECTION.id)).ok,
      );
    }
  });

  it("restores configuration and the old credential when a preference write fails during save", async function () {
    saveSynthesisEmbeddingPrefs({ connections: [EMBEDDING_CONNECTION] });
    await storeSynthesisEmbeddingCredential(EMBEDDING_CONNECTION.id, "old-key");
    const original = Zotero.Prefs.set;
    let fail = true;
    Zotero.Prefs.set = ((key: string, ...args: unknown[]) => {
      if (fail && key.endsWith(".synthesisEmbeddingConnectionsJson")) {
        fail = false;
        throw new Error("synthetic write failure");
      }
      return (original as any).call(Zotero.Prefs, key, ...args);
    }) as typeof original;
    try {
      const result = await submitSynthesisEmbeddingSettings({
        connection: { ...EMBEDDING_CONNECTION, modelId: "other" },
        credential: "new-key",
      });
      assert.isFalse(result.ok);
      assert.equal(
        result.status.connections[0].modelId,
        EMBEDDING_CONNECTION.modelId,
      );
      const restored = await readSynthesisEmbeddingCredential(
        EMBEDDING_CONNECTION.id,
      );
      assert.equal(restored.ok && restored.credential, "old-key");
    } finally {
      Zotero.Prefs.set = original;
    }
  });

  it("does not let an older same-configuration probe overwrite a newer successful test", async function () {
    saveSynthesisEmbeddingPrefs({
      connections: [EMBEDDING_CONNECTION],
      primaryConnectionId: EMBEDDING_CONNECTION.id,
    });
    let finish!: () => void;
    const gate = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const old = testSynthesisEmbeddingConnection({
      client: {
        async request() {
          await gate;
          return { status: 401, text: "" };
        },
      },
    });
    const newerClient = fakeClient();
    const newer = testSynthesisEmbeddingConnection({
      client: newerClient.client,
    });
    await Promise.resolve();
    assert.lengthOf(newerClient.calls, 0);
    finish();
    await Promise.all([old, newer]);
    assert.isNotNull(
      getSynthesisEmbeddingConnectionIdentity(EMBEDDING_CONNECTION.id),
    );
  });

  it("preserves independent connections when two credential saves overlap", async function () {
    await Promise.all([
      submitSynthesisEmbeddingSettings({
        connection: EMBEDDING_CONNECTION,
        credential: "first",
      }),
      submitSynthesisEmbeddingSettings({
        connection: { ...EMBEDDING_CONNECTION, id: "other", name: "Other" },
        credential: "second",
      }),
    ]);
    assert.sameMembers(
      getSynthesisEmbeddingPrefsStatus().connections.map((entry) => entry.id),
      [EMBEDDING_CONNECTION.id, "other"],
    );
    for (const [id, key] of [
      [EMBEDDING_CONNECTION.id, "first"],
      ["other", "second"],
    ]) {
      const read = await readSynthesisEmbeddingCredential(id);
      assert.equal(read.ok && read.credential, key);
    }
  });

  it("round-trips an embedding credential without disturbing WebDAV", async function () {
    await storeSynthesisWebDavSyncCredential("dav-pass");
    await storeSynthesisEmbeddingCredential("local-ollama", "embed-key");

    const webdavEnvelope = JSON.parse(
      String(getPref("synthesisWebDavSyncCredentialEncryptedJson")),
    ) as { schema_id: string };
    assert.equal(webdavEnvelope.schema_id, "synthesis.webdav_sync_credential");
    const embeddingEnvelopes = JSON.parse(
      String(getPref("synthesisEmbeddingCredentialsJson")),
    ) as Record<string, { schema_id: string }>;
    assert.equal(
      embeddingEnvelopes["local-ollama"].schema_id,
      "synthesis.embedding_credential",
    );

    const webdav = await readSynthesisWebDavSyncCredential();
    assert.isTrue(webdav.ok);
    assert.equal(webdav.ok && webdav.credential, "dav-pass");
    const embedding = await readSynthesisEmbeddingCredential("local-ollama");
    assert.isTrue(embedding.ok);
    assert.equal(embedding.ok && embedding.credential, "embed-key");
  });

  it("reports a missing embedding credential distinctly", async function () {
    const result = await readSynthesisEmbeddingCredential("absent");
    assert.isFalse(result.ok);
    assert.equal(
      result.ok === false && result.code,
      "embedding_credential_missing",
    );
  });

  it("accepts the boundary dimension and rejects one above it", function () {
    assert.equal(
      rebuildSynthesisRetrievalConnection({
        ...EMBEDDING_CONNECTION,
        dimensions: 16384,
      }).dimensions,
      16384,
    );
    let rejected = false;
    try {
      rebuildSynthesisRetrievalConnection({
        ...EMBEDDING_CONNECTION,
        dimensions: 16385,
      });
    } catch {
      rejected = true;
    }
    assert.isTrue(rejected);
  });

  it("saves connections without activating a default primary", function () {
    const saved = saveSynthesisEmbeddingPrefs({
      enabled: true,
      connections: [EMBEDDING_CONNECTION],
    });
    assert.isTrue(saved.ok);
    assert.isTrue(
      saved.diagnostics.some(
        (entry) => entry.code === "embedding_primary_unselected",
      ),
    );
    const status = getSynthesisEmbeddingPrefsStatus();
    assert.isTrue(status.enabled);
    assert.lengthOf(status.connections, 1);
    assert.isNull(status.primaryConnectionId);
    assert.deepEqual(status.fallbackConnectionIds, []);
    assert.isAbove(status.presets.length, 0);
  });

  it("rejects unknown or duplicate connection selection", function () {
    assert.isFalse(
      saveSynthesisEmbeddingPrefs({
        connections: [EMBEDDING_CONNECTION],
        primaryConnectionId: "missing",
      }).ok,
    );
    const duplicate = saveSynthesisEmbeddingPrefs({
      connections: [EMBEDDING_CONNECTION, EMBEDDING_CONNECTION],
    });
    assert.isFalse(duplicate.ok);
  });

  it("records actual dimensions from a synthetic test and serves describe/encode", async function () {
    saveSynthesisEmbeddingPrefs({
      enabled: true,
      connections: [EMBEDDING_CONNECTION],
      primaryConnectionId: EMBEDDING_CONNECTION.id,
    });
    const fake = fakeClient();
    const provider = createSynthesisEmbeddingProvider({
      client: fake.client,
      sleep: async () => {},
    });
    const tested = await testSynthesisEmbeddingConnection({
      connectionId: EMBEDDING_CONNECTION.id,
      provider,
    });
    assert.isTrue(tested.ok);
    assert.equal(tested.dimensions, 2);
    assert.equal(tested.model_id, EMBEDDING_CONNECTION.modelId);
    assert.lengthOf(fake.calls, 8);
    assert.equal(tested.max_concurrency, 2);
    assert.isString(tested.tested_at);
    assert.deepEqual(tested.diagnostics, []);
    assert.deepEqual(
      tested.performance?.pairRounds.map((round) => round.successCount),
      [2, 2],
    );
    assert.equal(tested.performance?.documentBatch.successCount, 8);
    assert.equal(
      getSynthesisEmbeddingPrefsStatus().connectionTests[
        EMBEDDING_CONNECTION.id
      ]?.max_concurrency,
      2,
    );
    const storedTest =
      getSynthesisEmbeddingPrefsStatus().connectionTests[
        EMBEDDING_CONNECTION.id
      ];
    assert.equal(storedTest?.performance?.firstQuery.successCount, 1);
    assert.equal(storedTest?.performance?.warmQuery.successCount, 1);
    assert.equal(storedTest?.performance?.pairRounds.length, 2);
    assert.equal(storedTest?.performance?.documentBatch.successCount, 8);

    const identity = getSynthesisEmbeddingConnectionIdentity(
      EMBEDDING_CONNECTION.id,
    );
    assert.deepEqual(identity, {
      modelId: EMBEDDING_CONNECTION.modelId,
      dimensions: 2,
      queryPrefix: EMBEDDING_CONNECTION.queryPrefix,
      documentPrefix: EMBEDDING_CONNECTION.documentPrefix,
    });

    let encodedServices: Array<{
      maxConcurrency?: 1 | 2;
      performanceTestedAt?: string;
    }> = [];
    const observedProvider = {
      probe: provider.probe,
      encode: (args: Parameters<typeof provider.encode>[0]) => {
        encodedServices = args.services;
        return provider.encode(args);
      },
    };
    const port = createSynthesisEmbeddingHostPort({
      provider: observedProvider,
    });
    assert.deepEqual(await port.describe(), { enabled: true, identity });
    const encoded = await port.encode({
      identity: identity!,
      purpose: "query",
      inputs: ["alpha"],
      deadlineAtMs: Date.now() + 60_000,
    });
    assert.deepEqual(encoded.vectors, [[1, 0]]);
    assert.equal(encodedServices[0].maxConcurrency, 2);
    assert.equal(encodedServices[0].performanceTestedAt, tested.tested_at);
    assert.equal(
      (JSON.parse(fake.calls[8]) as { input: string[] }).input[0],
      "q: alpha",
    );
  });

  it("withholds a describe identity until a connection test succeeded", function () {
    saveSynthesisEmbeddingPrefs({
      enabled: true,
      connections: [EMBEDDING_CONNECTION],
      primaryConnectionId: EMBEDDING_CONNECTION.id,
    });
    assert.isNull(
      getSynthesisEmbeddingConnectionIdentity(EMBEDDING_CONNECTION.id),
    );
  });

  it("persists pair failures as warnings and restricts the service to serial capacity", async function () {
    const connection = {
      ...EMBEDDING_CONNECTION,
      id: "probe-pair-failure",
      baseUrl: "http://prefs-probe-pair-failure",
    };
    saveSynthesisEmbeddingPrefs({
      connections: [connection],
      primaryConnectionId: connection.id,
    });
    const tested = await testSynthesisEmbeddingConnection({
      connectionId: connection.id,
      client: {
        async request(args) {
          const inputs = JSON.parse(args.body).input as string[];
          if (args.body.includes("pair 0 b"))
            return { status: 503, text: "busy" };
          return {
            status: 200,
            text: JSON.stringify({ embeddings: inputs.map(() => [1, 0]) }),
          };
        },
      },
    });
    assert.isTrue(tested.ok);
    assert.equal(tested.max_concurrency, 1);
    assert.isTrue(
      tested.diagnostics.some(
        (entry) => entry.code === "embedding_probe_pair_failed",
      ),
    );
    const persisted =
      getSynthesisEmbeddingPrefsStatus().connectionTests[connection.id];
    assert.isTrue(persisted?.ok);
    assert.equal(persisted?.performance?.pairRounds[0]?.successCount, 1);
    assert.equal(persisted?.max_concurrency, 1);
  });

  it("invalidates a stored test result when the encoding config changes", async function () {
    saveSynthesisEmbeddingPrefs({
      enabled: true,
      connections: [EMBEDDING_CONNECTION],
      primaryConnectionId: EMBEDDING_CONNECTION.id,
    });
    const fake = fakeClient();
    const provider = createSynthesisEmbeddingProvider({
      client: fake.client,
      sleep: async () => {},
    });
    const tested = await testSynthesisEmbeddingConnection({
      connectionId: EMBEDDING_CONNECTION.id,
      provider,
    });
    assert.isTrue(tested.ok);
    assert.isNotNull(
      getSynthesisEmbeddingConnectionIdentity(EMBEDDING_CONNECTION.id),
    );
    saveSynthesisEmbeddingPrefs({
      connections: [{ ...EMBEDDING_CONNECTION, modelId: "qwen3-embedding:4b" }],
      primaryConnectionId: EMBEDDING_CONNECTION.id,
    });
    assert.isNull(
      getSynthesisEmbeddingConnectionIdentity(EMBEDDING_CONNECTION.id),
    );
  });

  it("refuses new Host encoding once the configuration is disabled", async function () {
    saveSynthesisEmbeddingPrefs({
      enabled: true,
      connections: [EMBEDDING_CONNECTION],
      primaryConnectionId: EMBEDDING_CONNECTION.id,
    });
    const fake = fakeClient();
    const provider = createSynthesisEmbeddingProvider({
      client: fake.client,
      sleep: async () => {},
    });
    const port = createSynthesisEmbeddingHostPort({ provider });
    assert.isTrue(
      (
        await testSynthesisEmbeddingConnection({
          connectionId: EMBEDDING_CONNECTION.id,
          provider,
        })
      ).ok,
    );
    const identity = getSynthesisEmbeddingConnectionIdentity(
      EMBEDDING_CONNECTION.id,
    );
    assert.isNotNull(identity);
    const callsBeforeDisable = fake.calls.length;

    saveSynthesisEmbeddingPrefs({ enabled: false });
    let code = "";
    try {
      await port.encode({
        identity: identity!,
        purpose: "query",
        inputs: ["alpha"],
        deadlineAtMs: Date.now() + 60_000,
      });
    } catch (error) {
      code = (error as { code?: string }).code ?? "";
    }
    assert.equal(code, "unavailable");
    assert.equal(fake.calls.length, callsBeforeDisable);
  });
});
