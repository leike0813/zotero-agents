## Context

Backend Manager already renders an iframe-based profile editor and has an ACP
preset modal that previews preset metadata before appending a draft row. Generic
HTTP profiles are currently added as empty rows, so the built-in MinerU workflow
still requires manual endpoint/auth/timeout setup.

## Goals / Non-Goals

**Goals:**
- Add Generic HTTP presets using the same modal interaction model as ACP
  presets.
- Keep preset data in a single host-owned source module.
- Provide localized API-key guidance with an external link.
- Keep the API-key placeholder out of persisted auth data.

**Non-Goals:**
- Do not auto-create or auto-persist the MinerU backend on startup.
- Do not change Generic HTTP provider request execution or auth validation.
- Do not add secret storage beyond the existing bearer token field.

## Decisions

1. **Generic HTTP presets are draft-row templates.** The preset creates a normal
   editable row only after confirmation. This keeps persistence, validation, and
   duplicate-id behavior aligned with manual profile creation.

2. **Preset metadata owns token placeholder and note link.** The backend manager
   snapshot exposes preset id, display name, row defaults, token placeholder,
   and localized note/link data. The iframe only renders and returns the chosen
   preset id.

3. **External preset links use host actions.** The iframe prevents default link
   navigation and asks the host to call Zotero `launchURL`, matching the ACP
   preset Node.js link pattern.

4. **Placeholder is not auth data.** `authToken` remains empty in the draft row;
   the placeholder is carried as UI metadata and never mapped to
   `BackendInstance.auth.token`.

## Risks / Trade-offs

- **Duplicate modal logic** -> Keep the Generic HTTP modal structurally close to
  the ACP modal and reuse shared CSS classes instead of introducing a broader
  modal abstraction in this small change.
- **Users may try saving before replacing the placeholder** -> Existing bearer
  token validation continues to block save and shows the current localized
  required-token error.
