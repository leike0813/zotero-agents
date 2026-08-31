## ADDED Requirements

### Requirement: Representative-image reads SHALL use a strict bounded Host port

The Topic application SHALL call `library.representative_image.read` through a typed port with library ID, note item key, and paper ref. The Host result SHALL validate closed status variants, matching item identity, supported image MIME, canonical base64, decoded size no greater than 2 MiB, positive bounded dimensions, and no more than twenty diagnostics.

#### Scenario: Host returns valid image bytes
- **WHEN** Host returns an `available` result within all bounds
- **THEN** Rust accepts the response and projects its bytes as a MIME-matched data URL
- **AND** the reverse-Host response may use the artifact-read 8 MiB and ten-second policy

#### Scenario: Host response violates the contract
- **WHEN** status, identity, MIME, base64, decoded size, dimensions, or diagnostics violate the port contract
- **THEN** the port returns the stable representative-image unavailable outcome
- **AND** the ordinary reverse-Host default budget remains unchanged
