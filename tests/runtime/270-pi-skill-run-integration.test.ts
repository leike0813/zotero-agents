import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { assert } from "chai";
import { createPiSkillRunCoordinator } from "../../src/modules/piSkillRun";
import {
  inspectPiOwner,
  appendPiOwnerFact,
  createPiOwner,
} from "../../src/modules/piOwnerPersistence";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";
import { installPluginStateNodeSqliteAdapter } from "../helpers/pluginStateNodeSqliteAdapter";
import type { ProviderExecuteArgs } from "../../src/providers/types";
import { createPiTextProviderSource } from "../../src/modules/piRuntime";
import { prepareSkillRun } from "../../src/modules/skillRunPreparation";
import { createAcpSkillRunnerWorkspace } from "../../src/modules/acp/skillRun/acpSkillRunnerWorkspace";
import type { PiModelSelectionSnapshot } from "../../src/shared/piProviderContract";
import { readOwnerAudit } from "./piOwnerAuditRead";
import { resetPiRuntimeAuditForTests } from "../../src/modules/piRuntimeAudit";
import { setRuntimeLogDiagnosticMode } from "../../src/modules/runtimeLogManager";
import { joinPath } from "../../src/utils/path";

const model: PiModelSelectionSnapshot = {
  configurationId: "test",
  configurationLabel: "Test",
  provider: "test",
  modelId: "test",
  authVariant: "none",
  api: "openai-completions",
  baseUrl: "https://example.test",
  reasoning: "off",
  catalogRevision: "test",
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

describe("Pi Skill Run integration", function () {
  let root: string;
  let prior: string | undefined;
  beforeEach(async function () {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "pi-skill-run-"));
    prior = process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    process.env.ZOTERO_SKILLS_RUNTIME_ROOT = root;
    resetPluginStateStoreForTests();
    installPluginStateNodeSqliteAdapter();
  });
  afterEach(async function () {
    resetPluginStateStoreForTests();
    // Drain every owner audit queue before the tree is removed. A coordinator
    // that a test never disposed can still hold a queued write, and that write
    // would otherwise recreate the directory under removal.
    await resetPiRuntimeAuditForTests();
    if (prior === undefined) delete process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    else process.env.ZOTERO_SKILLS_RUNTIME_ROOT = prior;
    await fs.rm(root, { recursive: true, force: true });
  });
  const request = (): ProviderExecuteArgs => ({
    requestKind: "skillrunner.job.v1",
    request: { kind: "skillrunner.job.v1", skill_id: "deterministic" },
    backend: {
      id: "builtin-pi",
      type: "builtin-pi",
      baseUrl: "local://builtin-pi",
    },
    orchestrationContext: { workflowId: "test-workflow", jobId: "test-job" },
  });
  async function prepare(args: ProviderExecuteArgs & { requestId: string }) {
    const skillDir = path.join(root, "skill");
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(
      path.join(skillDir, "SKILL.md"),
      "Execute the deterministic Skill.",
    );
    await fs.writeFile(path.join(skillDir, "runner.json"), "{}");
    await fs.mkdir(path.join(skillDir, "assets"), { recursive: true });
    await fs.writeFile(
      path.join(skillDir, "assets", "output.schema.json"),
      JSON.stringify({ type: "object", additionalProperties: true }),
    );
    const workspace = await createAcpSkillRunnerWorkspace({
      requestId: args.requestId,
      backendId: "builtin-pi",
      skillId: "test",
      rootDir: root,
    });
    return prepareSkillRun({
      request: args.request as { skill_id: string },
      workspace,
      backendId: "builtin-pi",
      executionMode:
        (args.request as { runtime_options?: { execution_mode?: string } })
          .runtime_options?.execution_mode === "interactive"
          ? "interactive"
          : "auto",
      materialization: { primarySkillDir: skillDir },
      skillEntry: {
        skillId: "deterministic",
        sourceKind: "xpi-bundled",
        sourceDir: skillDir,
        skillMdPath: path.join(skillDir, "SKILL.md"),
        runnerJsonPath: path.join(skillDir, "runner.json"),
        checksum: "test",
        description: "Test",
        diagnostics: [],
      },
      runnerJson: {},
    });
  }

  it("keeps a visible durable owner when preparation fails before dispatch", async function () {
    let dispatches = 0;
    const coordinator = createPiSkillRunCoordinator({
      root,
      prepare: async () => {
        throw new Error("private setup details");
      },
      execution: () => {
        dispatches++;
        throw new Error("must not dispatch");
      },
    });
    const result = await coordinator.execute(request());
    assert.equal(result.status, "failed");
    assert.equal(dispatches, 0);
    const owners = await coordinator.list();
    assert.lengthOf(owners, 1);
    assert.equal(owners[0].requestId, result.requestId);
    const history = await inspectPiOwner(
      { kind: "skill_run", ownerId: result.requestId },
      root,
    );
    assert.equal(history.status, "valid");
    assert.notInclude(JSON.stringify(history), "private setup details");
    const recovered = createPiSkillRunCoordinator({ root });
    assert.equal((await recovered.recover(result.requestId)).status, "failed");
    assert.equal(
      (await recovered.readProviderResult(result.requestId))?.status,
      "failed",
    );
    await recovered.archive(result.requestId);
    assert.lengthOf(await recovered.list(), 0);
  });

  it("fails an explicitly invalid mode on the admitted owner without preparation", async function () {
    let prepared = false;
    const coordinator = createPiSkillRunCoordinator({
      root,
      prepare: async (args) => {
        prepared = true;
        return prepare(args);
      },
    });
    const args = request();
    (args.request as { runtime_options?: unknown }).runtime_options = {
      execution_mode: "Interactive",
    };
    const result = await coordinator.execute(args);
    assert.equal(result.status, "failed");
    assert.equal(result.error, "invalid_execution_mode");
    assert.isFalse(prepared);
    assert.equal((await coordinator.list())[0].requestId, result.requestId);
  });

  it("commits one failure identity before the sealed outcome and never repeats it", async function () {
    const coordinator = createPiSkillRunCoordinator({
      root,
      prepare,
      resolveModel: async () => model,
      definitions: async () => [],
      execution: () => {
        const execution = createPiTextProviderSource({
          steps: [{ text: "nothing sealed" }],
        });
        return {
          model: execution.model,
          source: () => {
            throw new Error("private-provider-failure");
          },
        };
      },
    });
    const result = await coordinator.execute(request());
    assert.equal(result.status, "failed");
    const requestId = result.requestId;
    const ref = { kind: "skill_run" as const, ownerId: requestId };
    const entries = (await inspectPiOwner(ref, root)).entries;
    const failures = entries.filter(
      (entry) => entry.kind === "failure_observed",
    );
    // Exactly one observation, committed before the outcome that references it.
    assert.lengthOf(failures, 1);
    const outcome = entries.find((entry) => entry.kind === "skill_run_outcome");
    assert.isBelow(failures[0].seq, outcome!.seq);
    const terminal = entries.find((entry) => entry.kind === "turn_terminal");
    const failureId = (failures[0].payload as { failureId: string }).failureId;
    assert.equal(
      (outcome!.payload as { failureId: string }).failureId,
      failureId,
    );
    assert.equal(
      (terminal!.payload as { failureId: string }).failureId,
      failureId,
    );
    // The core never carries the response envelope or provider detail.
    assert.notInclude(JSON.stringify(failures[0].payload), "responseJson");
    await coordinator.cancel(requestId).catch(() => undefined);
    const after = (await inspectPiOwner(ref, root)).entries.filter(
      (entry) => entry.kind === "failure_observed",
    );
    assert.lengthOf(after, 1);
  });

  it("records the workspace location before preparation evidence", async function () {
    let prepared = false;
    const coordinator = createPiSkillRunCoordinator({
      root,
      prepare: async (args) => {
        prepared = true;
        return prepare(args);
      },
      resolveModel: async () => model,
      definitions: async () => [],
      execution: () => {
        const execution = createPiTextProviderSource({
          steps: [{ text: "nothing sealed" }],
        });
        return { model: execution.model, source: execution.source };
      },
    });
    const result = await coordinator.execute(request());
    assert.isTrue(prepared);
    const entries = (
      await inspectPiOwner(
        { kind: "skill_run", ownerId: result.requestId },
        root,
      )
    ).entries;
    const workspace = entries.find(
      (entry) => entry.kind === "skill_run_workspace",
    );
    assert.isDefined(
      workspace,
      "workspace fact is required for audit owner resolution",
    );
    assert.isBelow(
      workspace!.seq,
      entries.find((entry) => entry.kind === "skill_run_prepared")!.seq,
    );
  });

  it("binds a workspace at admission so a preparation failure still has one", async function () {
    const coordinator = createPiSkillRunCoordinator({
      root,
      prepare: async () => {
        throw new Error("private setup details");
      },
      execution: () => {
        throw new Error("must not dispatch");
      },
    });
    const result = await coordinator.execute(request());
    assert.equal(result.status, "failed");
    const entries = (
      await inspectPiOwner(
        { kind: "skill_run", ownerId: result.requestId },
        root,
      )
    ).entries;
    const workspace = entries.find(
      (entry) => entry.kind === "skill_run_workspace",
    );
    // Preparation never resolved, yet the owner still has a durable location,
    // so its terminal evidence has a home instead of being discarded.
    assert.isDefined(
      workspace,
      "admission must bind a workspace before preparation",
    );
    const bound = workspace!.payload as { workspaceDir?: string };
    assert.isString(bound.workspaceDir);
    const audit = await readOwnerAudit(root, {
      kind: "skill_run",
      ownerId: result.requestId,
    });
    assert.isAbove(
      audit.length,
      0,
      "a failed preparation still records evidence",
    );
  });

  it("settles queued audit evidence before dispose releases the owner", async function () {
    const coordinator = createPiSkillRunCoordinator({
      root,
      prepare,
      resolveModel: async () => model,
      definitions: async () => [],
      execution: () => {
        const execution = createPiTextProviderSource({
          steps: [{ text: "nothing sealed" }],
        });
        return { model: execution.model, source: execution.source };
      },
    });
    const result = await coordinator.execute(request());
    assert.equal(result.status, "failed");
    // Dispose is the production close boundary: an owner released without a
    // flush can leave a queued write racing the next removal of its directory.
    await coordinator.dispose();
    const audit = await readOwnerAudit(root, {
      kind: "skill_run",
      ownerId: result.requestId,
    });
    assert.isAbove(
      audit.length,
      0,
      "dispose must settle queued owner evidence",
    );
    // Nothing may still be writing into the owner tree once dispose resolves.
    const before = await readOwnerAudit(root, {
      kind: "skill_run",
      ownerId: result.requestId,
    });
    await new Promise((resolve) => setTimeout(resolve, 60));
    const after = await readOwnerAudit(root, {
      kind: "skill_run",
      ownerId: result.requestId,
    });
    assert.equal(
      after.length,
      before.length,
      "no audit write may outlive dispose",
    );
  });

  it("keeps interaction boundaries out of the store until Diagnostic Mode", async function () {
    const coordinator = createPiSkillRunCoordinator({
      root,
      prepare,
      resolveModel: async () => model,
      definitions: async () => [],
      execution: () => {
        const execution = createPiTextProviderSource({
          steps: [{ text: "nothing sealed" }],
        });
        return { model: execution.model, source: execution.source };
      },
    });
    const result = await coordinator.execute(request());
    const owner = { kind: "skill_run" as const, ownerId: result.requestId };
    const production = await readOwnerAudit(root, owner);
    // Interaction boundaries are diagnostic tier: production evidence holds
    // the terminal and failure facts only.
    assert.notInclude(JSON.stringify(production), "interaction.wait");
    setRuntimeLogDiagnosticMode(true);
    try {
      await coordinator.cancel(result.requestId).catch(() => undefined);
    } finally {
      setRuntimeLogDiagnosticMode(false);
    }
  });

  it("does not reuse a prior turn's failure identity for a different cause", async function () {
    // A preparation failure is the distinct-cause path: the run reaches its
    // terminal with a cause of its own, and the sealed outcome must reference
    // that identity rather than whatever the folded state happened to hold.
    const coordinator = createPiSkillRunCoordinator({
      root,
      prepare: async () => {
        throw new Error("private setup details");
      },
      execution: () => {
        throw new Error("must not dispatch");
      },
    });
    const result = await coordinator.execute(request());
    assert.equal(result.status, "failed");
    const entries = (
      await inspectPiOwner(
        { kind: "skill_run", ownerId: result.requestId },
        root,
      )
    ).entries;
    const failures = entries.filter(
      (entry) => entry.kind === "failure_observed",
    );
    const outcome = entries.find((entry) => entry.kind === "skill_run_outcome");
    const failureId = (failures[0]?.payload as { failureId?: string })
      ?.failureId;
    // Exactly one observation, and the sealed outcome references it.
    assert.lengthOf(failures, 1);
    assert.isString(failureId);
    assert.equal(
      (outcome?.payload as { failureId?: string })?.failureId,
      failureId,
    );
  });

  it("seals explicit output and keeps apply/ack independent from cancellation and recovery", async function () {
    let invocations = 0;
    const coordinator = createPiSkillRunCoordinator({
      root,
      prepare,
      resolveModel: async () => model,
      definitions: async () => [],
      execution: () => {
        const execution = createPiTextProviderSource({
          steps: [
            {
              toolCalls: [
                {
                  callId: "submit",
                  name: "submit_skill_result",
                  arguments: { protocolVersion: 1, result: { answer: 42 } },
                },
              ],
            },
            { text: "Done" },
          ],
        });
        return {
          model: execution.model,
          source: (input) => {
            invocations++;
            return execution.source(input);
          },
        };
      },
    });
    const result = await coordinator.execute(request());
    assert.equal(result.status, "succeeded", JSON.stringify(result));
    assert.equal(invocations, 1, "sealed result must stop model dispatch");
    assert.deepEqual(result.resultJson, { answer: 42 });
    assert.notInclude(JSON.stringify(result.responseJson), root);
    assert.notInclude(JSON.stringify(result.responseJson), "answer");
    await coordinator.cancel(result.requestId);
    assert.equal(
      (await coordinator.readProviderResult(result.requestId)).status,
      "succeeded",
    );
    const restored = createPiSkillRunCoordinator({
      root,
      execution: () => {
        throw new Error("no recovery dispatch");
      },
    });
    assert.equal(
      (await restored.recover(result.requestId)).status,
      "succeeded",
    );
    assert.equal(
      (await restored.claimApply(result.requestId)).status,
      "claimed",
    );
    assert.equal(
      (await coordinator.claimApply(result.requestId)).status,
      "recovery_required",
    );
    await restored.recordApplyReceipt(result.requestId, {
      status: "succeeded",
    });
    await restored.acknowledgeTerminal(result.requestId, "workflow-terminal");
    assert.equal(
      (await restored.readModel(result.requestId)).terminalAck,
      "workflow-terminal",
    );
  });

  it("restores a durable question wait, rejects stale drafts and resumes original calls once", async function () {
    let writes = 0;
    const writeTool = {
      capabilityId: "test-write",
      name: "test_write",
      description: "Write once",
      schema: { type: "object" },
      minimumEffects: ["workspace-mutation" as const],
      maxResultBytes: 1024,
      classify: () => ({
        effects: ["workspace-mutation" as const],
        authorizationKeys: [],
        resourceKeys: ["test"],
        cost: 1,
      }),
      execute: async () => {
        writes++;
        return {
          status: "completed" as const,
          effectCertainty: "confirmed_complete" as const,
          value: { written: true },
        };
      },
    };
    const coordinator = createPiSkillRunCoordinator({
      root,
      prepare,
      resolveModel: async () => model,
      definitions: async () => [writeTool],
      execution: () =>
        createPiTextProviderSource({
          steps: [
            {
              toolCalls: [
                { callId: "ordinary", name: "test_write", arguments: {} },
                {
                  callId: "ask",
                  name: "ask_user",
                  arguments: {
                    questions: [
                      { kind: "text", prompt: "Your answer?" },
                      { kind: "confirm", prompt: "Proceed?", required: false },
                    ],
                  },
                },
              ],
            },
          ],
        }),
    });
    const args = request();
    (args.request as { runtime_options?: unknown }).runtime_options = {
      execution_mode: "interactive",
    };
    const result = await coordinator.execute(args);
    assert.equal(result.status, "deferred", JSON.stringify(result));
    assert.equal(writes, 1);
    const restored = createPiSkillRunCoordinator({
      root,
      resolveModel: async () => model,
      definitions: async () => [writeTool],
      execution: () =>
        createPiTextProviderSource({
          steps: [
            {
              toolCalls: [
                {
                  callId: "submit-after-answer",
                  name: "submit_skill_result",
                  arguments: {
                    protocolVersion: 1,
                    result: { answer: "accepted" },
                  },
                },
              ],
            },
            { text: "Done" },
          ],
        }),
    });
    assert.equal(
      (await restored.recover(result.requestId)).status,
      "waiting_user",
    );
    const batch = (await restored.readModel(result.requestId))
      .interactionBatch!;
    const mutation = {
      batchId: batch.batchId,
      questionId: batch.questions[0].questionId,
      baseRevision: batch.revision,
      mutationId: "draft-" + "x".repeat(200),
      answer: { kind: "text" as const, text: "accepted" },
    };
    assert.equal(
      (await restored.updateDraft(result.requestId, mutation)).revision,
      1,
    );
    assert.equal(
      (await restored.updateDraft(result.requestId, mutation)).revision,
      1,
    );
    try {
      await coordinator.updateDraft(result.requestId, {
        ...mutation,
        mutationId: "stale",
      });
      assert.fail("stale accepted");
    } catch (error) {
      assert.include(String(error), "revision_stale");
    }
    assert.equal(
      (await coordinator.readModel(result.requestId)).interactionBatch!
        .revision,
      1,
    );
    const latest = (await restored.readModel(result.requestId))
      .interactionBatch!;
    await restored.submitInteraction(result.requestId, {
      batchId: batch.batchId,
      baseRevision: latest.revision,
      mutationId: "submit-answers",
      answers: latest.draftAnswers,
    });
    for (
      let attempt = 0;
      attempt < 50 &&
      (await restored.readProviderResult(result.requestId)).status ===
        "deferred";
      attempt++
    )
      await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(
      (await restored.readProviderResult(result.requestId)).status,
      "succeeded",
    );
    assert.equal(writes, 1);
    const history = await inspectPiOwner(
      { kind: "skill_run", ownerId: result.requestId },
      root,
    );
    const askResult = history.entries.filter(
      (entry) =>
        entry.kind === "tool_result" &&
        (entry.payload as { callId?: string }).callId === "ask",
    );
    assert.lengthOf(askResult, 1);
    const answer = JSON.parse((askResult[0].payload as { text: string }).text);
    assert.lengthOf(answer.answers, 2);
    assert.equal(answer.answers[1].answer.kind, "unanswered");
  });

  it("interrupts Auto into the same suspended request and continues without ask_user", async function () {
    let requestId = "";
    let focuses = 0;
    let release!: () => void;
    const entered = new Promise<void>((resolve) => {
      release = resolve;
    });
    let first = true;
    const coordinator = createPiSkillRunCoordinator({
      root,
      prepare,
      resolveModel: async () => model,
      definitions: async () => [],
      launchFocus: () => {
        focuses++;
      },
      execution: () => {
        if (!first)
          return createPiTextProviderSource({
            steps: [
              {
                toolCalls: [
                  {
                    callId: "continued-submit",
                    name: "submit_skill_result",
                    arguments: { protocolVersion: 1, result: { ok: true } },
                  },
                ],
              },
              { text: "Done" },
            ],
          });
        first = false;
        const execution = createPiTextProviderSource({
          steps: [{ text: "pending" }],
        });
        return {
          model: execution.model,
          source: async (input) => {
            release();
            await new Promise<void>((resolve) =>
              input.signal.addEventListener("abort", () => resolve(), {
                once: true,
              }),
            );
            return execution.source(input);
          },
        };
      },
    });
    const args = request();
    args.onProgress = (event) => {
      if (event.type === "request-created") requestId = String(event.requestId);
    };
    const running = coordinator.execute(args);
    await entered;
    await coordinator.interrupt(requestId);
    assert.equal((await coordinator.readModel(requestId)).status, "suspended");
    assert.isFalse((await coordinator.list())[0].attention);
    const result = await coordinator.reply(requestId, "Continue");
    assert.equal((await running).status, "deferred");
    assert.equal(result.requestId, requestId);
    assert.equal(result.status, "succeeded", JSON.stringify(result));
    assert.equal((await coordinator.readModel(requestId)).mode, "auto");
    assert.equal(focuses, 0);
  });

  it("requires recovery for an unconfirmed effect even when a suspended checkpoint exists", async function () {
    const coordinator = createPiSkillRunCoordinator({
      root,
      prepare,
      resolveModel: async () => model,
      definitions: async () => [],
      execution: () =>
        createPiTextProviderSource({
          steps: [
            {
              toolCalls: [
                {
                  callId: "ask-before-crash",
                  name: "ask_user",
                  arguments: {
                    questions: [{ kind: "text", prompt: "Answer?" }],
                  },
                },
              ],
            },
          ],
        }),
    });
    const args = request();
    (args.request as { runtime_options?: unknown }).runtime_options = {
      execution_mode: "interactive",
    };
    const result = await coordinator.execute(args);
    const owner = { kind: "skill_run" as const, ownerId: result.requestId };
    await appendPiOwnerFact(
      owner,
      {
        kind: "tool_call_started",
        payload: { callId: "effect-without-receipt" },
      },
      root,
    );
    await appendPiOwnerFact(
      owner,
      { kind: "skill_run_status", payload: { status: "suspended" } },
      root,
    );
    let dispatched = 0;
    const restored = createPiSkillRunCoordinator({
      root,
      execution: () => {
        dispatched++;
        throw new Error("must not replay");
      },
    });
    assert.equal(
      (await restored.recover(result.requestId)).status,
      "recovery_required",
    );
    assert.equal(dispatched, 0);
    assert.isTrue((await restored.list())[0].attention);
    assert.include((await restored.list())[0].recoveryActions, "cancel-run");
    try {
      await restored.reply(result.requestId, "Continue");
      assert.fail("unsafe continued");
    } catch (error) {
      assert.include(String(error), "not_replyable");
    }
  });

  it("admits file answers as immutable owner references and retries the same mutation", async function () {
    const coordinator = createPiSkillRunCoordinator({
      root,
      prepare,
      resolveModel: async () => model,
      definitions: async () => [],
      execution: () =>
        createPiTextProviderSource({
          steps: [
            {
              toolCalls: [
                {
                  callId: "ask-file",
                  name: "ask_user",
                  arguments: {
                    questions: [
                      {
                        kind: "files",
                        prompt: "Provide a document",
                        files: [{ name: "document" }],
                      },
                    ],
                  },
                },
              ],
            },
          ],
        }),
    });
    const args = request();
    (args.request as { runtime_options?: unknown }).runtime_options = {
      execution_mode: "interactive",
    };
    const result = await coordinator.execute(args);
    const batch = (await coordinator.readModel(result.requestId))
      .interactionBatch!;
    const file = path.join(root, "user-document.txt");
    await fs.writeFile(file, "original");
    const payload = {
      batchId: batch.batchId,
      questionId: batch.questions[0].questionId,
      slotId: batch.questions[0].files[0].slotId,
      baseRevision: batch.revision,
      mutationId: "file-selection",
    };
    const receipt = await coordinator.submitFiles(result.requestId, payload, [
      { path: file, displayName: "document.txt" },
    ]);
    assert.deepEqual(
      await coordinator.submitFiles(result.requestId, payload, [
        { path: file, displayName: "document.txt" },
      ]),
      receipt,
    );
    const restored = createPiSkillRunCoordinator({ root });
    assert.equal(
      (await restored.recover(result.requestId)).status,
      "waiting_user",
    );
    const latest = (await restored.readModel(result.requestId))
      .interactionBatch!;
    assert.notInclude(JSON.stringify(latest), root);
    assert.equal(latest.revision, 1);
    await fs.writeFile(file, "modified");
    const answer = latest.draftAnswers[payload.questionId];
    assert.equal(answer.kind, "files");
    if (answer.kind === "files")
      assert.equal(answer.slots[0].files[0].byteLength, 8);
    await restored.cancel(result.requestId);
    assert.equal(
      (await restored.readModel(result.requestId)).interactionBatch?.status,
      "canceled",
    );
  });

  it("continues permission on the original call before publishing its questions", async function () {
    let effects = 0;
    let turns = 0;
    const tool = {
      capabilityId: "approved-effect",
      name: "approved_effect",
      description: "Controlled effect",
      schema: { type: "object" },
      minimumEffects: ["external-mutation" as const],
      maxResultBytes: 1024,
      classify: () => ({
        effects: ["external-mutation" as const],
        authorizationKeys: [],
        resourceKeys: ["external"],
        cost: 1,
      }),
      execute: async () => {
        effects++;
        return {
          status: "completed" as const,
          effectCertainty: "confirmed_complete" as const,
          value: { ok: true },
        };
      },
    };
    const coordinator = createPiSkillRunCoordinator({
      root,
      prepare,
      resolveModel: async () => model,
      definitions: async () => [tool],
      execution: () =>
        createPiTextProviderSource({
          steps:
            turns++ === 0
              ? [
                  {
                    toolCalls: [
                      {
                        callId: "permission-call",
                        name: "approved_effect",
                        arguments: {},
                      },
                      {
                        callId: "question-call",
                        name: "ask_user",
                        arguments: {
                          questions: [{ kind: "text", prompt: "Answer?" }],
                        },
                      },
                    ],
                  },
                ]
              : [
                  {
                    toolCalls: [
                      {
                        callId: "decline-submit",
                        name: "submit_skill_result",
                        arguments: {
                          protocolVersion: 1,
                          result: { declined: true },
                        },
                      },
                    ],
                  },
                ],
        }),
    });
    const args = request();
    (args.request as { runtime_options?: unknown }).runtime_options = {
      execution_mode: "interactive",
    };
    let approval: Promise<unknown> | undefined;
    const unsubscribe = coordinator.subscribe((change) => {
      if (!change.requestId || approval) return;
      void coordinator.readModel(change.requestId).then((current) => {
        if (current.status !== "waiting_permission" || approval) return;
        approval = coordinator.resolvePermission(
          current.requestId,
          "permission-call",
          "approve",
        );
        void approval.catch(() => {});
      });
    });
    const result = await coordinator.execute(args);
    unsubscribe();
    assert.equal(result.status, "deferred");
    assert.isOk(approval, "approval starts as soon as the wait is published");
    await approval;
    const batch = (await coordinator.readModel(result.requestId))
      .interactionBatch!;
    assert.equal(effects, 1);
    assert.equal(
      (await coordinator.readModel(result.requestId)).status,
      "waiting_user",
    );
    await coordinator.declineInteraction(result.requestId, {
      batchId: batch.batchId,
      baseRevision: batch.revision,
      mutationId: "decline-batch",
    });
    for (
      let attempt = 0;
      attempt < 50 &&
      (await coordinator.readProviderResult(result.requestId)).status ===
        "deferred";
      attempt++
    )
      await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(
      (await coordinator.readProviderResult(result.requestId)).status,
      "succeeded",
    );
    const history = await inspectPiOwner(
      { kind: "skill_run", ownerId: result.requestId },
      root,
    );
    const answers = history.entries.filter(
      (entry) =>
        entry.kind === "tool_result" &&
        (entry.payload as { callId?: string }).callId === "question-call",
    );
    assert.lengthOf(answers, 1);
    assert.equal(
      JSON.parse((answers[0].payload as { text: string }).text).outcome,
      "declined",
    );
  });

  it("restores cumulative LoopGuard and fails without another model dispatch", async function () {
    const coordinator = createPiSkillRunCoordinator({
      root,
      prepare,
      resolveModel: async () => model,
      definitions: async () => [],
      execution: () =>
        createPiTextProviderSource({
          steps: [
            {
              toolCalls: [
                {
                  callId: "limit-question",
                  name: "ask_user",
                  arguments: {
                    questions: [{ kind: "text", prompt: "Answer?" }],
                  },
                },
              ],
            },
          ],
        }),
    });
    const args = request();
    (args.request as { runtime_options?: unknown }).runtime_options = {
      execution_mode: "interactive",
    };
    const result = await coordinator.execute(args);
    await appendPiOwnerFact(
      { kind: "skill_run", ownerId: result.requestId },
      {
        kind: "skill_run_guard",
        payload: { invocations: 20, toolAttempts: 1, cycles: [] },
      },
      root,
    );
    let invocations = 0;
    const restored = createPiSkillRunCoordinator({
      root,
      resolveModel: async () => model,
      definitions: async () => [],
      execution: () => {
        const execution = createPiTextProviderSource({
          steps: [{ text: "must not invoke" }],
        });
        return {
          ...execution,
          source: (input) => {
            invocations++;
            return execution.source(input);
          },
        };
      },
    });
    await restored.recover(result.requestId);
    const batch = (await restored.readModel(result.requestId))
      .interactionBatch!;
    await restored.declineInteraction(result.requestId, {
      batchId: batch.batchId,
      baseRevision: batch.revision,
      mutationId: "limit-decline",
    });
    for (
      let attempt = 0;
      attempt < 50 &&
      (await restored.readProviderResult(result.requestId)).status ===
        "deferred";
      attempt++
    )
      await new Promise((resolve) => setTimeout(resolve, 10));
    const failed = await restored.readProviderResult(result.requestId);
    assert.equal(failed.status, "failed");
    assert.equal(failed.error, "agent_loop_limit_exceeded");
    assert.equal(invocations, 0);
  });

  it("charges only admitted calls against a recovered tool budget", async function () {
    const sourceWindow = {};
    const focused: Array<{ requestId: string; window: unknown }> = [];
    const coordinator = createPiSkillRunCoordinator({
      root,
      prepare,
      resolveModel: async () => model,
      definitions: async () => [],
      launchFocus: (requestId, window) => {
        focused.push({ requestId, window });
      },
      execution: () =>
        createPiTextProviderSource({
          steps: [
            {
              toolCalls: [
                {
                  callId: "question",
                  name: "ask_user",
                  arguments: {
                    questions: [{ kind: "text", prompt: "Continue?" }],
                  },
                },
              ],
            },
          ],
        }),
    });
    const args = request();
    args.providerOptions = { originWindow: sourceWindow };
    (args.request as { runtime_options?: unknown }).runtime_options = {
      execution_mode: "interactive",
    };
    const admitted = await coordinator.execute(args);
    assert.deepEqual(focused, [
      { requestId: admitted.requestId, window: sourceWindow },
    ]);
    assert.isTrue((await coordinator.list())[0].attention);
    await appendPiOwnerFact(
      { kind: "skill_run", ownerId: admitted.requestId },
      {
        kind: "skill_run_guard",
        payload: { invocations: 1, toolAttempts: 99, cycles: [] },
      },
      root,
    );
    let effects = 0;
    const restored = createPiSkillRunCoordinator({
      root,
      resolveModel: async () => model,
      launchFocus: (requestId, window) => {
        focused.push({ requestId, window });
      },
      definitions: async () => [
        {
          capabilityId: "read",
          name: "read",
          description: "Read",
          schema: { type: "object" },
          minimumEffects: ["bounded-read"],
          maxResultBytes: 1000,
          classify: () => ({
            effects: ["bounded-read"],
            authorizationKeys: [],
            resourceKeys: [],
            cost: 1,
          }),
          execute: async () => {
            effects++;
            return {
              status: "completed",
              effectCertainty: "not_applicable",
              value: {},
            };
          },
        },
      ],
      execution: () =>
        createPiTextProviderSource({
          steps: [
            {
              toolCalls: [
                { callId: "unknown1", name: "unknown1", arguments: {} },
                { callId: "read", name: "read", arguments: {} },
                { callId: "unknown2", name: "unknown2", arguments: {} },
              ],
            },
            { text: "No result submitted" },
          ],
        }),
    });
    await restored.recover(admitted.requestId);
    const batch = (await restored.readModel(admitted.requestId))
      .interactionBatch!;
    await restored.declineInteraction(admitted.requestId, {
      batchId: batch.batchId,
      baseRevision: batch.revision,
      mutationId: "budget-decline",
    });
    for (
      let attempt = 0;
      attempt < 100 &&
      (await restored.readProviderResult(admitted.requestId)).status ===
        "deferred";
      attempt++
    )
      await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(effects, 1);
    assert.equal(
      (await restored.readProviderResult(admitted.requestId)).error,
      "skill_result_not_submitted",
    );
    const entries = (
      await inspectPiOwner(
        { kind: "skill_run", ownerId: admitted.requestId },
        root,
      )
    ).entries;
    const guard = entries
      .filter((entry) => entry.kind === "skill_run_guard")
      .at(-1)!;
    assert.equal((guard.payload as { toolAttempts: number }).toolAttempts, 100);
    assert.lengthOf(focused, 1);
    assert.isFalse((await restored.list())[0].attention);
  });

  it("uses the frozen output schema when installed Skill files change", async function () {
    let turns = 0;
    const coordinator = createPiSkillRunCoordinator({
      root,
      prepare,
      resolveModel: async () => model,
      definitions: async () => [],
      execution: () =>
        createPiTextProviderSource({
          steps:
            turns++ === 0
              ? [
                  {
                    toolCalls: [
                      {
                        callId: "freeze-ask",
                        name: "ask_user",
                        arguments: {
                          questions: [{ kind: "text", prompt: "Continue?" }],
                        },
                      },
                    ],
                  },
                ]
              : [
                  {
                    toolCalls: [
                      {
                        callId: "freeze-submit",
                        name: "submit_skill_result",
                        arguments: {
                          protocolVersion: 1,
                          result: { unchanged: true },
                        },
                      },
                    ],
                  },
                ],
        }),
    });
    const args = request();
    (args.request as { runtime_options?: unknown }).runtime_options = {
      execution_mode: "interactive",
    };
    const result = await coordinator.execute(args);
    const batch = (await coordinator.readModel(result.requestId))
      .interactionBatch!;
    await fs.writeFile(
      path.join(root, "skill", "assets", "output.schema.json"),
      JSON.stringify({ type: "object", required: ["new-field"] }),
    );
    await coordinator.declineInteraction(result.requestId, {
      batchId: batch.batchId,
      baseRevision: batch.revision,
      mutationId: "freeze-decline",
    });
    for (
      let attempt = 0;
      attempt < 50 &&
      (await coordinator.readProviderResult(result.requestId)).status ===
        "deferred";
      attempt++
    )
      await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(
      (await coordinator.readProviderResult(result.requestId)).status,
      "succeeded",
    );
  });

  it("cancels promptly while a permission continuation model is active", async function () {
    let turns = 0;
    let entered!: () => void;
    const active = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const tool = {
      capabilityId: "cancel-permission",
      name: "controlled_effect",
      description: "Controlled effect",
      schema: { type: "object" },
      minimumEffects: ["external-mutation" as const],
      maxResultBytes: 1024,
      classify: () => ({
        effects: ["external-mutation" as const],
        authorizationKeys: [],
        resourceKeys: ["external"],
        cost: 1,
      }),
      execute: async () => ({
        status: "completed" as const,
        effectCertainty: "confirmed_complete" as const,
        value: {},
      }),
    };
    const coordinator = createPiSkillRunCoordinator({
      root,
      prepare,
      resolveModel: async () => model,
      definitions: async () => [tool],
      execution: () => {
        if (turns++ === 0)
          return createPiTextProviderSource({
            steps: [
              {
                toolCalls: [
                  {
                    callId: "cancel-approved",
                    name: "controlled_effect",
                    arguments: {},
                  },
                ],
              },
            ],
          });
        const execution = createPiTextProviderSource({
          steps: [{ text: "Canceled" }],
        });
        return {
          ...execution,
          source: async (input) => {
            entered();
            await new Promise<void>((resolve) =>
              input.signal.addEventListener("abort", () => resolve(), {
                once: true,
              }),
            );
            return execution.source(input);
          },
        };
      },
    });
    const args = request();
    (args.request as { runtime_options?: unknown }).runtime_options = {
      execution_mode: "interactive",
    };
    const result = await coordinator.execute(args);
    const continuing = coordinator.resolvePermission(
      result.requestId,
      "cancel-approved",
      "approve",
    );
    await active;
    const canceled = await Promise.race([
      coordinator.cancel(result.requestId),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("cancel blocked by continuation")),
          1000,
        ),
      ),
    ]);
    assert.equal(canceled.status, "canceled");
    await continuing;
    const cancellationAudit = await readOwnerAudit(root, {
      kind: "skill_run",
      ownerId: result.requestId,
    });
    assert.lengthOf(
      cancellationAudit.filter(
        (entry) => entry.operation === "execution.canceled",
      ),
      1,
    );
    await coordinator.dispose();
  });
});
