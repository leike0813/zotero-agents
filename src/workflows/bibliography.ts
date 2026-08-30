import { resolveRuntimeZotero } from "../utils/runtimeBridge";
import {
  createWorkflowHostError,
  type WorkflowHostErrorDetailsByCode,
} from "./workflowHostErrorContract";
import type {
  BibliographyFormatDto,
  BibliographyFormatRef,
  BibliographyRenderRequestDto,
  BibliographyRenderResultDto,
  JsonObject,
  PortableItemRef,
  WorkflowBibliographyOwner,
  WorkflowCallControl,
} from "./types";

export type WorkflowItemTextTranslatorCandidate = {
  translatorID: string;
  label?: string;
};

export type WorkflowItemTextExportAttempt = {
  translatorID: string;
  label: string;
  status: "succeeded" | "unavailable" | "failed" | "empty_output";
  errorCode?: string;
  message?: string;
};

export type WorkflowItemTextExportArgs = {
  items: Zotero.Item[];
  translatorCandidates: WorkflowItemTextTranslatorCandidate[];
  displayOptions?: Record<string, boolean>;
};

export type WorkflowItemTextExportResult =
  | {
      ok: true;
      content: string;
      translator: {
        translatorID: string;
        label: string;
        target?: string;
      };
      fallbackUsed: boolean;
      attempts: WorkflowItemTextExportAttempt[];
    }
  | {
      ok: false;
      attempts: WorkflowItemTextExportAttempt[];
    };

type ZoteroExportTranslator = {
  translatorID?: unknown;
  label?: unknown;
  target?: unknown;
  translatorType?: unknown;
};

type ZoteroExportTranslation = {
  string?: unknown;
  setItems: (items: Zotero.Item[]) => void;
  setTranslator: (translatorID: string) => void;
  setDisplayOptions?: (options: Record<string, boolean>) => void;
  translate: () => Promise<unknown>;
};

type ZoteroTextExportRuntime = {
  Translators?: {
    get?: (
      translatorID: string,
    ) => ZoteroExportTranslator | null | Promise<ZoteroExportTranslator | null>;
  };
  Translate?: {
    Export?: new () => ZoteroExportTranslation;
  };
};

type BibliographyFormatDefinition = {
  ref: BibliographyFormatRef;
  label: string;
  fileExtension: string;
  contentType: string;
  translatorID: string;
  optionNames: readonly string[];
};

const BIBLIOGRAPHY_FORMATS: readonly BibliographyFormatDefinition[] = [
  {
    ref: { id: "better-bibtex" },
    label: "Better BibTeX",
    fileExtension: "bib",
    contentType: "text/x-bibtex",
    translatorID: "ca65189f-8815-4afe-8c8b-8c7c15f0edca",
    optionNames: [
      "exportNotes",
      "exportFileData",
      "keepUpdated",
      "useJournalAbbreviation",
    ],
  },
  {
    ref: { id: "bibtex" },
    label: "BibTeX",
    fileExtension: "bib",
    contentType: "text/x-bibtex",
    translatorID: "9cb70025-a888-4a29-a210-93ec52da40d4",
    optionNames: [
      "exportNotes",
      "exportFileData",
      "keepUpdated",
      "useJournalAbbreviation",
    ],
  },
] as const;

const MAX_BIBLIOGRAPHY_ITEMS = 10_000;
const MAX_BIBLIOGRAPHY_OUTPUT_BYTES = 64 * 1024 * 1024;

function text(value: unknown) {
  return String(value ?? "").trim();
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : text(error);
}

function requireNotCanceled(control?: WorkflowCallControl) {
  if (control?.signal?.aborted) {
    throw createWorkflowHostError("canceled", "Bibliography render canceled", {
      reason: "caller_signal",
    });
  }
}

function invalidBibliographyRequest(
  message: string,
  details: WorkflowHostErrorDetailsByCode["invalid_request"],
) {
  return createWorkflowHostError("invalid_request", message, details);
}

function optionsSchema(definition: BibliographyFormatDefinition): JsonObject {
  return {
    type: "object",
    additionalProperties: false,
    properties: Object.fromEntries(
      definition.optionNames.map((name) => [name, { type: "boolean" }]),
    ),
  };
}

async function resolveFormat(
  runtime: ZoteroTextExportRuntime,
  definition: BibliographyFormatDefinition,
) {
  const getTranslator = runtime.Translators?.get;
  if (typeof getTranslator !== "function" || !runtime.Translate?.Export) {
    return null;
  }
  try {
    const translator = await getTranslator.call(
      runtime.Translators,
      definition.translatorID,
    );
    const translatorType = Number(translator?.translatorType);
    return translator &&
      (!Number.isFinite(translatorType) || (translatorType & 2) !== 0)
      ? translator
      : null;
  } catch {
    return null;
  }
}

function formatDto(
  definition: BibliographyFormatDefinition,
  available: boolean,
): BibliographyFormatDto {
  return {
    ref: definition.ref,
    label: definition.label,
    fileExtension: definition.fileExtension,
    contentType: definition.contentType,
    availability: available ? "available" : "unavailable",
    optionsSchema: optionsSchema(definition),
  };
}

