import { assert } from "chai";
import { config } from "../../../../package.json";
import { isSynthesisSidecarErrorCode } from "../../../../packages/synthesis-contracts/src";
import migrationSeed from "../../../fixtures/zotero-e2e/literature-migration-v1.json";
import {
  openTaskDashboard,
  resetTaskDashboardHostForTests,
} from "../../../../src/modules/dashboardHost";
import { getLiteratureArtifactMigrationActiveSnapshot } from "../../../../src/modules/literatureArtifactMigration";
import { resolveDashboardLiteratureMigrationService } from "../../../../src/modules/dashboard/dashboardSnapshot";
import {
  resolveZoteroHostCapabilityBroker,
  type ZoteroHostArtifactReadinessItemDto,
} from "../../../../src/modules/zoteroHostCapabilityBroker";
import {
  encodeBase64Utf8,
  WORKBENCH_EMBEDDED_PAYLOAD_MARKER,
} from "../../../../src/modules/zoteroHost/notePayloadCodec";
import { observeSystemE2EHealth } from "../../../../scripts/system-e2e/healthGate";
import { emitZoteroTestDebug } from "../../diagnosticBridge";
import {
  ensureDiagnosticsDirectory,
  readDiagnosticsEnv,
  resolveDefaultTestDiagnosticsOutputPath,
  writeDiagnosticsText,
} from "../../testDiagnosticsOutput";
import { systemE2ECase } from "../../systemE2ECases";

type DashboardFrame = HTMLElement & { contentDocument?: Document };
type TestRuntime = typeof globalThis & {
  addon?: unknown;
  ztoolkit?: unknown;
};

let syntheticParent: Zotero.Item | undefined;
let previousAddon: unknown;
let previousZtoolkit: unknown;
let evidencePath: string;
let milestones: Array<{ stage: string; at: string }>;

type LiteratureMigrationMilestoneStage =
  | "beforescan"
  | "afterscan"
  | "afteropen"
  | "decisionstarted"
  | "decisionfinished"
  | "afterdecisions"
  | "afterapply";

async function emitMigrationMilestone(
  stage: LiteratureMigrationMilestoneStage,
) {
  await emitZoteroTestDebug({
    kind: "literature-migration-milestone",
    stage,
  });
  milestones.push({ stage, at: new Date().toISOString() });
  await ensureDiagnosticsDirectory(PathUtils.parent(evidencePath));
  await writeDiagnosticsText(evidencePath, JSON.stringify({ milestones }));
}

function sanitizedHealthFailure(error: unknown) {
  const value =
    error && typeof error === "object"
      ? (error as {
          name?: unknown;
          code?: unknown;
          details?: {
            errorCode?: unknown;
            sidecarCode?: unknown;
          };
        })
      : undefined;
  const details = value?.details;
  const errorCode =
    typeof value?.code === "string" &&
    /^[a-z][a-z0-9_]{0,63}$/u.test(value.code)
      ? value.code
      : typeof details?.errorCode === "string" &&
          /^[a-z][a-z0-9_]{0,63}$/u.test(details.errorCode)
        ? details.errorCode
        : undefined;
  const sidecarCode = isSynthesisSidecarErrorCode(details?.sidecarCode)
    ? details.sidecarCode
    : undefined;
  return {
    errorType:
      value?.name === "SynthesisClientError"
        ? "SynthesisClientError"
        : "unknown",
    ...(errorCode ? { errorCode } : {}),
    ...(sidecarCode ? { sidecarCode } : {}),
  };
}

async function waitUntil<Value>(read: () => Value | null | undefined) {
  for (let attempt = 0; attempt < 24_000; attempt += 1) {
    const value = read();
    if (value) return value;
    await Zotero.Promise.delay(25);
  }
  throw new Error("e2e_condition_not_reached");
}

function countCanonicalArtifacts(items: ZoteroHostArtifactReadinessItemDto[]) {
  return items.reduce(
    (count, item) =>
      count +
      item.artifacts.filter(
        (kind) => kind === "references" || kind === "citation-analysis",
      ).length,
    0,
  );
}

