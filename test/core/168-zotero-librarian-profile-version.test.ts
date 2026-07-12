import { assert } from "chai";
import {
  bumpZoteroLibrarianProfileVersionSource,
  parseZoteroLibrarianProfileVersionSource,
  resolveZoteroLibrarianProfileVersion,
} from "../../scripts/zotero-librarian-profile-version";

describe("zotero-librarian profile version", function () {
  it("derives the profile major and minor from the CLI release", function () {
    const source = parseZoteroLibrarianProfileVersionSource({
      schema: "zotero-librarian.profile.version.v1",
      cliMajorMinor: "0.2",
      patch: 3,
    });

    assert.deepEqual(
      resolveZoteroLibrarianProfileVersion({
        cliVersion: "0.2.9",
        source,
      }),
      {
        cliMajorMinor: "0.2",
        cliVersion: "0.2.9",
        patch: 3,
        version: "0.2.3",
      },
    );
  });

  it("resets the profile patch for a new CLI major or minor line", function () {
    const source = parseZoteroLibrarianProfileVersionSource({
      schema: "zotero-librarian.profile.version.v1",
      cliMajorMinor: "0.2",
      patch: 3,
    });

    assert.deepEqual(
      resolveZoteroLibrarianProfileVersion({
        cliVersion: "0.3.1",
        source,
      }),
      {
        cliMajorMinor: "0.3",
        cliVersion: "0.3.1",
        patch: 0,
        version: "0.3.0",
      },
    );
  });

  it("bumps the active CLI line from its resolved profile patch", function () {
    const source = parseZoteroLibrarianProfileVersionSource({
      schema: "zotero-librarian.profile.version.v1",
      cliMajorMinor: "0.2",
      patch: 3,
    });

    assert.deepEqual(
      bumpZoteroLibrarianProfileVersionSource({
        cliVersion: "0.3.1",
        source,
      }),
      {
        schema: "zotero-librarian.profile.version.v1",
        cliMajorMinor: "0.3",
        patch: 1,
      },
    );
  });

  it("rejects invalid profile patch sources", function () {
    assert.throws(
      () =>
        parseZoteroLibrarianProfileVersionSource({
          schema: "zotero-librarian.profile.version.v1",
          cliMajorMinor: "0.2",
          patch: -1,
        }),
      /patch/i,
    );
  });
});
