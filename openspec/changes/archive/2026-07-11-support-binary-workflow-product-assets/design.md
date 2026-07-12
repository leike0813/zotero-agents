# Design

## Asset source contract

Product assets gain an explicit source union for result artifacts, host-local files, and inline text. Existing `rawPath`/`fallbackPath` inputs are normalized into the result-artifact branch so resolution and copying have one implementation path.

Bundle readers and workflow result contexts expose byte reads in addition to text reads. Managed copies are always written as bytes; text preview decoding remains a separate read concern.

## Atomic registration

`registerProduct` accepts an opt-in atomic failure policy. Atomic registrations materialize all assets under a staging directory, reject duplicate or unsafe product paths, then move the staged directory into place before persisting the product row. Any failure removes staging and leaves no product row. The default policy retains existing missing-asset diagnostics.

## Integrity

Managed assets record byte size and SHA-256. Binary preview remains diagnostic-only while text preview behavior is unchanged.
