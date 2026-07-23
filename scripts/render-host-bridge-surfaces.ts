import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildHostBridgeAgentSurfaceDescriptor,
  serializeHostBridgeAgentSurface,
} from "./host-bridge-agent-surface";
import { buildHostBridgeSurfaceCatalog } from "./host-bridge-surface-catalog";
import {
  inspectHostBridgeSurfaceVersion,
  loadHostBridgeSurfaceDefinitions,
  resolveHostBridgeSurface,
  type HostBridgeSurfaceDefinition,
  type HostBridgeSurfaceSkillDefinition,
} from "./host-bridge-surface-model";
import {
  loadBuiltinWorkflowCatalog,
  renderBuiltinWorkflowCatalog,
} from "./host-bridge-workflow-catalog";

type ContentMap = Map<string, string>;
type RenderMode = "content" | "release";

function read(root: string, path: string) {
  return readFileSync(join(root, path), "utf8");
}

function listFiles(root: string, path: string): string[] {
  const absolute = join(root, path);
  if (!existsSync(absolute)) return [];
  if (statSync(absolute).isFile()) return [path];
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) =>
    listFiles(root, join(path, entry.name)),
  );
}

function copyTree(
  result: ContentMap,
  root: string,
  source: string,
  target = "",
  filter: (path: string) => boolean = () => true,
) {
  for (const file of listFiles(root, source)) {
    const local = relative(source, file).replace(/\\/g, "/");
    if (filter(local)) result.set(join(target, local), read(root, file));
  }
}

function merge(target: ContentMap, source: ContentMap, prefix = "") {
  for (const [path, content] of source) target.set(join(prefix, path), content);
}

function replaceVersion(source: string, version: string) {
  return source.replaceAll("__HOST_BRIDGE_SURFACE_VERSION__", version);
}

