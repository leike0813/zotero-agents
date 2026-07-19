import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";

type ReleaseSet = {
  schema: "host-bridge.release-set.v1";
  releaseSetId: string;
  source: { commit: string };
  cli: {
    identity: Record<string, unknown>;
    binaries: Array<{
      platform: string;
      binary: string;
      sha256: string;
      bytes?: number;
    }>;
  };
  surfaces: Record<
    "cliBundle" | "libraryAgent" | "librarianProfile",
    Record<string, unknown>
  >;
};

const ROOT = process.cwd();

function arg(name: string) {
  const prefix = `--${name}=`;
  return process.argv
    .find((entry) => entry.startsWith(prefix))
    ?.slice(prefix.length);
}

function readJson(path: string) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function copy(source: string, target: string) {
  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target, { recursive: true, force: true });
}

function resetDirectory(path: string) {
  const resolved = resolve(path);
  const root = resolve(ROOT);
  if (resolved === root || resolved === dirname(root) || resolved === "/") {
    throw new Error(
      `Refusing to clear broad materialization path: ${resolved}`,
    );
  }
  rmSync(resolved, { recursive: true, force: true });
  mkdirSync(resolved, { recursive: true });
}

function commonManifest(
  releaseSet: ReleaseSet,
  surfaceName: keyof ReleaseSet["surfaces"],
) {
  return {
    schema: "host-bridge.surface-release.v1",
    releaseSetId: releaseSet.releaseSetId,
    releaseSet,
    surface: {
      name: surfaceName,
      ...releaseSet.surfaces[surfaceName],
    },
    sourceCommit: releaseSet.source.commit,
    cliIdentity: releaseSet.cli.identity,
  };
}

function copyBinaries(
  root: string,
  releaseSet: ReleaseSet,
  targetRoot: string,
) {
  for (const entry of releaseSet.cli.binaries) {
    const source = join(root, "addon/bin", entry.platform, entry.binary);
    const checksum = `${source}.sha256`;
    if (!existsSync(source) || !existsSync(checksum)) {
      throw new Error(`Missing CLI prebuild for ${entry.platform}`);
    }
    copy(source, join(targetRoot, entry.platform, entry.binary));
    copy(checksum, join(targetRoot, entry.platform, `${entry.binary}.sha256`));
  }
}

function writeManifest(path: string, value: unknown) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function materializeHostBridgeSurfaces(args: {
  root?: string;
  outputRoot: string;
}) {
  const root = args.root || ROOT;
  const releaseSet = readJson(
    join(root, "host-bridge/release-set.json"),
  ) as ReleaseSet;
  if (releaseSet.schema !== "host-bridge.release-set.v1") {
    throw new Error("Host Bridge release set schema mismatch");
  }
  const outputRoot = resolve(args.outputRoot);
  resetDirectory(outputRoot);
  const cliBundle = join(outputRoot, "cli-bundle");
  const libraryAgent = join(outputRoot, "library-agent");
  const librarianProfile = join(outputRoot, "librarian-profile");
  for (const path of [cliBundle, libraryAgent, librarianProfile])
    mkdirSync(path);

  copy(
    join(root, "skills_builtin/zotero-bridge-cli"),
    join(cliBundle, "skills/zotero-bridge-cli"),
  );
  copy(
    join(root, "skills_src/zotero-bridge-cli/README.md"),
    join(cliBundle, "README.md"),
  );
  copy(
    join(root, "cli/zotero-bridge/scripts/install.ps1"),
    join(cliBundle, "install.ps1"),
  );
  copy(
    join(root, "cli/zotero-bridge/scripts/install.sh"),
    join(cliBundle, "install.sh"),
  );
  copy(
    join(root, "cli/zotero-bridge/release.json"),
    join(cliBundle, "cli-release.json"),
  );
  copyBinaries(root, releaseSet, join(cliBundle, "bin"));
  writeManifest(
    join(cliBundle, "manifest.json"),
    commonManifest(releaseSet, "cliBundle"),
  );

  copy(
    join(root, "skills_builtin/zotero-library-agent"),
    join(libraryAgent, "skills/zotero-library-agent"),
  );
  copy(
    join(root, "skills_builtin/zotero-library-agent/README.md"),
    join(libraryAgent, "README.md"),
  );
  copy(
    join(root, "skills_builtin/zotero-bridge-cli"),
    join(libraryAgent, "skills/zotero-bridge-cli"),
  );
  copy(
    join(root, "cli/zotero-bridge/scripts/install.ps1"),
    join(libraryAgent, "install.ps1"),
  );
  copy(
    join(root, "cli/zotero-bridge/scripts/install.sh"),
    join(libraryAgent, "install.sh"),
  );
  copy(
    join(root, "cli/zotero-bridge/release.json"),
    join(libraryAgent, "cli-release.json"),
  );
  copyBinaries(root, releaseSet, join(libraryAgent, "bin"));
  writeManifest(
    join(libraryAgent, "manifest.json"),
    commonManifest(releaseSet, "libraryAgent"),
  );

  for (const entry of readdirSync(
    join(root, "profiles/hermes/zotero-librarian"),
  )) {
    copy(
      join(root, "profiles/hermes/zotero-librarian", entry),
      join(librarianProfile, entry),
    );
  }
  copyBinaries(
    root,
    releaseSet,
    join(librarianProfile, "assets/zotero-bridge/bin"),
  );
  copy(
    join(root, "cli/zotero-bridge/release.json"),
    join(librarianProfile, "cli-release.json"),
  );
  writeManifest(
    join(librarianProfile, "manifest.json"),
    commonManifest(releaseSet, "librarianProfile"),
  );

  return {
    schema: "host-bridge.materialization.v1" as const,
    releaseSetId: releaseSet.releaseSetId,
    outputRoot,
    surfaces: [
      { name: "cliBundle", path: cliBundle },
      { name: "libraryAgent", path: libraryAgent },
      { name: "librarianProfile", path: librarianProfile },
    ],
  };
}

const outputRoot = arg("output-root");
if (outputRoot) {
  process.stdout.write(
    `${JSON.stringify(materializeHostBridgeSurfaces({ outputRoot }), null, 2)}\n`,
  );
}
