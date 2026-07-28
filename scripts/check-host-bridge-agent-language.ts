import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const FORBIDDEN_AGENT_PROSE = [
  /\bHost Bridge\b/g,
  /\bHost-(?:owned|local)\b/gi,
  /\bHost (?:action|approval|endpoint|error|evidence|facts?|handles?|operations?|profile|requests?|state|truth|writes?)\b/gi,
] as const;

const TEXT_EXTENSIONS = new Set([
  ".json",
  ".md",
  ".py",
  ".rs",
  ".ts",
  ".yaml",
  ".yml",
]);

const AGENT_LANGUAGE_ROOTS = [
  "skills_src/zotero-bridge-cli",
  "skills_src/zotero-library-agent",
  "profiles_src/hermes/zotero-librarian",
  "skills_builtin/zotero-bridge-cli",
  "skills_builtin/zotero-library-agent",
  "skills_builtin/zotero-library-query",
  "skills_builtin/zotero-literature-acquisition",
  "skills_builtin/zotero-literature-analysis",
  "skills_builtin/zotero-research-synthesis",
  "skills_builtin/zotero-library-curation",
  "profiles/hermes/zotero-librarian",
] as const;

const AGENT_LANGUAGE_FILES = [
  "cli/zotero-bridge/src/args.rs",
  "cli/zotero-bridge/src/client.rs",
  "cli/zotero-bridge/src/commands.rs",
  "cli/zotero-bridge/src/config.rs",
  "cli/zotero-bridge/src/contract.rs",
  "cli/zotero-bridge/src/surface.rs",
  "scripts/host-bridge-agent-surface.ts",
  "schemas/host-bridge.agent-surface.v6.schema.json",
] as const;

export interface AgentLanguageViolation {
  path: string;
  term: string;
  line?: number;
}

function violationsInString(value: string, path: string) {
  const violations: AgentLanguageViolation[] = [];
  for (const pattern of FORBIDDEN_AGENT_PROSE) {
    pattern.lastIndex = 0;
    for (const match of value.matchAll(pattern)) {
      violations.push({ path, term: match[0] });
    }
  }
  return violations;
}

export function findAgentLanguageViolations(
  value: unknown,
  path = "$",
): AgentLanguageViolation[] {
  if (typeof value === "string") return violationsInString(value, path);
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      findAgentLanguageViolations(entry, `${path}[${index}]`),
    );
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, entry]) =>
      findAgentLanguageViolations(entry, `${path}.${key}`),
    );
  }
  return [];
}

function textFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return textFiles(path);
    return entry.isFile() && TEXT_EXTENSIONS.has(extname(entry.name))
      ? [path]
      : [];
  });
}

export function validateHostBridgeAgentLanguage(root: string): string[] {
  const repositoryRoot = resolve(root);
  const paths = new Set([
    ...AGENT_LANGUAGE_ROOTS.flatMap((entry) =>
      textFiles(join(repositoryRoot, entry)),
    ),
    ...AGENT_LANGUAGE_FILES.map((entry) => join(repositoryRoot, entry)).filter(
      existsSync,
    ),
  ]);
  const errors: string[] = [];
  for (const path of [...paths].sort()) {
    const content = readFileSync(path, "utf8");
    const label = relative(repositoryRoot, path);
    for (const [index, line] of content.split(/\r?\n/).entries()) {
      for (const violation of violationsInString(line, label)) {
        errors.push(
          `${violation.path}:${index + 1}: ambiguous agent-facing term ${JSON.stringify(violation.term)}`,
        );
      }
    }
  }
  return errors;
}

function isMainModule() {
  return process.argv[1]
    ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
    : false;
}

if (isMainModule()) {
  const errors = validateHostBridgeAgentLanguage(process.cwd());
  if (errors.length) {
    throw new Error(
      `Agent-facing language validation failed:\n${errors.map((error) => `- ${error}`).join("\n")}`,
    );
  }
}
