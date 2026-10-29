import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { renderLiteratureDeepReadingSkill } from "../../skills_src/literature-deep-reading/renderer/render_literature_deep_reading_skill";
import { renderTopicSynthesisSkills } from "../../skills_src/topic-synthesis/renderer/render_topic_synthesis_skills";

export type BuiltinSkillContractIssue = {
  kind: "missing" | "extra" | "changed";
  path: string;
};

async function readFileTree(root: string): Promise<Map<string, Buffer>> {
  const files = new Map<string, Buffer>();
  async function visit(current: string) {
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.name === "__pycache__") continue;
      if (entry.isDirectory()) {
        await visit(fullPath);
      } else if (entry.isFile()) {
        files.set(
          path.relative(root, fullPath).replace(/\\/g, "/"),
          await fs.readFile(fullPath),
        );
      }
    }
  }
  await visit(root);
  return files;
}

export async function compareSkillPackage(
  renderedRoot: string,
  committedRoot: string,
  label = path.basename(renderedRoot),
): Promise<BuiltinSkillContractIssue[]> {
  const rendered = await readFileTree(renderedRoot);
  const committed = await readFileTree(committedRoot);
  const issues: BuiltinSkillContractIssue[] = [];
  for (const [relativePath, bytes] of rendered) {
    const committedBytes = committed.get(relativePath);
    if (!committedBytes) {
      issues.push({ kind: "missing", path: `${label}/${relativePath}` });
    } else if (!bytes.equals(committedBytes)) {
      issues.push({ kind: "changed", path: `${label}/${relativePath}` });
    }
  }
  for (const relativePath of committed.keys()) {
    if (!rendered.has(relativePath)) {
      issues.push({ kind: "extra", path: `${label}/${relativePath}` });
    }
  }
  return issues.sort((left, right) => left.path.localeCompare(right.path));
}

export async function compareBuiltinSkillPackages(args: {
  renderedRoots: string[];
  skillsRoot: string;
}): Promise<BuiltinSkillContractIssue[]> {
  const issues = await Promise.all(
    args.renderedRoots.map((renderedRoot) => {
      const packageName = path.basename(renderedRoot);
      return compareSkillPackage(
        renderedRoot,
        path.join(args.skillsRoot, packageName),
        packageName,
      );
    }),
  );
  return issues
    .flat()
    .sort((left, right) => left.path.localeCompare(right.path));
}

export async function checkBuiltinSkillContracts(): Promise<{
  packages: number;
  issues: BuiltinSkillContractIssue[];
}> {
  const repoRoot = path.resolve(import.meta.dirname, "../..");
  const generatedRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "builtin-skill-contracts-"),
  );
  try {
    const renderedRoots = [
      ...(await renderTopicSynthesisSkills(generatedRoot)),
      await renderLiteratureDeepReadingSkill({ outRoot: generatedRoot }),
    ];
    const issues = await compareBuiltinSkillPackages({
      renderedRoots,
      skillsRoot: path.join(repoRoot, "skills_builtin"),
    });
    if (issues.length > 0) {
      const counts = { missing: 0, extra: 0, changed: 0 };
      for (const issue of issues) counts[issue.kind] += 1;
      throw new Error(
        [
          `[builtin-skill-check] failed (missing=${counts.missing}, extra=${counts.extra}, changed=${counts.changed})`,
          ...issues.map((issue) => `  ${issue.kind}: ${issue.path}`),
        ].join("\n"),
      );
    }
    return { packages: renderedRoots.length, issues };
  } finally {
    await fs.rm(generatedRoot, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  void checkBuiltinSkillContracts()
    .then((result) => {
      console.log(
        `[builtin-skill-check] ok (packages=${result.packages}, files=byte-identical)`,
      );
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
