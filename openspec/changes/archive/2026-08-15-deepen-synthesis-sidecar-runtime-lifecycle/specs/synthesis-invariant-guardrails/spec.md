## REMOVED Requirements

### Requirement: Native service composition SHALL remain thin
**Reason**: The source-line limit used as a proxy for thin composition conflicts with a deep lifecycle module and tests implementation size rather than authority ownership.

**Migration**: Replace the size proxy with semantic checks for a thin executable adapter, a narrow library interface, private runtime modules, and continued separation of worker framing and capability dispatch.

## ADDED Requirements

### Requirement: Native lifecycle ownership SHALL be semantically guarded
Static governance SHALL enforce the native runtime's public interface and authority placement without constraining source-file length or requiring implementation-text snapshots.

#### Scenario: Runtime ownership checks run
- **WHEN** static governance inspects the native sidecar
- **THEN** the executable SHALL remain free of production runtime module declarations
- **AND** the library SHALL keep runtime implementation modules private
- **AND** worker frame variants and capability match handlers SHALL remain outside production lifecycle composition

#### Scenario: Runtime tests are inspected
- **WHEN** tests exercise worker or serve lifecycle behavior
- **THEN** they SHALL use the library interface or a private internal seam
- **AND** integration tests SHALL NOT recompile production source files through path-based module declarations

