import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const ROOT = process.cwd();
const CONTRACTS_ROOT = path.join(ROOT, "packages/synthesis-contracts/src");

const LEGACY_OWNER_PATHS = [
  "src/modules/synthesisClient/legacyComposition.ts",
  "src/modules/synthesisClient/inProcessClient.ts",
  "src/modules/synthesis/service.ts",
  "src/modules/synthesis/repository.ts",
] as const;

const NODE_SIDECAR_PATHS = [
  "apps/synthesis-service",
  "scripts/synthesis-sidecar-stage1-node-suite.ts",
] as const;

function repoPath(relativePath: string) {
  return path.join(ROOT, relativePath);
}

function normalizedRepoPath(filePath: string) {
  return path.relative(ROOT, filePath).replace(/\\/g, "/");
}

function walkFiles(root: string, extension: string): string[] {
  if (!fs.existsSync(root)) {
    return [];
  }
  const files: string[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath, extension));
    } else if (entry.isFile() && entry.name.endsWith(extension)) {
      files.push(fullPath);
    }
  }
  return files;
}

export function findForbiddenSynthesisSourcePatterns(
  relativePath: string,
  source: string,
): string[] {
  const checks: Array<[string, RegExp]> = [
    [
      "legacy owner import",
      /(?:from\s*|import\s*(?:\(\s*)?)["'][^"']*(?:synthesis\/(?:service|repository)|legacyComposition|inProcessClient)["']/,
    ],
    [
      "legacy owner factory",
      /\b(?:createSynthesisService|createSynthesisRepository|createDefaultLegacy\w*|getDefaultLegacy\w*|invalidateDefaultLegacy\w*|setDefaultLegacy\w*)\b/,
    ],
    [
      "runtime implementation preference",
      /(?:prefs?\.(?:get|set)\s*\(\s*["'][^"']*synthesis[^"']*(?:implementation|backend)|synthesis\.runtimeImplementation)/i,
    ],
    [
      "runtime implementation environment selector",
      /process\.env\s*(?:\.\s*SYNTHESIS_[A-Z0-9_]*(?:IMPLEMENTATION|BACKEND)|\[\s*["']SYNTHESIS_[^"']*(?:IMPLEMENTATION|BACKEND)["']\s*\])/,
    ],
    [
      "runtime manifest selector",
      /\bmanifest\s*\.\s*(?:implementation|backend)\s*={2,3}\s*["']node["']/i,
    ],
    [
      "Node sidecar backend registration",
      /\bregister\w*\s*\(\s*["'][^"']*synthesis[^"']*node[^"']*["']/i,
    ],
  ];
  return checks
    .filter(([, pattern]) => pattern.test(source))
    .map(([label]) => `${relativePath}: ${label}`);
}

export function findSynthesisContractBoundaryViolations(): string[] {
  if (!fs.existsSync(CONTRACTS_ROOT)) {
    return ["packages/synthesis-contracts/src: missing contracts source"];
  }
  const violations: string[] = [];
  for (const filePath of walkFiles(CONTRACTS_ROOT, ".ts")) {
    const relativePath = normalizedRepoPath(filePath);
    const source = fs.readFileSync(filePath, "utf8");
    const sourceFile = ts.createSourceFile(
      filePath,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    for (const statement of sourceFile.statements) {
      if (
        (ts.isImportDeclaration(statement) ||
          ts.isExportDeclaration(statement)) &&
        statement.moduleSpecifier &&
        ts.isStringLiteral(statement.moduleSpecifier)
      ) {
        const specifier = statement.moduleSpecifier.text;
        if (
          specifier.startsWith("node:") ||
          specifier.startsWith("zotero-") ||
          specifier.includes("/src/") ||
          specifier.endsWith("/src")
        ) {
          violations.push(`${relativePath}: forbidden import ${specifier}`);
        }
      }
    }
    if (/\b(?:Zotero|Window|Document|HTMLElement)\b/.test(source)) {
      violations.push(`${relativePath}: forbidden environment global`);
    }
  }
  return violations.sort();
}

export function findSynthesisProductionBoundaryViolations(): string[] {
  const violations: string[] = [];
  for (const filePath of walkFiles(path.join(ROOT, "src"), ".ts")) {
    const relativePath = normalizedRepoPath(filePath);
    const source = fs.readFileSync(filePath, "utf8");
    violations.push(
      ...findForbiddenSynthesisSourcePatterns(relativePath, source),
    );
  }

  for (const filePath of walkFiles(
    path.join(ROOT, "native/synthesis-sidecar/crates"),
    ".rs",
  )) {
    const relativePath = normalizedRepoPath(filePath);
    if (
      relativePath.includes("/tests/") ||
      relativePath.includes("/examples/")
    ) {
      continue;
    }
    const source = fs.readFileSync(filePath, "utf8").split("#[cfg(test)]", 1)[0]!;
    if (
      /\b(?:Repository|CanonicalStore)::open_production\s*\(/.test(source) &&
      relativePath !==
        "native/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs"
    ) {
      violations.push(
        `${relativePath}: runtime_service.rs is the only production-root opener`,
      );
    }
  }
  return violations.sort();
}

export function inspectSynthesisServiceBoundary() {
  return {
    legacyOwnerPathsPresent: LEGACY_OWNER_PATHS.filter((entry) =>
      fs.existsSync(repoPath(entry)),
    ),
    nodeSidecarPathsPresent: NODE_SIDECAR_PATHS.filter((entry) =>
      fs.existsSync(repoPath(entry)),
    ),
    productionBoundaryViolations:
      findSynthesisProductionBoundaryViolations(),
    contractViolations: findSynthesisContractBoundaryViolations(),
    productionClientAdapter: "clientPortAdapter.ts",
    productionRuntimeOwner: "runtime_service.rs",
  };
}

function runCli() {
  const report = inspectSynthesisServiceBoundary();
  const errors = [
    ...report.legacyOwnerPathsPresent,
    ...report.nodeSidecarPathsPresent,
    ...report.productionBoundaryViolations,
    ...report.contractViolations,
  ];
  process.stdout.write(
    `${JSON.stringify({ ok: errors.length === 0, errors, report }, null, 2)}\n`,
  );
  if (errors.length > 0) {
    process.exitCode = 1;
  }
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (entryPath === fileURLToPath(import.meta.url)) {
  runCli();
}
