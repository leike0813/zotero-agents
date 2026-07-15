import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { parse as parseYaml } from "yaml";

type MethodCategory = "query" | "command" | "host_effect" | "debug";
type MethodDisposition =
  | "client_capability"
  | "host_capability"
  | "internal"
  | "remove";

interface InventoryConsumer {
  path: string;
  role: string;
}

interface InventoryMethodGroup {
  id: string;
  category: MethodCategory;
  target_capability: string;
  disposition: MethodDisposition;
  consumer_groups: string[];
  methods: string[];
}

interface RawBoundaryInventory {
  schema: string;
  service_source: string;
  service_factory: string;
  direct_consumers: InventoryConsumer[];
  method_groups: InventoryMethodGroup[];
}

export interface BoundaryInventoryMethod {
  name: string;
  category: MethodCategory;
  target_capability: string;
  disposition: MethodDisposition;
  consumer_groups: string[];
}

export interface BoundaryInventory {
  schema: string;
  service_source: string;
  service_factory: string;
  direct_consumers: InventoryConsumer[];
  methods: BoundaryInventoryMethod[];
}

const ROOT_DIR = process.cwd();
const INVENTORY_PATH = path.join(
  ROOT_DIR,
  "doc/synthesis-layer/contracts/service-api-migration.yaml",
);
const CONTRACTS_ROOT = path.join(ROOT_DIR, "packages/synthesis-contracts/src");
const VALID_CATEGORIES = new Set<MethodCategory>([
  "query",
  "command",
  "host_effect",
  "debug",
]);
const VALID_DISPOSITIONS = new Set<MethodDisposition>([
  "client_capability",
  "host_capability",
  "internal",
  "remove",
]);

function normalizedRepoPath(filePath: string): string {
  return path.relative(ROOT_DIR, filePath).replace(/\\/g, "/");
}

