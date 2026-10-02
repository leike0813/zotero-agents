import { SynthesisClientError, toSynthesisJsonObject, } from "./common.js";
export const SYNTHESIS_TOPIC_APPLICATION_LIMITS = {
    assets: 256,
    assetBytes: 5 * 1024 * 1024,
    totalAssetBytes: 50 * 1024 * 1024,
    listDefault: 50,
    listMax: 250,
};
const TOPIC_APPLICATION_BUNDLE_FIELDS = new Set([
    "kind",
    "operation",
    "mode",
    "language",
    "base_hashes",
    "create_base_hashes_ignored",
    "topic_id",
    "read_section_hashes",
    "topic_definition",
    "topic_resolver",
    "resolved_paper_set",
    "resolver_manifest_path",
    "artifact_manifest_path",
    "resolver_diagnostics",
    "artifact_metadata",
    "analysis_manifest_path",
    "topic_interest_metadata_path",
    "concept_cards_proposal_path",
    "topic_graph_relation_proposals_path",
    "markdown",
    "markdown_path",
    "timeline",
]);
function invalid(location) {
    throw new SynthesisClientError("invalid_request", `Invalid Topic application value at ${location}`, { location });
}
function exactFields(value, expected, location) {
    const actual = Object.keys(value).sort();
    const fields = [...expected].sort();
    if (actual.length !== fields.length ||
        actual.some((field, index) => field !== fields[index])) {
        invalid(`${location}.fields`);
    }
}
function cleanTopicId(value, location) {
    if (typeof value !== "string" ||
        value !== value.trim() ||
        value.length === 0 ||
        value.length > 512 ||
        /[\\/]/.test(value) ||
        [...value].some((character) => {
            const code = character.charCodeAt(0);
            return code <= 0x1f || code === 0x7f;
        }) ||
        value === "." ||
        value === "..") {
        invalid(location);
    }
    return value;
}
function assetId(value, location) {
    if (typeof value !== "string" ||
        value !== value.trim() ||
        value.length === 0 ||
        value.length > 256 ||
        value.startsWith("/") ||
        /^[A-Za-z]:/.test(value) ||
        /^[A-Za-z][A-Za-z0-9+.-]*:/.test(value) ||
        value.split(/[\\/]/).some((segment) => !segment || segment === "..")) {
        invalid(location);
    }
    return value.replace(/\\/g, "/");
}
function utf8Bytes(value) {
    let bytes = 0;
    for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index);
        if (code < 0x80)
            bytes += 1;
        else if (code < 0x800)
            bytes += 2;
        else if (code >= 0xd800 &&
            code <= 0xdbff &&
            index + 1 < value.length &&
            value.charCodeAt(index + 1) >= 0xdc00 &&
            value.charCodeAt(index + 1) <= 0xdfff) {
            bytes += 4;
            index += 1;
        }
        else
            bytes += 3;
    }
    return bytes;
}
export function rebuildSynthesisTopicApplicationApplyRequest(value) {
    const input = toSynthesisJsonObject(value, "topicApplicationApplyRequest");
    exactFields(input, ["bundle", "assets"], "topicApplicationApplyRequest");
    const bundle = toSynthesisJsonObject(input.bundle, "bundle");
    if (Object.keys(bundle).some((field) => !TOPIC_APPLICATION_BUNDLE_FIELDS.has(field))) {
        invalid("bundle.fields");
    }
    const definition = bundle.topic_definition === undefined
        ? undefined
        : toSynthesisJsonObject(bundle.topic_definition, "bundle.topic_definition");
    const topicIds = [bundle.topic_id, definition?.id]
        .filter((value) => value !== undefined)
        .map((value, index) => cleanTopicId(value, `bundle.topicId[${index}]`));
    if (topicIds.length === 0 ||
        topicIds.some((value) => value !== topicIds[0])) {
        invalid("bundle.topicId");
    }
    if (!Array.isArray(input.assets) ||
        input.assets.length > SYNTHESIS_TOPIC_APPLICATION_LIMITS.assets) {
        invalid("assets");
    }
    let totalBytes = 0;
    const seen = new Set();
    const assets = input.assets.map((entry, index) => {
        const asset = toSynthesisJsonObject(entry, `assets[${index}]`);
        exactFields(asset, ["id", "mediaType", "text"], `assets[${index}]`);
        const id = assetId(asset.id, `assets[${index}].id`);
        if (seen.has(id))
            invalid(`assets[${index}].id`);
        seen.add(id);
        if (asset.mediaType !== "application/json" &&
            asset.mediaType !== "text/markdown" &&
            asset.mediaType !== "text/plain") {
            invalid(`assets[${index}].mediaType`);
        }
        if (typeof asset.text !== "string")
            invalid(`assets[${index}].text`);
        const bytes = utf8Bytes(asset.text);
        if (bytes > SYNTHESIS_TOPIC_APPLICATION_LIMITS.assetBytes) {
            invalid(`assets[${index}].text`);
        }
        totalBytes += bytes;
        if (totalBytes > SYNTHESIS_TOPIC_APPLICATION_LIMITS.totalAssetBytes) {
            invalid("assets.totalBytes");
        }
        return {
            id,
            mediaType: asset.mediaType,
            text: asset.text,
        };
    });
    return { bundle: bundle, assets };
}
export function rebuildSynthesisTopicApplicationListRequest(value = {}) {
    const input = toSynthesisJsonObject(value, "topicApplicationListRequest");
    const fields = Object.keys(input);
    if (fields.some((field) => field !== "cursor" && field !== "limit")) {
        invalid("topicApplicationListRequest.fields");
    }
    const cursor = input.cursor === undefined ? "" : input.cursor;
    if (typeof cursor !== "string" ||
        !/^\d*$/.test(cursor) ||
        (cursor !== "" && !Number.isSafeInteger(Number(cursor)))) {
        invalid("cursor");
    }
    const limit = input.limit === undefined
        ? SYNTHESIS_TOPIC_APPLICATION_LIMITS.listDefault
        : input.limit;
    if (typeof limit !== "number" ||
        !Number.isSafeInteger(limit) ||
        limit < 1 ||
        limit > SYNTHESIS_TOPIC_APPLICATION_LIMITS.listMax) {
        invalid("limit");
    }
    return { cursor, limit };
}
export function rebuildSynthesisTopicApplicationDetailRequest(value) {
    const input = toSynthesisJsonObject(value, "topicApplicationDetailRequest");
    exactFields(input, ["topicId"], "topicApplicationDetailRequest");
    return { topicId: cleanTopicId(input.topicId, "topicId") };
}
