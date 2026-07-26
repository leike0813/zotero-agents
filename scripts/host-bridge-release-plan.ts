import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyHostBridgeReleaseChanges } from "./host-bridge-release-set";
import { stagedHostBridgePayloadDigests } from "./materialize-host-bridge-surfaces";

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

function currentCliBuildFingerprint(root: string) {
  const raw = execFileSync(
    process.execPath,
    [
      resolve(root, "scripts/host-bridge-cli-release-governance.mjs"),
      "status",
      "--json",
    ],
    {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
    },
  );
  const status = JSON.parse(raw);
  const fingerprint = String(status.fingerprint || "");
  if (!/^[a-f0-9]{64}$/.test(fingerprint)) {
    throw new Error(
      "Unable to compute current Host Bridge CLI build fingerprint",
    );
  }
  return fingerprint;
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
  const digests = stagedHostBridgePayloadDigests(root);
  const releaseSetPath = resolve(root, "host-bridge/release-set.json");
  const previous = existsSync(releaseSetPath)
    ? JSON.parse(readFileSync(releaseSetPath, "utf8"))
    : null;
  const cliRelease = JSON.parse(
    readFileSync(resolve(root, "cli/zotero-bridge/release.json"), "utf8"),
  );
  const cliBuildFingerprint = currentCliBuildFingerprint(root);
  return {
    ...classification,
    base: changed.base,
    head: git(["rev-parse", "HEAD"], root),
    previousReleaseSetId: previous?.releaseSetId || "",
    prebuildRequired:
      cliRelease.binariesBuildFingerprint !== cliBuildFingerprint,
    contentDigests: digests,
    versionBumps: {
      cli:
        intent === "minor"
          ? "minor"
          : intent === "patch"
            ? "patch"
            : classification.cliBinaryInputs &&
                previous?.cli?.buildFingerprint !== cliBuildFingerprint
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

export function writeHostBridgeReleasePlan(outputPath: string, plan: unknown) {
  const target = resolve(outputPath);
  const temporary = `${target}.tmp`;
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(temporary, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  renameSync(temporary, target);
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
  const plan = createHostBridgeReleasePlan(process.cwd(), intent);
  const outputArg = process.argv.find((entry) => entry.startsWith("--output="));
  const outputIndex = process.argv.indexOf("--output");
  const output =
    outputArg?.slice("--output=".length) ||
    (outputIndex >= 0 ? process.argv[outputIndex + 1] : "");
  if (output) {
    writeHostBridgeReleasePlan(output, plan);
  } else {
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
  }
}
