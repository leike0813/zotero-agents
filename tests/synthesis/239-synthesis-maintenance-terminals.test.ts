import { SYNTHESIS_DISABLED_WEBDAV_DESCRIPTION } from "../helpers/synthesisProductionRouteHarness";
import { assert } from "chai";
import fs from "node:fs";
import path from "node:path";
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
                    fileId: "export-contract",
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
                    "zotero-bridge file download export-contract --output export.zip",
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
        else assert.equal(result.delivery?.bundle.fileId, "export-contract");
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
