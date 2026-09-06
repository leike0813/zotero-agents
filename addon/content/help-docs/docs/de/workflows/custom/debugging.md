# Debugging & Testen

Nachdem Sie einen benutzerdefinierten Workflow geschrieben haben, können Sie die folgenden Methoden verwenden, um ihn zu validieren und zu debuggen.

## Debug-Modus aktivieren

Aktivieren Sie den Debug-Modus in den Einstellungen, um zusätzliche Debugging-Tools und Informationsanzeigen freizuschalten:

Zotero → Einstellungen → Zotero Agents → Debug-Modus aktivieren

Wenn der Debug-Modus aktiviert ist:

- Debug-bezogene Workflows werden im Dashboard angezeigt
- Laufzeitprotokolle werden detaillierter
- Einige Diagnosewerkzeuge werden verfügbar

## Verwendung des Debug Probe Toolkits

Das Plugin enthält ein integriertes `workflow-debug-probe` Debugging-Toolkit mit mehreren diagnostischen Workflows:

| Workflow | Zweck |
|----------|-------|
| **Workflow Debug Probe** | Inspiziert den Zustand vor der Workflow-Ausführung, öffnet das Diagnosepanel |
| **Debug Sequence Linear Probe** | Validiert die sequenzielle Ausführung und die standardmäßige Handoff-Übergabe |
| **Debug Sequence Workspace Reuse Probe** | Validiert die schrittübergreifende Wiederverwendung des Workspace |
| **Debug Sequence Context Isolation Probe** | Validiert explizite Handoff-Filterung und isolierte Workspaces |

Diese Workflows sind in der Workflow-Liste des Dashboards sichtbar (im Debug-Modus) und können direkt ausgeführt werden, um die Mechanismen der Sequenzausführung zu validieren.

## Protokollanzeige

### Laufzeitprotokolle

Workflows generieren während der Ausführung Laufzeitprotokolle, die im Dashboard eingesehen werden können:

1. Öffnen Sie das Dashboard
2. Suchen Sie eine laufende oder abgeschlossene Aufgabe
3. Klicken Sie auf "View Logs", um das Protokollpanel zu erweitern

### Protokolle in Hooks schreiben

```js
export function applyResult({ parent, bundleReader, runtime }) {
  // In das Laufzeitprotokoll schreiben
  runtime.hostApi.logging.appendRuntimeLog({
    level: "info",
    message: `Verarbeite parent: ${parent}`,
    workflowId: runtime.workflowId,
  });

  // Für komplexe Debug-Informationen können Sie console verwenden
  console.log("Debug:", { parent, workflowId: runtime.workflowId });
}
```

## Fehlerbehebung bei häufigen Problemen

### Workflow erscheint nicht im Dashboard

1. Prüfen Sie, ob `workflow.json` im richtigen Verzeichnis abgelegt ist
2. Stellen Sie sicher, dass `workflow.json` korrekt formatiert ist (JSON-Syntax)
3. Prüfen Sie, dass `id` eindeutig ist und nicht mit offiziellen Workflows kollidiert
4. Stellen Sie sicher, dass der Pfad des `applyResult`-Skripts korrekt ist
5. Prüfen Sie das Plugin-Fehlerprotokoll (Zotero → Hilfe → Fehlerbehebung → Protokolldatei anzeigen)

### Selektionsvalidierung überspringt jede Einheit

Wenn die deklarative `validateSelection` oder `preflight` jede Eingabeeinheit überspringt, sendet der Workflow keine Provider-Anfrage. Überprüfen Sie die Selektionsrichtlinie, Ausschlussregeln und jedes `preflight`-Ergebnis, das `kind: "skip"` zurückgibt.

### Konflikt zwischen buildRequest und deklarativer Anfrage

Der `buildRequest`-Hook und das `request`-Feld in `workflow.json` schließen sich **gegenseitig aus**. Wenn beide vorhanden sind, hat `buildRequest` Vorrang. Wenn das Anfrageverhalten nicht den Erwartungen entspricht, prüfen Sie, ob beide versehentlich gleichzeitig definiert wurden.

### Fehler bei der Ausführung von Hook-Skripten

- Stellen Sie sicher, dass das Hook-Skript im `.mjs`-Format (ES Module) vorliegt
- Stellen Sie sicher, dass die richtigen Funktionsnamen exportiert werden: `preflight`, `buildRequest`, `normalizeSettings` oder `applyResult`
- Stellen Sie sicher, dass die Funktionssignatur Parameter wie `{ parent, bundleReader, runtime }` korrekt empfängt
- Prüfen Sie, ob relative Importpfade korrekt sind

### Ergebnis wird nicht in Zotero geschrieben

Wenn `applyResult` `hostApi.mutations.execute()` verwendet, dies aber nicht wirksam wird, mögliche Ursachen:

- Schreiboperationen erfordern eine Benutzerbestätigung, aber das Bestätigungs-Popup wurde ignoriert oder ist abgelaufen
- Es wurde versucht, eine Schreiboperation durchzuführen, obwohl `execution.zoteroHostAccess.required` nicht auf `true` gesetzt war
- `allowWriteApprovalBypass` muss in Verbindung mit der Plugin-Berechtigungskonfiguration verwendet werden

## Entwicklungsvorschläge

### Einfach anfangen

1. Verwenden Sie zunächst den `pass-through`-Provider mit einem minimalen `applyResult`, um zu überprüfen, ob der Workflow erfolgreich geladen wird
2. Fügen Sie zuerst `validateSelection` hinzu, dann `preflight` oder `buildRequest` nur bei Bedarf
3. Verbinden Sie sich schließlich mit dem eigentlichen Backend

### Verwenden Sie notifications.toast für schnelles Feedback

```js
hostApi.notifications.toast({
  text: `buildRequest hat ${selectionContext.items.filter((item) => item.kind === "parent").length} übergeordnete Einträge erhalten`,
  type: "default",
});
```

Dies ist eine schnelle Debugging-Technik, mit der Sie Ausführungsergebnisse sehen können, ohne Protokolle zu überprüfen.

### Offizielle Workflows als Referenz

Offizielle Workflows sind die beste Lernreferenz. Nach der Installation des offiziellen Pakets können Sie den Quellcode im Verzeichnis `<Zotero Data>/zotero-agents/content/official/workflows/` einsehen:

- `literature-workbench-package/literature-analysis/` — Vollständiges skillrunner.job.v1-Beispiel
- `content/official/workflows/literature-workbench-package/export-notes/` — Einfaches pass-through-Beispiel
- `content/official/workflows/mineru/` — Beispiel mit buildRequest + Dateibehandlung
- `content/official/workflows/literature-workbench-package/literature-search-ingest/` — Beispiel für interaktiven Modus

## Nächste Schritte

- [Vollständige Workflow-Manifest-Referenz](#doc/workflows%2Fcustom%2Fmanifest) — Alle Felder in workflow.json
- [Host-API-Referenz](#doc/workflows%2Fcustom%2Fhost-api) — Alle in Hooks verfügbaren APIs
