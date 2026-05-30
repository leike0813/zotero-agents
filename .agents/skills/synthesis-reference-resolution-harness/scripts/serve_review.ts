import fs from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import type {
  ReviewSeedDocument,
  ReviewSeedEdge,
} from "./build_review_seed.ts";

const REVIEW_STATE_SCHEMA = "synthesis.reference_resolution_review_state.v1";
const REVIEWED_GOLD_SCHEMA =
  "synthesis.reference_resolution_gold_labels.reviewed.v1";

type JsonRecord = Record<string, any>;

export type ReviewDecision = {
  label:
    | "match"
    | "suggested_match"
    | "ambiguous"
    | "external_or_missing"
    | "ignore";
  target_item_key: string;
  target_literature_item_id: string;
  rejected_target_item_keys: string[];
  evidence: string[];
  rationale: string;
  reviewed_at: string;
  reviewer: "human";
};

export type ReviewStateDocument = {
  schema: typeof REVIEW_STATE_SCHEMA;
  updated_at: string;
  decisions: Record<string, ReviewDecision>;
};

type ServerOptions = {
  fixture: string;
  seedFile?: string;
  stateFile?: string;
  outLabels?: string;
  logFile?: string;
  staticDir?: string;
};

function argValue(name: string, fallback = "") {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.map(cleanString).filter(Boolean))).sort(
    (left, right) => left.localeCompare(right),
  );
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function writeJson(filePath: string, data: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function atomicWriteJson(filePath: string, data: unknown) {
  const tmpPath = `${filePath}.tmp`;
  writeJson(tmpPath, data);
  fs.renameSync(tmpPath, filePath);
}

function jsonResponse(res: http.ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(payload);
}

function textResponse(
  res: http.ServerResponse,
  status: number,
  body: string,
  contentType = "text/plain; charset=utf-8",
) {
  res.writeHead(status, {
    "content-type": contentType,
    "cache-control": "no-store",
  });
  res.end(body);
}

function resolvePaths(options: ServerOptions) {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const fixture = path.resolve(options.fixture);
  return {
    fixture,
    seed: path.resolve(fixture, options.seedFile || "review-seed.json"),
    state: path.resolve(fixture, options.stateFile || "review-state.json"),
    outLabels: path.resolve(
      fixture,
      options.outLabels || "gold-labels.reviewed.json",
    ),
    log: path.resolve(fixture, options.logFile || "review-log.jsonl"),
    staticDir: options.staticDir || path.resolve(scriptDir, "..", "review-app"),
  };
}

export function emptyReviewState(): ReviewStateDocument {
  return {
    schema: REVIEW_STATE_SCHEMA,
    updated_at: new Date(0).toISOString(),
    decisions: {},
  };
}

export function loadReviewState(statePath: string): ReviewStateDocument {
  if (!fs.existsSync(statePath)) {
    return emptyReviewState();
  }
  const state = readJson<ReviewStateDocument>(statePath);
  return {
    schema: REVIEW_STATE_SCHEMA,
    updated_at: cleanString(state.updated_at) || new Date(0).toISOString(),
    decisions: state.decisions || {},
  };
}

function paperMaps(seed: ReviewSeedDocument) {
  const byItemKey = new Map(
    seed.papers.map((paper) => [
      cleanString(paper.itemKey || paper.item_key),
      paper,
    ]),
  );
  const references = new Set(
    seed.references.map((reference) =>
      cleanString(reference.reference_instance_id),
    ),
  );
  return { byItemKey, references };
}

export function validateDecisionInput(
  seed: ReviewSeedDocument,
  input: JsonRecord,
): { referenceId: string; decision: ReviewDecision } {
  const referenceId = cleanString(
    input.reference_instance_id || input.referenceInstanceId,
  );
  const { byItemKey, references } = paperMaps(seed);
  if (!references.has(referenceId)) {
    throw new Error(`unknown reference_instance_id: ${referenceId}`);
  }
  const allowed = new Set([
    "match",
    "suggested_match",
    "ambiguous",
    "external_or_missing",
    "ignore",
  ]);
  const label = cleanString(input.label) as ReviewDecision["label"];
  if (!allowed.has(label)) {
    throw new Error(`invalid label: ${label}`);
  }
  const targetItemKey = cleanString(
    input.target_item_key || input.targetItemKey,
  );
  const target = targetItemKey ? byItemKey.get(targetItemKey) : undefined;
  if (targetItemKey && !target) {
    throw new Error(`unknown target_item_key: ${targetItemKey}`);
  }
  if (label === "match" && !target) {
    throw new Error("match decision requires a valid target_item_key");
  }
  const rejected = uniqueSorted(
    Array.isArray(input.rejected_target_item_keys)
      ? input.rejected_target_item_keys
      : [],
  ).filter((itemKey) => byItemKey.has(itemKey));
  const decision: ReviewDecision = {
    label,
    target_item_key: targetItemKey,
    target_literature_item_id:
      cleanString(input.target_literature_item_id) ||
      cleanString(target?.literatureItemId || target?.literature_item_id),
    rejected_target_item_keys: rejected,
    evidence: uniqueSorted(
      Array.isArray(input.evidence) ? input.evidence : ["human_review"],
    ),
    rationale: cleanString(input.rationale),
    reviewed_at: new Date().toISOString(),
    reviewer: "human",
  };
  return { referenceId, decision };
}

function candidateForEdge(edge: ReviewSeedEdge, seed: ReviewSeedDocument) {
  const paper = seed.papers.find(
    (entry) =>
      cleanString(entry.itemKey || entry.item_key) === edge.target_item_key,
  );
  return {
    item_key: edge.target_item_key,
    literature_item_id: edge.target_literature_item_id,
    title: cleanString(paper?.title),
    year: cleanString(paper?.year),
    score: edge.score,
    reasons: edge.evidence,
  };
}

function labelFromDecision(
  referenceId: string,
  decision: ReviewDecision,
  seed: ReviewSeedDocument,
) {
  const candidates = decision.target_item_key
    ? [
        candidateForEdge(
          {
            id: `${referenceId}::${decision.target_item_key}`,
            reference_instance_id: referenceId,
            target_item_key: decision.target_item_key,
            target_literature_item_id: decision.target_literature_item_id,
            kind: decision.label === "match" ? "confirmed" : "candidate",
            confidence: "high",
            score: 1,
            evidence: decision.evidence,
            reason: decision.rationale,
            source: "human-review",
          },
          seed,
        ),
      ]
    : [];
  return {
    reference_instance_id: referenceId,
    label: decision.label,
    target_item_key: decision.label === "match" ? decision.target_item_key : "",
    target_literature_item_id:
      decision.label === "match" ? decision.target_literature_item_id : "",
    evidence: decision.evidence,
    rationale: decision.rationale || "human review decision",
    suggested_candidates:
      decision.label === "suggested_match" ? candidates : [],
  };
}

function labelFromSeed(reference: JsonRecord, seed: ReviewSeedDocument) {
  const referenceId = cleanString(reference.reference_instance_id);
  const edgeMap = new Map(seed.edges.map((edge) => [edge.id, edge]));
  const confirmed = (reference.confirmed_edges || [])
    .map((id: string) => edgeMap.get(id))
    .filter(Boolean) as ReviewSeedEdge[];
  const candidates = (reference.candidate_edges || [])
    .map((id: string) => edgeMap.get(id))
    .filter(Boolean) as ReviewSeedEdge[];
  if (confirmed.length) {
    const edge = confirmed[0]!;
    return {
      reference_instance_id: referenceId,
      label: "match",
      target_item_key: edge.target_item_key,
      target_literature_item_id: edge.target_literature_item_id,
      evidence: edge.evidence,
      rationale: edge.reason,
      suggested_candidates: [candidateForEdge(edge, seed)],
    };
  }
  if (candidates.length) {
    return {
      reference_instance_id: referenceId,
      label: "suggested_match",
      target_item_key: "",
      target_literature_item_id: "",
      evidence: ["seed_candidate"],
      rationale: "unreviewed seed candidate requires human confirmation",
      suggested_candidates: candidates.map((edge) =>
        candidateForEdge(edge, seed),
      ),
    };
  }
  return {
    reference_instance_id: referenceId,
    label: "external_or_missing",
    target_item_key: "",
    target_literature_item_id: "",
    evidence: [],
    rationale: "no confirmed or candidate edge in review seed",
    suggested_candidates: [],
  };
}

export function exportReviewedGoldLabels(
  seed: ReviewSeedDocument,
  state: ReviewStateDocument,
) {
  const labels = seed.references.map((reference) => {
    const referenceId = cleanString(reference.reference_instance_id);
    const decision = state.decisions[referenceId];
    return decision
      ? labelFromDecision(referenceId, decision, seed)
      : labelFromSeed(reference, seed);
  });
  const counts = labels.reduce<Record<string, number>>((acc, label) => {
    acc[label.label] = (acc[label.label] || 0) + 1;
    return acc;
  }, {});
  return {
    schema: REVIEWED_GOLD_SCHEMA,
    generated_at: new Date().toISOString(),
    source: "reference-resolution-review-harness",
    labels,
    summary: {
      reference_count: labels.length,
      human_decision_count: Object.keys(state.decisions).length,
      label_counts: counts,
    },
  };
}

async function readRequestBody(req: http.IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

function appendLog(logPath: string, row: JsonRecord) {
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, `${JSON.stringify(row)}\n`, "utf8");
}

function contentTypeFor(filePath: string) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  return "application/octet-stream";
}

