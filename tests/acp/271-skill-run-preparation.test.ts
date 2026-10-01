import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ACP_SKILL_RUN_REQUEST_KIND } from "../../src/config/defaults";
import { createAcpSkillRunnerWorkspace } from "../../src/modules/acp/skillRun/acpSkillRunnerWorkspace";
import {
  SKILL_RUN_PREPARED_FILENAME,
  SKILL_RUN_PREPARED_SCHEMA,
  SkillRunPreparationError,
  prepareSkillRun,
  prepareSkillRunJob,
  readPreparedSkillRun,
  resolveSkillRunExecutionMode,
  verifyPreparedSkillRun,
} from "../../src/modules/skillRunPreparation";
import {
  SKILL_RUN_RESPONSE_SCHEMA,
  finalizeSkillRun,
  validateSkillRunSubmission,
} from "../../src/modules/skillRunFinalizer";
import {
  getAcpSkillRunRecord,
  resetAcpSkillRunsForTests,
  upsertAcpSkillRun,
} from "../../src/modules/acp/skillRun/acpSkillRunStore";
import { parseRunRecord } from "../../src/modules/acp/skillRun/acpSkillRunPersistence";

async function mkTempRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), "skill-run-prep-"));
}

async function createSkill(root: string) {
  const skillId = "demo-skill";
  const skillDir = path.join(root, "skills", skillId);
  await fs.mkdir(path.join(skillDir, "assets"), { recursive: true });
  await fs.writeFile(
    path.join(skillDir, "SKILL.md"),
    "---\nname: demo-skill\n---\n\n# Demo\n",
    "utf8",
  );
  await fs.writeFile(
    path.join(skillDir, "assets", "output.schema.json"),
    JSON.stringify({
      type: "object",
      required: ["ok"],
      properties: { ok: { const: true } },
      additionalProperties: true,
    }),
    "utf8",
  );
  await fs.writeFile(
    path.join(skillDir, "assets", "runner.json"),
    JSON.stringify({
      id: skillId,
      execution_modes: ["auto"],
      schemas: { output: "assets/output.schema.json" },
    }),
    "utf8",
  );
  return {
    skillDir,
    entry: {
      skillId,
      description: "Demo skill",
      sourceKind: "user" as const,
      sourceDir: skillDir,
      skillMdPath: path.join(skillDir, "SKILL.md"),
      runnerJsonPath: path.join(skillDir, "assets", "runner.json"),
      checksum: "sha256:test",
      diagnostics: [],
    },
  };
}

