import { attachWorkbenchPayloadToNote } from "./embeddedPayloadAttachments.mjs";
import { escapeAttribute, escapeHtml } from "./htmlCodec.mjs";
import {
  encodeRuntimeBase64Utf8,
  portableItemRef,
  requireCommittedMutation,
  requireHostApi,
} from "./runtime.mjs";

export const LITERATURE_SCORE_NOTE_KIND = "literature-score";
export const LITERATURE_SCORE_PAYLOAD_TYPE = "literature-score-json";
export const LITERATURE_SCORE_FILE_NAME = "literature_score.json";

const SCORE_SCHEMA = "literature_score.v1";
const SCORE_PAPER_TYPES = new Set([
  "empirical",
  "review",
  "theoretical",
  "qualitative",
  "mixed_methods",
  "other",
]);
const SCORE_DIMENSION_KEYS = new Set([
  "methodological_rigor",
  "evidence_completeness",
  "reproducibility",
  "innovation_signals",
  "research_impact_potential",
  "writing_quality",
]);
const RADAR_MARKER_ATTRIBUTE = "data-zs-score-radar";
const RADAR_MARKER_VALUE = "v1";
const RADAR_ALT = "Literature score radar";

function object(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : null;
}

function number(value, minimum, maximum) {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= minimum &&
    value <= maximum
    ? value
    : null;
}

export function normalizeLiteratureScoreArtifact(value) {
  const wrapped = object(value);
  const score = object(wrapped?.literature_score) || wrapped;
  if (!score || score.schema !== SCORE_SCHEMA) {
    throw new Error(`literature score schema must be ${SCORE_SCHEMA}`);
  }
  if (
    !String(score.rubric_id || "").trim() ||
    !SCORE_PAPER_TYPES.has(score.paper_type) ||
    !String(score.paper_type_reason || "").trim() ||
    number(score.overall_score, 0, 100) === null ||
    number(score.confidence, 0, 1) === null ||
    number(score.confidence_adjusted_score, 0, 100) === null ||
    !Array.isArray(score.dimensions) ||
    score.dimensions.length !== 6
  ) {
    throw new Error("literature score summary fields are invalid");
  }
  const dimensionKeys = new Set();
  for (const dimension of score.dimensions) {
    if (
      !object(dimension) ||
      !String(dimension.dimension_key || "").trim() ||
      !String(dimension.name || "").trim() ||
      !String(dimension.summary || "").trim() ||
      (dimension.score !== null && number(dimension.score, 0, 100) === null) ||
      (dimension.confidence !== null &&
        number(dimension.confidence, 0, 1) === null) ||
      !SCORE_DIMENSION_KEYS.has(dimension.dimension_key) ||
      dimensionKeys.has(dimension.dimension_key)
    ) {
      throw new Error("literature score dimension is invalid");
    }
    dimensionKeys.add(dimension.dimension_key);
  }
  if (dimensionKeys.size !== SCORE_DIMENSION_KEYS.size) {
    throw new Error("literature score dimensions are incomplete");
  }
  return JSON.parse(JSON.stringify(score));
}

export function buildLiteratureScorePayload(artifact, entry) {
  return {
    version: 1,
    entry: String(entry || LITERATURE_SCORE_FILE_NAME),
    format: "json",
    literature_score: normalizeLiteratureScoreArtifact(artifact),
  };
}

function scoreStars(score) {
  return Math.round(Math.max(0, Math.min(100, score)) / 10) / 2;
}

function renderScoreBody(score, radarImage = "") {
  const rows = score.dimensions
    .map(
      (dimension) =>
        `<tr><td>${escapeHtml(dimension.name)}</td><td>${dimension.score === null ? "N/A" : escapeHtml(dimension.score)}</td><td>${dimension.confidence === null ? "N/A" : escapeHtml(dimension.confidence)}</td><td>${escapeHtml(dimension.summary)}</td></tr>`,
    )
    .join("");
  return [
    '<div data-schema-version="9" data-zs-note-kind="literature-score">',
    "<h1>Literature Score</h1>",
    `<p><strong>${escapeHtml(score.overall_score)}/100</strong> (${escapeHtml(scoreStars(score.overall_score))}/5 stars)</p>`,
    `<p>Paper type: ${escapeHtml(score.paper_type)} · Confidence: ${escapeHtml(score.confidence)} · Confidence-adjusted score: ${escapeHtml(score.confidence_adjusted_score)}</p>`,
    radarImage ? `<div data-zs-block="literature-score-radar">${radarImage}</div>` : "",
    '<table data-zs-view="literature-score-dimensions"><thead><tr><th>Dimension</th><th>Score</th><th>Confidence</th><th>Summary</th></tr></thead>',
    `<tbody>${rows}</tbody></table>`,
    "</div>",
  ].join("\n");
}

