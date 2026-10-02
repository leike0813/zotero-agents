import { getBaseName, joinPath } from "../utils/path";
import { createLoaderDiagnostic, normalizeDirectoryEntries, normalizeManifestProvider, parseWorkflowManifestFromText, parseWorkflowPackageManifestFromText, resolveBuildStrategy, sortLoaderDiagnostics, toDiagnosticFromUnknown, WorkflowLoaderDiagnosticError, } from "./loaderContracts";
import { emitWorkflowPackageDiagnostic, summarizeWorkflowRuntimeCapabilities, } from "../modules/workflow/catalog/workflowPackageDiagnostics";
import { isDebugModeEnabled } from "../modules/debugMode";
import { bundlePackageHookScript } from "./packageHookBundler";
import { resolveRuntimeConsole, resolveRuntimeHostCapabilities, } from "../utils/runtimeBridge";
import { createWorkflowHostApi } from "./hostApi";
import { resolveWorkflowHostContractVersion, summarizeWorkflowHostApiCapabilities, } from "./workflowHostContract";
import { listRuntimeChildrenStrict, readRuntimeTextFileStrict, removeRuntimePath, resolveRuntimeTemporaryDirectory, statRuntimePathStrict, writeRuntimeTextFileStrict, } from "../modules/runtimePersistence";
import { sha256Hex } from "../utils/sha256";
const dynamicImport = new Function("specifier", "return import(specifier)");
function isZoteroRuntime() {
    const runtime = globalThis;
    return (typeof runtime.Services?.io?.newFileURI === "function" &&
        typeof runtime.Services?.scriptloader?.loadSubScript === "function");
}
async function readTextFile(filePath) {
    return readRuntimeTextFileStrict(filePath);
}
async function listDirectoryEntries(dirPath) {
    return (await listRuntimeChildrenStrict(dirPath)).map((entryPath) => getBaseName(entryPath));
}
async function statPath(targetPath) {
    const stat = await statRuntimePathStrict(targetPath);
    if (!stat.exists) {
        throw new Error("workflow path does not exist");
    }
    return { isDirectory: stat.isDir };
}
function transformModuleExports(source) {
    const names = [];
    const record = (name) => {
        if (!names.includes(name)) {
            names.push(name);
        }
        return name;
    };
    let code = source.replace(/export\s+async\s+function\s+([A-Za-z_$][\w$]*)\s*\(/g, (_, name) => `async function ${record(name)}(`);
    code = code.replace(/export\s+function\s+([A-Za-z_$][\w$]*)\s*\(/g, (_, name) => `function ${record(name)}(`);
    code = code.replace(/export\s+(const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g, (_, decl, name) => `${decl} ${record(name)} =`);
    if (names.length === 0) {
        throw new Error("No exported symbols found in hooks module");
    }
    return { code, names };
}
async function importHooksModuleFromText(filePath) {
    const source = await readTextFile(filePath);
    const transformed = transformModuleExports(source);
    const scriptText = `${transformed.code}\nthis.__zoteroSkillsHookExports = { ${transformed.names.join(", ")} };`;
    if (isZoteroRuntime()) {
        const runtime = globalThis;
        const tempScriptPath = joinPath(resolveRuntimeTemporaryDirectory(), `zotero-skills-hook-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.js`);
        await writeRuntimeTextFileStrict(tempScriptPath, scriptText);
        const scope = createHostHookScope();
        try {
            const file = runtime.Zotero.File.pathToFile(tempScriptPath);
            const scriptUri = runtime.Services.io.newFileURI(file).spec;
            runtime.Services.scriptloader.loadSubScript(scriptUri, scope);
            const loaded = scope.__zoteroSkillsHookExports;
            if (!loaded || typeof loaded !== "object") {
                throw new Error("No hook exports loaded from script");
            }
            return loaded;
        }
        finally {
            await removeRuntimePath(tempScriptPath);
        }
    }
    const factory = new Function(`${scriptText}\nreturn this.__zoteroSkillsHookExports;`);
    return factory();
}
function hasKnownHookExport(loaded) {
    return (typeof loaded.applyResult === "function" ||
        typeof loaded.buildRequest === "function" ||
        typeof loaded.preflight === "function" ||
        typeof loaded.normalizeSettings === "function");
}
async function importHooksModuleFromNode(filePath, allowTextFallback) {
    try {
        const urlMod = await dynamicImport("url");
        const moduleUrl = urlMod.pathToFileURL(filePath).href;
        const loaded = (await dynamicImport(moduleUrl));
        if (allowTextFallback && !hasKnownHookExport(loaded)) {
            return importHooksModuleFromText(filePath);
        }
        return loaded;
    }
    catch (error) {
        if (!allowTextFallback) {
            throw error;
        }
    }
    return importHooksModuleFromText(filePath);
}
function createHostHookScope() {
    const hostCapabilities = resolveRuntimeHostCapabilities();
    const hostApi = createWorkflowHostApi();
    return {
        __zsHostApi: hostApi,
        __zsHostApiVersion: resolveWorkflowHostContractVersion({
            hostApi,
            currentProjection: true,
        }),
        fetch: hostCapabilities.fetch,
        Buffer: hostCapabilities.Buffer,
        btoa: hostCapabilities.btoa,
        atob: hostCapabilities.atob,
        TextEncoder: hostCapabilities.TextEncoder,
        TextDecoder: hostCapabilities.TextDecoder,
        FileReader: hostCapabilities.FileReader,
        console: resolveRuntimeConsole(),
    };
}
function summarizeHostHookScope(scope) {
    const hostApi = scope.__zsHostApi;
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
    });
    return {
        runtimeCapabilitySummary,
        hostApiSummary: summarizeWorkflowHostApiCapabilities(hostApi),
        hostApiVersion: resolveWorkflowHostContractVersion({
            explicitVersion: scope.__zsHostApiVersion,
            hostApi,
            currentProjection: true,
        }),
    };
}
async function importPrecompiledPackageHooksModule(filePath, args) {
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
    const runtime = globalThis;
    const tempScriptPath = joinPath(resolveRuntimeTemporaryDirectory(), `zotero-skills-package-hook-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}.js`);
    await writeRuntimeTextFileStrict(tempScriptPath, bundled.scriptText);
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
        return loaded;
    }
    catch (error) {
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
    }
    finally {
        await removeRuntimePath(tempScriptPath);
    }
}
async function loadHooksModule(filePath, args) {
    const allowTextFallback = args?.allowTextFallback !== false;
    const isPackageHook = !allowTextFallback && !!args?.packageRootDir && !!args?.exportName;
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
function isNonEmptyString(value) {
    return typeof value === "string" && value.length > 0;
}
function getDirectoryName(targetPath) {
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
async function pathExists(targetPath) {
    try {
        await statPath(targetPath);
        return true;
    }
    catch {
        return false;
    }
}
async function computeWorkflowContentDigest(rootDir) {
    const files = [];
    const visit = async (dir) => {
        for (const child of await listRuntimeChildrenStrict(dir)) {
            const stat = await statRuntimePathStrict(child);
            if (stat.isDir) {
                await visit(child);
            }
            else if (/\.(?:json|mjs|js)$/i.test(child)) {
                files.push(child);
            }
        }
    };
    await visit(rootDir);
    files.sort();
    const content = (await Promise.all(files.map(async (file) => `${file.slice(rootDir.length).replace(/\\/g, "/")}\0${await readTextFile(file)}`))).join("\0");
    const digest = await sha256Hex(new TextEncoder().encode(content));
    if (!digest) {
        throw new Error("SHA-256 is unavailable for workflow content identity");
    }
    return digest;
}
function normalizePackageRelativePath(value) {
    const normalized = String(value || "")
        .trim()
        .replace(/\\/g, "/")
        .replace(/^\.\/+/, "")
        .replace(/\/+/g, "/");
    if (!normalized ||
        normalized.startsWith("/") ||
        /^[A-Za-z]:\//.test(normalized)) {
        return "";
    }
    const segments = normalized.split("/").filter(Boolean);
    if (segments.some((segment) => segment === "..")) {
        return "";
    }
    return segments.join("/");
}
function parseLocaleMessageMap(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return null;
    }
    const messages = {};
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
async function loadPackageLocalizationResources(args) {
    const localization = {
        packageDefaultLocale: String(args.packageManifest.i18n?.defaultLocale || "").trim(),
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
            args.diagnostics.push(createLoaderDiagnostic({
                level: "warning",
                category: "manifest_validation_error",
                message: `Invalid workflow package locale path: ${relativePath}`,
                entry: args.entry,
                path: diagnosticPath,
                reason: "package locale path must be a package-relative path",
            }));
            continue;
        }
        try {
            const parsed = JSON.parse(await readTextFile(diagnosticPath));
            const messages = parseLocaleMessageMap(parsed);
            if (!messages) {
                throw new Error("locale JSON must be an object with string values");
            }
            localization.packageMessages[normalizedLocale] = messages;
        }
        catch (error) {
            args.diagnostics.push(createLoaderDiagnostic({
                level: "warning",
                category: "manifest_validation_error",
                message: `Invalid workflow package locale resource: ${diagnosticPath}`,
                entry: args.entry,
                path: diagnosticPath,
                reason: String(error),
            }));
        }
    }
    return localization;
}
async function collectPackageWorkflowCandidates(args) {
    const candidates = [];
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
async function collectSingleWorkflowCandidate(args) {
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
        return [];
    }
    return [
        {
            entry: args.entry,
            packageId: String(manifestResult.manifest.id || "").trim() || args.entry,
            packageRootDir: args.workflowRoot,
            manifestPath: args.manifestPath,
            workflowRoot: args.workflowRoot,
            declaredFromPackage: false,
            localization: undefined,
            manifest: normalizeManifestProvider(manifestResult.manifest),
        },
    ];
}
async function collectWorkflowCandidates(args) {
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
        return [];
    }
    return collectSingleWorkflowCandidate({
        entry: args.entry,
        workflowRoot: args.workflowRoot,
        manifestPath,
        diagnostics: args.diagnostics,
    });
}
async function filterDirectoryEntriesByOfficialManifest(workflowsDir, entries, diagnostics) {
    const builtinManifestPath = joinPath(workflowsDir, "manifest.json");
    if (!(await pathExists(builtinManifestPath))) {
        return entries;
    }
    try {
        const parsed = JSON.parse(await readTextFile(builtinManifestPath));
        if (!Array.isArray(parsed.files)) {
            return entries;
        }
        const shippedRoots = new Set(parsed.files
            .map((entry) => String(entry || "")
            .replace(/\\/g, "/")
            .split("/")
            .map((segment) => segment.trim())
            .filter(Boolean)[0])
            .filter(Boolean));
        if (shippedRoots.size === 0) {
            return entries;
        }
        return entries.filter((entry) => shippedRoots.has(entry));
    }
    catch (error) {
        diagnostics.push(createLoaderDiagnostic({
            level: "warning",
            category: "manifest_parse_error",
            message: `Unable to read official workflow manifest filter: ${builtinManifestPath} (${String(error)})`,
            path: builtinManifestPath,
            reason: String(error),
        }));
        return entries;
    }
}
async function loadHooks(args) {
    const hooks = {};
    const workflowRoot = args.workflowRoot;
    const manifest = args.manifest;
    const allowTextFallback = !args.isPackageWorkflow;
    let executionMode;
    const assignExecutionMode = (nextMode) => {
        if (!executionMode) {
            executionMode = nextMode;
            return;
        }
        if (executionMode !== nextMode) {
            throw new Error(`Inconsistent workflow hook execution modes: ${executionMode} vs ${nextMode}`);
        }
    };
    const assertPackageHookPath = (relativePath, exportName) => {
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
    }
    catch (error) {
        throw new WorkflowLoaderDiagnosticError({
            category: "hook_missing_error",
            message: `Hook file missing: ${manifest.hooks.applyResult}`,
            workflowId: manifest.id,
            path: applyResultPath,
            reason: String(error),
        });
    }
    let applyResultModule;
    try {
        const loaded = await loadHooksModule(applyResultPath, {
            allowTextFallback,
            workflowSourceKind: args.workflowSourceKind,
            packageRootDir: args.packageRootDir,
            exportName: "applyResult",
        });
        applyResultModule = loaded.loaded;
        assignExecutionMode(loaded.executionMode);
    }
    catch (error) {
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
    hooks.applyResult = applyResultModule.applyResult;
    if (manifest.hooks.preflight) {
        assertPackageHookPath(manifest.hooks.preflight, "preflight");
        const preflightPath = joinPath(workflowRoot, manifest.hooks.preflight);
        try {
            await statPath(preflightPath);
        }
        catch (error) {
            throw new WorkflowLoaderDiagnosticError({
                category: "hook_missing_error",
                message: `Hook file missing: ${manifest.hooks.preflight}`,
                workflowId: manifest.id,
                path: preflightPath,
                reason: String(error),
            });
        }
        let preflightModule;
        try {
            const loaded = await loadHooksModule(preflightPath, {
                allowTextFallback,
                workflowSourceKind: args.workflowSourceKind,
                packageRootDir: args.packageRootDir,
                exportName: "preflight",
            });
            preflightModule = loaded.loaded;
            assignExecutionMode(loaded.executionMode);
        }
        catch (error) {
            throw new WorkflowLoaderDiagnosticError({
                category: "hook_import_error",
                message: `Hook import failed: ${manifest.hooks.preflight}`,
                workflowId: manifest.id,
                path: preflightPath,
                reason: String(error),
            });
        }
        if (typeof preflightModule.preflight !== "function") {
            throw new WorkflowLoaderDiagnosticError({
                category: "hook_export_error",
                message: `Hook export preflight() not found: ${manifest.hooks.preflight}`,
                workflowId: manifest.id,
                path: preflightPath,
                reason: "preflight export missing",
            });
        }
        hooks.preflight = preflightModule.preflight;
    }
    if (manifest.hooks.buildRequest) {
        assertPackageHookPath(manifest.hooks.buildRequest, "buildRequest");
        const buildRequestPath = joinPath(workflowRoot, manifest.hooks.buildRequest);
        try {
            await statPath(buildRequestPath);
        }
        catch (error) {
            throw new WorkflowLoaderDiagnosticError({
                category: "hook_missing_error",
                message: `Hook file missing: ${manifest.hooks.buildRequest}`,
                workflowId: manifest.id,
                path: buildRequestPath,
                reason: String(error),
            });
        }
        let buildRequestModule;
        try {
            const loaded = await loadHooksModule(buildRequestPath, {
                allowTextFallback,
                workflowSourceKind: args.workflowSourceKind,
                packageRootDir: args.packageRootDir,
                exportName: "buildRequest",
            });
            buildRequestModule = loaded.loaded;
            assignExecutionMode(loaded.executionMode);
        }
        catch (error) {
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
        hooks.buildRequest = buildRequestModule.buildRequest;
    }
    if (manifest.hooks.normalizeSettings) {
        assertPackageHookPath(manifest.hooks.normalizeSettings, "normalizeSettings");
        const normalizeSettingsPath = joinPath(workflowRoot, manifest.hooks.normalizeSettings);
        try {
            await statPath(normalizeSettingsPath);
        }
        catch (error) {
            throw new WorkflowLoaderDiagnosticError({
                category: "hook_missing_error",
                message: `Hook file missing: ${manifest.hooks.normalizeSettings}`,
                workflowId: manifest.id,
                path: normalizeSettingsPath,
                reason: String(error),
            });
        }
        let normalizeSettingsModule;
        try {
            const loaded = await loadHooksModule(normalizeSettingsPath, {
                allowTextFallback,
                workflowSourceKind: args.workflowSourceKind,
                packageRootDir: args.packageRootDir,
                exportName: "normalizeSettings",
            });
            normalizeSettingsModule = loaded.loaded;
            assignExecutionMode(loaded.executionMode);
        }
        catch (error) {
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
                message: `Hook export normalizeSettings() not found: ${manifest.hooks.normalizeSettings}`,
                workflowId: manifest.id,
                path: normalizeSettingsPath,
                reason: "normalizeSettings export missing",
            });
        }
        hooks.normalizeSettings =
            normalizeSettingsModule.normalizeSettings;
    }
    return {
        hooks,
        executionMode: executionMode || "node-native-module",
    };
}
export async function loadWorkflowManifests(workflowsDir, args) {
    const diagnostics = [];
    const workflowsById = new Map();
    const contentDigests = new Map();
    let entries = [];
    try {
        entries = await listDirectoryEntries(workflowsDir);
    }
    catch (error) {
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
    entries = await filterDirectoryEntriesByOfficialManifest(workflowsDir, entries, diagnostics);
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
                try {
                    const hiddenByDebugMode = candidate.manifest.debug_only === true && !isDebugModeEnabled();
                    if (!isNonEmptyString(candidate.manifest.provider)) {
                        diagnostics.push(createLoaderDiagnostic({
                            level: "warning",
                            category: "manifest_validation_error",
                            message: `Skip workflow ${candidate.manifest.id}: missing provider declaration`,
                            entry: candidate.entry,
                            workflowId: candidate.manifest.id,
                            path: candidate.manifestPath,
                            reason: "provider missing",
                        }));
                        continue;
                    }
                    const buildStrategy = resolveBuildStrategy(candidate.manifest);
                    if (!buildStrategy) {
                        diagnostics.push(createLoaderDiagnostic({
                            level: "warning",
                            category: "manifest_validation_error",
                            message: `Skip workflow ${candidate.manifest.id}: missing hooks.buildRequest and request declaration`,
                            entry: candidate.entry,
                            workflowId: candidate.manifest.id,
                            path: candidate.manifestPath,
                            reason: "build strategy unresolved",
                        }));
                        continue;
                    }
                    const hookResult = await loadHooks({
                        workflowRoot: candidate.workflowRoot,
                        packageRootDir: candidate.packageRootDir,
                        manifest: candidate.manifest,
                        isPackageWorkflow: candidate.declaredFromPackage,
                        workflowSourceKind: args?.workflowSourceKind,
                    });
                    if (hiddenByDebugMode) {
                        continue;
                    }
                    const contentRoot = candidate.declaredFromPackage
                        ? candidate.packageRootDir
                        : candidate.workflowRoot;
                    const contentDigest = contentDigests.get(contentRoot) ||
                        computeWorkflowContentDigest(contentRoot);
                    contentDigests.set(contentRoot, contentDigest);
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
                        contentDigest: await contentDigest,
                    });
                }
                catch (error) {
                    const normalized = toDiagnosticFromUnknown({
                        error,
                        fallback: createLoaderDiagnostic({
                            level: "warning",
                            category: "scan_runtime_warning",
                            message: `Skip workflow ${candidate.manifest.id}: ${String(error)}`,
                            entry: candidate.entry,
                            workflowId: candidate.manifest.id,
                            path: candidate.manifestPath,
                        }),
                    });
                    diagnostics.push({
                        ...normalized,
                        entry: normalized.entry || candidate.entry,
                        workflowId: normalized.workflowId || candidate.manifest.id,
                        path: normalized.path || candidate.manifestPath,
                        message: normalized.message.startsWith("Skip workflow")
                            ? normalized.message
                            : `Skip workflow ${candidate.manifest.id}: ${normalized.message}`,
                    });
                }
            }
        }
        catch (error) {
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
    const workflows = Array.from(workflowsById.values()).sort((a, b) => a.manifest.id.localeCompare(b.manifest.id));
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
