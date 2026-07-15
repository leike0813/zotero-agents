# Host Bridge Surface Versioning

Use `npm run inspect:zotero-librarian-profile-version -- --json` to read the
recorded CLI version, the Profile patch source, and the resolved Profile version.

The Profile version is `<CLI major>.<CLI minor>.<Profile patch>`. CLI patch
changes do not change the Profile version. A new CLI major/minor line starts at
Profile patch `0` until a public Profile change is bumped.

Run `npm run bump:zotero-librarian-profile` exactly once before rendering when
the release changes public Profile content: Profile guidance, scripts,
configuration, cron jobs, generated Host Bridge references, wrapper guidance,
Host Bridge capabilities, or workflow catalog content. Do not bump for
generated-output drift only. Do not bump for a CLI patch-only release.

After a version decision, render and verify committed generated surfaces:

```powershell
npm run render:host-bridge-surface
npm run check:host-bridge-surface
npm run check:zotero-librarian-profile
```

Use `npm run inspect:zotero-library-agent-bundle-version -- --json` to read the
recorded CLI version, bundle patch source, and resolved bundle version.

The Zotero Library Agent bundle version is
`<CLI major>.<CLI minor>.<bundle patch>`. CLI patch changes do not change the
bundle version. A CLI major/minor line resolves to bundle patch `0` until a
public bundle change is bumped.

Run `npm run bump:zotero-library-agent-bundle` exactly once before rendering
when public bundle guidance, shared control facts, schemas, helpers, generated
references, or packaging layout changes. Do not bump for generated-output drift
or a CLI patch-only release.
