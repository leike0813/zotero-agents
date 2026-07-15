import type { SynthesisConceptsClient } from "./concepts";
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
import type { SynthesisReferencesClient } from "./references";

export interface SynthesisClient {
  readonly concepts: SynthesisConceptsClient;
  readonly graph: SynthesisGraphClient;
  readonly references: SynthesisReferencesClient;
  readonly topics: SynthesisTopicsClient;
  readonly system: SynthesisSystemClient;
  readonly maintenance: SynthesisMaintenanceClient;
  readonly notifications: SynthesisNotificationsClient;
  readonly workflowApply: SynthesisWorkflowApplyClient;
  readonly artifacts: SynthesisArtifactsClient;
  readonly tags: SynthesisTagsClient;
  readonly workbench: SynthesisWorkbenchClient;
}
