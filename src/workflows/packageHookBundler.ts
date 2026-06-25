import { joinPath } from "../utils/path";

type BundledModule = {
  id: string;
  filePath: string;
  source: string;
  transformed: string;
  dependencies: string[];
};

type BundleCacheEntry = {
  fingerprint: string;
  scriptText: string;
  moduleCount: number;
};

type BundleResult = {
  scriptText: string;
  moduleCount: number;
  cacheHit: boolean;
  fingerprint: string;
};

const bundleCache = new Map<string, BundleCacheEntry>();

const importStatementPattern =
  /(^|[\n;])\s*import\s+([\s\S]*?)\s+from\s+["']([^"']+)["']\s*;?/gm;
const reexportFromPattern =
  /(^|[\n;])\s*export\s+\{([\s\S]*?)\}\s+from\s+["']([^"']+)["']\s*;?/gm;
const exportListPattern = /(^|[\n;])\s*export\s+\{([\s\S]*?)\}\s*;?/gm;

type DynamicImport = (specifier: string) => Promise<any>;

const dynamicImport: DynamicImport = new Function(
  "specifier",
  "return import(specifier)",
) as DynamicImport;

function isZoteroRuntime() {
  const runtime = globalThis as {
    IOUtils?: { readUTF8?: unknown };
  };
  return typeof runtime.IOUtils?.readUTF8 === "function";
}

async function readTextFile(filePath: string) {
  const runtime = globalThis as {
    IOUtils?: { readUTF8?: (path: string) => Promise<string> };
  };
  if (typeof runtime.IOUtils?.readUTF8 === "function") {
    return runtime.IOUtils.readUTF8(filePath);
  }
  const fs = await dynamicImport("fs/promises");
  return fs.readFile(filePath, "utf8");
}

function normalizeFsPath(input: string) {
  return String(input || "").replace(/\\/g, "/");
}

function dirname(targetPath: string) {
  const normalized = normalizeFsPath(targetPath);
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length <= 1) {
    return "";
  }
  const isAbsolute = normalized.startsWith("/");
  const driveMatch = normalized.match(/^([A-Za-z]:)\//);
  const drivePrefix = driveMatch?.[1] || "";
  const parentParts = parts.slice(0, -1);
  if (drivePrefix) {
    return joinPath(drivePrefix, ...parentParts.slice(1));
  }
  if (isAbsolute) {
    return joinPath("/", ...parentParts);
  }
  return joinPath(...parentParts);
}

function normalizeInsidePackagePath(filePath: string, packageRootDir: string) {
  const normalizedFilePath = normalizeFsPath(filePath);
  const normalizedRoot = normalizeFsPath(packageRootDir).replace(/\/+$/g, "");
  if (
    normalizedFilePath !== normalizedRoot &&
    !normalizedFilePath.startsWith(`${normalizedRoot}/`)
  ) {
    throw new Error(
      `Package hook import escapes package root: ${filePath} (root=${packageRootDir})`,
    );
  }
  return normalizedFilePath.slice(normalizedRoot.length).replace(/^\/+/, "");
}

function resolveRelativeModulePath(args: {
  fromFilePath: string;
  specifier: string;
  packageRootDir: string;
}) {
  const specifier = String(args.specifier || "").trim();
  if (!specifier.startsWith("./") && !specifier.startsWith("../")) {
    throw new Error(`Unsupported package hook import: ${specifier}`);
  }
  const resolved = joinPath(dirname(args.fromFilePath), specifier);
  normalizeInsidePackagePath(resolved, args.packageRootDir);
  return resolved;
}

function parseSpecifierList(specifiersText: string) {
  const inner = String(specifiersText || "").trim();
  if (!inner.startsWith("{") || !inner.endsWith("}")) {
    throw new Error(`Unsupported import/export syntax: ${specifiersText}`);
  }
  const body = inner.slice(1, -1).trim();
  if (!body) {
    return [] as Array<{ imported: string; local: string }>;
  }
  return body
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const match = entry.match(
        /^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/,
      );
      if (!match) {
        throw new Error(`Unsupported import/export specifier: ${entry}`);
      }
      const imported = match[1];
      const local = match[2] || imported;
      return { imported, local };
    });
}

function escapeForStringLiteral(value: string) {
  return JSON.stringify(String(value || ""));
}

