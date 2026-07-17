import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import {
  buildHostBridgeSurfaceCatalog,
  validateHostBridgeSurfaceCatalog,
  type HostBridgeSurfaceCatalog,
} from "./host-bridge-surface-catalog";
import {
  readZoteroBridgeCliRelease,
  ZOTERO_BRIDGE_CLI_RELEASE_PATH,
  type ZoteroBridgeCliRelease,
} from "./zotero-bridge-cli-release";
import {
  inspectZoteroLibrarianProfileVersion,
  ZOTERO_LIBRARIAN_PROFILE_VERSION_SOURCE_PATH,
  type ZoteroLibrarianProfileVersion,
} from "./zotero-librarian-profile-version";

type WorkflowCatalogEntry = {
  id: string;
  label: string;
  provider: string;
  version: string;
  path: string;
  parameters: string[];
  inputMode: string;
  executionModes: {
    hostOwned: true;
    agentOwned: boolean;
    requiredParameters: string[];
  };
};

const ROOT = process.cwd();
const PROFILE_ROOT = "profiles/hermes/zotero-librarian";
const PROFILE_SEMANTIC_ROOT = "profiles_src/hermes/zotero-librarian";
const PROFILE_DISTRIBUTION_TARGET = join(PROFILE_ROOT, "distribution.yaml");
const HOST_BRIDGE_REFERENCE = join(
  PROFILE_ROOT,
  "skills/zotero-librarian/references/host-bridge.md",
);
const WORKFLOW_REFERENCE = join(
  PROFILE_ROOT,
  "skills/zotero-librarian/references/workflows.md",
);
const PROFILE_EXAMPLE_SOURCE =
  "skills_builtin/zotero-bridge-cli/assets/profile.template.json";
const SHARED_TERMINOLOGY_SOURCE =
  "skills_src/host-bridge-shared/terminology.md";
const SHARED_CONTROL_INVARIANTS_SOURCE =
  "skills_src/host-bridge-shared/control-invariants.md";
const PROFILE_TERMINOLOGY_TARGET = join(
  PROFILE_ROOT,
  "skills/zotero-librarian/references/terminology.md",
);
const PROFILE_CONTROL_INVARIANTS_TARGET = join(
  PROFILE_ROOT,
  "skills/zotero-librarian/references/control-invariants.md",
);
const PROFILE_EXAMPLE_TARGET = join(
  PROFILE_ROOT,
  "assets/host-bridge/profile.example.json",
);
const MANIFEST_SOURCE_TARGET = join(
  PROFILE_ROOT,
  "assets/profile-manifest-source.json",
);
const GENERATED_MARKER_EXAMPLES = [
  "zotero-librarian:host-bridge:start",
  "zotero-librarian:workflow-catalog:start",
];
export const PROFILE_SEMANTIC_COPIES = [
  "SOUL.md",
  "skills/zotero-librarian/SKILL.md",
  "skills/zotero-librarian/references/operating-principles.md",
  "skills/zotero-librarian/references/workflow-execution-policy.md",
  "skills/zotero-librarian/references/common-tasks.md",
  "skills/zotero-librarian/references/library-maintenance.md",
  "skills/zotero-workflow-agent-runner/SKILL.md",
  "skills/zotero-workflow-agent-runner/references/agent-run-playbook.md",
];
const PROFILE_SCRIPT_SOURCES = [
  "profiles/hermes/zotero-librarian/scripts/zotero_librarian_index_service.py",
  "profiles/hermes/zotero-librarian/scripts/install_zotero_bridge_cli.py",
  "profiles/hermes/zotero-librarian/scripts/zotero_librarian_workflow_service.py",
  "profiles/hermes/zotero-librarian/scripts/zotero_librarian_notification_service.py",
];
const PROFILE_CRON_SOURCES = [
  "profiles/hermes/zotero-librarian/cron/index-refresh.yaml",
  "profiles/hermes/zotero-librarian/cron/workflow-catalog-refresh.yaml",
  "profiles/hermes/zotero-librarian/cron/run-monitor.yaml",
  "profiles/hermes/zotero-librarian/cron/notification-sync.yaml",
  "profiles/hermes/zotero-librarian/cron/inbox-triage.yaml",
  "profiles/hermes/zotero-librarian/cron/library-hygiene.yaml",
  "profiles/hermes/zotero-librarian/cron/attention-queue.yaml",
];
const PROFILE_CONFIG_SOURCES = ["profiles/hermes/zotero-librarian/config.yaml"];

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function readJson(path: string) {
  return JSON.parse(read(path));
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function markdownCell(value: unknown) {
  return String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\s+/g, " ")
    .trim();
}

