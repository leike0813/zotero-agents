## Why

MinerU is a built-in Generic HTTP workflow, but users still have to manually
enter the official endpoint, bearer mode, timeout, and API-key guidance in
Backend Manager. A preset-based flow will make the common official MinerU
configuration discoverable while preserving the existing requirement that users
provide their own token.

## What Changes

- Add a Generic HTTP preset picker in Backend Manager, using the same subwindow
  interaction style as ACP backend presets.
- Add a `MinerU Official` Generic HTTP preset that creates an editable backend
  draft row with the official endpoint, bearer auth, token placeholder, and
  10-minute timeout.
- Add localized preset help text with an external link to MinerU API-key
  acquisition.
- Keep bearer token validation unchanged: placeholder text is not persisted as
  a token.
- Update MinerU setup documentation to prefer the preset and use `600000` ms.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `backend-manager-ui`: Backend Manager gains Generic HTTP preset selection and
  preview behavior.

## Impact

- Backend Manager host snapshot/action handling.
- Backend Manager iframe UI and localized strings.
- Generic HTTP preset metadata module and backend-manager regression tests.
- MinerU setup documentation and generated help docs.
