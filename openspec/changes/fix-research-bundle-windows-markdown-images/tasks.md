## 1. Windows Host Materialization

- [ ] 1.1 Add a failing `materializeResearchBundlePapers` regression test for drive-slash and standard local-file-URL Markdown image paths crossing into Windows-native Zotero IO while output paths remain portable.
- [ ] 1.2 Normalize selected local sources and accepted Markdown images at the Research Bundle Host IO ingress, preserving existing fallback, warning, containment, and portable-path behavior.

## 2. Remote Direct Delivery

- [ ] 2.1 Add a remote `publishDirectResearchBundle` integration test that resolves the registered Handle and verifies the delivered ZIP contains the Markdown source, eligible image bytes, manifest, and index without a Host-local path.

## 3. Verification

- [ ] 3.1 Run the focused Research Bundle service tests and relevant existing materialization/path tests.
- [ ] 3.2 Run TypeScript, formatting, lint, and strict OpenSpec validation for the completed change.
