# Debugging & Tests

Nach dem Schreiben eines benutzerdefinierten Workflows können Sie die folgenden Methoden zur Validierung und Fehlerbehebung verwenden.

## Debug-Modus aktivieren

Aktivieren Sie den Debug-Modus in den Einstellungen, um zusätzliche Debugging-Werkzeuge und Informationsanzeigen freizuschalten:

Zotero → Einstellungen → Zotero Agents → Debug-Modus aktivieren

Wenn der Debug-Modus aktiviert ist:

- Debug-relevante Workflows werden im Dashboard angezeigt
- Laufzeitprotokolle werden detaillierter
- Einige Diagnosewerkzeuge werden verfügbar

## Verwendung des Debug-Sonden-Toolkits

Das Plugin enthält ein integriertes `workflow-debug-probe`-Debugging-Toolkit mit mehreren Diagnose-Workflows:

| Workflow | Zweck |
|----------|-------|
| **Workflow Debug Probe** | Workflow-Zustand vor der Ausführung inspizieren, Diagnosepanel öffnen |
| **Debug Sequence Linear Probe** | Sequentielle Ausführung und Standard-Handoff-Weitergabe validieren |
| **Debug Sequence Workspace Reuse Probe** | Arbeitsbereichs-Wiederverwendung über Schritte hinweg validieren |
| **Debug Sequence Context Isolation Probe** | Explizite Handoff-Filterung und isolierte Arbeitsbereiche validieren |

Diese Workflows sind im Dashboard (im Debug-Modus) in der Workflow-Liste sichtbar und können direkt ausgeführt werden, um die Sequenz-Ausführungsmechanismen zu validieren.

## Protokollanzeige

### Laufzeitprotokolle

Workflows erstellen während der Ausführung Laufzeitprotokolle, die im Dashboard einsehbar sind:

1. Dashboard öffnen
2. Eine laufende oder abgeschlossene Aufgabe suchen
3. „View Logs" anklicken, um das Protokollpanel einzublenden

### Protokollierung in Hooks

```js
export function applyResult({ parent, bundleReader, runtime }) {
  // In das Laufzeitprotokoll schreiben
  runtime.hostApi.logging.appendRuntimeLog({
    level: "info",
    message: `Processing parent: ${parent}`,
    workflowId: runtime.workflowId,
  });

  // Für komplexe Debug-Informationen können Sie die Konsole verwenden
  console.log("Debug:", { parent, workflowId: runtime.workflowId });
}
```

## Fehlerbehebung bei häufigen Problemen

### Workflow erscheint nicht im Dashboard

1. Prüfen, ob `workflow.json` im richtigen Verzeichnis abgelegt ist
2. Bestätigen, dass `workflow.json` korrekt formatiert ist (JSON-Syntax)
3. Prüfen, dass `id` eindeutig ist und nicht mit offiziellen Workflows in Konflikt steht
4. Bestätigen, dass der `applyResult`-Skriptpfad korrekt ist
5. Das Plugin-Fehlerprotokoll prüfen (Zotero → Hilfe → Fehlerbehebung → Protokolldatei anzeigen)

### filterInputs gibt null zurück

Wenn `filterInputs` `null` zurückgibt, bedeutet dies, dass keine passende Auswahl gefunden wurde und der Workflow nicht ausgeführt wird. Prüfen Sie, ob die Filterlogik korrekt ist.

### Konflikt zwischen buildRequest und deklarativem Request

Der `buildRequest`-Hook und das `request`-Feld in `workflow.json` schließen sich **gegenseitig aus**. Wenn beide vorhanden sind, hat `buildRequest` Vorrang. Wenn das Request-Verhalten nicht den Erwartungen entspricht, prüfen Sie, ob beide versehentlich gleichzeitig definiert wurden.

### Hook-Skript-Ausführungsfehler

- Bestätigen, dass das Hook-Skript im `.mjs`-Format (ES-Modul) vorliegt
- Bestätigen, dass die korrekten Funktionsnamen exportiert werden: `filterInputs`, `buildRequest`, `applyResult`
- Bestätigen, dass die Funktionssignatur Parameter wie `{ parent, bundleReader, runtime }` korrekt empfängt
- Prüfen, ob relative Importpfade korrekt sind

### Ergebnis nicht in Zotero geschrieben

Wenn `applyResult` `hostApi.mutations.execute()` verwendet, aber keine Wirkung zeigt, mögliche Ursachen:

- Schreibvorgänge erfordern Benutzergenehmigung, aber das Genehmigungspopup wurde ignoriert oder hat ein Zeitlimit überschritten
- Ein Schreibvorgang wurde versucht, als `execution.zoteroHostAccess.required` nicht auf `true` gesetzt war
- `allowWriteApprovalBypass` muss in Verbindung mit der Plugin-Berechtigungskonfiguration verwendet werden

## Entwicklungsempfehlungen

### Einfach anfangen

1. Zuerst den `pass-through`-Provider mit einem minimalen `applyResult` verwenden, um zu überprüfen, ob der Workflow erfolgreich geladen wird
2. Nach und nach `filterInputs` und `buildRequest` hinzufügen
3. Erst dann mit dem tatsächlichen Backend verbinden

### notifications.toast für schnelles Feedback verwenden

```js
hostApi.notifications.toast({
  text: `filterInputs received ${selectionContext.items.parents.length} parent items`,
  type: "default",
});
```

Dies ist eine schnelle Debugging-Technik, mit der Sie Ausführungsergebnisse sehen können, ohne Protokolle prüfen zu müssen.

### Offizielle Workflows als Referenz nutzen

Offizielle Workflows sind die beste Lernreferenz. Nach der Installation des offiziellen Pakets können Sie den Quellcode im Verzeichnis `<Zotero Data>/zotero-agents/content/official/workflows/` einsehen:

- `literature-workbench-package/literature-analysis/` — Vollständiges skillrunner.job.v1-Beispiel
- `content/official/workflows/literature-workbench-package/export-notes/` — Einfaches pass-through-Beispiel
- `content/official/workflows/mineru/` — Beispiel mit buildRequest + Dateiverarbeitung
- `content/official/workflows/literature-workbench-package/literature-search-ingest/` — Interaktives Modus-Beispiel

## Nächste Schritte

- [Vollständige Workflow-Manifest-Referenz](manifest) — Alle Felder in workflow.json
- [Host-API-Referenz](host-api) — Alle in Hooks verfügbaren APIs
