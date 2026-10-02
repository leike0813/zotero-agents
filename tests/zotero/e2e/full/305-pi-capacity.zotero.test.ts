import { assert } from "chai";
import {
  ensureRuntimeDirectoryStrict,
  getRuntimePersistencePaths,
} from "../../../../src/modules/runtimePersistence";
import { joinNativePath } from "../../../../src/platform/path";
import { getPref, setPref } from "../../../../src/utils/prefs";
import { createPiCapacityFixture } from "../../../helpers/piCapacityWorkflowDriver";
import {
  configureInstalledPiBackend,
  approvePiFixtureEndpoint,
  openInstalledPiUi,
  observeInstalledPiAdmissions,
  runInstalledPiWorkflowAuto,
} from "../../../helpers/piInstalledPluginDriver";
import { inspectPiOwner } from "../../../../src/modules/piOwnerPersistence";
import {
  assertCandidatePiRuntimeBuildIdentity,
  PI_RUNTIME_BUILD_IDENTITY_ENTRY,
} from "../../../../src/config/piRuntimeBuild";
import { sha256Hex } from "../../../../src/utils/sha256";
import { readDiagnosticsEnv } from "../../testDiagnosticsOutput";
import {
  PI_CAPACITY_PHASE_MIN_MS,
  beginPiCapacityProbe,
  flushZoteroPerformanceProbeDigest,
  installZoteroPerformanceProbeDigest,
  markPiCapacityPhase,
  notePiCapacityCompletion,
  notePiCapacityCompleteness,
  notePiCapacityDispatch,
  notePiCapacityLane,
  notePiCapacityAdmission,
  stopPiCapacityProbe,
  validatePiCapacityPerformanceRecord,
  type PiCapacityPlatform,
} from "../../performanceProbeDigest";

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

function resolvePlatform(): PiCapacityPlatform | undefined {
  const os = (globalThis as { Services?: { appinfo?: { OS?: string } } })
    .Services?.appinfo?.OS;
  if (typeof os !== "string") return undefined;
  if (os.startsWith("WINNT")) return "windows";
  if (os === "Linux") return "linux";
  return undefined;
}

function resolveZoteroMajor(): number | undefined {
  const version = (globalThis as { Zotero?: { version?: string } }).Zotero
    ?.version;
  const major = Number(String(version || "").split(".")[0]);
  return Number.isInteger(major) && major > 0 ? major : undefined;
}

