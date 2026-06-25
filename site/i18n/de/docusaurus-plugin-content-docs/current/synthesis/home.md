# Home-Dashboard

Home ist die erste Seite, die Sie beim Öffnen von Synthesis Workbench sehen. Sie bietet einen umfassenden Überblick über Ihre Bibliothek, den Sync-Status und einen schnellen Zugriff auf Trendthemen.

![Synthesis Home Dashboard](/img/docs/synthesis/home.png)

## Bibliothekseinblicke-Karten

Der obere Bereich der Seite zeigt eine Reihe von Statistik-Karten, die den aktuellen Zustand des Synthesis-Systems anzeigen:

| Metrik | Beschreibung |
|--------|-------------|
| **Registrierte Papers** | Gesamtanzahl der im Canonical Reference Index enthaltenen Papers |
| **Themenanzahl** | Anzahl der erstellten Themensynthesen |
| **Graph-Knoten** | Gesamtanzahl der Knoten im Zitationsgraphen (Bibliothekspapers + externe Referenzen) |
| **Graph-Kanten** | Gesamtanzahl der Zitationsbeziehungen im Zitationsgraphen |
| **Sync-Status** | Laufender Status der WebDAV/Git-Synchronisierung |

Diese Metriken helfen Ihnen, den Strukturierungsgrad und den Synthesefortschritt Ihrer Bibliothek schnell zu verstehen.

## Sync-Panel

Wenn [WebDAV Sync](webdav-sync) (empfohlen) oder [Git Sync](git-sync) (veraltet) konfiguriert ist, zeigt die Home-Seite ein Sync-Status-Panel:

### WebDAV Sync

- **Sync-Status**: idle / queued / syncing / blocked_conflict / failed
- **Letzte Sync-Zeit**
- **Remote-HEAD-Identifier**
- **Aktions-Schaltflächen**: Manueller Sync, Pause/Fortsetzen, Wiederholen

Bei auftretenden Konflikten zeigt das Panel Konfliktdetails und Aktionsoptionen an (`keep_local`, `clear_after_manual_edit`).

Für detaillierte Konfiguration und Nutzung von WebDAV Sync siehe [WebDAV Sync](webdav-sync).

:::warning Auto-Sync-Hinweis
Die Auto-Sync-Funktion von WebDAV Sync wurde nicht gründlich getestet. Es wird empfohlen, in dieser Phase **nur manuellen Sync zu verwenden** und Auto-Sync zu aktivieren, nachdem es in einer zukünftigen Version verbessert wurde.
:::

### Git Sync (Veraltet)

Siehe [Git Sync](git-sync) als historische Referenz.

## Review-Elemente-Panel

Die Home-Seite kann eine Schnellvorschau ausstehender Review-Elemente anzeigen:

| Review-Kategorie | Beschreibung |
|------------------|-------------|
| **Zitations-Matches** | Ausstehende Zitations-Objekt-Bindungsvorschläge |
| **Konzepte** | Ausstehende Konzept-, Sinn- und Alias-Vorschläge |
| **Themen-Graph-Beziehungen** | Ausstehende Themenübergreifende Beziehungen |
| **Tag-Vorschläge** | KI-vorgeschlagene Tags, die auf Genehmigung warten |

Jede Kategorie zeigt ein Badge mit der Anzahl der ausstehenden Elemente. Klicken Sie, um zur entsprechenden Unter-Registerkarte im [Review-Hub](review) zu navigieren.

## Trendthemen

Der untere Bereich der Seite zeigt eine Kartenliste von Trendthemen, sortiert nach der Anzahl der zugehörigen Papers. Jede Karte enthält:

- **Themenname** – Klicken Sie, um die Themendetailseite zu öffnen
- **Paper-Anzahl** – Anzahl der vom Thema abgedeckten Papers
- **Zusammenfassungsvorschau** – Auszug der Themenbeschreibung
- **Aktions-Schaltflächen** – Thema öffnen, Thema aktualisieren

Bei mehreren aktiven Themen verwenden Sie den "Alle anzeigen"-Link, um die vollständige Liste auf der Themen-Seite zu durchsuchen.

## Nächste Schritte

- [WebDAV Sync](webdav-sync) – Geräteübergreifende Synchronisierung für Synthesis-Daten konfigurieren
- [Review-Zentrale](review) – Zitations-Match-, Konzept- und Themen-Graph-Review-Elemente bearbeiten
- [Index & Zitationsgraph](index-and-citation) – Den Canonical Reference Index verwalten