function normalizeFormatOptions(
  value: JsonObject | undefined,
  definition: BibliographyFormatDefinition,
) {
  if (value === undefined) return {};
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw invalidBibliographyRequest("formatOptions must be an object", {
      reason: "invalid_type",
      field: "formatOptions",
    });
  }
  const allowed = new Set(definition.optionNames);
  const options: Record<string, boolean> = {};
  for (const [key, option] of Object.entries(value)) {
    if (!allowed.has(key) || typeof option !== "boolean") {
      throw invalidBibliographyRequest("format option is invalid", {
        reason: allowed.has(key) ? "invalid_type" : "unsupported_value",
        field: `formatOptions.${key}`,
      });
    }
    options[key] = option;
  }
  return options;
}

function requirePortableItemRef(ref: PortableItemRef, index: number) {
  if (
    !ref ||
    !Number.isSafeInteger(ref.libraryId) ||
    ref.libraryId <= 0 ||
    !/^[A-Z0-9]{8}$/.test(String(ref.key || ""))
  ) {
    throw createWorkflowHostError("invalid_ref", "item ref is invalid", {
      kind: "item",
      reason: "invalid_shape",
    });
  }
  return `${ref.libraryId}:${ref.key}:${index}`;
}

export function createWorkflowBibliographyOwner(
  deps: Readonly<{
    resolveRuntime?: () => ZoteroTextExportRuntime | undefined;
    resolveItem?: (ref: PortableItemRef) => Zotero.Item | null | undefined;
    maxOutputBytes?: number;
  }> = {},
): WorkflowBibliographyOwner {
  const resolveRuntime = deps.resolveRuntime || (() => resolveRuntimeZotero());
  const resolveItem =
    deps.resolveItem ||
    ((ref: PortableItemRef) =>
      (resolveRuntime() as typeof Zotero | undefined)?.Items?.getByLibraryAndKey?.(
        ref.libraryId,
        ref.key,
      ) || null);
  const maxOutputBytes =
    Number.isFinite(deps.maxOutputBytes) && Number(deps.maxOutputBytes) > 0
      ? Math.min(
          MAX_BIBLIOGRAPHY_OUTPUT_BYTES,
          Math.floor(Number(deps.maxOutputBytes)),
        )
      : MAX_BIBLIOGRAPHY_OUTPUT_BYTES;

  return {
    async listFormats(control) {
      requireNotCanceled(control);
      const runtime = resolveRuntime() || {};
      return Promise.all(
        BIBLIOGRAPHY_FORMATS.map(async (definition) =>
          formatDto(definition, Boolean(await resolveFormat(runtime, definition))),
        ),
      );
    },

    async render(input: BibliographyRenderRequestDto, control) {
      requireNotCanceled(control);
      const itemRefs = Array.isArray(input?.itemRefs) ? input.itemRefs : [];
      if (itemRefs.length > MAX_BIBLIOGRAPHY_ITEMS) {
        throw createWorkflowHostError(
          "resource_limited",
          "Bibliography item limit exceeded",
          {
            resource: "items",
            limit: MAX_BIBLIOGRAPHY_ITEMS,
            observed: itemRefs.length,
          },
        );
      }
      if (itemRefs.length === 0) {
        throw invalidBibliographyRequest("itemRefs must not be empty", {
          reason: "missing_field",
          field: "itemRefs",
        });
      }
      const seenItems = new Set<string>();
      const items = itemRefs.map((ref, index) => {
        const identity = requirePortableItemRef(ref, index).replace(/:\d+$/, "");
        if (seenItems.has(identity)) {
          throw invalidBibliographyRequest("itemRefs contains a duplicate", {
            reason: "duplicate_value",
            field: "itemRefs",
          });
        }
        seenItems.add(identity);
        const item = resolveItem(ref);
        if (!item) {
          throw createWorkflowHostError("not_found", "item was not found", {
            kind: "item",
            opaqueKey: ref.key,
          });
        }
        const candidate = item as Zotero.Item & {
          isRegularItem?: () => boolean;
        };
        if (
          (typeof candidate.isRegularItem === "function" &&
            !candidate.isRegularItem()) ||
          ["note", "attachment", "annotation"].includes(
            String((candidate as { itemType?: unknown }).itemType || ""),
          )
        ) {
          throw createWorkflowHostError("invalid_ref", "item is not regular", {
            kind: "item",
            reason: "wrong_kind",
          });
        }
        return item;
      });
      const requestedFormats = Array.isArray(input?.formatPreference)
        ? input.formatPreference.map((ref) => ({ id: text(ref?.id) }))
        : [];
      if (requestedFormats.length === 0) {
        throw invalidBibliographyRequest(
          "formatPreference must not be empty",
          { reason: "missing_field", field: "formatPreference" },
        );
      }
      const seenFormats = new Set<string>();
      const definitions = requestedFormats.map((ref) => {
        if (!ref.id || seenFormats.has(ref.id)) {
          throw invalidBibliographyRequest(
            "formatPreference contains an invalid or duplicate ref",
            { reason: "duplicate_value", field: "formatPreference" },
          );
        }
        seenFormats.add(ref.id);
        const definition = BIBLIOGRAPHY_FORMATS.find(
          (candidate) => candidate.ref.id === ref.id,
        );
        if (!definition) {
          throw createWorkflowHostError(
            "invalid_ref",
            "bibliography format ref is invalid",
            { kind: "bibliography_format", reason: "forged" },
          );
        }
        return definition;
      });
      const runtime = resolveRuntime() || {};
      let selected: BibliographyFormatDefinition | null = null;
      for (const definition of definitions) {
        requireNotCanceled(control);
        if (await resolveFormat(runtime, definition)) {
          selected = definition;
          break;
        }
      }
      if (!selected) {
        throw createWorkflowHostError(
          "unavailable",
          "No requested bibliography format is available",
          { reason: "capability", kind: "bibliography_format" },
        );
      }
      const displayOptions = normalizeFormatOptions(
        input.formatOptions,
        selected,
      );
      const Export = runtime.Translate?.Export;
      if (!Export) {
        throw createWorkflowHostError(
          "unavailable",
          "Bibliography renderer is unavailable",
          { reason: "runtime", kind: "bibliography_format" },
        );
      }
      try {
        const translation = new Export();
        translation.setItems(items);
        translation.setTranslator(selected.translatorID);
        translation.setDisplayOptions?.(displayOptions);
        await translation.translate();
        requireNotCanceled(control);
        const content =
          typeof translation.string === "string" ? translation.string : "";
        if (!content) throw new Error("bibliography renderer returned no content");
        const outputBytes = new TextEncoder().encode(content).byteLength;
        if (outputBytes > maxOutputBytes) {
          throw createWorkflowHostError(
            "resource_limited",
            "Bibliography output limit exceeded",
            {
              resource: "bytes",
              limit: maxOutputBytes,
              observed: outputBytes,
            },
          );
        }
        const selectedIndex = definitions.indexOf(selected);
        const usedFormat = formatDto(selected, true);
        const fallbackUsed = selectedIndex > 0;
        const result: BibliographyRenderResultDto = {
          content,
          requestedFormats,
          usedFormat,
          fallbackUsed,
          issues: fallbackUsed
            ? [
                {
                  code: "bibliography_format_fallback",
                  requested: requestedFormats,
                  used: usedFormat.ref,
                },
              ]
            : [],
        };
        return result;
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          typeof (error as { code?: unknown }).code === "string"
        ) {
          throw error;
        }
        throw createWorkflowHostError(
          "execution_failed",
          "Bibliography render failed",
          { phase: "adapter", recovery: "none" },
        );
      }
    },
  };
}

