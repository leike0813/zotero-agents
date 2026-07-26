import { materializeResearchProduct } from "../../lib/researchBundle.mjs";

export async function applyResult(context = {}) {
  const result = context.resultContext?.resultJson || {};
  if (context.runResult?.status !== "succeeded" || result.kind === "research_bundle_canceled") {
    return { ok: true, status: "skipped", product: null };
  }
  const artifact = await context.resultContext.readArtifactText({
    fieldName: "selection_manifest_path",
    rawPath: result.selection_manifest_path,
    fallbackPath: "result/research-selection.json",
  });
  const materialized = await materializeResearchProduct({
    selection: JSON.parse(artifact.text),
    runtime: context.runtime,
    productStorage: context.productStorage,
  });
  const warningCodeCounts = {};
  for (const warning of materialized.manifest.warnings) {
    const code = String(warning?.code || "apply_warning").trim() || "apply_warning";
    warningCodeCounts[code] = (warningCodeCounts[code] || 0) + 1;
  }
  return {
    ok: true,
    status: "recorded",
    product: {
      productId: materialized.product.productId,
      assetCount: materialized.product.assetCount,
    },
    applyDiagnostics: {
      warningCount: materialized.manifest.warnings.length,
      warningCodeCounts,
    },
  };
}
