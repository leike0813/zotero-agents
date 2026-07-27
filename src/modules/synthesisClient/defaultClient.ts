import {
  SynthesisClientError,
  type SynthesisClient,
} from "../../../packages/synthesis-contracts/src/index";
import {
  createNativeSynthesisClientComposition,
  createReadyNativeSynthesisClientComposition,
} from "./nativeComposition";

type DefaultClientComposition = ReturnType<
  typeof createNativeSynthesisClientComposition
>;

type DefaultClientGeneration = {
  generation: number;
  initialization: Promise<DefaultClientComposition>;
  composition?: DefaultClientComposition;
  cleanup?: Promise<void>;
};

let generation = 0;
let currentGeneration: DefaultClientGeneration | undefined;
let shuttingDown = false;
let shutdownTask: Promise<void> | undefined;
const cleanupTasks = new Set<Promise<void>>();
let compositionFactory = createReadyNativeSynthesisClientComposition;

function unavailable(): never {
  throw new SynthesisClientError(
    "unavailable",
    "The default Synthesis client lifecycle is unavailable",
  );
}

function trackCleanup(task: Promise<void>) {
  const tracked = task.catch(() => undefined);
  cleanupTasks.add(tracked);
  void tracked.then(() => {
    cleanupTasks.delete(tracked);
  });
  return tracked;
}

function disposeGeneration(record: DefaultClientGeneration) {
  if (record.cleanup) {
    return record.cleanup;
  }
  record.cleanup = trackCleanup(
    (async () => {
      let composition: DefaultClientComposition;
      try {
        composition = record.composition || (await record.initialization);
      } catch {
        return;
      }
      composition.invalidate();
      await composition.dispose();
    })(),
  );
  return record.cleanup;
}

async function drainCleanupTasks() {
  while (cleanupTasks.size) {
    await Promise.all(Array.from(cleanupTasks));
  }
}

function createGeneration() {
  const record = {
    generation,
  } as DefaultClientGeneration;
  record.initialization = Promise.resolve(
    compositionFactory(),
  ).then((composition) => {
      record.composition = composition;
      return composition;
    });
  currentGeneration = record;
  return record;
}

export async function getDefaultSynthesisClient(): Promise<SynthesisClient> {
  if (shuttingDown) {
    return unavailable();
  }
  const record = currentGeneration || createGeneration();
  let composition: DefaultClientComposition;
  try {
    composition = await record.initialization;
  } catch (error) {
    if (
      shuttingDown ||
      record.generation !== generation ||
      currentGeneration !== record
    ) {
      return unavailable();
    }
    currentGeneration = undefined;
    throw error;
  }
  if (
    shuttingDown ||
    record.generation !== generation ||
    currentGeneration !== record
  ) {
    await disposeGeneration(record);
    return unavailable();
  }
  return composition.client;
}

export async function getFreshDefaultSynthesisClient(): Promise<SynthesisClient> {
  invalidateDefaultSynthesisClient();
  await drainCleanupTasks();
  return getDefaultSynthesisClient();
}

export async function resetDefaultSynthesisClientForTests() {
  if (!shuttingDown) {
    invalidateDefaultSynthesisClient();
  }
  await shutdownTask;
  await drainCleanupTasks();
  shuttingDown = false;
  shutdownTask = undefined;
  generation += 1;
}

export function setDefaultSynthesisClientCompositionFactoryForTests(
  factory:
    | (() => DefaultClientComposition)
    | null,
) {
  invalidateDefaultSynthesisClient();
  compositionFactory =
    factory || createReadyNativeSynthesisClientComposition;
}

export function invalidateDefaultSynthesisClient() {
  generation += 1;
  const record = currentGeneration;
  currentGeneration = undefined;
  if (record) {
    void disposeGeneration(record);
  }
}

export function shutdownDefaultSynthesisClient() {
  if (shutdownTask) {
    return shutdownTask;
  }
  shuttingDown = true;
  generation += 1;
  const record = currentGeneration;
  currentGeneration = undefined;
  if (record) {
    void disposeGeneration(record);
  }
  shutdownTask = drainCleanupTasks();
  return shutdownTask;
}
