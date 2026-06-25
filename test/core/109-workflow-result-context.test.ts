import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  createUnavailableBundleReader,
  createDirectoryBundleReader,
} from "../../src/modules/workflowExecution/bundleIO";
import { createWorkflowResultContext } from "../../src/modules/workflowExecution/resultContext";
import type { WorkflowManifest } from "../../src/workflows/types";

async function mkTempRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), "zs-workflow-result-context-"));
}

function manifest(): WorkflowManifest {
  return {
    id: "result-context-test",
    label: "Result Context Test",
    hooks: { applyResult: "hooks/applyResult.js" },
  };
}

describe("workflow result context", function () {
  it("reads provider resultJson and absolute local artifacts without bundle projection", async function () {
    const root = await mkTempRoot();
    try {
      const artifactPath = path.join(root, "result", "digest.md");
      await fs.mkdir(path.dirname(artifactPath), { recursive: true });
      await fs.writeFile(artifactPath, "# Digest\n", "utf8");
      const resultJson = {
        digest_path: artifactPath,
      };
      const context = await createWorkflowResultContext({
        runResult: {
          requestId: "request-1",
          resultJson,
          responseJson: {
            workspaceDir: root,
          },
        },
        bundleReader: createUnavailableBundleReader("request-1"),
        manifest: manifest(),
      });

      assert.deepEqual(context.resultJson, resultJson);
      assert.equal(context.resultJsonSource.kind, "run-result");
      const artifact = await context.readArtifactText({
        fieldName: "digest_path",
        rawPath: artifactPath,
        fallbackPath: "artifacts/digest.md",
      });
      assert.equal(artifact.text, "# Digest\n");
      assert.equal(artifact.sourceKind, "local-path");
      assert.equal(
        String(artifact.sourcePath || "").replace(/\\/g, "/"),
        artifactPath.replace(/\\/g, "/"),
      );
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("preserves native Windows local paths for Zotero IOUtils reads", async function () {
    const runtime = globalThis as {
      IOUtils?: unknown;
    };
    const previousIOUtils = runtime.IOUtils;
    const nativePath =
      "C:\\Users\\leike\\AppData\\Local\\Zotero-Skills\\runtime\\acp\\skill-runs\\run-1\\artifacts\\digest.md";
    runtime.IOUtils = {
      exists: async (candidate: string) => candidate === nativePath,
      readUTF8: async (candidate: string) => {
        if (candidate !== nativePath) {
          throw new Error(`unexpected path: ${candidate}`);
        }
        return "# Native Path Digest\n";
      },
    };
    try {
      const context = await createWorkflowResultContext({
        runResult: {
          requestId: "request-native-path",
          resultJson: {
            digest_path: nativePath,
          },
          responseJson: {
            workspaceDir:
              "C:\\Users\\leike\\AppData\\Local\\Zotero-Skills\\runtime\\acp\\skill-runs\\run-1",
          },
        },
        bundleReader: createUnavailableBundleReader("request-native-path"),
        manifest: manifest(),
      });

      const artifact = await context.readArtifactText({
        fieldName: "digest_path",
        rawPath: nativePath,
        fallbackPath: "artifacts/digest.md",
      });

      assert.equal(artifact.text, "# Native Path Digest\n");
      assert.equal(artifact.sourcePath, nativePath);
    } finally {
      runtime.IOUtils = previousIOUtils;
    }
  });

  it("normalizes Windows slash-form absolute paths to native paths for Zotero IOUtils reads", async function () {
    const runtime = globalThis as {
      IOUtils?: unknown;
      Zotero?: { isWin?: boolean };
    };
    const previousIOUtils = runtime.IOUtils;
    const previousZotero = runtime.Zotero;
    const nativePath =
      "C:\\Users\\leike\\AppData\\Local\\Zotero-Skills\\runtime\\acp\\skill-runs\\run-2\\artifacts\\digest.md";
    const slashPath = nativePath.replace(/\\/g, "/");
    runtime.Zotero = {
      ...(previousZotero || {}),
      isWin: true,
    };
    runtime.IOUtils = {
      exists: async (candidate: string) => candidate === nativePath,
      readUTF8: async (candidate: string) => {
        if (candidate !== nativePath) {
          throw new Error(`unexpected path: ${candidate}`);
        }
        return "# Slash Path Digest\n";
      },
    };
    try {
      const context = await createWorkflowResultContext({
        runResult: {
          requestId: "request-slash-path",
          resultJson: {
            digest_path: slashPath,
          },
          responseJson: {
            workspaceDir: slashPath.slice(
              0,
              slashPath.lastIndexOf("/artifacts/"),
            ),
          },
        },
        bundleReader: createUnavailableBundleReader("request-slash-path"),
        manifest: manifest(),
      });

      const artifact = await context.readArtifactText({
        fieldName: "digest_path",
        rawPath: slashPath,
        fallbackPath: "artifacts/digest.md",
      });

      assert.equal(artifact.text, "# Slash Path Digest\n");
      assert.equal(artifact.sourcePath, nativePath);
    } finally {
      runtime.IOUtils = previousIOUtils;
      runtime.Zotero = previousZotero;
    }
  });

  it("loads resultJson and artifacts from directory bundle entries", async function () {
    const root = await mkTempRoot();
    try {
      await fs.mkdir(path.join(root, "result"), { recursive: true });
      await fs.mkdir(path.join(root, "artifacts"), { recursive: true });
      await fs.writeFile(
        path.join(root, "result", "result.json"),
        JSON.stringify({ data: { digest_path: "artifacts/digest.md" } }),
        "utf8",
      );
      await fs.writeFile(
        path.join(root, "artifacts", "digest.md"),
        "# Digest",
        "utf8",
      );
      const context = await createWorkflowResultContext({
        runResult: {
          requestId: "request-2",
        },
        bundleReader: createDirectoryBundleReader(root),
        manifest: manifest(),
      });

      assert.deepEqual(context.resultJson, {
        data: { digest_path: "artifacts/digest.md" },
      });
      assert.equal(context.resultJsonSource.kind, "bundle-entry");
      const artifact = await context.readArtifactText({
        fieldName: "digest_path",
        rawPath: "uploads/input/source/artifacts/digest.md",
        fallbackPath: "artifacts/digest.md",
      });
      assert.equal(artifact.text, "# Digest");
      assert.equal(artifact.sourceKind, "bundle-entry");
      assert.equal(artifact.entryPath, "artifacts/digest.md");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("loads namespaced bundle resultJson and sibling artifacts", async function () {
    const root = await mkTempRoot();
    try {
      await fs.mkdir(path.join(root, "result", "literature-deep-reading.1"), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(root, "result", "literature-deep-reading.1", "result.json"),
        JSON.stringify({ html_path: "result/deep-reading.html" }),
        "utf8",
      );
      await fs.writeFile(
        path.join(
          root,
          "result",
          "literature-deep-reading.1",
          "deep-reading.html",
        ),
        "<main>Deep</main>",
        "utf8",
      );

      const context = await createWorkflowResultContext({
        runResult: {
          requestId: "request-namespaced-result",
          resultJsonPath: "result/literature-deep-reading.1/result.json",
          resultArtifactBasePath: "result/literature-deep-reading.1",
        },
        bundleReader: createDirectoryBundleReader(root),
        manifest: manifest(),
      });

      assert.deepEqual(context.resultJson, {
        html_path: "result/deep-reading.html",
      });
      assert.equal(context.resultJsonSource.kind, "bundle-entry");
      const artifact = await context.readArtifactText({
        fieldName: "html_path",
        rawPath: "result/deep-reading.html",
      });
      assert.equal(artifact.text, "<main>Deep</main>");
      assert.equal(
        artifact.entryPath,
        "result/literature-deep-reading.1/deep-reading.html",
      );
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("unwraps SkillRunner envelope resultJson from namespaced bundle entries", async function () {
    const root = await mkTempRoot();
    try {
      const resultDir = path.join(root, "result", "debug-apply-bundle-probe.1");
      await fs.mkdir(resultDir, { recursive: true });
      await fs.writeFile(
        path.join(resultDir, "result.json"),
        JSON.stringify({
          status: "success",
          data: {
            apply_mode: "bundle",
            artifact_path: "result/debug-apply-artifact.txt",
            kind: "debug_apply_contract_result",
          },
          success_source: "done_signal_payload",
          artifacts: ["result/debug-apply-artifact.txt"],
          repair_level: "none",
          validation_warnings: [],
          error: null,
        }),
        "utf8",
      );
      await fs.writeFile(
        path.join(resultDir, "debug-apply-artifact.txt"),
        "debug artifact body",
        "utf8",
      );

      const context = await createWorkflowResultContext({
        runResult: {
          requestId: "request-skillrunner-envelope",
          resultJsonPath: "result/debug-apply-bundle-probe.1/result.json",
          resultArtifactBasePath: "result/debug-apply-bundle-probe.1",
        },
        bundleReader: createDirectoryBundleReader(root),
        manifest: manifest(),
      });

      assert.deepEqual(context.resultJson, {
        apply_mode: "bundle",
        artifact_path: "result/debug-apply-artifact.txt",
        kind: "debug_apply_contract_result",
      });
      const artifact = await context.readArtifactText({
        fieldName: "artifact_path",
        rawPath: "result/debug-apply-artifact.txt",
      });
      assert.equal(artifact.text, "debug artifact body");
      assert.equal(
        artifact.entryPath,
        "result/debug-apply-bundle-probe.1/debug-apply-artifact.txt",
      );
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("loads local resultJsonPath and workspace-relative artifacts without bundle content", async function () {
    const root = await mkTempRoot();
    try {
      await fs.mkdir(path.join(root, "result"), { recursive: true });
      await fs.mkdir(path.join(root, "artifacts"), { recursive: true });
      const resultJsonPath = path.join(root, "result", "result.json");
      await fs.writeFile(
        resultJsonPath,
        JSON.stringify({ digest_path: "artifacts/digest.md" }),
        "utf8",
      );
      await fs.writeFile(
        path.join(root, "artifacts", "digest.md"),
        "# Local",
        "utf8",
      );

      const context = await createWorkflowResultContext({
        runResult: {
          requestId: "request-local-result-path",
          responseJson: {
            workspaceDir: root,
            resultJsonPath,
          },
        },
        bundleReader: createUnavailableBundleReader(
          "request-local-result-path",
        ),
        manifest: manifest(),
      });

      assert.deepEqual(context.resultJson, {
        digest_path: "artifacts/digest.md",
      });
      assert.equal(context.resultJsonSource.kind, "local-path");
      const artifact = await context.readArtifactText({
        fieldName: "digest_path",
        rawPath: "artifacts/digest.md",
      });
      assert.equal(artifact.text, "# Local");
      assert.equal(artifact.sourceKind, "local-path");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("reports candidate paths when an artifact cannot be resolved", async function () {
    const context = await createWorkflowResultContext({
      runResult: {
        requestId: "request-3",
        resultJson: {},
      },
      bundleReader: createUnavailableBundleReader("request-3"),
      manifest: manifest(),
    });

    let thrown: unknown = null;
    try {
      await context.readArtifactText({
        fieldName: "digest_path",
        rawPath: "uploads/input/source/artifacts/digest.md",
        fallbackPath: "artifacts/digest.md",
      });
    } catch (error) {
      thrown = error;
    }

    assert.instanceOf(thrown, Error);
    const message = (thrown as Error).message;
    assert.include(message, "[digest_path] artifact not found");
    assert.include(message, "uploads/input/source/artifacts/digest.md");
    assert.include(message, "artifacts/digest.md");
    assert.include(message, "candidates=");
  });
});
