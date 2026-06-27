import { assert } from "chai";
import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { dirname, extname, join, resolve } from "path";
import packageJson from "../../../package.json";

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

describe("suite governance constraints", function () {
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
        assert.notMatch(
          source,
          /(^|[^\w$.])Zotero\./m,
          `workflow-package hook/lib files must not use bare Zotero globals in ESM scope: ${filePath}`,
        );
        assert.notMatch(
          source,
          /typeof\s+addon\b|(^|[^\w$.])addon(?:\?\.|\.)/m,
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
    assert.notInclude(gateSource, "check:content-package-release");
  });

  it("Risk: content package release helper keeps the publish workflow entry explicit", function () {
    const scripts = getScripts();

    assert.match(
      scripts["release:content-package"] || "",
      /prepare-content-package-release\.ts/i,
    );
  });
});
