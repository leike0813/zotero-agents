import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  buildWorkbenchPayloadEnvelope,
  buildWorkbenchPayloadPngBytes,
  renderPayloadBlock,
} from "../../src/modules/notePayloadCodec";
import { handleZoteroMcpRequestForTests } from "../../src/modules/zoteroMcpServer";
import { createZoteroSynthesisLibraryAdapter } from "../../src/modules/synthesis/libraryAdapter";
import { createSynthesisService } from "../../src/modules/synthesis/service";
import {
  installRuntimeBridgeOverrideForTests,
  resetRuntimeBridgeOverrideForTests,
} from "../../src/utils/runtimeBridge";

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

const basePngBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64",
);

async function addEmbeddedLiteratureScoreNote(
  parent: Zotero.Item,
  payload: unknown,
) {
  const note = new Zotero.Item("note");
  note.libraryID = parent.libraryID;
  note.parentItemID = parent.id;
  note.setField("title", "Literature Score");
  note.setNote(
    '<div data-zs-note-kind="literature-score"><h1>Literature Score</h1></div>',
  );
  await note.saveTx();

  const envelope = buildWorkbenchPayloadEnvelope({
    noteKind: "literature-score",
    payloadType: "literature-score-json",
    payload,
    noteId: note.id,
    noteKey: note.key,
    parentId: parent.id,
  });
  const filePath = path.join(
    await makeRoot(),
    `literature-score-${note.key}.png`,
  );
  await fs.writeFile(
    filePath,
    buildWorkbenchPayloadPngBytes(basePngBytes, envelope),
  );
  const attachment = new Zotero.Item("attachment") as Zotero.Item & {
    attachmentContentType?: string;
    attachmentFilename?: string;
    setFilePath?: (path: string) => void;
  };
  attachment.libraryID = parent.libraryID;
  attachment.parentItemID = note.id;
  attachment.attachmentContentType = "image/png";
  attachment.attachmentFilename = filePath.split(/[\\/]+/).pop() || "image.png";
  attachment.setFilePath?.(filePath);
  await attachment.saveTx();
  note.setNote(
    [
      '<div data-zs-note-kind="literature-score">',
      "<h1>Literature Score</h1>",
      `<img data-attachment-key="${attachment.key}" data-zs-payload-anchor="literature-score-json">`,
      "</div>",
    ].join(""),
  );
  await note.saveTx();
  return { note, attachment };
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
      tag: { and: ["topic:alpha"] },
      combine: "union",
    },
    resolved_paper_set: {
      papers: paperRefs.map((paper_ref) => ({
        paper_ref,
        match_reasons: ["tag"],
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

function validLiteratureScore(overallScore: number) {
  const dimensionKeys = [
    "methodological_rigor",
    "evidence_completeness",
    "reproducibility",
    "innovation_signals",
    "research_impact_potential",
    "writing_quality",
  ];
  return {
    literature_score: {
      schema: "literature_score.v1",
      rubric_id: "default-v1",
      paper_type: "empirical",
      paper_type_reason: "The paper reports an empirical study.",
      overall_score: overallScore,
      confidence: 0.8,
      confidence_adjusted_score: overallScore * 0.8,
      dimensions: dimensionKeys.map((dimensionKey) => ({
        dimension_key: dimensionKey,
        name: dimensionKey,
        score: 80,
        confidence: 0.8,
        summary: `${dimensionKey} summary`,
      })),
    },
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

  it("hydrates the bounded Index page before reading literature scores", async function () {
    const paper = await createPaper({
      title: "Hydrated Literature Score Paper",
      date: "2026",
    });
    const { note, attachment } = await addEmbeddedLiteratureScoreNote(
      paper,
      validLiteratureScore(97),
    );

    let parentChildrenLoaded = false;
    let noteChildrenLoaded = false;
    let attachmentLoaded = false;
    const cachedParent = Object.create(paper) as Zotero.Item;
    const cachedNote = Object.create(note) as Zotero.Item;
    (cachedParent as any).getNotes = () =>
      parentChildrenLoaded ? paper.getNotes() : [];
    (cachedNote as any).getAttachments = () => {
      if (!noteChildrenLoaded) {
        throw new Error("note childItems are not loaded");
      }
      return note.getAttachments();
    };
    const runtime = Zotero as any;
    const previousDb = runtime.DB;
    const previousGet = Zotero.Items.get;
    const previousGetAsync = (Zotero.Items as any).getAsync;
    const previousLoadDataTypes = (Zotero.Items as any).loadDataTypes;
    const previousGetAll = (Zotero.Items as any).getAll;
    const hydratedIds: number[][] = [];
    const loadedDataTypes: Array<{ itemIds: number[]; dataTypes: string[] }> =
      [];
    let getAllCalls = 0;

    runtime.DB = {
      queryAsync: async (
        _sql: string,
        _params: unknown[],
        options?: {
          onRow?: (row: { getResultByName: (name: string) => unknown }) => void;
        },
      ) => {
        options?.onRow?.({
          getResultByName: (name) => (name === "itemID" ? paper.id : undefined),
        });
      },
    };
    (Zotero.Items as any).get = (id: number) => {
      if (id === paper.id) return cachedParent;
      if (id === note.id) return cachedNote;
      if (id === attachment.id) {
        return attachmentLoaded ? attachment : undefined;
      }
      return previousGet(id);
    };
    (Zotero.Items as any).getAsync = async (ids: number | number[]) => {
      const requestedIds = Array.isArray(ids) ? ids : [ids];
      hydratedIds.push([...requestedIds]);
      const loaded = requestedIds
        .map((id) => {
          if (id === paper.id) return cachedParent;
          if (id === note.id) return cachedNote;
          if (id === attachment.id) {
            attachmentLoaded = true;
            return attachment;
          }
          return previousGet(id);
        })
        .filter(Boolean);
      return Array.isArray(ids) ? loaded : loaded[0];
    };
    (Zotero.Items as any).loadDataTypes = async (
      items: Zotero.Item[],
      dataTypes: string[],
    ) => {
      loadedDataTypes.push({
        itemIds: items.map((item) => item.id),
        dataTypes: [...dataTypes],
      });
      for (const item of items) {
        if (item.id === paper.id && dataTypes.includes("childItems")) {
          parentChildrenLoaded = true;
        }
        if (item.id === note.id && dataTypes.includes("childItems")) {
          noteChildrenLoaded = true;
        }
      }
    };
    (Zotero.Items as any).getAll = async (...args: unknown[]) => {
      getAllCalls += 1;
      return previousGetAll.apply(Zotero.Items, args);
    };
    const alternateItems = Object.create(Zotero.Items);
    Object.defineProperty(alternateItems, "getAsync", {
      configurable: true,
      value: async () => [],
    });
    const alternateZotero = Object.create(Zotero);
    Object.defineProperty(alternateZotero, "Items", {
      configurable: true,
      value: alternateItems,
    });
    installRuntimeBridgeOverrideForTests({
      zotero: alternateZotero as typeof Zotero,
    });

    try {
      const libraryAdapter = createZoteroSynthesisLibraryAdapter({
        libraryId: Zotero.Libraries.userLibraryID,
      });
      const page = await libraryAdapter.getRegistryInputsPage?.({
        libraryId: Zotero.Libraries.userLibraryID,
        limit: 1,
      });

      assert.equal((page?.[0] as any)?.literatureScore?.overallScore, 97);
      assert.equal(getAllCalls, 0);

      const service = createSynthesisService({
        root: await makeRoot(),
        libraryId: Zotero.Libraries.userLibraryID,
        libraryAdapter,
      });
      const input = await service.getSynthesisWorkbenchSurfaceInput("index");
      const row = input.registry?.rows.find(
        (candidate) => candidate.itemKey === paper.key,
      );

      assert.equal(row?.ratingScore, 97);
      assert.isNotEmpty(hydratedIds);
      assert.isNotEmpty(loadedDataTypes);
      assert.deepInclude(hydratedIds, [paper.id]);
      assert.deepInclude(hydratedIds, [note.id]);
      assert.deepInclude(hydratedIds, [attachment.id]);
      assert.deepInclude(loadedDataTypes, {
        itemIds: [paper.id],
        dataTypes: ["childItems"],
      });
      assert.deepInclude(loadedDataTypes, {
        itemIds: [note.id],
        dataTypes: ["childItems"],
      });
      assert.isTrue(hydratedIds.every((ids) => ids.length <= 1));
    } finally {
      runtime.DB = previousDb;
      (Zotero.Items as any).get = previousGet;
      (Zotero.Items as any).getAsync = previousGetAsync;
      (Zotero.Items as any).loadDataTypes = previousLoadDataTypes;
      (Zotero.Items as any).getAll = previousGetAll;
      resetRuntimeBridgeOverrideForTests();
    }
  });

  it("bounds concurrent readiness reads for the current Index page", async function () {
    const papers = await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        createPaper({ title: `Bounded Index Paper ${index + 1}` }),
      ),
    );
    const runtime = Zotero as any;
    const previousDb = runtime.DB;
    const previousGetAsync = (Zotero.Items as any).getAsync;
    const previousLoadDataTypes = (Zotero.Items as any).loadDataTypes;
    let activeReads = 0;
    let peakReads = 0;

    runtime.DB = {
      queryAsync: async () =>
        papers.map((paper) => ({ itemID: Number(paper.id) })),
    };
    (Zotero.Items as any).getAsync = async (ids: number | number[]) => {
      const requestedIds = Array.isArray(ids) ? ids : [ids];
      const loaded = requestedIds
        .map((id) => Zotero.Items.get(id))
        .filter(Boolean);
      return Array.isArray(ids) ? loaded : loaded[0];
    };
    (Zotero.Items as any).loadDataTypes = async () => {
      activeReads += 1;
      peakReads = Math.max(peakReads, activeReads);
      await new Promise((resolve) => setTimeout(resolve, 5));
      activeReads -= 1;
    };

    try {
      const libraryAdapter = createZoteroSynthesisLibraryAdapter({
        libraryId: Zotero.Libraries.userLibraryID,
      });
      const page = await libraryAdapter.getRegistryInputsPage?.({
        libraryId: Zotero.Libraries.userLibraryID,
        limit: papers.length,
      });

      assert.lengthOf(page || [], papers.length);
      assert.isBelow(
        peakReads,
        papers.length,
        "Index readiness must not fan out across the whole page",
      );
    } finally {
      runtime.DB = previousDb;
      (Zotero.Items as any).getAsync = previousGetAsync;
      (Zotero.Items as any).loadDataTypes = previousLoadDataTypes;
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

    const index = await service.getLibraryIndex({
      includeTags: true,
      includeCollections: true,
    });
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
    assert.isObject(index.pagination?.tags);
    assert.isObject(index.pagination?.collections);
    assert.equal(firstIndexPage.returned, 1);
    assert.equal(firstIndexPage.total_papers, 2);
    assert.equal(firstIndexPage.has_more, true);
    assert.equal(secondIndexPage.has_more, false);
    assert.equal(secondIndexPage.returned, 1);
    assert.equal(secondIndexPage.index_hash, firstIndexPage.index_hash);
    assert.match(firstIndexPage.page_hash || "", /^sha256:/);
    assert.lengthOf(artifactManifest.papers, 1);
    assert.lengthOf(artifactManifest.papers[0].artifacts, 4);
    assert.deepInclude(artifactManifest.papers[0].artifacts[0], {
      paper_ref: `${alpha.libraryID}:${alpha.key}`,
      artifact_type: "digest",
      status: "available",
      payload_type: "digest-markdown",
    });
    assert.notProperty(artifactManifest.papers[0].artifacts[0], "markdown");
    assert.notProperty(artifactManifest.papers[0].artifacts[0], "payload");
    const scoreManifest = artifactManifest.papers[0].artifacts.find(
      (artifact) => artifact.artifact_type === "literature_score",
    );
    assert.deepInclude(scoreManifest?.literature_quality, {
      status: "missing",
      quality_prior: 0.5,
    });
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
      tags: ["exclude:reviewed"],
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

    const alphaRef = `${alpha.libraryID}:${alpha.key}`;
    const betaRef = `${beta.libraryID}:${beta.key}`;
    const unionResolved = await service.resolveResolver({
      tag: { and: ["topic:alpha"] },
      paper_refs: [betaRef],
    });
    const resolved = await service.resolveResolver({
      tag: { and: ["topic:alpha"], or: ["domain:vision"] },
      paper_refs: [alphaRef, betaRef],
      combine: "intersection",
    });
    const artifacts = await service.readPaperArtifacts({
      paper_refs: [`${alpha.libraryID}:${alpha.key}`],
      artifact_types: ["references-json", "citation-analysis-json"] as any,
    });
    await service.refreshReferenceSidecarNow();
    await service.rebuildCitationGraphCacheNow();
    const graph = await service.queryCitationGraph();

    assert.sameMembers(
      unionResolved.papers.map((paper) => paper.paper_ref),
      [alphaRef, betaRef],
    );
    assert.deepEqual(
      resolved.papers.map((paper) => paper.paper_ref),
      [alphaRef],
    );
    assert.equal(resolved.papers[0].year, "2024");
    assert.equal(resolved.diagnostics.final_count, 1);
    assert.deepEqual(
      artifacts.artifacts.map((artifact) => artifact.artifact_type).sort(),
      ["citation_analysis", "references"],
    );
    assert.equal(
      artifacts.artifacts.every(
        (artifact) => artifact.probe_source === "paper_artifacts.read",
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
    assert.isString(graph.edges[0].primary_role);
    assert.isNotEmpty(graph.edges[0].primary_role);
  });

  it("rejects legacy resolver wrappers and mode DSL fields inside resolve_resolver", async function () {
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
      /resolver|selection_strategy|tag_criteria/i,
    );
    assert.lengthOf(resolved.papers, 0);
  });

  it("marks a resolver payload as invalid when it matches no papers", async function () {
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

    const resolved = await service.resolveResolver({ tag: "topic:missing" });

    assert.isFalse(resolved.ok);
    assert.equal(resolved.diagnostics.final_count, 0);
    assert.match(resolved.errors.join("\n"), /matched no papers/i);
  });

  it("requires resolver paper_refs to be an array", async function () {
    const service = createSynthesisService({
      root: await makeRoot(),
      libraryId: Zotero.Libraries.userLibraryID,
      registryInputs: [],
    });

    const resolved = await service.resolveResolver({
      paper_refs: "1:ABCD1234",
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
      mcpRequest(1, "reference_index.get"),
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
      mcpResponse.result.structuredContent.result.entries[0].paper_ref,
      paperRef,
    );
    assert.deepInclude(mcpResponse.result.structuredContent.result, {
      nextCursor: "",
      hasMore: false,
      returned: 1,
      total: 1,
      limit: 25,
    });
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
