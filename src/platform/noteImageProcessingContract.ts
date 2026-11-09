export type NoteImageProcessingOptions = {
  maxLongEdge: number;
  targetBytes: number;
  hardMaxBytes: number;
  outputMimeType: "image/jpeg" | "image/png";
  preserveSourceBytes: boolean;
};

export type NoteImageRadarDimension = {
  name: string;
  score: number | null;
};

export type NoteImageProcessingBytesRequest = {
  bytes: Uint8Array;
  mimeType: string;
  radar?: never;
  options: NoteImageProcessingOptions;
};

export type NoteImageProcessingRadarRequest = {
  radar: NoteImageRadarDimension[];
  bytes?: never;
  mimeType?: never;
  options: NoteImageProcessingOptions;
};

export type NoteImageProcessingRequest =
  | NoteImageProcessingBytesRequest
  | NoteImageProcessingRadarRequest;

export function isNoteImageRadarRequest(
  request: NoteImageProcessingRequest,
): request is NoteImageProcessingRadarRequest {
  return "radar" in request;
}

export type NoteImageProcessingResult = {
  bytes: Uint8Array;
  mimeType: "image/jpeg" | "image/png";
  width: number;
  height: number;
};

export type NoteImageProcessingResponse =
  | { ok: true; result: NoteImageProcessingResult }
  | {
      ok: false;
      error: "unavailable" | "decode" | "bytes";
      message: string;
      observed?: number;
    };
