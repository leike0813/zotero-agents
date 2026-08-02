import { assert } from "chai";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import {
  rebuildSynthesisSidecarObservationEvent,
  type SynthesisSidecarTraceContext,
} from "../../packages/synthesis-contracts/src/sidecarObservability";
import { SYNTHESIS_SIDECAR_PROTOCOL } from "../../packages/synthesis-contracts/src/sidecarSystem";
import { inspectSynthesisTopicWorkbenchSurfaceParity } from "../../scripts/check-synthesis-topic-workbench-surface-parity";
import { buildSynthesisUiSnapshot } from "../../src/modules/synthesis/uiModel";
import { createNativeSynthesisClientComposition } from "../../src/modules/synthesisClient/nativeComposition";

const ROOT = path.resolve(import.meta.dirname, "../..");
const EXECUTABLE = path.join(
  ROOT,
  "native/synthesis-sidecar/target/debug",
  `synthesis-sidecar${process.platform === "win32" ? ".exe" : ""}`,
);
const CLIENT_TOKEN = "client-token-0123456789abcdef0123456789abcdef";
const LIFECYCLE_TOKEN = "lifecycle-token-0123456789abcdef0123456789abcdef";
const PRODUCTION_OPERATION_MANIFEST = JSON.parse(
  fs.readFileSync(
    path.join(
      ROOT,
      "packages/synthesis-contracts/contract-set/synthesis-production-client-v1/operations.json",
    ),
    "utf8",
  ),
) as {
  access: Record<string, "read" | "mutation">;
  policyOverrides: Record<string, { receipt?: string }>;
};
const ALL_PRODUCTION_OPERATIONS = Object.keys(
  PRODUCTION_OPERATION_MANIFEST.access,
).sort();
const RECEIPT_PRODUCTION_OPERATIONS = new Set(
  Object.entries(PRODUCTION_OPERATION_MANIFEST.policyOverrides)
    .filter(([, policy]) => policy.receipt === "public-maintenance-operation")
    .map(([capability]) => capability),
);
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
    libraryId: 1,
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
    schemaVersion: "synthesis-repository-foundation.v2",
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

async function call(
  port: number,
  capability: string,
  payload: unknown,
  trace?: SynthesisSidecarTraceContext,
) {
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
      ...(trace ? { trace } : {}),
    }),
  });
  return {
    status: response.status,
    body: (await response.json()) as Record<string, any>,
  };
}

async function waitForMaintenanceOperation(
  port: number,
  operationId: string,
) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const response = await call(
      port,
      "client.getPublicMaintenanceOperation",
      { args: [{ operation_id: operationId }] },
    );
    assert.equal(response.status, 200, JSON.stringify(response.body));
    if (
      ["completed", "failed", "canceled", "timed_out"].includes(
        String(response.body.data.status),
      )
    ) {
      return response.body.data as Record<string, any>;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`maintenance operation did not finish: ${operationId}`);
}

