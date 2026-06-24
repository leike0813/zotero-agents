#!/usr/bin/env tsx
import { execFile } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  dedupeCanonicalReferencesClustered,
  referenceMatcherFingerprint,
  type ReferenceCanonicalDedupeClusteredResult,
  type ReferenceCanonicalDedupeInput,
} from "../../src/modules/synthesis/referenceMatcher.ts";

type JsonRecord = Record<string, any>;

type HarnessOptions = {
  zoteroDb: string;
  pluginDb: string;
  debugDb?: string;
  port?: number;
  maxBlockSize?: number;
  maxCandidatePairs?: number;
};

type ZoteroItem = {
  sourceRef: string;
  libraryId: number;
  itemKey: string;
  itemId: number;
  itemType: string;
  title: string;
  year: string;
  doi: string;
  url: string;
  creators: string[];
};

type HarnessSnapshot = {
  generatedAt: string;
  zoteroItems: ZoteroItem[];
  artifactSidecars: JsonRecord[];
  rawReferences: JsonRecord[];
  canonicalReferences: JsonRecord[];
  redirects: JsonRecord[];
  bindings: JsonRecord[];
  proposals: JsonRecord[];
  effectiveCanonicalById: Record<string, string>;
  canonicalInputs: ReferenceCanonicalDedupeInput[];
  summary: JsonRecord;
};

const LEGACY_TABLE_NAMES = [
  "synt_literature_item",
  "synt_reference_instance",
  "synt_reference_resolution",
];

function argValue(name: string, fallback = "") {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function hasArg(name: string) {
  return process.argv.includes(name);
}

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function normalizeDbPath(value: string) {
  return path.resolve(value);
}

function assertReadableFile(filePath: string, label: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} does not exist: ${filePath}`);
  }
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) {
    throw new Error(`${label} is not a file: ${filePath}`);
  }
}

function assertDebugDbSafe(options: HarnessOptions) {
  if (!options.debugDb) {
    return;
  }
  const debugDb = normalizeDbPath(options.debugDb);
  const real = [options.zoteroDb, options.pluginDb].map(normalizeDbPath);
  if (real.includes(debugDb)) {
    throw new Error("debug DB path must differ from Zotero DB and plugin DB");
  }
}

function execFileText(command: string, args: string[]) {
  return new Promise<string>((resolve, reject) => {
    execFile(
      command,
      args,
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              `${command} ${args.join(" ")} failed: ${cleanString(stderr) || error.message}`,
            ),
          );
          return;
        }
        resolve(stdout);
      },
    );
  });
}

async function sqliteJson(dbPath: string, sql: string) {
  const stdout = await execFileText("sqlite3", [
    "-readonly",
    "-json",
    dbPath,
    sql,
  ]);
  const text = stdout.trim();
  if (!text) {
    return [] as JsonRecord[];
  }
  return JSON.parse(text) as JsonRecord[];
}

function sqlString(value: unknown) {
  return `'${cleanString(value).replace(/'/g, "''")}'`;
}

function sqlNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? String(numeric) : "0";
}

