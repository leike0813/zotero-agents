import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { PI_RUNTIME_VERSION } from "../src/config/piRuntimeBuild";
import {
  PI_PUBLIC_CATALOG_MAX_BYTES,
  PI_PUBLIC_CATALOG_TIMEOUT_MS,
  isPiCatalogVersionCompatible,
  normalizePiOfficialCatalog,
} from "../src/modules/piModelCatalogData";
import { piModelCatalogSeed } from "../src/config/piModelCatalogSeed";
import type { PiOfficialCatalogSnapshot } from "../src/shared/piProviderContract";

const execFileAsync = promisify(execFile);

/** Unauthenticated public supply, addressed with the actual runtime version. */
export const PI_OFFICIAL_CATALOG_ENDPOINT = "https://pi.dev/api/models";
const EXACT_VERSION = /^\d+\.\d+\.\d+$/;
const SEED_INPUT = "official-input.json";
const SEED_PROVENANCE = "provenance.json";
/** Official answers that are not a usable snapshot for the asked version. */
const STATUS: Record<number, [PiCatalogClassification, PiCatalogReason]> = {
  400: ["unsupported", "request_rejected"],
  401: ["unsupported", "request_rejected"],
  403: ["unsupported", "request_rejected"],
  404: ["incompatible", "no_compatible_catalog"],
  501: ["unsupported", "route_not_supported"],
};

/** Supply states are separated from transport states on purpose. */
export type PiCatalogClassification =
  | "compatible"
  | "incompatible"
  | "schema"
  | "unsupported"
  | "network";
export type PiCatalogReason =
  | "ok"
  | "no_compatible_catalog"
  | "incompatible_minimum_version"
  | "missing_revision_header"
  | "missing_minimum_version_header"
  | "invalid_payload"
  | "route_not_supported"
  | "request_rejected"
  | "unexpected_status"
  | "too_large"
  | "timeout"
  | "transport_error";
export type PiCatalogVerdict = {
  classification: PiCatalogClassification;
  reason: PiCatalogReason;
  httpStatus?: number;
  revision?: string;
  minimumPiVersion?: string;
  modelCount?: number;
  providerCount?: number;
};
/** One observed result: a monitored runtime version or a verified seed. */
export type PiCatalogResult = PiCatalogVerdict & {
  runtimeVersion: string;
  target?: "bundled" | "input" | "artifact";
  file?: string;
};
export type PiRuntimeVersion = {
  version: string;
  source: "release-tag-package" | "explicit" | "candidate-fallback";
  tag: string | null;
};
export type PiCatalogReport = {
  checkedAt: string;
  endpoint: string;
  candidateRuntimeVersion: string;
  releasedRuntime: PiRuntimeVersion;
  runtimes: PiCatalogResult[];
  summary: Record<"checked" | PiCatalogClassification, number>;
};
export type PiSeedProvenance = {
  url: string;
  runtimeVersion: string;
  revision: string;
  minimumPiVersion: string;
  input: string;
  capturedAt?: string;
};

/**
 * Monitoring and seed preparation compare actual runtime versions. A ranged or
 * guessed SDK version would silently check another supply tier.
 */
export function exactVersion(
  value: unknown,
  field = "runtime version",
): string {
  if (typeof value !== "string" || !EXACT_VERSION.test(value))
    throw new Error(`${field} must be an exact X.Y.Z Pi version`);
  return value;
}

export function piOfficialCatalogUrl(runtimeVersion: string): string {
  const version = exactVersion(runtimeVersion);
  return `${PI_OFFICIAL_CATALOG_ENDPOINT}?pi-version=${version}&types=chat,image,classifier`;
}

function counts(snapshot: PiOfficialCatalogSnapshot) {
  return {
    modelCount: snapshot.models.length,
    providerCount: new Set(snapshot.models.map((model) => model.provider)).size,
  };
}

function normalize(
  payload: unknown,
  identity: {
    revision: string;
    minimumPiVersion?: string;
    runtimeVersion: string;
  },
  source: "bundled" | "official",
) {
  return counts(normalizePiOfficialCatalog(payload, { ...identity, source }));
}

/**
 * Reads one runtime version's official public catalog through the shared
 * normalizer. Credentials are never attached and redirects are refused, so the
 * observed revision belongs to the version that was asked for. An empty catalog
 * is a valid successful snapshot.
 */
