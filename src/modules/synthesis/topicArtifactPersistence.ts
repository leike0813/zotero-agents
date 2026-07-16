import { canonicalizeJson, hashCanonicalJson } from "./foundation";

export function computeTopicCurrentHashes(args: {
  manifest: unknown;
  artifact: unknown;
  metadata: unknown;
  sections: Record<string, unknown>;
}) {
  const section_hashes = Object.fromEntries(
    Object.entries(args.sections || {}).map(([name, value]) => [
      name,
      hashCanonicalJson(value),
    ]),
  );
  const structuredHash = hashCanonicalJson(args.artifact);
  return {
    manifest_hash: hashCanonicalJson(args.manifest),
    structured_hash: structuredHash,
    artifact_hash: structuredHash,
    metadata_hash: hashCanonicalJson(args.metadata),
    section_hashes,
  };
}

export function canonicalSectionFileName(section: string) {
  return `${section.replace(/_/g, "-")}.json`;
}

export function canonicalJsonText(value: unknown) {
  return `${canonicalizeJson(value)}\n`;
}
