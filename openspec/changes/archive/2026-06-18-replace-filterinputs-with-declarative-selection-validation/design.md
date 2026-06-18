# Design

`validateSelection` is a declarative selection engine contract. It supports a
small fixed set of policies and predicates: input-unit selection, literature
source selection, PDF selection, selected parent selection, generated note
candidate collection, digest representative image targeting, generated-note
exclusions, and artifact-exists exclusions.

Menus and diagnostic probes call the same evaluator as execution, but they do
not call workflow hooks. Execution calls the evaluator first and then invokes
declarative request compilation or `buildRequest` for each scoped selection
context.

`hooks.filterInputs` is deprecated by removal. The manifest schema rejects it,
the loader does not import it, and builtin workflows move their previous
filtering behavior into `validateSelection`.
