import { assert } from "chai";
import { getPiRuntimeLifecycle } from "../../../../src/modules/piRuntimeLifecycle";
import { getPiConversationCoordinator } from "../../../../src/modules/piConversation";
import { listPiCredentials } from "../../../../src/modules/piCredentialStore";
import { loadPiModelCatalog } from "../../../../src/modules/piModelCatalog";
import { setPiProviderDefaults } from "../../../../src/modules/piProviderConfiguration";
import { getRuntimePersistencePaths, } from "../../../../src/modules/runtimePersistence";
import { joinNativePath } from "../../../../src/platform/path";
import { getPref, setPref } from "../../../../src/utils/prefs";
import { configurePiLocalProviderProfile, runPiConversationTurnViaPlugin, } from "../../../helpers/piRuntimeOwnerDriver";
import { createPiCapacityAutoDriver, createPiCapacityFixture, } from "../../../helpers/piCapacityWorkflowDriver";
import { readDiagnosticsEnv } from "../../testDiagnosticsOutput";
import { PI_CAPACITY_PHASE_MIN_MS, beginPiCapacityProbe, flushZoteroPerformanceProbeDigest, installZoteroPerformanceProbeDigest, markPiCapacityPhase, notePiCapacityAdmission, notePiCapacityCompletion, notePiCapacityCompleteness, notePiCapacityDispatch, notePiCapacityLane, stopPiCapacityProbe, validatePiCapacityPerformanceRecord, } from "../../performanceProbeDigest";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function resolvePlatform() {
    const os = globalThis
        .Services?.appinfo?.OS;
    if (typeof os !== "string")
        return undefined;
    if (os.startsWith("WINNT"))
        return "windows";
    if (os === "Linux")
        return "linux";
    return undefined;
}
function resolveZoteroMajor() {
    const version = globalThis.Zotero
        ?.version;
    const major = Number(String(version || "").split(".")[0]);
    return Number.isInteger(major) && major > 0 ? major : undefined;
}
describe("Pi runtime capacity mixed load", function () {
    this.timeout(40 * 60 * 1000);
    it("holds the accepted limits for one built capacity", async function () {
        if (readDiagnosticsEnv("ZOTERO_PI_CAPACITY_PROBE") !== "1")
            this.skip();
        const platform = resolvePlatform();
        const zoteroMajor = resolveZoteroMajor();
        const endpoint = String(readDiagnosticsEnv("ZOTERO_TEST_PI_ENDPOINT") || "").trim();
        const commit = readDiagnosticsEnv("ZOTERO_PI_CAPACITY_COMMIT");
        const xpiSha256 = readDiagnosticsEnv("ZOTERO_PI_CAPACITY_XPI_SHA256");
        assert.isOk(platform, "capacity run requires Linux or Windows");
        assert.equal(zoteroMajor, 10, "capacity run requires observed Zotero 10");
        assert.isNotEmpty(endpoint, "deterministic provider endpoint required");
        assert.match(commit, /^[0-9a-f]{40}$/);
        assert.match(xpiSha256, /^[0-9a-f]{64}$/);
        const root = joinNativePath(getRuntimePersistencePaths().tmpDir, `pi-capacity-${Date.now()}-${Math.floor(Math.random() * 1e6)}`);
        // The run-owned skill root makes the production registry scan resolve the
        // probe skill without any user-authored or externally installed skill.
        const fixture = await createPiCapacityFixture({ root });
        const previousSkillDir = String(getPref("skillDir") || "");
        setPref("skillDir", fixture.skillsRoot);
        const model = await configurePiLocalProviderProfile({
            overlayPath: joinNativePath(root, "models.yml"),
            endpoint,
        });
        // The auxiliary default makes production title turns occupy the
        // background lane, so the mixed run has real background work.
        setPiProviderDefaults({
            conversation: { configurationId: model.configurationId },
            skillRun: { configurationId: model.configurationId },
            global: { configurationId: model.configurationId },
            auxiliary: { configurationId: model.configurationId },
        }, listPiCredentials(), await loadPiModelCatalog());
        const lifecycle = getPiRuntimeLifecycle();
        const auto = createPiCapacityAutoDriver({
            win: Zotero.getMainWindow(),
            workflowDir: fixture.workflowDir,
            workflowId: fixture.workflowId,
        });
        let foregroundInflight = 0;
        let backgroundInflight = 0;
        const startForeground = () => {
            foregroundInflight += 1;
            const reservedCapacityAvailable = lifecycle.activeCount < lifecycle.capacity;
            notePiCapacityDispatch();
            return runPiConversationTurnViaPlugin({
                prompt: "[system-e2e:capacity] capacity mixed load",
                onAdmission: (waitMs) => {
                    if (reservedCapacityAvailable)
                        notePiCapacityAdmission({
                            foregroundWaitMs: waitMs,
                            activeCount: lifecycle.activeCount,
                        });
                },
            })
                .then(async (outcome) => {
                if (outcome.status !== "completed") {
                    throw new Error("pi_capacity_turn_not_completed");
                }
                // Settle each owner so fifteen minutes of turns cannot accumulate
                // conversation owners and inflate RSS. Deletion only applies to an
                // archived terminal owner, so archive first and let failures surface.
                const conversations = getPiConversationCoordinator();
                await conversations.archive(outcome.conversationId);
                const cleanup = await conversations.delete(outcome.conversationId);
                if (cleanup.status !== "deleted")
                    throw new Error("pi_capacity_cleanup_pending");
                notePiCapacityCompletion();
                notePiCapacityLane("foreground");
            })
                .catch(() => notePiCapacityCompletion({ unexplainedFailure: true }));
        };
        const startBackground = () => {
            backgroundInflight += 1;
            notePiCapacityDispatch();
            notePiCapacityLane("background");
            return auto.runOnce().then(() => {
                backgroundInflight -= 1;
                notePiCapacityCompletion();
            }, () => {
                backgroundInflight -= 1;
                notePiCapacityCompletion({ unexplainedFailure: true });
            });
        };
        let issued = 0;
        let settled = 0;
        const inflight = new Set();
        const track = (task, foreground) => {
            issued += 1;
            const done = () => {
                settled += 1;
                if (foreground)
                    foregroundInflight -= 1;
            };
            const guarded = task.then(done, done);
            inflight.add(guarded);
            void guarded.finally(() => inflight.delete(guarded));
            return guarded;
        };
        /** Sustained mixed drive: keeps foreground and background saturated. */
        const drive = async (untilMs) => {
            while (Date.now() < untilMs) {
                if (foregroundInflight < 2)
                    track(startForeground(), true);
                if (backgroundInflight < lifecycle.backgroundCapacity) {
                    track(startBackground(), false);
                }
                await sleep(500);
            }
        };
        installZoteroPerformanceProbeDigest();
        beginPiCapacityProbe({
            stage: readDiagnosticsEnv("ZOTERO_PI_CAPACITY_STAGE") === "final"
                ? "final"
                : "exploration",
            capacity: lifecycle.capacity,
            backgroundCapacity: lifecycle.backgroundCapacity,
            target: { platform, zoteroMajor: zoteroMajor },
            candidate: { commit, xpiSha256 },
            forcedGc: false,
        });
        try {
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
        }
        finally {
            auto.dispose();
            setPref("skillDir", previousSkillDir);
        }
        const record = stopPiCapacityProbe();
        await flushZoteroPerformanceProbeDigest();
        assert.isOk(record, "capacity probe must freeze a record");
        const validation = validatePiCapacityPerformanceRecord(record);
        assert.isTrue(validation.valid, validation.valid ? "" : `invalid capacity record: ${validation.reason}`);
        assert.deepEqual(record?.violations, []);
        assert.isTrue(record?.passed);
    });
});
