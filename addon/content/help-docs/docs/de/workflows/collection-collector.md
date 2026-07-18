# Collection Collector

## Zweck

Eine bestehende Zotero-Collection mit relevanter Literatur füllen, die bereits in derselben Bibliothek vorhanden ist. Der Workflow interpretiert einen erforderlichen Freitext-Collection-Umfang, überprüft aktuelle Metadaten, Tags und die Synthesis-Topic-Mitgliedschaft und wendet eine validierte Mitgliedschaftsliste an.

## Eingaben

| Parameter | Erforderlich | Beschreibung |
| --- | --- | --- |
| `collection` | Ja | Bestehende Zotero-Collection, ausgewählt nach Pfad. |
| `collectionScope` | Ja | Bedeutung, Forschungsthema oder Literaturgrenze, die durch die Collection repräsentiert wird. |

Keine Zotero-Elementauswahl erforderlich.

## Verhalten

1. Alle Top-Level- regulären Einträge in der Bibliothek der Ziel-Collection seitenweise durchlaufen.
2. Bereits in der Ziel-Collection vorhandene Einträge ausschließen.
3. Kandidaten aus Metadaten/Tag-Übereinstimmungen und relevanten bestehenden Synthesis Topics aufbauen.
4. Höchstens 250 Kandidaten in Chargen von 20 semantisch bewerten.
5. Paper mit einer Relevanz von mindestens `0.65` auswählen und die Evidenz und Begründung für jede Entscheidung beibehalten.
6. Aktuelle Mitgliedschaft erneut prüfen und die verbleibenden Einträge über Workflow-Apply hinzufügen.

Der Workflow ist automatisch und pausiert nicht zur Bestätigung. Er durchsucht nicht das Web, importiert keine neuen Paper, bearbeitet keine Tags, erstellt keine Collections oder verändert Synthesis Topics. Fehlender Topic-Kontext wird auf Metadaten- und Tag-Evidenz reduziert.

## Ausgabe und Anwendung

Das Laufergebnis enthält die ausgewählten Zotero-Element-Referenzen, Titel, Relevanzwerte, Evidenzgrundlage, übereinstimmende Topic-IDs, Begründungen, Einschränkungen und Auswahldiagnosen. Eine leere Auswahl ist ein erfolgreicher No-Op. Apply validiert das Ziel und die Element-Referenzen erneut und bleibt idempotent, wenn sich die Mitgliedschaft während der Skill-Ausführung geändert hat.
