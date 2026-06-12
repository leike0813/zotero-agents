# Topic-scoped Citation Graph

## Summary

Add a topic-scoped mode to the Synthesis Workbench Citation Graph. Users can select an existing topic from graph controls to view the topic's 1-hop citation subgraph, and Topic Details can jump directly to that scoped graph with a back link.

## Motivation

The full citation graph is useful for global structure, but topic review often needs a focused view of the papers that define one topic and their immediate citation context. The workbench already loads topic graph data alongside the citation graph, so the missing piece is a read model that maps topics to citation graph node ids and a small navigation layer.

## Scope

- Add topic scope data to the graph snapshot.
- Add topic selection controls in Citation Graph.
- Add Topic Details -> Citation Graph jump and graph -> Topic Details return.
- Keep scope depth fixed at 1.
- Do not mix topic graph nodes into the citation graph.
