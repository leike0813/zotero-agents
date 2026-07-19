import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SYNTHESIS_CONCEPT_KB_ALIAS_MAX,
  SYNTHESIS_CONCEPT_KB_CONCEPT_MAX,
  SYNTHESIS_CONCEPT_KB_CONTRACT_VERSION,
  SYNTHESIS_CONCEPT_KB_INDEX_VERSION,
  SYNTHESIS_CONCEPT_KB_QUERY_LABEL_MAX,
  SYNTHESIS_CONCEPT_KB_QUERY_VERSION,
  SYNTHESIS_CONCEPT_KB_SENSE_MAX,
  rebuildSynthesisConceptKbIndexRequest,
  rebuildSynthesisConceptKbQueryRequest,
  type SynthesisConceptKbIndexRequest,
  type SynthesisConceptKbQueryRequest,
} from "../packages/synthesis-engine/src/conceptKbIndex.js";
import {
  SYNTHESIS_TAG_VOCABULARY_ABBREV_MAX,
  SYNTHESIS_TAG_VOCABULARY_CONTRACT_VERSION,
  SYNTHESIS_TAG_VOCABULARY_ENTRY_MAX,
  SYNTHESIS_TAG_VOCABULARY_FACET_MAX,
  SYNTHESIS_TAG_VOCABULARY_GLOBAL_ALIAS_MAX,
  SYNTHESIS_TAG_VOCABULARY_INDEX_VERSION,
  SYNTHESIS_TAG_VOCABULARY_VALIDATION_VERSION,
  rebuildSynthesisTagVocabularyIndexRequest,
  rebuildSynthesisTagVocabularyValidationRequest,
  type SynthesisTagVocabularyIndexRequest,
  type SynthesisTagVocabularyValidationRequest,
} from "../packages/synthesis-engine/src/tagVocabulary.js";
import {
  SYNTHESIS_TOPIC_GRAPH_INDEX_ALGORITHM_VERSION,
  SYNTHESIS_TOPIC_GRAPH_INDEX_CONTRACT_VERSION,
  SYNTHESIS_TOPIC_GRAPH_INDEX_EDGE_MAX,
  SYNTHESIS_TOPIC_GRAPH_INDEX_NODE_MAX,
  rebuildSynthesisTopicGraphIndexRequest,
  type SynthesisTopicGraphIndexRequest,
} from "../packages/synthesis-engine/src/topicGraphIndex.js";
import { createSynthesisSidecarComputeWorkerPool } from "../apps/synthesis-service/src/computeWorkerPool.js";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = fileURLToPath(new URL("../", import.meta.url));
const MAX_ELAPSED_MS = 5_000;
const MAX_WORKER_RSS_BYTES = 256 * 1024 * 1024;
const MAX_COMPRESSED_CANDIDATE_BYTES = 15 * 1024 * 1024;
const DEFAULT_RUNS = 3;

const OPERATIONS = [
  "tag_vocabulary_validate.v1",
  "tag_vocabulary_index.v1",
  "concept_kb_index.v1",
  "concept_kb_query.v1",
  "topic_graph_index.v1",
] as const;

type Operation = (typeof OPERATIONS)[number];
type BuildProfile = "debug" | "release";

type CliOptions = {
  binary: string;
  buildProfile: BuildProfile;
  candidate?: string;
  child: boolean;
  operation?: Operation;
  runs: number;
  scale: number;
  skipCandidate: boolean;
};

type ProfileCounts = Record<string, number>;

type ChildReport = {
  operation: Operation;
  counts: ProfileCounts;
  elapsedMs: number;
  workerPeakRssBytes: number;
};

function fail(message: string): never {
  throw new Error(message);
}

function argumentValue(argv: string[], index: number, name: string) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    fail(`Missing value for ${name}`);
  }
  return value;
}

function parsePositiveInteger(value: string, name: string) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    fail(`${name} must be a positive integer`);
  }
  return parsed;
}

function parseScale(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1) {
    fail("--scale must be greater than zero and no greater than one");
  }
  return parsed;
}

function parseOperation(value: string): Operation {
  if (!OPERATIONS.includes(value as Operation)) {
    fail(`Unknown operation: ${value}`);
  }
  return value as Operation;
}

