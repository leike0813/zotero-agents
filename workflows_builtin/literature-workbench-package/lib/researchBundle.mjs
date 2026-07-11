import { rewriteMarkdownLocalImages } from "./literatureBundle.mjs";
import { listWorkbenchEmbeddedPayloadBlocksForNote } from "./embeddedPayloadAttachments.mjs";

export const RESEARCH_SELECTION_SCHEMA = "research_bundle.selection";
export const RESEARCH_PRODUCT_SCHEMA = "research_bundle.product";
const PAYLOAD_TYPES = new Set([
  "digest-markdown",
  "references-json",
  "citation-analysis-json",
  "conversation-note-markdown",
]);

export function isResearchPayloadType(value) {
  return PAYLOAD_TYPES.has(text(value));
}

function text(value) { return String(value || "").trim(); }
function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : fallback;
}
function array(value) { return Array.isArray(value) ? value : []; }
function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}
function safeName(value, fallback) {
  return text(value).replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || fallback;
}

export function computeResearchPaperScore(args = {}) {
  const semantic = number(args.semantic);
  const topic = number(args.topic);
  const readiness = number(args.readiness);
  if (args.graphAvailable === false) {
    return semantic * 0.8 + topic * 0.15 + readiness * 0.05;
  }
  return semantic * 0.6 + number(args.graph) * 0.2 + topic * 0.15 + readiness * 0.05;
}

export function normalizeResearchSelection(value) {
  if (!value || typeof value !== "object" || value.schema_id !== RESEARCH_SELECTION_SCHEMA) {
    throw new Error("research selection schema_id is invalid");
  }
  const intent = value.intent || {};
  if (!text(intent.paper_title) || !text(intent.research_content)) {
    throw new Error("research selection intent is incomplete");
  }
  const limits = {
    max_topics: boundedInteger(value?.limits?.max_topics, 5, 0, 5),
    max_core_papers: boundedInteger(value?.limits?.max_core_papers, 20, 1, 20),
    max_related_papers: boundedInteger(value?.limits?.max_related_papers, 80, 1, 80),
  };
  const topicIds = new Set();
  const topics = array(value.topics).slice(0, limits.max_topics).map((entry) => ({
    ...entry,
    topic_id: text(entry?.topic_id),
    relevance: number(entry?.relevance),
  })).filter((entry) => {
    if (!entry.topic_id) return false;
    if (topicIds.has(entry.topic_id)) throw new Error("research topic ids must be unique");
    topicIds.add(entry.topic_id);
    return true;
  });
  const seen = new Set();
  const papers = array(value.papers).map((entry) => {
    const paperRef = text(entry?.paper_ref);
    const semantic = number(entry?.semantic_relevance);
    if (!paperRef || seen.has(paperRef)) throw new Error("research paper refs must be unique");
    if (semantic < 0.45) throw new Error(`research paper relevance is below threshold: ${paperRef}`);
    seen.add(paperRef);
    const computedScore = computeResearchPaperScore({
      semantic,
      graph: entry?.graph_importance,
      topic: entry?.topic_coverage,
      readiness: entry?.material_readiness,
      graphAvailable: entry?.graph_available !== false,
    });
    if (entry?.score !== undefined && (!Number.isFinite(Number(entry.score)) || Math.abs(Number(entry.score) - computedScore) > 0.000001)) {
      throw new Error(`research paper score does not match policy: ${paperRef}`);
    }
    return {
      ...entry,
      paper_ref: paperRef,
      role: entry?.role === "core" ? "core" : "related",
      semantic_relevance: semantic,
      score: computedScore,
    };
  }).sort((left, right) => right.score - left.score || left.paper_ref.localeCompare(right.paper_ref));
  const coreCount = papers.filter((entry) => entry.role === "core").length;
  if (papers.length > limits.max_related_papers || coreCount > limits.max_core_papers) {
    throw new Error("research selection exceeds workflow limits");
  }
  if (papers.some((entry, index) => (index < coreCount) !== (entry.role === "core"))) {
    throw new Error("research core papers must be the highest-scoring prefix");
  }
  return {
    schema_id: RESEARCH_SELECTION_SCHEMA,
    schema_version: "1.0.0",
    intent: {
      paper_title: text(intent.paper_title),
      article_type: text(intent.article_type) || "original research",
      research_content: text(intent.research_content),
    },
    limits,
    query_plan: value.query_plan && typeof value.query_plan === "object" ? value.query_plan : {},
    topics,
    papers,
    diagnostics: array(value.diagnostics),
  };
}

