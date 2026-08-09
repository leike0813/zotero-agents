import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadHostBridgeCommandContracts } from "./host-bridge-command-contracts";

type ConsumerFile = {
  path: string;
  content: string;
};

const TOPIC_SKILLS = [
  "skills_builtin/create-topic-synthesis-prepare/SKILL.md",
  "skills_builtin/update-topic-synthesis-prepare/SKILL.md",
  "skills_builtin/topic-synthesis-core-enrichment/SKILL.md",
  "skills_builtin/topic-synthesis-finalize/SKILL.md",
] as const;

const CONSUMER_FILES = [
  "skills_builtin/debug-host-bridge-connectivity-probe/SKILL.md",
  "skills_builtin/tag-bootstrapper/SKILL.md",
  "skills_builtin/manuscript-literature-framing/SKILL.md",
  "skills_builtin/manuscript-literature-framing/assets/runner.json",
  "skills_builtin/manuscript-literature-framing/scripts/gate_runtime.py",
  "skills_builtin/literature-search-ingest/SKILL.md",
  "skills_builtin/literature-search-ingest/references/ingest-output-recovery.md",
  "skills_src/topic-synthesis/templates/fragments/zotero-bridge-cli.md.j2",
  "src/modules/hostBridgeCliInjection.ts",
  ...TOPIC_SKILLS,
] as const;

const HOST_BRIDGE_RUNTIME_TESTS = [
  "test/core/133-topic-synthesis-runtime-contract.test.ts",
  "test/core/155-topic-synthesis-split-runtime.test.ts",
  "test/core/157-literature-deep-reading-bootstrap.test.ts",
  "test/core/172-export-research-bundle-skill-runtime.test.ts",
  "test/core/173-collection-collector-skill-runtime.test.ts",
] as const;

const FORBIDDEN_FAKE_CLI_MARKERS = [
  "fake-zotero-bridge",
  'path.join(runRoot, ".zotero-bridge"',
  "process.argv.slice(2)",
  'data: { approval: "none", capability:',
] as const;

const MANUSCRIPT_COMMANDS = [
  "synthesis topic list",
  "synthesis topic get-review-input",
  "synthesis index reference get",
  "synthesis graph get-metrics",
  "synthesis graph get-slice",
  "synthesis artifact resolve-topic-digest",
  "library items list",
  "library item search",
  "library item get",
  "library item notes",
  "library note payloads",
  "library note payload",
  "library item attachments",
  "file download",
] as const;

const FORBIDDEN_MANUSCRIPT_IDENTIFIERS = [
  "topics.list",
  "topics.get_review_input",
  "reference_index.get",
  "citation_graph.get_metrics",
  "citation_graph.get_slice",
  "paper_artifacts.resolve_topic_digest",
  "list_library_items",
  "search_items",
  "get_item_detail",
  "get_item_notes",
  "list_note_payloads",
  "get_note_payload",
  "get_item_attachments",
  "prepare_paper_reading_context",
] as const;

function loadFiles(root: string, paths: readonly string[]): ConsumerFile[] {
  return paths.map((path) => ({
    path,
    content: readFileSync(resolve(root, path), "utf8"),
  }));
}

function requireMarkers(
  violations: string[],
  file: ConsumerFile,
  markers: readonly string[],
) {
  for (const marker of markers) {
    if (!file.content.includes(marker)) {
      violations.push(`${file.path}: missing semantic marker ${marker}`);
    }
  }
}

function markedTopicFragment(content: string) {
  const match = content.match(
    /<!-- host-bridge-surface:topic-synthesis-fragment:start -->([\s\S]*?)<!-- host-bridge-surface:topic-synthesis-fragment:end -->/,
  );
  return match?.[1]?.trim() || "";
}

