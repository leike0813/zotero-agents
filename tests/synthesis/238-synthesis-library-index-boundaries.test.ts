import { assert } from "chai";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  canonicalizeSynthesisContractJson,
  hashSynthesisContractCanonicalJson,
} from "../../packages/synthesis-contracts/src/canonicalJson";
import type { SynthesisLibraryIndexRequest } from "../../packages/synthesis-contracts/src/libraryIndex";
import { createNativeSynthesisClientComposition } from "../../src/modules/synthesisClient/nativeComposition";
import {
  SYNTHESIS_PRODUCTION_ROUTE_CLIENT_TOKEN,
  startSynthesisProductionRouteSidecar,
  stopSynthesisProductionRouteSidecar,
  synthesisProductionRouteConfig,
} from "../helpers/synthesisProductionRouteHarness";

describe("Synthesis Library Index boundaries", function () {
  this.timeout(30_000);
  let empty = false;
  let root: string;
  let server: http.Server;
  let sidecar: ReturnType<typeof startSynthesisProductionRouteSidecar>;
  let composition: ReturnType<typeof createNativeSynthesisClientComposition>;

  function seedTopics(statuses: Array<string | undefined>) {
    const database = new DatabaseSync(path.join(root, "state", "synthesis.db"));
    const ids = statuses.map(
      (_, index) => `index-${String(index).padStart(3, "0")}`,
    );
    const insert = database.prepare(`INSERT INTO synt_topic_application_state
      (topic_id,path_id,title,operation,manifest_hash,artifact_hash,metadata_hash,
       bundle_hash,topic_definition_json,topic_resolver_json,resolved_paper_set_json,updated_at)
      VALUES (?,?,?,'update_full',?,?,?,'fixture-bundle',?,?,?,'2026-01-01T00:00:00.000Z')`);
    for (const [index, id] of ids.entries()) {
      const pathId = `${id}-${hashSynthesisContractCanonicalJson({ topic_id: id }).slice(7)}`;
      const topic = {
        id,
        title: id,
        ...(statuses[index] ? { status: statuses[index] } : {}),
      };
      const artifact = { topic };
      const metadata = { data: { topic_id: id } };
      const manifest = {
        topic_id: id,
        artifact_hash: hashSynthesisContractCanonicalJson(artifact),
        metadata_hash: hashSynthesisContractCanonicalJson(metadata),
        sections: { topic: { path: "topic.json" } },
        section_hashes: { topic: hashSynthesisContractCanonicalJson(topic) },
      };
      const current = path.join(
        root,
        "data",
        "synthesis",
        "topics",
        pathId,
        "current",
      );
      fs.mkdirSync(path.join(current, "sections"), { recursive: true });
      for (const [name, value] of Object.entries({
        "manifest.json": manifest,
        "artifact.json": artifact,
        "metadata.json": metadata,
        "sections/topic.json": topic,
      }))
        fs.writeFileSync(
          path.join(current, name),
          `${canonicalizeSynthesisContractJson(value)}\n`,
        );
      insert.run(
        id,
        pathId,
        id,
        hashSynthesisContractCanonicalJson(manifest),
        manifest.artifact_hash,
        manifest.metadata_hash,
        JSON.stringify(topic),
        JSON.stringify({
          paper_refs: [],
          collection_key: [],
          combine: "union",
        }),
        JSON.stringify({ papers: [] }),
      );
    }
    return {
      ids,
      close() {
        database.exec("DELETE FROM synt_topic_application_state");
        database.close();
      },
    };
  }

  before(async function () {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-index-boundaries-"));
    server = http.createServer(async (request, response) => {
      let source = "";
      for await (const chunk of request) source += chunk;
      const { capability, payload } = JSON.parse(source);
      let result: unknown;
      if (capability === "webdav.describe") {
        result = { configured: false };
      } else if (capability === "library.items.list_page") {
        const items = empty
          ? []
          : ["AAAA1111", "BBBB2222"].map((key, index) => ({
              paperRef: `7:${key}`,
              libraryId: 7,
              itemKey: key,
              title: `Synthetic ${index}`,
              year: "2026",
              itemType: "journalArticle",
              creators: [],
              tags: [`tag:${index}`],
              collections: [`COLL000${index}`],
            }));
        result = {
          items,
          cursor: payload.cursor || "",
          nextCursor: "",
          hasMore: false,
          returned: items.length,
          limit: payload.limit,
          snapshotRevision: "index-fixture",
        };
      } else {
        response.writeHead(500).end();
        return;
      }
      const body = JSON.stringify({ ok: true, result });
      response.writeHead(200, {
        "content-type": "application/json",
        "content-length": Buffer.byteLength(body),
      });
      response.end(body);
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Host unavailable");
    const session = path.join(root, "session");
    fs.mkdirSync(session);
    const configPath = path.join(session, "config.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        ...synthesisProductionRouteConfig({
          root,
          session,
          supervisorInstanceId: "index-boundaries",
          reverseHostPort: address.port,
        }),
        libraryId: 7,
      }),
    );
    sidecar = startSynthesisProductionRouteSidecar(configPath);
    const { port } = await sidecar.listening;
    const health = await (
      await fetch(`http://127.0.0.1:${port}/synthesis/v1/health`)
    ).json();
    composition = createNativeSynthesisClientComposition({
      getReadyConnection: () => ({
        discovery: {
          host: "127.0.0.1",
          port,
          profileId: "1".repeat(64),
          serviceInstanceId: health.serviceInstanceId,
        },
        clientToken: SYNTHESIS_PRODUCTION_ROUTE_CLIENT_TOKEN,
      }),
    });
  });

  after(async function () {
    await composition?.dispose();
    if (sidecar) await stopSynthesisProductionRouteSidecar(sidecar.child);
    if (server)
      await new Promise<void>((resolve) => server.close(() => resolve()));
    if (root) fs.rmSync(root, { recursive: true, force: true });
  });

  for (const [partition, cursor, include] of [
    ["tags", "tagCursor", "includeTags"],
    ["collections", "collectionCursor", "includeCollections"],
    ["registry", "registryCursor", "includeItems"],
  ] as const) {
    it(`continues ${partition} independently of the papers page`, async function () {
      const request: SynthesisLibraryIndexRequest = {
        limit: 1,
        [include]: true,
      };
      const first = await composition.client.libraryIndex.getPage(request);
      assert.lengthOf(first[partition]!.items, 1);
      assert.isTrue(first[partition]!.hasMore);
      const next = await composition.client.libraryIndex.getPage({
        ...request,
        [cursor]: first[partition]!.nextCursor,
      });
      assert.lengthOf(next[partition]!.items, 1);
      assert.notDeepEqual(next[partition]!.items, first[partition]!.items);
      assert.isFalse(next[partition]!.hasMore);
      assert.deepEqual(next.papers, first.papers);
    });
  }

  it("continues the papers page using the existing cursor", async function () {
    const first = await composition.client.libraryIndex.getPage({ limit: 1 });
    assert.isTrue(first.has_more);
    const next = await composition.client.libraryIndex.getPage({
      limit: 1,
      cursor: first.next_cursor,
    });
    assert.lengthOf(next.papers, 1);
    assert.notDeepEqual(next.papers, first.papers);
    assert.isFalse(next.has_more);
  });

  it("keeps the configured Library scope in populated results and collections", async function () {
    const populated = await composition.client.libraryIndex.getPage({
      includeCollections: true,
    });
    assert.equal(populated.libraryId, 7);
    assert.deepEqual(
      populated.collections!.items.map((row) => row.library_id),
      [7, 7],
    );
  });

  it("keeps the configured Library scope in empty results", async function () {
    empty = true;
    try {
      const vacant = await composition.client.libraryIndex.getPage({
        includeCollections: true,
      });
      assert.equal(vacant.libraryId, 7);
      assert.isEmpty(vacant.papers);
      assert.isEmpty(vacant.collections!.items);
    } finally {
      empty = false;
    }
  });

  it("keeps archived lifecycle status, omits ordinary status and excludes deleted topics", async function () {
    const fixture = seedTopics([
      undefined,
      " ARCHIVED ",
      " Deleted ",
      undefined,
    ]);
    const graph = new DatabaseSync(path.join(root, "state", "synthesis.db"));
    const insertGraph = graph.prepare(`INSERT INTO synt_topic_graph_node
      (topic_id, title, node_type, definition_status) VALUES (?, ?, 'materialized', 'deleted')`);
    // An explicit archived definition takes precedence; otherwise graph deletion applies.
    for (const id of [fixture.ids[1], fixture.ids[3]]) insertGraph.run(id, id);
    try {
      const page = await composition.client.libraryIndex.getPage({
        includeItems: true,
      });
      assert.sameMembers(
        page.topics!.items.map((row) => row.topic_id),
        fixture.ids.slice(0, 2),
      );
      const ordinary = page.topics!.items.find(
        (row) => row.topic_id === fixture.ids[0],
      )!;
      const archived = page.topics!.items.find(
        (row) => row.topic_id === fixture.ids[1],
      )!;
      assert.notProperty(ordinary, "status");
      assert.equal(archived.status, "archived");
      assert.equal(page.topics!.total, 2);
    } finally {
      graph.exec("DELETE FROM synt_topic_graph_node");
      graph.close();
      fixture.close();
    }
  });

  it("merges planned graph-only topics in stable ID order without invented artifact fields", async function () {
    const fixture = seedTopics([undefined]);
    const graph = new DatabaseSync(path.join(root, "state", "synthesis.db"));
    const insert = graph.prepare(`INSERT INTO synt_topic_graph_node
      (topic_id,title,node_type,definition_status,updated_at)
      VALUES (?,?,'placeholder',?,'2026-01-02T00:00:00.000Z')`);
    insert.run("z-planned", "Later planned topic", "placeholder");
    insert.run("a-planned", "Earlier planned topic", "placeholder");
    insert.run("b-deleted", "Deleted plan", "deleted");
    insert.run(fixture.ids[0], "Stale graph title", "has_synthesis");
    try {
      const first = await composition.client.libraryIndex.getPage({
        limit: 2,
        includeItems: true,
      });
      assert.equal(first.topics!.total, 3);
      assert.deepEqual(
        first.topics!.items.map((row) => row.topic_id),
        ["a-planned", fixture.ids[0]],
      );
      assert.isTrue(first.topics!.hasMore);
      const next = await composition.client.libraryIndex.getPage({
        limit: 2,
        includeItems: true,
        topicCursor: first.topics!.nextCursor,
      });
      assert.deepEqual(
        next.topics!.items.map((row) => row.topic_id),
        ["z-planned"],
      );
      assert.isFalse(next.topics!.hasMore);
      for (const row of [first.topics!.items[0], next.topics!.items[0]]) {
        assert.notProperty(row, "status");
        assert.notProperty(row, "current_artifact_path");
        assert.notProperty(row, "created_at");
        assert.equal(row.updated_at, "2026-01-02T00:00:00.000Z");
      }
      assert.equal(first.topics!.items[1].title, fixture.ids[0]);
    } finally {
      graph.exec("DELETE FROM synt_topic_graph_node");
      graph.close();
      fixture.close();
    }
  });

  it("continues topics beyond the first domain page without truncating total", async function () {
    const fixture = seedTopics(Array.from({ length: 102 }, () => undefined));
    try {
      const first = await composition.client.libraryIndex.getPage({
        limit: 100,
        includeItems: true,
      });
      assert.equal(first.topics!.total, 102);
      assert.lengthOf(first.topics!.items, 100);
      assert.isTrue(first.topics!.hasMore);
      const next = await composition.client.libraryIndex.getPage({
        limit: 100,
        includeItems: true,
        topicCursor: first.topics!.nextCursor,
      });
      assert.lengthOf(next.topics!.items, 2);
      assert.isFalse(next.topics!.hasMore);
      assert.sameMembers(
        [...first.topics!.items, ...next.topics!.items].map(
          (row) => row.topic_id,
        ),
        fixture.ids,
      );
    } finally {
      fixture.close();
    }
  });

  it("continues topics independently of the papers and registry pages", async function () {
    // Reuse the canonical snapshots exercised by TopicApplication's fixture tests.
    // Seed persistence only; both page assertions use the real TS → Rust route.
    const fixtures = path.resolve(
      import.meta.dirname,
      "../fixtures/synthesis-topics-sample",
    );
    const states = JSON.parse(
      fs.readFileSync(path.join(fixtures, "repository-state.json"), "utf8"),
    ).slice(0, 2);
    const database = new DatabaseSync(path.join(root, "state", "synthesis.db"));
    try {
      const insert = database.prepare(`INSERT INTO synt_topic_application_state
        (topic_id, path_id, title, definition, language, operation,
         manifest_hash, artifact_hash, metadata_hash, bundle_hash, paper_count,
         topic_definition_json, topic_resolver_json, resolved_paper_set_json,
         created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      for (const state of states) {
        const topicRoot = path.join(fixtures, "topics", state.pathId);
        fs.cpSync(
          topicRoot,
          path.join(root, "data", "synthesis", "topics", state.pathId),
          { recursive: true },
        );
        const manifest = JSON.parse(
          fs.readFileSync(
            path.join(topicRoot, "current", "manifest.json"),
            "utf8",
          ),
        );
        const metadata = JSON.parse(
          fs.readFileSync(
            path.join(topicRoot, "current", "metadata.json"),
            "utf8",
          ),
        );
        insert.run(
          state.topicId,
          state.pathId,
          state.title,
          state.definition,
          metadata.data.language,
          metadata.data.operation,
          hashSynthesisContractCanonicalJson(manifest),
          manifest.artifact_hash,
          manifest.metadata_hash,
          metadata.data.bundle_hash,
          metadata.data.paper_count,
          JSON.stringify(state.topicDefinition),
          JSON.stringify({
            paper_refs: [],
            collection_key: [],
            combine: "union",
          }),
          JSON.stringify({ papers: [] }),
          metadata.created_at,
          metadata.updated_at,
        );
      }
      const first = await composition.client.libraryIndex.getPage({
        limit: 1,
        includeItems: true,
      });
      assert.lengthOf(first.topics!.items, 1);
      assert.isTrue(first.topics!.hasMore);
      const next = await composition.client.libraryIndex.getPage({
        limit: 1,
        includeItems: true,
        topicCursor: first.topics!.nextCursor,
      });
      assert.lengthOf(next.topics!.items, 1);
      assert.isFalse(next.topics!.hasMore);
      assert.sameMembers(
        [...first.topics!.items, ...next.topics!.items].map(
          (row) => row.topic_id,
        ),
        states.map((state: { topicId: string }) => state.topicId),
      );
      assert.deepEqual(next.papers, first.papers);
      assert.deepEqual(next.registry, first.registry);
    } finally {
      database.exec("DELETE FROM synt_topic_application_state");
      database.close();
    }
  });
});
