import {
  SYNTHESIS_CITATION_GRAPH_BUILD_CONTRACT_VERSION,
  computeRebuiltSynthesisCitationGraphBuild,
  rebuildSynthesisCitationGraphBuildLibraryNodePage,
  rebuildSynthesisCitationGraphBuildReferencePage,
  rebuildSynthesisCitationGraphBuildRequest,
  rebuildSynthesisCitationGraphBuildRolePriority,
  rebuildSynthesisCitationGraphBuildScope,
  type SynthesisCitationGraphBuildCheckpoint,
  type SynthesisCitationGraphBuildLibraryNode,
  type SynthesisCitationGraphBuildReference,
  type SynthesisCitationGraphBuildRequest,
  type SynthesisCitationGraphBuildResult,
  type SynthesisCitationGraphBuildTargetKind,
} from "./citationGraphBuild.ts";

export const SYNTHESIS_CITATION_GRAPH_BUILD_PACKED_VERSION =
  "synthesis-citation-graph-build-packed.v1" as const;

const COLUMN_CHUNK_SIZE = 4_096;

class Uint32Column {
  private readonly chunks: Uint32Array[] = [];
  length = 0;

  push(value: number) {
    const index = this.length++;
    const chunkIndex = Math.floor(index / COLUMN_CHUNK_SIZE);
    let chunk = this.chunks[chunkIndex];
    if (!chunk) {
      chunk = new Uint32Array(COLUMN_CHUNK_SIZE);
      this.chunks.push(chunk);
    }
    chunk[index % COLUMN_CHUNK_SIZE] = value;
  }

  get(index: number) {
    return this.chunks[Math.floor(index / COLUMN_CHUNK_SIZE)][
      index % COLUMN_CHUNK_SIZE
    ];
  }
}

class Float64Column {
  private readonly chunks: Float64Array[] = [];
  length = 0;

  push(value: number) {
    const index = this.length++;
    const chunkIndex = Math.floor(index / COLUMN_CHUNK_SIZE);
    let chunk = this.chunks[chunkIndex];
    if (!chunk) {
      chunk = new Float64Array(COLUMN_CHUNK_SIZE);
      this.chunks.push(chunk);
    }
    chunk[index % COLUMN_CHUNK_SIZE] = value;
  }

  get(index: number) {
    return this.chunks[Math.floor(index / COLUMN_CHUNK_SIZE)][
      index % COLUMN_CHUNK_SIZE
    ];
  }
}

class StringTable {
  private readonly ids = new Map<string, number>();
  private readonly values = [""];

  intern(value: string | undefined) {
    if (value === undefined) {
      return 0;
    }
    const existing = this.ids.get(value);
    if (existing !== undefined) {
      return existing;
    }
    const id = this.values.length;
    this.values.push(value);
    this.ids.set(value, id);
    return id;
  }

  required(id: number) {
    return this.values[id];
  }

  optional(id: number) {
    return id === 0 ? undefined : this.values[id];
  }
}

class StringListColumn {
  private readonly offsets = new Uint32Column();
  private readonly lengths = new Uint32Column();
  private readonly values = new Uint32Column();

  private readonly strings: StringTable;

  constructor(strings: StringTable) {
    this.strings = strings;
  }

  push(entries: string[]) {
    this.offsets.push(this.values.length);
    this.lengths.push(entries.length);
    entries.forEach((entry) => this.values.push(this.strings.intern(entry)));
  }

  get(index: number) {
    const offset = this.offsets.get(index);
    const length = this.lengths.get(index);
    return Array.from({ length }, (_, itemIndex) =>
      this.strings.required(this.values.get(offset + itemIndex)),
    );
  }
}

function kindCode(kind: SynthesisCitationGraphBuildTargetKind) {
  return kind === "library_paper" ? 0 : kind === "external_reference" ? 1 : 2;
}

function codeKind(code: number): SynthesisCitationGraphBuildTargetKind {
  return code === 0
    ? "library_paper"
    : code === 1
      ? "external_reference"
      : "unresolved_reference";
}

class PackedLibraryNodes {
  readonly nodeId = new Uint32Column();
  readonly title = new Uint32Column();
  readonly year = new Uint32Column();
  readonly authors: StringListColumn;
  readonly aliases: StringListColumn;

  private readonly strings: StringTable;

  constructor(strings: StringTable) {
    this.strings = strings;
    this.authors = new StringListColumn(strings);
    this.aliases = new StringListColumn(strings);
  }

  push(row: SynthesisCitationGraphBuildLibraryNode) {
    this.nodeId.push(this.strings.intern(row.nodeId));
    this.title.push(this.strings.intern(row.title));
    this.year.push(this.strings.intern(row.year));
    this.authors.push(row.authors);
    this.aliases.push(row.aliases);
  }

  unpack() {
    return Array.from({ length: this.nodeId.length }, (_, index) => {
      const row: SynthesisCitationGraphBuildLibraryNode = {
        nodeId: this.strings.required(this.nodeId.get(index)),
        authors: this.authors.get(index),
        aliases: this.aliases.get(index),
      };
      const title = this.strings.optional(this.title.get(index));
      const year = this.strings.optional(this.year.get(index));
      if (title !== undefined) row.title = title;
      if (year !== undefined) row.year = year;
      return row;
    });
  }
}

