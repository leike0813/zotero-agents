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

function text(value: unknown) {
  return String(value ?? "").trim();
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : text(error);
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
      const output = await translation.translate();
      const content = typeof output === "string" ? output : "";
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
