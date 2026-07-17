import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifyHostBridgeReleaseChanges,
  contentDigest,
  HOST_BRIDGE_PUBLIC_CONTENT,
} from "./host-bridge-release-set";

function git(args: string[], root: string) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function lines(value: string) {
  return value
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function resolveHostBridgeReleaseBase(root = process.cwd()) {
  const explicit = process.env.HOST_BRIDGE_RELEASE_BASE?.trim();
  if (explicit) return explicit;
  for (const ref of ["origin/main", "main"]) {
    const mergeBase = git(["merge-base", "HEAD", ref], root);
    if (mergeBase) return mergeBase;
  }
  return git(["rev-parse", "HEAD^"], root) || "HEAD";
}

export function collectHostBridgeReleaseChangedFiles(root = process.cwd()) {
  const base = resolveHostBridgeReleaseBase(root);
  return {
    base,
    files: [
      ...lines(git(["diff", "--name-only", `${base}...HEAD`], root)),
      ...lines(git(["diff", "--name-only"], root)),
      ...lines(git(["diff", "--name-only", "--cached"], root)),
      ...lines(git(["ls-files", "--others", "--exclude-standard"], root)),
    ],
  };
}

export function createHostBridgeReleasePlan(root = process.cwd()) {
  const changed = collectHostBridgeReleaseChangedFiles(root);
  const classification = classifyHostBridgeReleaseChanges(changed.files);
  const digests = {
    cliBundle: contentDigest(root, [...HOST_BRIDGE_PUBLIC_CONTENT.cliBundle]),
    libraryAgent: contentDigest(root, [
      ...HOST_BRIDGE_PUBLIC_CONTENT.libraryAgent,
    ]),
    librarianProfile: contentDigest(root, [
      ...HOST_BRIDGE_PUBLIC_CONTENT.librarianProfile,
    ]),
  };
  const releaseSetPath = resolve(root, "host-bridge/release-set.json");
  const previous = existsSync(releaseSetPath)
    ? JSON.parse(readFileSync(releaseSetPath, "utf8"))
    : null;
  const cliRelease = JSON.parse(
    readFileSync(resolve(root, "cli/zotero-bridge/release.json"), "utf8"),
  );
  return {
    ...classification,
    base: changed.base,
    head: git(["rev-parse", "HEAD"], root),
    previousReleaseSetId: previous?.releaseSetId || "",
    prebuildRequired:
      cliRelease.binariesBuildFingerprint !== cliRelease.buildFingerprint,
    contentDigests: digests,
    versionBumps: {
      cli:
        classification.cliBinaryInputs &&
        previous?.cli?.buildFingerprint !== cliRelease.buildFingerprint
          ? "patch"
          : "none",
      cliBundle:
        classification.surfaces.cliBundle &&
        previous?.surfaces?.cliBundle?.contentDigest !== digests.cliBundle
          ? "patch"
          : "none",
      libraryAgent:
        classification.surfaces.libraryAgent &&
        previous?.surfaces?.libraryAgent?.contentDigest !== digests.libraryAgent
          ? "patch"
          : "none",
      librarianProfile:
        classification.surfaces.librarianProfile &&
        previous?.surfaces?.librarianProfile?.contentDigest !==
          digests.librarianProfile
          ? "patch"
          : "none",
    },
  };
}

function isMainModule() {
  return process.argv[1]
    ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
    : false;
}

if (isMainModule()) {
  process.stdout.write(
    `${JSON.stringify(createHostBridgeReleasePlan(), null, 2)}\n`,
  );
}
