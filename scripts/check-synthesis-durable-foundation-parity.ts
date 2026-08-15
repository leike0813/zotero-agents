import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openSynthesisNodeSqliteAdapter } from "../apps/synthesis-service/src/repositoryNodeSqlite.js";
import { openSynthesisSidecarTopicCanonicalStore } from "../apps/synthesis-service/src/topicCanonicalStoreNode.js";
import {
  canonicalSynthesisTopicJsonText,
  readSynthesisWorkbenchOperationalChrome,
} from "../packages/synthesis-application/src/index.js";
import { hashSynthesisContractCanonicalJson } from "../packages/synthesis-contracts/src/canonicalJson.js";
import { createSynthesisRepositoryFoundationStore } from "../packages/synthesis-repository/src/index.js";

const CORPUS_PATH = path.resolve(
  import.meta.dirname,
  "../packages/synthesis-contracts/contract-set/synthesis-durable-foundation-v1/corpus.json",
);
const PROFILE_ID = "1".repeat(64);
const DATA_ROOT_ID = "2".repeat(64);

type Corpus = {
  schema: string;
  schemaVersion: string;
  nodeOracle: { coreRange: [number, number]; files: string[] };
  repository: {
    pragmas: {
      journalMode: string;
      synchronous: number;
      foreignKeys: number;
      busyTimeout: number;
    };
    tables: string[];
    indexes: string[];
  };
  workbenchEmpty: unknown;
  canonical: {
    faultPoints: string[];
    canonicalJson: {
      value: unknown;
      text: string;
      sha256: string;
    };
    absentInspect: unknown;
  };
  canaries: string[];
};

export type SynthesisDurableFoundationParityCheck = {
  ok: boolean;
  corpus: string;
  nodeOracleFiles: number;
  tables: number;
  indexes: number;
  faultPoints: number;
  canaries: number;
  implementations: {
    node: { role: "oracle"; sourceFingerprint: string };
    rust: { role: "candidate"; sourceFingerprint: string };
  };
  errors: string[];
};

function equal(actual: unknown, expected: unknown) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function check(
  errors: string[],
  label: string,
  actual: unknown,
  expected: unknown,
) {
  if (!equal(actual, expected)) {
    errors.push(
      `${label}:${JSON.stringify(actual)}:${JSON.stringify(expected)}`,
    );
  }
}

function pragmaValue(
  adapter: ReturnType<typeof openSynthesisNodeSqliteAdapter>["adapter"],
  pragma: string,
) {
  const row = adapter.get(`PRAGMA ${pragma}`);
  return row ? Object.values(row)[0] : null;
}

function sourceFingerprint(root: string, inputs: string[]) {
  const hash = createHash("sha256");
  const visit = (relativePath: string) => {
    const absolutePath = path.resolve(root, relativePath);
    const stat = fs.statSync(absolutePath);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(absolutePath).sort()) {
        if (entry !== "target") visit(path.join(relativePath, entry));
      }
      return;
    }
    hash.update(relativePath.replaceAll(path.sep, "/"));
    hash.update("\0");
    hash.update(fs.readFileSync(absolutePath));
    hash.update("\0");
  };
  for (const input of inputs) visit(input);
  return `sha256:${hash.digest("hex")}`;
}

export function checkSynthesisDurableFoundationParity(
  root = process.cwd(),
): SynthesisDurableFoundationParityCheck {
  const corpus = JSON.parse(fs.readFileSync(CORPUS_PATH, "utf8")) as Corpus;
  const errors: string[] = [];
  const temporaryRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "synthesis-r7-parity-"),
  );
  const nodeRoot = path.join(temporaryRoot, "node-oracle");
  fs.mkdirSync(nodeRoot, { recursive: true });
  const connection = openSynthesisNodeSqliteAdapter(
    path.join(nodeRoot, "synthesis.db"),
  );

  try {
    check(
      errors,
      "corpus_schema",
      corpus.schema,
      "synthesis-durable-foundation-corpus.v1",
    );
    check(errors, "node_oracle_range", corpus.nodeOracle.coreRange, [203, 217]);
    for (const file of corpus.nodeOracle.files) {
      if (!fs.existsSync(path.resolve(root, file))) {
        errors.push(`node_oracle_missing:${file}`);
      }
    }

    const repository = createSynthesisRepositoryFoundationStore({
      db: connection.adapter,
      now: () => "2026-07-26T00:00:00.000Z",
    });
    repository.initializeCitationGraphApplication();
    repository.captureDurableBundleState();
    const tables = connection.adapter
      .all(
        "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'synt_%' ORDER BY name",
      )
      .map((row) => row.name);
    const indexes = connection.adapter
      .all(
        "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_synt_%' ORDER BY name",
      )
      .map((row) => row.name);
    check(errors, "repository_tables", tables, corpus.repository.tables);
    check(errors, "repository_indexes", indexes, corpus.repository.indexes);
    check(
      errors,
      "repository_pragmas",
      {
        journalMode: pragmaValue(connection.adapter, "journal_mode"),
        synchronous: pragmaValue(connection.adapter, "synchronous"),
        foreignKeys: pragmaValue(connection.adapter, "foreign_keys"),
        busyTimeout: pragmaValue(connection.adapter, "busy_timeout"),
      },
      corpus.repository.pragmas,
    );
    check(
      errors,
      "workbench_empty",
      readSynthesisWorkbenchOperationalChrome(repository),
      corpus.workbenchEmpty,
    );

    const canonicalJson = canonicalSynthesisTopicJsonText(
      corpus.canonical.canonicalJson.value,
    );
    check(
      errors,
      "canonical_json_text",
      canonicalJson,
      corpus.canonical.canonicalJson.text,
    );
    check(
      errors,
      "canonical_json_hash",
      hashSynthesisContractCanonicalJson(corpus.canonical.canonicalJson.value),
      corpus.canonical.canonicalJson.sha256,
    );
    const canonical = openSynthesisSidecarTopicCanonicalStore({
      profileRuntimeRoot: nodeRoot,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    try {
      check(
        errors,
        "canonical_absent",
        canonical.inspect({ topicId: "r7-canary" }),
        corpus.canonical.absentInspect,
      );
    } finally {
      canonical.close();
    }

    check(errors, "fault_point_count", corpus.canonical.faultPoints.length, 7);
    check(errors, "canaries", corpus.canaries, [
      "workbench.chrome.read",
      "topics.canonical.inspect",
    ]);
  } finally {
    connection.close();
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }

  return {
    ok: errors.length === 0,
    corpus: corpus.schema,
    nodeOracleFiles: corpus.nodeOracle.files.length,
    tables: corpus.repository.tables.length,
    indexes: corpus.repository.indexes.length,
    faultPoints: corpus.canonical.faultPoints.length,
    canaries: corpus.canaries.length,
    implementations: {
      node: {
        role: "oracle",
        sourceFingerprint: sourceFingerprint(root, [
          "apps/synthesis-service/src",
          "packages/synthesis-application/src",
          "packages/synthesis-repository/src",
          ...corpus.nodeOracle.files,
          path.relative(root, CORPUS_PATH),
        ]),
      },
      rust: {
        role: "candidate",
        sourceFingerprint: sourceFingerprint(root, [
          "native/synthesis-sidecar/Cargo.toml",
          "native/synthesis-sidecar/Cargo.lock",
          "native/synthesis-sidecar/crates",
          path.relative(root, CORPUS_PATH),
        ]),
      },
    },
    errors,
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  const result = checkSynthesisDurableFoundationParity();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 1;
}
