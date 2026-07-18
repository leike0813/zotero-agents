import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readZoteroBridgeCliRelease } from "./zotero-bridge-cli-release";
import {
  inspectZoteroLibraryAgentBundleVersion,
  ZOTERO_LIBRARY_AGENT_BUNDLE_VERSION_SOURCE_PATH,
} from "./zotero-library-agent-bundle-version";

const ROOT = process.cwd();
const SOURCE_ROOT = "skills_src/zotero-library-agent/semantic";
const RUNTIME_SOURCE_ROOT = "skills_src/zotero-library-agent";
const TARGET_ROOT = "skills_builtin/zotero-library-agent";
const SHARED_TERMINOLOGY = "skills_src/host-bridge-shared/terminology.md";
const SHARED_CONTROL = "skills_src/host-bridge-shared/control-invariants.md";
const SHARED_AGENT_GUIDANCE = [
  "skills_src/host-bridge-shared/semantic/manifest.json",
  "skills_src/host-bridge-shared/semantic/connectivity-context.json",
  "skills_src/host-bridge-shared/semantic/library.json",
  "skills_src/host-bridge-shared/semantic/workflow-run.json",
  "skills_src/host-bridge-shared/semantic/mutation-file-product.json",
  "skills_src/host-bridge-shared/semantic/synthesis.json",
  "skills_src/host-bridge-shared/semantic/diagnostics.json",
];
const GENERATED_HOST_BRIDGE =
  "skills_builtin/zotero-bridge-cli/references/host-bridge-cli.md";
const MANIFEST_SOURCE = join(TARGET_ROOT, "assets/bundle-manifest-source.json");

export const ZOTERO_LIBRARY_AGENT_SEMANTIC_FILES = [
  "README.md",
  "SKILL.md",
  "agents/openai.yaml",
  "references/task-routing.md",
  "references/workflow-execution.md",
  "references/evidence-handoff.md",
  "references/helper-script-contract.md",
  "references/journeys/current-context-and-library-read.md",
  "references/journeys/notes-attachments-and-readiness.md",
  "references/journeys/synthesis-research-context.md",
  "references/journeys/host-owned-workflow.md",
  "references/journeys/agent-owned-handoff.md",
  "references/journeys/concrete-writeback.md",
  "references/journeys/products-and-files.md",
  "assets/evidence-bundle.schema.json",
  "assets/evidence-input.example.json",
  "scripts/zotero_library_agent.py",
] as const;

export const ZOTERO_LIBRARY_AGENT_RUNTIME_FILES = [
  { source: "runner.json", target: "assets/runner.json" },
  { source: "output.schema.json", target: "assets/output.schema.json" },
] as const;

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
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

function renderManifestSource() {
  const release = readZoteroBridgeCliRelease(ROOT);
  const agentSurface = JSON.parse(
    read("cli/zotero-bridge/src/agent-surface.json"),
  );
  const version = inspectZoteroLibraryAgentBundleVersion(ROOT).resolved;
  const semanticSources = ZOTERO_LIBRARY_AGENT_SEMANTIC_FILES.map((path) =>
    join(SOURCE_ROOT, path).replace(/\\/g, "/"),
  );
  const runtimeSources = ZOTERO_LIBRARY_AGENT_RUNTIME_FILES.map(({ source }) =>
    join(RUNTIME_SOURCE_ROOT, source).replace(/\\/g, "/"),
  );
  const sharedSources = [
    SHARED_TERMINOLOGY,
    SHARED_CONTROL,
    ...SHARED_AGENT_GUIDANCE,
    GENERATED_HOST_BRIDGE,
  ];
  return `${JSON.stringify(
    {
      schema: "zotero-library-agent.bundle.manifest-source.v1",
      releaseRepository:
        "https://github.com/leike0813/zotero-library-agent-bundle",
      sourceFiles: {
        version: ZOTERO_LIBRARY_AGENT_BUNDLE_VERSION_SOURCE_PATH,
        semantic: semanticSources,
        runtime: runtimeSources,
        shared: sharedSources,
        cliRelease: "cli/zotero-bridge/release.json",
        releaseSet: "host-bridge/release-set.json",
        agentSurface: "cli/zotero-bridge/src/agent-surface.json",
      },
      generated: {
        bundleVersion: version.version,
        cliVersion: release.version,
        cliIdentity: {
          schema:
            agentSurface.cliSchema === "zotero-bridge.cli.v2"
              ? "host-bridge.surface-identity.v2"
              : "host-bridge.surface-identity.v1",
          protocol: agentSurface.protocol,
          cliSchema: agentSurface.cliSchema,
          version: release.version,
          buildFingerprint: release.buildFingerprint,
          commandCatalogChecksum: agentSurface.commandCatalogChecksum,
        },
        binaryAggregateSha256: release.binaryAggregateSha256,
        semanticChecksum: sha256(
          [...semanticSources, ...runtimeSources, ...sharedSources]
            .map((path) => read(path))
            .join("\n---\n"),
        ),
      },
    },
    null,
    2,
  )}\n`;
}

export function renderZoteroLibraryAgentBundle(
  check = false,
  mode: "content" | "release" = "release",
) {
  const diffs: string[] = [];
  for (const path of ZOTERO_LIBRARY_AGENT_SEMANTIC_FILES) {
    writeOrCheck(
      join(TARGET_ROOT, path),
      read(join(SOURCE_ROOT, path)),
      check,
      diffs,
    );
  }
  for (const { source, target } of ZOTERO_LIBRARY_AGENT_RUNTIME_FILES) {
    writeOrCheck(
      join(TARGET_ROOT, target),
      read(join(RUNTIME_SOURCE_ROOT, source)),
      check,
      diffs,
    );
  }
  writeOrCheck(
    join(TARGET_ROOT, "references/terminology.md"),
    read(SHARED_TERMINOLOGY),
    check,
    diffs,
  );
  writeOrCheck(
    join(TARGET_ROOT, "references/control-invariants.md"),
    read(SHARED_CONTROL),
    check,
    diffs,
  );
  writeOrCheck(
    join(TARGET_ROOT, "references/host-bridge.md"),
    read(GENERATED_HOST_BRIDGE),
    check,
    diffs,
  );
  if (mode === "release") {
    writeOrCheck(MANIFEST_SOURCE, renderManifestSource(), check, diffs);
  }

  if (diffs.length) {
    const lines = diffs
      .map((path) => `- ${relative(ROOT, join(ROOT, path))}`)
      .join("\n");
    throw new Error(
      `zotero-library-agent generated files are stale:\n${lines}`,
    );
  }
}

function isMainModule() {
  return process.argv[1]
    ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
    : false;
}

if (isMainModule()) {
  renderZoteroLibraryAgentBundle(
    process.argv.includes("--check"),
    process.argv.includes("--content-only") ? "content" : "release",
  );
}
