import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ACP_BRIDGE_BINARY,
  ACP_BRIDGE_RECORD,
  ACP_BRIDGE_OUTPUT,
  ACP_BRIDGE_LOCAL_OUTPUT,
  acpBridgeFailure,
  readVerifiedAcpBridgeBuild,
  resolveAcpBridgeTarget,
} from "./acp-ws-bridge-build.mjs";
import { checkAcpWsBridgeFreshness } from "./check-acp-ws-bridge-freshness.mjs";

export async function packageAcpWsBridge({ root = process.cwd() } = {}) {
  const { record, bytes } = await readVerifiedAcpBridgeBuild(
    root,
    path.join(root, ACP_BRIDGE_LOCAL_OUTPUT),
  );
  const directory = path.join(root, ACP_BRIDGE_OUTPUT);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, ACP_BRIDGE_BINARY), bytes);
  await writeFile(
    path.join(directory, `${ACP_BRIDGE_BINARY}.sha256`),
    `${record.binary.sha256}  ${ACP_BRIDGE_BINARY}\n`,
  );
  await writeFile(
    path.join(directory, ACP_BRIDGE_RECORD),
    `${JSON.stringify(record, null, 2)}\n`,
  );
  const result = await checkAcpWsBridgeFreshness({ root });
  if (!result.ok)
    throw acpBridgeFailure(result.code, result.message, result.details);
  return result;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  resolveAcpBridgeTarget();
  console.log(JSON.stringify(await packageAcpWsBridge(), null, 2));
}