function walkTypeScriptFiles(root: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkTypeScriptFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

function readRawInventory(): RawBoundaryInventory {
  return parseYaml(
    fs.readFileSync(INVENTORY_PATH, "utf8"),
  ) as RawBoundaryInventory;
}

export function readSynthesisBoundaryInventory(): BoundaryInventory {
  const raw = readRawInventory();
  const methods = (raw.method_groups || []).flatMap((group) =>
    (group.methods || []).map((name) => ({
      name,
      category: group.category,
      target_capability: group.target_capability,
      disposition: group.disposition,
      consumer_groups: [...(group.consumer_groups || [])],
    })),
  );
  return {
    schema: raw.schema,
    service_source: raw.service_source,
    service_factory: raw.service_factory,
    direct_consumers: raw.direct_consumers || [],
    methods,
  };
}

export function extractSynthesisPublicMethods(
  inventory = readSynthesisBoundaryInventory(),
): string[] {
  const sourcePath = path.join(ROOT_DIR, inventory.service_source);
  const source = fs.readFileSync(sourcePath, "utf8");
  const sourceFile = ts.createSourceFile(
    sourcePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const factory = sourceFile.statements.find(
    (statement): statement is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(statement) &&
      statement.name?.text === inventory.service_factory,
  );
  if (!factory?.body) {
    throw new Error(
      `Synthesis service factory not found: ${inventory.service_factory}`,
    );
  }
  const publicReturn = factory.body.statements.find(
    (statement): statement is ts.ReturnStatement =>
      ts.isReturnStatement(statement) &&
      Boolean(statement.expression) &&
      ts.isObjectLiteralExpression(statement.expression!),
  );
  if (
    !publicReturn?.expression ||
    !ts.isObjectLiteralExpression(publicReturn.expression)
  ) {
    throw new Error("Synthesis service public object return was not found");
  }
  return publicReturn.expression.properties
    .map((property) => property.name?.getText(sourceFile) || "")
    .map((name) => name.replace(/^["']|["']$/g, ""))
    .filter(Boolean)
    .sort();
}

function isDirectServiceConsumer(
  relativePath: string,
  source: string,
): boolean {
  if (relativePath === "src/modules/synthesis/service.ts") {
    return false;
  }
  if (/synthesis\/service["']/.test(source)) {
    return true;
  }
  if (
    relativePath.startsWith("src/modules/synthesis/") &&
    /from\s+["']\.\/service["']/.test(source)
  ) {
    return true;
  }
  return /\b(getDefaultSynthesisService|createSynthesisService|SynthesisService)\b/.test(
    source,
  );
}

export function findSynthesisDirectConsumers(): string[] {
  return walkTypeScriptFiles(path.join(ROOT_DIR, "src"))
    .filter((filePath) => {
      const relativePath = normalizedRepoPath(filePath);
      return isDirectServiceConsumer(
        relativePath,
        fs.readFileSync(filePath, "utf8"),
      );
    })
    .map(normalizedRepoPath)
    .sort();
}

export function findSynthesisContractBoundaryViolations(): string[] {
  if (!fs.existsSync(CONTRACTS_ROOT)) {
    return ["packages/synthesis-contracts/src: missing contracts source"];
  }
  const violations: string[] = [];
  for (const filePath of walkTypeScriptFiles(CONTRACTS_ROOT)) {
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

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicateValues = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      duplicateValues.add(value);
    }
    seen.add(value);
  }
  return [...duplicateValues].sort();
}

export function inspectSynthesisServiceBoundary() {
  const inventory = readSynthesisBoundaryInventory();
  const publicMethods = extractSynthesisPublicMethods(inventory);
  const inventoryMethodNames = inventory.methods.map((method) => method.name);
  const directConsumers = findSynthesisDirectConsumers();
  const contractViolations = findSynthesisContractBoundaryViolations();
  const inventoryConsumers = inventory.direct_consumers
    .map((consumer) => consumer.path)
    .sort();
  const publicMethodSet = new Set(publicMethods);
  const inventoryMethodSet = new Set(inventoryMethodNames);
  const directConsumerSet = new Set(directConsumers);
  const inventoryConsumerSet = new Set(inventoryConsumers);
  const invalidMethods = inventory.methods
    .filter(
      (method) =>
        !method.name ||
        !VALID_CATEGORIES.has(method.category) ||
        !VALID_DISPOSITIONS.has(method.disposition) ||
        !method.target_capability ||
        method.consumer_groups.length === 0,
    )
    .map((method) => method.name || "<unnamed>")
    .concat(duplicates(inventoryMethodNames))
    .sort();

  return {
    inventory,
    publicMethods,
    directConsumers,
    missingMethods: publicMethods.filter(
      (method) => !inventoryMethodSet.has(method),
    ),
    unknownMethods: inventoryMethodNames.filter(
      (method) => !publicMethodSet.has(method),
    ),
    invalidMethods,
    missingConsumers: directConsumers.filter(
      (consumer) => !inventoryConsumerSet.has(consumer),
    ),
    unknownConsumers: inventoryConsumers.filter(
      (consumer) => !directConsumerSet.has(consumer),
    ),
    contractViolations,
  };
}

function runCli() {
  const report = inspectSynthesisServiceBoundary();
  const errors = {
    missingMethods: report.missingMethods,
    unknownMethods: report.unknownMethods,
    invalidMethods: report.invalidMethods,
    missingConsumers: report.missingConsumers,
    unknownConsumers: report.unknownConsumers,
    contractViolations: report.contractViolations,
  };
  const hasErrors = Object.values(errors).some((values) => values.length > 0);
  process.stdout.write(
    `${JSON.stringify(
      {
        ok: !hasErrors,
        publicMethodCount: report.publicMethods.length,
        directConsumerCount: report.directConsumers.length,
        errors,
      },
      null,
      2,
    )}\n`,
  );
  if (hasErrors) {
    process.exitCode = 1;
  }
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (entryPath === fileURLToPath(import.meta.url)) {
  runCli();
}
