import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SIDECAR_ROOT = path.resolve(
  import.meta.dirname,
  "../native/synthesis-sidecar",
);
const BUNDLED_SQLITE = {
  name: "sqlite3",
  version: "3.53.2",
  license: "Public-Domain",
} as const;

type LicenseEntry = {
  name: string;
  version: string;
  license: string;
};

type Inventory = {
  schema: string;
  bundledComponents: LicenseEntry[];
  packages: LicenseEntry[];
};

function packageKey(entry: Pick<LicenseEntry, "name" | "version">) {
  return `${entry.name}@${entry.version}`;
}

function lockPackages(
  lockText: string,
): Array<{ name: string; version: string }> {
  return lockText
    .split("\n[[package]]\n")
    .slice(1)
    .map((block) => {
      const name = /^name = "([^"]+)"$/m.exec(block)?.[1] ?? "";
      const version = /^version = "([^"]+)"$/m.exec(block)?.[1] ?? "";
      return { name, version };
    })
    .filter((entry) => entry.name && entry.version);
}

export function checkSynthesisRustLicenseInventory() {
  const inventory = JSON.parse(
    fs.readFileSync(path.join(SIDECAR_ROOT, "licenses.json"), "utf8"),
  ) as Inventory;
  const cargoLock = fs.readFileSync(
    path.join(SIDECAR_ROOT, "Cargo.lock"),
    "utf8",
  );
  const cargoToml = fs.readFileSync(
    path.join(SIDECAR_ROOT, "Cargo.toml"),
    "utf8",
  );
  const prebuildWorkflow = fs.readFileSync(
    path.resolve(
      import.meta.dirname,
      "../.github/workflows/prebuild-synthesis-sidecar-runtime.yml",
    ),
    "utf8",
  );
  const packageScript = fs.readFileSync(
    path.resolve(
      import.meta.dirname,
      "../scripts/package-synthesis-sidecar-runtime.ts",
    ),
    "utf8",
  );
  const expected = lockPackages(cargoLock);
  const entries = new Map(
    inventory.packages.map((entry) => [packageKey(entry), entry]),
  );
  const bundledEntries = new Map(
    inventory.bundledComponents.map((entry) => [packageKey(entry), entry]),
  );
  const errors: string[] = [];

  if (inventory.schema !== "synthesis-rust-sidecar-license-inventory.v1") {
    errors.push(`inventory_schema:${inventory.schema}`);
  }
  for (const entry of expected) {
    if (!entries.has(packageKey(entry))) {
      errors.push(`license_missing:${packageKey(entry)}`);
    }
  }
  const allowedKeys = new Set(expected.map(packageKey));
  for (const entry of inventory.packages) {
    if (!entry.license.trim()) {
      errors.push(`license_empty:${packageKey(entry)}`);
    }
    if (!allowedKeys.has(packageKey(entry))) {
      errors.push(`license_stale:${packageKey(entry)}`);
    }
  }
  const sqlite = bundledEntries.get(packageKey(BUNDLED_SQLITE));
  if (sqlite?.license !== BUNDLED_SQLITE.license) {
    errors.push(`bundled_sqlite_license:${sqlite?.license ?? "missing"}`);
  }
  if (inventory.bundledComponents.length !== 1) {
    errors.push(
      `bundled_component_count:${inventory.bundledComponents.length}`,
    );
  }
  const rusqliteDeclaration =
    'rusqlite = { version = "=0.40.1", default-features = false, features = ["bundled", "backup"] }';
  if (!cargoToml.includes(rusqliteDeclaration)) {
    errors.push("rusqlite_feature_contract");
  }
  for (const provenanceField of [
    'schema: "synthesis-rust-sidecar-provenance.v2"',
    "sourceFingerprint: native.fingerprint",
    "toolchain",
    "cargoLockSha256",
    'licenseInventory: "licenses.json"',
  ]) {
    if (!packageScript.includes(provenanceField)) {
      errors.push(`package_provenance_missing:${provenanceField}`);
    }
  }
  if (
    !(
      prebuildWorkflow.includes(
        "npx tsx scripts/check-synthesis-rust-license-inventory.ts",
      ) ||
      prebuildWorkflow.includes(
        "npm run check:synthesis-rust-license-inventory",
      )
    ) ||
    !prebuildWorkflow.includes("npm run package:synthesis-sidecar-runtime")
  ) {
    errors.push("prebuild_license_gate_missing");
  }

  return {
    ok: errors.length === 0,
    schema: inventory.schema,
    cargoPackages: expected.length,
    licensedPackages: inventory.packages.length,
    bundledComponents: inventory.bundledComponents.length,
    bundledSqlite: BUNDLED_SQLITE.version,
    errors,
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  const result = checkSynthesisRustLicenseInventory();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 1;
}
