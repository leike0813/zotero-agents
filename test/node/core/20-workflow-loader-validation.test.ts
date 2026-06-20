import { assert } from "chai";
import { readFileSync, statSync } from "fs";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "fs/promises";
import { dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { setDebugModeOverrideForTests } from "../../../src/modules/debugMode";
import {
  clearRuntimeLogs,
  listRuntimeLogs,
  resetRuntimeLogAllowedLevels,
  setRuntimeLogDiagnosticMode,
} from "../../../src/modules/runtimeLogManager";
import { enableWorkflowPackageDiagnosticsForDebugMode } from "../../../src/modules/workflowPackageDiagnostics";
import {
  installRuntimeBridgeOverrideForTests,
  resetRuntimeBridgeOverrideForTests,
} from "../../../src/utils/runtimeBridge";
import { loadWorkflowManifests } from "../../../src/workflows/loader";
import {
  isCoreWorkflow,
  localizeWorkflowLabel,
} from "../../../src/workflows/localization";
import { clearPackageHookBundleCacheForTests } from "../../../src/workflows/packageHookBundler";
import { fixturePath, joinPath, mkTempDir, writeUtf8 } from "../../core/workflow-test-utils";

async function makeWorkflow(
  rootDir: string,
  id: string,
  manifest: Record<string, unknown>,
  hooks: Record<string, string>,
) {
  const normalizedManifest = JSON.parse(
    JSON.stringify(manifest),
  ) as Record<string, unknown> & {
    request?: { kind?: unknown };
    provider?: unknown;
    execution?: Record<string, unknown>;
    __test_skip_provider_autofill?: unknown;
    __test_skip_skillrunner_request_mode_autofill?: unknown;
  };
  const skipProviderAutoFill =
    normalizedManifest.__test_skip_provider_autofill === true;
  const skipSkillRunnerRequestModeAutoFill =
    normalizedManifest.__test_skip_skillrunner_request_mode_autofill === true;
  delete normalizedManifest.__test_skip_provider_autofill;
  delete normalizedManifest.__test_skip_skillrunner_request_mode_autofill;
  const provider = String(normalizedManifest.provider || "").trim();
  const requestKind = String(normalizedManifest.request?.kind || "").trim();
  if (!provider && !skipProviderAutoFill) {
    if (requestKind === "skillrunner.job.v1") {
      normalizedManifest.provider = "skillrunner";
    } else if (
      requestKind === "generic-http.request.v1" ||
      requestKind === "generic-http.steps.v1"
    ) {
      normalizedManifest.provider = "generic-http";
    } else if (requestKind === "pass-through.run.v1") {
      normalizedManifest.provider = "pass-through";
    }
  }
  const isSkillRunnerWorkflow =
    String(normalizedManifest.provider || "").trim() === "skillrunner" ||
    requestKind === "skillrunner.job.v1" ||
    requestKind === "skillrunner.sequence.v1";
  if (isSkillRunnerWorkflow && !skipSkillRunnerRequestModeAutoFill) {
    if (requestKind === "skillrunner.job.v1") {
      const request = (normalizedManifest.request || {}) as Record<string, unknown>;
      const create =
        request.create && typeof request.create === "object" && !Array.isArray(request.create)
          ? { ...(request.create as Record<string, unknown>) }
          : {};
      create.skill_id = String(create.skill_id || "").trim() || id;
      create.mode = String(create.mode || "").trim() || "auto";
      normalizedManifest.request = {
        ...request,
        create,
      };
    } else if (requestKind === "skillrunner.sequence.v1") {
      const request = (normalizedManifest.request || {}) as Record<string, unknown>;
      const sequence =
        request.sequence && typeof request.sequence === "object" && !Array.isArray(request.sequence)
          ? { ...(request.sequence as Record<string, unknown>) }
          : null;
      const steps = Array.isArray(sequence?.steps)
        ? sequence.steps.map((step: unknown) =>
            step && typeof step === "object" && !Array.isArray(step)
              ? { mode: "auto", ...(step as Record<string, unknown>) }
              : step,
          )
        : undefined;
      if (sequence && steps) {
        normalizedManifest.request = {
          ...request,
          sequence: {
            ...sequence,
            steps,
          },
        };
      }
    }
  }
  const workflowDir = joinPath(rootDir, id);
  const hooksDir = joinPath(workflowDir, "hooks");
  await writeUtf8(
    joinPath(workflowDir, "workflow.json"),
    JSON.stringify(normalizedManifest, null, 2),
  );
  for (const [name, content] of Object.entries(hooks)) {
    await writeUtf8(joinPath(hooksDir, name), content);
  }
}

async function makeWorkflowPackage(args: {
  rootDir: string;
  packageDir: string;
  packageManifest: Record<string, unknown>;
  files: Record<string, string>;
}) {
  const packageRoot = joinPath(args.rootDir, args.packageDir);
  await writeUtf8(
    joinPath(packageRoot, "workflow-package.json"),
    JSON.stringify(args.packageManifest, null, 2),
  );
  for (const [relativePath, content] of Object.entries(args.files)) {
    await writeUtf8(joinPath(packageRoot, relativePath), content);
  }
}

async function withSimulatedZoteroRuntime<T>(
  run: (counters: {
    getLoadSubScriptCalls: () => number;
    getImportESModuleCalls: () => number;
  }) => Promise<T>,
  options?: {
    importESModule?: (spec: string) => Promise<Record<string, unknown>> | Record<string, unknown>;
  },
) {
  const runtime = globalThis as Record<string, unknown>;
  const keys = [
    "IOUtils",
    "PathUtils",
    "Services",
    "Zotero",
    "Cc",
    "Ci",
    "ChromeUtils",
  ] as const;
  const previousDescriptors = Object.fromEntries(
    keys.map((key) => [key, Object.getOwnPropertyDescriptor(runtime, key)]),
  ) as Record<string, PropertyDescriptor | undefined>;
  const setRuntimeGlobal = (key: string, value: unknown) => {
    Object.defineProperty(runtime, key, {
      configurable: true,
      writable: true,
      value,
    });
  };
  let loadSubScriptCalls = 0;
  let importESModuleCalls = 0;
  const resourceSubstitutions = new Map<string, string>();
  const tempDir = await mkTempDir("zotero-runtime-loader");
  setRuntimeGlobal("IOUtils", {
    readUTF8: (filePath: string) => readFile(filePath, "utf8"),
    writeUTF8: async (filePath: string, content: string) => {
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, content, "utf8");
    },
    getChildren: async (dirPath: string) => {
      const entries = await readdir(dirPath);
      return entries.map((entry) => joinPath(dirPath, entry));
    },
    stat: async (targetPath: string) => {
      const entry = await stat(targetPath);
      return { type: entry.isDirectory() ? "directory" : "file" };
    },
    makeDirectory: (dirPath: string) =>
      mkdir(dirPath, { recursive: true }),
    remove: (targetPath: string) =>
      rm(targetPath, { force: true, recursive: true }),
  });
  setRuntimeGlobal("PathUtils", { tempDir });
  setRuntimeGlobal("Services", {
    io: {
      newFileURI: (file: unknown) => {
        const targetPath = String(file || "");
        const fileUrl = pathToFileURL(targetPath).href;
        let needsTrailingSlash = false;
        try {
          needsTrailingSlash = statSync(targetPath).isDirectory();
        } catch {
          needsTrailingSlash = false;
        }
        return {
          spec:
            needsTrailingSlash && !fileUrl.endsWith("/")
              ? `${fileUrl}/`
              : fileUrl,
        };
      },
      newURI: (spec: string) => ({
        spec,
      }),
      getProtocolHandler: (scheme: string) => {
        if (scheme !== "resource") {
          throw new Error(`unsupported protocol: ${scheme}`);
        }
        return {
          QueryInterface() {
            return this;
          },
          setSubstitution(root: string, baseURI: unknown) {
            if (!baseURI) {
              resourceSubstitutions.delete(root);
              return;
            }
            if (
              typeof baseURI !== "object" ||
              !baseURI ||
              !("spec" in (baseURI as Record<string, unknown>))
            ) {
              throw new Error("setSubstitution expects nsIURI-like object");
            }
            const spec =
              typeof baseURI === "object" && baseURI && "spec" in (baseURI as Record<string, unknown>)
                ? String((baseURI as { spec?: unknown }).spec || "")
                : String(baseURI || "");
            resourceSubstitutions.set(root, spec);
          },
        };
      },
    },
    scriptloader: {
      loadSubScript: (url: string, scope?: Record<string, unknown>) => {
        loadSubScriptCalls += 1;
        const script = readFileSync(fileURLToPath(url), "utf8");
        new Function(script).call(scope || {});
      },
    },
  });
  setRuntimeGlobal("Zotero", {
    File: {
      pathToFile: (filePath: string) => filePath,
    },
  });
  setRuntimeGlobal("Cc", {});
  setRuntimeGlobal("Ci", {
    nsIResProtocolHandler: Symbol("nsIResProtocolHandler"),
  });
  setRuntimeGlobal("ChromeUtils", {
    importESModule: async (spec: string) => {
      importESModuleCalls += 1;
      if (!spec.startsWith("resource://") && !spec.startsWith("chrome://")) {
        throw new Error(`unsupported module URI: ${spec}`);
      }
      if (options?.importESModule) {
        return options.importESModule(spec);
      }
      if (spec.startsWith("chrome://")) {
        throw new Error(`unsupported chrome URI in test runtime: ${spec}`);
      }
      const match = spec.match(/^resource:\/\/([^/]+)\/(.*)$/);
      if (!match) {
        throw new Error(`invalid resource URI: ${spec}`);
      }
      const root = match[1];
      const relativePath = match[2];
      const baseSpec = resourceSubstitutions.get(root);
      if (!baseSpec) {
        throw new Error(`resource root not registered: ${root}`);
      }
      const resolvedSpec = new URL(relativePath, baseSpec).href;
      return import(resolvedSpec);
    },
  });

  try {
    return await run({
      getLoadSubScriptCalls: () => loadSubScriptCalls,
      getImportESModuleCalls: () => importESModuleCalls,
    });
  } finally {
    for (const key of keys) {
      const descriptor = previousDescriptors[key];
      if (descriptor) {
        Object.defineProperty(runtime, key, descriptor);
      } else {
        delete runtime[key];
      }
    }
    clearPackageHookBundleCacheForTests();
  }
}

