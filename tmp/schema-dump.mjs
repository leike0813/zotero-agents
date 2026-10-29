import fs from "node:fs";
const s = JSON.parse(
  fs.readFileSync(
    "packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/reverse-host.schema.json",
    "utf8",
  ),
);
for (const name of Object.keys(s.$defs)) {
  if (name.startsWith("LibrarySnapshot")) {
    process.stdout.write(name + "\n" + JSON.stringify(s.$defs[name], null, 1) + "\n");
  }
}
