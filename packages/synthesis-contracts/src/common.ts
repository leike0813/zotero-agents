export type SynthesisJsonPrimitive = string | number | boolean | null;

export type SynthesisJsonValue =
  | SynthesisJsonPrimitive
  | SynthesisJsonObject
  | SynthesisJsonValue[];

export type SynthesisJsonObject = {
  [key: string]: SynthesisJsonValue;
};

export const SYNTHESIS_PROTOCOL_VERSION = "1" as const;

export type SynthesisRequestScope = {
  protocolVersion: typeof SYNTHESIS_PROTOCOL_VERSION;
  profileId: string;
  libraryId: number;
  requestId: string;
};

export type SynthesisPageRequest = {
  cursor?: string;
  limit?: number;
};

export type SynthesisPageInfo = {
  cursor: string;
  nextCursor: string;
  hasMore: boolean;
  returned: number;
  total: number;
  limit: number;
};

export type SynthesisClientErrorCode =
  | "invalid_request"
  | "unavailable"
  | "timeout"
  | "conflict"
  | "not_found"
  | "internal";

export class SynthesisClientError extends Error {
  readonly code: SynthesisClientErrorCode;
  readonly details?: SynthesisJsonObject;

  constructor(
    code: SynthesisClientErrorCode,
    message: string,
    details?: SynthesisJsonObject,
  ) {
    super(message);
    this.name = "SynthesisClientError";
    this.code = code;
    this.details = details;
  }
}
