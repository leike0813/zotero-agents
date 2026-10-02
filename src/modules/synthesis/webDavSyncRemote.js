function cleanString(value) {
    return String(value || "").trim();
}
export function sanitizeWebDavUrl(value) {
    return cleanString(value)
        .replace(/([a-z][a-z0-9+.-]*:\/\/)([^/@\s]+)@/gi, "$1[redacted]@")
        .replace(/([?&](?:token|password|secret|access_token)=)[^&#]+/gi, "$1[redacted]");
}
function joinUrl(baseUrlRaw, relativePathRaw) {
    const baseUrl = cleanString(baseUrlRaw).replace(/\/+$/g, "");
    const relativePath = cleanString(relativePathRaw)
        .replace(/\\/g, "/")
        .replace(/^\/+/g, "");
    return relativePath ? `${baseUrl}/${relativePath}` : baseUrl;
}
export function webDavRemoteUrl(args) {
    return joinUrl(joinUrl(args.baseUrl, args.remotePath), args.relativePath || "");
}