function parseArgs(argv: string[]): CliOptions {
  let buildProfile: BuildProfile = "debug";
  let binary: string | undefined;
  let candidate: string | undefined;
  let child = false;
  let operation: Operation | undefined;
  let runs = DEFAULT_RUNS;
  let scale = 1;
  let skipCandidate = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "--binary":
        binary = argumentValue(argv, index, arg);
        index += 1;
        break;
      case "--candidate":
        candidate = argumentValue(argv, index, arg);
        index += 1;
        break;
      case "--child":
        child = true;
        break;
      case "--operation":
        operation = parseOperation(argumentValue(argv, index, arg));
        index += 1;
        break;
      case "--profile": {
        const value = argumentValue(argv, index, arg);
        if (value !== "debug" && value !== "release") {
          fail("--profile must be debug or release");
        }
        buildProfile = value;
        index += 1;
        break;
      }
      case "--runs":
        runs = parsePositiveInteger(argumentValue(argv, index, arg), arg);
        index += 1;
        break;
      case "--scale":
        scale = parseScale(argumentValue(argv, index, arg));
        index += 1;
        break;
      case "--skip-candidate":
        skipCandidate = true;
        break;
      default:
        fail(`Unknown argument: ${arg}`);
    }
  }

  if (candidate && skipCandidate) {
    fail("--candidate and --skip-candidate cannot be used together");
  }
  if (skipCandidate && scale === 1) {
    fail("--skip-candidate is permitted only for a reduced --scale self-check");
  }
  if (child && !operation) {
    fail("Internal child invocation requires --operation");
  }

  const executable = process.platform === "win32" ? ".exe" : "";
  return {
    binary: path.resolve(
      binary ||
        path.join(
          PROJECT_ROOT,
          "native/synthesis-sidecar/target",
          buildProfile,
          `synthesis-sidecar${executable}`,
        ),
    ),
    buildProfile,
    candidate: candidate ? path.resolve(candidate) : undefined,
    child,
    operation,
    runs,
    scale,
    skipCandidate,
  };
}

function scaled(maximum: number, scale: number) {
  return Math.max(1, Math.floor(maximum * scale));
}

function padded(index: number, width = 6) {
  return String(index).padStart(width, "0");
}

function alphabetic(index: number) {
  let value = index;
  let encoded = "";
  do {
    encoded = String.fromCharCode(97 + (value % 26)) + encoded;
    value = Math.floor(value / 26) - 1;
  } while (value >= 0);
  return `a${encoded}`;
}

function tagSource(scale: number) {
  const entryCount = scaled(SYNTHESIS_TAG_VOCABULARY_ENTRY_MAX, scale);
  const aliasCount = scaled(SYNTHESIS_TAG_VOCABULARY_GLOBAL_ALIAS_MAX, scale);
  const abbrevCount = scaled(SYNTHESIS_TAG_VOCABULARY_ABBREV_MAX, scale);
  const facetCount = scaled(SYNTHESIS_TAG_VOCABULARY_FACET_MAX, scale);
  const facets = Array.from(
    { length: facetCount },
    (_, index) => `facet_${padded(index, 3)}`,
  );
  const aliases: Record<string, string> = {};
  const abbrev: Record<string, string> = {};
  const entryAliases = Array.from({ length: entryCount }, () => [] as string[]);
  const entryAbbrev = Array.from({ length: entryCount }, () => [] as string[]);

  for (let index = 0; index < aliasCount; index += 1) {
    const entryIndex = index % entryCount;
    const alias = `alias_${padded(index)}`;
    aliases[alias] =
      `${facets[entryIndex % facetCount]}:tag_${padded(entryIndex)}`;
    entryAliases[entryIndex].push(alias);
  }
  for (let index = 0; index < abbrevCount; index += 1) {
    const entryIndex = index % entryCount;
    const lower = alphabetic(index);
    const upper = `A${padded(index)}`;
    abbrev[lower] = upper;
    entryAbbrev[entryIndex].push(upper);
  }

  return {
    entries: Array.from({ length: entryCount }, (_, index) => ({
      tag: `${facets[index % facetCount]}:tag_${padded(index)}`,
      facet: facets[index % facetCount],
      aliases: entryAliases[index],
      abbrev: entryAbbrev[index],
    })),
    aliases,
    abbrev,
    protocol: {
      version: "1.0.0",
      tagPattern: "^[a-z0-9_]+:[a-z0-9_]+$",
      maxTagLength: 120,
      facets,
    },
    counts: { entryCount, aliasCount, abbrevCount, facetCount },
  };
}

