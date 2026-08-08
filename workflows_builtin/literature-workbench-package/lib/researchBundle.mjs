import { rewriteMarkdownLocalImages } from "./markdownLocalImages.mjs";
import { listWorkbenchEmbeddedPayloadBlocksForNote } from "./embeddedPayloadAttachments.mjs";
import { renderResearchBundleIndex, renderResearchBundleReadme } from "./researchBundleReadme.mjs";

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
export function computeResearchPaperScore(args = {}) {
  const semantic = number(args.semantic);
  const topic = number(args.topic);
  const readiness = number(args.readiness);
  if (args.graphAvailable === false) {
    return semantic * 0.8 + topic * 0.15 + readiness * 0.05;
  }
  return semantic * 0.6 + number(args.graph) * 0.2 + topic * 0.15 + readiness * 0.05;
}

function isTopicMandatoryPaper(entry) {
  return array(entry?.matched_topic_ids).length > 0
    || array(entry?.candidate_sources).some((source) => text(source).startsWith("topic:"));
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
    const mandatory = isTopicMandatoryPaper(entry);
    if (semantic < 0.45 && !mandatory) throw new Error(`research paper relevance is below threshold: ${paperRef}`);
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
  const optionalCount = papers.filter((entry) => !isTopicMandatoryPaper(entry)).length;
  if (optionalCount > limits.max_related_papers || coreCount > limits.max_core_papers) {
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
  return text(
    report?.markdown || report?.synthesis_report?.body || report?.report?.body || report?.body,
  );
}

function payloadArtifactName(payloadType) {
  return payloadType === "digest-markdown"
    ? "digest"
    : payloadType === "references-json"
      ? "references"
      : payloadType === "citation-analysis-json"
        ? "citation-analysis"
        : "conversation";
}

export function researchPayloadArtifactPath(args = {}) {
  const logicalId = text(args.logicalId);
  const ordinal = Math.max(1, Number.parseInt(args.ordinal, 10) || 1);
  const extension = args.format === "json" ? "json" : "md";
  return `papers/${logicalId}/${payloadArtifactName(args.payloadType)}-${String(ordinal).padStart(3, "0")}.${extension}`;
}

const BETTER_BIBTEX_TRANSLATOR_ID = "ca65189f-8815-4afe-8c8b-8c7c15f0edca";
const NATIVE_BIBTEX_TRANSLATOR_ID = "9cb70025-a888-4a29-a210-93ec52da40d4";

export async function buildResearchProduct(args) {
  const selection = args.normalizedSelection === true
    ? args.selection
    : normalizeResearchSelection(args.selection);
  const host = args.runtime.hostApi;
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

  const topicManifest = [];
  for (let index = 0; index < selection.topics.length; index += 1) {
    const topic = selection.topics[index];
    const logicalId = `topic-${String(index + 1).padStart(3, "0")}`;
    let reportPath = null;
    try {
      const report = await host.synthesis?.getTopicReport?.({ topicId: topic.topic_id });
      const body = topicReportBody(report);
      if (body) {
        reportPath = `topics/${logicalId}/report.md`;
        addText(`${logicalId}-report`, reportPath, body, "text/markdown");
      }
      else warnings.push({ code: "topic_report_missing", topic_id: topic.topic_id });
    } catch (error) {
      warnings.push({ code: "topic_report_unavailable", topic_id: topic.topic_id, message: String(error) });
    }
    topicManifest.push({ ...topic, logical_id: logicalId, report_path: reportPath });
  }

  const paperManifest = [];
  const materializedItems = [];
  for (let index = 0; index < selection.papers.length; index += 1) {
    const selected = selection.papers[index];
    const logicalId = `paper-${String(index + 1).padStart(3, "0")}`;
    const ref = parsePaperRef(selected.paper_ref);
    const item = host.items.getByLibraryAndKey(ref.libraryID, ref.key);
    if (!item) {
      warnings.push({ code: "paper_missing", paper_ref: selected.paper_ref });
      continue;
    }
    materializedItems.push(item);
    const paperDir = `papers/${logicalId}`;
    const metadataPath = `${paperDir}/metadata.json`;
    addText(`${logicalId}-metadata`, metadataPath, `${JSON.stringify(host.items.exportPortableJson(item), null, 2)}\n`, "application/json");
    const payloads = [];
    for (const noteRef of item.getNotes?.() || []) {
      const note = host.items.get(noteRef);
      if (!note) continue;
      const blocks = await listWorkbenchEmbeddedPayloadBlocksForNote({ noteItem: note, runtime: args.runtime });
      for (const block of blocks.filter((entry) => isResearchPayloadType(entry.payloadType))) {
        const ordinal = payloads.filter((entry) => entry.payload_type === block.payloadType).length + 1;
        const extension = block.format === "json" ? "json" : "md";
        const group = payloadArtifactName(block.payloadType);
        const path = researchPayloadArtifactPath({ logicalId, payloadType: block.payloadType, ordinal, format: block.format });
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
          assetPolicy: { kind: "preserve-source-tree" },
          resolveLocalPath: async (path) => await host.file.exists(path) ? path : null,
        });
        const sourcePath = `${paperDir}/source.md`;
        const sourceAssets = [];
        for (const image of rewritten.assets) {
          const imagePath = `${paperDir}/${image.relativePath}`;
          addFile(`${logicalId}-image-${image.id}`, imagePath, image.sourcePath, "image/*");
          sourceAssets.push({ path: imagePath, source_relative_path: image.relativePath });
        }
        addText(`${logicalId}-source`, sourcePath, rewritten.markdown, "text/markdown");
        warnings.push(...rewritten.warnings.map((warning) => ({ ...warning, paper_ref: selected.paper_ref })));
        source = { kind: "markdown", path: sourcePath, assets: sourceAssets };
      } else if (pdf?.path && await host.file.exists(pdf.path)) {
        const sourcePath = `${paperDir}/source.pdf`;
        addFile(`${logicalId}-source`, sourcePath, pdf.path, "application/pdf");
        source = { kind: "pdf", path: sourcePath, assets: [] };
      } else warnings.push({ code: "core_source_missing", paper_ref: selected.paper_ref });
    }
    paperManifest.push({ logical_id: logicalId, paper_ref: selected.paper_ref, item_key: ref.key, library_id: ref.libraryID, title: text(item.getField?.("title")), role: selected.role, score: selected.score, reason: text(selected.reason), metadata_path: metadataPath, source, payloads });
  }

  let bibliography;
  if (materializedItems.length === 0) {
    bibliography = {
      status: "not_generated",
      reason: "no_materialized_items",
      requested_format: "better-bibtex",
      item_count: 0,
    };
  } else {
    if (typeof host.items.exportText !== "function") {
      throw new Error("workflow host does not provide items.exportText");
    }
    const exported = await host.items.exportText({
      items: materializedItems,
      translatorCandidates: [
        {
          translatorID: BETTER_BIBTEX_TRANSLATOR_ID,
          label: "Better BibTeX",
        },
        {
          translatorID: NATIVE_BIBTEX_TRANSLATOR_ID,
          label: "BibTeX",
        },
      ],
      displayOptions: {
        exportNotes: false,
        exportFileData: false,
        keepUpdated: false,
        useJournalAbbreviation: false,
      },
    });
    if (!exported?.ok) {
      const error = new Error("unable to export research bundle bibliography");
      error.code = "bibliography_export_failed";
      error.attempts = exported?.attempts || [];
      throw error;
    }
    const actualFormat = exported.translator.translatorID === BETTER_BIBTEX_TRANSLATOR_ID
      ? "better-bibtex"
      : "bibtex";
    bibliography = {
      status: "generated",
      path: "references.bib",
      requested_format: "better-bibtex",
      actual_format: actualFormat,
      translator: {
        translator_id: exported.translator.translatorID,
        label: exported.translator.label,
      },
      fallback_used: Boolean(exported.fallbackUsed),
      item_count: materializedItems.length,
    };
    if (exported.fallbackUsed) {
      const primaryAttempt = exported.attempts?.[0] || {};
      const primaryMessage = text(primaryAttempt.message);
      warnings.push({
        code: "bibliography_export_fallback",
        requested_format: "better-bibtex",
        actual_format: actualFormat,
        reason_code: primaryAttempt.errorCode || primaryAttempt.status || "unknown",
        ...(primaryMessage ? { message: primaryMessage } : {}),
      });
    }
    addText(
      "references",
      "references.bib",
      exported.content,
      "application/x-bibtex",
    );
  }

  const readme = renderResearchBundleReadme({
    locale: args.runtime?.locale,
    intent: selection.intent,
    topics: topicManifest,
    papers: paperManifest,
    bibliography,
    warningCount: warnings.length,
  });
  const index = renderResearchBundleIndex({ topics: topicManifest, papers: paperManifest });
  addText("index", "index.md", index, "text/markdown");
  addText("readme", "README.md", readme, "text/markdown");
  const measured = await host.archive.measureEntries(entries);
  const manifest = {
    schema_id: RESEARCH_PRODUCT_SCHEMA,
    schema_version: "2.0.0",
    intent: selection.intent,
    topics: topicManifest,
    papers: paperManifest,
    bibliography,
    files: measured.files,
    warnings,
  };
  assets.push({ assetId: "manifest", productAssetPath: "manifest.json", contentType: "application/json", source: { kind: "inline-text", text: `${JSON.stringify(manifest, null, 2)}\n` } });
  return { selection, manifest, assets, entries };
}

export async function materializeResearchProduct(args) {
  const built = await buildResearchProduct(args);
  const product = await args.productStorage.registerProduct({
    productKey: "export-research-bundle",
    kind: "research_bundle",
    title: built.selection.intent.paper_title,
    failurePolicy: "atomic",
    metadata: {
      articleType: built.selection.intent.article_type,
      topicCount: built.selection.topics.length,
      corePaperCount: built.manifest.papers.filter((paper) => paper.role === "core").length,
      relatedPaperCount: built.manifest.papers.length,
    },
    assets: built.assets,
  });
  return { selection: built.selection, manifest: built.manifest, product };
}