async function sqliteExec(dbPath: string, sql: string) {
  const tmp = path.join(
    os.tmpdir(),
    `synthesis-index-harness-${Date.now()}-${Math.random().toString(16).slice(2)}.sql`,
  );
  fs.writeFileSync(tmp, sql, "utf8");
  try {
    await execFileText("sqlite3", [dbPath, `.read ${tmp}`]);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

function parseJsonArray(value: unknown) {
  const text = cleanString(value);
  if (!text) {
    return [] as any[];
  }
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseJsonObject(value: unknown) {
  const text = cleanString(value);
  if (!text) {
    return {} as JsonRecord;
  }
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as JsonRecord)
      : {};
  } catch {
    return {};
  }
}

function identifiersFromJson(value: unknown) {
  return Object.entries(parseJsonObject(value))
    .flatMap(([kind, entry]) =>
      Array.isArray(entry)
        ? entry.map((item) => ({ kind, value: cleanString(item) }))
        : [{ kind, value: cleanString(entry) }],
    )
    .filter((identifier) => identifier.kind && identifier.value);
}

function yearFromDate(value: unknown) {
  const match = cleanString(value).match(
    /(?:^|[^\d])((?:19|20)\d{2})(?:$|[^\d])/,
  );
  return match?.[1] || "";
}

async function loadZoteroItems(zoteroDb: string): Promise<ZoteroItem[]> {
  const rows = await sqliteJson(
    zoteroDb,
    `
    SELECT
      i.itemID AS item_id,
      i.libraryID AS library_id,
      i.key AS item_key,
      COALESCE(t.typeName, '') AS item_type,
      COALESCE((SELECT v.value FROM itemData d JOIN fields f ON f.fieldID = d.fieldID JOIN itemDataValues v ON v.valueID = d.valueID WHERE d.itemID = i.itemID AND f.fieldName = 'title' LIMIT 1), '') AS title,
      COALESCE((SELECT v.value FROM itemData d JOIN fields f ON f.fieldID = d.fieldID JOIN itemDataValues v ON v.valueID = d.valueID WHERE d.itemID = i.itemID AND f.fieldName = 'date' LIMIT 1), '') AS date_value,
      COALESCE((SELECT v.value FROM itemData d JOIN fields f ON f.fieldID = d.fieldID JOIN itemDataValues v ON v.valueID = d.valueID WHERE d.itemID = i.itemID AND f.fieldName = 'DOI' LIMIT 1), '') AS doi,
      COALESCE((SELECT v.value FROM itemData d JOIN fields f ON f.fieldID = d.fieldID JOIN itemDataValues v ON v.valueID = d.valueID WHERE d.itemID = i.itemID AND f.fieldName = 'url' LIMIT 1), '') AS url,
      COALESCE((SELECT group_concat(trim(COALESCE(c.firstName, '') || ' ' || COALESCE(c.lastName, '')), ' | ') FROM itemCreators ic JOIN creators c ON c.creatorID = ic.creatorID WHERE ic.itemID = i.itemID), '') AS creators
    FROM items i
    LEFT JOIN itemTypes t ON t.itemTypeID = i.itemTypeID
    LEFT JOIN itemAttachments attachment ON attachment.itemID = i.itemID
    LEFT JOIN itemNotes note ON note.itemID = i.itemID
    LEFT JOIN deletedItems deleted ON deleted.itemID = i.itemID
    WHERE deleted.itemID IS NULL
      AND attachment.itemID IS NULL
      AND note.itemID IS NULL
      AND COALESCE(t.typeName, '') NOT IN ('attachment', 'note', 'annotation')
    ORDER BY i.libraryID, i.key
    `,
  );
  return rows.map((row) => ({
    sourceRef: `${Number(row.library_id || 0)}:${cleanString(row.item_key)}`,
    libraryId: Number(row.library_id || 0),
    itemKey: cleanString(row.item_key),
    itemId: Number(row.item_id || 0),
    itemType: cleanString(row.item_type),
    title: cleanString(row.title) || cleanString(row.item_key),
    year: yearFromDate(row.date_value),
    doi: cleanString(row.doi),
    url: cleanString(row.url),
    creators: cleanString(row.creators)
      .split("|")
      .map(cleanString)
      .filter(Boolean),
  }));
}

async function loadPluginRows(pluginDb: string) {
  const [
    artifactSidecars,
    rawReferences,
    canonicalReferences,
    redirects,
    bindings,
    proposals,
  ] = await Promise.all([
    sqliteJson(
      pluginDb,
      "SELECT * FROM synt_artifact_sidecar ORDER BY source_ref, artifact_type",
    ),
    sqliteJson(
      pluginDb,
      "SELECT * FROM synt_raw_reference ORDER BY source_ref, reference_index",
    ),
    sqliteJson(
      pluginDb,
      "SELECT * FROM synt_canonical_reference ORDER BY canonical_reference_id",
    ),
    sqliteJson(
      pluginDb,
      "SELECT * FROM synt_canonical_reference_redirect ORDER BY from_canonical_reference_id",
    ),
    sqliteJson(
      pluginDb,
      "SELECT * FROM synt_reference_binding ORDER BY canonical_reference_id, item_key",
    ),
    sqliteJson(
      pluginDb,
      "SELECT * FROM synt_reference_match_proposal ORDER BY updated_at DESC, proposal_id",
    ),
  ]);
  return {
    artifactSidecars,
    rawReferences,
    canonicalReferences,
    redirects,
    bindings,
    proposals,
  };
}

function effectiveCanonicalResolver(redirects: JsonRecord[]) {
  const redirectMap = new Map(
    redirects.map((row) => [
      cleanString(row.from_canonical_reference_id),
      cleanString(row.to_canonical_reference_id),
    ]),
  );
  return (id: string) => {
    let current = cleanString(id);
    const seen = new Set<string>();
    while (redirectMap.has(current) && !seen.has(current)) {
      seen.add(current);
      current = redirectMap.get(current) || current;
    }
    return current;
  };
}

function buildCanonicalInputs(
  snapshot: Omit<HarnessSnapshot, "canonicalInputs" | "summary">,
) {
  const resolveEffective = effectiveCanonicalResolver(snapshot.redirects);
  const inboundRedirectTargets = new Set(
    snapshot.redirects
      .map((row) =>
        resolveEffective(cleanString(row.to_canonical_reference_id)),
      )
      .filter(Boolean),
  );
  const accepted = new Set(
    snapshot.bindings
      .filter((row) => cleanString(row.status) === "accepted")
      .map((row) => resolveEffective(cleanString(row.canonical_reference_id))),
  );
  const canonicalById = new Map(
    snapshot.canonicalReferences.map((row) => [
      cleanString(row.canonical_reference_id),
      row,
    ]),
  );
  const byEffective = new Map<string, JsonRecord[]>();
  for (const raw of snapshot.rawReferences) {
    if (cleanString(raw.status) !== "active") {
      continue;
    }
    const effective = resolveEffective(cleanString(raw.canonical_reference_id));
    if (!effective || accepted.has(effective)) {
      continue;
    }
    byEffective.set(effective, [...(byEffective.get(effective) || []), raw]);
  }
  return Array.from(byEffective.entries())
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([canonicalReferenceId, rows]) => {
      const canonical = canonicalById.get(canonicalReferenceId) || {};
      const physicalCanonicalIds = Array.from(
        new Set(
          rows
            .map((row) => cleanString(row.canonical_reference_id))
            .filter(Boolean),
        ),
      ).sort();
      const physicalCanonicals = physicalCanonicalIds
        .map((id) => canonicalById.get(id))
        .filter((row): row is JsonRecord => Boolean(row));
      const rawTitleGroups = new Map<string, JsonRecord[]>();
      for (const row of rows) {
        const title = cleanString(row.parsed_title);
        if (!title) {
          continue;
        }
        const key = `${cleanString(row.normalized_title) || title}::${cleanString(row.year)}`;
        rawTitleGroups.set(key, [...(rawTitleGroups.get(key) || []), row]);
      }
      const titleCandidates = [
        cleanString(canonical.title) && {
          source: "effective_canonical" as const,
          sourceCanonicalReferenceId: canonicalReferenceId,
          title: cleanString(canonical.title),
          normalizedTitle: cleanString(canonical.normalized_title),
          year: cleanString(canonical.year),
          authors: parseJsonArray(canonical.authors_json)
            .map(cleanString)
            .filter(Boolean),
          identifiers: identifiersFromJson(canonical.identifiers_json),
          frequency: rows.length,
        },
        ...physicalCanonicals.map((row) => ({
          source: "physical_canonical" as const,
          sourceCanonicalReferenceId: cleanString(row.canonical_reference_id),
          title: cleanString(row.title),
          normalizedTitle: cleanString(row.normalized_title),
          year: cleanString(row.year),
          authors: parseJsonArray(row.authors_json)
            .map(cleanString)
            .filter(Boolean),
          identifiers: identifiersFromJson(row.identifiers_json),
          frequency:
            rows.filter(
              (raw) =>
                cleanString(raw.canonical_reference_id) ===
                cleanString(row.canonical_reference_id),
            ).length || 1,
        })),
        ...Array.from(rawTitleGroups.values()).map((group) => ({
          source: "raw_reference" as const,
          title: cleanString(group[0]?.parsed_title),
          normalizedTitle: cleanString(group[0]?.normalized_title),
          year: cleanString(group[0]?.year),
          authors: parseJsonArray(group[0]?.authors_json)
            .map(cleanString)
            .filter(Boolean),
          identifiers: identifiersFromJson(group[0]?.identifiers_json),
          rawReferenceIds: group
            .map((row) => cleanString(row.raw_reference_id))
            .filter(Boolean),
          frequency: group.length,
        })),
      ].filter(Boolean);
      const preferred = titleCandidates
        .filter((candidate): candidate is NonNullable<typeof candidate> =>
          Boolean(candidate),
        )
        .sort((left, right) => {
          const sourceRank = (source: string) =>
            source === "effective_canonical"
              ? 3
              : source === "physical_canonical"
                ? 2
                : 1;
          return (
            sourceRank(String(right.source)) -
              sourceRank(String(left.source)) ||
            Number(right.frequency || 0) - Number(left.frequency || 0) ||
            cleanString(left.title).localeCompare(cleanString(right.title))
          );
        })[0];
      const identifiers = [
        ...physicalCanonicals.flatMap((row) =>
          identifiersFromJson(row.identifiers_json),
        ),
        ...rows.flatMap((row) => identifiersFromJson(row.identifiers_json)),
      ];
      const authors = [
        ...physicalCanonicals.flatMap((row) =>
          parseJsonArray(row.authors_json).map(cleanString).filter(Boolean),
        ),
        ...rows.flatMap((row) =>
          parseJsonArray(row.authors_json).map(cleanString).filter(Boolean),
        ),
      ];
      return {
        canonicalReferenceId,
        title:
          cleanString(preferred?.title) || cleanString(rows[0]?.parsed_title),
        normalizedTitle:
          cleanString(preferred?.normalizedTitle) ||
          cleanString(rows[0]?.normalized_title),
        year: cleanString(preferred?.year) || cleanString(rows[0]?.year),
        authors: Array.from(new Set(authors)).sort(),
        stickyRepresentative: inboundRedirectTargets.has(canonicalReferenceId),
        rawReferenceIds: rows
          .map((row) => cleanString(row.raw_reference_id))
          .filter(Boolean),
        rawHashes: rows.map((row) => cleanString(row.raw_hash)).filter(Boolean),
        rawReferences: rows
          .map((row) => cleanString(row.raw_reference))
          .filter(Boolean),
        sourceRefs: rows
          .map((row) => cleanString(row.source_ref))
          .filter(Boolean),
        identifiers,
        titleCandidates,
      } satisfies ReferenceCanonicalDedupeInput;
    });
}

