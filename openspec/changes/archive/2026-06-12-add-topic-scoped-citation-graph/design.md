# Design

## Read Model

The graph snapshot exposes topic scopes as topic id/title plus source paper refs and resolved citation graph node ids. The service builds this from topic artifact dependency/resolved paper set metadata and uses the existing paper-ref to citation-node-id conversion.

## Filtering

`graph.topicId = "all"` keeps the existing full graph. Any other topic id activates fixed-depth topic filtering:

- include source paper nodes for the topic;
- include all graph edges touching those source nodes;
- include the opposite endpoints of those edges;
- then apply existing node kind, role, and low-signal filters.

If no topic nodes match the citation graph cache, the graph shows an empty scoped state instead of falling back to the full graph.

## Navigation

Topic Details has an `Open Citation Subgraph` action that switches to the graph tab and sets `graph.topicId`. The app records that this navigation came from a topic detail page, so graph UI can show `Back to Topic Details`. The back action reopens the same topic detail reader.

## Harness

The harness keeps using the real workbench app and read model. No fake topic scopes are added.
