import { assert } from "chai";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

type SelectorKind =
  | "node-fs"
  | "io-utils"
  | "os-file"
  | "temp-path-utils"
  | "zotero-temp-directory";

type SelectorFinding = {
  file: string;
  line: number;
  selector: SelectorKind;
};

const SOURCE_ROOT = path.join(process.cwd(), "src");
const OWNER_FILE = "src/modules/runtimePersistence.ts";
const NATIVE_WORKLOAD_ALLOWLIST: ReadonlyArray<{
  owner: string;
  selectors: readonly SelectorKind[];
  evidence: string;
}> = [
  {
    owner: "src/workers/runtimeFileRangeWorker.ts",
    selectors: ["io-utils"],
    evidence: "test/core/171-acp-runtime-memory-governance.test.ts",
  },
  {
    owner: "src/modules/runtimeFileTransfer.ts",
    selectors: ["node-fs"],
    evidence: "test/core/184-runtime-file-transfer-governance.test.ts",
  },
  {
    owner: "src/handlers/index.ts",
    selectors: ["zotero-temp-directory"],
    evidence: "test/core/90-workflow-stored-attachment-import.test.ts",
  },
];

function listTypeScriptFiles(root: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (entryPath === path.join(SOURCE_ROOT, "modules", "harness")) {
        continue;
      }
      files.push(...listTypeScriptFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(entryPath);
    }
  }
  return files;
}

function propertyName(node: ts.Expression) {
  if (ts.isIdentifier(node) || ts.isPrivateIdentifier(node)) {
    return node.text;
  }
  return "";
}

function selectorKind(node: ts.Node): SelectorKind | null {
  if (
    ts.isStringLiteralLike(node) &&
    /^(?:node:)?fs(?:\/promises)?$/.test(node.text)
  ) {
    return "node-fs";
  }
  if (!ts.isPropertyAccessExpression(node)) {
    return null;
  }
  const name = propertyName(node.name);
  if (name === "IOUtils") {
    return "io-utils";
  }
  if (
    name === "File" &&
    ts.isPropertyAccessExpression(node.expression) &&
    propertyName(node.expression.name) === "OS"
  ) {
    return "os-file";
  }
  if (
    name === "tempDir" &&
    ts.isPropertyAccessExpression(node.expression) &&
    propertyName(node.expression.name) === "PathUtils"
  ) {
    return "temp-path-utils";
  }
  if (name === "getTempDirectory") {
    return "zotero-temp-directory";
  }
  return null;
}

function inventorySelectors(): SelectorFinding[] {
  const findings: SelectorFinding[] = [];
  for (const filePath of listTypeScriptFiles(SOURCE_ROOT)) {
    const sourceText = fs.readFileSync(filePath, "utf8");
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const visit = (node: ts.Node) => {
      const selector = selectorKind(node);
      if (selector) {
        const location = sourceFile.getLineAndCharacterOfPosition(
          node.getStart(sourceFile),
        );
        findings.push({
          file: path.relative(process.cwd(), filePath).replaceAll("\\", "/"),
          line: location.line + 1,
          selector,
        });
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  return findings;
}

describe("runtime host adaptation governance", function () {
  it("maps every native workload selector exception to one owner and stable test", function () {
    const owners = new Set<string>();
    for (const entry of NATIVE_WORKLOAD_ALLOWLIST) {
      assert.isFalse(
        owners.has(entry.owner),
        `duplicate owner: ${entry.owner}`,
      );
      owners.add(entry.owner);
      assert.isTrue(
        fs.existsSync(entry.owner),
        `missing owner: ${entry.owner}`,
      );
      assert.isTrue(
        fs.existsSync(entry.evidence),
        `missing evidence: ${entry.evidence}`,
      );
      assert.isNotEmpty(entry.selectors);
    }
  });

  it("keeps ordinary filesystem adapter selection inside runtime persistence", function () {
    const unauthorized = inventorySelectors().filter((finding) => {
      if (finding.file === OWNER_FILE) {
        return false;
      }
      return !NATIVE_WORKLOAD_ALLOWLIST.some(
        (entry) =>
          entry.owner === finding.file &&
          entry.selectors.includes(finding.selector),
      );
    });

    assert.deepEqual(unauthorized, []);
  });
});