function frontmatterField(source: string, field: string) {
  const match = new RegExp(`^${field}:\\s*(.+?)\\s*$`, "m").exec(source);
  return match?.[1]?.replace(/^['"]|['"]$/g, "") || "";
}

export const COMMAND_REFERENCE_PARTITIONS = [
  {
    path: "references/commands/connection-and-context.md",
    title: "Connection and context",
    roots: ["surface", "bridge", "context"],
    catalogTitle:
      "Connect, inspect the current selection, or discover capabilities",
    taskSummary:
      "Use this family to establish the live Zotero connection, inspect what the user is referring to in the UI, and discover the current command contract.",
    cues: [
      "this item, these papers, the current collection, or what is selected",
      "can Zotero do this, which command exists, or what input does it need",
      "connection, profile, endpoint, authentication, or bridge availability",
    ],
  },
  {
    path: "references/commands/library.md",
    title: "Library",
    roots: ["library"],
    catalogTitle: "Find, inspect, page through, or export library content",
    taskSummary:
      "Use this family for current Zotero items, collections, notes, attachments, readiness, snapshots, and bounded exports.",
    cues: [
      "what is in my library, collection, or current research set",
      "find papers about a topic, inspect one item, or list its children",
      "read notes, attachments, annotations, readiness, or a paged snapshot",
    ],
  },
  {
    path: "references/commands/mutation.md",
    title: "Mutation",
    roots: ["mutation"],
    catalogTitle: "Preview and apply an explicit Zotero data change",
    taskSummary:
      "Use this family only after the target identity and desired state are concrete and the current request authorizes a reviewed mutation.",
    cues: [
      "change metadata, tags, collections, notes, links, or attachments",
      "preview a write, apply an approved payload, or inspect mutation status",
      "merge, delete, relink, or overwrite a known Zotero object",
    ],
  },
  {
    path: "references/commands/files-products-and-operations.md",
    title: "Files, Products, and operations",
    roots: ["file", "product", "operation"],
    catalogTitle: "Move bytes, inspect Products, or follow durable operations",
    taskSummary:
      "Use this family when a Zotero object or workflow result names a file, Product, asset, or long-running operation that must be transferred or verified.",
    cues: [
      "upload or download a file without confusing a path and file handle",
      "inspect a Product or retrieve one of its declared assets",
      "resume or verify an operation using its durable receipt",
    ],
  },
  {
    path: "references/commands/workflow.md",
    title: "Workflow",
    roots: ["workflow"],
    catalogTitle: "Discover, validate, submit, or apply a workflow",
    taskSummary:
      "Use this family to inspect the live workflow contract, validate selection and provider inputs, submit supported execution, or apply agent-owned results.",
    cues: [
      "use an installed workflow for analysis, acquisition, synthesis, or curation",
      "check workflow options, provider profile, selection, or readiness",
      "submit, inspect artifacts, or apply an agent-owned result",
    ],
  },
  {
    path: "references/commands/run.md",
    title: "Run",
    roots: ["run"],
    catalogTitle: "Monitor, interact with, or cancel a workflow run",
    taskSummary:
      "Use this family after a workflow has returned a typed run handle and the task needs current status, prompts, notifications, results, or cancellation.",
    cues: [
      "what is this workflow doing, did it finish, or what does it need",
      "answer a run prompt, acknowledge a notification, or cancel a run",
      "inspect terminal result evidence without treating termination as output proof",
    ],
  },
  {
    path: "references/commands/synthesis.md",
    title: "Synthesis",
    roots: ["synthesis"],
    catalogTitle:
      "Inspect or maintain Synthesis topics, indexes, graphs, and artifacts",
    taskSummary:
      "Use this family for the plugin's derived research structures, including topic context, sidecar indexes, citation graphs, resolver state, attention queues, and exports.",
    cues: [
      "topic context, synthesis report, graph relation, metric, or evidence gap",
      "index status, resolver candidates, freshness, or maintenance receipts",
      "export or inspect a synthesis artifact without confusing it with live library truth",
    ],
  },
  {
    path: "references/commands/diagnostics.md",
    title: "Diagnostics",
    roots: ["debug", "call"],
    catalogTitle: "Diagnose the bridge or make an advanced raw call",
    taskSummary:
      "Use this family only when the semantic command surface cannot diagnose the problem or an exact low-level capability call is explicitly required.",
    cues: [
      "collect a bounded diagnostic report for an unavailable or inconsistent surface",
      "inspect raw capability behavior while preserving the normal authority boundary",
      "avoid using diagnostics as a shortcut around semantic validation",
    ],
  },
] as const;

const COMMAND_REFERENCE_MARKER =
  "<!-- host-bridge-command-reference:entries -->";
const COMMAND_CATALOG_MARKER = "<!-- host-bridge-command-catalog:entries -->";
const COMMAND_CATALOG_PATH = "references/command-catalog.md";

function renderCommandCards(
  template: string,
  commands: ReturnType<
    typeof buildHostBridgeAgentSurfaceDescriptor
  >["commands"],
) {
  const entries = commands.flatMap((command) => [
    `## \`zotero-bridge ${command.command}\``,
    "",
    command.summary,
    "",
    `- Argv: \`${JSON.stringify(command.argv)}\`.`,
    `- Argv bindings: \`${JSON.stringify(command.argvBindings)}\`.`,
    `- Invocation schema: \`${JSON.stringify(command.invocationSchema)}\`.`,
    `- Payload schema: \`${JSON.stringify(command.payloadSchema)}\`.`,
    `- Result schema: \`${JSON.stringify(command.resultSchema)}\`.`,
    `- Pagination: \`${command.pagination}\`.`,
    `- Category: \`${command.category}\`; danger: \`${command.danger}\`.`,
    `- Effects: \`${JSON.stringify(command.effects)}\`.`,
    `- Approval: \`${JSON.stringify(command.approvalContract)}\`.`,
    `- Handle transitions: \`${JSON.stringify(command.handleTransitions)}\`.`,
    `- Recovery: \`${JSON.stringify(command.recovery)}\`.`,
    `- Targets: \`${JSON.stringify(command.targets)}\`.`,
    `- Aliases: ${command.operationalAliases.map((alias) => `\`${alias}\``).join(", ") || "none"}.`,
    `- Intent search: \`${command.hiddenFromIntentSearch ? "hidden" : "visible"}\`.`,
    "",
  ]);
  if (template.split(COMMAND_REFERENCE_MARKER).length !== 2) {
    throw new Error(
      "Command reference template must contain exactly one entry marker",
    );
  }
  return template.replace(COMMAND_REFERENCE_MARKER, entries.join("\n"));
}