describe("Pi installed XPI capacity workload", function () {
  this.timeout(40 * 60 * 1000);

  it("drives the built capacity through installed UI owners", async function () {
    if (readDiagnosticsEnv("ZOTERO_PI_CAPACITY_PROBE") !== "1") this.skip();
    const platform = resolvePlatform();
    const zoteroMajor = resolveZoteroMajor();
    const endpoint = String(
      readDiagnosticsEnv("ZOTERO_TEST_PI_ENDPOINT") || "",
    ).trim();
    const commit = readDiagnosticsEnv("ZOTERO_PI_CAPACITY_COMMIT");
    const xpiSha256 = readDiagnosticsEnv("ZOTERO_PI_CAPACITY_XPI_SHA256");
    const { AddonManager } = (globalThis as any).ChromeUtils.importESModule(
      "resource://gre/modules/AddonManager.sys.mjs",
    );
    const installed = await AddonManager.getAddonByID(
      "zotero-skills@leike0813@gmail.com",
    );
    assert.isTrue(installed?.isActive, "installed candidate required");
    const identityText = await Zotero.File.getResourceAsync(
      installed.getResourceURI(PI_RUNTIME_BUILD_IDENTITY_ENTRY).spec,
    );
    assert.isString(identityText);
    const identity = assertCandidatePiRuntimeBuildIdentity(
      JSON.parse(identityText as string),
    );
    const capacity = identity.capacity;
    assert.isFalse(identity.debug, "production build required");
    assert.equal(identity.source.commit, commit);
    const xpiPath = Services.prefs.getStringPref(
      "extensions.zotero.zotero-skills.compatibilityTestXpiPath",
      "",
    );
    assert.isNotEmpty(xpiPath, "candidate installation receipt required");
    assert.equal(await sha256Hex(await IOUtils.read(xpiPath)), xpiSha256);
    assert.isOk(platform, "capacity run requires Linux or Windows");
    assert.equal(zoteroMajor, 10, "capacity run requires observed Zotero 10");
    assert.isNotEmpty(endpoint, "deterministic provider endpoint required");
    assert.match(commit, /^[0-9a-f]{40}$/);
    assert.match(xpiSha256, /^[0-9a-f]{64}$/);
    assert.include([4, 6, 8, 12], capacity, "built capacity required");

    const root = joinNativePath(
      getRuntimePersistencePaths().tmpDir,
      `pi-xpi-capacity-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    );
    await ensureRuntimeDirectoryStrict(root);
    const fixture = await createPiCapacityFixture({ root });
    await configureInstalledPiBackend(endpoint, root);
    const oldSkillDir = getPref("skillDir");
    const oldSettings = getPref("workflowSettingsJson");
    let capacityMismatch = false;
    const stopAdmissions = await observeInstalledPiAdmissions((fact) => {
      if (fact.capacity !== capacity) capacityMismatch = true;
      notePiCapacityLane(fact.lane);
      notePiCapacityAdmission({
        ...(fact.lane === "foreground" && fact.reservedAvailable
          ? { foregroundWaitMs: fact.waitMs }
          : {}),
        activeCount: fact.activeCount,
      });
    });
    const ui = await openInstalledPiUi();
    const approval = approvePiFixtureEndpoint(endpoint);
    let issued = 0;
    let settled = 0;
    let foregroundInflight = 0;
    let backgroundInflight = 0;
    const inflight = new Set<Promise<void>>();
    const observeTurn = async (owner: {
      ownerKey: string;
      conversationId: string;
    }) => {
      const key = owner.ownerKey || owner.conversationId;
      const prior = (
        await inspectPiOwner({
          kind: "conversation",
          ownerId: owner.conversationId,
        })
      ).entries.filter((entry) => entry.kind === "turn_terminal").length;
      await ui.action(
        "send-prompt",
        {
          message:
            "[system-e2e:capacity] [system-e2e:slow] [system-e2e:tool:zotero_context_get_current_view] read the current Zotero view",
        },
        owner,
      );
      await until(async () => {
        const history = await inspectPiOwner({
          kind: "conversation",
          ownerId: owner.conversationId,
        });
        const observation = ui.observation(key);
        if (
          ["failed", "waiting_permission", "recovery_required"].includes(
            observation?.status || "",
          )
        )
          throw new Error("pi_xpi_capacity_conversation_failed");
        return history.entries.filter((entry) => entry.kind === "turn_terminal")
          .length > prior && observation?.status === "idle"
          ? true
          : undefined;
      }, "pi_xpi_capacity_conversation_timeout");
      const history = await inspectPiOwner({
        kind: "conversation",
        ownerId: owner.conversationId,
      });
      assert.isTrue(ui.observation(key)?.streamed, "installed stream required");
      assert.isTrue(
        history.entries.some(
          (entry) =>
            entry.kind === "tool_result" &&
            (entry.payload as any).name === "zotero_context_get_current_view" &&
            (entry.payload as any).status === "completed",
        ),
        "installed Zotero tool effect required",
      );
    };
    const runForeground = async () => {
      foregroundInflight += 1;
      const shell = ui.shellWindow();
      const tab = shell.document.querySelector(
        '[data-tab="pi-conversations"]',
      ) as HTMLElement | null;
      tab?.click();
      await ui.action(
        "new-conversation",
        { groupId: "pi-conversations" },
        null,
      );
      const owner = await until(
        () =>
          ui.selectedOwner() as {
            ownerKey?: string;
            conversationId?: string;
          } | null,
        "pi_xpi_capacity_owner_missing",
      );
      assert.isNotEmpty(owner?.conversationId);
      await observeTurn(owner as { ownerKey: string; conversationId: string });
      await ui.action("archive-conversation", {}, owner);
      await ui.action("delete-conversation", {}, owner);
    };
    const track = (
      task: Promise<unknown>,
      lane: "foreground" | "background",
    ) => {
      issued += 1;
      if (lane === "background") backgroundInflight += 1;
      notePiCapacityDispatch();
      const guarded = task
        .then(
          () => {
            settled += 1;
            notePiCapacityCompletion();
          },
          () => {
            settled += 1;
            notePiCapacityCompletion({ unexplainedFailure: true });
          },
        )
        .finally(() => {
          if (lane === "foreground") foregroundInflight -= 1;
          else backgroundInflight -= 1;
          inflight.delete(guarded);
        });
      inflight.add(guarded);
    };
    const drive = async (untilMs: number) => {
      while (Date.now() < untilMs) {
        if (foregroundInflight < 1) track(runForeground(), "foreground");
        if (backgroundInflight < capacity - 2)
          track(
            runInstalledPiWorkflowAuto(fixture, {
              settingsOwnedByCaller: true,
            }),
            "background",
          );
        await sleep(500);
      }
    };

    installZoteroPerformanceProbeDigest();
    beginPiCapacityProbe({
      stage:
        readDiagnosticsEnv("ZOTERO_PI_CAPACITY_STAGE") === "final"
          ? "final"
          : "exploration",
      capacity,
      backgroundCapacity: capacity - 2,
      target: { platform: platform!, zoteroMajor: zoteroMajor! },
      candidate: { commit, xpiSha256 },
      forcedGc: false,
    });
    try {
      // This batch owns the settings until all admitted work has settled.
      setPref("skillDir", fixture.skillsRoot);
      setPref(
        "workflowSettingsJson",
        JSON.stringify({
          schemaVersion: 2,
          workflows: { [fixture.workflowId]: { backendId: "builtin-pi" } },
        }),
      );
      markPiCapacityPhase("warmup");
      await drive(Date.now() + PI_CAPACITY_PHASE_MIN_MS.warmup);
      await Promise.allSettled([...inflight]);
      markPiCapacityPhase("idle");
      await sleep(PI_CAPACITY_PHASE_MIN_MS.idle);
      markPiCapacityPhase("mixed");
      await drive(Date.now() + PI_CAPACITY_PHASE_MIN_MS.mixed);
      await Promise.allSettled([...inflight]);
      notePiCapacityCompleteness({ expected: issued, observed: settled });
      markPiCapacityPhase("settle");
      await sleep(PI_CAPACITY_PHASE_MIN_MS.settle);
    } finally {
      clearInterval(approval);
      stopAdmissions();
      ui.close();
      setPref("skillDir", oldSkillDir);
      setPref("workflowSettingsJson", oldSettings);
    }
    if (capacityMismatch)
      notePiCapacityCompletion({ completed: 0, unexplainedFailure: true });
    const record = stopPiCapacityProbe();
    await flushZoteroPerformanceProbeDigest();
    assert.isFalse(
      capacityMismatch,
      "installed capacity must match the built candidate",
    );
    assert.isOk(record, "capacity probe must freeze a record");
    const validation = validatePiCapacityPerformanceRecord(record);
    assert.isTrue(
      validation.valid,
      validation.valid
        ? ""
        : `capacity evidence missing or invalid: ${validation.reason}`,
    );
    assert.deepEqual(record?.violations, []);
    assert.isTrue(record?.passed);
  });
});

async function until<T>(
  read: () => T | undefined | null | Promise<T | undefined | null>,
  code: string,
): Promise<T> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const value = await read();
    if (value !== undefined && value !== null) return value;
    await sleep(100);
  }
  throw new Error(code);
}
