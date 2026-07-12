export type PromiseSettlementWatchdog = {
  clear: () => void;
};

export function watchPromiseSettlement(
  promise: Promise<unknown>,
  timeoutMs: number,
  onTimeout: () => void | Promise<void>,
): PromiseSettlementWatchdog {
  let active = true;
  const timer = setTimeout(
    () => {
      if (!active) {
        return;
      }
      active = false;
      void Promise.resolve(onTimeout()).catch(() => undefined);
    },
    Math.max(0, timeoutMs),
  );
  const clear = () => {
    if (!active) {
      return;
    }
    active = false;
    clearTimeout(timer);
  };
  void promise.then(clear, clear);
  return { clear };
}
