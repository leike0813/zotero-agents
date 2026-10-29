const DEFAULT_MATERIALIZATION_LIMITS = {
  maxAssets: 256,
  maxAssetBytes: 5 * 1024 * 1024,
  maxTotalBytes: 50 * 1024 * 1024,
};

// Bundle locators converted into controlled assets before the closed v12 apply.
// markdown_path stays out: the sidecar rejects a non-empty markdown locator.
const TOPIC_PATH_FIELDS = [
  "artifact_manifest_path",
  "resolver_manifest_path",
  "analysis_manifest_path",
  "topic_interest_metadata_path",
  "concept_cards_proposal_path",
  "topic_graph_relation_proposals_path",
];

// Locators carrying the topic analysis manifest, whose nested section and
// sidecar locators must be rewritten too.
const ANALYSIS_MANIFEST_FIELDS = [
  "analysis_manifest_path",
  "topic_analysis",
  "analysis_manifest",
];

function cleanString(value) {
  return String(value ?? "").trim();
}

function isJsonObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function hasUnpairedSurrogate(value) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0xd800 || code > 0xdfff) continue;
    const next = value.charCodeAt(index + 1);
    if (code <= 0xdbff && next >= 0xdc00 && next <= 0xdfff) {
      index += 1;
      continue;
    }
    return true;
  }
  return false;
}

function invalidMaterialization(message, details) {
  const error = new Error(message);
  error.code = "invalid_request";
  error.details = details;
  return error;
}

function toJsonValue(value, location = "$", seen = new Set()) {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (hasUnpairedSurrogate(value)) {
      throw invalidMaterialization("Topic result string is not JSON-safe", {
        location,
      });
    }
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (!value || typeof value !== "object") {
    throw invalidMaterialization("Topic result value is not JSON-safe", {
      location,
    });
  }
  if (seen.has(value)) {
    throw invalidMaterialization("Topic result value is cyclic", { location });
  }
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((entry, index) =>
        toJsonValue(entry, `${location}[${index}]`, seen),
      );
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw invalidMaterialization("Topic result object is not JSON-safe", {
        location,
      });
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => {
        if (hasUnpairedSurrogate(key)) {
          throw invalidMaterialization("Topic result key is not JSON-safe", {
            location,
          });
        }
        return [key, toJsonValue(entry, `${location}.${key}`, seen)];
      }),
    );
  } finally {
    seen.delete(value);
  }
}

function toJsonObject(value, location) {
  const normalized = toJsonValue(value, location);
  if (!isJsonObject(normalized)) {
    throw invalidMaterialization("Topic result bundle must be a JSON object", {
      location,
    });
  }
  return normalized;
}

async function readTopicAsset(rawPath, fieldName, context, limits) {
  let text;
  try {
    if (typeof context?.resultContext?.resolveArtifact === "function") {
      const resolved = await context.resultContext.resolveArtifact({
        fieldName,
        rawPath,
        fallbackPath: rawPath,
      });
      text = String(resolved.text);
    } else if (typeof context?.bundleReader?.readText === "function") {
      text = String(await context.bundleReader.readText(rawPath));
    } else {
      throw new Error("asset reader unavailable");
    }
  } catch {
    throw invalidMaterialization("Topic result asset could not be read", {
      fieldName,
    });
  }
  if (new TextEncoder().encode(text).byteLength > limits.maxAssetBytes) {
    throw invalidMaterialization("Topic result asset exceeds its size limit", {
      fieldName,
      limit: limits.maxAssetBytes,
    });
  }
  return text;
}

export async function resolveTopicApplyBundle(bundle, context = {}) {
  const manifestPath = bundle.artifact_manifest_path;
  if (manifestPath === undefined) return bundle;
  const readObject = async (rawPath, fieldName) => {
    if (typeof rawPath !== "string" || !cleanString(rawPath)) {
      throw invalidMaterialization("Topic result asset path is invalid", {
        fieldName,
      });
    }
    const text = await readTopicAsset(
      cleanString(rawPath),
      fieldName,
      context,
      DEFAULT_MATERIALIZATION_LIMITS,
    );
    let value;
    try {
      value = JSON.parse(text);
    } catch {
      throw invalidMaterialization("Topic result asset is not valid JSON", {
        fieldName,
      });
    }
    return toJsonObject(value, `$.${fieldName}`);
  };
  const manifest = await readObject(manifestPath, "artifact_manifest_path");
  if (
    !Object.prototype.hasOwnProperty.call(manifest, "final_output_candidate")
  ) {
    return bundle;
  }
  const candidate = await readObject(
    manifest.final_output_candidate,
    "final_output_candidate",
  );
  if (
    candidate.kind !== "topic_synthesis" ||
    !["create", "update_full"].includes(candidate.operation) ||
    typeof candidate.artifact_manifest_path !== "string" ||
    !cleanString(candidate.artifact_manifest_path)
  ) {
    throw invalidMaterialization("Topic runtime candidate is invalid", {
      fieldName: "final_output_candidate",
    });
  }
  return candidate;
}

