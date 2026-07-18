import {
  byteLengthSynthesisEngineText,
  canonicalizeSynthesisEngineJsonArtifact,
  canonicalizeSynthesisEngineJson,
  encodeSynthesisEngineText,
  hashSynthesisEngineCanonicalJson,
  sha256SynthesisEngineBytes,
} from "./canonicalJson.ts";
import {
  SYNTHESIS_CITATION_GRAPH_BUILD_CONTRACT_VERSION,
  rebuildSynthesisCitationGraphBuildAggregateEdgePage,
  rebuildSynthesisCitationGraphBuildDiagnostics,
  rebuildSynthesisCitationGraphBuildLibraryNodePage,
  rebuildSynthesisCitationGraphBuildLightMetricPage,
  rebuildSynthesisCitationGraphBuildNodePage,
  rebuildSynthesisCitationGraphBuildOwnershipPage,
  rebuildSynthesisCitationGraphBuildReferencePage,
  rebuildSynthesisCitationGraphBuildResolvedEdgePage,
  rebuildSynthesisCitationGraphBuildRolePriority,
  rebuildSynthesisCitationGraphBuildScope,
} from "./citationGraphBuild.ts";
import type { SynthesisCitationGraphBuildResult } from "./citationGraphBuild.ts";
import { countSynthesisEngineJsonNodes } from "./canonicalJson.ts";

export const SYNTHESIS_CITATION_GRAPH_BUILD_TRANSFER_VERSION =
  "synthesis-citation-graph-build-transfer.v1" as const;
export const SYNTHESIS_CITATION_GRAPH_BUILD_TRANSFER_ENCODING =
  "canonical_json_rows.v1" as const;

export const SYNTHESIS_CITATION_GRAPH_BUILD_INPUT_PAGE_KINDS = [
  "library_nodes",
  "references",
] as const;
export const SYNTHESIS_CITATION_GRAPH_BUILD_OUTPUT_PAGE_KINDS = [
  "nodes",
  "resolved_edges",
  "aggregate_edges",
  "source_ownership",
  "incoming_groups",
  "light_metrics",
] as const;
export const SYNTHESIS_CITATION_GRAPH_BUILD_TRANSFER_PAGE_KINDS = [
  ...SYNTHESIS_CITATION_GRAPH_BUILD_INPUT_PAGE_KINDS,
  ...SYNTHESIS_CITATION_GRAPH_BUILD_OUTPUT_PAGE_KINDS,
] as const;

export type SynthesisCitationGraphBuildTransferDirection = "input" | "output";
export type SynthesisCitationGraphBuildTransferPageKind =
  (typeof SYNTHESIS_CITATION_GRAPH_BUILD_TRANSFER_PAGE_KINDS)[number];
export type SynthesisCitationGraphBuildTransferPageDescriptor = {
  kind: SynthesisCitationGraphBuildTransferPageKind;
  pageIndex: number;
  rowCount: number;
  byteLength: number;
  sha256: string;
};
export type SynthesisCitationGraphBuildTransferPage = {
  descriptor: SynthesisCitationGraphBuildTransferPageDescriptor;
  rows: unknown[];
};
export type SynthesisCitationGraphBuildTransferPageArtifact = {
  page: SynthesisCitationGraphBuildTransferPage;
  bytes: Uint8Array;
};
export type SynthesisCitationGraphBuildTransferManifest = {
  transferVersion: typeof SYNTHESIS_CITATION_GRAPH_BUILD_TRANSFER_VERSION;
  encoding: typeof SYNTHESIS_CITATION_GRAPH_BUILD_TRANSFER_ENCODING;
  direction: SynthesisCitationGraphBuildTransferDirection;
  header: Record<string, unknown>;
  pages: SynthesisCitationGraphBuildTransferPageDescriptor[];
  rootSha256: string;
};

function invalid(message: string): never {
  throw new Error(`citation_graph_build_transfer_invalid:${message}`);
}

function object(value: unknown, location: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return invalid(`${location}_object`);
  }
  return value as Record<string, unknown>;
}

