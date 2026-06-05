import { assert } from "chai";
import { adaptSkillRunnerJobToAcpSkillRun } from "../../src/modules/acpSkillRunRequestAdapter";
import { ACP_SKILL_RUN_REQUEST_KIND } from "../../src/config/defaults";
import { buildAcpSkillRunPrompt } from "../../src/modules/acpSkillRunPromptBuilder";

describe("ACP skill run request adapter", function () {
  it("converts upload-derived input paths to absolute local paths", function () {
    const adapted = adaptSkillRunnerJobToAcpSkillRun({
      kind: "skillrunner.job.v1",
      skill_id: "literature-digest",
      taskName: "Example",
      targetParentID: 123,
      sourceAttachmentPaths: ["D:/real/example.md"],
      upload_files: [{ key: "source_path", path: "D:/real/example.md" }],
      input: {
        source_path: "inputs/source_path/example.md",
        language_hint: "zh-CN",
      },
      parameter: { language: "zh-CN" },
      runtime_options: { execution_mode: "auto" },
      poll: { interval_ms: 1000, timeout_ms: 120000 },
      fetch_type: "result",
    });

    assert.equal(adapted.kind, ACP_SKILL_RUN_REQUEST_KIND);
    assert.equal(adapted.skill_id, "literature-digest");
    assert.deepEqual(adapted.input, {
      source_path: "D:/real/example.md",
      language_hint: "zh-CN",
    });
    assert.deepEqual(adapted.parameter, { language: "zh-CN" });
    assert.deepEqual(adapted.runtime_options, { execution_mode: "auto" });
    assert.deepEqual(adapted.sourceAttachmentPaths, ["D:/real/example.md"]);
    assert.equal(adapted.targetParentID, 123);
    assert.notProperty(
      adapted as unknown as Record<string, unknown>,
      "upload_files",
    );
  });

  it("converts multiple upload keys", function () {
    const adapted = adaptSkillRunnerJobToAcpSkillRun({
      kind: "skillrunner.job.v1",
      skill_id: "two-inputs",
      upload_files: [
        { key: "source_path", path: "D:/real/source.md" },
        { key: "valid_tags", path: "D:/real/tags.yaml" },
      ],
      input: {
        source_path: "inputs/source_path/source.md",
        valid_tags: "inputs/valid_tags/tags.yaml",
      },
    });

    assert.deepEqual(adapted.input, {
      source_path: "D:/real/source.md",
      valid_tags: "D:/real/tags.yaml",
    });
  });

  it("injects ZoteroHostAccess runtime options only during ACP adaptation", function () {
    const adapted = adaptSkillRunnerJobToAcpSkillRun(
      {
        kind: "skillrunner.job.v1",
        skill_id: "literature-search-ingest",
        runtime_options: { execution_mode: "interactive" },
        parameter: { query: "exact paper" },
      },
      {
        manifest: {
          id: "literature-search-ingest",
          label: "Literature Search Ingest",
          provider: "acp",
          execution: {
            zoteroHostAccess: {
              required: true,
              allowWriteApprovalBypass: true,
            },
          },
          request: { kind: "skillrunner.job.v1" },
          hooks: { applyResult: "hooks/applyResult.js" },
        },
        runOptions: {
          zoteroHostAccess: {
            autoApproveWrites: true,
          },
        },
      },
    );

    assert.deepEqual(adapted.runtime_options, {
      execution_mode: "interactive",
      zotero_host_access: {
        required: true,
        auto_approve_writes: true,
      },
    });
  });

  it("preserves explicit disabled ZoteroHostAccess during ACP adaptation", function () {
    const adapted = adaptSkillRunnerJobToAcpSkillRun(
      {
        kind: "skillrunner.job.v1",
        skill_id: "no-host-access",
      },
      {
        manifest: {
          id: "no-host-access",
          label: "No Host Access",
          provider: "acp",
          execution: {
            zoteroHostAccess: {
              required: false,
            },
          },
          request: { kind: "skillrunner.job.v1" },
          hooks: { applyResult: "hooks/applyResult.js" },
        },
      },
    );

    assert.deepEqual(adapted.runtime_options, {
      zotero_host_access: {
        required: false,
      },
    });
  });

  it("rejects missing upload key input mapping", function () {
    assert.throws(
      () =>
        adaptSkillRunnerJobToAcpSkillRun({
          kind: "skillrunner.job.v1",
          skill_id: "literature-digest",
          upload_files: [{ key: "source_path", path: "D:/real/example.md" }],
          input: {},
        }),
      /input\.source_path/i,
    );
  });

  it("rejects non-absolute upload file paths", function () {
    assert.throws(
      () =>
        adaptSkillRunnerJobToAcpSkillRun({
          kind: "skillrunner.job.v1",
          skill_id: "literature-digest",
          upload_files: [{ key: "source_path", path: "relative/example.md" }],
          input: { source_path: "inputs/source_path/example.md" },
        }),
      /absolute local path/i,
    );
  });

  it("renders ACP prompts with local absolute input paths", async function () {
    const prompt = await buildAcpSkillRunPrompt({
      context: {
        skillId: "literature-digest",
        workspace: {
          requestId: "run-1",
          workspaceDir: "D:/runtime/run-1",
          runtimeDir: "D:/runtime/run-1/.acp",
          resultDir: "D:/runtime/run-1/result",
          resultJsonPath: "D:/runtime/run-1/result/result.json",
          auditDir: "D:/runtime/run-1/.audit",
          inputManifestPath: "D:/runtime/run-1/.audit/input_manifest.json",
        },
        backend: {
          id: "acp-local",
          type: "acp",
          baseUrl: "local://acp",
        },
        agentFamily: "claude-code",
        proxySkillRoots: ["D:/runtime/run-1/.claude/skills"],
        requestedSkillProxyPath:
          "D:/runtime/run-1/.claude/skills/literature-digest",
        sharedSkillCatalogPath: "D:/runtime/catalog",
      },
      request: {
        kind: ACP_SKILL_RUN_REQUEST_KIND,
        skill_id: "literature-digest",
        input: {
          source_path: "D:/real/example.md",
        },
        parameter: {
          language: "zh-CN",
        },
      },
    });

    assert.include(prompt, "source_path: D:/real/example.md");
    assert.notInclude(prompt, "inputs/source_path");
  });

  it("renders Opencode ACP skill invocation as natural language", async function () {
    const prompt = await buildAcpSkillRunPrompt({
      context: {
        skillId: "literature-digest",
        workspace: {
          requestId: "run-1",
          workspaceDir: "D:/runtime/run-1",
          runtimeDir: "D:/runtime/run-1/.acp",
          resultDir: "D:/runtime/run-1/result",
          resultJsonPath: "D:/runtime/run-1/result/result.json",
          auditDir: "D:/runtime/run-1/.audit",
          inputManifestPath: "D:/runtime/run-1/.audit/input_manifest.json",
        },
        backend: {
          id: "acp-opencode",
          type: "acp",
          baseUrl: "local://acp-opencode",
        },
        agentFamily: "opencode",
        proxySkillRoots: [
          "D:/runtime/run-1/.agents/skills",
          "D:/runtime/run-1/.claude/skills",
        ],
        requestedSkillProxyPath:
          "D:/runtime/run-1/.agents/skills/literature-digest",
        sharedSkillCatalogPath: "D:/runtime/catalog",
      },
      request: {
        kind: ACP_SKILL_RUN_REQUEST_KIND,
        skill_id: "literature-digest",
      },
    });

    assert.match(prompt, /^Invoke skill named literature-digest/m);
    assert.notInclude(prompt, "/skills literature-digest");
  });

  it("renders runner entrypoint common prompts with resolved contexts", async function () {
    const prompt = await buildAcpSkillRunPrompt({
      context: {
        skillId: "literature-digest",
        workspace: {
          requestId: "run-1",
          workspaceDir: "D:/runtime/run-1",
          runtimeDir: "D:/runtime/run-1/.acp",
          resultDir: "D:/runtime/run-1/result",
          resultJsonPath: "D:/runtime/run-1/result/result.json",
          auditDir: "D:/runtime/run-1/.audit",
          inputManifestPath: "D:/runtime/run-1/.audit/input_manifest.json",
        },
        backend: {
          id: "acp-local",
          type: "acp",
          baseUrl: "local://acp",
        },
        agentFamily: "claude-code",
        proxySkillRoots: ["D:/runtime/run-1/.claude/skills"],
        requestedSkillProxyPath:
          "D:/runtime/run-1/.claude/skills/literature-digest",
        sharedSkillCatalogPath: "D:/runtime/catalog",
      },
      request: {
        kind: ACP_SKILL_RUN_REQUEST_KIND,
        skill_id: "literature-digest",
        input: {
          source_path: "inputs/source_path/example.md",
        },
        parameter: {
          language: "en-US",
        },
      },
      inputContext: {
        source_path: "D:/real/example.md",
      },
      parameterContext: {
        language: "zh-CN",
      },
      runnerJson: {
        id: "literature-digest",
        entrypoint: {
          prompts: {
            common:
              "Run {{ skill.id }} with {{ input.source_path }}, {{ parameter.language }}, {{ run_dir }}, {{ engine_id }}.",
          },
        },
      },
    });

    assert.include(
      prompt,
      "Run literature-digest with D:/real/example.md, zh-CN, D:/runtime/run-1, claude.",
    );
    assert.notInclude(prompt, "{{ input.source_path }}");
    assert.notInclude(prompt, "inputs/source_path");
  });
});
