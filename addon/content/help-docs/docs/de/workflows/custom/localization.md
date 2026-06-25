# Lokalisierung

Das Workflow-System unterstützt mehrsprachige Lokalisierung, sodass derselbe Workflow in verschiedenen Sprachversionen der Zotero-Oberfläche die entsprechenden Namen und Beschreibungen anzeigt.

## Lokalisierungshierarchie

Die Workflow-Lokalisierung folgt in dieser Prioritätsreihenfolge:

```
Inline-Nachrichten (manifest.i18n.messages)  ← Höchste Priorität
        ↓
Paketweite Gebietsdateien (locales/ des Workflow-Pakets)
        ↓
Rohe Manifestfelder (label / description usw. englische Standards)
        ↓
Schlüssel-Fallback (z. B. "workflows.my-id.label")
```

## Inline-Lokalisierung (einzelner Workflow)

Direkt in `workflow.json` definiert:

```json
{
  "id": "my-workflow",
  "label": "My Workflow",
  "i18n": {
    "defaultLocale": "en-US",
    "messages": {
      "zh-CN": {
        "label": "我的 Workflow",
        "taskNameTemplate": "处理中: {query}",
        "parameters.language.title": "语言",
        "parameters.language.description": "选择输出内容的语言"
      },
      "ja-JP": {
        "label": "マイワークフロー",
        "taskNameTemplate": "処理中: {query}"
      }
    }
  }
}
```

Felder wie `label` und `taskNameTemplate` im rohen Manifest dienen als Standardwerte (normalerweise Englisch), und Übersetzungen in `i18n.messages` überschreiben den Anzeigetext für die entsprechende Sprache.

### Schlüssel-Benennungskonventionen

```
label                                    — Workflow-Name
taskNameTemplate                         — Aufgaben-Namensvorlage
parameters.<paramKey>.title              — Parametertitel
parameters.<paramKey>.description         — Parameterbeschreibung
```

## Paketweite Lokalisierung (Multi-Workflow-Paket)

Gebietsdateien in `workflow-package.json` deklarieren:

```json
{
  "id": "my-package",
  "i18n": {
    "defaultLocale": "en-US",
    "locales": {
      "zh-CN": "locales/zh-CN.json",
      "ja-JP": "locales/ja-JP.json"
    }
  }
}
```

Inhalt von `locales/zh-CN.json`:

```json
{
  "workflows.my-workflow.label": "我的工作流",
  "workflows.my-workflow.taskNameTemplate": "处理中: {query}",
  "workflows.my-workflow.parameters.language.title": "语言",
  "workflows.another-workflow.label": "另一个工作流"
}
```

Schlüssel in paketweiten Gebietsdateien verwenden das vollqualifizierte Format: `workflows.<workflowId>.<field>`.

### Gemischte Verwendung

Paketweite und Workflow-Inline-Nachrichten können koexistieren, wobei Inline-Nachrichten höhere Priorität haben. Best Practices:

- Die Standardsprache (z. B. Englisch) in den workflow.json-Feldern belassen
- Übersetzungen in paketweiten Gebietsdateien zur einheitlichen Verwaltung ablegen
- Wenn eine Übersetzung sehr spezifisch für einen bestimmten Workflow ist, kann sie auch in den Inline-Nachrichten des Workflows platziert werden

## Logik zur Sprachübereinstimmung

Das System versucht, die Spracheinstellungen des Benutzers in folgender Reihenfolge abzugleichen:

1. **Exakte Übereinstimmung**: Das Gebietsschema des Benutzers ist `"zh-CN"`, `"zh-CN"`-Nachrichten nachschlagen
2. **Sprach-Subtag-Übereinstimmung**: Das Gebietsschema des Benutzers ist `"zh-Hans-CN"`, wenn keine exakte Übereinstimmung gefunden wird, versuchen `"zh"` abzugleichen
3. **defaultLocale-Fallback**: Die in `i18n.defaultLocale` angegebene Sprache verwenden
4. **Rohe Feldwert-Fallback**: Die rohen Feldwerte in `workflow.json` verwenden (z. B. `label`)
5. **Schlüssel-Fallback**: Den Schlüsselnamen selbst anzeigen

## Lokalisierung von Parameter-Enum-Werten

Wenn ein Parameter Enum-Werte hat, verwendet der Anzeigetext für Enum-Werte derzeit die Felder `title` und `description` des Parameters. Für komplexe Szenarien, die eine Lokalisierung der Enum-Werte selbst erfordern, wird empfohlen, dies im `label` oder der Beschreibung des Workflows zu erläutern.

## Eine neue Sprache zu einem Workflow hinzufügen

1. Eine neue `<locale>.json`-Datei im `locales/`-Verzeichnis des Pakets erstellen
2. Bestehende Gebietsdateien (z. B. `zh-CN.json`) als Vorlage verwenden und alle Schlüssel übersetzen
3. Den neuen Spracheintrag in `i18n.locales` von `workflow-package.json` hinzufügen
4. Das Plugin neu laden, damit die Änderungen wirksam werden

## Referenz

- Offizielles Gebietsdatei-Beispiel: `content/official/workflows/literature-workbench-package/locales/zh-CN.json`
- Beispiel für paketweite i18n-Deklaration: `content/official/workflows/literature-workbench-package/workflow-package.json`

## Nächste Schritte

- [Anfragetypen](#doc/workflows%2Fcustom%2Frequest-kinds) — Ausführungs-Backend und Anfragetyp wählen
- [Paketierung & Bereitstellung](#doc/workflows%2Fcustom%2Fpackaging) — Workflow-Pakete mit Lokalisierung veröffentlichen