function exactFields(
  value: Record<string, unknown>,
  expected: readonly string[],
  location: string,
) {
  const actual = Object.keys(value).sort();
  const fields = [...expected].sort();
  if (
    actual.length !== fields.length ||
    actual.some((field, index) => field !== fields[index])
  ) {
    invalid(`${location}_fields`);
  }
}

function nonNegativeInteger(value: unknown, location: string) {
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    return invalid(location);
  }
  return Number(value);
}

function sha256(value: unknown, location: string) {
  if (typeof value !== "string" || !/^sha256:[a-f0-9]{64}$/.test(value)) {
    return invalid(location);
  }
  return value;
}

function pageKind(value: unknown): SynthesisCitationGraphBuildTransferPageKind {
  if (
    typeof value === "string" &&
    (
      SYNTHESIS_CITATION_GRAPH_BUILD_TRANSFER_PAGE_KINDS as readonly string[]
    ).includes(value)
  ) {
    return value as SynthesisCitationGraphBuildTransferPageKind;
  }
  return invalid("page_kind");
}

function directionKinds(
  direction: SynthesisCitationGraphBuildTransferDirection,
) {
  return direction === "input"
    ? SYNTHESIS_CITATION_GRAPH_BUILD_INPUT_PAGE_KINDS
    : SYNTHESIS_CITATION_GRAPH_BUILD_OUTPUT_PAGE_KINDS;
}

function rebuildHeader(
  direction: SynthesisCitationGraphBuildTransferDirection,
  value: unknown,
) {
  const header = object(value, "header");
  if (direction === "input") {
    exactFields(
      header,
      ["contractVersion", "scope", "rolePriority"],
      "input_header",
    );
    if (
      header.contractVersion !== SYNTHESIS_CITATION_GRAPH_BUILD_CONTRACT_VERSION
    ) {
      return invalid("input_contract_version");
    }
    return {
      contractVersion: SYNTHESIS_CITATION_GRAPH_BUILD_CONTRACT_VERSION,
      scope: rebuildSynthesisCitationGraphBuildScope(header.scope),
      rolePriority: rebuildSynthesisCitationGraphBuildRolePriority(
        header.rolePriority,
      ),
    };
  }
  exactFields(
    header,
    ["contractVersion", "scope", "diagnostics"],
    "output_header",
  );
  if (
    header.contractVersion !== SYNTHESIS_CITATION_GRAPH_BUILD_CONTRACT_VERSION
  ) {
    return invalid("output_contract_version");
  }
  return {
    contractVersion: SYNTHESIS_CITATION_GRAPH_BUILD_CONTRACT_VERSION,
    scope: rebuildSynthesisCitationGraphBuildScope(header.scope),
    diagnostics: rebuildSynthesisCitationGraphBuildDiagnostics(
      header.diagnostics,
    ),
  };
}

function rebuildRows(
  kind: SynthesisCitationGraphBuildTransferPageKind,
  rows: unknown,
) {
  switch (kind) {
    case "library_nodes":
      return rebuildSynthesisCitationGraphBuildLibraryNodePage(rows);
    case "references":
      return rebuildSynthesisCitationGraphBuildReferencePage(rows);
    case "nodes":
      return rebuildSynthesisCitationGraphBuildNodePage(rows);
    case "resolved_edges":
      return rebuildSynthesisCitationGraphBuildResolvedEdgePage(rows);
    case "aggregate_edges":
      return rebuildSynthesisCitationGraphBuildAggregateEdgePage(rows);
    case "source_ownership":
      return rebuildSynthesisCitationGraphBuildOwnershipPage(
        rows,
        "sourceOwnership",
      );
    case "incoming_groups":
      return rebuildSynthesisCitationGraphBuildOwnershipPage(
        rows,
        "incomingGroups",
      );
    case "light_metrics":
      return rebuildSynthesisCitationGraphBuildLightMetricPage(rows);
  }
}

function kindOrder(kind: SynthesisCitationGraphBuildTransferPageKind) {
  return SYNTHESIS_CITATION_GRAPH_BUILD_TRANSFER_PAGE_KINDS.indexOf(kind);
}

function sortDescriptors(
  pages: SynthesisCitationGraphBuildTransferPageDescriptor[],
) {
  return [...pages].sort(
    (left, right) =>
      kindOrder(left.kind) - kindOrder(right.kind) ||
      left.pageIndex - right.pageIndex,
  );
}