async function materializeSyntheticMigrationSeed() {
  const parent = new Zotero.Item(migrationSeed.parent.itemType);
  parent.setField("title", migrationSeed.parent.title);
  await parent.saveTx();

  const note = new Zotero.Item("note");
  note.parentID = parent.id;
  note.setNote(`<div><h1>${migrationSeed.legacyNote.title}</h1></div>`);
  await note.saveTx();
  const envelope = {
    schemaVersion: 1,
    kind: "zotero-skills-workbench-note-payload",
    noteKind: migrationSeed.legacyNote.noteKind,
    payloadType: migrationSeed.legacyNote.payloadType,
    payload: migrationSeed.legacyNote.payload,
  };
  const png = Uint8Array.from(
    atob(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    ),
    (character) => character.charCodeAt(0),
  );
  const suffix = new TextEncoder().encode(
    `\n${WORKBENCH_EMBEDDED_PAYLOAD_MARKER}${encodeBase64Utf8(
      JSON.stringify(envelope),
    )}\n`,
  );
  const bytes = new Uint8Array(png.length + suffix.length);
  bytes.set(png);
  bytes.set(suffix, png.length);
  const attachment = await Zotero.Attachments.importEmbeddedImage({
    blob: new Blob([bytes], { type: "image/png" }),
    parentItemID: note.id,
  });
  note.setNote(
    `<div><h1>${migrationSeed.legacyNote.title}</h1><p data-zs-payload-anchor-container="1"><img data-attachment-key="${attachment.key}" data-zs-payload-anchor="${migrationSeed.legacyNote.payloadType}"></p></div>`,
  );
  await note.saveTx();
  syntheticParent = parent;
}