function parsePaperRef(paperRef) {
  const match = /^(\d+):(.+)$/.exec(text(paperRef));
  if (!match) throw new Error(`invalid paper_ref: ${paperRef}`);
  return { libraryID: Number(match[1]), key: match[2] };
}

function payloadText(block) {
  if (block.format === "markdown") return String(block.markdown || block.payload?.content || "");
  if (block.format === "json") return `${JSON.stringify(block.payload, null, 2)}\n`;
  return String(block.decodedText || block.payload?.content || "");
}

function topicReportBody(report) {
  return text(report?.synthesis_report?.body || report?.report?.body || report?.body);
}

export async function materializeResearchProduct(args) {
  const selection = normalizeResearchSelection(args.selection);
  const host = args.runtime.hostApi;
  const productStorage = args.productStorage;
  const assets = [];
  const warnings = [...selection.diagnostics];
  const entries = [];
  const addText = (assetId, path, content, contentType = "text/plain") => {
    assets.push({ assetId, productAssetPath: path, contentType, source: { kind: "inline-text", text: content } });
    entries.push({ name: path, text: content });
  };
  const addFile = (assetId, path, sourcePath, contentType) => {
    assets.push({ assetId, productAssetPath: path, contentType, source: { kind: "local-file", path: sourcePath } });
    entries.push({ name: path, sourcePath });
  };

  for (let index = 0; index < selection.topics.length; index += 1) {
    const topic = selection.topics[index];
    try {
      const report = await host.synthesis?.getTopicReport?.({ topicId: topic.topic_id });
      const body = topicReportBody(report);
      if (body) addText(`topic-${index + 1}-report`, `topics/topic-${String(index + 1).padStart(3, "0")}/report.md`, body, "text/markdown");
      else warnings.push({ code: "topic_report_missing", topic_id: topic.topic_id });
    } catch (error) {
      warnings.push({ code: "topic_report_unavailable", topic_id: topic.topic_id, message: String(error) });
    }
  }

  const paperManifest = [];
  for (let index = 0; index < selection.papers.length; index += 1) {
    const selected = selection.papers[index];
    const logicalId = `paper-${String(index + 1).padStart(3, "0")}`;
    const ref = parsePaperRef(selected.paper_ref);
    const item = host.items.getByLibraryAndKey(ref.libraryID, ref.key);
    if (!item) {
      warnings.push({ code: "paper_missing", paper_ref: selected.paper_ref });
      continue;
    }
    addText(`${logicalId}-metadata`, `papers/${logicalId}/metadata.json`, `${JSON.stringify(host.items.exportPortableJson(item), null, 2)}\n`, "application/json");
    const payloads = [];
    for (const noteRef of item.getNotes?.() || []) {
      const note = host.items.get(noteRef);
      if (!note) continue;
      const blocks = await listWorkbenchEmbeddedPayloadBlocksForNote({ noteItem: note, runtime: args.runtime });
      for (const block of blocks.filter((entry) => isResearchPayloadType(entry.payloadType))) {
        const ordinal = payloads.filter((entry) => entry.payload_type === block.payloadType).length + 1;
        const group = block.payloadType === "digest-markdown" ? "digest" : block.payloadType === "references-json" ? "references" : block.payloadType === "citation-analysis-json" ? "citation-analysis" : "conversations";
        const extension = block.format === "json" ? "json" : "md";
        const path = `papers/${logicalId}/analysis/${group}/${String(ordinal).padStart(3, "0")}.${extension}`;
        addText(`${logicalId}-${group}-${ordinal}`, path, payloadText(block), extension === "json" ? "application/json" : "text/markdown");
        payloads.push({ path, payload_type: block.payloadType, note_key: text(note.key), attachment_key: block.attachmentKey, payload_hash: block.payloadHash || "", format: block.format });
      }
    }
    let source = null;
    if (selected.role === "core") {
      const attachments = await host.library.getItemAttachments({ key: ref.key, libraryId: ref.libraryID });
      const markdown = attachments.find((entry) => args.runtime.helpers?.isMarkdownAttachment?.(entry) || /(?:markdown|\.md$)/i.test(`${entry.contentType} ${entry.filename}`));
      const pdf = attachments.find((entry) => args.runtime.helpers?.isPdfAttachment?.(entry) || /(?:application\/pdf|\.pdf$)/i.test(`${entry.contentType} ${entry.filename}`));
      if (markdown?.path && await host.file.exists(markdown.path)) {
        const rewritten = await rewriteMarkdownLocalImages({
          markdown: await host.file.readText(markdown.path),
          sourcePath: markdown.path,
          resolveLocalPath: async (path) => await host.file.exists(path) ? path : null,
        });
        const sourcePath = `papers/${logicalId}/source/${safeName(markdown.filename, "article.md")}`;
        addText(`${logicalId}-source`, sourcePath, rewritten.markdown, "text/markdown");
        for (const image of rewritten.assets) addFile(`${logicalId}-image-${image.id}`, `papers/${logicalId}/source/${image.relativePath}`, image.sourcePath, "image/*");
        warnings.push(...rewritten.warnings.map((warning) => ({ ...warning, paper_ref: selected.paper_ref })));
        source = { kind: "markdown", path: sourcePath };
      } else if (pdf?.path && await host.file.exists(pdf.path)) {
        const sourcePath = `papers/${logicalId}/source/${safeName(pdf.filename, "article.pdf")}`;
        addFile(`${logicalId}-source`, sourcePath, pdf.path, "application/pdf");
        source = { kind: "pdf", path: sourcePath };
      } else warnings.push({ code: "core_source_missing", paper_ref: selected.paper_ref });
    }
    paperManifest.push({ logical_id: logicalId, paper_ref: selected.paper_ref, item_key: ref.key, library_id: ref.libraryID, role: selected.role, score: selected.score, reason: text(selected.reason), source, payloads });
  }

  const readme = `# Research Bundle\n\n- Title: ${selection.intent.paper_title}\n- Article type: ${selection.intent.article_type}\n- Topics: ${selection.topics.length}\n- Core papers: ${paperManifest.filter((paper) => paper.role === "core").length}\n- Related papers: ${paperManifest.length}\n\n## Research content\n\n${selection.intent.research_content}\n`;
  addText("readme", "README.md", readme, "text/markdown");
  const measured = await host.archive.measureEntries(entries);
  const manifest = {
    schema_id: RESEARCH_PRODUCT_SCHEMA,
    schema_version: "1.0.0",
    intent: selection.intent,
    topics: selection.topics,
    papers: paperManifest,
    files: measured.files,
    warnings,
  };
  assets.push({ assetId: "manifest", productAssetPath: "manifest.json", contentType: "application/json", source: { kind: "inline-text", text: `${JSON.stringify(manifest, null, 2)}\n` } });
  const product = await productStorage.registerProduct({
    productKey: "export-research-bundle",
    kind: "research_bundle",
    title: selection.intent.paper_title,
    failurePolicy: "atomic",
    metadata: { articleType: selection.intent.article_type, topicCount: selection.topics.length, corePaperCount: paperManifest.filter((paper) => paper.role === "core").length, relatedPaperCount: paperManifest.length },
    assets,
  });
  return { selection, manifest, product };
}
