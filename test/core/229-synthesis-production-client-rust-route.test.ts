import { assert } from "chai";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import { SYNTHESIS_SIDECAR_PROTOCOL } from "../../packages/synthesis-contracts/src/sidecarSystem";
import { inspectSynthesisTopicWorkbenchSurfaceParity } from "../../scripts/check-synthesis-topic-workbench-surface-parity";
import { buildSynthesisUiSnapshot } from "../../src/modules/synthesis/uiModel";

const ROOT = path.resolve(import.meta.dirname, "../..");
const EXECUTABLE = path.join(
  ROOT,
  "native/synthesis-sidecar/target/debug",
  `synthesis-sidecar${process.platform === "win32" ? ".exe" : ""}`,
);
const CLIENT_TOKEN = "client-token-0123456789abcdef0123456789abcdef";
const LIFECYCLE_TOKEN = "lifecycle-token-0123456789abcdef0123456789abcdef";
const TOPIC_WORKBENCH_OPERATIONS = [
  "client.applyLiteratureDigestSidecar",
  "client.applyTopicSynthesisResult",
  "client.consumeRelatedItemsSyncEcho",
  "client.deleteTopicArtifact",
  "client.findTopicsByPaperRef",
  "client.getSynthesisBackgroundJobRows",
  "client.getSynthesisWorkbenchChromeInput",
  "client.getSynthesisWorkbenchSurfaceInput",
  "client.getTopicContext",
  "client.getTopicReport",
  "client.listTopics",
  "client.listWorkflowTopicOptions",
  "client.purgeDeletedTopicArtifacts",
  "client.readTopicDetail",
  "client.rejectTopicDiscoveryHint",
  "client.resolveResolver",
  "client.resolveTopicPaperDigest",
  "client.restoreTopicDiscoveryHint",
] as const;

function config(args: {
  root: string;
  session: string;
  supervisorInstanceId: string;
  reverseHostPort: number;
}) {
  return {
    schema: "synthesis-sidecar-launch-config.v3",
    profileId: "1".repeat(64),
    profileRuntimeRoot: args.session,
    runtimeRootId: "2".repeat(64),
    dataRootId: "3".repeat(64),
    bundleId: "4".repeat(64),
    implementation: "rust-native",
    target: "linux-x64",
    targetTriple: "x86_64-unknown-linux-gnu",
    buildFingerprint: "5".repeat(64),
    platformSignature: {
      scheme: "not-applicable",
      status: "not-applicable",
      signer: null,
    },
    serviceVersion: "0.1.0",
    protocolVersion: SYNTHESIS_SIDECAR_PROTOCOL,
    schemaVersion: "synthesis-repository-foundation.v1",
    diagnosticsEnabled: true,
    supervisorInstanceId: args.supervisorInstanceId,
    repositoryDbPath: path.join(args.root, "state", "synthesis.db"),
    canonicalRoot: path.join(args.root, "data", "synthesis"),
    reverseHost: {
      host: "127.0.0.1",
      port: args.reverseHostPort,
      authorizationToken: "9".repeat(64),
    },
    clientToken: CLIENT_TOKEN,
    lifecycleToken: LIFECYCLE_TOKEN,
    port: 0,
  };
}

function start(configPath: string) {
  const child = spawn(EXECUTABLE, ["serve", "--config", configPath], {
    cwd: path.dirname(configPath),
    stdio: ["pipe", "pipe", "pipe"],
  });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  const listening = new Promise<{ port: number }>((resolve, reject) => {
    const lines = createInterface({ input: child.stdout });
    lines.on("line", (line) => {
      try {
        const value = JSON.parse(line) as { type?: string; port?: number };
        if (value.type === "listening" && typeof value.port === "number") {
          resolve({ port: value.port });
        }
      } catch {
        // Ignore non-protocol diagnostics.
      }
    });
    child.once("exit", () => reject(new Error(stderr || "sidecar exited")));
  });
  return { child, listening, stderr: () => stderr };
}

async function stop(child: ChildProcessWithoutNullStreams) {
  const exited = new Promise<void>((resolve) =>
    child.once("exit", () => resolve()),
  );
  child.stdin.end();
  await exited;
}

async function call(port: number, capability: string, payload: unknown) {
  const response = await fetch(`http://127.0.0.1:${port}/synthesis/v1/call`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${CLIENT_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      protocol: SYNTHESIS_SIDECAR_PROTOCOL,
      requestId: `test:${capability}`,
      profileId: "1".repeat(64),
      capability,
      payload,
    }),
  });
  return {
    status: response.status,
    body: (await response.json()) as Record<string, any>,
  };
}

