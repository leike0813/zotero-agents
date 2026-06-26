## 1. OpenSpec
- [x] Add runtime platform and ACP SkillRunner-compatible delta specs.
- [x] Validate the change with `npx openspec validate preflight-runtime-command-resolution --type change --strict`.

## 2. Platform Command Registry
- [x] Add shared command resolution and in-memory startup registry.
- [x] Cover PATH, Mozilla pathSearch, Windows command roots, and POSIX GUI fallback candidates.
- [x] Initialize the registry during plugin startup without blocking startup on missing commands.

## 3. ACP Integration
- [x] Route ACP transport command resolution through the platform service.
- [x] Use startup uv/Python availability for ACP Skills dependency strategy selection.
- [x] Keep declared dependency checks per job.
- [x] Preserve ACP chat launch behavior.

## 4. Verification
- [x] Add focused platform service tests.
- [x] Add ACP Skills dependency strategy tests.
- [x] Run focused node tests and Zotero smoke where available.
