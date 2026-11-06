import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHostBridgeReleasePlan } from "./host-bridge-release-plan";
import { resolveExactCliReleaseIntent } from "./host-bridge-version-intent";
import { bumpHostBridgeCliPatchVersion } from "./host-bridge-cli-release-governance.mjs";
import { checkHostBridgeCliPrebuildFreshness } from "./check-host-bridge-cli-prebuild-freshness.mjs";
import {
  hostBridgePublicationTargets,
  readHostBridgeVersions,
  resolveHostBridgeChannel,
  resolveHostBridgeCliVersion,
} from "./host-bridge-release-channels.mjs";
import {
  loadHostBridgeSurfaceDefinitions,
  writeHostBridgeSurfaceDefinitions,
} from "./host-bridge-surface-model";

function option(name: string) {
  const inline = process.argv.find((entry) => entry.startsWith(`${name}=`));
  const index = process.argv.indexOf(name);
  return (
    inline?.slice(name.length + 1) ||
    (index >= 0 ? process.argv[index + 1] : "")
  ).trim();
}

export async function prepareHostBridgeRelease(
  args: {
    root?: string;
    channel?: string;
    intent?: "auto" | "patch" | "minor";
    cliVersion?: string;
    write?: boolean;
  } = {},
) {
  const root = args.root || process.cwd();
  const channel = resolveHostBridgeChannel(args.channel);
  let intent = args.intent || "auto";
  if (!(["auto", "patch", "minor"] as const).includes(intent)) {
    throw new Error(`Unsupported Host Bridge release intent: ${intent}`);
  }
  const counter = resolveHostBridgeCliVersion(
    readHostBridgeVersions(root),
    channel,
  );
  if (args.cliVersion) {
    const exactIntent = resolveExactCliReleaseIntent(counter, args.cliVersion);
    if (intent !== "auto" && intent !== exactIntent) {
      throw new Error(
        `--intent ${intent} conflicts with exact CLI target ${args.cliVersion}`,
      );
    }
    intent = exactIntent;
  }
  const plan = createHostBridgeReleasePlan(root, intent, channel);
  if (args.cliVersion && args.cliVersion !== plan.targetCliVersion) {
    throw new Error(
      `CLI inputs require target ${plan.targetCliVersion}, not ${args.cliVersion}`,
    );
  }
  if (!args.write)
    return { schema: "host-bridge.prepare-result.v1", status: "planned", plan };
  const branch = execFileSync("git", ["branch", "--show-current"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  if (branch !== hostBridgePublicationTargets(channel).ref) {
    throw new Error(
      `Host Bridge ${channel} preparation requires source branch ${hostBridgePublicationTargets(channel).ref}`,
    );
  }
  await bumpHostBridgeCliPatchVersion({
    root,
    channel,
    version: plan.targetCliVersion,
    preparationKey: plan.preparationKey,
    noBump: true,
    force: true,
    dispatchReason: "prepare",
  });
  if (channel === "stable" && !plan.alreadyPrepared) {
    const definitionsPath = resolve(
      root,
      "contracts/host-bridge/surfaces.json",
    );
    const definitions = loadHostBridgeSurfaceDefinitions(definitionsPath);
    const names = {
      "zotero-bridge-cli": "cliBundle",
      "zotero-library-agent": "libraryAgent",
      "zotero-librarian": "librarianProfile",
    } as const;
    for (const surface of definitions.surfaces) {
      surface.patch =
        plan.surfacePatches[names[surface.id as keyof typeof names]];
    }
    writeHostBridgeSurfaceDefinitions({ definitionsPath, definitions });
  }
  const freshness = await checkHostBridgeCliPrebuildFreshness({ root });
  if (!freshness.ok) {
    return {
      schema: "host-bridge.prepare-result.v1",
      status: "prebuild_required",
      plan,
      freshness,
    };
  }
  for (const script of [
    "render:host-bridge-surface",
    "check:host-bridge-surface",
  ]) {
    const result = spawnSync("npm", ["run", script], {
      cwd: root,
      stdio: "inherit",
    });
    if (result.status !== 0)
      throw new Error(`${script} exited ${result.status}`);
  }
  const releaseSet = JSON.parse(
    readFileSync(
      resolve(root, "releases/host-bridge/release-set.json"),
      "utf8",
    ),
  );
  return {
    schema: "host-bridge.prepare-result.v1",
    status: "prepared",
    plan,
    releaseSetId: releaseSet.releaseSetId,
  };
}

if (resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) {
  prepareHostBridgeRelease({
    channel: option("--channel") || "stable",
    intent: (option("--intent") || "auto") as "auto" | "patch" | "minor",
    cliVersion: option("--cli-version") || undefined,
    write: process.argv.includes("--write"),
  })
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      if (result.status === "prebuild_required") process.exitCode = 2;
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