function partitionCommands(
  descriptor: ReturnType<typeof buildHostBridgeAgentSurfaceDescriptor>,
) {
  const ownerByRoot = new Map<
    string,
    (typeof COMMAND_REFERENCE_PARTITIONS)[number]
  >();
  for (const partition of COMMAND_REFERENCE_PARTITIONS) {
    for (const root of partition.roots) {
      const previous = ownerByRoot.get(root);
      if (previous) {
        throw new Error(
          `Command root ${root} belongs to both ${previous.path} and ${partition.path}`,
        );
      }
      ownerByRoot.set(root, partition);
    }
  }

  const commandsByPath = new Map<
    string,
    ReturnType<typeof buildHostBridgeAgentSurfaceDescriptor>["commands"]
  >();
  const seenCommands = new Set<string>();
  for (const command of descriptor.commands) {
    const root = command.command.trim().split(/\s+/)[0] || "";
    const partition = ownerByRoot.get(root);
    if (!partition) {
      throw new Error(
        `No command reference partition owns ${command.command} (root ${root || "<empty>"})`,
      );
    }
    if (seenCommands.has(command.command)) {
      throw new Error(`Duplicate canonical command ${command.command}`);
    }
    seenCommands.add(command.command);
    const commands = commandsByPath.get(partition.path) || [];
    commands.push(command);
    commandsByPath.set(partition.path, commands);
  }

  if (seenCommands.size !== descriptor.commands.length) {
    throw new Error(
      `Command reference coverage mismatch: ${seenCommands.size}/${descriptor.commands.length}`,
    );
  }
  return commandsByPath;
}

function renderCommandReferences(
  content: ContentMap,
  commandsByPath: ReturnType<typeof partitionCommands>,
) {
  for (const partition of COMMAND_REFERENCE_PARTITIONS) {
    const template = content.get(partition.path);
    if (!template) {
      throw new Error(
        `Missing ${partition.title} command reference template: ${partition.path}`,
      );
    }
    const commands = commandsByPath.get(partition.path) || [];
    if (commands.length === 0) {
      throw new Error(
        `Command reference partition ${partition.path} contains no commands`,
      );
    }
    content.set(partition.path, renderCommandCards(template, commands));
  }
}