function collectModuleImports(args: {
  source: string;
  filePath: string;
  packageRootDir: string;
  dependencies: Set<string>;
}) {
  let dependencyIndex = 0;
  const transformed = args.source.replace(
    importStatementPattern,
    (_full, prefix: string, specifiersText: string, importPath: string) => {
      const resolvedDependencyPath = resolveRelativeModulePath({
        fromFilePath: args.filePath,
        specifier: importPath,
        packageRootDir: args.packageRootDir,
      });
      const dependencyId = normalizeInsidePackagePath(
        resolvedDependencyPath,
        args.packageRootDir,
      );
      args.dependencies.add(resolvedDependencyPath);
      const dependencyVar = `__dep_${dependencyIndex++}`;
      const specifiers = parseSpecifierList(specifiersText);
      const localBindings = specifiers
        .map(
          (entry) =>
            `const ${entry.local} = ${dependencyVar}.${entry.imported};`,
        )
        .join("\n");
      return `${prefix || ""}const ${dependencyVar} = __require(${escapeForStringLiteral(dependencyId)});\n${localBindings}`;
    },
  );
  return transformed;
}

function collectReexports(args: {
  source: string;
  filePath: string;
  packageRootDir: string;
  dependencies: Set<string>;
  exportMap: Map<string, string>;
}) {
  let dependencyIndex = 0;
  return args.source.replace(
    reexportFromPattern,
    (_full, prefix: string, specifiersText: string, importPath: string) => {
      const resolvedDependencyPath = resolveRelativeModulePath({
        fromFilePath: args.filePath,
        specifier: importPath,
        packageRootDir: args.packageRootDir,
      });
      const dependencyId = normalizeInsidePackagePath(
        resolvedDependencyPath,
        args.packageRootDir,
      );
      args.dependencies.add(resolvedDependencyPath);
      const dependencyVar = `__reexport_${dependencyIndex++}`;
      const specifiers = parseSpecifierList(`{${specifiersText}}`);
      for (const entry of specifiers) {
        args.exportMap.set(entry.local, `${dependencyVar}.${entry.imported}`);
      }
      return `${prefix || ""}const ${dependencyVar} = __require(${escapeForStringLiteral(dependencyId)});`;
    },
  );
}

function collectLocalExportList(args: {
  source: string;
  exportMap: Map<string, string>;
}) {
  return args.source.replace(
    exportListPattern,
    (_full, prefix: string, specifiersText: string) => {
      const specifiers = parseSpecifierList(`{${specifiersText}}`);
      for (const entry of specifiers) {
        args.exportMap.set(entry.local, entry.imported);
      }
      return prefix || "";
    },
  );
}

