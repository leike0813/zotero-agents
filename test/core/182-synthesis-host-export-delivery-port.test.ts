import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  SYNTHESIS_HOST_EXPORT_DELIVERY_DIAGNOSTICS_MAX,
  SYNTHESIS_HOST_EXPORT_ENTRY_BYTES_MAX,
  SYNTHESIS_HOST_EXPORT_ENTRY_COUNT_MAX,
  SYNTHESIS_HOST_EXPORT_TOTAL_BYTES_MAX,
  rebuildSynthesisHostExportDeliveryRequest,
  rebuildSynthesisHostExportDeliveryResult,
  rebuildSynthesisHostRunWorkspaceMaterializationRequest,
} from "../../packages/synthesis-contracts/src/index";
import {
  resetHostBridgeFileRegistryForTests,
  resolveHostBridgeFileDownload,
} from "../../src/modules/hostBridgeFileRegistry";
import { collectRuntimeFileSourceBytesForTests } from "../../src/modules/runtimeFileTransfer";
import {
  createSynthesisHostExportDeliveryPort,
  createSynthesisHostRunWorkspaceMaterializationPort,
} from "../../src/modules/synthesis/exportDeliveryAdapter";

function request(overrides: Record<string, unknown> = {}) {
  return {
    capability: "topics.get_context",
    displayName: "topic-context-example.zip",
    entries: [
      {
        path: "runtime/payloads/topic-context.semantic.json",
        text: '{"ok":true}\n',
      },
    ],
    ...overrides,
  };
}

function availableResult(overrides: Record<string, unknown> = {}) {
  return {
    status: "available",
    capability: "topics.get_context",
    delivery: {
      mode: "bridge-download",
      bundle: {
        fileId: "file-example-123",
        sourceKind: "bridge-export",
        displayName: "topic-context-example.zip",
        contentType: "application/zip",
        size: 123,
        sha256:
          "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        createdAt: "2026-07-16T00:00:00.000Z",
        expiresAt: "2026-07-16T00:30:00.000Z",
        owner: { capability: "topics.get_context", ignored: true },
        localPath: "/secret/export.zip",
      },
      downloadCommand: "malicious command",
      unpackHint: "malicious hint",
      ignored: true,
    },
    diagnostics: [],
    ignored: true,
    ...overrides,
  };
}

async function rejects(operation: () => Promise<unknown>) {
  try {
    await operation();
    return false;
  } catch {
    return true;
  }
}

