import { assert } from "chai";
import { createPiSkillRunCoordinator } from "../../../../src/modules/piSkillRun";
import { inspectPiOwner } from "../../../../src/modules/piOwnerPersistence";
import { createPiTextProviderSource } from "../../../../src/modules/piRuntime";
import {
  createSkillRunWorkspace,
  prepareSkillRun,
  readSkillRunRunnerJson,
} from "../../../../src/modules/skillRunPreparation";
import {
  ensureRuntimeDirectoryStrict,
  removeRuntimePath,
  writeRuntimeTextFile,
} from "../../../../src/modules/runtimePersistence";
import { joinPath } from "../../../../src/utils/path";
import type { PiModelSelectionSnapshot } from "../../../../src/shared/piProviderContract";
import type { ProviderExecuteArgs } from "../../../../src/providers/types";

const MODEL: PiModelSelectionSnapshot = {
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
  requiresLocalNetwork: false,
  policy: {
    contextWindow: 32000,
    maxTokens: 2048,
    input: ["text"],
    supportsTools: true,
  },
};

const SUBMIT = (callId: string) => ({
  text: "Submitting the prepared result",
  toolCalls: [
    {
      callId,
      name: "submit_skill_result",
      arguments: { protocolVersion: 1, result: { ok: true } },
    },
  ],
});

// Both runtime-persistence helpers are async; every fixture write is awaited
// in order so preparation never reads a directory or file mid-write.
async function writeFixtureFile(path: string, content: string) {
  await ensureRuntimeDirectoryStrict(path.replace(/[\\/][^\\/]+$/, ""));
  await writeRuntimeTextFile(path, content);
}

async function createSkillFixture(root: string) {
  const skillDir = joinPath(root, "skills", "demo-skill");
  await writeFixtureFile(
    joinPath(skillDir, "SKILL.md"),
    "---\nname: demo-skill\n---\n\n# Demo\n",
  );
  await writeFixtureFile(
    joinPath(skillDir, "assets", "output.schema.json"),
    JSON.stringify({
      type: "object",
      required: ["ok"],
      properties: { ok: { const: true } },
      additionalProperties: true,
    }),
  );
  await writeFixtureFile(
    joinPath(skillDir, "assets", "runner.json"),
    JSON.stringify({
      id: "demo-skill",
      execution_modes: ["auto", "interactive"],
      schemas: { output: "assets/output.schema.json" },
    }),
  );
  return {
    skillDir,
    entry: {
      skillId: "demo-skill",
      description: "Demo skill",
      sourceKind: "user" as const,
      sourceDir: skillDir,
      skillMdPath: joinPath(skillDir, "SKILL.md"),
      runnerJsonPath: joinPath(skillDir, "assets", "runner.json"),
      checksum: "sha256:test",
      diagnostics: [],
    },
  };
}