function conceptSource(scale: number) {
  const conceptCount = scaled(SYNTHESIS_CONCEPT_KB_CONCEPT_MAX, scale);
  const senseCount = scaled(SYNTHESIS_CONCEPT_KB_SENSE_MAX, scale);
  const aliasCount = scaled(SYNTHESIS_CONCEPT_KB_ALIAS_MAX, scale);
  const concepts = Array.from({ length: conceptCount }, (_, index) => ({
    conceptId: `concept:${padded(index)}`,
    label: `Label ${padded(index)}`,
    aliases: [] as string[],
    conceptType: `type_${index % 8}`,
    domain: `domain_${index % 16}`,
    status: "active" as const,
  }));
  const senses = Array.from({ length: senseCount }, (_, index) => ({
    senseId: `sense:${padded(index, 7)}`,
    conceptId: concepts[index % conceptCount].conceptId,
    label: `Sense ${padded(index, 7)}`,
    confidence: (["high", "medium", "low"] as const)[index % 3],
  }));
  const aliases = Array.from({ length: aliasCount }, (_, index) => ({
    aliasId: `alias:${padded(index, 7)}`,
    alias: `Alias ${padded(index, 7)}`,
    normalized: `alias ${padded(index, 7)}`,
    conceptId: concepts[index % conceptCount].conceptId,
    senseId: senses[index % senseCount].senseId,
    status: "active" as const,
    confidence: (["high", "medium", "low"] as const)[index % 3],
  }));
  return {
    concepts,
    senses,
    aliases,
    counts: { conceptCount, senseCount, aliasCount },
  };
}

function topicSource(scale: number) {
  const nodeCount = scaled(SYNTHESIS_TOPIC_GRAPH_INDEX_NODE_MAX, scale);
  const edgeCount = scaled(SYNTHESIS_TOPIC_GRAPH_INDEX_EDGE_MAX, scale);
  const nodes = Array.from({ length: nodeCount }, (_, index) => ({
    topicId: `topic:${padded(index)}`,
    isRoot: index === 0,
    level: index === 0 ? ("top" as const) : ("normal" as const),
    definitionStatus:
      index === 0 ? ("has_synthesis" as const) : ("placeholder" as const),
  }));
  const edges = Array.from({ length: edgeCount }, (_, index) => ({
    edgeId: `edge:${padded(index, 7)}`,
    sourceTopicId: nodes[index % nodeCount].topicId,
    targetTopicId: nodes[(index + 1) % nodeCount].topicId,
    relation: "related_to" as const,
    status: "confirmed" as const,
  }));
  return { nodes, edges, counts: { nodeCount, edgeCount } };
}

