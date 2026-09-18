import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export type FixtureIdentity = {
  schemaVersion: string;
  fixtureId: string;
  fixtureRevision: number;
};

export type FixtureRegistry = {
  schemaVersion: "system-e2e-fixture-registry.v1";
  fixtures: Array<FixtureIdentity & { references: string[] }>;
};

type CommittedSeed = FixtureIdentity & {
  facts: Record<string, number>;
  structuralFacts: Phase1StructuralFacts;
  items: Array<{
    key: string;
    itemType: string;
    title: string;
    attachments?: Array<{
      key: string;
      path: string;
      contentType: string;
    }>;
  }>;
};

export type Phase1StructuralFacts = {
  referencePages: {
    itemCount: number;
    pageSize: number;
    titlePrefix: string;
    year: string;
  };
  historicalTopic: {
    topicId: string;
    pathId: string;
    provenance: "historical";
    readOnly: true;
  };
  artifactNeighbors: {
    valid: string[];
    malformed: string[];
  };
  citationGraph: {
    nodes: string[];
    edges: [string, string][];
  };
  unicodeNote: { html: string };
};

const FIXTURE_REGISTRY_SCHEMA = "system-e2e-fixture-registry.v1";
const FORBIDDEN_FILE =
  /(?:^|\/)(?:[^/]+\.(?:sqlite|sqlite3|db|wal)|profiles?)(?:$|\/)/i;
const FORBIDDEN_KEY =
  /^(?:authors?|creators?|doi|isbn|credentials?|password|token|profile|dataRoot|sourceItemId|(?:sha\d*|contentHash))$/i;

function record(value: unknown, code: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(code);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, code: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(code);
  return value;
}

function positiveInteger(value: unknown, code: string) {
  if (!Number.isSafeInteger(value) || Number(value) < 1) throw new Error(code);
  return Number(value);
}

function stringArray(value: unknown, code: string) {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((entry) => typeof entry !== "string" || !entry.trim())
  ) {
    throw new Error(code);
  }
  return value as string[];
}

function validateStructuralFacts(value: unknown): Phase1StructuralFacts {
  const facts = record(value, "fixture_structural_facts_invalid");
  const referencePages = record(
    facts.referencePages,
    "fixture_structural_fact_invalid:referencePages",
  );
  const itemCount = positiveInteger(
    referencePages.itemCount,
    "fixture_structural_fact_invalid:referencePages",
  );
  const pageSize = positiveInteger(
    referencePages.pageSize,
    "fixture_structural_fact_invalid:referencePages",
  );
  if (itemCount <= pageSize) {
    throw new Error("fixture_structural_fact_invalid:referencePages");
  }
  text(
    referencePages.titlePrefix,
    "fixture_structural_fact_invalid:referencePages",
  );
  text(referencePages.year, "fixture_structural_fact_invalid:referencePages");

  const historicalTopic = record(
    facts.historicalTopic,
    "fixture_structural_fact_invalid:historicalTopic",
  );
  text(
    historicalTopic.topicId,
    "fixture_structural_fact_invalid:historicalTopic",
  );
  text(
    historicalTopic.pathId,
    "fixture_structural_fact_invalid:historicalTopic",
  );
  if (
    historicalTopic.provenance !== "historical" ||
    historicalTopic.readOnly !== true
  ) {
    throw new Error("fixture_structural_fact_invalid:historicalTopic");
  }

  const artifactNeighbors = record(
    facts.artifactNeighbors,
    "fixture_structural_fact_invalid:artifactNeighbors",
  );
  stringArray(
    artifactNeighbors.valid,
    "fixture_structural_fact_invalid:artifactNeighbors",
  );
  stringArray(
    artifactNeighbors.malformed,
    "fixture_structural_fact_invalid:artifactNeighbors",
  );

  const citationGraph = record(
    facts.citationGraph,
    "fixture_structural_fact_invalid:citationGraph",
  );
  const nodes = stringArray(
    citationGraph.nodes,
    "fixture_structural_fact_invalid:citationGraph",
  );
  if (
    !Array.isArray(citationGraph.edges) ||
    citationGraph.edges.length === 0 ||
    citationGraph.edges.some(
      (edge) =>
        !Array.isArray(edge) ||
        edge.length !== 2 ||
        edge.some((node) => typeof node !== "string" || !nodes.includes(node)),
    )
  ) {
    throw new Error("fixture_structural_fact_invalid:citationGraph");
  }

  const unicodeNote = record(
    facts.unicodeNote,
    "fixture_structural_fact_invalid:unicodeNote",
  );
  const html = text(
    unicodeNote.html,
    "fixture_structural_fact_invalid:unicodeNote",
  );
  if (![...html].some((character) => (character.codePointAt(0) || 0) > 127)) {
    throw new Error("fixture_structural_fact_invalid:unicodeNote");
  }
  return value as Phase1StructuralFacts;
}

