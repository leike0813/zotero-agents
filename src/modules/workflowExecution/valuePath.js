function normalizeString(value) {
    return String(value || "").trim();
}
function isRecord(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
}
export function primitiveEquals(left, right) {
    if (left === null ||
        typeof left === "string" ||
        typeof left === "number" ||
        typeof left === "boolean") {
        return left === right;
    }
    return false;
}
export function getDotPath(source, path) {
    const normalized = normalizeString(path);
    if (!normalized || normalized === "$") {
        return source;
    }
    let current = source;
    for (const part of normalized.split(".").filter(Boolean)) {
        if (!isRecord(current) ||
            !Object.prototype.hasOwnProperty.call(current, part)) {
            return undefined;
        }
        current = current[part];
    }
    return current;
}