async function loadSnapshot(options: HarnessOptions): Promise<HarnessSnapshot> {
  const zoteroItems = await loadZoteroItems(options.zoteroDb);
  const plugin = await loadPluginRows(options.pluginDb);
  const resolveEffective = effectiveCanonicalResolver(plugin.redirects);
  const effectiveCanonicalById = Object.fromEntries(
    plugin.canonicalReferences.map((row) => {
      const id = cleanString(row.canonical_reference_id);
      return [id, resolveEffective(id)];
    }),
  );
  const base = {
    generatedAt: new Date().toISOString(),
    zoteroItems,
    ...plugin,
    effectiveCanonicalById,
  };
  const canonicalInputs = buildCanonicalInputs(base);
  return {
    ...base,
    canonicalInputs,
    summary: {
      zotero_item_count: zoteroItems.length,
      artifact_sidecar_count: plugin.artifactSidecars.length,
      raw_reference_count: plugin.rawReferences.length,
      active_raw_reference_count: plugin.rawReferences.filter(
        (row) => cleanString(row.status) === "active",
      ).length,
      canonical_reference_count: plugin.canonicalReferences.length,
      canonical_dedupe_input_count: canonicalInputs.length,
      binding_count: plugin.bindings.length,
      proposal_count: plugin.proposals.length,
    },
  };
}

