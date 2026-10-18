import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = path.resolve(import.meta.dirname, "../..");
const evidenceFile = path.join(
  root,
  ".scaffold/test/synthesis-protocol-execution.jsonl",
);

export type SynthesisProtocolExecutionEvidence = {
  identity: string;
  slot: string;
  outcome: "accepted" | "rejected" | "persisted" | "diverged" | "verified";
  implementation: "native-process";
};

export function synthesisProtocolExecutionIdentity(workspaceRoot = root) {
  const hash = createHash("sha256");
  const add = (directory: string) => {
    for (const entry of fs
      .readdirSync(directory, { withFileTypes: true })
      .sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) add(file);
      else if (/\.(?:json|ts|mjs|rs|sql)$/.test(entry.name))
        hash
          .update(path.relative(workspaceRoot, file))
          .update(fs.readFileSync(file));
    }
  };
  for (const directory of [
    "packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1",
    "packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1",
    "packages/synthesis-contracts/src",
    "src/modules/synthesisClient",
    "src/modules/synthesis/sidecar",
    "src/modules/synthesis/reverseHost",
    "src/modules/zoteroHost",
    "workflows_builtin",
    "rust/synthesis-sidecar/crates",
    "tests/helpers",
    "tests/fixtures",
    "tests/synthesis",
    "tests/workflow-literature-analysis",
    "tests/workflow-literature-workbench-package",
  ]) {
    const fullPath = path.join(workspaceRoot, directory);
    if (!fs.existsSync(fullPath)) return undefined;
    add(fullPath);
  }
  for (const relative of [
    "scripts/synthesis/check-synthesis-native-worker-transfer-parity.ts",
    "scripts/synthesis/check-synthesis-cross-language-contracts.ts",
    "scripts/synthesis/synthesisProtocolStructureCoverage.ts",
    "scripts/synthesis/synthesisProtocolExecutionEvidence.ts",
  ]) {
    const file = path.join(workspaceRoot, relative);
    if (!fs.existsSync(file)) return undefined;
    hash.update(relative).update(fs.readFileSync(file));
  }
  const hostBroker = path.join(
    workspaceRoot,
    "src/modules/zoteroHostCapabilityBroker.ts",
  );
  if (!fs.existsSync(hostBroker)) return undefined;
  hash.update(fs.readFileSync(hostBroker));
  const executable = path.join(
    workspaceRoot,
    "rust/synthesis-sidecar/target/debug",
    process.platform === "win32"
      ? "synthesis-sidecar.exe"
      : "synthesis-sidecar",
  );
  if (!fs.existsSync(executable)) return undefined;
  hash.update(fs.readFileSync(executable));
  return hash.digest("hex");
}

export function appendSynthesisProtocolExecutionEvidence(
  identity: string,
  slot: string,
  outcome: SynthesisProtocolExecutionEvidence["outcome"],
) {
  fs.mkdirSync(path.dirname(evidenceFile), { recursive: true });
  fs.appendFileSync(
    evidenceFile,
    `${JSON.stringify({ identity, slot, outcome, implementation: "native-process" })}\n`,
    "utf8",
  );
}

export function readSynthesisProtocolExecutionEvidence() {
  const identity = synthesisProtocolExecutionIdentity();
  if (!identity || !fs.existsSync(evidenceFile)) return [];
  return fs
    .readFileSync(evidenceFile, "utf8")
    .split(/\r?\n/)
    .flatMap((line): SynthesisProtocolExecutionEvidence[] => {
      if (!line) return [];
      try {
        const record = JSON.parse(line);
        return record.identity === identity &&
          record.implementation === "native-process" &&
          typeof record.slot === "string" &&
          [
            "accepted",
            "rejected",
            "persisted",
            "diverged",
            "verified",
          ].includes(record.outcome)
          ? [record]
          : [];
      } catch {
        return [];
      }
    });
}
