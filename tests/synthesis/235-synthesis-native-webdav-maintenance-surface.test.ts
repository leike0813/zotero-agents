import { assert } from "chai";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createSyntheticSynthesisProductionRouteDataset } from "../fixtures/synthesisSyntheticDatasets";
import {
  startSynthesisProductionRouteHarness,
  SYNTHESIS_DISABLED_WEBDAV_DESCRIPTION,
  buildTestSynthesisLibrarySnapshotPage,
  captureSynthesisProductionRouteDurableState,
  waitForSynthesisProductionRouteEvidence,
  waitForSynthesisProductionRouteReceipt,
  callSynthesisProductionRoute,
} from "../helpers/synthesisProductionRouteHarness";
import { SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITIES } from "../../packages/synthesis-contracts/src/sidecarSystem";
import { inspectSynthesisWebDavMaintenanceSurfaceParity } from "../../scripts/synthesis/check-synthesis-webdav-maintenance-surface-parity";

const OWNED = [
  "client.syncWebDavNow",
  "client.pauseWebDavSync",
  "client.resumeWebDavSync",
  "client.retryWebDavSync",
  "client.resolveWebDavSyncConflict",
  "client.getPublicMaintenanceOperation",
  "client.controlPublicMaintenanceOperation",
  "client.reconcileSynthesisRuntimeWorkStateOnStartup",
  "client.resetSynthesisDatabase",
  "client.debugSynthesisCleanInstallReset",
] as const;

