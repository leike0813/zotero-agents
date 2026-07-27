import {
  SYNTHESIS_CUTOVER_PHASES,
  SynthesisClientError,
  rebuildSynthesisCutoverReceipt,
  type SynthesisCutoverReceipt,
} from "../../packages/synthesis-contracts/src";
import {
  readRuntimeTextFile,
  replacePrivateRuntimeTextFileAtomically,
  runtimePathExists,
} from "./runtimePersistence";

type ReceiptStoreOptions = {
  receiptPath: string;
  pathExists?: (path: string) => Promise<boolean>;
  readText?: (path: string) => Promise<string>;
  replacePrivateText?: (
    path: string,
    text: string,
  ) => Promise<void>;
};

function conflict(reason: string): never {
  throw new SynthesisClientError(
    "conflict",
    "The Synthesis cutover receipt transition was rejected",
    { reason },
  );
}

function sameGeneration(
  previous: SynthesisCutoverReceipt,
  next: SynthesisCutoverReceipt,
) {
  return (
    previous.receiptId === next.receiptId &&
    previous.profileId === next.profileId &&
    previous.bundleFingerprint === next.bundleFingerprint &&
    previous.capabilityFingerprint === next.capabilityFingerprint
  );
}

function phaseIndex(receipt: SynthesisCutoverReceipt) {
  return SYNTHESIS_CUTOVER_PHASES.indexOf(receipt.phase);
}

export function createSynthesisCutoverReceiptStore(
  options: ReceiptStoreOptions,
) {
  const pathExists = options.pathExists ?? runtimePathExists;
  const readText = options.readText ?? readRuntimeTextFile;
  const replacePrivateText =
    options.replacePrivateText ??
    replacePrivateRuntimeTextFileAtomically;

  async function read() {
    if (!(await pathExists(options.receiptPath))) {
      return null;
    }
    return rebuildSynthesisCutoverReceipt(
      JSON.parse(await readText(options.receiptPath)),
    );
  }

  async function write(value: SynthesisCutoverReceipt) {
    const next = rebuildSynthesisCutoverReceipt(value);
    const previous = await read();
    if (previous) {
      if (
        previous.profileId !== next.profileId ||
        previous.phase === "mutation_enabled"
      ) {
        conflict("cutover_receipt_owner_conflict");
      }
      if (sameGeneration(previous, next)) {
        if (JSON.stringify(previous) === JSON.stringify(next)) {
          return previous;
        }
        if (phaseIndex(next) !== phaseIndex(previous) + 1) {
          conflict("cutover_receipt_phase_conflict");
        }
      } else if (
        next.phase !== "backup_verified" ||
        (previous.phase !== "backup_verified" &&
          previous.phase !== "preflight_verified")
      ) {
        conflict("cutover_receipt_generation_conflict");
      }
    } else if (next.phase !== "backup_verified") {
      conflict("cutover_receipt_initial_phase_invalid");
    }
    await replacePrivateText(
      options.receiptPath,
      `${JSON.stringify(next)}\n`,
    );
    return next;
  }

  return { read, write };
}
