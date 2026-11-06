import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import semver from "semver";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifyHostBridgeReleaseChanges,
  contentDigest,
} from "./host-bridge-release-set";
import {
  hostBridgeReleasePaths,
  readHostBridgeVersions,
  resolveHostBridgeChannel,
  resolveHostBridgeCliVersion,
} from "./host-bridge-release-channels.mjs";
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
      resolve(
        root,
        "scripts/host-bridge/host-bridge-cli-release-governance.mjs",
      ),
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

export function resolveHostBridgeReleaseBase(
  root = process.cwd(),
  channel = "stable",
) {
  const explicit = process.env.HOST_BRIDGE_RELEASE_BASE?.trim();
  if (explicit) return explicit;
  const selected = resolveHostBridgeChannel(channel);
  const channelReceipt = resolve(
    root,
    hostBridgeReleasePaths(selected).receipt,
  );
  const receiptPath =
    process.env.HOST_BRIDGE_RELEASE_RECEIPT?.trim() ||
    (existsSync(channelReceipt)
      ? channelReceipt
      : resolve(root, hostBridgeReleasePaths("stable").receipt));
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

export function collectHostBridgeReleaseChangedFiles(
  root = process.cwd(),
  channel = "stable",
) {
  const base = resolveHostBridgeReleaseBase(root, channel);
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
  channel = "stable",
) {
  const selected = resolveHostBridgeChannel(channel);
  const changed = collectHostBridgeReleaseChangedFiles(root, selected);
  const classification = classifyHostBridgeReleaseChanges(changed.files);
  const digests = stagedHostBridgePayloadDigests(root);
  const paths = hostBridgeReleasePaths(selected);
  const receiptPath = resolve(root, paths.receipt);
  const previousPath = resolve(root, paths.releaseSet);
  const receipt = existsSync(receiptPath)
    ? JSON.parse(readFileSync(receiptPath, "utf8"))
    : null;
  const previous =
    receipt?.status === "complete" && existsSync(previousPath)
      ? JSON.parse(readFileSync(previousPath, "utf8"))
      : null;
  if (previous && previous.releaseSetId !== receipt.releaseSetId) {
    throw new Error(
      "Completed Host Bridge channel history has inconsistent release identity",
    );
  }
  const cliRelease = JSON.parse(
    readFileSync(
      resolve(root, "releases/host-bridge/cli-release.json"),
      "utf8",
    ),
  );
  const versions = readHostBridgeVersions(root);
  const counter = resolveHostBridgeCliVersion(versions, selected);
  const cliBuildFingerprint = currentCliBuildFingerprint(root);
  const preparationKey = createHash("sha256")
    .update(
      JSON.stringify({
        channel: selected,
        cliBuildFingerprint,
        content: contentDigest(root, [
          "skills_src/zotero-bridge-cli",
          "skills_src/zotero-library-agent",
          "profiles_src/hermes/zotero-librarian",
          "workflows_builtin",
          "rust/zotero-bridge/scripts",
        ]),
      }),
    )
    .digest("hex");
  const alreadyPrepared =
    cliRelease.preparationKey === preparationKey &&
    cliRelease.version === counter &&
    cliRelease.buildFingerprint === cliBuildFingerprint;
  const binaryChanged = previous?.cli?.buildFingerprint !== cliBuildFingerprint;
  const surfaceChanged = Object.values(classification.surfaces).some(Boolean);
  const cliBump = alreadyPrepared
    ? "none"
    : intent === "minor"
      ? "minor"
      : intent === "patch" ||
          binaryChanged ||
          (selected === "dev" && surfaceChanged)
        ? "patch"
        : "none";
  const stableBase = previous?.cli?.version || versions.version;
  const targetCliVersion = alreadyPrepared
    ? counter
    : cliBump === "minor"
      ? `${semver.inc(selected === "stable" ? stableBase : counter, "minor")}${selected === "dev" ? "-dev.0" : ""}`
      : cliBump === "none"
        ? selected === "stable"
          ? stableBase
          : counter
        : selected === "dev"
          ? cliRelease.version === counter
            ? semver.inc(counter, "prerelease", "dev")!
            : counter
          : semver.inc(stableBase, "patch")!;
  const surfaceNames = [
    "cliBundle",
    "libraryAgent",
    "librarianProfile",
  ] as const;
  const surfaceBumps = Object.fromEntries(
    surfaceNames.map((name) => [
      name,
      selected === "dev" || alreadyPrepared
        ? "none"
        : intent === "minor"
          ? "minor"
          : classification.surfaces[name] &&
              previous?.surfaces?.[name]?.contentDigest !== digests[name]
            ? "patch"
            : "none",
    ]),
  ) as Record<(typeof surfaceNames)[number], "none" | "patch" | "minor">;
  const surfacePatches = Object.fromEntries(
    surfaceNames.map((name) => {
      const oldVersion = previous?.surfaces?.[name]?.version;
      const sameLine =
        oldVersion &&
        semver.major(oldVersion) === semver.major(targetCliVersion) &&
        semver.minor(oldVersion) === semver.minor(targetCliVersion);
      return [
        name,
        sameLine
          ? semver.patch(oldVersion) + (surfaceBumps[name] === "patch" ? 1 : 0)
          : 0,
      ];
    }),
  );
  return {
    ...classification,
    channel: selected,
    base: changed.base,
    head: git(["rev-parse", "HEAD"], root),
    previousReleaseSetId: previous?.releaseSetId || "",
    targetCliVersion,
    preparationKey,
    alreadyPrepared,
    surfacePatches,
    prebuildRequired:
      cliRelease.binariesBuildFingerprint !== cliBuildFingerprint ||
      (cliRelease.binariesVersion || cliRelease.version) !== targetCliVersion,
    contentDigests: digests,
    versionBumps: { cli: cliBump, ...surfaceBumps },
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
  const channelIndex = process.argv.indexOf("--channel");
  const channel =
    process.argv
      .find((entry) => entry.startsWith("--channel="))
      ?.slice("--channel=".length) ||
    (channelIndex >= 0 ? process.argv[channelIndex + 1] : "stable");
  const plan = createHostBridgeReleasePlan(process.cwd(), intent, channel);
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
