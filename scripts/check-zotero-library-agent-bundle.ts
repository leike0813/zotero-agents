import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import Ajv from "ajv";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readZoteroBridgeCliRelease } from "./zotero-bridge-cli-release";
import {
  inspectZoteroLibraryAgentBundleVersion,
  ZOTERO_LIBRARY_AGENT_BUNDLE_VERSION_SOURCE_PATH,
} from "./zotero-library-agent-bundle-version";
import {
  ZOTERO_LIBRARY_AGENT_RUNTIME_FILES,
  ZOTERO_LIBRARY_AGENT_SEMANTIC_FILES,
} from "./render-zotero-library-agent-bundle";

const ROOT = process.cwd();
const SOURCE_ROOT = "skills_src/zotero-library-agent/semantic";
const RUNTIME_SOURCE_ROOT = "skills_src/zotero-library-agent";
const TARGET_ROOT = "skills_builtin/zotero-library-agent";
const SHARED_TERMINOLOGY = "skills_src/host-bridge-shared/terminology.md";
const SHARED_CONTROL = "skills_src/host-bridge-shared/control-invariants.md";
const WRAPPER_REFERENCE =
  "skills_builtin/zotero-bridge-cli/references/host-bridge-cli.md";
const EXPECTED_PLATFORMS = [
  "win32-x64",
  "darwin-x64",
  "darwin-arm64",
  "linux-x86",
  "linux-x64",
  "linux-arm",
  "linux-arm64",
] as const;

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function readJson(path: string) {
  return JSON.parse(read(path));
}

function sha256File(path: string) {
  return createHash("sha256")
    .update(readFileSync(join(ROOT, path)))
    .digest("hex");
}

function fail(errors: string[], message: string) {
  errors.push(message);
}

function checkFiles(errors: string[]) {
  if (existsSync(join(ROOT, "skills_builtin/zotero-bridge-cli/README.md"))) {
    fail(errors, "CLI bundle README must not be nested inside the wrapper skill");
  }
  for (const relative of ZOTERO_LIBRARY_AGENT_SEMANTIC_FILES) {
    const source = join(SOURCE_ROOT, relative);
    const target = join(TARGET_ROOT, relative);
    if (!existsSync(join(ROOT, source))) {
      fail(errors, `missing semantic source: ${source}`);
      continue;
    }
    if (!existsSync(join(ROOT, target))) {
      fail(errors, `missing rendered file: ${target}`);
      continue;
    }
    if (read(source) !== read(target)) {
      fail(errors, `rendered file differs from semantic source: ${relative}`);
    }
  }
  for (const {
    source: relativeSource,
    target: relativeTarget,
  } of ZOTERO_LIBRARY_AGENT_RUNTIME_FILES) {
    const source = join(RUNTIME_SOURCE_ROOT, relativeSource);
    const target = join(TARGET_ROOT, relativeTarget);
    if (!existsSync(join(ROOT, source))) {
      fail(errors, `missing runtime source: ${source}`);
      continue;
    }
    if (!existsSync(join(ROOT, target))) {
      fail(errors, `missing rendered runtime file: ${target}`);
      continue;
    }
    if (read(source) !== read(target)) {
      fail(
        errors,
        `rendered runtime file differs from source: ${relativeTarget}`,
      );
    }
  }
  const sharedCopies = [
    [SHARED_TERMINOLOGY, join(TARGET_ROOT, "references/terminology.md")],
    [SHARED_CONTROL, join(TARGET_ROOT, "references/control-invariants.md")],
    [
      SHARED_CONTROL,
      "skills_builtin/zotero-bridge-cli/references/control-invariants.md",
    ],
    [
      SHARED_CONTROL,
      "profiles/hermes/zotero-librarian/skills/zotero-librarian/references/control-invariants.md",
    ],
    [WRAPPER_REFERENCE, join(TARGET_ROOT, "references/host-bridge.md")],
  ] as const;
  for (const [source, target] of sharedCopies) {
    if (!existsSync(join(ROOT, target)) || read(source) !== read(target)) {
      fail(errors, `shared generated copy is stale: ${target}`);
    }
  }
}

function checkRuntimeContract(errors: string[]) {
  const runnerPath = join(TARGET_ROOT, "assets/runner.json");
  const outputSchemaPath = join(TARGET_ROOT, "assets/output.schema.json");
  try {
    const runner = readJson(runnerPath);
    if (runner.id !== "zotero-library-agent") {
      fail(errors, "Library Agent runner has an incorrect id");
    }
    if (
      !Array.isArray(runner.execution_modes) ||
      !runner.execution_modes.includes("auto") ||
      !runner.execution_modes.includes("interactive")
    ) {
      fail(
        errors,
        "Library Agent runner must support auto and interactive modes",
      );
    }
    if (runner.schemas?.output !== "assets/output.schema.json") {
      fail(errors, "Library Agent runner has an incorrect output schema path");
    }
  } catch (error) {
    fail(errors, `invalid Library Agent runner: ${String(error)}`);
  }
  try {
    const ajv = new Ajv({ allErrors: true, strict: false });
    ajv.compile(readJson(outputSchemaPath));
  } catch (error) {
    fail(errors, `invalid Library Agent output schema: ${String(error)}`);
  }
}