function replaceGeneratedSection(
  source: string,
  marker: string,
  content: string,
) {
  const start = `<!-- ${marker}:start -->`;
  const end = `<!-- ${marker}:end -->`;
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end);
  if (startIndex < 0 || endIndex < 0 || endIndex < startIndex) {
    throw new Error(`missing generated markers for ${marker}`);
  }
  return [
    source.slice(0, startIndex + start.length),
    "\n",
    content.trim(),
    "\n",
    source.slice(endIndex),
  ].join("");
}

function replaceDistributionVersion(source: string, version: string) {
  if (!/^version:\s*\S+\s*$/m.test(source)) {
    throw new Error("zotero-librarian distribution.yaml is missing version");
  }
  return source.replace(/^version:\s*\S+\s*$/m, `version: ${version}`);
}

function writeOrCheck(
  path: string,
  next: string,
  check: boolean,
  diffs: string[],
) {
  const absolute = join(ROOT, path);
  const current = existsSync(absolute) ? readFileSync(absolute, "utf8") : "";
  if (current === next) {
    return;
  }
  if (check) {
    diffs.push(path);
    return;
  }
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, next, "utf8");
}

function sortedCliMappings(catalog: HostBridgeSurfaceCatalog) {
  const order = [
    "bridge",
    "context",
    "library",
    "synthesis",
    "workflow",
    "run",
    "mutation",
    "file",
    "product",
  ];
  return [...catalog.endpointMappings, ...catalog.cliMappings].sort(
    (left, right) => {
      const leftGroup = left.command.split(" ")[0] || "";
      const rightGroup = right.command.split(" ")[0] || "";
      const leftIndex = order.includes(leftGroup)
        ? order.indexOf(leftGroup)
        : 99;
      const rightIndex = order.includes(rightGroup)
        ? order.indexOf(rightGroup)
        : 99;
      return (
        leftIndex - rightIndex || left.command.localeCompare(right.command)
      );
    },
  );
}

function renderHostBridgeReference(
  catalog: HostBridgeSurfaceCatalog,
  release: ZoteroBridgeCliRelease,
) {
  const commands = sortedCliMappings(catalog)
    .filter((mapping) => {
      const group = mapping.command.split(" ")[0] || "";
      return [
        "bridge",
        "context",
        "library",
        "workflow",
        "run",
        "file",
        "product",
        "synthesis",
        "mutation",
      ].includes(group);
    })
    .map(
      (mapping) =>
        `| \`zotero-bridge ${markdownCell(mapping.command)}\` | ${markdownCell(
          mapping.target,
        )} | ${mapping.kind}${mapping.dangerous ? "; approval required" : ""} |`,
    );
  const libraryCapabilities = catalog.capabilities
    .filter((entry) => entry.category === "library" && entry.public)
    .sort((left, right) => left.name.localeCompare(right.name))
    .map(
      (entry) =>
        `| \`${entry.name}\` | ${markdownCell(entry.summary)} | ${markdownCell(
          entry.cliCommands
            .map((command) => `zotero-bridge ${command}`)
            .join(", ") || "raw call",
        )} | ${entry.approval} |`,
    );

  return [
    "## CLI Release",
    "",
    `This profile surface is generated for \`zotero-bridge\` CLI version \`${release.version}\`.`,
    "",
    "Confirm with `zotero-bridge --version` when the loaded profile or skill path is uncertain, command help does not match this reference, or a CLI error points to command shape mismatch. If the observed version differs, prefer the profile copy and CLI shim from the active workspace, then inspect `zotero-bridge --help` or this generated reference beside that profile copy.",
    "",
    "## CLI Commands",
    "",
    "| Command | Target | Kind |",
    "| --- | --- | --- |",
    ...commands,
    "",
    "## Library Capabilities",
    "",
    "| Capability | Summary | CLI | Approval |",
    "| --- | --- | --- | --- |",
    ...libraryCapabilities,
    "",
    "## Snapshot Payload",
    "",
    "`zotero-bridge library snapshot --query <JSON_OR_FILE>` maps to `library.sync_snapshot`.",
    "",
    "`zotero-bridge library items list --query <JSON_OR_FILE>` maps to `library.list_items`.",
    "",
    "`zotero-bridge library readiness audit|missing-pdf|missing-markdown|missing-analysis --query <JSON_OR_FILE>` maps to `library.readiness_audit`.",
    "",
    "Input fields: `libraryId`, `cursor`, `limit`, `collectionId`, `collectionKey`, `tag`, `itemType`, and `query`.",
    "",
    "Readiness commands use the same filters plus `checks` and `missingOnly`; use them before planning PDF retrieval, Markdown conversion, or literature-analysis remediation.",
    "",
    "Output fields: `schema`, `generatedAt`, `snapshotId`, `items`, `nextCursor`, `hasMore`, `returned`, and `totalScanned`.",
    "",
    "Each item includes `libraryId`, `key`, `id`, `itemType`, `title`, `creators`, `year`, `date`, `publicationTitle`, `DOI`, `ISBN`, `ISSN`, `url`, `tags`, `collections`, `noteCount`, and `attachmentCount`.",
  ].join("\n");
}

