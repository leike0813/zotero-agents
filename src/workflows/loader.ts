import type {
  ApplyResultHook,
  BuildRequestHook,
  NormalizeWorkflowSettingsHook,
  LoadedWorkflow,
  LoadedWorkflows,
  WorkflowHooksModule,
  WorkflowI18nLocaleMessages,
  WorkflowLocalizationResources,
  WorkflowManifest,
} from "./types";
import { getBaseName, joinPath } from "../utils/path";
import {
  createLoaderDiagnostic,
  normalizeDirectoryEntries,
  normalizeManifestProvider,
  parseWorkflowManifestFromText,
  parseWorkflowPackageManifestFromText,
  resolveBuildStrategy,
  sortLoaderDiagnostics,
  toDiagnosticFromUnknown,
  WorkflowLoaderDiagnosticError,
  type LoaderDiagnostic,
} from "./loaderContracts";
import {
  emitWorkflowPackageDiagnostic,
  summarizeWorkflowRuntimeCapabilities,
} from "../modules/workflowPackageDiagnostics";
import { bundlePackageHookScript } from "./packageHookBundler";
import {
  resolveRuntimeConsole,
  resolveRuntimeHostCapabilities,
} from "../utils/runtimeBridge";
import {
  createWorkflowHostApi,
  summarizeWorkflowHostApiCapabilities,
  WORKFLOW_HOST_API_VERSION,
} from "./hostApi";
import type {
  WorkflowHookExecutionMode,
} from "./types";

type WorkflowModuleResourceKind = "builtin" | "user";

type DynamicImport = (specifier: string) => Promise<any>;

const dynamicImport: DynamicImport = new Function(
  "specifier",
  "return import(specifier)",
) as DynamicImport;

function isZoteroRuntime() {
  const runtime = globalThis as {
    IOUtils?: unknown;
    PathUtils?: { tempDir?: unknown };
    Services?: {
      io?: { newFileURI?: unknown };
      scriptloader?: { loadSubScript?: unknown };
    };
  };
  return (
    typeof runtime.IOUtils !== "undefined" &&
    typeof runtime.PathUtils?.tempDir === "string" &&
    typeof runtime.Services?.io?.newFileURI === "function" &&
    typeof runtime.Services?.scriptloader?.loadSubScript === "function"
  );
}

async function readTextFile(filePath: string) {
  const io = (
    globalThis as {
      IOUtils?: { readUTF8?: (path: string) => Promise<string> };
    }
  ).IOUtils;
  if (typeof io?.readUTF8 === "function") {
    return io.readUTF8(filePath);
  }
  if (isZoteroRuntime()) {
    const runtimeIo = (globalThis as {
      IOUtils: { readUTF8: (path: string) => Promise<string> };
    }).IOUtils;
    return runtimeIo.readUTF8(filePath);
  }
  const fs = await dynamicImport("fs/promises");
  return fs.readFile(filePath, "utf8") as Promise<string>;
}

async function listDirectoryEntries(dirPath: string): Promise<string[]> {
  const io = (
    globalThis as {
      IOUtils?: { getChildren?: (path: string) => Promise<string[]> };
    }
  ).IOUtils;
  if (typeof io?.getChildren === "function") {
    const children = await io.getChildren(dirPath);
    return children.map((entryPath) => getBaseName(entryPath));
  }
  if (isZoteroRuntime()) {
    const runtimeIo = (globalThis as {
      IOUtils: { getChildren: (path: string) => Promise<string[]> };
    }).IOUtils;
    const children = await runtimeIo.getChildren(dirPath);
    return children.map((entryPath) => getBaseName(entryPath));
  }
  const fs = await dynamicImport("fs/promises");
  return fs.readdir(dirPath) as Promise<string[]>;
}

async function statPath(targetPath: string): Promise<{ isDirectory: boolean }> {
  const io = (
    globalThis as {
      IOUtils?: { stat?: (path: string) => Promise<{ type: string }> };
    }
  ).IOUtils;
  if (typeof io?.stat === "function") {
    const stat = await io.stat(targetPath);
    return { isDirectory: stat.type === "directory" };
  }
  if (isZoteroRuntime()) {
    const runtimeIo = (globalThis as {
      IOUtils: { stat: (path: string) => Promise<{ type: string }> };
    }).IOUtils;
    const stat = await runtimeIo.stat(targetPath);
    return { isDirectory: stat.type === "directory" };
  }
  const fs = await dynamicImport("fs/promises");
  const stat = await fs.stat(targetPath);
  return { isDirectory: stat.isDirectory() };
}

