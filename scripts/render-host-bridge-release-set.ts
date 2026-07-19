import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildHostBridgeAgentSurfaceDescriptor } from "./host-bridge-agent-surface";
import { buildHostBridgeSurfaceCatalog } from "./host-bridge-surface-catalog";
import {
  buildHostBridgeReleaseSet,
  contentDigest,
  HOST_BRIDGE_PUBLIC_CONTENT,
} from "./host-bridge-release-set";
import { readZoteroBridgeCliRelease } from "./zotero-bridge-cli-release";
import { inspectZoteroLibraryAgentBundleVersion } from "./zotero-library-agent-bundle-version";
import { inspectZoteroLibrarianProfileVersion } from "./zotero-librarian-profile-version";

const TARGETS = [
  "host-bridge/release-set.json",
  "skills_builtin/zotero-bridge-cli/assets/release-set.json",
  "skills_builtin/zotero-library-agent/assets/release-set.json",
  "profiles/hermes/zotero-librarian/assets/release-set.json",
];

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
  const runner = JSON.parse(
    readFileSync(
      join(root, "skills_src/zotero-bridge-cli/runner.json"),
      "utf8",
    ),
  );
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
          version: String(runner.version),
          contentDigest: contentDigest(root, [
            ...HOST_BRIDGE_PUBLIC_CONTENT.cliBundle,
          ]),
          repository: "leike0813/zotero-agents",
          mutableRef: "host-bridge/zotero-bridge-cli-bundle",
        },
        libraryAgent: {
          version:
            inspectZoteroLibraryAgentBundleVersion(root).resolved.version,
          contentDigest: contentDigest(root, [
            ...HOST_BRIDGE_PUBLIC_CONTENT.libraryAgent,
          ]),
          repository: "leike0813/zotero-library-agent-bundle",
          mutableRef: "main",
        },
        librarianProfile: {
          version: inspectZoteroLibrarianProfileVersion(root).resolved.version,
          contentDigest: contentDigest(root, [
            ...HOST_BRIDGE_PUBLIC_CONTENT.librarianProfile,
          ]),
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
