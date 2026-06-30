import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  buildHostBridgeSurfaceCatalog,
  validateHostBridgeSurfaceCatalog,
} from "./host-bridge-surface-catalog";

const ROOT = process.cwd();
const PROFILE_ROOT = "profiles/hermes/zotero-librarian";
const EXPECTED_PLATFORMS = [
  "win32-x64",
  "darwin-x64",
  "darwin-arm64",
  "linux-x86",
  "linux-x64",
  "linux-arm",
  "linux-arm64",
];
const REQUIRED_FILES = [
  "distribution.yaml",
  ".gitignore",
  "SOUL.md",
  "config.yaml",
  "README.md",
  "skills/zotero-librarian/SKILL.md",
  "skills/zotero-librarian/references/host-bridge.md",
  "skills/zotero-librarian/references/workflows.md",
  "skills/zotero-librarian/references/library-maintenance.md",
  "scripts/zotero_librarian_index_service.py",
  "scripts/install_zotero_bridge_cli.py",
  "cron/index-refresh.yaml",
  "cron/workflow-catalog-refresh.yaml",
  "cron/run-monitor.yaml",
  "cron/inbox-triage.yaml",
  "cron/library-hygiene.yaml",
  "cron/attention-queue.yaml",
  "assets/host-bridge/profile.example.json",
  "assets/profile-manifest-source.json",
];

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function readProfile(path: string) {
  return read(join(PROFILE_ROOT, path));
}

function json(path: string) {
  return JSON.parse(read(path));
}

function fail(errors: string[], message: string) {
  errors.push(message);
}

function assertFile(errors: string[], path: string) {
  const absolute = join(ROOT, path);
  if (!existsSync(absolute) || !statSync(absolute).isFile()) {
    fail(errors, `missing file: ${path}`);
  }
}

function assertIncludes(
  errors: string[],
  source: string,
  needle: string,
  label: string,
) {
  if (!source.includes(needle)) {
    fail(errors, `${label} missing ${needle}`);
  }
}

function checkStructure(errors: string[]) {
  for (const file of REQUIRED_FILES) {
    assertFile(errors, join(PROFILE_ROOT, file));
  }
  const gitignore = readProfile(".gitignore");
  for (const runtimePath of [
    "index.sqlite",
    "*.sqlite",
    "runs/",
    "logs/",
    ".zotero-bridge/",
  ]) {
    assertIncludes(errors, gitignore, runtimePath, ".gitignore");
  }
}

