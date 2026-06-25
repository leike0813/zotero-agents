# Review-Zentrale

Die Review-Oberfläche ist der zentrale Ort für die Bearbeitung aller ausstehenden Review-Elemente im Synthesis-System. Sie enthält drei Unter-Tabs: **Zitations-Matches**, **Konzepte** und **Themen-Graph**.

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/synthesis/review.webp" alt="Synthesis Review Hub" title="Synthesis Review Hub" loading="lazy" /><figcaption>Synthesis Review Hub</figcaption></figure>

## Zitations-Match-Review

Wenn das System automatisch Referenzen mit Zotero-Objekten abgleicht, werden Matches, die nicht mit Sicherheit bestimmt werden können, als Vorschläge an die Review-Warteschlange übermittelt.

### Match-Vorschlagsstatus

| Status | Beschreibung |
|--------|-------------|
| **Ausstehend** | Vom System generierter Match-Kandidat, der auf Benutzerbestätigung oder -ablehnung wartet |
| **Akzeptiert** | Benutzer hat die Bindung bestätigt; die Referenz ist jetzt mit einem Zotero-Objekt verknüpft |
| **Abgelehnt** | Benutzer hat die Bindung abgelehnt |
| **Wiedereröffnet** | Ein zuvor bearbeiteter Vorschlag, der zur erneuten Prüfung wiedereröffnet wurde |

### Verfügbare Aktionen

- **Akzeptieren**: Bestätigen Sie die Zitations-zu-Objekt-Bindungsbeziehung
- **Ablehnen**: Lehnen Sie den Match-Vorschlag ab
- **Batch-Operationen**: Wählen Sie mehrere Vorschläge aus, um sie gesammelt zu akzeptieren oder abzulehnen

### Match-Konfidenz

Siehe [Index & Zitationsgraph](#doc/synthesis%2Findex-and-citation) für Beschreibungen der Konfidenzniveaus. Deterministische und hochkonfidente Matches werden normalerweise automatisch verarbeitet; mittel und niedriger konfidente Matches gelangen in die Review-Warteschlange.

### Filterung & Sortierung

Sie können die Vorschlagsliste filtern nach:

- Match-Status (ausstehend / akzeptiert / abgelehnt)
- Match-Strategie (DOI / Titel / Autor usw.)
- Konfidenzniveau
- Nach Zeit oder Relevanz sortieren

## Konzept-Review

Die automatische Erweiterung der Konzept-Wissensbasis kann Konzept-Match-Vorschläge mit niedriger Konfidenz erzeugen, die eine Benutzerprüfung und -bestätigung erfordern.

### Review-Ziele

- **Neue Konzept-Vorschläge**: Neue Konzeptkandidaten, die automatisch aus der Literatur extrahiert wurden
- **Sinnbestätigung**: Bestätigung, wenn einem bestehenden Konzept eine neue Bedeutung (Sinn) hinzugefügt wird
- **Alias-Vorschläge**: Bestätigung, wenn ein alternativer Name für dasselbe Konzept erkannt wird

### Vorgehensweise

Jeder Vorschlag zeigt den Konzeptnamen, die Extraktionsquelle, das Konfidenzniveau und die unterstützenden Beweise. Sie können:

- **Akzeptieren**: Bestätigen Sie den Vorschlag und schreiben Sie ihn in die Konzept-Wissensbasis
- **Ablehnen**: Verwerfen Sie den Vorschlag
- **Kontext anzeigen**: Sehen Sie, wo das Konzept in der Literatur erscheint

## Themen-Graph-Review

Wenn das System potenzielle Beziehungen zwischen Themen erkennt, generiert es Beziehungsvorschläge zur Prüfung.

### Beziehungstypen

| Beziehung | Beschreibung |
|-----------|-------------|
| `broader_than` | A ist ein breiteres Thema als B |
| `related_to` | Zwei Themen sind verwandt |
| `overlaps_with` | Zwei Themen haben inhaltliche Überschneidungen |
| `contrasts_with` | Zwei Themen stehen im Kontrast zueinander |

### Vorschlagsinhalt

Jeder Vorschlag zeigt:

- **Quell- und Zielthema** Namen und Beschreibungen
- **Vorgeschlagener Beziehungstyp**
- **Konfidenz** (basierend auf semantischer Analyse des Themeninhalts)
- **Unterstützende Beweise** (gemeinsam abgedeckte Papers usw.)

### Vorgehensweise

- **Akzeptieren**: Bestätigen Sie die Beziehung und schreiben Sie sie in den Themen-Graphen
- **Ablehnen**: Verwerfen Sie den Beziehungsvorschlag
- **Wiedereröffnen**: Eröffnen Sie einen zuvor bearbeiteten Vorschlag zur erneuten Prüfung

## Nächste Schritte

- [Konzept-Wissensbasis](#doc/synthesis%2Fconcepts) – Konzepte, Sinnvarianten, Aliase verwalten
- [Themen](#doc/synthesis%2Ftopic-synthesis) – Themensynthesen verwalten
