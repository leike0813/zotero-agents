# Paketierung & Bereitstellung

Workflows unterstützen zwei Formen: **einzelner Workflow** und **Multi-Workflow-Paket**. Einzelne Workflows eignen sich für einfache Szenarien, während Multi-Workflow-Pakete für Sammlungen von Workflows mit gemeinsamem Code geeignet sind.

## Einzelner Workflow

Die einfachste Form: ein Verzeichnis, das eine `workflow.json` und die zugehörigen Hook-Skripte enthält:

```
my-workflow/
├── workflow.json
└── hooks/
    ├── filterInputs.mjs
    └── applyResult.mjs
```

Ein einzelner Workflow hat keine `packageId`, und Hook-Skripte können keinen Code über relative Imports teilen.

## Multi-Workflow-Paket

Wenn mehrere Workflows Logik gemeinsam nutzen, können sie als Paket organisiert werden:

```
my-package/
├── workflow-package.json       # Paketmanifest
├── lib/                        # Gemeinsam genutzter Code
│   └── runtime.mjs
│   └── util.mjs
├── workflow-a/
│   ├── workflow.json
│   └── hooks/
│       ├── filterInputs.mjs
│       └── applyResult.mjs
├── workflow-b/
│   ├── workflow.json
│   └── hooks/
│       └── applyResult.mjs
└── locales/                    # Paketweite Lokalisierungsdateien
    ├── zh-CN.json
    └── ja-JP.json
```

### workflow-package.json

```json
{
  "id": "my-package",
  "version": "1.0.0",
  "workflows": [
    "workflow-a/workflow.json",
    "workflow-b/workflow.json"
  ],
  "i18n": {
    "defaultLocale": "en-US",
    "locales": {
      "zh-CN": "locales/zh-CN.json",
      "ja-JP": "locales/ja-JP.json"
    }
  }
}
```

### Gemeinsamer Code innerhalb eines Pakets

Hook-Skripte in einem Paket können gemeinsame Module aus `lib/` über relative Pfade importieren:

```js
// workflow-a/hooks/applyResult.mjs
import { processResult } from "../../lib/util.mjs";

export async function applyResult({ parent, bundleReader, runtime }) {
  return processResult({ parent, bundleReader, runtime });
}
```

```js
// lib/util.mjs
export function processResult({ parent, bundleReader, runtime }) {
  // Gemeinsame Verarbeitungslogik
}
```

Hinweis: Hook-Skripte werden als ES-Module ausgeführt und unterstützen `import`-Anweisungen, aber Importpfade müssen relativ zur Hook-Datei selbst sein.

## Bereitstellungsmethoden

### Benutzer-Workflow-Verzeichnis

Legen Sie das Workflow-Verzeichnis unter dem in den Zotero-Einstellungen konfigurierten **Workflow-Verzeichnis** ab. Das Workflow-Management durchsucht automatisch dieses Verzeichnis (einschließlich Unterverzeichnisse) und entdeckt alle `workflow.json`-Dateien.

Konfigurationsort: Zotero → Einstellungen → Zotero Agents → Workflow-Verzeichnis.

### Verzeichnisdurchsuchungsregeln

- Das Workflow-Management durchsucht **rekursiv** das Workflow-Verzeichnis und seine Unterverzeichnisse
- Das Auffinden einer `workflow.json` registriert diese als Workflow
- Wenn `workflow-package.json` in einem Paketverzeichnis gefunden wird, werden untergeordnete Workflows im Paketmodus geladen
- Wenn das Workflow-Verzeichnis nicht existiert oder keine gültigen Workflows enthält, meldet das Workflow-Management eine Warnung, beeinflusst aber nicht den Plugin-Betrieb

### Kompatibilität mit anderen Formaten

| Speicherort | Sichtbarkeit | Beschreibung |
|-------------|--------------|--------------|
| Offizielles Workflow-Paket `content/official/workflows/` | Alle Benutzer | Unabhängig über Content Feed installiert; nicht direkt vom Benutzer änderbar |
| Benutzer-Workflow-Verzeichnis | Aktueller Benutzer | Kann frei hinzugefügt/geändert/gelöscht werden |
| Offizielle + Benutzerverzeichnisse | Kombinierte Anzeige | Workflows aus beiden Bereichen werden im Dashboard nebeneinander angezeigt |

## Validierung

Nach dem Bereitstellen eines Workflows im Benutzerverzeichnis:

1. **Öffnen Sie das Dashboard erneut**; der neue Workflow sollte in der Workflow-Liste der Startseite erscheinen
2. Nach Auswahl passender Einträge, Rechtsklick → Zotero Agents; der neue Workflow sollte erscheinen
3. Prüfen Sie vor der Ausführung, ob die Parameter im Einstellungsdialog korrekt sind

## Nächste Schritte

- [Lokalisierung](#doc/workflows%2Fcustom%2Flocalization) — Mehrsprachige Unterstützung zu Workflows hinzufügen
- [Anfragetypen](#doc/workflows%2Fcustom%2Frequest-kinds) — Den passenden Ausführungs-Backend und Anfragetyp wählen
- [Debugging & Tests](#doc/workflows%2Fcustom%2Fdebugging) — Workflow-Korrektheit überprüfen
