import type { SynthesisTopicsClient } from "./topics";
import type {
  SynthesisMaintenanceClient,
  SynthesisNotificationsClient,
  SynthesisSystemClient,
} from "./lifecycle";

export interface SynthesisClient {
  readonly topics: SynthesisTopicsClient;
  readonly system: SynthesisSystemClient;
  readonly maintenance: SynthesisMaintenanceClient;
  readonly notifications: SynthesisNotificationsClient;
}
