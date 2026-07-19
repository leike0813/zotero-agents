## 1. Regression Coverage

- [x] 1.1 Add a Playwright Dashboard test for Products and filtered Skill Feedback list scroll preservation.
- [x] 1.2 Cover collapsed-by-default folders and per-product file-tree expansion and scroll restoration.
- [x] 1.3 Extend the Research Bundle workflow test to require matching seven-column paper-index header and delimiter rows.

## 2. Dashboard Products State

- [x] 2.1 Add one page-local stable-key scroll registry for Products, filtered feedback, and product-owned file-tree containers.
- [x] 2.2 Capture scroll before Products surface reconstruction and restore matching owners afterward without letting the collapsed rail overwrite list state.
- [x] 2.3 Replace eager folder expansion initialization with an empty per-product expansion set and remove redundant initialization state.

## 3. Research Bundle Markdown

- [x] 3.1 Correct the Research Bundle paper-index delimiter row to match all seven header columns.
- [x] 3.2 Keep the shared Markdown renderer and existing exported Products unchanged.

## 4. Contracts and Verification

- [x] 4.1 Update the `task-runtime-ui` and `research-bundle-workflow` specifications and the UI rendering stability document.
- [x] 4.2 Run targeted Dashboard, Research Bundle, and UI stability tests.
- [x] 4.3 Run formatting, ESLint, built-in workflow manifest, and affected OpenSpec validation gates.
