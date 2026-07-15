import type { SynthesisConceptsClient } from "./concepts";
import type { SynthesisTagsClient } from "./tags";
import type { SynthesisTopicsClient } from "./topics";
import type { SynthesisTopicGraphClient } from "./topicGraph";
import type {
  SynthesisMaintenanceClient,
  SynthesisNotificationsClient,
  SynthesisSystemClient,
} from "./lifecycle";
import type {
  SynthesisArtifactsClient,
  SynthesisWorkflowApplyClient,
} from "./workflow";
import type { SynthesisWorkbenchClient } from "./workbench";
import type { SynthesisGraphClient } from "./graph";
import type { SynthesisReferencesClient } from "./references";
import type { SynthesisSyncClient } from "./sync";
import type { SynthesisDebugClient } from "./debug";
import type { SynthesisLibraryIndexClient } from "./libraryIndex";
import type { SynthesisWorkflowReviewClient } from "./workflowReview";

export interface SynthesisClient {
  readonly concepts: SynthesisConceptsClient;
  readonly graph: SynthesisGraphClient;
  readonly references: SynthesisReferencesClient;
  readonly sync: SynthesisSyncClient;
  readonly topics: SynthesisTopicsClient;
  readonly topicGraph: SynthesisTopicGraphClient;
  readonly system: SynthesisSystemClient;
  readonly maintenance: SynthesisMaintenanceClient;
  readonly notifications: SynthesisNotificationsClient;
  readonly workflowApply: SynthesisWorkflowApplyClient;
  readonly artifacts: SynthesisArtifactsClient;
  readonly tags: SynthesisTagsClient;
  readonly workbench: SynthesisWorkbenchClient;
  readonly libraryIndex: SynthesisLibraryIndexClient;
  readonly workflowReview: SynthesisWorkflowReviewClient;
  readonly debug: SynthesisDebugClient;
}
