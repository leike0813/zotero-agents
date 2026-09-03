import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SYNTHESIS_SIDECAR_RUNTIME_TARGETS,
  type SynthesisSidecarRuntimeTarget,
} from "../packages/synthesis-contracts/src/sidecarRuntimeBundle";
import {
  SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_BRANCH,
  SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_RESULT_SCHEMA,
  assertSynthesisSidecarRuntimePrebuildResultSet,
  rebuildSynthesisSidecarRuntimePrebuildResult,
  rebuildSynthesisSidecarRuntimePrebuildSet,
  type SynthesisSidecarRuntimeTargetEvidence,
} from "../packages/synthesis-contracts/src/sidecarRuntimeRelease";
import { sha256File } from "./synthesis-sidecar-runtime-release-governance";
import { stageSynthesisSidecarRuntimePrebuildArchives } from "./stage-synthesis-sidecar-runtime-prebuilds";
import { rebuildSynthesisSidecarRuntimeSymbolManifest } from "./package-synthesis-sidecar-runtime-symbols";

const MAX_PUBLISH_ATTEMPTS = 3;

function runGit(cwd: string, args: string[], allowFailure = false) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: "0",
    },
  });
  if (!allowFailure && (result.error || result.status !== 0)) {
    throw result.error || new Error(`git ${args[0]} failed`);
  }
  return result;
}

type ImmutableFileDigest = Readonly<{
  file: string;
  sha256: string;
}>;

type ExistingSetComparison = {
  candidate: string;
  store: string;
  candidateFiles: readonly ImmutableFileDigest[];
  existingFiles: readonly ImmutableFileDigest[];
};

type ExistingSetEquivalence = (
  args: ExistingSetComparison,
) => boolean | Promise<boolean>;

async function exactFiles(root: string) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  if (entries.some((entry) => !entry.isFile() || entry.isSymbolicLink())) {
    throw new Error("Immutable prebuild set contains an unexpected entry");
  }
  return Promise.all(
    entries
      .map((entry) => entry.name)
      .sort()
      .map(async (file) => ({
        file,
        sha256: await sha256File(path.join(root, file)),
      })),
  );
}

async function copyOrVerifySet(
  candidate: string,
  store: string,
  equivalentExisting?: ExistingSetEquivalence,
) {
  const existing = await fs.stat(store).catch(() => null);
  if (existing) {
    const [candidateFiles, existingFiles] = await Promise.all([
      exactFiles(candidate),
      exactFiles(store),
    ]);
    const exactMatch =
      JSON.stringify(candidateFiles) === JSON.stringify(existingFiles);
    const equivalentMatch =
      !exactMatch && equivalentExisting
        ? await equivalentExisting({
            candidate,
            store,
            candidateFiles,
            existingFiles,
          })
        : false;
    if (!exactMatch && !equivalentMatch) {
      throw new Error("Immutable prebuild set already exists with other bytes");
    }
    return false;
  }
  await fs.mkdir(path.dirname(store), { recursive: true });
  await fs.cp(candidate, store, { recursive: true, errorOnExist: true });
  return true;
}

async function equivalentSymbolSet({
  candidate,
  store,
  candidateFiles,
  existingFiles,
}: ExistingSetComparison) {
  const withoutManifest = (files: readonly ImmutableFileDigest[]) =>
    files.filter(({ file }) => file !== "manifest.json");
  if (
    JSON.stringify(withoutManifest(candidateFiles)) !==
    JSON.stringify(withoutManifest(existingFiles))
  ) {
    return false;
  }
  const [candidateManifest, existingManifest] = await Promise.all([
    fs.readFile(path.join(candidate, "manifest.json"), "utf8"),
    fs.readFile(path.join(store, "manifest.json"), "utf8"),
  ]);
  const { sourceCommit: _candidateSourceCommit, ...candidateIdentity } =
    rebuildSynthesisSidecarRuntimeSymbolManifest(JSON.parse(candidateManifest));
  const { sourceCommit: _existingSourceCommit, ...existingIdentity } =
    rebuildSynthesisSidecarRuntimeSymbolManifest(JSON.parse(existingManifest));
  return JSON.stringify(candidateIdentity) === JSON.stringify(existingIdentity);
}

