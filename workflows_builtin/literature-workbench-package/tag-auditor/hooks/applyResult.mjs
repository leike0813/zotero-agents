import { evaluateTagCompliance } from "../../lib/tagCompliance.mjs";
import { requireHostApi, withPackageRuntimeScope } from "../../lib/runtime.mjs";

async function applyResultImpl({ runtime }) {
  const host = requireHostApi(runtime);
  const vocabulary = await host.synthesis.tags.exportVocabularyForRegulator();
  const firstPage = await host.library.listItems({ limit: 1 });
  const libraryId = firstPage.libraryId;
  const outcome = await host.synthesis.tags.withAuditRun(
    { libraryId, vocabularyHash: vocabulary.vocabularyHash },
    {},
    (run) =>
      host.library.traverseItems(
        { libraryId, scope: "top-level-regular" },
        {},
        async (batch) => {
          await run.append(
            batch.items.map((item) => {
              const evaluation = evaluateTagCompliance({
                tags: item.tags,
                controlledTags: vocabulary.allowedTags,
              });
              return {
                target: {
                  libraryId: item.ref.libraryId,
                  itemKey: item.ref.key,
                },
                auditedRevision: item.revision,
                auditedTagDigest: item.tagDigest,
                auditedTags: item.tags,
                evaluation: evaluation.compliant
                  ? { state: "compliant" }
                  : {
                      state: "needs_regulation",
                      nonCompliantTags: evaluation.nonCompliantTags,
                    },
              };
            }),
          );
        },
      ),
  );
  if (outcome.outcome !== "published") return { libraries: [] };
  return {
    libraries: [
      {
        libraryId,
        audited: outcome.snapshot.auditedItems,
        needsTagRegulation: outcome.snapshot.needsRegulation,
      },
    ],
  };
}

export async function applyResult(args) {
  return withPackageRuntimeScope(args?.runtime, () => applyResultImpl(args));
}
