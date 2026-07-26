import { assert } from "chai";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "fs";
import { tmpdir } from "os";
import { dirname, extname, join, resolve } from "path";
import ts from "typescript";
import packageJson from "../../../package.json";
import { getCiGateStages } from "../../../scripts/ci-gate-plan";
import { resolveSynthesisSidecarStage1Suite } from "../../../scripts/synthesis-sidecar-stage1-node-suite";

type ScriptsMap = Record<string, string>;

function getScripts() {
  return ((packageJson as { scripts?: ScriptsMap }).scripts ||
    {}) as ScriptsMap;
}

function collectJavaScriptFiles(rootDir: string): string[] {
  const entries = readdirSync(rootDir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJavaScriptFiles(fullPath));
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    const extension = extname(entry.name).toLowerCase();
    if (extension === ".js" || extension === ".mjs") {
      files.push(fullPath);
    }
  }
  return files;
}

function normalizeFsPath(input: string) {
  return String(input || "")
    .replace(/\\/g, "/")
    .replace(/\/+$/g, "")
    .toLowerCase();
}

function resolveOwningPackageRoot(filePath: string, builtinRoot: string) {
  let current = dirname(filePath);
  let fallbackWorkflowRoot = "";
  const normalizedBuiltinRoot = normalizeFsPath(builtinRoot);
  while (
    current &&
    normalizeFsPath(current).startsWith(normalizedBuiltinRoot)
  ) {
    if (existsSync(join(current, "workflow-package.json"))) {
      return current;
    }
    if (!fallbackWorkflowRoot && existsSync(join(current, "workflow.json"))) {
      fallbackWorkflowRoot = current;
    }
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return fallbackWorkflowRoot;
}

function extractModuleSpecifiers(source: string) {
  const specifiers: string[] = [];
  const pattern = /(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']/g;
  let match: RegExpExecArray | null = pattern.exec(source);
  while (match) {
    specifiers.push(String(match[1] || ""));
    match = pattern.exec(source);
  }
  return specifiers;
}

function findBareRuntimeGlobals(source: string) {
  const sourceFile = ts.createSourceFile(
    "workflow-package.mjs",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  const found = new Set<string>();
  const visit = (node: ts.Node) => {
    const directRuntimeGlobal =
      (ts.isPropertyAccessExpression(node) ||
        ts.isElementAccessExpression(node)) &&
      ts.isIdentifier(node.expression)
        ? node.expression.text
        : ts.isTypeOfExpression(node) && ts.isIdentifier(node.expression)
          ? node.expression.text
          : "";
    if (directRuntimeGlobal === "Zotero" || directRuntimeGlobal === "addon") {
      found.add(directRuntimeGlobal);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

describe("suite governance constraints", function () {
  it("classifies executable bare runtime globals without matching prose", function () {
    const found = findBareRuntimeGlobals(`
      Zotero.Items.get(1);
      Zotero["Items"].get(1);
      addon.data.config;
      typeof addon;
      "Zotero. This sentence is localized prose.";
      globalThis.Zotero.Items.get(1);
      globalThis.addon.data.config;
    `);
    assert.deepEqual([...found].sort(), ["Zotero", "addon"]);
    assert.isEmpty(
      findBareRuntimeGlobals(`
        "Zotero. This sentence is localized prose.";
        globalThis.Zotero.Items.get(1);
        globalThis.addon.data.config;
      `),
    );
  });

  it("Risk: builtin workflow code allows same-package imports but blocks cross-package imports and tag-vocab core bridges", function () {
    const builtinRoot = join(process.cwd(), "workflows_builtin");
    const checkedFiles = collectJavaScriptFiles(builtinRoot);

    for (const filePath of checkedFiles) {
      const source = readFileSync(filePath, "utf8");
      assert.notMatch(
        source,
        /tagVocabularySyncBridge|__zsTagVocabularySyncBridge/,
        `builtin workflow must not depend on tag-vocab core bridge: ${filePath}`,
      );
      const packageRoot = resolveOwningPackageRoot(filePath, builtinRoot);
      const isWorkflowPackageFile =
        !!packageRoot && existsSync(join(packageRoot, "workflow-package.json"));
      const relativeToPackage = packageRoot
        ? normalizeFsPath(filePath).replace(
            `${normalizeFsPath(packageRoot)}/`,
            "",
          )
        : "";
      if (
        isWorkflowPackageFile &&
        /^(?:[^/]+\/)*(hooks|lib)\//.test(relativeToPackage)
      ) {
        assert.equal(
          extname(filePath).toLowerCase(),
          ".mjs",
          `workflow-package hook/lib files must use .mjs: ${filePath}`,
        );
        const bareRuntimeGlobals = findBareRuntimeGlobals(source);
        assert.isFalse(
          bareRuntimeGlobals.has("Zotero"),
          `workflow-package hook/lib files must not use bare Zotero globals in ESM scope: ${filePath}`,
        );
        assert.isFalse(
          bareRuntimeGlobals.has("addon"),
          `workflow-package hook/lib files must not use bare addon globals in ESM scope: ${filePath}`,
        );
      }
      for (const specifier of extractModuleSpecifiers(source)) {
        if (!specifier.startsWith(".")) {
          continue;
        }
        assert.isNotEmpty(
          packageRoot,
          `unable to resolve owning package root for builtin workflow file: ${filePath}`,
        );
        const resolvedTarget = resolve(dirname(filePath), specifier);
        const normalizedTarget = normalizeFsPath(resolvedTarget);
        const normalizedPackageRoot = normalizeFsPath(packageRoot);
        assert.isTrue(
          normalizedTarget === normalizedPackageRoot ||
            normalizedTarget.startsWith(`${normalizedPackageRoot}/`),
          `builtin workflow import must stay within package root: ${filePath} -> ${specifier}`,
        );
        if (isWorkflowPackageFile) {
          assert.equal(
            extname(specifier).toLowerCase(),
            ".mjs",
            `workflow-package relative imports must target .mjs modules: ${filePath} -> ${specifier}`,
          );
        }
      }
    }
  });

  it("Risk: workflow-package manifests pin builtin hook paths to .mjs", function () {
    const builtinRoot = join(process.cwd(), "workflows_builtin");
    const packageRoots = readdirSync(builtinRoot)
      .map((entry) => join(builtinRoot, entry))
      .filter((entry) => statSync(entry).isDirectory())
      .filter((entry) => existsSync(join(entry, "workflow-package.json")));

    for (const packageRoot of packageRoots) {
      const packageManifest = JSON.parse(
        readFileSync(join(packageRoot, "workflow-package.json"), "utf8"),
      ) as { workflows?: string[] };
      for (const workflowRelativePath of packageManifest.workflows || []) {
        const workflowManifestPath = join(packageRoot, workflowRelativePath);
        const workflowManifest = JSON.parse(
          readFileSync(workflowManifestPath, "utf8"),
        ) as { hooks?: Record<string, string | undefined> };
        for (const hookPath of Object.values(workflowManifest.hooks || {})) {
          assert.match(
            String(hookPath || ""),
            /\.mjs$/i,
            `workflow-package hook manifest paths must use .mjs: ${workflowManifestPath} -> ${hookPath}`,
          );
        }
      }
    }
  });

  it("Risk: MR-02 keeps zotero scoped scripts bound to explicit domain selectors", function () {
    const scripts = getScripts();

    assert.match(scripts["test:zotero:core"] || "", /\blite\b.*\bcore\b/i);
    assert.match(scripts["test:zotero:ui"] || "", /\blite\b.*\bui\b/i);
    assert.match(
      scripts["test:zotero:workflow"] || "",
      /\blite\b.*\bworkflow\b/i,
    );
  });

  it("Risk: MR-02 keeps node scoped scripts bound to explicit domain selectors", function () {
    const scripts = getScripts();

    assert.match(scripts["test:node:core"] || "", /\blite\b.*\bcore\b/i);
    assert.match(scripts["test:node:ui"] || "", /\blite\b.*\bui\b/i);
    assert.match(
      scripts["test:node:workflow"] || "",
      /\blite\b.*\bworkflow\b/i,
    );
  });

  it("Risk: node raw suite excludes Zotero runner aggregate suites", function () {
    const scripts = getScripts();

    assert.match(
      scripts["test:node:raw"] || "",
      /--ignore\s+"test\/zotero\/\*\*\/\*\.test\.ts"/i,
    );
  });

  it("Risk: MR-02 keeps full-suite scripts explicitly pinned to full mode", function () {
    const scripts = getScripts();

    assert.match(scripts["test:zotero:core:full"] || "", /\bfull\b.*\bcore\b/i);
    assert.match(scripts["test:zotero:ui:full"] || "", /\bfull\b.*\bui\b/i);
    assert.match(
      scripts["test:zotero:workflow:full"] || "",
      /\bfull\b.*\bworkflow\b/i,
    );
    assert.match(scripts["test:node:core:full"] || "", /\bfull\b.*\bcore\b/i);
    assert.match(scripts["test:node:ui:full"] || "", /\bfull\b.*\bui\b/i);
    assert.match(
      scripts["test:node:workflow:full"] || "",
      /\bfull\b.*\bworkflow\b/i,
    );
  });

  it("Risk: MR-02 keeps CI gate entries mapped to explicit pr/release targets", function () {
    const scripts = getScripts();

    assert.match(scripts["test:gate:pr"] || "", /run-ci-gate\.ts\s+pr/i);
    assert.match(
      scripts["test:gate:release"] || "",
      /run-ci-gate\.ts\s+release/i,
    );
  });

  it("Risk: the Synthesis Stage 1 milestone inventory stays complete and fail-closed", function () {
    const files = readdirSync(join(process.cwd(), "test", "core"), {
      withFileTypes: true,
    })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".test.ts"))
      .map((entry) => `test/core/${entry.name}`);
    const suite = resolveSynthesisSidecarStage1Suite(files);

    assert.equal(suite.files.length, 44);
    assert.equal(
      suite.files[0],
      "test/core/175-synthesis-client-foundation.test.ts",
    );
    assert.equal(
      suite.files.at(-1),
      "test/core/218-synthesis-cross-language-sidecar-contract.test.ts",
    );
    assert.deepEqual(
      suite.segments.map((segment) => segment.files.length),
      [27, 1, 16],
    );
    assert.deepEqual(suite.segments[1].files, [
      "test/core/202-synthesis-citation-graph-build-streaming-worker.test.ts",
    ]);

    assert.throws(() =>
      resolveSynthesisSidecarStage1Suite(
        files.filter((filePath) => !filePath.includes("/175-")),
      ),
    );
    assert.throws(() =>
      resolveSynthesisSidecarStage1Suite([
        ...files,
        "test/core/175-synthesis-duplicate.test.ts",
      ]),
    );
    assert.throws(() =>
      resolveSynthesisSidecarStage1Suite(
        files.map((filePath) =>
          filePath.includes("/175-")
            ? "test/core/175-unrelated-foundation.test.ts"
            : filePath,
        ),
      ),
    );
  });

  it("Risk: PR and release gates share one blocking Synthesis Stage 1 Node milestone", function () {
    const scripts = getScripts();

    assert.match(
      scripts["test:node:synthesis-sidecar:stage1"] || "",
      /run-node-test-shards\.ts\s+--suite\s+synthesis-sidecar-stage1/i,
    );
    assert.deepEqual(
      getCiGateStages("pr").map((stage) => stage.script),
      [
        "check:localization-governance",
        "check:ssot-invariants",
        "test:node:synthesis-sidecar:stage1",
        "test:lite",
      ],
    );
    assert.deepEqual(
      getCiGateStages("release").map((stage) => stage.script),
      [
        "check:localization-governance",
        "check:ssot-invariants",
        "test:node:synthesis-sidecar:stage1",
        "test:full",
      ],
    );
  });

  it("Risk: main CI release gate stays decoupled from remote content feed publication", function () {
    const scripts = getScripts();
    const gateSource = readFileSync(
      join(process.cwd(), "scripts", "run-ci-gate.ts"),
      "utf8",
    );

    assert.match(
      scripts["check:content-package-release"] || "",
      /check-content-package-release\.ts/i,
    );
    assert.notInclude(
      scripts["check:content-package-release"] || "",
      "--check-mirror",
    );
    assert.match(
      scripts["check:content-package-mirror"] || "",
      /check-content-package-release\.ts\s+--check-mirror/i,
    );
    assert.notInclude(gateSource, "check:content-package-release");
  });

  it("Risk: content package release helper keeps the publish workflow entry explicit", function () {
    const scripts = getScripts();

    assert.match(
      scripts["release:content-package"] || "",
      /prepare-content-package-release\.ts/i,
    );
  });

  it("Risk: canonical publication stays GitHub-only and exposes one manual Gitee command", function () {
    const scripts = getScripts();
    const workflowSource = readFileSync(
      join(process.cwd(), ".github", "workflows", "publish-content-feed.yml"),
      "utf8",
    );
    const githubReleaseIndex = workflowSource.indexOf(
      "name: Publish GitHub release assets",
    );
    const githubFeedIndex = workflowSource.indexOf(
      "name: Publish content-feed branch to GitHub content repo",
    );

    assert.isAtLeast(githubReleaseIndex, 0);
    assert.isAtLeast(githubFeedIndex, 0);
    assert.isBelow(githubReleaseIndex, githubFeedIndex);
    assert.notMatch(workflowSource, /GITEE_TOKEN|gitee\.com|Publish Gitee/i);
    assert.match(
      scripts["sync:gitee-release"] || "",
      /sync-gitee-publication\.ts/i,
    );
    assert.notProperty(scripts, "sync:gitee-plugin-release");
  });

  it("recovers a timed-out Gitee upload only after the attachment is visible", async function () {
    const root = mkdtempSync(join(tmpdir(), "zs-gitee-upload-"));
    const asset = join(root, "package.zip");
    writeFileSync(asset, "package");
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (
      _input: string | URL | Request,
      init?: RequestInit,
    ) => {
      return new Response(JSON.stringify([{ name: "package.zip" }]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;
    try {
      const { syncGiteeReleaseInternalsForTests } =
        await import("../../../scripts/sync-gitee-release");
      await syncGiteeReleaseInternalsForTests.uploadAttachment({
        owner: "owner",
        repo: "repo",
        releaseId: 1,
        filePath: asset,
        token: "token",
        sendUpload: async () => {
          throw new DOMException("timed out", "TimeoutError");
        },
      });
      globalThis.fetch = (async (
        _input: string | URL | Request,
        init?: RequestInit,
      ) => {
        return new Response("[]", {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }) as typeof fetch;
      let missingAttachmentError: unknown;
      try {
        await syncGiteeReleaseInternalsForTests.uploadAttachment({
          owner: "owner",
          repo: "repo",
          releaseId: 1,
          filePath: asset,
          token: "token",
          sendUpload: async () => {
            throw new DOMException("timed out", "TimeoutError");
          },
        });
      } catch (error) {
        missingAttachmentError = error;
      }
      assert.match(String(missingAttachmentError), /did not accept/);

      let uploadAttempts = 0;
      globalThis.fetch = (async (
        _input: string | URL | Request,
        init?: RequestInit,
      ) => {
        return new Response("[]", {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }) as typeof fetch;
      await syncGiteeReleaseInternalsForTests.uploadAttachment({
        owner: "owner",
        repo: "repo",
        releaseId: 1,
        filePath: asset,
        token: "token",
        sendUpload: async () => {
          uploadAttempts += 1;
          if (uploadAttempts === 1) {
            throw new DOMException("timed out", "TimeoutError");
          }
        },
      });
      assert.strictEqual(uploadAttempts, 2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