function rebuildDescriptor(value: unknown) {
  const descriptor = object(value, "page_descriptor");
  exactFields(
    descriptor,
    ["kind", "pageIndex", "rowCount", "byteLength", "sha256"],
    "page_descriptor",
  );
  return {
    kind: pageKind(descriptor.kind),
    pageIndex: nonNegativeInteger(descriptor.pageIndex, "page_index"),
    rowCount: nonNegativeInteger(descriptor.rowCount, "row_count"),
    byteLength: nonNegativeInteger(descriptor.byteLength, "byte_length"),
    sha256: sha256(descriptor.sha256, "page_sha256"),
  };
}

function assertDescriptorSequence(
  direction: SynthesisCitationGraphBuildTransferDirection,
  pages: SynthesisCitationGraphBuildTransferPageDescriptor[],
) {
  const allowed = directionKinds(direction) as readonly string[];
  const seen = new Set<string>();
  for (const page of pages) {
    if (!allowed.includes(page.kind)) {
      invalid("page_direction");
    }
    const identity = `${page.kind}:${page.pageIndex}`;
    if (seen.has(identity)) {
      invalid("duplicate_page");
    }
    seen.add(identity);
  }
  for (const kind of directionKinds(direction)) {
    const indexes = pages
      .filter((page) => page.kind === kind)
      .map((page) => page.pageIndex)
      .sort((left, right) => left - right);
    if (direction === "input" && indexes.length === 0) {
      invalid("input_kind_missing");
    }
    if (indexes.some((index, position) => index !== position)) {
      invalid("page_index_sequence");
    }
  }
}

function manifestBody(args: {
  direction: SynthesisCitationGraphBuildTransferDirection;
  header: Record<string, unknown>;
  pages: SynthesisCitationGraphBuildTransferPageDescriptor[];
}) {
  return {
    transferVersion: SYNTHESIS_CITATION_GRAPH_BUILD_TRANSFER_VERSION,
    encoding: SYNTHESIS_CITATION_GRAPH_BUILD_TRANSFER_ENCODING,
    direction: args.direction,
    header: args.header,
    pages: sortDescriptors(args.pages),
  };
}

export function buildSynthesisCitationGraphBuildTransferPage(
  kindInput: SynthesisCitationGraphBuildTransferPageKind,
  pageIndexInput: number,
  rowsInput: unknown,
): SynthesisCitationGraphBuildTransferPage {
  return buildSynthesisCitationGraphBuildTransferPageArtifact(
    kindInput,
    pageIndexInput,
    rowsInput,
  ).page;
}

export function buildSynthesisCitationGraphBuildTransferPageArtifact(
  kindInput: SynthesisCitationGraphBuildTransferPageKind,
  pageIndexInput: number,
  rowsInput: unknown,
): SynthesisCitationGraphBuildTransferPageArtifact {
  const kind = pageKind(kindInput);
  const pageIndex = nonNegativeInteger(pageIndexInput, "page_index");
  const rows = rebuildRows(kind, rowsInput);
  const canonical = canonicalizeSynthesisEngineJsonArtifact(rows);
  return {
    page: {
      descriptor: {
        kind,
        pageIndex,
        rowCount: rows.length,
        byteLength: canonical.byteLength,
        sha256: canonical.sha256,
      },
      rows,
    },
    bytes: canonical.bytes,
  };
}

export function rebuildSynthesisCitationGraphBuildTransferPage(
  value: unknown,
): SynthesisCitationGraphBuildTransferPage {
  return rebuildSynthesisCitationGraphBuildTransferPageArtifact(value).page;
}

export function rebuildSynthesisCitationGraphBuildTransferPageArtifact(
  value: unknown,
): SynthesisCitationGraphBuildTransferPageArtifact {
  const page = object(value, "page");
  exactFields(page, ["descriptor", "rows"], "page");
  const expected = rebuildDescriptor(page.descriptor);
  const rebuilt = buildSynthesisCitationGraphBuildTransferPageArtifact(
    expected.kind,
    expected.pageIndex,
    page.rows,
  );
  if (JSON.stringify(rebuilt.page.descriptor) !== JSON.stringify(expected)) {
    return invalid("page_descriptor_mismatch");
  }
  return rebuilt;
}

