import {
  rebuildSynthesisHostExportDeliveryRequest,
  rebuildSynthesisHostExportDeliveryResult,
  type SynthesisHostExportDeliveryPort,
  type SynthesisHostExportDeliveryRequest,
} from "../../../packages/synthesis-contracts/src/index";
import { joinPath } from "../../utils/path";
import {
  getRuntimePersistencePaths,
  removeRuntimePath,
  writeRuntimeBytes,
} from "../runtimePersistence";
import {
  registerHostBridgeExportFile,
  sha256Bytes,
  type HostBridgeFileDescriptor,
} from "../hostBridgeFileRegistry";
import { createStoreZipBytes } from "../zipStore";

type SynthesisHostExportDeliveryAdapterOptions = {
  runtimeRoot?: string;
  now?: () => number;
  random?: () => number;
  createZip?: typeof createStoreZipBytes;
  writeBytes?: typeof writeRuntimeBytes;
  removePath?: typeof removeRuntimePath;
  registerFile?: (args: {
    localPath: string;
    displayName: string;
    contentType: string;
    size: number;
    sha256: string;
    owner: { capability: string };
  }) => Promise<HostBridgeFileDescriptor>;
};

function capabilitySegment(capability: string) {
  return capability.replace(/[^A-Za-z0-9._-]+/g, "-");
}

function unavailable(request: SynthesisHostExportDeliveryRequest) {
  return rebuildSynthesisHostExportDeliveryResult({
    status: "unavailable",
    capability: request.capability,
    diagnostics: ["host_export_delivery_failed"],
  });
}

export function createSynthesisHostExportDeliveryPort(
  options: SynthesisHostExportDeliveryAdapterOptions = {},
): SynthesisHostExportDeliveryPort {
  const now = options.now || Date.now;
  const random = options.random || Math.random;
  const createZip = options.createZip || createStoreZipBytes;
  const writeBytes = options.writeBytes || writeRuntimeBytes;
  const removePath = options.removePath || removeRuntimePath;
  const registerFile = options.registerFile || registerHostBridgeExportFile;
  return {
    async publishArchive(rawRequest) {
      const request = rebuildSynthesisHostExportDeliveryRequest(rawRequest);
      const root = joinPath(
        getRuntimePersistencePaths(options.runtimeRoot).tmpDir,
        "host-bridge-exports",
        capabilitySegment(request.capability),
        `${now()}-${random().toString(36).slice(2)}`,
      );
      const archivePath = joinPath(root, request.displayName);
      try {
        const bytes = createZip(
          request.entries.map((entry) => ({
            name: entry.path,
            text: entry.text,
          })),
        );
        const sha256 = await sha256Bytes(bytes);
        if (!sha256) {
          return unavailable(request);
        }
        await writeBytes(archivePath, bytes);
        const descriptor = await registerFile({
          localPath: archivePath,
          displayName: request.displayName,
          contentType: "application/zip",
          size: bytes.byteLength,
          sha256,
          owner: { capability: request.capability },
        });
        return rebuildSynthesisHostExportDeliveryResult({
          status: "available",
          capability: request.capability,
          delivery: {
            mode: "bridge-download",
            bundle: descriptor,
          },
          diagnostics: [],
        });
      } catch {
        try {
          await removePath(root);
        } catch {
          // Cleanup is best-effort and must not replace the stable result.
        }
        return unavailable(request);
      }
    },
  };
}
