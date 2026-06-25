# Tag Bootstrapper

## Zweck

Interaktiv ein kontrolliertes Tag-Vokabular für ein Forschungsgebiet zusammen mit der KI erstellen. Empfohlen, vor der ersten [Literature Analysis](#doc/workflows%2Fliterature-analysis) auszuführen, um eine Grundlage für die anschließende automatische Tag-Regulierung zu schaffen.

## Anwendungsfälle

- Eine neue Forschungsrichtung beginnen und ein Tag-System aufbauen
- Noch kein kontrolliertes Tag-Vokabular in der aktuellen Zotero-Bibliothek vorhanden
- Die KI bei der Gestaltung einer fachspezifischen Tag-Klassifikation unterstützen lassen

## Eingabebedingungen

| Bedingungstyp | Beschreibung |
|---------|------|
| Eingabeeinheit | Workflow (es müssen keine Einträge ausgewählt werden) |
| Auslösemethode | Über das Dashboard ausführen |

## Ausführungsablauf

```
1. Interaktion starten
   └── Im Dashboard mit der KI kommunizieren

2. Fachgebiet definieren
   └── Ihr Forschungsfeld und Interessengebiete beschreiben
       └── Die KI schlägt ein Tag-Klassifikationssystem vor

3. Iterative Verfeinerung
   └── Von der KI vorgeschlagene Tags überprüfen
       └── Anpassen, hinzufügen, entfernen, umbenennen

4. Bestätigen und schreiben
   └── Das fertige Tag-Vokabular in das Synthesis-System schreiben
```

### Interaktionsdetails

- Der Workflow läuft im **interaktiven** Modus und kommuniziert mit der KI im Dashboard
- Sie können die Richtung jederzeit während des Gesprächs anpassen

## Geschätzte Dauer

| Szenario | Geschätzte Zeit |
|------|---------|
| Erstmalige Vokabularerstellung | 3-8 Minuten |
| Tags hinzufügen | 3-5 Minuten |

## Modell-Empfehlung

🟢 Ein mittelstarkes Modell ist ausreichend; das stärkste Modell wird nicht benötigt.

## Ausgaben

Nach Abschluss der Ausführung wird das kontrollierte Tag-Vokabular in das Synthesis-System geschrieben und kann auf der Tags-Seite des Synthesis Workbench angezeigt und verwaltet werden.

## Parameter

| Parameter | Typ | Beschreibung | Standard |
|------|------|------|--------|
| `tag_note_language` | string | Tag-Notizsprache | `zh-CN` |

Verfügbare Werte: `zh-CN`, `en-US`, `ja-JP`, `ko-KR`, `de-DE`, `fr-FR`, `es-ES`, `ru-RU`. Benutzerdefinierte Eingabe wird ebenfalls unterstützt.

## Abhängigkeiten

- **Backend**: Skill-Runner-Dienst
- **Backend-Konfiguration**: Konfigurieren Sie einen Skill-Runner-Backend-Typ im Backend Manager
- **Skill**: Der Skill `tag-bootstrapper` muss auf dem Skill-Runner bereitgestellt sein

## Verwandte Workflows

- [Literature Analysis](#doc/workflows%2Fliterature-analysis) — Kann während der Analyse automatisch die Tag-Regulierung kaskadieren
- [Tag Regulator](#doc/workflows%2Ftag-regulator) — Tag-Regulierung auf bestehende Literatur anwenden