function checkSecrets(errors: string[]) {
  const combined = REQUIRED_FILES.map((file) => readProfile(file)).join("\n");
  const forbidden = [
    [/bearer\s+[A-Za-z0-9._~+/-]{16,}/i, "literal bearer credential"],
    [/"token"\s*:/i, "literal auth token field"],
    [/C:\\Users\\|\/Users\/|\/home\//, "absolute local path"],
    [/session[_-]?id\s*[:=]/i, "session id"],
  ] as const;
  for (const [pattern, label] of forbidden) {
    if (pattern.test(combined)) {
      fail(errors, `profile contains ${label}`);
    }
  }

  const profile = json(
    join(PROFILE_ROOT, "assets/host-bridge/profile.example.json"),
  );
  if (profile.auth?.tokenEnv !== "ZOTERO_BRIDGE_TOKEN") {
    fail(errors, "profile.example.json must use tokenEnv ZOTERO_BRIDGE_TOKEN");
  }
  if (profile.auth?.token !== undefined) {
    fail(errors, "profile.example.json must not contain auth.token");
  }
  const template = json(
    "skills_builtin/zotero-bridge-cli/assets/profile.template.json",
  );
  if (JSON.stringify(profile) !== JSON.stringify(template)) {
    fail(errors, "profile example differs from Host Bridge template");
  }
}

function checkHostBridgeSurface(errors: string[]) {
  const catalog = buildHostBridgeSurfaceCatalog(ROOT);
  errors.push(...validateHostBridgeSurfaceCatalog(catalog));
  const capabilityNames = new Set(
    catalog.capabilities.map((entry) => entry.name),
  );
  if (!capabilityNames.has("library.sync_snapshot")) {
    fail(errors, "Host Bridge catalog missing library.sync_snapshot");
  }
  const mappingNames = new Set(
    catalog.cliMappings.map((entry) => entry.command),
  );
  for (const command of ["library list", "library snapshot"]) {
    if (!mappingNames.has(command)) {
      fail(errors, `Host Bridge catalog missing zotero-bridge ${command}`);
    }
  }

  const hostReference = readProfile(
    "skills/zotero-librarian/references/host-bridge.md",
  );
  for (const snippet of [
    "zotero-librarian:host-bridge:start",
    "zotero-librarian:host-bridge:end",
    "library.sync_snapshot",
    "zotero-bridge library snapshot",
    "zotero-bridge library list",
    "nextCursor",
    "collectionKey",
  ]) {
    assertIncludes(errors, hostReference, snippet, "host-bridge reference");
  }
}

function checkWorkflowCatalog(errors: string[]) {
  const workflowReference = readProfile(
    "skills/zotero-librarian/references/workflows.md",
  );
  for (const snippet of [
    "zotero-librarian:workflow-catalog:start",
    "zotero-librarian:workflow-catalog:end",
    "workflow-refresh",
    "workflow-show",
    "run-register",
    "run-watch",
  ]) {
    assertIncludes(errors, workflowReference, snippet, "workflow reference");
  }

  const manifest = json("workflows_builtin/manifest.json");
  const files = Array.isArray(manifest.files) ? manifest.files : [];
  const expectedWorkflowIds = files
    .filter(
      (file: unknown) =>
        typeof file === "string" && file.endsWith("workflow.json"),
    )
    .map((file: string) => ({
      file,
      workflow: json(join("workflows_builtin", file)) as Record<
        string,
        unknown
      >,
    }))
    .filter(({ file, workflow }) => {
      const id = String(workflow.id || "");
      return (
        id &&
        !id.startsWith("debug-") &&
        !file.includes("workflow-debug-probe/")
      );
    })
    .map(({ workflow }) => String(workflow.id));
  for (const id of expectedWorkflowIds.slice(0, 10)) {
    assertIncludes(errors, workflowReference, id, "workflow reference");
  }
  if (workflowReference.includes("debug_only")) {
    fail(errors, "workflow reference must not publish debug_only workflows");
  }
}

function checkCronAndScripts(errors: string[]) {
  const indexService = readProfile("scripts/zotero_librarian_index_service.py");
  for (const snippet of [
    '"refresh"',
    '"search"',
    '"item"',
    '"stats"',
    '"workflow-refresh"',
    '"workflow-show"',
    '"run-register"',
    '"run-watch"',
    "ZOTERO_LIBRARIAN_STATE_DIR",
    "HERMES_HOME",
    "index.sqlite",
    "library snapshot",
    "workflow describe",
  ]) {
    assertIncludes(errors, indexService, snippet, "index service");
  }

  const installer = readProfile("scripts/install_zotero_bridge_cli.py");
  for (const snippet of [
    "link_well_known_profile",
    "current_well_known_profile",
    "infer_host_home_from_hermes_home",
    "ZOTERO_BRIDGE_HOST_PROFILE",
    "ZOTERO_BRIDGE_HOST_HOME",
    "bridge-profile.json",
    ".hermes",
    "symlink_to",
    "--no-link-well-known-profile",
    "--force-profile-link",
  ]) {
    assertIncludes(errors, installer, snippet, "zotero-bridge installer");
  }

  const soul = readProfile("SOUL.md");
  for (const snippet of [
    "scripts/install_zotero_bridge_cli.py",
    "ZOTERO_BRIDGE_HOST_PROFILE",
    "do not change `HOME`",
  ]) {
    assertIncludes(errors, soul, snippet, "SOUL.md");
  }

  const cronExpectations: Record<string, string[]> = {
    "cron/index-refresh.yaml": ["every: 6h", "[SILENT]", "refresh"],
    "cron/workflow-catalog-refresh.yaml": [
      'time: "03:00"',
      "[SILENT]",
      "workflow-refresh",
    ],
    "cron/run-monitor.yaml": ["every: 5m", "[SILENT]", "run-watch"],
    "cron/inbox-triage.yaml": ['time: "09:00"', "[SILENT]", "status:0-inbox"],
    "cron/library-hygiene.yaml": [
      "weekly: monday",
      "[SILENT]",
      "duplicate DOI",
    ],
    "cron/attention-queue.yaml": ['time: "18:00"', "[SILENT]", "insights"],
  };
  for (const [file, snippets] of Object.entries(cronExpectations)) {
    const source = readProfile(file);
    for (const snippet of snippets) {
      assertIncludes(errors, source, snippet, file);
    }
  }
}

function checkBinaries(errors: string[]) {
  for (const platform of EXPECTED_PLATFORMS) {
    const binary =
      platform === "win32-x64" ? "zotero-bridge.exe" : "zotero-bridge";
    assertFile(errors, join("addon/bin", platform, binary));
    assertFile(errors, join("addon/bin", platform, `${binary}.sha256`));
  }
  const publishScript = read("scripts/publish-zotero-librarian-profile.ps1");
  for (const snippet of [
    "https://github.com/leike0813/zotero-librarian-profile.git",
    "releaseRepository",
    "installCommand",
    "assets/zotero-bridge/bin",
    "manifest.json",
    "sourceCommit",
    "dirty",
  ]) {
    assertIncludes(errors, publishScript, snippet, "publish script");
  }
  const readme = readProfile("README.md");
  for (const snippet of [
    "https://github.com/leike0813/zotero-agents",
    "hermes profile install https://github.com/leike0813/zotero-librarian-profile.git <--alias>",
  ]) {
    assertIncludes(errors, readme, snippet, "profile README");
  }
}

const errors: string[] = [];
checkStructure(errors);
checkSecrets(errors);
checkHostBridgeSurface(errors);
checkWorkflowCatalog(errors);
checkCronAndScripts(errors);
checkBinaries(errors);

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log("zotero-librarian profile checks passed");