describe("Synthesis Rust production client route", function () {
  this.timeout(20_000);

  it("keeps the Topic and Workbench production surface fixture-backed", function () {
    assert.lengthOf(TOPIC_WORKBENCH_OPERATIONS, 18);
    assert.deepEqual(inspectSynthesisTopicWorkbenchSurfaceParity(), {
      ok: true,
      operations: 18,
      errors: [],
    });
  });

  it("refreshes a non-empty Reference index through the reverse Host", async function () {
    assert.isTrue(fs.existsSync(EXECUTABLE), "Rust sidecar must be built");
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-rust-reference-route-"),
    );
    const reverseHost = http.createServer((request, response) => {
      let requestBody = "";
      request.setEncoding("utf8");
      request.on("data", (chunk) => {
        requestBody += chunk;
      });
      request.on("end", () => {
        const call = JSON.parse(requestBody) as {
          capability: string;
          payload: {
            cursor?: string;
            limit?: number;
            expectedHash?: string;
          };
        };
        const cursor = call.payload.cursor || "";
        const limit = call.payload.limit || 100;
        let result: Record<string, unknown>;
        if (call.capability === "webdav.describe") {
          result = { configured: false };
        } else if (call.capability === "library.items.list_page") {
          result = {
            items: [
              {
                paperRef: "1:HOSTREF1",
                libraryId: 1,
                itemKey: "HOSTREF1",
                itemType: "journalArticle",
                title: "Reverse Host Reference",
                year: "2026",
                metadataHash: "sha256:hostref1",
              },
              {
                paperRef: "1:HOSTREF2",
                libraryId: 1,
                itemKey: "HOSTREF2",
                itemType: "journalArticle",
                title: "Reverse Host Reference Two",
                year: "2026",
                metadataHash: "sha256:hostref2",
              },
              {
                paperRef: "1:HOSTREF3",
                libraryId: 1,
                itemKey: "HOSTREF3",
                itemType: "journalArticle",
                title: "Reverse Host Reference Three",
                year: "2026",
                metadataHash: "sha256:hostref3",
              },
            ],
            cursor,
            nextCursor: "",
            hasMore: false,
            returned: 3,
            limit,
            snapshotRevision: "fixture-revision-1",
          };
        } else if (call.capability === "library.artifacts.scan_page") {
          result = {
            artifacts: [
              {
                paperRef: "1:HOSTREF1",
                artifactType: "digest",
                payloadType: "digest-markdown",
                status: "missing",
                diagnostics: [],
              },
              {
                paperRef: "1:HOSTREF1",
                artifactType: "references",
                payloadType: "references-json",
                status: "available",
                locator: "fixture:references:HOSTREF1",
                payloadHash: "sha256:references-hostref1",
                estimatedSize: 4_300_000,
                diagnostics: [],
              },
              {
                paperRef: "1:HOSTREF2",
                artifactType: "digest",
                payloadType: "digest-markdown",
                status: "missing",
                diagnostics: [],
              },
              {
                paperRef: "1:HOSTREF2",
                artifactType: "references",
                payloadType: "references-json",
                status: "available",
                locator: "fixture:references:HOSTREF2",
                payloadHash: "sha256:references-hostref2",
                estimatedSize: 4_300_000,
                diagnostics: [],
              },
              {
                paperRef: "1:HOSTREF2",
                artifactType: "citation_analysis",
                payloadType: "citation-analysis-json",
                status: "missing",
                diagnostics: [],
              },
              {
                paperRef: "1:HOSTREF1",
                artifactType: "citation_analysis",
                payloadType: "citation-analysis-json",
                status: "missing",
                diagnostics: [],
              },
              {
                paperRef: "1:HOSTREF3",
                artifactType: "digest",
                payloadType: "digest-markdown",
                status: "missing",
                diagnostics: [],
              },
              {
                paperRef: "1:HOSTREF3",
                artifactType: "references",
                payloadType: "references-json",
                status: "available",
                locator: "fixture:references:HOSTREF3",
                payloadHash: "sha256:references-hostref3",
                estimatedSize: 128,
                diagnostics: [],
              },
              {
                paperRef: "1:HOSTREF3",
                artifactType: "citation_analysis",
                payloadType: "citation-analysis-json",
                status: "missing",
                diagnostics: [],
              },
            ],
            cursor,
            nextCursor: "",
            hasMore: false,
            returned: 3,
            limit,
            snapshotRevision: "fixture-revision-1",
          };
        } else if (call.capability === "library.artifacts.read") {
          const smallReference = String(call.payload.expectedHash).includes(
            "hostref3",
          );
          result = {
            status: "available",
            payloadHash: call.payload.expectedHash,
            content: {
              kind: "json",
              value: {
                references: [
                  {
                    title: smallReference
                      ? "Small expanded reference"
                      : `共享引用 ${"文献".repeat(400_000)}`,
                    year: "2024",
                    authors: ["研究者"],
                  },
                ],
              },
            },
            diagnostics: [],
          };
        } else {
          result = {};
        }
        const body = JSON.stringify({ ok: true, result });
        response.writeHead(200, {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
        });
        response.end(body);
      });
    });
    await new Promise<void>((resolve) =>
      reverseHost.listen(0, "127.0.0.1", resolve),
    );
    const address = reverseHost.address();
    if (!address || typeof address === "string") {
      throw new Error("reverse host unavailable");
    }
    const session = path.join(root, "runtime", "sessions", "reference");
    fs.mkdirSync(session, { recursive: true });
    const configPath = path.join(session, "config.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        config({
          root,
          session,
          supervisorInstanceId: "supervisor-reference",
          reverseHostPort: address.port,
        }),
      ),
    );
    const sidecar = start(configPath);
    try {
      const { port } = await sidecar.listening;
      const initialIndexSurface = await call(
        port,
        "client.getSynthesisWorkbenchSurfaceInput",
        {
          args: [
            "index",
            {
              registry: {
                scope: "library",
                expandedSourceRefs: [],
              },
            },
          ],
        },
      );
      assert.equal(initialIndexSurface.status, 200);
      assert.equal(
        initialIndexSurface.body.data.registry.cacheStatus.status,
        "missing",
      );
      assert.lengthOf(initialIndexSurface.body.data.registry.rows, 3);
      assert.equal(
        initialIndexSurface.body.data.registry.rows[0].artifactCoverage,
        "missing",
      );

      const refresh = await call(port, "client.refreshReferenceSidecarNow", {
        args: [],
      });
      assert.equal(refresh.status, 200, JSON.stringify(refresh.body));
      assert.equal(refresh.body.data.ok, true);

      const chrome = await call(
        port,
        "client.getSynthesisWorkbenchChromeInput",
        {
          args: [{ registry: { scope: "library" } }],
        },
      );
      assert.equal(chrome.status, 200);
      assert.equal(chrome.body.data.maintenance.summary.status, "partial");
      assert.isArray(chrome.body.data.maintenance.backgroundJobs);
      assert.notProperty(chrome.body.data.maintenance, "cacheReadiness");

      const workbenchIndex = await call(
        port,
        "client.getSynthesisWorkbenchSurfaceInput",
        {
          args: [
            "index",
            {
              registry: {
                scope: "library",
                expandedSourceRefs: ["1:HOSTREF3"],
              },
            },
          ],
        },
      );
      assert.equal(workbenchIndex.status, 200);
      assert.equal(
        workbenchIndex.body.data.registry.cacheStatus.status,
        "ready",
      );
      assert.lengthOf(workbenchIndex.body.data.registry.rows, 3);
      assert.deepInclude(workbenchIndex.body.data.registry.rows[0], {
        libraryId: 1,
        itemKey: "HOSTREF1",
        paper_ref: "1:HOSTREF1",
        artifactCoverage: "partial",
        reference_count: 1,
        unbound_reference_count: 1,
      });
      assert.deepEqual(
        workbenchIndex.body.data.registry.rows[0].missing_artifacts,
        ["digest", "citation_analysis"],
      );
      assert.deepEqual(
        workbenchIndex.body.data.registry.rows[0].references,
        [],
      );
      assert.lengthOf(workbenchIndex.body.data.registry.rows[2].references, 1);
      assert.equal(
        workbenchIndex.body.data.registry.rows[2].references[0].title,
        "Small expanded reference",
      );

      const repeatedWorkbenchIndex = await call(
        port,
        "client.getSynthesisWorkbenchSurfaceInput",
        {
          args: [
            "index",
            {
              registry: {
                scope: "library",
                expandedSourceRefs: [],
              },
            },
          ],
        },
      );
      assert.equal(repeatedWorkbenchIndex.status, 200);
      assert.equal(
        repeatedWorkbenchIndex.body.data.registry.cacheStatus.status,
        "ready",
      );
      assert.deepEqual(
        repeatedWorkbenchIndex.body.data.registry.rows.map(
          (row: Record<string, unknown>) => row.paper_ref,
        ),
        ["1:HOSTREF1", "1:HOSTREF2", "1:HOSTREF3"],
      );

      const index = await call(port, "client.getReferenceSidecarIndex", {
        args: [{ includeReferences: false }],
      });
      assert.equal(index.status, 200);
      assert.equal(index.body.data.total, 3);
      assert.equal(index.body.data.returned, 3);
      assert.equal(index.body.data.rows[0].paper_ref, "1:HOSTREF1");
      assert.equal(index.body.data.rows[1].paper_ref, "1:HOSTREF2");
      assert.equal(index.body.data.rows[2].paper_ref, "1:HOSTREF3");

      const rebuildGraph = await call(
        port,
        "client.rebuildCitationGraphCacheNow",
        { args: [] },
      );
      assert.equal(rebuildGraph.status, 200, JSON.stringify(rebuildGraph.body));

      const graphSurface = await call(
        port,
        "client.getSynthesisWorkbenchSurfaceInput",
        {
          args: ["graph", { graph: { layoutAlgorithm: "force" } }],
        },
      );
      assert.equal(graphSurface.status, 200, JSON.stringify(graphSurface.body));
      assert.isNotEmpty(
        graphSurface.body.data.graph.graph_hash,
        JSON.stringify({
          rebuildGraph: rebuildGraph.body,
          graphSurface: graphSurface.body,
        }),
      );
      assert.isAbove(graphSurface.body.data.graph.nodes.length, 0);
      assert.isAbove(graphSurface.body.data.graph.edges.length, 0);
      assert.notProperty(
        graphSurface.body.data.graph.nodes[0],
        "literatureItemId",
      );
      assert.notProperty(
        graphSurface.body.data.graph.edges[0],
        "sourceLiteratureItemId",
      );
      const uiSnapshot = buildSynthesisUiSnapshot(graphSurface.body.data);
      assert.isAbove(uiSnapshot.graph.visibleNodes.length, 0);
      assert.isAbove(uiSnapshot.graph.visibleEdges.length, 0);

      const recomputeLayout = await call(
        port,
        "client.recomputeCitationGraphLayout",
        { args: [{ algorithm: "force", force: true }] },
      );
      assert.equal(
        recomputeLayout.status,
        200,
        JSON.stringify(recomputeLayout.body),
      );
      const laidOutGraph = await call(
        port,
        "client.getSynthesisWorkbenchSurfaceInput",
        { args: ["graph", { graph: { layoutAlgorithm: "force" } }] },
      );
      assert.equal(
        laidOutGraph.body.data.graph.layoutStatus,
        "ready",
        JSON.stringify({
          recomputeLayout: recomputeLayout.body,
          laidOutGraph: laidOutGraph.body,
        }),
      );
      assert.isTrue(
        laidOutGraph.body.data.graph.nodes.every(
          (node: Record<string, unknown>) =>
            Number.isFinite(node.x) && Number.isFinite(node.y),
        ),
      );

      const overview = await call(port, "client.queryCitationGraph", {
        args: [{}],
      });
      assert.equal(overview.status, 200, JSON.stringify(overview.body));
      assert.equal(
        overview.body.data.graph_hash,
        graphSurface.body.data.graph.graph_hash,
      );
      assert.notProperty(overview.body.data.nodes[0], "literatureItemId");

      const persistedLayout = await call(
        port,
        "client.getCitationGraphLayout",
        { args: [{ scope: "full", algorithm: "force" }] },
      );
      assert.equal(
        persistedLayout.status,
        200,
        JSON.stringify(persistedLayout.body),
      );
      assert.equal(persistedLayout.body.data.status, "ready");
      assert.notProperty(persistedLayout.body.data, "layoutJson");

      const cluster = await call(port, "client.queryCitationGraphCluster", {
        args: [{}],
      });
      assert.equal(cluster.status, 200, JSON.stringify(cluster.body));
      assert.equal(cluster.body.data.graph_hash, overview.body.data.graph_hash);

      const slice = await call(port, "client.getCitationGraphSlice", {
        args: [
          {
            startNodeId: overview.body.data.nodes[0].node_id,
            direction: "both",
            depth: 1,
            maxNodes: 25,
            maxEdges: 50,
          },
        ],
      });
      assert.equal(slice.status, 200, JSON.stringify(slice.body));
      assert.equal(slice.body.data.ok, true);
      assert.notProperty(slice.body.data.nodes[0], "literatureItemId");

      const refreshMetrics = await call(
        port,
        "client.refreshCitationGraphMetricsNow",
        { args: [{}] },
      );
      assert.equal(
        refreshMetrics.status,
        200,
        JSON.stringify(refreshMetrics.body),
      );
      const metrics = await call(port, "client.getCitationGraphMetrics", {
        args: [{ limit: 10, sortBy: "foundation" }],
      });
      const ranking = await call(port, "client.rankLibraryPapers", {
        args: [{ limit: 10, sortBy: "frontier" }],
      });
      assert.equal(
        metrics.body.data.status,
        "ready",
        JSON.stringify(metrics.body),
      );
      assert.equal(
        ranking.body.data.status,
        "ready",
        JSON.stringify(ranking.body),
      );
      assert.notProperty(metrics.body.data.items[0], "literatureItemId");
      assert.include(sidecar.stderr(), '"stage":"call-completed"');
      assert.notInclude(sidecar.stderr(), "共享引用");

      await stop(sidecar.child);
      const restarted = start(configPath);
      try {
        const restartedListening = await restarted.listening;
        const reopenedGraph = await call(
          restartedListening.port,
          "client.getSynthesisWorkbenchSurfaceInput",
          { args: ["graph", { graph: { layoutAlgorithm: "force" } }] },
        );
        assert.equal(
          reopenedGraph.status,
          200,
          JSON.stringify(reopenedGraph.body),
        );
        assert.equal(
          reopenedGraph.body.data.graph.graph_hash,
          overview.body.data.graph_hash,
        );
        assert.equal(reopenedGraph.body.data.graph.layoutStatus, "ready");
      } finally {
        if (restarted.child.exitCode === null) {
          await stop(restarted.child);
        }
      }
    } finally {
      if (sidecar.child.exitCode === null) {
        await stop(sidecar.child);
      }
      await new Promise<void>((resolve) => reverseHost.close(() => resolve()));
    }
  });

  it("keeps an empty refreshed Reference index ready", async function () {
    assert.isTrue(fs.existsSync(EXECUTABLE), "Rust sidecar must be built");
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-rust-empty-reference-route-"),
    );
    const reverseHost = http.createServer((request, response) => {
      let requestBody = "";
      request.setEncoding("utf8");
      request.on("data", (chunk) => {
        requestBody += chunk;
      });
      request.on("end", () => {
        const call = JSON.parse(requestBody) as {
          capability: string;
          payload: { cursor?: string; limit?: number };
        };
        const cursor = call.payload.cursor || "";
        const limit = call.payload.limit || 100;
        const result =
          call.capability === "webdav.describe"
            ? { configured: false }
            : call.capability === "library.items.list_page"
              ? {
                  items: [],
                  cursor,
                  nextCursor: "",
                  hasMore: false,
                  returned: 0,
                  limit,
                  snapshotRevision: "fixture-revision-empty",
                }
              : call.capability === "library.artifacts.scan_page"
                ? {
                    artifacts: [],
                    cursor,
                    nextCursor: "",
                    hasMore: false,
                    returned: 0,
                    limit,
                    snapshotRevision: "fixture-revision-empty",
                  }
                : {};
        const body = JSON.stringify({ ok: true, result });
        response.writeHead(200, {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
        });
        response.end(body);
      });
    });
    await new Promise<void>((resolve) =>
      reverseHost.listen(0, "127.0.0.1", resolve),
    );
    const address = reverseHost.address();
    if (!address || typeof address === "string") {
      throw new Error("reverse host unavailable");
    }
    const session = path.join(root, "runtime", "sessions", "reference-empty");
    fs.mkdirSync(session, { recursive: true });
    const configPath = path.join(session, "config.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        config({
          root,
          session,
          supervisorInstanceId: "supervisor-reference-empty",
          reverseHostPort: address.port,
        }),
      ),
    );
    const sidecar = start(configPath);
    try {
      const { port } = await sidecar.listening;
      const refresh = await call(port, "client.refreshReferenceSidecarNow", {
        args: [],
      });
      assert.equal(refresh.status, 200, JSON.stringify(refresh.body));
      assert.equal(refresh.body.data.ok, true);

      const index = await call(
        port,
        "client.getSynthesisWorkbenchSurfaceInput",
        {
          args: [
            "index",
            { registry: { scope: "library", expandedSourceRefs: [] } },
          ],
        },
      );
      assert.equal(index.status, 200);
      assert.equal(index.body.data.registry.cacheStatus.status, "ready");
      assert.deepEqual(index.body.data.registry.rows, []);
    } finally {
      if (sidecar.child.exitCode === null) {
        await stop(sidecar.child);
      }
      await new Promise<void>((resolve) => reverseHost.close(() => resolve()));
    }
  });

  it("initializes once, holds the production lock, and ignores legacy lifecycle files", async function () {
    assert.isTrue(fs.existsSync(EXECUTABLE), "Rust sidecar must be built");
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-rust-route-"));
    const legacyFiles = [
      path.join(root, "state", "synthesis-runtime-admission.json"),
      path.join(root, "state", "synthesis-cutover", "receipt.json"),
      path.join(root, "runtime", "synthesis", "service-runtime", "active.json"),
    ];
    for (const file of legacyFiles) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, `legacy:${path.basename(file)}\n`);
    }
    const legacyBefore = legacyFiles.map((file) => fs.readFileSync(file));

    const reverseHost = http.createServer((request, response) => {
      request.resume();
      request.on("end", () => {
        const body = JSON.stringify({
          ok: true,
          result: { configured: false },
        });
        response.writeHead(200, {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
        });
        response.end(body);
      });
    });
    await new Promise<void>((resolve) =>
      reverseHost.listen(0, "127.0.0.1", resolve),
    );
    const address = reverseHost.address();
    if (!address || typeof address === "string") {
      throw new Error("reverse host unavailable");
    }

    const firstSession = path.join(root, "runtime", "sessions", "first");
    fs.mkdirSync(firstSession, { recursive: true });
    const firstConfigPath = path.join(firstSession, "config.json");
    fs.writeFileSync(
      firstConfigPath,
      JSON.stringify(
        config({
          root,
          session: firstSession,
          supervisorInstanceId: "supervisor-first",
          reverseHostPort: address.port,
        }),
      ),
    );
    const first = start(firstConfigPath);
    const { port } = await first.listening;
    let firstStopped = false;
    try {
      const topics = await call(port, "client.listTopics", { args: [{}] });
      assert.equal(topics.status, 200);
      assert.deepEqual(topics.body.data.topics, []);

      const secondSession = path.join(root, "runtime", "sessions", "second");
      fs.mkdirSync(secondSession, { recursive: true });
      const secondConfigPath = path.join(secondSession, "config.json");
      fs.writeFileSync(
        secondConfigPath,
        JSON.stringify(
          config({
            root,
            session: secondSession,
            supervisorInstanceId: "supervisor-second",
            reverseHostPort: address.port,
          }),
        ),
      );
      const second = start(secondConfigPath);
      let conflict = "";
      try {
        await second.listening;
      } catch (error) {
        conflict = String(error);
      }
      assert.include(conflict, "production_lock_conflict");

      await stop(first.child);
      firstStopped = true;
      const restartSession = path.join(root, "runtime", "sessions", "restart");
      fs.mkdirSync(restartSession, { recursive: true });
      const restartConfigPath = path.join(restartSession, "config.json");
      fs.writeFileSync(
        restartConfigPath,
        JSON.stringify(
          config({
            root,
            session: restartSession,
            supervisorInstanceId: "supervisor-restart",
            reverseHostPort: address.port,
          }),
        ),
      );
      const restarted = start(restartConfigPath);
      try {
        const restartListening = await restarted.listening;
        const restartedTopics = await call(
          restartListening.port,
          "client.listTopics",
          { args: [{}] },
        );
        assert.equal(restartedTopics.status, 200);
        assert.deepEqual(restartedTopics.body.data.topics, []);
      } finally {
        await stop(restarted.child);
      }
    } finally {
      if (!firstStopped && first.child.exitCode === null) {
        await stop(first.child);
      }
      await new Promise<void>((resolve) => reverseHost.close(() => resolve()));
    }

    assert.isTrue(fs.existsSync(path.join(root, "state", "synthesis.db")));
    assert.isTrue(fs.existsSync(path.join(root, "data", "synthesis")));
    legacyFiles.forEach((file, index) => {
      assert.deepEqual(fs.readFileSync(file), legacyBefore[index]);
    });
  });
});
