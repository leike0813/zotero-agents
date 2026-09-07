import { isZoteroRuntime } from "../zotero/workflow-test-utils";

/** Consumer tests only. This passthrough provides no native rollback evidence. */
export function installNodeZoteroTransactionStub(): () => void {
  if (isZoteroRuntime()) return () => {};
  const descriptor = Object.getOwnPropertyDescriptor(Zotero, "DB");
  Object.defineProperty(Zotero, "DB", {
    configurable: true,
    value: { executeTransaction: (run: () => Promise<unknown>) => run() },
  });
  return () => {
    if (descriptor) Object.defineProperty(Zotero, "DB", descriptor);
    else Reflect.deleteProperty(Zotero, "DB");
  };
}