async function ensureDebugSchema(debugDb: string) {
  await sqliteExec(
    debugDb,
    `
    CREATE TABLE IF NOT EXISTS harness_run (
      run_id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      zotero_db TEXT NOT NULL,
      plugin_db TEXT NOT NULL,
      matcher_fingerprint TEXT NOT NULL,
      options_json TEXT NOT NULL,
      counters_json TEXT NOT NULL,
      diagnostics_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS harness_input_snapshot (
      run_id TEXT PRIMARY KEY,
      summary_json TEXT NOT NULL,
      snapshot_hash TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS harness_cluster (
      run_id TEXT NOT NULL,
      cluster_id TEXT NOT NULL,
      representative_canonical_reference_id TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      PRIMARY KEY (run_id, cluster_id)
    );
    CREATE TABLE IF NOT EXISTS harness_edge (
      run_id TEXT NOT NULL,
      edge_id TEXT NOT NULL,
      edge_type TEXT NOT NULL,
      source_canonical_reference_id TEXT NOT NULL,
      target_canonical_reference_id TEXT NOT NULL,
      score REAL NOT NULL,
      payload_json TEXT NOT NULL,
      PRIMARY KEY (run_id, edge_id)
    );
    CREATE TABLE IF NOT EXISTS harness_action (
      run_id TEXT NOT NULL,
      action_id TEXT NOT NULL,
      action TEXT NOT NULL,
      edge_type TEXT NOT NULL,
      source_canonical_reference_id TEXT NOT NULL,
      target_canonical_reference_id TEXT NOT NULL,
      score REAL NOT NULL,
      payload_json TEXT NOT NULL,
      PRIMARY KEY (run_id, action_id)
    );
    CREATE TABLE IF NOT EXISTS harness_review_decision (
      decision_id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      action_id TEXT NOT NULL,
      decision TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    `,
  );
}

