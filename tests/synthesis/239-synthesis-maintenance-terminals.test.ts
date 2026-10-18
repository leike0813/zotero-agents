import { SYNTHESIS_DISABLED_WEBDAV_DESCRIPTION } from "../helpers/synthesisProductionRouteHarness";
import { assert } from "chai";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { DatabaseSync } from "node:sqlite";
import { buildTestSynthesisLibrarySnapshotPage } from "../helpers/synthesisProductionRouteHarness";
import { buildTestSynthesisHostItemSummary } from "../helpers/synthesisHostReadPort";
import {
  startSynthesisProductionRouteHarness,
  waitForSynthesisProductionRouteReceipt,
  waitForSynthesisProductionRouteEvidence,
  type SynthesisProductionRouteHarness,
} from "../helpers/synthesisProductionRouteHarness";
import {
  recordSynthesisReverseHostRequestEvidence,
  recordSynthesisReverseHostResultAcceptance,
  recordSynthesisReverseHostResultRejection,
  recordSynthesisReverseHostErrorEvidence,
} from "../helpers/synthesisReverseHostProtocolEvidence";
import { createSynthesisSidecarRpcClient } from "../../src/modules/synthesis/sidecar/synthesisSidecarRpcClient";
import { consumeSynthesisSidecarOutputJson } from "../../src/modules/synthesis/sidecar/synthesisSidecarTransferClient";
import { SYNTHESIS_PRODUCTION_ROUTE_CLIENT_TOKEN } from "../helpers/synthesisProductionRouteHarness";
import { SynthesisClientError } from "../../packages/synthesis-contracts/src";

