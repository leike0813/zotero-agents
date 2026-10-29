export type NoteImageProcessingRequest = {
  bytes: Uint8Array;
  mimeType: string;
  options: {
    maxLongEdge: number;
    targetBytes: number;
    hardMaxBytes: number;
    outputMimeType: "image/jpeg" | "image/png";
    preserveSourceBytes: boolean;
  };
};

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