async function writeRun(
  options: HarnessOptions,
  snapshot: HarnessSnapshot,
  result: ReferenceCanonicalDedupeClusteredResult,
) {
  if (!options.debugDb) {
    throw new Error(
      "--debug-db is required for run and serve write operations",
    );
  }
  assertDebugDbSafe(options);
  const debugDb = normalizeDbPath(options.debugDb);
  await ensureDebugSchema(debugDb);
  const runId = `cluster-run:${Date.now()}`;
  const snapshotHash = referenceMatcherFingerprint({
    summary: snapshot.summary,
    canonicalInputs: snapshot.canonicalInputs,
  });
  const createdAt = new Date().toISOString();
  const statements = [
    `INSERT INTO harness_run VALUES (${[
      sqlString(runId),
      sqlString(createdAt),
      sqlString(path.basename(options.zoteroDb)),
      sqlString(path.basename(options.pluginDb)),
      sqlString(referenceMatcherFingerprint("clustered-v1")),
      sqlString(
        JSON.stringify({
          maxBlockSize: options.maxBlockSize,
          maxCandidatePairs: options.maxCandidatePairs,
        }),
      ),
      sqlString(JSON.stringify(result.counters)),
      sqlString(JSON.stringify(result.diagnostics)),
    ].join(", ")});`,
    `INSERT INTO harness_input_snapshot VALUES (${[
      sqlString(runId),
      sqlString(JSON.stringify(snapshot.summary)),
      sqlString(snapshotHash),
    ].join(", ")});`,
    ...result.clusters.map(
      (cluster) =>
        `INSERT INTO harness_cluster VALUES (${[
          sqlString(runId),
          sqlString(cluster.clusterId),
          sqlString(cluster.representativeCanonicalReferenceId),
          sqlString(JSON.stringify(cluster)),
        ].join(", ")});`,
    ),
    ...result.edges.map(
      (edge) =>
        `INSERT INTO harness_edge VALUES (${[
          sqlString(runId),
          sqlString(edge.edgeId),
          sqlString(edge.edgeType),
          sqlString(edge.sourceCanonicalReferenceId),
          sqlString(edge.targetCanonicalReferenceId),
          sqlNumber(edge.score),
          sqlString(JSON.stringify(edge)),
        ].join(", ")});`,
    ),
    ...result.actions.map(
      (action) =>
        `INSERT INTO harness_action VALUES (${[
          sqlString(runId),
          sqlString(action.actionId),
          sqlString(action.action),
          sqlString(action.edgeType),
          sqlString(action.sourceCanonicalReferenceId),
          sqlString(action.targetCanonicalReferenceId),
          sqlNumber(action.score),
          sqlString(JSON.stringify(action)),
        ].join(", ")});`,
    ),
  ];
  await sqliteExec(debugDb, `BEGIN;\n${statements.join("\n")}\nCOMMIT;\n`);
  return { runId, snapshotHash };
}

