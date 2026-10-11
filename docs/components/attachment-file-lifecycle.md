# Attachment File Lifecycle

This document maps ownership for ordinary Zotero file attachments from input
through stored content and sync. It complements the capability contract in
`zotero-host-capability-broker-ssot.md`; note images and note payloads use
separate contracts.

## Ingress and ownership

| Input | Preparation owner | Result |
| --- | --- | --- |
| Host Bridge upload | Host Bridge file registry owns a private, unique upload directory under `runtime/tmp/host-bridge-uploads/`; attachment mutation takes an upload lease | `attachments.create` stages the upload and imports it into Zotero storage |
| Host Bridge URL attachment | Host Bridge mutation owner validates the URL and creates the Zotero URL item | `linked_url` attachment; there are no uploaded file bytes to transfer |
| Downloaded stored URL | Native attachment owner pins the managed download, then the shared prepared-file owner stages its bytes | `stored_url` ingress creates a permanent stored file; download cleanup releases temporary ownership |
| Workflow local path | Workflow Host prepared-file owner and the shared stored-attachment stager | Validated main file and companions are staged, then imported or used for stored replacement |
| Workflow resource reference | Workflow resource adapter resolves the trusted source; the same prepared-file owner and stager handle it | Same stored-file, portable-name, companion, and cleanup rules as a local path |
| Zotero's native file import | Zotero attachment APIs and storage own the import | Native stored attachment lifecycle and configured Zotero sync |
| Registered attachment or workflow-artifact download | Host Bridge file registry exposes a read handle to an existing source | Download expiry removes the handle only; the Zotero or workflow-owned source remains in place |
| Note image | Workflow note-image preparation and the note mutation path | Embedded image owned by the note operation, not an ordinary file attachment import |
| Note payload | Note payload mutation and persistence path | Payload remains part of the note contract, not a file attachment or upload-directory entry |

Host Bridge upload display names, target filenames, and storage paths are
separate values. The display name supplies the default attachment title and,
when no target filename is given, the input to portable physical-name
normalization. The imported descriptor also supplies default content type.
An explicit target filename selects the physical main filename; an explicit
title remains the display title independently. Opaque file IDs and private
upload paths never become stored filenames.

New file attachments are imported as stored files with their complete
companion set. `attachments.create` may create a `linked_url` URL attachment;
it does not create `linked_file` attachments. Existing linked files remain
readable and are not converted automatically.

## Temporary ownership and cleanup

Preparation scopes hold runtime temporary ownership while staged input may be
read and while stored mutation or recovery may still need its files. A Host
Bridge upload lease pins upload bytes across approval and execution even when
the handle's expiry time passes. Runtime temporary-category cleanup reserves
exclusive admission and reports the category as in use while any attachment
scope or upload lease owns temporary content; it cannot race an active owner
and delete its input.

The upload registry deletes only files and directories it created. A download
handle that refers to a library attachment or workflow artifact never owns or
deletes that source. Release preparation ownership only after staging cleanup
or mutation recovery reaches its terminal result.

## Workflow outputs beside their source

Package-specific workflows own output names and adjacent-file semantics. They
resolve an exact adjacent path before accepting a unique stored-filename match,
reject ambiguous candidates before writing, and stage the complete new output
set before promotion. Reruns overwrite only the workflow's output paths.
Confirmed failures restore previous outputs; uncertain attachment outcomes
retain recovery material.

For these workflows, a new result is imported as a stored attachment. If an
existing result is a linked-file attachment to the exact adjacent output, the
workflow updates that source-adjacent file and reuses the existing linked
attachment without converting it. This package-owned adjacent update does not
make linked-file creation or native linked-file replacement generally
available.

## Stored replacement and file sync

Stored replacement compares the complete main-plus-companion content set and
leaves identical content and sync state untouched. A changed set marks the
attachment `to_upload`, including when only a companion changes. It advances
the main file's modification time so Zotero's native second-precision file
comparison observes the update, while preserving the last-synchronized hash
and time used to detect remote conflicts. The normal Zotero sync path performs
remote comparison; replacement never forces an upload over remote evidence.

If a replacement is confirmed failed, rollback restores the previous complete
file set and sync state. If the native outcome is uncertain, recovery files
remain available for diagnosis and repair.

## Existing temporary linked files

The older issue #57 flow could create linked-file attachments pointing into a
temporary Bridge upload directory. These files are neither migrated nor
deleted automatically. If a source is missing, restore it from a backup or its
original location and use Zotero's native locate action first. Then use
**Tools → Manage Attachments → Convert Linked Files to Stored Files…**. The
native converter creates a stored copy under a new attachment key and moves
child annotations and embedded-image attachments, and copies item relations
before removing the old item. Other references to the old key are not
guaranteed to remain valid in every context. Subsequent file sync depends on
the user's Zotero file-sync and WebDAV configuration and may not happen
immediately.
