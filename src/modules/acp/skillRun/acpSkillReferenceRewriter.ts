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
  const newline = content.startsWith("---\r\n")
    ? "\r\n"
    : content.startsWith("---\n")
      ? "\n"
      : "";
  if (!newline) {
    return { frontmatter: "", body: content };
  }
  const endMarker = `${newline}---`;
  const end = content.indexOf(endMarker, 3 + newline.length);
  if (end < 0) {
    return { frontmatter: "", body: content };
  }
  const closeStart = end + newline.length;
  const closeEnd = content.indexOf(newline, closeStart + 3);
  if (closeEnd < 0) {
    return { frontmatter: content, body: "" };
  }
  return {
    frontmatter: content.slice(0, closeEnd + newline.length),
    body: content.slice(closeEnd + newline.length),
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
  return args.body.replace(
    pattern,
    (full, leading: string, relative: string) => {
      if (!relative || relative.startsWith("/")) {
        return full;
      }
      return `${leading}${absoluteRoot}/${relative}`;
    },
  );
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
  return args.body.replace(
    pattern,
    (full, leading: string, relative: string) => {
      if (!relative || relative.startsWith("/")) {
        return full;
      }
      return `${leading}${absoluteRoot}/${relative}`;
    },
  );
}

function collectUnresolvedReferences(body: string) {
  const matches = new Set<string>();
  const pattern =
    /(^|[^A-Za-z0-9_:/\\.-])((?:assets|scripts|references)\/[^\s'"`)<>]+)/g;
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
  headerPatchBlock?: string;
  footerPatchBlock?: string;
  patchBlock?: string;
}) {
  const { frontmatter, body } = splitFrontmatter(args.rewrittenSkillMd);
  const trimmedHeader = (args.headerPatchBlock || args.patchBlock || "").trim();
  const trimmedFooter = (args.footerPatchBlock || "").trim();
  if (
    (!trimmedHeader && !trimmedFooter) ||
    args.rewrittenSkillMd.includes("zotero-skills-acp-thin-proxy")
  ) {
    return args.rewrittenSkillMd;
  }
  const normalizedBody = body.replace(/^\s+/g, "").replace(/\s+$/g, "");
  const sections = [
    frontmatter.trimEnd(),
    trimmedHeader,
    normalizedBody,
    trimmedFooter,
  ].filter(Boolean);
  return `${sections.join("\n\n")}\n`;
}
