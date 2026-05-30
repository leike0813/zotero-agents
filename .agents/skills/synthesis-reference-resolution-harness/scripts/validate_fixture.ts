import fs from "fs";
import path from "path";

type JsonRecord = Record<string, any>;

function argValue(name: string, fallback = "") {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function readJson<T = JsonRecord>(fixture: string, fileName: string): T {
  return JSON.parse(fs.readFileSync(path.join(fixture, fileName), "utf8")) as T;
}

function fail(message: string): never {
  throw new Error(message);
}

function main() {
  const fixture = argValue("--fixture");
  if (!fixture) {
    fail("missing --fixture");
  }
  const labelsFile = argValue("--labels", "gold-labels.json");
  const metadata = readJson<JsonRecord>(fixture, "metadata.json");
  const library = readJson<{ papers: JsonRecord[] }>(fixture, "library.json");
  const references = readJson<{ references: JsonRecord[] }>(
    fixture,
    "references.json",
  );
  const goldLabels = readJson<{ labels: JsonRecord[] }>(fixture, labelsFile);
  const dangerPairs = readJson<{ pairs?: JsonRecord[] }>(
    fixture,
    "danger-pairs.json",
  );

  const diagnostics: string[] = [];
  const referenceIds = new Set<string>();
  const itemKeys = new Set<string>();
  const literatureItemIds = new Set<string>();

  for (const paper of library.papers || []) {
    if (paper.item_key || paper.itemKey) {
      itemKeys.add(String(paper.item_key || paper.itemKey));
    }
    if (paper.literature_item_id || paper.literatureItemId) {
      literatureItemIds.add(
        String(paper.literature_item_id || paper.literatureItemId),
      );
    }
  }
  for (const reference of references.references || []) {
    const id = String(reference.reference_instance_id || "");
    if (!id) {
      diagnostics.push("reference missing reference_instance_id");
    } else if (referenceIds.has(id)) {
      diagnostics.push(`duplicate reference id: ${id}`);
    }
    referenceIds.add(id);
  }

  const labelByRef = new Map<string, JsonRecord>();
  const allowedLabels = new Set([
    "match",
    "suggested_match",
    "ambiguous",
    "external_or_missing",
    "ignore",
  ]);
  for (const label of goldLabels.labels || []) {
    const id = String(label.reference_instance_id || "");
    if (!referenceIds.has(id)) {
      diagnostics.push(`label points to missing reference: ${id}`);
    }
    if (labelByRef.has(id)) {
      diagnostics.push(`duplicate label for reference: ${id}`);
    }
    labelByRef.set(id, label);
    if (!allowedLabels.has(String(label.label || ""))) {
      diagnostics.push(`invalid label for ${id}: ${label.label}`);
    }
    if (label.target_item_key && !itemKeys.has(String(label.target_item_key))) {
      diagnostics.push(`label target_item_key missing from library: ${id}`);
    }
    if (
      label.target_literature_item_id &&
      !literatureItemIds.has(String(label.target_literature_item_id))
    ) {
      diagnostics.push(
        `label target_literature_item_id missing from library: ${id}`,
      );
    }
    if (label.label === "match" && !label.target_item_key) {
      diagnostics.push(`match label missing target_item_key: ${id}`);
    }
  }
  for (const id of referenceIds) {
    if (!labelByRef.has(id)) {
      diagnostics.push(`reference missing gold label: ${id}`);
    }
  }

  const serialized = [
    "metadata.json",
    "library.json",
    "references.json",
    labelsFile,
    "danger-pairs.json",
  ]
    .map((fileName) => fs.readFileSync(path.join(fixture, fileName), "utf8"))
    .join("\n");
  if (
    /(?:[A-Z]:\\|\/Users\/|AppData|Bearer\s+|ZOTERO_BRIDGE_TOKEN)/i.test(
      serialized,
    )
  ) {
    diagnostics.push("fixture appears to contain local paths or secrets");
  }
  if (/<html|<body|data-payload/i.test(serialized)) {
    diagnostics.push(
      "fixture appears to contain full note HTML or payload blocks",
    );
  }

  const result = {
    ok: diagnostics.length === 0,
    fixture,
    labelsFile,
    counts: {
      metadataLibraryCount: metadata.library_count,
      metadataReferenceCount: metadata.reference_count,
      library: library.papers.length,
      references: references.references.length,
      labels: goldLabels.labels.length,
      dangerPairs: dangerPairs.pairs?.length || 0,
    },
    diagnostics,
  };
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exitCode = 1;
  }
}

main();
