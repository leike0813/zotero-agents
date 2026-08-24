## 1. OpenSpec Artifacts

- [x] 1.1 Create `dashboard-product-export-busy` with the default `spec-driven` schema
- [x] 1.2 Write the proposal and identify `task-runtime-ui` as the modified capability
- [x] 1.3 Add the `task-runtime-ui` delta spec for single-flight Product export
- [x] 1.4 Write the design and implementation task breakdown

## 2. Regression Tests First

- [x] 2.1 Extend the Dashboard Products Playwright fixture with an exporting snapshot state
- [x] 2.2 Assert the Export Product button is disabled, busy, and visually marked while exporting
- [x] 2.3 Assert the Export Product button returns to idle after the snapshot clears the state
- [x] 2.4 Add core source-contract assertions for the host-side single-flight guard and `finally` cleanup

## 3. Host Snapshot and Export Lifecycle

- [x] 3.1 Add `productExportInProgress` to `DashboardState` and initialize it to `false`
- [x] 3.2 Add `isExporting` to the Products snapshot projection
- [x] 3.3 Guard `open-product-folder` and reserve the export slot before awaiting the picker
- [x] 3.4 Release the export slot and refresh the snapshot from a `finally` block

## 4. Dashboard Button State

- [x] 4.1 Disable the normal Product export button from `productStorageView.isExporting`
- [x] 4.2 Add `aria-busy` and the busy class without coupling state to `productId`
- [x] 4.3 Add a compact Dashboard button spinner and animation

## 5. Validation

- [x] 5.1 Run the targeted Dashboard Products UI test
- [x] 5.2 Run the targeted Dashboard core test
- [x] 5.3 Run `npx tsc --noEmit`
- [x] 5.4 Run Prettier checks for changed files
- [x] 5.5 Run `openspec validate dashboard-product-export-busy --type change --strict --no-interactive`
