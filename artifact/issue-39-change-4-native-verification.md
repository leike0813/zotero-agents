# Issue 39 change 4 native verification

This record covers the Broker parent-set transaction evidence collected after
PR40 baseline `52624e61` (2026-09-07, Asia/Shanghai). It is evidence for the
managed-note owner only; it does not claim that the full OpenSpec change is
complete.

## Runtime and command

The native executable's command-line output reported the Gecko runtime, while
the installed Zotero product version comes from its application manifest:

```text
$ /usr/bin/zotero --version
Zotero Zotero 140.10.0esr, Copyright (c) 2006-2025 Contributors
```

```text
$ rg '^Version=' /usr/lib/zotero/app/application.ini
Version=9.0.4
$ rg '^Milestone=' /usr/lib/zotero/platform.ini
Milestone=140.10.0
```

Thus `140.10.0esr` is the Gecko/platform version; the Zotero product version
for this run is `9.0.4`.

The supporting tool versions were Node `v24.12.0`, npm `11.6.2`, and the
working-tree commit was `52624e61`. The exact verification command was:

```bash
ZOTERO_TEST_GREP='managed note transaction' npm run test:zotero:core -- --exit-on-finish
```

The package wrapper expanded this to
`tsx scripts/run-zotero-test-with-mock.ts test:zotero:cli lite core
--exit-on-finish`, which built the temporary add-on and launched the native
Zotero runtime. The run used a temporary data directory under
`/tmp/zotero-agents-test-data-3073117/Zotero_data`.

## Result

```text
managed note transaction in Zotero
  ✔ commits the private parent set and its payload attachment in one native transaction 644ms
  ✔ rolls back all notes and payload attachments when the second native note save fails 507ms
  ✔ retains canonical notes and settles one parent-set receipt when migration cleanup fails 936ms

Test run completed - 3 passed
```

The success case observed exactly one `Zotero.DB.executeTransaction` call with
maximum depth one, one managed child note, one payload attachment, and an
existing attachment file. The rollback case injected failure from the second
business note's content, observed one transaction and zero nested transaction
calls, confirmed no child-note rows or saved item rows remained, and confirmed
every preallocated storage directory was removed.

The cleanup-failure case supplied a private migration cleanup tail with a
missing payload ref. It settled the same parent-set operation as
`repair_required`, retained the canonical note, and left the legacy note
untouched. Cleanup note reads and payload-trash preparation are split into
bounded Host slices; payload trash executes in bounded chunks without claiming
another authority receipt.

The production path prepares payload/image bytes and storage directories before
the transaction. The transaction uses direct native `save()`/attachment anchor
operations; it does not call `Attachments.importEmbeddedImage` or another
nested transaction helper while the parent transaction is open.
