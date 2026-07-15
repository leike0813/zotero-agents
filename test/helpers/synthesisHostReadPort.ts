import {
  toSynthesisJsonValue,
  type SynthesisHostArtifactDescriptor,
  type SynthesisHostLibraryItemSummary,
  type SynthesisHostReadPort,
} from "../../packages/synthesis-contracts/src/index";
import {
  readArtifactsFromRegistryInputs,
  type PaperArtifactReadResult,
} from "../../src/modules/synthesis/libraryAdapter";
import {
  buildReferenceSidecarMetadataFingerprintPayload,
  type ReferenceSidecarInput,
} from "../../src/modules/synthesis/registry";
import { hashCanonicalJson } from "../../src/modules/synthesis/foundation";

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function summary(
  input: ReferenceSidecarInput,
): SynthesisHostLibraryItemSummary {
  return {
    paperRef: `${input.libraryId}:${input.itemKey}`,
    libraryId: input.libraryId,
    itemKey: input.itemKey,
    itemType: cleanString(input.itemType),
    title: cleanString(input.title),
    year: cleanString(input.year),
    date: cleanString(input.year),
    creators: [...(input.creators || [])],
    tags: [...(input.tags || [])],
    collections: [...(input.collections || [])],
    doi: cleanString(input.doi),
    arxiv: cleanString(input.arxiv),
    isbn: cleanString(input.isbn),
    url: cleanString(input.url),
    citekey: cleanString(input.citekey),
    dateAdded: cleanString(input.dateAdded),
    metadataHash: hashCanonicalJson(
      buildReferenceSidecarMetadataFingerprintPayload(input),
    ),
  };
}

export function createTestSynthesisHostReadPort(
  source:
    | ReferenceSidecarInput[]
    | (() => ReferenceSidecarInput[] | Promise<ReferenceSidecarInput[]>),
): SynthesisHostReadPort {
  const load = async () =>
    typeof source === "function" ? await source() : source;
  const locators = new Map<string, PaperArtifactReadResult>();
  const descriptor = (
    artifact: PaperArtifactReadResult,
  ): SynthesisHostArtifactDescriptor => {
    const hash = cleanString(artifact.payload_hash || artifact.hash);
    const locator = `test-artifact:v1:${encodeURIComponent(
      artifact.paper_ref,
    )}:${artifact.artifact_type}:${encodeURIComponent(
      cleanString(artifact.note_key),
    )}`;
    if (artifact.status === "available" && hash) {
      locators.set(locator, artifact);
    }
    return {
      paperRef: artifact.paper_ref,
      artifactType: artifact.artifact_type,
      payloadType: artifact.payload_type,
      status: artifact.status,
      ...(artifact.status === "available" && hash
        ? { locator, payloadHash: hash }
        : {}),
      diagnostics: [...artifact.diagnostics],
    };
  };
  return {
    library: {
      async listItemsPage(request) {
        const limit = request.limit || 50;
        const rows = (await load())
          .filter((input) => input.libraryId === request.libraryId)
          .sort((left, right) => left.itemKey.localeCompare(right.itemKey));
        const start = Math.max(0, Number(request.cursor || 0));
        const items = rows.slice(start, start + limit).map(summary);
        const next = start + items.length;
        return {
          items,
          cursor: cleanString(request.cursor),
          nextCursor: next < rows.length ? String(next) : "",
          hasMore: next < rows.length,
          returned: items.length,
          limit,
        };
      },
      async getItemsByRef(request) {
        const rows = await load();
        const byRef = new Map(
          rows.map((input) => [`${input.libraryId}:${input.itemKey}`, input]),
        );
        return {
          items: request.paperRefs
            .map((paperRef) => byRef.get(paperRef))
            .filter((input): input is ReferenceSidecarInput => Boolean(input))
            .map(summary),
          missingPaperRefs: request.paperRefs.filter(
            (paperRef) => !byRef.has(paperRef),
          ),
        };
      },
    },
    artifacts: {
      async scanPage(request) {
        const rows = await load();
        const selected = request.paperRefs?.length
          ? rows.filter((input) =>
              request.paperRefs!.includes(
                `${input.libraryId}:${input.itemKey}`,
              ),
            )
          : rows;
        const result = readArtifactsFromRegistryInputs(selected, {
          artifact_types: request.artifactTypes,
        });
        const artifacts = result.artifacts.map(descriptor);
        return {
          artifacts,
          cursor: cleanString(request.cursor),
          nextCursor: "",
          hasMore: false,
          returned: selected.length,
          limit: request.limit || 50,
        };
      },
      async read(request) {
        const artifact = locators.get(request.locator);
        if (!artifact) {
          return { status: "missing", diagnostics: ["artifact_not_found"] };
        }
        const currentHash = cleanString(artifact.payload_hash || artifact.hash);
        if (currentHash !== request.expectedHash) {
          return {
            status: "stale",
            currentHash,
            diagnostics: ["artifact_hash_changed"],
          };
        }
        return {
          status: "available",
          payloadHash: currentHash,
          content:
            artifact.artifact_type === "digest"
              ? {
                  kind: "text",
                  text: cleanString(
                    artifact.markdown ||
                      artifact.decoded_text ||
                      artifact.payload,
                  ),
                  mediaType: "text/markdown",
                }
              : {
                  kind: "json",
                  value: toSynthesisJsonValue(artifact.payload),
                },
          diagnostics: [...artifact.diagnostics],
        };
      },
    },
  };
}
