// Page-side panel DTO and controller state types for the synthesis workbench
// bundle.
//
// The page consumes the shared portable wire contract and projects locally;
// region components in ./components define and export
// their own selection types, which this module assembles into the panel DTO
// consumed by the chrome renderer.

import type {
  SynthesisWorkbenchActionName,
  SynthesisWorkbenchActionOperation,
  SynthesisWorkbenchActionPayload,
  SynthesisWorkbenchArtifactReaderPayload,
  SynthesisWorkbenchGraphPagePayload,
  SynthesisWorkbenchHostShape,
  SynthesisWorkbenchMessageKey,
  SynthesisWorkbenchPaperDigestResult,
  SynthesisWorkbenchSnapshot,
  SynthesisWorkbenchSurfaceName,
  SynthesisWorkbenchTab,
} from "../shared/synthesisWorkbenchWireContract";
import type {
  SynthesisWorkbenchShellSelection,
  SynthesisWorkbenchTopbarSelection,
} from "./components/ShellRegion";
import type {
  SynthesisWorkbenchChromeSelection,
  SynthesisWorkbenchSidecarSelection,
} from "./components/ChromeRegion";
import type { SynthesisBusinessSurface } from "./synthesisSurfaceProjection";
import type { SynthesisRegistryReviewState } from "./components/registry/registryTypes";
import type { SynthesisReviewCenterReferenceReviewControl } from "./components/reviewCenter/ReviewCenterRegion";

// Page and host consume the same portable snapshot DTOs.
export type SynthesisWorkbenchPageSnapshot = SynthesisWorkbenchSnapshot;

export type SynthesisWorkbenchActionSender = <
  Action extends SynthesisWorkbenchActionName,
>(
  action: Action,
  payload?: SynthesisWorkbenchActionPayload<Action>,
) => void;

/**
 * Page-local intent channel used by regions before the controller decides
 * whether an intent crosses the host boundary. Local macros are deliberately
 * outside the wire action map; only SynthesisWorkbenchActionSender may reach
 * the host bridge.
 */
export type SynthesisWorkbenchIntentSender = (
  action: string,
  payload?: Record<string, unknown>,
) => void;

export type SynthesisWorkbenchI18nState = {
  locale: string;
  messages: Record<SynthesisWorkbenchMessageKey, string>;
};

// Local UI state owned by the controller (plain object, no Preact store).
export type SynthesisWorkbenchUiState = {
  // Sidebar collapse toggle (legacy state.sidebarExpanded); page-local, never
  // reaches the host.
  sidebarExpanded: boolean;
  // Background job popover open state (legacy state.jobPopoverOpen); enters
  // the chrome region selection because it is user-visible chrome state.
  jobPopoverOpen: boolean;
};

export type SynthesisWorkbenchUiPatch = Partial<SynthesisWorkbenchUiState>;

export type SynthesisWorkbenchSurfaceRuntime = {
  status: "missing" | "loading" | "ready" | "stale" | "failed";
  revision: number;
  error?: string;
  errorCode?: string;
  transient?: boolean;
  requestId?: number;
  snapshot?: SynthesisWorkbenchPageSnapshot;
};

export type SynthesisWorkbenchControllerState = {
  snapshot: SynthesisWorkbenchPageSnapshot | null;
  i18n: SynthesisWorkbenchI18nState;
  ui: SynthesisWorkbenchUiState;
  hostShape: SynthesisWorkbenchHostShape;
  // Surface runtime registry keyed by surfaceRuntimeKey (index surfaces are
  // scoped per registry scope filter).
  surfaces: Record<string, SynthesisWorkbenchSurfaceRuntime>;
  acceptedSurfaceRequestIds: Partial<
    Record<SynthesisWorkbenchSurfaceName, number>
  >;
  // Locally tracked hostCommand operations not yet echoed by the host
  // (legacy state.localPendingActions / state.lastLocalAction).
  localPendingActions: Map<string, SynthesisWorkbenchActionOperation>;
  lastLocalAction?: SynthesisWorkbenchActionOperation;
  // Timed statusbar entry expirations (legacy state.statusbarExpirations).
  statusbarExpirations: Map<string, number>;
  lastChromeSignature?: string;
  // Reader stash: topic detail payloads use the host slot type and stay
  // opaque to the chrome/shell regions (B2 reader surface owns projection).
  topicDetail?: unknown;
  artifactReader?: SynthesisWorkbenchArtifactReaderPayload;
  digestResult?: SynthesisWorkbenchPaperDigestResult;
  // Latest accepted graph page, including accumulated rows for its generation.
  latestGraphPage?: SynthesisWorkbenchGraphPagePayload;
  registryReview?: SynthesisRegistryReviewState;
  referenceReview?: SynthesisReviewCenterReferenceReviewControl;
  standaloneDigests?: unknown;
};

// Loading/error selection used while a surface-owned snapshot is unavailable;
// ready snapshots carry the concrete business selection below.
export type SynthesisWorkbenchSurfacePlaceholderSelection = {
  surface: SynthesisWorkbenchSurfaceName;
  status: SynthesisWorkbenchSurfaceRuntime["status"];
  title: string;
  subtitle: string;
  isError: boolean;
};

export type SynthesisWorkbenchPanel = {
  hostShape: SynthesisWorkbenchHostShape;
  selectedTab: SynthesisWorkbenchTab;
  // Null in standalone export shapes: the shell (sidebar) is hosted-only.
  shell: SynthesisWorkbenchShellSelection | null;
  topbar: SynthesisWorkbenchTopbarSelection | null;
  // Null in standalone export shapes: the action statusbar is hosted-only.
  chrome: SynthesisWorkbenchChromeSelection | null;
  sidecar: SynthesisWorkbenchSidecarSelection | null;
  surface: SynthesisWorkbenchSurfacePlaceholderSelection | null;
  business?: SynthesisBusinessSurface;
  referenceReview?: SynthesisReviewCenterReferenceReviewControl;
  i18n?: SynthesisWorkbenchI18nState;
};
