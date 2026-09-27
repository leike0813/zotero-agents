export function createDashboardRuntimeHarness() {
  let intervalCallback: (() => void) | undefined;
  let messageCallback: ((event: { data: unknown }) => void) | undefined;
  const alerts: string[] = [];
  const frameWindow = {
    posted: [] as unknown[],
    postMessage(message: unknown) {
      this.posted.push(message);
    },
  };
  const frame = {
    contentWindow: frameWindow,
    style: {} as Record<string, string>,
    setAttribute() {
      // no-op
    },
    addEventListener() {
      // load is not needed; the host also refreshes on mount.
    },
    remove() {
      // no-op
    },
  };
  const document = {
    createElement() {
      return frame;
    },
  };
  const root = {
    innerHTML: "",
    ownerDocument: document,
    appendChild() {
      // no-op
    },
  };
  const hostWindow = {
    document,
    setInterval(callback: () => void) {
      intervalCallback = callback;
      return 1;
    },
    clearInterval() {
      // no-op
    },
    setTimeout(callback: () => void) {
      return setTimeout(callback, 0) as unknown as number;
    },
    clearTimeout(timer: number) {
      clearTimeout(timer as unknown as ReturnType<typeof setTimeout>);
    },
    addEventListener(
      type: string,
      callback: (event: { data: unknown }) => void,
    ) {
      if (type === "message") messageCallback = callback;
    },
    removeEventListener() {
      // no-op
    },
    alert(message: string) {
      alerts.push(message);
    },
  };

  return {
    root: root as unknown as HTMLElement,
    hostWindow: hostWindow as unknown as Window,
    frameWindow,
    alerts,
    dispatchAction(action: string, payload: Record<string, unknown>) {
      messageCallback?.({
        data: { type: "dashboard:action", action, payload },
      });
    },
    runInterval() {
      intervalCallback?.();
    },
  };
}

export function replaceGlobalProperty(key: string, value: unknown) {
  const runtime = globalThis as Record<string, unknown>;
  const previous = Object.getOwnPropertyDescriptor(runtime, key);
  Object.defineProperty(runtime, key, {
    configurable: true,
    value,
    writable: true,
  });
  return () => {
    if (previous) Object.defineProperty(runtime, key, previous);
    else delete runtime[key];
  };
}

export async function flushDashboardRuntime() {
  for (let index = 0; index < 5; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