function isDebugWorkflow(
  relativePath: string,
  workflow: Record<string, unknown>,
) {
  const id = String(workflow.id || "");
  return (
    id.startsWith("debug-") ||
    relativePath.includes("workflow-debug-probe/") ||
    workflow.debug === true ||
    (workflow.display as Record<string, unknown> | undefined)?.debug === true
  );
}

function workflowInputMode(workflow: Record<string, unknown>) {
  const inputs = workflow.inputs as Record<string, unknown> | undefined;
  if (!inputs) {
    return "none";
  }
  const unit = inputs.unit ? String(inputs.unit) : "";
  const perParent = inputs.per_parent ? "per_parent" : "";
  return [unit, perParent].filter(Boolean).join(" ") || "custom";
}

function loadWorkflowCatalog(): WorkflowCatalogEntry[] {
  const manifest = readJson("workflows_builtin/manifest.json");
  const files = Array.isArray(manifest.files) ? manifest.files : [];
  const entries: WorkflowCatalogEntry[] = [];
  for (const file of files) {
    if (typeof file !== "string" || !file.endsWith("workflow.json")) {
      continue;
    }
    const workflow = readJson(join("workflows_builtin", file));
    if (isDebugWorkflow(file, workflow)) {
      continue;
    }
    const id = String(workflow.id || "");
    if (!id) {
      continue;
    }
    entries.push({
      id,
      label: String(workflow.label || id),
      provider: String(workflow.provider || ""),
      version: String(workflow.version || ""),
      path: file,
      parameters: Object.keys(
        (workflow.parameters as object | undefined) || {},
      ),
      inputMode: workflowInputMode(workflow),
      executionModes: {
        hostOwned: true,
        agentOwned: !Object.values(
          (workflow.parameters as
            | Record<string, { required?: boolean }>
            | undefined) || {},
        ).some((parameter) => parameter.required === true),
        requiredParameters: Object.entries(
          (workflow.parameters as
            | Record<string, { required?: boolean }>
            | undefined) || {},
        )
          .filter(([, parameter]) => parameter.required === true)
          .map(([key]) => key),
      },
    });
  }
  return entries.sort((left, right) => left.id.localeCompare(right.id));
}

function renderWorkflowReference(entries: WorkflowCatalogEntry[]) {
  const rows = entries.map(
    (entry) =>
      `| \`${markdownCell(entry.id)}\` | ${markdownCell(entry.label)} | ${markdownCell(
        entry.provider,
      )} | ${markdownCell(entry.inputMode)} | ${markdownCell(
        entry.parameters.join(", ") || "none",
      )} | ${entry.executionModes.agentOwned ? "yes" : "no"} |`,
  );
  return [
    "## Built-In Workflow Catalog",
    "",
    "Refresh the runtime catalog with `scripts/zotero_librarian_index_service.py workflow-refresh`.",
    "",
    "| Workflow | Label | Provider | Inputs | Parameters | Agent-owned |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows,
    "",
    "Use `workflow-show <workflow-id>` and live `workflow describe` executionModes before direct submission or handoff.",
    "Register and monitor only Host-owned submitted workflow runs with `run-register` and `run-watch`.",
  ].join("\n");
}

