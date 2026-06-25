# Parametersystem

Workflows können konfigurierbare Parameter definieren, die vor der Ausführung einen Einstellungsdialog für den Benutzer anzeigen. Das Parametersystem unterstützt mehrere Typen und dynamische Datenquellen.

## Parameterdefinition

Parameter werden im `parameters`-Feld von `workflow.json` definiert:

```json
{
  "parameters": {
    "language": {
      "type": "string",
      "title": "Output Language",
      "description": "Select the language for output content",
      "default": "en-US",
      "enum": ["en-US", "zh-CN", "ja-JP"],
      "allowCustom": true
    },
    "maxResults": {
      "type": "number",
      "title": "Maximum Results",
      "description": "Upper limit on the number of results returned",
      "default": 10,
      "min": 1,
      "max": 100
    },
    "enableFilter": {
      "type": "boolean",
      "title": "Enable Filtering",
      "description": "Whether to enable result filtering",
      "default": true,
      "visible_if": { "parameter": "language", "equals": false }
    }
  }
}
```

## Parametertypen

| Typ | Beschreibung | Anwendbares Steuerelement |
|-----|-------------|---------------------------|
| `string` | Textzeichenfolge | Textfeld / Dropdown / dynamischer Selektor |
| `number` | Nummer | Zahleneingabe (unterstützt min/max-Einschränkungen) |
| `boolean` | Boolesch | Umschalter / Kontrollkästchen |

## Enum-Werte und benutzerdefinierte Werte

```json
{
  "language": {
    "type": "string",
    "enum": ["en-US", "zh-CN", "ja-JP"],
    "allowCustom": true,
    "default": "en-US"
  }
}
```

- `enum`: Vorgeschlagene Liste von Voreinstellungswerten. Wird als auswählbare Optionen im Dropdown-Menü angezeigt
- `allowCustom` (nur string-Typ): Wenn auf `true` gesetzt, sind `enum`-Werte nur Empfehlungen; Benutzer können frei andere Werte eingeben. Wenn auf `false` gesetzt oder weggelassen, können Benutzer nur aus `enum` auswählen

## Bedingte Anzeige

```json
{
  "advancedMode": {
    "type": "boolean",
    "title": "Advanced Mode",
    "default": false
  },
  "customEndpoint": {
    "type": "string",
    "title": "Custom Endpoint",
    "visible_if": { "parameter": "advancedMode", "equals": true }
  }
}
```

`visible_if` steuert das Ein-/Ausblenden von Parametern im Einstellungsdialog:

- `equals: true` — Nur anzeigen, wenn der Zielparameterwert wahrheitsgemäß ist
- `equals: false` — Nur anzeigen, wenn der Zielparameterwert unwahr ist

**Beispiel: Verknüpftes Ein-/Ausblenden**

```json
{
  "auto_tag_regulator": {
    "type": "boolean",
    "title": "Auto Tag Regulator",
    "default": true
  },
  "auto_tag_infer_tag": {
    "type": "boolean",
    "title": "Infer tags",
    "default": true,
    "visible_if": { "parameter": "auto_tag_regulator", "equals": true }
  }
}
```

Wenn `auto_tag_regulator` deaktiviert ist, wird der Parameter `auto_tag_infer_tag` automatisch ausgeblendet.

## Dynamische Optionsquellen

Parameterwertoptionen können aus Zotos Live-Daten stammen:

```json
{
  "targetCollection": {
    "type": "string",
    "title": "Target Collection",
    "default": "",
    "optionsSource": {
      "kind": "zotero.collections",
      "library": "current",
      "includeEmpty": true,
      "valueFormat": "collectionRef",
      "labelFormat": "path"
    }
  },
  "relatedTopic": {
    "type": "string",
    "title": "Related Topic",
    "optionsSource": {
      "kind": "synthesis.topics",
      "filter": "updatable"
    }
  }
}
```

### Unterstützte Optionsquellen

| `kind` | Beschreibung | Verfügbare Parameter |
|--------|-------------|---------------------|
| `zotero.collections` | Liste der Sammlungen in der aktuellen Zotero-Bibliothek | `library` (current/user/number), `includeEmpty`, `valueFormat` (collectionRef), `labelFormat` (path/title) |
| `synthesis.topics` | Liste der Themen im Synthesis Workbench | `filter` (all/updatable), `valueFormat` (topicId), `labelFormat` (title) |

### Häufige optionsSource-Parameter

| Parameter | Beschreibung |
|-----------|-------------|
| `library` | Bibliotheksbereich. `"current"` (aktuelle Bibliothek), `"user"` (Benutzerbibliothek), Nummer (spezifische Bibliotheks-ID) |
| `includeEmpty` | Ob eine leere Option eingeschlossen werden soll (für "keine Auswahl") |
| `valueFormat` | Format der Optionswerte: `"collectionRef"` / `"topicId"` |
| `labelFormat` | Anzeigeformat der Optionsbezeichnungen: `"path"` / `"title"` |
| `allowStale` | Verwendung von zwischengespeicherten Daten erlauben (vermeidet erneute Anforderung jedes Mal beim Öffnen der Einstellungen) |
| `filter` | Filterbedingung (variiert je nach kind) |

## Einschränkungen für numerische Parameter

```json
{
  "confidence": {
    "type": "number",
    "title": "Confidence Threshold",
    "default": 0.8,
    "min": 0,
    "max": 1
  }
}
```

`min` und `max` beschränken den Bereich der Eingabewerte.

## Parameter in Hooks lesen

In `buildRequest`, `filterInputs` und `applyResult` können Sie vom Benutzer festgelegte Parameterwerte über `executionOptions.workflowParams` lesen:

```js
export function buildRequest({ executionOptions, runtime }) {
  const params = executionOptions?.workflowParams || {};
  const language = params.language || "en-US";
  const maxResults = params.maxResults || 10;

  return {
    kind: "skillrunner.job.v1",
    create: { skill_id: "my-skill" },
    parameter: { language, max_results: maxResults },
  };
}
```

## Parameter-Lokalisierung

Die `title` und `description` von Parametern unterstützen Lokalisierung:

```json
{
  "i18n": {
    "messages": {
      "zh-CN": {
        "parameters.language.title": "Language",
        "parameters.language.description": "Select the language for output content"
      }
    }
  }
}
```

Siehe die Seite [Lokalisierung](#doc/workflows%2Fcustom%2Flocalization) für den vollständigen Lokalisierungsmechanismus.

## Nächste Schritte

- [Auswahlkontext](#doc/workflows%2Fcustom%2Fselection-context) — Verstehen, wie die Elementauswahl des Benutzers an den Workflow übergeben wird
- [Anfragetypen](#doc/workflows%2Fcustom%2Frequest-kinds) — Parameterübergabemethoden für verschiedene Anfragetypen
