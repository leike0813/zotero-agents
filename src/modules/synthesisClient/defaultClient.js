import { SynthesisClientError, } from "../../../packages/synthesis-contracts/src/index";
import { createReadyNativeSynthesisClientComposition, } from "./nativeComposition";
let generation = 0;
let currentGeneration;
let shuttingDown = false;
let shutdownTask;
const cleanupTasks = new Set();
let recoverReadyConnection;
const createDefaultComposition = () => createReadyNativeSynthesisClientComposition({ recoverReadyConnection });
let compositionFactory = createDefaultComposition;
function unavailable() {
    throw new SynthesisClientError("unavailable", "The default Synthesis client lifecycle is unavailable");
}
function trackCleanup(task) {
    const tracked = task.catch(() => undefined);
    cleanupTasks.add(tracked);
    void tracked.then(() => {
        cleanupTasks.delete(tracked);
    });
    return tracked;
}
function disposeGeneration(record) {
    if (record.cleanup) {
        return record.cleanup;
    }
    record.cleanup = trackCleanup((async () => {
        let composition;
        try {
            composition = record.composition || (await record.initialization);
        }
        catch {
            return;
        }
        composition.invalidate();
        await composition.dispose();
    })());
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
    };
    record.initialization = Promise.resolve(compositionFactory()).then((composition) => {
        record.composition = composition;
        return composition;
    });
    currentGeneration = record;
    return record;
}
export async function getDefaultSynthesisClient() {
    if (shuttingDown) {
        return unavailable();
    }
    const record = currentGeneration || createGeneration();
    let composition;
    try {
        composition = await record.initialization;
    }
    catch (error) {
        if (shuttingDown ||
            record.generation !== generation ||
            currentGeneration !== record) {
            return unavailable();
        }
        currentGeneration = undefined;
        throw error;
    }
    if (shuttingDown ||
        record.generation !== generation ||
        currentGeneration !== record) {
        await disposeGeneration(record);
        return unavailable();
    }
    return composition.client;
}
export async function getFreshDefaultSynthesisClient() {
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
export function setDefaultSynthesisClientCompositionFactoryForTests(factory) {
    invalidateDefaultSynthesisClient();
    compositionFactory = factory || createDefaultComposition;
}
export function setDefaultSynthesisClientRecovery(recovery) {
    recoverReadyConnection = recovery || undefined;
}
export function invalidateDefaultSynthesisClient() {
    generation += 1;
    const record = currentGeneration;
    currentGeneration = undefined;
    if (record) {
        void disposeGeneration(record);
    }
}
export async function drainDefaultSynthesisClientGeneration() {
    if (shuttingDown) {
        await shutdownTask;
        return;
    }
    invalidateDefaultSynthesisClient();
    await drainCleanupTasks();
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
