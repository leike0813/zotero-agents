import { assert } from "chai";
import fs from "fs/promises";
import path from "path";
import {
  __builtinWorkflowSyncTestOnly,
  clearLatestBuiltinWorkflowSyncResultForTests,
  getLatestBuiltinWorkflowSyncResult,
  syncBuiltinWorkflowsOnStartup,
} from "../../../src/modules/builtinWorkflowSync";
import {
  __workflowRuntimeTestOnly,
  rescanWorkflowRegistry,
} from "../../../src/modules/workflowRuntime";
import {
  __workflowLoaderTestOnly,
  loadWorkflowManifests,
} from "../../../src/workflows/loader";

async function listSourceFiles(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listSourceFiles(fullPath)));
      continue;
    }
    if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

function installFetchMock(
  handler: (url: string) => Promise<Response> | Response,
) {
  const runtime = globalThis as typeof globalThis & {
    fetch?: typeof fetch;
  };
  const previous = runtime.fetch;
  runtime.fetch = ((input: RequestInfo | URL) =>
    handler(String(input))) as typeof fetch;
  return () => {
    runtime.fetch = previous;
  };
}

async function writeJson(filePath: string, value: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function createMinimalWorkflowPackage(root: string) {
  const packageRoot = path.join(root, "runtime-package");
  await writeJson(path.join(packageRoot, "workflow-package.json"), {
    id: "runtime-package",
    version: "1.0.0",
    workflows: ["runtime-workflow/workflow.json"],
  });
  await writeJson(path.join(packageRoot, "runtime-workflow", "workflow.json"), {
    id: "runtime-workflow",
    label: "Runtime Workflow",
    provider: "acp",
    version: "1.0.0",
    inputs: { unit: "workflow" },
    request: { kind: "acp.workflow.v1" },
    hooks: { applyResult: "../hooks/apply.mjs" },
  });
  await fs.mkdir(path.join(packageRoot, "hooks"), { recursive: true });
  await fs.writeFile(
    path.join(packageRoot, "hooks", "apply.mjs"),
    "export async function applyResult() { return { ok: true }; }\n",
    "utf8",
  );
}

function installZotero9SandboxFileRuntime(tempRoot: string) {
  const runtime = globalThis as typeof globalThis & {
    IOUtils?: unknown;
    PathUtils?: unknown;
    Services?: unknown;
    Zotero?: typeof Zotero;
    Cc?: unknown;
    Ci?: unknown;
  };
  const descriptors = {
    IOUtils: Object.getOwnPropertyDescriptor(runtime, "IOUtils"),
    PathUtils: Object.getOwnPropertyDescriptor(runtime, "PathUtils"),
    Services: Object.getOwnPropertyDescriptor(runtime, "Services"),
    Zotero: Object.getOwnPropertyDescriptor(runtime, "Zotero"),
    Cc: Object.getOwnPropertyDescriptor(runtime, "Cc"),
    Ci: Object.getOwnPropertyDescriptor(runtime, "Ci"),
  };
  const previous = {
    IOUtils: runtime.IOUtils,
    PathUtils: runtime.PathUtils,
    Services: runtime.Services,
    Zotero: runtime.Zotero,
    Cc: runtime.Cc,
    Ci: runtime.Ci,
  };
  Object.defineProperty(runtime, "Cc", {
    configurable: true,
    writable: true,
    value: undefined,
  });
  Object.defineProperty(runtime, "Ci", {
    configurable: true,
    writable: true,
    value: undefined,
  });
  Object.defineProperty(runtime, "IOUtils", {
    configurable: true,
    writable: true,
    value: {
      readUTF8: (filePath: string) => fs.readFile(filePath, "utf8"),
      getChildren: async (dirPath: string) =>
        (await fs.readdir(dirPath)).map((name) => path.join(dirPath, name)),
      stat: async (targetPath: string) => {
        const stat = await fs.stat(targetPath);
        return { type: stat.isDirectory() ? "directory" : "regular" };
      },
      writeUTF8: async (filePath: string, content: string) => {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, content, "utf8");
      },
      remove: (filePath: string) => fs.rm(filePath, { force: true }),
    },
  });
  Object.defineProperty(runtime, "PathUtils", {
    configurable: true,
    writable: true,
    value: { tempDir: tempRoot },
  });
  Object.defineProperty(runtime, "Services", {
    configurable: true,
    writable: true,
    value: {
      io: {
        newFileURI: (filePath: unknown) => ({ spec: String(filePath) }),
      },
      storage: {
        openDatabase: () => ({
          createStatement: () => ({
            bindByName: () => undefined,
            executeStep: () => false,
            finalize: () => undefined,
          }),
          executeSimpleSQL: () => undefined,
        }),
      },
      scriptloader: {
        loadSubScript: (scriptPath: string, scope: Record<string, unknown>) => {
          const scriptText = require("fs").readFileSync(scriptPath, "utf8");
          const runner = new Function(scriptText) as () => void;
          runner.call(scope);
        },
      },
    },
  });
  Object.defineProperty(runtime, "Zotero", {
    configurable: true,
    writable: true,
    value: {
      ...(previous.Zotero || {}),
      version: "9.0.0",
      File: {
        ...(previous.Zotero?.File || {}),
        pathToFile: (filePath: string) => filePath,
      },
    } as typeof Zotero,
  });
  return () => {
    for (const key of Object.keys(descriptors) as Array<
      keyof typeof descriptors
    >) {
      const descriptor = descriptors[key];
      if (descriptor) {
        Object.defineProperty(runtime, key, descriptor);
      } else {
        delete runtime[key];
      }
    }
  };
}

