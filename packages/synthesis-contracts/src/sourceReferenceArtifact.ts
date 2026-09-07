import Ajv2020, {
  type ErrorObject,
  type ValidateFunction,
} from "ajv/dist/2020.js";
import citationAnalysisArtifactSchema from "../contract-set/canonical-literature-artifacts-v1/schemas/citation-analysis-artifact.schema.json" with { type: "json" };
import sourceReferenceArtifactSchema from "../contract-set/canonical-literature-artifacts-v1/schemas/source-reference-artifact.schema.json" with { type: "json" };
import { toSynthesisJsonValue } from "./common.js";
import { byteLengthSynthesisContractText } from "./canonicalJson.js";

export const SOURCE_REFERENCE_ARTIFACT_SCHEMA =
  "source_reference_artifact.v1" as const;
export const CITATION_ANALYSIS_ARTIFACT_SCHEMA =
  "citation_analysis_artifact.v1" as const;
export const CANONICAL_ARTIFACT_MAX_BYTES = 1_048_576 as const;

export const CITATION_FUNCTIONS = [
  "background",
  "baseline",
  "contrast",
  "component",
  "dataset",
  "tooling",
  "historical",
  "uncategorized",
] as const;

export type CitationFunction = (typeof CITATION_FUNCTIONS)[number];

export type SourceReferenceArtifact = {
  schema: typeof SOURCE_REFERENCE_ARTIFACT_SCHEMA;
  references: SourceReference[];
};

export type SourceReference = {
  sourceReferenceId: string;
  extraction: SourceReferenceExtraction | null;
  bibliography: SourceReferenceBibliography;
  matching: SourceReferenceMatching;
};

export type SourceReferenceExtraction = {
  raw: string;
  confidence: number | null;
};

export type SourceReferenceBibliography = {
  title: string;
  authors: string[];
  year: number | null;
  publicationTitle?: string;
  conferenceName?: string;
  university?: string;
  archiveID?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  place?: string;
  numPages?: number;
  publisher?: string;
  itemType?: string;
  date?: string;
};

export type SourceReferenceMatching = {
  DOI?: string;
  url?: string;
  ISBN?: string;
  ISSN?: string;
  citekey?: string;
};

export type CitationAnalysisArtifact = {
  schema: typeof CITATION_ANALYSIS_ARTIFACT_SCHEMA;
  meta: CitationMeta;
  summary: string;
  timeline: CitationTimeline;
  items: CitationItem[];
  unresolved: CitationUnresolvedMention[];
};

export type StoredCitationAnalysisArtifact = CitationAnalysisArtifact & {
  referencesBasis: string;
};

export type CitationMeta = {
  language: string;
  scope: CitationScope;
  scope_source: string | null;
  scope_decision: CitationScopeDecision;
  mapping_reliability: "normal" | "reduced";
  reference_extraction: CitationReferenceExtractionStatus;
};

export type CitationScope = {
  section_title: string | null;
  line_start: number | null;
  line_end: number | null;
};

export type CitationScopeDecision = {
  selection_reason: string | null;
  covered_sections: string[];
  fallback_from: CitationScope | null;
  fallback_reason: string | null;
};

export type CitationReferenceExtractionStatus = {
  status: "completed" | "abandoned";
  reason?: string;
  file_quality_low?: boolean;
  triggered_signals?: string[];
};

export type CitationTimeline = {
  early: CitationTimelineBucket;
  mid: CitationTimelineBucket;
  recent: CitationTimelineBucket;
};

export type CitationTimelineBucket = {
  summary: string;
  sourceReferenceIds: string[];
};

export type CitationItem = {
  sourceReferenceId: string;
  function: CitationFunction | null;
  role_in_context: string | null;
  topic: string | null;
  usage: string | null;
  keywords: string[];
  summary: string | null;
  key_reference_reason: string | null;
  confidence: number | null;
  mentions: CitationMention[];
};

export type CitationMention = {
  mention_id: string;
  marker: string | null;
  style: string | null;
  line_start: number | null;
  line_end: number | null;
  snippet: string | null;
  ref_number_hint: number | null;
  year_hint: number | null;
  surname_hint: string | null;
  citation_label_hint: string | null;
  citekey_hint: string | null;
};

export type CitationUnresolvedMention = CitationMention & {
  reason: string | null;
};

export type ContractValidationIssue = {
  path: string;
  code: string;
  message: string;
};

export type ContractValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; issues: ContractValidationIssue[] };

export type SourceReferenceIdFactory = () => string;

export class CanonicalLiteratureArtifactValidationError extends Error {
  readonly issues: ContractValidationIssue[];

  constructor(issues: ContractValidationIssue[]) {
    super("canonical literature artifact validation failed");
    this.name = "CanonicalLiteratureArtifactValidationError";
    this.issues = issues;
  }
}