export function findHostBridgeConsumerGuidanceViolations(root = process.cwd()) {
  const violations: string[] = [];
  const files = loadFiles(root, CONSUMER_FILES);
  const byPath = new Map(files.map((file) => [file.path, file]));

  for (const file of files) {
    if (file.content.includes("references/host-bridge-cli.md")) {
      violations.push(`${file.path}: points to removed wrapper reference`);
    }
  }

  for (const test of loadFiles(root, HOST_BRIDGE_RUNTIME_TESTS)) {
    if (!test.content.includes("startHostBridgeCliFixtureHarness")) {
      violations.push(
        `${test.path}: Host Bridge runtime test does not use the shared real-CLI harness`,
      );
    }
    for (const marker of FORBIDDEN_FAKE_CLI_MARKERS) {
      if (test.content.includes(marker)) {
        violations.push(
          `${test.path}: contains forbidden handwritten CLI surface marker ${marker}`,
        );
      }
    }
  }

  const debug = byPath.get(
    "skills_builtin/debug-host-bridge-connectivity-probe/SKILL.md",
  )!;
  requireMarkers(violations, debug, [
    "surface identity",
    "bridge status",
    "bridge manifest",
    "call diagnostic.get_status --input '{}'",
    "host-bridge.v2",
    "payload_composition",
  ]);
  if (
    debug.content.includes("host-bridge.v1") ||
    debug.content.includes("/bridge/v1")
  ) {
    violations.push(`${debug.path}: contains a Host Bridge v1 identity`);
  }

  const fragmentSource = byPath.get(
    "skills_src/topic-synthesis/templates/fragments/zotero-bridge-cli.md.j2",
  )!;
  const expectedFragment = markedTopicFragment(fragmentSource.content);
  if (!expectedFragment) {
    violations.push(`${fragmentSource.path}: missing governed topic fragment`);
  }
  for (const path of TOPIC_SKILLS) {
    const rendered = byPath.get(path)!;
    if (markedTopicFragment(rendered.content) !== expectedFragment) {
      violations.push(`${path}: rendered Host Bridge fragment is stale`);
    }
  }

  const tag = byPath.get("skills_builtin/tag-bootstrapper/SKILL.md")!;
  requireMarkers(violations, tag, [
    "references/command-catalog.md",
    '"limit":100',
    '"includeTags":true',
    '"includeCollections":true',
    "data.data.pagination.<section>",
    "nextCursor",
  ]);

  const manuscriptPaths = [
    "skills_builtin/manuscript-literature-framing/SKILL.md",
    "skills_builtin/manuscript-literature-framing/assets/runner.json",
    "skills_builtin/manuscript-literature-framing/scripts/gate_runtime.py",
  ];
  const manuscript = manuscriptPaths
    .map((path) => byPath.get(path)!.content)
    .join("\n");
  const commandContracts = loadHostBridgeCommandContracts(root).commands;
  for (const command of MANUSCRIPT_COMMANDS) {
    if (!commandContracts[command]) {
      violations.push(
        `host-bridge/contracts/cli-commands.v2.json: missing ${command}`,
      );
    }
    if (!manuscript.includes(command)) {
      violations.push(
        `manuscript-literature-framing: missing semantic command ${command}`,
      );
    }
  }
  for (const identifier of FORBIDDEN_MANUSCRIPT_IDENTIFIERS) {
    if (manuscript.includes(identifier)) {
      violations.push(
        `manuscript-literature-framing: uses non-CLI identifier ${identifier}`,
      );
    }
  }

  const ingest = [
    byPath.get("skills_builtin/literature-search-ingest/SKILL.md")!.content,
    byPath.get(
      "skills_builtin/literature-search-ingest/references/ingest-output-recovery.md",
    )!.content,
  ].join("\n");
  for (const marker of [
    "data.data.result.ingest",
    "meta.operationId",
    "permission_denied",
    "permission_timeout",
    "permission_ui_unavailable",
    "payload_composition",
    "operation get <operation-id>",
  ]) {
    if (!ingest.includes(marker)) {
      violations.push(`literature-search-ingest: missing ${marker}`);
    }
  }

  for (const file of files) {
    const rawCalls = Array.from(
      file.content.matchAll(
        /\bcall\s+([a-z][a-z0-9_-]*(?:\.[a-z0-9_-]+)+)\b/gi,
      ),
      (match) => match[1],
    );
    for (const capability of rawCalls) {
      if (
        file.path !==
          "skills_builtin/debug-host-bridge-connectivity-probe/SKILL.md" ||
        capability !== "diagnostic.get_status"
      ) {
        violations.push(
          `${file.path}: raw capability call is outside the approved diagnostic boundary`,
        );
      }
    }
  }

  return violations.sort((left, right) => left.localeCompare(right));
}

function isMainModule() {
  return (
    process.argv[1] &&
    resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  );
}

if (isMainModule()) {
  const violations = findHostBridgeConsumerGuidanceViolations();
  if (violations.length) {
    process.stderr.write(`${violations.join("\n")}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write("Host Bridge consumer guidance is aligned.\n");
  }
}
