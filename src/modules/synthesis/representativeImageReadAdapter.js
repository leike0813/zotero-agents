import { SYNTHESIS_HOST_REPRESENTATIVE_IMAGE_CONTENT_BYTES_MAX, rebuildSynthesisHostRepresentativeImageReadRequest, rebuildSynthesisHostRepresentativeImageReadResult, } from "../../../packages/synthesis-contracts/src/index";
import { readRuntimeBytes, statRuntimePath } from "../runtimePersistence";
import { extractDigestRepresentativeImageDescriptor, } from "./digestRepresentativeImage";
function cleanString(value) {
    return String(value ?? "").trim();
}
function zoteroRuntime() {
    const zotero = globalThis.Zotero;
    if (!zotero) {
        throw new Error("Zotero runtime is unavailable");
    }
    return zotero;
}
function resolveItemByKey(zotero, libraryId, key) {
    try {
        return zotero.Items?.getByLibraryAndKey?.(libraryId, key) || null;
    }
    catch {
        return null;
    }
}
function readNoteHtml(note) {
    try {
        return String(note?.getNote?.() || "");
    }
    catch {
        return "";
    }
}
function itemId(item) {
    const value = Number(item?.id ?? 0);
    return Number.isSafeInteger(value) && value > 0 ? value : 0;
}
function parentItemId(item) {
    const value = Number(item?.parentItemID ?? item?.parentID ?? 0);
    return Number.isSafeInteger(value) && value > 0 ? value : 0;
}
function isAttachment(item) {
    try {
        return typeof item?.isAttachment === "function"
            ? item.isAttachment() === true
            : cleanString(item?.itemType) === "attachment";
    }
    catch {
        return false;
    }
}
function readField(item, field) {
    try {
        return cleanString(item?.getField?.(field));
    }
    catch {
        return "";
    }
}
function contentTypeForAttachment(item) {
    const value = (readField(item, "contentType") ||
        readField(item, "mimeType") ||
        cleanString(item?.contentType) ||
        cleanString(item?.mimeType)).toLowerCase();
    return /^image\/[a-z0-9!#$&^_.+-]+$/.test(value) ? value : "";
}
async function attachmentPath(item) {
    try {
        return cleanString(await item?.getFilePathAsync?.());
    }
    catch {
        return "";
    }
}
function descriptorMetadata(descriptor) {
    return {
        ...(descriptor.attachmentKey
            ? { attachmentKey: descriptor.attachmentKey }
            : {}),
        ...(descriptor.alt ? { alt: descriptor.alt } : {}),
        ...(descriptor.caption ? { caption: descriptor.caption } : {}),
        ...(descriptor.sourceKind ? { sourceKind: descriptor.sourceKind } : {}),
        ...(descriptor.strategy ? { strategy: descriptor.strategy } : {}),
    };
}
function unavailable(reason, descriptor) {
    return rebuildSynthesisHostRepresentativeImageReadResult({
        status: "unavailable",
        ...(descriptor ? descriptorMetadata(descriptor) : {}),
        diagnostics: [reason],
    });
}
function bytesToBase64(bytes) {
    const encode = globalThis.btoa;
    if (typeof encode !== "function") {
        throw new Error("Base64 encoding is unavailable");
    }
    const chunks = [];
    const chunkSize = 32 * 1024;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        let binary = "";
        for (const byte of bytes.subarray(offset, offset + chunkSize)) {
            binary += String.fromCharCode(byte);
        }
        chunks.push(binary);
    }
    return encode(chunks.join(""));
}
export function createZoteroSynthesisRepresentativeImageReadPort() {
    return {
        async read(rawRequest) {
            const request = rebuildSynthesisHostRepresentativeImageReadRequest(rawRequest);
            const zotero = zoteroRuntime();
            const note = resolveItemByKey(zotero, request.libraryId, request.noteKey);
            if (!note) {
                return unavailable("digest_note_not_found");
            }
            const descriptor = extractDigestRepresentativeImageDescriptor(readNoteHtml(note));
            if (!descriptor) {
                return rebuildSynthesisHostRepresentativeImageReadResult({
                    status: "absent",
                    diagnostics: [],
                });
            }
            if (!descriptor.attachmentKey) {
                return unavailable("representative_image_attachment_key_missing", descriptor);
            }
            const attachment = resolveItemByKey(zotero, request.libraryId, descriptor.attachmentKey);
            if (!attachment) {
                return unavailable("representative_image_attachment_not_found", descriptor);
            }
            if (!isAttachment(attachment)) {
                return unavailable("representative_image_attachment_not_attachment", descriptor);
            }
            if (parentItemId(attachment) !== itemId(note)) {
                return unavailable("representative_image_attachment_parent_mismatch", descriptor);
            }
            const mimeType = contentTypeForAttachment(attachment);
            if (!mimeType) {
                return unavailable("representative_image_attachment_not_image", descriptor);
            }
            const filePath = await attachmentPath(attachment);
            if (!filePath) {
                return unavailable("representative_image_attachment_path_missing", descriptor);
            }
            let stat;
            try {
                stat = await statRuntimePath(filePath);
            }
            catch {
                return unavailable("representative_image_read_failed", descriptor);
            }
            if (!stat.exists || stat.isDir) {
                return unavailable("representative_image_attachment_path_missing", descriptor);
            }
            if (stat.size === 0) {
                return unavailable("representative_image_attachment_empty", descriptor);
            }
            if (stat.size > SYNTHESIS_HOST_REPRESENTATIVE_IMAGE_CONTENT_BYTES_MAX) {
                return unavailable("representative_image_attachment_oversize", descriptor);
            }
            try {
                const bytes = await readRuntimeBytes(filePath);
                if (bytes.length === 0) {
                    return unavailable("representative_image_attachment_empty", descriptor);
                }
                if (bytes.length > SYNTHESIS_HOST_REPRESENTATIVE_IMAGE_CONTENT_BYTES_MAX) {
                    return unavailable("representative_image_attachment_oversize", descriptor);
                }
                return rebuildSynthesisHostRepresentativeImageReadResult({
                    status: "available",
                    attachmentKey: descriptor.attachmentKey,
                    mimeType,
                    contentBase64: bytesToBase64(bytes),
                    alt: descriptor.alt || "Representative image",
                    caption: descriptor.caption || descriptor.alt || "Representative image",
                    ...(descriptor.width ? { width: descriptor.width } : {}),
                    ...(descriptor.height ? { height: descriptor.height } : {}),
                    compressedBytes: bytes.length,
                    ...(descriptor.sourceKind
                        ? { sourceKind: descriptor.sourceKind }
                        : {}),
                    ...(descriptor.strategy ? { strategy: descriptor.strategy } : {}),
                    diagnostics: [],
                });
            }
            catch {
                return unavailable("representative_image_read_failed", descriptor);
            }
        },
    };
}
