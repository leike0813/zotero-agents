import { workbenchPayloadArtifactName } from "./embeddedPayloadAttachments.mjs";
import { exportBundleBibliography } from "./bundleBibliography.mjs";
import { renderResearchBundleIndex, renderResearchBundleReadme } from "./researchBundleReadme.mjs";
import { rewriteMarkdownLocalImages } from "./markdownLocalImages.mjs";

export const RESEARCH_SELECTION_SCHEMA = "research_bundle.selection";
export const RESEARCH_PRODUCT_SCHEMA = "research_bundle.product";
const PAYLOAD_TYPES = new Set([
  "digest-markdown",
  "references-json",
  "citation-analysis-json",
  "literature-score-json",
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
  const quality = number(args.quality, 0.5);
  const topic = number(args.topic);
  const readiness = number(args.readiness);
  if (args.graphAvailable === false) {
    return semantic * 0.65 + quality * 0.15 + topic * 0.15 + readiness * 0.05;
  }
  return semantic * 0.5 + quality * 0.15 + number(args.graph) * 0.15 + topic * 0.15 + readiness * 0.05;
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
    max_topics: boundedInteger(value?.limits?.max_topics, 5, 0, 10),
    max_core_papers: boundedInteger(value?.limits?.max_core_papers, 20, 1, 50),
    max_related_papers: boundedInteger(value?.limits?.max_related_papers, 80, 1, 200),
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
      quality: entry?.literature_quality?.quality_prior,
      graph: entry?.graph_importance,
      topic: entry?.topic_coverage,
      readiness: entry?.material_readiness,
      graphAvailable: entry?.graph_available !== false,
    });
    if (entry?.selection_score !== undefined && (!Number.isFinite(Number(entry.selection_score)) || Math.abs(Number(entry.selection_score) - computedScore) > 0.000001)) {
      throw new Error(`research paper score does not match policy: ${paperRef}`);
    }
    return {
      ...entry,
      paper_ref: paperRef,
      role: entry?.role === "core" ? "core" : "related",
      semantic_relevance: semantic,
      selection_score: computedScore,
    };
  }).sort((left, right) => right.selection_score - left.selection_score || left.paper_ref.localeCompare(right.paper_ref));
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
    schema_version: "2.0.0",
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
  return { libraryId: Number(match[1]), key: match[2] };
}

function topicReportBody(report) {
  return text(
    report?.markdown || report?.synthesis_report?.body || report?.report?.body || report?.body,
  );
}

