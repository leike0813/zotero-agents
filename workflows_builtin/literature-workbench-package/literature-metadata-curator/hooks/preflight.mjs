import {
  buildFallbackContext,
  buildParentSnapshot,
  canonicalResultFromMetadata,
  hasCoreBibliographicMetadata,
  resolveParentItem,
  selectIdentifier,
} from "../../lib/metadataCurator.mjs";
import { withPackageRuntimeScope } from "../../lib/runtime.mjs";

async function translateIdentifier({ runtime, identifier }) {
  const translateIdentifierHostApi =
    runtime?.hostApi?.metadata?.translateIdentifier;
  if (typeof translateIdentifierHostApi === "function") {
    try {
      const translated = await translateIdentifierHostApi({
        type: identifier.type,
        value: identifier.value,
      });
      if (
        translated?.outcome === "matched" &&
        translated?.item &&
        hasCoreBibliographicMetadata(translated.item)
      ) {
        return {
          ok: true,
          item: translated.item,
          evidence: translated.evidence,
        };
      }
      if (translated?.outcome === "matched") {
        return {
          ok: false,
          reason: "candidate_not_trustworthy",
          diagnostics: [
            {
              code: "candidate_not_trustworthy",
              message:
                "Zotero Translate.Search returned candidates, but none matched the selected identifier with enough metadata.",
              details: translated.evidence,
            },
          ],
        };
      }
      const reason =
        translated?.outcome === "ambiguous"
          ? "ambiguous"
          : translated?.reason || "no_candidate";
      return {
        ok: false,
        reason,
        diagnostics: [
          {
            code: reason,
            message:
              reason === "ambiguous"
                ? "Zotero Translate.Search returned multiple exact identifier matches."
                : "Zotero Translate.Search did not return an exact identifier match.",
            details: translated?.evidence,
          },
        ],
      };
    } catch (error) {
      return {
        ok: false,
        reason: error?.code || "execution_failed",
        diagnostics: [
          {
            code: error?.code || "execution_failed",
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
              ...translated.evidence,
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