function transformModuleExports(source: string) {
  const names: string[] = [];
  const record = (name: string) => {
    if (!names.includes(name)) {
      names.push(name);
    }
    return name;
  };

  let code = source.replace(
    /export\s+async\s+function\s+([A-Za-z_$][\w$]*)\s*\(/g,
    (_, name: string) => `async function ${record(name)}(`,
  );
  code = code.replace(
    /export\s+function\s+([A-Za-z_$][\w$]*)\s*\(/g,
    (_, name: string) => `function ${record(name)}(`,
  );
  code = code.replace(
    /export\s+(const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g,
    (_, decl: string, name: string) => `${decl} ${record(name)} =`,
  );

  if (names.length === 0) {
    throw new Error("No exported symbols found in hooks module");
  }
  return { code, names };
}

async function importHooksModuleFromText(filePath: string) {
  const source = await readTextFile(filePath);
  const transformed = transformModuleExports(source);
  const scriptText = `${transformed.code}\nthis.__zoteroSkillsHookExports = { ${transformed.names.join(", ")} };`;

  if (isZoteroRuntime()) {
    const runtime = globalThis as unknown as {
      IOUtils: {
        writeUTF8: (path: string, data: string) => Promise<void>;
        remove?: (path: string, options?: { ignoreAbsent?: boolean }) => Promise<void>;
      };
      PathUtils: { tempDir: string };
      Services: {
        io: { newFileURI: (file: unknown) => { spec: string } };
        scriptloader: {
          loadSubScript: (url: string, obj?: Record<string, unknown>) => void;
        };
      };
      Zotero: { File: { pathToFile: (path: string) => unknown } };
    };

    const tempScriptPath = joinPath(
      runtime.PathUtils.tempDir,
      `zotero-skills-hook-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.js`,
    );
    await runtime.IOUtils.writeUTF8(tempScriptPath, scriptText);
    const scope = createHostHookScope();
    try {
      const file = runtime.Zotero.File.pathToFile(tempScriptPath);
      const scriptUri = runtime.Services.io.newFileURI(file).spec;
      runtime.Services.scriptloader.loadSubScript(scriptUri, scope);
      const loaded = scope.__zoteroSkillsHookExports;
      if (!loaded || typeof loaded !== "object") {
        throw new Error("No hook exports loaded from script");
      }
      return loaded as Record<string, unknown>;
    } finally {
      if (runtime.IOUtils.remove) {
        await runtime.IOUtils.remove(tempScriptPath, {
          ignoreAbsent: true,
        });
      }
    }
  }

  const factory = new Function(
    `${scriptText}\nreturn this.__zoteroSkillsHookExports;`,
  ) as () => Record<string, unknown>;
  return factory();
}

function hasKnownHookExport(loaded: Record<string, unknown>) {
  return (
    typeof loaded.applyResult === "function" ||
    typeof loaded.buildRequest === "function" ||
    typeof loaded.normalizeSettings === "function"
  );
}

async function importHooksModuleFromNode(
  filePath: string,
  allowTextFallback: boolean,
): Promise<Record<string, unknown>> {
  try {
    const urlMod = await dynamicImport("url");
    const moduleUrl = urlMod.pathToFileURL(filePath).href;
    const loaded = (await dynamicImport(moduleUrl)) as Record<string, unknown>;
    if (allowTextFallback && !hasKnownHookExport(loaded)) {
      return importHooksModuleFromText(filePath);
    }
    return loaded;
  } catch (error) {
    if (!allowTextFallback) {
      throw error;
    }
  }
  return importHooksModuleFromText(filePath);
}

function createHostHookScope() {
  const hostCapabilities = resolveRuntimeHostCapabilities();
  return {
    __zsHostApi: createWorkflowHostApi(),
    __zsHostApiVersion: WORKFLOW_HOST_API_VERSION,
    fetch: hostCapabilities.fetch,
    Buffer: hostCapabilities.Buffer,
    btoa: hostCapabilities.btoa,
    atob: hostCapabilities.atob,
    TextEncoder: hostCapabilities.TextEncoder,
    TextDecoder: hostCapabilities.TextDecoder,
    FileReader: hostCapabilities.FileReader,
    navigator: hostCapabilities.navigator,
    console: resolveRuntimeConsole(),
    IOUtils: (globalThis as Record<string, unknown>).IOUtils,
  } as Record<string, unknown>;
}

function summarizeHostHookScope(scope: Record<string, unknown>) {
  const runtimeCapabilitySummary = summarizeWorkflowRuntimeCapabilities({
    zotero: false,
    addon: false,
    fetch: scope.fetch,
    Buffer: scope.Buffer,
    btoa: scope.btoa,
    atob: scope.atob,
    TextEncoder: scope.TextEncoder,
    TextDecoder: scope.TextDecoder,
    FileReader: scope.FileReader,
    navigator: scope.navigator,
  });
  return {
    runtimeCapabilitySummary,
    hostApiSummary: summarizeWorkflowHostApiCapabilities(
      scope.__zsHostApi as ReturnType<typeof createWorkflowHostApi>,
    ),
    hostApiVersion:
      Number(scope.__zsHostApiVersion || 0) || WORKFLOW_HOST_API_VERSION,
  };
}

async function importPrecompiledPackageHooksModule(
  filePath: string,
  args: {
    packageRootDir: string;
    exportName:
      | "applyResult"
      | "buildRequest"
      | "normalizeSettings";
    workflowSourceKind?: WorkflowModuleResourceKind | "";
  },
) {
  const initialScope = createHostHookScope();
  const scopeSummary = summarizeHostHookScope(initialScope);
  emitWorkflowPackageDiagnostic({
    level: "debug",
    scope: "system",
    component: "workflow-loader",
    operation: "precompile-package-hook",
    workflowSourceKind: args.workflowSourceKind,
    stage: "workflow-package-precompile-start",
    message: "workflow package hook precompile started",
    filePath,
    details: {
      packageRootDir: args.packageRootDir,
      exportName: args.exportName,
      executionMode: "precompiled-host-hook",
      contract: "package-host-api-facade",
      compiledHookSource: "scan-time-precompile",
      ...scopeSummary,
    },
  });

  const bundled = await bundlePackageHookScript({
    entryFilePath: filePath,
    packageRootDir: args.packageRootDir,
    entryExportName: args.exportName,
  });

  const runtime = globalThis as unknown as {
    IOUtils: {
      writeUTF8: (path: string, data: string) => Promise<void>;
      remove?: (path: string, options?: { ignoreAbsent?: boolean }) => Promise<void>;
    };
    PathUtils: { tempDir: string };
    Services: {
      io: { newFileURI: (file: unknown) => { spec: string } };
      scriptloader: {
        loadSubScript: (url: string, obj?: Record<string, unknown>) => void;
      };
    };
    Zotero: { File: { pathToFile: (path: string) => unknown } };
  };

  const tempScriptPath = joinPath(
    runtime.PathUtils.tempDir,
    `zotero-skills-package-hook-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}.js`,
  );
  await runtime.IOUtils.writeUTF8(tempScriptPath, bundled.scriptText);
  const scope = createHostHookScope();
  try {
    const file = runtime.Zotero.File.pathToFile(tempScriptPath);
    const scriptUri = runtime.Services.io.newFileURI(file).spec;
    runtime.Services.scriptloader.loadSubScript(scriptUri, scope);
    const loaded = scope.__zoteroSkillsHookExports;
    if (!loaded || typeof loaded !== "object") {
      throw new Error("No hook exports loaded from bundled package script");
    }
    emitWorkflowPackageDiagnostic({
      level: "debug",
      scope: "system",
      component: "workflow-loader",
      operation: "precompile-package-hook",
      workflowSourceKind: args.workflowSourceKind,
      stage: "workflow-package-precompile-succeeded",
      message: "workflow package hook precompile succeeded",
      filePath,
      details: {
        packageRootDir: args.packageRootDir,
        exportName: args.exportName,
        moduleCount: bundled.moduleCount,
        cacheHit: bundled.cacheHit,
        fingerprint: bundled.fingerprint,
        executionMode: "precompiled-host-hook",
        contract: "package-host-api-facade",
        compiledHookSource: "scan-time-precompile",
        ...summarizeHostHookScope(scope),
      },
    });
    return loaded as Record<string, unknown>;
  } catch (error) {
    emitWorkflowPackageDiagnostic({
      level: "error",
      scope: "system",
      component: "workflow-loader",
      operation: "precompile-package-hook",
      workflowSourceKind: args.workflowSourceKind,
      stage: "workflow-package-precompile-failed",
      message: "workflow package hook precompile failed",
      filePath,
      details: {
        packageRootDir: args.packageRootDir,
        exportName: args.exportName,
        executionMode: "precompiled-host-hook",
        contract: "package-host-api-facade",
        compiledHookSource: "scan-time-precompile",
        ...summarizeHostHookScope(scope),
      },
      error,
    });
    throw error;
  } finally {
    if (runtime.IOUtils.remove) {
      await runtime.IOUtils.remove(tempScriptPath, {
        ignoreAbsent: true,
      });
    }
  }
}

async function loadHooksModule(
  filePath: string,
  args?: {
    allowTextFallback?: boolean;
    workflowSourceKind?: WorkflowModuleResourceKind | "";
    packageRootDir?: string;
    exportName?:
      | "applyResult"
      | "buildRequest"
      | "normalizeSettings";
  },
): Promise<{
  loaded: Record<string, unknown>;
  executionMode: WorkflowHookExecutionMode;
}> {
  const allowTextFallback = args?.allowTextFallback !== false;
  const isPackageHook =
    !allowTextFallback && !!args?.packageRootDir && !!args?.exportName;
  if (!isZoteroRuntime()) {
    return {
      loaded: await importHooksModuleFromNode(filePath, allowTextFallback),
      executionMode: isPackageHook
        ? "precompiled-host-hook"
        : "node-native-module",
    };
  }

  if (allowTextFallback) {
    emitWorkflowPackageDiagnostic({
      level: "debug",
      scope: "system",
      component: "workflow-loader",
      operation: "load-hooks-module",
      workflowSourceKind: args?.workflowSourceKind,
      stage: "workflow-legacy-text-loader-path",
      message: "workflow hook load uses legacy text fallback path",
      filePath,
    });
    return {
      loaded: await importHooksModuleFromText(filePath),
      executionMode: "legacy-text-loader",
    };
  }
  if (!args?.packageRootDir || !args.exportName) {
    throw new Error("packageRootDir and exportName are required for package hook bundling");
  }
  return {
    loaded: await importPrecompiledPackageHooksModule(filePath, {
      packageRootDir: args.packageRootDir,
      exportName: args.exportName,
      workflowSourceKind: args.workflowSourceKind,
    }),
    executionMode: "precompiled-host-hook",
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function getDirectoryName(targetPath: string) {
  const normalized = String(targetPath || "").replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length <= 1) {
    return "";
  }
  const first = normalized.startsWith("/") ? "/" : "";
  const driveMatch = normalized.match(/^([A-Za-z]:)\//);
  const drivePrefix = driveMatch?.[1] || "";
  const parentParts = parts.slice(0, -1);
  if (drivePrefix) {
    return joinPath(drivePrefix, ...parentParts.slice(1));
  }
  if (first) {
    return joinPath(first, ...parentParts);
  }
  return joinPath(...parentParts);
}

async function pathExists(targetPath: string) {
  try {
    await statPath(targetPath);
    return true;
  } catch {
    return false;
  }
}

type WorkflowLoadCandidate = {
  entry: string;
  packageId: string;
  packageRootDir: string;
  manifestPath: string;
  workflowRoot: string;
  declaredFromPackage: boolean;
  localization?: WorkflowLocalizationResources;
  manifest: WorkflowManifest;
};

function normalizePackageRelativePath(value: string) {
  const normalized = String(value || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/\/+/g, "/");
  if (
    !normalized ||
    normalized.startsWith("/") ||
    /^[A-Za-z]:\//.test(normalized)
  ) {
    return "";
  }
  const segments = normalized.split("/").filter(Boolean);
  if (segments.some((segment) => segment === "..")) {
    return "";
  }
  return segments.join("/");
}

function parseLocaleMessageMap(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const messages: WorkflowI18nLocaleMessages = {};
  for (const [key, rawMessage] of Object.entries(value)) {
    if (typeof rawMessage !== "string") {
      return null;
    }
    const normalizedKey = String(key || "").trim();
    if (!normalizedKey) {
      return null;
    }
    messages[normalizedKey] = rawMessage;
  }
  return messages;
}

async function loadPackageLocalizationResources(args: {
  entry: string;
  packageRootDir: string;
  packageManifest: NonNullable<
    ReturnType<typeof parseWorkflowPackageManifestFromText>["manifest"]
  >;
  diagnostics: LoaderDiagnostic[];
}) {
  const localization: WorkflowLocalizationResources = {
    packageDefaultLocale: String(
      args.packageManifest.i18n?.defaultLocale || "",
    ).trim(),
    packageMessages: {},
  };
  const locales = args.packageManifest.i18n?.locales || {};
  for (const [locale, relativePath] of Object.entries(locales)) {
    const normalizedLocale = String(locale || "").trim();
    const normalizedPath = normalizePackageRelativePath(relativePath);
    const diagnosticPath = normalizedPath
      ? joinPath(args.packageRootDir, normalizedPath)
      : joinPath(args.packageRootDir, String(relativePath || ""));
    if (!normalizedLocale || !normalizedPath) {
      args.diagnostics.push(
        createLoaderDiagnostic({
          level: "warning",
          category: "manifest_validation_error",
          message: `Invalid workflow package locale path: ${relativePath}`,
          entry: args.entry,
          path: diagnosticPath,
          reason: "package locale path must be a package-relative path",
        }),
      );
      continue;
    }
    try {
      const parsed = JSON.parse(await readTextFile(diagnosticPath));
      const messages = parseLocaleMessageMap(parsed);
      if (!messages) {
        throw new Error("locale JSON must be an object with string values");
      }
      localization.packageMessages![normalizedLocale] = messages;
    } catch (error) {
      args.diagnostics.push(
        createLoaderDiagnostic({
          level: "warning",
          category: "manifest_validation_error",
          message: `Invalid workflow package locale resource: ${diagnosticPath}`,
          entry: args.entry,
          path: diagnosticPath,
          reason: String(error),
        }),
      );
    }
  }
  return localization;
}

async function collectPackageWorkflowCandidates(args: {
  entry: string;
  packageRootDir: string;
  packageManifestPath: string;
  diagnostics: LoaderDiagnostic[];
}) {
  const candidates: WorkflowLoadCandidate[] = [];
  const packageManifestResult = parseWorkflowPackageManifestFromText({
    raw: await readTextFile(args.packageManifestPath),
    manifestPath: args.packageManifestPath,
  });
  if (!packageManifestResult.manifest) {
    if (packageManifestResult.diagnostic) {
      args.diagnostics.push({
        ...packageManifestResult.diagnostic,
        entry: args.entry,
      });
    }
    return candidates;
  }
  const localization = await loadPackageLocalizationResources({
    entry: args.entry,
    packageRootDir: args.packageRootDir,
    packageManifest: packageManifestResult.manifest,
    diagnostics: args.diagnostics,
  });
  for (const relativeManifestPath of packageManifestResult.manifest.workflows) {
    const manifestPath = joinPath(args.packageRootDir, relativeManifestPath);
    const manifestResult = parseWorkflowManifestFromText({
      raw: await readTextFile(manifestPath),
      manifestPath,
    });
    if (!manifestResult.manifest) {
      if (manifestResult.diagnostic) {
        args.diagnostics.push({
          ...manifestResult.diagnostic,
          entry: args.entry,
        });
      }
      continue;
    }
    candidates.push({
      entry: args.entry,
      packageId: packageManifestResult.manifest.id,
      packageRootDir: args.packageRootDir,
      manifestPath,
      workflowRoot: getDirectoryName(manifestPath),
      declaredFromPackage: true,
      localization,
      manifest: normalizeManifestProvider(manifestResult.manifest),
    });
  }
  return candidates;
}

async function collectSingleWorkflowCandidate(args: {
  entry: string;
  workflowRoot: string;
  manifestPath: string;
  diagnostics: LoaderDiagnostic[];
}) {
  const manifestResult = parseWorkflowManifestFromText({
    raw: await readTextFile(args.manifestPath),
    manifestPath: args.manifestPath,
  });
  if (!manifestResult.manifest) {
    if (manifestResult.diagnostic) {
      args.diagnostics.push({
        ...manifestResult.diagnostic,
        entry: args.entry,
      });
    }
    return [] as WorkflowLoadCandidate[];
  }
  return [
    {
      entry: args.entry,
      packageId:
        String(manifestResult.manifest.id || "").trim() || args.entry,
      packageRootDir: args.workflowRoot,
      manifestPath: args.manifestPath,
      workflowRoot: args.workflowRoot,
      declaredFromPackage: false,
      localization: undefined,
      manifest: normalizeManifestProvider(manifestResult.manifest),
    },
  ];
}

async function collectWorkflowCandidates(args: {
  entry: string;
  workflowRoot: string;
  diagnostics: LoaderDiagnostic[];
}) {
  const packageManifestPath = joinPath(args.workflowRoot, "workflow-package.json");
  if (await pathExists(packageManifestPath)) {
    return collectPackageWorkflowCandidates({
      entry: args.entry,
      packageRootDir: args.workflowRoot,
      packageManifestPath,
      diagnostics: args.diagnostics,
    });
  }
  const manifestPath = joinPath(args.workflowRoot, "workflow.json");
  if (!(await pathExists(manifestPath))) {
    return [] as WorkflowLoadCandidate[];
  }
  return collectSingleWorkflowCandidate({
    entry: args.entry,
    workflowRoot: args.workflowRoot,
    manifestPath,
    diagnostics: args.diagnostics,
  });
}

async function filterDirectoryEntriesByBuiltinManifest(
  workflowsDir: string,
  entries: string[],
  diagnostics: LoaderDiagnostic[],
) {
  const builtinManifestPath = joinPath(workflowsDir, "manifest.json");
  if (!(await pathExists(builtinManifestPath))) {
    return entries;
  }
  try {
    const parsed = JSON.parse(await readTextFile(builtinManifestPath)) as {
      files?: unknown;
    };
    if (!Array.isArray(parsed.files)) {
      return entries;
    }
    const shippedRoots = new Set(
      parsed.files
        .map((entry) =>
          String(entry || "")
            .replace(/\\/g, "/")
            .split("/")
            .map((segment) => segment.trim())
            .filter(Boolean)[0],
        )
        .filter(Boolean),
    );
    if (shippedRoots.size === 0) {
      return entries;
    }
    return entries.filter((entry) => shippedRoots.has(entry));
  } catch (error) {
    diagnostics.push(
      createLoaderDiagnostic({
        level: "warning",
        category: "manifest_parse_error",
        message: `Unable to read builtin workflow manifest filter: ${builtinManifestPath} (${String(error)})`,
        path: builtinManifestPath,
        reason: String(error),
      }),
    );
    return entries;
  }
}

async function loadHooks(
  args: {
    workflowRoot: string;
    packageRootDir: string;
    manifest: WorkflowManifest;
    isPackageWorkflow: boolean;
    workflowSourceKind?: WorkflowModuleResourceKind | "";
  },
): Promise<{
  hooks: WorkflowHooksModule;
  executionMode: WorkflowHookExecutionMode;
}> {
  const hooks: WorkflowHooksModule = {} as WorkflowHooksModule;
  const workflowRoot = args.workflowRoot;
  const manifest = args.manifest;
  const allowTextFallback = !args.isPackageWorkflow;
  let executionMode: WorkflowHookExecutionMode | undefined;

  const assignExecutionMode = (nextMode: WorkflowHookExecutionMode) => {
    if (!executionMode) {
      executionMode = nextMode;
      return;
    }
    if (executionMode !== nextMode) {
      throw new Error(
        `Inconsistent workflow hook execution modes: ${executionMode} vs ${nextMode}`,
      );
    }
  };

  const assertPackageHookPath = (relativePath: string, exportName: string) => {
    if (!args.isPackageWorkflow || relativePath.endsWith(".mjs")) {
      return;
    }
    throw new WorkflowLoaderDiagnosticError({
      category: "manifest_validation_error",
      message: `Workflow-package hook must use .mjs: ${relativePath}`,
      workflowId: manifest.id,
      path: joinPath(workflowRoot, relativePath),
      reason: `${exportName} hook in workflow-package must use .mjs`,
    });
  };

  assertPackageHookPath(manifest.hooks.applyResult, "applyResult");
  const applyResultPath = joinPath(workflowRoot, manifest.hooks.applyResult);
  try {
    await statPath(applyResultPath);
  } catch (error) {
    throw new WorkflowLoaderDiagnosticError({
      category: "hook_missing_error",
      message: `Hook file missing: ${manifest.hooks.applyResult}`,
      workflowId: manifest.id,
      path: applyResultPath,
      reason: String(error),
    });
  }
  let applyResultModule: Record<string, unknown>;
  try {
    const loaded = await loadHooksModule(applyResultPath, {
      allowTextFallback,
      workflowSourceKind: args.workflowSourceKind,
      packageRootDir: args.packageRootDir,
      exportName: "applyResult",
    });
    applyResultModule = loaded.loaded;
    assignExecutionMode(loaded.executionMode);
  } catch (error) {
    throw new WorkflowLoaderDiagnosticError({
      category: "hook_import_error",
      message: `Hook import failed: ${manifest.hooks.applyResult}`,
      workflowId: manifest.id,
      path: applyResultPath,
      reason: String(error),
    });
  }
  if (typeof applyResultModule.applyResult !== "function") {
    throw new WorkflowLoaderDiagnosticError({
      category: "hook_export_error",
      message: `Hook export applyResult() not found: ${manifest.hooks.applyResult}`,
      workflowId: manifest.id,
      path: applyResultPath,
      reason: "applyResult export missing",
    });
  }
  hooks.applyResult = applyResultModule.applyResult as ApplyResultHook;

  if (manifest.hooks.buildRequest) {
    assertPackageHookPath(manifest.hooks.buildRequest, "buildRequest");
    const buildRequestPath = joinPath(workflowRoot, manifest.hooks.buildRequest);
    try {
      await statPath(buildRequestPath);
    } catch (error) {
      throw new WorkflowLoaderDiagnosticError({
        category: "hook_missing_error",
        message: `Hook file missing: ${manifest.hooks.buildRequest}`,
        workflowId: manifest.id,
        path: buildRequestPath,
        reason: String(error),
      });
    }
    let buildRequestModule: Record<string, unknown>;
    try {
      const loaded = await loadHooksModule(buildRequestPath, {
        allowTextFallback,
        workflowSourceKind: args.workflowSourceKind,
        packageRootDir: args.packageRootDir,
        exportName: "buildRequest",
      });
      buildRequestModule = loaded.loaded;
      assignExecutionMode(loaded.executionMode);
    } catch (error) {
      throw new WorkflowLoaderDiagnosticError({
        category: "hook_import_error",
        message: `Hook import failed: ${manifest.hooks.buildRequest}`,
        workflowId: manifest.id,
        path: buildRequestPath,
        reason: String(error),
      });
    }
    if (typeof buildRequestModule.buildRequest !== "function") {
      throw new WorkflowLoaderDiagnosticError({
        category: "hook_export_error",
        message: `Hook export buildRequest() not found: ${manifest.hooks.buildRequest}`,
        workflowId: manifest.id,
        path: buildRequestPath,
        reason: "buildRequest export missing",
      });
    }
    hooks.buildRequest = buildRequestModule.buildRequest as BuildRequestHook;
  }

  if (manifest.hooks.normalizeSettings) {
    assertPackageHookPath(manifest.hooks.normalizeSettings, "normalizeSettings");
    const normalizeSettingsPath = joinPath(
      workflowRoot,
      manifest.hooks.normalizeSettings,
    );
    try {
      await statPath(normalizeSettingsPath);
    } catch (error) {
      throw new WorkflowLoaderDiagnosticError({
        category: "hook_missing_error",
        message: `Hook file missing: ${manifest.hooks.normalizeSettings}`,
        workflowId: manifest.id,
        path: normalizeSettingsPath,
        reason: String(error),
      });
    }
    let normalizeSettingsModule: Record<string, unknown>;
    try {
      const loaded = await loadHooksModule(normalizeSettingsPath, {
        allowTextFallback,
        workflowSourceKind: args.workflowSourceKind,
        packageRootDir: args.packageRootDir,
        exportName: "normalizeSettings",
      });
      normalizeSettingsModule = loaded.loaded;
      assignExecutionMode(loaded.executionMode);
    } catch (error) {
      throw new WorkflowLoaderDiagnosticError({
        category: "hook_import_error",
        message: `Hook import failed: ${manifest.hooks.normalizeSettings}`,
        workflowId: manifest.id,
        path: normalizeSettingsPath,
        reason: String(error),
      });
    }
    if (typeof normalizeSettingsModule.normalizeSettings !== "function") {
      throw new WorkflowLoaderDiagnosticError({
        category: "hook_export_error",
        message:
          `Hook export normalizeSettings() not found: ${manifest.hooks.normalizeSettings}`,
        workflowId: manifest.id,
        path: normalizeSettingsPath,
        reason: "normalizeSettings export missing",
      });
    }
    hooks.normalizeSettings =
      normalizeSettingsModule.normalizeSettings as NormalizeWorkflowSettingsHook;
  }

  return {
    hooks,
    executionMode: executionMode || "node-native-module",
  };
}

export async function loadWorkflowManifests(
  workflowsDir: string,
  args?: {
    workflowSourceKind?: WorkflowModuleResourceKind | "";
  },
): Promise<LoadedWorkflows> {
  const diagnostics: LoaderDiagnostic[] = [];
  const workflowsById = new Map<string, LoadedWorkflow>();

  let entries: string[] = [];
  try {
    entries = await listDirectoryEntries(workflowsDir);
  } catch (error) {
    const diagnostic = createLoaderDiagnostic({
      level: "error",
      category: "scan_path_error",
      message: `Unable to read workflows directory: ${workflowsDir} (${String(error)})`,
      path: workflowsDir,
      reason: String(error),
    });
    return {
      workflows: [],
      manifests: [],
      warnings: [],
      errors: [diagnostic.message],
      diagnostics: [diagnostic],
    };
  }
  entries = normalizeDirectoryEntries(entries);
  entries = await filterDirectoryEntriesByBuiltinManifest(
    workflowsDir,
    entries,
    diagnostics,
  );

  for (const entry of entries) {
    const workflowRoot = joinPath(workflowsDir, entry);
    try {
      const stat = await statPath(workflowRoot);
      if (!stat.isDirectory) {
        continue;
      }
      const candidates = await collectWorkflowCandidates({
        entry,
        workflowRoot,
        diagnostics,
      });
      for (const candidate of candidates) {
        if (!isNonEmptyString(candidate.manifest.provider)) {
          diagnostics.push(
            createLoaderDiagnostic({
              level: "warning",
              category: "manifest_validation_error",
              message:
                `Skip workflow ${candidate.manifest.id}: missing provider declaration`,
              entry: candidate.entry,
              workflowId: candidate.manifest.id,
              path: candidate.manifestPath,
              reason: "provider missing",
            }),
          );
          continue;
        }

        const buildStrategy = resolveBuildStrategy(candidate.manifest);
        if (!buildStrategy) {
          diagnostics.push(
            createLoaderDiagnostic({
              level: "warning",
              category: "manifest_validation_error",
              message:
                `Skip workflow ${candidate.manifest.id}: missing hooks.buildRequest and request declaration`,
              entry: candidate.entry,
              workflowId: candidate.manifest.id,
              path: candidate.manifestPath,
              reason: "build strategy unresolved",
            }),
          );
          continue;
        }

        const hookResult = await loadHooks({
          workflowRoot: candidate.workflowRoot,
          packageRootDir: candidate.packageRootDir,
          manifest: candidate.manifest,
          isPackageWorkflow: candidate.declaredFromPackage,
          workflowSourceKind: args?.workflowSourceKind,
        });
        workflowsById.set(candidate.manifest.id, {
          manifest: candidate.manifest,
          rootDir: candidate.workflowRoot,
          packageId: candidate.packageId,
          packageRootDir: candidate.packageRootDir,
          manifestPath: candidate.manifestPath,
          localization: candidate.localization,
          workflowSourceKind: args?.workflowSourceKind,
          hooks: hookResult.hooks,
          buildStrategy,
          hookExecutionMode: hookResult.executionMode,
        });
      }
    } catch (error) {
      const fallbackPath = joinPath(workflowRoot, "workflow-package.json");
      const normalized = toDiagnosticFromUnknown({
        error,
        fallback: createLoaderDiagnostic({
          level: "warning",
          category: "scan_runtime_warning",
          message: `Skip workflow ${entry}: ${String(error)}`,
          entry,
          path: (await pathExists(fallbackPath))
            ? fallbackPath
            : joinPath(workflowRoot, "workflow.json"),
        }),
      });
      diagnostics.push({
        ...normalized,
        message: normalized.message.startsWith("Skip workflow")
          ? normalized.message
          : `Skip workflow ${entry}: ${normalized.message}`,
      });
    }
  }

  const workflows = Array.from(workflowsById.values()).sort((a, b) =>
    a.manifest.id.localeCompare(b.manifest.id),
  );
  const sortedDiagnostics = sortLoaderDiagnostics(diagnostics);
  const warnings = sortedDiagnostics
    .filter((entry) => entry.level === "warning")
    .map((entry) => entry.message);
  const errors = sortedDiagnostics
    .filter((entry) => entry.level === "error")
    .map((entry) => entry.message);
  return {
    workflows,
    manifests: workflows.map((entry) => entry.manifest),
    warnings,
    errors,
    diagnostics: sortedDiagnostics,
  };
}

export const __workflowLoaderTestOnly = {
  isZoteroRuntime,
};
