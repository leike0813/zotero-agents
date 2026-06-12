import {
  DEFAULT_GITHUB_FILE_PATH,
  DEFAULT_GITHUB_REPO,
  GITHUB_API_VERSION,
  FACETS,
  nowIsoTimestamp,
  normalizeRemoteAbbrevs,
  normalizeRemoteVocabularyPayload,
  sanitizeRemoteTags,
} from "./model.mjs";
import {
  decodeRuntimeBase64Utf8,
  encodeRuntimeBase64Utf8,
  resolveRuntimeFetch,
} from "./runtime.mjs";

export function buildGitHubRawUrl(config) {
  const repo = String(config?.githubRepo || "").trim() || DEFAULT_GITHUB_REPO;
  const filePath = String(config?.filePath || "").trim() || DEFAULT_GITHUB_FILE_PATH;
  return `https://raw.githubusercontent.com/${config.githubOwner}/${repo}/main/${filePath}`;
}

export function buildGitHubContentsApiUrl(config) {
  const repo = String(config?.githubRepo || "").trim() || DEFAULT_GITHUB_REPO;
  const filePath = encodeURIComponent(
    String(config?.filePath || "").trim() || DEFAULT_GITHUB_FILE_PATH,
  ).replace(/%2F/gi, "/");
  return `https://api.github.com/repos/${config.githubOwner}/${repo}/contents/${filePath}`;
}

export function buildGitHubHeaders(config, extraHeaders) {
  const headers = {
    Authorization: `Bearer ${String(config?.githubToken || "").trim()}`,
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
    ...extraHeaders,
  };
  return headers;
}

export function encodeBase64Utf8(text, runtime) {
  return encodeRuntimeBase64Utf8(text, runtime);
}

export function decodeBase64Utf8(text, runtime) {
  return decodeRuntimeBase64Utf8(text, runtime);
}