function radarSvg(score) {
  const width = 640;
  const height = 520;
  const centerX = 320;
  const centerY = 250;
  const radius = 175;
  const point = (index, value = 100) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / score.dimensions.length;
    const distance = radius * (Math.max(0, Math.min(100, value)) / 100);
    return [
      centerX + Math.cos(angle) * distance,
      centerY + Math.sin(angle) * distance,
    ];
  };
  const rings = [20, 40, 60, 80, 100]
    .map(
      (value) =>
        `<polygon points="${score.dimensions.map((_, index) => point(index, value).join(",")).join(" ")}" fill="none" stroke="#c8ccd0" stroke-width="1"/>`,
    )
    .join("");
  const axes = score.dimensions
    .map((_, index) => {
      const [x, y] = point(index, 100);
      return `<line x1="${centerX}" y1="${centerY}" x2="${x}" y2="${y}" stroke="#c8ccd0" stroke-width="1"/>`;
    })
    .join("");
  const polygon = score.dimensions
    .map((dimension, index) => point(index, dimension.score || 0).join(","))
    .join(" ");
  const labels = score.dimensions
    .map((dimension, index) => {
      const [x, y] = point(index, 116);
      return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="13" fill="#2f3337">${escapeHtml(dimension.name)}</text>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#fff"/><g>${rings}${axes}<polygon points="${polygon}" fill="#d28a00" fill-opacity="0.28" stroke="#b36d00" stroke-width="3"/>${labels}</g></svg>`;
}

async function upsertBaseNote(args, content) {
  const hostApi = requireHostApi(args.runtime);
  if (!args.existingNotes?.length) {
    return requireCommittedMutation(await hostApi.notes.create({
      operationId: `literature-score:create:${Date.now().toString(36)}`,
      parentRef: portableItemRef(args.parentItem),
      content: { format: "html", value: content },
    })).note;
  }
  const note = args.existingNotes[0];
  return requireCommittedMutation(await hostApi.notes.updateContent({
    operationId: `literature-score:update:${Date.now().toString(36)}`,
    noteRef: portableItemRef(note),
    content: { format: "html", value: content },
  })).note;
}

export async function upsertLiteratureScoreNote(args) {
  const hostApi = requireHostApi(args.runtime);
  const payload = args.payload;
  const score = normalizeLiteratureScoreArtifact(payload);
  const note = await upsertBaseNote(args, renderScoreBody(score));
  let radar = { status: "none", warning: "" };
  try {
    const prepared = await hostApi.images.prepareForNoteEmbedding({
      source: {
        kind: "base64",
        data: encodeRuntimeBase64Utf8(radarSvg(score), args.runtime),
        mimeType: "image/svg+xml",
      },
      options: {
        outputFormat: "png",
        maxLongEdge: 720,
        targetBytes: 900000,
        hardMaxBytes: 2000000,
      },
    });
    const image = `<img ${RADAR_MARKER_ATTRIBUTE}="${RADAR_MARKER_VALUE}" data-zotero-agents-image-slot="radar" alt="${RADAR_ALT}">`;
    requireCommittedMutation(await hostApi.notes.updateContent({
      operationId: `literature-score:image:${Date.now().toString(36)}`,
      noteRef: portableItemRef(note),
      content: {
        format: "html",
        value: renderScoreBody(score, image),
        embeddedImages: [{ slot: "radar", preparedImage: prepared.ref, altText: RADAR_ALT }],
      },
    }));
    radar = { status: "embedded", warning: "" };
  } catch (error) {
    radar = {
      status: "unavailable",
      warning: error instanceof Error ? error.message : String(error),
    };
  }
  await attachWorkbenchPayloadToNote({
    runtime: args.runtime,
    note,
    noteKind: LITERATURE_SCORE_NOTE_KIND,
    payloadType: LITERATURE_SCORE_PAYLOAD_TYPE,
    payload,
  });
  for (const duplicate of (args.existingNotes || []).slice(1)) {
    requireCommittedMutation(await hostApi.notes.remove({
      operationId: `literature-score:remove:${Date.now().toString(36)}`,
      noteRef: portableItemRef(duplicate),
      disposition: "trash",
    }));
  }
  return { note, radar };
}

export function toNativeLiteratureScoreArtifact(payload) {
  return normalizeLiteratureScoreArtifact(payload);
}
