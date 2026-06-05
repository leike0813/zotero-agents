import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { renderPayloadBlock } from "../../src/modules/notePayloadCodec";
import { handleZoteroMcpRequestForTests } from "../../src/modules/zoteroMcpServer";
import { createZoteroSynthesisLibraryAdapter } from "../../src/modules/synthesis/libraryAdapter";
import { createSynthesisService } from "../../src/modules/synthesis/service";

async function makeRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), "zs-synthesis-mvp-"));
}

async function createPaper(args: {
  itemType?: string;
  title: string;
  date?: string;
  doi?: string;
  url?: string;
  tags?: string[];
  creators?: Array<{ firstName?: string; lastName?: string; name?: string }>;
  collection?: Zotero.Collection;
}) {
  const item = new Zotero.Item(args.itemType || "journalArticle");
  item.libraryID = Zotero.Libraries.userLibraryID;
  item.setField("title", args.title);
  if (args.date) {
    item.setField("date", args.date);
  }
  if (args.doi) {
    item.setField("DOI", args.doi);
  }
  if (args.url) {
    item.setField("url", args.url);
  }
  for (const tag of args.tags || []) {
    item.addTag(tag);
  }
  item.setCreators?.(args.creators || []);
  if (args.collection) {
    item.addToCollection((args.collection as any).id || args.collection.key);
  }
  await item.saveTx();
  return item;
}

async function createCollection(name: string) {
  const collection = new Zotero.Collection();
  collection.libraryID = Zotero.Libraries.userLibraryID;
  collection.name = name;
  await collection.saveTx();
  return collection;
}

async function addPayloadNote(
  parent: Zotero.Item,
  title: string,
  payloadType: string,
  payload: unknown,
  payloadFormat: "json" | "text" = "json",
) {
  const note = new Zotero.Item("note");
  note.libraryID = parent.libraryID;
  note.parentItemID = parent.id;
  note.setField("title", title);
  note.setNote(
    [
      `<div><h1>${title}</h1>`,
      renderPayloadBlock({
        payloadType,
        payload,
        payloadFormat,
      }),
      "</div>",
    ].join("\n"),
  );
  await note.saveTx();
  return note;
}

async function addDigestNoteWithRepresentativeImage(
  parent: Zotero.Item,
  markdown: string,
  imagePath: string,
) {
  const note = new Zotero.Item("note");
  note.libraryID = parent.libraryID;
  note.parentItemID = parent.id;
  note.setField("title", "Digest");
  note.setNote('<div data-zs-note-kind="digest"><h1>Digest</h1></div>');
  await note.saveTx();

  const image = new Zotero.Item("attachment");
  image.libraryID = parent.libraryID;
  image.parentItemID = note.id;
  image.setField("title", "representative_image.jpg");
  image.setField("contentType", "image/jpeg");
  (image as any).setFilePath(imagePath);
  await image.saveTx();

  note.setNote(
    [
      '<div data-zs-note-kind="digest">',
      "<h1>Digest</h1>",
      '<div data-zs-block="representative-image" data-zs-version="1"',
      ' data-zs-representative_image_status="embedded"',
      ` data-zs-representative_image_attachment_key="${image.key}"`,
      ' data-zs-representative_image_source_kind="markdown_image_ref"',
      ' data-zs-representative_image_strategy="markdown_src_hint"',
      ' data-zs-representative_image_width="320"',
      ' data-zs-representative_image_height="180"',
      ' data-zs-representative_image_compressed_bytes="4">',
      '<figure data-zs-block="representative-image-figure">',
      `<img data-attachment-key="${image.key}" alt="Figure 2" />`,
      "<figcaption>Figure 2</figcaption>",
      "</figure>",
      "</div>",
      renderPayloadBlock({
        payloadType: "digest-markdown",
        payload: markdown,
        payloadFormat: "text",
      }),
      "</div>",
    ].join("\n"),
  );
  await note.saveTx();
  return { note, image };
}

