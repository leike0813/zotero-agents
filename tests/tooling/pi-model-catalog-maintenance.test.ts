import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  PI_OFFICIAL_CATALOG_ENDPOINT,
  checkOfficialPiCatalog,
  checkPiCatalogSeedOffline,
  piCatalogCheckExitCode,
  piOfficialCatalogUrl,
  preparePiCatalogSeedArtifact,
  resolveReleasedRuntimeVersion,
  runPiCatalogCompatibilityCheck,
} from "../../scripts/pi-model-catalog";

const REVISION = `sha256-${"a".repeat(64)}`;

const typedPayload = {
  openai: [
    {
      id: "gpt-x",
      name: "GPT X",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      input: ["text"],
      contextWindow: 1000,
      maxTokens: 500,
      type: "chat",
    },
  ],
  stability: [
    {
      id: "image-x",
      name: "Image X",
      api: "openrouter-images",
      provider: "stability",
      baseUrl: "https://example.invalid/v1",
      type: "image",
    },
  ],
};

const legacyPayload = {
  openai: {
    "gpt-x": {
      id: "gpt-x",
      name: "GPT X",
      api: "openai-responses",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      input: ["text"],
      contextWindow: 1000,
      maxTokens: 500,
    },
  },
};

function officialHeaders(overrides: Record<string, string> = {}) {
  return {
    "content-type": "application/json",
    "x-pi-model-catalog-revision": REVISION,
    "x-pi-model-catalog-minimum-version": "0.80.7",
    ...overrides,
  };
}

function respondWith(options: {
  status?: number;
  headers?: Record<string, string>;
  body?: unknown;
}) {
  const body =
    typeof options.body === "string"
      ? options.body
      : JSON.stringify(options.body ?? typedPayload);
  return async () =>
    new Response(body, {
      status: options.status ?? 200,
      headers: options.headers ?? officialHeaders(),
    });
}

function recorder(
  fetchImpl: (url: string, init: RequestInit) => Promise<Response>,
) {
  const calls: { url: string; init: RequestInit }[] = [];
  return {
    calls,
    fetchImpl: async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return fetchImpl(url, init);
    },
  };
}

