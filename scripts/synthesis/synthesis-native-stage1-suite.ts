import path from "node:path";

export const SYNTHESIS_NATIVE_STAGE1_SUITE_ID =
  "synthesis-native-stage1" as const;

const REQUIRED_CORE_NUMBERS = [
  ...Array.from({ length: 17 }, (_, index) => 175 + index),
  193,
  218,
  220,
  222,
  225,
  226,
  ...Array.from({ length: 13 }, (_, index) => 228 + index),
  281,
] as const;
const REQUIRED_CORE_NUMBER_SET = new Set<number>(REQUIRED_CORE_NUMBERS);
const WORKFLOW_PRODUCER_FILES = [
  "tests/synthesis/124-synthesize-topic-workflow.test.ts",
  "tests/synthesis/153-topic-synthesis-suite-renderer.test.ts",
  "tests/synthesis/155-topic-synthesis-split-runtime.test.ts",
  "tests/synthesis/176-topic-planner-runtime.test.ts",
  "tests/workflow-literature-analysis/21-workflow-literature-analysis.test.ts",
  "tests/workflow-literature-workbench-package/45-workflow-note-import-export.test.ts",
  "tests/tooling/323-synthesis-protocol-structure-coverage.test.ts",
  "tests/tooling/synthesis-protocol-execution-evidence.test.ts",
  "tests/tooling/synthesis-workflow-producer-inventory.test.ts",
] as const;

export type SynthesisNativeStage1SuiteSegment = {
  id: string;
  label: string;
  files: string[];
};

export type SynthesisNativeStage1Suite = {
  id: typeof SYNTHESIS_NATIVE_STAGE1_SUITE_ID;
  files: string[];
  segments: SynthesisNativeStage1SuiteSegment[];
};

function normalizeTestPath(filePath: string) {
  return filePath.replace(/\\/g, "/");
}

function coreNumber(filePath: string) {
  return Number(path.basename(filePath).split("-", 1)[0]);
}

export function isSynthesisNativeStage1File(filePath: string) {
  if (
    WORKFLOW_PRODUCER_FILES.some((file) => file === normalizeTestPath(filePath))
  )
    return true;
  const match = /^tests\/synthesis\/(\d+)-synthesis-[^/]+\.test\.ts$/.exec(
    normalizeTestPath(filePath),
  );
  return match !== null && REQUIRED_CORE_NUMBER_SET.has(Number(match[1]));
}

export function resolveSynthesisNativeStage1Suite(
  allTestFiles: readonly string[],
): SynthesisNativeStage1Suite {
  const candidates = new Map<number, string[]>();
  for (const inputPath of allTestFiles) {
    if (!isSynthesisNativeStage1File(inputPath)) continue;
    const filePath = normalizeTestPath(inputPath);
    if (WORKFLOW_PRODUCER_FILES.some((file) => file === filePath)) continue;
    const number = coreNumber(filePath);
    candidates.set(number, [...(candidates.get(number) || []), filePath]);
  }

  const coreFiles = REQUIRED_CORE_NUMBERS.flatMap((number) => {
    const matches = candidates.get(number) || [];
    if (matches.length === 0 || new Set(matches).size !== matches.length) {
      throw new Error(
        `synthesis_native_stage1_inventory_invalid:${number}:${matches.length}`,
      );
    }
    return matches.sort();
  });
  for (const file of WORKFLOW_PRODUCER_FILES) {
    if (
      !allTestFiles.some((candidate) => normalizeTestPath(candidate) === file)
    )
      throw new Error(`synthesis_native_stage1_inventory_missing:${file}`);
  }
  const files = [...new Set([...coreFiles, ...WORKFLOW_PRODUCER_FILES])];

  return {
    id: SYNTHESIS_NATIVE_STAGE1_SUITE_ID,
    files,
    segments: [
      {
        id: "synthesis-native-stage1-client-contracts",
        label: "Synthesis native client and contract tests",
        files: coreFiles.filter((filePath) => coreNumber(filePath) <= 191),
      },
      {
        id: "synthesis-native-stage1-packaging-contracts",
        label: "Synthesis native packaging contracts",
        files: coreFiles.filter((filePath) => coreNumber(filePath) === 193),
      },
      {
        id: "synthesis-native-stage1-cross-language-contracts",
        label: "Synthesis cross-language decoder contracts",
        files: coreFiles.filter((filePath) => coreNumber(filePath) === 218),
      },
      {
        id: "synthesis-native-stage1-production",
        label: "Synthesis native production and recovery tests",
        files: coreFiles.filter((filePath) => coreNumber(filePath) >= 220),
      },
      {
        id: "synthesis-native-stage1-workflow-producers",
        label: "Synthesis workflow producers and coverage reporting",
        files: [...WORKFLOW_PRODUCER_FILES],
      },
    ],
  };
}
