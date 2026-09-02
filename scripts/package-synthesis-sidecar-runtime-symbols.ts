import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import { SYNTHESIS_SIDECAR_RUNTIME_TARGET_TRIPLES } from "../packages/synthesis-contracts/src/sidecarRuntimeBundle";

export const SYNTHESIS_SIDECAR_RUNTIME_SYMBOL_MANIFEST_SCHEMA =
  "synthesis-sidecar-runtime-symbol-manifest.v1" as const;
const SYMBOL_ARCHIVE = "synthesis-sidecar.pdb.gz";
const MAX_SYMBOL_ARCHIVE_BYTES = 95 * 1024 * 1024;

function sha256(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

function hex(value: unknown, length: number, label: string) {
  const text = String(value || "")
    .trim()
    .toLowerCase();
  if (!new RegExp(`^[a-f0-9]{${length}}$`).test(text)) {
    throw new Error(`${label} must be ${length} hexadecimal characters`);
  }
  return text;
}

export type SynthesisSidecarRuntimeSymbolManifest = Readonly<{
  schema: typeof SYNTHESIS_SIDECAR_RUNTIME_SYMBOL_MANIFEST_SCHEMA;
  sourceCommit: string;
  sourceFingerprint: string;
  buildFingerprint: string;
  target: "win32-x64";
  targetTriple: string;
  executable: Readonly<{ sha256: string; bytes: number }>;
  pdb: Readonly<{ sha256: string; bytes: number }>;
  archive: Readonly<{
    file: typeof SYMBOL_ARCHIVE;
    compression: "gzip";
    sha256: string;
    bytes: number;
  }>;
}>;

export function rebuildSynthesisSidecarRuntimeSymbolManifest(
  value: unknown,
): SynthesisSidecarRuntimeSymbolManifest {
  const document = value as Record<string, unknown>;
  const executable = document?.executable as Record<string, unknown>;
  const pdb = document?.pdb as Record<string, unknown>;
  const archive = document?.archive as Record<string, unknown>;
  const manifest = {
    schema: document?.schema,
    sourceCommit: hex(document?.sourceCommit, 40, "sourceCommit"),
    sourceFingerprint: hex(
      document?.sourceFingerprint,
      64,
      "sourceFingerprint",
    ),
    buildFingerprint: hex(document?.buildFingerprint, 64, "buildFingerprint"),
    target: document?.target,
    targetTriple: document?.targetTriple,
    executable: {
      sha256: hex(executable?.sha256, 64, "executable.sha256"),
      bytes: Number(executable?.bytes),
    },
    pdb: {
      sha256: hex(pdb?.sha256, 64, "pdb.sha256"),
      bytes: Number(pdb?.bytes),
    },
    archive: {
      file: archive?.file,
      compression: archive?.compression,
      sha256: hex(archive?.sha256, 64, "archive.sha256"),
      bytes: Number(archive?.bytes),
    },
  };
  if (
    manifest.schema !== SYNTHESIS_SIDECAR_RUNTIME_SYMBOL_MANIFEST_SCHEMA ||
    manifest.target !== "win32-x64" ||
    manifest.targetTriple !==
      SYNTHESIS_SIDECAR_RUNTIME_TARGET_TRIPLES["win32-x64"] ||
    manifest.archive.file !== SYMBOL_ARCHIVE ||
    manifest.archive.compression !== "gzip" ||
    !Number.isSafeInteger(manifest.executable.bytes) ||
    manifest.executable.bytes <= 0 ||
    !Number.isSafeInteger(manifest.pdb.bytes) ||
    manifest.pdb.bytes <= 0 ||
    !Number.isSafeInteger(manifest.archive.bytes) ||
    manifest.archive.bytes <= 0 ||
    Object.keys(executable).sort().join(",") !== "bytes,sha256" ||
    Object.keys(pdb).sort().join(",") !== "bytes,sha256" ||
    Object.keys(archive).sort().join(",") !== "bytes,compression,file,sha256" ||
    Object.keys(document).sort().join(",") !==
      "archive,buildFingerprint,executable,pdb,schema,sourceCommit,sourceFingerprint,target,targetTriple"
  ) {
    throw new Error("Invalid synthesis sidecar symbol manifest");
  }
  return Object.freeze(manifest as SynthesisSidecarRuntimeSymbolManifest);
}

export async function packageSynthesisSidecarRuntimeSymbols(args: {
  sourceCommit: string;
  sourceFingerprint: string;
  buildFingerprint: string;
  executablePath: string;
  pdbPath: string;
  outputRoot: string;
}) {
  const [executable, pdb] = await Promise.all([
    fs.readFile(args.executablePath),
    fs.readFile(args.pdbPath),
  ]);
  const compressed = gzipSync(pdb, { level: 9 });
  if (compressed.byteLength > MAX_SYMBOL_ARCHIVE_BYTES) {
    throw new Error(
      `Compressed PDB exceeds the ${MAX_SYMBOL_ARCHIVE_BYTES}-byte Git storage gate`,
    );
  }
  const manifest = rebuildSynthesisSidecarRuntimeSymbolManifest({
    schema: SYNTHESIS_SIDECAR_RUNTIME_SYMBOL_MANIFEST_SCHEMA,
    sourceCommit: args.sourceCommit,
    sourceFingerprint: args.sourceFingerprint,
    buildFingerprint: args.buildFingerprint,
    target: "win32-x64",
    targetTriple: SYNTHESIS_SIDECAR_RUNTIME_TARGET_TRIPLES["win32-x64"],
    executable: { sha256: sha256(executable), bytes: executable.byteLength },
    pdb: { sha256: sha256(pdb), bytes: pdb.byteLength },
    archive: {
      file: SYMBOL_ARCHIVE,
      compression: "gzip",
      sha256: sha256(compressed),
      bytes: compressed.byteLength,
    },
  });
  await fs.mkdir(args.outputRoot, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(args.outputRoot, SYMBOL_ARCHIVE), compressed),
    fs.writeFile(
      path.join(args.outputRoot, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
    ),
  ]);
  return manifest;
}

function option(name: string) {
  const prefix = `--${name}=`;
  return process.argv
    .find((value) => value.startsWith(prefix))
    ?.slice(prefix.length);
}

async function main() {
  const required = (name: string) => {
    const value = option(name)?.trim();
    if (!value) throw new Error(`Missing required --${name}=...`);
    return value;
  };
  await packageSynthesisSidecarRuntimeSymbols({
    sourceCommit: required("source-commit"),
    sourceFingerprint: required("source-fingerprint"),
    buildFingerprint: required("build-fingerprint"),
    executablePath: path.resolve(required("executable")),
    pdbPath: path.resolve(required("pdb")),
    outputRoot: path.resolve(required("output")),
  });
}

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
