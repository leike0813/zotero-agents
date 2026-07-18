import type {
  SynthesisDurableBundleDraft,
  SynthesisDurableBundleExport,
  SynthesisDurableBundleSink,
  SynthesisDurableBundleSource,
  createSynthesisDurableBundleCodec,
} from "../../synthesis-contracts/src/durableBundle.js";

export type SynthesisDurableBundleRepositoryTopicBasis = {
  topicId: string;
  pathId: string;
  manifestHash: string;
  artifactHash: string;
  metadataHash: string;
  bundleHash: string;
};

export type SynthesisDurableBundleRepositoryCapture = {
  aggregateBasis: unknown;
  topicBases: SynthesisDurableBundleRepositoryTopicBasis[];
  drafts: SynthesisDurableBundleDraft[];
};

export type SynthesisDurableBundleApplicationRepository = {
  captureDurableBundleState():
    | SynthesisDurableBundleRepositoryCapture
    | Promise<SynthesisDurableBundleRepositoryCapture>;
};

export type SynthesisDurableBundleCanonicalCapture = {
  basis: string;
  drafts: SynthesisDurableBundleDraft[];
};

export type SynthesisDurableBundleCanonicalSource = {
  readCurrentAssets(
    topic: SynthesisDurableBundleRepositoryTopicBasis,
  ):
    | SynthesisDurableBundleCanonicalCapture
    | Promise<SynthesisDurableBundleCanonicalCapture>;
  inspectCurrent(
    topic: SynthesisDurableBundleRepositoryTopicBasis,
  ): string | Promise<string>;
};

export type SynthesisDurableBundleBuildSummary = {
  bundleCount: number;
  entityCount: number;
  topicCount: number;
  manifestHash: string;
};

export type SynthesisDurableBundleBuildResult = SynthesisDurableBundleExport & {
  summary: SynthesisDurableBundleBuildSummary;
};

export class SynthesisDurableBundleApplicationError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "SynthesisDurableBundleApplicationError";
  }
}

type Codec = ReturnType<typeof createSynthesisDurableBundleCodec>;

type Options = {
  repository: SynthesisDurableBundleApplicationRepository;
  canonicalSource?: SynthesisDurableBundleCanonicalSource;
  codec: Codec;
  now?: () => string;
  producerVersion?: string;
};

const sortedTopicBases = (
  rows: readonly SynthesisDurableBundleRepositoryTopicBasis[],
) =>
  [...rows].sort(
    (left, right) =>
      left.topicId.localeCompare(right.topicId) ||
      left.pathId.localeCompare(right.pathId),
  );

export function createSynthesisDurableBundleApplication(options: Options) {
  const now = options.now ?? (() => new Date().toISOString());
  let stopping = false;
  let active: Promise<unknown> | null = null;

  const run = async <T>(operation: () => T | Promise<T>): Promise<T> => {
    if (stopping) throw new SynthesisDurableBundleApplicationError("stopping");
    if (active) {
      throw new SynthesisDurableBundleApplicationError(
        "durable_bundle_export_busy",
      );
    }
    const task = Promise.resolve().then(operation);
    active = task;
    try {
      return await task;
    } finally {
      if (active === task) active = null;
    }
  };

  const sameRepositoryBasis = (
    first: SynthesisDurableBundleRepositoryCapture,
    second: SynthesisDurableBundleRepositoryCapture,
  ) =>
    options.codec.canonicalText(first.aggregateBasis) ===
      options.codec.canonicalText(second.aggregateBasis) &&
    options.codec.canonicalText(sortedTopicBases(first.topicBases)) ===
      options.codec.canonicalText(sortedTopicBases(second.topicBases));

  const buildExport = (sink?: SynthesisDurableBundleSink) =>
    run(async (): Promise<SynthesisDurableBundleBuildResult> => {
      const first = await options.repository.captureDurableBundleState();
      const canonicalDrafts: SynthesisDurableBundleDraft[] = [];
      const canonicalBases = new Map<string, string>();
      for (const topic of sortedTopicBases(first.topicBases)) {
        if (!options.canonicalSource) {
          throw new SynthesisDurableBundleApplicationError(
            "canonical_source_required",
          );
        }
        const current = await options.canonicalSource.readCurrentAssets(topic);
        canonicalBases.set(`${topic.topicId}\n${topic.pathId}`, current.basis);
        canonicalDrafts.push(...current.drafts);
      }

      const second = await options.repository.captureDurableBundleState();
      if (!sameRepositoryBasis(first, second)) {
        throw new SynthesisDurableBundleApplicationError("basis_superseded");
      }
      for (const topic of sortedTopicBases(second.topicBases)) {
        const expected = canonicalBases.get(
          `${topic.topicId}\n${topic.pathId}`,
        );
        const actual = await options.canonicalSource?.inspectCurrent(topic);
        if (!expected || actual !== expected) {
          throw new SynthesisDurableBundleApplicationError("basis_superseded");
        }
      }

      const built = options.codec.buildExport({
        drafts: [...first.drafts, ...canonicalDrafts],
        generatedAt: now(),
        producerVersion: options.producerVersion,
      });
      if (sink) {
        for (const asset of built.assets) {
          await sink.writeAssetText(asset.path, asset.text);
        }
        await sink.writeManifestText(built.manifestText);
      }
      return {
        ...built,
        summary: {
          bundleCount: built.assets.length,
          entityCount: built.entries.length,
          topicCount: first.topicBases.length,
          manifestHash: built.manifest.manifest_hash,
        },
      };
    });

  const readAndVerify = (source: SynthesisDurableBundleSource) =>
    run(() => options.codec.readAndVerify(source));

  const stopAdmission = () => {
    stopping = true;
  };

  const shutdown = async () => {
    stopAdmission();
    if (active) await active.catch(() => undefined);
  };

  return { buildExport, readAndVerify, stopAdmission, shutdown };
}