function joinCanonicalRowBytes(
  rows: readonly Uint8Array[],
  byteLength: number,
) {
  const output = new Uint8Array(byteLength);
  let offset = 0;
  output[offset++] = 0x5b;
  for (const [index, row] of rows.entries()) {
    if (index > 0) output[offset++] = 0x2c;
    output.set(row, offset);
    offset += row.byteLength;
  }
  output[offset] = 0x5d;
  return output;
}

function* iterateTrustedRowsArtifacts(
  kind: (typeof SYNTHESIS_CITATION_GRAPH_BUILD_OUTPUT_PAGE_KINDS)[number],
  rows: unknown[],
  limits: { pageBytes: number; pageJsonNodes: number },
): Generator<SynthesisCitationGraphBuildTransferPageArtifact> {
  let pageRows: unknown[] = [];
  let canonicalRows: Uint8Array[] = [];
  let pageBytes = 2;
  let pageJsonNodes = 1;
  let pageIndex = 0;
  const flush = () => {
    if (!pageRows.length) return undefined;
    const bytes = joinCanonicalRowBytes(canonicalRows, pageBytes);
    const artifact: SynthesisCitationGraphBuildTransferPageArtifact = {
      page: {
        descriptor: {
          kind,
          pageIndex,
          rowCount: pageRows.length,
          byteLength: bytes.byteLength,
          sha256: sha256SynthesisEngineBytes(bytes),
        },
        rows: pageRows,
      },
      bytes,
    };
    pageIndex += 1;
    pageRows = [];
    canonicalRows = [];
    pageBytes = 2;
    pageJsonNodes = 1;
    return artifact;
  };
  for (const row of rows) {
    const canonical = encodeSynthesisEngineText(
      canonicalizeSynthesisEngineJson(row),
    );
    const rowJsonNodes = countSynthesisEngineJsonNodes(row);
    const separatorBytes = pageRows.length ? 1 : 0;
    if (
      pageBytes + separatorBytes + canonical.byteLength > limits.pageBytes ||
      pageJsonNodes + rowJsonNodes > limits.pageJsonNodes
    ) {
      const artifact = flush();
      if (!artifact) invalid("output_row_exceeds_page_limit");
      yield artifact;
    }
    pageRows.push(row);
    canonicalRows.push(canonical);
    pageBytes += (pageRows.length > 1 ? 1 : 0) + canonical.byteLength;
    pageJsonNodes += rowJsonNodes;
  }
  const artifact = flush();
  if (artifact) yield artifact;
}

export function* iterateSynthesisCitationGraphBuildResultPageArtifacts(
  result: SynthesisCitationGraphBuildResult,
  limits: { pageBytes: number; pageJsonNodes: number },
): Generator<SynthesisCitationGraphBuildTransferPageArtifact> {
  yield* iterateTrustedRowsArtifacts("nodes", result.nodes, limits);
  yield* iterateTrustedRowsArtifacts(
    "resolved_edges",
    result.resolvedEdges,
    limits,
  );
  yield* iterateTrustedRowsArtifacts(
    "aggregate_edges",
    result.aggregateEdges,
    limits,
  );
  yield* iterateTrustedRowsArtifacts(
    "source_ownership",
    result.sourceOwnership,
    limits,
  );
  yield* iterateTrustedRowsArtifacts(
    "incoming_groups",
    result.incomingGroups,
    limits,
  );
  yield* iterateTrustedRowsArtifacts(
    "light_metrics",
    result.lightMetrics,
    limits,
  );
}

export function buildSynthesisCitationGraphBuildTransferManifest(args: {
  direction: SynthesisCitationGraphBuildTransferDirection;
  header: unknown;
  pages: unknown[];
}): SynthesisCitationGraphBuildTransferManifest {
  const direction =
    args.direction === "input" || args.direction === "output"
      ? args.direction
      : invalid("direction");
  const header = rebuildHeader(direction, args.header);
  const pages = sortDescriptors(args.pages.map(rebuildDescriptor));
  assertDescriptorSequence(direction, pages);
  const body = manifestBody({ direction, header, pages });
  return {
    ...body,
    rootSha256: hashSynthesisEngineCanonicalJson(body),
  };
}

