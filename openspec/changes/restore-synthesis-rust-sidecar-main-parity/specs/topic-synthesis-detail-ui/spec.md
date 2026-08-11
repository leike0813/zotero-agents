## ADDED Requirements

### Requirement: Topic digest SHALL project an optional representative image

When requested, a resolved Topic paper digest SHALL include the fixed-baseline `representative_image` projection only when the reverse Host returns a valid available image. Image lookup SHALL use the digest locator's library ID, note key, and paper ref and SHALL not delay or fail the digest when image data is absent or unavailable.

#### Scenario: Representative image is available
- **WHEN** a digest is resolved with representative-image inclusion enabled and a note key is present
- **THEN** the result contains the existing snake-case `representative_image` object with a data URL
- **AND** its item identity, MIME, dimensions, paper ref, and bounded diagnostics match the validated Host result

#### Scenario: Representative image is not requested or absent
- **WHEN** inclusion is disabled, the digest has no note key, or Host reports `absent`
- **THEN** the digest succeeds and omits `representative_image`
- **AND** no unnecessary Host call is made when inclusion is disabled or the note key is absent

#### Scenario: Representative image cannot be read
- **WHEN** Host transport fails, reports `unavailable`, or returns malformed image data
- **THEN** the digest succeeds with `representative_image.status` equal to `unavailable`
- **AND** diagnostics are stable and do not expose raw Host errors