describe("Literature migration full E2E", function () {
  this.timeout(900_000);

  beforeEach(function () {
    evidencePath = resolveDefaultTestDiagnosticsOutputPath({
      envName: "ZOTERO_TEST_LITERATURE_MIGRATION_EVIDENCE_PATH",
      prefix: "literature-migration-evidence",
    });
    milestones = [];
    const runtime = globalThis as TestRuntime;
    const plugin = (Zotero as any)[config.addonInstance];
    previousAddon = runtime.addon;
    previousZtoolkit = runtime.ztoolkit;
    runtime.addon = plugin;
    runtime.ztoolkit = plugin?.data?.ztoolkit;
  });

  afterEach(async function () {
    try {
      await resetTaskDashboardHostForTests();
      if (syntheticParent && !syntheticParent.deleted) {
        await Zotero.Items.trashTx([syntheticParent.id]);
        syntheticParent = undefined;
      }
    } finally {
      const runtime = globalThis as TestRuntime;
      runtime.addon = previousAddon;
      runtime.ztoolkit = previousZtoolkit;
    }
  });

  systemE2ECase(
    "literature-migration-01",
    undefined,
    "scans migration data, reviews grouped decisions, and applies eligible artifacts",
    async function () {
      const goldDataDir = readDiagnosticsEnv("ZOTERO_E2E_GOLD_DATA_DIR");
      if (!goldDataDir) await materializeSyntheticMigrationSeed();
      const service = resolveDashboardLiteratureMigrationService();
      assert.isOk(
        service,
        "the production Broker migration service is configured",
      );
      if (!service) throw new Error("literature_migration_service_unavailable");

      const libraryId = Zotero.Libraries.userLibraryID;
      await waitUntil(() => !getLiteratureArtifactMigrationActiveSnapshot());
      await emitMigrationMilestone("beforescan");
      const preview = await service.scan({ libraryId });
      await emitMigrationMilestone("afterscan");
      if (!preview.ok) {
        throw new Error(`literature_migration_scan_failed:${preview.code}`);
      }
      assert.isNotEmpty(preview.candidates, "migration data has candidates");

      const mainWindow = Zotero.getMainWindow() as _ZoteroTypes.MainWindow;
      void openTaskDashboard({
        chromeWindow: mainWindow,
        initialLiteratureMigrationRunId: preview.runId,
      });
      const dashboardWindow = await waitUntil(() => {
        const windows = (globalThis as any).Services.wm.getEnumerator(null);
        while (windows.hasMoreElements()) {
          const candidate = windows.getNext() as Window;
          if (candidate.document?.getElementById("zs-task-dashboard-root")) {
            return candidate;
          }
        }
        return null;
      });
      const dashboardRoot = dashboardWindow.document.getElementById(
        "zs-task-dashboard-root",
      );
      const dashboardFrame = (await waitUntil(() =>
        dashboardRoot?.querySelector<HTMLElement>(
          '[data-zs-role="task-dashboard-frame"]',
        ),
      )) as DashboardFrame;
      await waitUntil(() =>
        dashboardFrame.contentDocument?.querySelector<HTMLElement>(
          '[data-region-content="dashboard-migrations"] .dashboard-migration-history-entry.is-selected',
        ),
      );
      await emitMigrationMilestone("afteropen");

      const issuesByReason = new Map<
        string,
        (typeof preview.candidates)[number]["issues"]
      >();
      for (const candidate of preview.candidates) {
        for (const issue of candidate.issues) {
          if (issue.status === "resolved") continue;
          const group = issuesByReason.get(issue.reasonCode) || [];
          group.push(issue);
          issuesByReason.set(issue.reasonCode, group);
        }
      }
      for (const [reasonCode, issues] of issuesByReason) {
        const sharedSafeKinds = issues[0]!.options
          .filter(
            (option) => !option.dataLoss && option.kind !== "skip_candidate",
          )
          .filter((option) =>
            issues.every((issue) =>
              issue.options.some(
                (candidate) =>
                  candidate.kind === option.kind && !candidate.dataLoss,
              ),
            ),
          );
        const kind =
          reasonCode === "unsupported_input"
            ? "skip_candidate"
            : sharedSafeKinds[0]?.kind || "skip_candidate";
        assert.isTrue(
          issues.every((issue) =>
            issue.options.some((option) => option.kind === kind),
          ),
          "the grouped choice is supported by every issue in its reason group",
        );
        await emitMigrationMilestone("decisionstarted");
        const decision = await service.resolveCandidateIssuesBulkAsync({
          scanOperationId: preview.operationId,
          reasonCode,
          kind,
        });
        await emitMigrationMilestone("decisionfinished");
        if (!decision.ok) {
          throw new Error(
            `literature_migration_decision_failed:${decision.code}`,
          );
        }
      }

      const eligible = preview.candidates.filter(
        (candidate) =>
          candidate.classification === "ready" &&
          candidate.disposition === "include",
      );
      assert.isNotEmpty(eligible, "migration data has an eligible artifact");
      const wizard = dashboardFrame.contentDocument?.querySelector<HTMLElement>(
        '[data-region-content="dashboard-migrations"]',
      );
      assert.isOk(wizard);
      const advanceWizard = async (step: string) => {
        const next = wizard?.querySelector<HTMLButtonElement>(
          '[data-role="migration-wizard-next"]',
        );
        assert.isOk(next);
        next?.click();
        await waitUntil(
          () => wizard?.getAttribute("data-wizard-step") === step,
        );
      };
      await advanceWizard("problems");
      const decisionGroupCount = issuesByReason.size;
      for (let step = 0; step < decisionGroupCount + 2; step += 1) {
        if (wizard?.getAttribute("data-wizard-step") === "finalreview") break;
        wizard
          ?.querySelector<HTMLButtonElement>(
            '[data-role="migration-wizard-next"]',
          )
          ?.click();
        await Zotero.Promise.delay(25);
      }
      assert.equal(wizard?.getAttribute("data-wizard-step"), "finalreview");
      await emitMigrationMilestone("afterdecisions");

      // Read only a representative set: ordinary ready input, a resolved
      // problem, and the largest eligible mention set. Readiness validates the
      // stored canonical payloads; successful migration can reuse note identity.
      const samples = new Map(
        [
          eligible[0]!,
          eligible.find((candidate) => candidate.originalReasonCodes?.length),
          eligible.reduce((largest, candidate) =>
            (candidate.originalMentionCount || 0) >
            (largest.originalMentionCount || 0)
              ? candidate
              : largest,
          ),
        ]
          .filter((candidate) => candidate !== undefined)
          .map((candidate) => [candidate.candidateId, candidate.parentRef]),
      );
      const broker = resolveZoteroHostCapabilityBroker();
      if (!broker) throw new Error("literature_migration_broker_unavailable");
      const sampleRefs = [...samples.values()];
      const canonicalBefore = countCanonicalArtifacts(
        await broker.library.getArtifactReadiness(sampleRefs),
      );

      const applied = await service.apply({
        scanOperationId: preview.operationId,
        candidateIds: eligible.map((candidate) => candidate.candidateId),
        migrationId: preview.migrationId,
        definitionVersion: preview.definitionVersion,
      });
      if (!applied.ok) {
        throw new Error(`literature_migration_apply_failed:${applied.code}`);
      }
      await emitMigrationMilestone("afterapply");

      const run = service.getRun(preview.runId);
      assert.isOk(run, "the run receipt is durable");
      assert.oneOf(run?.state, ["completed", "completed_with_attention"]);
      const receipts: ReturnType<typeof service.listReceipts> = [];
      let cursor: string | undefined;
      do {
        const page = service.listReceiptsPage({
          runId: preview.runId,
          limit: 100,
          ...(cursor ? { cursor } : {}),
        });
        receipts.push(...page.items);
        cursor = page.nextCursor || undefined;
      } while (cursor);
      assert.lengthOf(receipts, preview.candidates.length);
      assert.isTrue(receipts.every((receipt) => receipt.outcome !== "failed"));
      assert.isTrue(
        receipts.some((receipt) => receipt.outcome === "applied"),
        "at least one eligible parent set was durably applied",
      );

      const canonicalReadiness =
        await broker.library.getArtifactReadiness(sampleRefs);
      assert.isTrue(
        canonicalReadiness.every((item) =>
          item.artifacts.includes("references"),
        ),
        "sampled applied parents expose valid canonical reference artifacts",
      );
      const canonicalAfter = countCanonicalArtifacts(canonicalReadiness);
      assert.isAbove(canonicalAfter, canonicalBefore);
      await waitUntil(
        () => wizard?.getAttribute("data-wizard-step") === "results",
      );
      let health: Awaited<ReturnType<typeof observeSystemE2EHealth>>;
      try {
        health = await observeSystemE2EHealth();
      } catch (error) {
        await emitZoteroTestDebug({
          kind: "literature-migration-health-gate-failure",
          ...sanitizedHealthFailure(error),
        });
        throw error;
      }
      const evidence = {
        kind: "literature-migration-e2e-evidence",
        candidateCount: preview.candidates.length,
        eligibleCount: eligible.length,
        appliedReceiptCount: receipts.filter(
          (receipt) => receipt.outcome === "applied",
        ).length,
        skippedReceiptCount: receipts.filter(
          (receipt) => receipt.outcome === "skipped",
        ).length,
        failedReceiptCount: receipts.filter(
          (receipt) => receipt.outcome === "failed",
        ).length,
        sampledParentCount: sampleRefs.length,
        sampledCanonicalArtifactDelta: canonicalAfter - canonicalBefore,
        health,
      };
      await emitZoteroTestDebug(evidence);
      await writeDiagnosticsText(
        evidencePath,
        JSON.stringify({ milestones, evidence }),
      );
      assert.equal(health.status, "passed");
      assert.isTrue(
        health.hostResponsive && health.pluginResponsive && health.sidecarReady,
      );
      assert.equal(health.undeclaredOperations, 0);
    },
  );
});