function renderCommandCatalog(
  template: string,
  commandsByPath: ReturnType<typeof partitionCommands>,
) {
  if (template.split(COMMAND_CATALOG_MARKER).length !== 2) {
    throw new Error(
      "Command catalog template must contain exactly one entry marker",
    );
  }
  const sections = COMMAND_REFERENCE_PARTITIONS.flatMap((partition) => {
    const commands = commandsByPath.get(partition.path) || [];
    const detailPath = partition.path.replace(/^references\//, "");
    return [
      `## ${partition.catalogTitle}`,
      "",
      partition.taskSummary,
      "",
      "Natural-language cues:",
      "",
      ...partition.cues.map((cue) => `- ${cue}.`),
      "",
      `Read [the ${partition.title.toLocaleLowerCase()} command reference](${detailPath}) after selecting a candidate command. It contains the exact argv, schemas, effects, approval, handles, and recovery contract.`,
      "",
      "| Canonical command | Purpose |",
      "| --- | --- |",
      ...commands.map(
        (command) =>
          `| \`zotero-bridge ${command.command}\` | ${command.summary.replaceAll("|", "\\|")} |`,
      ),
      "",
      "Selection check:",
      "",
      "- Match the user's requested outcome, object type, freshness, and state-change boundary to this family.",
      "- If several commands remain plausible, use `zotero-bridge surface search --intent <plain-language intent>` to narrow the candidates.",
      "- Confirm the selected command with `zotero-bridge surface describe '<canonical command>' --json` before constructing the invocation.",
      "- Read the linked detailed reference before execution; the compact index is not an argv or approval contract.",
      "",
    ];
  });
  return template.replace(COMMAND_CATALOG_MARKER, sections.join("\n"));
}

function coreSkillContent(args: {
  root: string;
  surface: HostBridgeSurfaceDefinition;
  skill: HostBridgeSurfaceSkillDefinition;
  version: string;
}) {
  const content: ContentMap = new Map();
  const sourceRoot = args.surface.sourceRoot;
  copyTree(
    content,
    args.root,
    join(sourceRoot, args.skill.source),
    "",
    (path) => path === "SKILL.md" || path.startsWith("references/"),
  );
  const descriptor = buildHostBridgeAgentSurfaceDescriptor(
    buildHostBridgeSurfaceCatalog(args.root),
    args.root,
  );
  const commandsByPath = partitionCommands(descriptor);
  renderCommandReferences(content, commandsByPath);
  const commandCatalogTemplate = content.get(COMMAND_CATALOG_PATH);
  if (!commandCatalogTemplate) {
    throw new Error(
      `Missing minimum-core command catalog template: ${COMMAND_CATALOG_PATH}`,
    );
  }
  content.set(
    COMMAND_CATALOG_PATH,
    renderCommandCatalog(commandCatalogTemplate, commandsByPath),
  );
  content.set(
    "assets/runner.json",
    replaceVersion(
      read(args.root, join(sourceRoot, "runner.json")),
      args.version,
    ),
  );
  content.set(
    "assets/output.schema.json",
    read(args.root, join(sourceRoot, "output.schema.json")),
  );
  content.set(
    "assets/profile.template.json",
    read(args.root, join(sourceRoot, "profile.template.json")),
  );
  content.set(
    "assets/agent-surface.json",
    serializeHostBridgeAgentSurface(descriptor),
  );
  return content;
}

function genericSkillContent(args: {
  root: string;
  surface: HostBridgeSurfaceDefinition;
  skill: HostBridgeSurfaceSkillDefinition;
  version: string;
}) {
  const content: ContentMap = new Map();
  const sourceRoot = args.surface.sourceRoot;
  const source = join(sourceRoot, args.skill.source);
  copyTree(
    content,
    args.root,
    source,
    "",
    (path) =>
      path === "SKILL.md" ||
      path.startsWith("references/") ||
      path.startsWith("agents/"),
  );
  if (args.skill.id === "zotero-library-agent") {
    const catalogPath = "references/workflow-catalog.md";
    const catalogTemplate = content.get(catalogPath);
    if (!catalogTemplate) {
      throw new Error(
        `Missing built-in workflow catalog template: ${catalogPath}`,
      );
    }
    content.set(
      catalogPath,
      renderBuiltinWorkflowCatalog(
        catalogTemplate,
        loadBuiltinWorkflowCatalog(args.root),
      ),
    );
  }
  const skillText = content.get("SKILL.md");
  if (!skillText) throw new Error(`Missing Skill source: ${source}/SKILL.md`);
  const runnerPath = join(source, "runner.json");
  const runner = existsSync(join(args.root, runnerPath))
    ? read(args.root, runnerPath)
    : read(args.root, join(sourceRoot, "shared/task-runner.template.json"))
        .replaceAll("__SKILL_ID__", args.skill.id)
        .replaceAll("__SKILL_NAME__", frontmatterField(skillText, "name"))
        .replaceAll(
          "__DESCRIPTION__",
          frontmatterField(skillText, "description"),
        );
  const parsed = JSON.parse(runner) as Record<string, unknown>;
  parsed.version = args.version;
  delete parsed.schema;
  content.set("assets/runner.json", `${JSON.stringify(parsed, null, 2)}\n`);
  content.set(
    "assets/output.schema.json",
    read(args.root, join(sourceRoot, "shared/output.schema.json")),
  );
  return content;
}

function hostedSkillContent(args: {
  root: string;
  surface: HostBridgeSurfaceDefinition;
  skill: HostBridgeSurfaceSkillDefinition;
}) {
  const content: ContentMap = new Map();
  copyTree(
    content,
    args.root,
    join(args.surface.sourceRoot, args.skill.source),
    "",
    (path) => path === "SKILL.md" || path.startsWith("references/"),
  );
  if (!content.has("SKILL.md")) {
    throw new Error(
      `Missing hosted Skill source: ${args.surface.sourceRoot}/${args.skill.source}/SKILL.md`,
    );
  }
  return content;
}

function profileDistribution(version: string) {
  return [
    "schema: hermes.profile.distribution.v1",
    "name: zotero-librarian",
    "title: Zotero Librarian",
    `version: ${version}`,
    "summary: Hermes profile for maintaining a Zotero literature library through zotero-bridge.",
    "entrypoint: SOUL.md",
    "repository: https://github.com/leike0813/zotero-librarian-profile",
    "sourceRepository: https://github.com/leike0813/zotero-agents",
    "state:",
    '  defaultDir: "$HERMES_HOME/zotero-librarian"',
    "  overrideEnv: ZOTERO_LIBRARIAN_STATE_DIR",
    "assets:",
    "  zoteroBridgeBinaries: assets/zotero-bridge/bin",
    "skills:",
    "  - skills/zotero-librarian",
    "cron:",
    "  - cron/index-refresh.yaml",
    "  - cron/workflow-catalog-refresh.yaml",
    "  - cron/run-monitor.yaml",
    "  - cron/notification-sync.yaml",
    "  - cron/workflow-status-triage.yaml",
    "  - cron/library-hygiene.yaml",
    "  - cron/attention-queue.yaml",
    "",
  ].join("\n");
}

function profileContent(args: {
  root: string;
  surface: HostBridgeSurfaceDefinition;
  version: string;
  ownSkill: ContentMap;
  inheritedSkills: Array<{ mount: string; content: ContentMap }>;
}) {
  const content: ContentMap = new Map();
  copyTree(
    content,
    args.root,
    args.surface.sourceRoot,
    "",
    (path) => !path.startsWith("skills/") && path !== "profile-version.json",
  );
  content.set("distribution.yaml", profileDistribution(args.version));
  content.set(
    ".gitignore",
    ["state.sqlite", "*.sqlite", "runs/", "logs/", ".zotero-bridge/", ""].join(
      "\n",
    ),
  );
  merge(content, args.ownSkill, "skills/zotero-librarian");
  for (const inherited of args.inheritedSkills) {
    merge(content, inherited.content, inherited.mount);
  }
  return content;
}

function applyContent(args: {
  root: string;
  outputRoot: string;
  targetRoot: string;
  content: ContentMap;
  check: boolean;
  prune?: boolean;
}) {
  const changes: string[] = [];
  for (const [path, value] of args.content) {
    const target = join(args.targetRoot, path);
    const absolute = join(args.outputRoot, target);
    const current = existsSync(absolute) ? readFileSync(absolute, "utf8") : "";
    if (current === value) continue;
    changes.push(target);
    if (!args.check) {
      mkdirSync(dirname(absolute), { recursive: true });
      writeFileSync(absolute, value, "utf8");
    }
  }
  if (args.prune) {
    for (const existing of listFiles(args.outputRoot, args.targetRoot)) {
      const local = relative(args.targetRoot, existing);
      if (args.content.has(local)) continue;
      changes.push(existing);
      if (!args.check) rmSync(join(args.outputRoot, existing));
    }
    if (!args.check)
      removeEmptyDirectories(join(args.outputRoot, args.targetRoot));
  }
  return changes;
}

function removeEmptyDirectories(path: string) {
  if (!existsSync(path) || statSync(path).isFile()) return;
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (entry.isDirectory()) removeEmptyDirectories(join(path, entry.name));
  }
  if (readdirSync(path).length === 0) rmSync(path, { recursive: true });
}

