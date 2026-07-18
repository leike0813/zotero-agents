import path from "node:path";

export const SYNTHESIS_SIDECAR_STAGE1_SUITE_ID =
  "synthesis-sidecar-stage1" as const;

const FIRST_CORE_NUMBER = 175;
const ISOLATED_CORE_NUMBER = 202;
const LAST_CORE_NUMBER = 217;

export type SynthesisSidecarStage1SuiteSegment = {
  id: string;
  label: string;
  files: string[];
};

export type SynthesisSidecarStage1Suite = {
  id: typeof SYNTHESIS_SIDECAR_STAGE1_SUITE_ID;
  files: string[];
  segments: SynthesisSidecarStage1SuiteSegment[];
};

function normalizeTestPath(filePath: string) {
  return filePath.replace(/\\/g, "/");
}

export function resolveSynthesisSidecarStage1Suite(
  allTestFiles: readonly string[],
): SynthesisSidecarStage1Suite {
  const candidates = new Map<number, string[]>();
  for (const inputPath of allTestFiles) {
    const filePath = normalizeTestPath(inputPath);
    const match = /^test\/core\/(\d+)-[^/]+\.test\.ts$/.exec(filePath);
    if (!match) {
      continue;
    }
    const coreNumber = Number(match[1]);
    if (coreNumber < FIRST_CORE_NUMBER || coreNumber > LAST_CORE_NUMBER) {
      continue;
    }
    candidates.set(coreNumber, [
      ...(candidates.get(coreNumber) || []),
      filePath,
    ]);
  }

  const files: string[] = [];
  for (
    let coreNumber = FIRST_CORE_NUMBER;
    coreNumber <= LAST_CORE_NUMBER;
    coreNumber += 1
  ) {
    const matches = candidates.get(coreNumber) || [];
    if (matches.length !== 1) {
      throw new Error(
        `synthesis_stage1_suite_inventory_invalid:${coreNumber}:${matches.length}`,
      );
    }
    const filePath = matches[0];
    if (!/^\d+-synthesis-/.test(path.basename(filePath))) {
      throw new Error(`synthesis_stage1_suite_member_invalid:${coreNumber}`);
    }
    files.push(filePath);
  }

  return {
    id: SYNTHESIS_SIDECAR_STAGE1_SUITE_ID,
    files,
    segments: [
      {
        id: "synthesis-sidecar-stage1-175-201",
        label: "Synthesis Stage 1 Core 175-201",
        files: files.filter(
          (filePath) => coreNumber(filePath) < ISOLATED_CORE_NUMBER,
        ),
      },
      {
        id: "synthesis-sidecar-stage1-202",
        label: "Synthesis Stage 1 isolated Core 202",
        files: files.filter(
          (filePath) => coreNumber(filePath) === ISOLATED_CORE_NUMBER,
        ),
      },
      {
        id: "synthesis-sidecar-stage1-203-217",
        label: "Synthesis Stage 1 Core 203-217",
        files: files.filter(
          (filePath) => coreNumber(filePath) > ISOLATED_CORE_NUMBER,
        ),
      },
    ],
  };
}

function coreNumber(filePath: string) {
  return Number(path.basename(filePath).split("-", 1)[0]);
}