describe("workflow loader validation", function () {
  afterEach(function () {
    setDebugModeOverrideForTests();
    resetRuntimeBridgeOverrideForTests();
    clearRuntimeLogs();
    resetRuntimeLogAllowedLevels();
    setRuntimeLogDiagnosticMode(false);
  });

  it("accepts workflow with declarative request and required applyResult hook", async function () {
    const tmpRoot = await mkTempDir("zotero-skills-wf");
    await makeWorkflow(
      tmpRoot,
      "declarative-ok",
      {
        id: "declarative-ok",
        label: "Declarative",
        request: { kind: "skillrunner.job.v1" },
        hooks: { applyResult: "hooks/applyResult.js" },
      },
      {
        "applyResult.js":
          "export async function applyResult(){ return { ok: true }; }",
      },
    );
    const loaded = await loadWorkflowManifests(tmpRoot);
    assert.lengthOf(
      loaded.workflows,
      1,
      `warnings=${JSON.stringify(loaded.warnings)} errors=${JSON.stringify(loaded.errors)}`,
    );
    assert.equal(loaded.workflows[0].buildStrategy, "declarative");
  });

  it("loads multiple workflows from one workflow package and supports shared helper imports", async function () {
    const tmpRoot = await mkTempDir("zotero-skills-wf");
    await makeWorkflowPackage({
      rootDir: tmpRoot,
      packageDir: "bundle-alpha",
      packageManifest: {
        id: "bundle-alpha",
        version: "1.0.0",
        workflows: [
          "workflow-a/workflow.json",
          "workflow-b/workflow.json",
        ],
      },
      files: {
        "shared/helper.mjs":
          "export function sharedLabel(prefix){ return `${prefix}-shared`; }",
        "workflow-a/workflow.json": JSON.stringify(
          {
            id: "workflow-a",
            label: "Workflow A",
            provider: "pass-through",
            hooks: {
              applyResult: "hooks/applyResult.mjs",
            },
          },
          null,
          2,
        ),
        "workflow-a/hooks/applyResult.mjs":
          "import { sharedLabel } from '../../shared/helper.mjs'; export async function applyResult(){ return { ok: true, label: sharedLabel('a') }; }",
        "workflow-b/workflow.json": JSON.stringify(
          {
            id: "workflow-b",
            label: "Workflow B",
            provider: "pass-through",
            hooks: {
              applyResult: "hooks/applyResult.mjs",
            },
          },
          null,
          2,
        ),
        "workflow-b/hooks/applyResult.mjs":
          "import { sharedLabel } from '../../shared/helper.mjs'; export async function applyResult(){ return { ok: true, label: sharedLabel('b') }; }",
      },
    });

    const loaded = await loadWorkflowManifests(tmpRoot);
    assert.sameMembers(
      loaded.workflows.map((entry) => entry.manifest.id),
      ["workflow-a", "workflow-b"],
      `warnings=${JSON.stringify(loaded.warnings)} errors=${JSON.stringify(loaded.errors)}`,
    );
    const workflowA = loaded.workflows.find((entry) => entry.manifest.id === "workflow-a");
    const workflowB = loaded.workflows.find((entry) => entry.manifest.id === "workflow-b");
    assert.equal(workflowA?.packageId, "bundle-alpha");
    assert.equal(workflowB?.packageId, "bundle-alpha");
    assert.include(String(workflowA?.rootDir || ""), joinPath("bundle-alpha", "workflow-a"));
    assert.include(
      String(workflowA?.packageRootDir || ""),
      joinPath(tmpRoot, "bundle-alpha"),
    );
    const resultA = await workflowA?.hooks.applyResult({
      parent: 1,
      bundleReader: { readText: async () => "" },
      manifest: workflowA!.manifest,
      runtime: {} as any,
    });
    assert.deepInclude(resultA as Record<string, unknown>, {
      ok: true,
      label: "a-shared",
    });
  });

  it("loads workflow-package hooks through the Zotero runtime module path without using legacy text fallback", async function () {
    const tmpRoot = await mkTempDir("zotero-skills-wf");
    await makeWorkflowPackage({
      rootDir: tmpRoot,
      packageDir: "bundle-runtime-success",
      packageManifest: {
        id: "bundle-runtime-success",
        version: "1.0.0",
        workflows: ["workflow-a/workflow.json"],
      },
      files: {
        "shared/helper.mjs":
          "export function sharedLabel(prefix){ return `${prefix}-runtime`; }",
        "workflow-a/workflow.json": JSON.stringify(
          {
            id: "workflow-runtime-a",
            label: "Workflow Runtime A",
            provider: "pass-through",
            hooks: {
              applyResult: "hooks/applyResult.mjs",
            },
          },
          null,
          2,
        ),
        "workflow-a/hooks/applyResult.mjs":
          "import { sharedLabel } from '../../shared/helper.mjs'; export async function applyResult(){ return { ok: true, label: sharedLabel('a') }; }",
      },
    });

    setDebugModeOverrideForTests(true);
    clearRuntimeLogs();
    enableWorkflowPackageDiagnosticsForDebugMode();
    await withSimulatedZoteroRuntime(async (counters) => {
      const loaded = await loadWorkflowManifests(tmpRoot, {
        workflowSourceKind: "builtin",
      });
      assert.lengthOf(
        loaded.workflows,
        1,
        `warnings=${JSON.stringify(loaded.warnings)} errors=${JSON.stringify(loaded.errors)}`,
      );
      const workflow = loaded.workflows[0];
      const result = await workflow.hooks.applyResult({
        parent: 1,
        bundleReader: { readText: async () => "" },
        manifest: workflow.manifest,
        runtime: {} as any,
      });
      assert.deepInclude(result as Record<string, unknown>, {
        ok: true,
        label: "a-runtime",
      });
      assert.equal(workflow.hookExecutionMode, "precompiled-host-hook");
      assert.equal(counters.getImportESModuleCalls(), 0);
      assert.isAtLeast(counters.getLoadSubScriptCalls(), 1);
      const stages = listRuntimeLogs()
        .map((entry) => entry.stage);
      assert.include(stages, "workflow-package-precompile-start");
      assert.include(stages, "workflow-package-precompile-succeeded");
    });
  });

  it("injects bundled host scope from unified runtime resolvers instead of raw globalThis", async function () {
    const tmpRoot = await mkTempDir("zotero-skills-wf");
    await makeWorkflowPackage({
      rootDir: tmpRoot,
      packageDir: "bundle-runtime-host-scope",
      packageManifest: {
        id: "bundle-runtime-host-scope",
        version: "1.0.0",
        workflows: ["workflow-a/workflow.json"],
      },
      files: {
        "workflow-a/workflow.json": JSON.stringify(
          {
            id: "workflow-runtime-host-scope",
            label: "Workflow Runtime Host Scope",
            provider: "pass-through",
            hooks: {
              applyResult: "hooks/applyResult.mjs",
            },
          },
          null,
          2,
        ),
        "workflow-a/hooks/applyResult.mjs":
          "export async function applyResult(){ return { hasHostApi: !!globalThis.__zsHostApi, hostApiVersion: globalThis.__zsHostApiVersion || null, consoleState: typeof console === 'undefined' ? 'missing' : (console === null ? 'null' : 'ok') }; }",
      },
    });

    await withSimulatedZoteroRuntime(async () => {
      setDebugModeOverrideForTests(true);
      clearRuntimeLogs();
      enableWorkflowPackageDiagnosticsForDebugMode();
      installRuntimeBridgeOverrideForTests({
        zotero: {
          File: {
            pathToFile(path: string) {
              return path;
            },
          },
          __marker: "override-zotero",
        } as any,
        addon: {
          data: {
            config: {
              addonName: "override-addon",
            },
          },
        } as any,
      });

      const loaded = await loadWorkflowManifests(tmpRoot, {
        workflowSourceKind: "builtin",
      });
      assert.lengthOf(
        loaded.workflows,
        1,
        `warnings=${JSON.stringify(loaded.warnings)} errors=${JSON.stringify(loaded.errors)}`,
      );
      const result = await loaded.workflows[0].hooks.applyResult({
        parent: 1,
        bundleReader: { readText: async () => "" },
        manifest: loaded.workflows[0].manifest,
        runtime: {} as any,
      });
      assert.deepInclude(result as Record<string, unknown>, {
        hasHostApi: true,
        hostApiVersion: 5,
      });
      assert.equal((result as Record<string, unknown>).consoleState, "ok");
      const bundleLog = listRuntimeLogs().find(
        (entry) => entry.stage === "workflow-package-precompile-succeeded",
      );
      assert.isOk(bundleLog, JSON.stringify(listRuntimeLogs(), null, 2));
      const summary = ((bundleLog?.details as Record<string, any>) || {})
        .hostApiSummary;
      assert.equal(summary?.items, true);
      assert.equal(summary?.editor, true);
    });
  });

  it("loads user workflow-package hooks through the Zotero runtime host bundle path", async function () {
    const tmpRoot = await mkTempDir("zotero-skills-user-package-runtime");
    await makeWorkflowPackage({
      rootDir: tmpRoot,
      packageDir: "bundle-user-success",
      packageManifest: {
        id: "bundle-user-success",
        version: "1.0.0",
        workflows: ["workflow-a/workflow.json"],
      },
      files: {
        "shared/helper.mjs":
          "export function sharedLabel(prefix){ return `${prefix}-user-runtime`; }",
        "workflow-a/workflow.json": JSON.stringify(
          {
            id: "workflow-user-runtime-a",
            label: "Workflow User Runtime A",
            provider: "pass-through",
            hooks: {
              applyResult: "hooks/applyResult.mjs",
            },
          },
          null,
          2,
        ),
        "workflow-a/hooks/applyResult.mjs":
          "import { sharedLabel } from '../../shared/helper.mjs'; export async function applyResult(){ return { ok: true, label: sharedLabel('a') }; }",
      },
    });

    await withSimulatedZoteroRuntime(async (counters) => {
      const loaded = await loadWorkflowManifests(tmpRoot, {
        workflowSourceKind: "user",
      });
      assert.lengthOf(
        loaded.workflows,
        1,
        `warnings=${JSON.stringify(loaded.warnings)} errors=${JSON.stringify(loaded.errors)}`,
      );
      const result = await loaded.workflows[0].hooks.applyResult({
        parent: 1,
        bundleReader: { readText: async () => "" },
        manifest: loaded.workflows[0].manifest,
        runtime: {} as any,
      });
      assert.deepInclude(result as Record<string, unknown>, {
        ok: true,
        label: "a-user-runtime",
      });
      assert.equal(loaded.workflows[0].hookExecutionMode, "precompiled-host-hook");
      assert.equal(counters.getImportESModuleCalls(), 0);
      assert.isAtLeast(counters.getLoadSubScriptCalls(), 1);
    });
  });

  it("reports workflow-package bundle failures as hook_import_error in Zotero runtime", async function () {
    const tmpRoot = await mkTempDir("zotero-skills-wf");
    await makeWorkflowPackage({
      rootDir: tmpRoot,
      packageDir: "bundle-runtime-import-failure",
      packageManifest: {
        id: "bundle-runtime-import-failure",
        version: "1.0.0",
        workflows: ["workflow-a/workflow.json"],
      },
      files: {
        "workflow-a/workflow.json": JSON.stringify(
          {
            id: "workflow-runtime-import-failure",
            label: "Workflow Runtime Import Failure",
            provider: "pass-through",
            hooks: {
              applyResult: "hooks/applyResult.mjs",
            },
          },
          null,
          2,
        ),
        "workflow-a/hooks/applyResult.mjs":
          "import { missingHelper } from '../../shared/missing-helper.mjs'; export async function applyResult(){ return { ok: true, label: missingHelper() }; }",
      },
    });

    await withSimulatedZoteroRuntime(async (counters) => {
      const loaded = await loadWorkflowManifests(tmpRoot, {
        workflowSourceKind: "user",
      });
      assert.lengthOf(loaded.workflows, 0);
      assert.isTrue(
        loaded.warnings.some((warning) =>
          warning.includes("Hook import failed: hooks/applyResult.mjs"),
        ),
        `warnings=${JSON.stringify(loaded.warnings)}`,
      );
      assert.isTrue(
        (loaded.diagnostics || []).some(
          (entry) =>
            entry.category === "hook_import_error" &&
            entry.workflowId === "workflow-runtime-import-failure",
        ),
        `diagnostics=${JSON.stringify(loaded.diagnostics || [])}`,
      );
      assert.equal(counters.getImportESModuleCalls(), 0);
      assert.equal(counters.getLoadSubScriptCalls(), 0);
    });
  });

  it("keeps legacy single-workflow hooks on text fallback in Zotero runtime", async function () {
    const tmpRoot = await mkTempDir("zotero-skills-wf");
    await makeWorkflow(
      tmpRoot,
      "legacy-runtime-fallback",
      {
        id: "legacy-runtime-fallback",
        label: "Legacy Runtime Fallback",
        provider: "pass-through",
        hooks: {
          applyResult: "hooks/applyResult.js",
        },
      },
      {
        "applyResult.js":
          "export async function applyResult(){ return { ok: true, mode: 'legacy-runtime' }; }",
      },
    );

    await withSimulatedZoteroRuntime(
      async (counters) => {
        const loaded = await loadWorkflowManifests(tmpRoot);
        assert.lengthOf(
          loaded.workflows,
          1,
          `warnings=${JSON.stringify(loaded.warnings)} errors=${JSON.stringify(loaded.errors)}`,
        );
        const result = await loaded.workflows[0].hooks.applyResult({
          parent: 1,
          bundleReader: { readText: async () => "" },
          manifest: loaded.workflows[0].manifest,
          runtime: {} as any,
        });
        assert.deepInclude(result as Record<string, unknown>, {
          ok: true,
          mode: "legacy-runtime",
        });
        assert.equal(counters.getImportESModuleCalls(), 0);
        assert.isAtLeast(counters.getLoadSubScriptCalls(), 1);
      },
      {
        importESModule: async () => {
          throw new Error("runtime import unavailable for legacy test");
        },
      },
    );
  });

  it("rejects workflow-package hook manifests that do not use .mjs", async function () {
    const tmpRoot = await mkTempDir("zotero-skills-wf");
    await makeWorkflowPackage({
      rootDir: tmpRoot,
      packageDir: "bundle-invalid-js-hook",
      packageManifest: {
        id: "bundle-invalid-js-hook",
        version: "1.0.0",
        workflows: ["workflow-a/workflow.json"],
      },
      files: {
        "workflow-a/workflow.json": JSON.stringify(
          {
            id: "workflow-package-invalid-js-hook",
            label: "Workflow Package Invalid JS Hook",
            provider: "pass-through",
            hooks: {
              applyResult: "hooks/applyResult.js",
            },
          },
          null,
          2,
        ),
        "workflow-a/hooks/applyResult.js":
          "export async function applyResult(){ return { ok: true }; }",
      },
    });

    const loaded = await loadWorkflowManifests(tmpRoot);
    assert.lengthOf(loaded.workflows, 0);
    assert.isTrue(
      loaded.warnings.some((warning) =>
        warning.includes("Workflow-package hook must use .mjs"),
      ),
      `warnings=${JSON.stringify(loaded.warnings)}`,
    );
    assert.isTrue(
      (loaded.diagnostics || []).some(
        (entry) =>
          entry.category === "manifest_validation_error" &&
          entry.workflowId === "workflow-package-invalid-js-hook" &&
          String(entry.reason || "").includes(".mjs"),
      ),
      `diagnostics=${JSON.stringify(loaded.diagnostics || [])}`,
    );
  });

  it("rejects workflow when both buildRequest hook and request are missing", async function () {
    const tmpRoot = await mkTempDir("zotero-skills-wf");
    await makeWorkflow(
      tmpRoot,
      "missing-build",
      {
        id: "missing-build",
        label: "Missing Build",
        provider: "skillrunner",
        hooks: { applyResult: "hooks/applyResult.js" },
      },
      {
        "applyResult.js":
          "export async function applyResult(){ return { ok: true }; }",
      },
    );
    const loaded = await loadWorkflowManifests(tmpRoot);
    assert.lengthOf(loaded.workflows, 0);
    assert.isTrue(
      loaded.warnings.some((warning) =>
        warning.includes("missing hooks.buildRequest and request declaration"),
      ),
    );
  });

  it("accepts pass-through workflow without buildRequest and request", async function () {
    const tmpRoot = await mkTempDir("zotero-skills-wf");
    await makeWorkflow(
      tmpRoot,
      "pass-through-minimal",
      {
        id: "pass-through-minimal",
        label: "Pass Through Minimal",
        provider: "pass-through",
        hooks: { applyResult: "hooks/applyResult.js" },
      },
      {
        "applyResult.js":
          "export async function applyResult(){ return { ok: true }; }",
      },
    );
    const loaded = await loadWorkflowManifests(tmpRoot);
    assert.lengthOf(
      loaded.workflows,
      1,
      `warnings=${JSON.stringify(loaded.warnings)} errors=${JSON.stringify(loaded.errors)}`,
    );
    assert.equal(loaded.workflows[0].buildStrategy, "declarative");
  });

  it("rejects workflow when applyResult hook is missing", async function () {
    const tmpRoot = await mkTempDir("zotero-skills-wf");
    await makeWorkflow(
      tmpRoot,
      "missing-apply",
      {
        id: "missing-apply",
        label: "Missing Apply",
        request: { kind: "skillrunner.job.v1" },
        hooks: { applyResult: "hooks/applyResult.js" },
      },
      {},
    );
    const loaded = await loadWorkflowManifests(tmpRoot);
    assert.lengthOf(loaded.workflows, 0);
    assert.isTrue(
      loaded.warnings.some((warning) => warning.includes("missing-apply")),
    );
  });

  it("rejects fixture workflow when workflow.json is invalid JSON", async function () {
    const loaded = await loadWorkflowManifests(
      fixturePath("workflow-loader-invalid-json"),
    );
    assert.lengthOf(loaded.workflows, 0);
    assert.isTrue(
      loaded.warnings.some((warning) =>
        warning.includes("invalid-json-workflow"),
      ),
      `warnings=${JSON.stringify(loaded.warnings)}`,
    );
    assert.isTrue(
      (loaded.diagnostics || []).some(
        (entry) =>
          entry.category === "manifest_parse_error" &&
          entry.entry === "invalid-json-workflow",
      ),
      `diagnostics=${JSON.stringify(loaded.diagnostics || [])}`,
    );
  });

  it("rejects fixture workflow when required applyResult hook file is missing", async function () {
    const loaded = await loadWorkflowManifests(
      fixturePath("workflow-loader-missing-apply"),
    );
    assert.lengthOf(loaded.workflows, 0);
    assert.isTrue(
      loaded.warnings.some((warning) =>
        warning.includes("missing-apply-workflow"),
      ),
      `warnings=${JSON.stringify(loaded.warnings)}`,
    );
    assert.isTrue(
      loaded.warnings.some((warning) => warning.includes("applyResult.js")),
      `warnings=${JSON.stringify(loaded.warnings)}`,
    );
    assert.isTrue(
      (loaded.diagnostics || []).some(
        (entry) =>
          entry.category === "hook_missing_error" &&
          entry.workflowId === "missing-apply-workflow",
      ),
      `diagnostics=${JSON.stringify(loaded.diagnostics || [])}`,
    );
  });

  it("Risk: MR-01 reports normalizeSettings diagnostics for missing file, import failure, and export mismatch", async function () {
    const cases = [
      {
        id: "normalize-settings-missing-file",
        label: "Normalize Settings Missing File",
        hookFiles: {
          "applyResult.js":
            "export async function applyResult(){ return { ok: true }; }",
        },
        warningIncludes: "Hook file missing: hooks/normalizeSettings.js",
        diagnosticMatcher: (entry: {
          category?: string;
          workflowId?: string;
        }) =>
          entry.category === "hook_missing_error" &&
          entry.workflowId === "normalize-settings-missing-file",
      },
      {
        id: "normalize-settings-import-error",
        label: "Normalize Settings Import Error",
        hookFiles: {
          "applyResult.js":
            "export async function applyResult(){ return { ok: true }; }",
          "normalizeSettings.js":
            "export async function normalizeSettings( { return {}; }",
        },
        warningIncludes: "Hook import failed: hooks/normalizeSettings.js",
        diagnosticMatcher: (entry: {
          category?: string;
          workflowId?: string;
        }) =>
          entry.category === "hook_import_error" &&
          entry.workflowId === "normalize-settings-import-error",
      },
      {
        id: "normalize-settings-export-missing",
        label: "Normalize Settings Export Missing",
        hookFiles: {
          "applyResult.js":
            "export async function applyResult(){ return { ok: true }; }",
          "normalizeSettings.js":
            "export async function notNormalizeSettings(){ return {}; }",
        },
        warningIncludes: "Hook export normalizeSettings() not found",
        diagnosticMatcher: (entry: {
          category?: string;
          workflowId?: string;
          reason?: unknown;
        }) =>
          entry.category === "hook_export_error" &&
          entry.workflowId === "normalize-settings-export-missing" &&
          String(entry.reason || "").includes("normalizeSettings export missing"),
      },
    ];

    for (const entry of cases) {
      const tmpRoot = await mkTempDir("zotero-skills-wf");
      await makeWorkflow(
        tmpRoot,
        entry.id,
        {
          id: entry.id,
          label: entry.label,
          request: { kind: "skillrunner.job.v1" },
          hooks: {
            applyResult: "hooks/applyResult.js",
            normalizeSettings: "hooks/normalizeSettings.js",
          },
        },
        entry.hookFiles,
      );

      const loaded = await loadWorkflowManifests(tmpRoot);
      assert.lengthOf(loaded.workflows, 0, entry.id);
      assert.isTrue(
        loaded.warnings.some((warning) => warning.includes(entry.warningIncludes)),
        `${entry.id}: warnings=${JSON.stringify(loaded.warnings)}`,
      );
      assert.isTrue(
        (loaded.diagnostics || []).some(entry.diagnosticMatcher),
        `${entry.id}: diagnostics=${JSON.stringify(loaded.diagnostics || [])}`,
      );
    }
  });

  it("rejects fixture workflows when required manifest fields are missing or empty", async function () {
    const fixturesRoot = fixturePath("workflow-loader-missing-required-fields");
    const invalidEntries = [
      "missing-id",
      "empty-id",
      "missing-label",
      "empty-label",
      "missing-hooks",
      "missing-apply-path",
      "empty-apply-path",
    ];

    const loaded = await loadWorkflowManifests(fixturesRoot);
    assert.lengthOf(loaded.workflows, 0);

    for (const entry of invalidEntries) {
      assert.isTrue(
        loaded.warnings.some(
          (warning) =>
            warning.includes("Invalid workflow manifest:") &&
            warning.includes(`${entry}`) &&
            warning.includes("workflow.json"),
        ),
        `missing warning for fixture=${entry}, warnings=${JSON.stringify(loaded.warnings)}`,
      );
    }
  });

  it("reports schema-required errors for missing hooks.applyResult", async function () {
    const tmpRoot = await mkTempDir("zotero-skills-wf");
    await makeWorkflow(
      tmpRoot,
      "missing-required-apply-result",
      {
        id: "missing-required-apply-result",
        label: "Missing Required Apply Result",
        request: { kind: "skillrunner.job.v1" },
        hooks: {},
      },
      {},
    );

    const loaded = await loadWorkflowManifests(tmpRoot);
    assert.lengthOf(loaded.workflows, 0);

    const diagnostic = (loaded.diagnostics || []).find(
      (entry) =>
        entry.category === "manifest_validation_error" &&
        entry.entry === "missing-required-apply-result",
    );
    assert.isOk(
      diagnostic,
      `diagnostics=${JSON.stringify(loaded.diagnostics || [])}`,
    );
    assert.include(
      String(diagnostic?.reason || ""),
      "missing required property \"applyResult\"",
      `diagnostics=${JSON.stringify(loaded.diagnostics || [])}`,
    );
  });

  it("validates parameters.allowCustom accepts boolean and rejects non-boolean", async function () {
    const cases = [
      {
        id: "allow-custom-valid",
        manifest: {
          id: "allow-custom-valid",
          label: "Allow Custom Valid",
          request: { kind: "skillrunner.job.v1" },
          parameters: {
            language: {
              type: "string",
              enum: ["zh-CN", "en-US"],
              allowCustom: true,
              default: "zh-CN",
            },
          },
          hooks: { applyResult: "hooks/applyResult.js" },
        },
        expectValid: true,
      },
      {
        id: "allow-custom-invalid",
        manifest: {
          id: "allow-custom-invalid",
          label: "Allow Custom Invalid",
          request: { kind: "skillrunner.job.v1" },
          parameters: {
            language: {
              type: "string",
              enum: ["zh-CN", "en-US"],
              allowCustom: "yes",
              default: "zh-CN",
            },
          },
          hooks: { applyResult: "hooks/applyResult.js" },
        },
        expectValid: false,
        expectedReasonIncludes: ["/parameters/language/allowCustom", "must be boolean"],
      },
    ];

    for (const entry of cases) {
      const tmpRoot = await mkTempDir("zotero-skills-wf");
      await makeWorkflow(tmpRoot, entry.id, entry.manifest, {
        "applyResult.js":
          "export async function applyResult(){ return { ok: true }; }",
      });

      const loaded = await loadWorkflowManifests(tmpRoot);
      if (entry.expectValid) {
        assert.lengthOf(
          loaded.workflows,
          1,
          `${entry.id}: warnings=${JSON.stringify(loaded.warnings)} errors=${JSON.stringify(loaded.errors)}`,
        );
        continue;
      }

      assert.lengthOf(loaded.workflows, 0, entry.id);
      const diagnostic = (loaded.diagnostics || []).find(
        (candidate) =>
          candidate.category === "manifest_validation_error" &&
          candidate.entry === entry.id,
      );
      assert.isOk(diagnostic, `${entry.id}: diagnostics=${JSON.stringify(loaded.diagnostics || [])}`);
      for (const expected of entry.expectedReasonIncludes || []) {
        assert.include(String(diagnostic?.reason || ""), expected, entry.id);
      }
    }
  });

  it("loads package workflow locale resources without mutating raw manifests", async function () {
    const tmpRoot = await mkTempDir("zotero-skills-wf-i18n");
    await makeWorkflowPackage({
      rootDir: tmpRoot,
      packageDir: "localized-package",
      packageManifest: {
        id: "localized-package",
        version: "1.0.0",
        i18n: {
          defaultLocale: "en-US",
          locales: {
            "zh-CN": "locales/zh-CN.json",
          },
        },
        workflows: ["localized-workflow/workflow.json"],
      },
      files: {
        "locales/zh-CN.json": JSON.stringify({
          "workflows.localized-workflow.label": "本地化 Workflow",
          "workflows.localized-workflow.parameters.language.title": "输出语言",
        }),
        "localized-workflow/workflow.json": JSON.stringify({
          id: "localized-workflow",
          label: "Localized Workflow",
          provider: "pass-through",
          parameters: {
            language: {
              type: "string",
              title: "Language",
              default: "zh-CN",
            },
          },
          hooks: {
            applyResult: "hooks/applyResult.mjs",
          },
        }),
        "localized-workflow/hooks/applyResult.mjs":
          "export async function applyResult(){ return { ok: true }; }",
      },
    });

    const loaded = await loadWorkflowManifests(tmpRoot);
    assert.lengthOf(loaded.workflows, 1, JSON.stringify(loaded.diagnostics));
    const workflow = loaded.workflows[0];
    assert.equal(workflow.manifest.label, "Localized Workflow");
    assert.equal(localizeWorkflowLabel(workflow, "zh-CN"), "本地化 Workflow");
  });

  it("keeps package workflows loadable when locale resources are invalid", async function () {
    const tmpRoot = await mkTempDir("zotero-skills-wf-i18n-invalid");
    await makeWorkflowPackage({
      rootDir: tmpRoot,
      packageDir: "invalid-locale-package",
      packageManifest: {
        id: "invalid-locale-package",
        version: "1.0.0",
        i18n: {
          locales: {
            "zh-CN": "locales/zh-CN.json",
            "fr-FR": "../outside.json",
          },
        },
        workflows: ["workflow-a/workflow.json"],
      },
      files: {
        "locales/zh-CN.json": JSON.stringify({
          "workflows.workflow-a.label": 42,
        }),
        "workflow-a/workflow.json": JSON.stringify({
          id: "workflow-a",
          label: "Workflow A",
          provider: "pass-through",
          hooks: {
            applyResult: "hooks/applyResult.mjs",
          },
        }),
        "workflow-a/hooks/applyResult.mjs":
          "export async function applyResult(){ return { ok: true }; }",
      },
    });

    const loaded = await loadWorkflowManifests(tmpRoot);
    assert.lengthOf(loaded.workflows, 1, JSON.stringify(loaded.diagnostics));
    assert.equal(localizeWorkflowLabel(loaded.workflows[0], "zh-CN"), "Workflow A");
    assert.isAtLeast(
      (loaded.diagnostics || []).filter(
        (entry) => entry.category === "manifest_validation_error",
      ).length,
      2,
      JSON.stringify(loaded.diagnostics || []),
    );
  });

  it("validates workflow inline i18n messages", async function () {
    const cases = [
      {
        id: "inline-i18n-valid",
        manifest: {
          id: "inline-i18n-valid",
          label: "Inline I18n Valid",
          provider: "pass-through",
          i18n: {
            defaultLocale: "en-US",
            messages: {
              "zh-CN": {
                label: "内联多语言有效",
              },
            },
          },
          hooks: { applyResult: "hooks/applyResult.js" },
        },
        expectValid: true,
      },
      {
        id: "inline-i18n-invalid",
        manifest: {
          id: "inline-i18n-invalid",
          label: "Inline I18n Invalid",
          provider: "pass-through",
          i18n: {
            messages: {
              "zh-CN": {
                label: 42,
              },
            },
          },
          hooks: { applyResult: "hooks/applyResult.js" },
        },
        expectValid: false,
        expectedReasonIncludes: ["/i18n/messages/zh-CN/label", "must be string"],
      },
    ];

    for (const entry of cases) {
      const tmpRoot = await mkTempDir("zotero-skills-wf-inline-i18n");
      await makeWorkflow(tmpRoot, entry.id, entry.manifest, {
        "applyResult.js":
          "export async function applyResult(){ return { ok: true }; }",
      });
      const loaded = await loadWorkflowManifests(tmpRoot);
      if (entry.expectValid) {
        assert.lengthOf(loaded.workflows, 1, entry.id);
        assert.equal(
          localizeWorkflowLabel(loaded.workflows[0], "zh-CN"),
          "内联多语言有效",
        );
        continue;
      }
      assert.lengthOf(loaded.workflows, 0, entry.id);
      const diagnostic = (loaded.diagnostics || []).find(
        (candidate) =>
          candidate.category === "manifest_validation_error" &&
          candidate.entry === entry.id,
      );
      assert.isOk(diagnostic, `${entry.id}: diagnostics=${JSON.stringify(loaded.diagnostics || [])}`);
      for (const expected of entry.expectedReasonIncludes || []) {
        assert.include(String(diagnostic?.reason || ""), expected, entry.id);
      }
    }
  });

  it("validates workflow display metadata", async function () {
    const cases = [
      {
        id: "display-valid",
        manifest: {
          id: "display-valid",
          label: "Display Valid",
          provider: "pass-through",
          display: {
            core: true,
            emoji: "📊",
          },
          hooks: { applyResult: "hooks/applyResult.js" },
        },
        expectValid: true,
      },
      {
        id: "display-invalid-core",
        manifest: {
          id: "display-invalid-core",
          label: "Display Invalid Core",
          provider: "pass-through",
          display: {
            core: "yes",
          },
          hooks: { applyResult: "hooks/applyResult.js" },
        },
        expectValid: false,
        expectedReasonIncludes: ["/display/core", "must be boolean"],
      },
      {
        id: "display-invalid-emoji",
        manifest: {
          id: "display-invalid-emoji",
          label: "Display Invalid Emoji",
          provider: "pass-through",
          display: {
            emoji: 42,
          },
          hooks: { applyResult: "hooks/applyResult.js" },
        },
        expectValid: false,
        expectedReasonIncludes: ["/display/emoji", "must be string"],
      },
    ];

    for (const entry of cases) {
      const tmpRoot = await mkTempDir("zotero-skills-wf-display");
      await makeWorkflow(tmpRoot, entry.id, entry.manifest, {
        "applyResult.js":
          "export async function applyResult(){ return { ok: true }; }",
      });
      const loaded = await loadWorkflowManifests(tmpRoot);
      if (entry.expectValid) {
        assert.lengthOf(loaded.workflows, 1, entry.id);
        assert.isTrue(isCoreWorkflow(loaded.workflows[0]));
        assert.equal(localizeWorkflowLabel(loaded.workflows[0]), "📊 Display Valid");
        continue;
      }
      assert.lengthOf(loaded.workflows, 0, entry.id);
      const diagnostic = (loaded.diagnostics || []).find(
        (candidate) =>
          candidate.category === "manifest_validation_error" &&
          candidate.entry === entry.id,
      );
      assert.isOk(diagnostic, `${entry.id}: diagnostics=${JSON.stringify(loaded.diagnostics || [])}`);
      for (const expected of entry.expectedReasonIncludes || []) {
        assert.include(String(diagnostic?.reason || ""), expected, entry.id);
      }
    }
  });

  it("validates execution.feedback.showNotifications accepts boolean and rejects non-boolean", async function () {
    const cases = [
      {
        id: "execution-feedback-valid",
        manifest: {
          id: "execution-feedback-valid",
          label: "Execution Feedback Valid",
          provider: "pass-through",
          execution: { feedback: { showNotifications: false } },
          hooks: { applyResult: "hooks/applyResult.js" },
        },
        expectValid: true,
      },
      {
        id: "execution-feedback-invalid",
        manifest: {
          id: "execution-feedback-invalid",
          label: "Execution Feedback Invalid",
          provider: "pass-through",
          execution: { feedback: { showNotifications: "no" } },
          hooks: { applyResult: "hooks/applyResult.js" },
        },
        expectValid: false,
        expectedReasonIncludes: ["/execution/feedback/showNotifications", "must be boolean"],
      },
    ];

    for (const entry of cases) {
      const tmpRoot = await mkTempDir("zotero-skills-wf");
      await makeWorkflow(tmpRoot, entry.id, entry.manifest, {
        "applyResult.js":
          "export async function applyResult(){ return { ok: true }; }",
      });
      const loaded = await loadWorkflowManifests(tmpRoot);
      if (entry.expectValid) {
        assert.lengthOf(loaded.workflows, 1, entry.id);
        continue;
      }
      assert.lengthOf(loaded.workflows, 0, entry.id);
      const diagnostic = (loaded.diagnostics || []).find(
        (candidate) =>
          candidate.category === "manifest_validation_error" &&
          candidate.entry === entry.id,
      );
      assert.isOk(diagnostic, `${entry.id}: diagnostics=${JSON.stringify(loaded.diagnostics || [])}`);
      for (const expected of entry.expectedReasonIncludes || []) {
        assert.include(String(diagnostic?.reason || ""), expected, entry.id);
      }
    }
  });

  it("validates trigger.requiresSelection accepts boolean and rejects non-boolean", async function () {
    const cases = [
      {
        id: "trigger-requires-selection-valid",
        manifest: {
          id: "trigger-requires-selection-valid",
          label: "Trigger Requires Selection Valid",
          provider: "pass-through",
          trigger: { requiresSelection: false },
          hooks: { applyResult: "hooks/applyResult.js" },
        },
        expectValid: true,
        verifyLoaded: (loaded: Awaited<ReturnType<typeof loadWorkflowManifests>>) => {
          assert.strictEqual(loaded.workflows[0].manifest.trigger?.requiresSelection, false);
        },
      },
      {
        id: "trigger-requires-selection-invalid",
        manifest: {
          id: "trigger-requires-selection-invalid",
          label: "Trigger Requires Selection Invalid",
          provider: "pass-through",
          trigger: { requiresSelection: "no" },
          hooks: { applyResult: "hooks/applyResult.js" },
        },
        expectValid: false,
        expectedReasonIncludes: ["/trigger/requiresSelection", "must be boolean"],
      },
    ];

    for (const entry of cases) {
      const tmpRoot = await mkTempDir("zotero-skills-wf");
      await makeWorkflow(tmpRoot, entry.id, entry.manifest, {
        "applyResult.js":
          "export async function applyResult(){ return { ok: true }; }",
      });
      const loaded = await loadWorkflowManifests(tmpRoot);
      if (entry.expectValid) {
        assert.lengthOf(loaded.workflows, 1, entry.id);
        entry.verifyLoaded?.(loaded);
        continue;
      }
      assert.lengthOf(loaded.workflows, 0, entry.id);
      const diagnostic = (loaded.diagnostics || []).find(
        (candidate) =>
          candidate.category === "manifest_validation_error" &&
          candidate.entry === entry.id,
      );
      assert.isOk(diagnostic, `${entry.id}: diagnostics=${JSON.stringify(loaded.diagnostics || [])}`);
      for (const expected of entry.expectedReasonIncludes || []) {
        assert.include(String(diagnostic?.reason || ""), expected, entry.id);
      }
    }
  });

  it("validates skill-level mode presence for skillrunner workflows", async function () {
    const cases = [
      {
        id: "skillrunner-job-mode-valid",
        manifest: {
          id: "skillrunner-job-mode-valid",
          label: "SkillRunner Job Mode Valid",
          request: {
            kind: "skillrunner.job.v1",
            create: {
              skill_id: "demo",
              mode: "interactive",
            },
          },
          hooks: { applyResult: "hooks/applyResult.js" },
        },
        expectValid: true,
        verifyLoaded: (loaded: Awaited<ReturnType<typeof loadWorkflowManifests>>) => {
          assert.equal(loaded.workflows[0].manifest.request?.create?.mode, "interactive");
        },
      },
      {
        id: "skillrunner-job-mode-missing",
        manifest: {
          id: "skillrunner-job-mode-missing",
          label: "SkillRunner Job Mode Missing",
          request: {
            kind: "skillrunner.job.v1",
            create: {
              skill_id: "demo",
            },
          },
          __test_skip_skillrunner_request_mode_autofill: true,
          hooks: { applyResult: "hooks/applyResult.js" },
        },
        expectValid: false,
        expectedReasonIncludes: ["missing required property"],
        expectedReasonPattern: /create|mode/i,
      },
      {
        id: "skillrunner-execution-mode-rejected",
        manifest: {
          id: "skillrunner-execution-mode-rejected",
          label: "SkillRunner Execution Mode Rejected",
          request: {
            kind: "skillrunner.job.v1",
            create: {
              skill_id: "demo",
              mode: "auto",
            },
          },
          execution: { mode: "auto" },
          hooks: { applyResult: "hooks/applyResult.js" },
        },
        expectValid: false,
        expectedReasonIncludes: ["mode"],
        expectedReasonPattern: /mode/i,
      },
      {
        id: "skillrunner-execution-skillrunner-mode-rejected",
        manifest: {
          id: "skillrunner-execution-skillrunner-mode-rejected",
          label: "SkillRunner Execution SkillRunner Mode Rejected",
          request: {
            kind: "skillrunner.job.v1",
            create: {
              skill_id: "demo",
              mode: "auto",
            },
          },
          execution: { skillrunner_mode: "auto" },
          hooks: { applyResult: "hooks/applyResult.js" },
        },
        expectValid: false,
        expectedReasonIncludes: ["skillrunner_mode"],
        expectedReasonPattern: /skillrunner_mode/i,
      },
    ];

    for (const entry of cases) {
      const tmpRoot = await mkTempDir("zotero-skills-wf");
      await makeWorkflow(tmpRoot, entry.id, entry.manifest, {
        "applyResult.js":
          "export async function applyResult(){ return { ok: true }; }",
      });
      const loaded = await loadWorkflowManifests(tmpRoot);
      if (entry.expectValid) {
        assert.lengthOf(loaded.workflows, 1, entry.id);
        entry.verifyLoaded?.(loaded);
        continue;
      }
      assert.lengthOf(loaded.workflows, 0, entry.id);
      const diagnostic = (loaded.diagnostics || []).find(
        (candidate) =>
          candidate.category === "manifest_validation_error" &&
          candidate.entry === entry.id,
      );
      assert.isOk(diagnostic, `${entry.id}: diagnostics=${JSON.stringify(loaded.diagnostics || [])}`);
      for (const expected of entry.expectedReasonIncludes || []) {
        assert.include(String(diagnostic?.reason || ""), expected, entry.id);
      }
      assert.match(String(diagnostic?.reason || ""), entry.expectedReasonPattern!, entry.id);
    }
  });

  it("rejects manifests containing deprecated fields through schema validation", async function () {
    const tmpRoot = await mkTempDir("zotero-skills-wf");
    const cases: Array<{
      id: string;
      manifest: Record<string, unknown>;
      reasonIncludes: string;
    }> = [
      {
        id: "deprecated-backend",
        reasonIncludes: "/backend uses deprecated field",
        manifest: {
          id: "deprecated-backend",
          label: "Deprecated Backend",
          backend: "legacy-backend",
          request: { kind: "skillrunner.job.v1" },
          hooks: { applyResult: "hooks/applyResult.js" },
        },
      },
      {
        id: "deprecated-defaults",
        reasonIncludes: "/defaults uses deprecated field",
        manifest: {
          id: "deprecated-defaults",
          label: "Deprecated Defaults",
          defaults: {},
          request: { kind: "skillrunner.job.v1" },
          hooks: { applyResult: "hooks/applyResult.js" },
        },
      },
      {
        id: "deprecated-request-result",
        reasonIncludes: "/request/result uses deprecated field",
        manifest: {
          id: "deprecated-request-result",
          label: "Deprecated Request Result",
          request: {
            kind: "skillrunner.job.v1",
            result: {},
          },
          hooks: { applyResult: "hooks/applyResult.js" },
        },
      },
      {
        id: "deprecated-request-create-engine",
        reasonIncludes: "/request/create/engine uses deprecated field",
        manifest: {
          id: "deprecated-request-create-engine",
          label: "Deprecated Request Create Engine",
          request: {
            kind: "skillrunner.job.v1",
            create: {
              skill_id: "literature-analysis",
              engine: "openai",
            },
          },
          hooks: { applyResult: "hooks/applyResult.js" },
        },
      },
      {
        id: "deprecated-request-create-parameter",
        reasonIncludes: "/request/create/parameter uses deprecated field",
        manifest: {
          id: "deprecated-request-create-parameter",
          label: "Deprecated Request Create Parameter",
          request: {
            kind: "skillrunner.job.v1",
            create: {
              skill_id: "literature-analysis",
              parameter: {},
            },
          },
          hooks: { applyResult: "hooks/applyResult.js" },
        },
      },
      {
        id: "deprecated-request-create-model",
        reasonIncludes: "/request/create/model uses deprecated field",
        manifest: {
          id: "deprecated-request-create-model",
          label: "Deprecated Request Create Model",
          request: {
            kind: "skillrunner.job.v1",
            create: {
              skill_id: "literature-analysis",
              model: "gpt-4o-mini",
            },
          },
          hooks: { applyResult: "hooks/applyResult.js" },
        },
      },
      {
        id: "deprecated-request-create-runtime-options",
        reasonIncludes: "/request/create/runtime_options uses deprecated field",
        manifest: {
          id: "deprecated-request-create-runtime-options",
          label: "Deprecated Request Create Runtime Options",
          request: {
            kind: "skillrunner.job.v1",
            create: {
              skill_id: "literature-analysis",
              runtime_options: {},
            },
          },
          hooks: { applyResult: "hooks/applyResult.js" },
        },
      },
    ];

    for (const entry of cases) {
      await makeWorkflow(
        tmpRoot,
        entry.id,
        entry.manifest,
        {
          "applyResult.js":
            "export async function applyResult(){ return { ok: true }; }",
        },
      );
    }

    const loaded = await loadWorkflowManifests(tmpRoot);
    assert.lengthOf(loaded.workflows, 0);

    for (const entry of cases) {
      const diagnostic = (loaded.diagnostics || []).find(
        (item) =>
          item.category === "manifest_validation_error" && item.entry === entry.id,
      );
      assert.isOk(
        diagnostic,
        `missing diagnostic entry=${entry.id}; diagnostics=${JSON.stringify(loaded.diagnostics || [])}`,
      );
      assert.include(
        String(diagnostic?.reason || ""),
        entry.reasonIncludes,
        `entry=${entry.id}; diagnostics=${JSON.stringify(loaded.diagnostics || [])}`,
      );
    }
  });

  it("emits deterministic ordering for loaded workflows and diagnostics", async function () {
    const tmpRoot = await mkTempDir("zotero-skills-wf");
    await makeWorkflow(
      tmpRoot,
      "z-workflow",
      {
        id: "z-workflow",
        label: "Z Workflow",
        request: { kind: "skillrunner.job.v1" },
        hooks: { applyResult: "hooks/applyResult.js" },
      },
      {
        "applyResult.js":
          "export async function applyResult(){ return { ok: true }; }",
      },
    );
    await makeWorkflow(
      tmpRoot,
      "a-workflow",
      {
        id: "a-workflow",
        label: "A Workflow",
        request: { kind: "skillrunner.job.v1" },
        hooks: { applyResult: "hooks/applyResult.js" },
      },
      {
        "applyResult.js":
          "export async function applyResult(){ return { ok: true }; }",
      },
    );
    await makeWorkflow(
      tmpRoot,
      "broken-workflow",
      {
        id: "broken-workflow",
        label: "Broken Workflow",
        request: { kind: "skillrunner.job.v1" },
        hooks: { applyResult: "hooks/applyResult.js" },
      },
      {},
    );

    const first = await loadWorkflowManifests(tmpRoot);
    const second = await loadWorkflowManifests(tmpRoot);

    assert.deepEqual(
      first.workflows.map((entry) => entry.manifest.id),
      ["a-workflow", "z-workflow"],
    );
    assert.deepEqual(
      second.workflows.map((entry) => entry.manifest.id),
      ["a-workflow", "z-workflow"],
    );
    assert.deepEqual(first.warnings, second.warnings);
    assert.deepEqual(first.errors, second.errors);
    assert.deepEqual(first.diagnostics || [], second.diagnostics || []);
  });
});
