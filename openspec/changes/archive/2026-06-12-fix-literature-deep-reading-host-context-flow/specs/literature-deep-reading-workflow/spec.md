# literature-deep-reading-workflow Delta

## MODIFIED Requirements

### Requirement: Source Bundle Sidecar Artifacts

The `literature-deep-reading` workflow SHALL best-effort include generated digest, references, and citation-analysis artifacts for the selected parent item.

#### Scenario: Host paper artifacts are available

- **GIVEN** the selected parent has Host-readable digest, references, and citation-analysis artifacts
- **WHEN** the workflow builds `source_bundle.zip`
- **THEN** it SHALL read the artifacts through the Host synthesis paper-artifact API
- **AND** it SHALL write available payloads under `artifacts/`
- **AND** `artifacts/artifact-manifest.json` SHALL record their status, payload type, byte count, and bundle path.
- **AND** selecting a Markdown attachment SHALL still resolve the same parent paper ref before reading artifacts.

#### Scenario: Host paper artifacts are unavailable

- **GIVEN** Host paper-artifact reading is unavailable or returns no usable payload
- **AND** the selected parent has generated digest, references, or citation-analysis notes with supported note kinds or payload anchors
- **WHEN** the workflow builds `source_bundle.zip`
- **THEN** it SHALL fall back to note payload decoding
- **AND** it SHALL keep sidecar collection best effort.

#### Scenario: Artifact notes exist but cannot be decoded

- **GIVEN** a generated artifact note is found but its payload cannot be decoded
- **WHEN** the workflow builds `source_bundle.zip`
- **THEN** the workflow SHALL keep building the bundle
- **AND** diagnostics SHALL distinguish decode failure from a truly missing sidecar artifact.
