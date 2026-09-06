import {
  portableItemRef,
  readHostPages,
  requireHostApi,
  resolveAttachmentPath,
  selectionItems,
  withPackageRuntimeScope,
} from "../../lib/runtime.mjs";
import {
  buildTagRegulatorInputFromParent,
  resolveParentItemFromSelection,
  resolveRequestParameters as resolveTagRegulatorParameters,
} from "../../lib/tagRegulatorRequest.mjs";
import {
  buildParentSnapshot,
  selectIdentifier,
} from "../../lib/metadataCurator.mjs";
import { parseWorkbenchNoteKind } from "../../lib/noteCodecs.mjs";
import { parseGeneratedNoteKind } from "../../lib/referencesNote.mjs";
import { normalizeLiteratureScoreArtifact } from "../../lib/literatureScoreNote.mjs";

const generatedPayloadTypesByNoteKind = {
  digest: ["digest-markdown"],
  references: ["references-json"],
  "citation-analysis": ["citation-analysis-json", "citation-analysis-markdown"],
  "literature-score": ["literature-score-json"],
};

function normalizeString(value) {
  return String(value || "").trim();
}

function resolveSourceAttachmentRef(selectionContext) {
  const attachment = selectionItems(selectionContext).find(
    (item) => item?.kind === "attachment",
  );
  if (!attachment?.ref) {
    throw new Error(
      "literature-analysis buildRequest requires one source attachment",
    );
  }
  return portableItemRef(attachment.ref);
}

function resolveWorkflowParams(executionOptions) {
  const workflowParams = executionOptions?.workflowParams || {};
  const language = normalizeString(workflowParams.language) || "zh-CN";
  return {
    language,
    autoTagRegulator: workflowParams.auto_tag_regulator === true,
    autoTagInferTag: workflowParams.auto_tag_infer_tag !== false,
  };
}

function resolveSupportedIdentifier(parentItem) {
  const identifier = selectIdentifier(
    parentItem?.fields
      ? {
          fields: parentItem.fields,
          DOI: parentItem.fields.DOI,
          ISBN: parentItem.fields.ISBN,
          url: parentItem.fields.url,
        }
      : buildParentSnapshot(parentItem),
    {
      allowedTypes: ["DOI", "arXiv"],
    },
  );
  return normalizeString(identifier?.normalized);
}

function resolveReadinessSpec(manifest) {
  const filters = manifest?.validateSelection?.filters;
  const spec = Array.isArray(filters)
    ? filters.find((entry) => entry?.kind === "generated-note-readiness")
    : null;
  if (!spec) {
    throw new Error("literature-analysis readiness declaration is missing");
  }
  return spec;
}

function resolveSchemaGeneratedNoteKind(noteContent) {
  const text = String(noteContent || "");
  if (!/<(?:div|section)\b[^>]*data-schema-version\s*=/i.test(text)) {
    return "";
  }
  return (
    parseGeneratedNoteKind(text) ||
    (/<h1[^>]*>\s*Literature Score\s*<\/h1>/i.test(text)
      ? "literature-score"
      : "")
  );
}

async function resolveReadinessNoteKind(host, note) {
  const detail = await host.library.getNoteDetail(note.ref, { format: "html" });
  const markerKind = parseWorkbenchNoteKind(detail.content);
  if (markerKind) {
    return markerKind;
  }
  const schemaKind = resolveSchemaGeneratedNoteKind(detail.content);
  for (const payloadType of generatedPayloadTypesByNoteKind[schemaKind] || []) {
    try {
      await host.library.getNotePayload(note.ref, { payloadType });
      return schemaKind;
    } catch {
      // Try the next payload representation for this generated note kind.
    }
  }
  return "";
}