async function loadRuns(debugDb: string) {
  if (!fs.existsSync(debugDb)) {
    return [];
  }
  return sqliteJson(
    debugDb,
    "SELECT run_id, created_at, matcher_fingerprint, counters_json FROM harness_run ORDER BY created_at DESC LIMIT 50",
  );
}

async function loadRunResults(debugDb: string, runId = "") {
  if (!fs.existsSync(debugDb)) {
    return { clusters: [], edges: [], actions: [] };
  }
  const resolvedRunId =
    cleanString(runId) ||
    cleanString(
      (
        await sqliteJson(
          debugDb,
          "SELECT run_id FROM harness_run ORDER BY created_at DESC LIMIT 1",
        )
      )[0]?.run_id,
    );
  if (!resolvedRunId) {
    return { clusters: [], edges: [], actions: [] };
  }
  const where = `WHERE run_id = ${sqlString(resolvedRunId)}`;
  const [clusters, edges, actions] = await Promise.all([
    sqliteJson(
      debugDb,
      `SELECT * FROM harness_cluster ${where} ORDER BY cluster_id`,
    ),
    sqliteJson(
      debugDb,
      `SELECT * FROM harness_edge ${where} ORDER BY edge_type, score DESC`,
    ),
    sqliteJson(
      debugDb,
      `SELECT * FROM harness_action ${where} ORDER BY action, edge_type, score DESC`,
    ),
  ]);
  return { runId: resolvedRunId, clusters, edges, actions };
}

function parseOptions(): HarnessOptions {
  const zoteroDb = normalizeDbPath(argValue("--zotero-db"));
  const pluginDb = normalizeDbPath(argValue("--plugin-db"));
  const debugDb = argValue("--debug-db")
    ? normalizeDbPath(argValue("--debug-db"))
    : undefined;
  if (!zoteroDb || !pluginDb) {
    throw new Error("--zotero-db and --plugin-db are required");
  }
  assertReadableFile(zoteroDb, "Zotero DB");
  assertReadableFile(pluginDb, "Plugin DB");
  return {
    zoteroDb,
    pluginDb,
    debugDb,
    port: Number(argValue("--port", "8765")) || 8765,
    maxBlockSize: Number(argValue("--max-block-size", "30")) || 30,
    maxCandidatePairs:
      Number(argValue("--max-candidate-pairs", "3000")) || 3000,
  };
}

