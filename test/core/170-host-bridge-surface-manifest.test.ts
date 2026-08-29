import { assert } from "chai";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  bumpHostBridgeSurfacePatch,
  hostBridgeSkillGeneratedRoot,
  inspectHostBridgeSurfaceVersion,
  loadHostBridgeSurfaceDefinitions,
  resolveHostBridgeSurface,
} from "../../scripts/host-bridge-surface-model";

describe("host bridge surface definitions", function () {
  it("declares the three-layer composition and generic skill mounts", function () {
    const manifest = JSON.parse(
      readFileSync(join(process.cwd(), "host-bridge/surfaces.json"), "utf8"),
    );
    assert.strictEqual(manifest.schema, "host-bridge.surface-definitions.v1");
    assert.isString(manifest.cliRelease);
    const cliRelease = JSON.parse(
      readFileSync(join(process.cwd(), manifest.cliRelease), "utf8"),
    );
    assert.match(cliRelease.version, /^\d+\.\d+\.\d+$/);
    assert.deepEqual(
      manifest.surfaces.map((surface: { id: string }) => surface.id),
      ["zotero-bridge-cli", "zotero-library-agent", "zotero-librarian"],
    );

    const [minimum, generic, hermes] = manifest.surfaces;
    assert.strictEqual(generic.extends, minimum.id);
    assert.strictEqual(hermes.extends, generic.id);
    assert.strictEqual(
      minimum.generatedRoot,
      "addon/content/host-bridge-skills/zotero-bridge-cli",
    );
    assert.strictEqual(
      generic.generatedRoot,
      "addon/content/host-bridge-skills",
    );
    for (const surface of manifest.surfaces) {
      assert.isString(surface.kind);
      assert.isString(surface.sourceRoot);
      assert.isString(surface.generatedRoot);
      assert.isString(surface.materializedRoot);
      assert.isAtLeast(surface.patch, 0);
      assert.sameMembers(
        surface.skills.map((skill: { mount: string }) => skill.mount),
        Array.from(
          new Set(
            surface.skills.map((skill: { mount: string }) => skill.mount),
          ),
        ),
      );
      for (const skill of surface.skills) {
        assert.isString(skill.source);
        assert.notMatch(skill.source, /(^|[/\\])\.\.($|[/\\])/);
      }
    }

    assert.sameMembers(
      generic.skills.map((skill: { id: string }) => skill.id),
      [
        "zotero-library-agent",
        "zotero-library-query",
        "zotero-literature-acquisition",
        "zotero-literature-analysis",
        "zotero-research-synthesis",
        "zotero-library-curation",
      ],
    );
    for (const skill of generic.skills) {
      assert.strictEqual(skill.mount, `skills/${skill.id}`);
    }
  });

  it("derives versions from the CLI line and keeps patch state in the manifest", function () {
    const root = mkdtempSync(join(tmpdir(), "host-bridge-surface-version-"));
    const path = join(root, "surfaces.json");
    const source = JSON.parse(
      readFileSync(join(process.cwd(), "host-bridge/surfaces.json"), "utf8"),
    );
    source.cliRelease = "release.json";
    source.surfaces.find(
      (surface: { id: string }) => surface.id === "zotero-library-agent",
    ).patch = 1;
    writeFileSync(path, JSON.stringify(source), "utf8");
    writeFileSync(
      join(root, "release.json"),
      JSON.stringify({ version: "7.4.9" }),
      "utf8",
    );

    assert.deepInclude(
      inspectHostBridgeSurfaceVersion({
        definitionsPath: path,
        surfaceId: "zotero-library-agent",
      }),
      { cliVersion: "7.4.9", patch: 1, version: "7.4.1" },
    );
    const bumped = bumpHostBridgeSurfacePatch({
      definitionsPath: path,
      surfaceId: "zotero-library-agent",
    });
    assert.strictEqual(bumped.patch, 2);
    assert.strictEqual(
      inspectHostBridgeSurfaceVersion({
        definitionsPath: path,
        surfaceId: "zotero-library-agent",
      }).version,
      "7.4.2",
    );
  });

  it("resolves the Hermes inheritance chain and inherited skills in stable order", function () {
    const definitions = loadHostBridgeSurfaceDefinitions(
      join(process.cwd(), "host-bridge/surfaces.json"),
    );
    const hermes = resolveHostBridgeSurface(definitions, "zotero-librarian");
    assert.deepEqual(
      hermes.lineage.map((surface) => surface.id),
      ["zotero-bridge-cli", "zotero-library-agent", "zotero-librarian"],
    );
    assert.deepEqual(
      hermes.skills.map((skill) => skill.id),
      [
        "zotero-bridge-cli",
        "zotero-library-agent",
        "zotero-library-query",
        "zotero-literature-acquisition",
        "zotero-literature-analysis",
        "zotero-research-synthesis",
        "zotero-library-curation",
        "zotero-librarian",
      ],
    );
  });

  it("resolves each owned Skill from the generated root for every surface kind", function () {
    const definitions = loadHostBridgeSurfaceDefinitions(
      join(process.cwd(), "host-bridge/surfaces.json"),
    );
    const roots = definitions.surfaces.flatMap((surface) =>
      surface.skills.map((skill) =>
        hostBridgeSkillGeneratedRoot(surface, skill).replace(/\\/g, "/"),
      ),
    );
    assert.deepEqual(roots, [
      "addon/content/host-bridge-skills/zotero-bridge-cli",
      "addon/content/host-bridge-skills/zotero-library-agent",
      "addon/content/host-bridge-skills/zotero-library-query",
      "addon/content/host-bridge-skills/zotero-literature-acquisition",
      "addon/content/host-bridge-skills/zotero-literature-analysis",
      "addon/content/host-bridge-skills/zotero-research-synthesis",
      "addon/content/host-bridge-skills/zotero-library-curation",
      "profiles/hermes/zotero-librarian/skills/zotero-librarian",
    ]);
  });

  it("binds the exact seven-Skill addon inventory to the CLI identity", function () {
    const root = join(process.cwd(), "addon/content/host-bridge-skills");
    const bundle = JSON.parse(
      readFileSync(join(root, "manifest.json"), "utf8"),
    );
    const release = JSON.parse(
      readFileSync(
        join(process.cwd(), "cli/zotero-bridge/release.json"),
        "utf8",
      ),
    );
    assert.strictEqual(bundle.schema, "host-bridge.plugin-skill-bundle.v1");
    assert.strictEqual(bundle.cli.version, release.version);
    assert.strictEqual(bundle.cli.buildFingerprint, release.buildFingerprint);
    assert.match(bundle.cli.commandCatalogChecksum, /^[a-f0-9]{64}$/);
    assert.match(bundle.aggregateSha256, /^[a-f0-9]{64}$/);
    assert.deepEqual(
      bundle.skills.map((skill: { id: string }) => skill.id),
      [
        "zotero-bridge-cli",
        "zotero-library-agent",
        "zotero-library-query",
        "zotero-literature-acquisition",
        "zotero-literature-analysis",
        "zotero-research-synthesis",
        "zotero-library-curation",
      ],
    );
    assert.lengthOf(bundle.files, 162);
    const paths = new Set<string>();
    for (const file of bundle.files as Array<{
      path: string;
      bytes: number;
      sha256: string;
    }>) {
      assert.notMatch(file.path, /(^|\/)\.\.?($|\/)|\\/);
      assert.isFalse(paths.has(file.path), file.path);
      paths.add(file.path);
      const bytes = readFileSync(join(root, file.path));
      assert.strictEqual(bytes.length, file.bytes, file.path);
      assert.strictEqual(
        createHash("sha256").update(bytes).digest("hex"),
        file.sha256,
        file.path,
      );
    }
  });

  it("rejects cyclic, duplicate-id, and duplicate-mount definitions", function () {
    const valid = JSON.parse(
      readFileSync(join(process.cwd(), "host-bridge/surfaces.json"), "utf8"),
    );
    const root = mkdtempSync(join(tmpdir(), "host-bridge-surfaces-"));
    const cases = [
      {
        label: "cycle",
        mutate(value: typeof valid) {
          value.surfaces[0].extends = "zotero-librarian";
        },
      },
      {
        label: "duplicate-id",
        mutate(value: typeof valid) {
          value.surfaces[1].id = "zotero-bridge-cli";
        },
      },
      {
        label: "duplicate-mount",
        mutate(value: typeof valid) {
          value.surfaces[1].skills[0].mount = "skills/zotero-bridge-cli";
        },
      },
      {
        label: "minimum-outside-generic-bundle",
        mutate(value: typeof valid) {
          value.surfaces[0].generatedRoot = "addon/content/other-root";
        },
      },
    ];
    for (const testCase of cases) {
      const candidate = structuredClone(valid);
      testCase.mutate(candidate);
      const path = join(root, `${testCase.label}.json`);
      writeFileSync(path, JSON.stringify(candidate), "utf8");
      assert.throws(
        () => loadHostBridgeSurfaceDefinitions(path),
        /cycle|duplicate|mount|bundle root/i,
        testCase.label,
      );
    }
  });
});