function serveStatic(
  res: http.ServerResponse,
  staticDir: string,
  requestPath: string,
) {
  const relative = requestPath === "/" ? "index.html" : requestPath.slice(1);
  const target = path.resolve(staticDir, relative);
  if (!target.startsWith(path.resolve(staticDir))) {
    textResponse(res, 403, "forbidden");
    return;
  }
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    textResponse(res, 404, "not found");
    return;
  }
  textResponse(
    res,
    200,
    fs.readFileSync(target, "utf8"),
    contentTypeFor(target),
  );
}

export function createReviewServer(options: ServerOptions) {
  const paths = resolvePaths(options);
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", "http://127.0.0.1");
      if (req.method === "GET" && url.pathname === "/api/review") {
        const seed = readJson<ReviewSeedDocument>(paths.seed);
        const state = loadReviewState(paths.state);
        jsonResponse(res, 200, {
          ok: true,
          seed,
          state,
          paths: {
            fixture: paths.fixture,
            seed: path.basename(paths.seed),
            state: path.basename(paths.state),
            outLabels: path.basename(paths.outLabels),
          },
        });
        return;
      }
      if (req.method === "PUT" && url.pathname === "/api/decision") {
        const seed = readJson<ReviewSeedDocument>(paths.seed);
        const state = loadReviewState(paths.state);
        const input = await readRequestBody(req);
        const { referenceId, decision } = validateDecisionInput(seed, input);
        const nextState: ReviewStateDocument = {
          schema: REVIEW_STATE_SCHEMA,
          updated_at: new Date().toISOString(),
          decisions: {
            ...state.decisions,
            [referenceId]: decision,
          },
        };
        atomicWriteJson(paths.state, nextState);
        appendLog(paths.log, {
          at: nextState.updated_at,
          action: "decision",
          reference_instance_id: referenceId,
          decision,
        });
        jsonResponse(res, 200, { ok: true, state: nextState });
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/export") {
        const seed = readJson<ReviewSeedDocument>(paths.seed);
        const state = loadReviewState(paths.state);
        const reviewed = exportReviewedGoldLabels(seed, state);
        atomicWriteJson(paths.outLabels, reviewed);
        jsonResponse(res, 200, {
          ok: true,
          outLabels: paths.outLabels,
          summary: reviewed.summary,
        });
        return;
      }
      if (req.method === "GET") {
        serveStatic(res, paths.staticDir, url.pathname);
        return;
      }
      textResponse(res, 405, "method not allowed");
    } catch (error) {
      jsonResponse(res, 400, {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

function main() {
  const fixture = argValue("--fixture");
  if (!fixture) {
    throw new Error("missing --fixture");
  }
  const port = Number(argValue("--port", "4179"));
  const host = argValue("--host", "127.0.0.1");
  const server = createReviewServer({
    fixture,
    seedFile: argValue("--seed", "review-seed.json"),
    stateFile: argValue("--state", "review-state.json"),
    outLabels: argValue("--out-labels", "gold-labels.reviewed.json"),
  });
  server.listen(port, host, () => {
    const address = server.address();
    const actualPort =
      typeof address === "object" && address ? address.port : port;
    console.log(
      JSON.stringify(
        {
          ok: true,
          url: `http://${host}:${actualPort}/`,
          fixture: path.resolve(fixture),
        },
        null,
        2,
      ),
    );
  });
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  main();
}
