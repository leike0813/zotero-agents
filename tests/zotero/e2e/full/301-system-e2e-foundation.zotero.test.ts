import { assert } from "chai";
import { config } from "../../../../package.json";
import { runFamilyLifecycle } from "../../../../scripts/system-e2e/familyLifecycle";
import {
  getRuntimePersistencePaths,
  getSynthesisSidecarRuntimePaths,
} from "../../../../src/modules/runtimePersistence";
import { emitZoteroTestDebug, isSystemE2ERun } from "../../diagnosticBridge";
import { readDiagnosticsEnv } from "../../testDiagnosticsOutput";

type Seed = {
  fixtureId: string;
  facts: { items: number; attachments: number };
  items: Array<{
    itemType: string;
    title: string;
    attachments?: Array<{
      path: string;
      contentType: string;
    }>;
  }>;
};

let baselineItem: Zotero.Item | undefined;
let baselineAttachment: Zotero.Item | undefined;

async function materializeCommittedSeed() {
  if (readDiagnosticsEnv("ZOTERO_E2E_GOLD_ID")) return;
  assert.equal(readDiagnosticsEnv("ZOTERO_E2E_FIXTURE_ID"), "foundation-v1");
  assert.isUndefined(baselineItem, "Suite Baseline must materialize once");
  const seedRoot = PathUtils.join(Zotero.DataDirectory.dir, "system-e2e");
  const seed = JSON.parse(
    await IOUtils.readUTF8(PathUtils.join(seedRoot, "seed.json")),
  ) as Seed;
  const itemSeed = seed.items[0];
  baselineItem = new Zotero.Item(itemSeed.itemType);
  baselineItem.setField("title", itemSeed.title);
  await baselineItem.saveTx();
  const attachmentSeed = itemSeed.attachments?.[0];
  if (attachmentSeed) {
    baselineAttachment = await Zotero.Attachments.importFromFile({
      file: PathUtils.join(seedRoot, ...attachmentSeed.path.split("/")),
      parentItemID: baselineItem.id,
      title: "Synthetic E2E Foundation Attachment",
      contentType: attachmentSeed.contentType,
    });
  }
  assert.equal(seed.fixtureId, "foundation-v1");
  assert.equal(seed.facts.items, 1);
  assert.equal(seed.facts.attachments, 1);
  assert.isOk(baselineItem.id);
  assert.isOk(baselineAttachment?.id);
}

async function observeHealth(residualOwnedState: string[] = []) {
  const plugin = (Zotero as any)[config.addonInstance];
  const runtime = getSynthesisSidecarRuntimePaths(
    getRuntimePersistencePaths().runtimeRoot,
  );
  const manifest = JSON.parse(
    await IOUtils.readUTF8(PathUtils.join(runtime.currentDir, "manifest.json")),
  );
  const discoveries: Array<{ bundleId?: string; lifecycleState?: string }> = [];
  for (const profileRoot of await IOUtils.getChildren(runtime.profilesDir)) {
    const sessionsRoot = PathUtils.join(profileRoot, "sessions");
    if (!(await IOUtils.exists(sessionsRoot))) continue;
    for (const sessionRoot of await IOUtils.getChildren(sessionsRoot)) {
      const discoveryPath = PathUtils.join(sessionRoot, "discovery.json");
      if (await IOUtils.exists(discoveryPath)) {
        discoveries.push(JSON.parse(await IOUtils.readUTF8(discoveryPath)));
      }
    }
  }
  return {
    status: "passed" as const,
    hostResponsive: Boolean(
      Zotero.getMainWindow() && !Zotero.getMainWindow().closed,
    ),
    pluginResponsive: Boolean(plugin?.data?.initialized),
    sidecarReady:
      discoveries.length === 1 &&
      discoveries[0].lifecycleState === "ready" &&
      discoveries[0].bundleId === manifest.bundleId,
    undeclaredOperations: 0,
    managedProcesses: 0,
    residualOwnedState,
  };
}

describe("System E2E runner foundation", function () {
  this.timeout(180_000);

  before(async function () {
    if (readDiagnosticsEnv("ZOTERO_SYSTEM_E2E_RESUME_CASE") === "HB-03") {
      this.skip();
    }
    assert.isTrue(isSystemE2ERun(), "runner event sink must be visible");
    await emitZoteroTestDebug({
      kind: "zotero-compatibility-host-facts",
      version: String(Zotero.version || "").trim(),
      appBuildId: String(Services.appinfo?.appBuildID || "").trim(),
    });
    await emitZoteroTestDebug({
      kind: "system-e2e-run-identity",
      zoteroVersion: String(Zotero.version || ""),
    });
    const expectedMajor = readDiagnosticsEnv("ZOTERO_TEST_ZOTERO_VERSION");
    if (expectedMajor) {
      assert.match(
        String(Zotero.version || ""),
        new RegExp(`^${expectedMajor}\\.`),
      );
    }
    await materializeCommittedSeed();
    const initialHealth = await observeHealth();
    assert.deepEqual(initialHealth, {
      status: "passed",
      hostResponsive: true,
      pluginResponsive: true,
      sidecarReady: true,
      undeclaredOperations: 0,
      managedProcesses: 0,
      residualOwnedState: [],
    });
  });

  it("runs one family cleanup and Suite Health Gate in the shared profile", async function () {
    let ownedNote: Zotero.Item | undefined;
    const result = await runFamilyLifecycle({
      declaration: {
        familyId: "runner-foundation",
        owner: "runner",
        namespace: ["system-e2e:foundation:"],
        ownedState: ["foundation-note"],
        carryOver: [],
      },
      execute: async () => {
        ownedNote = new Zotero.Item("note");
        ownedNote.setNote("<p>Synthetic System E2E family-owned state.</p>");
        await ownedNote.saveTx();
      },
      cleanup: async () => {
        if (!ownedNote) return "indeterminate";
        await ownedNote.eraseTx();
        ownedNote = undefined;
        return "passed";
      },
      healthGate: () => observeHealth(ownedNote ? ["foundation-note"] : []),
    });

    await emitZoteroTestDebug({
      kind: "system-e2e-family-result",
      family: {
        familyId: "runner-foundation",
        caseId: "runner-foundation-01",
        result: result.result,
        publicOutcome: result.abort ? undefined : "foundation_ready",
        failureCode: result.abortCode,
        typedEvidence: result.abort
          ? []
          : [
              {
                kind: "suite-baseline",
                schemaVersion: "system-e2e-foundation.v1",
                terminalStatus: "ready",
              },
            ],
        lifecycle: result.transitions.map((checkpoint) => ({
          checkpoint,
          outcome: "completed",
        })),
        cleanup: result.cleanup,
        health: result.health,
        artifacts: [],
      },
    });
    if (result.abort) {
      await emitZoteroTestDebug({
        kind: "system-e2e-abort",
        failurePhase: "family-lifecycle",
        abortCode: result.abortCode,
      });
    }
    assert.isFalse(result.abort);
    assert.equal(result.result, "passed");
  });
});
