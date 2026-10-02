function isRecord(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
}
function cleanString(value) {
    return String(value || "").trim();
}
function isAbsolutePath(value) {
    const normalized = cleanString(value).replace(/\\/g, "/");
    return /^[A-Za-z]:\//.test(normalized) || normalized.startsWith("/");
}
function isAllowedArtifactPath(value, options) {
    const normalized = cleanString(value).replace(/\\/g, "/");
    if (!normalized ||
        normalized.split("/").some((segment) => segment === "..") ||
        /^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(normalized)) {
        return false;
    }
    if (isAbsolutePath(normalized)) {
        return options?.allowAbsolutePaths === true;
    }
    if (/^[A-Za-z]:($|[^/])/.test(normalized)) {
        return false;
    }
    return true;
}
function collectFromSchemaNode(schema, fields) {
    if (!isRecord(schema)) {
        return;
    }
    const properties = isRecord(schema.properties) ? schema.properties : {};
    for (const [name, property] of Object.entries(properties)) {
        if (!isRecord(property)) {
            continue;
        }
        const xType = cleanString(property["x-type"]);
        if (xType !== "artifact" && xType !== "artifact-manifest") {
            continue;
        }
        const role = cleanString(property["x-role"]);
        fields.set(name, {
            name,
            role,
            isManifest: xType === "artifact-manifest",
        });
    }
    for (const branch of [
        ...(Array.isArray(schema.oneOf) ? schema.oneOf : []),
        ...(Array.isArray(schema.anyOf) ? schema.anyOf : []),
        ...(Array.isArray(schema.allOf) ? schema.allOf : []),
    ]) {
        collectFromSchemaNode(branch, fields);
    }
}
export function collectOutputArtifactFields(outputSchema) {
    const fields = new Map();
    collectFromSchemaNode(outputSchema, fields);
    return Array.from(fields.values()).sort((left, right) => left.name.localeCompare(right.name));
}
export function validateFlatArtifactManifest(value, options) {
    if (!isRecord(value)) {
        return {
            ok: false,
            diagnostics: [
                {
                    code: "artifact_manifest_not_object",
                    message: "Artifact manifest must be a flat JSON object.",
                },
            ],
        };
    }
    const diagnostics = [];
    const paths = [];
    for (const [key, pathValue] of Object.entries(value)) {
        if (typeof pathValue !== "string" ||
            !isAllowedArtifactPath(pathValue, options)) {
            diagnostics.push({
                code: "artifact_manifest_invalid_path",
                message: options?.allowAbsolutePaths
                    ? `Artifact manifest entry ${key} must be a safe path string.`
                    : `Artifact manifest entry ${key} must be a workspace-relative path string.`,
                path: key,
            });
            continue;
        }
        paths.push(pathValue);
    }
    return diagnostics.length ? { ok: false, diagnostics } : { ok: true, paths };
}
export async function collectOutputBundleArtifactPaths(args) {
    if (!isRecord(args.output)) {
        return {
            ok: false,
            paths: [],
            diagnostics: [
                {
                    code: "output_not_object",
                    message: "Output must be an object before collecting artifacts.",
                },
            ],
        };
    }
    const paths = new Set();
    const diagnostics = [];
    for (const field of collectOutputArtifactFields(args.outputSchema)) {
        const pathValue = cleanString(args.output[field.name]);
        if (!pathValue) {
            continue;
        }
        if (!isAllowedArtifactPath(pathValue, {
            allowAbsolutePaths: args.allowAbsolutePaths,
        })) {
            diagnostics.push({
                code: "artifact_path_invalid",
                message: args.allowAbsolutePaths
                    ? `${field.name} must be a safe path string.`
                    : `${field.name} must be a workspace-relative path string.`,
                path: field.name,
            });
            continue;
        }
        paths.add(pathValue);
        if (!field.isManifest) {
            continue;
        }
        let manifest;
        try {
            manifest = JSON.parse(await args.readArtifactText(pathValue));
        }
        catch (error) {
            diagnostics.push({
                code: "artifact_manifest_unreadable",
                message: error instanceof Error ? error.message : String(error),
                path: pathValue,
            });
            continue;
        }
        const validation = validateFlatArtifactManifest(manifest, {
            allowAbsolutePaths: args.allowAbsolutePaths,
        });
        if (!validation.ok) {
            diagnostics.push(...validation.diagnostics.map((entry) => ({
                ...entry,
                path: [field.name, entry.path].filter(Boolean).join("."),
            })));
            continue;
        }
        for (const entryPath of validation.paths) {
            paths.add(entryPath);
        }
    }
    return diagnostics.length
        ? { ok: false, paths: Array.from(paths).sort(), diagnostics }
        : { ok: true, paths: Array.from(paths).sort(), diagnostics: [] };
}