// Controlled asset ids carry no extension, so the payload decides the media
// type: the sidecar parses exactly the assets declared as JSON.
function classifyMediaType(rawPath, text) {
  try {
    JSON.parse(text);
    return "application/json";
  } catch {
    const lower = rawPath.toLowerCase();
    if (lower.endsWith(".md") || lower.endsWith(".markdown")) {
      return "text/markdown";
    }
    return "text/plain";
  }
}

export async function materializeTopicApplyRequest(
  rawBundle,
  context = {},
  inputLimits = {},
) {
  const limits = { ...DEFAULT_MATERIALIZATION_LIMITS, ...inputLimits };
  const compactBundle = isJsonObject(rawBundle)
    ? Object.fromEntries(
        Object.entries(rawBundle).filter(([, value]) => value !== undefined),
      )
    : rawBundle;
  const bundle = toJsonObject(compactBundle, "$.bundle");
  const assets = [];
  const assetIdsByPath = new Map();
  let totalBytes = 0;

  const addAsset = async (rawPath, fieldName, isManifest = false) => {
    const existing = assetIdsByPath.get(rawPath);
    if (existing) return existing;
    if (assets.length >= limits.maxAssets) {
      throw invalidMaterialization("Topic result contains too many assets", {
        limit: limits.maxAssets,
      });
    }
    const id = `asset/${String(assets.length + 1).padStart(4, "0")}`;
    assetIdsByPath.set(rawPath, id);
    const asset = { id, mediaType: "text/plain", text: "" };
    assets.push(asset);
    let text = await readTopicAsset(rawPath, fieldName, context, limits);
    asset.mediaType = classifyMediaType(rawPath, text);
    if (isManifest) {
      let manifest;
      try {
        manifest = JSON.parse(text);
      } catch {
        throw invalidMaterialization(
          "Topic artifact manifest is not valid JSON",
          {
            fieldName,
          },
        );
      }
      const manifestObject = toJsonObject(manifest, "$.artifactManifest");
      const rewrittenEntries = [];
      for (const key of Object.keys(manifestObject).sort()) {
        // The authoritative candidate was consumed before content materialization.
        if (key === "final_output_candidate") continue;
        const nestedPath = manifestObject[key];
        if (typeof nestedPath !== "string" || !cleanString(nestedPath)) {
          throw invalidMaterialization(
            "Topic artifact manifest values must be paths",
            { fieldName: key },
          );
        }
        rewrittenEntries.push([
          key,
          await addAsset(cleanString(nestedPath), key),
        ]);
      }
      text = JSON.stringify(Object.fromEntries(rewrittenEntries));
    } else if (ANALYSIS_MANIFEST_FIELDS.includes(fieldName)) {
      let analysisManifest;
      try {
        analysisManifest = toJsonObject(JSON.parse(text), "$.analysisManifest");
      } catch {
        throw invalidMaterialization(
          "Topic analysis manifest is not valid JSON",
          { fieldName },
        );
      }
      const rewriteEntryPaths = async (entries, location) => {
        if (!entries || Array.isArray(entries) || typeof entries !== "object") {
          return;
        }
        for (const key of Object.keys(entries).sort()) {
          const entry = entries[key];
          if (!isJsonObject(entry)) continue;
          const nestedPath = entry.path;
          if (typeof nestedPath === "string" && cleanString(nestedPath)) {
            entry.path = await addAsset(
              cleanString(nestedPath),
              `${location}.${key}.path`,
            );
          }
        }
      };
      await rewriteEntryPaths(analysisManifest.sections, "sections");
      const patch = analysisManifest.patch;
      if (isJsonObject(patch)) {
        await rewriteEntryPaths(patch.sections, "patch.sections");
      }
      await rewriteEntryPaths(analysisManifest.sidecars, "sidecars");
      text = JSON.stringify(analysisManifest);
    }
    const bytes = new TextEncoder().encode(text).byteLength;
    if (bytes > limits.maxAssetBytes) {
      throw invalidMaterialization(
        "Topic result asset exceeds its size limit",
        {
          fieldName,
          limit: limits.maxAssetBytes,
        },
      );
    }
    totalBytes += bytes;
    if (totalBytes > limits.maxTotalBytes) {
      throw invalidMaterialization(
        "Topic result assets exceed the total size limit",
        { limit: limits.maxTotalBytes },
      );
    }
    asset.text = text;
    return id;
  };

  for (const fieldName of TOPIC_PATH_FIELDS) {
    const rawPath = bundle[fieldName];
    if (rawPath === undefined) continue;
    if (typeof rawPath !== "string" || !cleanString(rawPath)) {
      throw invalidMaterialization("Topic result asset path is invalid", {
        fieldName,
      });
    }
    bundle[fieldName] = await addAsset(
      cleanString(rawPath),
      fieldName,
      fieldName === "artifact_manifest_path",
    );
  }

  const rewriteKnownLocators = (value) => {
    if (typeof value === "string") {
      return assetIdsByPath.get(value) || value;
    }
    if (Array.isArray(value)) {
      return value.map(rewriteKnownLocators);
    }
    if (isJsonObject(value)) {
      return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [
          key,
          rewriteKnownLocators(entry),
        ]),
      );
    }
    return value;
  };

  return { bundle: rewriteKnownLocators(bundle), assets };
}
