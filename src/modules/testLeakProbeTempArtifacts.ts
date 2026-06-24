type LeakProbeTempArtifactKind =
  | "zip-extracted-dir"
  | "tag-regulator-valid-tags-yaml";

type LeakProbeTempArtifactRecord = {
  kind: LeakProbeTempArtifactKind;
  path: string;
  createdAt: string;
  releasedAt?: string;
};

type LeakProbeTempArtifactSnapshot = {
  totalCreatedCount: number;
  totalActiveCount: number;
  zipExtractedDir: {
    createdCount: number;
    activeCount: number;
    activeSample: string[];
  };
  tagRegulatorValidTagsYaml: {
    createdCount: number;
    activeCount: number;
    activeSample: string[];
  };
};

const records = new Map<string, LeakProbeTempArtifactRecord>();

function nowIso() {
  return new Date().toISOString();
}

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function isLeakProbeEnabled() {
  if (typeof process !== "undefined" && process.env) {
    const fromProcess = String(process.env.ZOTERO_TEST_LEAK_PROBE || "")
      .trim()
      .toLowerCase();
    if (
      fromProcess === "1" ||
      fromProcess === "true" ||
      fromProcess === "yes"
    ) {
      return true;
    }
  }
  const runtime = globalThis as {
    Services?: { env?: { get?: (key: string) => string } };
  };
  if (typeof runtime.Services?.env?.get === "function") {
    try {
      const fromServices = String(
        runtime.Services.env.get("ZOTERO_TEST_LEAK_PROBE") || "",
      )
        .trim()
        .toLowerCase();
      return (
        fromServices === "1" ||
        fromServices === "true" ||
        fromServices === "yes"
      );
    } catch {
      return false;
    }
  }
  return false;
}

function listByKind(kind: LeakProbeTempArtifactKind) {
  const created: LeakProbeTempArtifactRecord[] = [];
  const active: LeakProbeTempArtifactRecord[] = [];
  for (const record of records.values()) {
    if (record.kind !== kind) {
      continue;
    }
    created.push(record);
    if (!record.releasedAt) {
      active.push(record);
    }
  }
  return { created, active };
}

function buildKindSnapshot(kind: LeakProbeTempArtifactKind) {
  const grouped = listByKind(kind);
  return {
    createdCount: grouped.created.length,
    activeCount: grouped.active.length,
    activeSample: grouped.active.slice(0, 12).map((entry) => entry.path),
  };
}

export function recordLeakProbeTempArtifactForTests(args: {
  kind: LeakProbeTempArtifactKind;
  path: string;
}) {
  if (!isLeakProbeEnabled()) {
    return;
  }
  const path = normalizeString(args.path);
  if (!path) {
    return;
  }
  const kind = args.kind;
  const existing = records.get(path);
  if (existing) {
    existing.kind = kind;
    existing.releasedAt = undefined;
    return;
  }
  records.set(path, {
    kind,
    path,
    createdAt: nowIso(),
  });
}

export function releaseLeakProbeTempArtifactForTests(pathRaw: string) {
  if (!isLeakProbeEnabled()) {
    return;
  }
  const path = normalizeString(pathRaw);
  if (!path) {
    return;
  }
  const existing = records.get(path);
  if (!existing || existing.releasedAt) {
    return;
  }
  existing.releasedAt = nowIso();
}

export function getLeakProbeTempArtifactSnapshotForTests(): LeakProbeTempArtifactSnapshot {
  const totalCreatedCount = records.size;
  let totalActiveCount = 0;
  for (const record of records.values()) {
    if (!record.releasedAt) {
      totalActiveCount += 1;
    }
  }
  return {
    totalCreatedCount,
    totalActiveCount,
    zipExtractedDir: buildKindSnapshot("zip-extracted-dir"),
    tagRegulatorValidTagsYaml: buildKindSnapshot(
      "tag-regulator-valid-tags-yaml",
    ),
  };
}

export function resetLeakProbeTempArtifactsForTests() {
  records.clear();
}