async function readTargetEvidence(args: {
  evidenceRoot: string;
  runId: number;
  sourceSha: string;
}) {
  const entries = await fs.readdir(args.evidenceRoot, {
    withFileTypes: true,
  });
  const expected = SYNTHESIS_SIDECAR_RUNTIME_TARGETS.map(
    (target) => `${target}.json`,
  ).sort();
  const actual = entries.map((entry) => entry.name).sort();
  if (
    entries.some((entry) => !entry.isFile() || entry.isSymbolicLink()) ||
    JSON.stringify(actual) !== JSON.stringify(expected)
  ) {
    throw new Error("Target evidence must contain exactly seven JSON files");
  }
  return Object.fromEntries(
    await Promise.all(
      SYNTHESIS_SIDECAR_RUNTIME_TARGETS.map(async (target) => {
        const value = JSON.parse(
          await fs.readFile(
            path.join(args.evidenceRoot, `${target}.json`),
            "utf8",
          ),
        ) as Record<string, unknown>;
        if (value.target !== target) {
          throw new Error(`Target evidence identity mismatch: ${target}`);
        }
        const { target: _target, ...evidence } = value;
        return [target, evidence] as const;
      }),
    ),
  ) as Record<
    SynthesisSidecarRuntimeTarget,
    SynthesisSidecarRuntimeTargetEvidence
  >;
}

function defaultRemote(repository: string) {
  const token = process.env.GH_TOKEN?.trim();
  return token
    ? `https://x-access-token:${token}@github.com/${repository}.git`
    : `https://github.com/${repository}.git`;
}

export async function publishImmutableSynthesisSidecarRuntimeSet(args: {
  remote: string;
  temporaryRoot: string;
  candidateSet: string;
  aggregate: string;
  candidateSymbols?: string;
  buildFingerprint?: string;
}) {
  for (let attempt = 1; attempt <= MAX_PUBLISH_ATTEMPTS; attempt += 1) {
    const store = path.join(args.temporaryRoot, `store-${attempt}`);
    const branchExists =
      runGit(
        args.temporaryRoot,
        [
          "ls-remote",
          "--exit-code",
          "--heads",
          args.remote,
          SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_BRANCH,
        ],
        true,
      ).status === 0;
    if (branchExists) {
      runGit(args.temporaryRoot, [
        "clone",
        "--single-branch",
        "--branch",
        SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_BRANCH,
        args.remote,
        store,
      ]);
    } else {
      await fs.mkdir(store, { recursive: true });
      runGit(store, ["init"]);
      runGit(store, [
        "checkout",
        "--orphan",
        SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_BRANCH,
      ]);
      runGit(store, ["remote", "add", "origin", args.remote]);
    }
    const setChanged = await copyOrVerifySet(
      args.candidateSet,
      path.join(store, "sets", args.aggregate),
    );
    const symbolsChanged =
      args.candidateSymbols && args.buildFingerprint
        ? await copyOrVerifySet(
            args.candidateSymbols,
            path.join(store, "symbols", args.buildFingerprint, "win32-x64"),
            equivalentSymbolSet,
          )
        : false;
    if (setChanged || symbolsChanged) {
      const paths = [`sets/${args.aggregate}`];
      if (symbolsChanged) {
        paths.push(`symbols/${args.buildFingerprint}/win32-x64`);
      }
      runGit(store, ["add", ...paths]);
      runGit(store, [
        "-c",
        "user.name=github-actions[bot]",
        "-c",
        "user.email=41898282+github-actions[bot]@users.noreply.github.com",
        "commit",
        "-m",
        `Synthesis sidecar prebuild ${args.aggregate}`,
      ]);
      const pushed = runGit(
        store,
        [
          "push",
          "origin",
          `HEAD:refs/heads/${SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_BRANCH}`,
        ],
        true,
      );
      if (pushed.status !== 0) {
        if (attempt === MAX_PUBLISH_ATTEMPTS) {
          throw new Error(
            "Prebuild branch advanced during every publish attempt",
          );
        }
        continue;
      }
    }
    return runGit(store, ["rev-parse", "HEAD"]).stdout.trim();
  }
  throw new Error("Prebuild publication exhausted its retry bound");
}