function topicApplyRequest(topicId: string) {
  const sourcePaperRef = "1:PRODUCTION";
  const sectionValues: Record<string, unknown> = {
    topic: {
      id: topicId,
      title: "Production Topic",
      definition: "A durable production-route Topic",
      discipline: "Information Science",
      scope: "Topic lifecycle persistence",
    },
    summary: { overview: "A production lifecycle fixture." },
    taxonomy: {
      summary: { text: "One durable research route." },
      nodes: [
        {
          id: "route:durable",
          definition: "Durable lifecycle route",
          core_problem: "Preserve lifecycle facts",
          mechanism: "Transactional repository and canonical storage",
          source_paper_refs: [sourcePaperRef],
          strengths: ["durable"],
          limitations: ["fixture scope"],
          maturity: "validated",
        },
      ],
    },
    improvement_dimensions: [
      {
        id: "dimension:durability",
        analysis: "The lifecycle preserves current and deleted state.",
        source_paper_refs: [sourcePaperRef],
      },
    ],
    claims: [
      {
        id: "claim:durable",
        text: "Topic lifecycle state is durable.",
        analysis: "Repository and canonical state survive process reopen.",
        scope: "Production route fixture",
        source_paper_refs: [sourcePaperRef],
      },
    ],
    timeline_events: {
      summary: { text: "Create, delete, reopen, rebuild, and purge." },
      events: [
        {
          id: "event:lifecycle",
          description: "The lifecycle is exercised through the HTTP boundary.",
          phase: "validation",
          source_paper_refs: [sourcePaperRef],
        },
      ],
    },
    source_papers: [
      {
        paper_ref: sourcePaperRef,
        digest_ref: {
          paper_ref: sourcePaperRef,
          payload_type: "digest-markdown",
        },
      },
    ],
    debates: [],
    coverage: {
      coverage_verdict: "partial",
      coverage_reason:
        "A single bounded fixture source is sufficient for lifecycle validation.",
      coverage_caveats: [
        "This fixture does not represent a literature review.",
      ],
      external_context_summary:
        "External context is outside this lifecycle test.",
      suggested_collection_directions: [],
    },
    future_directions: [
      {
        id: "future:coverage",
        source_paper_refs: [sourcePaperRef],
      },
    ],
    review_outline: {
      topic_importance:
        "Durable deletion protects user-controlled Topic state.",
      writing_strategies: [
        {
          id: "strategy:lifecycle",
          title: "Lifecycle",
          review_thesis: "State remains coherent across lifecycle transitions.",
          writing_strategy: "Follow the transitions in storage order.",
          best_for: "Persistence review",
          risks: "Fixture scope",
          section_plan: ["Create", "Delete", "Purge"],
          source_paper_refs: [sourcePaperRef],
        },
      ],
      recommended_strategy_id: "strategy:lifecycle",
    },
    statistics: {
      paper_count: 1,
      time_span: { start_year: 2026, end_year: 2026 },
      route_coverage: "One fixture route",
      coverage_verdict: "partial",
    },
    synthesis_report: {
      title: "Production Topic Lifecycle",
      source_section_chapters: {
        research_routes: "taxonomy.summary",
        historical_progression: "timeline_events.summary",
      },
      body: "This bounded report records a production Topic lifecycle through the real authenticated sidecar route. It establishes a durable active artifact, archives that artifact under a stable deleted identifier, reopens the process against the same repository and canonical root, rebuilds an active Topic without erasing the tombstone, and finally purges only deleted state. The fixture intentionally keeps its literature claims narrow because the observable contract under test is storage ownership and transition safety. ",
    },
    source_artifacts: [],
    diagnostics: { warnings: [] },
  };
  const sectionAssets = Object.entries(sectionValues).map(([name, value]) => ({
    id: `asset/section/${name}`,
    mediaType: "application/json",
    text: JSON.stringify(value),
  }));
  return {
    bundle: {
      kind: "topic_synthesis",
      operation: "create",
      mode: "create",
      language: "en",
      topic_definition: {
        id: topicId,
        title: "Production Topic",
        definition: "A durable production-route Topic",
      },
      resolver_manifest_path: "asset/resolver",
      analysis_manifest_path: "asset/manifest",
      artifact_metadata: {},
      markdown: "",
    },
    assets: [
      {
        id: "asset/manifest",
        mediaType: "application/json",
        text: JSON.stringify({
          schema_id: "synthesis.topic_analysis_manifest",
          schema_version: "3.0.0",
          operation: "create",
          topic_id: topicId,
          language: "en",
          sections: Object.fromEntries(
            Object.keys(sectionValues).map((name) => [
              name,
              { path: `asset/section/${name}`, content_type: "json" },
            ]),
          ),
          sidecars: Object.fromEntries(
            [
              "topic_interest_metadata",
              "concept_cards_proposal",
              "topic_graph_relation_proposals",
              "prospective_topic_relation_proposals",
            ].map((name) => [
              name,
              {
                path: `asset/sidecar/${name}`,
                content_type: "json",
                schema_id: `fixture.${name}`,
              },
            ]),
          ),
        }),
      },
      ...sectionAssets,
      {
        id: "asset/resolver",
        mediaType: "application/json",
        text: JSON.stringify({
          resolver: { query: "durable production topic" },
          resolved_paper_set: { papers: [{ paper_ref: sourcePaperRef }] },
        }),
      },
    ],
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

  it("moves large Topic and artifact content outside the production control envelope", async function () {
    assert.isTrue(fs.existsSync(EXECUTABLE), "Rust sidecar must be built");
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-rust-content-route-"));
    const hostCalls: string[] = [];
    const reverseHost = http.createServer((request, response) => {
      let source = "";
      request.setEncoding("utf8");
      request.on("data", (chunk) => {
        source += chunk;
      });
      request.on("end", () => {
        const requestCall = JSON.parse(source) as {
          capability: string;
          payload: Record<string, unknown>;
        };
        hostCalls.push(requestCall.capability);
        let result: Record<string, unknown>;
        if (requestCall.capability === "library.artifacts.scan_page") {
          result = {
            artifacts: [
              {
                paperRef: "1:CONTENT1",
                artifactType: "references",
                payloadType: "references-json",
                status: "available",
                locator: "fixture:references:CONTENT1",
                payloadHash: `sha256:${"a".repeat(64)}`,
                estimatedSize: 900_000,
                diagnostics: [],
              },
            ],
            cursor: "",
            nextCursor: "",
            hasMore: false,
            returned: 1,
            limit: 50,
          };
        } else if (requestCall.capability === "library.artifacts.read") {
          result = {
            status: "available",
            payloadHash: requestCall.payload.expectedHash,
            content: {
              kind: "json",
              value: {
                padding: "x".repeat(900_000),
                references: [{ title: "Transferred reference" }],
              },
            },
            diagnostics: [],
          };
        } else if (
          requestCall.capability === "delivery.export.publish_archive"
        ) {
          result = {
            status: "available",
            capability: "paper_artifacts.export_filtered",
            delivery: {
              mode: "bridge-download",
              bundle: {
                fileId: "file-content-1",
                sourceKind: "bridge-export",
                displayName: "paper-artifacts.zip",
                contentType: "application/zip",
                size: 1,
                sha256: `sha256:${"b".repeat(64)}`,
                createdAt: "2026-08-02T00:00:00.000Z",
                expiresAt: "2026-08-02T01:00:00.000Z",
                owner: { capability: "paper_artifacts.export_filtered" },
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
    const session = path.join(root, "runtime", "sessions", "content");
    fs.mkdirSync(session, { recursive: true });
    const configPath = path.join(session, "config.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        config({
          root,
          session,
          supervisorInstanceId: "supervisor-content-route",
          reverseHostPort: address.port,
        }),
      ),
    );
    const sidecar = start(configPath);
    try {
      const { port } = await sidecar.listening;
      const health = (await (
        await fetch(`http://127.0.0.1:${port}/synthesis/v1/health`)
      ).json()) as { serviceInstanceId: string };
      const composition = createNativeSynthesisClientComposition({
        getReadyConnection: () => ({
          discovery: {
            host: "127.0.0.1",
            port,
            profileId: "1".repeat(64),
            serviceInstanceId: health.serviceInstanceId,
          },
          clientToken: CLIENT_TOKEN,
        }),
      });
      const applyRequest = topicApplyRequest("topic-content-transfer");
      applyRequest.assets.push({
        id: "asset/large-padding",
        mediaType: "text/plain",
        text: "p".repeat(900_000),
      });
      const applied = await composition.client.workflowApply.applyTopicSynthesisResult(
        applyRequest,
      );
      assert.equal(applied.status, "persisted");

      const artifacts = await composition.client.artifacts.readPaperArtifacts({
        paper_refs: ["1:CONTENT1"],
        artifact_types: ["references"],
      });
      assert.equal(
        (artifacts.artifacts[0].payload as any).value.padding.length,
        900_000,
      );
      assert.notInclude(JSON.stringify(artifacts), "native-transfer:");

      const exported = await composition.client.artifacts.exportFiltered(
        { paper_refs: ["1:CONTENT1"], artifact_types: ["references"] },
        { mode: "remote" },
      );
      assert.deepEqual(exported.delivery, {
        status: "available",
        capability: "paper_artifacts.export_filtered",
        delivery: {
          mode: "bridge-download",
          bundle: {
            fileId: "file-content-1",
            sourceKind: "bridge-export",
            displayName: "paper-artifacts.zip",
            contentType: "application/zip",
            size: 1,
            sha256: `sha256:${"b".repeat(64)}`,
            createdAt: "2026-08-02T00:00:00.000Z",
            expiresAt: "2026-08-02T01:00:00.000Z",
            owner: { capability: "paper_artifacts.export_filtered" },
          },
        },
        diagnostics: [],
      });
      assert.include(hostCalls, "delivery.export.publish_archive");
      assert.notInclude(JSON.stringify(exported), "900000");
      await composition.dispose();
    } finally {
      if (sidecar.child.exitCode === null) {
        await stop(sidecar.child);
      }
      await new Promise<void>((resolve) => reverseHost.close(() => resolve()));
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("dispatches the closed 95-operation roster through the real production route", async function () {
    this.timeout(60_000);
    assert.isTrue(fs.existsSync(EXECUTABLE), "Rust sidecar must be built");
    assert.lengthOf(ALL_PRODUCTION_OPERATIONS, 95);
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-rust-roster-route-"),
    );
    const reverseHostCalls: string[] = [];
    const reverseHost = http.createServer((request, response) => {
      let requestBody = "";
      request.setEncoding("utf8");
      request.on("data", (chunk) => {
        requestBody += chunk;
      });
      request.on("end", () => {
        const hostCall = JSON.parse(requestBody || "{}") as {
          capability?: string;
          payload?: { cursor?: string; limit?: number };
        };
        reverseHostCalls.push(String(hostCall.capability || ""));
        const cursor = hostCall.payload?.cursor || "";
        const limit = hostCall.payload?.limit || 100;
        const result =
          hostCall.capability === "webdav.describe"
            ? { configured: false }
            : hostCall.capability === "library.items.list_page"
              ? {
                  items: [],
                  cursor,
                  nextCursor: "",
                  hasMore: false,
                  returned: 0,
                  limit,
                  snapshotRevision: "fixture-roster",
                }
              : hostCall.capability === "library.artifacts.scan_page"
                ? {
                    artifacts: [],
                    cursor,
                    nextCursor: "",
                    hasMore: false,
                    returned: 0,
                    limit,
                    snapshotRevision: "fixture-roster",
                  }
                : { status: "unavailable", diagnostics: [] };
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
    const session = path.join(root, "runtime", "sessions", "roster");
    fs.mkdirSync(session, { recursive: true });
    const configPath = path.join(session, "config.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        config({
          root,
          session,
          supervisorInstanceId: "supervisor-roster",
          reverseHostPort: address.port,
        }),
      ),
    );
    const sidecar = start(configPath);
    try {
      const { port } = await sidecar.listening;
      for (const [surface, field, state] of [
        ["home", "artifacts", {}],
        ["topics", "artifacts", {}],
        ["review", "reviews", {}],
        ["tags", "tags", {}],
        ["concepts", "concepts", {}],
        ["reader", "reader", {}],
        ["index", "registry", { registry: { scope: "library" } }],
        ["graph", "graph", {}],
      ] as const) {
        const projection = await call(
          port,
          "client.getSynthesisWorkbenchSurfaceInput",
          { args: [surface, state] },
        );
        assert.equal(projection.status, 200, surface);
        assert.equal(projection.body.data.libraryId, 1, surface);
        assert.property(projection.body.data, field, surface);
        assert.notProperty(projection.body.data, "maintenance", surface);
      }
      const absentTopic = await call(port, "client.readTopicDetail", {
        args: [{ topicId: "topic-absent" }],
      });
      assert.deepInclude(absentTopic.body.data, {
        ok: false,
        status: "unavailable",
        topicId: "topic-absent",
        title: "",
        source_papers: [],
      });
      const profiler = await call(port, "client.debugSynthesisProfilerList", {
        args: [{}],
      });
      assert.deepEqual(profiler.body.data, {
        status: "unavailable",
        diagnostics: [],
      });
      for (const [operation, request] of [
        ["client.debugSynthesisPaperInspect", { paperRef: "1:ABSENT" }],
        ["client.debugSynthesisDiff", {}],
      ] as const) {
        const unavailable = await call(port, operation, { args: [request] });
        assert.equal(unavailable.status, 200, operation);
        assert.deepEqual(
          unavailable.body.data,
          { status: "unavailable", diagnostics: [] },
          operation,
        );
      }
      const observed: string[] = [];
      const stableHttpTerminals = [200, 400, 404, 408, 409, 413, 422, 429, 503];
      for (const operation of ALL_PRODUCTION_OPERATIONS) {
        const response = await call(port, operation, { args: [] });
        const errorCode = String(response.body.error?.code || "");
        assert.include(stableHttpTerminals, response.status, operation);
        assert.isTrue(
          "data" in response.body !== "error" in response.body,
          operation,
        );
        assert.notInclude(
          ["unknown_operation", "unknown_capability", "route_not_found"],
          errorCode,
          operation,
        );
        if (RECEIPT_PRODUCTION_OPERATIONS.has(operation)) {
          assert.equal(response.status, 200, operation);
          assert.equal(
            response.body.data.schema,
            "synthesis.maintenance_operation.v1",
            operation,
          );
          assert.equal(response.body.data.operation_type, operation, operation);
          assert.include(
            ["pending", "running"],
            response.body.data.status,
            operation,
          );
        }
        observed.push(operation);
      }
      assert.deepEqual(observed, ALL_PRODUCTION_OPERATIONS);
      assert.isTrue(fs.existsSync(path.join(root, "state", "synthesis.db")));
      assert.isNotEmpty(reverseHostCalls);
    } finally {
      if (sidecar.child.exitCode === null) {
        await stop(sidecar.child);
      }
      await new Promise<void>((resolve) => reverseHost.close(() => resolve()));
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("persists Topic delete, rebuild, and purge across production-route reopen", async function () {
    assert.isTrue(fs.existsSync(EXECUTABLE), "Rust sidecar must be built");
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-rust-topic-lifecycle-"),
    );
    const reverseHostCalls: string[] = [];
    const reverseHost = http.createServer((request, response) => {
      reverseHostCalls.push(String(request.url || ""));
      request.resume();
      request.on("end", () => {
        const body = JSON.stringify({ ok: true, result: {} });
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
    const session = path.join(root, "runtime", "sessions", "topic-lifecycle");
    fs.mkdirSync(session, { recursive: true });
    const configPath = path.join(session, "config.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        config({
          root,
          session,
          supervisorInstanceId: "supervisor-topic-lifecycle",
          reverseHostPort: address.port,
        }),
      ),
    );
    let sidecar = start(configPath);
    try {
      let { port } = await sidecar.listening;
      const topicId = "topic-production-lifecycle";
      const applyRequest = topicApplyRequest(topicId);
      const applied = await call(port, "client.applyTopicSynthesisResult", {
        args: [applyRequest],
      });
      assert.equal(applied.status, 200, JSON.stringify(applied.body));
      assert.equal(applied.body.data.ok, true, JSON.stringify(applied.body));
      assert.deepInclude(applied.body.data, {
        ok: true,
        status: "persisted",
        topicId,
      });

      reverseHostCalls.length = 0;
      const deleted = await call(port, "client.deleteTopicArtifact", {
        args: [{ topicId }],
      });
      assert.equal(deleted.status, 200, JSON.stringify(deleted.body));
      assert.deepInclude(deleted.body.data, {
        ok: true,
        status: "deleted",
        topicId,
      });
      const deletedPathId = String(deleted.body.data.deletedPathId || "");
      assert.isNotEmpty(deletedPathId);

      const deletedProjection = await call(
        port,
        "client.getSynthesisWorkbenchSurfaceInput",
        { args: ["topics", { artifacts: {} }] },
      );
      assert.lengthOf(deletedProjection.body.data.artifacts, 0);
      assert.lengthOf(deletedProjection.body.data.deletedArtifacts.rows, 1);
      assert.deepInclude(deletedProjection.body.data.deletedArtifacts.rows[0], {
        topic_id: topicId,
        deleted_path_id: deletedPathId,
      });
      assert.match(
        deletedProjection.body.data.deletedArtifacts.rows[0].deleted_at,
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/,
      );

      const repeatedDelete = await call(port, "client.deleteTopicArtifact", {
        args: [{ topicId }],
      });
      assert.equal(repeatedDelete.status, 200);
      assert.equal(repeatedDelete.body.data.deletedPathId, deletedPathId);
      assert.deepEqual(reverseHostCalls, []);

      await stop(sidecar.child);
      sidecar = start(configPath);
      ({ port } = await sidecar.listening);
      reverseHostCalls.length = 0;
      const reopenedProjection = await call(
        port,
        "client.getSynthesisWorkbenchSurfaceInput",
        { args: ["home", { artifacts: {} }] },
      );
      assert.lengthOf(reopenedProjection.body.data.artifacts, 0);
      assert.equal(
        reopenedProjection.body.data.deletedArtifacts.rows[0].deleted_path_id,
        deletedPathId,
      );

      const rebuilt = await call(port, "client.applyTopicSynthesisResult", {
        args: [topicApplyRequest(topicId)],
      });
      assert.equal(rebuilt.status, 200, JSON.stringify(rebuilt.body));
      assert.equal(rebuilt.body.data.status, "persisted");
      const coexistProjection = await call(
        port,
        "client.getSynthesisWorkbenchSurfaceInput",
        { args: ["topics", { artifacts: {} }] },
      );
      assert.lengthOf(coexistProjection.body.data.artifacts, 1);
      assert.lengthOf(coexistProjection.body.data.deletedArtifacts.rows, 1);

      const firstPurge = await call(port, "client.purgeDeletedTopicArtifacts", {
        args: [],
      });
      const secondPurge = await call(
        port,
        "client.purgeDeletedTopicArtifacts",
        { args: [] },
      );
      assert.deepInclude(firstPurge.body.data, {
        ok: true,
        status: "purged",
        purged_count: 1,
      });
      assert.deepInclude(secondPurge.body.data, {
        ok: true,
        status: "purged",
        purged_count: 0,
      });
      const activeAfterPurge = await call(
        port,
        "client.getSynthesisWorkbenchSurfaceInput",
        { args: ["topics", { artifacts: {} }] },
      );
      assert.lengthOf(activeAfterPurge.body.data.artifacts, 1);
      assert.lengthOf(activeAfterPurge.body.data.deletedArtifacts.rows, 0);
      assert.deepEqual(reverseHostCalls, []);
    } finally {
      if (sidecar.child.exitCode === null) {
        await stop(sidecar.child);
      }
      await new Promise<void>((resolve) => reverseHost.close(() => resolve()));
      fs.rmSync(root, { recursive: true, force: true });
    }
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
                padding: smallReference
                  ? ""
                  : `共享引用 ${"文献".repeat(400_000)}`,
                references: [
                  {
                    title: smallReference
                      ? "Small expanded reference"
                      : "Shared expanded reference",
                    year: "   ",
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
        const send = () => {
          response.writeHead(200, {
            "content-type": "application/json",
            "content-length": Buffer.byteLength(body),
          });
          response.end(body);
        };
        if (call.capability === "library.artifacts.scan_page") {
          setTimeout(send, 2_100);
        } else {
          send();
        }
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

      const refreshTrace = {
        schema: "synthesis-sidecar-observation.v2",
        traceId: "a".repeat(32),
        spanId: "b".repeat(16),
        attempt: 0,
      } as const;
      const receiptStartedAt = Date.now();
      const refresh = await call(
        port,
        "client.refreshReferenceSidecarNow",
        { args: [] },
        refreshTrace,
      );
      assert.equal(refresh.status, 200, JSON.stringify(refresh.body));
      assert.isBelow(
        Date.now() - receiptStartedAt,
        1_000,
        "the control RPC must return before the delayed Host artifact page",
      );
      const refreshCompleted = await waitForMaintenanceOperation(
        port,
        refresh.body.data.operation_id,
      );
      assert.equal(refreshCompleted.status, "completed");
      assert.equal(refreshCompleted.receipt.ok, true);

      const matching = await call(
        port,
        "client.runAdvancedReferenceMatchingNow",
        { args: [] },
        {
          ...refreshTrace,
          spanId: "c".repeat(16),
          parentSpanId: refreshTrace.spanId,
        },
      );
      assert.equal(matching.status, 200, JSON.stringify(matching.body));
      const matchingCompleted = await waitForMaintenanceOperation(
        port,
        matching.body.data.operation_id,
      );
      assert.equal(
        matchingCompleted.receipt.ok,
        true,
        JSON.stringify(matchingCompleted),
      );
      assert.equal(
        matchingCompleted.receipt.status,
        "promoted",
        JSON.stringify(matchingCompleted),
      );

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
      const rebuildGraphCompleted = await waitForMaintenanceOperation(
        port,
        rebuildGraph.body.data.operation_id,
      );
      assert.equal(rebuildGraphCompleted.status, "completed");

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
      assert.equal(
        (
          await waitForMaintenanceOperation(
            port,
            recomputeLayout.body.data.operation_id,
          )
        ).receipt.status,
        "promoted",
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
      assert.equal(
        (
          await waitForMaintenanceOperation(
            port,
            refreshMetrics.body.data.operation_id,
          )
        ).receipt.status,
        "promoted",
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
      const refreshTraceEvents = sidecar
        .stderr()
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          try {
            return rebuildSynthesisSidecarObservationEvent(JSON.parse(line));
          } catch {
            return undefined;
          }
        })
        .filter((event) => event?.traceId === refreshTrace.traceId);
      assert.includeMembers(
        [...new Set(refreshTraceEvents.map((event) => event!.boundary))],
        ["host-rpc", "reverse-host", "operation"],
      );
      const workerCapabilities = refreshTraceEvents
        .filter((event) => event?.boundary === "child-worker")
        .map((event) => event?.identities?.capability)
        .filter((value): value is string => typeof value === "string");
      assert.include(
        refreshTraceEvents.map((event) => event?.boundary),
        "child-worker",
      );
      assert.include(workerCapabilities, "reference_binding.v1");
      assert.include(workerCapabilities, "reference_canonical_dedupe.v1");
      assert.isTrue(
        refreshTraceEvents.some(
          (event) =>
            event?.parentSpanId === refreshTrace.spanId &&
            event.outcome === "succeeded",
        ),
      );
      assert.notInclude(sidecar.stderr(), "共享引用");
      assert.notInclude(sidecar.stderr(), "fixture:references:");
      assert.notInclude(sidecar.stderr(), CLIENT_TOKEN);

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

  it("admits and materializes a production literature apply with a large string", async function () {
    assert.isTrue(fs.existsSync(EXECUTABLE), "Rust sidecar must be built");
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-rust-digest-route-"),
    );
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
    const session = path.join(root, "runtime", "sessions", "digest");
    fs.mkdirSync(session, { recursive: true });
    const configPath = path.join(session, "config.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        config({
          root,
          session,
          supervisorInstanceId: "supervisor-digest",
          reverseHostPort: address.port,
        }),
      ),
    );
    const request = {
      libraryId: 1,
      itemKey: "DIGEST01",
      paperRef: "1:DIGEST01",
      itemType: "journalArticle",
      title: "Large digest apply",
      year: "2026",
      date: "2026-08-01",
      creators: ["Researcher"],
      tags: [],
      collections: [],
      doi: "",
      arxiv: "",
      isbn: "",
      url: "",
      citekey: "digest2026",
      dateAdded: "2026-08-01",
      digest: {
        payloadHash: "sha256:digest-large",
        content: `# Digest\n${"x".repeat(128 * 1024)}`,
      },
      references: {
        payloadHash: "sha256:references-large",
        references: [{ title: "Target", year: "2025", citekey: "target2025" }],
      },
      citationAnalysis: {
        payloadHash: "sha256:citation-large",
        citations: [{ reference_index: 0, role: "background" }],
      },
      literatureMatchingMetadata: { key_terms: ["Large request"] },
      matchedReferences: [
        {
          libraryId: 1,
          itemKey: "TARGET01",
          paperRef: "1:TARGET01",
          title: "Target",
          year: "2025",
          citekey: "target2025",
        },
      ],
    };
    let sidecar = start(configPath);
    try {
      let listening = await sidecar.listening;
      const first = await call(
        listening.port,
        "client.applyLiteratureDigestSidecar",
        { args: [request] },
      );
      assert.equal(first.status, 200, JSON.stringify(first.body));
      assert.deepInclude(first.body.data, {
        ok: true,
        status: "sidecar_applied",
        sourceRef: "1:DIGEST01",
        source_ref: "1:DIGEST01",
        paperRef: "1:DIGEST01",
        reference_count: 1,
        matched_count: 1,
        idempotent: false,
      });
      const oversizedRequest = structuredClone(request);
      oversizedRequest.digest.content = "x".repeat(1024 * 1024);
      const oversized = await call(
        listening.port,
        "client.applyLiteratureDigestSidecar",
        { args: [oversizedRequest] },
      );
      assert.equal(oversized.status, 413, JSON.stringify(oversized.body));
      assert.equal(oversized.body.error?.code, "request_body_too_large");
      await stop(sidecar.child);

      sidecar = start(configPath);
      listening = await sidecar.listening;
      const repeated = await call(
        listening.port,
        "client.applyLiteratureDigestSidecar",
        { args: [request] },
      );
      assert.equal(repeated.status, 200, JSON.stringify(repeated.body));
      assert.equal(repeated.body.data.status, "sidecar_applied");
      assert.equal(repeated.body.data.idempotent, true);
    } finally {
      if (sidecar.child.exitCode === null) await stop(sidecar.child);
      await new Promise<void>((resolve) => reverseHost.close(() => resolve()));
      fs.rmSync(root, { recursive: true, force: true });
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
      assert.equal(
        refresh.body.data.schema,
        "synthesis.maintenance_operation.v1",
      );
      assert.include(["pending", "running"], refresh.body.data.status);
      assert.equal(
        refresh.body.data.operation_type,
        "client.refreshReferenceSidecarNow",
      );
      const completed = await waitForMaintenanceOperation(
        port,
        refresh.body.data.operation_id,
      );
      assert.equal(completed.status, "completed");
      assert.equal(completed.receipt.ok, true);

      const missing = await call(
        port,
        "client.getPublicMaintenanceOperation",
        { args: [{ operation_id: "maintenance:missing" }] },
      );
      assert.equal(missing.status, 200, JSON.stringify(missing.body));
      assert.deepEqual(missing.body.data, {
        schema: "synthesis.maintenance_operation.v1",
        operation_id: "maintenance:missing",
        status: "not_found",
      });
      const internal = await call(
        port,
        "client.getPublicMaintenanceOperation",
        { args: [{ operation_id: "reference-job:refresh" }] },
      );
      assert.equal(internal.status, 200, JSON.stringify(internal.body));
      assert.equal(internal.body.data.status, "not_found");

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
