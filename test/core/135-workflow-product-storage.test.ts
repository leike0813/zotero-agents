import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { createWorkflowResultContext } from "../../src/modules/workflowExecution/resultContext";
import { executeApplyResult } from "../../src/workflows/runtime";
import {
  createProductStorageApi,
  getWorkflowProduct,
  readProductAssetPreview,
  removeWorkflowProduct,
} from "../../src/modules/workflowProductStore";

describe("workflow product storage", function () {
  it("registers ACP-style local workspace assets without copying", async function () {
    const requestId = `req-product-local-${Date.now()}`;
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "zs-product-local-"));
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
      assert.equal(record.storageMode, "local-workspace");
      assert.equal(record.assets[0].sourceKind, "local-path");
      assert.include(record.assets[0].localPath || "", workspaceDir);
      const preview = await readProductAssetPreview(record.productId, "plan");
      assert.equal(preview.kind, "json");
      assert.include(preview.formattedText || "", '"title": "Plan"');
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
      assert.equal(record.storageMode, "cached-bundle");
      assert.equal(record.assets[0].sourceKind, "bundle-entry");
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
