export type ArtifactManifestDiagnostic = {
  code: string;
  message: string;
  path?: string;
};

export type OutputArtifactField = {
  name: string;
  role: string;
  isManifest: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function isAbsolutePath(value: string) {
  const normalized = cleanString(value).replace(/\\/g, "/");
  return /^[A-Za-z]:\//.test(normalized) || normalized.startsWith("/");
}

function isAllowedArtifactPath(
  value: string,
  options?: { allowAbsolutePaths?: boolean },
) {
  const normalized = cleanString(value).replace(/\\/g, "/");
  if (
    !normalized ||
    normalized.split("/").some((segment) => segment === "..") ||
    /^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(normalized)
  ) {
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

function collectFromSchemaNode(
  schema: unknown,
  fields: Map<string, OutputArtifactField>,
) {
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

export function collectOutputArtifactFields(
  outputSchema: unknown,
): OutputArtifactField[] {
  const fields = new Map<string, OutputArtifactField>();
  collectFromSchemaNode(outputSchema, fields);
  return Array.from(fields.values()).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

export function validateFlatArtifactManifest(
  value: unknown,
  options?: { allowAbsolutePaths?: boolean },
):
  | { ok: true; paths: string[] }
  | { ok: false; diagnostics: ArtifactManifestDiagnostic[] } {
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
  const diagnostics: ArtifactManifestDiagnostic[] = [];
  const paths: string[] = [];
  for (const [key, pathValue] of Object.entries(value)) {
    if (
      typeof pathValue !== "string" ||
      !isAllowedArtifactPath(pathValue, options)
    ) {
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

export async function collectOutputBundleArtifactPaths(args: {
  output: unknown;
  outputSchema: unknown;
  readArtifactText: (path: string) => Promise<string> | string;
  allowAbsolutePaths?: boolean;
}) {
  if (!isRecord(args.output)) {
    return {
      ok: false as const,
      paths: [],
      diagnostics: [
        {
          code: "output_not_object",
          message: "Output must be an object before collecting artifacts.",
        },
      ],
    };
  }
  const paths = new Set<string>();
  const diagnostics: ArtifactManifestDiagnostic[] = [];
  for (const field of collectOutputArtifactFields(args.outputSchema)) {
    const pathValue = cleanString(args.output[field.name]);
    if (!pathValue) {
      continue;
    }
    if (
      !isAllowedArtifactPath(pathValue, {
        allowAbsolutePaths: args.allowAbsolutePaths,
      })
    ) {
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
    let manifest: unknown;
    try {
      manifest = JSON.parse(await args.readArtifactText(pathValue));
    } catch (error) {
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
      diagnostics.push(
        ...validation.diagnostics.map((entry) => ({
          ...entry,
          path: [field.name, entry.path].filter(Boolean).join("."),
        })),
      );
      continue;
    }
    for (const entryPath of validation.paths) {
      paths.add(entryPath);
    }
  }
  return diagnostics.length
    ? { ok: false as const, paths: Array.from(paths).sort(), diagnostics }
    : { ok: true as const, paths: Array.from(paths).sort(), diagnostics: [] };
}
