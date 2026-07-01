# Graph snapshot rebuild surface

This phase adds a project-detail Graph Snapshot card.

It is a dry-run UI surface for the existing graph persistence helpers. It shows file, relation, symbol, and unresolved-import counts and allows exporting the current graph snapshot as Markdown or JSON.

This does not write CodeRelation or CodeSymbol entities yet. It prepares the UI and export path before persistence is enabled.
