import type { RequestPermissionOutcome } from "./acpProtocol";
import type { AcpPendingPermissionRequest } from "./acpTypes";

export type AcpQueuedPermissionRequest = AcpPendingPermissionRequest & {
  resolve: (outcome: RequestPermissionOutcome) => void;
};

export class AcpPermissionQueue {
  private readonly entries: AcpQueuedPermissionRequest[] = [];

  get size() {
    return this.entries.length;
  }

  active() {
    return this.entries[0] || null;
  }

  enqueue(request: AcpQueuedPermissionRequest) {
    if (this.entries.some((entry) => entry.requestId === request.requestId)) {
      request.resolve({ outcome: "cancelled" });
      return false;
    }
    this.entries.push(request);
    return true;
  }

  resolveActive(
    requestIdRaw: string | undefined,
    outcome: RequestPermissionOutcome,
  ) {
    const active = this.active();
    if (!active) {
      return null;
    }
    const requestId = String(requestIdRaw || "").trim();
    if (requestId && requestId !== active.requestId) {
      return null;
    }
    this.entries.shift();
    active.resolve(outcome);
    return active;
  }

  cancelAll() {
    const pending = this.entries.splice(0);
    for (const entry of pending) {
      entry.resolve({ outcome: "cancelled" });
    }
    return pending;
  }
}