function requestFor(operation: Operation, scale: number) {
  if (operation.startsWith("tag_vocabulary_")) {
    const source = tagSource(scale);
    const common = {
      contractVersion: SYNTHESIS_TAG_VOCABULARY_CONTRACT_VERSION,
      entries: source.entries,
      aliases: source.aliases,
      abbrev: source.abbrev,
      protocol: source.protocol,
    };
    if (operation === "tag_vocabulary_validate.v1") {
      return {
        counts: source.counts,
        request: rebuildSynthesisTagVocabularyValidationRequest({
          ...common,
          algorithmVersion: SYNTHESIS_TAG_VOCABULARY_VALIDATION_VERSION,
        }),
      };
    }
    return {
      counts: source.counts,
      request: rebuildSynthesisTagVocabularyIndexRequest({
        ...common,
        algorithmVersion: SYNTHESIS_TAG_VOCABULARY_INDEX_VERSION,
        sourceManifestHash: `sha256:${"a".repeat(64)}`,
        rebuiltAt: "2026-07-19T00:00:00.000Z",
      }),
    };
  }

  if (operation.startsWith("concept_kb_")) {
    const source = conceptSource(scale);
    const common = {
      contractVersion: SYNTHESIS_CONCEPT_KB_CONTRACT_VERSION,
      concepts: source.concepts,
      senses: source.senses,
      aliases: source.aliases,
    };
    if (operation === "concept_kb_index.v1") {
      return {
        counts: source.counts,
        request: rebuildSynthesisConceptKbIndexRequest({
          ...common,
          algorithmVersion: SYNTHESIS_CONCEPT_KB_INDEX_VERSION,
          sourceManifestHash: `sha256:${"b".repeat(64)}`,
          rebuiltAt: "2026-07-19T00:00:00.000Z",
        }),
      };
    }
    const labelCount = scaled(SYNTHESIS_CONCEPT_KB_QUERY_LABEL_MAX, scale);
    return {
      counts: { ...source.counts, labelCount },
      request: rebuildSynthesisConceptKbQueryRequest({
        ...common,
        algorithmVersion: SYNTHESIS_CONCEPT_KB_QUERY_VERSION,
        labels: Array.from(
          { length: labelCount },
          (_, index) => source.concepts[index % source.concepts.length].label,
        ),
      }),
    };
  }

  const source = topicSource(scale);
  return {
    counts: source.counts,
    request: rebuildSynthesisTopicGraphIndexRequest({
      contractVersion: SYNTHESIS_TOPIC_GRAPH_INDEX_CONTRACT_VERSION,
      algorithmVersion: SYNTHESIS_TOPIC_GRAPH_INDEX_ALGORITHM_VERSION,
      sourceManifestHash: `sha256:${"c".repeat(64)}`,
      rebuiltAt: "2026-07-19T00:00:00.000Z",
      nodes: source.nodes,
      edges: source.edges,
    }),
  };
}

async function directChildPids(pid: number) {
  const children = await fs.readFile(
    `/proc/${pid}/task/${pid}/children`,
    "utf8",
  );
  return children
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .map((value) => Number(value));
}

async function rustWorkerPeakRss(binary: string) {
  const expected = await fs.realpath(binary);
  const pids = await directChildPids(process.pid);
  for (const pid of pids) {
    try {
      const executable = await fs.realpath(`/proc/${pid}/exe`);
      if (executable !== expected) continue;
      const cmdline = await fs.readFile(`/proc/${pid}/cmdline`, "utf8");
      if (!cmdline.split("\0").includes("worker")) continue;
      const status = await fs.readFile(`/proc/${pid}/status`, "utf8");
      const match = /^VmHWM:\s+(\d+)\s+kB$/mu.exec(status);
      if (!match) fail(`Rust worker ${pid} did not expose VmHWM`);
      return Number(match[1]) * 1024;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT" && code !== "ESRCH") throw error;
    }
  }
  fail(`Unable to identify the Rust worker child for ${expected}`);
}

async function runChild(options: CliOptions) {
  const operation = options.operation as Operation;
  const { counts, request } = requestFor(operation, options.scale);
  const pool = createSynthesisSidecarComputeWorkerPool({
    rustWorkerPath: options.binary,
    executionTimeoutMs: MAX_ELAPSED_MS,
  });
  try {
    const startedAt = performance.now();
    switch (operation) {
      case "tag_vocabulary_validate.v1":
        await pool.runTagVocabularyValidation(
          request as SynthesisTagVocabularyValidationRequest,
        );
        break;
      case "tag_vocabulary_index.v1":
        await pool.runTagVocabularyIndex(
          request as SynthesisTagVocabularyIndexRequest,
        );
        break;
      case "concept_kb_index.v1":
        await pool.runConceptKbIndex(request as SynthesisConceptKbIndexRequest);
        break;
      case "concept_kb_query.v1":
        await pool.runConceptKbQuery(request as SynthesisConceptKbQueryRequest);
        break;
      case "topic_graph_index.v1":
        await pool.runTopicGraphIndex(
          request as SynthesisTopicGraphIndexRequest,
        );
        break;
    }
    const elapsedMs = performance.now() - startedAt;
    const report: ChildReport = {
      operation,
      counts,
      elapsedMs,
      workerPeakRssBytes: await rustWorkerPeakRss(options.binary),
    };
    process.stdout.write(`${JSON.stringify(report)}\n`);
  } finally {
    await pool.shutdown();
  }
}

