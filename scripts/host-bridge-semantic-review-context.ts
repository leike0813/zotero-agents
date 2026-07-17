import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type HostBridgeSemanticReviewContext = {
  schema: "host-bridge.semantic-review-context.v1";
  changedFiles: string[];
  specLayerChanges: string[];
  semanticSourceChanges: string[];
  profileReleaseMetadataChanges: string[];
  bundleReleaseMetadataChanges: string[];
  generatedTargetChanges: string[];
  unclassifiedChanges: string[];
  reviewRequired: boolean;
  recommendedFocus: string[];
};

function normalizePath(path: string) {
  return path.replace(/\\/g, "/").replace(/^\.\//, "").trim();
}

function sortedUnique(paths: string[]) {
  return Array.from(new Set(paths.map(normalizePath).filter(Boolean))).sort(
    (left, right) => left.localeCompare(right),
  );
}

function gitLines(args: string[]) {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split(/\r?\n/)
      .map(normalizePath)
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function collectChangedFiles() {
  const explicitBase = process.env.HOST_BRIDGE_SEMANTIC_REVIEW_BASE?.trim();
  const mergeBase = explicitBase
    ? explicitBase
    : gitLines(["merge-base", "HEAD", "origin/main"])[0] ||
      gitLines(["merge-base", "HEAD", "main"])[0] ||
      "";
  return sortedUnique([
    ...(mergeBase
      ? gitLines(["diff", "--name-only", `${mergeBase}...HEAD`])
      : []),
    ...gitLines(["diff", "--name-only"]),
    ...gitLines(["diff", "--name-only", "--cached"]),
    ...gitLines(["ls-files", "--others", "--exclude-standard"]),
  ]).filter(isSemanticReviewCandidate);
}

function isSemanticSource(path: string) {
  return (
    path.startsWith("skills_src/zotero-bridge-cli/semantic/") ||
    path.startsWith("skills_src/zotero-library-agent/semantic/") ||
    path.startsWith("skills_src/host-bridge-shared/") ||
    path.startsWith("profiles_src/hermes/zotero-librarian/")
  );
}

function isProfileReleaseMetadata(path: string) {
  return path === "profiles_src/hermes/zotero-librarian/profile-version.json";
}

function isBundleReleaseMetadata(path: string) {
  return path === "skills_src/zotero-library-agent/bundle-version.json";
}

function isGeneratedTarget(path: string) {
  return (
    path === "doc/host-bridge-cli.md" ||
    path === "cli/zotero-bridge/agent-surface.json" ||
    path === "host-bridge/release-set.json" ||
    path.startsWith("skills_builtin/zotero-bridge-cli/") ||
    path.startsWith("skills_builtin/zotero-library-agent/") ||
    path.startsWith("profiles/hermes/zotero-librarian/") ||
    path ===
      "skills_src/topic-synthesis/templates/fragments/zotero-bridge-cli.md.j2" ||
    path.startsWith("skills_builtin/create-topic-synthesis-prepare/") ||
    path.startsWith("skills_builtin/update-topic-synthesis-prepare/") ||
    path.startsWith("skills_builtin/topic-synthesis-core-enrichment/") ||
    path.startsWith("skills_builtin/topic-synthesis-finalize/")
  );
}

function isAgentControlContract(path: string) {
  return (
    path === "cli/zotero-bridge/src/surface.rs" ||
    path === "cli/zotero-bridge/src/error.rs" ||
    path === "scripts/host-bridge-agent-surface.ts" ||
    path === "schemas/host-bridge.agent-surface.v1.schema.json" ||
    path === "src/modules/hostBridgeWorkflowAgentRunStore.ts"
  );
}

function isReleaseContract(path: string) {
  return (
    path === "scripts/host-bridge-release-set.ts" ||
    path === "scripts/host-bridge-release-plan.ts" ||
    path === "scripts/render-host-bridge-release-set.ts" ||
    path === "scripts/materialize-host-bridge-release.ts" ||
    path === "scripts/prepare-host-bridge-release.ts" ||
    path === "schemas/host-bridge.release-set.v1.schema.json" ||
    path === "schemas/host-bridge.release-receipt.v1.schema.json" ||
    path === ".github/workflows/release-host-bridge.yml"
  );
}

function isHostBridgeOpenSpec(path: string) {
  return (
    path.startsWith("openspec/specs/host-bridge") ||
    path.includes("/specs/host-bridge") ||
    path.startsWith("openspec/specs/workflow-execution-runtime/") ||
    path.startsWith("openspec/specs/workflow-execution-seams/") ||
    path.startsWith("openspec/specs/workflow-runtime/") ||
    path.startsWith("openspec/specs/host-bridge-release-pipeline/") ||
    path.includes("/specs/zotero-library-agent-bundle/") ||
    path.startsWith("openspec/specs/zotero-librarian-profile/") ||
    path.startsWith("openspec/specs/zotero-librarian-profile-distribution/") ||
    path.includes("/specs/zotero-librarian-profile/") ||
    path.includes("/specs/zotero-librarian-profile-distribution/")
  );
}

function isWorkflowCatalog(path: string) {
  return (
    path === "workflows_builtin/manifest.json" ||
    (path.startsWith("workflows_builtin/") &&
      (path.endsWith("/workflow.json") ||
        path.endsWith("/workflow-package.json")))
  );
}

function isSpecLayer(path: string) {
  return (
    path === "src/modules/hostBridgeCapabilityRegistry.ts" ||
    path === "src/modules/hostBridgeServer.ts" ||
    path === "src/modules/hostBridgeProtocol.ts" ||
    path === "src/modules/hostBridgeWorkflowControl.ts" ||
    path === "src/modules/hostBridgeWorkflowAgentRun.ts" ||
    path === "src/modules/hostBridgePermissionManager.ts" ||
    path === "src/modules/hostBridgeFileRegistry.ts" ||
    path === "src/modules/hostBridgeWriteAutoApprovalRegistry.ts" ||
    path === "src/modules/workflowExecute.ts" ||
    path === "src/modules/workflowExecuteMessage.ts" ||
    path.startsWith("src/modules/workflowExecution/") ||
    path === "cli/zotero-bridge/src/args.rs" ||
    path === "cli/zotero-bridge/src/commands.rs" ||
    path === "scripts/host-bridge-surface-catalog.ts" ||
    isAgentControlContract(path) ||
    isReleaseContract(path) ||
    isWorkflowCatalog(path) ||
    isHostBridgeOpenSpec(path)
  );
}

function isSemanticReviewCandidate(path: string) {
  return (
    isSemanticSource(path) ||
    isProfileReleaseMetadata(path) ||
    isBundleReleaseMetadata(path) ||
    isGeneratedTarget(path) ||
    isSpecLayer(path) ||
    path.startsWith("schemas/host-bridge.") ||
    path.startsWith(".agents/skills/host-bridge-") ||
    path.startsWith("scripts/host-bridge-") ||
    path.startsWith("scripts/render-host-bridge-") ||
    path.startsWith("scripts/render-zotero-library-agent-") ||
    path.startsWith("scripts/render-zotero-librarian-") ||
    path === ".github/workflows/release-host-bridge.yml" ||
    path === "package.json"
  );
}

function focusFor(
  specLayerChanges: string[],
  semanticSourceChanges: string[],
  profileReleaseMetadataChanges: string[],
  bundleReleaseMetadataChanges: string[],
  generatedTargetChanges: string[],
) {
  const focus: string[] = [];
  if (specLayerChanges.length) {
    focus.push(
      "Review Host Bridge wrapper semantic source against changed capability, CLI, workflow, endpoint, or OpenSpec contracts.",
    );
    focus.push(
      "Review Zotero Librarian profile semantic source for workflow lifecycle, handle model, approval, and operating-principle changes.",
    );
  }
  if (semanticSourceChanges.length) {
    focus.push(
      "Review edited semantic sources for current-state wording and alignment with the generated Host Bridge surface.",
    );
  }
  if (profileReleaseMetadataChanges.length) {
    focus.push(
      "Review Zotero Librarian profile version governance; semantic-source review is not required for version metadata alone.",
    );
  }
  if (bundleReleaseMetadataChanges.length) {
    focus.push(
      "Review Zotero Library Agent bundle version governance; semantic-source review is not required for version metadata alone.",
    );
  }
  if (
    generatedTargetChanges.length &&
    !specLayerChanges.length &&
    !semanticSourceChanges.length
  ) {
    focus.push(
      "Generated targets changed without spec or semantic source changes; verify render or publish drift before release.",
    );
  }
  if (!focus.length) {
    focus.push(
      "No Host Bridge semantic review focus detected from changed files.",
    );
  }
  return focus;
}

export function classifyChangedFiles(
  changedFiles: string[],
): HostBridgeSemanticReviewContext {
  const normalized = sortedUnique(changedFiles);
  const specLayerChanges: string[] = [];
  const semanticSourceChanges: string[] = [];
  const profileReleaseMetadataChanges: string[] = [];
  const bundleReleaseMetadataChanges: string[] = [];
  const generatedTargetChanges: string[] = [];
  const unclassifiedChanges: string[] = [];

  for (const path of normalized) {
    if (isProfileReleaseMetadata(path)) {
      profileReleaseMetadataChanges.push(path);
    } else if (isBundleReleaseMetadata(path)) {
      bundleReleaseMetadataChanges.push(path);
    } else if (isSemanticSource(path)) {
      semanticSourceChanges.push(path);
    } else if (isGeneratedTarget(path)) {
      generatedTargetChanges.push(path);
    } else if (isSpecLayer(path)) {
      specLayerChanges.push(path);
    } else {
      unclassifiedChanges.push(path);
    }
  }

  return {
    schema: "host-bridge.semantic-review-context.v1",
    changedFiles: normalized,
    specLayerChanges,
    semanticSourceChanges,
    profileReleaseMetadataChanges,
    bundleReleaseMetadataChanges,
    generatedTargetChanges,
    unclassifiedChanges,
    reviewRequired:
      specLayerChanges.length > 0 || semanticSourceChanges.length > 0,
    recommendedFocus: focusFor(
      specLayerChanges,
      semanticSourceChanges,
      profileReleaseMetadataChanges,
      bundleReleaseMetadataChanges,
      generatedTargetChanges,
    ),
  };
}

function isMainModule() {
  return process.argv[1]
    ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
    : false;
}

if (isMainModule()) {
  const context = classifyChangedFiles(collectChangedFiles());
  process.stdout.write(`${JSON.stringify(context, null, 2)}\n`);
}
