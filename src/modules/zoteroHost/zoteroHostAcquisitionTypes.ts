import type { PortableItemRef } from "../../workflows/types";

export const ACQUISITION_LIMITS = Object.freeze({
  authenticationMs: 10 * 60 * 1000,
  profiles: 8,
  pagesPerTask: 8,
  downloadsPerTask: 100,
  activeDownloads: 2,
  textChars: 8000,
  targetsPerPage: 40,
  targetsPerDocument: 400,
  labelChars: 240,
  titleChars: 500,
  downloadBytes: 64 * 1024 * 1024,
  downloadMs: 120_000,
  validationMs: 30_000,
  pollAfterMs: 1000,
});

export const ACQUISITION_REASONS = [
  "authentication_required",
  "authentication_timeout",
  "window_closed",
  "canceled",
  "released",
  "stale_target",
  "access_unavailable",
  "unsupported_format",
  "non_pdf",
  "unreadable_pdf",
  "identity_mismatch",
  "network_failure",
  "resource_limit",
  "profile_signed_out",
  "runtime_unavailable",
] as const;
export type AcquisitionReason = (typeof ACQUISITION_REASONS)[number];
export type AcquisitionPageState =
  | "loading"
  | "ready"
  | "awaiting_user"
  | "closed"
  | "timed_out"
  | "released"
  | "failed";
export type AcquisitionProfile = { authProfileRef: string; name: string };
export type AcquisitionPage = {
  sessionRef: string;
  pageRef: string;
  state: AcquisitionPageState;
};
export type AcquisitionObservation = AcquisitionPage & {
  revision: string;
  origin: string;
  title: string;
  text: string;
  targets: Array<{ targetRef: string; label: string; kind: "link" }>;
  nextCursor: string | null;
  pollAfterMs: number;
  authDeadline: number | null;
  reason: AcquisitionReason | null;
};
export type AcquisitionFile = {
  fileId: string;
  contentType: "application/pdf";
  size: number;
  pages: number;
  readable: true;
  title: string;
  identityMatched: true;
};
export type AcquisitionDownload = {
  downloadRef: string;
  pollAfterMs: number;
} & (
  | { state: "pending" | "running"; reason: null; file: null }
  | { state: "ready"; reason: null; file: AcquisitionFile }
  | { state: "failed" | "canceled"; reason: AcquisitionReason; file: null }
);

export type AcquisitionInputs = {
  profiles: Record<string, never>;
  open: { parentRef: PortableItemRef; authProfileRef?: string };
  observe: { pageRef: string; cursor?: string };
  navigate: { pageRef: string; url: string; authentication?: boolean };
  activate: { pageRef: string; revision: string; targetRef: string };
  download: {
    pageRef: string;
    revision: string;
    targetRef: string;
    idempotencyKey: string;
  };
  get_download: { downloadRef: string };
  cancel_download: { downloadRef: string };
  release: { sessionRef: string };
};
export type AcquisitionOutputs = {
  profiles: { profiles: AcquisitionProfile[] };
  open: AcquisitionPage;
  observe: AcquisitionObservation;
  navigate: AcquisitionPage;
  activate: AcquisitionPage;
  download: AcquisitionDownload;
  get_download: AcquisitionDownload;
  cancel_download: AcquisitionDownload;
  release: { sessionRef: string; state: "released" };
};