describe("Synthesis maintenance terminal behavior", function () {
  it("promotes complete snapshots and preserves current membership after failed refresh and reopen", async function () {
    this.timeout(60_000);
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-snapshot-maintenance-"),
    );
    let mode = "success";
    let items = Array.from({ length: 101 }, (_, index) =>
      buildTestSynthesisHostItemSummary({
        libraryId: 1,
        itemKey: `SNAP${String(index).padStart(3, "0")}`,
        title: "Synthetic",
        creators: ["Synthetic Organization"],
      }),
    );
    const originalKeys = items.map((item) => item.itemKey);
    let generation = 0;
    let releaseSecondPage: () => void = () => undefined;
    let observeSecondPage: () => void = () => undefined;
    let releaseReferencePage: () => void = () => undefined;
    let observeReferencePage: () => void = () => undefined;
    const referencePageReleased = new Promise<void>((resolve) => {
      releaseReferencePage = resolve;
    });
    const referencePageObserved = new Promise<void>((resolve) => {
      observeReferencePage = resolve;
    });
    const secondPageReleased = new Promise<void>((resolve) => {
      releaseSecondPage = resolve;
    });
    const secondPageObserved = new Promise<void>((resolve) => {
      observeSecondPage = resolve;
    });
    const fixture = {
      error({ capability }: { capability: string }) {
        if (capability !== "library.items.sync_snapshot") return undefined;
        if (mode === "typed-error")
          return {
            code: "unavailable",
            details: { reason: "snapshot_fixture_unavailable" },
          };
        if (mode === "malformed-error") return {};
        return undefined;
      },
      async handle({
        capability,
        payload,
      }: {
        capability: string;
        payload: Record<string, unknown>;
      }) {
        if (capability === "webdav.describe")
          return SYNTHESIS_DISABLED_WEBDAV_DESCRIPTION;
        if (capability === "library.items.sync_snapshot") {
          if (mode === "malformed-result") return { invalid: true };
          if (!payload.snapshotId) generation += 1;
          if (mode === "bad-second-page" && payload.cursor)
            return { invalid: true };
          if (mode === "cancel-second-page" && payload.cursor) {
            observeSecondPage();
            await secondPageReleased;
          }
          const page = buildTestSynthesisLibrarySnapshotPage({
            items,
            snapshotId: `snapshot-${generation}`,
            batchSize: Number(payload.batchSize),
            batchIndex: Number(payload.cursor ?? 0),
          });
          if (page.items[0]) {
            page.items[0].creators.push({
              representation: "two_field",
              creatorType: "author",
              firstName: "Synthetic",
              lastName: "Author",
            });
            page.items[0].year = null;
          }
          if (mode === "bad-digest" && page.outcome === "completed")
            page.completionEvidence.contentDigest = `sha256:${"0".repeat(64)}`;
          return page;
        }
        if (capability === "library.items.list_page") {
          if (mode === "cancel-reference-page") {
            observeReferencePage();
            await referencePageReleased;
          }
          return {
            snapshotRevision: "snapshot-maintenance",
            items: [],
            cursor: "",
            nextCursor: "",
            hasMore: false,
            returned: 0,
            total: 0,
            limit: Number(payload.limit),
          };
        }
        if (capability === "library.artifacts.scan_page")
          return {
            snapshotRevision: "snapshot-maintenance",
            artifacts: [],
            cursor: "",
            nextCursor: "",
            hasMore: false,
            returned: 0,
            limit: Number(payload.limit),
          };
        throw new Error(`unexpected_host_call:${capability}`);
      },
    };
    let harness = await startSynthesisProductionRouteHarness({
      id: "snapshot-first",
      root,
      hostFixture: fixture,
    });
    const snapshotState = () => {
      const db = new DatabaseSync(path.join(root, "state", "synthesis.db"));
      try {
        const keys = db
          .prepare(
            "SELECT item_key FROM synt_library_snapshot_item WHERE generation_id=(SELECT current_generation_id FROM synt_library_snapshot_state) ORDER BY item_key",
          )
          .all()
          .map((row) => row.item_key);
        return {
          keys,
          generation: db
            .prepare(
              "SELECT current_generation_id FROM synt_library_snapshot_state",
            )
            .get()?.current_generation_id,
        };
      } finally {
        db.close();
      }
    };
    const refresh = async (kind: "run" | "start" | "retry" = "run") => {
      const submitted = await (kind === "start"
        ? harness.client.references.startRefresh()
        : kind === "retry"
          ? harness.client.references.retryReferenceSidecarRefresh()
          : harness.client.references.refreshReferenceSidecarNow());
      return waitForSynthesisProductionRouteReceipt({
        operationId: submitted.operation_id,
        getOperation: (operation_id) =>
          harness.client.maintenance.getOperation({ operation_id }),
      });
    };
    try {
      const initial = await refresh();
      assert.equal(initial.status, "completed", JSON.stringify(initial));
      assert.deepEqual(snapshotState().keys, originalKeys);
      const initialGeneration = snapshotState().generation;
      assert.lengthOf(
        harness.recorder.hostCalls.filter(
          (call) => call.capability === "library.items.sync_snapshot",
        ),
        2,
      );
      for (const call of harness.recorder.hostCalls.filter(
        (call) => call.capability === "library.items.sync_snapshot",
      )) {
        recordSynthesisReverseHostRequestEvidence(
          harness,
          "library.items.sync_snapshot",
          call,
        );
        recordSynthesisReverseHostResultAcceptance(
          harness,
          "library.items.sync_snapshot",
          call,
        );
      }
      for (const failure of [
        "malformed-result",
        "typed-error",
        "malformed-error",
        "bad-digest",
        "bad-second-page",
      ]) {
        mode = failure;
        const terminal = await refresh().catch((error: unknown) => {
          assert.fail(`${failure}:${JSON.stringify(error)}`);
        });
        assert.equal(terminal.status, "failed", failure);
        assert.deepEqual(snapshotState(), {
          keys: originalKeys,
          generation: initialGeneration,
        });
        if (failure === "malformed-result")
          recordSynthesisReverseHostResultRejection({
            harness,
            capability: "library.items.sync_snapshot",
            nativeFailureCode: "reverse_host_result_invalid",
          });
        if (failure === "typed-error" || failure === "malformed-error")
          recordSynthesisReverseHostErrorEvidence({
            harness,
            capability: "library.items.sync_snapshot",
            nativeFailureCode:
              failure === "typed-error"
                ? "snapshot_fixture_unavailable"
                : "reverse_host_response_envelope_invalid",
          });
      }
      mode = "cancel-second-page";
      const submitted =
        await harness.client.references.refreshReferenceSidecarNow();
      await secondPageObserved;
      const canceled = await harness.client.maintenance.controlOperation({
        operation_id: submitted.operation_id,
        action: "cancel",
      });
      assert.equal(canceled.status, "running");
      releaseSecondPage();
      const canceledTerminal = await waitForSynthesisProductionRouteReceipt({
        operationId: submitted.operation_id,
        getOperation: (operation_id) =>
          harness.client.maintenance.getOperation({ operation_id }),
      });
      assert.equal(canceledTerminal.status, "canceled");
      assert.deepEqual(snapshotState(), {
        keys: originalKeys,
        generation: initialGeneration,
      });
      mode = "cancel-reference-page";
      const afterSnapshot =
        await harness.client.references.refreshReferenceSidecarNow();
      await referencePageObserved;
      await harness.client.maintenance.controlOperation({
        operation_id: afterSnapshot.operation_id,
        action: "cancel",
      });
      releaseReferencePage();
      const afterSnapshotTerminal =
        await waitForSynthesisProductionRouteReceipt({
          operationId: afterSnapshot.operation_id,
          getOperation: (operation_id) =>
            harness.client.maintenance.getOperation({ operation_id }),
        });
      assert.equal(afterSnapshotTerminal.status, "canceled");
      assert.propertyVal(afterSnapshotTerminal.receipt, "outcome", "canceled");
      assert.propertyVal(afterSnapshotTerminal.receipt, "state_changed", false);
      assert.deepEqual(snapshotState(), {
        keys: originalKeys,
        generation: initialGeneration,
      });
      await harness.stop();
      harness = await startSynthesisProductionRouteHarness({
        id: "snapshot-reopen",
        root,
        hostFixture: fixture,
      });
      assert.deepEqual(snapshotState(), {
        keys: originalKeys,
        generation: initialGeneration,
      });
      mode = "success";
      items = items.slice(0, 1);
      assert.equal((await refresh("start")).status, "completed");
      assert.deepEqual(snapshotState().keys, originalKeys.slice(0, 1));
      items = [];
      assert.equal((await refresh("retry")).status, "completed");
      assert.deepEqual(snapshotState().keys, []);
    } finally {
      releaseSecondPage();
      releaseReferencePage();
      await harness.stop();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  for (const mode of ["local", "remote"] as const) {
    it(`transports nonempty ${mode} artifact exports and delivery failures`, async function () {
      this.timeout(30_000);
      const capability =
        mode === "local"
          ? "delivery.export.materialize_run_workspace"
          : "delivery.export.publish_archive";
      let injection = "success";
      let entries: Array<{ path: string; text: string }> = [];
      const harness: SynthesisProductionRouteHarness =
        await startSynthesisProductionRouteHarness({
          id: `delivery-contract-${mode}`,
          hostFixture: {
            error({ capability: current }) {
              if (current !== capability) return undefined;
              if (injection === "typed-error")
                return {
                  code: "unavailable",
                  details: { reason: "delivery_fixture_unavailable" },
                };
              if (injection === "malformed-error") return {};
              return undefined;
            },
            async handle({ capability: current, payload }) {
              if (current === "webdav.describe")
                return SYNTHESIS_DISABLED_WEBDAV_DESCRIPTION;
              if (current === "library.artifacts.scan_page")
                return {
                  artifacts: [
                    {
                      paperRef: "1:EXPORT1",
                      artifactType: "digest",
                      payloadType: "digest-markdown",
                      status: "available",
                      locator: "fixture:export",
                      payloadHash: `sha256:${"a".repeat(64)}`,
                      diagnostics: [],
                    },
                  ],
                  cursor: "",
                  nextCursor: "",
                  hasMore: false,
                  returned: 1,
                  limit: Number(payload.limit),
                  snapshotRevision: "export-contract",
                };
              if (current === "library.artifacts.read")
                return {
                  status: "available",
                  payloadHash: payload.expectedHash,
                  content: {
                    kind: "text",
                    text: "# Export fixture\n\nSynthetic digest.",
                    mediaType: "text/markdown",
                  },
                  diagnostics: [],
                };
              if (current !== capability)
                throw new Error(`unexpected_host_call:${current}`);
              if (injection === "malformed-result")
                return { status: "__invalid" };
              const health = (await (
                await fetch(
                  `http://127.0.0.1:${harness.port}/synthesis/v1/health`,
                )
              ).json()) as { serviceInstanceId: string };
              const content = (await consumeSynthesisSidecarOutputJson({
                rpcClient: createSynthesisSidecarRpcClient(),
                connection: {
                  baseUrl: `http://127.0.0.1:${harness.port}`,
                  profileId: "1".repeat(64),
                  clientToken: SYNTHESIS_PRODUCTION_ROUTE_CLIENT_TOKEN,
                  serviceInstanceId: health.serviceInstanceId,
                },
                reference: payload.contentTransfer as never,
                target: "host_export_entries",
                capability: "paper_artifacts.export_filtered",
                cancelAfterRead: false,
              })) as { entries: Array<{ path: string; text: string }> };
              entries = content.entries;
              if (mode === "local") {
                for (const entry of entries) {
                  const target = path.join(String(payload.runRoot), entry.path);
                  fs.mkdirSync(path.dirname(target), { recursive: true });
                  fs.writeFileSync(target, entry.text, "utf8");
                }
                return {
                  status: "materialized",
                  capability: "paper_artifacts.export_filtered",
                  entryCount: entries.length,
                };
              }
              return {
                status: "available",
                capability: "paper_artifacts.export_filtered",
                diagnostics: [],
                delivery: {
                  mode: "bridge-download",
                  bundle: {
                    fileId: "file-export-contract",
                    sourceKind: "bridge-export",
                    displayName: payload.displayName,
                    contentType: "application/zip",
                    size: 1,
                    sha256: `sha256:${"b".repeat(64)}`,
                    createdAt: "2026-10-17T00:00:00Z",
                    expiresAt: "2026-10-17T01:00:00Z",
                    owner: { capability: "paper_artifacts.export_filtered" },
                  },
                  downloadCommand:
                    "zotero-bridge file download file-export-contract --output export.zip",
                  unpackHint: "unzip export.zip",
                },
              };
            },
          },
        });
      try {
        const request = {
          paper_refs: ["1:EXPORT1"],
          run_root: path.join(harness.root, "export"),
        };
        const result = await harness.client.artifacts.exportFiltered(request, {
          mode,
        });
        assert.isNotEmpty(entries);
        const manifest = entries.find(
          (entry) => entry.path === result.manifest_file,
        );
        assert.exists(manifest);
        assert.equal(
          JSON.parse(manifest!.text).papers[0].paper_ref,
          "1:EXPORT1",
        );
        if (mode === "local")
          assert.equal(
            fs.readFileSync(
              path.join(request.run_root, result.manifest_file),
              "utf8",
            ),
            manifest!.text,
          );
        else
          assert.equal(result.delivery?.bundle.fileId, "file-export-contract");
        recordSynthesisReverseHostRequestEvidence(harness, capability);
        recordSynthesisReverseHostResultAcceptance(harness, capability);
        for (injection of [
          "malformed-result",
          "typed-error",
          "malformed-error",
        ]) {
          let failure: unknown;
          try {
            await harness.client.artifacts.exportFiltered(request, { mode });
          } catch (error) {
            failure = error;
          }
          assert.instanceOf(failure, SynthesisClientError);
          if (injection === "malformed-result") {
            const code = (failure as SynthesisClientError).details
              ?.sidecarReason;
            assert.equal(
              code,
              mode === "local" ? "reverse_host_result_invalid" : "unavailable",
            );
            recordSynthesisReverseHostResultRejection({
              harness,
              capability,
              nativeFailureCode: String(code),
            });
          } else {
            const code = String(
              harness
                .observations()
                .filter(
                  (event) =>
                    event.boundary === "reverse-host" &&
                    event.phase === "call-failed" &&
                    event.identities?.capability === capability,
                )
                .at(-1)?.code || "",
            );
            assert.equal(
              code,
              injection === "typed-error"
                ? "delivery_fixture_unavailable"
                : "reverse_host_response_envelope_invalid",
            );
            recordSynthesisReverseHostErrorEvidence({
              harness,
              capability,
              nativeFailureCode: code,
            });
          }
        }
      } finally {
        await harness.stop();
      }
    });
  }

  it("publishes one failure terminal when the Host rejects maintenance work", async function () {
    this.timeout(30_000);
    const harness = await startSynthesisProductionRouteHarness({
      id: "host-rejected-terminal",
      hostFixture: {
        handle({ capability }) {
          if (capability === "webdav.describe")
            return SYNTHESIS_DISABLED_WEBDAV_DESCRIPTION;
          throw new Error("host_fixture_rejected");
        },
      },
    });
    try {
      const submitted =
        await harness.client.references.refreshReferenceSidecarNow();
      const terminal = await waitForSynthesisProductionRouteReceipt({
        operationId: submitted.operation_id,
        getOperation: (operation_id) =>
          harness.client.maintenance.getOperation({ operation_id }),
      });
      assert.equal(terminal.status, "failed");
      for (let index = 0; index < 2; index += 1) {
        assert.equal(
          (
            await harness.client.maintenance.controlOperation({
              operation_id: submitted.operation_id,
              action: "cancel",
            })
          ).status,
          "failed",
        );
      }
      await harness.stopProcess();
      const events = harness
        .observations()
        .filter(
          (event) =>
            event.phase === "maintenance-terminal" &&
            event.identities?.operation === submitted.operation_id,
        );
      assert.lengthOf(events, 1);
      assert.equal(events[0]!.outcome, "failed");
    } finally {
      await harness.stop();
    }
  });

  it("cancels admitted work without Host effects and publishes one terminal across repeated cancellation", async function () {
    this.timeout(30_000);
    const id = "pending-cancel-terminal";
    const harness = await startSynthesisProductionRouteHarness({ id });
    const checkpointRoot = path.join(
      harness.root,
      "runtime",
      "sessions",
      id,
      "test-checkpoints",
    );
    fs.mkdirSync(checkpointRoot, { recursive: true });
    fs.writeFileSync(
      path.join(checkpointRoot, "maintenance-after-admission.armed"),
      "",
    );
    const submitted = harness.client.references.refreshReferenceSidecarNow();
    try {
      const started = await waitForSynthesisProductionRouteEvidence({
        read: () => harness.observations(),
        offset: 0,
        matches: (event) => event.phase === "maintenance-started",
      });
      assert.lengthOf(started, 1);
      const operation_id = started[0]!.identities!.operation!;
      const accepted = await harness.client.maintenance.getOperation({
        operation_id,
      });
      assert.equal(accepted.status, "pending");
      const canceled = await harness.client.maintenance.controlOperation({
        operation_id,
        action: "cancel",
      });
      assert.equal(canceled.status, "canceled");
      assert.equal(canceled.receipt?.state_changed, false);
      fs.writeFileSync(
        path.join(checkpointRoot, "maintenance-after-admission.release"),
        "",
      );
      assert.equal((await submitted).operation_id, operation_id);
      for (let index = 0; index < 3; index += 1) {
        assert.deepEqual(
          await harness.client.maintenance.controlOperation({
            operation_id,
            action: "cancel",
          }),
          canceled,
        );
      }
      await harness.stopProcess();
      assert.deepEqual(
        harness.recorder.hostCalls.filter(
          (call) =>
            call.capability.startsWith("library.") ||
            call.capability.startsWith("effects."),
        ),
        [],
      );
      const terminals = harness
        .observations()
        .filter(
          (event) =>
            event.phase === "maintenance-terminal" &&
            event.identities?.operation === operation_id,
        );
      assert.lengthOf(terminals, 1);
      assert.equal(terminals[0]!.outcome, "canceled");
      assert.equal(terminals[0]!.code, "operation_canceled");
    } finally {
      fs.writeFileSync(
        path.join(checkpointRoot, "maintenance-after-admission.release"),
        "",
      );
      await submitted.catch(() => undefined);
      await harness.stop();
    }
  });
});
