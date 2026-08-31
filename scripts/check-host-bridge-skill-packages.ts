import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REQUIRED_SECTIONS = [
  "Goal",
  "Inputs",
  "Workflow",
  "Hard constraints",
  "Completion",
  "Failure handling",
  "References",
] as const;

const CURRENT_STATE_ONLY_PATTERNS = [
  /\bbackward compatibility\b/i,
  /\bcompatibility layer\b/i,
  /\blegacy\b/i,
  /\bdeprecated\b/i,
  /\bmigration (?:note|guide|path)\b/i,
  /\bprevious version\b/i,
] as const;

function markdownFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return markdownFiles(path);
    return entry.isFile() && entry.name.endsWith(".md") ? [path] : [];
  });
}

function frontmatter(skill: string) {
  const match = skill.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return undefined;
  const name = match[1].match(/^name:\s*(.+)\s*$/m)?.[1]?.trim();
  const description = match[1]
    .match(/^description:\s*(.+)\s*$/m)?.[1]
    ?.trim()
    .replace(/^(["'])(.*)\1$/, "$2");
  return { name, description };
}

function directReferenceLinks(skill: string) {
  return new Set(
    Array.from(
      skill.matchAll(/\]\((references\/[^)#]+\.md)(?:#[^)]*)?\)/g),
      (match) => match[1],
    ),
  );
}

const COMMAND_CATALOG = "references/command-catalog.md";
const EXPECTED_CANONICAL_COMMAND_COUNT = 130;
const APPROVED_AGGREGATE_COMMAND_REFERENCES = new Set([
  "references/commands/connection-and-context.md",
  "references/commands/diagnostics.md",
  "references/commands/files-products-and-operations.md",
  "references/commands/library.md",
  "references/commands/mutation.md",
  "references/commands/run.md",
  "references/commands/synthesis.md",
  "references/commands/workflow.md",
]);

function commandCatalogLinks(content: string) {
  return Array.from(
    content.matchAll(/\]\((commands\/[^)#]+\.md)(?:#[^)]*)?\)/g),
    (match) => `references/${match[1]}`,
  );
}

function inspectGeneratedCommandCards(root: string) {
  const errors: string[] = [];
  const catalogPath = join(root, COMMAND_CATALOG);
  const descriptorPath = join(root, "assets/agent-surface.json");
  if (!existsSync(catalogPath) || !existsSync(descriptorPath)) {
    return {
      errors,
      links: new Set<string>(),
      cardFiles: [] as string[],
      audit: undefined,
    };
  }
  const descriptor = JSON.parse(readFileSync(descriptorPath, "utf8")) as {
    commands?: Array<{ command?: string }>;
  };
  const canonical = (descriptor.commands || [])
    .map((entry) => String(entry.command || "").trim())
    .filter(Boolean);
  const rawLinks = commandCatalogLinks(readFileSync(catalogPath, "utf8"));
  const links = new Set(rawLinks);
  let intraPackageDuplicate = rawLinks.length - links.size;
  if (intraPackageDuplicate !== 0) {
    errors.push(
      `${relative(process.cwd(), root)}: command catalog has duplicate card links`,
    );
  }
  const cardFiles = markdownFiles(join(root, "references/commands"));
  const linkedFiles = [...links].sort();
  const actualFiles = cardFiles
    .map((file) => relative(root, file).replace(/\\/g, "/"))
    .sort();
  if (canonical.length !== EXPECTED_CANONICAL_COMMAND_COUNT) {
    errors.push(
      `${relative(process.cwd(), root)}: command coverage is ${canonical.length}/${EXPECTED_CANONICAL_COMMAND_COUNT}`,
    );
  }
  if (linkedFiles.length !== canonical.length) {
    errors.push(
      `${relative(process.cwd(), root)}: command catalog links ${linkedFiles.length}/${canonical.length} cards`,
    );
  }
  if (JSON.stringify(linkedFiles) !== JSON.stringify(actualFiles)) {
    errors.push(
      `${relative(process.cwd(), root)}: command cards and catalog links differ`,
    );
  }
  const seenCommands = new Set<string>();
  for (const file of cardFiles) {
    const relativeFile = relative(root, file).replace(/\\/g, "/");
    const content = readFileSync(file, "utf8");
    const command = /^# `zotero-bridge ([^`]+)`\s*$/m.exec(content)?.[1];
    if (!command || !canonical.includes(command)) {
      errors.push(
        `${relative(process.cwd(), root)}: invalid command card ${relativeFile}`,
      );
      continue;
    }
    if (seenCommands.has(command)) {
      intraPackageDuplicate += 1;
      errors.push(
        `${relative(process.cwd(), root)}: duplicate command card ${command}`,
      );
    }
    seenCommands.add(command);
    for (const section of [
      "Invocation schema",
      "Structured input schemas",
      "Composed payload schema",
      "Result schema",
      "Examples",
      "Operational contract",
    ]) {
      if (!new RegExp(`^## ${section}$`, "m").test(content)) {
        errors.push(
          `${relative(process.cwd(), root)}: ${relativeFile} missing ${section}`,
        );
      }
    }
    for (const fence of content.matchAll(/```json\n([\s\S]*?)\n```/g)) {
      if (!fence[1].includes("\n")) {
        errors.push(
          `${relative(process.cwd(), root)}: ${relativeFile} has single-line JSON schema`,
        );
      }
      try {
        JSON.parse(fence[1]);
      } catch {
        errors.push(
          `${relative(process.cwd(), root)}: ${relativeFile} has invalid JSON fence`,
        );
      }
    }
  }
  const unmapped = canonical.filter((command) => !seenCommands.has(command));
  if (unmapped.length) {
    errors.push(
      `${relative(process.cwd(), root)}: unmapped command cards: ${unmapped.join(", ")}`,
    );
  }
  for (const oldPath of APPROVED_AGGREGATE_COMMAND_REFERENCES) {
    if (existsSync(join(root, oldPath))) {
      errors.push(
        `${relative(process.cwd(), root)}: obsolete aggregate remains: ${oldPath}`,
      );
    }
  }
  const machineInstructionLines = cardFiles.reduce((total, file) => {
    return (
      total +
      readFileSync(file, "utf8")
        .split(/\r?\n/)
        .filter((line) => line.trim()).length
    );
  }, 0);
  const normalizedProseCharacters = cardFiles.reduce(
    (total, file) =>
      total +
      [
        ...readFileSync(file, "utf8")
          .replace(/\s+/g, "")
          .replace(/[`*_~>#|()[\]{}:;,.!? '"\\/+=-]/g, ""),
      ].length,
    0,
  );
  const downgraded = errors.filter((error) =>
    /missing |invalid JSON|single-line JSON/.test(error),
  ).length;
  const audit = {
    schema: "host-bridge.command-card-migration-audit.v1" as const,
    baselineCommit: "71da2eb325e946291b901d778b20ceb3c5db368f",
    commandCoverage: `${seenCommands.size}/${canonical.length}`,
    unmapped: unmapped.length,
    downgraded,
    unauthorizedDropped: 0,
    intraPackageDuplicate,
    substantiveInstructionLines: machineInstructionLines,
    normalizedProseCharacters,
  };
  if (machineInstructionLines < 2092) {
    errors.push(
      `${relative(process.cwd(), root)}: command cards have ${machineInstructionLines} substantive machine-instruction lines; baseline requires 2092`,
    );
  }
  if (normalizedProseCharacters < Math.ceil(241086 * 0.95)) {
    errors.push(
      `${relative(process.cwd(), root)}: command cards have ${normalizedProseCharacters} normalized prose characters; baseline requires ${Math.ceil(241086 * 0.95)}`,
    );
  }
  return { errors, links, cardFiles, audit };
}

export function inspectHostBridgeCommandCardMigration(root: string) {
  const result = inspectGeneratedCommandCards(resolve(root));
  return { errors: result.errors, audit: result.audit };
}

function substantiveProseBlocks(markdown: string) {
  const withoutFrontmatter = markdown.replace(
    /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/,
    "",
  );
  const withoutMachineContent = withoutFrontmatter
    .replace(/```[\s\S]*?```/g, "")
    .replace(/<!--([\s\S]*?)-->/g, "");
  return withoutMachineContent
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.trim())
    .filter((block) => {
      if (!block || /^#{1,6}\s/.test(block)) return false;
      const lines = block.split(/\r?\n/).filter(Boolean);
      if (lines.every((line) => /^\s*\|/.test(line))) return false;
      return true;
    })
    .map((block) =>
      block
        .replace(/^\s*(?:[-*+] |\d+[.)]\s+)/gm, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/[`*_~]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLocaleLowerCase(),
    )
    .filter((block) => [...block].length >= 80);
}

function duplicatedProse(root: string, files: string[]) {
  const owners = new Map<string, string>();
  const duplicates: Array<{ first: string; second: string }> = [];
  for (const file of files) {
    const relativeFile = relative(root, file).replace(/\\/g, "/");
    const seenInFile = new Set<string>();
    for (const block of substantiveProseBlocks(readFileSync(file, "utf8"))) {
      if (seenInFile.has(block)) continue;
      seenInFile.add(block);
      const first = owners.get(block);
      if (first && first !== relativeFile) {
        duplicates.push({ first, second: relativeFile });
      } else {
        owners.set(block, relativeFile);
      }
    }
  }
  return duplicates;
}

export type HostBridgeBaselineRootMap = {
  currentRoot: string;
  baselineRoot: string;
};

type SkillPackageInspectionOptions = {
  enforceMaterializedDepth?: boolean;
  baselineRef?: string;
  baselineRootMaps?: HostBridgeBaselineRootMap[];
};

export type HostBridgeSkillPackageInspection = {
  errors: string[];
  warnings: string[];
};

function lineCount(content: string) {
  return content.split(/\r?\n/).length;
}

function instructionMetrics(content: string) {
  const lines = content.split(/\r?\n/);
  let inFrontmatter = lines[0]?.trim() === "---";
  let inFence = false;
  let inComment = false;
  const substantive: string[] = [];
  for (const [index, line] of lines.entries()) {
    const trimmed = line.trim();
    if (inFrontmatter) {
      if (trimmed === "---" && index > 0) {
        inFrontmatter = false;
      }
      continue;
    }
    if (/^```/.test(trimmed)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (trimmed.includes("<!--")) inComment = true;
    if (inComment) {
      if (trimmed.includes("-->")) inComment = false;
      continue;
    }
    if (
      !trimmed ||
      /^#{1,6}\s/.test(trimmed) ||
      /^\|/.test(trimmed) ||
      /^[-:|\s]+$/.test(trimmed)
    ) {
      continue;
    }
    substantive.push(trimmed);
  }
  const normalizedProseCharacters = [
    ...substantive
      .join(" ")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[`*_~>#|()[\]{}:;,.!?'"\\/+=-]/g, "")
      .replace(/\s+/g, ""),
  ].length;
  return {
    substantiveInstructionLines: substantive.length,
    normalizedProseCharacters,
  };
}

function gitOutput(args: string[], cwd: string) {
  const result = spawnSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    shell: false,
  });
  return result.status === 0 ? String(result.stdout || "").trimEnd() : null;
}

function normalizeRepositoryPath(path: string) {
  return path.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/$/, "");
}

function resolveBaselinePackagePath(
  packagePath: string,
  rootMaps: HostBridgeBaselineRootMap[],
) {
  const current = normalizeRepositoryPath(packagePath);
  const matches = rootMaps
    .map((mapping) => ({
      currentRoot: normalizeRepositoryPath(mapping.currentRoot),
      baselineRoot: normalizeRepositoryPath(mapping.baselineRoot),
    }))
    .filter(
      (mapping) =>
        current === mapping.currentRoot ||
        current.startsWith(`${mapping.currentRoot}/`),
    )
    .sort((left, right) => right.currentRoot.length - left.currentRoot.length);
  const mapping = matches[0];
  if (!mapping) return current;
  const suffix = current.slice(mapping.currentRoot.length).replace(/^\//, "");
  return [mapping.baselineRoot, suffix].filter(Boolean).join("/");
}

function inspectRelativeBaseline(
  root: string,
  baselineRef: string,
  rootMaps: HostBridgeBaselineRootMap[],
): string[] {
  const errors: string[] = [];
  const repositoryRoot = gitOutput(["rev-parse", "--show-toplevel"], root);
  const label = relative(process.cwd(), root) || root;
  if (!repositoryRoot) {
    return [`${label}: cannot resolve Git repository for baseline comparison`];
  }
  const packagePath = resolveBaselinePackagePath(
    relative(repositoryRoot, root).replace(/\\/g, "/"),
    rootMaps,
  );
  const baselineSkill = gitOutput(
    ["show", `${baselineRef}:${packagePath}/SKILL.md`],
    repositoryRoot,
  );
  if (baselineSkill === null) {
    return [
      `${label}: baseline SKILL.md is unavailable at ${baselineRef}:${packagePath}/SKILL.md`,
    ];
  }
  const currentSkillPath = join(root, "SKILL.md");
  const currentSkill = readFileSync(currentSkillPath, "utf8");
  const baselineReferences = directReferenceLinks(baselineSkill);
  const currentReferences = directReferenceLinks(currentSkill);
  for (const baselineReference of baselineReferences) {
    if (!currentReferences.has(baselineReference)) {
      errors.push(
        `${label}: baseline direct reference missing: ${baselineReference}`,
      );
    }
  }

  const compare = (
    relativePath: string,
    baselineContent: string,
    currentContent: string,
  ) => {
    const baseline = instructionMetrics(baselineContent);
    const current = instructionMetrics(currentContent);
    if (
      current.substantiveInstructionLines < baseline.substantiveInstructionLines
    ) {
      errors.push(
        `${label}: ${relativePath} has ${current.substantiveInstructionLines} substantive instruction lines; baseline ${baselineRef} has ${baseline.substantiveInstructionLines}`,
      );
    }
    const minimumCharacters = Math.ceil(
      baseline.normalizedProseCharacters * 0.95,
    );
    if (current.normalizedProseCharacters < minimumCharacters) {
      errors.push(
        `${label}: ${relativePath} has ${current.normalizedProseCharacters} normalized prose characters; 95% of baseline ${baselineRef} requires ${minimumCharacters}`,
      );
    }
  };
  compare("SKILL.md", baselineSkill, currentSkill);
  for (const baselineReference of baselineReferences) {
    const baselineContent = gitOutput(
      ["show", `${baselineRef}:${packagePath}/${baselineReference}`],
      repositoryRoot,
    );
    if (baselineContent === null) {
      errors.push(
        `${label}: baseline direct reference is unavailable: ${baselineReference}`,
      );
      continue;
    }
    const currentPath = join(root, baselineReference);
    if (!existsSync(currentPath)) {
      continue;
    }
    compare(
      baselineReference,
      baselineContent,
      readFileSync(currentPath, "utf8"),
    );
  }
  return errors;
}

function inspectDepth(args: {
  label: string;
  path: string;
  content: string;
  kind: "skill" | "reference";
}) {
  const count = lineCount(args.content);
  const hardMinimum = args.kind === "skill" ? 100 : 200;
  const advisoryMinimum = args.kind === "skill" ? 200 : 350;
  const message = `${args.label}: ${args.path} has ${count} lines`;
  if (count < hardMinimum) {
    return {
      error: `${message}; hard minimum is ${hardMinimum}`,
      warning: undefined,
    };
  }
  if (count < advisoryMinimum) {
    return {
      error: undefined,
      warning: `${message}; advisory depth is ${advisoryMinimum}, so semantic review must accept or expand it`,
    };
  }
  return { error: undefined, warning: undefined };
}

function inspectSkillRoot(
  root: string,
  options: SkillPackageInspectionOptions,
): HostBridgeSkillPackageInspection {
  const errors: string[] = [];
  const warnings: string[] = [];
  const skillPath = join(root, "SKILL.md");
  const label = relative(process.cwd(), root) || root;
  if (!existsSync(skillPath)) {
    return { errors: [`${label}: missing SKILL.md`], warnings };
  }
  const skill = readFileSync(skillPath, "utf8");
  const meta = frontmatter(skill);
  if (!meta) {
    errors.push(`${label}: missing YAML frontmatter`);
  } else {
    if (meta.name !== basename(root)) {
      errors.push(`${label}: name must match directory`);
    }
    if (!meta.description) {
      errors.push(`${label}: missing description`);
    } else {
      if ([...meta.description].length > 240) {
        errors.push(
          `${label}: description must be at most 240 Unicode characters`,
        );
      }
      if (!/\buse (?:when|for)\b/i.test(meta.description)) {
        errors.push(`${label}: description must state when to use the skill`);
      }
      if (/\r|\n/.test(meta.description)) {
        errors.push(`${label}: description must be one line`);
      }
    }
  }
  for (const section of REQUIRED_SECTIONS) {
    if (
      !new RegExp(`^## ${section.replace(/ /g, "\\s+")}\\s*$`, "mi").test(skill)
    ) {
      errors.push(`${label}: missing required section: ${section}`);
    }
  }
  for (const pattern of CURRENT_STATE_ONLY_PATTERNS) {
    if (pattern.test(skill)) {
      errors.push(
        `${label}: SKILL.md must be current-state only (${pattern.source})`,
      );
    }
  }

  const referencesRoot = join(root, "references");
  const references = markdownFiles(referencesRoot);
  const links = directReferenceLinks(skill);
  const generatedCommands =
    basename(root) === "zotero-bridge-cli"
      ? inspectGeneratedCommandCards(root)
      : {
          errors: [] as string[],
          links: new Set<string>(),
          cardFiles: [] as string[],
          audit: undefined,
        };
  errors.push(...generatedCommands.errors);
  for (const link of links) {
    if (!existsSync(join(root, link))) {
      errors.push(`${label}: linked reference does not exist: ${link}`);
    }
  }
  for (const reference of references) {
    const relativeReference = relative(root, reference).replace(/\\/g, "/");
    const commandCard = relativeReference.startsWith("references/commands/");
    if (
      (!commandCard && !links.has(relativeReference)) ||
      (commandCard && !generatedCommands.links.has(relativeReference))
    ) {
      errors.push(
        `${label}: orphan reference is not reachable through its owner: ${relativeReference}`,
      );
    }
    const content = readFileSync(reference, "utf8");
    for (const pattern of CURRENT_STATE_ONLY_PATTERNS) {
      if (pattern.test(content)) {
        errors.push(
          `${label}: reference must be current-state only: ${relativeReference}`,
        );
        break;
      }
    }
  }
  const proseOwnedReferences = references.filter(
    (reference) => !generatedCommands.cardFiles.includes(reference),
  );
  for (const duplicate of duplicatedProse(root, [
    skillPath,
    ...proseOwnedReferences,
  ])) {
    errors.push(
      `${label}: duplicated substantive prose between ${duplicate.first} and ${duplicate.second}`,
    );
  }
  if (options.enforceMaterializedDepth) {
    const skillDepth = inspectDepth({
      label,
      path: "SKILL.md",
      content: skill,
      kind: "skill",
    });
    if (skillDepth.error) errors.push(skillDepth.error);
    if (skillDepth.warning) warnings.push(skillDepth.warning);
    for (const reference of references) {
      const relativeReference = relative(root, reference).replace(/\\/g, "/");
      const referenceDepth = inspectDepth({
        label,
        path: relativeReference,
        content: readFileSync(reference, "utf8"),
        kind: "reference",
      });
      if (referenceDepth.error) errors.push(referenceDepth.error);
      if (referenceDepth.warning) warnings.push(referenceDepth.warning);
    }
  }
  if (options.baselineRef) {
    errors.push(
      ...inspectRelativeBaseline(
        root,
        options.baselineRef,
        options.baselineRootMaps || [],
      ),
    );
  }
  return { errors, warnings };
}

export function inspectHostBridgeSkillPackages(
  roots: string[],
  options: SkillPackageInspectionOptions = {},
): HostBridgeSkillPackageInspection {
  const inspection: HostBridgeSkillPackageInspection = {
    errors: [],
    warnings: [],
  };
  for (const root of roots) {
    const result = inspectSkillRoot(resolve(root), options);
    inspection.errors.push(...result.errors);
    inspection.warnings.push(...result.warnings);
  }
  return inspection;
}

/** Validate Host Bridge governed skill packages rooted at the supplied directories. */
export function validateHostBridgeSkillPackages(roots: string[]): string[] {
  return inspectHostBridgeSkillPackages(roots).errors;
}

function isMainModule() {
  return process.argv[1]
    ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
    : false;
}

if (isMainModule()) {
  const argv = process.argv.slice(2);
  const baselineIndex = argv.indexOf("--baseline-ref");
  const baselineRef =
    baselineIndex >= 0 ? String(argv[baselineIndex + 1] || "").trim() : "";
  if (baselineIndex >= 0) {
    argv.splice(baselineIndex, 2);
  }
  const baselineRootMaps: HostBridgeBaselineRootMap[] = [];
  for (let index = 0; index < argv.length; ) {
    if (argv[index] !== "--baseline-root-map") {
      index += 1;
      continue;
    }
    const value = String(argv[index + 1] || "");
    const separator = value.indexOf("=");
    if (separator <= 0 || separator === value.length - 1) {
      throw new Error(
        "--baseline-root-map must be <current-root>=<baseline-root>",
      );
    }
    baselineRootMaps.push({
      currentRoot: value.slice(0, separator),
      baselineRoot: value.slice(separator + 1),
    });
    argv.splice(index, 2);
  }
  const roots = argv;
  if (!roots.length) {
    throw new Error(
      "Usage: check-host-bridge-skill-packages.ts [--baseline-ref <ref>] [--baseline-root-map <current>=<baseline>] <skill-root> [...]",
    );
  }
  const inspection = inspectHostBridgeSkillPackages(roots, {
    enforceMaterializedDepth: true,
    baselineRef: baselineRef || undefined,
    baselineRootMaps,
  });
  if (inspection.warnings.length) {
    console.warn(
      JSON.stringify(
        {
          schema: "host-bridge.instruction-depth-warnings.v1",
          warnings: inspection.warnings,
        },
        null,
        2,
      ),
    );
  }
  if (inspection.errors.length) {
    throw new Error(
      `Host Bridge skill package validation failed:\n${inspection.errors.map((error) => `- ${error}`).join("\n")}`,
    );
  }
}