describe("skill run preparation and finalization", function () {
  let root = "";

  beforeEach(async function () {
    resetAcpSkillRunsForTests();
    root = await mkTempRoot();
  });

  afterEach(async function () {
    if (root) {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("resolves execution mode exactly without lowercasing or runner fallback", function () {
    const base = {
      kind: ACP_SKILL_RUN_REQUEST_KIND,
      skill_id: "demo-skill",
    } as const;
    assert.equal(resolveSkillRunExecutionMode({ ...base }), "auto");
    assert.equal(
      resolveSkillRunExecutionMode({
        ...base,
        runtime_options: { execution_mode: "interactive" },
      }),
      "interactive",
    );
    assert.throws(
      () =>
        resolveSkillRunExecutionMode({
          ...base,
          runtime_options: { execution_mode: "AUTO" },
        }),
      SkillRunPreparationError,
    );
    assert.equal(
      resolveSkillRunExecutionMode({
        ...base,
        runtime_options: { execution_mode: "  " },
      }),
      "auto",
    );
  });

  it("freezes an immutable, durable PreparedSkillRun owned by the caller requestId", async function () {
    const { entry } = await createSkill(root);
    const workspace = await createAcpSkillRunnerWorkspace({
      backendId: "acp",
      skillId: entry.skillId,
      requestId: "owner-request-1",
      rootDir: path.join(root, "runs"),
    });
    const prepared = await prepareSkillRun({
      request: {
        kind: ACP_SKILL_RUN_REQUEST_KIND,
        skill_id: entry.skillId,
        input: {},
      },
      workspace,
      backendId: "acp",
      skillEntry: entry,
      runnerJson: await readRunnerJson(entry.runnerJsonPath),
      executionMode: "auto",
      materialization: { primarySkillDir: entry.sourceDir },
    });
    assert.equal(prepared.schema, SKILL_RUN_PREPARED_SCHEMA);
    assert.equal(prepared.pipelineVersion, "v1");
    assert.equal(prepared.requestId, "owner-request-1");
    assert.isTrue(Object.isFrozen(prepared));
    assert.isTrue(Object.isFrozen(prepared.runnerJson));
    assert.deepEqual(prepared.schemas.output?.document, {
      type: "object",
      required: ["ok"],
      properties: { ok: { const: true } },
      additionalProperties: true,
    });
    assert.match(prepared.provenance.snapshotDigest, /^sha256:[0-9a-f]{64}$/);
    assert.equal(prepared.requestValidation.ok, true);
    const persisted = await readPreparedSkillRun(workspace.runtimeDir);
    assert.isOk(persisted);
    assert.equal(
      persisted?.provenance.snapshotDigest,
      prepared.provenance.snapshotDigest,
    );
    await fs.access(
      path.join(workspace.runtimeDir, SKILL_RUN_PREPARED_FILENAME),
    );
  });

  it("validates a submitted payload before sealing and keeps one contract with the finalizer", async function () {
    const { entry } = await createSkill(root);
    const frozen = await prepareSkillRun({
      request: {
        kind: ACP_SKILL_RUN_REQUEST_KIND,
        skill_id: entry.skillId,
      },
      workspace: await createAcpSkillRunnerWorkspace({
        backendId: "acp",
        skillId: entry.skillId,
        requestId: "owner-request-2",
        rootDir: path.join(root, "runs"),
      }),
      backendId: "acp",
      skillEntry: entry,
      runnerJson: await readRunnerJson(entry.runnerJsonPath),
      executionMode: "auto",
      materialization: { primarySkillDir: entry.sourceDir },
    });
    const accepted = await validateSkillRunSubmission({
      payload: { ok: true },
      prepared: frozen,
    });
    assert.isTrue(accepted.ok);
    const rejected = await validateSkillRunSubmission({
      payload: { ok: false },
      prepared: frozen,
    });
    assert.isFalse(rejected.ok);
    assert.isAtLeast(rejected.errors.length, 1);
  });

  it("fails closed when the frozen snapshot declares no output schema", async function () {
    const skillId = "no-schema-skill";
    const skillDir = path.join(root, "skills", skillId);
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(
      path.join(skillDir, "SKILL.md"),
      "---\nname: no-schema-skill\n---\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(skillDir, "runner.json"),
      JSON.stringify({ id: skillId, execution_modes: ["auto"] }),
      "utf8",
    );
    const entry = {
      skillId,
      description: "No schema",
      sourceKind: "user" as const,
      sourceDir: skillDir,
      skillMdPath: path.join(skillDir, "SKILL.md"),
      runnerJsonPath: path.join(skillDir, "runner.json"),
      checksum: "sha256:test",
      diagnostics: [],
    };
    const prepared = await prepareSkillRun({
      request: { kind: ACP_SKILL_RUN_REQUEST_KIND, skill_id: skillId },
      workspace: await createAcpSkillRunnerWorkspace({
        backendId: "acp",
        skillId,
        requestId: "owner-request-6",
        rootDir: path.join(root, "runs"),
      }),
      backendId: "acp",
      skillEntry: entry,
      runnerJson: await readRunnerJson(entry.runnerJsonPath),
      executionMode: "auto",
      materialization: { primarySkillDir: skillDir },
    });
    assert.isUndefined(prepared.schemas.output);
    const early = await validateSkillRunSubmission({
      prepared,
      payload: { ok: true },
    });
    assert.isFalse(early.ok);
    assert.include(
      early.errors.join(" "),
      "missing from the prepared skill run snapshot",
    );
    // A Schema appearing in the package later must not rescue a frozen snapshot.
    await fs.mkdir(path.join(skillDir, "assets"), { recursive: true });
    await fs.writeFile(
      path.join(skillDir, "assets", "output.schema.json"),
      JSON.stringify({ type: "object", additionalProperties: true }),
      "utf8",
    );
    const afterDiskChange = await validateSkillRunSubmission({
      prepared,
      payload: { ok: true },
    });
    assert.isFalse(afterDiskChange.ok);
    const finalized = await finalizeSkillRun({
      prepared,
      payload: { ok: true },
      backend: { id: "acp", type: "acp" },
    });
    assert.isFalse(finalized.ok);
  });

  it("emits a sanitized execution receipt and the real output on the output channel", async function () {
    const { entry } = await createSkill(root);
    const workspace = await createAcpSkillRunnerWorkspace({
      backendId: "acp",
      skillId: entry.skillId,
      requestId: "owner-request-3",
      rootDir: path.join(root, "runs"),
    });
    const prepared = await prepareSkillRun({
      request: {
        kind: ACP_SKILL_RUN_REQUEST_KIND,
        skill_id: entry.skillId,
      },
      workspace,
      backendId: "acp",
      skillEntry: entry,
      runnerJson: await readRunnerJson(entry.runnerJsonPath),
      executionMode: "auto",
      materialization: { primarySkillDir: entry.sourceDir },
    });
    const finalized = await finalizeSkillRun({
      prepared,
      payload: { ok: true },
      backend: { id: "acp", type: "acp" },
    });
    assert.isTrue(finalized.ok);
    if (!finalized.ok) {
      return;
    }
    assert.deepEqual(finalized.resultJson, { ok: true });
    assert.equal(finalized.responseJson.schema, SKILL_RUN_RESPONSE_SCHEMA);
    assert.equal(finalized.responseJson.status, "succeeded");
    assert.equal(finalized.responseJson.backend.id, "acp");
    assert.equal(finalized.responseJson.requestId, "owner-request-3");
    assert.match(finalized.resultDigest, /^sha256:[0-9a-f]{64}$/);
    const receiptText = JSON.stringify(finalized.responseJson);
    assert.notInclude(receiptText, workspace.workspaceDir);
    assert.notInclude(receiptText, workspace.resultJsonPath);
    assert.notInclude(receiptText, '"ok"');
    const onDisk = JSON.parse(
      await fs.readFile(workspace.resultJsonPath, "utf8"),
    );
    assert.deepEqual(onDisk, { ok: true });
  });

  it("seals against the frozen snapshot schema even if the Skill package changes", async function () {
    const { entry } = await createSkill(root);
    const workspace = await createAcpSkillRunnerWorkspace({
      backendId: "acp",
      skillId: entry.skillId,
      requestId: "owner-request-4",
      rootDir: path.join(root, "runs"),
    });
    const prepared = await prepareSkillRun({
      request: {
        kind: ACP_SKILL_RUN_REQUEST_KIND,
        skill_id: entry.skillId,
      },
      workspace,
      backendId: "acp",
      skillEntry: entry,
      runnerJson: await readRunnerJson(entry.runnerJsonPath),
      executionMode: "auto",
      materialization: { primarySkillDir: entry.sourceDir },
    });
    await fs.writeFile(
      path.join(entry.sourceDir, "assets", "output.schema.json"),
      JSON.stringify({
        type: "object",
        required: ["changed"],
        properties: { changed: { const: true } },
      }),
      "utf8",
    );
    const finalized = await finalizeSkillRun({
      prepared,
      payload: { ok: true },
      backend: { id: "acp", type: "acp" },
    });
    assert.isTrue(finalized.ok);
  });

  it("persists the pipeline version and keeps missing-field records legacy", function () {
    assert.equal(
      parseRunRecord({ requestId: "legacy-run", status: "running" })
        ?.skillRunPipelineVersion,
      "legacy",
    );
    assert.equal(
      parseRunRecord({
        requestId: "v1-run",
        status: "running",
        skillRunPipelineVersion: "v1",
      })?.skillRunPipelineVersion,
      "v1",
    );
    upsertAcpSkillRun({
      requestId: "new-run",
      status: "queued",
      backendId: "acp",
      backendType: "acp",
      skillRunPipelineVersion: "v1",
    });
    assert.equal(
      getAcpSkillRunRecord("new-run")?.skillRunPipelineVersion,
      "v1",
    );
    upsertAcpSkillRun({
      requestId: "default-run",
      status: "queued",
      backendId: "acp",
      backendType: "acp",
    });
    assert.equal(
      getAcpSkillRunRecord("default-run")?.skillRunPipelineVersion,
      "legacy",
    );
  });

  it("prepares a run through the neutral entry with an injected materializer", async function () {
    const { entry } = await createSkill(root);
    const result = await prepareSkillRunJob({
      request: {
        kind: ACP_SKILL_RUN_REQUEST_KIND,
        skill_id: entry.skillId,
      },
      requestId: "owner-request-5",
      backendId: "builtin-pi",
      root: path.join(root, "runs"),
      registry: {
        entries: [entry],
        entriesById: { [entry.skillId]: entry },
        diagnostics: [],
      },
      materialize: async ({ skillEntry }) => ({
        primarySkillDir: skillEntry.sourceDir,
        proxySkillCount: 0,
      }),
    });
    assert.equal(result.prepared.requestId, "owner-request-5");
    assert.equal(result.prepared.backendId, "builtin-pi");
    assert.equal(result.prepared.skillId, entry.skillId);
    assert.equal(result.workspace.requestId, "owner-request-5");
  });

  it("accepts a skillrunner.job.v1 request with workspace runtime options", async function () {
    const { entry } = await createSkill(root);
    const result = await prepareSkillRunJob({
      request: {
        kind: "skillrunner.job.v1",
        skill_id: entry.skillId,
        runtime_options: {
          execution_mode: "interactive",
          workspace: { mode: "new", workflow_run_id: "run-1" },
        },
      },
      requestId: "owner-request-7",
      backendId: "builtin-pi",
      root: path.join(root, "runs"),
      registry: {
        entries: [entry],
        entriesById: { [entry.skillId]: entry },
        diagnostics: [],
      },
      materialize: async ({ skillEntry }) => ({
        primarySkillDir: skillEntry.sourceDir,
      }),
    });
    assert.equal(result.prepared.executionMode, "interactive");
    assert.equal(result.prepared.workflowId, undefined);
  });

  it("stages declared uploads into owned run-local inputs without leaking the source path", async function () {
    const { entry } = await createSkill(root);
    const sourcePath = path.join(root, "host", "report.txt");
    await fs.mkdir(path.dirname(sourcePath), { recursive: true });
    await fs.writeFile(sourcePath, "staged-content", "utf8");
    const result = await prepareSkillRunJob({
      request: {
        kind: "skillrunner.job.v1",
        skill_id: entry.skillId,
        input: { report: sourcePath },
        upload_files: [{ key: "report", path: sourcePath }],
      },
      requestId: "owner-request-8",
      backendId: "builtin-pi",
      root: path.join(root, "runs"),
      registry: {
        entries: [entry],
        entriesById: { [entry.skillId]: entry },
        diagnostics: [],
      },
      materialize: async ({ skillEntry }) => ({
        primarySkillDir: skillEntry.sourceDir,
      }),
    });
    const ownedPath = String(result.prepared.inputs.input.report || "");
    assert.include(ownedPath.replace(/\\/g, "/"), ".skill-run-inputs/report/");
    assert.notEqual(ownedPath, sourcePath);
    assert.equal(await fs.readFile(ownedPath, "utf8"), "staged-content");
    assert.equal(result.prepared.inputs.files.length, 1);
    assert.match(
      result.prepared.inputs.files[0].digest,
      /^sha256:[0-9a-f]{64}$/,
    );
    assert.notInclude(
      JSON.stringify(result.prepared),
      sourcePath.replace(/\\/g, "/"),
    );
  });

  it("rejects a durable snapshot whose stored digest no longer matches", async function () {
    const { entry } = await createSkill(root);
    const prepared = await prepareSkillRun({
      request: { kind: ACP_SKILL_RUN_REQUEST_KIND, skill_id: entry.skillId },
      workspace: await createAcpSkillRunnerWorkspace({
        backendId: "acp",
        skillId: entry.skillId,
        requestId: "owner-request-9",
        rootDir: path.join(root, "runs"),
      }),
      backendId: "acp",
      skillEntry: entry,
      runnerJson: await readRunnerJson(entry.runnerJsonPath),
      executionMode: "auto",
      materialization: { primarySkillDir: entry.sourceDir },
    });
    assert.isTrue(await verifyPreparedSkillRun(prepared));
    const snapshotPath = path.join(
      prepared.workspace.runtimeDir,
      SKILL_RUN_PREPARED_FILENAME,
    );
    await fs.writeFile(
      snapshotPath,
      JSON.stringify({
        ...prepared,
        provenance: {
          ...prepared.provenance,
          snapshotDigest: "sha256:deadbeef",
        },
      }),
      "utf8",
    );
    assert.isNull(await readPreparedSkillRun(prepared.workspace.runtimeDir));
  });
});

async function readRunnerJson(runnerJsonPath: string) {
  return JSON.parse(await fs.readFile(runnerJsonPath, "utf8")) as Record<
    string,
    unknown
  >;
}
