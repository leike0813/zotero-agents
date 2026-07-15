import type { SynthesisTopicsClient } from "./topics";
import type {
  SynthesisMaintenanceClient,
  SynthesisNotificationsClient,
  SynthesisSystemClient,
} from "./lifecycle";
import type {
  SynthesisArtifactsClient,
  SynthesisTagsClient,
  SynthesisWorkflowApplyClient,
} from "./workflow";
import type { SynthesisWorkbenchClient } from "./workbench";
import type { SynthesisGraphClient } from "./graph";

export interface SynthesisClient {
  readonly graph: SynthesisGraphClient;
  readonly topics: SynthesisTopicsClient;
  readonly system: SynthesisSystemClient;
  readonly maintenance: SynthesisMaintenanceClient;
  readonly notifications: SynthesisNotificationsClient;
  readonly workflowApply: SynthesisWorkflowApplyClient;
  readonly artifacts: SynthesisArtifactsClient;
  readonly tags: SynthesisTagsClient;
  readonly workbench: SynthesisWorkbenchClient;
}