export async function checkOfficialPiCatalog(options: {
  runtimeVersion: string;
  fetchImpl?: (url: string, init: RequestInit) => Promise<Response>;
  timeoutMs?: number;
  maxBytes?: number;
}): Promise<PiCatalogResult> {
  const runtimeVersion = exactVersion(options.runtimeVersion);
  const maxBytes = options.maxBytes ?? PI_PUBLIC_CATALOG_MAX_BYTES;
  const controller = new AbortController();
  // The signal also bounds the body, so it stays armed until a verdict exists.
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? PI_PUBLIC_CATALOG_TIMEOUT_MS,
  );
  const finish = (
    classification: PiCatalogClassification,
    reason: PiCatalogReason,
    extra: Omit<PiCatalogVerdict, "classification" | "reason"> = {},
  ): PiCatalogResult => {
    clearTimeout(timer);
    return { runtimeVersion, classification, reason, ...extra };
  };
  let response: Response;
  try {
    response = await (options.fetchImpl ?? fetch)(
      piOfficialCatalogUrl(runtimeVersion),
      {
        redirect: "error",
        credentials: "omit",
        cache: "no-store",
        headers: {
          accept: "application/json",
          "user-agent": `pi/${runtimeVersion} (${process.platform}; node/${process.versions.node}; ${process.arch})`,
        },
        signal: controller.signal,
      },
    );
  } catch {
    const reason = controller.signal.aborted ? "timeout" : "transport_error";
    return finish("network", reason);
  }
  const official = STATUS[response.status];
  if (official)
    return finish(official[0], official[1], { httpStatus: response.status });
  if (!response.ok)
    return finish("network", "unexpected_status", {
      httpStatus: response.status,
    });
  const revision = (
    response.headers.get("x-pi-model-catalog-revision") || ""
  ).trim();
  const minimumPiVersion = (
    response.headers.get("x-pi-model-catalog-minimum-version") || ""
  ).trim();
  const identity = { httpStatus: 200, revision, minimumPiVersion };
  if (!revision || !minimumPiVersion)
    return finish(
      "schema",
      revision ? "missing_minimum_version_header" : "missing_revision_header",
    );
  if (!isPiCatalogVersionCompatible(minimumPiVersion, runtimeVersion))
    return finish("incompatible", "incompatible_minimum_version", identity);
  let raw: Buffer;
  try {
    raw = Buffer.from(await response.arrayBuffer());
  } catch {
    return finish("network", "transport_error", identity);
  }
  if (raw.byteLength > maxBytes)
    return finish("network", "too_large", identity);
  try {
    const snapshot = normalize(
      JSON.parse(raw.toString("utf8")),
      {
        revision,
        minimumPiVersion,
        runtimeVersion,
      },
      "official",
    );
    return finish("compatible", "ok", { ...identity, ...snapshot });
  } catch {
    return finish("schema", "invalid_payload", identity);
  }
}

/**
 * Checks each declared runtime version once. De-duplication keeps a version
 * that is both candidate and released from being reported twice.
 */
export async function runPiCatalogCompatibilityCheck(options: {
  runtimes: string[];
  candidateRuntimeVersion: string;
  releasedRuntime: PiRuntimeVersion;
  fetchImpl?: (url: string, init: RequestInit) => Promise<Response>;
}): Promise<PiCatalogReport> {
  const versions = [
    ...new Set(
      [...options.runtimes, options.releasedRuntime.version].map((version) =>
        exactVersion(version),
      ),
    ),
  ].sort();
  const runtimes: PiCatalogResult[] = [];
  for (const runtimeVersion of versions)
    runtimes.push(
      await checkOfficialPiCatalog({
        runtimeVersion,
        fetchImpl: options.fetchImpl,
      }),
    );
  const summary: PiCatalogReport["summary"] = {
    checked: runtimes.length,
    compatible: 0,
    incompatible: 0,
    schema: 0,
    unsupported: 0,
    network: 0,
  };
  for (const runtime of runtimes) summary[runtime.classification] += 1;
  return {
    checkedAt: new Date().toISOString(),
    endpoint: PI_OFFICIAL_CATALOG_ENDPOINT,
    candidateRuntimeVersion: exactVersion(
      options.candidateRuntimeVersion,
      "candidate runtime version",
    ),
    releasedRuntime: options.releasedRuntime,
    runtimes,
    summary,
  };
}

/**
 * A supply failure blocks monitoring; a transport failure is transient and is
 * reported separately so daily runs do not page on upstream downtime.
 */
export function piCatalogCheckExitCode(report: PiCatalogReport): number {
  const failures = report.runtimes.filter(
    (runtime) => runtime.classification !== "compatible",
  );
  if (!failures.length) return 0;
  return failures.some((runtime) => runtime.classification !== "network")
    ? 2
    : 3;
}