function checkSemanticBoundary(errors: string[]) {
  const agentSurface = ZOTERO_LIBRARY_AGENT_SEMANTIC_FILES.filter((path) =>
    path.endsWith(".md"),
  )
    .map((path) => read(join(SOURCE_ROOT, path)))
    .join("\n");
  for (const [pattern, label] of [
    [/HERMES_HOME|hermes\.profile/i, "Hermes runtime"],
    [/zotero_librarian_index|index\.sqlite|sqlite3/i, "resident index"],
    [/run-register|run-watch/i, "resident run registry"],
    [/cron\/|hermes\.cron/i, "scheduler configuration"],
  ] as const) {
    if (pattern.test(agentSurface)) {
      fail(errors, `agent-neutral semantic source contains ${label}`);
    }
  }
  const profile = read("profiles_src/hermes/zotero-librarian/SOUL.md");
  const profileConfig = read("profiles/hermes/zotero-librarian/config.yaml");
  if (
    !/maintenance|maintain/i.test(profile) ||
    !/runMonitor|workflowCatalog/.test(profileConfig)
  ) {
    fail(
      errors,
      "Zotero Librarian profile no longer declares resident maintenance behavior",
    );
  }
}

function checkSchemaAndHelper(errors: string[]) {
  const schemaPath = join(TARGET_ROOT, "assets/evidence-bundle.schema.json");
  try {
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);
    ajv.compile(readJson(schemaPath));
  } catch (error) {
    fail(errors, `invalid evidence bundle schema: ${String(error)}`);
  }
  const helper = read(join(TARGET_ROOT, "scripts/zotero_library_agent.py"));
  for (const forbidden of [
    "import sqlite3",
    "import subprocess",
    "HERMES_HOME",
    "ZOTERO_LIBRARIAN_STATE_DIR",
  ]) {
    if (helper.includes(forbidden)) {
      fail(
        errors,
        `stateless helper contains forbidden runtime dependency: ${forbidden}`,
      );
    }
  }
}

function checkVersionAndManifest(errors: string[]) {
  const inspected = inspectZoteroLibraryAgentBundleVersion(ROOT);
  const release = readZoteroBridgeCliRelease(ROOT);
  const manifestPath = join(TARGET_ROOT, "assets/bundle-manifest-source.json");
  if (!existsSync(join(ROOT, manifestPath))) {
    fail(errors, `missing rendered manifest source: ${manifestPath}`);
    return;
  }
  const manifest = readJson(manifestPath);
  if (manifest.schema !== "zotero-library-agent.bundle.manifest-source.v1") {
    fail(errors, "bundle manifest source has an unsupported schema");
  }
  if (manifest.generated?.bundleVersion !== inspected.resolved.version) {
    fail(errors, "bundle manifest source has an incorrect bundle version");
  }
  if (manifest.generated?.cliVersion !== release.version) {
    fail(errors, "bundle manifest source has an incorrect CLI version");
  }
  if (
    manifest.sourceFiles?.version !==
    ZOTERO_LIBRARY_AGENT_BUNDLE_VERSION_SOURCE_PATH
  ) {
    fail(errors, "bundle manifest source is missing its version source path");
  }
  const hostBridgeReference = read(
    join(TARGET_ROOT, "references/host-bridge.md"),
  );
  for (const required of [
    release.version,
    "--version",
    "--help",
    "Version mismatch alone is not a blocker",
    "surface identity --json",
  ]) {
    if (!hostBridgeReference.includes(required)) {
      fail(
        errors,
        `Library Agent Host Bridge reference is missing CLI guidance: ${required}`,
      );
    }
  }
}

function checkPrebuilds(errors: string[]) {
  const release = readJson("cli/zotero-bridge/release.json") as {
    binaries?: Array<{
      platform: string;
      binary: string;
      sha256: string;
    }>;
  };
  const entries = new Map(
    (release.binaries || []).map((entry) => [entry.platform, entry]),
  );
  for (const platform of EXPECTED_PLATFORMS) {
    const entry = entries.get(platform);
    if (!entry) {
      fail(errors, `CLI release manifest is missing ${platform}`);
      continue;
    }
    const binary = join("addon/bin", platform, entry.binary);
    const checksum = `${binary}.sha256`;
    if (
      !existsSync(join(ROOT, binary)) ||
      !statSync(join(ROOT, binary)).isFile()
    ) {
      fail(errors, `missing CLI prebuild: ${binary}`);
      continue;
    }
    if (!existsSync(join(ROOT, checksum))) {
      fail(errors, `missing CLI checksum: ${checksum}`);
      continue;
    }
    const actual = sha256File(binary);
    const declared = read(checksum).trim().split(/\s+/)[0]?.toLowerCase();
    if (actual !== entry.sha256 || declared !== entry.sha256) {
      fail(errors, `CLI checksum mismatch for ${platform}`);
    }
  }
}

const errors: string[] = [];
checkFiles(errors);
checkRuntimeContract(errors);
checkSemanticBoundary(errors);
checkSchemaAndHelper(errors);
checkVersionAndManifest(errors);
checkPrebuilds(errors);

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log("zotero-library-agent bundle checks passed");
