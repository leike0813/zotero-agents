import { classifySynthesisDurableImportFacts, normalizeSynthesisDurableImportEntries, synthesisDurableEntityKey, } from "../../synthesis-contracts/src/durableBundleImport.js";
export class SynthesisDurableBundleApplicationError extends Error {
    code;
    constructor(code) {
        super(code);
        this.code = code;
        this.name = "SynthesisDurableBundleApplicationError";
    }
}
function verifiedFacts(value) {
    const facts = [];
    if (value.manifest.manifest_schema_version === "1.0.0") {
        for (const asset of value.manifest.assets) {
            if (!asset.entity_kind || !asset.entity_id)
                continue;
            facts.push({
                entityKind: asset.entity_kind,
                entityId: asset.entity_id,
                path: asset.path,
                hash: asset.hash,
            });
        }
    }
    else {
        for (const asset of value.manifest.assets) {
            for (const entry of asset.entries ?? []) {
                facts.push({
                    entityKind: entry.entity_kind,
                    entityId: entry.entity_id,
                    path: asset.path,
                    hash: entry.hash,
                });
            }
        }
    }
    return facts.sort((left, right) => left.entityKind.localeCompare(right.entityKind) ||
        left.entityId.localeCompare(right.entityId));
}
const sortedTopicBases = (rows) => [...rows].sort((left, right) => left.topicId.localeCompare(right.topicId) ||
    left.pathId.localeCompare(right.pathId));
