import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildHostBridgeAgentSurfaceDescriptor } from "./host-bridge-agent-surface";
import { buildHostBridgeSurfaceCatalog } from "./host-bridge-surface-catalog";
import { buildHostBridgeReleaseSet } from "./host-bridge-release-set";
import { stagedHostBridgePayloadDigests } from "./materialize-host-bridge-surfaces";
import { readZoteroBridgeCliRelease } from "./zotero-bridge-cli-release";
import { inspectHostBridgeSurfaceVersion } from "./host-bridge-surface-model";

const TARGETS = ["host-bridge/release-set.json"];

function sourceCommit(root: string) {
  const explicitArg = process.argv.find((entry) =>
    entry.startsWith("--source-commit="),
  );
  if (explicitArg) {
    return explicitArg.slice("--source-commit=".length).trim();
  }
  if (process.env.HOST_BRIDGE_SOURCE_COMMIT) {
    return process.env.HOST_BRIDGE_SOURCE_COMMIT.trim();
  }
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
}

export function renderHostBridgeReleaseSet(options: {
  root: string;
  sourceCommit: string;
}) {
  const { root, sourceCommit } = options;
  const cli = readZoteroBridgeCliRelease(root);
  const descriptor = buildHostBridgeAgentSurfaceDescriptor(
    buildHostBridgeSurfaceCatalog(root),
  );
  const definitionsPath = join(root, "host-bridge/surfaces.json");
  const payloadDigests = stagedHostBridgePayloadDigests(root);
  return `${JSON.stringify(
    buildHostBridgeReleaseSet({
      sourceCommit,
      protocol: descriptor.protocol,
      cliSchema: descriptor.cliSchema,
      cli: {
        ...cli,
        commandCatalogChecksum: descriptor.commandCatalogChecksum,
        binaries:
          JSON.parse(
            readFileSync(join(root, "cli/zotero-bridge/release.json"), "utf8"),
          ).binaries || [],
      },
      surfaces: {
        cliBundle: {
          version: inspectHostBridgeSurfaceVersion({
            definitionsPath,
            surfaceId: "zotero-bridge-cli",
          }).version,
          contentDigest: payloadDigests.cliBundle,
          repository: "leike0813/zotero-agents",
          mutableRef: "host-bridge/zotero-bridge-cli-bundle",
        },
        libraryAgent: {
          version: inspectHostBridgeSurfaceVersion({
            definitionsPath,
            surfaceId: "zotero-library-agent",
          }).version,
          contentDigest: payloadDigests.libraryAgent,
          repository: "leike0813/zotero-library-agent-bundle",
          mutableRef: "main",
        },
        librarianProfile: {
          version: inspectHostBridgeSurfaceVersion({
            definitionsPath,
            surfaceId: "zotero-librarian",
          }).version,
          contentDigest: payloadDigests.librarianProfile,
          repository: "leike0813/zotero-librarian-profile",
          mutableRef: "main",
        },
      },
    }),
    null,
    2,
  )}\n`;
}

function main() {
  const root = process.cwd();
  const check = process.argv.includes("--check");
  const next = renderHostBridgeReleaseSet({
    root,
    sourceCommit: sourceCommit(root),
  });
  const stale = TARGETS.filter(
    (path) =>
      !existsSync(join(root, path)) ||
      readFileSync(join(root, path), "utf8") !== next,
  );
  if (check && stale.length) {
    throw new Error(`Host Bridge release set is stale:\n${stale.join("\n")}`);
  }
  if (!check) {
    for (const path of stale) {
      const absolute = join(root, path);
      mkdirSync(dirname(absolute), { recursive: true });
      writeFileSync(absolute, next, "utf8");
    }
  }
  process.stdout.write(
    `${JSON.stringify({ schema: "host-bridge.release-set.render.v1", stale })}\n`,
  );
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === THIS_FILE) {
  main();
}