export function renderHostBridgeSurfaces(
  args: {
    root?: string;
    outputRoot?: string;
    check?: boolean;
    mode?: RenderMode;
  } = {},
) {
  const root = args.root || process.cwd();
  const outputRoot = args.outputRoot || root;
  const check = args.check === true;
  const definitions = loadHostBridgeSurfaceDefinitions(
    join(root, "host-bridge/surfaces.json"),
  );
  const minimum = resolveHostBridgeSurface(
    definitions,
    "zotero-bridge-cli",
  ).surface;
  const generic = resolveHostBridgeSurface(
    definitions,
    "zotero-library-agent",
  ).surface;
  const hermes = resolveHostBridgeSurface(
    definitions,
    "zotero-librarian",
  ).surface;
  const minimumVersion = inspectHostBridgeSurfaceVersion({
    definitionsPath: join(root, "host-bridge/surfaces.json"),
    surfaceId: minimum.id,
  }).version;
  const genericVersion = inspectHostBridgeSurfaceVersion({
    definitionsPath: join(root, "host-bridge/surfaces.json"),
    surfaceId: generic.id,
  }).version;
  const hermesVersion = inspectHostBridgeSurfaceVersion({
    definitionsPath: join(root, "host-bridge/surfaces.json"),
    surfaceId: hermes.id,
  }).version;

  const core = coreSkillContent({
    root,
    surface: minimum,
    skill: minimum.skills[0],
    version: minimumVersion,
  });
  const genericSkills = generic.skills.map((skill) => ({
    skill,
    content: genericSkillContent({
      root,
      surface: generic,
      skill,
      version: genericVersion,
    }),
  }));
  const ownLibrarian = hostedSkillContent({
    root,
    surface: hermes,
    skill: hermes.skills[0],
  });
  const changes = [
    ...applyContent({
      root,
      outputRoot,
      targetRoot: "",
      content: new Map([
        [
          "cli/zotero-bridge/src/agent-surface.json",
          core.get("assets/agent-surface.json") || "",
        ],
      ]),
      check,
    }),
    ...applyContent({
      root,
      outputRoot,
      targetRoot: minimum.generatedRoot,
      content: core,
      check,
      prune: true,
    }),
    ...genericSkills.flatMap(({ skill, content }) =>
      applyContent({
        root,
        outputRoot,
        targetRoot: join(generic.generatedRoot, skill.id),
        content,
        check,
        prune: true,
      }),
    ),
    ...applyContent({
      root,
      outputRoot,
      targetRoot: hermes.generatedRoot,
      content: profileContent({
        root,
        surface: hermes,
        version: hermesVersion,
        ownSkill: ownLibrarian,
        inheritedSkills: [
          { mount: minimum.skills[0].mount, content: core },
          ...genericSkills.map(({ skill, content }) => ({
            mount: skill.mount,
            content,
          })),
        ],
      }),
      check,
      prune: true,
    }),
  ];
  if (check && changes.length) {
    throw new Error(
      `Host Bridge generated surfaces are stale:\n${changes.map((path) => `- ${path}`).join("\n")}`,
    );
  }
  return { schema: "host-bridge.surface-render.v1", changes };
}

function isMainModule() {
  return process.argv[1]
    ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
    : false;
}

if (isMainModule()) {
  const outputIndex = process.argv.indexOf("--output-root");
  const result = renderHostBridgeSurfaces({
    outputRoot:
      outputIndex >= 0 ? process.argv[outputIndex + 1] : process.cwd(),
    check: process.argv.includes("--check"),
    mode: process.argv.includes("--content-only") ? "content" : "release",
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
