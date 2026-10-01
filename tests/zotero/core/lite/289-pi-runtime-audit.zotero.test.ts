import { joinPath } from "../../../../src/utils/path";
import { removeRuntimePath } from "../../../../src/modules/runtimePersistence";
import { piRuntimeAuditSharedTests } from "../../../runtime/piRuntimeAuditShared";
import { createPiSkillRunCoordinator } from "../../../../src/modules/piSkillRun";
import { createPiTextProviderSource } from "../../../../src/modules/piRuntime";
import {
  appendPiOwnerFact,
  createPiOwner,
} from "../../../../src/modules/piOwnerPersistence";
import type { PiModelSelectionSnapshot } from "../../../../src/shared/piProviderContract";

const mutationModel: PiModelSelectionSnapshot = {
  configurationId: "host-fixture",
  configurationLabel: "Fixture",
  provider: "fixture",
  modelId: "fixture",
  authVariant: "none",
  api: "openai-completions",
  baseUrl: "https://example.test",
  reasoning: "off",
  catalogRevision: "fixture",
  adapterVersion: "0.84.4",
  runtimeVersion: "0.84.4",
  requiresLocalNetwork: "false",
  policy: {
    contextWindow: 32000,
    maxTokens: 2048,
    input: ["text"],
    supportsTools: true,
  },
};

describe("Pi Runtime Audit in Zotero", function () {
  let root: string;
  beforeEach(function () {
    if (!Zotero || typeof Zotero.getTempDirectory !== "function") this.skip();
    if (
      (globalThis as { process?: { versions?: { node?: string } } }).process
        ?.versions?.node
    )
      throw new Error("Node runtime reached Zotero host");
    root = joinPath(
      String(Zotero.getTempDirectory().path),
      `pi-audit-${Date.now()}-${Math.random()}`,
    );
  });
  afterEach(async function () {
    if (root) await removeRuntimePath(root);
  });
  piRuntimeAuditSharedTests(() => root);

  it("keeps an unresolved Broker effect as a hold instead of replaying it", async function () {
    this.timeout(30000);
    if (!Zotero || typeof Zotero.getTempDirectory !== "function") this.skip();
    const owner = { kind: "skill_run" as const, ownerId: "unknown-hold-run" };
    await createPiOwner(owner, root);
    await appendPiOwnerFact(
      owner,
      {
        kind: "skill_run_admitted",
        payload: {
          skillId: "deterministic",
          taskName: "Held task",
          mode: "auto",
          workflow: { workflowId: "fixture" },
        },
      },
      root,
    );
    await appendPiOwnerFact(
      owner,
      { kind: "skill_run_status", payload: { status: "running" } },
      root,
    );
    // A started tool with no authoritative completion evidence is an
    // unproved effect, so the owner keeps a hold and never continues.
    await appendPiOwnerFact(
      owner,
      {
        kind: "tool_call_started",
        payload: {
          callId: "call-unknown",
          domainOperation: {
            scope: { ownerId: owner.ownerId },
            operationId: "op-1",
          },
        },
      },
      root,
    );
    let observed = 0;
    let dispatched = 0;
    const coordinator = createPiSkillRunCoordinator({
      root,
      resolveModel: async () => ({ ...mutationModel }),
      definitions: async () => [],
      execution: () => {
        dispatched++;
        return createPiTextProviderSource({
          steps: [{ text: "Must not replay" }],
        });
      },
      observeOperation: async () => {
        observed++;
        // An unsettled authoritative answer is not a proof of no effect.
        return { state: "unknown" } as never;
      },
    });
    try {
      const reconciled = await coordinator.reconcile();
      assert.equal(observed, 1, "startup observes the Broker exactly once");
      assert.equal(dispatched, 0, "an unresolved effect is never replayed");
      assert.isAtLeast(reconciled.holds, 1);
      assert.equal(reconciled.continued, 0);
      const model = await coordinator.readModel(owner.ownerId);
      assert.equal(model.status, "recovery_required");
      // An explicit check observes again and still refuses to continue.
      await coordinator.recover(owner.ownerId);
      assert.equal(observed, 2);
      assert.equal(dispatched, 0);
    } finally {
      await coordinator.dispose().catch(() => {});
    }
  });
});
