import type {
  SynthesisSidecarErrorCode,
  SynthesisSidecarFailure,
} from "../../../packages/synthesis-contracts/src/sidecarSystem.js";
import type { SynthesisJsonObject } from "../../../packages/synthesis-contracts/src/common.js";

export class SidecarRuntimeError extends Error {
  readonly status: number;
  readonly code: SynthesisSidecarErrorCode;
  readonly retryable: boolean;
  readonly details: SynthesisJsonObject;

  constructor(args: {
    status: number;
    code: SynthesisSidecarErrorCode;
    message: string;
    retryable?: boolean;
    details?: SynthesisJsonObject;
  }) {
    super(args.message);
    this.name = "SidecarRuntimeError";
    this.status = args.status;
    this.code = args.code;
    this.retryable = args.retryable === true;
    this.details = args.details ?? {};
  }
}

export function toSidecarRuntimeError(error: unknown): SidecarRuntimeError {
  if (error instanceof SidecarRuntimeError) {
    return error;
  }
  return new SidecarRuntimeError({
    status: 500,
    code: "internal_error",
    message: "The Synthesis sidecar request failed.",
  });
}

export function buildFailure(args: {
  error: SidecarRuntimeError;
  requestId?: string;
  serviceInstanceId: string;
}): SynthesisSidecarFailure {
  return {
    ok: false,
    requestId: args.requestId ?? "",
    serviceInstanceId: args.serviceInstanceId,
    error: {
      code: args.error.code,
      message: args.error.message,
      retryable: args.error.retryable,
      details: args.error.details,
    },
  };
}