async function verifyBinary(binary: string) {
  const stat = await fs.stat(binary).catch(() => undefined);
  if (!stat?.isFile()) {
    fail(
      `Rust sidecar binary is missing: ${binary}. Build it with npm run build:synthesis-rust-sidecar or cargo --release before benchmarking.`,
    );
  }
}

async function verifyCandidate(options: CliOptions) {
  if (options.skipCandidate) {
    return { status: "skipped_reduced_profile" as const };
  }
  if (!options.candidate) {
    fail(
      "Missing compressed candidate. Pass --candidate <path-to-synthesis-rust-sidecar-*.tar.gz>; use --skip-candidate only with a reduced --scale self-check.",
    );
  }
  if (!options.candidate.endsWith(".tar.gz")) {
    fail("--candidate must point to a .tar.gz compressed candidate");
  }
  const stat = await fs.stat(options.candidate).catch(() => undefined);
  if (!stat?.isFile()) {
    fail(`Compressed candidate is missing: ${options.candidate}`);
  }
  if (stat.size >= MAX_COMPRESSED_CANDIDATE_BYTES) {
    fail(
      `Compressed candidate must be below 15 MiB; received ${stat.size} bytes`,
    );
  }
  return {
    status: "passed" as const,
    path: options.candidate,
    bytes: stat.size,
  };
}

async function independentRun(options: CliOptions, operation: Operation) {
  const args = [
    ...process.execArgv,
    SCRIPT_PATH,
    "--child",
    "--operation",
    operation,
    "--binary",
    options.binary,
    "--profile",
    options.buildProfile,
    "--scale",
    String(options.scale),
    "--runs",
    "1",
  ];
  const child = spawn(process.execPath, args, {
    cwd: PROJECT_ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout += String(chunk);
  });
  child.stderr.on("data", (chunk) => {
    stderr = `${stderr}${String(chunk)}`.slice(-8192);
  });
  const exitCode = await new Promise<number | null>((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", resolve);
  });
  if (exitCode !== 0) {
    fail(
      `Independent ${operation} run exited with ${exitCode}: ${stderr.trim()}`,
    );
  }
  const line = stdout.trim().split(/\r?\n/u).at(-1);
  if (!line) fail(`Independent ${operation} run produced no report`);
  return JSON.parse(line) as ChildReport;
}

async function runParent(options: CliOptions) {
  if (process.platform !== "linux") {
    fail(
      "This benchmark requires Linux /proc so Rust worker VmHWM is measured rather than estimated; no unsupported-platform fallback is allowed.",
    );
  }
  await verifyBinary(options.binary);
  const candidate = await verifyCandidate(options);
  const profiles = [];
  for (const operation of OPERATIONS) {
    const runs: ChildReport[] = [];
    for (let run = 1; run <= options.runs; run += 1) {
      process.stderr.write(
        `[synthesis-rust-benchmark] ${operation} run ${run}/${options.runs}\n`,
      );
      const report = await independentRun(options, operation);
      if (report.elapsedMs >= MAX_ELAPSED_MS) {
        fail(
          `${operation} run ${run} exceeded the 5 second gate: ${report.elapsedMs.toFixed(2)} ms`,
        );
      }
      if (report.workerPeakRssBytes >= MAX_WORKER_RSS_BYTES) {
        fail(
          `${operation} run ${run} exceeded the 256 MiB worker RSS gate: ${report.workerPeakRssBytes} bytes`,
        );
      }
      runs.push(report);
    }
    profiles.push({ operation, counts: runs[0].counts, runs });
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        schema: "synthesis-rust-deterministic-kernel-benchmark.v1",
        gateQualified:
          options.scale === 1 &&
          options.runs === DEFAULT_RUNS &&
          candidate.status === "passed",
        binary: options.binary,
        buildProfile: options.buildProfile,
        scale: options.scale,
        limits: {
          elapsedMsExclusive: MAX_ELAPSED_MS,
          workerPeakRssBytesExclusive: MAX_WORKER_RSS_BYTES,
          compressedCandidateBytesExclusive: MAX_COMPRESSED_CANDIDATE_BYTES,
        },
        candidate,
        profiles,
      },
      null,
      2,
    )}\n`,
  );
}

const options = parseArgs(process.argv.slice(2));
if (options.child) {
  await verifyBinary(options.binary);
  await runChild(options);
} else {
  await runParent(options);
}
