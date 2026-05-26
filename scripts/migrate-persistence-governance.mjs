#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const args = parseArgs(process.argv.slice(2));
const mode =
  args.mode || (args.apply ? "apply" : args.verify ? "verify-only" : "dry-run");
const dataDir = args["data-directory"] || args.dataDir || "";
const oldRoot =
  args["old-root"] ||
  args.oldRoot ||
  (dataDir ? path.join(dataDir, "zotero-skills") : "");
const newRoot =
  args["new-root"] ||
  args.newRoot ||
  (dataDir ? path.join(dataDir, "zotero-agents") : "");
const force = Boolean(args.force);

if (!["dry-run", "apply", "verify-only"].includes(mode)) {
  fail(`unsupported mode: ${mode}`);
}
if (!oldRoot || !newRoot) {
  fail("Provide --data-directory <path> or both --old-root and --new-root.");
}

const plan = {
  schema: "zotero-agents.persistence_migration_plan.v1",
  mode,
  oldRoot,
  newRoot,
  force,
  generatedAt: new Date().toISOString(),
  operations: [],
  diagnostics: [],
};

await main();

async function main() {
  const oldDbCandidates = [
    path.join(oldRoot, "state", "zotero-skills.db"),
    path.join(oldRoot, "runtime", "state", "zotero-skills.db"),
    path.join(oldRoot, "state", "zotero-agents.db"),
    path.join(oldRoot, "runtime", "state", "zotero-agents.db"),
  ];
  const newDb = path.join(newRoot, "state", "zotero-agents.db");
  const oldSynthesisCandidates = [
    path.join(oldRoot, "synthesis"),
    path.join(oldRoot, "runtime", "synthesis"),
  ];
  const newSynthesis = path.join(newRoot, "data", "synthesis");
  const oldWorkflowAssets = path.join(oldRoot, "workflow-products", "assets");
  const oldRuntimeWorkflowAssets = path.join(
    oldRoot,
    "runtime",
    "workflow-products",
    "assets",
  );
  const newWorkflowAssets = path.join(
    newRoot,
    "runtime",
    "workflow-products",
    "assets",
  );

  let dbSourceFound = false;
  for (const oldDb of oldDbCandidates) {
    if (await exists(oldDb)) {
      dbSourceFound = true;
      await planCopyFile(oldDb, newDb, "sqlite-state-database");
      break;
    }
  }
  if (!dbSourceFound) {
    plan.operations.push({
      kind: "sqlite-state-database",
      action: "skip_missing_source",
      sources: oldDbCandidates,
      target: newDb,
    });
  }

  for (const source of oldSynthesisCandidates) {
    if (await exists(source)) {
      await planCopyDirectory(
        source,
        newSynthesis,
        "synthesis-canonical-store",
      );
      break;
    }
  }

  if (await exists(oldWorkflowAssets)) {
    await planCopyDirectory(
      oldWorkflowAssets,
      newWorkflowAssets,
      "workflow-product-assets",
    );
  } else {
    await planCopyDirectory(
      oldRuntimeWorkflowAssets,
      newWorkflowAssets,
      "workflow-product-assets",
    );
  }

  await detectLegacyMirror(oldRoot);

  if (mode === "apply") {
    const reportPath = path.join(
      newRoot,
      "state",
      "migration-reports",
      `${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
    );
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(
      reportPath,
      `${JSON.stringify(plan, null, 2)}\n`,
      "utf8",
    );
    plan.reportPath = reportPath;
  }

  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const entry = argv[index];
    if (!entry.startsWith("--")) {
      continue;
    }
    const key = entry.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function stat(target) {
  try {
    return await fs.stat(target);
  } catch {
    return null;
  }
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

async function sha256File(target) {
  const hash = crypto.createHash("sha256");
  hash.update(await fs.readFile(target));
  return `sha256:${hash.digest("hex")}`;
}

async function collectFiles(root) {
  const files = [];
  if (!(await exists(root))) {
    return files;
  }
  async function visit(dir) {
    for (const name of await fs.readdir(dir)) {
      const child = path.join(dir, name);
      const childStat = await stat(child);
      if (!childStat) {
        continue;
      }
      if (childStat.isDirectory()) {
        await visit(child);
      } else {
        files.push(child);
      }
    }
  }
  await visit(root);
  return files.sort();
}

async function ensureTargetWritable(target, kind) {
  if (!(await exists(target))) {
    return true;
  }
  if (force) {
    return true;
  }
  plan.diagnostics.push({
    severity: "error",
    code: "target_exists",
    kind,
    target,
  });
  return false;
}

async function planCopyFile(source, target, kind) {
  if (!(await exists(source))) {
    plan.operations.push({
      kind,
      action: "skip_missing_source",
      source,
      target,
    });
    return;
  }
  const sourceHash = await sha256File(source);
  const operation = {
    kind,
    action: "copy_file",
    source,
    target,
    sourceHash,
  };
  plan.operations.push(operation);
  if (mode !== "apply") {
    return;
  }
  if (!(await ensureTargetWritable(target, kind))) {
    return;
  }
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(source, target);
  operation.targetHash = await sha256File(target);
  if (operation.targetHash !== sourceHash) {
    plan.diagnostics.push({
      severity: "error",
      code: "hash_mismatch",
      kind,
      source,
      target,
    });
  }
}

async function planCopyDirectory(source, target, kind) {
  if (!(await exists(source))) {
    plan.operations.push({
      kind,
      action: "skip_missing_source",
      source,
      target,
    });
    return;
  }
  const files = await collectFiles(source);
  plan.operations.push({
    kind,
    action: "copy_directory",
    source,
    target,
    fileCount: files.length,
  });
  if (mode !== "apply") {
    return;
  }
  if (!(await ensureTargetWritable(target, kind))) {
    return;
  }
  for (const file of files) {
    const relative = path.relative(source, file);
    const targetFile = path.join(target, relative);
    await fs.mkdir(path.dirname(targetFile), { recursive: true });
    await fs.copyFile(file, targetFile);
    const sourceHash = await sha256File(file);
    const targetHash = await sha256File(targetFile);
    if (sourceHash !== targetHash) {
      plan.diagnostics.push({
        severity: "error",
        code: "hash_mismatch",
        kind,
        source: file,
        target: targetFile,
      });
    }
  }
}

async function detectLegacyMirror(root) {
  const files = await collectFiles(root);
  const mirrorFiles = [];
  for (const file of files) {
    const text = await fs.readFile(file, "utf8").catch(() => "");
    if (text.includes("ZOTERO_SKILLS_SYNTHESIS_SHARD")) {
      mirrorFiles.push(file);
    }
  }
  if (mirrorFiles.length) {
    plan.diagnostics.push({
      severity: "warning",
      code: "legacy_note_mirror_present",
      count: mirrorFiles.length,
      files: mirrorFiles,
    });
  }
}
