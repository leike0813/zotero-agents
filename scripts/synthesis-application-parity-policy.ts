export type SynthesisApplicationParityRole = "node" | "rust";

const RUST_REFERENCE_REDIRECT_GRAPH_SCHEMA_MARKER_KEY =
  "reference_redirect_graph_schema_version";

function isRustReferenceRedirectGraphSchemaMarker(row: unknown) {
  return (
    !!row &&
    typeof row === "object" &&
    !Array.isArray(row) &&
    (row as Record<string, unknown>).key ===
      RUST_REFERENCE_REDIRECT_GRAPH_SCHEMA_MARKER_KEY
  );
}

export function normalizeSynthesisApplicationParityTableRows<T>(
  role: SynthesisApplicationParityRole,
  table: string,
  rows: T[],
) {
  if (role !== "rust" || table !== "synt_schema_meta") return rows;
  return rows.filter((row) => !isRustReferenceRedirectGraphSchemaMarker(row));
}

export function normalizeSynthesisApplicationParityObservable(
  role: SynthesisApplicationParityRole,
  value: unknown,
): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) =>
      normalizeSynthesisApplicationParityObservable(role, entry),
    );
  }
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      key === "synt_schema_meta" && Array.isArray(entry)
        ? normalizeSynthesisApplicationParityTableRows(role, key, entry).map(
            (row) => normalizeSynthesisApplicationParityObservable(role, row),
          )
        : normalizeSynthesisApplicationParityObservable(role, entry),
    ]),
  );
}