async function withTempDir<T>(run: (dir: string) => Promise<T>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "pi-catalog-tooling-"));
  try {
    return await run(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

async function assertRejects(run: () => Promise<unknown>, pattern: RegExp) {
  try {
    await run();
  } catch (error) {
    assert.match(String((error as Error).message), pattern);
    return;
  }
  assert.fail("expected rejection");
}

describe("Pi model catalog maintenance tooling", () => {
  it("reads the typed official representation without credentials or redirects", async () => {
    const { calls, fetchImpl } = recorder(respondWith({}));
    const result = await checkOfficialPiCatalog({
      runtimeVersion: "1.0.0",
      fetchImpl,
    });

    assert.equal(result.classification, "compatible");
    assert.equal(result.reason, "ok");
    assert.equal(result.revision, REVISION);
    assert.equal(result.minimumPiVersion, "0.80.7");
    assert.equal(result.modelCount, 1);
    assert.equal(result.providerCount, 1);
    assert.equal(calls.length, 1);
    assert.equal(
      calls[0].url,
      "https://pi.dev/api/models?pi-version=1.0.0&types=chat,image,classifier",
    );
    assert.equal(calls[0].init.redirect, "error");
    assert.equal(calls[0].init.credentials, "omit");
    const headers = calls[0].init.headers as Record<string, string>;
    assert.equal(headers.accept, "application/json");
    assert.equal("authorization" in headers, false);
    assert.equal("cookie" in headers, false);
  });

  it("normalizes both the typed array and the legacy provider map", async () => {
    const typed = await checkOfficialPiCatalog({
      runtimeVersion: "1.0.0",
      fetchImpl: respondWith({}),
    });
    const legacy = await checkOfficialPiCatalog({
      runtimeVersion: "1.0.0",
      fetchImpl: respondWith({ body: legacyPayload }),
    });

    assert.equal(typed.classification, "compatible");
    assert.equal(legacy.classification, "compatible");
    assert.equal(legacy.modelCount, 1);
  });

  it("treats an empty public catalog as a successful snapshot", async () => {
    const empty = await checkOfficialPiCatalog({
      runtimeVersion: "1.0.0",
      fetchImpl: respondWith({ body: {} }),
    });

    assert.equal(empty.classification, "compatible");
    assert.equal(empty.reason, "ok");
    assert.equal(empty.modelCount, 0);
    assert.equal(empty.revision, REVISION);
  });

  it("separates incompatible supply, unsupported routes and payload drift", async () => {
    const missingHeader = await checkOfficialPiCatalog({
      runtimeVersion: "1.0.0",
      fetchImpl: respondWith({
        headers: officialHeaders({ "x-pi-model-catalog-revision": "" }),
      }),
    });
    const raisedMinimum = await checkOfficialPiCatalog({
      runtimeVersion: "1.0.0",
      fetchImpl: respondWith({
        headers: officialHeaders({
          "x-pi-model-catalog-minimum-version": "1.1.0",
        }),
      }),
    });
    const notFound = await checkOfficialPiCatalog({
      runtimeVersion: "0.80.6",
      fetchImpl: respondWith({
        status: 404,
        headers: { "content-type": "application/json" },
        body: { ok: false, error: "No compatible model catalog." },
      }),
    });
    const reserved = await checkOfficialPiCatalog({
      runtimeVersion: "1.0.0",
      fetchImpl: respondWith({
        status: 501,
        body: { ok: false, error: "API routes are reserved." },
      }),
    });
    const drifted = await checkOfficialPiCatalog({
      runtimeVersion: "1.0.0",
      fetchImpl: respondWith({ body: { openai: [{ id: "broken" }] } }),
    });

    assert.deepEqual(
      [missingHeader, raisedMinimum, notFound, reserved, drifted].map(
        (result) => [result.classification, result.reason],
      ),
      [
        ["schema", "missing_revision_header"],
        ["incompatible", "incompatible_minimum_version"],
        ["incompatible", "no_compatible_catalog"],
        ["unsupported", "route_not_supported"],
        ["schema", "invalid_payload"],
      ],
    );
  });

  it("reports transport failures, oversized bodies and upstream errors as network", async () => {
    const thrown = await checkOfficialPiCatalog({
      runtimeVersion: "1.0.0",
      fetchImpl: async () => {
        throw new TypeError("fetch failed");
      },
    });
    const aborted = await checkOfficialPiCatalog({
      runtimeVersion: "1.0.0",
      timeoutMs: 5,
      fetchImpl: (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    });
    const tooLarge = await checkOfficialPiCatalog({
      runtimeVersion: "1.0.0",
      maxBytes: 32,
      fetchImpl: respondWith({
        headers: officialHeaders({ "content-length": "1048576" }),
      }),
    });
    const streamed = await checkOfficialPiCatalog({
      runtimeVersion: "1.0.0",
      maxBytes: 16,
      fetchImpl: async () =>
        new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(
                new TextEncoder().encode(JSON.stringify(typedPayload)),
              );
              controller.close();
            },
          }),
          { status: 200, headers: officialHeaders() },
        ),
    });
    const upstreamError = await checkOfficialPiCatalog({
      runtimeVersion: "1.0.0",
      fetchImpl: respondWith({ status: 503, body: { ok: false } }),
    });
    const rejected = await checkOfficialPiCatalog({
      runtimeVersion: "1.0.0",
      fetchImpl: respondWith({ status: 400, body: { ok: false } }),
    });

    assert.deepEqual(
      [thrown, aborted, tooLarge, streamed, upstreamError, rejected].map(
        (result) => [result.classification, result.reason],
      ),
      [
        ["network", "transport_error"],
        ["network", "timeout"],
        ["network", "too_large"],
        ["network", "too_large"],
        ["network", "unexpected_status"],
        ["unsupported", "request_rejected"],
      ],
    );
  });

  it("deduplicates exact runtime versions and refuses guessed SDK versions", async () => {
    const released = {
      version: "1.0.0",
      source: "candidate-fallback" as const,
      tag: null,
    };
    const report = await runPiCatalogCompatibilityCheck({
      runtimes: ["1.0.0", "1.0.0", "0.80.7"],
      candidateRuntimeVersion: "1.0.0",
      releasedRuntime: released,
      fetchImpl: respondWith({}),
    });

    assert.equal(report.endpoint, PI_OFFICIAL_CATALOG_ENDPOINT);
    assert.deepEqual(
      report.runtimes.map((runtime) => runtime.runtimeVersion),
      ["0.80.7", "1.0.0"],
    );
    assert.deepEqual(report.summary, {
      checked: 2,
      compatible: 2,
      incompatible: 0,
      schema: 0,
      unsupported: 0,
      network: 0,
    });
    assert.equal(piCatalogCheckExitCode(report), 0);

    await assertRejects(
      () =>
        runPiCatalogCompatibilityCheck({
          runtimes: ["latest"],
          candidateRuntimeVersion: "1.0.0",
          releasedRuntime: released,
          fetchImpl: respondWith({}),
        }),
      /exact/,
    );
  });

  it("separates transient network failures from supply failures in the exit code", async () => {
    const releasedRuntime = {
      version: "1.0.0",
      source: "candidate-fallback" as const,
      tag: null,
    };
    const network = await runPiCatalogCompatibilityCheck({
      runtimes: ["1.0.0"],
      candidateRuntimeVersion: "1.0.0",
      releasedRuntime,
      fetchImpl: respondWith({ status: 503, body: {} }),
    });
    const incompatible = await runPiCatalogCompatibilityCheck({
      runtimes: ["1.0.0"],
      candidateRuntimeVersion: "1.0.0",
      releasedRuntime,
      fetchImpl: respondWith({ status: 404, body: {} }),
    });

    assert.equal(piCatalogCheckExitCode(network), 3);
    assert.equal(piCatalogCheckExitCode(incompatible), 2);
  });

  it("reads the released runtime from a release tag package manifest", async () => {
    const packages: Record<string, unknown> = {
      "v0.10.0": {
        dependencies: { "@earendil-works/pi-agent-core": "1.0.0" },
      },
      "v0.9.0": {
        dependencies: { "@earendil-works/pi-agent-core": "0.84.4" },
      },
    };
    const readGitText = async (args: string[]) => {
      if (args[0] === "tag") return "v0.10.0\nv0.9.0\n";
      const tag = String(args[1]).split(":")[0];
      if (!(tag in packages)) throw new Error(`unknown tag ${tag}`);
      return JSON.stringify(packages[tag]);
    };

    const newest = await resolveReleasedRuntimeVersion({
      candidateRuntimeVersion: "1.0.0",
      readGitText,
    });
    const explicit = await resolveReleasedRuntimeVersion({
      candidateRuntimeVersion: "1.0.0",
      explicit: "0.84.4",
      readGitText,
    });
    const olderClient = await resolveReleasedRuntimeVersion({
      candidateRuntimeVersion: "1.0.0",
      readGitText: async (args) =>
        args[0] === "tag"
          ? "v0.9.0\n"
          : JSON.stringify({
              dependencies: { "@earendil-works/pi-ai": "0.84.4" },
            }),
    });
    const withoutTags = await resolveReleasedRuntimeVersion({
      candidateRuntimeVersion: "1.0.0",
      readGitText: async () => {
        throw new Error("no tags");
      },
    });

    assert.deepEqual(newest, {
      version: "1.0.0",
      source: "release-tag-package",
      tag: "v0.10.0",
    });
    assert.deepEqual(explicit, {
      version: "0.84.4",
      source: "explicit",
      tag: null,
    });
    assert.deepEqual(olderClient, {
      version: "1.0.0",
      source: "candidate-fallback",
      tag: null,
    });
    assert.deepEqual(withoutTags, {
      version: "1.0.0",
      source: "candidate-fallback",
      tag: null,
    });
  });

  it("prepares a new seed artifact from fixed official input", async () => {
    await withTempDir(async (dir) => {
      const input = path.join(dir, "download.json");
      const raw = JSON.stringify(typedPayload);
      await fs.writeFile(input, raw);
      const out = path.join(dir, "seed-artifact");

      const artifact = await preparePiCatalogSeedArtifact({
        input,
        out,
        revision: REVISION,
        minimumPiVersion: "0.80.7",
        runtimeVersion: "1.0.0",
        capturedAt: "2026-10-03",
      });

      assert.deepEqual(artifact.provenance, {
        url: piOfficialCatalogUrl("1.0.0"),
        runtimeVersion: "1.0.0",
        revision: REVISION,
        minimumPiVersion: "0.80.7",
        input: "official-input.json",
        capturedAt: "2026-10-03",
      });
      assert.equal(
        await fs.readFile(path.join(out, "official-input.json"), "utf8"),
        raw,
      );

      await assertRejects(
        () =>
          preparePiCatalogSeedArtifact({
            input,
            out,
            revision: REVISION,
            minimumPiVersion: "0.80.7",
            runtimeVersion: "1.0.0",
          }),
        /cannot be created/,
      );
      await assertRejects(
        () =>
          preparePiCatalogSeedArtifact({
            input,
            out: path.join(dir, "second"),
            revision: REVISION,
            minimumPiVersion: "9.9.9",
            runtimeVersion: "1.0.0",
          }),
        /Incompatible/,
      );
    });
  });

  it("validates the bundled seed and prepared artifacts offline with the shared normalizer", async () => {
    const bundled = await checkPiCatalogSeedOffline({});
    assert.equal(bundled.classification, "compatible");
    assert.equal(bundled.target, "bundled");
    assert.ok((bundled.modelCount || 0) > 0);

    await withTempDir(async (dir) => {
      const input = path.join(dir, "download.json");
      const out = path.join(dir, "seed-artifact");
      await fs.writeFile(input, JSON.stringify(typedPayload));
      await preparePiCatalogSeedArtifact({
        input,
        out,
        revision: REVISION,
        minimumPiVersion: "0.80.7",
        runtimeVersion: "1.0.0",
      });

      const artifact = await checkPiCatalogSeedOffline({ artifact: out });
      assert.equal(artifact.classification, "compatible");
      assert.equal(artifact.target, "artifact");
      assert.equal(artifact.revision, REVISION);

      const file = await checkPiCatalogSeedOffline({
        input,
        revision: REVISION,
        minimumPiVersion: "0.80.7",
        runtimeVersion: "1.0.0",
      });
      assert.equal(file.classification, "compatible");
      assert.equal(file.target, "input");

      const drifted = path.join(dir, "drifted.json");
      await fs.writeFile(drifted, JSON.stringify({ openai: [{ id: "x" }] }));
      const broken = await checkPiCatalogSeedOffline({
        input: drifted,
        revision: REVISION,
        minimumPiVersion: "0.80.7",
        runtimeVersion: "1.0.0",
      });
      assert.equal(broken.classification, "schema");
      assert.equal(broken.reason, "invalid_payload");

      const incompatible = await checkPiCatalogSeedOffline({
        input: drifted,
        revision: REVISION,
        minimumPiVersion: "9.9.9",
        runtimeVersion: "1.0.0",
      });
      assert.equal(incompatible.classification, "incompatible");

      const empty = path.join(dir, "empty.json");
      await fs.writeFile(empty, "{}");
      const withoutModels = await checkPiCatalogSeedOffline({
        input: empty,
        revision: REVISION,
        minimumPiVersion: "0.80.7",
        runtimeVersion: "1.0.0",
      });
      assert.equal(withoutModels.classification, "compatible");
      assert.equal(withoutModels.modelCount, 0);
    });
  });
});