export function researchPayloadArtifactPath(args = {}) {
  const logicalId = text(args.logicalId);
  const ordinal = Math.max(1, Number.parseInt(args.ordinal, 10) || 1);
  const extension = args.format === "json" ? "json" : "md";
  const artifactName = workbenchPayloadArtifactName(args.payloadType);
  if (!artifactName) throw new Error("unsupported research payload type");
  return `papers/${logicalId}/${artifactName}-${String(ordinal).padStart(3, "0")}.${extension}`;
}

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
    entries.push({ name: path, content: { kind: "text", text: content } });
  };
  const addFile = (assetId, path, sourcePath, contentType) => {
    assets.push({ assetId, productAssetPath: path, contentType, source: { kind: "local-file", path: sourcePath } });
    entries.push({ name: path, content: { kind: "file", sourcePath } });
  };
  const sharedMaterialization = await host.researchBundles.materializePapers({
    paperRefs: selection.papers.map((paper) => parsePaperRef(paper.paper_ref)),
    missingFilePolicy: "record_missing",
  });
  warnings.push(...array(sharedMaterialization.issues));
  const sharedPapers = new Map();
  const sharedEntries = new Map();
  for (const paper of sharedMaterialization.papers) {
    const paperRef = `${paper.source.ref.libraryId}:${paper.source.ref.key}`;
    const metadataPath = `materialized/${paperRef}/metadata.json`;
    sharedEntries.set(metadataPath, {
      path: metadataPath,
      text: `${JSON.stringify({
        itemType: paper.item.itemType,
        ...paper.item.fields,
        creators: paper.item.creators,
        tags: paper.item.tags,
      }, null, 2)}\n`,
    });
    const artifacts = [];
    for (const note of paper.notes) {
      for (const payload of note.payloads) {
        const kind = workbenchPayloadArtifactName(payload.summary.payloadType);
        if (!kind) continue;
        const extension = payload.summary.format === "json" ? "json" : "md";
        const path = `materialized/${paperRef}/${kind}.${extension}`;
        const content = payload.summary.format === "json"
          ? `${JSON.stringify(payload.value, null, 2)}\n`
          : String(payload.value || "");
        sharedEntries.set(path, { path, text: content });
        artifacts.push({ artifact_type: kind.replaceAll("-", "_"), path });
      }
    }
    let source = null;
    for (const attachment of paper.attachments) {
      if (attachment.file.state !== "available") continue;
      const resource = await host.resources.get(attachment.file.resourceRef);
      const metadataSourcePath = attachment.metadata.file?.state === "available"
        ? attachment.metadata.file.path
        : "";
      const sourcePath = metadataSourcePath && (await host.file.exists(metadataSourcePath))
        ? metadataSourcePath
        : resource.path;
      const isMarkdown = /(?:markdown|text\/plain)/i.test(attachment.metadata.contentType || "") || /\.md$/i.test(sourcePath);
      const isPdf = /pdf/i.test(attachment.metadata.contentType || "") || /\.pdf$/i.test(sourcePath);
      if (!isMarkdown && !isPdf) continue;
      const path = `materialized/${paperRef}/source.${isMarkdown ? "md" : "pdf"}`;
      const assets = [];
      if (isMarkdown) {
        const rewritten = await rewriteMarkdownLocalImages({
          markdown: await host.file.readText(resource.path),
          sourcePath,
          assetPolicy: { kind: "preserve-source-tree" },
          resolveLocalPath: async (candidate) =>
            (await host.file.exists(candidate)) ? candidate : null,
        });
        sharedEntries.set(path, { path, text: rewritten.markdown });
        for (const asset of rewritten.assets) {
          const assetPath = `materialized/${paperRef}/${asset.relativePath}`;
          sharedEntries.set(assetPath, {
            path: assetPath,
            sourcePath: asset.sourcePath,
            contentType: "image/*",
          });
          assets.push(assetPath);
        }
        warnings.push(
          ...rewritten.warnings.map((warning) => ({ ...warning, paper_ref: paperRef })),
        );
      } else {
        sharedEntries.set(path, { path, sourcePath: resource.path });
      }
      source = { kind: isMarkdown ? "markdown" : "pdf", path, assets };
      if (isMarkdown) break;
    }
    sharedPapers.set(paperRef, {
      paper_ref: paperRef,
      metadata_path: metadataPath,
      artifacts,
      source,
      item: paper.item,
    });
  }

  const topicManifest = [];
  for (let index = 0; index < selection.topics.length; index += 1) {
    const topic = selection.topics[index];
    const logicalId = `topic-${String(index + 1).padStart(3, "0")}`;
    let reportPath = null;
    try {
      const report = await host.synthesis?.topics?.getReport?.({ topicId: topic.topic_id });
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
    const sharedPaper = sharedPapers.get(selected.paper_ref);
    if (!sharedPaper) {
      if (!warnings.some((warning) => warning?.code === "paper_missing" && warning?.paper_ref === selected.paper_ref)) {
        warnings.push({ code: "paper_missing", paper_ref: selected.paper_ref });
      }
      continue;
    }
    materializedItems.push(ref);
    const paperDir = `papers/${logicalId}`;
    const metadataPath = `${paperDir}/metadata.json`;
    const sharedMetadata = sharedEntries.get(text(sharedPaper.metadata_path));
    if (!sharedMetadata || typeof sharedMetadata.text !== "string") {
      throw new Error(`shared research metadata is unavailable: ${selected.paper_ref}`);
    }
    addText(`${logicalId}-metadata`, metadataPath, sharedMetadata.text, "application/json");
    const payloads = [];
    const payloadTypeByArtifact = {
      digest: "digest-markdown",
      references: "references-json",
      citation_analysis: "citation-analysis-json",
      literature_score: "literature-score-json",
    };
    for (const artifact of array(sharedPaper.artifacts)) {
      const payloadType = payloadTypeByArtifact[text(artifact.artifact_type)];
      const sharedPath = text(artifact.path);
      const sharedEntry = sharedEntries.get(sharedPath);
      if (!payloadType || !sharedPath || !sharedEntry || typeof sharedEntry.text !== "string") continue;
      const format = sharedPath.endsWith(".json") ? "json" : "markdown";
      const path = researchPayloadArtifactPath({ logicalId, payloadType, ordinal: 1, format });
      const group = workbenchPayloadArtifactName(payloadType);
      addText(`${logicalId}-${group}-1`, path, sharedEntry.text, format === "json" ? "application/json" : "text/markdown");
      payloads.push({ path, payload_type: payloadType, payload_hash: "", format });
    }
    let source = null;
    if (selected.role === "core" && sharedPaper.source?.path) {
      const canonicalSourcePath = text(sharedPaper.source.path);
      const canonicalPaperDir = canonicalSourcePath.replace(/\/source\.(?:md|pdf)$/, "");
      const sharedSource = sharedEntries.get(canonicalSourcePath);
      if (sharedPaper.source.kind === "markdown" && sharedSource && typeof sharedSource.text === "string") {
        const sourcePath = `${paperDir}/source.md`;
        const sourceAssets = [];
        for (const canonicalAssetPath of array(sharedPaper.source.assets)) {
          const sharedAsset = sharedEntries.get(text(canonicalAssetPath));
          const relativePath = text(canonicalAssetPath).slice(canonicalPaperDir.length + 1);
          if (!sharedAsset?.sourcePath || !relativePath) continue;
          const imagePath = `${paperDir}/${relativePath}`;
          addFile(`${logicalId}-image-${sourceAssets.length + 1}`, imagePath, sharedAsset.sourcePath, sharedAsset.contentType || "image/*");
          sourceAssets.push({ path: imagePath, source_relative_path: relativePath });
        }
        addText(`${logicalId}-source`, sourcePath, sharedSource.text, "text/markdown");
        source = { kind: "markdown", path: sourcePath, assets: sourceAssets };
      } else if (sharedPaper.source.kind === "pdf" && sharedSource?.sourcePath) {
        const sourcePath = `${paperDir}/source.pdf`;
        addFile(`${logicalId}-source`, sourcePath, sharedSource.sourcePath, "application/pdf");
        source = { kind: "pdf", path: sourcePath, assets: [] };
      }
    }
    if (selected.role === "core" && !source) {
      warnings.push({ code: "core_source_missing", paper_ref: selected.paper_ref });
    }
    paperManifest.push({ logical_id: logicalId, paper_ref: selected.paper_ref, item_key: ref.key, library_id: ref.libraryId, title: text(sharedPaper.item.fields.title), role: selected.role, selection_score: selected.selection_score, literature_quality: selected.literature_quality, artifact_manifest: selected.artifact_manifest, selection_components: selected.selection_components, reason: text(selected.reason), metadata_path: metadataPath, source, payloads });
  }

  const bibliographyExport = await exportBundleBibliography({
    host,
    itemRefs: materializedItems,
    warnings,
  });
  const bibliography = bibliographyExport.bibliography;
  if (bibliography.status === "generated") {
    addText(
      "references",
      "references.bib",
      bibliographyExport.content,
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
  const measured = await host.archive.measureEntries({ entries });
  const manifest = {
    schema_id: RESEARCH_PRODUCT_SCHEMA,
    schema_version: "2.0.0",
    intent: selection.intent,
    topics: topicManifest,
    papers: paperManifest,
    bibliography,
    files: Object.fromEntries(
      Object.entries(measured.files || {}).map(([path, integrity]) => [
        path,
        { size: integrity?.sizeBytes ?? 0, sha256: integrity?.sha256 || "" },
      ]),
    ),
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
