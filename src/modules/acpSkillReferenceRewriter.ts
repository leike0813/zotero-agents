function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toPortableAbsolutePath(path: string) {
  return normalizeString(path).replace(/\\/g, "/").replace(/\/+$/g, "");
}

function splitFrontmatter(content: string) {
  if (!content.startsWith("---\n")) {
    return { frontmatter: "", body: content };
  }
  const end = content.indexOf("\n---", 4);
  if (end < 0) {
    return { frontmatter: "", body: content };
  }
  const closeEnd = content.indexOf("\n", end + 4);
  if (closeEnd < 0) {
    return { frontmatter: content, body: "" };
  }
  return {
    frontmatter: content.slice(0, closeEnd + 1),
    body: content.slice(closeEnd + 1),
  };
}

function rewriteResourcePrefix(args: {
  body: string;
  prefix: "assets" | "scripts" | "references";
  absoluteRoot: string;
}) {
  const absoluteRoot = toPortableAbsolutePath(args.absoluteRoot);
  const pattern = new RegExp(
    `(^|[^A-Za-z0-9_:/\\\\.-])${args.prefix}/([^\\s'")<>]+)`,
    "g",
  );
  return args.body.replace(pattern, (full, leading: string, relative: string) => {
    if (!relative || relative.startsWith("/")) {
      return full;
    }
    return `${leading}${absoluteRoot}/${relative}`;
  });
}

function rewriteSkillPrefixedResource(args: {
  body: string;
  skillId: string;
  prefix: "assets" | "scripts" | "references";
  absoluteRoot: string;
}) {
  const absoluteRoot = toPortableAbsolutePath(args.absoluteRoot);
  const skillId = escapeRegExp(args.skillId);
  const pattern = new RegExp(
    `(^|[^A-Za-z0-9_:/\\\\.-])${skillId}/${args.prefix}/([^\\s'")<>]+)`,
    "g",
  );
  return args.body.replace(pattern, (full, leading: string, relative: string) => {
    if (!relative || relative.startsWith("/")) {
      return full;
    }
    return `${leading}${absoluteRoot}/${relative}`;
  });
}

function collectUnresolvedReferences(body: string) {
  const matches = new Set<string>();
  const pattern = /(^|[^A-Za-z0-9_:/\\.-])((?:assets|scripts|references)\/[^\s'"`)<>]+)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body))) {
    matches.add(match[2]);
  }
  return [...matches].slice(0, 20);
}

export type AcpSkillReferenceRewriteResult = {
  content: string;
  warnings: string[];
  rewrittenCount: number;
};

export function rewriteAcpSkillReferences(args: {
  skillId: string;
  skillRoot: string;
  skillMdContent: string;
}): AcpSkillReferenceRewriteResult {
  const skillRoot = toPortableAbsolutePath(args.skillRoot);
  const roots = {
    assets: `${skillRoot}/assets`,
    scripts: `${skillRoot}/scripts`,
    references: `${skillRoot}/references`,
  };
  const { frontmatter, body } = splitFrontmatter(args.skillMdContent);
  let rewritten = body.replace(/\{\{\s*skill_dir\s*\}\}/g, skillRoot);
  const before = rewritten;
  for (const prefix of ["assets", "scripts", "references"] as const) {
    rewritten = rewriteSkillPrefixedResource({
      body: rewritten,
      skillId: args.skillId,
      prefix,
      absoluteRoot: roots[prefix],
    });
    rewritten = rewriteResourcePrefix({
      body: rewritten,
      prefix,
      absoluteRoot: roots[prefix],
    });
  }
  const unresolved = collectUnresolvedReferences(rewritten);
  return {
    content: `${frontmatter}${rewritten}`,
    warnings: unresolved.map(
      (entry) => `Potential unresolved relative resource reference: ${entry}`,
    ),
    rewrittenCount: before === rewritten ? 0 : 1,
  };
}

export function insertAcpSkillProxyPatchBlock(args: {
  rewrittenSkillMd: string;
  patchBlock: string;
}) {
  const { frontmatter, body } = splitFrontmatter(args.rewrittenSkillMd);
  const trimmedPatch = args.patchBlock.trim();
  if (!trimmedPatch || args.rewrittenSkillMd.includes("zotero-skills-acp-thin-proxy")) {
    return args.rewrittenSkillMd;
  }
  return `${frontmatter}${trimmedPatch}\n\n${body.replace(/^\s+/g, "")}`.replace(/\s+$/g, "\n");
}