function stripExportKeywords(args: {
  source: string;
  exportMap: Map<string, string>;
}) {
  let transformed = args.source.replace(
    /export\s+async\s+function\s+([A-Za-z_$][\w$]*)\s*\(/g,
    (_full, name: string) => {
      args.exportMap.set(name, name);
      return `async function ${name}(`;
    },
  );
  transformed = transformed.replace(
    /export\s+function\s+([A-Za-z_$][\w$]*)\s*\(/g,
    (_full, name: string) => {
      args.exportMap.set(name, name);
      return `function ${name}(`;
    },
  );
  transformed = transformed.replace(
    /export\s+(const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g,
    (_full, declaration: string, name: string) => {
      args.exportMap.set(name, name);
      return `${declaration} ${name} =`;
    },
  );
  return transformed;
}

function transformModuleSource(args: {
  source: string;
  filePath: string;
  packageRootDir: string;
}) {
  const dependencies = new Set<string>();
  const exportMap = new Map<string, string>();
  let transformed = collectModuleImports({
    source: args.source,
    filePath: args.filePath,
    packageRootDir: args.packageRootDir,
    dependencies,
  });
  transformed = collectReexports({
    source: transformed,
    filePath: args.filePath,
    packageRootDir: args.packageRootDir,
    dependencies,
    exportMap,
  });
  transformed = collectLocalExportList({
    source: transformed,
    exportMap,
  });
  transformed = stripExportKeywords({
    source: transformed,
    exportMap,
  });
  if (/\bimport\.meta\b/.test(transformed)) {
    throw new Error(
      `Unsupported import.meta in package hook module: ${args.filePath}`,
    );
  }
  if (/\bexport\s+\*/.test(transformed)) {
    throw new Error(
      `Unsupported export * syntax in package hook module: ${args.filePath}`,
    );
  }
  if (/\bexport\s+default\b/.test(transformed)) {
    throw new Error(
      `Unsupported default export in package hook module: ${args.filePath}`,
    );
  }
  return {
    transformed,
    exportMap,
    dependencies: Array.from(dependencies.values()),
  };
}

async function collectModuleGraph(args: {
  filePath: string;
  packageRootDir: string;
  modules: Map<string, BundledModule>;
}) {
  if (args.modules.has(args.filePath)) {
    return;
  }
  const source = await readTextFile(args.filePath);
  const transformedResult = transformModuleSource({
    source,
    filePath: args.filePath,
    packageRootDir: args.packageRootDir,
  });
  const moduleId = normalizeInsidePackagePath(args.filePath, args.packageRootDir);
  const transformed = [
    transformedResult.transformed.trim(),
    `return { ${Array.from(transformedResult.exportMap.entries())
      .map(([exportName, expression]) => `${JSON.stringify(exportName)}: ${expression}`)
      .join(", ")} };`,
  ]
    .filter(Boolean)
    .join("\n");
  args.modules.set(args.filePath, {
    id: moduleId,
    filePath: args.filePath,
    source,
    transformed,
    dependencies: transformedResult.dependencies,
  });
  for (const dependencyPath of transformedResult.dependencies) {
    await collectModuleGraph({
      filePath: dependencyPath,
      packageRootDir: args.packageRootDir,
      modules: args.modules,
    });
  }
}

function hashFingerprint(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function buildBundleScript(args: {
  entryFilePath: string;
  entryExportName: string;
  modules: BundledModule[];
  packageRootDir: string;
}) {
  const entryId = normalizeInsidePackagePath(args.entryFilePath, args.packageRootDir);
  const moduleTable = args.modules
    .map(
      (module) =>
        `${JSON.stringify(module.id)}: function(__require){\n${module.transformed}\n}`,
    )
    .join(",\n");
  return [
    "(function(){",
    "var globalThis = this;",
    "var __zsHostApi = this.__zsHostApi;",
    "var __zsHostApiVersion = this.__zsHostApiVersion;",
    "var fetch = this.fetch;",
    "var Buffer = this.Buffer;",
    "var btoa = this.btoa;",
    "var atob = this.atob;",
    "var TextEncoder = this.TextEncoder;",
    "var TextDecoder = this.TextDecoder;",
    "var FileReader = this.FileReader;",
    "var navigator = this.navigator;",
    "var console = this.console;",
    "var IOUtils = this.IOUtils;",
    "var __modules = {",
    moduleTable,
    "};",
    "var __cache = Object.create(null);",
    "function __require(id){",
    "  if (Object.prototype.hasOwnProperty.call(__cache, id)) { return __cache[id]; }",
    "  if (!Object.prototype.hasOwnProperty.call(__modules, id)) {",
    "    throw new Error('Bundled package hook module not found: ' + id);",
    "  }",
    "  var exports = __modules[id](__require) || {};",
    "  __cache[id] = exports;",
    "  return exports;",
    "}",
    `var __entry = __require(${JSON.stringify(entryId)});`,
    `this.__zoteroSkillsHookExports = { ${args.entryExportName}: __entry.${args.entryExportName} };`,
    "}).call(this);",
  ].join("\n");
}

export async function bundlePackageHookScript(args: {
  entryFilePath: string;
  packageRootDir: string;
  entryExportName: "applyResult" | "buildRequest" | "normalizeSettings";
}) {
  const modules = new Map<string, BundledModule>();
  await collectModuleGraph({
    filePath: args.entryFilePath,
    packageRootDir: args.packageRootDir,
    modules,
  });
  const orderedModules = Array.from(modules.values()).sort((left, right) =>
    left.id.localeCompare(right.id),
  );
  const fingerprint = hashFingerprint(
    orderedModules
      .map((module) => `${module.id}\n${module.source}`)
      .join("\n/* module */\n"),
  );
  const cacheKey = `${normalizeFsPath(args.entryFilePath)}::${args.entryExportName}`;
  const cached = bundleCache.get(cacheKey);
  if (cached && cached.fingerprint === fingerprint) {
    return {
      scriptText: cached.scriptText,
      moduleCount: cached.moduleCount,
      cacheHit: true,
      fingerprint,
    } satisfies BundleResult;
  }
  const scriptText = buildBundleScript({
    entryFilePath: args.entryFilePath,
    entryExportName: args.entryExportName,
    modules: orderedModules,
    packageRootDir: args.packageRootDir,
  });
  bundleCache.set(cacheKey, {
    fingerprint,
    scriptText,
    moduleCount: orderedModules.length,
  });
  return {
    scriptText,
    moduleCount: orderedModules.length,
    cacheHit: false,
    fingerprint,
  } satisfies BundleResult;
}

export function clearPackageHookBundleCacheForTests() {
  bundleCache.clear();
}

export const __packageHookBundlerTestOnly = {
  normalizeInsidePackagePath,
  parseSpecifierList,
  transformModuleSource,
};