class PackedReferences {
  readonly referenceId = new Uint32Column();
  readonly edgeId = new Uint32Column();
  readonly sourceId = new Uint32Column();
  readonly sourceRef = new Uint32Column();
  readonly targetId = new Uint32Column();
  readonly targetKind = new Uint32Column();
  readonly targetTitle = new Uint32Column();
  readonly targetYear = new Uint32Column();
  readonly targetAuthors: StringListColumn;
  readonly targetAliases: StringListColumn;
  readonly roles: StringListColumn;
  readonly weight = new Float64Column();

  private readonly strings: StringTable;

  constructor(strings: StringTable) {
    this.strings = strings;
    this.targetAuthors = new StringListColumn(strings);
    this.targetAliases = new StringListColumn(strings);
    this.roles = new StringListColumn(strings);
  }

  push(row: SynthesisCitationGraphBuildReference) {
    this.referenceId.push(this.strings.intern(row.referenceId));
    this.edgeId.push(this.strings.intern(row.edgeId));
    this.sourceId.push(this.strings.intern(row.sourceId));
    this.sourceRef.push(this.strings.intern(row.sourceRef));
    this.targetId.push(this.strings.intern(row.targetId));
    this.targetKind.push(kindCode(row.targetKind));
    this.targetTitle.push(this.strings.intern(row.targetTitle));
    this.targetYear.push(this.strings.intern(row.targetYear));
    this.targetAuthors.push(row.targetAuthors);
    this.targetAliases.push(row.targetAliases);
    this.roles.push(row.roles);
    this.weight.push(row.weight);
  }

  unpack() {
    return Array.from({ length: this.referenceId.length }, (_, index) => {
      const row: SynthesisCitationGraphBuildReference = {
        referenceId: this.strings.required(this.referenceId.get(index)),
        edgeId: this.strings.required(this.edgeId.get(index)),
        sourceId: this.strings.required(this.sourceId.get(index)),
        targetId: this.strings.required(this.targetId.get(index)),
        targetKind: codeKind(this.targetKind.get(index)),
        targetAuthors: this.targetAuthors.get(index),
        targetAliases: this.targetAliases.get(index),
        roles: this.roles.get(index),
        weight: this.weight.get(index),
      };
      const sourceRef = this.strings.optional(this.sourceRef.get(index));
      const targetTitle = this.strings.optional(this.targetTitle.get(index));
      const targetYear = this.strings.optional(this.targetYear.get(index));
      if (sourceRef !== undefined) row.sourceRef = sourceRef;
      if (targetTitle !== undefined) row.targetTitle = targetTitle;
      if (targetYear !== undefined) row.targetYear = targetYear;
      return row;
    });
  }
}

export type SynthesisCitationGraphBuildPackedHeader = Pick<
  SynthesisCitationGraphBuildRequest,
  "contractVersion" | "scope" | "rolePriority"
>;

export type SynthesisCitationGraphBuildPackedAccumulator = {
  addLibraryNodes(rows: unknown): void;
  addReferences(rows: unknown): void;
  finish(options?: {
    checkpoint?: SynthesisCitationGraphBuildCheckpoint;
  }): SynthesisCitationGraphBuildResult;
};

function strictHeader(value: unknown): SynthesisCitationGraphBuildPackedHeader {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("citation_graph_build_packed_header_invalid");
  }
  const header = value as Record<string, unknown>;
  if (
    Object.keys(header).sort().join("\0") !==
      ["contractVersion", "rolePriority", "scope"].sort().join("\0") ||
    header.contractVersion !== SYNTHESIS_CITATION_GRAPH_BUILD_CONTRACT_VERSION
  ) {
    throw new Error("citation_graph_build_packed_header_invalid");
  }
  return {
    contractVersion: SYNTHESIS_CITATION_GRAPH_BUILD_CONTRACT_VERSION,
    scope: rebuildSynthesisCitationGraphBuildScope(header.scope),
    rolePriority: rebuildSynthesisCitationGraphBuildRolePriority(
      header.rolePriority,
    ),
  };
}

export function createSynthesisCitationGraphBuildPackedAccumulator(
  headerInput: unknown,
): SynthesisCitationGraphBuildPackedAccumulator {
  const header = strictHeader(headerInput);
  const strings = new StringTable();
  const libraryNodes = new PackedLibraryNodes(strings);
  const references = new PackedReferences(strings);
  let finished = false;

  const requireOpen = () => {
    if (finished) {
      throw new Error("citation_graph_build_packed_finished");
    }
  };

  return {
    addLibraryNodes(rows) {
      requireOpen();
      rebuildSynthesisCitationGraphBuildLibraryNodePage(rows).forEach((row) =>
        libraryNodes.push(row),
      );
    },
    addReferences(rows) {
      requireOpen();
      rebuildSynthesisCitationGraphBuildReferencePage(rows).forEach((row) =>
        references.push(row),
      );
    },
    finish(options = {}) {
      requireOpen();
      finished = true;
      const request = rebuildSynthesisCitationGraphBuildRequest({
        ...header,
        libraryNodes: libraryNodes.unpack(),
        references: references.unpack(),
      });
      return computeRebuiltSynthesisCitationGraphBuild(request, {
        checkpoint: options.checkpoint,
      });
    },
  };
}
