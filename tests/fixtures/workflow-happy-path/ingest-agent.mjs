import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

// Wholly synthetic peer for literature-search-ingest. Every bibliographic value
// is invented; the only real facts come from the Host Bridge CLI mutation.
// Structure follows the reviewed successful run in the private workflow-e2e
// evidence (ledger fields, receipt binding, truthfulness rules), not its content.
const SKILL_ID = "literature-search-ingest";
const DEFAULT_INTENT = "Synthetic offline ingestion";
const CANDIDATE_ID = "candidate-0001";
const PAPER_TITLE = "Synthetic offline ingestion fixture";

function fail(message) {
  throw new Error(`workflow_fixture_${message}`);
}

function nonEmptyString(value, label) {
  const normalized = String(value ?? "").trim();
  if (!normalized) fail(`${label}_missing`);
  return normalized;
}

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function workspacePaths(workspace) {
  const root = path.resolve(nonEmptyString(workspace, "workspace"));
  const runtime = path.join(root, "runtime");
  return {
    root,
    candidate: path.join(runtime, "candidates", `${CANDIDATE_ID}.json`),
    payload: path.join(runtime, "payloads", `${CANDIDATE_ID}.json`),
    receipt: path.join(runtime, "host", `${CANDIDATE_ID}.receipt.json`),
    ledger: path.join(root, "result", "search-ledger.json"),
  };
}

function parseCollectionRef(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const match = raw.match(/^(\d+):(.+)$/);
  const libraryId = Number(match?.[1]);
  const key = String(match?.[2] || "").trim();
  if (!Number.isSafeInteger(libraryId) || libraryId <= 0 || !key) {
    fail("collection_invalid");
  }
  return { libraryId, key };
}

// Runtime discovery: the plugin injects ZOTERO_BRIDGE_* into the run env and a
// workspace shim on PATH; ZOTERO_BRIDGE_CLI remains the documented dev override.
function resolveCli(workspace, env) {
  const override = String(env.ZOTERO_BRIDGE_CLI || "").trim();
  if (override) return override;
  const shim = path.join(
    workspace,
    ".zotero-bridge",
    "bin",
    process.platform === "win32" ? "zotero-bridge.cmd" : "zotero-bridge",
  );
  if (existsSync(shim)) return shim;
  return "zotero-bridge";
}

function resolveProfile(workspace, env) {
  const fromEnv = String(env.ZOTERO_BRIDGE_PROFILE || "").trim();
  if (fromEnv) return fromEnv;
  const injected = path.join(workspace, ".zotero-bridge", "profile.json");
  return existsSync(injected) ? injected : "";
}

function buildPayload(collectionRef, suffix) {
  return {
    paper: {
      itemType: "journalArticle",
      fields: {
        title: PAPER_TITLE,
        abstractNote: `Synthetic abstract for the offline ${SKILL_ID} fixture. It contains no real bibliographic content.`,
        date: "2026-01-01",
        publicationTitle: "Synthetic Offline Ingestion Fixture",
        language: "en",
      },
      creators: [
        { creatorType: "author", name: "Synthetic Ingestion Fixture" },
      ],
      identifiers: { doi: `10.5555/zs.workflow.ingest.${suffix}` },
    },
    ...(collectionRef ? { collectionRef } : {}),
  };
}

function unwrapIngestResult(envelope) {
  const data = envelope?.data?.data ?? envelope?.data;
  return data?.result ?? data?.ingest ?? null;
}

function pdfStatusFrom(enrichment) {
  const pdf = (Array.isArray(enrichment) ? enrichment : []).find(
    (entry) => entry?.kind === "pdf",
  );
  if (!pdf) return "missing";
  if (pdf.outcome === "attached") return "attached";
  if (pdf.outcome === "failed") return "failed";
  if (pdf.outcome === "skipped") return "skipped";
  return "missing";
}

function runMutation({ cli, profile, workspace, operationId }) {
  if (!existsSync(cli) && cli.includes(path.sep)) fail("bridge_missing");
  const args = [
    ...(profile ? ["--profile", profile] : []),
    "mutation",
    "literature-ingest",
    "--operation-id",
    operationId,
    "--input",
    `@runtime/payloads/${CANDIDATE_ID}.json`,
  ];
  const completed = spawnSync(cli, args, {
    cwd: workspace,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    shell: process.platform === "win32",
  });
  const stdout = String(completed.stdout || "");
  if (completed.error) {
    fail(`bridge_failed:${completed.error.message}`);
  }
  if (completed.status !== 0) {
    fail(
      `bridge_failed:${String(completed.stderr || stdout).slice(0, 2000)}`,
    );
  }
  let envelope;
  try {
    envelope = JSON.parse(stdout.trim());
  } catch {
    fail("bridge_json_invalid");
  }
  if (envelope?.ok === false) {
    fail(`bridge_failed:${JSON.stringify(envelope.error || {})}`);
  }
  return { envelope, stdout };
}