export function validateFixtureRegistry(value: unknown): FixtureRegistry {
  const input = record(value, "fixture_registry_invalid");
  if (input.schemaVersion !== FIXTURE_REGISTRY_SCHEMA) {
    throw new Error("fixture_registry_schema_invalid");
  }
  if (!Array.isArray(input.fixtures) || input.fixtures.length === 0) {
    throw new Error("fixture_registry_invalid");
  }
  const seen = new Set<string>();
  for (const raw of input.fixtures) {
    const entry = record(raw, "fixture_registry_invalid");
    const fixtureId = text(entry.fixtureId, "fixture_registry_invalid");
    text(entry.schemaVersion, "fixture_registry_invalid");
    positiveInteger(entry.fixtureRevision, "fixture_registry_invalid");
    if (
      seen.has(fixtureId) ||
      !Array.isArray(entry.references) ||
      entry.references.some(
        (reference) => typeof reference !== "string" || !reference.trim(),
      )
    ) {
      throw new Error("fixture_registry_invalid");
    }
    seen.add(fixtureId);
  }
  return value as FixtureRegistry;
}

function assertPortable(value: unknown, key = "seed") {
  if (typeof value === "string") {
    if (path.isAbsolute(value) || /^[A-Za-z]:[\\/]/.test(value)) {
      throw new Error(`fixture_privacy_absolute_path:${key}`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => assertPortable(entry, key));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [childKey, child] of Object.entries(value)) {
    if (FORBIDDEN_KEY.test(childKey)) {
      throw new Error(`fixture_privacy_forbidden_field:${childKey}`);
    }
    assertPortable(child, childKey);
  }
}

export function validateCommittedSeed(
  value: unknown,
  registryValue: unknown,
): {
  identity: FixtureIdentity;
  facts: Record<string, number>;
  structuralFacts: Phase1StructuralFacts;
} {
  const registry = validateFixtureRegistry(registryValue);
  const seed = record(value, "fixture_seed_invalid");
  const identity = {
    schemaVersion: text(seed.schemaVersion, "fixture_identity_invalid"),
    fixtureId: text(seed.fixtureId, "fixture_identity_invalid"),
    fixtureRevision: positiveInteger(
      seed.fixtureRevision,
      "fixture_identity_invalid",
    ),
  };
  const active = registry.fixtures.find(
    (entry) => entry.fixtureId === identity.fixtureId,
  );
  if (
    !active ||
    active.schemaVersion !== identity.schemaVersion ||
    active.fixtureRevision !== identity.fixtureRevision
  ) {
    throw new Error("fixture_registry_mismatch");
  }
  const facts = record(seed.facts, "fixture_facts_invalid");
  if (
    Object.values(facts).some(
      (fact) => !Number.isSafeInteger(fact) || Number(fact) < 0,
    ) ||
    !Array.isArray(seed.items)
  ) {
    throw new Error("fixture_facts_invalid");
  }
  assertPortable(seed);
  return {
    identity,
    facts: Object.fromEntries(
      Object.entries(facts).map(([key, fact]) => [key, Number(fact)]),
    ),
    structuralFacts: validateStructuralFacts(seed.structuralFacts),
  };
}

export function canRetireFixtureRevision(
  registryValue: unknown,
  fixtureId: string,
  fixtureRevision: number,
) {
  const registry = validateFixtureRegistry(registryValue);
  const fixture = registry.fixtures.find(
    (entry) =>
      entry.fixtureId === fixtureId &&
      entry.fixtureRevision === fixtureRevision,
  );
  return Boolean(fixture && fixture.references.length === 0);
}

async function listFiles(root: string, relative = ""): Promise<string[]> {
  const entries = await readdir(path.join(root, relative), {
    withFileTypes: true,
  });
  const files: string[] = [];
  for (const entry of entries) {
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(root, child)));
    else if (entry.isFile()) files.push(child);
  }
  return files;
}

export async function validateFixturePrivacy(sourceDir: string) {
  const files = await listFiles(sourceDir);
  for (const file of files) {
    const portable = file.replace(/\\/g, "/");
    if (FORBIDDEN_FILE.test(portable)) {
      throw new Error(`fixture_privacy_forbidden_file:${portable}`);
    }
  }
  return files.sort();
}

export async function readFixtureRegistry(registryPath: string) {
  return validateFixtureRegistry(
    JSON.parse(await readFile(registryPath, "utf8")),
  );
}

export async function materializeCommittedSeed(args: {
  sourceDir: string;
  targetDir: string;
  registry: unknown;
}) {
  const sourceDir = path.resolve(args.sourceDir);
  const targetDir = path.resolve(args.targetDir);
  const seed = JSON.parse(
    await readFile(path.join(sourceDir, "seed.json"), "utf8"),
  ) as CommittedSeed;
  const validated = validateCommittedSeed(seed, args.registry);
  await validateFixturePrivacy(sourceDir);
  if (sourceDir === targetDir) throw new Error("fixture_target_invalid");
  await rm(targetDir, { recursive: true, force: true });
  await mkdir(targetDir, { recursive: true });
  await cp(sourceDir, targetDir, { recursive: true, force: true });
  await writeFile(
    path.join(targetDir, "materialization.json"),
    `${JSON.stringify(validated, null, 2)}\n`,
    "utf8",
  );
  return validated;
}
