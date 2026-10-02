import { getPref } from "../../../utils/prefs";
import { joinPath } from "../../../utils/path";
import semver from "semver";
import pkg from "../../../../package.json";
import { copyRuntimeDirectory, ensureRuntimeDirectory, getRuntimePersistencePaths, listRuntimeChildDirectories, readRuntimeTextFile, removeRuntimePath, runtimePathExists, statRuntimePath, writeRuntimeBytes, writeRuntimeTextFile, } from "../../runtimePersistence";
import { isDebugModeEnabled } from "../../debugMode";
const dynamicImport = new Function("specifier", "return import(specifier)");
const DEFAULT_PUBLISHED_CONTENT_REPO = "leike0813/zotero-agents-workflows";
const DEFAULT_CONTENT_BRANCH = "content-feed";
const DEFAULT_GITHUB_RAW = `https://raw.githubusercontent.com/${DEFAULT_PUBLISHED_CONTENT_REPO}/${DEFAULT_CONTENT_BRANCH}`;
const DEFAULT_GITEE_RAW = `https://gitee.com/${DEFAULT_PUBLISHED_CONTENT_REPO}/raw/${DEFAULT_CONTENT_BRANCH}`;
const STATE_FILE_NAME = "content-package-install-state.json";
const CONTENT_INSTALL_SCHEMA = "zotero-agents.content-install-state.v1";
const CONTENT_FEED_SCHEMA = "zotero-agents.content-feed.v1";
const CONTENT_PACKAGE_SCHEMA = "zotero-agents.content-package.v1";
export const CONTENT_API_VERSION = "3.0.0";
const CONTENT_PACKAGE_INSTALL_PROGRESS_STEPS = [
    { stage: "check-feed", label: "Checking feed" },
    { stage: "download-package", label: "Downloading package" },
    { stage: "verify-package", label: "Verifying package" },
    { stage: "extract-package", label: "Extracting package" },
    { stage: "stage-content", label: "Staging content" },
    { stage: "promote-content", label: "Installing content" },
    { stage: "write-state", label: "Saving install state" },
    { stage: "refresh-registry", label: "Refreshing workflows" },
    { stage: "complete", label: "Installation complete" },
];
let contentPackageInstallProgress = null;
const contentPackageInstallProgressListeners = new Set();
function cloneContentPackageInstallProgress(progress) {
    return progress ? { ...progress } : null;
}
function notifyContentPackageInstallProgress() {
    const snapshot = cloneContentPackageInstallProgress(contentPackageInstallProgress);
    for (const listener of Array.from(contentPackageInstallProgressListeners)) {
        try {
            listener(snapshot);
        }
        catch {
            // Progress notifications are best-effort UI hints.
        }
    }
}
export function buildContentPackageInstallProgress(stage, options) {
    const total = CONTENT_PACKAGE_INSTALL_PROGRESS_STEPS.length;
    const index = Math.max(0, CONTENT_PACKAGE_INSTALL_PROGRESS_STEPS.findIndex((entry) => entry.stage === stage));
    const current = Math.min(total, index + 1);
    return {
        active: options?.active !== false,
        stage,
        label: CONTENT_PACKAGE_INSTALL_PROGRESS_STEPS[index]?.label ||
            CONTENT_PACKAGE_INSTALL_PROGRESS_STEPS[0].label,
        current,
        total,
        percent: Math.floor((current / total) * 100),
    };
}
export function setContentPackageInstallProgress(stage, options) {
    contentPackageInstallProgress = buildContentPackageInstallProgress(stage, options);
    notifyContentPackageInstallProgress();
    return cloneContentPackageInstallProgress(contentPackageInstallProgress);
}
export function clearContentPackageInstallProgress() {
    if (!contentPackageInstallProgress) {
        return;
    }
    contentPackageInstallProgress = null;
    notifyContentPackageInstallProgress();
}
export function getContentPackageInstallProgressSnapshot() {
    return cloneContentPackageInstallProgress(contentPackageInstallProgress);
}
export function subscribeContentPackageInstallProgress(listener) {
    contentPackageInstallProgressListeners.add(listener);
    return () => {
        contentPackageInstallProgressListeners.delete(listener);
    };
}
export function resetContentPackageInstallProgressForTests() {
    contentPackageInstallProgress = null;
    contentPackageInstallProgressListeners.clear();
}
function normalizeString(value) {
    return String(value || "").trim();
}
function normalizeChannel(value) {
    const channel = normalizeString(value).toLowerCase();
    return channel === "beta" || channel === "dev" ? channel : "stable";
}
function normalizeVersion(value) {
    const raw = normalizeString(value).replace(/^v/i, "");
    return semver.valid(raw) || raw;
}
function normalizeRequires(value) {
    const requires = value;
    const plugin = normalizeString(requires?.plugin);
    const contentApi = normalizeString(requires?.content_api);
    const zotero = normalizeString(requires?.zotero);
    if (!plugin && !contentApi && !zotero) {
        return undefined;
    }
    return {
        ...(plugin ? { plugin } : {}),
        ...(contentApi ? { content_api: contentApi } : {}),
        ...(zotero ? { zotero } : {}),
    };
}
function feedPrefKey(channel, source) {
    const suffix = source === "primary" ? "FeedUrl" : "FeedMirrorUrl";
    if (channel === "beta") {
        return `contentBeta${suffix}`;
    }
    if (channel === "dev") {
        return `contentDev${suffix}`;
    }
    return `contentStable${suffix}`;
}
function defaultFeedUrl(channel, source) {
    const base = source === "primary" ? DEFAULT_GITHUB_RAW : DEFAULT_GITEE_RAW;
    return `${base}/${channel}/feed.json`;
}
export function getOfficialContentRoot() {
    return joinPath(getRuntimePersistencePaths().root, "content", "official");
}
export function getOfficialWorkflowDir() {
    return joinPath(getOfficialContentRoot(), "workflows");
}
export function getOfficialSkillDir() {
    return joinPath(getOfficialContentRoot(), "skills");
}
export function getContentPackageInstallStatePath() {
    return joinPath(getRuntimePersistencePaths().stateDir, STATE_FILE_NAME);
}
export function getConfiguredContentFeedChannel() {
    const channel = normalizeChannel(getPref("contentFeedChannel"));
    return channel === "dev" && !isDebugModeEnabled() ? "stable" : channel;
}
export function getConfiguredContentFeedUrls(channel) {
    const resolvedChannel = channel || getConfiguredContentFeedChannel();
    return ["primary", "mirror"]
        .map((kind) => ({
        kind,
        url: normalizeString(getPref(feedPrefKey(resolvedChannel, kind))) ||
            defaultFeedUrl(resolvedChannel, kind),
    }))
        .filter((entry) => entry.url);
}
function parseJsonObject(raw, label) {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error(`${label} must be a JSON object`);
    }
    return parsed;
}
function normalizeArtifact(value) {
    const artifact = value;
    const path = normalizePackageEntryName(artifact?.path, {
        allowContentPackageFile: false,
        allowContentRoots: false,
        allowRelativeArtifactPath: true,
    });
    const url = normalizeString(artifact?.url);
    const mirrors = Array.isArray(artifact?.mirrors)
        ? artifact.mirrors.map(normalizeString).filter(Boolean)
        : [];
    const sha256 = normalizeString(artifact?.sha256);
    const size = Math.max(0, Number(artifact?.size || 0) || 0);
    if (!path && !url) {
        throw new Error("feed package artifact.path or artifact.url is required");
    }
    if (!/^sha256:[a-f0-9]{64}$/i.test(sha256)) {
        throw new Error("feed package artifact.sha256 is invalid");
    }
    if (size <= 0) {
        throw new Error("feed package artifact.size is invalid");
    }
    return {
        ...(path ? { path } : { path: "" }),
        ...(url ? { url } : {}),
        ...(mirrors.length > 0 ? { mirrors } : {}),
        sha256: sha256.toLowerCase(),
        size,
    };
}
function normalizeFeedPackage(value, channel) {
    const entry = value;
    const id = normalizeString(entry?.id);
    const version = normalizeString(entry?.version);
    const packageChannel = normalizeChannel(entry?.channel);
    if (!id) {
        throw new Error("feed package id is missing");
    }
    if (!version) {
        throw new Error("feed package version is missing");
    }
    if (packageChannel !== channel) {
        throw new Error("feed package channel does not match feed channel");
    }
    return {
        id,
        version,
        channel: packageChannel,
        debug_content: entry?.debug_content === true,
        min_plugin_version: normalizeString(entry?.min_plugin_version) || undefined,
        content_api: normalizeString(entry?.content_api) || undefined,
        requires: normalizeRequires(entry?.requires),
        artifact: normalizeArtifact(entry?.artifact),
    };
}
function normalizeFeedDocument(raw) {
    const feed = raw;
    if (feed?.schema !== CONTENT_FEED_SCHEMA) {
        throw new Error("content feed schema is invalid");
    }
    const channel = normalizeChannel(feed.channel);
    const packages = Array.isArray(feed.packages)
        ? feed.packages.map((entry) => normalizeFeedPackage(entry, channel))
        : [];
    if (packages.length === 0) {
        throw new Error("content feed packages is empty");
    }
    return {
        schema: CONTENT_FEED_SCHEMA,
        feed_id: normalizeString(feed.feed_id),
        channel,
        debug_content: feed.debug_content === true,
        revision: normalizeString(feed.revision),
        updated_at: normalizeString(feed.updated_at),
        packages,
    };
}
function normalizePackageManifest(raw) {
    const manifest = raw;
    if (manifest?.schema !== CONTENT_PACKAGE_SCHEMA) {
        throw new Error("content package manifest schema is invalid");
    }
    const id = normalizeString(manifest.id);
    const version = normalizeString(manifest.version);
    const channel = normalizeChannel(manifest.channel);
    if (!id) {
        throw new Error("content package manifest id is missing");
    }
    if (!version) {
        throw new Error("content package manifest version is missing");
    }
    return {
        schema: CONTENT_PACKAGE_SCHEMA,
        id,
        version,
        channel,
        debug_content: manifest.debug_content === true,
        content_api: normalizeString(manifest.content_api) || undefined,
        requires: normalizeRequires(manifest.requires),
        generated_at: normalizeString(manifest.generated_at) || undefined,
        revision: normalizeString(manifest.revision) || undefined,
    };
}
export async function readContentPackageInstallState() {
    const raw = await readRuntimeTextFile(getContentPackageInstallStatePath());
    if (!raw.trim()) {
        return null;
    }
    try {
        const parsed = parseJsonObject(raw, "content install state");
        if (parsed.schema !== CONTENT_INSTALL_SCHEMA) {
            return null;
        }
        return parsed;
    }
    catch {
        return null;
    }
}
async function hasRecognizableWorkflowManifest(workflowRoot) {
    if (!(await statRuntimePath(workflowRoot)).isDir) {
        return false;
    }
    if ((await runtimePathExists(joinPath(workflowRoot, "workflow.json"))) ||
        (await runtimePathExists(joinPath(workflowRoot, "workflow-package.json")))) {
        return true;
    }
    const childDirs = await listRuntimeChildDirectories(workflowRoot);
    for (const childDir of childDirs) {
        if ((await runtimePathExists(joinPath(childDir, "workflow.json"))) ||
            (await runtimePathExists(joinPath(childDir, "workflow-package.json")))) {
            return true;
        }
    }
    return false;
}
async function resolveEffectiveContentPackageInstallState() {
    const state = await readContentPackageInstallState();
    if (!state) {
        return { installed: null };
    }
    const workflowRoot = getOfficialWorkflowDir();
    const workflowRootStat = await statRuntimePath(workflowRoot);
    if (!workflowRootStat.isDir) {
        return {
            installed: null,
            staleState: {
                state,
                reason: "official_workflow_root_missing",
                path: workflowRoot,
            },
        };
    }
    if (!(await hasRecognizableWorkflowManifest(workflowRoot))) {
        return {
            installed: null,
            staleState: {
                state,
                reason: "official_workflow_manifest_missing",
                path: workflowRoot,
            },
        };
    }
    return { installed: state };
}
export async function readEffectiveContentPackageInstallState() {
    return (await resolveEffectiveContentPackageInstallState()).installed;
}
async function writeContentPackageInstallState(state) {
    await writeRuntimeTextFile(getContentPackageInstallStatePath(), `${JSON.stringify(state, null, 2)}\n`);
}
export async function getContentPackageStatus(channel) {
    const resolvedChannel = channel || getConfiguredContentFeedChannel();
    const installState = await resolveEffectiveContentPackageInstallState();
    return {
        channel: resolvedChannel,
        debugMode: isDebugModeEnabled(),
        officialRoot: getOfficialContentRoot(),
        officialWorkflowDir: getOfficialWorkflowDir(),
        officialSkillDir: getOfficialSkillDir(),
        statePath: getContentPackageInstallStatePath(),
        installed: installState.installed,
        ...(installState.staleState ? { staleState: installState.staleState } : {}),
        feeds: getConfiguredContentFeedUrls(resolvedChannel),
    };
}
function compactError(error) {
    const message = normalizeString(error && typeof error === "object" && "message" in error
        ? error.message
        : error);
    return message || "unknown error";
}
async function fetchJson(url) {
    const fetchImpl = globalThis.fetch;
    if (typeof fetchImpl !== "function") {
        throw new Error("fetch is unavailable");
    }
    const response = await fetchImpl(url, { cache: "no-store" });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
}
async function fetchBytes(url) {
    const fetchImpl = globalThis.fetch;
    if (typeof fetchImpl !== "function") {
        throw new Error("fetch is unavailable");
    }
    const response = await fetchImpl(url, { cache: "no-store" });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    return new Uint8Array(await response.arrayBuffer());
}
function packageSignature(feed) {
    const entry = feed.packages[0];
    return JSON.stringify({
        channel: feed.channel,
        revision: feed.revision,
        id: entry.id,
        version: entry.version,
        debug_content: entry.debug_content,
        content_api: entry.content_api || "",
        requires: entry.requires || {},
        sha256: entry.artifact.sha256,
        size: entry.artifact.size,
    });
}
function getZoteroVersionForCompatibility() {
    const runtime = globalThis;
    return normalizeVersion(runtime.Zotero?.version || "7.0.0");
}
function formatIncompatibility(args) {
    return {
        code: args.code,
        requirement: args.requirement,
        actual: args.actual,
        message: `${args.label} ${args.actual} does not satisfy ${args.requirement}`,
    };
}
function isVersionSatisfied(actual, requirement) {
    if (!requirement) {
        return true;
    }
    const normalizedActual = normalizeVersion(actual);
    return semver.valid(normalizedActual)
        ? semver.satisfies(normalizedActual, requirement, {
            includePrerelease: true,
        })
        : false;
}
function resolvePackageRequires(entry) {
    return {
        ...(entry.requires || {}),
        ...(entry.min_plugin_version && !entry.requires?.plugin
            ? { plugin: `>=${entry.min_plugin_version}` }
            : {}),
        ...(entry.content_api && !entry.requires?.content_api
            ? { content_api: entry.content_api }
            : {}),
    };
}
function checkPackageCompatibility(entry) {
    const requires = resolvePackageRequires(entry);
    if (requires.plugin && !isVersionSatisfied(pkg.version, requires.plugin)) {
        return formatIncompatibility({
            code: "plugin_version_unsupported",
            requirement: requires.plugin,
            actual: pkg.version,
            label: "Plugin version",
        });
    }
    if (requires.content_api &&
        !isVersionSatisfied(CONTENT_API_VERSION, requires.content_api)) {
        return formatIncompatibility({
            code: "content_api_unsupported",
            requirement: requires.content_api,
            actual: CONTENT_API_VERSION,
            label: "Content API version",
        });
    }
    if (requires.zotero &&
        !isVersionSatisfied(getZoteroVersionForCompatibility(), requires.zotero)) {
        return formatIncompatibility({
            code: "zotero_version_unsupported",
            requirement: requires.zotero,
            actual: getZoteroVersionForCompatibility(),
            label: "Zotero version",
        });
    }
    return undefined;
}
async function resolveFeed(channel) {
    const sources = getConfiguredContentFeedUrls(channel);
    const successes = [];
    const failures = [];
    for (const source of sources) {
        try {
            successes.push({
                ...source,
                feed: normalizeFeedDocument(await fetchJson(source.url)),
            });
        }
        catch (error) {
            failures.push({
                ...source,
                error: compactError(error),
            });
        }
    }
    if (successes.length === 0) {
        throw Object.assign(new Error("all content feeds failed"), { failures });
    }
    const selected = successes.find((entry) => entry.kind === "primary") || successes[0];
    const selectedSignature = packageSignature(selected.feed);
    const matchingSuccesses = successes.filter((entry) => packageSignature(entry.feed) === selectedSignature);
    for (const mismatch of successes) {
        if (packageSignature(mismatch.feed) === selectedSignature) {
            continue;
        }
        failures.push({
            kind: mismatch.kind,
            url: mismatch.url,
            error: "content feed mirror mismatch",
        });
    }
    return {
        selected,
        successes: matchingSuccesses,
        failures,
    };
}
function latestPackage(feed) {
    const entry = feed.packages[0];
    if (!entry) {
        throw new Error("content feed has no packages");
    }
    return entry;
}
function isSameInstalledPackage(installed, entry, feed) {
    return (installed?.feed_revision === feed.revision &&
        installed.package.id === entry.id &&
        installed.package.version === entry.version &&
        installed.package.artifact.sha256 === entry.artifact.sha256);
}
function resolvePackageAction(installed, entry, feed) {
    if (!installed) {
        return "install";
    }
    if (isSameInstalledPackage(installed, entry, feed)) {
        return "none";
    }
    const installedVersion = normalizeVersion(installed.package.version);
    const candidateVersion = normalizeVersion(entry.version);
    if (semver.valid(installedVersion) && semver.valid(candidateVersion)) {
        const compared = semver.compare(candidateVersion, installedVersion);
        if (compared > 0) {
            return "update";
        }
        if (compared < 0) {
            return "rollback";
        }
    }
    return "replace";
}
export async function checkContentPackageUpdate(args) {
    const channel = args?.channel || getConfiguredContentFeedChannel();
    const status = await getContentPackageStatus(channel);
    try {
        const resolution = await resolveFeed(channel);
        const entry = latestPackage(resolution.selected.feed);
        const incompatibility = checkPackageCompatibility(entry);
        const action = resolvePackageAction(status.installed, entry, resolution.selected.feed);
        return {
            ok: true,
            status,
            selectedFeedUrl: resolution.selected.url,
            feed: resolution.selected.feed,
            package: entry,
            action,
            updateAvailable: action !== "none",
            compatible: !incompatibility,
            ...(incompatibility ? { incompatibility } : {}),
            failures: resolution.failures,
            artifactFeedUrls: resolution.successes.map((source) => source.url),
        };
    }
    catch (error) {
        return {
            ok: false,
            status,
            code: compactError(error) === "content feed mirror mismatch"
                ? "feed_mirror_mismatch"
                : "feed_unavailable",
            message: compactError(error),
            failures: error && typeof error === "object" && "failures" in error
                ? error.failures || []
                : [],
        };
    }
}
async function sha256(bytes) {
    const runtime = globalThis;
    if (typeof runtime.crypto?.subtle?.digest === "function") {
        const digest = await runtime.crypto.subtle.digest("SHA-256", bytes);
        return `sha256:${Array.from(new Uint8Array(digest))
            .map((byte) => byte.toString(16).padStart(2, "0"))
            .join("")}`;
    }
    if (runtime.process) {
        const crypto = await dynamicImport("crypto");
        return `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`;
    }
    throw new Error("sha256 runtime is unavailable");
}
function readUint16LE(bytes, offset) {
    return bytes[offset] | (bytes[offset + 1] << 8);
}
function readUint32LE(bytes, offset) {
    return ((bytes[offset] |
        (bytes[offset + 1] << 8) |
        (bytes[offset + 2] << 16) |
        (bytes[offset + 3] << 24)) >>>
        0);
}
function normalizePackageEntryName(value, options) {
    const raw = normalizeString(value).replace(/\\/g, "/");
    if (!raw || raw.startsWith("/") || /^[A-Za-z]:/.test(raw)) {
        return "";
    }
    const segments = raw
        .replace(/^\.\/+/, "")
        .split("/")
        .filter(Boolean);
    if (segments.length === 0 ||
        segments.some((segment) => segment === "." || segment === "..")) {
        return "";
    }
    const normalized = segments.join("/");
    if (options?.allowRelativeArtifactPath) {
        return normalized;
    }
    if (options?.allowContentPackageFile !== false &&
        normalized === "content-package.json") {
        return normalized;
    }
    if (options?.allowContentRoots !== false &&
        (normalized.startsWith("workflows/") || normalized.startsWith("skills/"))) {
        return normalized;
    }
    return "";
}
function readStoredZipEntries(bytes) {
    const entries = [];
    const Decoder = globalThis.TextDecoder ||
        TextDecoder;
    const decoder = new Decoder("utf-8");
    let offset = 0;
    while (offset + 4 <= bytes.length) {
        const signature = readUint32LE(bytes, offset);
        if (signature === 0x02014b50 || signature === 0x06054b50) {
            break;
        }
        if (signature !== 0x04034b50) {
            throw new Error("zip local header signature is invalid");
        }
        if (offset + 30 > bytes.length) {
            throw new Error("zip local header is truncated");
        }
        const flags = readUint16LE(bytes, offset + 6);
        const method = readUint16LE(bytes, offset + 8);
        const compressedSize = readUint32LE(bytes, offset + 18);
        const uncompressedSize = readUint32LE(bytes, offset + 22);
        const nameLength = readUint16LE(bytes, offset + 26);
        const extraLength = readUint16LE(bytes, offset + 28);
        if ((flags & 0x0008) !== 0) {
            throw new Error("zip data descriptors are not supported");
        }
        if (method !== 0) {
            throw new Error("compressed zip entries are not supported");
        }
        if (compressedSize !== uncompressedSize) {
            throw new Error("zip stored entry size mismatch");
        }
        const nameStart = offset + 30;
        const nameEnd = nameStart + nameLength;
        const dataStart = nameEnd + extraLength;
        const dataEnd = dataStart + compressedSize;
        if (nameEnd > bytes.length || dataEnd > bytes.length) {
            throw new Error("zip entry is truncated");
        }
        const name = normalizePackageEntryName(decoder.decode(bytes.slice(nameStart, nameEnd)));
        if (!name) {
            throw new Error("zip entry path is invalid");
        }
        entries.push({
            name,
            data: bytes.slice(dataStart, dataEnd),
        });
        offset = dataEnd;
    }
    return entries.sort((left, right) => left.name.localeCompare(right.name));
}
function resolveArtifactUrl(feedUrl, artifactPath) {
    return new URL(artifactPath, feedUrl).toString();
}
function resolveArtifactUrls(args) {
    const urls = [
        args.artifact.url,
        ...(args.artifact.mirrors || []),
        ...args.feedUrls.map((feedUrl) => args.artifact.path ? resolveArtifactUrl(feedUrl, args.artifact.path) : ""),
    ]
        .map(normalizeString)
        .filter(Boolean);
    return Array.from(new Set(urls));
}
async function writeEntriesToStagingRoot(args) {
    await removeRuntimePath(args.stagingRoot);
    await ensureRuntimeDirectory(args.stagingRoot);
    for (const entry of args.entries) {
        if (entry.name === "content-package.json") {
            continue;
        }
        await writeRuntimeBytes(joinPath(args.stagingRoot, ...entry.name.split("/")), entry.data);
    }
}
function findContentPackageManifest(entries) {
    const entry = entries.find((candidate) => candidate.name === "content-package.json");
    if (!entry) {
        throw new Error("content package manifest is missing");
    }
    const Decoder = globalThis.TextDecoder ||
        TextDecoder;
    return normalizePackageManifest(JSON.parse(new Decoder("utf-8").decode(entry.data)));
}
function validatePackageManifestAgainstFeed(args) {
    if (args.manifest.id !== args.entry.id) {
        throw new Error("content package id does not match feed");
    }
    if (args.manifest.version !== args.entry.version) {
        throw new Error("content package version does not match feed");
    }
    if (args.manifest.channel !== args.feed.channel) {
        throw new Error("content package channel does not match feed");
    }
    if (args.manifest.debug_content !== args.entry.debug_content) {
        throw new Error("content package debug flag does not match feed");
    }
    if (normalizeString(args.manifest.content_api) !==
        normalizeString(args.entry.content_api)) {
        throw new Error("content package content_api does not match feed");
    }
    if (JSON.stringify(args.manifest.requires || {}) !==
        JSON.stringify(args.entry.requires || {})) {
        throw new Error("content package requirements do not match feed");
    }
    if ((args.feed.channel === "dev" || args.entry.debug_content) &&
        !isDebugModeEnabled()) {
        throw new Error("dev content packages require debug mode");
    }
}
async function copyRuntimeTreeTransactional(args) {
    const backupRoot = `${args.targetRoot}.backup`;
    const hadTarget = await runtimePathExists(args.targetRoot);
    await removeRuntimePath(backupRoot);
    if (hadTarget) {
        await copyRuntimeDirectoryCompat({
            sourceDir: args.targetRoot,
            targetDir: backupRoot,
        });
    }
    try {
        await copyRuntimeDirectoryCompat({
            sourceDir: args.sourceRoot,
            targetDir: args.targetRoot,
        });
        await removeRuntimePath(backupRoot);
    }
    catch (error) {
        await removeRuntimePath(args.targetRoot);
        if (hadTarget && (await runtimePathExists(backupRoot))) {
            await copyRuntimeDirectoryCompat({
                sourceDir: backupRoot,
                targetDir: args.targetRoot,
            });
        }
        throw error;
    }
}
async function copyRuntimeDirectoryCompat(args) {
    await copyRuntimeDirectory(args);
}
async function fetchPackageBytesWithFallback(args) {
    let lastError = null;
    for (const artifactUrl of resolveArtifactUrls(args)) {
        try {
            const bytes = await fetchBytes(artifactUrl);
            const digest = await sha256(bytes);
            if (digest !== args.artifact.sha256) {
                throw new Error("content package sha256 mismatch");
            }
            if (bytes.byteLength !== args.artifact.size) {
                throw new Error("content package size mismatch");
            }
            return { bytes, sourceUrl: artifactUrl };
        }
        catch (error) {
            lastError = error;
        }
    }
    throw lastError || new Error("content package artifact is unavailable");
}
export async function installContentPackageFromFeed(args) {
    const channel = args?.channel || getConfiguredContentFeedChannel();
    const emitProgress = (stage) => {
        const progress = buildContentPackageInstallProgress(stage);
        try {
            args?.onProgress?.(progress);
        }
        catch {
            // Progress callbacks must not affect install correctness.
        }
        return progress;
    };
    const previousStatus = await getContentPackageStatus(channel);
    emitProgress("check-feed");
    const check = await checkContentPackageUpdate({ channel });
    if (!check.ok) {
        return {
            ok: false,
            status: previousStatus,
            code: check.code,
            message: check.message,
            failures: check.failures,
        };
    }
    if (!check.compatible) {
        return {
            ok: false,
            status: previousStatus,
            code: check.incompatibility?.code || "content_package_incompatible",
            message: check.incompatibility?.message ||
                "content package is not compatible with this runtime",
        };
    }
    if ((check.feed.channel === "dev" || check.package.debug_content) &&
        !isDebugModeEnabled()) {
        return {
            ok: false,
            status: previousStatus,
            code: "debug_mode_required",
            message: "dev content packages require debug mode",
        };
    }
    try {
        const feedUrls = [
            check.selectedFeedUrl,
            ...check.artifactFeedUrls.filter((url) => url !== check.selectedFeedUrl),
        ];
        emitProgress("download-package");
        const artifact = await fetchPackageBytesWithFallback({
            feedUrls,
            artifact: check.package.artifact,
        });
        const bytes = artifact.bytes;
        emitProgress("verify-package");
        const entries = readStoredZipEntries(bytes);
        const manifest = findContentPackageManifest(entries);
        validatePackageManifestAgainstFeed({
            manifest,
            feed: check.feed,
            entry: check.package,
        });
        emitProgress("extract-package");
        const stagingRoot = joinPath(getRuntimePersistencePaths().tmpDir, `content-package-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
        emitProgress("stage-content");
        await writeEntriesToStagingRoot({ stagingRoot, entries });
        try {
            emitProgress("promote-content");
            await copyRuntimeTreeTransactional({
                sourceRoot: stagingRoot,
                targetRoot: getOfficialContentRoot(),
            });
        }
        finally {
            await removeRuntimePath(stagingRoot);
        }
        const state = {
            schema: CONTENT_INSTALL_SCHEMA,
            installed_at: new Date().toISOString(),
            source_url: artifact.sourceUrl,
            feed_revision: check.feed.revision,
            package: check.package,
            package_manifest: manifest,
            official_root: getOfficialContentRoot(),
            workflows_root: getOfficialWorkflowDir(),
            skills_root: getOfficialSkillDir(),
        };
        emitProgress("write-state");
        await writeContentPackageInstallState(state);
        return {
            ok: true,
            status: await getContentPackageStatus(channel),
            installed: state,
            previous: previousStatus.installed,
        };
    }
    catch (error) {
        return {
            ok: false,
            status: await getContentPackageStatus(channel),
            code: "install_failed",
            message: compactError(error),
        };
    }
}
export const __contentPackageSubscriptionTestOnly = {
    normalizeFeedDocument,
    normalizePackageManifest,
    readStoredZipEntries,
    sha256,
    defaultFeedUrl,
    buildContentPackageInstallProgress,
};
