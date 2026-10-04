/**
 * The single reader of "which saved objects still reference this credential".
 * Releasing a credential is only correct when no connection, MCP source or Web
 * source names it, so every owner answers that question the same way instead
 * of guessing from its own storage.
 *
 * Each owner stores references in its own field, and all three shapes are read
 * here: a Web source names one credential by `credentialId`, an MCP source
 * names credentials by `credentialSlots` values keyed by exact field
 * identity, and a provider connection names one by `credentialRef`. A record
 * holding any of these is a reference; the reader does not care which owner
 * wrote it, because a credential is shared precisely when two owners do.
 *
 * A document this reader cannot interpret answers "incomplete", so the caller
 * keeps the credential rather than releasing it on incomplete evidence.
 */
export function scanPiCredentialReferences(
  documents: readonly (string | null | undefined)[],
): { referenced: Set<string>; complete: boolean } {
  const referenced = new Set<string>();
  let complete = true;
  for (const document of documents) {
    const raw = typeof document === "string" ? document.trim() : "";
    if (!raw) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      complete = false;
      continue;
    }
    if (!Array.isArray(parsed) && !plainRecord(parsed)) {
      complete = false;
      continue;
    }
    for (const entry of recordsOf(parsed)) collect(entry, referenced);
  }
  return { referenced, complete };
}

function plainRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/** A document's own array, or the one its owner keeps records under. */
function recordsOf(document: unknown): unknown[] {
  if (Array.isArray(document)) return document;
  if (!plainRecord(document)) return [];
  for (const field of ["sources", "connections", "configurations"]) {
    const rows = document[field];
    if (Array.isArray(rows)) return rows;
  }
  return [document];
}

function collect(entry: unknown, referenced: Set<string>) {
  if (!plainRecord(entry)) return;
  for (const field of ["credentialId", "credentialRef"]) {
    const id = entry[field];
    if (typeof id === "string" && id.trim()) referenced.add(id.trim());
  }
  const slots = entry.credentialSlots;
  if (!plainRecord(slots)) return;
  for (const value of Object.values(slots)) {
    if (typeof value === "string" && value.trim()) referenced.add(value.trim());
  }
}
