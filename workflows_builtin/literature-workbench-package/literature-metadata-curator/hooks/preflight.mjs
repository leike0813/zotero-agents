import {
  buildFallbackContext,
  buildParentSnapshot,
  candidateMatchesIdentifier,
  canonicalResultFromMetadata,
  hasCoreBibliographicMetadata,
  normalizeString,
  resolveParentItem,
  selectIdentifier,
} from "../../lib/metadataCurator.mjs";
import { withPackageRuntimeScope } from "../../lib/runtime.mjs";

function summarizeTranslators(translators) {
  return (Array.isArray(translators) ? translators : []).map((translator) => ({
    translatorID: normalizeString(translator?.translatorID),
    label: normalizeString(translator?.label),
    priority: translator?.priority,
    translatorType: translator?.translatorType,
  }));
}

async function translateIdentifier({ runtime, identifier }) {
  const translateIdentifierHostApi =
    runtime?.hostApi?.metadata?.translateIdentifier;
  if (typeof translateIdentifierHostApi === "function") {
    try {
      const translated = await translateIdentifierHostApi({
        type: identifier.type,
        value: identifier.value,
      });
      const translators = summarizeTranslators(translated?.translators);
      const itemCount = Number(translated?.itemCount || 0);
      if (
        translated?.ok &&
        translated?.item &&
        candidateMatchesIdentifier(translated.item, identifier) &&
        hasCoreBibliographicMetadata(translated.item)
      ) {
        return {
          ok: true,
          item: translated.item,
          translators,
          itemCount,
        };
      }
      if (translated?.ok && translated?.item) {
        return {
          ok: false,
          reason: "candidate_not_trustworthy",
          diagnostics: [
            {
              code: "candidate_not_trustworthy",
              message:
                "Zotero Translate.Search returned candidates, but none matched the selected identifier with enough metadata.",
              details: {
                itemCount,
                translators,
              },
            },
          ],
        };
      }
      return {
        ok: false,
        reason: translated?.diagnostics?.[0]?.code || "no_items",
        diagnostics:
          Array.isArray(translated?.diagnostics) &&
          translated.diagnostics.length > 0
            ? translated.diagnostics
            : [
                {
                  code: itemCount ? "candidate_not_trustworthy" : "no_items",
                  message: itemCount
                    ? "Zotero Translate.Search returned candidates, but none matched the selected identifier with enough metadata."
                    : "No items returned from any translator.",
                  details: {
                    itemCount,
                    translators,
                  },
                },
              ],
      };
    } catch (error) {
      return {
        ok: false,
        reason: "translate_search_failed",
        diagnostics: [
          {
            code: "translate_search_failed",
            message: error instanceof Error ? error.message : String(error),
          },
        ],
      };
    }
  }

  return {
    ok: false,
    reason: "translate_search_unavailable",
    diagnostics: [
      {
        code: "translate_search_unavailable",
        message: "Workflow Host metadata translation is unavailable.",
      },
    ],
  };
}

async function preflightImpl({ selectionContext, executionOptions, runtime }) {
  const parent = resolveParentItem(selectionContext, runtime);
  const parentSnapshot = buildParentSnapshot(parent);
  const identifier = selectIdentifier(parentSnapshot);
  const baseContext = {
    parent: parentSnapshot,
    identifier,
  };

  if (!identifier) {
    return {
      kind: "continue",
      context: buildFallbackContext({
        ...baseContext,
        diagnostics: [
          {
            code: "identifier_missing",
            message:
              "Selected parent has no DOI, ISBN, or supported URL-derived identifier.",
          },
        ],
      }),
    };
  }

  if (
    executionOptions?.workflowParams?.skip_identifier_fast_path === true
  ) {
    return {
      kind: "continue",
      context: buildFallbackContext(baseContext),
    };
  }

  const translated = await translateIdentifier({ runtime, identifier });
  if (translated.ok) {
    return {
      kind: "short-circuit-apply",
      apply: {
        parent: parentSnapshot.id || parent,
        resultJson: canonicalResultFromMetadata({
          source: "zotero-translate-search",
          parent: parentSnapshot,
          metadata: translated.item,
          evidence: [
            {
              identifierType: identifier.type,
              identifier: identifier.value,
              itemCount: translated.itemCount,
              translators: translated.translators,
            },
          ],
        }),
      },
      context: {
        source: "zotero-translate-search",
        identifierType: identifier.type,
        identifier: identifier.value,
        parent: parentSnapshot,
      },
    };
  }

  return {
    kind: "continue",
    context: buildFallbackContext({
      ...baseContext,
      diagnostics: translated.diagnostics,
    }),
  };
}

export async function preflight(args) {
  return withPackageRuntimeScope(args?.runtime, () => preflightImpl(args || {}));
}

export const __metadataCuratorPreflightTestOnly = {
  translateIdentifier,
  preflightImpl,
};