function renderManifestSource(
  catalog: HostBridgeSurfaceCatalog,
  workflowEntries: WorkflowCatalogEntry[],
  release: ZoteroBridgeCliRelease,
  profileVersion: ZoteroLibrarianProfileVersion,
) {
  const source = {
    schema: "zotero-librarian.profile.manifest-source.v1",
    profile: "zotero-librarian",
    releaseRepository: "https://github.com/leike0813/zotero-librarian-profile",
    sourceRepository: "https://github.com/leike0813/zotero-agents",
    installCommand:
      "hermes profile install https://github.com/leike0813/zotero-librarian-profile.git <--alias>",
    sourceFiles: {
      hostBridgeCapabilityRegistry:
        "src/modules/hostBridgeCapabilityRegistry.ts",
      zoteroBridgeCliCommands: "cli/zotero-bridge/src/commands.rs",
      zoteroBridgeCliRelease: ZOTERO_BRIDGE_CLI_RELEASE_PATH,
      releaseSet: "host-bridge/release-set.json",
      agentSurface: "cli/zotero-bridge/src/agent-surface.json",
      profileVersionSource: ZOTERO_LIBRARIAN_PROFILE_VERSION_SOURCE_PATH,
      workflowManifest: "workflows_builtin/manifest.json",
      profileExample: PROFILE_EXAMPLE_SOURCE,
      semanticSources: [
        ...PROFILE_SEMANTIC_COPIES.map((path) =>
          join(PROFILE_SEMANTIC_ROOT, path).replace(/\\/g, "/"),
        ),
        SHARED_TERMINOLOGY_SOURCE,
        SHARED_CONTROL_INVARIANTS_SOURCE,
      ],
      profileScripts: PROFILE_SCRIPT_SOURCES,
      profileCron: PROFILE_CRON_SOURCES,
      profileConfig: PROFILE_CONFIG_SOURCES,
    },
    generated: {
      markers: GENERATED_MARKER_EXAMPLES,
      catalogChecksum: sha256(JSON.stringify(catalog)),
      workflowCatalogChecksum: sha256(JSON.stringify(workflowEntries)),
      zoteroBridgeCliRelease: release,
      profileVersion: profileVersion.version,
      zoteroBridgeCliVersion: profileVersion.cliVersion,
      profileVersionSourceChecksum: sha256(
        read(ZOTERO_LIBRARIAN_PROFILE_VERSION_SOURCE_PATH),
      ),
      semanticSourceChecksum: sha256(
        [
          ...PROFILE_SEMANTIC_COPIES.map((path) =>
            read(join(PROFILE_SEMANTIC_ROOT, path)),
          ),
          read(SHARED_TERMINOLOGY_SOURCE),
          read(SHARED_CONTROL_INVARIANTS_SOURCE),
        ].join("\n---\n"),
      ),
      serviceSourceChecksum: sha256(
        [
          ...PROFILE_SCRIPT_SOURCES.map((path) => read(path)),
          ...PROFILE_CRON_SOURCES.map((path) => read(path)),
          ...PROFILE_CONFIG_SOURCES.map((path) => read(path)),
        ].join("\n---\n"),
      ),
    },
  };
  return `${JSON.stringify(source, null, 2)}\n`;
}

function render(check = false) {
  const diffs: string[] = [];
  const catalog = buildHostBridgeSurfaceCatalog(ROOT);
  const errors = validateHostBridgeSurfaceCatalog(catalog);
  if (errors.length) {
    throw new Error(errors.join("\n"));
  }
  const workflows = loadWorkflowCatalog();
  const release = readZoteroBridgeCliRelease(ROOT);
  const profileVersion = inspectZoteroLibrarianProfileVersion(ROOT).resolved;

  writeOrCheck(
    PROFILE_DISTRIBUTION_TARGET,
    replaceDistributionVersion(
      read(PROFILE_DISTRIBUTION_TARGET),
      profileVersion.version,
    ),
    check,
    diffs,
  );

  for (const path of PROFILE_SEMANTIC_COPIES) {
    writeOrCheck(
      join(PROFILE_ROOT, path),
      read(join(PROFILE_SEMANTIC_ROOT, path)),
      check,
      diffs,
    );
  }

  writeOrCheck(
    PROFILE_TERMINOLOGY_TARGET,
    read(SHARED_TERMINOLOGY_SOURCE),
    check,
    diffs,
  );

  writeOrCheck(
    PROFILE_CONTROL_INVARIANTS_TARGET,
    read(SHARED_CONTROL_INVARIANTS_SOURCE),
    check,
    diffs,
  );

  const hostBridgeSource = read(HOST_BRIDGE_REFERENCE);
  writeOrCheck(
    HOST_BRIDGE_REFERENCE,
    replaceGeneratedSection(
      hostBridgeSource,
      "zotero-librarian:host-bridge",
      renderHostBridgeReference(catalog, release),
    ),
    check,
    diffs,
  );

  const workflowSource = read(WORKFLOW_REFERENCE);
  writeOrCheck(
    WORKFLOW_REFERENCE,
    replaceGeneratedSection(
      workflowSource,
      "zotero-librarian:workflow-catalog",
      renderWorkflowReference(workflows),
    ),
    check,
    diffs,
  );

  writeOrCheck(
    PROFILE_EXAMPLE_TARGET,
    read(PROFILE_EXAMPLE_SOURCE),
    check,
    diffs,
  );
  writeOrCheck(
    MANIFEST_SOURCE_TARGET,
    renderManifestSource(catalog, workflows, release, profileVersion),
    check,
    diffs,
  );

  if (diffs.length) {
    const lines = diffs
      .map((path) => relative(ROOT, join(ROOT, path)))
      .map((path) => `- ${path}`)
      .join("\n");
    throw new Error(`zotero-librarian generated files are stale:\n${lines}`);
  }
}

const check = process.argv.includes("--check");
render(check);