export function createSynthesisDurableBundleApplication(options) {
    const now = options.now ?? (() => new Date().toISOString());
    let stopping = false;
    let active = null;
    let receipt = null;
    let receiptSequence = 0;
    const run = async (operation) => {
        if (stopping)
            throw new SynthesisDurableBundleApplicationError("stopping");
        if (active) {
            throw new SynthesisDurableBundleApplicationError("durable_bundle_export_busy");
        }
        const task = Promise.resolve().then(operation);
        active = task;
        try {
            return await task;
        }
        finally {
            if (active === task)
                active = null;
        }
    };
    const sameRepositoryBasis = (first, second) => options.codec.canonicalText(first.aggregateBasis) ===
        options.codec.canonicalText(second.aggregateBasis) &&
        options.codec.canonicalText(sortedTopicBases(first.topicBases)) ===
            options.codec.canonicalText(sortedTopicBases(second.topicBases));
    const buildExport = (sink) => run(async () => {
        const first = await options.repository.captureDurableBundleState();
        const canonicalDrafts = [];
        const canonicalBases = new Map();
        for (const topic of sortedTopicBases(first.topicBases)) {
            if (!options.canonicalSource) {
                throw new SynthesisDurableBundleApplicationError("canonical_source_required");
            }
            const current = await options.canonicalSource.readCurrentAssets(topic);
            canonicalBases.set(`${topic.topicId}\n${topic.pathId}`, current.basis);
            canonicalDrafts.push(...current.drafts);
        }
        const second = await options.repository.captureDurableBundleState();
        if (!sameRepositoryBasis(first, second)) {
            throw new SynthesisDurableBundleApplicationError("basis_superseded");
        }
        for (const topic of sortedTopicBases(second.topicBases)) {
            const expected = canonicalBases.get(`${topic.topicId}\n${topic.pathId}`);
            const actual = await options.canonicalSource?.inspectCurrent(topic);
            if (!expected || actual !== expected) {
                throw new SynthesisDurableBundleApplicationError("basis_superseded");
            }
        }
        const built = options.codec.buildExport({
            drafts: [...first.drafts, ...canonicalDrafts],
            generatedAt: now(),
            producerVersion: options.producerVersion,
        });
        if (sink) {
            for (const asset of built.assets) {
                await sink.writeAssetText(asset.path, asset.text);
            }
            await sink.writeManifestText(built.manifestText);
        }
        return {
            ...built,
            summary: {
                bundleCount: built.assets.length,
                entityCount: built.entries.length,
                topicCount: first.topicBases.length,
                manifestHash: built.manifest.manifest_hash,
            },
        };
    });
    const readAndVerify = (source) => run(() => options.codec.readAndVerify(source));
    const previewImport = (source) => run(async () => {
        receipt = null;
        if (!options.repository.captureDurableImportState) {
            throw new SynthesisDurableBundleApplicationError("durable_import_repository_required");
        }
        const verified = await options.codec.readAndVerify(source);
        if (!verified.value) {
            return {
                ok: false,
                additions: 0,
                updates: 0,
                unbasedUpdates: 0,
                unchanged: 0,
                tombstones: 0,
                conflicts: [],
                diagnostics: verified.diagnostics.map((row) => ({
                    code: row.code,
                    severity: "error",
                    ...(row.path ? { path: row.path } : {}),
                })),
            };
        }
        const facts = verifiedFacts(verified.value);
        const tombstones = facts.filter((fact) => fact.entityKind === "tombstone").length;
        let entries = [];
        try {
            entries = normalizeSynthesisDurableImportEntries(verified.value.entries.filter((entry) => entry.entity_kind !== "tombstone"));
        }
        catch (error) {
            return {
                ok: false,
                additions: 0,
                updates: 0,
                unbasedUpdates: 0,
                unchanged: 0,
                tombstones,
                conflicts: [],
                diagnostics: [
                    {
                        code: error instanceof Error
                            ? error.message
                            : "durable_import_invalid",
                        severity: "error",
                    },
                ],
            };
        }
        const capture = await options.repository.captureDurableImportState();
        const localExport = options.codec.buildExport({
            drafts: capture.drafts,
            generatedAt: now(),
            producerVersion: options.producerVersion,
        });
        const localHashes = Object.fromEntries(verifiedFacts(localExport).map((fact) => [
            synthesisDurableEntityKey(fact.entityKind, fact.entityId),
            fact.hash,
        ]));
        const classification = classifySynthesisDurableImportFacts({
            remote: facts,
            localHashes,
            index: capture.syncIndex,
        });
        const diagnostics = tombstones
            ? [
                {
                    code: "tombstone_apply_unsupported",
                    severity: "error",
                },
            ]
            : [];
        let canApply = !tombstones && classification.conflicts.length === 0;
        let canonical = {
            items: [],
            targets: [],
        };
        if (canApply && options.canonicalImport) {
            try {
                canonical = options.canonicalImport.prepare(entries, capture.topicBases);
            }
            catch (error) {
                canApply = false;
                diagnostics.push({
                    code: error instanceof Error
                        ? error.message
                        : "durable_import_topic_snapshot_invalid",
                    severity: "error",
                });
            }
        }
        let receiptId;
        if (canApply) {
            receiptSequence += 1;
            receiptId = `durable-import:${receiptSequence}`;
            receipt = {
                receiptId,
                manifestHash: verified.value.manifest.manifest_hash,
                entries,
                facts,
                capture: JSON.parse(JSON.stringify(capture)),
                classification,
                canonical,
            };
        }
        return {
            ok: canApply,
            ...classification,
            manifestHash: verified.value.manifest.manifest_hash,
            ...(receiptId ? { receiptId } : {}),
            diagnostics,
        };
    });
    const applyImport = (request) => run(async () => {
        const currentReceipt = receipt;
        receipt = null;
        if (!currentReceipt ||
            currentReceipt.receiptId !== request.receiptId ||
            currentReceipt.manifestHash !== request.manifestHash) {
            throw new SynthesisDurableBundleApplicationError("receipt_invalid");
        }
        if (currentReceipt.classification.unbasedUpdates > 0 &&
            request.acknowledgeUnbasedUpdates !== true) {
            throw new SynthesisDurableBundleApplicationError("unbased_update_acknowledgement_required");
        }
        if (!options.repository.captureDurableImportState ||
            !options.repository.applyDurableImportState ||
            !options.repository.clearDurableImportCommit) {
            throw new SynthesisDurableBundleApplicationError("durable_import_repository_required");
        }
        const recaptured = await options.repository.captureDurableImportState();
        if (options.codec.canonicalText(recaptured.aggregateBasis) !==
            options.codec.canonicalText(currentReceipt.capture.aggregateBasis) ||
            recaptured.indexRevision !== currentReceipt.capture.indexRevision) {
            throw new SynthesisDurableBundleApplicationError("basis_superseded");
        }
        if (currentReceipt.canonical.items.length) {
            if (!options.canonicalImport) {
                throw new SynthesisDurableBundleApplicationError("canonical_import_required");
            }
            try {
                options.canonicalImport.stage({
                    receiptId: currentReceipt.receiptId,
                    manifestHash: currentReceipt.manifestHash,
                    items: currentReceipt.canonical.items,
                });
            }
            catch (error) {
                try {
                    options.canonicalImport.discard(currentReceipt.receiptId);
                }
                catch {
                    // Restart recovery discards a batch without a repository receipt.
                }
                throw error;
            }
        }
        let committed;
        try {
            committed = await options.repository.applyDurableImportState({
                expectedAggregateBasis: currentReceipt.capture.aggregateBasis,
                expectedIndexRevision: currentReceipt.capture.indexRevision,
                receiptId: currentReceipt.receiptId,
                manifestHash: currentReceipt.manifestHash,
                entries: currentReceipt.entries,
                facts: currentReceipt.facts,
                topicTargets: currentReceipt.canonical.targets,
                now: now(),
            });
        }
        catch (error) {
            options.canonicalImport?.discard(currentReceipt.receiptId);
            throw error;
        }
        if (!committed) {
            options.canonicalImport?.discard(currentReceipt.receiptId);
            throw new SynthesisDurableBundleApplicationError("basis_superseded");
        }
        if (currentReceipt.canonical.items.length) {
            const promoted = options.canonicalImport.commit(currentReceipt.receiptId);
            if (promoted !== "promoted") {
                throw new SynthesisDurableBundleApplicationError(promoted);
            }
        }
        await options.repository.clearDurableImportCommit(currentReceipt.receiptId);
        return {
            status: "committed",
            manifestHash: currentReceipt.manifestHash,
            imported: currentReceipt.entries.length,
        };
    });
    const discardImport = (receiptId) => run(() => {
        if (!receipt ||
            (receiptId !== undefined && receipt.receiptId !== receiptId))
            return false;
        receipt = null;
        return true;
    });
    const stopAdmission = () => {
        stopping = true;
        receipt = null;
    };
    const shutdown = async () => {
        stopAdmission();
        if (active)
            await active.catch(() => undefined);
    };
    return {
        buildExport,
        readAndVerify,
        previewImport,
        applyImport,
        discardImport,
        stopAdmission,
        shutdown,
    };
}
