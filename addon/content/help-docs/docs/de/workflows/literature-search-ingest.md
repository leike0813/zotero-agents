# Literature Search & Ingest

## Zweck

Akademische Literatur über KI durchsuchen und die Ergebnisse direkt in Zotero importieren. Unterstützt mehrere Suchmodi mit interaktiver Bestätigung vor dem Ausführen des Importvorgangs.

## Anwendungsfälle

- Suchen und batchweises Importieren relevanter Literatur bei der Erforschung eines neuen Themas
- Titel, DOI, arXiv-ID oder PMID eines bekannten Artikels eingeben für den Schnellimport
- Erweiterte Suche nach verwandter Literatur basierend auf einem Seed-Artikel

## Eingabebedingungen

| Bedingungstyp | Beschreibung |
|---------|------|
| Eingabeeinheit | Workflow (es müssen keine Einträge ausgewählt werden) |
| Auslösemethode | Über Kontextmenü oder Dashboard ausführen, es müssen keine Einträge vorausgewählt werden |

## Suchmodi

| Modus | Beschreibung |
|------|------|
| `auto` | Automatisch den geeignetsten Suchmodus bestimmen (Standard) |
| `topic_expansion` | Nach Forschungsrichtung oder Thema suchen, um verwandte Literatur zu finden |
| `paper_seed_expansion` | Erweiterte Suche basierend auf einem Seed-Artikel |
| `targeted_ingest` | Einen einzelnen Artikel gezielt lokalisieren und importieren |

## Ausführungsablauf

```
1. Planbestätigungsphase
   └── Zotero-Bibliothek und Synthesis-Kontext lesen
       └── Suchmodus automatisch bestimmen (Auto-Modus)
       └── Den Suchplan dem Benutzer präsentieren
       └── Auf Benutzerbestätigung warten

2. Suchphase (kein Import)
   └── Kandidatenliteratur gemäß dem bestätigten Plan suchen
       └── Suchergebnisliste anzeigen
       └── Benutzer wählt zu importierende Literatur aus

3. Importphase
   └── Artikel einzeln über zotero-bridge importieren
       └── Einschließlich Metadatenimport und PDF-Anhangimport
       └── Importfortschritt anzeigen

4. Abschluss
   └── Importergebnisübersicht ausgeben
       └── Einschließlich erfolgreicher/fehlgeschlagener Eintragsinformationen
```

### Interaktionsdetails

- Dieser Workflow läuft im **interaktiven** Modus und erfordert Benutzerbestätigung an wichtigen Punkten
- Planbestätigung: Nachdem die KI den Suchplan präsentiert hat, bestätigt oder passt der Benutzer ihn an
- Listenbestätigung: Nach der Anzeige der Suchergebnisse prüft der Benutzer die zu importierenden Einträge
- Der Ausführungsfortschritt kann im Dashboard verfolgt werden

## Modell-Empfehlung

🔴 **Muss** über Web-Suchfähigkeit verfügen. Der Kern dieses Workflows ist die Online-Suche nach akademischer Literatur — Modelle ohne Web-Suchfähigkeit können diese Aufgabe nicht ausführen.
🟢 Die Schlussfolgerungsfähigkeit des Modells muss nicht stark sein — Suche und Import sind im Wesentlichen Abruf- und Tool-Calling-Aufgaben, die auch leichte Modelle bewältigen können.

## Ausgaben

- Suchergebnisse werden direkt als Zotero-Einträge importiert
- Es wird automatisch versucht, PDF-Anhänge herunterzuladen (Best-Effort)
- Eine Ziel-Collection kann zur Kategorisierung angegeben werden

## Parameter

| Parameter | Typ | Beschreibung | Standard |
|------|------|------|--------|
| `query` | string | Suchthema, Forschungsrichtung, Artikeltitel, DOI, arXiv-ID, PMID usw. | — |
| `searchMode` | string | Suchmodus | `auto` |
| `targetCollection` | string | Ziel-Collection (optional) | Leer |

### Verfügbare Werte für searchMode

- `auto`: Automatisch bestimmen
- `topic_expansion`: Themaerweiterung
- `paper_seed_expansion`: Seed-Artikel-Erweiterung
- `targeted_ingest`: Gezielter Import

## Abhängigkeiten

- **Backend**: ACP-Backend (erfordert ACP-Protokollunterstützung)
- **Skill**: Der Skill `literature-search-ingest` muss auf dem Backend bereitgestellt sein

## Verwandte Workflows

- [Literature Analysis](#doc/workflows%2Fliterature-analysis) — Zusammenfassungen für importierte Literatur erstellen
