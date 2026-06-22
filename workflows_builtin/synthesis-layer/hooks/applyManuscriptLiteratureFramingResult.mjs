const PRODUCT_ASSETS = [
  {
    assetId: "introduction_tex",
    label: "Introduction",
    fallbackPath: "result/introduction.tex",
    productAssetPath: "draft/introduction.tex",
    contentType: "text/x-latex",
  },
  {
    assetId: "related_work_tex",
    label: "Related Work",
    fallbackPath: "result/related-work.tex",
    productAssetPath: "draft/related-work.tex",
    contentType: "text/x-latex",
  },
  {
    assetId: "intent_brief",
    label: "Intent Brief",
    fallbackPath: "result/intent-brief.json",
    productAssetPath: "metadata/intent-brief.json",
    contentType: "application/json",
  },
  {
    assetId: "evidence_inventory",
    label: "Evidence Inventory",
    fallbackPath: "result/evidence-inventory.json",
    productAssetPath: "metadata/evidence-inventory.json",
    contentType: "application/json",
  },
  {
    assetId: "framing_analysis",
    label: "Framing Analysis",
    fallbackPath: "result/framing-analysis.json",
    productAssetPath: "metadata/framing-analysis.json",
    contentType: "application/json",
  },
  {
    assetId: "writing_plan",
    label: "Writing Plan",
    fallbackPath: "result/writing-plan.json",
    productAssetPath: "metadata/writing-plan.json",
    contentType: "application/json",
  },
  {
    assetId: "citation_map",
    label: "Citation Map",
    fallbackPath: "result/citation-map.json",
    productAssetPath: "metadata/citation-map.json",
    contentType: "application/json",
  },
  {
    assetId: "diagnostics",
    label: "Diagnostics",
    fallbackPath: "result/diagnostics.json",
    productAssetPath: "metadata/diagnostics.json",
    contentType: "application/json",
  },
];

function normalizeString(value) {
  return String(value || "").trim();
}

function isRecord(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

async function readArtifactText(context, { fieldName, rawPath, fallbackPath }) {
  if (context?.resultContext?.readArtifactText) {
    return context.resultContext.readArtifactText({
      fieldName,
      rawPath,
      fallbackPath,
    });
  }
  const entryPath = normalizeString(rawPath) || normalizeString(fallbackPath);
  if (!entryPath || !context?.bundleReader?.readText) {
    throw new Error(`${fieldName || "artifact"} is unavailable`);
  }
  return {
    text: await context.bundleReader.readText(entryPath),
    entryPath,
    candidates: [entryPath],
  };
}

async function readArtifactManifest(context, resultJson) {
  const manifestPath = normalizeString(resultJson.artifact_manifest_path);
  if (!manifestPath) {
    return {};
  }
  const artifact = await readArtifactText(context, {
    fieldName: "artifact_manifest_path",
    rawPath: manifestPath,
  });
  let manifest;
  try {
    manifest = JSON.parse(artifact.text);
  } catch (error) {
    throw new Error(
      `manuscript literature framing artifact manifest is not valid JSON: ${error.message}`,
    );
  }
  if (!isRecord(manifest)) {
    throw new Error("manuscript literature framing artifact manifest must be a JSON object");
  }
  for (const [key, value] of Object.entries(manifest)) {
    if (!normalizeString(value)) {
      throw new Error(`manifest asset path is required: ${key}`);
    }
  }
  return manifest;
}

function buildProductAssets(manifest, legacyAssets) {
  return PRODUCT_ASSETS.map((asset) => ({
    ...asset,
    rawPath:
      normalizeString(manifest[asset.assetId]) ||
      normalizeString(legacyAssets[asset.assetId]),
  }));
}

export async function applyResult(context = {}) {
  const resultJson = context.resultContext?.resultJson || context.result || {};
  const legacyAssets = isRecord(resultJson.assets) ? resultJson.assets : {};
  const productStorage = context.productStorage;
  const runStatus = String(context.runResult?.status || "").trim();
  const shouldRegisterProduct =
    runStatus === "succeeded" &&
    resultJson.kind === "writing.manuscript_literature_framing";
  let productReceipt = null;
  let artifactManifest = {};
  if (shouldRegisterProduct) {
    artifactManifest = await readArtifactManifest(context, resultJson);
  }
  if (
    shouldRegisterProduct &&
    productStorage &&
    typeof productStorage.registerProduct === "function"
  ) {
    productReceipt = await productStorage.registerProduct({
      productKey: "manuscript-literature-framing",
      kind: resultJson.kind || "writing.manuscript_literature_framing",
      title: resultJson.title || "Manuscript Literature Framing",
      metadata: {
        language: resultJson.language || "",
        topic_ids: Array.isArray(resultJson.topic_ids)
          ? resultJson.topic_ids
          : [],
      },
      assets: buildProductAssets(artifactManifest, legacyAssets),
    });
  }
  return {
    ok: true,
    status: productReceipt ? "recorded" : "skipped",
    kind: resultJson.kind || "writing.manuscript_literature_framing",
    message:
      "Manuscript literature framing artifacts are stored in the ACP skill run result bundle.",
    artifact_manifest_path: normalizeString(resultJson.artifact_manifest_path),
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
