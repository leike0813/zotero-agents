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
  const receiptPath =
    process.env.HOST_BRIDGE_RELEASE_RECEIPT?.trim() ||
    resolve(root, "host-bridge/latest-complete-release-receipt.json");
  if (existsSync(receiptPath)) {
    const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
    if (receipt.status !== "complete" || !receipt.sourceCommit) {
      throw new Error(
        `Host Bridge release receipt is not complete: ${receiptPath}`,
      );
    }
    return String(receipt.sourceCommit);
  }
  const releaseSetPath = resolve(root, "host-bridge/release-set.json");
  if (existsSync(releaseSetPath)) {
    const releaseSet = JSON.parse(readFileSync(releaseSetPath, "utf8"));
    const completedSource = String(releaseSet?.source?.commit || "").trim();
    if (
      completedSource &&
      git(["rev-parse", "--verify", `${completedSource}^{commit}`], root)
    ) {
      return completedSource;
    }
  }
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

export function createHostBridgeReleasePlan(
  root = process.cwd(),
  intent: "auto" | "patch" | "minor" = "auto",
) {
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
        intent === "minor"
          ? "minor"
          : classification.cliBinaryInputs &&
              previous?.cli?.buildFingerprint !== cliRelease.buildFingerprint
            ? "patch"
            : "none",
      cliBundle:
        intent === "minor"
          ? "minor"
          : classification.surfaces.cliBundle &&
              previous?.surfaces?.cliBundle?.contentDigest !== digests.cliBundle
            ? "patch"
            : "none",
      libraryAgent:
        intent === "minor"
          ? "minor"
          : classification.surfaces.libraryAgent &&
              previous?.surfaces?.libraryAgent?.contentDigest !==
                digests.libraryAgent
            ? "patch"
            : "none",
      librarianProfile:
        intent === "minor"
          ? "minor"
          : classification.surfaces.librarianProfile &&
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
  const intentArg = process.argv.find((entry) => entry.startsWith("--intent="));
  const intentIndex = process.argv.indexOf("--intent");
  const intent = (intentArg?.slice("--intent=".length) ||
    (intentIndex >= 0 ? process.argv[intentIndex + 1] : "") ||
    "auto") as "auto" | "patch" | "minor";
  if (!(["auto", "patch", "minor"] as const).includes(intent)) {
    throw new Error(`Unsupported Host Bridge release intent: ${intent}`);
  }
  process.stdout.write(
    `${JSON.stringify(createHostBridgeReleasePlan(process.cwd(), intent), null, 2)}\n`,
  );
}