function validBundle(topicId: string, paperRefs: string[]) {
  return {
    kind: "topic_synthesis",
    mode: "create",
    base_hashes: {
      artifact: "",
      metadata: "",
      index: "",
    },
    topic_definition: {
      id: topicId,
      title: "Alpha Topic",
    },
    topic_resolver: {
      mode: "tag_query",
      query: { and: ["topic:alpha"] },
    },
    resolved_paper_set: {
      papers: paperRefs.map((paper_ref) => ({
        paper_ref,
        match_reasons: ["tag_query"],
      })),
    },
    resolver_diagnostics: {
      final_count: paperRefs.length,
    },
    artifact_metadata: {
      depends_on: {
        papers: paperRefs,
        artifacts: [],
      },
    },
    markdown: "# Alpha Topic\n\n## Timeline\n\n2024: Alpha topic.",
    timeline: "2024: Alpha topic.",
  };
}

function mcpRequest(
  id: number,
  name: string,
  args: Record<string, unknown> = {},
) {
  return {
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: {
      name,
      arguments: args,
    },
  };
}

describe("Synthesis Layer MVP real-data closure", function () {
  it("uses Zotero year metadata when date is unavailable", async function () {
    const item = new Zotero.Item("journalArticle");
    item.libraryID = Zotero.Libraries.userLibraryID;
    item.setField("title", "Year Field Paper");
    item.setField("year", "2024");
    await item.saveTx();

    const adapter = createZoteroSynthesisLibraryAdapter({
      libraryId: Zotero.Libraries.userLibraryID,
    });
    const input = await adapter.getRegistryInputSummaryForItem?.({
      libraryId: Zotero.Libraries.userLibraryID,
      itemKey: item.key,
    });

    assert.equal(input?.year, "2024");
  });

  it("uses Zotero.Items.getAll(libraryId) for sparse high-ID registry candidates", async function () {
    const item = new Zotero.Item("journalArticle");
    item.id = 1892;
    item.key = "SYNHIGH1";
    item.libraryID = Zotero.Libraries.userLibraryID;
    item.setField("title", "Synthesis Sparse High ID Paper");
    item.setField("date", "2026");
    item.setCreators?.([{ lastName: "Sparse" }]);
    await item.saveTx();

    const previousGet = Zotero.Items.get;
    (Zotero.Items as any).get = (id: number) => {
      throw new Error(`unexpected sparse item scan for ${id}`);
    };

    try {
      const adapter = createZoteroSynthesisLibraryAdapter({
        libraryId: Zotero.Libraries.userLibraryID,
      });
      const index = await adapter.getLibraryIndex();
      const fingerprints =
        (await adapter.getRegistryMetadataFingerprints?.()) || [];

      assert.include(
        index.papers.map((paper) => paper.item_key),
        item.key,
      );
      assert.include(
        fingerprints.map((entry) => entry.item_key),
        item.key,
      );
    } finally {
      (Zotero.Items as any).get = previousGet;
    }
  });

  it("builds library index and registry from mock Zotero metadata and child artifact notes", async function () {
    const collection = await createCollection("Topic Alpha");
    const alpha = await createPaper({
      title: "Alpha Paper",
      date: "2024-03-01",
      doi: "10.1234/alpha",
      tags: ["topic:alpha", "method:survey"],
      creators: [{ firstName: "Ada", lastName: "Alpha" }],
      collection,
    });
    await addPayloadNote(
      alpha,
      "Digest",
      "digest-markdown",
      "# Alpha Digest",
      "text",
    );
    await addPayloadNote(alpha, "References", "references-json", {
      references: [
        {
          title: "Beta Paper",
          year: "2023",
          authors: ["Beta"],
        },
      ],
    });
    await addPayloadNote(alpha, "Citation Analysis", "citation-analysis-json", {
      citations: [{ reference_index: 0, role: "background" }],
    });
    await createPaper({
      title: "Beta Paper",
      date: "2023",
      tags: ["topic:beta"],
      creators: [{ lastName: "Beta" }],
    });

    const service = createSynthesisService({
      root: await makeRoot(),
      libraryId: Zotero.Libraries.userLibraryID,
      libraryAdapter: createZoteroSynthesisLibraryAdapter({
        libraryId: Zotero.Libraries.userLibraryID,
      }),
    });

    const index = await service.getLibraryIndex();
    const firstIndexPage = await service.getLibraryIndex({ limit: 1 });
    const secondIndexPage = await service.getLibraryIndex({
      cursor: firstIndexPage.next_cursor,
      limit: 1,
    });
    const artifactManifest = await service.getPaperArtifactManifest({
      paper_ref: `${alpha.libraryID}:${alpha.key}`,
    });
    await service.refreshReferenceSidecarNow();
    const registry = await service.getReferenceSidecarIndex();

    assert.deepEqual(
      index.papers.map((paper) => paper.title),
      ["Alpha Paper", "Beta Paper"],
    );
    assert.includeMembers(
      index.tags.map((tag) => tag.tag),
      ["topic:alpha", "topic:beta", "method:survey"],
    );
    assert.include(
      index.collections.map((entry) => entry.name),
      "Topic Alpha",
    );
    assert.equal(firstIndexPage.returned, 1);
    assert.equal(firstIndexPage.total_papers, 2);
    assert.equal(firstIndexPage.has_more, true);
    assert.equal(secondIndexPage.has_more, false);
    assert.equal(secondIndexPage.returned, 1);
    assert.equal(secondIndexPage.index_hash, firstIndexPage.index_hash);
    assert.match(firstIndexPage.page_hash || "", /^sha256:/);
    assert.lengthOf(artifactManifest.artifacts, 3);
    assert.deepInclude(artifactManifest.artifacts[0], {
      paper_ref: `${alpha.libraryID}:${alpha.key}`,
      artifact_type: "digest",
      status: "available",
      payload_type: "digest-markdown",
    });
    assert.notProperty(artifactManifest.artifacts[0], "markdown");
    assert.notProperty(artifactManifest.artifacts[0], "payload");
    assert.equal(registry.total, 2);
    const alphaRow = registry.rows.find((row) => row.item_key === alpha.key);
    assert.equal(alphaRow?.artifacts.digest.status, "available");
    assert.equal(alphaRow?.artifacts.references.status, "available");
    assert.equal(alphaRow?.artifacts.citation_analysis.status, "available");
  });

  it("resolves topic resolvers, reads paper artifacts, and derives citation graph from Zotero notes", async function () {
    const alpha = await createPaper({
      title: "Alpha Paper",
      date: "2024",
      tags: ["topic:alpha", "domain:vision"],
      creators: [{ lastName: "Alpha" }],
    });
    const beta = await createPaper({
      title: "Beta Paper",
      date: "2023",
      tags: ["topic:alpha", "exclude:reviewed"],
      creators: [{ lastName: "Beta" }],
    });
    await addPayloadNote(alpha, "References", "references-json", {
      references: [
        {
          title: "Beta Paper",
          year: "2023",
          authors: ["Beta"],
        },
      ],
    });
    await addPayloadNote(alpha, "Citation Analysis", "citation-analysis-json", {
      citations: [{ reference_index: 0, role: "method" }],
    });

    const service = createSynthesisService({
      root: await makeRoot(),
      libraryId: Zotero.Libraries.userLibraryID,
      libraryAdapter: createZoteroSynthesisLibraryAdapter({
        libraryId: Zotero.Libraries.userLibraryID,
      }),
    });

    const resolved = await service.resolveResolver({
      resolver: {
        mode: "mixed",
        include: [
          {
            mode: "tag_query",
            query: { and: ["topic:alpha"], or: ["domain:vision"] },
          },
        ],
        exclude: [{ mode: "tag_query", query: { and: ["exclude:reviewed"] } }],
      },
    });
    const artifacts = await service.readPaperArtifacts({
      paper_refs: [`${alpha.libraryID}:${alpha.key}`],
      artifact_types: ["references-json", "citation-analysis-json"] as any,
    });
    await service.refreshReferenceSidecarNow();
    await service.rebuildCitationGraphCacheNow();
    const graph = await service.queryCitationGraph();

    assert.deepEqual(
      resolved.papers.map((paper) => paper.paper_ref),
      [`${alpha.libraryID}:${alpha.key}`],
    );
    assert.equal(resolved.diagnostics.final_count, 1);
    assert.deepEqual(
      artifacts.artifacts.map((artifact) => artifact.artifact_type).sort(),
      ["citation_analysis", "references"],
    );
    assert.equal(
      artifacts.artifacts.every(
        (artifact) =>
          artifact.probe_source === "synthesis.read_paper_artifacts",
      ),
      true,
    );
    assert.includeMembers(artifacts.artifacts[0].payload_types_seen || [], [
      "references-json",
      "citation-analysis-json",
    ]);
    assert.equal(
      graph.nodes.some((node) => node.node_id === `zotero:item:${beta.key}`),
      true,
    );
    assert.equal(graph.edges[0].source, `zotero:item:${alpha.key}`);
    assert.equal(graph.edges[0].target, `zotero:item:${beta.key}`);
    assert.include(["method", "citation"], graph.edges[0].primary_role);
  });

  it("rejects non-canonical topic resolver fields inside resolve_resolver", async function () {
    await createPaper({
      title: "Alpha Paper",
      date: "2024",
      tags: ["topic:alpha"],
      creators: [{ lastName: "Alpha" }],
    });
    const service = createSynthesisService({
      root: await makeRoot(),
      libraryId: Zotero.Libraries.userLibraryID,
      libraryAdapter: createZoteroSynthesisLibraryAdapter({
        libraryId: Zotero.Libraries.userLibraryID,
      }),
    });

    const resolved = await service.resolveResolver({
      resolver: {
        selection_strategy: "tag_only",
        tag_criteria: "topic:alpha",
      },
    });

    assert.isFalse(resolved.ok);
    assert.equal(resolved.diagnostics.rejected, true);
    assert.match(
      resolved.errors.join("\n"),
      /mode|selection_strategy|tag_criteria/i,
    );
    assert.lengthOf(resolved.papers, 0);
  });

  it("marks a canonical resolver as invalid when it matches no papers", async function () {
    await createPaper({
      title: "Alpha Paper",
      date: "2024",
      tags: ["topic:alpha"],
      creators: [{ lastName: "Alpha" }],
    });
    const service = createSynthesisService({
      root: await makeRoot(),
      libraryId: Zotero.Libraries.userLibraryID,
      libraryAdapter: createZoteroSynthesisLibraryAdapter({
        libraryId: Zotero.Libraries.userLibraryID,
      }),
    });

    const resolved = await service.resolveResolver({
      resolver: {
        mode: "tag_query",
        query: "topic:missing",
      },
    });

    assert.isFalse(resolved.ok);
    assert.equal(resolved.diagnostics.final_count, 0);
    assert.match(resolved.errors.join("\n"), /matched no papers/i);
  });

  it("requires explicit resolver paper_refs to be an array", async function () {
    const service = createSynthesisService({
      root: await makeRoot(),
      libraryId: Zotero.Libraries.userLibraryID,
      registryInputs: [],
    });

    const resolved = await service.resolveResolver({
      resolver: {
        mode: "explicit",
        paper_refs: "1:ABCD1234",
      },
    });

    assert.isFalse(resolved.ok);
    assert.equal(resolved.diagnostics.rejected, true);
    assert.match(resolved.errors.join("\n"), /paper_refs.*array/i);
  });

  it("serves persisted topic, registry, graph, MCP, and review input from one service state", async function () {
    const alpha = await createPaper({
      title: "Alpha Paper",
      date: "2024",
      tags: ["topic:alpha"],
      creators: [{ lastName: "Alpha" }],
    });
    await addPayloadNote(
      alpha,
      "Digest",
      "digest-markdown",
      "# Alpha Digest",
      "text",
    );
    const root = await makeRoot();
    const service = createSynthesisService({
      root,
      libraryId: Zotero.Libraries.userLibraryID,
      libraryAdapter: createZoteroSynthesisLibraryAdapter({
        libraryId: Zotero.Libraries.userLibraryID,
      }),
    });

    const paperRef = `${alpha.libraryID}:${alpha.key}`;
    await service.applyTopicSynthesisResult(
      validBundle("topic-alpha", [paperRef]),
    );
    await service.refreshReferenceSidecarNow();
    await service.rebuildCitationGraphCacheNow();
    const graph = await service.queryCitationGraph();
    const snapshot = await service.getSynthesisSnapshot();
    const reviewInput = await service.getReviewInput({
      topicId: "topic-alpha",
    });
    const mcpResponse: any = await handleZoteroMcpRequestForTests(
      mcpRequest(1, "synthesis.get_reference_sidecar_index"),
      { resolveSynthesisService: () => service },
    );
    assert.equal(snapshot.artifacts.rows[0].id, "topic-alpha");
    assert.equal(snapshot.registry.rows[0].paper_ref, paperRef);
    assert.equal(reviewInput.topic.topic_id, "topic-alpha");
    assert.equal(
      reviewInput.registry_artifact_coverage.rows[0].paper_ref,
      paperRef,
    );
    assert.equal(
      mcpResponse.result.structuredContent.result.rows[0].paper_ref,
      paperRef,
    );
    assert.match(graph.graph_hash, /^sha256:/);
    assert.equal(snapshot.graph.diagnostics.cache_status, "ready");
  });

  it("resolves digest representative image data for the topic digest modal", async function () {
    const root = await makeRoot();
    const imageBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    const imagePath = path.join(root, "representative_image.jpg");
    await fs.writeFile(imagePath, imageBytes);
    const paper = await createPaper({
      title: "Representative Image Paper",
      date: "2026",
    });
    const { note, image } = await addDigestNoteWithRepresentativeImage(
      paper,
      "# Representative Digest",
      imagePath,
    );
    const service = createSynthesisService({
      root,
      libraryId: Zotero.Libraries.userLibraryID,
      libraryAdapter: createZoteroSynthesisLibraryAdapter({
        libraryId: Zotero.Libraries.userLibraryID,
      }),
    });

    const result: any = await service.resolveTopicPaperDigest({
      paper_ref: `${paper.libraryID}:${paper.key}`,
      digest_ref: {
        note_key: note.key,
        payload_type: "digest-markdown",
      },
      include_representative_image: true,
    });

    assert.equal(result.ok, true);
    assert.equal(result.digest_markdown, "# Representative Digest");
    assert.equal(result.representative_image.status, "available");
    assert.equal(result.representative_image.attachment_key, image.key);
    assert.equal(result.representative_image.alt, "Figure 2");
    assert.equal(result.representative_image.caption, "Figure 2");
    assert.equal(result.representative_image.width, 320);
    assert.equal(result.representative_image.height, 180);
    assert.match(
      result.representative_image.data_url,
      /^data:image\/jpeg;base64,/,
    );

    const defaultResult: any = await service.resolveTopicPaperDigest({
      paper_ref: `${paper.libraryID}:${paper.key}`,
      digest_ref: {
        note_key: note.key,
        payload_type: "digest-markdown",
      },
    });
    assert.notProperty(defaultResult, "representative_image");
  });
});