export async function publishSynthesisSidecarRuntimePrebuild(args: {
  repository: string;
  sourceSha: string;
  requestId: string;
  runId: number;
  sourceFingerprint: string;
  buildFingerprint: string;
  prebuildPipelineRevision: string;
  archiveRoot: string;
  evidenceRoot: string;
  symbolRoot: string;
  outputPath?: string;
  remoteUrl?: string;
}) {
  const temporaryRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "synthesis-sidecar-prebuild-publish-"),
  );
  try {
    const candidateRoot = path.join(temporaryRoot, "candidate");
    const staged = await stageSynthesisSidecarRuntimePrebuildArchives({
      archiveRoot: args.archiveRoot,
      outputRoot: candidateRoot,
      buildFingerprint: args.buildFingerprint,
      sourceFingerprint: args.sourceFingerprint,
    });
    const set = rebuildSynthesisSidecarRuntimePrebuildSet(
      JSON.parse(
        await fs.readFile(
          path.join(staged.setDirectory, "manifest.json"),
          "utf8",
        ),
      ),
    );
    const evidence = await readTargetEvidence(args);
    for (const archive of set.archives) {
      evidence[archive.target] = {
        ...evidence[archive.target],
        archiveSha256: archive.sha256,
        archiveBytes: archive.bytes,
      };
    }
    const symbolManifest = rebuildSynthesisSidecarRuntimeSymbolManifest(
      JSON.parse(
        await fs.readFile(path.join(args.symbolRoot, "manifest.json"), "utf8"),
      ),
    );
    const symbolArchivePath = path.join(
      args.symbolRoot,
      symbolManifest.archive.file,
    );
    const symbolArchiveStat = await fs.stat(symbolArchivePath);
    if (
      symbolManifest.sourceFingerprint !== args.sourceFingerprint ||
      symbolManifest.buildFingerprint !== args.buildFingerprint ||
      symbolManifest.archive.sha256 !== (await sha256File(symbolArchivePath)) ||
      symbolManifest.archive.bytes !== symbolArchiveStat.size
    ) {
      throw new Error("Windows symbol artifact identity mismatch");
    }
    const prebuildCommit = await publishImmutableSynthesisSidecarRuntimeSet({
      remote: args.remoteUrl || defaultRemote(args.repository),
      temporaryRoot,
      candidateSet: staged.setDirectory,
      aggregate: staged.aggregate,
      candidateSymbols: args.symbolRoot,
      buildFingerprint: args.buildFingerprint,
    });
    const result = rebuildSynthesisSidecarRuntimePrebuildResult({
      schema: SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_RESULT_SCHEMA,
      repository: args.repository,
      workflow: "prebuild-synthesis-sidecar-runtime.yml",
      runId: args.runId,
      requestId: args.requestId,
      sourceSha: args.sourceSha,
      sourceFingerprint: args.sourceFingerprint,
      buildFingerprint: args.buildFingerprint,
      prebuildPipelineRevision: args.prebuildPipelineRevision,
      aggregate: staged.aggregate,
      prebuildBranch: SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_BRANCH,
      prebuildCommit,
      setPath: `sets/${staged.aggregate}`,
      targets: evidence,
    });
    assertSynthesisSidecarRuntimePrebuildResultSet(result, set);
    if (args.outputPath) {
      await fs.mkdir(path.dirname(args.outputPath), { recursive: true });
      await fs.writeFile(
        args.outputPath,
        `${JSON.stringify(result, null, 2)}\n`,
      );
    }
    return result;
  } finally {
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  }
}

function option(name: string) {
  const prefix = `--${name}=`;
  return process.argv
    .find((value) => value.startsWith(prefix))
    ?.slice(prefix.length);
}

function required(name: string) {
  const value = option(name)?.trim();
  if (!value) throw new Error(`Missing required --${name}=...`);
  return value;
}

function help() {
  process.stdout.write(
    "Usage: tsx scripts/publish-synthesis-sidecar-runtime-prebuild.ts --repo=<owner/name> --source-sha=<sha> --request-id=<id> --run-id=<id> --source-fingerprint=<sha256> --build-fingerprint=<sha256> --prebuild-pipeline-revision=<sha256> --archive-root=<path> --evidence-root=<path> --symbol-root=<path> --output=<path> [--remote-url=<url>]\n",
  );
}

async function main() {
  if (process.argv.includes("--help")) return help();
  const result = await publishSynthesisSidecarRuntimePrebuild({
    repository: required("repo"),
    sourceSha: required("source-sha"),
    requestId: required("request-id"),
    runId: Number(required("run-id")),
    sourceFingerprint: required("source-fingerprint"),
    buildFingerprint: required("build-fingerprint"),
    prebuildPipelineRevision: required("prebuild-pipeline-revision"),
    archiveRoot: path.resolve(required("archive-root")),
    evidenceRoot: path.resolve(required("evidence-root")),
    symbolRoot: path.resolve(required("symbol-root")),
    outputPath: path.resolve(required("output")),
    remoteUrl: option("remote-url"),
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
