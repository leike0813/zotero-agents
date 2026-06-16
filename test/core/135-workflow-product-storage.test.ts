import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { pathToFileURL } from "url";
import { createWorkflowResultContext } from "../../src/modules/workflowExecution/resultContext";
import { executeApplyResult } from "../../src/workflows/runtime";
import {
  buildSkillRunFeedbackExportMarkdown,
  createProductStorageApi,
  exportSkillRunFeedbackMarkdownFile,
  getWorkflowProduct,
  listSkillRunFeedbackProducts,
  readProductAssetPreview,
  removeWorkflowProduct,
  SKILL_RUN_FEEDBACK_ASSET_ID,
  WORKFLOW_PRODUCT_KIND_SKILL_RUN_FEEDBACK,
} from "../../src/modules/workflowProductStore";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";
import { collectSkillRunFeedbackSidecar } from "../../src/modules/skillRunFeedback";

describe("workflow product storage", function () {
  let previousRoot: string | undefined;
  let tempRoot: string;

  beforeEach(async function () {
    previousRoot = process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "zs-product-runtime-"));
    process.env.ZOTERO_SKILLS_RUNTIME_ROOT = tempRoot;
    resetPluginStateStoreForTests();
  });

  afterEach(async function () {
    resetPluginStateStoreForTests();
    if (typeof previousRoot === "undefined") {
      delete process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    } else {
      process.env.ZOTERO_SKILLS_RUNTIME_ROOT = previousRoot;
    }
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it("copies ACP-style local workspace assets into product cache", async function () {
    const requestId = `req-product-local-${Date.now()}`;
    const workspaceDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "zs-product-local-"),
    );
    await fs.mkdir(path.join(workspaceDir, "result"), { recursive: true });
    await fs.writeFile(
      path.join(workspaceDir, "result", "writing-plan.json"),
      JSON.stringify({ title: "Plan" }),
      "utf8",
    );
    const resultContext = await createWorkflowResultContext({
      runResult: {
        status: "succeeded",
        requestId,
        fetchType: "result",
        workspaceDir,
        resultJson: { kind: "writing.test" },
      },
      bundleReader: {
        async readText() {
          throw new Error("bundle should not be used");
        },
      },
      manifest: { result: { expects: { result_json: "result/result.json" } } },
    });
    const api = createProductStorageApi({
      manifest: { id: "wf-product", label: "Workflow Product" },
      resultContext,
      runResult: {
        requestId,
        responseJson: { provider: "acp" },
      },
    });
    const record = await api.registerProduct({
      productKey: "draft",
      kind: "writing.test",
      title: "Local Product",
      assets: [
        {
          assetId: "plan",
          label: "Plan",
          rawPath: "result/writing-plan.json",
          contentType: "application/json",
        },
      ],
    });
    try {
      assert.equal(record.storageMode, "persistent-cache");
      assert.equal(record.assets[0].sourceKind, "product-cache");
      assert.isString(record.cacheDir);
      assert.notInclude(record.assets[0].localPath || "", workspaceDir);
      assert.include(
        (record.assets[0].localPath || "").replace(/\\/g, "/"),
        (record.cacheDir || "").replace(/\\/g, "/"),
      );
      await fs.writeFile(
        path.join(workspaceDir, "result", "writing-plan.json"),
        JSON.stringify({ title: "Changed" }),
        "utf8",
      );
      const preview = await readProductAssetPreview(record.productId, "plan");
      assert.equal(preview.kind, "json");
      assert.include(preview.formattedText || "", '"title": "Plan"');
      assert.notInclude(preview.formattedText || "", "Changed");
    } finally {
      removeWorkflowProduct(record.productId);
    }
  });

  it("caches SkillRunner-style bundle assets for later preview", async function () {
    const requestId = `req-product-bundle-${Date.now()}`;
    const resultContext = await createWorkflowResultContext({
      runResult: {
        status: "succeeded",
        requestId,
        fetchType: "bundle",
        resultJson: { kind: "writing.test" },
      },
      bundleReader: {
        async readText(entryPath: string) {
          if (entryPath === "result/intro.md") {
            return "# Intro\n\nBody";
          }
          throw new Error(`unexpected entry ${entryPath}`);
        },
      },
      manifest: { result: { expects: { result_json: "result/result.json" } } },
    });
    const api = createProductStorageApi({
      manifest: { id: "wf-product", label: "Workflow Product" },
      resultContext,
      runResult: {
        requestId,
        responseJson: { provider: "skillrunner" },
      },
    });
    const record = await api.registerProduct({
      productKey: "draft",
      kind: "writing.test",
      title: "Bundle Product",
      assets: [
        {
          assetId: "intro",
          label: "Intro",
          rawPath: "result/intro.md",
          productAssetPath: "draft/intro.md",
          contentType: "text/markdown",
        },
      ],
    });
    try {
      assert.equal(record.storageMode, "persistent-cache");
      assert.equal(record.assets[0].sourceKind, "product-cache");
      assert.isTrue(Boolean(record.assets[0].localPath));
      const loaded = getWorkflowProduct(record.productId);
      assert.equal(loaded?.assets[0].path, "draft/intro.md");
      const preview = await readProductAssetPreview(record.productId, "intro");
      assert.equal(preview.kind, "markdown");
      assert.include(preview.text, "# Intro");
    } finally {
      removeWorkflowProduct(record.productId);
    }
  });

  it("collects skill run feedback sidecar as a dedicated product", async function () {
    const requestId = `req-feedback-${Date.now()}`;
    const workspaceDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "zs-feedback-"),
    );
    const resultDir = path.join(workspaceDir, "result", "demo-skill.1");
    await fs.mkdir(resultDir, { recursive: true });
    const resultJsonPath = path.join(resultDir, "result.json");
    const feedbackPath = path.join(resultDir, "_skill_run_feedback.md");
    await fs.writeFile(resultJsonPath, JSON.stringify({ ok: true }), "utf8");
    await fs.writeFile(
      feedbackPath,
      "## Run feedback\n\nMissing context was handled manually.",
      "utf8",
    );
    const resultContext = await createWorkflowResultContext({
      runResult: {
        status: "succeeded",
        requestId,
        fetchType: "result",
        workspaceDir,
        resultJsonPath,
      },
      bundleReader: {
        async readText() {
          throw new Error("bundle should not be used");
        },
      },
      manifest: { result: { expects: { result_json: "result/result.json" } } },
    });
    const collected = await collectSkillRunFeedbackSidecar({
      workflow: { manifest: { id: "wf-feedback", label: "Feedback WF" } },
      request: {
        kind: "acp.skill.run.v1",
        skill_id: "demo-skill",
        runtime_options: { collect_skill_run_feedback: true },
      },
      runResult: {
        requestId,
        backendId: "acp-local",
        backendType: "acp",
        runId: "run-feedback",
        workspaceDir,
        resultJsonPath,
      },
      resultContext,
      bundleReader: {
        async readText() {
          throw new Error("bundle should not be used");
        },
      },
      jobId: "job-feedback",
    });
    assert.equal(collected.collected, true);
    const products = listSkillRunFeedbackProducts("demo-skill");
    assert.lengthOf(products, 1);
    assert.equal(products[0].kind, WORKFLOW_PRODUCT_KIND_SKILL_RUN_FEEDBACK);
    assert.equal(products[0].metadata.skillId, "demo-skill");
    assert.equal(products[0].assets[0].assetId, SKILL_RUN_FEEDBACK_ASSET_ID);
    const preview = await readProductAssetPreview(
      products[0].productId,
      SKILL_RUN_FEEDBACK_ASSET_ID,
    );
    assert.include(preview.text, "Missing context");
    const exported = await buildSkillRunFeedbackExportMarkdown([
      products[0].productId,
    ]);
    assert.include(exported, "skillId: demo-skill");
    assert.include(exported, "Missing context");
    const exportedFile = await exportSkillRunFeedbackMarkdownFile([
      products[0].productId,
    ]);
    assert.include(
      await fs.readFile(exportedFile.filePath, "utf8"),
      "Missing context",
    );
  });

  it("collects final sequence step feedback from workflow declaration", async function () {
    const requestId = `req-feedback-sequence-${Date.now()}`;
    const workspaceDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "zs-feedback-sequence-"),
    );
    const resultDir = path.join(
      workspaceDir,
      "result",
      "literature-deep-reading.1",
    );
    await fs.mkdir(resultDir, { recursive: true });
    const resultJsonPath = path.join(resultDir, "result.json");
    await fs.writeFile(resultJsonPath, JSON.stringify({ ok: true }), "utf8");
    await fs.writeFile(
      path.join(resultDir, "_skill_run_feedback.md"),
      "## Deep reading feedback\n\nFinal stage notes.",
      "utf8",
    );
    const runResult = {
      status: "succeeded",
      requestId,
      fetchType: "result",
      resultJson: { ok: true },
      responseJson: {
        provider: "acp",
        workspaceDir,
        resultJsonPath,
      },
    };
    const resultContext = await createWorkflowResultContext({
      runResult,
      bundleReader: {
        async readText() {
          throw new Error("bundle should not be used");
        },
      },
      manifest: { result: { expects: { result_json: "result/result.json" } } },
    });
    const collected = await collectSkillRunFeedbackSidecar({
      workflow: {
        manifest: { id: "literature-deep-reading", label: "Deep Reading" },
      },
      request: {
        kind: "skillrunner.sequence.v1",
        final_step_id: "deep-read",
        runtime_options: { collect_skill_run_feedback: true },
        steps: [
          { id: "translate", skill_id: "literature-translator" },
          { id: "deep-read", skill_id: "literature-deep-reading" },
        ],
      },
      runResult,
      resultContext,
      bundleReader: {
        async readText() {
          throw new Error("bundle should not be used");
        },
      },
      jobId: "job-sequence",
    });
    assert.equal(collected.collected, true);
    const products = listSkillRunFeedbackProducts("literature-deep-reading");
    assert.lengthOf(products, 1);
    assert.equal(products[0].metadata.sequenceStepId, "deep-read");
    const preview = await readProductAssetPreview(
      products[0].productId,
      SKILL_RUN_FEEDBACK_ASSET_ID,
    );
    assert.include(preview.text, "Final stage notes");
  });

  it("skips SkillRunner feedback collection for result fetches", async function () {
    const requestId = `req-feedback-skillrunner-${Date.now()}`;
    const workspaceDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "zs-feedback-skillrunner-"),
    );
    const resultDir = path.join(
      workspaceDir,
      "result",
      "literature-explainer.1",
    );
    await fs.mkdir(resultDir, { recursive: true });
    const resultJsonPath = path.join(resultDir, "result.json");
    await fs.writeFile(resultJsonPath, JSON.stringify({ ok: true }), "utf8");
    await fs.writeFile(
      path.join(resultDir, "_skill_run_feedback.md"),
      "## Explainer feedback\n\nWorkspace sidecar was available.",
      "utf8",
    );
    const runResult = {
      status: "succeeded",
      requestId,
      fetchType: "result",
      resultJson: { ok: true },
      responseJson: {
        provider: "skillrunner",
        workspace_dir: workspaceDir,
        result_json_path: resultJsonPath,
      },
    };
    const resultContext = await createWorkflowResultContext({
      runResult,
      bundleReader: {
        async readText() {
          throw new Error("bundle should not be used");
        },
      },
      manifest: { result: { expects: { result_json: "result/result.json" } } },
    });
    const collected = await collectSkillRunFeedbackSidecar({
      workflow: {
        manifest: { id: "literature-explainer", label: "Explainer" },
      },
      request: {
        kind: "skillrunner.job.v1",
        skill_id: "literature-explainer",
        runtime_options: { collect_skill_run_feedback: true },
      },
      runResult,
      resultContext,
      bundleReader: {
        async readText() {
          throw new Error("bundle should not be used");
        },
      },
      jobId: "job-skillrunner",
    });
    assert.equal(collected.collected, false);
    assert.equal((collected as any).reason, "skillrunner-non-bundle");
    const products = listSkillRunFeedbackProducts("literature-explainer");
    assert.lengthOf(products, 0);
  });

  it("collects SkillRunner feedback from bundle fetches", async function () {
    const requestId = `req-feedback-skillrunner-bundle-${Date.now()}`;
    const runResult = {
      status: "succeeded",
      requestId,
      fetchType: "bundle",
      resultJson: { ok: true },
      responseJson: {
        provider: "skillrunner",
      },
    };
    const bundleReader = {
      async readText(entryPath: string) {
        if (
          entryPath === "result/literature-explainer.1/_skill_run_feedback.md"
        ) {
          return "## Explainer feedback\n\nBundle sidecar was available.";
        }
        throw new Error(`unexpected bundle entry: ${entryPath}`);
      },
    };
    const resultContext = await createWorkflowResultContext({
      runResult,
      bundleReader,
      manifest: { result: { expects: { result_json: "result/result.json" } } },
    });
    const collected = await collectSkillRunFeedbackSidecar({
      workflow: {
        manifest: { id: "literature-explainer", label: "Explainer" },
      },
      request: {
        kind: "skillrunner.job.v1",
        skill_id: "literature-explainer",
        runtime_options: { collect_skill_run_feedback: true },
      },
      runResult,
      resultContext,
      bundleReader,
      jobId: "job-skillrunner-bundle",
    });
    assert.equal(collected.collected, true);
    const products = listSkillRunFeedbackProducts("literature-explainer");
    assert.lengthOf(products, 1);
    const preview = await readProductAssetPreview(
      products[0].productId,
      SKILL_RUN_FEEDBACK_ASSET_ID,
    );
    assert.include(preview.text, "Bundle sidecar was available");
  });

  it("keeps product storage open to non-manuscript workflows", async function () {
    const requestId = `req-product-open-api-${Date.now()}`;
    const workspaceDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "zs-product-open-api-"),
    );
    await fs.mkdir(path.join(workspaceDir, "result"), { recursive: true });
    await fs.writeFile(
      path.join(workspaceDir, "result", "artifact.md"),
      "# Open API",
      "utf8",
    );
    const resultContext = await createWorkflowResultContext({
      runResult: {
        status: "succeeded",
        requestId,
        fetchType: "result",
        workspaceDir,
        resultJson: { kind: "custom.workflow.product" },
      },
      bundleReader: {
        async readText() {
          throw new Error("bundle should not be used");
        },
      },
      manifest: { result: { expects: { result_json: "result/result.json" } } },
    });
    const api = createProductStorageApi({
      manifest: { id: "custom-product-workflow", label: "Custom Product" },
      resultContext,
      runResult: { requestId, responseJson: { provider: "acp" } },
    });
    const record = await api.registerProduct({
      productKey: "custom",
      kind: "custom.workflow.product",
      title: "Custom Product",
      assets: [
        {
          assetId: "artifact",
          rawPath: "result/artifact.md",
          contentType: "text/markdown",
        },
      ],
    });
    try {
      assert.equal(record.workflowId, "custom-product-workflow");
      assert.equal(record.storageMode, "persistent-cache");
      assert.equal(record.assets[0].sourceKind, "product-cache");
    } finally {
      removeWorkflowProduct(record.productId);
    }
  });

  it("caches manuscript literature framing assets from bundle entries", async function () {
    const requestId = `req-product-manuscript-bundle-${Date.now()}`;
    const bundleEntries: Record<string, string> = {
      "result/result.json": JSON.stringify({
        kind: "writing.manuscript_literature_framing",
      }),
      "result/introduction.tex": "\\section{Introduction}",
      "result/related-work.tex": "\\section{Related Work}",
    };
    const resultContext = await createWorkflowResultContext({
      runResult: {
        status: "succeeded",
        requestId,
        fetchType: "bundle",
      },
      bundleReader: {
        async readText(entryPath: string) {
          if (Object.prototype.hasOwnProperty.call(bundleEntries, entryPath)) {
            return bundleEntries[entryPath];
          }
          throw new Error(`missing bundle entry: ${entryPath}`);
        },
      },
      manifest: { result: { expects: { result_json: "result/result.json" } } },
    });
    const api = createProductStorageApi({
      manifest: {
        id: "manuscript-literature-framing",
        label: "Manuscript Literature Framing",
      },
      resultContext,
      runResult: { requestId, responseJson: { provider: "skillrunner" } },
    });
    const record = await api.registerProduct({
      productKey: "manuscript-literature-framing",
      kind: "writing.manuscript_literature_framing",
      title: "Manuscript Literature Framing",
      assets: [
        {
          assetId: "introduction_tex",
          label: "Introduction",
          rawPath: "D:/remote/run/result/introduction.tex",
          fallbackPath: "result/introduction.tex",
          contentType: "text/x-tex",
        },
        {
          assetId: "related_work_tex",
          label: "Related Work",
          rawPath: "result/related-work.tex",
          fallbackPath: "result/related-work.tex",
          contentType: "text/x-tex",
        },
      ],
    });
    try {
      assert.equal(record.assets[0].sourceKind, "product-cache");
      assert.equal(record.assets[0].entryPath, "result/introduction.tex");
      const preview = await readProductAssetPreview(
        record.productId,
        "introduction_tex",
      );
      assert.include(preview.text, "\\section{Introduction}");
    } finally {
      removeWorkflowProduct(record.productId);
    }
  });

  it("registers manuscript literature framing products only for succeeded writing results", async function () {
    const hookUrl = pathToFileURL(
      path.resolve(
        "workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs",
      ),
    ).href;
    const hook = await import(`${hookUrl}?t=${Date.now()}`);
    const calls: any[] = [];
    const productStorage = {
      async registerProduct(input: any) {
        calls.push(input);
        return {
          productId: "product-manuscript",
          storageMode: "persistent-cache",
          assets: [{ assetId: "introduction_tex" }],
        };
      },
    };
    const baseResultContext = {
      resultJson: {
        kind: "writing.manuscript_literature_framing",
        assets: {},
      },
    };

    const failed = await hook.applyResult({
      resultContext: baseResultContext,
      runResult: { status: "failed" },
      productStorage,
    });
    const businessCanceled = await hook.applyResult({
      resultContext: {
        resultJson: {
          kind: "writing.manuscript_literature_framing_canceled",
          assets: {},
        },
      },
      runResult: { status: "succeeded" },
      productStorage,
    });
    const succeeded = await hook.applyResult({
      resultContext: baseResultContext,
      runResult: { status: "succeeded" },
      productStorage,
    });

    assert.isTrue(failed.ok);
    assert.isNull(failed.product);
    assert.isTrue(businessCanceled.ok);
    assert.isNull(businessCanceled.product);
    assert.equal(succeeded.product?.productId, "product-manuscript");
    assert.lengthOf(calls, 1);
    assert.equal(calls[0].productKey, "manuscript-literature-framing");
  });

  it("preserves text preview kinds while exposing precise code languages", async function () {
    const requestId = `req-product-language-${Date.now()}`;
    const workspaceDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "zs-product-language-"),
    );
    await fs.mkdir(path.join(workspaceDir, "result"), { recursive: true });
    await fs.writeFile(
      path.join(workspaceDir, "result", "index.html"),
      "<!doctype html><title>Preview</title>",
      "utf8",
    );
    await fs.writeFile(
      path.join(workspaceDir, "result", "script.ts"),
      "const value: string = 'ok';",
      "utf8",
    );
    const resultContext = await createWorkflowResultContext({
      runResult: {
        status: "succeeded",
        requestId,
        fetchType: "result",
        workspaceDir,
        resultJson: { kind: "writing.test" },
      },
      bundleReader: {
        async readText() {
          throw new Error("bundle should not be used");
        },
      },
      manifest: { result: { expects: { result_json: "result/result.json" } } },
    });
    const api = createProductStorageApi({
      manifest: { id: "wf-product", label: "Workflow Product" },
      resultContext,
      runResult: {
        requestId,
        responseJson: { provider: "acp" },
      },
    });
    const record = await api.registerProduct({
      productKey: "code",
      kind: "writing.test",
      title: "Code Product",
      assets: [
        {
          assetId: "html",
          label: "HTML",
          rawPath: "result/index.html",
          contentType: "text/html",
        },
        {
          assetId: "typescript",
          label: "TypeScript",
          rawPath: "result/script.ts",
          contentType: "text/typescript",
        },
      ],
    });
    try {
      const html = await readProductAssetPreview(record.productId, "html");
      assert.equal(html.kind, "text");
      assert.equal(html.language, "html");
      assert.include(html.text, "<!doctype html>");

      const typescript = await readProductAssetPreview(
        record.productId,
        "typescript",
      );
      assert.equal(typescript.kind, "text");
      assert.equal(typescript.language, "typescript");
    } finally {
      removeWorkflowProduct(record.productId);
    }
  });

  it("injects productStorage into applyResult hooks", async function () {
    let injected = false;
    const result = await executeApplyResult({
      workflow: {
        manifest: { id: "wf-product", label: "Workflow Product" },
        rootDir: ".",
        buildStrategy: { kind: "passthrough" },
        hooks: {
          async applyResult(args: any) {
            injected = Boolean(args.productStorage?.registerProduct);
            return { ok: injected };
          },
        },
      } as any,
      parent: null,
      bundleReader: {
        async readText() {
          throw new Error("unused");
        },
      },
      resultContext: await createWorkflowResultContext({
        runResult: {
          status: "succeeded",
          requestId: `req-product-inject-${Date.now()}`,
          fetchType: "result",
          resultJson: { ok: true },
        },
        bundleReader: {
          async readText() {
            throw new Error("unused");
          },
        },
        manifest: {},
      }),
      runResult: {
        requestId: `req-product-inject-${Date.now()}`,
        responseJson: { provider: "skillrunner" },
      },
    });
    assert.deepEqual(result, { ok: true });
    assert.isTrue(injected);
  });
});
