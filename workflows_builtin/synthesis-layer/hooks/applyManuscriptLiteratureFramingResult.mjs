export async function applyResult(context = {}) {
  const resultJson = context.resultContext?.resultJson || context.result || {};
  const assets = resultJson.assets || {};
  const productStorage = context.productStorage;
  let productReceipt = null;
  if (productStorage && typeof productStorage.registerProduct === "function") {
    productReceipt = await productStorage.registerProduct({
      productKey: "manuscript-literature-framing",
      kind: resultJson.kind || "writing.manuscript_literature_framing",
      title: resultJson.title || "Manuscript Literature Framing",
      metadata: {
        language: resultJson.language || "",
        topic_ids: Array.isArray(resultJson.topic_ids) ? resultJson.topic_ids : [],
        diagnostics_summary: resultJson.diagnostics_summary || {},
        product_metadata: resultJson.product_metadata || {},
      },
      assets: [
        {
          assetId: "introduction_tex",
          label: "Introduction",
          rawPath: assets.introduction_tex,
          fallbackPath: "result/introduction.tex",
          productAssetPath: "draft/introduction.tex",
          contentType: "text/x-latex",
        },
        {
          assetId: "related_work_tex",
          label: "Related Work",
          rawPath: assets.related_work_tex,
          fallbackPath: "result/related-work.tex",
          productAssetPath: "draft/related-work.tex",
          contentType: "text/x-latex",
        },
        {
          assetId: "intent_brief",
          label: "Intent Brief",
          rawPath: assets.intent_brief,
          fallbackPath: "result/intent-brief.json",
          productAssetPath: "metadata/intent-brief.json",
          contentType: "application/json",
        },
        {
          assetId: "evidence_inventory",
          label: "Evidence Inventory",
          rawPath: assets.evidence_inventory,
          fallbackPath: "result/evidence-inventory.json",
          productAssetPath: "metadata/evidence-inventory.json",
          contentType: "application/json",
        },
        {
          assetId: "framing_analysis",
          label: "Framing Analysis",
          rawPath: assets.framing_analysis,
          fallbackPath: "result/framing-analysis.json",
          productAssetPath: "metadata/framing-analysis.json",
          contentType: "application/json",
        },
        {
          assetId: "writing_plan",
          label: "Writing Plan",
          rawPath: assets.writing_plan,
          fallbackPath: "result/writing-plan.json",
          productAssetPath: "metadata/writing-plan.json",
          contentType: "application/json",
        },
        {
          assetId: "citation_map",
          label: "Citation Map",
          rawPath: assets.citation_map,
          fallbackPath: "result/citation-map.json",
          productAssetPath: "metadata/citation-map.json",
          contentType: "application/json",
        },
        {
          assetId: "diagnostics",
          label: "Diagnostics",
          rawPath: assets.diagnostics,
          fallbackPath: "result/diagnostics.json",
          productAssetPath: "metadata/diagnostics.json",
          contentType: "application/json",
        },
      ],
    });
  }
  return {
    ok: true,
    status: "recorded",
    kind: resultJson.kind || "writing.manuscript_literature_framing",
    message:
      "Manuscript literature framing artifacts are stored in the ACP skill run result bundle.",
    assets,
    product: productReceipt
      ? {
          productId: productReceipt.productId,
          storageMode: productReceipt.storageMode,
          assetCount: Array.isArray(productReceipt.assets)
            ? productReceipt.assets.length
            : 0,
        }
      : null,
  };
}

export default applyResult;
