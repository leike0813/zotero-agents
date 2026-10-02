import { sha256Hex } from "../../utils/sha256";
async function requiredSha256(bytes) {
    const digest = await sha256Hex(bytes);
    if (!digest)
        throw new Error("SHA-256 is unavailable");
    return digest;
}
async function describeFile(relativePath, path, readBytes) {
    const bytes = await readBytes(path);
    return Object.freeze({
        relativePath,
        sizeBytes: bytes.byteLength,
        sha256: await requiredSha256(bytes),
    });
}
async function describeStagedAttachment(staged, readBytes) {
    const main = await describeFile(staged.mainFilename, staged.stagedMainPath, readBytes);
    const companions = await Promise.all(staged.entries.map((entry) => describeFile(entry.relativePath, entry.stagedPath, readBytes)));
    companions.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
    const identity = await requiredSha256(new TextEncoder().encode(JSON.stringify({ main, companions })));
    return Object.freeze({
        main,
        companions: Object.freeze(companions),
        identity,
    });
}
async function verifyRecord(record, readBytes) {
    const current = await describeStagedAttachment(record.staged, readBytes);
    if (current.identity !== record.snapshot.identity) {
        throw new Error("Prepared attachment source changed before execution");
    }
}
export function createZoteroHostPreparedFiles(dependencies) {
    const records = new WeakMap();
    const active = new Set();
    let disposed = false;
    const release = async (prepared) => {
        const record = records.get(prepared);
        if (!record)
            return;
        // Clean up first: when it fails the record must stay owned so a later
        // dispose() can retry the residue instead of dropping it silently.
        await record.staged.cleanup();
        active.delete(prepared);
        records.delete(prepared);
    };
    return {
        async prepareStoredAttachment(request) {
            if (disposed)
                throw new Error("Prepared file scope is disposed");
            const staged = await dependencies.stageStoredAttachmentSources(request);
            try {
                const snapshot = await describeStagedAttachment(staged, dependencies.readBytes);
                const prepared = Object.freeze({ snapshot });
                records.set(prepared, { staged, snapshot });
                active.add(prepared);
                return prepared;
            }
            catch (error) {
                await staged.cleanup();
                throw error;
            }
        },
        async resolveStoredAttachment(prepared) {
            if (disposed)
                throw new Error("Prepared file scope is disposed");
            const record = records.get(prepared);
            if (!record) {
                throw new Error("Prepared attachment is not owned by this scope");
            }
            await verifyRecord(record, dependencies.readBytes);
            return Object.freeze({
                snapshot: record.snapshot,
                stagingDirectory: record.staged.stagingDirectory,
                mainPath: record.staged.stagedMainPath,
                companionPaths: Object.freeze(record.staged.entries.map((entry) => Object.freeze({
                    relativePath: entry.relativePath,
                    path: entry.stagedPath,
                }))),
                cleanup: () => release(prepared),
                complete: () => {
                    active.delete(prepared);
                    records.delete(prepared);
                },
            });
        },
        async dispose() {
            // Requesting dispose closes prepare/resolve immediately, but every call
            // still retries whatever release has not been confirmed, and the scope
            // keeps the failed records until their cleanup succeeds.
            disposed = true;
            const results = await Promise.allSettled([...active].map((entry) => release(entry)));
            const failed = results.find((result) => result.status === "rejected");
            if (failed && failed.status === "rejected")
                throw failed.reason;
        },
    };
}