async function readGitText(args: string[]): Promise<string> {
  const result = await execFileAsync("git", args, {
    maxBuffer: 1024 * 1024,
    windowsHide: true,
  });
  return result.stdout || "";
}

/**
 * The released client runtime is read from the newest release tag that declares
 * an exact Pi SDK version. A tag without a catalog client leaves the candidate
 * manifest as the only honest version to check.
 */
export async function resolveReleasedRuntimeVersion(options: {
  explicit?: string;
  candidateRuntimeVersion: string;
  readGitText?: (args: string[]) => Promise<string>;
}): Promise<PiRuntimeVersion> {
  if (options.explicit)
    return {
      version: exactVersion(options.explicit, "released runtime version"),
      source: "explicit",
      tag: null,
    };
  const candidateRuntimeVersion = exactVersion(
    options.candidateRuntimeVersion,
    "candidate runtime version",
  );
  const read = options.readGitText ?? readGitText;
  const listed = await read(["tag", "--list", "--sort=-v:refname", "v*"]).catch(
    () => "",
  );
  for (const tag of listed
    .split("\n")
    .map((value) => value.trim())
    .filter((value) => EXACT_VERSION.test(value.slice(1)))) {
    const declared = await read(["show", `${tag}:package.json`])
      .then(
        (text) =>
          JSON.parse(text)?.dependencies?.["@earendil-works/pi-agent-core"],
      )
      .catch(() => null);
    if (typeof declared === "string" && EXACT_VERSION.test(declared))
      return { version: declared, source: "release-tag-package", tag };
  }
  return {
    version: candidateRuntimeVersion,
    source: "candidate-fallback",
    tag: null,
  };
}

function verifySeed(input: {
  target: PiCatalogResult["target"];
  payload: unknown;
  revision: string;
  minimumPiVersion?: string;
  runtimeVersion: string;
  file?: string;
}): PiCatalogResult {
  const identity = {
    target: input.target,
    runtimeVersion: input.runtimeVersion,
    revision: input.revision,
    minimumPiVersion: input.minimumPiVersion,
    file: input.file,
  };
  if (
    input.minimumPiVersion &&
    !isPiCatalogVersionCompatible(input.minimumPiVersion, input.runtimeVersion)
  )
    return {
      ...identity,
      classification: "incompatible",
      reason: "incompatible_minimum_version",
    };
  try {
    const snapshot = normalize(
      input.payload,
      {
        revision: input.revision,
        minimumPiVersion: input.minimumPiVersion,
        runtimeVersion: input.runtimeVersion,
      },
      input.target === "bundled" ? "bundled" : "official",
    );
    return {
      ...identity,
      classification: "compatible",
      reason: "ok",
      ...snapshot,
    };
  } catch {
    return { ...identity, classification: "schema", reason: "invalid_payload" };
  }
}

/**
 * Turns fixed official input into a reviewable artifact: the original bytes and
 * the provenance a reviewer needs. The output must be new, and adopting it into
 * the bundled seed stays a reviewed change.
 */
export async function preparePiCatalogSeedArtifact(options: {
  input: string;
  out: string;
  revision: string;
  minimumPiVersion: string;
  runtimeVersion: string;
  capturedAt?: string;
}): Promise<{ out: string; provenance: PiSeedProvenance }> {
  const runtimeVersion = exactVersion(options.runtimeVersion);
  if (!isPiCatalogVersionCompatible(options.minimumPiVersion, runtimeVersion))
    throw new Error(
      `Incompatible Pi runtime: ${options.minimumPiVersion} is not usable by ${runtimeVersion}`,
    );
  const raw = await fs.readFile(options.input);
  if (raw.byteLength > PI_PUBLIC_CATALOG_MAX_BYTES)
    throw new Error("official input exceeds the public catalog size bound");
  // The fixed input is read exactly as the runtime would read it.
  normalize(
    JSON.parse(raw.toString("utf8")),
    {
      revision: options.revision,
      minimumPiVersion: options.minimumPiVersion,
      runtimeVersion,
    },
    "official",
  );
  const out = path.resolve(options.out);
  await fs.mkdir(out, { recursive: false }).catch((error: Error) => {
    throw new Error(`${out} cannot be created: ${error.message}`);
  });
  const provenance: PiSeedProvenance = {
    url: piOfficialCatalogUrl(runtimeVersion),
    runtimeVersion,
    revision: options.revision,
    minimumPiVersion: options.minimumPiVersion,
    input: SEED_INPUT,
    capturedAt: options.capturedAt,
  };
  await fs.writeFile(path.join(out, SEED_INPUT), raw, { flag: "wx" });
  await fs.writeFile(
    path.join(out, SEED_PROVENANCE),
    `${JSON.stringify(provenance, null, 2)}\n`,
    { flag: "wx" },
  );
  return { out, provenance };
}