export function handleIngestSkill({
  input = {},
  parameter = {},
  workspace,
  env = process.env,
}) {
  const paths = workspacePaths(workspace);
  const intent =
    String(
      parameter.search_intent ??
        parameter.query ??
        input.search_intent ??
        input.query ??
        DEFAULT_INTENT,
    ).trim() || DEFAULT_INTENT;
  const collectionRef = parseCollectionRef(
    parameter.targetCollection ??
      parameter.collection ??
      input.targetCollection ??
      input.collection,
  );
  const searchMode = String(parameter.searchMode || "targeted_ingest");
  const suffix = randomUUID().replace(/-/g, "").slice(0, 12);
  const operationId = `workflow-fixture-ingest-${suffix}`;
  const payload = buildPayload(collectionRef, suffix);
  writeJson(paths.candidate, {
    candidateId: `synthetic:offline-ingest:${suffix}`,
    title: PAPER_TITLE,
    tier: "ready",
    metadataStatus: "qualified",
    payloadPath: `runtime/payloads/${CANDIDATE_ID}.json`,
  });
  writeJson(paths.payload, payload);
  const { envelope, stdout } = runMutation({
    cli: resolveCli(paths.root, env),
    profile: resolveProfile(paths.root, env),
    workspace: paths.root,
    operationId,
  });
  mkdirSync(path.dirname(paths.receipt), { recursive: true });
  writeFileSync(paths.receipt, stdout, "utf8");
  const result = unwrapIngestResult(envelope);
  const itemOutcome = String(result?.itemOutcome || "");
  const itemRef = {
    libraryId: Number(result?.item?.ref?.libraryId),
    key: String(result?.item?.ref?.key || "").trim(),
  };
  if (
    !["created", "existing"].includes(itemOutcome) ||
    !Number.isSafeInteger(itemRef.libraryId) ||
    itemRef.libraryId <= 0 ||
    !itemRef.key
  ) {
    fail("ingest_result_invalid");
  }
  const enrichment = Array.isArray(result.enrichment) ? result.enrichment : [];
  const title = String(result?.item?.title || PAPER_TITLE);
  const pdfStatus = pdfStatusFrom(enrichment);
  const metadataComplete =
    Array.isArray(payload.paper.creators) &&
    payload.paper.creators.length > 0 &&
    Boolean(payload.paper.fields.abstractNote) &&
    Object.keys(payload.paper.identifiers).length > 0;
  const needsCuration =
    !metadataComplete || enrichment.some((entry) => entry?.outcome === "failed");
  const ingestStatus = itemOutcome;
  writeJson(paths.ledger, {
    kind: "literature_search_ingest_ledger",
    status: "completed",
    searchMode,
    breadth: String(parameter.searchBreadth || "quick"),
    searchPlan: {
      objective: intent,
      targetCollection: collectionRef
        ? `${collectionRef.libraryId}:${collectionRef.key}`
        : "",
      stopConditions: ["Offline fixture approves exactly one synthetic paper"],
    },
    localCoverage: {
      summary:
        "Offline fixture performs no local coverage read; the Host mutation owns duplicate detection.",
      existingIdentifiers: [],
      reusableSeeds: [],
      gaps: [],
    },
    discoveryRounds: [],
    candidateIds: [payload.paper.identifiers.doi],
    approvedCandidateIds: [payload.paper.identifiers.doi],
    excludedCandidateIds: [],
    candidateResults: [
      {
        candidateId: payload.paper.identifiers.doi,
        candidatePath: `runtime/candidates/${CANDIDATE_ID}.json`,
        title,
        metadataStatus: "qualified",
        payloadPath: `runtime/payloads/${CANDIDATE_ID}.json`,
        operationId,
        receiptPath: `runtime/host/${CANDIDATE_ID}.receipt.json`,
        ingestStatus,
        itemRef,
        collectionOutcome: String(result.collectionOutcome || "not_requested"),
        hostEnrichment: enrichment,
        pdfStatus,
        needsCuration,
      },
    ],
    cancellation: {},
  });
  return {
    __SKILL_DONE__: true,
    kind: "literature_search_ingest",
    status: "completed",
    summary: {
      discovered: 1,
      selected: 1,
      created: ingestStatus === "created" ? 1 : 0,
      existing: ingestStatus === "existing" ? 1 : 0,
      failed: 0,
      notAttempted: 0,
    },
    outcomes: [
      {
        title,
        ingestStatus,
        itemRef,
        pdfStatus,
        needsCuration,
      },
    ],
    searchLedgerPath: "result/search-ledger.json",
  };
}
