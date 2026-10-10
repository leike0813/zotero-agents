import { assert } from "chai";
import fs from "node:fs";
import path from "node:path";
import {
  startSynthesisProductionRouteHarness,
  waitForSynthesisProductionRouteReceipt,
  waitForSynthesisProductionRouteEvidence,
} from "../helpers/synthesisProductionRouteHarness";

describe("Synthesis maintenance terminal behavior", function () {
  it("publishes one failure terminal when the Host rejects maintenance work", async function () {
    this.timeout(30_000);
    const harness = await startSynthesisProductionRouteHarness({
      id: "host-rejected-terminal",
      hostFixture: {
        handle({ capability }) {
          if (capability === "webdav.describe") return { configured: false };
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
