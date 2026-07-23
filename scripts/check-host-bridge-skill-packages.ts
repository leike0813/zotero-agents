import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
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

type SkillPackageInspectionOptions = {
  enforceMaterializedDepth?: boolean;
};

export type HostBridgeSkillPackageInspection = {
  errors: string[];
  warnings: string[];
};

function lineCount(content: string) {
  return content.split(/\r?\n/).length;
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
  for (const link of links) {
    if (!existsSync(join(root, link))) {
      errors.push(`${label}: linked reference does not exist: ${link}`);
    }
  }
  for (const reference of references) {
    const relativeReference = relative(root, reference).replace(/\\/g, "/");
    if (!links.has(relativeReference)) {
      errors.push(
        `${label}: orphan reference not directly linked from SKILL.md: ${relativeReference}`,
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
  for (const duplicate of duplicatedProse(root, [skillPath, ...references])) {
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
  const roots = process.argv.slice(2);
  if (!roots.length) {
    throw new Error(
      "Usage: check-host-bridge-skill-packages.ts <skill-root> [...]",
    );
  }
  const inspection = inspectHostBridgeSkillPackages(roots, {
    enforceMaterializedDepth: true,
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