/**
 * Offline verification of the bundled seed, a prepared artifact or one
 * downloaded file. All three reach the same normalizer, and an empty catalog is
 * a valid snapshot there too.
 */
export async function checkPiCatalogSeedOffline(options: {
  input?: string;
  artifact?: string;
  revision?: string;
  minimumPiVersion?: string;
  runtimeVersion?: string;
}): Promise<PiCatalogResult> {
  const runtimeVersion = exactVersion(
    options.runtimeVersion ?? PI_RUNTIME_VERSION,
  );
  const readJson = async (file: string) =>
    JSON.parse(await fs.readFile(file, "utf8"));
  if (options.artifact) {
    const provenance = (await readJson(
      path.join(options.artifact, SEED_PROVENANCE),
    )) as PiSeedProvenance;
    return verifySeed({
      target: "artifact",
      payload: await readJson(path.join(options.artifact, SEED_INPUT)),
      revision: provenance.revision,
      minimumPiVersion: provenance.minimumPiVersion,
      runtimeVersion,
      file: path.join(options.artifact, SEED_INPUT),
    });
  }
  if (options.input) {
    if (!options.revision)
      throw new Error("--revision is required with --input");
    return verifySeed({
      target: "input",
      payload: await readJson(options.input),
      revision: options.revision,
      minimumPiVersion: options.minimumPiVersion,
      runtimeVersion,
      file: options.input,
    });
  }
  return verifySeed({
    target: "bundled",
    payload: piModelCatalogSeed.models,
    revision: piModelCatalogSeed.revision,
    minimumPiVersion: piModelCatalogSeed.minimumPiVersion,
    runtimeVersion,
  });
}

type Args = Map<string, string[]>;

function parseArgs(argv: string[]): Args {
  const args: Args = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const name = String(argv[index]).replace(/^--/, "");
    if (!argv[index]?.startsWith("--") || argv[index + 1] === undefined)
      throw new Error(`expected --<name> <value>, received ${argv[index]}`);
    args.set(name, [...(args.get(name) || []), argv[index + 1]]);
  }
  return args;
}
const value = (args: Args, name: string) => args.get(name)?.at(-1);
const required = (args: Args, name: string) => {
  const found = value(args, name);
  if (!found) throw new Error(`--${name} is required`);
  return found;
};

async function writeReport(args: Args, result: unknown) {
  const out = value(args, "out");
  if (out)
    await fs
      .writeFile(path.resolve(out), `${JSON.stringify(result, null, 2)}\n`, {
        flag: "wx",
      })
      .catch((error: Error) => {
        throw new Error(`${out} cannot be written: ${error.message}`);
      });
  console.log(JSON.stringify(result));
}

async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  const args = parseArgs(rest);
  if (command === "prepare-seed") {
    const artifact = await preparePiCatalogSeedArtifact({
      input: required(args, "input"),
      out: required(args, "out"),
      revision: required(args, "revision"),
      minimumPiVersion: required(args, "minimum-pi-version"),
      runtimeVersion: required(args, "runtime"),
      capturedAt: value(args, "captured-at"),
    });
    console.log(JSON.stringify(artifact));
    return 0;
  }
  if (command === "check-seed") {
    const result = await checkPiCatalogSeedOffline({
      input: value(args, "input"),
      artifact: value(args, "artifact"),
      revision: value(args, "revision"),
      minimumPiVersion: value(args, "minimum-pi-version"),
      runtimeVersion: value(args, "runtime"),
    });
    await writeReport(args, result);
    return result.classification === "compatible" ? 0 : 2;
  }
  if (command === "check") {
    const candidateRuntimeVersion = exactVersion(
      PI_RUNTIME_VERSION,
      "candidate runtime version from the source manifest",
    );
    const checked = await runPiCatalogCompatibilityCheck({
      runtimes: args.get("runtime") || [],
      candidateRuntimeVersion,
      releasedRuntime: await resolveReleasedRuntimeVersion({
        candidateRuntimeVersion,
        explicit: value(args, "released-runtime"),
      }),
    });
    await writeReport(args, checked);
    return piCatalogCheckExitCode(checked);
  }
  throw new Error(
    "usage: pi-model-catalog <check|check-seed|prepare-seed> [--name value ...]",
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href)
  void main(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (error: Error) => {
      console.error(`pi_model_catalog_input_failed: ${error.message}`);
      process.exitCode = 1;
    },
  );