export async function fetchJsonOrThrow(url, options, runtime) {
  const response = await resolveRuntimeFetch(runtime)(url, options);
  if (!response || typeof response.json !== "function") {
    throw new Error(`request to ${url} did not return JSON response object`);
  }
  const payload = await response.json();
  if (!response.ok) {
    const errorMessage =
      String(payload?.message || payload?.error || response.statusText || "").trim() ||
      `HTTP ${response.status}`;
    const error = new Error(errorMessage);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

export async function fetchPublishBaseline(config, runtime) {
  const contentsUrl = buildGitHubContentsApiUrl(config);
  const payload = await fetchJsonOrThrow(contentsUrl, {
    method: "GET",
    headers: buildGitHubHeaders(config, {
      Accept: "application/vnd.github+json",
    }),
  }, runtime);
  const sha = String(payload?.sha || "").trim();
  const encodedContent = String(payload?.content || "").trim();
  if (!sha || !encodedContent) {
    throw new Error("GitHub contents payload missing sha/content");
  }
  let remoteJson = null;
  try {
    remoteJson = JSON.parse(decodeBase64Utf8(encodedContent, runtime));
  } catch {
    throw new Error("GitHub contents payload is not valid vocabulary JSON");
  }
  return {
    sha,
    contentsUrl,
    remotePayload: normalizeRemoteVocabularyPayload(remoteJson),
  };
}

export function buildPublishedVocabularyPayload(args) {
  const remotePayload = normalizeRemoteVocabularyPayload(args?.remotePayload || {});
  const localTags = sanitizeRemoteTags(args?.localTags);
  const tagFacetSet = new Set(localTags.map((entry) => String(entry.facet || "").trim()));
  const facets = [];
  for (const facet of FACETS) {
    if (remotePayload.facets.includes(facet) || tagFacetSet.has(facet)) {
      facets.push(facet);
    }
  }
  for (const facet of remotePayload.facets) {
    if (!facets.includes(facet)) {
      facets.push(facet);
    }
  }
  for (const facet of tagFacetSet) {
    if (!facets.includes(facet)) {
      facets.push(facet);
    }
  }
  return {
    version: String(remotePayload.version || "1.0.0").trim() || "1.0.0",
    updated_at: nowIsoTimestamp(),
    facets,
    tags: localTags,
    abbrevs: normalizeRemoteAbbrevs(remotePayload.abbrevs),
    tag_count: localTags.length,
  };
}

export async function putPublishedVocabulary(args) {
  const config = args?.config || {};
  const contentsUrl = String(args?.contentsUrl || "").trim();
  const sha = String(args?.sha || "").trim();
  const payload = args?.payload;
  const runtime = args?.runtime || null;
  if (!contentsUrl || !sha || !payload) {
    throw new Error("publish request is missing contentsUrl, sha, or payload");
  }
  return resolveRuntimeFetch(runtime)(contentsUrl, {
    method: "PUT",
    headers: buildGitHubHeaders(config, {
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      message: `Update ${config.filePath} via Zotero Skills Tag Manager`,
      content: encodeBase64Utf8(JSON.stringify(payload, null, 2), runtime),
      sha,
    }),
  });
}

export async function publishRemoteVocabulary(args) {
  const config = args?.config || {};
  const localTags = sanitizeRemoteTags(args?.entries);
  const log = typeof args?.log === "function" ? args.log : null;
  const runtime = args?.runtime || null;

  log?.({
    level: "info",
    stage: "publish-start",
    details: {
      owner: config.githubOwner,
      repo: config.githubRepo,
      file_path: config.filePath,
      tag_count: localTags.length,
    },
  });
  try {
    let baseline = await fetchPublishBaseline(config, runtime);
    let payload = buildPublishedVocabularyPayload({
      remotePayload: baseline.remotePayload,
      localTags,
    });
    let response = await putPublishedVocabulary({
      config,
      contentsUrl: baseline.contentsUrl,
      sha: baseline.sha,
      payload,
      runtime,
    });
    if (response && response.status === 409) {
      log?.({
        level: "warn",
        stage: "publish-conflict",
        details: {
          owner: config.githubOwner,
          repo: config.githubRepo,
          file_path: config.filePath,
        },
      });
      baseline = await fetchPublishBaseline(config, runtime);
      payload = buildPublishedVocabularyPayload({
        remotePayload: baseline.remotePayload,
        localTags,
      });
      response = await putPublishedVocabulary({
        config,
        contentsUrl: baseline.contentsUrl,
        sha: baseline.sha,
        payload,
        runtime,
      });
    }
    if (!response || !response.ok) {
      const payloadJson =
        response && typeof response.json === "function" ? await response.json() : null;
      const reason =
        String(
          payloadJson?.message || payloadJson?.error || response?.statusText || "",
        ).trim() || `HTTP ${response?.status || "unknown"}`;
      throw new Error(reason);
    }
    log?.({
      level: "info",
      stage: "publish-succeeded",
      details: {
        owner: config.githubOwner,
        repo: config.githubRepo,
        file_path: config.filePath,
        tag_count: localTags.length,
      },
    });
    return payload;
  } catch (error) {
    log?.({
      level: "warn",
      stage: "publish-failed",
      details: {
        owner: config.githubOwner,
        repo: config.githubRepo,
        file_path: config.filePath,
      },
      error,
    });
    throw error;
  }
}

export async function subscribeRemoteVocabulary(args) {
  const config = args?.config || {};
  const sourceUrl = buildGitHubRawUrl(config);
  const log = typeof args?.log === "function" ? args.log : null;
  const runtime = args?.runtime || null;
  log?.({
    level: "info",
    stage: "subscribe-start",
    details: {
      owner: config.githubOwner,
      repo: config.githubRepo,
      file_path: config.filePath,
    },
  });
  try {
    const payload = await fetchJsonOrThrow(sourceUrl, {
      method: "GET",
      headers: buildGitHubHeaders(config),
    }, runtime);
    const normalized = normalizeRemoteVocabularyPayload(payload);
    log?.({
      level: "info",
      stage: "subscribe-succeeded",
      details: {
        owner: config.githubOwner,
        repo: config.githubRepo,
        file_path: config.filePath,
        tag_count: normalized.tag_count,
      },
    });
    return normalized;
  } catch (error) {
    log?.({
      level: "warn",
      stage: "subscribe-failed",
      details: {
        owner: config.githubOwner,
        repo: config.githubRepo,
        file_path: config.filePath,
      },
      error,
    });
    throw error;
  }
}