async function inspectReadiness(parentItem, manifest, runtime) {
  const spec = resolveReadinessSpec(manifest);
  const host = requireHostApi(runtime);
  const noteSummaries = await readHostPages({
    readPage: (page) =>
      host.library.getItemNotes(portableItemRef(parentItem), page),
    getItems: (page) => page.notes,
    operation: "literature-analysis readiness note read",
  });
  const notes = await Promise.all(
    noteSummaries.map(async (note) => {
      return { note, kind: await resolveReadinessNoteKind(host, note) };
    }),
  );
  const artifacts = {};
  for (const artifactSpec of spec.artifacts) {
    const candidates = notes.filter((entry) =>
      artifactSpec.noteKinds.includes(entry.kind),
    );
    let status = candidates.length ? "available" : "missing";
    if (candidates.length && artifactSpec.payload) {
      status = "invalid";
      for (const candidate of candidates) {
        try {
          const payload = (
            await host.library.getNotePayload(candidate.note.ref, {
              payloadType: artifactSpec.payload.type,
            })
          ).value;
          if (artifactSpec.payload.type === "literature-score-json") {
            normalizeLiteratureScoreArtifact(payload);
          }
          if (
            (artifactSpec.payload.requirements || []).every((rule) => {
              const value = rule.pointer
                .split("/")
                .slice(1)
                .reduce(
                  (current, segment) =>
                    current?.[
                      segment.replaceAll("~1", "/").replaceAll("~0", "~")
                    ],
                  payload,
                );
              if (Object.hasOwn(rule, "const") && value !== rule.const)
                return false;
              if (rule.type === "array" && !Array.isArray(value)) return false;
              if (
                rule.type &&
                rule.type !== "array" &&
                typeof value !== rule.type
              )
                return false;
              if (rule.length !== undefined && value?.length !== rule.length)
                return false;
              if (rule.minimum !== undefined && value < rule.minimum)
                return false;
              if (rule.maximum !== undefined && value > rule.maximum)
                return false;
              return true;
            })
          ) {
            status = "available";
            break;
          }
        } catch {
          // Try the next note candidate.
        }
      }
    }
    artifacts[artifactSpec.id] = {
      status,
      noteRefs: candidates.map((entry) => entry.note.ref),
    };
  }
  const mode =
    spec.modes.find(
      (candidate) =>
        !candidate.default &&
        (candidate.allAvailable || []).every(
          (id) => artifacts[id]?.status === "available",
        ) &&
        (candidate.allUnavailable || []).every(
          (id) => artifacts[id]?.status !== "available",
        ),
    )?.id ||
    spec.modes.find((candidate) => candidate.default)?.id ||
    "";
  const readiness = {
    mode,
    accepted: spec.acceptModes.includes(mode),
    evidenceHash: JSON.stringify(
      spec.artifacts.map(({ id }) => [id, artifacts[id]]),
    ),
    artifacts,
  };
  if (!readiness?.accepted) {
    throw new Error(
      "literature-analysis input already has all generated artifacts",
    );
  }
  return readiness;
}

async function buildRequestImpl({
  selectionContext,
  executionOptions,
  manifest,
  runtime,
}) {
  const sourceAttachmentRef = resolveSourceAttachmentRef(selectionContext);
  const sourcePath = await resolveAttachmentPath(sourceAttachmentRef, runtime);
  const parentRef = portableItemRef(
    resolveParentItemFromSelection(selectionContext, runtime),
  );
  const parentDetail =
    await requireHostApi(runtime).library.getItemDetail(parentRef);
  if (parentDetail?.kind !== "regular") {
    throw new Error("literature-analysis requires one regular parent item");
  }
  const parentItem = parentDetail.item;
  const params = resolveWorkflowParams(executionOptions);
  const identifier = resolveSupportedIdentifier(parentItem);
  const readiness = await inspectReadiness(parentItem, manifest, runtime);
  const scoreOnly = readiness.mode === "score-only";
  const digestStep = {
    id: "digest",
    skill_id: "literature-analysis",
    mode: "auto",
    workspace: "new",
    fetch_type: "bundle",
    apply_result: {
      workflow_id: "literature-analysis",
      on_failure: "continue",
    },
    input: {
      source_path: sourcePath,
    },
    parameter: {
      language: params.language,
      score_only: scoreOnly,
      ...(identifier ? { identifier } : {}),
    },
  };
  const steps = [digestStep];
  let finalStepId = "digest";

  if (params.autoTagRegulator && !scoreOnly) {
    const tagInput = await buildTagRegulatorInputFromParent({
      parentItem,
      runtime,
      useAbsoluteValidTagsPath: true,
    });
    steps.push({
      id: "tag-regulator",
      skill_id: "tag-regulator",
      mode: "auto",
      workspace: "reuse-workflow",
      fetch_type: "result",
      apply_result: {
        workflow_id: "tag-regulator",
        on_failure: "continue",
      },
      input: tagInput.input,
      parameter: resolveTagRegulatorParameters(executionOptions, {
        tagNoteLanguage: params.language,
        inferTag: params.autoTagInferTag,
      }),
      handoff: {
        bindings: [
          {
            kind: "file",
            step: "digest",
            source: "digest_path",
            target: "/input/digest_markdown",
            required: true,
          },
        ],
      },
    });
    finalStepId = "tag-regulator";
  }

  const confirmedReadiness = await inspectReadiness(
    parentItem,
    manifest,
    runtime,
  );
  if (
    confirmedReadiness.mode !== readiness.mode ||
    confirmedReadiness.evidenceHash !== readiness.evidenceHash
  ) {
    throw new Error(
      "literature-analysis generated-note readiness changed while building the request; retry",
    );
  }

  return {
    kind: "skillrunner.sequence.v1",
    sourceAttachmentRefs: [sourceAttachmentRef],
    targetParentRef: parentRef,
    steps,
    final_step_id: finalStepId,
    poll: {
      interval_ms: 2000,
      timeout_ms: 1200000,
    },
  };
}

export async function buildRequest(args) {
  return withPackageRuntimeScope(args?.runtime, () => buildRequestImpl(args));
}

export const __literatureAnalysisBuildRequestTestOnly = {
  resolveWorkflowParams,
  resolveReadinessSpec,
  resolveSupportedIdentifier,
};
