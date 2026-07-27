import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import {
  SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITIES,
  SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
  SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES,
} from "../packages/synthesis-contracts/src/sidecarSystem";

type CapabilityManifest = {
  schema: string;
  canonicalization: string;
  fingerprintSha256: string;
  capabilities: string[];
};

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(
  ROOT,
  "packages/synthesis-contracts/contract-set/synthesis-production-client-v1/capabilities.json",
);
const PORT_PATH = path.join(
  ROOT,
  "src/modules/synthesisClient/inProcessClient.ts",
);
const RUST_PATH = path.join(
  ROOT,
  "native/synthesis-sidecar/crates/synthesis-sidecar/src/production_capabilities.rs",
);
const RUST_DISPATCH_PATH = path.join(
  ROOT,
  "native/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs",
);

function sorted(values: readonly string[]) {
  return [...values].sort();
}

function difference(left: readonly string[], right: readonly string[]) {
  const rightSet = new Set(right);
  return left.filter((value) => !rightSet.has(value)).sort();
}

function extractPortCapabilities() {
  const source = fs.readFileSync(PORT_PATH, "utf8");
  const sourceFile = ts.createSourceFile(
    PORT_PATH,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const declaration = sourceFile.statements.find(
    (statement): statement is ts.InterfaceDeclaration =>
      ts.isInterfaceDeclaration(statement) &&
      statement.name.text === "SynthesisClientPort",
  );
  if (!declaration) {
    return [];
  }
  return declaration.members
    .map((member) =>
      member.name &&
      (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name))
        ? `client.${member.name.text}`
        : "",
    )
    .filter(Boolean);
}

export function inspectSynthesisProductionCapabilities() {
  const manifest = JSON.parse(
    fs.readFileSync(MANIFEST_PATH, "utf8"),
  ) as CapabilityManifest;
  const manifestCapabilities = manifest.capabilities || [];
  const typescriptCapabilities = [
    ...SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITIES,
  ];
  const portCapabilities = extractPortCapabilities();
  const canonical = `${sorted(manifestCapabilities).join("\n")}\n`;
  const actualFingerprint = createHash("sha256")
    .update(canonical)
    .digest("hex");
  const rustSource = fs.readFileSync(RUST_PATH, "utf8");
  const rustDispatchSource = fs.readFileSync(RUST_DISPATCH_PATH, "utf8");
  const rustReadyBlock =
    rustSource.match(
      /READY_PRODUCTION_CLIENT_CAPABILITIES:\s*&\[&str\]\s*=\s*&\[(.*?)\];/s,
    )?.[1] || "";
  const rustReadyCapabilities = [
    ...rustReadyBlock.matchAll(/"(client\.[A-Za-z0-9_]+)"/g),
  ].map((match) => match[1]!);
  const readyCapabilities = [
    ...SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES,
  ];
  const duplicates = manifestCapabilities.filter(
    (capability, index) =>
      manifestCapabilities.indexOf(capability) !== index,
  );

  return {
    capabilityCount: manifestCapabilities.length,
    fingerprint: actualFingerprint,
    errors: {
      manifestIdentity:
        manifest.schema === "synthesis-production-client-capabilities.v1" &&
        manifest.canonicalization === "sorted-newline-terminated"
          ? []
          : ["invalid manifest identity"],
      duplicates: sorted([...new Set(duplicates)]),
      missingFromManifest: difference(
        portCapabilities,
        manifestCapabilities,
      ),
      unknownInManifest: difference(
        manifestCapabilities,
        portCapabilities,
      ),
      missingFromTypescript: difference(
        manifestCapabilities,
        typescriptCapabilities,
      ),
      unknownInTypescript: difference(
        typescriptCapabilities,
        manifestCapabilities,
      ),
      fingerprint:
        actualFingerprint === manifest.fingerprintSha256 &&
        actualFingerprint ===
          SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT
          ? []
          : ["TypeScript or manifest fingerprint mismatch"],
      rustBinding:
        rustSource.includes(
          `PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT: &str =\n    "${actualFingerprint}"`,
        ) &&
        rustSource.includes(
          "synthesis-production-client-v1/capabilities.json",
        )
          ? []
          : ["Rust production capability binding mismatch"],
      readyNotDeclared: difference(
        readyCapabilities,
        manifestCapabilities,
      ),
      readyRustBinding: [
        ...difference(readyCapabilities, rustReadyCapabilities),
        ...difference(rustReadyCapabilities, readyCapabilities),
      ],
      readyDispatcherBinding: readyCapabilities.filter(
        (capability) => !rustDispatchSource.includes(`"${capability}"`),
      ),
    },
  };
}

function runCli() {
  const report = inspectSynthesisProductionCapabilities();
  const ok = Object.values(report.errors).every(
    (values) => values.length === 0,
  );
  process.stdout.write(`${JSON.stringify({ ok, ...report }, null, 2)}\n`);
  if (!ok) {
    process.exitCode = 1;
  }
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (entryPath === fileURLToPath(import.meta.url)) {
  runCli();
}