export function rebuildSynthesisCitationGraphBuildTransferManifest(
  value: unknown,
): SynthesisCitationGraphBuildTransferManifest {
  const manifest = object(value, "manifest");
  exactFields(
    manifest,
    [
      "transferVersion",
      "encoding",
      "direction",
      "header",
      "pages",
      "rootSha256",
    ],
    "manifest",
  );
  if (
    manifest.transferVersion !==
      SYNTHESIS_CITATION_GRAPH_BUILD_TRANSFER_VERSION ||
    manifest.encoding !== SYNTHESIS_CITATION_GRAPH_BUILD_TRANSFER_ENCODING ||
    (manifest.direction !== "input" && manifest.direction !== "output") ||
    !Array.isArray(manifest.pages)
  ) {
    return invalid("manifest_contract");
  }
  const rebuilt = buildSynthesisCitationGraphBuildTransferManifest({
    direction: manifest.direction,
    header: manifest.header,
    pages: manifest.pages,
  });
  if (sha256(manifest.rootSha256, "manifest_root") !== rebuilt.rootSha256) {
    return invalid("manifest_root_mismatch");
  }
  return rebuilt;
}

export function paginateSynthesisCitationGraphBuildRows(
  kind: (typeof SYNTHESIS_CITATION_GRAPH_BUILD_OUTPUT_PAGE_KINDS)[number],
  rows: unknown[],
  limits: { pageBytes: number; pageJsonNodes: number },
) {
  const pages: SynthesisCitationGraphBuildTransferPage[] = [];
  let pageRows: unknown[] = [];
  let pageBytes = 2;
  let pageJsonNodes = 1;
  const flush = () => {
    if (!pageRows.length) {
      return;
    }
    pages.push(
      buildSynthesisCitationGraphBuildTransferPage(
        kind,
        pages.length,
        pageRows,
      ),
    );
    pageRows = [];
    pageBytes = 2;
    pageJsonNodes = 1;
  };
  for (const row of rows) {
    const rowBytes = byteLengthSynthesisEngineText(
      canonicalizeSynthesisEngineJson(row),
    );
    const rowJsonNodes = countSynthesisEngineJsonNodes(row);
    const separatorBytes = pageRows.length ? 1 : 0;
    if (
      pageBytes + separatorBytes + rowBytes > limits.pageBytes ||
      pageJsonNodes + rowJsonNodes > limits.pageJsonNodes
    ) {
      if (!pageRows.length) {
        invalid("output_row_exceeds_page_limit");
      }
      flush();
    }
    pageRows.push(row);
    pageBytes += (pageRows.length > 1 ? 1 : 0) + rowBytes;
    pageJsonNodes += rowJsonNodes;
  }
  flush();
  return pages;
}

export function paginateSynthesisCitationGraphBuildResult(
  result: SynthesisCitationGraphBuildResult,
  limits: { pageBytes: number; pageJsonNodes: number },
) {
  const pages = [
    ...paginateSynthesisCitationGraphBuildRows("nodes", result.nodes, limits),
    ...paginateSynthesisCitationGraphBuildRows(
      "resolved_edges",
      result.resolvedEdges,
      limits,
    ),
    ...paginateSynthesisCitationGraphBuildRows(
      "aggregate_edges",
      result.aggregateEdges,
      limits,
    ),
    ...paginateSynthesisCitationGraphBuildRows(
      "source_ownership",
      result.sourceOwnership,
      limits,
    ),
    ...paginateSynthesisCitationGraphBuildRows(
      "incoming_groups",
      result.incomingGroups,
      limits,
    ),
    ...paginateSynthesisCitationGraphBuildRows(
      "light_metrics",
      result.lightMetrics,
      limits,
    ),
  ];
  const manifest = buildSynthesisCitationGraphBuildTransferManifest({
    direction: "output",
    header: {
      contractVersion: result.contractVersion,
      scope: result.scope,
      diagnostics: result.diagnostics,
    },
    pages: pages.map((page) => page.descriptor),
  });
  return { manifest, pages };
}