describe("Synthesis Host export delivery port", function () {
  afterEach(function () {
    resetHostBridgeFileRegistryForTests();
  });

  it("canonically rebuilds strict requests and available results", function () {
    const rebuiltRequest = rebuildSynthesisHostExportDeliveryRequest({
      ...request(),
      ignored: { nested: true },
      entries: [
        {
          path: "runtime/payloads/topic-context.semantic.json",
          text: '{"ok":true}\n',
          ignored: true,
        },
      ],
    });
    assert.deepEqual(rebuiltRequest, request());

    const rebuiltResult =
      rebuildSynthesisHostExportDeliveryResult(availableResult());
    assert.deepEqual(rebuiltResult, {
      status: "available",
      capability: "topics.get_context",
      delivery: {
        mode: "bridge-download",
        bundle: {
          fileId: "file-example-123",
          sourceKind: "bridge-export",
          displayName: "topic-context-example.zip",
          contentType: "application/zip",
          size: 123,
          sha256:
            "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          createdAt: "2026-07-16T00:00:00.000Z",
          expiresAt: "2026-07-16T00:30:00.000Z",
          owner: { capability: "topics.get_context" },
        },
        downloadCommand:
          "zotero-bridge file download file-example-123 --output topic-context-example.zip",
        unpackHint: "unzip topic-context-example.zip -d .",
      },
      diagnostics: [],
    });
    assert.notInclude(JSON.stringify(rebuiltResult), "/secret");
    assert.notInclude(JSON.stringify(rebuiltResult), "malicious");
  });

  it("rejects unsafe, duplicate, non-JSON, and oversized requests", function () {
    const invalidRequests = [
      request({ capability: "debug.synthesis.worker.run" }),
      request({ displayName: "../escape.zip" }),
      request({ entries: [{ path: "/absolute.json", text: "x" }] }),
      request({ entries: [{ path: "a/../b.json", text: "x" }] }),
      request({ entries: [{ path: "a\\b.json", text: "x" }] }),
      request({
        entries: [
          { path: "same.json", text: "a" },
          { path: "same.json", text: "b" },
        ],
      }),
      request({ callback() {} }),
      request({
        entries: [
          {
            path: "large.txt",
            text: "x".repeat(SYNTHESIS_HOST_EXPORT_ENTRY_BYTES_MAX + 1),
          },
        ],
      }),
      request({
        entries: Array.from(
          { length: SYNTHESIS_HOST_EXPORT_ENTRY_COUNT_MAX + 1 },
          (_, index) => ({ path: `${index}.txt`, text: "x" }),
        ),
      }),
    ];
    for (const value of invalidRequests) {
      assert.throws(() => rebuildSynthesisHostExportDeliveryRequest(value));
    }
    assert.equal(SYNTHESIS_HOST_EXPORT_TOTAL_BYTES_MAX, 50 * 1024 * 1024);
  });

  it("rejects malformed results and bounds unavailable diagnostics", function () {
    const invalidResults = [
      availableResult({ capability: "paper_artifacts.export_filtered" }),
      availableResult({
        delivery: {
          ...(availableResult().delivery as Record<string, unknown>),
          bundle: {
            ...(availableResult().delivery as any).bundle,
            sourceKind: "workflow-artifact",
          },
        },
      }),
      availableResult({
        delivery: {
          ...(availableResult().delivery as Record<string, unknown>),
          bundle: {
            ...(availableResult().delivery as any).bundle,
            sha256: "sha256:bad",
          },
        },
      }),
      {
        status: "unavailable",
        capability: "topics.get_context",
        diagnostics: [],
      },
      {
        status: "unavailable",
        capability: "topics.get_context",
        diagnostics: Array.from(
          { length: SYNTHESIS_HOST_EXPORT_DELIVERY_DIAGNOSTICS_MAX + 1 },
          () => "failed",
        ),
      },
    ];
    for (const value of invalidResults) {
      assert.throws(() => rebuildSynthesisHostExportDeliveryResult(value));
    }
  });

  it("publishes a downloadable ZIP without exposing its managed path", async function () {
    const runtimeRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "synthesis-export-delivery-"),
    );
    try {
      const port = createSynthesisHostExportDeliveryPort({ runtimeRoot });
      const result = await port.publishArchive(request());
      assert.equal(result.status, "available");
      if (result.status !== "available") return;
      assert.equal(result.capability, "topics.get_context");
      assert.match(result.delivery.bundle.sha256, /^sha256:[a-f0-9]{64}$/);
      assert.notInclude(JSON.stringify(result), runtimeRoot);
      const download = await resolveHostBridgeFileDownload(
        result.delivery.bundle.fileId,
      );
      const zipText = Buffer.from(
        await collectRuntimeFileSourceBytesForTests(download.source),
      ).toString("utf8");
      assert.include(zipText, "runtime/payloads/topic-context.semantic.json");
      assert.include(zipText, '{"ok":true}');
    } finally {
      await fs.rm(runtimeRoot, { recursive: true, force: true });
    }
  });

  it("validates before Host I/O and sanitizes adapter failures", async function () {
    let registerCalls = 0;
    const runtimeRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "synthesis-export-delivery-failure-"),
    );
    try {
      const port = createSynthesisHostExportDeliveryPort({
        runtimeRoot,
        async registerFile() {
          registerCalls += 1;
          throw new Error(`/private/secret/path: raw failure`);
        },
      });
      assert.isTrue(
        await rejects(() =>
          port.publishArchive(
            request({ entries: [{ path: "../escape.json", text: "x" }] }),
          ),
        ),
      );
      assert.equal(registerCalls, 0);

      const result = await port.publishArchive(request());
      assert.deepEqual(result, {
        status: "unavailable",
        capability: "topics.get_context",
        diagnostics: ["host_export_delivery_failed"],
      });
      assert.equal(registerCalls, 1);
      assert.notInclude(JSON.stringify(result), "secret");
      const exportRoot = path.join(runtimeRoot, "tmp", "host-bridge-exports");
      assert.isFalse(
        await fs
          .access(exportRoot)
          .then(() => true)
          .catch(() => false),
      );
    } finally {
      await fs.rm(runtimeRoot, { recursive: true, force: true });
    }
  });

  it("materializes bounded entries only inside an ACP skill run", async function () {
    const runtimeRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "synthesis-run-workspace-materialization-"),
    );
    const runRoot = path.join(
      runtimeRoot,
      "runtime",
      "acp",
      "skill-runs",
      "acp-skill-export-test",
    );
    try {
      const port = createSynthesisHostRunWorkspaceMaterializationPort({
        runtimeRoot,
      });
      const result = await port.materialize(
        rebuildSynthesisHostRunWorkspaceMaterializationRequest({
          capability: "paper_artifacts.export_filtered",
          runRoot,
          entries: [
            {
              path: "runtime/payloads/paper-artifacts-manifest.json",
              text: '{"schema_id":"synthesis.filtered_paper_artifacts_manifest"}\n',
            },
            {
              path: "runtime/payloads/artifacts/1_TEST/references.json",
              text: '{"references":[]}\n',
            },
          ],
        }),
      );
      assert.deepEqual(result, {
        status: "materialized",
        capability: "paper_artifacts.export_filtered",
        entryCount: 2,
      });
      assert.equal(
        await fs.readFile(
          path.join(
            runRoot,
            "runtime",
            "payloads",
            "artifacts",
            "1_TEST",
            "references.json",
          ),
          "utf8",
        ),
        '{"references":[]}\n',
      );

      assert.isTrue(
        await rejects(() =>
          port.materialize({
            capability: "paper_artifacts.export_filtered",
            runRoot: path.join(runtimeRoot, "outside", "acp-skill-export-test"),
            entries: [{ path: "runtime/payloads/escape.json", text: "x" }],
          }),
        ),
      );
      await fs
        .access(
          path.join(
            runtimeRoot,
            "outside",
            "acp-skill-export-test",
            "runtime",
            "payloads",
            "escape.json",
          ),
        )
        .then(
          () => assert.fail("out-of-scope workspace write must not occur"),
          () => undefined,
        );
    } finally {
      await fs.rm(runtimeRoot, { recursive: true, force: true });
    }
  });

  it("validates all entries before I/O and materializes the manifest last", async function () {
    const runtimeRoot = path.join(
      os.tmpdir(),
      "synthesis-run-workspace-materialization-order",
    );
    const runRoot = path.join(
      runtimeRoot,
      "runtime",
      "acp",
      "skill-runs",
      "acp-skill-export-order",
    );
    const writes: string[] = [];
    const port = createSynthesisHostRunWorkspaceMaterializationPort({
      runtimeRoot,
      async writeText(target) {
        writes.push(target.replace(/\\/g, "/"));
      },
    });
    await port.materialize({
      capability: "paper_artifacts.export_filtered",
      runRoot,
      entries: [
        {
          path: "runtime/payloads/paper-artifacts-manifest.json",
          text: "{}\n",
        },
        {
          path: "runtime/payloads/artifacts/1_TEST/references.json",
          text: '{"references":[]}\n',
        },
      ],
    });
    assert.match(writes[0], /references\.json$/);
    assert.match(writes[1], /paper-artifacts-manifest\.json$/);

    writes.length = 0;
    assert.isTrue(
      await rejects(() =>
        port.materialize({
          capability: "paper_artifacts.export_filtered",
          runRoot,
          entries: [
            {
              path: "runtime/payloads/paper-artifacts-manifest.json",
              text: "{}\n",
            },
            { path: "../escape.json", text: "x" },
          ],
        }),
      ),
    );
    assert.deepEqual(writes, []);
  });
});