async function runCluster(options: HarnessOptions) {
  const snapshot = await loadSnapshot(options);
  const result = dedupeCanonicalReferencesClustered(snapshot.canonicalInputs, {
    maxBlockSize: options.maxBlockSize,
    maxCandidatePairs: options.maxCandidatePairs,
  });
  const persisted = options.debugDb
    ? await writeRun(options, snapshot, result)
    : null;
  return { snapshot, result, persisted };
}

function jsonResponse(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(body, null, 2));
}

function textResponse(
  res: http.ServerResponse,
  status: number,
  body: string,
  type: string,
) {
  res.writeHead(status, { "content-type": type, "cache-control": "no-store" });
  res.end(body);
}

async function serve(options: HarnessOptions) {
  if (!options.debugDb) {
    throw new Error("--debug-db is required for serve");
  }
  assertDebugDbSafe(options);
  await ensureDebugSchema(options.debugDb);
  const staticRoot = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "static",
  );
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", `http://127.0.0.1:${options.port}`);
      if (url.pathname === "/api/snapshot") {
        jsonResponse(res, 200, await loadSnapshot(options));
        return;
      }
      if (url.pathname === "/api/run" && req.method === "POST") {
        jsonResponse(res, 200, await runCluster(options));
        return;
      }
      if (url.pathname === "/api/runs") {
        jsonResponse(res, 200, await loadRuns(options.debugDb!));
        return;
      }
      if (url.pathname === "/api/results") {
        jsonResponse(
          res,
          200,
          await loadRunResults(
            options.debugDb!,
            url.searchParams.get("runId") || "",
          ),
        );
        return;
      }
      const file = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
      const filePath = path.resolve(staticRoot, file);
      if (!filePath.startsWith(staticRoot) || !fs.existsSync(filePath)) {
        textResponse(res, 404, "not found", "text/plain; charset=utf-8");
        return;
      }
      textResponse(
        res,
        200,
        fs.readFileSync(filePath, "utf8"),
        filePath.endsWith(".html")
          ? "text/html; charset=utf-8"
          : "text/plain; charset=utf-8",
      );
    } catch (error) {
      jsonResponse(res, 500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
  server.listen(options.port, "127.0.0.1", () => {
    console.log(`Synthesis Index Harness: http://127.0.0.1:${options.port}/`);
  });
}

async function main() {
  const command = process.argv[2] || "help";
  if (command === "help" || hasArg("--help")) {
    console.log(`Usage:
  npx tsx tools/synthesis-index-harness/cli.ts snapshot --zotero-db <zotero.sqlite> --plugin-db <zotero-agents.db>
  npx tsx tools/synthesis-index-harness/cli.ts run --zotero-db <zotero.sqlite> --plugin-db <zotero-agents.db> --debug-db <debug.sqlite>
  npx tsx tools/synthesis-index-harness/cli.ts serve --zotero-db <zotero.sqlite> --plugin-db <zotero-agents.db> --debug-db <debug.sqlite> [--port 8765]
`);
    return;
  }
  const options = parseOptions();
  if (command === "snapshot") {
    console.log(JSON.stringify(await loadSnapshot(options), null, 2));
    return;
  }
  if (command === "run") {
    console.log(JSON.stringify(await runCluster(options), null, 2));
    return;
  }
  if (command === "serve") {
    await serve(options);
    return;
  }
  throw new Error(`unknown command: ${command}`);
}

if (path.resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

export {
  LEGACY_TABLE_NAMES,
  assertDebugDbSafe,
  buildCanonicalInputs,
  loadRunResults,
  loadSnapshot,
  runCluster,
};