export async function exportZoteroItemsAsText(
  zotero: ZoteroTextExportRuntime,
  args: WorkflowItemTextExportArgs,
): Promise<WorkflowItemTextExportResult> {
  const attempts: WorkflowItemTextExportAttempt[] = [];
  const items = Array.isArray(args.items) ? args.items : [];
  const candidates = Array.isArray(args.translatorCandidates)
    ? args.translatorCandidates
    : [];
  const getTranslator = zotero.Translators?.get;
  const Export = zotero.Translate?.Export;

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    const translatorID = text(candidate?.translatorID);
    const requestedLabel = text(candidate?.label);
    if (!translatorID || typeof getTranslator !== "function" || !Export) {
      attempts.push({
        translatorID,
        label: requestedLabel,
        status: "unavailable",
        errorCode: "translator_unavailable",
      });
      continue;
    }
    let translator: ZoteroExportTranslator | null = null;
    try {
      translator = await getTranslator.call(zotero.Translators, translatorID);
    } catch (error) {
      attempts.push({
        translatorID,
        label: requestedLabel,
        status: "failed",
        errorCode: "translator_lookup_failed",
        message: errorMessage(error),
      });
      continue;
    }
    const label = text(translator?.label) || requestedLabel;
    const translatorType = Number(translator?.translatorType);
    if (
      !translator ||
      (Number.isFinite(translatorType) && (translatorType & 2) === 0)
    ) {
      attempts.push({
        translatorID,
        label,
        status: "unavailable",
        errorCode: "translator_unavailable",
      });
      continue;
    }
    try {
      const translation = new Export();
      translation.setItems(items);
      translation.setTranslator(translatorID);
      translation.setDisplayOptions?.(args.displayOptions || {});
      await translation.translate();
      const content =
        typeof translation.string === "string" ? translation.string : "";
      if (!content.trim()) {
        attempts.push({
          translatorID,
          label,
          status: "empty_output",
          errorCode: "empty_output",
        });
        continue;
      }
      attempts.push({ translatorID, label, status: "succeeded" });
      return {
        ok: true,
        content,
        translator: {
          translatorID,
          label,
          target: text(translator.target) || undefined,
        },
        fallbackUsed: index > 0,
        attempts,
      };
    } catch (error) {
      attempts.push({
        translatorID,
        label,
        status: "failed",
        errorCode: "export_failed",
        message: errorMessage(error),
      });
    }
  }
  return { ok: false, attempts };
}