type RuntimeCrypto = {
  randomUUID?: () => string;
  getRandomValues?: (array: Uint8Array) => Uint8Array;
};

const runtimeCrypto = (): RuntimeCrypto | undefined =>
  (globalThis as { crypto?: RuntimeCrypto }).crypto;

export function generateSourceReferenceId(): string {
  const crypto = runtimeCrypto();
  if (typeof crypto?.randomUUID === "function") {
    return crypto.randomUUID();
  }
  if (typeof crypto?.getRandomValues !== "function") {
    throw new Error("secure_uuid_generation_unavailable");
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}

export function ensureSourceReferenceId(
  explicitId: string | null | undefined,
  idFactory: SourceReferenceIdFactory = generateSourceReferenceId,
): string {
  if (typeof explicitId === "string" && explicitId.length > 0) {
    return explicitId;
  }
  return idFactory();
}

function validationIssues(
  errors: ErrorObject[] | null | undefined,
): ContractValidationIssue[] {
  return (errors || []).map((error) => ({
    path:
      error.instancePath ||
      (typeof error.params?.missingProperty === "string"
        ? `/${error.params.missingProperty}`
        : "/"),
    code: "schema_invalid",
    message: error.message || "invalid canonical literature artifact",
  }));
}

function createValidator(schema: object): ValidateFunction {
  const ajv = new Ajv2020({ allErrors: true, strict: true, logger: false });
  return ajv.compile(schema);
}

const sourceReferenceValidator = createValidator(sourceReferenceArtifactSchema);
const citationAnalysisValidator = createValidator(
  citationAnalysisArtifactSchema,
);

/**
 * Apply the shared strict-JSON and Broker-domain size gate before Ajv sees a
 * canonical artifact. Ajv validates object shape, while this boundary also
 * rejects class instances, undefined/function values, and cyclic objects that
 * JSON.stringify would otherwise silently alter or fail to represent.
 */
export function validateCanonicalArtifactJson(
  value: unknown,
): ContractValidationResult<ReturnType<typeof toSynthesisJsonValue>> {
  let normalized: ReturnType<typeof toSynthesisJsonValue>;
  try {
    normalized = toSynthesisJsonValue(value);
  } catch (error) {
    return {
      ok: false,
      issues: [
        {
          path: "/",
          code: "json_invalid",
          message:
            error instanceof Error
              ? error.message
              : "canonical artifact is not strict JSON",
        },
      ],
    };
  }
  const serialized = JSON.stringify(normalized);
  if (
    serialized === undefined ||
    byteLengthSynthesisContractText(serialized) > CANONICAL_ARTIFACT_MAX_BYTES
  ) {
    return {
      ok: false,
      issues: [
        {
          path: "/",
          code: "resource_limited",
          message: `canonical artifact exceeds ${CANONICAL_ARTIFACT_MAX_BYTES} bytes`,
        },
      ],
    };
  }
  return { ok: true, value: normalized };
}

function validateArtifact<T>(
  value: unknown,
  validator: ValidateFunction,
): ContractValidationResult<T> {
  const preflight = validateCanonicalArtifactJson(value);
  if (!preflight.ok) return preflight;
  if (!validator(preflight.value)) {
    return { ok: false, issues: validationIssues(validator.errors) };
  }
  return { ok: true, value: preflight.value as T };
}

export function validateSourceReferenceArtifact(
  value: unknown,
): ContractValidationResult<SourceReferenceArtifact> {
  const result = validateArtifact<SourceReferenceArtifact>(
    value,
    sourceReferenceValidator,
  );
  if (!result.ok) return result;
  const seen = new Set<string>();
  const issues: ContractValidationIssue[] = [];
  result.value.references.forEach((reference, index) => {
    if (seen.has(reference.sourceReferenceId)) {
      issues.push({
        path: `/references/${index}/sourceReferenceId`,
        code: "duplicate_source_reference_id",
        message: "Source Reference IDs must be unique within the artifact",
      });
    }
    seen.add(reference.sourceReferenceId);
  });
  return issues.length ? { ok: false, issues } : result;
}

export function parseSourceReferenceArtifact(
  value: unknown,
): SourceReferenceArtifact {
  const result = validateSourceReferenceArtifact(value);
  if (!result.ok)
    throw new CanonicalLiteratureArtifactValidationError(result.issues);
  return result.value;
}

export function validateCitationAnalysisArtifact(
  value: unknown,
): ContractValidationResult<CitationAnalysisArtifact> {
  const result = validateArtifact<CitationAnalysisArtifact>(
    value,
    citationAnalysisValidator,
  );
  if (!result.ok) return result;
  const seen = new Set<string>();
  const issues: ContractValidationIssue[] = [];
  result.value.items.forEach((item, itemIndex) => {
    item.mentions.forEach((mention, mentionIndex) => {
      if (seen.has(mention.mention_id)) {
        issues.push({
          path: `/items/${itemIndex}/mentions/${mentionIndex}/mention_id`,
          code: "duplicate_mention_id",
          message: "Citation mention IDs must be unique within the artifact",
        });
      }
      seen.add(mention.mention_id);
    });
  });
  result.value.unresolved.forEach((mention, index) => {
    if (seen.has(mention.mention_id)) {
      issues.push({
        path: `/unresolved/${index}/mention_id`,
        code: "duplicate_mention_id",
        message: "Citation mention IDs must be unique within the artifact",
      });
    }
    seen.add(mention.mention_id);
  });
  return issues.length ? { ok: false, issues } : result;
}

export function parseCitationAnalysisArtifact(
  value: unknown,
): CitationAnalysisArtifact {
  const result = validateCitationAnalysisArtifact(value);
  if (!result.ok)
    throw new CanonicalLiteratureArtifactValidationError(result.issues);
  return result.value;
}

export function validateCitationAgainstReferences(
  citation: CitationAnalysisArtifact,
  references: SourceReferenceArtifact,
): ContractValidationResult<CitationAnalysisArtifact> {
  const citationResult = validateCitationAnalysisArtifact(citation);
  if (!citationResult.ok) return citationResult;
  const referencesResult = validateSourceReferenceArtifact(references);
  if (!referencesResult.ok) {
    return {
      ok: false,
      issues: referencesResult.issues.map((issue) => ({
        ...issue,
        path: `/references${issue.path === "/" ? "" : issue.path}`,
      })),
    };
  }
  const ids = new Set(
    referencesResult.value.references.map(
      (reference) => reference.sourceReferenceId,
    ),
  );
  const issues: ContractValidationIssue[] = [];
  citation.items.forEach((item, index) => {
    if (!ids.has(item.sourceReferenceId)) {
      issues.push({
        path: `/items/${index}/sourceReferenceId`,
        code: "unknown_source_reference_id",
        message:
          "Citation item references an ID absent from the current References artifact",
      });
    }
  });
  for (const bucket of ["early", "mid", "recent"] as const) {
    citation.timeline[bucket].sourceReferenceIds.forEach((id, index) => {
      if (!ids.has(id)) {
        issues.push({
          path: `/timeline/${bucket}/sourceReferenceIds/${index}`,
          code: "unknown_source_reference_id",
          message:
            "Citation timeline references an ID absent from the current References artifact",
        });
      }
    });
  }
  return issues.length ? { ok: false, issues } : { ok: true, value: citation };
}

export function attachReferencesBasis(
  citation: CitationAnalysisArtifact,
  referencesBasis: string,
): StoredCitationAnalysisArtifact {
  parseCitationAnalysisArtifact(citation);
  if (!referencesBasis) throw new Error("references_basis_required");
  return { ...citation, referencesBasis };
}

/**
 * Decode the runtime-stored form and keep the basis outside the public
 * canonical Citation input contract.
 */
export function parseStoredCitationAnalysisArtifact(
  value: unknown,
): StoredCitationAnalysisArtifact {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CanonicalLiteratureArtifactValidationError([
      {
        path: "/",
        code: "schema_invalid",
        message: "stored Citation artifact must be an object",
      },
    ]);
  }
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.referencesBasis !== "string" ||
    !candidate.referencesBasis
  ) {
    throw new CanonicalLiteratureArtifactValidationError([
      {
        path: "/referencesBasis",
        code: "schema_invalid",
        message:
          "stored Citation artifact requires a non-empty referencesBasis",
      },
    ]);
  }
  const { referencesBasis } = candidate;
  const { referencesBasis: _ignored, ...publicValue } = candidate;
  const citation = parseCitationAnalysisArtifact(publicValue);
  return { ...citation, referencesBasis };
}

/**
 * Accept either public Citation input or a runtime-stored artifact and return
 * the validated public input projection for Broker/import callers.
 */
/**
 * Produce the portable Citation artifact from either public input or a
 * runtime-stored form. Runtime-only `referencesBasis` is deliberately
 * stripped before export; callers must recompute it against the imported
 * complete References artifact.
 */
export function exportCanonicalCitationAnalysisArtifact(
  value: unknown,
): CitationAnalysisArtifact {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "referencesBasis" in value
  ) {
    const candidate = value as Record<string, unknown>;
    const { referencesBasis: _ignored, ...publicValue } = candidate;
    return parseCitationAnalysisArtifact(publicValue);
  }
  return parseCitationAnalysisArtifact(value);
}

/** Backward-named input projection; canonical export owns the implementation. */
export function toCitationAnalysisInput(
  value: unknown,
): CitationAnalysisArtifact {
  return exportCanonicalCitationAnalysisArtifact(value);
}
