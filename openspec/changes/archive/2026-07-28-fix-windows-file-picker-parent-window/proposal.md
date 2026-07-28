## Why

Windows can reject `nsIFilePicker.init` when the shared workflow file picker is
given a stale or non-native dialog window. This prevents literature-bundle
export and other file-selection actions from opening their native dialog.

## What Changes

- Validate the runtime parent window before passing it to Zotero's file picker.
- Fall back to the Zotero main window when a dialog or preferences window is
  closed or lacks a browsing context.
- Cover the fallback and valid-dialog behaviors with host file-picker tests.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `zotero-host-capability-broker`: Host file-picker operations must use a
  usable native parent window across supported desktop platforms.

## Impact

- `src/platform/filePicker.ts`
- Workflow Host API file-picker tests
- All callers of the shared runtime file-picker helper, including
  `export-literature-bundle`