describe("Zotero 9 compatibility baseline", function () {
  afterEach(function () {
    clearLatestBuiltinWorkflowSyncResultForTests();
  });

  it("reads packaged workflow text from rootURI before other candidates", async function () {
    const seen: string[] = [];
    const restore = installFetchMock((url) => {
      seen.push(url);
      return new Response("root manifest", { status: 200 });
    });
    try {
      const result =
        await __builtinWorkflowSyncTestOnly.readPackagedTextForTests({
          rootURI: "https://root.example/addon/",
          resourceURI: "https://resource.example/addon/",
          relativePath: "manifest.json",
          devCwd: path.join(process.cwd(), "missing-dev-cwd"),
        });
      assert.equal(result.text, "root manifest");
      assert.equal(result.source.label, "rootURI-fetch");
      assert.deepEqual(seen, [
        "https://root.example/addon/workflows_builtin/manifest.json",
      ]);
    } finally {
      restore();
    }
  });

  it("falls back from rootURI fetch to resourceURI fetch", async function () {
    const seen: string[] = [];
    const restore = installFetchMock((url) => {
      seen.push(url);
      if (url.startsWith("https://resource.example/")) {
        return new Response("resource manifest", { status: 200 });
      }
      return new Response("missing", { status: 404 });
    });
    try {
      const result =
        await __builtinWorkflowSyncTestOnly.readPackagedTextForTests({
          rootURI: "https://root.example/addon/",
          resourceURI: "https://resource.example/addon/",
          relativePath: "manifest.json",
          devCwd: path.join(process.cwd(), "missing-dev-cwd"),
        });
      assert.equal(result.text, "resource manifest");
      assert.equal(result.source.label, "resourceURI-fetch");
      assert.deepEqual(seen, [
        "https://root.example/addon/workflows_builtin/manifest.json",
        "https://resource.example/addon/workflows_builtin/manifest.json",
      ]);
    } finally {
      restore();
    }
  });

  it("falls back to development cwd when runtime resource reads fail", async function () {
    const restore = installFetchMock(
      () => new Response("missing", { status: 404 }),
    );
    try {
      const result =
        await __builtinWorkflowSyncTestOnly.readPackagedTextForTests({
          rootURI: "https://root.example/addon/",
          resourceURI: "https://resource.example/addon/",
          relativePath: "manifest.json",
          devCwd: process.cwd(),
        });
      assert.include(result.text, '"files"');
      assert.equal(result.source.label, "dev-cwd");
      assert.isAtLeast(result.diagnostics.failures.length, 2);
    } finally {
      restore();
    }
  });

  it("records built-in sync failure diagnostics when all candidates fail", async function () {
    const tempRoot = await fs.mkdtemp(
      path.join(process.cwd(), ".tmp-zotero9-sync-fail-"),
    );
    const restore = installFetchMock(
      () => new Response("missing", { status: 404 }),
    );
    const previousDataDirectory = (
      Zotero as unknown as {
        DataDirectory?: unknown;
      }
    ).DataDirectory;
    (Zotero as unknown as { DataDirectory?: { dir: string } }).DataDirectory = {
      dir: path.join(tempRoot, "zotero-data"),
    };
    try {
      let rejection: unknown;
      try {
        await syncBuiltinWorkflowsOnStartup({
          rootURI: "https://root.example/addon/",
          resourceURI: "https://resource.example/addon/",
          devCwd: tempRoot,
        });
      } catch (error) {
        rejection = error;
      }
      assert.match(
        String(rejection instanceof Error ? rejection.message : rejection),
        /failed to read packaged builtin workflow resource/,
      );
      const latest = getLatestBuiltinWorkflowSyncResult();
      assert.equal(latest?.ok, false);
      assert.equal(
        latest?.targetRoot,
        path.join(
          tempRoot,
          "zotero-data",
          "zotero-agents",
          "data",
          "workflows_builtin",
        ),
      );
      assert.isAtLeast(latest?.diagnostics?.failures.length || 0, 2);
      assert.include(JSON.stringify(latest), "rootURI-fetch");
      assert.include(JSON.stringify(latest), "resourceURI-fetch");
    } finally {
      (Zotero as unknown as { DataDirectory?: unknown }).DataDirectory =
        previousDataDirectory;
      restore();
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("loads workflow hooks in Zotero 9-style sandbox without global Cc/Ci", async function () {
    const tempRoot = await fs.mkdtemp(
      path.join(process.cwd(), ".tmp-zotero9-loader-"),
    );
    await createMinimalWorkflowPackage(path.join(tempRoot, "workflows"));
    const restoreRuntime = installZotero9SandboxFileRuntime(tempRoot);
    try {
      assert.equal(__workflowLoaderTestOnly.isZoteroRuntime(), true);
      const loaded = await loadWorkflowManifests(
        path.join(tempRoot, "workflows"),
        {
          workflowSourceKind: "builtin",
        },
      );
      assert.deepEqual(
        loaded.workflows.map((workflow) => workflow.manifest.id),
        ["runtime-workflow"],
      );
      assert.equal(
        loaded.workflows[0]?.hookExecutionMode,
        "precompiled-host-hook",
      );
      assert.deepEqual(loaded.errors, []);
      assert.deepEqual(loaded.warnings, []);
    } finally {
      restoreRuntime();
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("persists workflow registry diagnostics after registry scan", async function () {
    const tempRoot = await fs.mkdtemp(
      path.join(process.cwd(), ".tmp-zotero9-registry-"),
    );
    const dataDir = path.join(tempRoot, "zotero-data");
    const builtinDir = path.join(
      dataDir,
      "zotero-agents",
      "content",
      "official",
      "workflows",
    );
    const userDir = path.join(
      dataDir,
      "zotero-agents",
      "content",
      "user",
      "workflows",
    );
    await createMinimalWorkflowPackage(builtinDir);
    await fs.mkdir(userDir, { recursive: true });
    const previousDataDirectory = (
      Zotero as unknown as {
        DataDirectory?: unknown;
      }
    ).DataDirectory;
    (Zotero as unknown as { DataDirectory?: { dir: string } }).DataDirectory = {
      dir: dataDir,
    };
    try {
      const state = await rescanWorkflowRegistry({ workflowsDir: userDir });
      assert.equal(state.loadedFromBuiltin.workflows.length, 1);
      const statusPath =
        __workflowRuntimeTestOnly.getWorkflowRegistryStatusFilePath();
      const status = JSON.parse(await fs.readFile(statusPath, "utf8"));
      assert.equal(status.schema_id, "zotero-skills.workflow_registry_status");
      assert.equal(status.builtin_workflows_dir, builtinDir);
      assert.equal(status.loaded_builtin_workflow_count, 1);
      assert.deepEqual(
        status.builtin_workflows.map((workflow: { id: string }) => workflow.id),
        ["runtime-workflow"],
      );
      assert.deepEqual(status.errors, []);
    } finally {
      (Zotero as unknown as { DataDirectory?: unknown }).DataDirectory =
        previousDataDirectory;
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("declares Zotero 7 through Zotero 9.0 manifest compatibility", async function () {
    const manifest = JSON.parse(
      await fs.readFile(
        path.join(process.cwd(), "addon", "manifest.json"),
        "utf8",
      ),
    );
    assert.equal(manifest.applications.zotero.strict_min_version, "7.0");
    assert.equal(manifest.applications.zotero.strict_max_version, "9.0.*");
  });

  it("keeps high-risk Zotero runtime API access behind compatibility helpers", async function () {
    const sourceFiles = (await listSourceFiles(path.join(process.cwd(), "src")))
      .filter((file) => /\.(ts|js|mjs)$/.test(file))
      .map((file) => path.relative(process.cwd(), file).replace(/\\/g, "/"));
    const allowDirectDelay = new Set(["src/utils/runtimeCompatibility.ts"]);
    const allowSubprocessImport = new Set([
      "src/utils/runtimeCompatibility.ts",
    ]);
    const allowOsFile = new Set([
      "src/utils/runtimeCompatibility.ts",
      "src/modules/runtimePersistence.ts",
    ]);

    for (const relativePath of sourceFiles) {
      const text = await fs.readFile(
        path.join(process.cwd(), relativePath),
        "utf8",
      );
      if (!allowDirectDelay.has(relativePath)) {
        assert.notInclude(text, "Zotero.Promise.delay", relativePath);
      }
      if (!allowSubprocessImport.has(relativePath)) {
        assert.notInclude(text, "Subprocess.jsm", relativePath);
        assert.notMatch(text, /ChromeUtils\.import\s*\(/, relativePath);
      }
      if (!allowOsFile.has(relativePath)) {
        assert.notInclude(text, "OS.File", relativePath);
      }
    }
  });
});