describe("Synthesis native WebDAV and Maintenance surface", () => {
  for (const cleanInstall of [false, true]) {
    it(`resets nonempty ${cleanInstall ? "clean-install" : "database"} state and keeps a verified backup`, async function () {
      this.timeout(30_000);
      const harness = await startSynthesisProductionRouteHarness({
        id: `reset-${cleanInstall}`,
      });
      try {
        const dataset = createSyntheticSynthesisProductionRouteDataset("2k");
        const seeded =
          await harness.client.workflowApply.applyTopicSynthesisResult(
            dataset.topicApplyRequest,
          );
        assert.equal(seeded.status, "persisted");
        const canonical = path.join(harness.root, "data", "synthesis");
        const before = fs.readdirSync(path.join(canonical, "topics"));
        assert.isNotEmpty(before);
        const result = cleanInstall
          ? await harness.client.debug.cleanInstallReset({
              dryRun: false,
              confirmationText: "RESET SYNTHESIS CLEAN INSTALL",
            })
          : await harness.client.maintenance.resetDatabase({
              confirmationText: "RESET SYNTHESIS DATABASE",
            });
        assert.equal(result.status, "reset");
        assert.isTrue(result.ok);
        assert.equal(
          result.deletedRowsByTable?.synt_topic_application_state,
          1,
        );
        const after = fs.readdirSync(path.join(canonical, "topics"));
        if (cleanInstall) assert.isEmpty(after);
        else assert.deepEqual(after, before);
        const options = await harness.client.topics.listWorkflowOptions({
          filter: "all",
        });
        assert.isEmpty(options.options);
        assert.isNotEmpty(
          fs.readdirSync(
            path.join(harness.root, "state", "synthesis-reset-backups"),
          ),
        );
        const backupRoot = path.join(
          harness.root,
          "state",
          "synthesis-reset-backups",
        );
        const backup = new DatabaseSync(
          path.join(backupRoot, fs.readdirSync(backupRoot)[0]!, "synthesis.db"),
          { readOnly: true },
        );
        try {
          assert.equal(
            backup
              .prepare(
                "SELECT COUNT(*) AS count FROM synt_topic_application_state",
              )
              .get()?.count,
            1,
          );
          assert.deepEqual(
            Object.values(backup.prepare("PRAGMA integrity_check").get()!),
            ["ok"],
          );
        } finally {
          backup.close();
        }
        await harness.stopProcess();
        const reopened = await startSynthesisProductionRouteHarness({
          id: `reset-reopened-${cleanInstall}`,
          root: harness.root,
        });
        try {
          assert.isEmpty(
            (
              await reopened.client.topics.listWorkflowOptions({
                filter: "all",
              })
            ).options,
          );
        } finally {
          await reopened.stop();
        }
      } finally {
        await harness.stop();
      }
    });
  }

  for (const phase of [
    "reset-after-backup",
    "reset-after-canonical-stage",
    "reset-before-database-commit",
    "reset-after-database-commit",
  ]) {
    it(`recovers clean-install reset after process death at ${phase}`, async function () {
      this.timeout(30_000);
      const id = `reset-crash-${phase}`;
      const harness = await startSynthesisProductionRouteHarness({ id });
      const checkpointRoot = path.join(
        harness.root,
        "runtime",
        "sessions",
        id,
        "test-checkpoints",
      );
      let pending: Promise<unknown> | undefined;
      try {
        await harness.client.workflowApply.applyTopicSynthesisResult(
          createSyntheticSynthesisProductionRouteDataset("2k")
            .topicApplyRequest,
        );
        const canonicalTopics = path.join(
          harness.root,
          "data",
          "synthesis",
          "topics",
        );
        const before = fs.readdirSync(canonicalTopics);
        fs.mkdirSync(checkpointRoot, { recursive: true });
        fs.writeFileSync(path.join(checkpointRoot, `${phase}.armed`), "");
        pending = harness.client.debug
          .cleanInstallReset({
            dryRun: false,
            confirmationText: "RESET SYNTHESIS CLEAN INSTALL",
          })
          .catch((error: unknown) => error);
        const held = await waitForSynthesisProductionRouteEvidence({
          read: () =>
            fs.existsSync(path.join(checkpointRoot, `${phase}.held`))
              ? [true]
              : [],
          offset: 0,
          matches: Boolean,
          attempts: 1000,
        });
        assert.lengthOf(held, 1);
        process.kill(harness.pid!, "SIGKILL");
        await harness.stopProcess();
        await pending;
        const reopened = await startSynthesisProductionRouteHarness({
          id: `reopen-${phase}`,
          root: harness.root,
        });
        try {
          const committed = phase === "reset-after-database-commit";
          const options = await reopened.client.topics.listWorkflowOptions({
            filter: "all",
          });
          assert.lengthOf(options.options, committed ? 0 : 1);
          assert.deepEqual(
            fs.readdirSync(canonicalTopics),
            committed ? [] : before,
          );
          assert.isFalse(
            fs.existsSync(
              path.join(harness.root, "state", "synthesis-reset-pending.json"),
            ),
          );
        } finally {
          await reopened.stop();
        }
      } finally {
        fs.writeFileSync(path.join(checkpointRoot, `${phase}.release`), "");
        await pending;
        await harness.stop();
      }
    });
  }

  it("fails before mutation when the backup location is unavailable", async function () {
    this.timeout(20_000);
    const harness = await startSynthesisProductionRouteHarness({
      id: "reset-backup-failed",
    });
    try {
      await harness.client.workflowApply.applyTopicSynthesisResult(
        createSyntheticSynthesisProductionRouteDataset("2k").topicApplyRequest,
      );
      fs.writeFileSync(
        path.join(harness.root, "state", "synthesis-reset-backups"),
        "blocked",
      );
      const before = captureSynthesisProductionRouteDurableState(harness.root);
      let failure: unknown;
      try {
        await harness.client.maintenance.resetDatabase({
          confirmationText: "RESET SYNTHESIS DATABASE",
        });
      } catch (error) {
        failure = error;
      }
      assert.exists(failure);
      assert.deepEqual(
        captureSynthesisProductionRouteDurableState(harness.root),
        before,
      );
      assert.lengthOf(
        (await harness.client.topics.listWorkflowOptions({ filter: "all" }))
          .options,
        1,
      );
    } finally {
      await harness.stop();
    }
  });

  it("rejects concurrent reads and resets while an exclusive reset is in progress", async function () {
    this.timeout(20_000);
    const id = "reset-exclusive";
    const harness = await startSynthesisProductionRouteHarness({ id });
    const checkpoints = path.join(
      harness.root,
      "runtime",
      "sessions",
      id,
      "test-checkpoints",
    );
    fs.mkdirSync(checkpoints, { recursive: true });
    fs.writeFileSync(path.join(checkpoints, "reset-after-backup.armed"), "");
    const pending = harness.client.maintenance.resetDatabase({
      confirmationText: "RESET SYNTHESIS DATABASE",
    });
    try {
      const held = await waitForSynthesisProductionRouteEvidence({
        read: () =>
          fs.existsSync(path.join(checkpoints, "reset-after-backup.held"))
            ? [true]
            : [],
        offset: 0,
        matches: Boolean,
        attempts: 1000,
      });
      assert.lengthOf(held, 1);
      const health = await fetch(
        `http://127.0.0.1:${harness.port}/synthesis/v1/health`,
      );
      assert.equal(health.status, 200);
      assert.equal((await health.json()).lifecycleState, "ready");
      for (const [capability, payload] of [
        ["client.listWorkflowTopicOptions", { args: [{ filter: "all" }] }],
        [
          "client.resetSynthesisDatabase",
          { args: [{ confirmationText: "RESET SYNTHESIS DATABASE" }] },
        ],
      ] as const) {
        let failure: unknown;
        try {
          await harness.call(capability, payload);
        } catch (error) {
          failure = error;
        }
        assert.propertyVal(failure, "code", "service_unavailable");
        assert.nestedPropertyVal(failure, "details.reason", "busy");
      }
      fs.writeFileSync(
        path.join(checkpoints, "reset-after-backup.release"),
        "",
      );
      assert.equal((await pending).status, "reset");
    } finally {
      fs.writeFileSync(
        path.join(checkpoints, "reset-after-backup.release"),
        "",
      );
      await pending.catch(() => undefined);
      await harness.stop();
    }
  });

  it("rejects reset without writes while a submitted maintenance worker still owns work", async function () {
    this.timeout(20_000);
    const id = "reset-background-busy";
    const dataset = createSyntheticSynthesisProductionRouteDataset("2k");
    const harness = await startSynthesisProductionRouteHarness({
      id,
      hostFixture: {
        handle({ capability, payload }) {
          if (capability === "library.items.sync_snapshot")
            return buildTestSynthesisLibrarySnapshotPage({ items: [] });
          if (capability === "library.artifacts.scan_page")
            return dataset.scanArtifactsPage(payload);
          if (capability === "library.artifacts.read")
            return dataset.readArtifact(payload);
          if (capability === "library.items.list_page")
            return dataset.listItemsPage(payload);
          if (capability === "webdav.describe")
            return SYNTHESIS_DISABLED_WEBDAV_DESCRIPTION;
          throw new Error(`unexpected_host_call:${capability}`);
        },
      },
    });
    const checkpoints = path.join(
      harness.root,
      "runtime",
      "sessions",
      id,
      "test-checkpoints",
    );
    fs.mkdirSync(checkpoints, { recursive: true });
    fs.writeFileSync(
      path.join(checkpoints, "reference-after-first-page.armed"),
      "",
    );
    try {
      const accepted =
        await harness.client.references.refreshReferenceSidecarNow();
      const held = await waitForSynthesisProductionRouteEvidence({
        read: () =>
          fs.existsSync(
            path.join(checkpoints, "reference-after-first-page.held"),
          )
            ? [true]
            : [],
        offset: 0,
        matches: Boolean,
        attempts: 1000,
      });
      assert.lengthOf(held, 1);
      const before = captureSynthesisProductionRouteDurableState(harness.root);
      let failure: unknown;
      try {
        await harness.client.maintenance.resetDatabase({
          confirmationText: "RESET SYNTHESIS DATABASE",
        });
      } catch (error) {
        failure = error;
      }
      assert.propertyVal(failure, "code", "unavailable");
      assert.nestedPropertyVal(failure, "details.sidecarReason", "busy");
      assert.deepEqual(
        captureSynthesisProductionRouteDurableState(harness.root),
        before,
      );
      fs.writeFileSync(
        path.join(checkpoints, "reference-after-first-page.release"),
        "",
      );
      const terminal = await waitForSynthesisProductionRouteReceipt({
        operationId: accepted.operation_id,
        getOperation: (operation_id) =>
          harness.client.maintenance.getOperation({ operation_id }),
      });
      assert.equal(terminal.status, "completed");
    } finally {
      fs.writeFileSync(
        path.join(checkpoints, "reference-after-first-page.release"),
        "",
      );
      await harness.stop();
    }
  });

  it("previews clean-install reset by default and rejects both wrong confirmations without writes", async function () {
    this.timeout(20_000);
    const harness = await startSynthesisProductionRouteHarness({
      id: "reset-preview",
    });
    try {
      const before = captureSynthesisProductionRouteDurableState(harness.root);
      const preview = await harness.client.debug.cleanInstallReset({});
      assert.equal(preview.status, "preview");
      assert.isTrue(preview.ok);
      assert.property(
        preview.deletedRowsByTable,
        "synt_topic_application_state",
      );
      for (const result of [
        await harness.client.maintenance.resetDatabase({
          confirmationText: "not-confirmed",
        }),
        await harness.client.debug.cleanInstallReset({
          dryRun: false,
          confirmationText: "RESET SYNTHESIS DATABASE",
        }),
      ]) {
        assert.equal(result.status, "confirmation_mismatch");
        assert.isFalse(result.ok);
      }
      assert.deepEqual(
        captureSynthesisProductionRouteDurableState(harness.root),
        before,
      );
      assert.isFalse(
        fs.existsSync(
          path.join(harness.root, "state", "synthesis-reset-backups"),
        ),
      );
    } finally {
      await harness.stop();
    }
  });

  it("rejects null and out-of-bounds reset fields at the native boundary", async function () {
    this.timeout(20_000);
    const harness = await startSynthesisProductionRouteHarness({
      id: "reset-invalid",
    });
    try {
      const before = captureSynthesisProductionRouteDurableState(harness.root);
      for (const [capability, request] of [
        ["client.debugSynthesisCleanInstallReset", { dryRun: null }],
        ["client.debugSynthesisCleanInstallReset", { confirmationText: null }],
        [
          "client.debugSynthesisCleanInstallReset",
          { confirmationText: "x".repeat(4097) },
        ],
        [
          "client.resetSynthesisDatabase",
          { confirmationText: "x".repeat(4097) },
        ],
        ["client.resetSynthesisDatabase", { confirmationText: null }],
      ] as const) {
        let failure: unknown;
        try {
          await harness.call(capability, { args: [request] });
        } catch (error) {
          failure = error;
        }
        assert.propertyVal(failure, "code", "invalid_request");
      }
      assert.deepEqual(
        captureSynthesisProductionRouteDurableState(harness.root),
        before,
      );
    } finally {
      await harness.stop();
    }
  });

  it("invalidates frozen canonical search pages even when database reset preserves their files", async function () {
    this.timeout(20_000);
    const harness = await startSynthesisProductionRouteHarness({
      id: "reset-search",
    });
    try {
      const original =
        createSyntheticSynthesisProductionRouteDataset("2k").topicApplyRequest;
      for (const id of ["topic:reset-a", "topic:reset-b"]) {
        const request = structuredClone(original);
        const oldId = request.bundle.topic_definition.id;
        request.bundle.topic_definition.id = id;
        request.assets = request.assets.map((asset) => ({
          ...asset,
          text: asset.text.split(oldId).join(id),
        }));
        assert.equal(
          (
            await harness.client.workflowApply.applyTopicSynthesisResult(
              request,
            )
          ).status,
          "persisted",
        );
      }
      const query = {
        query: "synthetic",
        sections: ["synthesis_report"],
        limit: 1,
        maxResults: 10,
      };
      const page = await harness.client.topics.search(query);
      assert.isTrue(page.hasMore);
      assert.isString(page.nextCursor);
      await harness.client.maintenance.resetDatabase({
        confirmationText: "RESET SYNTHESIS DATABASE",
      });
      let failure: unknown;
      try {
        await harness.client.topics.search({
          ...query,
          cursor: page.nextCursor!,
        });
      } catch (error) {
        failure = error;
      }
      assert.nestedPropertyVal(
        failure,
        "details.sidecarReason",
        "search_cursor_expired",
      );
      assert.equal((await harness.client.topics.search(query)).total, 2);
    } finally {
      await harness.stop();
    }
  });

  for (const phase of [
    "reset-before-database-commit",
    "reset-after-database-commit",
  ]) {
    it(`preserves the reset commit outcome when its request deadline expires at ${phase}`, async function () {
      this.timeout(25_000);
      const id = `deadline-${phase}`;
      const harness = await startSynthesisProductionRouteHarness({ id });
      const checkpoints = path.join(
        harness.root,
        "runtime",
        "sessions",
        id,
        "test-checkpoints",
      );
      fs.mkdirSync(checkpoints, { recursive: true });
      let pending: ReturnType<typeof callSynthesisProductionRoute> | undefined;
      try {
        await harness.client.workflowApply.applyTopicSynthesisResult(
          createSyntheticSynthesisProductionRouteDataset("2k")
            .topicApplyRequest,
        );
        const before = captureSynthesisProductionRouteDurableState(
          harness.root,
        );
        fs.writeFileSync(path.join(checkpoints, `${phase}.armed`), "");
        pending = callSynthesisProductionRoute(
          harness.port,
          "client.debugSynthesisCleanInstallReset",
          {
            args: [
              {
                dryRun: false,
                confirmationText: "RESET SYNTHESIS CLEAN INSTALL",
              },
            ],
          },
        );
        const held = await waitForSynthesisProductionRouteEvidence({
          read: () =>
            fs.existsSync(path.join(checkpoints, `${phase}.held`))
              ? [true]
              : [],
          offset: 0,
          matches: Boolean,
          attempts: 1000,
        });
        assert.lengthOf(held, 1);
        await new Promise((resolve) => setTimeout(resolve, 10_100));
        fs.writeFileSync(path.join(checkpoints, `${phase}.release`), "");
        const { body } = await pending;
        if (phase === "reset-after-database-commit") {
          assert.isTrue(body.ok);
          assert.equal(body.data.status, "reset");
          assert.isEmpty(
            (await harness.client.topics.listWorkflowOptions({ filter: "all" }))
              .options,
          );
        } else {
          assert.isFalse(body.ok);
          assert.equal(body.error.code, "operation_timeout");
          assert.deepEqual(
            captureSynthesisProductionRouteDurableState(harness.root),
            before,
          );
        }
      } finally {
        fs.writeFileSync(path.join(checkpoints, `${phase}.release`), "");
        await pending;
        await harness.stop();
      }
    });
  }

  it("admits exactly the complete fixture-backed WebDAV and Maintenance roster", () => {
    assert.deepEqual(inspectSynthesisWebDavMaintenanceSurfaceParity(), {
      ok: true,
      operations: 10,
      errors: [],
    });
    for (const capability of OWNED)
      assert.include(
        SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITIES,
        capability,
      );
  });
});
