# Architektur benutzerdefinierter Workflows

Das Workflow-System von Zotero Agents verwendet eine **erweiterbare Architektur** — jeder Workflow ist ein eigenständiges, in sich geschlossenes Verzeichnis, das lediglich eine `workflow.json`-Manifestdatei und die entsprechenden Hook-Skripte erfordert. Das Workflow-Management des Plugins erkennt und lädt diese automatisch.

## Verzeichnisstruktur

Workflows können an zwei Orten abgelegt werden:

| Ort | Typ | Beschreibung |
|-----|-----|--------------|
| Offizielles Workflow-Paket | Offiziell | Wird unabhängig über den Content Feed installiert. Befindet sich unter `<Zotero Data>/zotero-agents/content/official/workflows/` |
| Benutzer-Workflow-Verzeichnis | Benutzerdefiniert | In den Einstellungen konfiguriert; das Workflow-Management durchsucht es automatisch |

Das **Workflow-Management** des Plugins durchsucht rekursiv das offizielle Paketverzeichnis und das Benutzer-Workflow-Verzeichnis, entdeckt `workflow.json`-Dateien und registriert diese als verfügbare Workflows.

## Ein minimales Workflow-Beispiel

Zum Erstellen eines benutzerdefinierten Workflows sind nur **2 Dateien** erforderlich:

```
my-workflow/
├── workflow.json
└── hooks/
    └── applyResult.mjs
```

### workflow.json

```json
{
  "id": "hello-world",
  "label": "Hello World",
  "provider": "pass-through",
  "inputs": {
    "unit": "parent"
  },
  "hooks": {
    "applyResult": "hooks/applyResult.mjs"
  }
}
```

### hooks/applyResult.mjs

```js
export function applyResult({ parent, runtime }) {
  const title = runtime.helpers.resolveItemRef(parent).getField("title");
  runtime.hostApi.notifications.toast({
    text: `Hello, ${title}!`,
    type: "success",
  });
  return { greeted: true };
}
```

Nachdem `my-workflow/` im Benutzer-Workflow-Verzeichnis abgelegt wurde, öffnen Sie das Dashboard erneut, um den Workflow zu sehen.

## Architektur-Ebenen des Workflows

Der Lebenszyklus eines Workflows umfasst die folgenden Ebenen:

```
Benutzeraktion (Rechtsklick / Dashboard)
    │
    ▼
Workflow-Management — Erkennen, laden, validieren
    │
    ├── Eingaben — Welche Einträge hat der Benutzer ausgewählt?
    ├── Parameter — Welche Parameter hat der Benutzer festgelegt?
    ├── Hooks — Vorverarbeitung, Request-Erstellung, Ergebnisverarbeitung
    └── Ausführung — Wird vom Provider an ein Backend gesendet
         │
         ▼
      Provider (SkillRunner / ACP / Generic HTTP / Pass-through)
         │
         ▼
      Backend — Remote- oder lokales Ausführungsmodul
```

## Klassifizierung von Workflow-Mustern

Basierend auf der Ausführungsmethode und dem Backend-Typ lassen sich Workflows wie folgt klassifizieren:

| Muster | Typischer Anwendungsfall | Backend-Typ |
|--------|--------------------------|-------------|
| **pass-through** | Rein lokale Vorgänge (Export, Dateiverarbeitung), kein Remote-Backend erforderlich | Keines |
| **skillrunner.job.v1** | Einzelschritt-Skill-Ausführung, die an SkillRunner übermittelt wird | skillrunner / acp |
| **skillrunner.sequence.v1** | Mehrstufige verkettete Skill-Ausführung mit Weitergabe zwischen den Schritten | acp |
| **generic-http.request.v1** | Einzelner HTTP-API-Aufruf | generic-http |
| **generic-http.steps.v1** | Mehrstufige HTTP-API-Aufrufe | generic-http |

## Kernkonzepte von workflow.json

```json
{
  "id": "eindeutiger Bezeichner",
  "label": "Anzeigename",
  "provider": "Backend-Typ",
  "inputs": { "unit": "Eingabeeinheitentyp" },
  "parameters": { /* konfigurierbare Parameter */ },
  "execution": { /* Ausführungssteuerung */ },
  "request": { "kind": "Anfragetyp" },
  "hooks": { "applyResult": "Skriptpfad zur Ergebnisverarbeitung" }
}
```

Die nächste Seite erläutert die Bedeutung und Verwendung der einzelnen Felder im Detail.

## Nächste Schritte

- [Das Workflow-Manifest schreiben](#doc/workflows%2Fcustom%2Fmanifest) — Detaillierte Erklärung der einzelnen Felder in workflow.json
- [Hook-System](#doc/workflows%2Fcustom%2Fhooks) — Wie Hooks für jede Phase geschrieben werden
- [Parameter-System](#doc/workflows%2Fcustom%2Fparameters) — Konfigurierbare Parameter definieren
