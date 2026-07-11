export const BUFFERED_WRITE_DELAY_MS = 2000;
export const BUFFERED_WRITE_MAX_BYTES = 128 * 1024;
export const BUFFERED_WRITE_MAX_ENTRIES = 256;

export type BufferedWriteDiagnostics = {
  logicalEntries: number;
  physicalWriteCycles: number;
  bytes: number;
  forcedFlushes: number;
  failures: number;
  retries: number;
  pendingEntries: number;
  pendingBytes: number;
};

type Sink<T> = (entries: T[]) => Promise<void>;

type PendingEntry<T> = {
  value: T;
  bytes: number;
};

type KeyState<T> = {
  key: string;
  owner: string;
  sink: Sink<T>;
  pending: PendingEntry<T>[];
  pendingBytes: number;
  timer: ReturnType<typeof setTimeout> | null;
  draining: Promise<void> | null;
  failed: boolean;
  diagnostics: Omit<
    BufferedWriteDiagnostics,
    "pendingEntries" | "pendingBytes"
  >;
};

const states = new Map<string, KeyState<unknown>>();

function clearTimer(state: KeyState<unknown>) {
  if (state.timer) {
    clearTimeout(state.timer);
    state.timer = null;
  }
}

function schedule(state: KeyState<unknown>) {
  if (state.timer || state.draining || state.pending.length === 0) {
    return;
  }
  state.timer = setTimeout(() => {
    state.timer = null;
    void drain(state).catch(() => undefined);
  }, BUFFERED_WRITE_DELAY_MS);
}

async function drain(state: KeyState<unknown>) {
  if (state.draining) {
    await state.draining;
    return;
  }
  if (state.pending.length === 0) {
    return;
  }
  clearTimer(state);
  const batch = state.pending;
  const batchBytes = state.pendingBytes;
  state.pending = [];
  state.pendingBytes = 0;
  const wasRetry = state.failed;
  const write = (async () => {
    state.diagnostics.physicalWriteCycles += 1;
    if (wasRetry) {
      state.diagnostics.retries += 1;
    }
    try {
      await state.sink(batch.map((entry) => entry.value));
      state.failed = false;
    } catch (error) {
      state.diagnostics.failures += 1;
      state.failed = true;
      state.pending = [...batch, ...state.pending];
      state.pendingBytes += batchBytes;
      throw error;
    }
  })();
  state.draining = write;
  try {
    await write;
  } finally {
    if (state.draining === write) {
      state.draining = null;
    }
    if (!state.failed) {
      schedule(state);
    }
  }
}

export function enqueueBufferedWrite<T>(args: {
  key: string;
  owner: string;
  entry: T;
  bytes: number;
  sink: Sink<T>;
}) {
  let state = states.get(args.key) as KeyState<T> | undefined;
  if (!state) {
    state = {
      key: args.key,
      owner: args.owner,
      sink: args.sink,
      pending: [],
      pendingBytes: 0,
      timer: null,
      draining: null,
      failed: false,
      diagnostics: {
        logicalEntries: 0,
        physicalWriteCycles: 0,
        bytes: 0,
        forcedFlushes: 0,
        failures: 0,
        retries: 0,
      },
    };
    states.set(args.key, state as KeyState<unknown>);
  }
  state.owner = args.owner;
  state.sink = args.sink;
  const bytes = Math.max(0, Math.floor(args.bytes));
  state.pending.push({ value: args.entry, bytes });
  state.pendingBytes += bytes;
  state.diagnostics.logicalEntries += 1;
  state.diagnostics.bytes += bytes;
  if (
    state.pending.length >= BUFFERED_WRITE_MAX_ENTRIES ||
    state.pendingBytes >= BUFFERED_WRITE_MAX_BYTES
  ) {
    void drain(state as KeyState<unknown>).catch(() => undefined);
  } else {
    schedule(state as KeyState<unknown>);
  }
}

export async function flushBufferedWriteKey(key: string) {
  const state = states.get(key);
  if (!state) {
    return;
  }
  state.diagnostics.forcedFlushes += 1;
  clearTimer(state);
  while (state.draining || state.pending.length > 0) {
    if (state.draining) {
      await state.draining;
    } else {
      await drain(state);
    }
  }
}

export async function flushBufferedWriteOwner(owner: string) {
  const keys = Array.from(states.values())
    .filter((state) => state.owner === owner)
    .map((state) => state.key);
  await Promise.all(keys.map((key) => flushBufferedWriteKey(key)));
}

export async function flushAllBufferedWrites() {
  await Promise.all(
    Array.from(states.keys()).map((key) => flushBufferedWriteKey(key)),
  );
}

export function getBufferedWriteDiagnosticsForTests() {
  return Array.from(states.values()).map((state) => ({
    key: state.key,
    owner: state.owner,
    ...state.diagnostics,
    pendingEntries: state.pending.length,
    pendingBytes: state.pendingBytes,
  }));
}

export function discardBufferedWriteKey(key: string) {
  const state = states.get(key);
  if (!state) {
    return;
  }
  clearTimer(state);
  states.delete(key);
}

export async function resetBufferedWriteCoordinatorForTests() {
  await Promise.allSettled(
    Array.from(states.keys()).map((key) => flushBufferedWriteKey(key)),
  );
  for (const state of states.values()) {
    clearTimer(state);
  }
  states.clear();
}
