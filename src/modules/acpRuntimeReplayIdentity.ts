export const ACP_RUNTIME_REPLAY_PHASE_MAX_LENGTH = 80;
export const ACP_RUNTIME_REPLAY_SAMPLE_SLUG_MAX_LENGTH = 64;
export const ACP_RUNTIME_REPLAY_PHASE_SLUG_MAX_LENGTH = 48;
export const ACP_RUNTIME_REPLAY_CADENCE_SLUG_MAX_LENGTH = 16;

export type AcpRuntimeReplayPhaseValidation =
  | { value: string; valid: true }
  | {
      value: string;
      valid: false;
      errorCode: "required" | "too-long" | "control-character";
    };

function normalizeDisplayText(value: unknown) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/gu, " ")
    .trim();
}

export function normalizeAcpRuntimeReplayPhase(
  value: unknown,
): AcpRuntimeReplayPhaseValidation {
  const normalized = normalizeDisplayText(value);
  if (!normalized) return { value: "", valid: false, errorCode: "required" };
  if (/\p{Cc}/u.test(normalized)) {
    return {
      value: normalized,
      valid: false,
      errorCode: "control-character",
    };
  }
  if (Array.from(normalized).length > ACP_RUNTIME_REPLAY_PHASE_MAX_LENGTH) {
    return { value: normalized, valid: false, errorCode: "too-long" };
  }
  return { value: normalized, valid: true };
}

export function deriveAcpRuntimeReplaySampleName(tracePath: unknown) {
  const basename =
    String(tracePath ?? "")
      .split(/[\\/]/u)
      .pop() || "";
  let sample = basename;
  if (sample.toLowerCase().endsWith(".partial")) sample = sample.slice(0, -8);
  if (sample.toLowerCase().endsWith(".ndjson")) sample = sample.slice(0, -7);
  if (sample.toLowerCase().startsWith("acp-trace-")) sample = sample.slice(10);
  return normalizeDisplayText(sample) || "trace";
}

export function slugAcpRuntimeReplayArtifactSegment(
  value: unknown,
  maxLength: number,
  fallback: string,
) {
  const slug = normalizeDisplayText(value)
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
  return Array.from(slug || fallback)
    .slice(0, maxLength)
    .join("");
}

let artifactNonce = 0;

export function buildAcpRuntimeReplayArtifactStem(args: {
  sampleName: string;
  phase: string;
  cadence: string;
  createdAtMs?: number;
}) {
  artifactNonce += 1;
  const timestamp = new Date(args.createdAtMs ?? Date.now())
    .toISOString()
    .replace(/[:.]/gu, "-");
  const sampleSlug = slugAcpRuntimeReplayArtifactSegment(
    args.sampleName,
    ACP_RUNTIME_REPLAY_SAMPLE_SLUG_MAX_LENGTH,
    "trace",
  );
  const phaseSlug = slugAcpRuntimeReplayArtifactSegment(
    args.phase,
    ACP_RUNTIME_REPLAY_PHASE_SLUG_MAX_LENGTH,
    "stage",
  );
  const cadenceSlug = slugAcpRuntimeReplayArtifactSegment(
    args.cadence,
    ACP_RUNTIME_REPLAY_CADENCE_SLUG_MAX_LENGTH,
    "cadence",
  );
  return `acp-replay-${sampleSlug}__${phaseSlug}__${cadenceSlug}__${timestamp}-${artifactNonce}`;
}

export function resetAcpRuntimeReplayArtifactNonceForTests() {
  artifactNonce = 0;
}
