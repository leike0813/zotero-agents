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
  ...Array.from({ length: 12 }, (_, index) => 228 + index),
] as const;
const REQUIRED_CORE_NUMBER_SET = new Set<number>(REQUIRED_CORE_NUMBERS);

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

export function resolveSynthesisNativeStage1Suite(
  allTestFiles: readonly string[],
): SynthesisNativeStage1Suite {
  const candidates = new Map<number, string[]>();
  for (const inputPath of allTestFiles) {
    const filePath = normalizeTestPath(inputPath);
    const match = /^test\/core\/(\d+)-synthesis-[^/]+\.test\.ts$/.exec(
      filePath,
    );
    if (!match) continue;
    const number = Number(match[1]);
    if (!REQUIRED_CORE_NUMBER_SET.has(number)) continue;
    candidates.set(number, [...(candidates.get(number) || []), filePath]);
  }

  const files = REQUIRED_CORE_NUMBERS.flatMap((number) => {
    const matches = candidates.get(number) || [];
    if (matches.length === 0 || new Set(matches).size !== matches.length) {
      throw new Error(
        `synthesis_native_stage1_inventory_invalid:${number}:${matches.length}`,
      );
    }
    return matches.sort();
  });

  return {
    id: SYNTHESIS_NATIVE_STAGE1_SUITE_ID,
    files,
    segments: [
      {
        id: "synthesis-native-stage1-client-contracts",
        label: "Synthesis native client and contract tests",
        files: files.filter((filePath) => coreNumber(filePath) <= 191),
      },
      {
        id: "synthesis-native-stage1-packaging-contracts",
        label: "Synthesis native packaging and cross-language contracts",
        files: files.filter((filePath) =>
          [193, 218].includes(coreNumber(filePath)),
        ),
      },
      {
        id: "synthesis-native-stage1-production",
        label: "Synthesis native production and recovery tests",
        files: files.filter((filePath) => coreNumber(filePath) >= 220),
      },
    ],
  };
}