describe("Pi Skill Runs in real Zotero", function () {
  this.timeout(60000);

  it("seals one provider outcome, advances apply/ack and recovers without replay", async function () {
    assert.isUndefined(
      (globalThis as { process?: { versions?: { node?: string } } }).process
        ?.versions?.node,
    );
    const root = joinPath(
      Zotero.getTempDirectory().path,
      `pi-skill-run-${Date.now()}`,
    );
    const { entry } = await createSkillFixture(root);
    let dispatches = 0;
    const prepare = async (
      args: ProviderExecuteArgs & { requestId: string },
    ) => {
      const workspace = await createSkillRunWorkspace({
        backendId: "builtin-pi",
        skillId: "demo-skill",
        requestId: args.requestId,
        rootDir: joinPath(root, "runs"),
      });
      return prepareSkillRun({
        request: {
          kind: "skillrunner.job.v1",
          skill_id: "demo-skill",
        } as never,
        workspace,
        backendId: "builtin-pi",
        skillEntry: entry,
        runnerJson: await readSkillRunRunnerJson(entry.runnerJsonPath),
        executionMode: "auto",
        materialization: { primarySkillDir: entry.sourceDir },
      });
    };
    const coordinator = createPiSkillRunCoordinator({
      root,
      prepare,
      resolveModel: async () => MODEL,
      execution: () => {
        dispatches += 1;
        return createPiTextProviderSource({ steps: [SUBMIT("submit-auto")] });
      },
    });

    const result = await coordinator.execute({
      requestKind: "skillrunner.job.v1",
      request: { kind: "skillrunner.job.v1", skill_id: "demo-skill" },
      backend: {
        id: "builtin-pi",
        type: "builtin-pi",
        baseUrl: "local://builtin-pi",
      },
      orchestrationContext: { workflowId: "w", jobId: "j" },
    } as ProviderExecuteArgs);
    assert.equal(result.status, "succeeded");
    assert.equal(dispatches, 1);

    const claim = await coordinator.claimApply(result.requestId);
    assert.equal(claim.status, "claimed");
    await coordinator.recordApplyReceipt(result.requestId, {
      status: "succeeded",
    });
    await coordinator.acknowledgeTerminal(result.requestId, "ack-1");
    const model = await coordinator.readModel(result.requestId);
    assert.equal(model.applyReceipt?.status, "succeeded");
    assert.equal(model.terminalAck, "ack-1");

    const history = await inspectPiOwner(
      { kind: "skill_run", ownerId: result.requestId },
      root,
    );
    assert.equal(history.status, "valid");

    // Recovery reconstructs the same terminal owner and never re-dispatches.
    const recovered = createPiSkillRunCoordinator({
      root,
      prepare,
      resolveModel: async () => MODEL,
      execution: () => {
        dispatches += 1;
        return createPiTextProviderSource({ steps: [SUBMIT("submit-replay")] });
      },
    });
    const state = await recovered.recover(result.requestId);
    assert.equal(state.status, "succeeded");
    assert.equal(dispatches, 1);
    await removeRuntimePath(root).catch(() => false);
  });

  it("waits on a durable file question and resumes the same request once answered", async function () {
    const root = joinPath(
      Zotero.getTempDirectory().path,
      `pi-skill-run-interactive-${Date.now()}`,
    );
    const { entry } = await createSkillFixture(root);
    let dispatches = 0;
    const prepare = async (
      args: ProviderExecuteArgs & { requestId: string },
    ) => {
      const workspace = await createSkillRunWorkspace({
        backendId: "builtin-pi",
        skillId: "demo-skill",
        requestId: args.requestId,
        rootDir: joinPath(root, "runs"),
      });
      return prepareSkillRun({
        request: {
          kind: "skillrunner.job.v1",
          skill_id: "demo-skill",
        } as never,
        workspace,
        backendId: "builtin-pi",
        skillEntry: entry,
        runnerJson: await readSkillRunRunnerJson(entry.runnerJsonPath),
        executionMode: "interactive",
        materialization: { primarySkillDir: entry.sourceDir },
      });
    };
    const coordinator = createPiSkillRunCoordinator({
      root,
      prepare,
      resolveModel: async () => MODEL,
      execution: () => {
        dispatches += 1;
        return createPiTextProviderSource({
          steps:
            dispatches === 1
              ? [
                  {
                    text: "I need one document",
                    toolCalls: [
                      {
                        callId: "ask-files",
                        name: "ask_user",
                        arguments: {
                          questions: [
                            {
                              kind: "files",
                              prompt: "Attach a document",
                              required: true,
                              files: [{ name: "document" }],
                            },
                          ],
                        },
                      },
                    ],
                  },
                ]
              : [SUBMIT("submit-interactive")],
        });
      },
    });

    const started = await coordinator.execute({
      requestKind: "skillrunner.job.v1",
      request: {
        kind: "skillrunner.job.v1",
        skill_id: "demo-skill",
        runtime_options: { execution_mode: "interactive" },
      },
      backend: {
        id: "builtin-pi",
        type: "builtin-pi",
        baseUrl: "local://builtin-pi",
      },
      orchestrationContext: { workflowId: "w", jobId: "j" },
    } as ProviderExecuteArgs);
    const requestId = started.requestId;
    const waiting = await coordinator.readModel(requestId);
    assert.equal(waiting.status, "waiting_user");
    const batch = waiting.interactionBatch!;
    assert.lengthOf(batch.questions, 1);
    assert.equal(batch.questions[0].kind, "files");

    const userFile = joinPath(root, "input.txt");
    await writeFixtureFile(userFile, "hello from the host test");
    await coordinator.submitFiles(
      requestId,
      {
        batchId: batch.batchId,
        questionId: batch.questions[0].questionId,
        baseRevision: batch.revision,
        mutationId: "mutation-files",
      },
      [{ path: userFile, displayName: "input.txt" }],
    );
    const drafted = await coordinator.readModel(requestId);
    const answer =
      drafted.interactionBatch!.draftAnswers[batch.questions[0].questionId];
    assert.equal(answer.kind, "files");
    // The mutation is idempotent: an identical retry returns the same receipt.
    const retried = await coordinator.submitFiles(
      requestId,
      {
        batchId: batch.batchId,
        questionId: batch.questions[0].questionId,
        baseRevision: batch.revision,
        mutationId: "mutation-files",
      },
      [{ path: userFile, displayName: "input.txt" }],
    );
    assert.equal(retried.revision, drafted.interactionBatch!.revision);
    let staleCode = "";
    try {
      await coordinator.updateDraft(requestId, {
        batchId: batch.batchId,
        questionId: batch.questions[0].questionId,
        baseRevision: batch.revision,
        mutationId: "mutation-stale",
        answer,
      });
    } catch (error) {
      staleCode = error instanceof Error ? error.message : String(error);
    }
    assert.equal(staleCode, "interaction_revision_stale");

    await coordinator.submitInteraction(requestId, {
      batchId: batch.batchId,
      baseRevision: drafted.interactionBatch!.revision,
      mutationId: "mutation-submit",
      answers: drafted.interactionBatch!.draftAnswers,
    });
    let settled = await coordinator.readModel(requestId);
    for (
      let attempt = 0;
      attempt < 200 && settled.status !== "succeeded";
      attempt += 1
    ) {
      await new Promise((resolve) => setTimeout(resolve, 25));
      settled = await coordinator.readModel(requestId);
    }
    assert.equal(settled.status, "succeeded");
    assert.equal(dispatches, 2);
    await removeRuntimePath(root).catch(() => false);
  });
});
